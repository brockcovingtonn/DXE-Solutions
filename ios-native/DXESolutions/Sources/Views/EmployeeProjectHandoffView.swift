import SwiftUI

// Same idea as ClientProjectHandoffView — EmployeeProjectDetailView
// needs a full Project row, but search results only have id/name/address.
struct EmployeeProjectHandoffView: View {
    let projectId: String

    @State private var project: Project?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let project {
                EmployeeProjectDetailView(project: project)
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
