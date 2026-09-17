import Foundation

// Mirrors app/api/admin/site-settings + app/api/admin/booking-availability
// (lib/site-settings.js, lib/booking-availability.js).

struct SiteSettingsResponse: Decodable { var googleBookingEnabled: Bool }
struct SiteSettingsPayload: Encodable { var googleBookingEnabled: Bool }

struct BookingWindow: Codable, Equatable { var start: String; var end: String }

struct BookingAvailabilityConfig: Codable {
    var sessionMinutes: Int
    var bufferMinutes: Int
    var minNoticeHours: Int
    var maxDaysOut: Int
    var timezone: String
    var weeklyHours: [String: [BookingWindow]]

    enum CodingKeys: String, CodingKey {
        case sessionMinutes = "session_minutes"
        case bufferMinutes = "buffer_minutes"
        case minNoticeHours = "min_notice_hours"
        case maxDaysOut = "max_days_out"
        case timezone
        case weeklyHours = "weekly_hours"
    }
}

struct BookingAvailabilityResponse: Decodable { var config: BookingAvailabilityConfig? }

struct BookingAvailabilityPayload: Encodable {
    var sessionMinutes: Int
    var bufferMinutes: Int
    var minNoticeHours: Int
    var maxDaysOut: Int
    var weeklyHours: [String: [BookingWindow]]
}

let bookingDayOrder = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
let bookingDayLabels: [String: String] = [
    "mon": "Monday", "tue": "Tuesday", "wed": "Wednesday", "thu": "Thursday",
    "fri": "Friday", "sat": "Saturday", "sun": "Sunday",
]
