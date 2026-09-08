import SwiftUI

// Search results only carry a project id/name/address, but
// ProjectOverviewView needs the full Project row — this self-fetches
// by id and hands off, so search can link straight to a project
// without ProjectListView already having loaded it.
struct ClientProjectHandoffView: View {
    let projectId: String

    @State private var project: Project?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let project {
                ProjectOverviewView(project: project)
            } else if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Text("Could not load this project.")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            project = try? await SupabaseConfig.client
                .from("projects")
                .select()
                .eq("id", value: projectId)
                .single()
                .execute().value
            isLoading = false
        }
    }
}
