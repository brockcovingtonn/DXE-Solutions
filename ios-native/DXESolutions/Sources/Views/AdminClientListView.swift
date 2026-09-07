import SwiftUI

private struct ClientProfile: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let isAdmin: Bool
    let isEmployee: Bool

    enum CodingKeys: String, CodingKey {
        case id, email
        case firstName = "first_name"
        case lastName = "last_name"
        case isAdmin = "is_admin"
        case isEmployee = "is_employee"
    }

    var name: String { [firstName, lastName].compactMap { $0 }.joined(separator: " ") }
}

private struct ClientProjectRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let status: String
    let ownerId: String

    enum CodingKeys: String, CodingKey {
        case id, name, status
        case ownerId = "owner_id"
    }
}

struct AdminClientListView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var clients: [ClientProfile] = []
    @State private var projectsByClient: [String: [ClientProjectRef]] = [:]
    @State private var isLoading = true
    @State private var searchText = ""

    private var filteredClients: [ClientProfile] {
        guard !searchText.isEmpty else { return clients }
        let query = searchText.lowercased()
        return clients.filter { $0.name.lowercased().contains(query) || ($0.email?.lowercased().contains(query) ?? false) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if clients.isEmpty {
                    EmptyStateView(icon: "person.2", title: "No clients yet", subtitle: "New clients you add will show up here.")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(filteredClients) { client in
                        NavigationLink {
                            AdminClientDetailView(clientId: client.id)
                        } label: {
                            row(client)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search clients")
                }
            }
            .navigationTitle("Clients")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    NavigationLink {
                        AdminNewClientView()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func row(_ client: ClientProfile) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(client.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            if let email = client.email {
                Text(email).font(.caption).foregroundColor(.secondary)
            }
            let projects = projectsByClient[client.id] ?? []
            if projects.isEmpty {
                Text("No projects").font(.caption2).foregroundColor(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(projects) { project in
                            Text(project.name)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Theme.cream)
                                .foregroundColor(Theme.navy)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        async let profilesTask: [ClientProfile] = (try? await SupabaseConfig.client
            .from("profiles").select("id,first_name,last_name,email,is_admin,is_employee")
            .order("first_name", ascending: true).execute().value) ?? []
        async let projectsTask: [ClientProjectRef] = (try? await SupabaseConfig.client
            .from("projects").select("id,name,status,owner_id")
            .order("created_at", ascending: false).execute().value) ?? []

        let profiles = await profilesTask
        clients = profiles.filter { !$0.isAdmin && !$0.isEmployee }

        var grouped: [String: [ClientProjectRef]] = [:]
        for project in await projectsTask {
            grouped[project.ownerId, default: []].append(project)
        }
        projectsByClient = grouped
        isLoading = false
    }
}
