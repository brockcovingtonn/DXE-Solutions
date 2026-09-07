import SwiftUI
import UIKit

/// Wraps UIImagePickerController's camera source so a photo can be
/// captured directly, alongside the library-only PhotosPicker.
struct CameraCapture: UIViewControllerRepresentable {
    var onCapture: (Data) -> Void
    var onCancel: () -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onCapture: onCapture, onCancel: onCancel)
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onCapture: (Data) -> Void
        let onCancel: () -> Void

        init(onCapture: @escaping (Data) -> Void, onCancel: @escaping () -> Void) {
            self.onCapture = onCapture
            self.onCancel = onCancel
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage, let data = image.jpegData(compressionQuality: 0.85) {
                onCapture(data)
            } else {
                onCancel()
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            onCancel()
        }
    }
}

extension UIImagePickerController {
    static var isCameraAvailable: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }
}
