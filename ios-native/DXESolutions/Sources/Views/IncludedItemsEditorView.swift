import SwiftUI

// Mirrors components/design-studio/IncludedItemsEditor.js — edits ONE
// quote's "what is included" bullet list. Only this quote's proposal is
// affected; the service level's defaults elsewhere are untouched.
// Native gets reordering for free via List/.onMove, no custom UI needed.
struct IncludedItemsEditorView: View {
    let levelLabel: String
    let defaultBullets: [String]
    let initialBullets: [String]?
    var onSave: ([String]?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var bullets: [String]

    init(levelLabel: String, defaultBullets: [String], initialBullets: [String]?, onSave: @escaping ([String]?) -> Void) {
        self.levelLabel = levelLabel
        self.defaultBullets = defaultBullets
        self.initialBullets = initialBullets
        self.onSave = onSave
        _bullets = State(initialValue: (initialBullets?.isEmpty == false) ? initialBullets! : defaultBullets)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(Array(bullets.enumerated()), id: \.offset) { index, _ in
                        TextField("Line item", text: Binding(
                            get: { bullets[index] },
                            set: { bullets[index] = $0 }
                        ))
                    }
                    .onMove { source, destination in
                        bullets.move(fromOffsets: source, toOffset: destination)
                    }
                    .onDelete { offsets in
                        bullets.remove(atOffsets: offsets)
                    }
                } footer: {
                    Text("Only this quote's proposal is affected — the \(levelLabel) package everywhere else is unchanged.")
                }

                Section {
                    Button {
                        bullets.append("")
                    } label: {
                        Label("Add line", systemImage: "plus")
                    }
                    Button("Reset to default") {
                        bullets = defaultBullets
                    }
                }
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Edit line items")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    EditButton()
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let cleaned = bullets.map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
                        onSave(cleaned.isEmpty ? nil : cleaned)
                        dismiss()
                    }
                }
            }
        }
    }
}
