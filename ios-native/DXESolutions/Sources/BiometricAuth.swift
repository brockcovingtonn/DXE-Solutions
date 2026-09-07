import Foundation
import LocalAuthentication

enum BiometricType {
    case none
    case touchID
    case faceID

    var label: String {
        switch self {
        case .none: return "Biometric Unlock"
        case .touchID: return "Touch ID"
        case .faceID: return "Face ID"
        }
    }

    var iconName: String {
        switch self {
        case .none: return "lock"
        case .touchID: return "touchid"
        case .faceID: return "faceid"
        }
    }
}

// The session itself is already persisted securely (supabase-swift's
// default AuthLocalStorage is Keychain-backed), so a restored launch
// already skips password re-entry. This just gates that silent restore
// behind a biometric prompt, so anyone who picks up the phone can't
// simply open the app into a signed-in account.
enum BiometricAuth {
    private static let enabledKey = "biometricUnlockEnabled"

    static var isEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: enabledKey) }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    static var availableType: BiometricType {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return .none
        }
        switch context.biometryType {
        case .faceID: return .faceID
        case .touchID: return .touchID
        default: return .none
        }
    }

    @MainActor
    static func authenticate(reason: String) async -> Bool {
        let context = LAContext()
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil) else {
            return false
        }
        return (try? await context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason)) ?? false
    }
}
