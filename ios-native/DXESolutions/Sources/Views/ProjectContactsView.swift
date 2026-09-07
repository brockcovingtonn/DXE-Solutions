import SwiftUI

struct ProjectContactsView: View {
    let project: Project

    @State private var contacts: [Contact] = []
    @State private var isLoading = true
    @State private var searchText = ""
    @State private var categoryFilter = ""

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

    private var availableCategories: [String] {
        categories.filter { category in contacts.contains { $0.trade == category } }
    }

    private var filtered: [Contact] {
        var result = contacts
        if !categoryFilter.isEmpty {
            result = result.filter { $0.trade == categoryFilter }
        }
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter {
                $0.name.lowercased().contains(query) || ($0.company?.lowercased().contains(query) ?? false)
            }
        }
        return result
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if contacts.isEmpty {
                Text("No contacts linked to this project yet.")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 0) {
                    if availableCategories.count > 1 {
                        Picker("Category", selection: $categoryFilter) {
                            Text("All categories").tag("")
                            ForEach(availableCategories, id: \.self) { Text($0).tag($0) }
                        }
                        .pickerStyle(.menu)
                        .padding(.horizontal)
                        .padding(.top, 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    List(filtered) { contact in
                        contactRow(contact)
                    }
                    .listStyle(.plain)
                    .searchable(text: $searchText, prompt: "Search contacts")
                }
            }
        }
        .navigationTitle("Contacts")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func contactRow(_ contact: Contact) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(contact.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            if let trade = contact.trade {
                Text([trade, contact.company].compactMap { $0 }.joined(separator: " · "))
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else if let company = contact.company {
                Text(company).font(.caption).foregroundColor(.secondary)
            }
            HStack(spacing: 12) {
                if let phone = contact.phone, !phone.isEmpty {
                    Link(phone, destination: URL(string: "tel:\(phone.filter { $0.isNumber })") ?? URL(string: "tel:")!)
                }
                if let email = contact.email, !email.isEmpty {
                    Link(email, destination: URL(string: "mailto:\(email)") ?? URL(string: "mailto:")!)
                }
            }
            .font(.caption2)
            .foregroundColor(Theme.gold)
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        struct Link: Codable { let contact_id: String; let contacts: Contact? }
        let links: [Link] = (try? await SupabaseConfig.client
            .from("project_contacts")
            .select("contact_id, contacts(*)")
            .eq("project_id", value: project.id)
            .execute().value) ?? []
        contacts = links.compactMap { $0.contacts }
        isLoading = false
    }
}
