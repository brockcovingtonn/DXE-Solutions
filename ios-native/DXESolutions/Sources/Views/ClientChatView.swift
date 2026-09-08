import SwiftUI

// Lets the client pick between the general DM with Dixie and any of
// their own projects' group threads, then hands off to the same
// flexible thread view admin uses — messages/message_reads RLS already
// scopes a client to their own projects, so this can only ever reach
// threads they're allowed to see.
struct ClientChatView: View {
    @EnvironmentObject var auth: AuthManager

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
        projects = (try? await SupabaseConfig.client
            .from("projects")
            .select("id, name")
            .eq("owner_id", value: userId)
            .order("created_at", ascending: true)
            .execute()
            .value) ?? []
    }
}
