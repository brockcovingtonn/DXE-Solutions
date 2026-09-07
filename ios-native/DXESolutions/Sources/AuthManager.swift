import Foundation
import Supabase

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

    private let client = SupabaseConfig.client

    init() {
        Task { await restoreSession() }
    }

    func restoreSession() async {
        defer { isRestoringSession = false }
        guard let session = try? await client.auth.session else { return }
        isAuthenticated = true
        await loadProfile(userId: session.user.id.uuidString)
    }

    func signIn(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            let session = try await client.auth.signIn(email: email, password: password)
            isAuthenticated = true
            await loadProfile(userId: session.user.id.uuidString)
        } catch {
            errorMessage = "Incorrect email or password. Please try again."
        }
        isLoading = false
    }

    func signOut() async {
        try? await client.auth.signOut()
        isAuthenticated = false
        profile = nil
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
