import SwiftUI

struct ProjectOverviewView: View {
    let project: Project

    @State private var phases: [ProjectPhase] = []
    @State private var milestones: [ProjectMilestone] = []
    @State private var actionItems: [ActionItem] = []
    @State private var isLoading = true

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
                UtilitiesView(project: project)
            } label: {
                filesButton(icon: "bolt", label: "Utilities")
            }
            NavigationLink {
                ProposalsView(project: project)
            } label: {
                filesButton(icon: "doc.text.fill", label: "Proposals")
            }
            NavigationLink {
                AccountingView(project: project)
            } label: {
                filesButton(icon: "dollarsign.circle", label: "Accounting")
            }
            NavigationLink {
                NotesView(project: project)
            } label: {
                filesButton(icon: "note.text", label: "Notes")
            }
            NavigationLink {
                ReviewView(project: project)
            } label: {
                filesButton(icon: "star", label: "Review")
            }
            NavigationLink {
                ProjectContactsView(project: project)
            } label: {
                filesButton(icon: "person.text.rectangle", label: "Contacts")
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
                HStack(alignment: .top) {
                    Image(systemName: item.status == "done" ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(item.status == "done" ? .green : .secondary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.title).font(.subheadline)
                        if let due = item.dueDate {
                            Text("Due \(due)").font(.caption).foregroundColor(.secondary)
                        }
                    }
                }
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

    private func loadData() async {
        async let phasesTask: [ProjectPhase] = SupabaseConfig.client
            .from("project_phases").select().eq("project_id", value: project.id)
            .execute().value
        async let milestonesTask: [ProjectMilestone] = SupabaseConfig.client
            .from("milestones").select().eq("project_id", value: project.id)
            .execute().value
        async let actionItemsTask: [ActionItem] = SupabaseConfig.client
            .from("action_items").select().eq("project_id", value: project.id)
            .execute().value

        phases = (try? await phasesTask) ?? []
        milestones = (try? await milestonesTask) ?? []
        actionItems = (try? await actionItemsTask) ?? []
        isLoading = false
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
