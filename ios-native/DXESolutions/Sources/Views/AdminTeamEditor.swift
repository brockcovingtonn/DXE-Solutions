import SwiftUI

private struct EditableTeamMember: Identifiable {
    let id = UUID()
    var trade: String
    var name: String
    var phone: String
    var email: String
}

struct AdminTeamEditor: View {
    let projectId: String

    @State private var members: [EditableTeamMember] = []
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isLoading {
                ProgressView()
            } else {
                ForEach($members) { $member in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            TextField("Trade (e.g. Electrician)", text: $member.trade)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                members.removeAll { $0.id == member.id }
                            } label: {
                                Image(systemName: "trash").foregroundColor(.red)
                            }
                        }
                        TextField("Name", text: $member.name).textFieldStyle(.roundedBorder)
                        HStack {
                            TextField("Phone", text: $member.phone).textFieldStyle(.roundedBorder)
                            TextField("Email", text: $member.email).textFieldStyle(.roundedBorder)
                        }
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    members.append(EditableTeamMember(trade: "", name: "", phone: "", email: ""))
                } label: {
                    Label("Add team member", systemImage: "plus")
                }
                .font(.caption.weight(.medium))

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await save() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Save Team") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSaving)
            }
        }
        .task { await load() }
    }

    private func load() async {
        let team: [ProjectTeamMember] = (try? await SupabaseConfig.client
            .from("project_team").select().eq("project_id", value: projectId)
            .order("sort_order", ascending: true).execute().value) ?? []
        members = team.map {
            EditableTeamMember(trade: $0.trade, name: $0.name ?? "", phone: $0.phone ?? "", email: $0.email ?? "")
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        message = nil
        defer { isSaving = false }
        struct MemberPayload: Encodable { let trade: String; let name: String?; let phone: String?; let email: String? }
        struct Payload: Encodable { let projectId: String; let team: [MemberPayload] }
        let payload = Payload(
            projectId: projectId,
            team: members.map {
                MemberPayload(
                    trade: $0.trade,
                    name: $0.name.isEmpty ? nil : $0.name,
                    phone: $0.phone.isEmpty ? nil : $0.phone,
                    email: $0.email.isEmpty ? nil : $0.email
                )
            }
        )
        do {
            try await APIClient.send("api/admin/team", method: "PUT", body: payload)
            message = "Saved."
        } catch {
            message = "Could not save team."
        }
    }
}
