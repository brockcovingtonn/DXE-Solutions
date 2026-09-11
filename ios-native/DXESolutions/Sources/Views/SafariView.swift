import SwiftUI
import SafariServices

// Presents an external URL (Stripe Checkout, etc.) in an in-app Safari
// sheet rather than handing off to the system browser — keeps the user
// inside the app's flow and lets Stripe's own redirect land on our
// origin inside the same sheet.
struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

// `.sheet(item:)` needs Identifiable; URL itself isn't, so wrap it
// rather than adding a retroactive conformance on a foundation type.
struct IdentifiableURL: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}
