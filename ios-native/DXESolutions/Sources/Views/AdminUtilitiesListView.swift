import SwiftUI

struct AdminUtilitiesListView: View {
    @State private var utilityEntries: [AdminUtilityEntry] = []
    @State private var isLoading = true

    private let utilityLabels: [String: String] = ["electrical": "Electrical", "water": "Water", "gas": "Gas"]
    private let utilityStatusLabels: [String: String] = [
        "not_ready": "Not Ready", "pending": "Pending", "in_progress": "In Progress", "complete": "Complete",
    ]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if utilityEntries.isEmpty {
                EmptyStateView(icon: "bolt", title: "Nothing pending", subtitle: "Utility entries needing attention will show up here.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(utilityEntries) { entry in
                    row(entry)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Utilities Needing Attention")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func row(_ entry: AdminUtilityEntry) -> some View {
        let typeLabel = utilityLabels[entry.projectUtilities?.utilityType ?? ""] ?? entry.projectUtilities?.utilityType ?? ""
        let projectName = entry.projectUtilities?.projects?.name ?? ""
        let subtitle = [entry.application ?? "No application set", entry.workRequestNumber.map { "WR# \($0)" }]
            .compactMap { $0 }.joined(separator: " · ") + " · " + (utilityStatusLabels[entry.status] ?? entry.status)

        return Group {
            if let project = entry.projectUtilities?.projects {
                NavigationLink {
                    AdminProjectDetailView(projectId: project.id)
                } label: {
                    rowContent(title: "\(projectName) — \(typeLabel)", subtitle: subtitle)
                }
            } else {
                rowContent(title: "\(projectName) — \(typeLabel)", subtitle: subtitle)
            }
        }
    }

    private func rowContent(title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "bolt")
                .foregroundColor(Theme.gold)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline)
                Text(subtitle).font(.caption).foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        utilityEntries = (try? await SupabaseConfig.client
            .from("project_utility_entries")
            .select("*, project_utilities(utility_type,project_id,projects(id,name))")
            .in("status", values: ["pending", "in_progress"])
            .order("created_at", ascending: false)
            .limit(150)
            .execute().value) ?? []
        isLoading = false
    }
}
