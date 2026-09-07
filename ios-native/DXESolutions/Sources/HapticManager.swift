import UIKit

// Central on/off switch (Settings toggle, default on) plus a thin
// wrapper over UIKit's feedback generators so call sites don't have to
// juggle generator instances or check the preference themselves.
enum HapticManager {
    private static let enabledKey = "hapticFeedbackEnabled"

    static var isEnabled: Bool {
        get {
            if UserDefaults.standard.object(forKey: enabledKey) == nil { return true }
            return UserDefaults.standard.bool(forKey: enabledKey)
        }
        set { UserDefaults.standard.set(newValue, forKey: enabledKey) }
    }

    enum ImpactStyle {
        case light, medium, heavy

        fileprivate var uiStyle: UIImpactFeedbackGenerator.FeedbackStyle {
            switch self {
            case .light: return .light
            case .medium: return .medium
            case .heavy: return .heavy
            }
        }
    }

    static func impact(_ style: ImpactStyle = .light) {
        guard isEnabled else { return }
        UIImpactFeedbackGenerator(style: style.uiStyle).impactOccurred()
    }

    static func selection() {
        guard isEnabled else { return }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    static func success() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    static func warning() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    static func error() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
