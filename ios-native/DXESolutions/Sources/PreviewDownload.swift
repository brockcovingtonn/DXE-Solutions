import Foundation

// QLPreviewController needs a local file with a recognizable extension to
// pick the right renderer — handing it a remote signed URL directly (no
// extension, just a query-string signature) makes it fall back to a
// generic placeholder instead of actually rendering anything. Every other
// preview flow in this app (AccountingView, ProposalsView, DocumentsView,
// etc.) already downloads to a local temp file before handing it to
// QuickLookPreview; this brings Design Studio's scan/floor-plan previews
// in line with that same convention.
enum PreviewDownload {
    static func fetch(urlString: String?, filename: String) async -> PreviewItem? {
        guard let urlString, let url = URL(string: urlString) else { return nil }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            try data.write(to: tempURL)
            return PreviewItem(url: tempURL)
        } catch {
            return nil
        }
    }
}
