import SwiftUI
import Supabase

struct SettingsView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var emailNotifications = true
    @State private var email = ""
    @State private var isSaving = false
    @State private var saveMessage: String?
    @State private var saveMessageIsError = false

    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isChangingPassword = false
    @State private var passwordMessage: String?
    @State private var passwordMessageIsError = false

    @State private var biometricEnabled = BiometricAuth.isEnabled
    @State private var biometricMessage: String?

    private var biometricType: BiometricType {
        BiometricAuth.availableType
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                profileSection
                if biometricType != .none {
                    securitySection
                }
                passwordSection
            }
            .padding()
        }
        .navigationTitle("Account Settings")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var securitySection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Divider()

            Text("SECURITY")
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
                .tracking(1)

            Toggle(isOn: Binding(
                get: { biometricEnabled },
                set: { handleBiometricToggle($0) }
            )) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Unlock with \(biometricType.label)")
                        .font(.subheadline)
                    Text("Require \(biometricType.label) each time you open the app")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .tint(Theme.gold)

            if let biometricMessage {
                Text(biometricMessage)
                    .font(.caption)
                    .foregroundColor(.red)
            }
        }
    }

    private func handleBiometricToggle(_ newValue: Bool) {
        biometricMessage = nil
        guard newValue else {
            biometricEnabled = false
            BiometricAuth.isEnabled = false
            return
        }
        Task {
            let success = await BiometricAuth.authenticate(reason: "Confirm \(biometricType.label) to enable app unlock")
            if success {
                biometricEnabled = true
                BiometricAuth.isEnabled = true
            } else {
                biometricEnabled = false
                biometricMessage = "Could not verify \(biometricType.label). Please try again."
            }
        }
    }

    private var profileSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("PROFILE")
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
                .tracking(1)

            HStack(spacing: 12) {
                field("First Name", text: $firstName)
                field("Last Name", text: $lastName)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("EMAIL ADDRESS")
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)
                Text(email)
                    .foregroundColor(.secondary)
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.tertiarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            field("Phone Number", text: $phone, keyboard: .phonePad)

            Toggle(isOn: $emailNotifications) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Email me when there's an update on my project")
                        .font(.subheadline)
                    Text("New documents, photos, notes, and status changes")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .tint(Theme.gold)
            .padding(.top, 4)

            if let saveMessage {
                Text(saveMessage)
                    .font(.caption)
                    .foregroundColor(saveMessageIsError ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
            }

            Button {
                Task { await save() }
            } label: {
                if isSaving {
                    ProgressView()
                } else {
                    Text("Save Changes")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(isSaving)
        }
    }

    private var passwordSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            Divider()

            Text("CHANGE PASSWORD")
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
                .tracking(1)

            secureField("New Password", text: $newPassword)
            secureField("Confirm New Password", text: $confirmPassword)

            if let passwordMessage {
                Text(passwordMessage)
                    .font(.caption)
                    .foregroundColor(passwordMessageIsError ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
            }

            Button {
                Task { await changePassword() }
            } label: {
                if isChangingPassword {
                    ProgressView()
                } else {
                    Text("Update Password")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(isChangingPassword)
        }
    }

    private func field(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            TextField(label, text: text)
                .keyboardType(keyboard)
                .padding(14)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func secureField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            SecureField(label, text: text)
                .padding(14)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Data

    private func load() async {
        email = (try? await SupabaseConfig.client.auth.session)?.user.email ?? ""
        if let profile = auth.profile {
            firstName = profile.firstName ?? ""
            lastName = profile.lastName ?? ""
            phone = profile.phone ?? ""
            emailNotifications = profile.emailNotifications ?? true
        }
    }

    private func save() async {
        guard let userId = auth.profile?.id else { return }
        isSaving = true
        saveMessage = nil
        defer { isSaving = false }

        struct ProfileUpdate: Encodable {
            let first_name: String
            let last_name: String
            let phone: String
            let email_notifications: Bool
        }
        let payload = ProfileUpdate(
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            email_notifications: emailNotifications
        )
        do {
            try await SupabaseConfig.client
                .from("profiles")
                .update(payload)
                .eq("id", value: userId)
                .execute()
            saveMessage = "Changes saved."
            saveMessageIsError = false
            await auth.refreshProfile()
        } catch {
            saveMessage = "Could not save changes. Please try again."
            saveMessageIsError = true
        }
    }

    private func changePassword() async {
        passwordMessage = nil

        guard newPassword.count >= 8 else {
            passwordMessage = "Password must be at least 8 characters."
            passwordMessageIsError = true
            return
        }
        guard newPassword == confirmPassword else {
            passwordMessage = "Passwords do not match."
            passwordMessageIsError = true
            return
        }

        isChangingPassword = true
        defer { isChangingPassword = false }

        do {
            _ = try await SupabaseConfig.client.auth.update(user: UserAttributes(password: newPassword))
            newPassword = ""
            confirmPassword = ""
            passwordMessage = "Password updated."
            passwordMessageIsError = false
        } catch {
            passwordMessage = "Could not update your password. Please try again."
            passwordMessageIsError = true
        }
    }
}
