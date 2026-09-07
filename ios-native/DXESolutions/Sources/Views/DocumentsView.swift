import SwiftUI

struct DocumentsView: View {
    let project: Project

    @State private var documents: [ProjectDocument] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var downloadingId: String?
    @State private var previewItem: PreviewItem?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if documents.isEmpty {
                Text("No documents yet")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(documents) { doc in
                    Button {
                        Task { await openDocument(doc) }
                    } label: {
                        row(for: doc)
                    }
                    .disabled(downloadingId != nil)
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Documents")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadDocuments() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
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
                .select()
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
            let data = try await SupabaseConfig.client.storage
                .from("project-documents")
                .download(path: doc.filePath)
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(doc.fileName)
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            errorMessage = "Could not open \(doc.fileName)."
        }
    }
}
