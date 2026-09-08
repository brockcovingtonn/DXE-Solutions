import SwiftUI

// A horizontal ScrollView near the top of a pushed screen (like the
// roster/presence strip on chat threads) competes with the system's
// edge-swipe-to-go-back gesture for the same touch — by default
// UIKit requires one gesture recognizer to fail before the other can
// recognize, and the ScrollView usually wins, silently breaking
// swipe-back. Explicitly allowing simultaneous recognition fixes it.
private struct SwipeBackEnabler: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        let controller = UIViewController()
        DispatchQueue.main.async {
            if let navigationController = controller.navigationController {
                navigationController.interactivePopGestureRecognizer?.isEnabled = true
                navigationController.interactivePopGestureRecognizer?.delegate = context.coordinator
            }
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator: NSObject, UIGestureRecognizerDelegate {
        func gestureRecognizer(
            _ gestureRecognizer: UIGestureRecognizer,
            shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer
        ) -> Bool {
            true
        }
    }
}

extension View {
    func enableSwipeBack() -> some View {
        background(SwipeBackEnabler())
    }
}
