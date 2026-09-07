import SwiftUI
import UniformTypeIdentifiers

struct AdminDocumentsEditor: View {
    let projectId: String

    @State private var documents: [ProjectDocument] = []
    @State private var isLoading = true
    @State private var isUploading = false
    @State private var message: String?
    @State private var busyId: String?
    @State private var showImporter = false
    @State private var showScanner = false

    private let badges = ["new", "signed", "pending", "contract"]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isLoading {
                ProgressView()
            } else {
                if documents.isEmpty {
                    Text("No documents yet.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(documents) { doc in
                        row(doc)
                    }
                }

                HStack(spacing: 16) {
                    if DocumentScannerView.isSupported {
                        Button {
                            showScanner = true
                        } label: {
                            Label("Scan Document", systemImage: "doc.viewfinder")
                        }
                        .disabled(isUploading)
                    }

                    Button {
                        showImporter = true
                    } label: {
                        if isUploading {
                            ProgressView()
                        } else {
                            Label("Upload Document", systemImage: "doc.badge.plus")
                        }
                    }
                    .disabled(isUploading)
                }
                .font(.caption.weight(.medium))

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.item], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                Task { await upload(url) }
            }
        }
        .fullScreenCover(isPresented: $showScanner) {
            DocumentScannerView(
                onScan: { data in
                    showScanner = false
                    Task { await uploadScanned(data) }
                },
                onCancel: { showScanner = false }
            )
            .ignoresSafeArea()
        }
    }

    private func row(_ doc: ProjectDocument) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(doc.fileName).font(.subheadline.weight(.medium))
                Menu {
                    ForEach(badges, id: \.self) { badge in
                        Button(badge.capitalized) { Task { await setBadge(doc, badge: badge) } }
                    }
                } label: {
                    Text(doc.badge?.capitalized ?? "New").font(.caption).foregroundColor(Theme.gold)
                }
            }
            Spacer()
            if busyId == doc.id {
                ProgressView()
            } else {
                Button {
                    Task { await delete(doc) }
                } label: {
                    Image(systemName: "trash").foregroundColor(.red)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func load() async {
        documents = (try? await SupabaseConfig.client
            .from("documents").select().eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        isLoading = false
    }

    private func upload(_ url: URL) async {
        isUploading = true
        message = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            message = "Could not access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url) else {
            message = "Could not read the selected file."
            return
        }

        await uploadData(data, fileName: url.lastPathComponent, fileType: url.pathExtension)
    }

    private func uploadScanned(_ data: Data) async {
        isUploading = true
        message = nil
        defer { isUploading = false }

        let fileName = "Scan \(Int(Date().timeIntervalSince1970 * 1000)).pdf"
        await uploadData(data, fileName: fileName, fileType: "pdf")
    }

    private func uploadData(_ data: Data, fileName: String, fileType: String) async {
        let filePath = "\(projectId)/\(Int(Date().timeIntervalSince1970 * 1000))-\(fileName)"

        do {
            try await SupabaseConfig.client.storage.from("project-documents").upload(filePath, data: data)

            struct Payload: Encodable {
                let projectId: String
                let fileName: String
                let filePath: String
                let fileType: String
                let badge: String
            }
            let payload = Payload(
                projectId: projectId, fileName: fileName, filePath: filePath,
                fileType: fileType, badge: "new"
            )
            try await APIClient.send("api/admin/documents", method: "POST", body: payload)
            await load()
        } catch {
            message = "Could not upload document."
        }
    }

    private func setBadge(_ doc: ProjectDocument, badge: String) async {
        busyId = doc.id
        defer { busyId = nil }
        struct Payload: Encodable { let badge: String }
        do {
            try await APIClient.send("api/admin/documents/\(doc.id)", method: "PATCH", body: Payload(badge: badge))
            await load()
        } catch {
            message = "Could not update document."
        }
    }

    private func delete(_ doc: ProjectDocument) async {
        busyId = doc.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/documents/\(doc.id)", method: "DELETE", body: EmptyBody())
            documents.removeAll { $0.id == doc.id }
        } catch {
            message = "Could not delete document."
        }
    }
}
