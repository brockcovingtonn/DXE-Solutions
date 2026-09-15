import SwiftUI
import RoomPlan

// Drives a single RoomPlan capture. RoomCaptureView does the live AR
// overlay; this owns its session lifecycle and receives the finished,
// beautified CapturedRoom via the delegate once finish() stops the session.
final class RoomScanController: NSObject, ObservableObject, RoomCaptureViewDelegate {
    let captureView = RoomCaptureView(frame: .zero)

    @Published var isProcessing = false
    @Published var finalRoom: CapturedRoom?
    @Published var errorMessage: String?

    override init() {
        super.init()
        captureView.delegate = self
    }

    // RoomCaptureViewDelegate inherits NSCoding — a framework quirk, not
    // something this controller is ever actually archived through.
    init?(coder: NSCoder) {
        super.init()
    }

    func encode(with coder: NSCoder) {}

    func start() {
        guard RoomCaptureSession.isSupported else { return }
        captureView.captureSession.run(configuration: RoomCaptureSession.Configuration())
    }

    func finish() {
        isProcessing = true
        captureView.captureSession.stop()
    }

    func cancel() {
        captureView.captureSession.stop()
    }

    func captureView(didPresent processedResult: CapturedRoom, error: (any Error)?) {
        isProcessing = false
        if let error {
            errorMessage = error.localizedDescription
        } else {
            finalRoom = processedResult
        }
    }
}

struct RoomCaptureRepresentable: UIViewRepresentable {
    @ObservedObject var controller: RoomScanController

    func makeUIView(context: Context) -> RoomCaptureView {
        controller.captureView
    }

    func updateUIView(_ uiView: RoomCaptureView, context: Context) {}
}
