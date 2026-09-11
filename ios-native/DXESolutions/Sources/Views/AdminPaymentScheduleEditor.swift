import SwiftUI

struct AdminPaymentScheduleEditor: View {
    let projectId: String

    @State private var items: [PaymentScheduleItem] = []
    @State private var isLoading = true
    @State private var isCreating = false
    @State private var message: String?
    @State private var busyId: String?

    @State private var newDescription = ""
    @State private var newAmount = ""
    @State private var newPercent = ""
    @State private var newDueDate = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                if items.isEmpty {
                    Text("No payment milestones yet.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(items) { item in
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

    private func row(_ item: PaymentScheduleItem) -> some View {
        let undated = item.dueDate == nil
        let overdue = !undated && item.status == "scheduled" && item.confirmedAt == nil && isPast(item.dueDate)

        return HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(item.description + (item.percent != nil ? " (\(Int(item.percent!))%)" : ""))
                    .font(.subheadline.weight(.medium))
                Text(subtitle(item))
                    .font(.caption)
                    .foregroundColor(overdue ? .red : .secondary)
            }
            Spacer()
            Text(currency(item.amount))
                .font(.subheadline.weight(.semibold))
                .foregroundColor(Theme.navy)

            if busyId == item.id {
                ProgressView()
            } else {
                if item.status == "scheduled" && !undated {
                    Button {
                        Task { await confirm(item) }
                    } label: {
                        Image(systemName: item.confirmedAt != nil ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(item.confirmedAt != nil ? .green : .secondary)
                    }
                    .buttonStyle(.plain)
                }
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

    private func subtitle(_ item: PaymentScheduleItem) -> String {
        guard let dueDate = item.dueDate else {
            return "No due date — invoice manually"
        }
        var parts = ["Due \(dueDate)"]
        if item.status == "scheduled" {
            parts.append(item.confirmedAt != nil ? "Confirmed" : "Not yet confirmed")
        } else {
            parts.append(item.status.capitalized)
        }
        return parts.joined(separator: " · ")
    }

    private func isPast(_ dueDate: String?) -> Bool {
        guard let dueDate, let date = dateOnlyFormatter.date(from: dueDate) else { return false }
        return date < Calendar.current.startOfDay(for: Date())
    }

    private var dateOnlyFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }

    private var newForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("New Milestone").font(.caption.weight(.semibold)).foregroundColor(Theme.navy)
            TextField("Description", text: $newDescription).textFieldStyle(.roundedBorder)
            TextField("Amount", text: $newAmount).textFieldStyle(.roundedBorder).keyboardType(.decimalPad)
            TextField("Percent of total (optional)", text: $newPercent).textFieldStyle(.roundedBorder).keyboardType(.decimalPad)
            TextField("Due date (YYYY-MM-DD, optional)", text: $newDueDate).textFieldStyle(.roundedBorder)
            Text("Leave the due date blank for an event-triggered milestone (e.g. \"upon utility completion\") — it's tracked but won't get reminders or auto-invoice.")
                .font(.caption2)
                .foregroundColor(.secondary)
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
        items = (try? await SupabaseConfig.client
            .from("payment_schedule_items").select().eq("project_id", value: projectId)
            .order("due_date", ascending: true).execute().value) ?? []
        isLoading = false
    }

    private func confirm(_ item: PaymentScheduleItem) async {
        busyId = item.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/payment-schedule/\(item.id)/confirm", method: "POST", body: EmptyBody())
            await load()
        } catch {
            message = "Could not confirm."
        }
    }

    private func delete(_ item: PaymentScheduleItem) async {
        busyId = item.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/payment-schedule/\(item.id)", method: "DELETE", body: EmptyBody())
            items.removeAll { $0.id == item.id }
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
            let description: String
            let amount: Double
            let percent: Double?
            let dueDate: String?
        }
        let payload = Payload(
            projectId: projectId, description: newDescription, amount: amount,
            percent: Double(newPercent), dueDate: newDueDate.isEmpty ? nil : newDueDate
        )
        do {
            try await APIClient.send("api/admin/payment-schedule", method: "POST", body: payload)
            newDescription = ""; newAmount = ""; newPercent = ""; newDueDate = ""
            await load()
        } catch {
            message = "Could not create."
        }
    }
}
