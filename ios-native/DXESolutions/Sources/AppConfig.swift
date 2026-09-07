import Foundation

// Public, non-secret app-wide config values.
enum AppConfig {
    // TODO: fill in the real Google Business Profile Place ID — see
    // .env.local.example on the web project for how to look it up.
    // Powers the "Share this on Google too" prompt on Leave a Review.
    static let googlePlaceId = ""

    static var googleReviewURL: URL? {
        guard !googlePlaceId.isEmpty else { return nil }
        return URL(string: "https://search.google.com/local/writereview?placeid=\(googlePlaceId)")
    }

    static let siteURL = URL(string: "https://www.dxesolutions.com")!

    static var assistantChatURL: URL {
        siteURL.appendingPathComponent("api/assistant/chat")
    }
}
