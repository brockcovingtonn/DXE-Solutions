import SwiftUI

// Client-facing proposals list. RLS already limits this to
// visible_to_client = true, non-draft proposals on the caller's own
// project, so the plain select below only ever returns what they
// should see.
struct ProposalsView: View {
    let project: Project

    @EnvironmentObject var auth: AuthManager

    @State private var proposals: [Proposal] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var openingId: String?
    @State private var previewItem: PreviewItem?
    @State private var openError: String?
    @State private var signingProposal: Proposal?

    private var defaultSignerName: String {
        [auth.profile?.firstName, auth.profile?.lastName].compactMap { $0 }.joined(separator: " ")
    }

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
                            VStack(alignment: .leading, spacing: 8) {
                                Button {
                                    Task { await openPDF(proposal) }
                                } label: {
                                    row(proposal)
                                }
                                .buttonStyle(.plain)
                                .disabled(proposal.pdfPath == nil || openingId != nil)

                                if proposal.pdfPath != nil && proposal.signature == nil {
                                    Button("Sign Proposal") {
                                        signingProposal = proposal
                                    }
                                    .font(.caption.weight(.semibold))
                                    .buttonStyle(.borderedProminent)
                                    .tint(Theme.navy)
                                    .controlSize(.small)
                                }
                            }
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
        .sheet(item: $signingProposal) { proposal in
            SignaturePadView(signUrl: "api/proposals/\(proposal.id)/sign", defaultName: defaultSignerName, title: "Sign Proposal") {
                Task { await load() }
            }
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
                if let signature = proposal.signature {
                    Label("Signed by \(signature.signerName)", systemImage: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
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
                .select("*, proposal_signatures(signer_name, created_at)")
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

    // Once signed, the countersigned PDF (with the signature drawn
    // into the Authorization block) is the authoritative version.
    private func signedPdfPath(for proposal: Proposal) async -> String? {
        guard proposal.signature != nil else { return nil }
        struct SignedPdfRow: Codable {
            let signedPdfPath: String
            enum CodingKeys: String, CodingKey { case signedPdfPath = "signed_pdf_path" }
        }
        let row: SignedPdfRow? = try? await SupabaseConfig.client
            .from("proposal_signatures")
            .select("signed_pdf_path")
            .eq("proposal_id", value: proposal.id)
            .single()
            .execute()
            .value
        return row?.signedPdfPath
    }

    private func openPDF(_ proposal: Proposal) async {
        guard let path = proposal.pdfPath else { return }
        openingId = proposal.id
        defer { openingId = nil }
        do {
            let data: Data
            if let signedPath = await signedPdfPath(for: proposal) {
                data = try await SupabaseConfig.client.storage
                    .from("proposal-signatures")
                    .download(path: signedPath)
            } else {
                data = try await SupabaseConfig.client.storage
                    .from("project-proposals")
                    .download(path: path)
            }
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(proposal.title).pdf")
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            openError = "Could not open this proposal."
        }
    }
}
