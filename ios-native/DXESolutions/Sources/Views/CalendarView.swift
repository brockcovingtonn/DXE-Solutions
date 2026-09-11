import SwiftUI

struct CalendarView: View {
    let project: Project?

    @EnvironmentObject var auth: AuthManager

    @State private var events: [CalendarEvent] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var isOffline = false
    @State private var lastSyncedAt: Date?
    @State private var refDate: Date = Calendar.current.startOfDay(for: Date())
    @State private var selectedDate: Date = Calendar.current.startOfDay(for: Date())
    @State private var showAddEvent = false
    @State private var weatherDays: [WeatherDay] = []
    @State private var eventToEdit: CalendarEvent?

    private let calendar = Calendar.current
    private let weekdaySymbols = ["S", "M", "T", "W", "T", "F", "S"]

    private var cacheKey: String { "calendar-\(project?.id ?? "global")" }

    private var canAddEvents: Bool {
        auth.profile?.isAdmin == true || auth.profile?.isEmployee == true
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if isOffline {
                            OfflineBanner(lastSyncedAt: lastSyncedAt)
                        }
                        monthHeader
                        monthGrid
                        selectedDaySection
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Calendar")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if canAddEvents {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showAddEvent = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
        }
        .task { await loadEvents() }
        .task { weatherDays = await WeatherService.days() }
        .sheet(isPresented: $showAddEvent) {
            AddCalendarEventView(lockedProject: project, isAdmin: auth.profile?.isAdmin == true) {
                Task { await loadEvents() }
            }
        }
        .sheet(item: $eventToEdit) { event in
            AddCalendarEventView(lockedProject: project, isAdmin: auth.profile?.isAdmin == true, existingEvent: event) {
                Task { await loadEvents() }
            }
        }
    }

    // MARK: - Header

    private var monthHeader: some View {
        HStack {
            Button { changeMonth(-1) } label: {
                Image(systemName: "chevron.left")
            }
            Spacer()
            VStack(spacing: 2) {
                Text(monthTitle).font(.headline)
                Button("Today") {
                    refDate = calendar.startOfDay(for: Date())
                    selectedDate = refDate
                }
                .font(.caption)
            }
            Spacer()
            Button { changeMonth(1) } label: {
                Image(systemName: "chevron.right")
            }
        }
        .foregroundColor(Theme.navy)
    }

    private var monthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: refDate)
    }

    private func changeMonth(_ delta: Int) {
        if let newDate = calendar.date(byAdding: .month, value: delta, to: refDate) {
            refDate = newDate
        }
    }

    // MARK: - Grid

    private var monthDays: [Date] {
        guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: refDate)) else { return [] }
        let weekday = calendar.component(.weekday, from: monthStart)
        guard let gridStart = calendar.date(byAdding: .day, value: -(weekday - 1), to: monthStart) else { return [] }
        return (0..<42).compactMap { calendar.date(byAdding: .day, value: $0, to: gridStart) }
    }

    private var monthGrid: some View {
        let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
        return VStack(spacing: 4) {
            HStack {
                ForEach(weekdaySymbols.indices, id: \.self) { i in
                    Text(weekdaySymbols[i])
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(monthDays, id: \.self) { day in
                    dayCell(day)
                }
            }
        }
    }

    private func dayCell(_ day: Date) -> some View {
        let inMonth = calendar.isDate(day, equalTo: refDate, toGranularity: .month)
        let isToday = calendar.isDateInToday(day)
        let isSelected = calendar.isDate(day, inSameDayAs: selectedDate)
        let dayEvents = events(on: day)
        // Distinct project colors tagged on this day's events, capped at
        // 3 dots so a busy day doesn't overflow the tiny cell. Untagged
        // events fall back to a single plain gold dot, same as before.
        let projectColors = Array(Set(dayEvents.compactMap { $0.projects?.color })).sorted().prefix(3)

        return Button {
            selectedDate = day
        } label: {
            VStack(spacing: 3) {
                Text("\(calendar.component(.day, from: day))")
                    .font(.caption)
                    .fontWeight(isToday ? .bold : .regular)
                    .foregroundColor(isSelected ? .white : (isToday ? Theme.gold : (inMonth ? .primary : .secondary)))
                if !dayEvents.isEmpty {
                    HStack(spacing: 2) {
                        if projectColors.isEmpty {
                            Circle()
                                .fill(isSelected ? Color.white : Theme.gold)
                                .frame(width: 4, height: 4)
                        } else {
                            ForEach(Array(projectColors), id: \.self) { hex in
                                Circle()
                                    .fill(isSelected ? Color.white : (Color(hex: hex) ?? Theme.gold))
                                    .frame(width: 4, height: 4)
                            }
                        }
                    }
                    .frame(height: 4)
                } else {
                    Color.clear.frame(height: 4)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 36)
            .background(isSelected ? Theme.navy : Color.clear)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .opacity(inMonth ? 1 : 0.35)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Selected day

    private var selectedDaySection: some View {
        let dayEvents = events(on: selectedDate)
        return VStack(alignment: .leading, spacing: 10) {
            Text(selectedDateTitle.uppercased())
                .font(.caption.weight(.semibold))
                .foregroundColor(Theme.gold)
                .tracking(1)

            if let weather = WeatherService.day(for: selectedDate, in: weatherDays) {
                HStack(spacing: 6) {
                    Text(WeatherDisplay.emoji(for: weather.weatherCode))
                    Text("\(WeatherDisplay.label(for: weather.weatherCode)) · High \(weather.high)° / Low \(weather.low)°")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            if dayEvents.isEmpty {
                Text("Nothing on the calendar for this day.")
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
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: selectedDate)
    }

    private func eventRow(_ event: CalendarEvent) -> some View {
        HStack(alignment: .top, spacing: 0) {
            if let hex = event.projects?.color, let color = Color(hex: hex) {
                Rectangle().fill(color).frame(width: 3)
            }
            HStack(alignment: .top, spacing: 12) {
                Button {
                    if canAddEvents {
                        eventToEdit = event
                    }
                } label: {
                    HStack(alignment: .top, spacing: 12) {
                        Text(event.allDay ? "All day" : timeString(event.startTime))
                            .font(.caption.weight(.semibold))
                            .foregroundColor(Theme.gold)
                            .frame(width: 70, alignment: .leading)
                        Image(systemName: typeIcon(event.eventType))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        VStack(alignment: .leading, spacing: 3) {
                            Text(event.title).font(.subheadline.weight(.medium))
                            if let description = event.description, !description.isEmpty {
                                Text(description).font(.caption).foregroundColor(.secondary)
                            }
                            if let projectName = event.projects?.name {
                                Text(projectName).font(.caption2).foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(!canAddEvents)

                Spacer()
                AddToCalendarButton(event: event)
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 10)
        }
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func typeIcon(_ type: String?) -> String {
        switch type {
        case "inspection": return "checklist"
        case "meeting": return "person.2"
        case "deadline": return "flag"
        case "action_item": return "checkmark.circle"
        case "other": return "calendar"
        default: return "clock"
        }
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

    private func loadEvents() async {
        if events.isEmpty, let cached = OfflineCache.load([CalendarEvent].self, key: cacheKey) {
            events = cached
            lastSyncedAt = OfflineCache.lastSavedAt(key: cacheKey)
            isLoading = false
        }

        do {
            let freshEvents: [CalendarEvent]
            if let project {
                freshEvents = try await SupabaseConfig.client
                    .from("calendar_events")
                    .select("*, projects(name, color)")
                    .eq("project_id", value: project.id)
                    .order("start_time", ascending: true)
                    .execute()
                    .value
            } else {
                freshEvents = try await SupabaseConfig.client
                    .from("calendar_events")
                    .select("*, projects(name, color)")
                    .order("start_time", ascending: true)
                    .execute()
                    .value
            }
            events = freshEvents
            isOffline = false
            lastSyncedAt = Date()
            OfflineCache.save(freshEvents, key: cacheKey)
        } catch {
            if events.isEmpty {
                errorMessage = "Could not load calendar events."
            } else {
                isOffline = true
            }
        }
        isLoading = false
    }
}
