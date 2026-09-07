import SwiftUI

private struct SearchClient: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?

    enum CodingKeys: String, CodingKey {
        case id, email
        case firstName = "first_name"
        case lastName = "last_name"
    }

    var name: String { [firstName, lastName].compactMap { $0 }.joined(separator: " ") }
}

private struct SearchProject: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: String?
}

private struct SearchContact: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let company: String?
    let trade: String?
}

private struct ProjectNameRef: Codable, Hashable {
    let name: String
}

private struct SearchDocument: Codable, Identifiable, Hashable {
    let id: String
    let fileName: String
    let projectId: String?
    let projects: ProjectNameRef?

    enum CodingKeys: String, CodingKey {
        case id, projects
        case fileName = "file_name"
        case projectId = "project_id"
    }
}

private struct SearchResults: Codable {
    let clients: [SearchClient]
    let projects: [SearchProject]
    let contacts: [SearchContact]
    let documents: [SearchDocument]

    static let empty = SearchResults(clients: [], projects: [], contacts: [], documents: [])
}

struct AdminSearchView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    @State private var results = SearchResults.empty
    @State private var isLoading = false

    private var hasAnyResults: Bool {
        !results.clients.isEmpty || !results.projects.isEmpty || !results.contacts.isEmpty || !results.documents.isEmpty
    }

    var body: some View {
        NavigationStack {
            List {
                if !results.clients.isEmpty {
                    Section("Clients") {
                        ForEach(results.clients) { client in
                            NavigationLink {
                                AdminClientDetailView(clientId: client.id)
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(client.name)
                                    if let email = client.email {
                                        Text(email).font(.caption).foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }

                if !results.projects.isEmpty {
                    Section("Projects") {
                        ForEach(results.projects) { project in
                            NavigationLink {
                                AdminProjectDetailView(projectId: project.id)
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(project.name)
                                    if let address = project.address {
                                        Text(address).font(.caption).foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }

                if !results.contacts.isEmpty {
                    Section("Contacts") {
                        ForEach(results.contacts) { contact in
                            NavigationLink {
                                AdminContactDetailView(contactId: contact.id)
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(contact.name)
                                    let subtitle = [contact.company, contact.trade].compactMap { $0 }.joined(separator: " · ")
                                    if !subtitle.isEmpty {
                                        Text(subtitle).font(.caption).foregroundColor(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }

                if !results.documents.isEmpty {
                    Section("Documents") {
                        ForEach(results.documents) { doc in
                            if let projectId = doc.projectId {
                                NavigationLink {
                                    AdminProjectDetailView(projectId: projectId)
                                } label: {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(doc.fileName)
                                        if let projectName = doc.projects?.name {
                                            Text(projectName).font(.caption).foregroundColor(.secondary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if !isLoading && !hasAnyResults && query.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 {
                    Text("No results for \"\(query)\".")
                        .foregroundColor(.secondary)
                }
            }
            .listStyle(.plain)
            .searchable(text: $query, prompt: "Clients, projects, contacts, documents")
            .navigationTitle("Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task(id: query) {
                await search()
            }
        }
    }

    private func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            results = .empty
            return
        }

        try? await Task.sleep(nanoseconds: 250_000_000)
        guard !Task.isCancelled else { return }

        isLoading = true
        defer { isLoading = false }

        guard let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else { return }
        if let fresh: SearchResults = try? await APIClient.get("api/admin/search?q=\(encoded)") {
            results = fresh
        }
    }
}
