import SwiftUI

// Lets an employee pick between the general DM with Dixie and any of
// their assigned projects' group threads, then hands off to the same
// flexible thread view admin uses — messages/message_reads RLS already
// scopes an employee to projects they're assigned to.
struct EmployeeChatView: View {
    @EnvironmentObject var auth: AuthManager

    private struct AssignmentRow: Codable {
        let projects: ProjectRef?
    }

    private struct ProjectRef: Codable, Identifiable, Hashable {
        let id: String
        let name: String
    }

    @State private var projects: [ProjectRef] = []
    @State private var selectedProjectId: String = ""

    private var userId: String { auth.profile?.id ?? "" }

    private var selectedProjectName: String? {
        projects.first { $0.id == selectedProjectId }?.name
    }

    var body: some View {
        Group {
            if let name = selectedProjectName {
                AdminChatThreadView(projectId: selectedProjectId, dmUserId: nil, title: name)
                    .id(selectedProjectId)
            } else {
                AdminChatThreadView(projectId: nil, dmUserId: userId, title: "Chat with DXE Solutions")
            }
        }
        .toolbar {
            ToolbarItem(placement: .principal) {
                if !projects.isEmpty {
                    Menu {
                        Button("General — Chat with Dixie") { selectedProjectId = "" }
                        ForEach(projects) { project in
                            Button(project.name) { selectedProjectId = project.id }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Text(selectedProjectName ?? "Chat with DXE Solutions")
                                .font(.headline)
                                .lineLimit(1)
                            Image(systemName: "chevron.down")
                                .font(.caption2)
                        }
                        .foregroundColor(Theme.navy)
                    }
                }
            }
        }
        .task { await loadProjects() }
    }

    private func loadProjects() async {
        let rows: [AssignmentRow] = (try? await SupabaseConfig.client
            .from("project_employees")
            .select("projects(id, name)")
            .eq("employee_id", value: userId)
            .execute()
            .value) ?? []
        projects = rows.compactMap { $0.projects }
    }
}
