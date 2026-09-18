import SwiftUI

private struct StaffRef: Decodable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case email
    }

    var name: String {
        let full = [firstName, lastName].compactMap { $0 }.joined(separator: " ").trimmingCharacters(in: .whitespaces)
        return full.isEmpty ? (email ?? "Unnamed") : full
    }
}

// Single-select "By" reassignment for a Design Studio quote — master-only,
// mirrors the dashboard's staff dropdown on web. Reassigning transfers real
// ownership (created_by), not just a display label, so a non-master's
// access to the quote follows the new owner immediately.
struct StaffPickerView: View {
    var onSelect: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var staff: [StaffRef] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(staff) { person in
                        Button {
                            onSelect(person.id, person.name)
                            dismiss()
                        } label: {
                            Text(person.name).foregroundColor(.primary)
                        }
                    }
                    .scrollContentBackground(.hidden)
                    .listRowBackground(Theme.cardBackground)
                }
            }
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Reassign to")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        staff = (try? await SupabaseConfig.client
            .from("profiles")
            .select("id, first_name, last_name, email")
            .or("is_admin.eq.true,is_employee.eq.true")
            .order("first_name", ascending: true)
            .execute()
            .value) ?? []
        isLoading = false
    }
}
