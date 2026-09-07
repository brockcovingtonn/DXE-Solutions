import SwiftUI

struct AddToCalendarButton: View {
    let event: CalendarEvent

    @State private var isAdding = false
    @State private var message: String?

    var body: some View {
        Button {
            Task { await add() }
        } label: {
            if isAdding {
                ProgressView()
            } else {
                Image(systemName: "calendar.badge.plus")
                    .foregroundColor(.secondary)
            }
        }
        .buttonStyle(.plain)
        .disabled(isAdding)
        .alert(
            message ?? "",
            isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } }),
            actions: { Button("OK") { message = nil } }
        )
    }

    private func add() async {
        isAdding = true
        defer { isAdding = false }

        guard let start = parseDate(event.startTime) else {
            message = "Could not add this event."
            return
        }
        let end = event.endTime.flatMap { parseDate($0) }

        let success = await CalendarExport.addEvent(
            title: event.title,
            notes: event.description,
            startDate: start,
            endDate: end,
            isAllDay: event.allDay
        )
        message = success
            ? "Added to your calendar."
            : "Could not add to your calendar. Check calendar access under Settings > Privacy."
    }

    private func parseDate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }
}
