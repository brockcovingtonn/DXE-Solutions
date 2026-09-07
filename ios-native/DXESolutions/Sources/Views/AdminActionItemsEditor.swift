import SwiftUI

private struct PersonRef: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
    }

    var name: String { [firstName, lastName].compactMap { $0 }.joined(separator: " ") }
}

struct AdminActionItemsEditor: View {
    let projectId: String

    @State private var items: [ActionItem] = []
    @State private var people: [PersonRef] = []
    @State private var isLoading = true
    @State private var message: String?
    @State private var busyId: String?

    @State private var newTitle = ""
    @State private var newDescription = ""
    @State private var newAssignedTo = ""
    @State private var newDueDate = ""
    @State private var newVisibleToClient = false
    @State private var isCreating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                ForEach(items) { item in
                    row(item)
                }

                Divider()
                newItemForm

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
    }

    private func row(_ item: ActionItem) -> some View {
        let isDone = item.status == "done"
        return HStack(alignment: .top, spacing: 10) {
            Button {
                Task { await toggleStatus(item) }
            } label: {
                Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                    .foregroundColor(isDone ? Theme.gold : .secondary)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                Text(item.title).font(.subheadline.weight(.medium)).strikethrough(isDone)
                if let description = item.description, !description.isEmpty {
                    Text(description).font(.caption).foregroundColor(.secondary)
                }
                HStack(spacing: 6) {
                    if let due = item.dueDate { Text("Due \(due)") }
                    let assignee = people.first { $0.id == item.assignedTo }?.name
                    if let assignee, !assignee.isEmpty { Text("· \(assignee)") }
                }
                .font(.caption2)
                .foregroundColor(.secondary)
            }

            Spacer()

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

    private var newItemForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("New Action Item").font(.caption.weight(.semibold)).foregroundColor(Theme.navy)
            TextField("Title", text: $newTitle).textFieldStyle(.roundedBorder)
            TextField("Description (optional)", text: $newDescription).textFieldStyle(.roundedBorder)
            Picker("Assign to", selection: $newAssignedTo) {
                Text("Unassigned").tag("")
                ForEach(people) { person in
                    Text(person.name).tag(person.id)
                }
            }
            .pickerStyle(.menu)
            TextField("Due date (YYYY-MM-DD, optional)", text: $newDueDate).textFieldStyle(.roundedBorder)
            Toggle("Visible to client", isOn: $newVisibleToClient).tint(Theme.gold)

            Button {
                Task { await create() }
            } label: {
                if isCreating { ProgressView() } else { Text("Add Item") }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(newTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreating)
        }
    }

    // MARK: - Data

    private func load() async {
        async let itemsTask: [ActionItem] = (try? await SupabaseConfig.client
            .from("action_items").select("*, projects(name)").eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        async let peopleTask: [PersonRef] = (try? await SupabaseConfig.client
            .from("profiles").select("id,first_name,last_name")
            .or("is_admin.eq.true,is_employee.eq.true").order("first_name", ascending: true)
            .execute().value) ?? []
        items = await itemsTask
        people = await peopleTask
        isLoading = false
    }

    private func toggleStatus(_ item: ActionItem) async {
        busyId = item.id
        defer { busyId = nil }
        struct Payload: Encodable { let status: String }
        let newStatus = item.status == "done" ? "open" : "done"
        do {
            try await APIClient.send("api/admin/action-items/\(item.id)", method: "PATCH", body: Payload(status: newStatus))
            HapticManager.selection()
            await load()
        } catch {
            HapticManager.error()
            message = "Could not update item."
        }
    }

    private func delete(_ item: ActionItem) async {
        busyId = item.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/action-items/\(item.id)", method: "DELETE", body: EmptyBody())
            items.removeAll { $0.id == item.id }
        } catch {
            message = "Could not delete item."
        }
    }

    private func create() async {
        isCreating = true
        message = nil
        defer { isCreating = false }
        struct Payload: Encodable {
            let projectId: String
            let title: String
            let description: String?
            let assigned_to: String?
            let visible_to_client: Bool
            let due_date: String?
        }
        let payload = Payload(
            projectId: projectId,
            title: newTitle,
            description: newDescription.isEmpty ? nil : newDescription,
            assigned_to: newAssignedTo.isEmpty ? nil : newAssignedTo,
            visible_to_client: newVisibleToClient,
            due_date: newDueDate.isEmpty ? nil : newDueDate
        )
        do {
            try await APIClient.send("api/admin/action-items", method: "POST", body: payload)
            newTitle = ""; newDescription = ""; newAssignedTo = ""; newDueDate = ""; newVisibleToClient = false
            await load()
        } catch {
            message = "Could not create item."
        }
    }
}

struct EmptyBody: Encodable {}
