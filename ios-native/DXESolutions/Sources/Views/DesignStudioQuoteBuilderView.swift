import SwiftUI

// Mirrors components/design-studio/QuoteBuilder.js. New quotes are
// presented as a sheet from the list; re-pricing an existing draft is
// reached by pushing this same view with existingQuoteId set (the API
// only allows the reprice PATCH while status is still "draft").
struct DesignStudioQuoteBuilderView: View {
    let existingQuoteId: String?

    @Environment(\.dismiss) private var dismiss
    var onSaved: (() -> Void)?

    @State private var config: DesignStudioConfig?
    @State private var clientName = ""
    @State private var clientEmail = ""
    @State private var clientPhone = ""
    @State private var projectAddress = ""
    @State private var projectType = "adu"
    @State private var serviceLevel = "design"
    @State private var complexity = "standard"
    @State private var areaSqftText = "600"
    @State private var rush = false
    @State private var tradePartner = false
    @State private var addOnQty: [String: String] = [:]
    @State private var manualAdjustmentText = "0"
    @State private var adjustmentNote = ""
    @State private var internalNotes = ""

    @State private var preview: QuotePricing?
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var previewTask: Task<Void, Never>?

    @State private var showScanRoom = false
    @State private var pendingScanId: String?
    @State private var attachedScanLabel: String?

    private var currentInput: DesignStudioQuoteInput {
        var addOns: [String: Double] = [:]
        for key in designStudioAddOnOrder {
            if let v = Double(addOnQty[key] ?? ""), v > 0 { addOns[key] = v }
        }
        return DesignStudioQuoteInput(
            clientName: clientName, clientEmail: clientEmail, clientPhone: clientPhone, projectAddress: projectAddress,
            projectType: projectType, serviceLevel: serviceLevel, complexity: complexity,
            areaSqft: Double(areaSqftText) ?? 0,
            rush: rush, tradePartner: tradePartner, addOns: addOns,
            manualAdjustment: Double(manualAdjustmentText) ?? 0, adjustmentNote: adjustmentNote, internalNotes: internalNotes
        )
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        priceSummary

                        sectionHeader("Client")
                        labeledField("Client name", text: $clientName)
                        labeledField("Email", text: $clientEmail, keyboard: .emailAddress)
                        labeledField("Phone", text: $clientPhone, keyboard: .phonePad)
                        labeledField("Project address", text: $projectAddress)

                        sectionHeader("Project")
                        pickerField("Project type", selection: $projectType, options: designStudioProjectTypeOrder, labels: designStudioProjectTypeLabels)
                        labeledField("Approximate area (sf)", text: $areaSqftText, keyboard: .numberPad)

                        Button {
                            showScanRoom = true
                        } label: {
                            Label("Scan room with LiDAR", systemImage: "viewfinder")
                        }
                        .buttonStyle(.bordered)
                        if let attachedScanLabel {
                            Text(attachedScanLabel).font(.caption2).foregroundColor(.secondary)
                        }

                        pickerField("Service level", selection: $serviceLevel, options: designStudioServiceLevelOrder, labels: designStudioServiceLevelLabels)
                        pickerField("Complexity", selection: $complexity, options: designStudioComplexityOrder, labels: designStudioComplexityLabels)

                        sectionHeader("Add-ons")
                        if let config {
                            ForEach(designStudioAddOnOrder.filter { config.addOns[$0] != nil }, id: \.self) { key in
                                addOnRow(key: key, def: config.addOns[key]!)
                            }
                        }
                        Toggle("Rush delivery (+\(rushPctLabel))", isOn: $rush)
                        Toggle("Trade partner rate (−\(tradePctLabel))", isOn: $tradePartner)

                        sectionHeader("Internal only")
                        Text("Nothing in this section appears on the client proposal.")
                            .font(.caption2).foregroundColor(.secondary)
                        labeledField("Manual adjustment ($)", text: $manualAdjustmentText, keyboard: .numbersAndPunctuation)
                        labeledField("Reason for adjustment", text: $adjustmentNote)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("INTERNAL NOTES").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                            TextEditor(text: $internalNotes).frame(height: 80)
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(.separator)))
                        }

                        if let errorMessage {
                            Text(errorMessage).font(.caption).foregroundColor(.red)
                        }

                        Button {
                            Task { await save() }
                        } label: {
                            if isSaving { ProgressView() } else { Text("Save quote").frame(maxWidth: .infinity) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.navy)
                        .disabled(isSaving)
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(existingQuoteId == nil ? "New Quote" : "Re-price Draft")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if existingQuoteId == nil {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task { await load() }
        .onChange(of: currentInput) { _ in schedulePreview() }
        .sheet(isPresented: $showScanRoom) {
            RoomScanView(quoteId: existingQuoteId) { scan in
                if let area = scan.areaSqft {
                    areaSqftText = String(format: "%.0f", area)
                }
                if existingQuoteId == nil {
                    // Not saved yet — attach once save() has a quote id.
                    pendingScanId = scan.id
                }
                attachedScanLabel = [
                    scan.roomLabel,
                    scan.areaSqft.map { "\(Int($0)) sf" },
                    "scan attached",
                ].compactMap { $0 }.joined(separator: " · ")
            }
        }
    }

    private var rushPctLabel: String { config.map { "\(Int(($0.rushPct * 100).rounded()))%" } ?? "30%" }
    private var tradePctLabel: String { config.map { "\(Int(($0.tradePartnerDiscountPct * 100).rounded()))%" } ?? "15%" }

    private var priceSummary: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading) {
                    Text("TOTAL").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    Text(designStudioCurrency(preview?.total)).font(.title2.weight(.bold)).foregroundColor(Theme.navy)
                }
                Spacer()
                VStack(alignment: .trailing) {
                    Text("DEPOSIT").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    Text(designStudioCurrency(preview?.deposit)).font(.subheadline.weight(.semibold))
                }
            }
            if let internalInfo = preview?.internalInfo {
                Divider()
                HStack {
                    Text("Est. \(Int(internalInfo.estHours))h · \(internalInfo.impliedHourly.map { "$\(Int($0))/hr" } ?? "—")")
                        .font(.caption)
                        .foregroundColor(internalInfo.belowTarget ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
                    Spacer()
                    if internalInfo.minimumApplied {
                        Text("Minimum fee applied").font(.caption2).foregroundColor(.orange)
                    }
                }
            }
        }
        .padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func addOnRow(key: String, def: AddOnDef) -> some View {
        let rate = (serviceLevel == "premium" ? def.premiumRate : nil) ?? def.rate
        return HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(def.label).font(.subheadline)
                Text("\(designStudioCurrency(rate)) / \(def.unit)").font(.caption2).foregroundColor(.secondary)
            }
            Spacer()
            TextField("0", text: Binding(
                get: { addOnQty[key] ?? "" },
                set: { addOnQty[key] = $0 }
            ))
            .keyboardType(.numberPad)
            .multilineTextAlignment(.trailing)
            .frame(width: 50)
            .textFieldStyle(.roundedBorder)
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased()).font(.caption.weight(.bold)).foregroundColor(Theme.navy).padding(.top, 6)
    }

    private func labeledField(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            TextField(label, text: text)
                .keyboardType(keyboard)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func pickerField(_ label: String, selection: Binding<String>, options: [String], labels: [String: String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Picker(label, selection: selection) {
                ForEach(options, id: \.self) { key in
                    Text(labels[key] ?? key).tag(key)
                }
            }
            .pickerStyle(.menu)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func schedulePreview() {
        previewTask?.cancel()
        previewTask = Task {
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }
            do {
                let response: DesignStudioPreviewResponse = try await APIClient.sendDecoding(
                    "api/design-studio/quotes/preview", method: "POST", body: currentInput
                )
                guard !Task.isCancelled else { return }
                preview = response.quote
            } catch {
                // Leave the last good preview on screen; not worth surfacing
                // a transient network blip while the user is still typing.
            }
        }
    }

    private func load() async {
        if let id = existingQuoteId {
            do {
                let response: DesignStudioQuoteResponse = try await APIClient.get("api/design-studio/quotes/\(id)")
                let quote = response.quote
                clientName = quote.clientName ?? ""
                clientEmail = quote.clientEmail ?? ""
                clientPhone = quote.clientPhone ?? ""
                projectAddress = quote.projectAddress ?? ""
                projectType = quote.projectType
                serviceLevel = quote.serviceLevel
                complexity = quote.complexity ?? "standard"
                areaSqftText = String(format: "%g", quote.areaSqft)
                rush = quote.rush ?? false
                tradePartner = quote.tradePartner ?? false
                for (key, value) in quote.addOns ?? [:] where value > 0 {
                    addOnQty[key] = String(format: "%g", value)
                }
                manualAdjustmentText = String(format: "%g", quote.manualAdjustment ?? 0)
                adjustmentNote = quote.adjustmentNote ?? ""
                internalNotes = quote.internalNotes ?? ""
                preview = quote.pricing
            } catch let apiError as APIError {
                errorMessage = apiError.errorDescription
            } catch {
                errorMessage = "Could not load this quote."
            }
        }

        let configResponse: DesignStudioConfigResponse? = try? await APIClient.get("api/design-studio/config")
        config = configResponse?.config
        isLoading = false
        schedulePreview()
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            if let id = existingQuoteId {
                let _: DesignStudioQuoteResponse = try await APIClient.sendDecoding(
                    "api/design-studio/quotes/\(id)", method: "PATCH", body: DesignStudioRepricePayload(reprice: currentInput)
                )
            } else {
                let created: DesignStudioQuoteCreateResponse = try await APIClient.sendDecoding(
                    "api/design-studio/quotes", method: "POST", body: currentInput
                )
                if let scanId = pendingScanId {
                    let _: RoomScanResponse = try await APIClient.sendDecoding(
                        "api/design-studio/scans/\(scanId)", method: "PATCH",
                        body: RoomScanAttachPayload(quoteId: created.quote.id)
                    )
                }
            }
            HapticManager.success()
            onSaved?()
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription ?? "Could not save this quote."
        } catch {
            HapticManager.error()
            errorMessage = "Could not save this quote."
        }
    }
}
