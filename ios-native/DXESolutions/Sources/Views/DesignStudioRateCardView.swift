import SwiftUI

// Mirrors components/design-studio/RateCardEditor.js. Master admin only —
// enforced server-side by requireMaster() on every route this view calls.
// Saving never overwrites: the API deactivates the current row and inserts
// a new version, so quotes already issued keep the rates they were priced
// on. The web version's "live sample" panel re-prices against unsaved
// edits purely client-side (it imports calculateQuote() directly); that
// engine isn't ported to Swift, so this view skips the live sample rather
// than duplicate ~300 lines of pricing logic that would have to be kept
// in sync by hand.
struct DesignStudioRateCardView: View {
    @State private var config = DesignStudioConfig(
        version: 0, depositPct: 0.5, rushPct: 0.3, tradePartnerDiscountPct: 0.15,
        quoteValidDays: 30, roundTo: 25, complexity: [:], serviceLevels: [:], projectTypes: [:], addOns: [:], targetHourly: 125
    )
    @State private var note = ""
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var statusMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Form {
                    Section("Package starting prices") {
                        ForEach(designStudioProjectTypeOrder, id: \.self) { typeKey in
                            if let type = config.projectTypes[typeKey] {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(type.label).font(.subheadline.weight(.semibold))
                                    ForEach(designStudioServiceLevelOrder, id: \.self) { levelKey in
                                        numberRow(designStudioServiceLevelLabels[levelKey] ?? levelKey,
                                                  doubleBinding({ config.projectTypes[typeKey]?.packages[levelKey] ?? 0 },
                                                                { config.projectTypes[typeKey]?.packages[levelKey] = $0 }))
                                    }
                                    numberRow("Minimum fee",
                                              doubleBinding({ config.projectTypes[typeKey]?.minimumFee ?? 0 },
                                                            { config.projectTypes[typeKey]?.minimumFee = $0 }))
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    }

                    Section {
                        ForEach(designStudioProjectTypeOrder, id: \.self) { typeKey in
                            if let type = config.projectTypes[typeKey] {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(type.label).font(.subheadline.weight(.semibold))
                                    ForEach(Array((config.projectTypes[typeKey]?.sizeBands ?? []).enumerated()), id: \.offset) { index, band in
                                        numberRow(band.label,
                                                  doubleBinding({ config.projectTypes[typeKey]?.sizeBands[index].mult ?? 1 },
                                                                { config.projectTypes[typeKey]?.sizeBands[index].mult = $0 }))
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    } header: {
                        Text("Size band multipliers")
                    } footer: {
                        Text("Square footage moves the price through these bands rather than a per-sf rate.")
                    }

                    Section("Add-on rates") {
                        ForEach(designStudioAddOnOrder.filter { config.addOns[$0] != nil }, id: \.self) { key in
                            VStack(alignment: .leading, spacing: 4) {
                                numberRow(config.addOns[key]?.label ?? key,
                                          doubleBinding({ config.addOns[key]?.rate ?? 0 },
                                                        { config.addOns[key]?.rate = $0 }))
                                if config.addOns[key]?.premiumRate != nil {
                                    numberRow("  Premium level",
                                              doubleBinding({ config.addOns[key]?.premiumRate ?? 0 },
                                                            { config.addOns[key]?.premiumRate = $0 }))
                                }
                            }
                        }
                    }

                    Section {
                        ForEach(designStudioProjectTypeOrder, id: \.self) { typeKey in
                            if let type = config.projectTypes[typeKey] {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(type.label).font(.subheadline.weight(.semibold))
                                    ForEach(designStudioServiceLevelOrder, id: \.self) { levelKey in
                                        numberRow(designStudioServiceLevelLabels[levelKey] ?? levelKey,
                                                  doubleBinding({ config.projectTypes[typeKey]?.estHours[levelKey] ?? 0 },
                                                                { config.projectTypes[typeKey]?.estHours[levelKey] = $0 }))
                                    }
                                }
                                .padding(.vertical, 4)
                            }
                        }
                    } header: {
                        Text("Estimated studio hours")
                    } footer: {
                        Text("Internal only. Drives the margin check on every quote.")
                    }

                    Section("Global settings") {
                        numberRow("Deposit %", doubleBinding({ config.depositPct }, { config.depositPct = $0 }))
                        numberRow("Rush premium %", doubleBinding({ config.rushPct }, { config.rushPct = $0 }))
                        numberRow("Trade partner discount %", doubleBinding({ config.tradePartnerDiscountPct }, { config.tradePartnerDiscountPct = $0 }))
                        numberRow("Quote valid (days)", doubleBinding({ config.quoteValidDays }, { config.quoteValidDays = $0 }))
                        numberRow("Round to nearest $", doubleBinding({ config.roundTo }, { config.roundTo = $0 }))
                        numberRow("Target hourly ($)", doubleBinding({ config.targetHourly }, { config.targetHourly = $0 }))
                        Text("Percentages are stored as decimals — 0.3 means 30%.")
                            .font(.caption2).foregroundColor(.secondary)
                    }

                    Section("Note for this version") {
                        TextField("Optional", text: $note)
                        if let statusMessage {
                            Text(statusMessage).font(.caption).foregroundColor(Color(red: 0.02, green: 0.37, blue: 0.28))
                        }
                        if let errorMessage {
                            Text(errorMessage).font(.caption).foregroundColor(.red)
                        }
                        Button {
                            Task { await save() }
                        } label: {
                            if isSaving { ProgressView() } else { Text("Save as new version").frame(maxWidth: .infinity) }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.navy)
                        .disabled(isSaving)

                        Button(role: .destructive) {
                            Task { await resetDefaults() }
                        } label: {
                            Text("Restore defaults").frame(maxWidth: .infinity)
                        }
                        .disabled(isSaving)
                    }
                }
            }
        }
        .navigationTitle("Rate Card")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func numberRow(_ label: String, _ binding: Binding<String>) -> some View {
        HStack {
            Text(label).font(.caption)
            Spacer()
            TextField("0", text: binding)
                .keyboardType(.numbersAndPunctuation)
                .multilineTextAlignment(.trailing)
                .frame(width: 90)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func doubleBinding(_ get: @escaping () -> Double, _ set: @escaping (Double) -> Void) -> Binding<String> {
        Binding(
            get: { String(format: "%g", get()) },
            set: { newValue in if let v = Double(newValue) { set(v) } }
        )
    }

    private func load() async {
        do {
            let response: DesignStudioConfigResponse = try await APIClient.get("api/design-studio/config")
            config = response.config
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not load the rate card."
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        statusMessage = nil
        defer { isSaving = false }
        do {
            let response: DesignStudioConfigResponse = try await APIClient.sendDecoding(
                "api/design-studio/config", method: "PUT",
                body: DesignStudioConfigSavePayload(config: config, note: note.isEmpty ? nil : note)
            )
            config = response.config
            HapticManager.success()
            statusMessage = "Saved as version \(response.config.version)."
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save the rate card."
        }
    }

    private func resetDefaults() async {
        isSaving = true
        errorMessage = nil
        statusMessage = nil
        defer { isSaving = false }
        do {
            let response: DesignStudioConfigResponse = try await APIClient.sendDecoding(
                "api/design-studio/config", method: "POST", body: EmptyBody()
            )
            config = response.config
            HapticManager.success()
            statusMessage = "Restored shipped defaults as version \(response.config.version)."
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not restore defaults."
        }
    }
}
