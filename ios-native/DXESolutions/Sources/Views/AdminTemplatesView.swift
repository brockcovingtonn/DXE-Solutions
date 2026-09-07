import SwiftUI

private struct SimpleProjectRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

struct AdminTemplatesView: View {
    @State private var templates: [DocumentTemplate] = []
    @State private var allProjects: [SimpleProjectRef] = []
    @State private var isLoading = true
    @State private var message: String?

    // Upload form
    @State private var newName = ""
    @State private var newCategory = ""
    @State private var newDescription = ""
    @State private var showImporter = false
    @State private var isUploading = false

    // Apply state
    @State private var applyingId: String?
    @State private var selectedProjectId: [String: String] = [:]
    @State private var busyId: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                uploadSection
                listSection
            }
            .padding()
        }
        .navigationTitle("Templates")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.item], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                Task { await upload(url) }
            }
        }
    }

    private var uploadSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Add a Template").font(.headline).foregroundColor(Theme.navy)
            TextField("Template name", text: $newName).textFieldStyle(.roundedBorder)
            TextField("Category (optional)", text: $newCategory).textFieldStyle(.roundedBorder)
            TextField("Description (optional)", text: $newDescription, axis: .vertical)
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)

            Button {
                showImporter = true
            } label: {
                if isUploading {
                    ProgressView()
                } else {
                    Label("Choose File & Upload", systemImage: "doc.badge.plus")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isUploading)

            Text("PDF, DOCX, DWG, XLSX — max 50MB")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var listSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("All Templates (\(templates.count))").font(.headline).foregroundColor(Theme.navy)

            if isLoading {
                ProgressView()
            } else if templates.isEmpty {
                Text("No templates yet. Add one above.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(templates) { template in
                    templateRow(template)
                }
            }

            if let message {
                Text(message).font(.caption).foregroundColor(.secondary)
            }
        }
    }

    private func templateRow(_ template: DocumentTemplate) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(template.name).font(.subheadline.weight(.medium))
                    Text([template.category, template.fileName].compactMap { $0 }.joined(separator: " · "))
                        .font(.caption)
                        .foregroundColor(.secondary)
                    if let description = template.description, !description.isEmpty {
                        Text(description).font(.caption2).foregroundColor(.secondary)
                    }
                }
                Spacer()
                Button {
                    applyingId = applyingId == template.id ? nil : template.id
                } label: {
                    Image(systemName: "square.and.arrow.up.on.square")
                }
                if busyId == template.id {
                    ProgressView()
                } else {
                    Button {
                        Task { await delete(template) }
                    } label: {
                        Image(systemName: "trash").foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                }
            }

            if applyingId == template.id {
                HStack {
                    Picker("Project", selection: binding(for: template.id)) {
                        Text("Select a project...").tag("")
                        ForEach(allProjects) { project in
                            Text(project.name).tag(project.id)
                        }
                    }
                    .pickerStyle(.menu)
                    Button("Apply") {
                        Task { await apply(template) }
                    }
                    .disabled(busyId == template.id || (selectedProjectId[template.id] ?? "").isEmpty)
                }
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func binding(for templateId: String) -> Binding<String> {
        Binding(
            get: { selectedProjectId[templateId] ?? "" },
            set: { selectedProjectId[templateId] = $0 }
        )
    }

    // MARK: - Data

    private func load() async {
        async let templatesTask: [DocumentTemplate] = (try? await SupabaseConfig.client
            .from("document_templates").select().order("created_at", ascending: false)
            .execute().value) ?? []
        async let projectsTask: [SimpleProjectRef] = (try? await SupabaseConfig.client
            .from("projects").select("id,name").order("name", ascending: true)
            .execute().value) ?? []
        templates = await templatesTask
        allProjects = await projectsTask
        isLoading = false
    }

    private func upload(_ url: URL) async {
        isUploading = true
        message = nil
        defer { isUploading = false }

        guard url.startAccessingSecurityScopedResource() else {
            message = "Could not access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url) else {
            message = "Could not read the selected file."
            return
        }

        let fileName = url.lastPathComponent
        let filePath = "\(Int(Date().timeIntervalSince1970 * 1000))-\(fileName)"

        do {
            try await SupabaseConfig.client.storage.from("document-templates").upload(filePath, data: data)

            struct Payload: Encodable {
                let name: String
                let description: String?
                let category: String?
                let filePath: String
                let fileName: String
                let fileSize: Int
            }
            let payload = Payload(
                name: newName, description: newDescription.isEmpty ? nil : newDescription,
                category: newCategory.isEmpty ? nil : newCategory,
                filePath: filePath, fileName: fileName, fileSize: data.count
            )
            try await APIClient.send("api/admin/templates", method: "POST", body: payload)
            newName = ""; newCategory = ""; newDescription = ""
            await load()
        } catch {
            message = "Upload failed. Please try again."
        }
    }

    private func delete(_ template: DocumentTemplate) async {
        busyId = template.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/templates/\(template.id)", method: "DELETE", body: EmptyBody())
            templates.removeAll { $0.id == template.id }
        } catch {
            message = "Could not delete template."
        }
    }

    private func apply(_ template: DocumentTemplate) async {
        guard let projectId = selectedProjectId[template.id], !projectId.isEmpty else { return }
        busyId = template.id
        defer { busyId = nil }
        struct Payload: Encodable { let templateId: String; let projectId: String }
        do {
            try await APIClient.send(
                "api/admin/templates/apply", method: "POST",
                body: Payload(templateId: template.id, projectId: projectId)
            )
            message = "Applied — added to the project's Documents."
            applyingId = nil
        } catch {
            message = "Could not apply template."
        }
    }
}
