import SwiftUI

private struct CSearchProject: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: String?
}

private struct CSearchContact: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let company: String?
    let trade: String?
    let phone: String?
}

private struct CProjectNameRef: Codable, Hashable {
    let name: String
}

private struct CSearchDocument: Codable, Identifiable, Hashable {
    let id: String
    let fileName: String
    let projectId: String?
    let projects: CProjectNameRef?

    enum CodingKeys: String, CodingKey {
        case id, projects
        case fileName = "file_name"
        case projectId = "project_id"
    }
}

private struct CSearchResults: Codable {
    let projects: [CSearchProject]
    let contacts: [CSearchContact]
    let documents: [CSearchDocument]

    static let empty = CSearchResults(projects: [], contacts: [], documents: [])
}

struct ClientSearchView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    @State private var results = CSearchResults.empty
    @State private var isLoading = false

    private var hasAnyResults: Bool {
        !results.projects.isEmpty || !results.contacts.isEmpty || !results.documents.isEmpty
    }

    var body: some View {
        NavigationStack {
            List {
                if !results.projects.isEmpty {
                    Section("Projects") {
                        ForEach(results.projects) { project in
                            NavigationLink {
                                ClientProjectHandoffView(projectId: project.id)
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

                if !results.documents.isEmpty {
                    Section("Documents") {
                        ForEach(results.documents) { doc in
                            if let projectId = doc.projectId {
                                NavigationLink {
                                    ClientProjectHandoffView(projectId: projectId)
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

                if !results.contacts.isEmpty {
                    Section("Contacts") {
                        ForEach(results.contacts) { contact in
                            VStack(alignment: .leading, spacing: 2) {
                                Text(contact.name)
                                let subtitle = [contact.company, contact.trade, contact.phone].compactMap { $0 }.joined(separator: " · ")
                                if !subtitle.isEmpty {
                                    Text(subtitle).font(.caption).foregroundColor(.secondary)
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
            .searchable(text: $query, prompt: "Your projects, documents, contacts")
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
        if let fresh: CSearchResults = try? await APIClient.get("api/search?q=\(encoded)") {
            results = fresh
        }
    }
}
