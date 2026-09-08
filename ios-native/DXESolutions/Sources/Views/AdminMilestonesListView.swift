import SwiftUI

struct AdminMilestonesListView: View {
    @State private var milestones: [AdminMilestoneItem] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if milestones.isEmpty {
                EmptyStateView(icon: "flag", title: "No upcoming milestones", subtitle: "Open milestones across all projects will show up here.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(milestones) { item in
                    row(item)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Upcoming Milestones")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func row(_ item: AdminMilestoneItem) -> some View {
        Group {
            if let project = item.projects {
                NavigationLink {
                    AdminProjectDetailView(projectId: project.id)
                } label: {
                    rowContent(item)
                }
            } else {
                rowContent(item)
            }
        }
    }

    private func rowContent(_ item: AdminMilestoneItem) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "flag")
                .foregroundColor(Theme.gold)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name).font(.subheadline)
                Text([item.projects?.name, item.displayDate ?? "No date set"].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        milestones = (try? await SupabaseConfig.client
            .from("milestones")
            .select("*, projects(id,name)")
            .neq("state", value: "done")
            .order("display_date", ascending: true)
            .limit(150)
            .execute().value) ?? []
        isLoading = false
    }
}
