import SwiftUI

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

struct AdminProjectListView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var projects: [AdminProjectListItem] = []
    @State private var unreadByProject: [String: Int] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var searchText = ""

    private var filteredProjects: [AdminProjectListItem] {
        guard !searchText.isEmpty else { return projects }
        let query = searchText.lowercased()
        return projects.filter {
            $0.name.lowercased().contains(query)
                || ($0.address?.lowercased().contains(query) ?? false)
                || clientName($0).lowercased().contains(query)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let error = errorMessage {
                    Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if projects.isEmpty {
                    EmptyStateView(icon: "folder", title: "No projects found", subtitle: "Try a different filter, or add a new client and project.")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(filteredProjects) { project in
                        NavigationLink {
                            AdminProjectDetailView(projectId: project.id)
                        } label: {
                            row(project)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search projects")
                }
            }
            .navigationTitle("Projects")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .onAppear { Task { await refreshUnreadCounts() } }
        }
    }

    private func row(_ project: AdminProjectListItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(project.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
                if let count = unreadByProject[project.id], count > 0 {
                    Text("\(count)")
                        .font(.caption2.weight(.bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Theme.gold)
                        .clipShape(Capsule())
                }
            }
            Text([clientName(project), project.address ?? ""].filter { !$0.isEmpty }.joined(separator: " · "))
                .font(.caption)
                .foregroundColor(.secondary)
            HStack {
                if let type = project.projectType {
                    Text(type).font(.caption2).foregroundColor(.secondary)
                }
                Spacer()
                Text(project.status.capitalized)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(Theme.gold)
            }
        }
        .padding(.vertical, 4)
    }

    private func clientName(_ project: AdminProjectListItem) -> String {
        [project.profiles?.firstName, project.profiles?.lastName].compactMap { $0 }.joined(separator: " ")
    }

    private func load() async {
        do {
            let projects: [AdminProjectListItem] = try await SupabaseConfig.client
                .from("projects")
                .select("id,name,address,project_type,status,progress_pct,profiles!projects_owner_id_fkey(first_name,last_name)")
                .order("created_at", ascending: false)
                .execute()
                .value
            self.projects = projects
        } catch {
            errorMessage = "Could not load projects."
        }
        await refreshUnreadCounts()
        isLoading = false
    }

    // Cheap enough to call every time the list reappears (e.g. popping
    // back from a project's detail view) so a just-read conversation's
    // badge clears without a full reload.
    private func refreshUnreadCounts() async {
        let unread: [UnreadRow] = (try? await SupabaseConfig.client
            .rpc("get_unread_message_counts")
            .execute().value) ?? []

        var projectMap: [String: Int] = [:]
        for row in unread {
            if let proj = row.projectId {
                projectMap[proj, default: 0] += row.unreadCount
            }
        }
        unreadByProject = projectMap
    }
}
