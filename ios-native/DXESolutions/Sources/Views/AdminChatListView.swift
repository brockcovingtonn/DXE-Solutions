import SwiftUI

private struct ChatContact: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let isEmployee: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case isEmployee = "is_employee"
    }

    var name: String {
        let joined = [firstName, lastName].compactMap { $0 }.joined(separator: " ")
        return joined.isEmpty ? "Unnamed" : joined
    }
}

private struct ChatProject: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

private struct UnreadRow: Decodable {
    let projectId: String?
    let dmUserId: String?
    let unreadCount: Int

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case dmUserId = "dm_user_id"
        case unreadCount = "unread_count"
    }
}

struct AdminChatListView: View {
    @State private var contacts: [ChatContact] = []
    @State private var projects: [ChatProject] = []
    @State private var unreadByDm: [String: Int] = [:]
    @State private var unreadByProject: [String: Int] = [:]
    @State private var isLoading = true
    @State private var searchText = ""

    private var filteredContacts: [ChatContact] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return contacts }
        return contacts.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    private var filteredProjects: [ChatProject] {
        guard !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return projects }
        return projects.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        if !filteredContacts.isEmpty {
                            Section("Direct Messages") {
                                ForEach(filteredContacts) { contact in
                                    NavigationLink {
                                        AdminChatThreadView(projectId: nil, dmUserId: contact.id, title: contact.name)
                                    } label: {
                                        row(title: contact.name, subtitle: contact.isEmployee ? "Employee" : "Client", unread: unreadByDm[contact.id] ?? 0)
                                    }
                                }
                            }
                        }

                        if !filteredProjects.isEmpty {
                            Section("Projects") {
                                ForEach(filteredProjects) { project in
                                    NavigationLink {
                                        AdminChatThreadView(projectId: project.id, dmUserId: nil, title: project.name)
                                    } label: {
                                        row(title: project.name, subtitle: "Project thread", unread: unreadByProject[project.id] ?? 0)
                                    }
                                }
                            }
                        }

                        if filteredContacts.isEmpty && filteredProjects.isEmpty {
                            Text("No results.").foregroundColor(.secondary)
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Chat")
            .searchable(text: $searchText, prompt: "Search clients, employees, projects")
            .task { await load() }
            .refreshable { await load() }
            .onAppear { Task { await refreshUnreadCounts() } }
        }
    }

    private func row(title: String, subtitle: String, unread: Int) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                Text(subtitle).font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            if unread > 0 {
                Text("\(unread)")
                    .font(.caption2.weight(.bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Theme.gold)
                    .clipShape(Capsule())
            }
        }
    }

    private func load() async {
        async let contactsTask: [ChatContact] = SupabaseConfig.client
            .from("profiles")
            .select("id, first_name, last_name, is_employee")
            .eq("is_admin", value: false)
            .order("first_name", ascending: true)
            .execute().value

        async let projectsTask: [ChatProject] = SupabaseConfig.client
            .from("projects")
            .select("id, name")
            .order("name", ascending: true)
            .execute().value

        contacts = (try? await contactsTask) ?? []
        projects = (try? await projectsTask) ?? []
        await refreshUnreadCounts()
        isLoading = false
    }

    // Re-fetches just the unread counts, cheap enough to call every time
    // the list reappears (e.g. popping back from a thread) so a just-read
    // conversation's badge clears without a full reload.
    private func refreshUnreadCounts() async {
        let unread: [UnreadRow] = (try? await SupabaseConfig.client
            .rpc("get_unread_message_counts")
            .execute().value) ?? []

        var dmMap: [String: Int] = [:]
        var projectMap: [String: Int] = [:]
        for row in unread {
            if let dm = row.dmUserId {
                dmMap[dm, default: 0] += row.unreadCount
            } else if let proj = row.projectId {
                projectMap[proj, default: 0] += row.unreadCount
            }
        }
        unreadByDm = dmMap
        unreadByProject = projectMap
    }
}
