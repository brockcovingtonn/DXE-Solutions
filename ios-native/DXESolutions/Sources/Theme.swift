import SwiftUI

// Matches the CSS custom properties in app/globals.css exactly, so the
// native app reads as the same brand as the website/wrapper.
enum Theme {
    static let navy = Color(red: 0.243, green: 0.329, blue: 0.408)       // --navy: #3E5468
    static let navyDark = Color(red: 0.173, green: 0.243, blue: 0.314)   // --navy-dark: #2C3E50
    static let gold = Color(red: 0.788, green: 0.659, blue: 0.341)       // --gold: #C9A857
    static let cream = Color(red: 0.965, green: 0.973, blue: 0.980)      // --cream: #F6F8FA
}

extension Color {
    // Parses a "#RRGGBB" hex string — used for the per-project calendar
    // colors stored in projects.color (see PROJECT_COLOR_PALETTE on web).
    init?(hex: String) {
        var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if sanitized.hasPrefix("#") { sanitized.removeFirst() }
        guard sanitized.count == 6, let value = UInt32(sanitized, radix: 16) else { return nil }
        self.init(
            red: Double((value >> 16) & 0xFF) / 255,
            green: Double((value >> 8) & 0xFF) / 255,
            blue: Double(value & 0xFF) / 255
        )
    }
}
