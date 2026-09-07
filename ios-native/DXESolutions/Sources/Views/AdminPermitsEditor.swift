import SwiftUI

struct AdminPermitsEditor: View {
    let projectId: String

    @State private var permits: [Permit] = []
    @State private var isLoading = true
    @State private var message: String?
    @State private var busyId: String?

    @State private var newType = ""
    @State private var newNumber = ""
    @State private var newAgency = ""
    @State private var newStatus = "not_started"
    @State private var isCreating = false

    private let statuses = ["not_started", "submitted", "in_plan_check", "corrections", "approved", "issued", "finaled"]
    private let statusLabels: [String: String] = [
        "not_started": "Not Started", "submitted": "Submitted", "in_plan_check": "In Plan Check",
        "corrections": "Corrections Required", "approved": "Approved", "issued": "Issued", "finaled": "Finaled",
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                ForEach(permits) { permit in
                    row(permit)
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

    private func row(_ permit: Permit) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(permit.permitType).font(.subheadline.weight(.medium))
                Text([permit.permitNumber, permit.agency, statusLabels[permit.status] ?? permit.status].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Menu {
                ForEach(statuses, id: \.self) { status in
                    Button(statusLabels[status] ?? status) {
                        Task { await updateStatus(permit, status: status) }
                    }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
            if busyId == permit.id {
                ProgressView()
            } else {
                Button {
                    Task { await delete(permit) }
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
            Text("New Permit").font(.caption.weight(.semibold)).foregroundColor(Theme.navy)
            TextField("Permit type", text: $newType).textFieldStyle(.roundedBorder)
            TextField("Permit number (optional)", text: $newNumber).textFieldStyle(.roundedBorder)
            TextField("Agency (optional)", text: $newAgency).textFieldStyle(.roundedBorder)
            Picker("Status", selection: $newStatus) {
                ForEach(statuses, id: \.self) { Text(statusLabels[$0] ?? $0).tag($0) }
            }
            .pickerStyle(.menu)

            Button {
                Task { await create() }
            } label: {
                if isCreating { ProgressView() } else { Text("Add Permit") }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(newType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)
        }
    }

    private func load() async {
        permits = (try? await SupabaseConfig.client
            .from("permits").select().eq("project_id", value: projectId)
            .order("sort_order", ascending: true).execute().value) ?? []
        isLoading = false
    }

    private func updateStatus(_ permit: Permit, status: String) async {
        busyId = permit.id
        defer { busyId = nil }
        struct Payload: Encodable { let status: String }
        do {
            try await APIClient.send("api/admin/permits/\(permit.id)", method: "PATCH", body: Payload(status: status))
            await load()
        } catch {
            message = "Could not update permit."
        }
    }

    private func delete(_ permit: Permit) async {
        busyId = permit.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/permits/\(permit.id)", method: "DELETE", body: EmptyBody())
            permits.removeAll { $0.id == permit.id }
        } catch {
            message = "Could not delete permit."
        }
    }

    private func create() async {
        isCreating = true
        message = nil
        defer { isCreating = false }
        struct Payload: Encodable {
            let projectId: String
            let permit_type: String
            let permit_number: String?
            let agency: String?
            let status: String
        }
        let payload = Payload(
            projectId: projectId, permit_type: newType,
            permit_number: newNumber.isEmpty ? nil : newNumber,
            agency: newAgency.isEmpty ? nil : newAgency, status: newStatus
        )
        do {
            try await APIClient.send("api/admin/permits", method: "POST", body: payload)
            newType = ""; newNumber = ""; newAgency = ""; newStatus = "not_started"
            await load()
        } catch {
            message = "Could not create permit."
        }
    }
}
