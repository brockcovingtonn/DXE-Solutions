import SwiftUI

struct EmployeeActivityListView: View {
    @State private var activity: [ActivityItem] = []
    @State private var isLoading = true

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if activity.isEmpty {
                EmptyStateView(icon: "clock", title: "No activity yet", subtitle: "Activity on your assigned projects will show up here.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(activity) { item in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: iconName(for: item.type))
                            .foregroundColor(Theme.gold)
                            .frame(width: 20)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.text).font(.subheadline)
                            Text([item.projects?.name, formatRelative(item.createdAt)].compactMap { $0 }.joined(separator: " · "))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("All Activity")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private func iconName(for type: String) -> String {
        switch type {
        case "note": return "note.text"
        case "doc": return "doc.text"
        case "status": return "checkmark.circle"
        case "photo": return "photo"
        default: return "info.circle"
        }
    }

    private func formatRelative(_ dateStr: String) -> String {
        guard let date = parseDate(dateStr) else { return "" }
        let seconds = Date().timeIntervalSince(date)
        if seconds < 60 { return "Just now" }
        if seconds < 3600 { let m = Int(seconds / 60); return "\(m) minute\(m == 1 ? "" : "s") ago" }
        if seconds < 86400 { let h = Int(seconds / 3600); return "\(h) hour\(h == 1 ? "" : "s") ago" }
        let days = Int(seconds / 86400)
        if days == 1 { return "Yesterday" }
        if days < 7 { return "\(days) days ago" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }

    private func parseDate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }

    private func load() async {
        activity = (try? await SupabaseConfig.client
            .from("activity")
            .select("*, projects(id,name)")
            .order("created_at", ascending: false)
            .limit(150)
            .execute().value) ?? []
        isLoading = false
    }
}
