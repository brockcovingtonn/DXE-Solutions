import SwiftUI

struct AdminNewClientView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var password = ""
    @State private var phone = ""

    @State private var projectName = ""
    @State private var address = ""
    @State private var projectType = ""
    @State private var startedOn = ""
    @State private var estimatedCompletion = ""

    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var createdProjectId: String?
    @State private var showCreatedProject = false

    private let projectTypes = [
        "Residential — New Construction",
        "Residential — ADU",
        "Residential — Renovation / Addition",
        "Commercial — New Construction",
        "Commercial — Tenant Improvement",
        "Mixed-Use Development",
        "Permitting",
        "Utilities",
        "Other",
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                sectionHeader("Client Login")
                labeledField("First Name", text: $firstName)
                labeledField("Last Name", text: $lastName)
                labeledField("Email (their login)", text: $email, keyboard: .emailAddress)
                labeledField("Temporary Password", text: $password)
                labeledField("Phone (optional)", text: $phone, keyboard: .phonePad)

                sectionHeader("First Project")
                labeledField("Project Name", text: $projectName)
                labeledField("Address", text: $address)

                VStack(alignment: .leading, spacing: 4) {
                    Text("PROJECT TYPE").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    Picker("Project Type", selection: $projectType) {
                        Text("Select type...").tag("")
                        ForEach(projectTypes, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                labeledField("Start Date (YYYY-MM-DD, optional)", text: $startedOn)
                labeledField("Est. Completion (YYYY-MM-DD, optional)", text: $estimatedCompletion)

                if let errorMessage {
                    Text(errorMessage).font(.caption).foregroundColor(.red)
                }

                Button {
                    Task { await create() }
                } label: {
                    if isCreating { ProgressView() } else { Text("Create Client & Project").frame(maxWidth: .infinity) }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(!isValid || isCreating)
            }
            .padding()
        }
        .navigationTitle("New Client & Project")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showCreatedProject) {
            if let createdProjectId {
                AdminProjectDetailView(projectId: createdProjectId)
            }
        }
    }

    private var isValid: Bool {
        !firstName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !lastName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && password.count >= 6
            && !projectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .foregroundColor(Theme.gold)
            .tracking(1)
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
            let projectName: String
            let address: String?
            let projectType: String?
            let startedOn: String?
            let estimatedCompletion: String?
        }
        struct Response: Decodable { let success: Bool; let projectId: String; let userId: String }

        let payload = Payload(
            firstName: firstName, lastName: lastName, email: email, password: password,
            phone: phone.isEmpty ? nil : phone, projectName: projectName,
            address: address.isEmpty ? nil : address, projectType: projectType.isEmpty ? nil : projectType,
            startedOn: startedOn.isEmpty ? nil : startedOn,
            estimatedCompletion: estimatedCompletion.isEmpty ? nil : estimatedCompletion
        )

        do {
            let response: Response = try await APIClient.sendDecoding("api/admin/clients", method: "POST", body: payload)
            createdProjectId = response.projectId
            showCreatedProject = true
        } catch {
            errorMessage = (error as? APIError)?.errorDescription ?? "Could not create client."
        }
    }
}
