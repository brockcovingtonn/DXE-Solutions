import SwiftUI

// Matches the CSS custom properties in app/globals.css exactly, so the
// native app reads as the same brand as the website/wrapper.
enum Theme {
    static let navy = Color(red: 0.243, green: 0.329, blue: 0.408)       // --navy: #3E5468
    static let navyDark = Color(red: 0.173, green: 0.243, blue: 0.314)   // --navy-dark: #2C3E50
    static let gold = Color(red: 0.788, green: 0.659, blue: 0.341)       // --gold: #C9A857
    static let cream = Color(red: 0.965, green: 0.973, blue: 0.980)      // --cream: #F6F8FA

    // "Navy & Parchment" — blueprint-paper light mode, near-black navy
    // dark mode. Screen/card backgrounds carry the depth; textPrimary and
    // cardBorder adapt alongside them so contrast holds in both modes.
    // Theme.navy/gold stay static above since they're also used as solid
    // fills paired with hardcoded white text (badges, chat bubbles,
    // selected-day pills) — flipping them per-mode would break that pairing.
    static let screenBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.039, green: 0.067, blue: 0.098, alpha: 1) // #0A1119 near-black navy
            : UIColor(red: 0.941, green: 0.918, blue: 0.851, alpha: 1) // #F0EAD9 parchment
    })

    static let cardBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.078, green: 0.129, blue: 0.184, alpha: 1) // #14212F deep navy card
            : UIColor(red: 1.000, green: 0.996, blue: 0.984, alpha: 1) // #FFFEFB near-white card
    })

    // Primary "ink" color for headings/labels — replaces plain Theme.navy
    // for text so it stays legible on a dark card instead of going navy
    // text on near-navy background. Warm parchment in dark mode, dark
    // navy in light mode.
    static let textPrimary = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.937, green: 0.914, blue: 0.855, alpha: 1) // #EFE9DA
            : UIColor(red: 0.137, green: 0.188, blue: 0.235, alpha: 1) // #23303C
    })

    // Hairline card border — the detail that makes the parchment/navy
    // surfaces read as considered rather than flat. Navy hairline on
    // light cards, faint gold hairline on dark cards.
    static let cardBorder = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.886, green: 0.773, blue: 0.514, alpha: 0.18) // gold hairline
            : UIColor(red: 0.137, green: 0.188, blue: 0.235, alpha: 0.16) // navy hairline
    })

    // Thin accent rule for under section headers — a small, consistent
    // "brand" detail rather than a heavy redesign.
    static func goldRule() -> some View {
        Rectangle().fill(gold).frame(height: 2).frame(maxWidth: 36)
    }
}

extension View {
    // Standard card treatment for the Navy & Parchment theme: tinted fill
    // + a hairline border so cards read as distinct surfaces rather than
    // flat color blocks, in both light and dark mode.
    func dxeCard(cornerRadius: CGFloat = 8) -> some View {
        self
            .background(Theme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(Theme.cardBorder, lineWidth: 1))
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
