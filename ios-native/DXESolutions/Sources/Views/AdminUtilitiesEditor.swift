import SwiftUI

private struct EditableUtility {
    var id: String?
    let utilityType: String
    var enabled: Bool
    var contactTrade: String
    var contactName: String
    var contactPhone: String
    var contactEmail: String
    var entries: [AdminUtilityEntryDetail]
}

struct AdminUtilitiesEditor: View {
    let projectId: String

    @State private var utilities: [EditableUtility] = []
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var message: String?
    @State private var busyEntryId: String?
    @State private var newEntryApplication: [String: String] = [:]
    @State private var newEntryWorkRequest: [String: String] = [:]

    private let types: [(value: String, label: String)] = [
        ("electrical", "Electrical"), ("water", "Water"), ("gas", "Gas"),
    ]
    private let statuses = ["not_ready", "pending", "in_progress", "complete"]
    private let statusLabels: [String: String] = [
        "not_ready": "Not Ready", "pending": "Pending", "in_progress": "In Progress", "complete": "Complete",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            if isLoading {
                ProgressView()
            } else {
                ForEach($utilities, id: \.utilityType) { $utility in
                    utilityBlock($utility)
                }

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await saveContacts() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Save Contact Info") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSaving)
            }
        }
        .task { await load() }
    }

    private func utilityBlock(_ utility: Binding<EditableUtility>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(isOn: utility.enabled) {
                Text(types.first { $0.value == utility.wrappedValue.utilityType }?.label ?? utility.wrappedValue.utilityType)
                    .font(.subheadline.weight(.semibold))
                    .foregroundColor(Theme.navy)
            }
            .tint(Theme.gold)

            if utility.wrappedValue.enabled {
                TextField("Contact trade", text: utility.contactTrade).textFieldStyle(.roundedBorder)
                TextField("Contact name", text: utility.contactName).textFieldStyle(.roundedBorder)
                HStack {
                    TextField("Phone", text: utility.contactPhone).textFieldStyle(.roundedBorder)
                    TextField("Email", text: utility.contactEmail).textFieldStyle(.roundedBorder)
                }

                ForEach(utility.wrappedValue.entries) { entry in
                    entryRow(entry)
                }

                HStack {
                    TextField("Application", text: binding(for: utility.wrappedValue.utilityType, in: $newEntryApplication))
                        .textFieldStyle(.roundedBorder)
                    TextField("Work Request #", text: binding(for: utility.wrappedValue.utilityType, in: $newEntryWorkRequest))
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task { await addEntry(for: utility.wrappedValue.utilityType) }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func entryRow(_ entry: AdminUtilityEntryDetail) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.application ?? "—").font(.caption)
                if let wr = entry.workRequestNumber { Text("WR# \(wr)").font(.caption2).foregroundColor(.secondary) }
            }
            Spacer()
            Menu {
                ForEach(statuses, id: \.self) { status in
                    Button(statusLabels[status] ?? status) {
                        Task { await updateEntryStatus(entry, status: status) }
                    }
                }
            } label: {
                Text(statusLabels[entry.status] ?? entry.status).font(.caption2)
            }
            if busyEntryId == entry.id {
                ProgressView()
            } else {
                Button {
                    Task { await deleteEntry(entry) }
                } label: {
                    Image(systemName: "trash").foregroundColor(.red).font(.caption)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private func binding(for type: String, in dict: Binding<[String: String]>) -> Binding<String> {
        Binding(
            get: { dict.wrappedValue[type] ?? "" },
            set: { dict.wrappedValue[type] = $0 }
        )
    }

    // MARK: - Data

    private func load() async {
        let existing: [AdminProjectUtility] = (try? await SupabaseConfig.client
            .rpc("get_project_utilities_admin", params: ["p_project_id": projectId])
            .execute().value) ?? []

        utilities = types.map { type in
            if let match = existing.first(where: { $0.utilityType == type.value }) {
                return EditableUtility(
                    id: match.id, utilityType: type.value, enabled: match.enabled,
                    contactTrade: match.contactTrade ?? "", contactName: match.contactName ?? "",
                    contactPhone: match.contactPhone ?? "", contactEmail: match.contactEmail ?? "",
                    entries: match.entries
                )
            }
            return EditableUtility(
                id: nil, utilityType: type.value, enabled: false,
                contactTrade: "", contactName: "", contactPhone: "", contactEmail: "", entries: []
            )
        }
        isLoading = false
    }

    private func saveContacts() async {
        isSaving = true
        message = nil
        defer { isSaving = false }
        struct UtilityPayload: Encodable {
            let utility_type: String
            let enabled: Bool
            let contact_trade: String?
            let contact_name: String?
            let contact_phone: String?
            let contact_email: String?
        }
        struct Payload: Encodable { let projectId: String; let utilities: [UtilityPayload] }
        let payload = Payload(
            projectId: projectId,
            utilities: utilities.map {
                UtilityPayload(
                    utility_type: $0.utilityType, enabled: $0.enabled,
                    contact_trade: $0.contactTrade.isEmpty ? nil : $0.contactTrade,
                    contact_name: $0.contactName.isEmpty ? nil : $0.contactName,
                    contact_phone: $0.contactPhone.isEmpty ? nil : $0.contactPhone,
                    contact_email: $0.contactEmail.isEmpty ? nil : $0.contactEmail
                )
            }
        )
        do {
            try await APIClient.send("api/admin/utilities", method: "PUT", body: payload)
            message = "Saved."
            await load()
        } catch {
            message = "Could not save."
        }
    }

    private func addEntry(for type: String) async {
        guard let utility = utilities.first(where: { $0.utilityType == type }), let utilityId = utility.id else {
            message = "Save contact info first to enable this utility."
            return
        }
        struct Payload: Encodable { let utilityId: String; let application: String?; let work_request_number: String? }
        let application = newEntryApplication[type] ?? ""
        let workRequest = newEntryWorkRequest[type] ?? ""
        do {
            try await APIClient.send(
                "api/admin/utility-entries", method: "POST",
                body: Payload(utilityId: utilityId, application: application.isEmpty ? nil : application, work_request_number: workRequest.isEmpty ? nil : workRequest)
            )
            newEntryApplication[type] = ""
            newEntryWorkRequest[type] = ""
            await load()
        } catch {
            message = "Could not add entry."
        }
    }

    private func updateEntryStatus(_ entry: AdminUtilityEntryDetail, status: String) async {
        busyEntryId = entry.id
        defer { busyEntryId = nil }
        struct Payload: Encodable { let status: String }
        do {
            try await APIClient.send("api/admin/utility-entries/\(entry.id)", method: "PATCH", body: Payload(status: status))
            await load()
        } catch {
            message = "Could not update entry."
        }
    }

    private func deleteEntry(_ entry: AdminUtilityEntryDetail) async {
        busyEntryId = entry.id
        defer { busyEntryId = nil }
        do {
            try await APIClient.send("api/admin/utility-entries/\(entry.id)", method: "DELETE", body: EmptyBody())
            await load()
        } catch {
            message = "Could not delete entry."
        }
    }
}
