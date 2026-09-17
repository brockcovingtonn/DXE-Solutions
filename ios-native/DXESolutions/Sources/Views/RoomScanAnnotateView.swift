import SwiftUI
import PencilKit
import Supabase

// Draw over a scan's floor plan and correct its measured elements while
// walking the project, then export a PDF (markup + measurements table)
// saved back to the scan. Mirrors the "Annotate" entry point on the scan
// row in DesignStudioQuoteDetailView.
struct RoomScanAnnotateView: View {
    let scan: RoomScan
    var onSaved: (RoomScan) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var floorPlanImage: UIImage?
    @State private var isLoadingImage = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var elements: [ScanElement]
    @StateObject private var canvasHolder = CanvasHolder()

    // Pinch-zoom/rotate is a viewing aid for drawing precise detail while
    // walking a project — purely a SwiftUI-level transform on the display,
    // not a change to PencilKit's own coordinate space, so it needs no
    // changes to compositeAnnotation()/save() below.
    @GestureState private var gestureScale: CGFloat = 1
    @GestureState private var gestureRotation: Angle = .zero
    @State private var committedScale: CGFloat = 1
    @State private var committedRotation: Angle = .zero

    init(scan: RoomScan, onSaved: @escaping (RoomScan) -> Void) {
        self.scan = scan
        self.onSaved = onSaved
        _elements = State(initialValue: scan.elements)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    canvasArea

                    HStack(spacing: 16) {
                        Button("Clear markup") { canvasHolder.canvasView.drawing = PKDrawing() }
                        Button("Reset view") {
                            withAnimation { committedScale = 1; committedRotation = .zero }
                        }
                    }
                    .font(.caption)

                    if !elements.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("MEASUREMENTS").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                            ForEach($elements) { $element in
                                measurementRow($element)
                            }
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).font(.caption).foregroundColor(.red)
                    }

                    Button {
                        Task { await save() }
                    } label: {
                        if isSaving { ProgressView() } else { Text("Save annotation").frame(maxWidth: .infinity) }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.navy)
                    .disabled(isSaving || floorPlanImage == nil)
                }
                .padding()
            }
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Annotate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task { await loadImage() }
    }

    @ViewBuilder
    private var canvasArea: some View {
        if let floorPlanImage {
            ZStack {
                Image(uiImage: floorPlanImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .background(Color.white)
                PencilCanvasRepresentable(canvasHolder: canvasHolder)
            }
            .aspectRatio(floorPlanImage.size.width / max(floorPlanImage.size.height, 1), contentMode: .fit)
            .scaleEffect(committedScale * gestureScale)
            .rotationEffect(committedRotation + gestureRotation)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(.separator)))
            .clipped()
            .gesture(
                MagnificationGesture()
                    .updating($gestureScale) { value, state, _ in state = value }
                    .onEnded { value in committedScale = max(1, min(committedScale * value, 5)) }
                    .simultaneously(
                        with: RotationGesture()
                            .updating($gestureRotation) { value, state, _ in state = value }
                            .onEnded { value in committedRotation += value }
                    )
            )
        } else if isLoadingImage {
            ProgressView().frame(maxWidth: .infinity, minHeight: 240)
        } else {
            Text("No floor plan image to annotate.").font(.caption).foregroundColor(.secondary)
        }
    }

    private func measurementRow(_ element: Binding<ScanElement>) -> some View {
        HStack(spacing: 8) {
            Text(element.wrappedValue.label).font(.caption).frame(width: 64, alignment: .leading)
            TextField("Length ft", value: element.lengthFt, format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
            Text("×").font(.caption2).foregroundColor(.secondary)
            TextField("Height ft", value: element.heightFt, format: .number)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func loadImage() async {
        defer { isLoadingImage = false }
        guard let urlString = scan.floorPlanUrl, let url = URL(string: urlString) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            floorPlanImage = UIImage(data: data)
        } catch {
            errorMessage = "Could not load the floor plan image."
        }
    }

    private func save() async {
        guard let floorPlanImage else { return }
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        do {
            let markedUp = RoomScanGeometry.compositeAnnotation(
                baseImage: floorPlanImage,
                drawing: canvasHolder.canvasView.drawing,
                canvasSize: canvasHolder.canvasView.bounds.size
            )
            let pdfData = RoomScanGeometry.renderAnnotationPDF(image: markedUp, elements: elements, roomLabel: scan.roomLabel)

            let uploadURL: RoomScanAnnotationUploadURLResponse = try await APIClient.sendDecoding(
                "api/design-studio/scans/\(scan.id)/annotation-upload-url", method: "POST", body: EmptyBody()
            )
            try await SupabaseConfig.client.storage.from("design-studio-scans").uploadToSignedURL(
                uploadURL.path, token: uploadURL.token, data: pdfData,
                options: FileOptions(contentType: "application/pdf")
            )

            let updated: RoomScanResponse = try await APIClient.sendDecoding(
                "api/design-studio/scans/\(scan.id)", method: "PATCH",
                body: RoomScanAnnotationSavePayload(elements: elements, hasAnnotatedPdf: true)
            )
            HapticManager.success()
            onSaved(updated.scan)
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save the annotation: \(error.localizedDescription)"
        }
    }
}

// Holds the PKCanvasView/PKToolPicker pair as reference types so the
// "Clear markup" button and the save path can reach the same instance the
// representable created, without routing drawing state through SwiftUI.
private final class CanvasHolder: ObservableObject {
    let canvasView = PKCanvasView()
    let toolPicker = PKToolPicker()
}

private struct PencilCanvasRepresentable: UIViewRepresentable {
    let canvasHolder: CanvasHolder

    func makeUIView(context: Context) -> PKCanvasView {
        let canvasView = canvasHolder.canvasView
        canvasView.drawingPolicy = .anyInput
        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false
        canvasHolder.toolPicker.addObserver(canvasView)
        canvasHolder.toolPicker.setVisible(true, forFirstResponder: canvasView)
        canvasView.becomeFirstResponder()
        return canvasView
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
