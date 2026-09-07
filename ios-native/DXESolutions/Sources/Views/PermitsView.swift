import SwiftUI

struct PermitsView: View {
    let project: Project

    @State private var permits: [Permit] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let statusLabels: [String: String] = [
        "not_started": "Not Started",
        "submitted": "Submitted",
        "in_plan_check": "In Plan Check",
        "corrections": "Corrections Required",
        "approved": "Approved",
        "issued": "Issued",
        "finaled": "Finaled",
    ]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if permits.isEmpty {
                Text("No permits have been added for this project yet.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(permits) { permit in
                            permitCard(permit)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Permits")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPermits() }
    }

    private func permitCard(_ permit: Permit) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(permit.permitType)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(Theme.navy)

            let columns = [GridItem(.flexible()), GridItem(.flexible())]
            LazyVGrid(columns: columns, alignment: .leading, spacing: 10) {
                field("Permit #", permit.permitNumber)
                field("Agency", permit.agency)
                field("Status", statusLabels[permit.status] ?? permit.status)
                field("Issued", permit.issuedDate)
                field("Expires", permit.expirationDate)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func field(_ label: String, _ value: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            Text(value?.isEmpty == false ? value! : "—")
                .font(.subheadline)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func loadPermits() async {
        struct Params: Encodable { let p_project_id: String }
        do {
            let permits: [Permit] = try await SupabaseConfig.client
                .rpc("get_project_permits", params: Params(p_project_id: project.id))
                .execute()
                .value
            self.permits = permits
        } catch {
            errorMessage = "Could not load permits."
        }
        isLoading = false
    }
}
