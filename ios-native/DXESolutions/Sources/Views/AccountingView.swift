import SwiftUI

struct AccountingView: View {
    let project: Project

    @State private var invoices: [Invoice] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var downloadingId: String?
    @State private var previewItem: PreviewItem?
    @State private var payingId: String?
    @State private var paymentSheetURL: IdentifiableURL?
    @State private var paymentError: String?

    private var balanceDue: Double {
        invoices
            .filter { $0.kind == "invoice" && $0.status == "unpaid" }
            .reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        balanceCard

                        if invoices.isEmpty {
                            Text("No invoices or receipts on file yet.")
                                .foregroundColor(.secondary)
                                .padding(.top, 8)
                        } else {
                            ForEach(invoices) { item in
                                invoiceRow(item)
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Accounting")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadInvoices() }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
        }
        .sheet(item: $paymentSheetURL, onDismiss: {
            Task { await loadInvoices() }
        }) { item in
            SafariView(url: item.url)
        }
        .alert("Payment", isPresented: Binding(get: { paymentError != nil }, set: { if !$0 { paymentError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(paymentError ?? "")
        }
    }

    private var balanceCard: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("BALANCE DUE")
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)
                    .tracking(1)
                Text(balanceDue > 0 ? "Payable to DXE Solutions" : "You're all caught up")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text(currency(balanceDue))
                .font(.title2.weight(.semibold))
                .foregroundColor(balanceDue > 0 ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
        }
        .padding()
        .background(balanceDue > 0 ? Color.red.opacity(0.08) : Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func invoiceRow(_ item: Invoice) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Button {
                Task { await openFile(item) }
            } label: {
                HStack(alignment: .top, spacing: 10) {
                    Text(item.kind.uppercased())
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(item.kind == "receipt" ? Color.blue.opacity(0.12) : Theme.gold.opacity(0.18))
                        .foregroundColor(item.kind == "receipt" ? .blue : Theme.navy)
                        .clipShape(RoundedRectangle(cornerRadius: 4))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.description)
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(.primary)
                        Text(subtitle(item))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    if downloadingId == item.id {
                        ProgressView()
                    } else {
                        Text(currency(item.amount))
                            .font(.subheadline.weight(.semibold))
                            .foregroundColor(Theme.navy)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(item.filePath == nil || downloadingId != nil)

            if isPayable(item) {
                Button {
                    Task { await payInvoice(item) }
                } label: {
                    if payingId == item.id {
                        ProgressView().tint(.white)
                    } else {
                        Text("Pay now")
                            .font(.caption.weight(.semibold))
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .controlSize(.small)
                .disabled(payingId != nil)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func isPayable(_ item: Invoice) -> Bool {
        item.kind == "invoice" && item.status == "unpaid" && item.paymentState != "processing"
    }

    private func subtitle(_ item: Invoice) -> String {
        var parts: [String] = []
        if let due = item.dueDate {
            parts.append("Due \(due)")
        } else if let paid = item.paidDate {
            parts.append("Paid \(paid)")
        }
        if item.status == "unpaid" { parts.append("Unpaid") }
        if item.paymentState == "processing" { parts.append("Payment clearing") }
        if item.paymentState == "failed" { parts.append("Last payment failed") }
        if item.status == "paid" && item.paidVia == "stripe" { parts.append("Paid online") }
        if let fileName = item.fileName { parts.append(fileName) }
        return parts.isEmpty ? "—" : parts.joined(separator: " · ")
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func loadInvoices() async {
        do {
            let invoices: [Invoice] = try await SupabaseConfig.client
                .from("invoices")
                .select()
                .eq("project_id", value: project.id)
                .order("created_at", ascending: false)
                .execute()
                .value
            self.invoices = invoices
        } catch {
            errorMessage = "Could not load invoices."
        }
        isLoading = false
    }

    // Same Stripe Checkout Session the web portal uses — reuses
    // POST /api/invoices/:id/pay via APIClient's Bearer-token auth, then
    // opens the returned hosted checkout URL in an in-app Safari sheet.
    // Stripe's success/cancel redirect lands back on our own site inside
    // that same sheet; the invoice's actual paid status is flipped by
    // the Stripe webhook, not by this call, so we just reload on dismiss.
    private func payInvoice(_ item: Invoice) async {
        payingId = item.id
        defer { payingId = nil }
        do {
            struct PayResponse: Decodable { let url: String }
            let response: PayResponse = try await APIClient.sendDecoding(
                "api/invoices/\(item.id)/pay",
                method: "POST",
                body: EmptyBody()
            )
            guard let url = URL(string: response.url) else {
                paymentError = "Could not start the payment."
                return
            }
            paymentSheetURL = IdentifiableURL(url: url)
        } catch {
            paymentError = (error as? APIError)?.errorDescription ?? "Could not start the payment."
        }
    }

    private func openFile(_ item: Invoice) async {
        guard let path = item.filePath, let fileName = item.fileName else { return }
        downloadingId = item.id
        defer { downloadingId = nil }
        do {
            let data = try await SupabaseConfig.client.storage
                .from("project-invoices")
                .download(path: path)
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            errorMessage = "Could not open \(fileName)."
        }
    }
}
