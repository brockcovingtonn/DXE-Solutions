import Foundation
import UIKit
import UserNotifications

@MainActor
final class PushNotificationManager {
    static let shared = PushNotificationManager()

    private var deviceToken: String?
    private var userId: String?

    private init() {}

    func requestPermissionIfNeeded() {
        Task {
            let center = UNUserNotificationCenter.current()
            let settings = await center.notificationSettings()
            switch settings.authorizationStatus {
            case .authorized, .provisional:
                UIApplication.shared.registerForRemoteNotifications()
            case .notDetermined:
                if let granted = try? await center.requestAuthorization(options: [.alert, .badge, .sound]), granted {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            default:
                break
            }
        }
    }

    // For Settings to show the user their current state — iOS has no
    // API to silently grant alert/sound/banner permission, so a user
    // who declined (or turned it off system-wide) needs a way back in.
    func currentAuthorizationStatus() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    func didRegister(tokenData: Data) {
        deviceToken = tokenData.map { String(format: "%02x", $0) }.joined()
        Task { await uploadTokenIfReady() }
    }

    func userSignedIn(userId: String) {
        self.userId = userId
        Task { await uploadTokenIfReady() }
    }

    func userSignedOut() async {
        defer { userId = nil }
        guard let userId, let deviceToken else { return }
        try? await SupabaseConfig.client
            .from("device_tokens")
            .delete()
            .eq("user_id", value: userId)
            .eq("token", value: deviceToken)
            .execute()
    }

    private func uploadTokenIfReady() async {
        guard let userId, let deviceToken else { return }

        struct TokenRow: Encodable {
            let user_id: String
            let token: String
            let environment: String
        }

        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif

        do {
            try await SupabaseConfig.client
                .from("device_tokens")
                .upsert(TokenRow(user_id: userId, token: deviceToken, environment: environment), onConflict: "user_id,token")
                .execute()
        } catch {
            // Non-critical — will retry on next launch or re-registration.
        }
    }
}
