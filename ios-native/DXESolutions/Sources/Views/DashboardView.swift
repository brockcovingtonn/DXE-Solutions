import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var events: [CalendarEvent] = []
    @State private var activity: [ActivityItem] = []
    @State private var isLoading = true
    @State private var isOffline = false
    @State private var weatherDays: [WeatherDay] = []
    @State private var lastSyncedAt: Date?
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())

    private let cacheKey = "client-dashboard"

    private struct DashboardSnapshot: Codable {
        let events: [CalendarEvent]
        let activity: [ActivityItem]
    }

    private let calendar = Calendar.current
    private let weekdaySymbols = ["S", "M", "T", "W", "T", "F", "S"]

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
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
            .task { await loadAll() }
            .task { weatherDays = await WeatherService.days() }
            .refreshable { await loadAll() }
        }
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
                    Text("Chat with DXE Solutions")
                        .font(.subheadline.weight(.semibold))
                        .foregroundColor(Theme.navy)
                    Text("Message Dixie and the team")
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
        let count = events(on: day).count

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
                if let weather = WeatherService.day(for: day, in: weatherDays) {
                    Text(WeatherDisplay.emoji(for: weather.weatherCode))
                        .font(.system(size: 10))
                }
            }
            .frame(maxWidth: .infinity, minHeight: 56)
            .background(isSelected ? Theme.navy : Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Selected day

    private var selectedDaySection: some View {
        let dayEvents = events(on: selectedDate)
        return VStack(alignment: .leading, spacing: 10) {
            Text(selectedDateTitle)
                .font(.subheadline.weight(.medium))
                .foregroundColor(Theme.navy)

            if let weather = WeatherService.day(for: selectedDate, in: weatherDays) {
                HStack(spacing: 6) {
                    Text(WeatherDisplay.emoji(for: weather.weatherCode))
                    Text("\(WeatherDisplay.label(for: weather.weatherCode)) · High \(weather.high)° / Low \(weather.low)°")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

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
            Spacer()
            AddToCalendarButton(event: event)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Data

    private func events(on day: Date) -> [CalendarEvent] {
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

    private func loadAll() async {
        if events.isEmpty && activity.isEmpty, let cached = OfflineCache.load(DashboardSnapshot.self, key: cacheKey) {
            events = cached.events
            activity = cached.activity
            lastSyncedAt = OfflineCache.lastSavedAt(key: cacheKey)
            isLoading = false
        }

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
            let freshEvents = try await eventsTask
            let freshActivity = try await activityTask
            events = freshEvents
            activity = freshActivity
            isOffline = false
            lastSyncedAt = Date()
            OfflineCache.save(DashboardSnapshot(events: freshEvents, activity: freshActivity), key: cacheKey)
        } catch {
            isOffline = true
        }
        isLoading = false
    }
}
