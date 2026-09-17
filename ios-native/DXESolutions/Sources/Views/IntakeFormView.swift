import SwiftUI

// Staff-fill version of the Design Studio intake form — same fields as the
// client-facing public /intake/[token] page (web-only; the client never
// authenticates so there's no native counterpart for their side), used
// here when staff take the answers down themselves, e.g. over the phone.
// Mirrors components/design-studio/IntakeForm.js's field list exactly.
struct IntakeFormView: View {
    let quoteId: String
    var onSaved: (DesignStudioQuote) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var answers: IntakeAnswers
    @State private var isSaving = false
    @State private var errorMessage: String?

    private static let budgetOptions = ["Under $10k", "$10k–$25k", "$25k–$50k", "$50k–$100k", "$100k+", "Not sure yet"]
    private static let styleOptions = ["Modern", "Traditional", "Transitional", "Minimalist", "Industrial", "Coastal", "Farmhouse", "Eclectic", "Other"]

    init(quoteId: String, initialAnswers: IntakeAnswers, onSaved: @escaping (DesignStudioQuote) -> Void) {
        self.quoteId = quoteId
        self.onSaved = onSaved
        _answers = State(initialValue: initialAnswers)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Project vision / goals") {
                    TextEditor(text: $answers.vision).frame(height: 70)
                }
                Section("Rooms or areas involved") {
                    TextField("e.g. Kitchen, primary bath", text: $answers.rooms)
                }
                Section("Desired timeline / target start date") {
                    TextField("e.g. Start in 2 months", text: $answers.timeline)
                }
                Section("Budget range") {
                    Picker("Budget range", selection: $answers.budget) {
                        Text("Select…").tag("")
                        ForEach(Self.budgetOptions, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .labelsHidden()
                }
                Section("Style preferences") {
                    styleChips
                }
                Section("Inspiration links / notes") {
                    TextEditor(text: $answers.inspiration).frame(height: 60)
                }
                Section("Existing furniture or items to keep") {
                    TextEditor(text: $answers.keep).frame(height: 60)
                }
                Section("Anything to avoid or dislikes") {
                    TextEditor(text: $answers.avoid).frame(height: 60)
                }
                Section("Anticipated structural changes") {
                    TextEditor(text: $answers.structural).frame(height: 60)
                }
                Section("Pets or children to plan around") {
                    TextField("Optional", text: $answers.household)
                }
                Section("Best way / time to reach you") {
                    TextField("Optional", text: $answers.contact)
                }
                Section("Additional notes") {
                    TextEditor(text: $answers.notes).frame(height: 60)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.caption)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.screenBackground.ignoresSafeArea())
            .listRowBackground(Theme.cardBackground)
            .navigationTitle("Intake Form")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") {
                        Task { await save() }
                    }
                    .disabled(isSaving)
                }
            }
        }
    }

    private var styleChips: some View {
        FlowLayoutChips(options: Self.styleOptions, selected: answers.style) { option in
            if let index = answers.style.firstIndex(of: option) {
                answers.style.remove(at: index)
            } else {
                answers.style.append(option)
            }
        }
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let response: DesignStudioQuoteResponse = try await APIClient.sendDecoding(
                "api/design-studio/quotes/\(quoteId)", method: "PATCH", body: DesignStudioIntakeSavePayload(intake: answers)
            )
            HapticManager.success()
            onSaved(response.quote)
            dismiss()
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save the intake form."
        }
    }
}

// Simple wrapping chip toggle list — SwiftUI has no built-in flow layout
// pre-iOS 16's Layout protocol, and this app's deployment target is 16, so
// a plain wrapping HStack-in-VStack is enough rather than pulling in Layout.
private struct FlowLayoutChips: View {
    let options: [String]
    let selected: [String]
    let onToggle: (String) -> Void

    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], alignment: .leading, spacing: 8) {
            ForEach(options, id: \.self) { option in
                let isSelected = selected.contains(option)
                Button {
                    onToggle(option)
                } label: {
                    Text(option)
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(isSelected ? Theme.navy : Theme.cardBackground)
                        .foregroundColor(isSelected ? .white : .primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
