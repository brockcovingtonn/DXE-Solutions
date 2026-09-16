import SwiftUI

// Attaches a room scan to a real DXE project — not the design-studio quote
// it may already belong to, but the client's actual project record, so the
// wider team working that project can reference the scan too.
struct ProjectPickerView: View {
    var isMaster: Bool
    var onSelect: (DesignStudioProject) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [DesignStudioProject] = []
    @State private var searchTask: Task<Void, Never>?
    @State private var showNewProject = false

    var body: some View {
        NavigationStack {
            List {
                if isMaster {
                    Button {
                        showNewProject = true
                    } label: {
                        Label("New project", systemImage: "plus.circle")
                    }
                }
                ForEach(results) { project in
                    Button {
                        onSelect(project)
                        dismiss()
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(project.name).foregroundColor(.primary)
                            if let owner = project.ownerName {
                                Text(owner).font(.caption).foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            .searchable(text: $query, prompt: "Search projects")
            .onChange(of: query) { _ in scheduleSearch() }
            .task { await search() }
            .navigationTitle("Attach to Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showNewProject) {
                NewProjectView { project in
                    onSelect(project)
                    dismiss()
                }
            }
        }
    }

    private func scheduleSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            await search()
        }
    }

    private func search() async {
        let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let response: DesignStudioProjectListResponse = try? await APIClient.get("api/design-studio/projects?q=\(encoded)") {
            results = response.projects
        }
    }
}

// Master-only, matching api/admin/projects' own gate: creating a project
// requires an existing client to own it.
struct NewProjectView: View {
    var onCreated: (DesignStudioProject) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var clients: [DesignStudioClient] = []
    @State private var selectedClient: DesignStudioClient?
    @State private var projectName = ""
    @State private var address = ""
    @State private var isCreating = false
    @State private var errorMessage: String?
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            Form {
                Section("Client") {
                    if let selectedClient {
                        HStack {
                            Text(selectedClient.name)
                            Spacer()
                            Button("Change") { self.selectedClient = nil }
                        }
                    } else {
                        TextField("Search clients", text: $query)
                            .onChange(of: query) { _ in scheduleSearch() }
                        ForEach(clients) { client in
                            Button {
                                selectedClient = client
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(client.name).foregroundColor(.primary)
                                    if let email = client.email {
                                        Text(email).font(.caption).foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
                Section("Project") {
                    TextField("Project name", text: $projectName)
                    TextField("Address (optional)", text: $address)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.caption)
                }
            }
            .navigationTitle("New Project")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isCreating ? "Creating…" : "Create") {
                        Task { await create() }
                    }
                    .disabled(isCreating || selectedClient == nil || projectName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func scheduleSearch() {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            if let response: DesignStudioClientListResponse = try? await APIClient.get("api/design-studio/clients?q=\(encoded)") {
                clients = response.clients
            }
        }
    }

    private func create() async {
        guard let selectedClient else { return }
        isCreating = true
        errorMessage = nil
        defer { isCreating = false }
        do {
            let response: DesignStudioNewProjectResponse = try await APIClient.sendDecoding(
                "api/admin/projects", method: "POST",
                body: DesignStudioNewProjectPayload(
                    ownerId: selectedClient.id, projectName: projectName,
                    address: address.isEmpty ? nil : address
                )
            )
            onCreated(DesignStudioProject(id: response.projectId, name: projectName, address: address.isEmpty ? nil : address, ownerName: selectedClient.name))
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not create project."
        }
    }
}
