import SwiftUI

private struct EditablePhase: Identifiable {
    let id = UUID()
    var name: String
    var pct: Double
    var state: String
}

private struct EditableMilestone: Identifiable {
    let id = UUID()
    var name: String
    var displayDate: String
    var state: String
    var notes: String
}

struct AdminProjectDetailView: View {
    let projectId: String

    @State private var project: CoverSheetProject?
    @State private var isLoading = true
    @State private var errorMessage: String?

    // Info form
    @State private var name = ""
    @State private var address = ""
    @State private var projectType = ""
    @State private var status = "planning"
    @State private var startedOn = ""
    @State private var estimatedCompletion = ""
    @State private var progressPct: Double = 0
    @State private var apn = ""
    @State private var jurisdiction = ""
    @State private var zoning = ""
    @State private var lotSize = ""
    @State private var buildingSize = ""
    @State private var isSavingInfo = false
    @State private var infoMessage: String?
    @State private var infoMessageIsError = false

    // Phases
    @State private var phases: [EditablePhase] = []
    @State private var isSavingPhases = false
    @State private var phasesMessage: String?

    // Milestones
    @State private var milestones: [EditableMilestone] = []
    @State private var isSavingMilestones = false
    @State private var milestonesMessage: String?

    private let projectTypes = [
        "Residential — New Construction",
        "Residential — ADU",
        "Residential — Renovation / Addition",
        "Commercial — New Construction",
        "Commercial — Tenant Improvement",
        "Mixed-Use Development",
        "Permitting",
        "Utilities",
        "Other",
    ]
    private let statuses = ["planning", "active", "on-hold", "completed"]
    private let phaseStates = ["pending", "active", "done", "na"]
    private let milestoneStates = ["pending", "active", "done"]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        header
                        infoSection
                        sectionCard("Assigned Employees") { AdminEmployeesEditor(projectId: projectId) }
                        sectionCard("Permits") { AdminPermitsEditor(projectId: projectId) }
                        sectionCard("Project Team") { AdminTeamEditor(projectId: projectId) }
                        calendarSection
                        phasesSection
                        sectionCard("Action Items") { AdminActionItemsEditor(projectId: projectId) }
                        milestonesSection
                        sectionCard("Utilities") { AdminUtilitiesEditor(projectId: projectId) }
                        sectionCard("Documents") { AdminDocumentsEditor(projectId: projectId) }
                        sectionCard("Accounting") { AdminAccountingEditor(projectId: projectId) }
                        sectionCard("Photos") { AdminPhotosEditor(projectId: projectId) }
                        sectionCard("Notes & Updates") { AdminNotesEditor(projectId: projectId) }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(project?.name ?? "Project")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let owner = project?.profiles {
                Text([owner.firstName, owner.lastName].compactMap { $0 }.joined(separator: " "))
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(Theme.navy)
                if let email = owner.email {
                    Text(email).font(.caption).foregroundColor(.secondary)
                }
            }
        }
    }

    // MARK: - Info

    private var infoSection: some View {
        sectionCard("Project Details") {
            VStack(alignment: .leading, spacing: 12) {
                labeledField("Project Name", text: $name)
                labeledField("Address", text: $address)

                labeledPicker("Project Type", selection: $projectType, options: [""] + projectTypes) { $0.isEmpty ? "Select type..." : $0 }
                labeledPicker("Status", selection: $status, options: statuses) { $0.capitalized }

                labeledField("Start Date (YYYY-MM-DD)", text: $startedOn)
                labeledField("Est. Completion (YYYY-MM-DD)", text: $estimatedCompletion)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Overall Progress: \(Int(progressPct))%")
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(.secondary)
                    Slider(value: $progressPct, in: 0...100, step: 1)
                        .tint(Theme.gold)
                }

                Divider().padding(.vertical, 4)
                Text("PERMITTING DETAILS").font(.caption2.weight(.semibold)).foregroundColor(Theme.gold).tracking(1)

                labeledField("APN / Parcel Number", text: $apn)
                labeledField("Jurisdiction", text: $jurisdiction)
                labeledField("Zoning", text: $zoning)
                labeledField("Lot Size", text: $lotSize)
                labeledField("Building Size", text: $buildingSize)

                if let infoMessage {
                    Text(infoMessage).font(.caption).foregroundColor(infoMessageIsError ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
                }

                Button {
                    Task { await saveInfo() }
                } label: {
                    if isSavingInfo { ProgressView() } else { Text("Save Changes") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSavingInfo)
            }
        }
    }

    private func saveInfo() async {
        isSavingInfo = true
        infoMessage = nil
        defer { isSavingInfo = false }

        struct Payload: Encodable {
            let name: String
            let address: String
            let project_type: String
            let started_on: String
            let estimated_completion: String
            let progress_pct: Int
            let status: String
            let apn: String
            let jurisdiction: String
            let zoning: String
            let lot_size: String
            let building_size: String
        }
        let payload = Payload(
            name: name, address: address, project_type: projectType,
            started_on: startedOn, estimated_completion: estimatedCompletion,
            progress_pct: Int(progressPct), status: status,
            apn: apn, jurisdiction: jurisdiction, zoning: zoning,
            lot_size: lotSize, building_size: buildingSize
        )
        do {
            try await APIClient.send("api/admin/projects/\(projectId)", method: "PATCH", body: payload)
            infoMessage = "Saved."
            infoMessageIsError = false
        } catch {
            infoMessage = (error as? APIError)?.errorDescription ?? "Could not save changes."
            infoMessageIsError = true
        }
    }

    // MARK: - Calendar

    private var asProject: Project? {
        guard let project else { return nil }
        return Project(
            id: project.id,
            name: project.name,
            address: project.address,
            projectType: project.projectType,
            status: project.status,
            progressPct: project.progressPct,
            startedOn: project.startedOn,
            estimatedCompletion: project.estimatedCompletion,
            apn: project.apn,
            jurisdiction: project.jurisdiction,
            zoning: project.zoning,
            lotSize: project.lotSize,
            buildingSize: project.buildingSize
        )
    }

    private var calendarSection: some View {
        sectionCard("Calendar") {
            NavigationLink {
                CalendarView(project: asProject)
            } label: {
                HStack {
                    Image(systemName: "calendar")
                    Text("View Project Calendar")
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .foregroundColor(Theme.navy)
            }
        }
    }

    // MARK: - Phases

    private var phasesSection: some View {
        sectionCard("Project Phases") {
            VStack(alignment: .leading, spacing: 10) {
                ForEach($phases) { $phase in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            TextField("Phase name", text: $phase.name)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                phases.removeAll { $0.id == phase.id }
                            } label: {
                                Image(systemName: "trash").foregroundColor(.red)
                            }
                        }
                        HStack {
                            Picker("State", selection: $phase.state) {
                                ForEach(phaseStates, id: \.self) { Text($0.capitalized).tag($0) }
                            }
                            .pickerStyle(.menu)
                            Spacer()
                            if phase.state != "na" {
                                Text("\(Int(phase.pct))%").font(.caption).foregroundColor(.secondary)
                                Slider(value: $phase.pct, in: 0...100, step: 1).frame(width: 120).tint(Theme.gold)
                            }
                        }
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    phases.append(EditablePhase(name: "", pct: 0, state: "pending"))
                } label: {
                    Label("Add phase", systemImage: "plus")
                }
                .font(.caption.weight(.medium))

                if let phasesMessage {
                    Text(phasesMessage).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await savePhases() }
                } label: {
                    if isSavingPhases { ProgressView() } else { Text("Save Phases") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSavingPhases)
            }
        }
    }

    private func savePhases() async {
        isSavingPhases = true
        phasesMessage = nil
        defer { isSavingPhases = false }

        struct PhasePayload: Encodable { let name: String; let pct: Int; let state: String }
        struct Payload: Encodable { let projectId: String; let phases: [PhasePayload] }
        let payload = Payload(
            projectId: projectId,
            phases: phases.map { PhasePayload(name: $0.name, pct: Int($0.pct), state: $0.state) }
        )
        do {
            try await APIClient.send("api/admin/phases", method: "PUT", body: payload)
            phasesMessage = "Saved."
        } catch {
            phasesMessage = (error as? APIError)?.errorDescription ?? "Could not save phases."
        }
    }

    // MARK: - Milestones

    private var milestonesSection: some View {
        sectionCard("Milestones") {
            VStack(alignment: .leading, spacing: 10) {
                ForEach($milestones) { $milestone in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            TextField("Milestone name", text: $milestone.name)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                milestones.removeAll { $0.id == milestone.id }
                            } label: {
                                Image(systemName: "trash").foregroundColor(.red)
                            }
                        }
                        TextField("Date (e.g. Aug 14, 2025)", text: $milestone.displayDate)
                            .textFieldStyle(.roundedBorder)
                        Picker("State", selection: $milestone.state) {
                            ForEach(milestoneStates, id: \.self) { Text($0.capitalized).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        TextField("Notes (visible to client)", text: $milestone.notes, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2...4)
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    milestones.append(EditableMilestone(name: "", displayDate: "", state: "pending", notes: ""))
                } label: {
                    Label("Add milestone", systemImage: "plus")
                }
                .font(.caption.weight(.medium))

                if let milestonesMessage {
                    Text(milestonesMessage).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await saveMilestones() }
                } label: {
                    if isSavingMilestones { ProgressView() } else { Text("Save Milestones") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSavingMilestones)
            }
        }
    }

    private func saveMilestones() async {
        isSavingMilestones = true
        milestonesMessage = nil
        defer { isSavingMilestones = false }

        struct MilestonePayload: Encodable { let name: String; let display_date: String; let state: String; let notes: String? }
        struct Payload: Encodable { let projectId: String; let milestones: [MilestonePayload] }
        let payload = Payload(
            projectId: projectId,
            milestones: milestones.map {
                MilestonePayload(name: $0.name, display_date: $0.displayDate, state: $0.state, notes: $0.notes.isEmpty ? nil : $0.notes)
            }
        )
        do {
            try await APIClient.send("api/admin/milestones", method: "PUT", body: payload)
            milestonesMessage = "Saved."
        } catch {
            milestonesMessage = (error as? APIError)?.errorDescription ?? "Could not save milestones."
        }
    }

    // MARK: - Shared UI

    private func sectionCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline).foregroundColor(Theme.navy)
            content()
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func labeledField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            TextField(label, text: text)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func labeledPicker(_ label: String, selection: Binding<String>, options: [String], display: @escaping (String) -> String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Picker(label, selection: selection) {
                ForEach(options, id: \.self) { option in
                    Text(display(option)).tag(option)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: - Data

    private func load() async {
        do {
            let project: CoverSheetProject = try await SupabaseConfig.client
                .from("projects")
                .select("*, profiles!projects_owner_id_fkey(first_name,last_name,email,phone)")
                .eq("id", value: projectId)
                .single()
                .execute()
                .value
            self.project = project
            name = project.name
            address = project.address ?? ""
            projectType = project.projectType ?? ""
            status = project.status
            startedOn = project.startedOn ?? ""
            estimatedCompletion = project.estimatedCompletion ?? ""
            progressPct = Double(project.progressPct ?? 0)
            apn = project.apn ?? ""
            jurisdiction = project.jurisdiction ?? ""
            zoning = project.zoning ?? ""
            lotSize = project.lotSize ?? ""
            buildingSize = project.buildingSize ?? ""
        } catch {
            errorMessage = "Could not load project."
            isLoading = false
            return
        }

        async let phasesTask: [ProjectPhase] = (try? await SupabaseConfig.client
            .from("project_phases").select().eq("project_id", value: projectId)
            .order("sort_order", ascending: true).execute().value) ?? []
        async let milestonesTask: [ProjectMilestone] = (try? await SupabaseConfig.client
            .from("milestones").select().eq("project_id", value: projectId)
            .order("sort_order", ascending: true).execute().value) ?? []

        phases = (await phasesTask).map { EditablePhase(name: $0.name, pct: Double($0.pct ?? 0), state: $0.state) }
        milestones = (await milestonesTask).map {
            EditableMilestone(name: $0.name, displayDate: $0.displayDate ?? "", state: $0.state, notes: $0.notes ?? "")
        }
        isLoading = false
    }
}
