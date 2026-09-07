import SwiftUI

struct ProjectListView: View {
    @EnvironmentObject var auth: AuthManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var projects: [Project] = []
    @State private var selectedProject: Project?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if sizeClass == .regular {
                NavigationSplitView {
                    sidebarContainer
                } detail: {
                    NavigationStack {
                        if let project = selectedProject {
                            ProjectOverviewView(project: project)
                        } else {
                            Text("Select a project")
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .navigationSplitViewStyle(.balanced)
            } else {
                NavigationStack {
                    sidebarContainer
                        .navigationDestination(for: Project.self) { project in
                            ProjectOverviewView(project: project)
                        }
                }
            }
        }
        .task { await loadProjects() }
    }

    private var sidebarContainer: some View {
        sidebar
            .navigationTitle("My Projects")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
            .refreshable { await loadProjects() }
    }

    @ViewBuilder
    private var sidebar: some View {
        if isLoading {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if let error = errorMessage {
            Text(error)
                .foregroundColor(.red)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if projects.isEmpty {
            EmptyStateView(icon: "folder", title: "No projects yet", subtitle: "Once Dixie sets up your project, it'll show up here.")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if sizeClass == .regular {
            List(projects, selection: $selectedProject) { project in
                ProjectRow(project: project).tag(project)
            }
            .listStyle(.plain)
        } else {
            List(projects) { project in
                NavigationLink(value: project) {
                    ProjectRow(project: project)
                }
            }
            .listStyle(.plain)
        }
    }

    private func loadProjects() async {
        do {
            let projects: [Project] = try await SupabaseConfig.client
                .from("projects")
                .select()
                .order("created_at", ascending: true)
                .execute()
                .value
            self.projects = projects
            if sizeClass == .regular, selectedProject == nil {
                selectedProject = projects.first
            }
        } catch {
            errorMessage = "Could not load your projects."
        }
        isLoading = false
    }
}

private struct ProjectRow: View {
    let project: Project

    private var statusColor: Color {
        switch project.status {
        case "active": return .green
        case "completed": return Theme.navy
        case "on-hold": return .orange
        default: return .secondary
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(project.name)
                .font(.headline)
            if let address = project.address {
                Text(address)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            HStack(spacing: 6) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 6, height: 6)
                Text(project.status.capitalized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
