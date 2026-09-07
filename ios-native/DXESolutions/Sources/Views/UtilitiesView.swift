import SwiftUI

struct UtilitiesView: View {
    let project: Project

    @State private var utilities: [ProjectUtility] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let utilityLabels: [String: String] = [
        "electrical": "Electrical",
        "water": "Water",
        "gas": "Gas",
    ]
    private let utilityIcons: [String: String] = [
        "electrical": "bolt.fill",
        "water": "drop.fill",
        "gas": "flame.fill",
    ]
    private let statusLabels: [String: String] = [
        "not_ready": "Not Ready",
        "pending": "Pending",
        "in_progress": "In Progress",
        "complete": "Complete",
    ]

    private var visibleUtilities: [ProjectUtility] {
        utilities.filter { $0.enabled }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if visibleUtilities.isEmpty {
                Text("No utility information has been added for this project yet.")
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        ForEach(visibleUtilities) { utility in
                            utilityBlock(utility)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Utilities")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadUtilities() }
    }

    private func utilityBlock(_ utility: ProjectUtility) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: utilityIcons[utility.utilityType] ?? "bolt.fill")
                    .foregroundColor(Theme.gold)
                Text(utilityLabels[utility.utilityType] ?? utility.utilityType.capitalized)
                    .font(.headline)
                    .foregroundColor(Theme.navy)
            }

            if hasContactInfo(utility) {
                contactRow(utility)
            }

            if utility.entries.isEmpty {
                Text("No updates yet.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                ForEach(utility.entries) { entry in
                    entryRow(entry)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func hasContactInfo(_ utility: ProjectUtility) -> Bool {
        [utility.contactName, utility.contactTrade, utility.contactPhone, utility.contactEmail]
            .contains { $0?.isEmpty == false }
    }

    private func contactRow(_ utility: ProjectUtility) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            if let trade = utility.contactTrade, !trade.isEmpty {
                Text(trade)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.secondary)
            }
            HStack(spacing: 10) {
                if let name = utility.contactName, !name.isEmpty { Text(name) }
                if let phone = utility.contactPhone, !phone.isEmpty { Text(phone) }
                if let email = utility.contactEmail, !email.isEmpty { Text(email) }
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
    }

    private func entryRow(_ entry: UtilityEntry) -> some View {
        HStack(spacing: 12) {
            fieldColumn("Application", entry.application)
            fieldColumn("Work Request #", entry.workRequestNumber)
            fieldColumn("Status", statusLabels[entry.status] ?? entry.status)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func fieldColumn(_ label: String, _ value: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            Text(value?.isEmpty == false ? value! : "—")
                .font(.caption)
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func loadUtilities() async {
        struct Params: Encodable { let p_project_id: String }
        do {
            let utilities: [ProjectUtility] = try await SupabaseConfig.client
                .rpc("get_project_utilities", params: Params(p_project_id: project.id))
                .execute()
                .value
            self.utilities = utilities
        } catch {
            errorMessage = "Could not load utilities."
        }
        isLoading = false
    }
}
