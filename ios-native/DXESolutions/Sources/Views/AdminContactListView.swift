import SwiftUI

struct AdminContactListView: View {
    @State private var contacts: [Contact] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var categoryFilter = ""
    @State private var editMode: EditMode = .inactive
    @State private var selection: Set<String> = []
    @State private var isBulkDeleting = false

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

    private var filteredContacts: [Contact] {
        var result = contacts
        if !categoryFilter.isEmpty {
            result = result.filter { $0.trade == categoryFilter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(query)
                    || ($0.company?.lowercased().contains(query) ?? false)
                    || ($0.email?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if contacts.isEmpty {
                EmptyStateView(icon: "person.crop.circle.badge.questionmark", title: "No contacts yet", subtitle: "Add a contact to build out your directory.")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 0) {
                    Picker("Category", selection: $categoryFilter) {
                        Text("All categories").tag("")
                        ForEach(categories, id: \.self) { Text($0).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal)
                    .padding(.top, 8)
                    .frame(maxWidth: .infinity, alignment: .leading)

                    if editMode == .active && !selection.isEmpty {
                        HStack(spacing: 12) {
                            Text("\(selection.count) selected").font(.caption.weight(.medium))
                            Spacer()
                            Button(role: .destructive) {
                                Task { await bulkDelete() }
                            } label: {
                                Text(isBulkDeleting ? "Working..." : "Delete").font(.caption)
                            }
                            .disabled(isBulkDeleting)
                        }
                        .padding(.horizontal)
                        .padding(.vertical, 8)
                        .background(Color(.secondarySystemBackground))
                    }

                    List(filteredContacts, selection: $selection) { contact in
                        NavigationLink {
                            AdminContactDetailView(contactId: contact.id)
                        } label: {
                            row(contact)
                        }
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search contacts")
                }
            }
        }
        .environment(\.editMode, $editMode)
        .navigationTitle("Contacts")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                EditButton()
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    AdminContactDetailView(contactId: nil)
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func row(_ contact: Contact) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(contact.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            Text([contact.trade, contact.company].compactMap { $0 }.joined(separator: " · "))
                .font(.caption)
                .foregroundColor(.secondary)
            let projectNames = (contact.projectContacts ?? []).compactMap { $0.projects?.name }
            if projectNames.isEmpty {
                Text("Not linked to a project").font(.caption2).foregroundColor(.secondary)
            } else {
                Text(projectNames.joined(separator: ", ")).font(.caption2).foregroundColor(Theme.gold)
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        contacts = (try? await SupabaseConfig.client
            .from("contacts")
            .select("*, project_contacts(project_id,projects(id,name))")
            .order("name", ascending: true)
            .execute().value) ?? []
        isLoading = false
    }

    private func bulkDelete() async {
        isBulkDeleting = true
        defer { isBulkDeleting = false }
        await withTaskGroup(of: Void.self) { group in
            for id in selection {
                group.addTask {
                    try? await APIClient.send("api/admin/contacts/\(id)", method: "DELETE", body: EmptyBody())
                }
            }
        }
        selection = []
        editMode = .inactive
        await load()
    }
}
