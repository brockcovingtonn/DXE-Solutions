import SwiftUI

private struct InvoiceOwnerRef: Codable, Hashable {
    let firstName: String?
    let lastName: String?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

private struct InvoiceProjectRef: Codable, Hashable {
    let id: String
    let name: String
    let profiles: InvoiceOwnerRef?
}

private struct AdminInvoiceItem: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let kind: String
    let description: String
    let amount: Double
    let status: String
    let dueDate: String?
    let paidDate: String?
    let projects: InvoiceProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, kind, description, amount, status, projects
        case projectId = "project_id"
        case dueDate = "due_date"
        case paidDate = "paid_date"
    }
}

struct AdminAccountingListView: View {
    @State private var invoices: [AdminInvoiceItem] = []
    @State private var upcomingPayments: [PaymentScheduleItem] = []
    @State private var isLoading = true
    @State private var busyId: String?
    @State private var confirmBusyId: String?
    @State private var kindFilter = ""
    @State private var statusFilter = ""

    private var upcomingByMonth: [(month: String, items: [PaymentScheduleItem])] {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        let monthFormatter = DateFormatter()
        monthFormatter.dateFormat = "LLLL yyyy"

        var order: [String] = []
        var groups: [String: [PaymentScheduleItem]] = [:]
        for item in upcomingPayments {
            guard let dueDate = item.dueDate, let date = formatter.date(from: dueDate) else { continue }
            let key = monthFormatter.string(from: date)
            if groups[key] == nil {
                groups[key] = []
                order.append(key)
            }
            groups[key]?.append(item)
        }
        return order.map { (month: $0, items: groups[$0] ?? []) }
    }

    private var totalOutstanding: Double {
        invoices.filter { $0.kind == "invoice" && $0.status == "unpaid" }.reduce(0) { $0 + $1.amount }
    }
    private var totalPaid: Double {
        invoices.filter { $0.kind == "invoice" && $0.status == "paid" }.reduce(0) { $0 + $1.amount }
    }
    private var totalReceipts: Double {
        invoices.filter { $0.kind == "receipt" }.reduce(0) { $0 + $1.amount }
    }

    private var filtered: [AdminInvoiceItem] {
        invoices.filter { item in
            (kindFilter.isEmpty || item.kind == kindFilter)
                && (statusFilter.isEmpty || item.status == statusFilter)
        }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        statCards
                        upcomingPaymentsSection
                        filters

                        VStack(alignment: .leading, spacing: 10) {
                            Text("All Entries (\(filtered.count))").font(.headline).foregroundColor(Theme.navy)
                            if filtered.isEmpty {
                                Text("No entries match this filter.").font(.subheadline).foregroundColor(.secondary)
                            } else {
                                ForEach(filtered) { item in
                                    row(item)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Accounting")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    private var statCards: some View {
        HStack(spacing: 12) {
            statCard("Total Outstanding", currency(totalOutstanding), color: totalOutstanding > 0 ? .red : Theme.navy)
            statCard("Total Paid", currency(totalPaid), color: Theme.navy)
            statCard("Total Receipts", currency(totalReceipts), color: Theme.navy)
        }
    }

    private func statCard(_ label: String, _ value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Text(value).font(.subheadline.weight(.semibold)).foregroundColor(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var upcomingPaymentsSection: some View {
        Group {
            if !upcomingPayments.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    Text("Upcoming Payments").font(.headline).foregroundColor(Theme.navy)
                    Text("Scheduled milestones grouped by month, so you can estimate expected income.")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    ForEach(upcomingByMonth, id: \.month) { group in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(group.month.uppercased())
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(currency(group.items.reduce(0) { $0 + $1.amount }) + " expected")
                                    .font(.caption.weight(.semibold))
                                    .foregroundColor(Theme.navy)
                            }
                            ForEach(group.items) { item in
                                upcomingRow(item)
                            }
                        }
                    }
                }
            }
        }
    }

    private func upcomingRow(_ item: PaymentScheduleItem) -> some View {
        HStack(alignment: .top, spacing: 10) {
            if let hex = item.projects?.color, let color = Color(hex: hex) {
                Circle().fill(color).frame(width: 8, height: 8).padding(.top, 4)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(item.projects?.name ?? "Project").font(.subheadline.weight(.medium))
                Text(item.description).font(.caption).foregroundColor(.secondary)
                Text((item.dueDate.map { "Due \($0)" } ?? "—") + (item.confirmedAt != nil ? " · Confirmed" : " · Not yet confirmed"))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Text(currency(item.amount)).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            if confirmBusyId == item.id {
                ProgressView()
            } else {
                Button {
                    Task { await confirmUpcoming(item) }
                } label: {
                    Image(systemName: item.confirmedAt != nil ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(item.confirmedAt != nil ? .green : .secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var filters: some View {
        HStack {
            Picker("Type", selection: $kindFilter) {
                Text("All types").tag("")
                Text("Invoices").tag("invoice")
                Text("Receipts").tag("receipt")
            }
            .pickerStyle(.menu)
            Picker("Status", selection: $statusFilter) {
                Text("Any status").tag("")
                Text("Unpaid").tag("unpaid")
                Text("Paid").tag("paid")
            }
            .pickerStyle(.menu)
            Spacer()
        }
    }

    private func row(_ item: AdminInvoiceItem) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text(item.kind.uppercased())
                .font(.caption2.weight(.semibold))
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(item.kind == "receipt" ? Color.blue.opacity(0.12) : Theme.gold.opacity(0.18))
                .foregroundColor(item.kind == "receipt" ? .blue : Theme.navy)
                .clipShape(RoundedRectangle(cornerRadius: 4))

            VStack(alignment: .leading, spacing: 3) {
                Text(item.description).font(.subheadline.weight(.medium))
                Text(subtitle(item)).font(.caption).foregroundColor(.secondary)
            }

            Spacer()

            Text(currency(item.amount)).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)

            if item.kind == "invoice" {
                if busyId == item.id {
                    ProgressView()
                } else {
                    Button {
                        Task { await togglePaid(item) }
                    } label: {
                        Image(systemName: item.status == "paid" ? "checkmark.circle.fill" : "circle.dashed")
                            .foregroundColor(item.status == "paid" ? Color(red: 0.02, green: 0.37, blue: 0.28) : .red)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func subtitle(_ item: AdminInvoiceItem) -> String {
        var parts: [String] = []
        parts.append(item.projects?.name ?? "Unknown project")
        if let owner = item.projects?.profiles {
            let name = [owner.firstName, owner.lastName].compactMap { $0 }.joined(separator: " ")
            if !name.isEmpty { parts.append(name) }
        }
        if let due = item.dueDate {
            parts.append("Due \(due)")
        } else if let paid = item.paidDate {
            parts.append("Paid \(paid)")
        }
        return parts.joined(separator: " · ")
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func load() async {
        invoices = (try? await SupabaseConfig.client
            .from("invoices")
            .select("*, projects(id,name,profiles!projects_owner_id_fkey(first_name,last_name))")
            .order("created_at", ascending: false)
            .execute().value) ?? []
        // Undated (event-triggered) milestones are filtered out by
        // upcomingByMonth below, not here — simpler than the
        // IS NOT NULL filter syntax for a list this small.
        upcomingPayments = (try? await SupabaseConfig.client
            .from("payment_schedule_items")
            .select("*, projects(id,name,color)")
            .eq("status", value: "scheduled")
            .order("due_date", ascending: true)
            .execute().value) ?? []
        isLoading = false
    }

    private func confirmUpcoming(_ item: PaymentScheduleItem) async {
        confirmBusyId = item.id
        defer { confirmBusyId = nil }
        do {
            try await APIClient.send("api/admin/payment-schedule/\(item.id)/confirm", method: "POST", body: EmptyBody())
            await load()
        } catch {
            // Leave as-is; row remains tappable to retry.
        }
    }

    private func togglePaid(_ item: AdminInvoiceItem) async {
        busyId = item.id
        defer { busyId = nil }
        struct Payload: Encodable { let status: String }
        let newStatus = item.status == "paid" ? "unpaid" : "paid"
        do {
            try await APIClient.send("api/admin/invoices/\(item.id)", method: "PATCH", body: Payload(status: newStatus))
            await load()
        } catch {
            // Leave as-is; row remains tappable to retry.
        }
    }
}
