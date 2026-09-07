import SwiftUI

private struct ProjectPickerRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

struct AddCalendarEventView: View {
    let lockedProject: Project?
    let isAdmin: Bool
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
    @State private var people: [ProjectRosterMember] = []
    @State private var isSaving = false
    @State private var errorMessage: String?

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
                    .disabled(effectiveProjectId.isEmpty)
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

                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.caption)
                }
            }
            .navigationTitle("New Calendar Item")
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
                if lockedProject == nil {
                    await loadProjects()
                } else if let lockedProject {
                    await loadRoster(projectId: lockedProject.id)
                }
            }
            .onChange(of: selectedProjectId) { newValue in
                assignedTo = ""
                if newValue.isEmpty {
                    people = []
                } else {
                    Task { await loadRoster(projectId: newValue) }
                }
            }
        }
    }

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
        people = roster.staff
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }

        let calendar = Calendar.current
        var startComponents = calendar.dateComponents([.year, .month, .day], from: date)
        if !allDay {
            let timeComponents = calendar.dateComponents([.hour, .minute], from: startTime)
            startComponents.hour = timeComponents.hour
            startComponents.minute = timeComponents.minute
        }
        guard let startDate = calendar.date(from: startComponents) else { return }

        var endDateString: String?
        if !allDay && hasEndTime {
            var endComponents = calendar.dateComponents([.year, .month, .day], from: date)
            let endTimeComponents = calendar.dateComponents([.hour, .minute], from: endTime)
            endComponents.hour = endTimeComponents.hour
            endComponents.minute = endTimeComponents.minute
            if let endDate = calendar.date(from: endComponents) {
                endDateString = ISO8601DateFormatter().string(from: endDate)
            }
        }

        struct Payload: Encodable {
            let projectId: String?
            let title: String
            let description: String?
            let eventType: String
            let assignedTo: String?
            let startTime: String
            let endTime: String?
            let allDay: Bool
            let visibleToClient: Bool
        }

        let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let payload = Payload(
            projectId: effectiveProjectId.isEmpty ? nil : effectiveProjectId,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: trimmedDescription.isEmpty ? nil : trimmedDescription,
            eventType: eventType,
            assignedTo: assignedTo.isEmpty ? nil : assignedTo,
            startTime: ISO8601DateFormatter().string(from: startDate),
            endTime: endDateString,
            allDay: allDay,
            visibleToClient: visibleToClient
        )

        let path = isAdmin ? "api/admin/calendar-events" : "api/calendar-events"
        do {
            try await APIClient.send(path, method: "POST", body: payload)
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
}
