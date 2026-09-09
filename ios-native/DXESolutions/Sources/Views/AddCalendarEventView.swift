import SwiftUI

private struct ProjectPickerRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

private struct AssignablePerson: Identifiable, Hashable {
    let id: String
    let name: String
}

private struct FirmMember: Decodable {
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

private struct TaggedContactRow: Decodable {
    let contactId: String

    enum CodingKeys: String, CodingKey {
        case contactId = "contact_id"
    }
}

private struct GuestRow: Decodable {
    let email: String
    let name: String?
}

private struct Guest: Identifiable, Hashable {
    let id = UUID()
    var email: String
    var name: String
}

struct AddCalendarEventView: View {
    let lockedProject: Project?
    let isAdmin: Bool
    var existingEvent: CalendarEvent? = nil
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var eventType = "appointment"
    @State private var selectedProjectId = ""
    @State private var assignedTo = ""
    @State private var date = Date()
    @State private var startTime = Date()
    @State private var hasEndTime = false
    @State private var endTime = Date()
    @State private var allDay = false
    @State private var visibleToClient = false

    @State private var projects: [ProjectPickerRef] = []
    @State private var people: [AssignablePerson] = []
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var isPrefilling = false

    // Tagged contacts
    @State private var contacts: [Contact] = []
    @State private var taggedContactIds: Set<String> = []

    // Guests
    @State private var guests: [Guest] = []
    @State private var guestName = ""
    @State private var guestEmail = ""

    // Delete
    @State private var isDeleting = false
    @State private var showDeleteConfirm = false

    private let eventTypes: [(String, String)] = [
        ("appointment", "Appointment"),
        ("inspection", "Inspection"),
        ("meeting", "Meeting"),
        ("deadline", "Deadline"),
        ("action_item", "Action Item"),
        ("other", "Other"),
    ]

    private var effectiveProjectId: String {
        lockedProject?.id ?? selectedProjectId
    }

    private var canSave: Bool {
        guard !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        if eventType == "action_item" && effectiveProjectId.isEmpty { return false }
        if !isAdmin && effectiveProjectId.isEmpty { return false }
        return true
    }

    private var taggedContacts: [Contact] {
        contacts.filter { taggedContactIds.contains($0.id) }
    }

    private var availableContacts: [Contact] {
        contacts.filter { !taggedContactIds.contains($0.id) }
    }

    private var isValidGuestEmail: Bool {
        let trimmed = guestEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.contains("@") && trimmed.contains(".")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Title", text: $title)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(2...5)
                }

                Section("Type") {
                    Picker("Type", selection: $eventType) {
                        ForEach(eventTypes, id: \.0) { value, label in
                            Text(label).tag(value)
                        }
                    }
                    .pickerStyle(.menu)
                }

                if let lockedProject {
                    Section("Project") {
                        Text(lockedProject.name).foregroundColor(.secondary)
                    }
                } else {
                    Section("Project") {
                        Picker("Project", selection: $selectedProjectId) {
                            Text("General — no project").tag("")
                            ForEach(projects) { p in
                                Text(p.name).tag(p.id)
                            }
                        }
                        .pickerStyle(.menu)
                    }
                }

                Section("Assign to") {
                    Picker("Assign to", selection: $assignedTo) {
                        Text("Unassigned").tag("")
                        ForEach(people) { person in
                            Text(person.name).tag(person.id)
                        }
                    }
                    .pickerStyle(.menu)
                }

                Section("When") {
                    Toggle("All day", isOn: $allDay)
                    DatePicker("Date", selection: $date, displayedComponents: .date)
                    if !allDay {
                        DatePicker("Start time", selection: $startTime, displayedComponents: .hourAndMinute)
                        Toggle("Set end time", isOn: $hasEndTime)
                        if hasEndTime {
                            DatePicker("End time", selection: $endTime, displayedComponents: .hourAndMinute)
                        }
                    }
                }

                if !effectiveProjectId.isEmpty {
                    Section {
                        Toggle("Visible to client", isOn: $visibleToClient)
                    }
                }

                taggedContactsSection
                guestsSection

                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.caption)
                }

                if existingEvent != nil {
                    Section {
                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            if isDeleting { ProgressView() } else { Text("Delete Event") }
                        }
                        .disabled(isDeleting)
                    }
                }
            }
            .navigationTitle(existingEvent == nil ? "New Calendar Item" : "Edit Calendar Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving || !canSave)
                }
            }
            .task {
                if let existingEvent {
                    isPrefilling = true
                    prefill(from: existingEvent)
                }

                if lockedProject == nil {
                    await loadProjects()
                    if selectedProjectId.isEmpty {
                        await loadFirmwidePeople()
                    } else {
                        await loadRoster(projectId: selectedProjectId)
                    }
                } else if let lockedProject {
                    await loadRoster(projectId: lockedProject.id)
                }
                isPrefilling = false

                await loadContacts()
                if let existingEvent {
                    await loadExistingTagsAndGuests(eventId: existingEvent.id)
                }
            }
            .onChange(of: selectedProjectId) { newValue in
                if !isPrefilling {
                    assignedTo = ""
                }
                if newValue.isEmpty {
                    Task { await loadFirmwidePeople() }
                } else {
                    Task { await loadRoster(projectId: newValue) }
                }
            }
            .alert("Delete this event?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { Task { await deleteEvent() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will remove it from the calendar for everyone. This cannot be undone.")
            }
        }
    }

    // MARK: - Tagged contacts / guests UI

    private var taggedContactsSection: some View {
        Section("Tagged Contacts") {
            if taggedContacts.isEmpty {
                Text("No contacts tagged.").font(.caption).foregroundColor(.secondary)
            } else {
                ForEach(taggedContacts) { contact in
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(contact.name).font(.subheadline.weight(.medium))
                                if let trade = contact.trade, !trade.isEmpty {
                                    Text(trade).font(.caption).foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            Button {
                                taggedContactIds.remove(contact.id)
                            } label: {
                                Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                        if let phone = contact.phone, !phone.isEmpty {
                            Text(phone).font(.caption2).foregroundColor(.secondary)
                        }
                        if let email = contact.email, !email.isEmpty {
                            Text(email).font(.caption2).foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 2)
                }
            }

            if !availableContacts.isEmpty {
                Menu {
                    ForEach(availableContacts) { contact in
                        Button(contact.name) {
                            taggedContactIds.insert(contact.id)
                        }
                    }
                } label: {
                    Label("Tag a contact", systemImage: "person.badge.plus")
                }
            }
        }
    }

    private var guestsSection: some View {
        Section("Guests") {
            if !guests.isEmpty {
                ForEach(guests) { guest in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(guest.name.isEmpty ? guest.email : guest.name)
                                .font(.subheadline)
                            if !guest.name.isEmpty {
                                Text(guest.email).font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        Button {
                            guests.removeAll { $0.id == guest.id }
                        } label: {
                            Image(systemName: "xmark.circle.fill").foregroundColor(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 6) {
                TextField("Name (optional)", text: $guestName)
                    .textFieldStyle(.roundedBorder)
                HStack {
                    TextField("Email", text: $guestEmail)
                        .textFieldStyle(.roundedBorder)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Add") {
                        addGuest()
                    }
                    .disabled(!isValidGuestEmail)
                }
            }
            .padding(.vertical, 2)
        }
    }

    private func addGuest() {
        let email = guestEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !email.isEmpty else { return }
        let name = guestName.trimmingCharacters(in: .whitespacesAndNewlines)
        guests.append(Guest(email: email, name: name))
        guestEmail = ""
        guestName = ""
    }

    // MARK: - Prefill (edit mode)

    private func prefill(from event: CalendarEvent) {
        title = event.title
        description = event.description ?? ""
        eventType = event.eventType ?? "appointment"
        if lockedProject == nil {
            selectedProjectId = event.projectId ?? ""
        }
        assignedTo = event.assignedTo ?? ""
        allDay = event.allDay
        visibleToClient = event.visibleToClient

        let start = Self.parseISODate(event.startTime) ?? Date()
        date = Calendar.current.startOfDay(for: start)
        startTime = start
        if let endString = event.endTime, let end = Self.parseISODate(endString) {
            hasEndTime = true
            endTime = end
        } else {
            hasEndTime = false
        }
    }

    private static func parseISODate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }

    // MARK: - Data loading

    private func loadProjects() async {
        projects = (try? await SupabaseConfig.client
            .from("projects")
            .select("id,name")
            .order("name", ascending: true)
            .execute()
            .value) ?? []
    }

    private func loadRoster(projectId: String) async {
        guard let roster: ProjectRoster = try? await APIClient.get("api/projects/\(projectId)/roster") else { return }
        people = roster.staff.map { AssignablePerson(id: $0.id, name: $0.name) }
    }

    // Firm-wide assignee list for a general (no-project) item — matches
    // the web master calendar, which isn't scoped to any project's team.
    private func loadFirmwidePeople() async {
        let rows: [FirmMember] = (try? await SupabaseConfig.client
            .from("profiles")
            .select("id, first_name, last_name")
            .or("is_admin.eq.true,is_employee.eq.true")
            .order("first_name", ascending: true)
            .execute()
            .value) ?? []
        people = rows.map { AssignablePerson(id: $0.id, name: $0.name) }
    }

    private func loadContacts() async {
        contacts = (try? await SupabaseConfig.client
            .from("contacts")
            .select()
            .order("name", ascending: true)
            .execute()
            .value) ?? []
    }

    private func loadExistingTagsAndGuests(eventId: String) async {
        let contactRows: [TaggedContactRow] = (try? await SupabaseConfig.client
            .from("calendar_event_contacts")
            .select("contact_id")
            .eq("calendar_event_id", value: eventId)
            .execute()
            .value) ?? []
        taggedContactIds = Set(contactRows.map { $0.contactId })

        let guestRows: [GuestRow] = (try? await SupabaseConfig.client
            .from("calendar_event_guests")
            .select("email,name")
            .eq("calendar_event_id", value: eventId)
            .execute()
            .value) ?? []
        guests = guestRows.map { Guest(email: $0.email, name: $0.name ?? "") }
    }

    // MARK: - Save / delete

    private func computeStartDate() -> Date? {
        let calendar = Calendar.current
        var startComponents = calendar.dateComponents([.year, .month, .day], from: date)
        if !allDay {
            let timeComponents = calendar.dateComponents([.hour, .minute], from: startTime)
            startComponents.hour = timeComponents.hour
            startComponents.minute = timeComponents.minute
        }
        return calendar.date(from: startComponents)
    }

    private func computeEndDateString() -> String? {
        guard !allDay && hasEndTime else { return nil }
        let calendar = Calendar.current
        var endComponents = calendar.dateComponents([.year, .month, .day], from: date)
        let endTimeComponents = calendar.dateComponents([.hour, .minute], from: endTime)
        endComponents.hour = endTimeComponents.hour
        endComponents.minute = endTimeComponents.minute
        guard let endDate = calendar.date(from: endComponents) else { return nil }
        return ISO8601DateFormatter().string(from: endDate)
    }

    private struct GuestPayload: Encodable {
        let email: String
        let name: String?
    }

    private struct CreatePayload: Encodable {
        let projectId: String?
        let title: String
        let description: String?
        let eventType: String
        let assignedTo: String?
        let startTime: String
        let endTime: String?
        let allDay: Bool
        let visibleToClient: Bool
        let contactIds: [String]
        let guests: [GuestPayload]
    }

    // Base update payload for the employee PATCH route, which doesn't
    // accept project_id (an event can't be moved off the employee's
    // assigned project from this screen).
    private struct UpdatePayload: Encodable {
        let title: String
        let description: String?
        let start_time: String
        let end_time: String?
        let all_day: Bool
        let visible_to_client: Bool
        let event_type: String
        let assigned_to: String?
        let contactIds: [String]
        let guests: [GuestPayload]
    }

    private struct AdminUpdatePayload: Encodable {
        let title: String
        let description: String?
        let start_time: String
        let end_time: String?
        let all_day: Bool
        let visible_to_client: Bool
        let project_id: String?
        let event_type: String
        let assigned_to: String?
        let contactIds: [String]
        let guests: [GuestPayload]
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        guard let startDate = computeStartDate() else { return }
        let endDateString = computeEndDateString()

        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let contactIdsArray = Array(taggedContactIds)
        let guestPayloads = guests.map { GuestPayload(email: $0.email, name: $0.name.isEmpty ? nil : $0.name) }
        let startTimeString = ISO8601DateFormatter().string(from: startDate)

        do {
            if let existingEvent {
                let path = isAdmin ? "api/admin/calendar-events/\(existingEvent.id)" : "api/calendar-events/\(existingEvent.id)"
                if isAdmin {
                    let payload = AdminUpdatePayload(
                        title: trimmedTitle,
                        description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                        start_time: startTimeString,
                        end_time: endDateString,
                        all_day: allDay,
                        visible_to_client: visibleToClient,
                        project_id: effectiveProjectId.isEmpty ? nil : effectiveProjectId,
                        event_type: eventType,
                        assigned_to: assignedTo.isEmpty ? nil : assignedTo,
                        contactIds: contactIdsArray,
                        guests: guestPayloads
                    )
                    try await APIClient.send(path, method: "PATCH", body: payload)
                } else {
                    let payload = UpdatePayload(
                        title: trimmedTitle,
                        description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                        start_time: startTimeString,
                        end_time: endDateString,
                        all_day: allDay,
                        visible_to_client: visibleToClient,
                        event_type: eventType,
                        assigned_to: assignedTo.isEmpty ? nil : assignedTo,
                        contactIds: contactIdsArray,
                        guests: guestPayloads
                    )
                    try await APIClient.send(path, method: "PATCH", body: payload)
                }
            } else {
                let payload = CreatePayload(
                    projectId: effectiveProjectId.isEmpty ? nil : effectiveProjectId,
                    title: trimmedTitle,
                    description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                    eventType: eventType,
                    assignedTo: assignedTo.isEmpty ? nil : assignedTo,
                    startTime: startTimeString,
                    endTime: endDateString,
                    allDay: allDay,
                    visibleToClient: visibleToClient,
                    contactIds: contactIdsArray,
                    guests: guestPayloads
                )
                let path = isAdmin ? "api/admin/calendar-events" : "api/calendar-events"
                try await APIClient.send(path, method: "POST", body: payload)
            }
            HapticManager.success()
            onSaved()
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription ?? "Could not save this event."
        } catch {
            HapticManager.error()
            errorMessage = "Could not save this event."
        }
    }

    private func deleteEvent() async {
        guard let existingEvent else { return }
        isDeleting = true
        errorMessage = nil
        defer { isDeleting = false }

        let path = isAdmin ? "api/admin/calendar-events/\(existingEvent.id)" : "api/calendar-events/\(existingEvent.id)"
        do {
            try await APIClient.send(path, method: "DELETE", body: EmptyBody())
            HapticManager.success()
            onSaved()
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription ?? "Could not delete this event."
        } catch {
            HapticManager.error()
            errorMessage = "Could not delete this event."
        }
    }
}
