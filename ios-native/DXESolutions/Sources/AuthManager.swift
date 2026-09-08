import Foundation
import Supabase
import UserNotifications

struct Profile: Codable {
    let id: String
    let firstName: String?
    let lastName: String?
    let phone: String?
    let isAdmin: Bool
    let isEmployee: Bool
    let emailNotifications: Bool?

    enum CodingKeys: String, CodingKey {
        case id, phone
        case firstName = "first_name"
        case lastName = "last_name"
        case isAdmin = "is_admin"
        case isEmployee = "is_employee"
        case emailNotifications = "email_notifications"
    }
}

@MainActor
final class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var profile: Profile?
    @Published var errorMessage: String?
    @Published var isLoading = false
    @Published var isRestoringSession = true
    @Published var isLockedByBiometrics = false
    @Published var unreadMessageCount = 0

    private let client = SupabaseConfig.client

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        defer { isRestoringSession = false }
        guard let session = try? await client.auth.session else { return }
        isAuthenticated = true
        await loadProfile(userId: session.user.id.uuidString)
        PushNotificationManager.shared.userSignedIn(userId: session.user.id.uuidString)
        PushNotificationManager.shared.requestPermissionIfNeeded()
        if BiometricAuth.isEnabled && BiometricAuth.availableType != .none {
            isLockedByBiometrics = true
        }
        await refreshUnreadCount()
    }

    // Badges the Dashboard tab (where chat is reached from) with the
    // total across every thread this user can see — their own DM plus,
    // for an employee, any assigned project's thread.
    func refreshUnreadCount() async {
        struct UnreadRow: Decodable {
            let unreadCount: Int
            enum CodingKeys: String, CodingKey { case unreadCount = "unread_count" }
        }
        guard let rows: [UnreadRow] = try? await client.rpc("get_unread_message_counts").execute().value else { return }
        unreadMessageCount = rows.reduce(0) { $0 + $1.unreadCount }
        // Keep the OS app-icon badge in sync with real state — pushes
        // set it too, but this covers messages read in-app between
        // pushes (and devices where a push never arrived at all).
        try? await UNUserNotificationCenter.current().setBadgeCount(unreadMessageCount)
    }

    func unlockWithBiometrics() async -> Bool {
        let success = await BiometricAuth.authenticate(reason: "Unlock DXE Solutions")
        if success { isLockedByBiometrics = false }
        return success
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let session = try await client.auth.signIn(email: email, password: password)
            isAuthenticated = true
            await loadProfile(userId: session.user.id.uuidString)
            PushNotificationManager.shared.userSignedIn(userId: session.user.id.uuidString)
            PushNotificationManager.shared.requestPermissionIfNeeded()
            await refreshUnreadCount()
        } catch {
            errorMessage = "Incorrect email or password. Please try again."
        }
        isLoading = false
    }

    func signOut() async {
        await PushNotificationManager.shared.userSignedOut()
        try? await client.auth.signOut()
        isAuthenticated = false
        profile = nil
        isLockedByBiometrics = false
        unreadMessageCount = 0
    }

    func refreshProfile() async {
        guard let userId = profile?.id else { return }
        await loadProfile(userId: userId)
    }

    private func loadProfile(userId: String) async {
        do {
            let profile: Profile = try await client
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            self.profile = profile
        } catch {
            errorMessage = "Signed in, but could not load your profile."
        }
    }
}
