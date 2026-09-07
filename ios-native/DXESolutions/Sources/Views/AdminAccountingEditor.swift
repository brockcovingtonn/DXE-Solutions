import SwiftUI

struct AdminAccountingEditor: View {
    let projectId: String

    @State private var invoices: [Invoice] = []
    @State private var isLoading = true
    @State private var isCreating = false
    @State private var message: String?
    @State private var busyId: String?

    @State private var newKind = "invoice"
    @State private var newDescription = ""
    @State private var newAmount = ""
    @State private var newDueDate = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                if invoices.isEmpty {
                    Text("No invoices or receipts yet.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(invoices) { item in
                        row(item)
                    }
                }

                Divider()
                newForm

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
    }

    private func row(_ item: Invoice) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(item.description).font(.subheadline.weight(.medium))
                Text("\(item.kind.capitalized) · \(currency(item.amount)) · \(item.status.capitalized)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            if item.kind == "invoice" {
                Button(item.status == "paid" ? "Mark Unpaid" : "Mark Paid") {
                    Task { await toggleStatus(item) }
                }
                .font(.caption)
            }
            if busyId == item.id {
                ProgressView()
            } else {
                Button {
                    Task { await delete(item) }
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

    private var newForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("New Invoice / Receipt").font(.caption.weight(.semibold)).foregroundColor(Theme.navy)
            Picker("Kind", selection: $newKind) {
                Text("Invoice").tag("invoice")
                Text("Receipt").tag("receipt")
            }
            .pickerStyle(.segmented)
            TextField("Description", text: $newDescription).textFieldStyle(.roundedBorder)
            TextField("Amount", text: $newAmount).textFieldStyle(.roundedBorder).keyboardType(.decimalPad)
            if newKind == "invoice" {
                TextField("Due date (YYYY-MM-DD, optional)", text: $newDueDate).textFieldStyle(.roundedBorder)
            }
            Button {
                Task { await create() }
            } label: {
                if isCreating { ProgressView() } else { Text("Add") }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(newDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || Double(newAmount) == nil || isCreating)
        }
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func load() async {
        invoices = (try? await SupabaseConfig.client
            .from("invoices").select().eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        isLoading = false
    }

    private func toggleStatus(_ item: Invoice) async {
        busyId = item.id
        defer { busyId = nil }
        struct Payload: Encodable { let status: String }
        let newStatus = item.status == "paid" ? "unpaid" : "paid"
        do {
            try await APIClient.send("api/admin/invoices/\(item.id)", method: "PATCH", body: Payload(status: newStatus))
            await load()
        } catch {
            message = "Could not update."
        }
    }

    private func delete(_ item: Invoice) async {
        busyId = item.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/invoices/\(item.id)", method: "DELETE", body: EmptyBody())
            invoices.removeAll { $0.id == item.id }
        } catch {
            message = "Could not delete."
        }
    }

    private func create() async {
        guard let amount = Double(newAmount) else { return }
        isCreating = true
        message = nil
        defer { isCreating = false }
        struct Payload: Encodable {
            let projectId: String
            let kind: String
            let description: String
            let amount: Double
            let dueDate: String?
        }
        let payload = Payload(
            projectId: projectId, kind: newKind, description: newDescription,
            amount: amount, dueDate: newKind == "invoice" && !newDueDate.isEmpty ? newDueDate : nil
        )
        do {
            try await APIClient.send("api/admin/invoices", method: "POST", body: payload)
            newDescription = ""; newAmount = ""; newDueDate = ""
            await load()
        } catch {
            message = "Could not create."
        }
    }
}
