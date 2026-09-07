import SwiftUI

struct SignaturePadView: View {
    let documentId: String
    let defaultName: String
    var onSigned: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var paths: [[CGPoint]] = []
    @State private var currentPath: [CGPoint] = []
    @State private var signerName: String
    @State private var isSaving = false
    @State private var errorMessage: String?

    private static let canvasSize = CGSize(width: 340, height: 160)

    init(documentId: String, defaultName: String, onSigned: @escaping () -> Void) {
        self.documentId = documentId
        self.defaultName = defaultName
        self.onSigned = onSigned
        _signerName = State(initialValue: defaultName)
    }

    private var hasDrawn: Bool { !paths.isEmpty }
    private var canSave: Bool { hasDrawn && !signerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Sign below with your finger, confirm your name, then submit.")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                canvas
                    .frame(width: Self.canvasSize.width, height: Self.canvasSize.height)
                    .background(Color.white)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(.systemGray4)))
                    .frame(maxWidth: .infinity)

                HStack {
                    Button("Clear") {
                        paths = []
                        currentPath = []
                    }
                    .font(.caption)
                    Spacer()
                }

                TextField("Type your full name", text: $signerName)
                    .textFieldStyle(.roundedBorder)

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Sign Document")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Submit") {
                        Task { await submit() }
                    }
                    .disabled(isSaving || !canSave)
                }
            }
        }
    }

    private var canvas: some View {
        Canvas { context, size in
            for path in paths + [currentPath] {
                guard path.count > 1 else { continue }
                var p = Path()
                p.move(to: path[0])
                for point in path.dropFirst() {
                    p.addLine(to: point)
                }
                context.stroke(p, with: .color(Theme.navy), lineWidth: 2.5)
            }
        }
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { value in
                    currentPath.append(value.location)
                }
                .onEnded { _ in
                    paths.append(currentPath)
                    currentPath = []
                }
        )
    }

    private func submit() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let capturedPaths = paths
        let renderer = ImageRenderer(content:
            Canvas { context, size in
                context.fill(Path(CGRect(origin: .zero, size: size)), with: .color(.white))
                for path in capturedPaths {
                    guard path.count > 1 else { continue }
                    var p = Path()
                    p.move(to: path[0])
                    for point in path.dropFirst() {
                        p.addLine(to: point)
                    }
                    context.stroke(p, with: .color(Theme.navy), lineWidth: 2.5)
                }
            }
            .frame(width: Self.canvasSize.width, height: Self.canvasSize.height)
        )
        renderer.scale = 2

        guard let uiImage = renderer.uiImage, let pngData = uiImage.pngData() else {
            errorMessage = "Could not capture your signature."
            return
        }

        struct Payload: Encodable {
            let signatureDataUrl: String
            let signerName: String
        }
        let dataUrl = "data:image/png;base64,\(pngData.base64EncodedString())"
        do {
            try await APIClient.send(
                "api/documents/\(documentId)/sign", method: "POST",
                body: Payload(signatureDataUrl: dataUrl, signerName: signerName.trimmingCharacters(in: .whitespacesAndNewlines))
            )
            onSigned()
            dismiss()
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription ?? "Could not save your signature."
        } catch {
            errorMessage = "Could not save your signature."
        }
    }
}
