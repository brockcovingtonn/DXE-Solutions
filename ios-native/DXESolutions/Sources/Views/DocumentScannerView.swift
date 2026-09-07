import SwiftUI
import VisionKit
import UIKit

/// Wraps VisionKit's document camera (same scanner as Notes/Files) for
/// capturing permits, contracts, etc. Combines all scanned pages into a
/// single PDF so multi-page scans upload as one document.
struct DocumentScannerView: UIViewControllerRepresentable {
    var onScan: (Data) -> Void
    var onCancel: () -> Void

    static var isSupported: Bool {
        VNDocumentCameraViewController.isSupported
    }

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan, onCancel: onCancel)
    }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: (Data) -> Void
        let onCancel: () -> Void

        init(onScan: @escaping (Data) -> Void, onCancel: @escaping () -> Void) {
            self.onScan = onScan
            self.onCancel = onCancel
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            guard scan.pageCount > 0 else {
                onCancel()
                return
            }
            let images = (0..<scan.pageCount).map { scan.imageOfPage(at: $0) }
            if let pdfData = Self.pdfData(from: images) {
                onScan(pdfData)
            } else {
                onCancel()
            }
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            onCancel()
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            onCancel()
        }

        private static func pdfData(from images: [UIImage]) -> Data? {
            let renderer = UIGraphicsPDFRenderer()
            let data = renderer.pdfData { context in
                for image in images {
                    context.beginPage(withBounds: CGRect(origin: .zero, size: image.size), pageInfo: [:])
                    image.draw(in: CGRect(origin: .zero, size: image.size))
                }
            }
            return data
        }
    }
}
