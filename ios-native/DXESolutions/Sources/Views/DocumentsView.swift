import SwiftUI
import UniformTypeIdentifiers

struct DocumentsView: View {
    let project: Project

    @EnvironmentObject var auth: AuthManager

    @State private var documents: [ProjectDocument] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var downloadingId: String?
    @State private var previewItem: PreviewItem?
    @State private var showScanner = false
    @State private var showImporter = false
    @State private var isUploading = false
    @State private var uploadMessage: String?
    @State private var signingDocument: ProjectDocument?

    private var defaultSignerName: String {
        [auth.profile?.firstName, auth.profile?.lastName].compactMap { $0 }.joined(separator: " ")
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if documents.isEmpty {
                VStack(spacing: 16) {
                    Spacer()
                    Text("No documents yet")
                        .foregroundColor(.secondary)
                    uploadControls
                    Spacer()
                }
                .frame(maxWidth: .infinity)
                .padding()
            } else {
                List(documents) { doc in
                    Button {
                        Task { await openDocument(doc) }
                    } label: {
                        row(for: doc)
                    }
                    .disabled(downloadingId != nil)
                    .swipeActions(edge: .trailing) {
                        if doc.isPdf && doc.signature == nil {
                            Button {
                                signingDocument = doc
                            } label: {
                                Label("Sign", systemImage: "signature")
                            }
                            .tint(Theme.gold)
                        }
                    }
                }
                .listStyle(.plain)
                .safeAreaInset(edge: .bottom) {
                    uploadControls
                        .padding()
                        .background(.bar)
                }
            }
        }
        .navigationTitle("Documents")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDocuments() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
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
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.item], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                Task { await uploadFile(url) }
            }
        }
        .sheet(item: $signingDocument) { doc in
            SignaturePadView(documentId: doc.id, defaultName: defaultSignerName) {
                Task { await loadDocuments() }
            }
        }
    }

    private var uploadControls: some View {
        VStack(alignment: .leading, spacing: 6) {
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
                        Label("Upload File", systemImage: "doc.badge.plus")
                    }
                }
                .disabled(isUploading)
            }
            .font(.caption.weight(.medium))

            if let uploadMessage {
                Text(uploadMessage).font(.caption).foregroundColor(.secondary)
            }
        }
    }

    private func row(for doc: ProjectDocument) -> some View {
        HStack {
            Image(systemName: icon(for: doc.fileType))
                .foregroundColor(Theme.navy)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 4) {
                Text(doc.fileName)
                    .foregroundColor(.primary)
                if let badge = doc.badge, badge != "new" {
                    Text(badge.capitalized)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(badgeColor(badge).opacity(0.15))
                        .foregroundColor(badgeColor(badge))
                        .clipShape(Capsule())
                }
                if let signature = doc.signature {
                    Label("Signed by \(signature.signerName)", systemImage: "checkmark.seal.fill")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
            }
            Spacer()
            if downloadingId == doc.id {
                ProgressView()
            } else {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func icon(for fileType: String?) -> String {
        switch (fileType ?? "").lowercased() {
        case "pdf": return "doc.richtext"
        case "doc", "docx": return "doc.text"
        case "jpg", "jpeg", "png", "heic": return "photo"
        default: return "doc"
        }
    }

    private func badgeColor(_ badge: String) -> Color {
        switch badge {
        case "signed": return .green
        case "pending": return .orange
        case "contract": return Theme.navy
        default: return Theme.gold
        }
    }

    private func loadDocuments() async {
        do {
            let documents: [ProjectDocument] = try await SupabaseConfig.client
                .from("documents")
                .select("*, document_signatures(signer_name, created_at)")
                .eq("project_id", value: project.id)
                .order("created_at", ascending: false)
                .execute()
                .value
            self.documents = documents
        } catch {
            errorMessage = "Could not load documents."
        }
        isLoading = false
    }

    private func openDocument(_ doc: ProjectDocument) async {
        downloadingId = doc.id
        defer { downloadingId = nil }
        do {
            let data: Data
            if let signedPdfPath = await signedPdfPath(for: doc) {
                data = try await SupabaseConfig.client.storage
                    .from("document-signatures")
                    .download(path: signedPdfPath)
            } else {
                data = try await SupabaseConfig.client.storage
                    .from("project-documents")
                    .download(path: doc.filePath)
            }
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(doc.fileName)
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            errorMessage = "Could not open \(doc.fileName)."
        }
    }

    private func signedPdfPath(for doc: ProjectDocument) async -> String? {
        guard doc.signature != nil else { return nil }
        struct SignedPdfRow: Codable { let signedPdfPath: String
            enum CodingKeys: String, CodingKey { case signedPdfPath = "signed_pdf_path" }
        }
        let row: SignedPdfRow? = try? await SupabaseConfig.client
            .from("document_signatures")
            .select("signed_pdf_path")
            .eq("document_id", value: doc.id)
            .single()
            .execute()
            .value
        return row?.signedPdfPath
    }

    private func uploadScanned(_ data: Data) async {
        let fileName = "Scan \(Int(Date().timeIntervalSince1970 * 1000)).pdf"
        await upload(data, fileName: fileName, fileType: "pdf")
    }

    private func uploadFile(_ url: URL) async {
        guard url.startAccessingSecurityScopedResource() else {
            uploadMessage = "Could not access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url) else {
            uploadMessage = "Could not read the selected file."
            return
        }

        await upload(data, fileName: url.lastPathComponent, fileType: url.pathExtension)
    }

    private func upload(_ data: Data, fileName: String, fileType: String) async {
        isUploading = true
        uploadMessage = nil
        defer { isUploading = false }

        let filePath = "\(project.id)/\(Int(Date().timeIntervalSince1970 * 1000))-\(fileName)"

        do {
            try await SupabaseConfig.client.storage.from("project-documents").upload(filePath, data: data)

            struct Payload: Encodable {
                let projectId: String
                let fileName: String
                let filePath: String
                let fileType: String
            }
            let payload = Payload(projectId: project.id, fileName: fileName, filePath: filePath, fileType: fileType)
            try await APIClient.send("api/documents", method: "POST", body: payload)
            await loadDocuments()
        } catch {
            uploadMessage = "Could not upload document."
        }
    }
}
