import SwiftUI

struct AdminProjectListView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var projects: [AdminProjectListItem] = []
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
                    Text("No projects found.").foregroundColor(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
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
        }
    }

    private func row(_ project: AdminProjectListItem) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(project.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
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
        isLoading = false
    }
}
