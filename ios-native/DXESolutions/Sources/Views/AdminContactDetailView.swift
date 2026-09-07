import SwiftUI

private struct SimpleProjectRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

struct AdminContactDetailView: View {
    let contactId: String?

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var company = ""
    @State private var trade = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var notes = ""

    @State private var allProjects: [SimpleProjectRef] = []
    @State private var selectedProjectIds: Set<String> = []

    @State private var isLoading = true
    @State private var isSaving = false
    @State private var isDeleting = false
    @State private var showDeleteConfirm = false
    @State private var message: String?
    @State private var messageIsError = false

    private let categories = [
        "Owner", "General Contractor", "Architect", "Civil Engineer", "Structural Engineer",
        "Electrical Engineer", "Mechanical Engineer (MEP)", "Plumbing Engineer",
        "Geotechnical / Soils Engineer", "Land Surveyor", "Landscape Architect",
        "Environmental Consultant", "Arborist", "Excavation & Grading Contractor",
        "Demolition Contractor", "Concrete Contractor", "Framing Contractor",
        "Roofing Contractor", "Electrical Contractor", "Plumbing Contractor",
        "HVAC / Mechanical Contractor", "Landscaping Contractor", "Pool Contractor",
        "Solar Contractor", "Utility Company", "Building Department / Plan Checker",
        "Building Inspector", "Fire Department / Fire Marshal", "Title / Escrow Company",
        "Lender / Bank", "Real Estate Agent", "Attorney", "Other",
    ]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack {
                            labeledField("Name", text: $name)
                            labeledField("Company", text: $company)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("CATEGORY").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                            Picker("Category", selection: $trade) {
                                Text("Select...").tag("")
                                ForEach(categories, id: \.self) { Text($0).tag($0) }
                            }
                            .pickerStyle(.menu)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        HStack {
                            labeledField("Phone", text: $phone, keyboard: .phonePad)
                            labeledField("Email", text: $email, keyboard: .emailAddress)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text("NOTES").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                            TextField("Notes", text: $notes, axis: .vertical)
                                .lineLimit(3...6)
                                .textFieldStyle(.roundedBorder)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("LINK TO PROJECTS").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                            if allProjects.isEmpty {
                                Text("No projects yet.").font(.subheadline).foregroundColor(.secondary)
                            } else {
                                ForEach(allProjects) { project in
                                    Button {
                                        if selectedProjectIds.contains(project.id) {
                                            selectedProjectIds.remove(project.id)
                                        } else {
                                            selectedProjectIds.insert(project.id)
                                        }
                                    } label: {
                                        HStack {
                                            Image(systemName: selectedProjectIds.contains(project.id) ? "checkmark.square.fill" : "square")
                                                .foregroundColor(selectedProjectIds.contains(project.id) ? Theme.gold : .secondary)
                                            Text(project.name)
                                            Spacer()
                                        }
                                    }
                                    .buttonStyle(.plain)
                                    .padding(10)
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                            }
                        }

                        if let message {
                            Text(message).font(.caption).foregroundColor(messageIsError ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
                        }

                        HStack {
                            Button {
                                Task { await save() }
                            } label: {
                                if isSaving {
                                    ProgressView()
                                } else {
                                    Text(contactId == nil ? "Create Contact" : "Save Contact")
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Theme.navy)
                            .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSaving)

                            if contactId != nil {
                                Spacer()
                                Button(role: .destructive) {
                                    showDeleteConfirm = true
                                } label: {
                                    if isDeleting { ProgressView() } else { Text("Delete") }
                                }
                                .disabled(isDeleting)
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(contactId == nil ? "New Contact" : "Edit Contact")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .alert("Delete this contact?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) { Task { await delete() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This cannot be undone.")
        }
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
        allProjects = (try? await SupabaseConfig.client
            .from("projects").select("id,name").order("name", ascending: true)
            .execute().value) ?? []

        if let contactId {
            if let contact: Contact = try? await SupabaseConfig.client
                .from("contacts")
                .select("*, project_contacts(project_id,projects(id,name))")
                .eq("id", value: contactId)
                .single()
                .execute().value {
                name = contact.name
                company = contact.company ?? ""
                trade = contact.trade ?? ""
                phone = contact.phone ?? ""
                email = contact.email ?? ""
                notes = contact.notes ?? ""
                selectedProjectIds = Set((contact.projectContacts ?? []).map { $0.projectId })
            }
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        message = nil
        defer { isSaving = false }

        struct Payload: Encodable {
            let name: String
            let company: String?
            let trade: String?
            let phone: String?
            let email: String?
            let notes: String?
            let projectIds: [String]
        }
        let payload = Payload(
            name: name,
            company: company.isEmpty ? nil : company,
            trade: trade.isEmpty ? nil : trade,
            phone: phone.isEmpty ? nil : phone,
            email: email.isEmpty ? nil : email,
            notes: notes.isEmpty ? nil : notes,
            projectIds: Array(selectedProjectIds)
        )

        do {
            if let contactId {
                try await APIClient.send("api/admin/contacts/\(contactId)", method: "PUT", body: payload)
                message = "Saved."
                messageIsError = false
            } else {
                try await APIClient.send("api/admin/contacts", method: "POST", body: payload)
                dismiss()
            }
        } catch {
            message = "Could not save contact."
            messageIsError = true
        }
    }

    private func delete() async {
        guard let contactId else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            try await APIClient.send("api/admin/contacts/\(contactId)", method: "DELETE", body: EmptyBody())
            dismiss()
        } catch {
            message = "Could not delete contact."
            messageIsError = true
        }
    }
}
