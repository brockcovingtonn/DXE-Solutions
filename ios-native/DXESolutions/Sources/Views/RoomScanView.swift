import SwiftUI
import RoomPlan
import Supabase

// Scan a room with LiDAR, review the measured area + floor plan, then
// upload. quoteId is set when scanning against an already-saved draft
// (the scan attaches immediately); nil when scanning from the "New quote"
// builder before it has an id yet (the builder attaches it after saving).
struct RoomScanView: View {
    var quoteId: String?
    var onComplete: (RoomScan) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var controller = RoomScanController()

    @State private var stage: Stage = RoomCaptureSession.isSupported ? .scanning : .unsupported
    @State private var roomLabel = ""
    @State private var showToClient = false
    @State private var areaText = "0"
    @State private var areaIsEstimate = false
    @State private var wallCount = 0
    @State private var doorCount = 0
    @State private var windowCount = 0
    @State private var elements: [ScanElement] = []
    @State private var objects: [RoomObject] = []
    @State private var floorPlanImage: UIImage?
    @State private var modelFileURL: URL?
    @State private var glbFileURL: URL?
    @State private var isUploading = false
    @State private var errorMessage: String?

    enum Stage { case unsupported, scanning, reviewing }

    var body: some View {
        NavigationStack {
            Group {
                switch stage {
                case .unsupported: unsupportedView
                case .scanning: scanningView
                case .reviewing: reviewView
                }
            }
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Scan Room")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        controller.cancel()
                        dismiss()
                    }
                }
            }
        }
        .onReceive(controller.$finalRoom) { room in
            guard let room else { return }
            processCapturedRoom(room)
        }
    }

    private var unsupportedView: some View {
        VStack(spacing: 12) {
            Image(systemName: "viewfinder").font(.system(size: 40)).foregroundColor(.secondary)
            Text("Room scanning needs a LiDAR sensor").font(.headline)
            Text("This feature requires an iPhone 12 Pro or later Pro model, or an iPad Pro (2020 or later).")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 30)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var scanningView: some View {
        ZStack(alignment: .bottom) {
            RoomCaptureRepresentable(controller: controller)
                .ignoresSafeArea()

            if !controller.isProcessing {
                Text("For best results, scan slowly and capture all sides of large furniture and cabinetry in good lighting.")
                    .font(.caption)
                    .foregroundColor(.white)
                    .padding(10)
                    .background(.ultraThinMaterial.opacity(0.9), in: RoundedRectangle(cornerRadius: 10))
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            }

            if controller.isProcessing {
                ProgressView("Processing scan…")
                    .padding()
                    .background(.ultraThinMaterial)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.bottom, 30)
            } else {
                Button {
                    controller.finish()
                } label: {
                    Text("Done Scanning").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .padding()
                .background(.ultraThinMaterial)
            }
        }
        .onAppear { controller.start() }
        .alert(
            "Scan failed",
            isPresented: Binding(get: { controller.errorMessage != nil }, set: { if !$0 { controller.errorMessage = nil } })
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(controller.errorMessage ?? "")
        }
    }

    private var reviewView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if let floorPlanImage {
                    Image(uiImage: floorPlanImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color(.separator)))
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("ROOM LABEL").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    TextField("e.g. Kitchen", text: $roomLabel).textFieldStyle(.roundedBorder)
                }

                Toggle("Show on client proposal", isOn: $showToClient)

                VStack(alignment: .leading, spacing: 4) {
                    Text("MEASURED AREA (SF)").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    TextField("0", text: $areaText)
                        .keyboardType(.numberPad)
                        .textFieldStyle(.roundedBorder)
                    if areaIsEstimate {
                        Text("Approximate — measured from the wall layout, not a confirmed floor surface. Double-check before relying on it.")
                            .font(.caption2)
                            .foregroundColor(.orange)
                    }
                }

                HStack(spacing: 20) {
                    statPill("Walls", wallCount)
                    statPill("Doors", doorCount)
                    statPill("Windows", windowCount)
                }

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                Button {
                    Task { await uploadAndSave() }
                } label: {
                    if isUploading { ProgressView() } else { Text("Use this scan").frame(maxWidth: .infinity) }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isUploading)

                Button {
                    resetCaptureState()
                    stage = .scanning
                } label: {
                    Text("Discard and rescan").frame(maxWidth: .infinity)
                }
                .font(.footnote)
                .foregroundColor(.secondary)
                .disabled(isUploading)
            }
            .padding()
        }
    }

    private func statPill(_ label: String, _ value: Int) -> some View {
        VStack {
            Text("\(value)").font(.title3.weight(.bold)).foregroundColor(Theme.textPrimary)
            Text(label).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .dxeCard()
    }

    private func processCapturedRoom(_ room: CapturedRoom) {
        let (area, isEstimate) = RoomScanGeometry.computeAreaSqFt(room)
        areaText = String(format: "%.0f", area)
        areaIsEstimate = isEstimate
        wallCount = room.walls.count
        doorCount = room.doors.count
        windowCount = room.windows.count
        elements = RoomScanGeometry.extractElements(room)
        objects = RoomScanGeometry.extractObjects(room)
        floorPlanImage = RoomScanGeometry.renderFloorPlan(room)

        let url = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).usdz")
        do {
            try room.export(to: url, exportOptions: [.mesh, .parametric])
            modelFileURL = url
        } catch {
            errorMessage = "Could not export the 3D model: \(error.localizedDescription)"
        }

        // A simplified web-renderable model alongside the USDZ — see
        // RoomScanGLBExporter for why RoomPlan's own export can't be used
        // for this (USDZ only renders inline in iOS Safari).
        let glbData = RoomScanGLBExporter.export(room)
        let glbURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).glb")
        do {
            try glbData.write(to: glbURL)
            glbFileURL = glbURL
        } catch {
            glbFileURL = nil
        }

        stage = .reviewing
    }

    private func resetCaptureState() {
        errorMessage = nil
        floorPlanImage = nil
        if let modelFileURL { try? FileManager.default.removeItem(at: modelFileURL) }
        modelFileURL = nil
        if let glbFileURL { try? FileManager.default.removeItem(at: glbFileURL) }
        glbFileURL = nil
    }

    private func uploadAndSave() async {
        guard let modelFileURL else {
            errorMessage = "No model to upload."
            return
        }
        isUploading = true
        errorMessage = nil
        defer { isUploading = false }

        do {
            let urls: RoomScanUploadURLResponse = try await APIClient.sendDecoding(
                "api/design-studio/scans/upload-url", method: "POST", body: EmptyBody()
            )

            try await SupabaseConfig.client.storage.from("design-studio-scans").uploadToSignedURL(
                urls.model.path, token: urls.model.token, fileURL: modelFileURL,
                options: FileOptions(contentType: "model/vnd.usdz+zip")
            )

            if let floorPlanImage, let pngData = floorPlanImage.pngData() {
                let pngURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(UUID().uuidString).png")
                try pngData.write(to: pngURL)
                try await SupabaseConfig.client.storage.from("design-studio-scans").uploadToSignedURL(
                    urls.floorPlan.path, token: urls.floorPlan.token, fileURL: pngURL,
                    options: FileOptions(contentType: "image/png")
                )
                try? FileManager.default.removeItem(at: pngURL)
            }

            if let glbFileURL {
                try await SupabaseConfig.client.storage.from("design-studio-scans").uploadToSignedURL(
                    urls.modelGltf.path, token: urls.modelGltf.token, fileURL: glbFileURL,
                    options: FileOptions(contentType: "model/gltf-binary")
                )
            }

            let created: RoomScanResponse = try await APIClient.sendDecoding(
                "api/design-studio/scans", method: "POST",
                body: RoomScanCreatePayload(
                    scanId: urls.scanId,
                    quoteId: quoteId,
                    roomLabel: roomLabel.isEmpty ? nil : roomLabel,
                    showToClient: showToClient,
                    areaSqft: Double(areaText),
                    areaIsEstimate: areaIsEstimate,
                    wallCount: wallCount,
                    doorCount: doorCount,
                    windowCount: windowCount,
                    hasGltf: glbFileURL != nil,
                    elements: elements,
                    objects: objects
                )
            )

            try? FileManager.default.removeItem(at: modelFileURL)
            if let glbFileURL { try? FileManager.default.removeItem(at: glbFileURL) }
            HapticManager.success()
            onComplete(created.scan)
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save this scan: \(error.localizedDescription)"
        }
    }
}
