import SwiftUI

struct EmployeeDashboardView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var projects: [Project] = []
    @State private var actionItems: [ActionItem] = []
    @State private var events: [CalendarEvent] = []
    @State private var activity: [ActivityItem] = []
    @State private var isLoading = true
    @State private var isOffline = false
    @State private var lastSyncedAt: Date?
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())
    @State private var busyItemId: String?

    private let calendar = Calendar.current
    private let weekdaySymbols = ["S", "M", "T", "W", "T", "F", "S"]
    private let cacheKey = "employee-dashboard"

    private struct DashboardSnapshot: Codable {
        let projects: [Project]
        let actionItems: [ActionItem]
        let events: [CalendarEvent]
        let activity: [ActivityItem]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if isOffline {
                        OfflineBanner(lastSyncedAt: lastSyncedAt)
                    }

                    chatCard

                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("This Week")
                                .font(.headline)
                                .foregroundColor(Theme.navy)
                            Spacer()
                            NavigationLink {
                                CalendarView(project: nil)
                            } label: {
                                Text("View Month")
                                    .font(.caption.weight(.semibold))
                            }
                        }

                        if isLoading {
                            ProgressView().frame(maxWidth: .infinity).padding(.vertical, 20)
                        } else {
                            weekStrip
                            selectedDaySection
                        }
                    }

                    if !isLoading {
                        activitySection
                        actionItemsSection
                        projectsSection
                    }
                }
                .padding()
            }
            .navigationTitle("My Projects")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
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
        }
    }

    // MARK: - Chat

    private var chatCard: some View {
        NavigationLink {
            ChatView()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "message.fill")
                    .font(.title2)
                    .foregroundColor(Theme.gold)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Message Dixie")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(Theme.navy)
                    Text("Direct message")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Theme.cream)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Week strip

    private var weekDays: [Date] {
        let weekday = calendar.component(.weekday, from: Date())
        let start = calendar.date(byAdding: .day, value: -(weekday - 1), to: calendar.startOfDay(for: Date()))!
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private var weekStrip: some View {
        HStack(spacing: 4) {
            ForEach(weekDays, id: \.self) { day in
                dayColumn(day)
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

    private var selectedDaySection: some View {
        let dayEvents = eventsOn(selectedDate)
        return VStack(alignment: .leading, spacing: 10) {
            Text(selectedDateTitle)
                .font(.subheadline.weight(.medium))
                .foregroundColor(Theme.navy)

            if dayEvents.isEmpty {
                Text("Nothing scheduled.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(dayEvents) { event in
                    eventRow(event)
                }
            }
        }
    }

    private var selectedDateTitle: String {
        if calendar.isDateInToday(selectedDate) { return "Today" }
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: selectedDate)
    }

    private func eventRow(_ event: CalendarEvent) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(event.allDay ? "All day" : timeString(event.startTime))
                .font(.caption.weight(.semibold))
                .foregroundColor(Theme.gold)
                .frame(width: 70, alignment: .leading)
            VStack(alignment: .leading, spacing: 3) {
                Text(event.title).font(.subheadline.weight(.medium))
                if let description = event.description, !description.isEmpty {
                    Text(description).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
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

    private func timeString(_ dateString: String) -> String {
        guard let date = parseDate(dateString) else { return "" }
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }

    private func parseDate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }

    // MARK: - Activity

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent Activity").font(.headline).foregroundColor(Theme.navy)
            if activity.isEmpty {
                Text("No recent activity.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(activity) { item in
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
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
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

    // MARK: - Action items

    private var actionItemsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("My Action Items")
                .font(.headline)
                .foregroundColor(Theme.navy)

            if actionItems.isEmpty {
                Text("You have no action items assigned right now.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(actionItems) { item in
                    actionItemRow(item)
                }
            }
        }
    }

    private func actionItemRow(_ item: ActionItem) -> some View {
        let isDone = item.status == "done"
        return Button {
            Task { await toggle(item) }
        } label: {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isDone ? Theme.gold : .secondary)
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.primary)
                        .strikethrough(isDone)
                    if let description = item.description, !description.isEmpty {
                        Text(description).font(.caption).foregroundColor(.secondary)
                    }
                    Text(metaLine(item))
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Spacer()
                if busyItemId == item.id {
                    ProgressView()
                }
            }
            .padding()
            .background(isDone ? Color(.tertiarySystemBackground) : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
        .disabled(busyItemId != nil)
    }

    private func metaLine(_ item: ActionItem) -> String {
        var parts: [String] = []
        if let name = item.projects?.name { parts.append(name) }
        if let due = item.dueDate { parts.append("Due \(due)") }
        return parts.joined(separator: " · ")
    }

    // MARK: - Projects

    private var projectsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Assigned Projects")
                .font(.headline)
                .foregroundColor(Theme.navy)

            if projects.isEmpty {
                Text("You haven't been assigned to any projects yet.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } else {
                ForEach(projects) { project in
                    projectCard(project)
                }
            }
        }
    }

    private func projectCard(_ project: Project) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            NavigationLink {
                EmployeeProjectDetailView(project: project)
            } label: {
                VStack(alignment: .leading, spacing: 4) {
                    Text(project.name)
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(Theme.navy)
                    if let address = project.address {
                        Text(address).font(.caption).foregroundColor(.secondary)
                    }
                    HStack {
                        Text(project.projectType ?? "Project type not set")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(project.status.capitalized)
                            .font(.caption2.weight(.semibold))
                            .foregroundColor(Theme.gold)
                    }
                }
            }
            .buttonStyle(.plain)

            NavigationLink {
                CoverSheetView(project: project)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "doc.text")
                    Text("Cover Sheet")
                }
                .font(.caption.weight(.medium))
                .foregroundColor(Theme.navy)
            }
            .padding(.top, 6)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Data

    private func loadAll() async {
        guard let userId = auth.profile?.id else {
            isLoading = false
            return
        }

        if projects.isEmpty && actionItems.isEmpty && events.isEmpty && activity.isEmpty,
           let cached = OfflineCache.load(DashboardSnapshot.self, key: cacheKey) {
            projects = cached.projects
            actionItems = cached.actionItems
            events = cached.events
            activity = cached.activity
            lastSyncedAt = OfflineCache.lastSavedAt(key: cacheKey)
            isLoading = false
        }

        struct AssignmentRow: Codable { let projects: Project? }

        async let assignmentsTask: [AssignmentRow] = SupabaseConfig.client
            .from("project_employees")
            .select("projects(*)")
            .eq("employee_id", value: userId)
            .execute().value

        async let actionItemsTask: [ActionItem] = SupabaseConfig.client
            .from("action_items")
            .select("*, projects(name)")
            .eq("assigned_to", value: userId)
            .order("due_date", ascending: true)
            .execute().value

        let weekday = calendar.component(.weekday, from: Date())
        let weekStart = calendar.date(byAdding: .day, value: -(weekday - 1), to: calendar.startOfDay(for: Date()))!
        let windowEnd = calendar.date(byAdding: .day, value: 21, to: weekStart)!
        let iso = ISO8601DateFormatter()

        async let eventsTask: [CalendarEvent] = SupabaseConfig.client
            .from("calendar_events")
            .select()
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

        do {
            let assignments = try await assignmentsTask
            let freshProjects = assignments.compactMap { $0.projects }
            let freshActionItems = try await actionItemsTask
            let freshEvents = try await eventsTask
            let freshActivity = try await activityTask
            projects = freshProjects
            actionItems = freshActionItems
            events = freshEvents
            activity = freshActivity
            isOffline = false
            lastSyncedAt = Date()
            OfflineCache.save(
                DashboardSnapshot(projects: freshProjects, actionItems: freshActionItems, events: freshEvents, activity: freshActivity),
                key: cacheKey
            )
        } catch {
            isOffline = true
        }
        isLoading = false
    }

    private func toggle(_ item: ActionItem) async {
        busyItemId = item.id
        defer { busyItemId = nil }

        let newStatus = item.status == "done" ? "open" : "done"
        struct StatusUpdate: Encodable {
            let status: String
            let completed_at: String?
        }
        let payload = StatusUpdate(
            status: newStatus,
            completed_at: newStatus == "done" ? ISO8601DateFormatter().string(from: Date()) : nil
        )
        try? await SupabaseConfig.client
            .from("action_items")
            .update(payload)
            .eq("id", value: item.id)
            .execute()
        await loadAll()
    }
}
