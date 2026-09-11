import SwiftUI

// Client-facing proposals list. RLS already limits this to
// visible_to_client = true, non-draft proposals on the caller's own
// project, so the plain select below only ever returns what they
// should see.
struct ProposalsView: View {
    let project: Project

    @State private var proposals: [Proposal] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var openingId: String?
    @State private var previewItem: PreviewItem?
    @State private var openError: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if proposals.isEmpty {
                Text("No proposals have been shared on this project yet.")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(proposals) { proposal in
                            Button {
                                Task { await openPDF(proposal) }
                            } label: {
                                row(proposal)
                            }
                            .buttonStyle(.plain)
                            .disabled(proposal.pdfPath == nil || openingId != nil)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Proposals")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
        }
        .alert("Proposal", isPresented: Binding(get: { openError != nil }, set: { if !$0 { openError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(openError ?? "")
        }
    }

    private func row(_ proposal: Proposal) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "doc.text.fill")
                .foregroundColor(Theme.navy)
            VStack(alignment: .leading, spacing: 3) {
                Text(proposal.title).font(.subheadline.weight(.medium)).foregroundColor(.primary)
                Text(subtitle(proposal)).font(.caption).foregroundColor(.secondary)
            }
            Spacer()
            if openingId == proposal.id {
                ProgressView()
            } else {
                Text(currency(proposal.total)).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func subtitle(_ proposal: Proposal) -> String {
        var parts: [String] = []
        if proposal.status == "sent", let sentAt = proposal.sentAt {
            parts.append("Sent \(sentAt)")
        } else if let finalizedAt = proposal.finalizedAt {
            parts.append("Shared \(finalizedAt)")
        }
        if let validUntil = proposal.validUntil {
            parts.append("Valid until \(validUntil)")
        }
        return parts.isEmpty ? "—" : parts.joined(separator: " · ")
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func load() async {
        do {
            let proposals: [Proposal] = try await SupabaseConfig.client
                .from("proposals")
                .select()
                .eq("project_id", value: project.id)
                .order("created_at", ascending: false)
                .execute()
                .value
            self.proposals = proposals
        } catch {
            errorMessage = "Could not load proposals."
        }
        isLoading = false
    }

    private func openPDF(_ proposal: Proposal) async {
        guard let path = proposal.pdfPath else { return }
        openingId = proposal.id
        defer { openingId = nil }
        do {
            let data = try await SupabaseConfig.client.storage
                .from("project-proposals")
                .download(path: path)
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(proposal.title).pdf")
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            openError = "Could not open this proposal."
        }
    }
}
