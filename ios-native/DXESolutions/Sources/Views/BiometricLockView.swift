import SwiftUI

struct BiometricLockView: View {
    @EnvironmentObject var auth: AuthManager
    @State private var isAuthenticating = false
    @State private var errorMessage: String?

    private var biometricType: BiometricType {
        BiometricAuth.availableType
    }

    var body: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: biometricType.iconName)
                .font(.system(size: 56))
                .foregroundColor(Theme.gold)

            Text("DXE Solutions")
                .font(.title2.weight(.semibold))
                .foregroundColor(Theme.navy)

            Text("Unlock with \(biometricType.label) to continue")
                .font(.subheadline)
                .foregroundColor(.secondary)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Button {
                Task { await attemptUnlock() }
            } label: {
                if isAuthenticating {
                    ProgressView()
                } else {
                    Text("Unlock with \(biometricType.label)")
                        .frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(isAuthenticating)
            .padding(.horizontal, 40)
            .padding(.top, 8)

            Button("Sign Out") {
                Task { await auth.signOut() }
            }
            .font(.caption)
            .foregroundColor(.secondary)
            .padding(.top, 4)

            Spacer()
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground))
        .task { await attemptUnlock() }
    }

    private func attemptUnlock() async {
        isAuthenticating = true
        errorMessage = nil
        defer { isAuthenticating = false }
        let success = await auth.unlockWithBiometrics()
        if !success {
            errorMessage = "Authentication failed. Try again or sign out."
        }
    }
}
