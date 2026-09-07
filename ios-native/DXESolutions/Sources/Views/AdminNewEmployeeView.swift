import SwiftUI

struct AdminNewEmployeeView: View {
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""

    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var createdEmployeeId: String?
    @State private var showCreatedEmployee = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                labeledField("First Name", text: $firstName)
                labeledField("Last Name", text: $lastName)
                labeledField("Email (their login)", text: $email, keyboard: .emailAddress)
                labeledField("Temporary Password", text: $password)
                labeledField("Phone (optional)", text: $phone, keyboard: .phonePad)

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                Button {
                    Task { await create() }
                } label: {
                    if isCreating { ProgressView() } else { Text("Create Employee").frame(maxWidth: .infinity) }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(!isValid || isCreating)
            }
            .padding()
        }
        .navigationTitle("New Employee")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showCreatedEmployee) {
            if let createdEmployeeId {
                AdminEmployeeDetailView(employeeId: createdEmployeeId)
            }
        }
    }

    private var isValid: Bool {
        !firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && password.count >= 6
    }

    private func labeledField(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            TextField(label, text: text)
                .keyboardType(keyboard)
                .autocapitalization(keyboard == .emailAddress ? .none : .words)
                .textFieldStyle(.roundedBorder)
        }
    }

    private func create() async {
        isCreating = true
        errorMessage = nil
        defer { isCreating = false }

        struct Payload: Encodable {
            let firstName: String
            let lastName: String
            let email: String
            let password: String
            let phone: String?
        }
        struct Response: Decodable { let success: Bool; let employeeId: String }

        let payload = Payload(
            firstName: firstName, lastName: lastName, email: email, password: password,
            phone: phone.isEmpty ? nil : phone
        )
        do {
            let response: Response = try await APIClient.sendDecoding("api/admin/employees", method: "POST", body: payload)
            createdEmployeeId = response.employeeId
            showCreatedEmployee = true
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? "Could not create employee."
        }
    }
}
