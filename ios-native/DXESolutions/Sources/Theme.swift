import SwiftUI

// Matches the CSS custom properties in app/globals.css exactly, so the
// native app reads as the same brand as the website/wrapper.
enum Theme {
    static let navy = Color(red: 0.243, green: 0.329, blue: 0.408)       // --navy: #3E5468
    static let navyDark = Color(red: 0.173, green: 0.243, blue: 0.314)   // --navy-dark: #2C3E50
    static let gold = Color(red: 0.788, green: 0.659, blue: 0.341)       // --gold: #C9A857
    static let cream = Color(red: 0.965, green: 0.973, blue: 0.980)      // --cream: #F6F8FA

    // Warm, brand-tinted surfaces — swapped in for plain
    // Color(.secondarySystemBackground)/systemBackground on the main
    // dashboard/overview screens so they read as DXE rather than a
    // generic gray iOS app. Dynamic per light/dark so dark mode still
    // gets a distinct (dark-navy-tinted, not pure black) surface.
    static let screenBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.114, green: 0.145, blue: 0.180, alpha: 1) // near navyDark, darker
            : UIColor(red: 0.949, green: 0.953, blue: 0.965, alpha: 1) // faint navy-tinted gray
    })

    static let cardBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.169, green: 0.212, blue: 0.259, alpha: 1) // lighter than navyDark, gives card depth
            : UIColor(red: 0.976, green: 0.965, blue: 0.941, alpha: 1) // warm parchment/cream tint
    })

    // Thin accent rule for under section headers — a small, consistent
    // "brand" detail rather than a heavy redesign.
    static func goldRule() -> some View {
        Rectangle().fill(gold).frame(height: 2).frame(maxWidth: 36)
    }
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
