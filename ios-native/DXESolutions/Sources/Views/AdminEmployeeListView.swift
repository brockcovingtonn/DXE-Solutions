import SwiftUI

private struct EmployeeProfile: Codable, Identifiable, Hashable {
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

private struct EmployeeAssignment: Codable {
    let employeeId: String
    let projects: AdminProjectStatusRef?

    enum CodingKeys: String, CodingKey {
        case employeeId = "employee_id"
        case projects
    }
}

private struct AdminProjectStatusRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let status: String
}

struct AdminEmployeeListView: View {

    @State private var employees: [EmployeeProfile] = []
    @State private var projectsByEmployee: [String: [AdminProjectStatusRef]] = [:]
    @State private var isLoading = true
    @State private var searchText = ""

    private var filteredEmployees: [EmployeeProfile] {
        guard !searchText.isEmpty else { return employees }
        let query = searchText.lowercased()
        return employees.filter { $0.name.lowercased().contains(query) || ($0.email?.lowercased().contains(query) ?? false) }
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if employees.isEmpty {
                Text("No employee accounts yet.").foregroundColor(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List(filteredEmployees) { employee in
                    NavigationLink {
                        AdminEmployeeDetailView(employeeId: employee.id)
                    } label: {
                        row(employee)
                    }
                }
                .listStyle(.plain)
                .searchable(text: $searchText, prompt: "Search employees")
            }
        }
        .navigationTitle("Employees")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink {
                    AdminNewEmployeeView()
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func row(_ employee: EmployeeProfile) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(employee.name).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
            if let email = employee.email {
                Text(email).font(.caption).foregroundColor(.secondary)
            }
            let projects = projectsByEmployee[employee.id] ?? []
            if projects.isEmpty {
                Text("No projects assigned").font(.caption2).foregroundColor(.secondary)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(projects) { project in
                            Text(project.name)
                                .font(.caption2)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Theme.cream)
                                .foregroundColor(Theme.navy)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func load() async {
        async let employeesTask: [EmployeeProfile] = (try? await SupabaseConfig.client
            .from("profiles").select("id,first_name,last_name,email").eq("is_employee", value: true)
            .order("first_name", ascending: true).execute().value) ?? []
        async let assignmentsTask: [EmployeeAssignment] = (try? await SupabaseConfig.client
            .from("project_employees").select("employee_id,projects(id,name,status)")
            .execute().value) ?? []

        employees = await employeesTask

        var grouped: [String: [AdminProjectStatusRef]] = [:]
        for assignment in await assignmentsTask {
            guard let project = assignment.projects else { continue }
            grouped[assignment.employeeId, default: []].append(project)
        }
        projectsByEmployee = grouped
        isLoading = false
    }
}
