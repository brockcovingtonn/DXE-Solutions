import SwiftUI

struct EmployeeProjectDetailView: View {
    let project: Project

    @State private var phases: [ProjectPhase] = []
    @State private var milestones: [ProjectMilestone] = []
    @State private var actionItems: [ActionItem] = []
    @State private var isLoading = true
    @State private var busyItemId: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header

                if isLoading {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                } else {
                    filesSection
                    progressSection
                    if !phases.isEmpty { phasesSection }
                    if !milestones.isEmpty { milestonesSection }
                    if !actionItems.isEmpty { actionItemsSection }
                    detailsSection
                }
            }
            .padding()
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadData() }
    }

    // MARK: - Quick actions

    private var filesSection: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: columns, spacing: 12) {
            NavigationLink {
                DocumentsView(project: project)
            } label: {
                filesButton(icon: "doc.text", label: "Documents")
            }
            NavigationLink {
                PhotosView(project: project)
            } label: {
                filesButton(icon: "photo.on.rectangle", label: "Photos")
            }
            NavigationLink {
                CalendarView(project: project)
            } label: {
                filesButton(icon: "calendar", label: "Calendar")
            }
            NavigationLink {
                PermitsView(project: project)
            } label: {
                filesButton(icon: "checkmark.seal", label: "Permits")
            }
            NavigationLink {
                AccountingView(project: project)
            } label: {
                filesButton(icon: "dollarsign.circle", label: "Accounting")
            }
            NavigationLink {
                ProjectContactsView(project: project)
            } label: {
                filesButton(icon: "person.text.rectangle", label: "Contacts")
            }
            NavigationLink {
                CoverSheetView(project: project)
            } label: {
                filesButton(icon: "doc.plaintext", label: "Cover Sheet")
            }
        }
        .buttonStyle(.plain)
    }

    private func filesButton(icon: String, label: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon).font(.title2)
            Text(label).font(.caption)
        }
        .foregroundColor(Theme.navy)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.cream)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Header / sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let address = project.address {
                Text(address)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            HStack {
                if let type = project.projectType {
                    Text(type)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Text(project.status.capitalized)
                    .font(.caption.weight(.semibold))
                    .foregroundColor(Theme.navy)
            }
        }
    }

    private var progressSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader("Overall Progress")
            ProgressView(value: Double(project.progressPct ?? 0), total: 100)
                .tint(Theme.gold)
            Text("\(project.progressPct ?? 0)% complete")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }

    private var phasesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("Phases")
            ForEach(phases.sorted(by: { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) })) { phase in
                HStack {
                    Circle()
                        .fill(phaseColor(phase.state))
                        .frame(width: 8, height: 8)
                    Text(phase.name)
                        .font(.subheadline)
                    Spacer()
                    if phase.state != "na" {
                        Text("\(phase.pct ?? 0)%")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }

    private var milestonesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("Milestones")
            ForEach(milestones.sorted(by: { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) })) { milestone in
                HStack {
                    Text(milestone.name)
                        .font(.subheadline)
                    Spacer()
                    Text(milestone.displayDate ?? "No date set")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private var actionItemsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("Action Items")
            ForEach(actionItems) { item in
                let isDone = item.status == "done"
                Button {
                    Task { await toggle(item) }
                } label: {
                    HStack(alignment: .top) {
                        if busyItemId == item.id {
                            ProgressView().frame(width: 18)
                        } else {
                            Image(systemName: isDone ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(isDone ? Theme.gold : .secondary)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title).font(.subheadline).strikethrough(isDone)
                            if let due = item.dueDate {
                                Text("Due \(due)").font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(busyItemId != nil)
            }
        }
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader("Permitting Details")
            DetailRow("APN", project.apn)
            DetailRow("Jurisdiction", project.jurisdiction)
            DetailRow("Zoning", project.zoning)
            DetailRow("Lot Size", project.lotSize)
            DetailRow("Building Size", project.buildingSize)
        }
    }

    private func phaseColor(_ state: String) -> Color {
        switch state {
        case "done": return .green
        case "active": return Theme.gold
        case "na": return .gray.opacity(0.4)
        default: return .gray.opacity(0.4)
        }
    }

    // MARK: - Data

    private func loadData() async {
        async let phasesTask: [ProjectPhase] = (try? await SupabaseConfig.client
            .from("project_phases").select().eq("project_id", value: project.id)
            .execute().value) ?? []
        async let milestonesTask: [ProjectMilestone] = (try? await SupabaseConfig.client
            .from("milestones").select().eq("project_id", value: project.id)
            .execute().value) ?? []
        async let actionItemsTask: [ActionItem] = (try? await SupabaseConfig.client
            .from("action_items").select("*, projects(name)").eq("project_id", value: project.id)
            .execute().value) ?? []

        phases = await phasesTask
        milestones = await milestonesTask
        actionItems = await actionItemsTask
        isLoading = false
    }

    private func toggle(_ item: ActionItem) async {
        busyItemId = item.id
        defer { busyItemId = nil }
        let newStatus = item.status == "done" ? "open" : "done"
        struct StatusUpdate: Encodable {
            let status: String
            let completed_at: String?
        }
        let payload = StatusUpdate(
            status: newStatus,
            completed_at: newStatus == "done" ? ISO8601DateFormatter().string(from: Date()) : nil
        )
        try? await SupabaseConfig.client
            .from("action_items")
            .update(payload)
            .eq("id", value: item.id)
            .execute()
        await loadData()
    }
}

private struct SectionHeader: View {
    let title: String
    init(_ title: String) { self.title = title }
    var body: some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundColor(Theme.gold)
            .tracking(1)
    }
}

private struct DetailRow: View {
    let label: String
    let value: String?
    init(_ label: String, _ value: String?) {
        self.label = label
        self.value = value
    }
    var body: some View {
        if let value, !value.isEmpty {
            HStack {
                Text(label).font(.caption).foregroundColor(.secondary)
                Spacer()
                Text(value).font(.subheadline)
            }
        }
    }
}
