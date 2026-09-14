import SwiftUI

private struct SuggestResponse: Decodable {
    let total: Double
    let suggestedMilestones: [SuggestedMilestone]
}

private struct SuggestedMilestone: Decodable {
    let description: String
    let percent: Double?
    let amount: Double
}

private struct MilestoneRow: Identifiable {
    let id = UUID()
    var description: String
    var percent: String
    var amount: String
    var dueDate: String
}

// Parses the proposal's payment terms into editable milestone rows the
// admin reviews before anything is created — mirrors the web version's
// GeneratePaymentScheduleModal.js against the same backend endpoint.
struct GeneratePaymentScheduleView: View {
    let proposalId: String
    var onGenerated: (Int) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var isLoading = true
    @State private var total: Double = 0
    @State private var rows: [MilestoneRow] = []
    @State private var isSaving = false
    @State private var errorMessage: String?

    private var totalScheduled: Double {
        rows.reduce(0) { $0 + (Double($1.amount) ?? 0) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Form {
                        Section {
                            ForEach($rows) { $row in
                                VStack(alignment: .leading, spacing: 8) {
                                    TextField("Milestone description", text: $row.description)
                                    HStack {
                                        TextField("%", text: $row.percent)
                                            .keyboardType(.decimalPad)
                                            .frame(width: 60)
                                            .onChange(of: row.percent) { newValue in
                                                if let pct = Double(newValue) {
                                                    row.amount = String(format: "%.2f", total * (pct / 100))
                                                }
                                            }
                                        TextField("Amount", text: $row.amount)
                                            .keyboardType(.decimalPad)
                                        DatePicker(
                                            "",
                                            selection: Binding(
                                                get: { dateFromString(row.dueDate) ?? Date() },
                                                set: { row.dueDate = dateOnlyFormatter.string(from: $0) }
                                            ),
                                            displayedComponents: .date
                                        )
                                        .labelsHidden()
                                        .opacity(row.dueDate.isEmpty ? 0.4 : 1)
                                        .onTapGesture {
                                            if row.dueDate.isEmpty { row.dueDate = dateOnlyFormatter.string(from: Date()) }
                                        }
                                        if !row.dueDate.isEmpty {
                                            Button {
                                                row.dueDate = ""
                                            } label: {
                                                Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                                            }
                                            .buttonStyle(.plain)
                                        }
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                            .onDelete { rows.remove(atOffsets: $0) }

                            Button {
                                rows.append(MilestoneRow(description: "", percent: "", amount: "", dueDate: ""))
                            } label: {
                                Label("Add milestone", systemImage: "plus.circle")
                            }
                        } footer: {
                            Text("Scheduled: \(currency(totalScheduled)) of \(currency(total)) proposal total")
                                .foregroundColor(abs(totalScheduled - total) > 0.01 && !rows.isEmpty ? .red : .secondary)
                        }

                        if let errorMessage {
                            Text(errorMessage).foregroundColor(.red).font(.caption)
                        }
                    }
                }
            }
            .navigationTitle("Generate Payment Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Creating…" : "Create") {
                        Task { await create() }
                    }
                    .disabled(isSaving || rows.isEmpty)
                }
            }
            .task { await loadSuggestions() }
        }
    }

    private var dateOnlyFormatter: DateFormatter {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter
    }

    private func dateFromString(_ s: String) -> Date? {
        s.isEmpty ? nil : dateOnlyFormatter.date(from: s)
    }

    private func currency(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }

    private func loadSuggestions() async {
        do {
            let response: SuggestResponse = try await APIClient.get("api/admin/proposals/\(proposalId)/generate-payment-schedule")
            total = response.total
            rows = response.suggestedMilestones.map {
                MilestoneRow(
                    description: $0.description,
                    percent: $0.percent.map { String(format: "%g", $0) } ?? "",
                    amount: String(format: "%.2f", $0.amount),
                    dueDate: ""
                )
            }
        } catch {
            errorMessage = "Could not load suggestions."
        }
        isLoading = false
    }

    private func create() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        struct MilestonePayload: Encodable {
            let description: String
            let percent: Double?
            let amount: Double
            let dueDate: String?
        }
        struct Payload: Encodable { let milestones: [MilestonePayload] }

        let payload = Payload(
            milestones: rows.compactMap { row in
                guard !row.description.trimmingCharacters(in: .whitespaces).isEmpty, let amount = Double(row.amount), amount > 0 else { return nil }
                return MilestonePayload(
                    description: row.description,
                    percent: Double(row.percent),
                    amount: amount,
                    dueDate: row.dueDate.isEmpty ? nil : row.dueDate
                )
            }
        )

        guard !payload.milestones.isEmpty else {
            errorMessage = "Add at least one valid milestone."
            return
        }

        do {
            try await APIClient.send("api/admin/proposals/\(proposalId)/generate-payment-schedule", method: "POST", body: payload)
            HapticManager.success()
            onGenerated(payload.milestones.count)
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription ?? "Could not create the payment schedule."
        } catch {
            HapticManager.error()
            errorMessage = "Could not create the payment schedule."
        }
    }
}
