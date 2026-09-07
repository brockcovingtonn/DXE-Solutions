import SwiftUI

private struct ClientDetail: Codable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case id, email, phone
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

private struct ClientProjectRow: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let status: String
    let projectType: String?

    enum CodingKeys: String, CodingKey {
        case id, name, status
        case projectType = "project_type"
    }
}

struct AdminClientDetailView: View {
    let clientId: String

    @State private var client: ClientDetail?
    @State private var projects: [ClientProjectRow] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    // Edit form
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var isSaving = false
    @State private var saveMessage: String?

    // New project form
    @State private var newProjectName = ""
    @State private var newAddress = ""
    @State private var newProjectType = ""
    @State private var newStartedOn = ""
    @State private var newEstimatedCompletion = ""
    @State private var isCreatingProject = false
    @State private var projectMessage: String?
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
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        infoSection
                        projectsSection
                        newProjectSection
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(client.map { [$0.firstName, $0.lastName].compactMap { $0 }.joined(separator: " ") } ?? "Client")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .navigationDestination(isPresented: $showCreatedProject) {
            if let createdProjectId {
                AdminProjectDetailView(projectId: createdProjectId)
            }
        }
    }

    private var infoSection: some View {
        sectionCard("Client Details") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    labeledField("First Name", text: $firstName)
                    labeledField("Last Name", text: $lastName)
                }
                labeledField("Email", text: $email, keyboard: .emailAddress)
                labeledField("Phone", text: $phone, keyboard: .phonePad)

                if let saveMessage {
                    Text(saveMessage).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await saveClient() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Save Client") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSaving)
            }
        }
    }

    private var projectsSection: some View {
        sectionCard("Projects") {
            VStack(alignment: .leading, spacing: 8) {
                if projects.isEmpty {
                    Text("No projects yet.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(projects) { project in
                        NavigationLink {
                            AdminProjectDetailView(projectId: project.id)
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name).font(.subheadline.weight(.medium)).foregroundColor(Theme.navy)
                                    if let type = project.projectType {
                                        Text(type).font(.caption2).foregroundColor(.secondary)
                                    }
                                }
                                Spacer()
                                Text(project.status.capitalized).font(.caption2.weight(.semibold)).foregroundColor(Theme.gold)
                            }
                            .padding(10)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private var newProjectSection: some View {
        sectionCard("Add a New Project") {
            VStack(alignment: .leading, spacing: 12) {
                labeledField("Project Name", text: $newProjectName)
                labeledField("Address", text: $newAddress)

                VStack(alignment: .leading, spacing: 4) {
                    Text("PROJECT TYPE").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    Picker("Project Type", selection: $newProjectType) {
                        Text("Select type...").tag("")
                        ForEach(projectTypes, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                labeledField("Start Date (YYYY-MM-DD)", text: $newStartedOn)
                labeledField("Est. Completion (YYYY-MM-DD)", text: $newEstimatedCompletion)

                if let projectMessage {
                    Text(projectMessage).font(.caption).foregroundColor(.red)
                }

                Button {
                    Task { await createProject() }
                } label: {
                    if isCreatingProject { ProgressView() } else { Text("Create Project") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(newProjectName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isCreatingProject)
            }
        }
    }

    // MARK: - Shared UI

    private func sectionCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline).foregroundColor(Theme.navy)
            content()
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func labeledField(_ label: String, text: Binding<String>, keyboard: UIKeyboardType = .default) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            TextField(label, text: text)
                .keyboardType(keyboard)
                .textFieldStyle(.roundedBorder)
        }
    }

    // MARK: - Data

    private func load() async {
        do {
            let client: ClientDetail = try await SupabaseConfig.client
                .from("profiles")
                .select("id,first_name,last_name,email,phone")
                .eq("id", value: clientId)
                .single()
                .execute()
                .value
            self.client = client
            firstName = client.firstName ?? ""
            lastName = client.lastName ?? ""
            email = client.email ?? ""
            phone = client.phone ?? ""
        } catch {
            errorMessage = "Could not load client."
            isLoading = false
            return
        }

        projects = (try? await SupabaseConfig.client
            .from("projects")
            .select("id,name,status,project_type")
            .eq("owner_id", value: clientId)
            .order("created_at", ascending: false)
            .execute().value) ?? []
        isLoading = false
    }

    private func saveClient() async {
        isSaving = true
        saveMessage = nil
        defer { isSaving = false }
        struct Payload: Encodable { let firstName: String; let lastName: String; let email: String; let phone: String }
        do {
            try await APIClient.send(
                "api/admin/clients/\(clientId)", method: "PUT",
                body: Payload(firstName: firstName, lastName: lastName, email: email, phone: phone)
            )
            saveMessage = "Saved."
        } catch {
            saveMessage = "Could not save changes."
        }
    }

    private func createProject() async {
        isCreatingProject = true
        projectMessage = nil
        defer { isCreatingProject = false }
        struct Payload: Encodable {
            let ownerId: String
            let projectName: String
            let address: String?
            let projectType: String?
            let startedOn: String?
            let estimatedCompletion: String?
        }
        struct Response: Decodable { let success: Bool; let projectId: String }
        let payload = Payload(
            ownerId: clientId, projectName: newProjectName,
            address: newAddress.isEmpty ? nil : newAddress,
            projectType: newProjectType.isEmpty ? nil : newProjectType,
            startedOn: newStartedOn.isEmpty ? nil : newStartedOn,
            estimatedCompletion: newEstimatedCompletion.isEmpty ? nil : newEstimatedCompletion
        )
        do {
            let response: Response = try await APIClient.sendDecoding("api/admin/projects", method: "POST", body: payload)
            createdProjectId = response.projectId
            showCreatedProject = true
        } catch {
            projectMessage = "Could not create project."
        }
    }
}
