import SwiftUI

// Client-facing room scan history + capture entry point. Only reachable
// when project.roomScannerEnabled is on (see ProjectOverviewView). Unlike
// the staff Design Studio scan flow (quote-scoped), this always operates
// on the project directly — see RoomScanView's projectId parameter and
// api/design-studio/scans's project-scoped GET/POST authorization.
struct RoomScansView: View {
    let project: Project

    @State private var scans: [RoomScan] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showScanner = false
    @State private var previewItem: PreviewItem?
    @State private var previewLoading = false
    @State private var editScan: RoomScan?
    @State private var annotateScan: RoomScan?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let errorMessage {
                Text(errorMessage).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 14) {
                        Button {
                            showScanner = true
                        } label: {
                            Label("Scan a room", systemImage: "viewfinder")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.navy)

                        if scans.isEmpty {
                            Text("No scans yet — tap \"Scan a room\" to capture your first one.")
                                .foregroundColor(.secondary)
                                .font(.subheadline)
                                .padding(.top, 8)
                        } else {
                            ForEach(scans) { scan in
                                scanRow(scan)
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .background(Theme.screenBackground.ignoresSafeArea())
        .navigationTitle("Room Scan")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(isPresented: $showScanner) {
            RoomScanView(projectId: project.id) { _ in
                Task { await load() }
            }
        }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
        }
        .sheet(item: $annotateScan) { scan in
            RoomScanAnnotateView(scan: scan) { _ in
                Task { await load() }
            }
        }
        .sheet(item: $editScan) { scan in
            RoomScanEditorView(scan: scan) { _ in
                Task { await load() }
            }
        }
    }

    private func scanRow(_ scan: RoomScan) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(scan.roomLabel?.isEmpty == false ? scan.roomLabel! : "Scanned space").font(.subheadline.weight(.medium))
                if let area = scan.areaSqft {
                    Text("\(Int(area)) sf\(scan.areaIsEstimate ? " (approx.)" : "") · \(scan.wallCount) walls")
                        .font(.caption2).foregroundColor(.secondary)
                }
            }
            Spacer()
            VStack(spacing: 6) {
                if scan.modelUrl != nil {
                    Button("View 3D") {
                        Task { await loadPreview(scan.modelUrl, filename: "\(scan.id)-model.usdz") }
                    }
                    .font(.caption)
                    .buttonStyle(.bordered)
                    .disabled(previewLoading)
                }
                if scan.floorPlanUrl != nil {
                    Button("View 2D") {
                        Task { await loadPreview(scan.floorPlanUrl, filename: "\(scan.id)-floor-plan.png") }
                    }
                    .font(.caption)
                    .buttonStyle(.bordered)
                    .disabled(previewLoading)
                }
                Button("Edit") { editScan = scan }
                    .font(.caption)
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.gold)
                if scan.floorPlanUrl != nil {
                    Button("Annotate") { annotateScan = scan }
                        .font(.caption)
                        .buttonStyle(.bordered)
                }
            }
        }
        .padding(10)
        .dxeCard()
    }

    private func load() async {
        do {
            let response: RoomScanListResponse = try await APIClient.get("api/design-studio/scans?projectId=\(project.id)")
            scans = response.scans
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not load your scans."
        }
        isLoading = false
    }

    private func loadPreview(_ urlString: String?, filename: String) async {
        previewLoading = true
        defer { previewLoading = false }
        previewItem = await PreviewDownload.fetch(urlString: urlString, filename: filename)
    }
}
