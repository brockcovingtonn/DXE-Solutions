import SwiftUI

// Search-and-select (or create) the real client account a Design Studio
// quote belongs to. Mirrors ProjectPickerView's search pattern; "New
// client" creates an account only (api/design-studio/clients), no project.
struct ClientPickerView: View {
    var onSelect: (DesignStudioClient) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [DesignStudioClient] = []
    @State private var searchTask: Task<Void, Never>?
    @State private var showNewClient = false

    var body: some View {
        NavigationStack {
            List {
                Button {
                    showNewClient = true
                } label: {
                    Label("New client", systemImage: "plus.circle")
                }
                ForEach(results) { client in
                    Button {
                        onSelect(client)
                        dismiss()
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
            .searchable(text: $query, prompt: "Search clients")
            .onChange(of: query) { _ in scheduleSearch() }
            .navigationTitle("Select Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showNewClient) {
                NewClientView { client in
                    onSelect(client)
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
        if let response: DesignStudioClientListResponse = try? await APIClient.get("api/design-studio/clients?q=\(encoded)") {
            results = response.clients
        }
    }
}

struct NewClientView: View {
    var onCreated: (DesignStudioClient) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Client") {
                    TextField("First name", text: $firstName)
                    TextField("Last name", text: $lastName)
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    TextField("Phone (optional)", text: $phone)
                        .keyboardType(.phonePad)
                }
                if let errorMessage {
                    Text(errorMessage).foregroundColor(.red).font(.caption)
                }
            }
            .navigationTitle("New Client")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isCreating ? "Creating…" : "Create") {
                        Task { await create() }
                    }
                    .disabled(isCreating || firstName.trimmingCharacters(in: .whitespaces).isEmpty || email.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private func create() async {
        isCreating = true
        errorMessage = nil
        defer { isCreating = false }
        do {
            let response: DesignStudioClientCreateResponse = try await APIClient.sendDecoding(
                "api/design-studio/clients", method: "POST",
                body: DesignStudioClientCreatePayload(firstName: firstName, lastName: lastName, email: email, phone: phone)
            )
            onCreated(response.client)
            dismiss()
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not create this client."
        }
    }
}
