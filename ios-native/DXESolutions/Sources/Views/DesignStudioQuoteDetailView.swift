import SwiftUI

// Mirrors app/design-studio/[id]/page.js + components/design-studio/QuoteActions.js.
struct DesignStudioQuoteDetailView: View {
    let quoteId: String

    @State private var quote: DesignStudioQuote?
    @State private var viewer: DesignStudioViewer?
    @State private var isLoading = true
    @State private var busyAction: String?
    @State private var errorMessage: String?
    @State private var copiedLink = false
    @State private var safariURL: IdentifiableURL?
    @State private var pushToDraftEdit = false
    @State private var pushToDuplicateEdit = false
    @State private var duplicatedQuoteId: String?
    @State private var roomScans: [RoomScan] = []
    @State private var previewItem: PreviewItem?
    @State private var showScanRoom = false
    @State private var scanBusyId: String?
    @State private var pickerScanId: String?
    @State private var showProjectPicker = false
    @State private var annotateScan: RoomScan?
    @State private var showIntakeForm = false

    private var canReprice: Bool { quote?.status == "draft" }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let quote {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        header(quote)
                        actions(quote)
                        if let errorMessage {
                            Text(errorMessage).font(.caption).foregroundColor(.red)
                        }
                        clientSection(quote)
                        scanSection
                        floorPlanSection
                        intakeSection(quote)
                        priceSection(quote)
                        if let internalInfo = quote.pricing?.internalInfo {
                            internalSection(internalInfo)
                        }
                        if let notes = quote.internalNotes, !notes.isEmpty {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("INTERNAL NOTES").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                                Text(notes).font(.caption)
                            }
                        }
                    }
                    .padding()
                }
            } else {
                Text(errorMessage ?? "Quote not found.").foregroundColor(.secondary).padding()
            }
        }
        .navigationTitle(quote?.quoteNumber ?? "Quote")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $pushToDraftEdit) {
            DesignStudioQuoteBuilderView(existingQuoteId: quoteId, onSaved: { Task { await load() } })
        }
        .navigationDestination(isPresented: $pushToDuplicateEdit) {
            DesignStudioQuoteBuilderView(existingQuoteId: duplicatedQuoteId, onSaved: { Task { await load() } })
        }
        .sheet(item: $safariURL) { item in
            SafariView(url: item.url)
        }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url)
        }
        .sheet(isPresented: $showScanRoom) {
            RoomScanView(quoteId: quoteId) { _ in
                Task { await load() }
            }
        }
        .sheet(item: $annotateScan) { scan in
            RoomScanAnnotateView(scan: scan) { _ in
                Task { await load() }
            }
        }
        .sheet(isPresented: $showIntakeForm) {
            if let quote {
                IntakeFormView(quoteId: quoteId, initialAnswers: quote.intake ?? IntakeAnswers()) { updated in
                    self.quote = updated
                }
            }
        }
        .sheet(isPresented: $showProjectPicker) {
            ProjectPickerView(isMaster: viewer?.isMaster ?? false) { project in
                if let id = pickerScanId, let scan = roomScans.first(where: { $0.id == id }) {
                    attachProject(scan, projectId: project.id)
                }
            }
        }
        .task { await load() }
    }

    private func header(_ quote: DesignStudioQuote) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(quote.clientName?.isEmpty == false ? quote.clientName! : "No client name")
                .font(.subheadline).foregroundColor(.secondary)
            HStack {
                Text(designStudioCurrency(quote.total)).font(.title.weight(.bold)).foregroundColor(Theme.navy)
                Spacer()
                Text(quote.status.capitalized)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10).padding(.vertical, 4)
                    .background(Theme.gold.opacity(0.18))
                    .foregroundColor(Theme.navyDark)
                    .clipShape(Capsule())
            }
            Text("Deposit \(designStudioCurrency(quote.deposit))").font(.caption).foregroundColor(.secondary)
        }
    }

    private func actions(_ quote: DesignStudioQuote) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ForEach(nextStatuses(for: quote.status), id: \.self) { status in
                    actionButton(status.capitalized) { await setStatus(status) }
                }
            }
            HStack {
                Button {
                    copyLink(quote)
                } label: {
                    Text(copiedLink ? "Link copied" : "Copy client link").font(.caption)
                }
                .buttonStyle(.bordered)

                Button {
                    openProposal(quote)
                } label: {
                    Text("Open proposal").font(.caption)
                }
                .buttonStyle(.bordered)
            }
            if canReprice {
                Button {
                    pushToDraftEdit = true
                } label: {
                    Text("Re-price draft").frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
            } else {
                Button {
                    Task { await duplicate() }
                } label: {
                    if busyAction == "duplicate" { ProgressView() } else { Text("Duplicate to edit").frame(maxWidth: .infinity) }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(busyAction != nil)
            }
        }
    }

    private func actionButton(_ title: String, action: @escaping () async -> Void) -> some View {
        Button {
            Task { await action() }
        } label: {
            if busyAction == title { ProgressView() } else { Text(title).font(.caption) }
        }
        .buttonStyle(.bordered)
        .disabled(busyAction != nil)
    }

    private func clientSection(_ quote: DesignStudioQuote) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("PROJECT").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Text("\(designStudioProjectTypeLabels[quote.projectType] ?? quote.projectType) — \(designStudioServiceLevelLabels[quote.serviceLevel] ?? quote.serviceLevel)")
                .font(.subheadline.weight(.medium))
            Text("Approx. \(Int(quote.areaSqft)) sf" + (quote.projectAddress?.isEmpty == false ? " · \(quote.projectAddress!)" : ""))
                .font(.caption).foregroundColor(.secondary)
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var scanSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ROOM SCANS").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            ForEach(roomScans) { scan in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 10) {
                        if let urlString = scan.floorPlanUrl, let url = URL(string: urlString) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color(.tertiarySystemFill)
                            }
                            .frame(width: 54, height: 54)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(scan.roomLabel?.isEmpty == false ? scan.roomLabel! : "Scanned space").font(.subheadline)
                            if let area = scan.areaSqft {
                                Text("\(Int(area)) sf\(scan.areaIsEstimate ? " (approx.)" : "") · \(scan.wallCount) walls")
                                    .font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        VStack(spacing: 6) {
                            if let urlString = scan.modelUrl, let url = URL(string: urlString) {
                                Button("View 3D") { previewItem = PreviewItem(url: url) }
                                    .font(.caption)
                                    .buttonStyle(.bordered)
                            }
                            if let urlString = scan.floorPlanUrl, let url = URL(string: urlString) {
                                Button("View 2D") { previewItem = PreviewItem(url: url) }
                                    .font(.caption)
                                    .buttonStyle(.bordered)
                            }
                            if scan.floorPlanUrl != nil {
                                Button("Annotate") { annotateScan = scan }
                                    .font(.caption)
                                    .buttonStyle(.bordered)
                            }
                            if let urlString = scan.annotatedPdfUrl, let url = URL(string: urlString) {
                                Button("View annotation") { previewItem = PreviewItem(url: url) }
                                    .font(.caption)
                                    .buttonStyle(.bordered)
                            }
                        }
                    }

                    Toggle("Show on client proposal", isOn: Binding(
                        get: { scan.showToClient },
                        set: { toggleShowToClient(scan, $0) }
                    ))
                    .font(.caption)
                    .disabled(scanBusyId == scan.id)

                    if let projectName = scan.projectName {
                        HStack {
                            Text("Project: \(projectName)").font(.caption2).foregroundColor(.secondary)
                            Spacer()
                            Button("Remove") { attachProject(scan, projectId: nil) }
                                .font(.caption2)
                                .disabled(scanBusyId == scan.id)
                        }
                    } else {
                        Button("Attach to project") {
                            pickerScanId = scan.id
                            showProjectPicker = true
                        }
                        .font(.caption)
                        .disabled(scanBusyId == scan.id)
                    }
                }
                .padding(8)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            Button {
                showScanRoom = true
            } label: {
                Label(roomScans.isEmpty ? "Scan room with LiDAR" : "Scan another room", systemImage: "viewfinder")
                    .font(.caption)
            }
            .buttonStyle(.bordered)
        }
    }

    private var floorPlanSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("FLOOR PLANS").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            FloorPlanManagerView(quoteId: quoteId)
        }
    }

    private func intakeSection(_ quote: DesignStudioQuote) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("INTAKE").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                Spacer()
                if let submittedAt = quote.intakeSubmittedAt {
                    Text("Received \(shortDate(submittedAt))").font(.caption2).foregroundColor(.secondary)
                } else if let requestedAt = quote.intakeRequestedAt {
                    Text("Requested \(shortDate(requestedAt))").font(.caption2).foregroundColor(.secondary)
                }
            }
            Button {
                showIntakeForm = true
            } label: {
                Text((quote.intake?.hasAnyAnswer ?? false) ? "Edit intake answers" : "Fill out intake form").font(.caption)
            }
            .buttonStyle(.bordered)
        }
    }

    private func shortDate(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: isoString) ?? ISO8601DateFormatter().date(from: isoString) else { return isoString }
        let display = DateFormatter()
        display.dateStyle = .medium
        return display.string(from: date)
    }

    private func toggleShowToClient(_ scan: RoomScan, _ value: Bool) {
        guard let index = roomScans.firstIndex(where: { $0.id == scan.id }) else { return }
        roomScans[index].showToClient = value
        scanBusyId = scan.id
        Task {
            defer { scanBusyId = nil }
            let _: RoomScanResponse? = try? await APIClient.sendDecoding(
                "api/design-studio/scans/\(scan.id)", method: "PATCH", body: RoomScanVisibilityPayload(showToClient: value)
            )
        }
    }

    private func attachProject(_ scan: RoomScan, projectId: String?) {
        guard let index = roomScans.firstIndex(where: { $0.id == scan.id }) else { return }
        scanBusyId = scan.id
        Task {
            defer { scanBusyId = nil }
            do {
                let response: RoomScanResponse = try await APIClient.sendDecoding(
                    "api/design-studio/scans/\(scan.id)", method: "PATCH", body: RoomScanProjectPayload(projectId: projectId)
                )
                roomScans[index] = response.scan
            } catch {
                // Leave as-is; the row remains tappable to retry.
            }
        }
    }

    private func priceSection(_ quote: DesignStudioQuote) -> some View {
        Group {
            if let pricing = quote.pricing {
                VStack(alignment: .leading, spacing: 8) {
                    Text("PRICE BUILD").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    priceRow("Package base", designStudioCurrency(pricing.package.base))
                    priceRow("Size — \(pricing.labels.sizeBand)", designStudioCurrency(pricing.package.sizeBand.amount))
                    priceRow("Complexity — \(pricing.labels.complexity)", designStudioCurrency(pricing.package.complexity.amount))
                    if pricing.rush.applied { priceRow("Rush delivery", "+\(designStudioCurrency(pricing.rush.amount))") }
                    ForEach(pricing.selectedAddOns) { line in
                        priceRow(line.label, designStudioCurrency(line.amount))
                    }
                    if pricing.tradePartner.applied { priceRow("Trade partner discount", "−\(designStudioCurrency(pricing.tradePartner.amount))") }
                    if pricing.adjustment != 0 { priceRow("Manual adjustment", designStudioCurrency(pricing.adjustment)) }
                    Divider()
                    priceRow("Total", designStudioCurrency(pricing.total), bold: true)
                }
                .padding(10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    private func priceRow(_ label: String, _ value: String, bold: Bool = false) -> some View {
        HStack {
            Text(label).font(bold ? .subheadline.weight(.semibold) : .caption)
            Spacer()
            Text(value).font(bold ? .subheadline.weight(.semibold) : .caption)
        }
        .foregroundColor(bold ? Theme.navy : .primary)
    }

    private func internalSection(_ internalInfo: InternalBreakdown) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("MARGIN CHECK").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            priceRow("Est. studio hours", "\(Int(internalInfo.estHours)) hrs")
            HStack {
                Text("Implied rate").font(.caption)
                Spacer()
                Text(internalInfo.impliedHourly.map { "$\(Int($0))/hr" } ?? "—")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(internalInfo.belowTarget ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
            }
            if let perSqft = internalInfo.effectivePerSqft {
                priceRow("Effective $/sf", "$" + String(format: "%.2f", perSqft))
            }
            if internalInfo.belowTarget {
                Text("Below the $\(Int(internalInfo.targetHourly))/hr target.").font(.caption2).foregroundColor(.red)
            }
            if internalInfo.minimumApplied {
                Text("Minimum fee applied.").font(.caption2).foregroundColor(.orange)
            }
        }
        .padding(10)
        .background(Theme.gold.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func nextStatuses(for status: String) -> [String] {
        ["sent", "accepted", "declined"].filter { $0 != status }
    }

    private func copyLink(_ quote: DesignStudioQuote) {
        guard let token = quote.shareToken else { return }
        UIPasteboard.general.string = AppConfig.siteURL.appendingPathComponent("proposal/\(token)").absoluteString
        copiedLink = true
        HapticManager.selection()
        Task {
            try? await Task.sleep(nanoseconds: 2_200_000_000)
            copiedLink = false
        }
    }

    private func openProposal(_ quote: DesignStudioQuote) {
        guard let token = quote.shareToken else { return }
        safariURL = IdentifiableURL(url: AppConfig.siteURL.appendingPathComponent("proposal/\(token)"))
    }

    private func setStatus(_ status: String) async {
        busyAction = status.capitalized
        errorMessage = nil
        defer { busyAction = nil }
        do {
            let _: DesignStudioQuoteResponse = try await APIClient.sendDecoding(
                "api/design-studio/quotes/\(quoteId)", method: "PATCH", body: DesignStudioStatusPayload(status: status)
            )
            HapticManager.success()
            await load()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not update status."
        }
    }

    private func duplicate() async {
        busyAction = "duplicate"
        errorMessage = nil
        defer { busyAction = nil }
        do {
            let response: DesignStudioQuoteCreateResponse = try await APIClient.sendDecoding(
                "api/design-studio/quotes/\(quoteId)/duplicate", method: "POST", body: EmptyBody()
            )
            HapticManager.success()
            duplicatedQuoteId = response.quote.id
            pushToDuplicateEdit = true
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not duplicate this quote."
        }
    }

    private func load() async {
        do {
            let response: DesignStudioQuoteResponse = try await APIClient.get("api/design-studio/quotes/\(quoteId)")
            quote = response.quote
            viewer = response.viewer
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not load this quote."
        }
        let scansResponse: RoomScanListResponse? = try? await APIClient.get("api/design-studio/scans?quoteId=\(quoteId)")
        roomScans = scansResponse?.scans ?? []
        isLoading = false
    }
}
