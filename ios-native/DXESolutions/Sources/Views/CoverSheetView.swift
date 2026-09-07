import SwiftUI
import UIKit

struct CoverSheetView: View {
    let project: Project

    @State private var sheetProject: CoverSheetProject?
    @State private var team: [ProjectTeamMember] = []
    @State private var phases: [ProjectPhase] = []
    @State private var permits: [Permit] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    private let statusLabels: [String: String] = [
        "not_started": "Not Started",
        "submitted": "Submitted",
        "in_plan_check": "In Plan Check",
        "corrections": "Corrections Required",
        "approved": "Approved",
        "issued": "Issued",
        "finaled": "Finaled",
    ]

    private let generatedOn: String = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM d, yyyy"
        return formatter.string(from: Date())
    }()

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        header
                        detailsGrid
                        permittingGrid
                        section("Permits") { permitsContent }
                        section("Owner / Client") { ownerContent }
                        section("Project Team") { teamContent }
                        section("Project Phases") { phasesContent }

                        Text("DXE Solutions · Permitting & Project Management · dixie@dxesolutions.com")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.top, 12)
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Cover Sheet")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    printSheet()
                } label: {
                    Image(systemName: "printer")
                }
                .disabled(sheetProject == nil)
            }
        }
        .task { await load() }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Generated \(generatedOn)")
                .font(.caption)
                .foregroundColor(.secondary)
            Text(sheetProject?.name ?? project.name)
                .font(.title2.weight(.semibold))
                .foregroundColor(Theme.navy)
            Text(sheetProject?.address ?? "Address not on file")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }

    private var detailsGrid: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
            field("Project Type", sheetProject?.projectType)
            field("Status", sheetProject?.status.capitalized)
            field("Progress", "\(sheetProject?.progressPct ?? 0)%")
            field("Start Date", sheetProject?.startedOn)
            field("Est. Completion", sheetProject?.estimatedCompletion)
            field("Prepared By", "DXE Solutions")
        }
    }

    private var permittingGrid: some View {
        let columns = [GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
            field("APN / Parcel Number", sheetProject?.apn)
            field("Jurisdiction", sheetProject?.jurisdiction)
            field("Zoning", sheetProject?.zoning)
            field("Lot Size", sheetProject?.lotSize)
            field("Building Size", sheetProject?.buildingSize)
        }
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(Theme.gold)
                .tracking(1)
            content()
        }
    }

    private var permitsContent: some View {
        Group {
            if permits.isEmpty {
                emptyText("No permits on file.")
            } else {
                VStack(spacing: 8) {
                    ForEach(permits) { permit in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(permit.permitType).font(.subheadline.weight(.medium))
                            Text([
                                permit.permitNumber ?? "—",
                                permit.agency ?? "—",
                                statusLabels[permit.status] ?? permit.status,
                            ].joined(separator: " · "))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    private var ownerContent: some View {
        Group {
            if let owner = sheetProject?.profiles {
                let columns = [GridItem(.flexible()), GridItem(.flexible())]
                LazyVGrid(columns: columns, alignment: .leading, spacing: 12) {
                    field("Name", [owner.firstName, owner.lastName].compactMap { $0 }.joined(separator: " "))
                    field("Email", owner.email)
                    field("Phone", owner.phone)
                }
            } else {
                emptyText("No client on file.")
            }
        }
    }

    private var teamContent: some View {
        Group {
            if team.isEmpty {
                emptyText("No team members on file.")
            } else {
                VStack(spacing: 8) {
                    ForEach(team) { member in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(member.trade).font(.subheadline.weight(.medium))
                            Text([member.name, member.phone, member.email].compactMap { $0 }.joined(separator: " · "))
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    private var phasesContent: some View {
        Group {
            if phases.isEmpty {
                emptyText("No phases on file.")
            } else {
                VStack(spacing: 8) {
                    ForEach(phases.sorted(by: { ($0.sortOrder ?? 0) < ($1.sortOrder ?? 0) })) { phase in
                        HStack {
                            Text(phase.name).font(.subheadline)
                            Spacer()
                            Text(phase.state == "na" ? "—" : "\(phase.pct ?? 0)%")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }
        }
    }

    private func emptyText(_ text: String) -> some View {
        Text(text).font(.caption).foregroundColor(.secondary)
    }

    private func field(_ label: String, _ value: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(.secondary)
            Text(value?.isEmpty == false ? value! : "—")
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Data

    private func load() async {
        do {
            let sheetProject: CoverSheetProject = try await SupabaseConfig.client
                .from("projects")
                .select("*, profiles!projects_owner_id_fkey(first_name,last_name,email,phone)")
                .eq("id", value: project.id)
                .single()
                .execute()
                .value
            self.sheetProject = sheetProject
        } catch {
            errorMessage = "Could not load the cover sheet."
            isLoading = false
            return
        }

        async let teamTask: [ProjectTeamMember] = (try? await SupabaseConfig.client
            .from("project_team")
            .select()
            .eq("project_id", value: project.id)
            .order("sort_order", ascending: true)
            .execute().value) ?? []

        async let phasesTask: [ProjectPhase] = (try? await SupabaseConfig.client
            .from("project_phases")
            .select()
            .eq("project_id", value: project.id)
            .order("sort_order", ascending: true)
            .execute().value) ?? []

        async let permitsTask: [Permit] = (try? await SupabaseConfig.client
            .from("permits")
            .select()
            .eq("project_id", value: project.id)
            .order("sort_order", ascending: true)
            .execute().value) ?? []

        team = await teamTask
        phases = await phasesTask
        permits = await permitsTask
        isLoading = false
    }

    // MARK: - Print

    private func printSheet() {
        guard let sheetProject else { return }

        let printController = UIPrintInteractionController.shared
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.outputType = .general
        printInfo.jobName = "\(sheetProject.name) Cover Sheet"
        printController.printInfo = printInfo
        printController.printFormatter = UIMarkupTextPrintFormatter(markupText: html(for: sheetProject))

        guard let windowScene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
            let rootView = windowScene.windows.first(where: { $0.isKeyWindow })?.rootViewController?.view
        else { return }

        if UIDevice.current.userInterfaceIdiom == .pad {
            let anchor = CGRect(x: rootView.bounds.width - 80, y: 0, width: 60, height: 44)
            printController.present(from: anchor, in: rootView, animated: true, completionHandler: nil)
        } else {
            printController.present(animated: true, completionHandler: nil)
        }
    }

    private func html(for sheetProject: CoverSheetProject) -> String {
        func row(_ label: String, _ value: String?) -> String {
            "<tr><td><strong>\(label)</strong></td><td>\(value?.isEmpty == false ? value! : "—")</td></tr>"
        }
        let owner = sheetProject.profiles
        let ownerName = [owner?.firstName, owner?.lastName].compactMap { $0 }.joined(separator: " ")

        var teamRows = team.map { m in
            "<tr><td>\(m.trade)</td><td>\(m.name ?? "—")</td><td>\(m.phone ?? "—")</td><td>\(m.email ?? "—")</td></tr>"
        }.joined()
        if teamRows.isEmpty { teamRows = "<tr><td colspan=4>No team members on file.</td></tr>" }

        var permitRows = permits.map { p in
            "<tr><td>\(p.permitType)</td><td>\(p.permitNumber ?? "—")</td><td>\(p.agency ?? "—")</td><td>\(statusLabels[p.status] ?? p.status)</td></tr>"
        }.joined()
        if permitRows.isEmpty { permitRows = "<tr><td colspan=4>No permits on file.</td></tr>" }

        var phaseRows = phases.map { ph in
            "<tr><td>\(ph.name)</td><td>\(ph.state.capitalized)</td><td>\(ph.state == "na" ? "—" : "\(ph.pct ?? 0)%")</td></tr>"
        }.joined()
        if phaseRows.isEmpty { phaseRows = "<tr><td colspan=3>No phases on file.</td></tr>" }

        return """
        <html><body style="font-family: -apple-system, sans-serif;">
        <h1>\(sheetProject.name)</h1>
        <p>\(sheetProject.address ?? "Address not on file")</p>
        <table>
        \(row("Project Type", sheetProject.projectType))
        \(row("Status", sheetProject.status.capitalized))
        \(row("Progress", "\(sheetProject.progressPct ?? 0)%"))
        \(row("APN", sheetProject.apn))
        \(row("Jurisdiction", sheetProject.jurisdiction))
        </table>
        <h2>Permits</h2>
        <table border="1" cellpadding="6">\(permitRows)</table>
        <h2>Owner / Client</h2>
        <table>\(row("Name", ownerName))\(row("Email", owner?.email))\(row("Phone", owner?.phone))</table>
        <h2>Project Team</h2>
        <table border="1" cellpadding="6">\(teamRows)</table>
        <h2>Project Phases</h2>
        <table border="1" cellpadding="6">\(phaseRows)</table>
        <p style="color:#888; font-size:12px;">DXE Solutions · Permitting &amp; Project Management · dixie@dxesolutions.com</p>
        </body></html>
        """
    }
}
