import SwiftUI

// Staff-facing, read-only list of a project's room scans (client-captured
// or staff-captured-and-attached). Scoped server-side: master admins see
// everything, employees only if assigned to the project — see the
// project-scoped branch of api/design-studio/scans's GET handler.
struct AdminRoomScansEditor: View {
    let projectId: String

    @State private var scans: [RoomScan] = []
    @State private var isLoading = true
    @State private var previewItem: PreviewItem?
    @State private var previewLoading = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isLoading {
                ProgressView()
            } else if scans.isEmpty {
                Text("No room scans on this project yet.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(scans) { scan in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(scan.roomLabel?.isEmpty == false ? scan.roomLabel! : "Scanned space").font(.subheadline)
                            if let area = scan.areaSqft {
                                Text("\(Int(area)) sf\(scan.areaIsEstimate ? " (approx.)" : "") · \(scan.wallCount) walls")
                                    .font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        if scan.modelUrl != nil {
                            Button("View") {
                                Task { await loadPreview(scan.modelUrl, filename: "\(scan.id)-model.usdz") }
                            }
                            .font(.caption)
                            .buttonStyle(.bordered)
                            .disabled(previewLoading)
                        }
                    }
                    .padding(10)
                    .dxeCard()
                }
            }
        }
        .task { await load() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
        }
    }

    private func load() async {
        let response: RoomScanListResponse? = try? await APIClient.get("api/design-studio/scans?projectId=\(projectId)")
        scans = response?.scans ?? []
        isLoading = false
    }

    private func loadPreview(_ urlString: String?, filename: String) async {
        previewLoading = true
        defer { previewLoading = false }
        previewItem = await PreviewDownload.fetch(urlString: urlString, filename: filename)
    }
}
