import SwiftUI
import AuthenticationServices

// Drives the same OAuth handshake the web admin/employee calendar page
// uses (see app/api/admin/google-calendar/connect+callback), just
// carried differently: ASWebAuthenticationSession can't attach an
// Authorization header to either leg of the round trip, so the
// Supabase access token rides along as ?access_token= on the way out,
// and our own callback route redirects to a dxesolutions:// URL (which
// ASWebAuthenticationSession intercepts directly — no Info.plist
// registration needed for that) instead of a web page on the way back.
@MainActor
final class GoogleCalendarConnectionModel: NSObject, ObservableObject, ASWebAuthenticationPresentationContextProviding {
    @Published var isConnected = false
    @Published var isLoading = true
    @Published var isWorking = false
    @Published var message: String?

    private var authSession: ASWebAuthenticationSession?

    func loadStatus() async {
        struct StatusResponse: Decodable { let connected: Bool }
        if let response: StatusResponse = try? await APIClient.get("api/admin/google-calendar/status") {
            isConnected = response.connected
        }
        isLoading = false
    }

    func connect() async {
        guard let session = try? await SupabaseConfig.client.auth.session else {
            message = "Not signed in."
            return
        }
        var components = URLComponents(
            url: AppConfig.siteURL.appendingPathComponent("api/admin/google-calendar/connect"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [URLQueryItem(name: "access_token", value: session.accessToken)]
        guard let url = components?.url else { return }

        isWorking = true
        let webAuthSession = ASWebAuthenticationSession(url: url, callbackURLScheme: "dxesolutions") { [weak self] callbackURL, error in
            guard let self else { return }
            self.isWorking = false

            let nsError = error as NSError?
            let userCanceled = nsError?.domain == ASWebAuthenticationSessionErrorDomain
                && nsError?.code == ASWebAuthenticationSessionError.canceledLogin.rawValue
            if userCanceled { return }

            guard let callbackURL else {
                self.message = "Could not connect Google Calendar."
                return
            }
            let status = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "status" })?.value
            if status == "connected" {
                Task { await self.loadStatus() }
            } else {
                self.message = "Could not connect Google Calendar. Please try again."
            }
        }
        webAuthSession.presentationContextProvider = self
        // Shared browser session (not ephemeral) — if Dixie's already
        // signed into Google in Safari, she won't have to sign in again.
        webAuthSession.prefersEphemeralWebBrowserSession = false
        authSession = webAuthSession
        webAuthSession.start()
    }

    func disconnect() async {
        isWorking = true
        defer { isWorking = false }
        do {
            try await APIClient.send("api/admin/google-calendar/disconnect", method: "POST", body: EmptyBody())
            isConnected = false
        } catch {
            message = "Could not disconnect."
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}

struct GoogleCalendarConnection: View {
    @StateObject private var model = GoogleCalendarConnectionModel()

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "calendar.badge.checkmark")
                .foregroundColor(model.isConnected ? .green : .secondary)
            Text(model.isLoading ? "Checking Google Calendar…" : "Google Calendar: \(model.isConnected ? "Connected (two-way sync)" : "Not connected")")
                .font(.caption)
            Spacer()
            if model.isWorking {
                ProgressView()
            } else if !model.isLoading {
                Button(model.isConnected ? "Disconnect" : "Connect") {
                    Task {
                        if model.isConnected {
                            await model.disconnect()
                        } else {
                            await model.connect()
                        }
                    }
                }
                .font(.caption.weight(.semibold))
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .task { await model.loadStatus() }
        .alert("Google Calendar", isPresented: Binding(get: { model.message != nil }, set: { if !$0 { model.message = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(model.message ?? "")
        }
    }
}
