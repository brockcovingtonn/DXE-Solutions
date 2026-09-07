import SwiftUI

struct AdminDashboardView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var clientCount = 0
    @State private var totalProjects = 0
    @State private var activeProjects = 0
    @State private var events: [CalendarEvent] = []
    @State private var activity: [ActivityItem] = []
    @State private var milestones: [AdminMilestoneItem] = []
    @State private var utilityEntries: [AdminUtilityEntry] = []
    @State private var isLoading = true
    @State private var isOffline = false
    @State private var showSearch = false
    @State private var lastSyncedAt: Date?
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())

    private let calendar = Calendar.current
    private let weekdaySymbols = ["S", "M", "T", "W", "T", "F", "S"]
    private let cacheKey = "admin-dashboard"

    private struct DashboardSnapshot: Codable {
        let clientCount: Int
        let totalProjects: Int
        let activeProjects: Int
        let events: [CalendarEvent]
        let activity: [ActivityItem]
        let milestones: [AdminMilestoneItem]
        let utilityEntries: [AdminUtilityEntry]
    }
    private let utilityLabels: [String: String] = ["electrical": "Electrical", "water": "Water", "gas": "Gas"]
    private let utilityStatusLabels: [String: String] = [
        "not_ready": "Not Ready", "pending": "Pending", "in_progress": "In Progress", "complete": "Complete",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if isLoading {
                        ProgressView().frame(maxWidth: .infinity).padding(.vertical, 40)
                    } else {
                        if isOffline {
                            OfflineBanner(lastSyncedAt: lastSyncedAt)
                        }
                        statCards
                        weekSection
                        activitySection
                        milestonesSection
                        utilitiesSection
                    }
                }
                .padding()
            }
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showSearch = true
                    } label: {
                        Image(systemName: "magnifyingglass")
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
            .task { await loadAll() }
            .refreshable { await loadAll() }
            .sheet(isPresented: $showSearch) {
                AdminSearchView()
            }
        }
    }

    // MARK: - Stat cards

    private var statCards: some View {
        HStack(spacing: 12) {
            statCard("Clients", "\(clientCount)")
            statCard("Total Projects", "\(totalProjects)")
            statCard("Active Projects", "\(activeProjects)")
        }
    }

    private func statCard(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            Text(value)
                .font(.title2.weight(.semibold))
                .foregroundColor(Theme.navy)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Week

    private var weekDays: [Date] {
        let weekday = calendar.component(.weekday, from: Date())
        let start = calendar.date(byAdding: .day, value: -(weekday - 1), to: calendar.startOfDay(for: Date()))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private var weekSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            NavigationLink {
                CalendarView(project: nil)
            } label: {
                HStack {
                    Text("This Week").font(.headline).foregroundColor(Theme.navy)
                    Spacer()
                    Text("View Month").font(.caption.weight(.semibold))
                }
            }
            .buttonStyle(.plain)

            HStack(spacing: 4) {
                ForEach(weekDays, id: \.self) { day in
                    dayColumn(day)
                }
            }

            let dayEvents = eventsOn(selectedDate)
            if dayEvents.isEmpty {
                Text("Nothing scheduled.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(dayEvents) { event in
                    HStack {
                        Text(event.title).font(.subheadline)
                        Spacer()
                        if let name = event.projects?.name {
                            Text(name).font(.caption).foregroundColor(.secondary)
                        }
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
    }

    private func dayColumn(_ day: Date) -> some View {
        let isToday = calendar.isDateInToday(day)
        let isSelected = calendar.isDate(day, inSameDayAs: selectedDate)
        let count = eventsOn(day).count

        return Button {
            selectedDate = day
        } label: {
            VStack(spacing: 4) {
                Text(weekdaySymbols[calendar.component(.weekday, from: day) - 1])
                    .font(.caption2)
                    .foregroundColor(isSelected ? .white.opacity(0.7) : .secondary)
                Text("\(calendar.component(.day, from: day))")
                    .font(.subheadline)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundColor(isSelected ? .white : (isToday ? Theme.gold : .primary))
                Circle()
                    .fill(count == 0 ? Color.clear : (isSelected ? Color.white : Theme.gold))
                    .frame(width: 5, height: 5)
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(isSelected ? Theme.navy : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private func eventsOn(_ day: Date) -> [CalendarEvent] {
        events
            .filter { event in
                guard let start = parseDate(event.startTime) else { return false }
                let startDay = calendar.startOfDay(for: start)
                let endDay: Date
                if let endString = event.endTime, let end = parseDate(endString) {
                    endDay = calendar.startOfDay(for: end)
                } else {
                    endDay = startDay
                }
                let target = calendar.startOfDay(for: day)
                return startDay <= target && target <= endDay
            }
            .sorted { (parseDate($0.startTime) ?? .distantPast) < (parseDate($1.startTime) ?? .distantPast) }
    }

    // MARK: - Activity

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Recent Activity").font(.headline).foregroundColor(Theme.navy)
            if activity.isEmpty {
                Text("No recent activity.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(activity) { item in
                    activityRow(icon: iconName(for: item.type), title: item.text, subtitle: [item.projects?.name, formatRelative(item.createdAt)].compactMap { $0 }.joined(separator: " · "), project: item.projects)
                }
            }
        }
    }

    private var milestonesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upcoming Milestones").font(.headline).foregroundColor(Theme.navy)
            if milestones.isEmpty {
                Text("No upcoming milestones.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(milestones) { item in
                    activityRow(icon: "flag", title: item.name, subtitle: [item.projects?.name, item.displayDate ?? "No date set"].compactMap { $0 }.joined(separator: " · "), project: item.projects)
                }
            }
        }
    }

    private func activityRow(icon: String, title: String, subtitle: String, project: AdminProjectRef?) -> some View {
        Group {
            if let project {
                NavigationLink {
                    AdminProjectDetailView(projectId: project.id)
                } label: {
                    activityRowContent(icon: icon, title: title, subtitle: subtitle)
                }
                .buttonStyle(.plain)
            } else {
                activityRowContent(icon: icon, title: title, subtitle: subtitle)
            }
        }
    }

    private func activityRowContent(icon: String, title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundColor(Theme.gold)
                .frame(width: 20)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.subheadline)
                if !subtitle.isEmpty {
                    Text(subtitle).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
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

    // MARK: - Utilities

    private var utilitiesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Utilities Needing Attention").font(.headline).foregroundColor(Theme.navy)
            if utilityEntries.isEmpty {
                Text("No utility entries currently pending or in progress.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(utilityEntries) { entry in
                    let typeLabel = utilityLabels[entry.projectUtilities?.utilityType ?? ""] ?? entry.projectUtilities?.utilityType ?? ""
                    let projectName = entry.projectUtilities?.projects?.name ?? ""
                    activityRow(
                        icon: "bolt",
                        title: "\(projectName) — \(typeLabel)",
                        subtitle: [entry.application ?? "No application set", entry.workRequestNumber.map { "WR# \($0)" }].compactMap { $0 }.joined(separator: " · ") + " · " + (utilityStatusLabels[entry.status] ?? entry.status),
                        project: entry.projectUtilities?.projects
                    )
                }
            }
        }
    }

    // MARK: - Helpers

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

    // MARK: - Data

    private func loadAll() async {
        if events.isEmpty && activity.isEmpty && milestones.isEmpty && totalProjects == 0,
           let cached = OfflineCache.load(DashboardSnapshot.self, key: cacheKey) {
            clientCount = cached.clientCount
            totalProjects = cached.totalProjects
            activeProjects = cached.activeProjects
            events = cached.events
            activity = cached.activity
            milestones = cached.milestones
            utilityEntries = cached.utilityEntries
            lastSyncedAt = OfflineCache.lastSavedAt(key: cacheKey)
            isLoading = false
        }

        struct ProfileFlags: Codable { let isAdmin: Bool; let isEmployee: Bool
            enum CodingKeys: String, CodingKey { case isAdmin = "is_admin"; case isEmployee = "is_employee" }
        }
        struct ProjectStatus: Codable { let status: String }

        async let profilesTask: [ProfileFlags] = SupabaseConfig.client
            .from("profiles").select("is_admin,is_employee").execute().value
        async let projectsTask: [ProjectStatus] = SupabaseConfig.client
            .from("projects").select("status").execute().value

        let weekday = calendar.component(.weekday, from: Date())
        let weekStart = calendar.date(byAdding: .day, value: -(weekday - 1), to: calendar.startOfDay(for: Date()))!
        let windowEnd = calendar.date(byAdding: .day, value: 21, to: weekStart)!
        let iso = ISO8601DateFormatter()

        async let eventsTask: [CalendarEvent] = SupabaseConfig.client
            .from("calendar_events")
            .select("*, projects(id,name)")
            .gte("start_time", value: iso.string(from: weekStart))
            .lte("start_time", value: iso.string(from: windowEnd))
            .order("start_time", ascending: true)
            .execute().value

        async let activityTask: [ActivityItem] = SupabaseConfig.client
            .from("activity")
            .select("*, projects(id,name)")
            .order("created_at", ascending: false)
            .limit(15)
            .execute().value

        async let milestonesTask: [AdminMilestoneItem] = SupabaseConfig.client
            .from("milestones")
            .select("*, projects(id,name)")
            .neq("state", value: "done")
            .order("display_date", ascending: true)
            .limit(8)
            .execute().value

        async let utilitiesTask: [AdminUtilityEntry] = SupabaseConfig.client
            .from("project_utility_entries")
            .select("*, project_utilities(utility_type,project_id,projects(id,name))")
            .in("status", values: ["pending", "in_progress"])
            .order("created_at", ascending: false)
            .limit(8)
            .execute().value

        do {
            let profiles = try await profilesTask
            let projects = try await projectsTask
            let freshEvents = try await eventsTask
            let freshActivity = try await activityTask
            let freshMilestones = try await milestonesTask
            let freshUtilities = try await utilitiesTask

            let freshClientCount = profiles.filter { !$0.isAdmin && !$0.isEmployee }.count
            let freshTotalProjects = projects.count
            let freshActiveProjects = projects.filter { $0.status == "active" }.count

            clientCount = freshClientCount
            totalProjects = freshTotalProjects
            activeProjects = freshActiveProjects
            events = freshEvents
            activity = freshActivity
            milestones = freshMilestones
            utilityEntries = freshUtilities
            isOffline = false
            lastSyncedAt = Date()

            OfflineCache.save(
                DashboardSnapshot(
                    clientCount: freshClientCount,
                    totalProjects: freshTotalProjects,
                    activeProjects: freshActiveProjects,
                    events: freshEvents,
                    activity: freshActivity,
                    milestones: freshMilestones,
                    utilityEntries: freshUtilities
                ),
                key: cacheKey
            )
        } catch {
            isOffline = true
        }
        isLoading = false
    }
}
