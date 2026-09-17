import SwiftUI
import UniformTypeIdentifiers
import Supabase

// Manually uploaded floor plans — PDF/image/CAD (DWG, DXF). Mirrors
// components/design-studio/FloorPlanManager.js. No capture step; just a
// file picker straight to Storage via a signed upload URL, matching the
// pattern already established for room scans.
struct FloorPlanManagerView: View {
    let quoteId: String

    @State private var plans: [FloorPlan] = []
    @State private var isLoading = true
    @State private var isUploading = false
    @State private var errorMessage: String?
    @State private var showFilePicker = false
    @State private var previewItem: PreviewItem?

    private let bucket = "design-studio-scans"

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if isLoading {
                ProgressView()
            } else {
                ForEach(plans) { plan in
                    FloorPlanRow(plan: plan, onToggle: { toggleShowToClient(plan, $0) }, onPreview: { previewItem = $0 }, onRemove: { remove(plan) })
                }
            }

            Button {
                showFilePicker = true
            } label: {
                if isUploading { ProgressView() } else { Label("Upload floor plan", systemImage: "doc.badge.plus").font(.caption) }
            }
            .buttonStyle(.bordered)
            .disabled(isUploading)

            Text("PDF, image, or CAD (DWG/DXF)").font(.caption2).foregroundColor(.secondary)

            if let errorMessage {
                Text(errorMessage).font(.caption).foregroundColor(.red)
            }
        }
        .fileImporter(isPresented: $showFilePicker, allowedContentTypes: [.pdf, .image, .data], allowsMultipleSelection: false) { result in
            switch result {
            case .success(let urls):
                if let url = urls.first { Task { await upload(url) } }
            case .failure(let error):
                errorMessage = error.localizedDescription
            }
        }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url)
        }
        .task { await load() }
    }

    private func load() async {
        do {
            let response: FloorPlanListResponse = try await APIClient.get("api/design-studio/floor-plans?quoteId=\(quoteId)")
            plans = response.floorPlans
        } catch {
            errorMessage = "Could not load floor plans."
        }
        isLoading = false
    }

    private func upload(_ url: URL) async {
        isUploading = true
        errorMessage = nil
        defer { isUploading = false }

        let didAccess = url.startAccessingSecurityScopedResource()
        defer { if didAccess { url.stopAccessingSecurityScopedResource() } }

        do {
            let fileData = try Data(contentsOf: url)
            let fileName = url.lastPathComponent

            let urlResponse: FloorPlanUploadURLResponse = try await APIClient.sendDecoding(
                "api/design-studio/floor-plans/upload-url", method: "POST", body: ["fileName": fileName]
            )

            try await SupabaseConfig.client.storage.from(bucket).uploadToSignedURL(
                urlResponse.path, token: urlResponse.token, data: fileData
            )

            let created: FloorPlanResponse = try await APIClient.sendDecoding(
                "api/design-studio/floor-plans", method: "POST",
                body: FloorPlanCreatePayload(id: urlResponse.id, path: urlResponse.path, fileName: fileName, quoteId: quoteId, showToClient: false)
            )
            plans.insert(created.floorPlan, at: 0)
            HapticManager.success()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not upload this file."
        }
    }

    private func toggleShowToClient(_ plan: FloorPlan, _ value: Bool) {
        guard let index = plans.firstIndex(where: { $0.id == plan.id }) else { return }
        plans[index].showToClient = value
        Task {
            let _: FloorPlanResponse? = try? await APIClient.sendDecoding(
                "api/design-studio/floor-plans/\(plan.id)", method: "PATCH", body: FloorPlanVisibilityPayload(showToClient: value)
            )
        }
    }

    private func remove(_ plan: FloorPlan) {
        plans.removeAll { $0.id == plan.id }
        Task {
            try? await APIClient.send("api/design-studio/floor-plans/\(plan.id)", method: "DELETE", body: EmptyBody())
        }
    }
}

private struct FloorPlanRow: View {
    let plan: FloorPlan
    var onToggle: (Bool) -> Void
    var onPreview: (PreviewItem) -> Void
    var onRemove: () -> Void

    @State private var previewLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(plan.fileName).font(.subheadline).lineLimit(1)
                Spacer()
                Text(plan.fileType.uppercased()).font(.caption2).foregroundColor(.secondary)
            }

            if plan.isRenderable, plan.fileUrl != nil {
                HStack(spacing: 6) {
                    Button("Preview →") {
                        Task {
                            previewLoading = true
                            defer { previewLoading = false }
                            if let item = await PreviewDownload.fetch(urlString: plan.fileUrl, filename: "\(plan.id)-\(plan.fileName)") {
                                onPreview(item)
                            }
                        }
                    }
                    .font(.caption)
                    .disabled(previewLoading)
                    if previewLoading { ProgressView().scaleEffect(0.6) }
                }
            } else if let urlString = plan.fileUrl, let url = URL(string: urlString) {
                Link("Download →", destination: url)
                    .font(.caption)
            }

            Toggle("Show on client proposal", isOn: Binding(get: { plan.showToClient }, set: onToggle))
                .font(.caption)

            Button("Remove", role: .destructive) { onRemove() }
                .font(.caption2)
        }
        .padding(8)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
