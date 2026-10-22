import SwiftUI

// Shared between AdminProjectDetailView (isAdmin: true — full CRUD) and
// EmployeeProjectDetailView (isAdmin: false — can only toggle completion,
// never add/edit/delete areas or items). Not used on the client side at
// all, matching the web app's Scope of Work visibility.
struct ScopeOfWorkView: View {
    let projectId: String
    let isAdmin: Bool

    @State private var areas: [ScopeArea] = []
    @State private var isLoading = true
    @State private var message: String?
    @State private var busyId: String?

    @State private var areaSelection = ""
    @State private var customArea = ""
    @State private var isAddingArea = false
    @State private var newItemDrafts: [String: String] = [:]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                if areas.isEmpty {
                    Text("No scope of work areas added yet.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                ForEach(areas) { area in
                    areaCard(area)
                }

                if isAdmin {
                    addAreaForm
                }

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
    }

    private func areaCard(_ area: ScopeArea) -> some View {
        let completedCount = area.scopeItems.filter { $0.completed }.count
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(area.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.textPrimary)
                Spacer()
                Text(area.scopeItems.isEmpty ? "No items yet" : "\(completedCount)/\(area.scopeItems.count) complete")
                    .font(.caption2).foregroundColor(.secondary)
                if isAdmin {
                    Button {
                        Task { await deleteArea(area) }
                    } label: {
                        Image(systemName: "trash").foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                    .disabled(busyId == area.id)
                }
            }

            ForEach(area.scopeItems.sorted(by: { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) })) { item in
                itemRow(item, area: area)
            }

            if isAdmin {
                HStack {
                    TextField("Add a checklist item...", text: Binding(
                        get: { newItemDrafts[area.id] ?? "" },
                        set: { newItemDrafts[area.id] = $0 }
                    ))
                    .textFieldStyle(.roundedBorder)
                    Button("Add") {
                        Task { await addItem(area: area) }
                    }
                    .disabled((newItemDrafts[area.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || busyId == "new-\(area.id)")
                }
            }
        }
        .padding(10)
        .dxeCard()
    }

    private func itemRow(_ item: ScopeItem, area: ScopeArea) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top, spacing: 8) {
                Button {
                    Task { await toggle(item) }
                } label: {
                    Image(systemName: item.completed ? "checkmark.square.fill" : "square")
                        .foregroundColor(item.completed ? Theme.success : .secondary)
                }
                .buttonStyle(.plain)
                .disabled(busyId == item.id)

                Text(item.description)
                    .font(.subheadline)
                    .foregroundColor(item.completed ? .secondary : Theme.textPrimary)
                    .strikethrough(item.completed)

                Spacer()

                if isAdmin {
                    Button {
                        Task { await deleteItem(item) }
                    } label: {
                        Image(systemName: "trash").foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                    .disabled(busyId == item.id)
                }
            }

            if isAdmin {
                HStack {
                    TextField("Notes", text: Binding(
                        get: { item.notes ?? "" },
                        set: { newValue in updateLocalField(item: item, area: area, notes: newValue) }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                    .onSubmit { Task { await saveField(item, field: "notes", value: item.notes ?? "") } }

                    TextField("Timeline", text: Binding(
                        get: { item.timeline ?? "" },
                        set: { newValue in updateLocalField(item: item, area: area, timeline: newValue) }
                    ))
                    .textFieldStyle(.roundedBorder)
                    .font(.caption)
                    .onSubmit { Task { await saveField(item, field: "timeline", value: item.timeline ?? "") } }
                }
                .padding(.leading, 26)
            } else if (item.notes?.isEmpty == false) || (item.timeline?.isEmpty == false) {
                HStack(spacing: 10) {
                    if let notes = item.notes, !notes.isEmpty {
                        Text("Notes: \(notes)").font(.caption2).foregroundColor(.secondary)
                    }
                    if let timeline = item.timeline, !timeline.isEmpty {
                        Text("Timeline: \(timeline)").font(.caption2).foregroundColor(.secondary)
                    }
                }
                .padding(.leading, 26)
            }
        }
        .opacity(busyId == item.id ? 0.6 : 1)
    }

    private var addAreaForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Picker("Area", selection: $areaSelection) {
                Text("Choose an area...").tag("")
                ForEach(PropertyAreas.all, id: \.self) { Text($0).tag($0) }
            }
            .pickerStyle(.menu)

            if areaSelection == "Other" {
                TextField("Custom area name", text: $customArea).textFieldStyle(.roundedBorder)
            }

            Button {
                Task { await addArea() }
            } label: {
                if isAddingArea { ProgressView() } else { Text("Add Area") }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(isAddingArea || areaSelection.isEmpty || (areaSelection == "Other" && customArea.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))
        }
    }

    // MARK: - Local edit staging (so typing doesn't round-trip per keystroke)

    private func updateLocalField(item: ScopeItem, area: ScopeArea, notes: String? = nil, timeline: String? = nil) {
        guard let areaIdx = areas.firstIndex(where: { $0.id == area.id }),
              let itemIdx = areas[areaIdx].scopeItems.firstIndex(where: { $0.id == item.id }) else { return }
        if let notes { areas[areaIdx].scopeItems[itemIdx].notes = notes }
        if let timeline { areas[areaIdx].scopeItems[itemIdx].timeline = timeline }
    }

    // MARK: - Data

    private func load() async {
        areas = (try? await SupabaseConfig.client
            .from("scope_areas")
            .select("*, scope_items(*)")
            .eq("project_id", value: projectId)
            .order("sort_order", ascending: true)
            .execute().value) ?? []
        isLoading = false
    }

    private func toggle(_ item: ScopeItem) async {
        busyId = item.id
        defer { busyId = nil }
        struct Payload: Encodable { let completed: Bool }
        do {
            try await APIClient.send("api/admin/scope-items/\(item.id)", method: "PATCH", body: Payload(completed: !item.completed))
            await load()
        } catch {
            message = "Could not update item."
        }
    }

    private func saveField(_ item: ScopeItem, field: String, value: String) async {
        struct NotesPayload: Encodable { let notes: String }
        struct TimelinePayload: Encodable { let timeline: String }
        do {
            if field == "notes" {
                try await APIClient.send("api/admin/scope-items/\(item.id)", method: "PATCH", body: NotesPayload(notes: value))
            } else {
                try await APIClient.send("api/admin/scope-items/\(item.id)", method: "PATCH", body: TimelinePayload(timeline: value))
            }
        } catch {
            message = "Could not save changes."
        }
    }

    private func deleteItem(_ item: ScopeItem) async {
        busyId = item.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/scope-items/\(item.id)", method: "DELETE", body: EmptyBody())
            await load()
        } catch {
            message = "Could not delete item."
        }
    }

    private func addItem(area: ScopeArea) async {
        let description = (newItemDrafts[area.id] ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !description.isEmpty else { return }
        busyId = "new-\(area.id)"
        defer { busyId = nil }
        struct Payload: Encodable { let areaId: String; let projectId: String; let description: String }
        do {
            try await APIClient.send("api/admin/scope-items", method: "POST", body: Payload(areaId: area.id, projectId: projectId, description: description))
            newItemDrafts[area.id] = ""
            await load()
        } catch {
            message = "Could not add that item."
        }
    }

    private func deleteArea(_ area: ScopeArea) async {
        busyId = area.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/scope-areas/\(area.id)", method: "DELETE", body: EmptyBody())
            await load()
        } catch {
            message = "Could not delete area."
        }
    }

    private func addArea() async {
        let name = areaSelection == "Other" ? customArea.trimmingCharacters(in: .whitespacesAndNewlines) : areaSelection
        guard !name.isEmpty else { return }
        isAddingArea = true
        message = nil
        defer { isAddingArea = false }
        struct Payload: Encodable { let projectId: String; let name: String }
        do {
            try await APIClient.send("api/admin/scope-areas", method: "POST", body: Payload(projectId: projectId, name: name))
            areaSelection = ""
            customArea = ""
            await load()
        } catch {
            message = "Could not add that area."
        }
    }
}
