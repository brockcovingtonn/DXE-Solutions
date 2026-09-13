import SwiftUI

struct AdminProposalsEditor: View {
    let projectId: String

    @State private var proposals: [Proposal] = []
    @State private var isLoading = true
    @State private var message: String?
    @State private var busyId: String?
    @State private var previewItem: PreviewItem?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                if proposals.isEmpty {
                    Text("No proposals yet. Create one from the web admin.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(proposals) { proposal in
                        row(proposal)
                    }
                }

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
        }
    }

    private func row(_ proposal: Proposal) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(statusLabel(proposal.status))
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(statusColor(proposal.status).opacity(0.15))
                        .foregroundColor(statusColor(proposal.status))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    Text(proposal.title).font(.subheadline.weight(.medium))
                }
                Text(currency(proposal.total))
                    .font(.caption)
                    .foregroundColor(.secondary)
                if proposal.status != "draft" && proposal.visibleToClient {
                    Text("Shared with client").font(.caption2).foregroundColor(.green)
                }
                if let signature = proposal.signature {
                    Label("Signed by \(signature.signerName)", systemImage: "checkmark.circle.fill")
                        .font(.caption2)
                        .foregroundColor(.green)
                }
            }
            Spacer()

            if busyId == proposal.id {
                ProgressView()
            } else {
                if proposal.status != "draft" {
                    Button {
                        Task { await toggleVisible(proposal) }
                    } label: {
                        Image(systemName: proposal.visibleToClient ? "eye.fill" : "eye.slash")
                            .foregroundColor(proposal.visibleToClient ? .green : .secondary)
                    }
                    .buttonStyle(.plain)
                }
                if proposal.pdfPath != nil {
                    Button {
                        Task { await openPDF(proposal) }
                    } label: {
                        Image(systemName: "doc.text.magnifyingglass")
                    }
                    .buttonStyle(.plain)
                }
                Button {
                    Task { await delete(proposal) }
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

    private func statusLabel(_ status: String) -> String {
        switch status {
        case "draft": return "Draft"
        case "finalized": return "Finalized"
        case "sent": return "Sent"
        default: return status.capitalized
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "draft": return Theme.gold
        case "sent": return .green
        default: return Theme.navy
        }
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func load() async {
        proposals = (try? await SupabaseConfig.client
            .from("proposals").select("*, proposal_signatures(signer_name, created_at)").eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        isLoading = false
    }

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

    private func toggleVisible(_ proposal: Proposal) async {
        busyId = proposal.id
        defer { busyId = nil }
        struct Payload: Encodable {
            let visibleToClient: Bool
            enum CodingKeys: String, CodingKey { case visibleToClient = "visible_to_client" }
        }
        do {
            try await APIClient.send(
                "api/admin/proposals/\(proposal.id)",
                method: "PATCH",
                body: Payload(visibleToClient: !proposal.visibleToClient)
            )
            await load()
        } catch {
            message = "Could not update."
        }
    }

    private func openPDF(_ proposal: Proposal) async {
        guard let path = proposal.pdfPath else { return }
        busyId = proposal.id
        defer { busyId = nil }
        do {
            let data: Data
            if let signedPath = await signedPdfPath(for: proposal) {
                data = try await SupabaseConfig.client.storage.from("proposal-signatures").download(path: signedPath)
            } else {
                data = try await SupabaseConfig.client.storage.from("project-proposals").download(path: path)
            }
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("\(proposal.title).pdf")
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            message = "Could not open the proposal PDF."
        }
    }

    private func delete(_ proposal: Proposal) async {
        busyId = proposal.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/proposals/\(proposal.id)", method: "DELETE", body: EmptyBody())
            proposals.removeAll { $0.id == proposal.id }
        } catch {
            message = "Could not delete."
        }
    }
}
