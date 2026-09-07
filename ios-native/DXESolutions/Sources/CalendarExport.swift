import Foundation
import EventKit

// Exports a single DXE calendar event into the user's own device
// calendar (Apple Calendar, or whatever app they've set as default).
enum CalendarExport {
    static func addEvent(title: String, notes: String?, startDate: Date, endDate: Date?, isAllDay: Bool) async -> Bool {
        let store = EKEventStore()

        let granted = await withCheckedContinuation { continuation in
            store.requestAccess(to: .event) { granted, _ in
                continuation.resume(returning: granted)
            }
        }
        guard granted else { return false }

        let event = EKEvent(eventStore: store)
        event.title = title
        event.notes = notes
        event.startDate = startDate
        event.endDate = endDate ?? startDate.addingTimeInterval(isAllDay ? 86400 : 3600)
        event.isAllDay = isAllDay
        event.calendar = store.defaultCalendarForNewEvents

        do {
            try store.save(event, span: .thisEvent)
            return true
        } catch {
            return false
        }
    }
}
