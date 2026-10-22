import SwiftUI

// Matches the CSS custom properties in app/globals.css exactly, so the
// native app reads as the same brand as the website/wrapper.
enum Theme {
    static let navy = Color(red: 0.243, green: 0.329, blue: 0.408)       // --navy: #3E5468
    static let navyDark = Color(red: 0.173, green: 0.243, blue: 0.314)   // --navy-dark: #2C3E50
    static let gold = Color(red: 0.788, green: 0.659, blue: 0.341)       // --gold: #C9A857
    static let cream = Color(red: 0.965, green: 0.973, blue: 0.980)      // --cream: #F6F8FA

    // Screen/card backgrounds and ink colors match the website's --cream /
    // --white / --navy tokens exactly (including the website's dark-mode
    // flips in app/globals.css), so the app reads as the same cool
    // navy-on-cream brand as the site rather than a warmer, parchment-y
    // variant of it.
    static let screenBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.071, green: 0.094, blue: 0.122, alpha: 1) // #12181F — website dark --cream
            : UIColor(red: 0.965, green: 0.973, blue: 0.980, alpha: 1) // #F6F8FA — website light --cream
    })

    static let cardBackground = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.122, green: 0.165, blue: 0.212, alpha: 1) // #1F2A36 — website dark --white
            : UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 1) // #FFFFFF — website light --white
    })

    // Primary "ink" color for headings/labels — replaces plain Theme.navy
    // for text so it stays legible on a dark card instead of going navy
    // text on near-navy background. Matches the website's --navy token in
    // both modes, including its dark-mode flip to a cool blue-gray (not a
    // warm tone) in app/globals.css.
    static let textPrimary = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.780, green: 0.824, blue: 0.863, alpha: 1) // #C7D2DC — website dark --navy
            : UIColor(red: 0.243, green: 0.329, blue: 0.408, alpha: 1) // #3E5468 — website light --navy
    })

    // Hairline card border — the detail that makes the cream/navy surfaces
    // read as considered rather than flat. Navy hairline on light cards
    // (matches website's light --border), neutral white hairline on dark
    // cards (matches website's dark --border-rgb: 255,255,255).
    static let cardBorder = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 1.000, green: 1.000, blue: 1.000, alpha: 0.14) // white hairline
            : UIColor(red: 0.137, green: 0.188, blue: 0.235, alpha: 0.16) // navy hairline
    })

    // Matches the website's --text-success token (app/globals.css) —
    // "done/complete" states are green on the website, never gold.
    static let success = Color(uiColor: UIColor { trait in
        trait.userInterfaceStyle == .dark
            ? UIColor(red: 0.290, green: 0.871, blue: 0.502, alpha: 1) // #4ADE80
            : UIColor(red: 0.024, green: 0.373, blue: 0.278, alpha: 1) // #065F46
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
