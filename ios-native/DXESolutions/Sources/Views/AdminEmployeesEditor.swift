import SwiftUI

private struct EmployeeRef: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
    }

    var name: String { [firstName, lastName].compactMap { $0 }.joined(separator: " ") }
}

struct AdminEmployeesEditor: View {
    let projectId: String

    @State private var allEmployees: [EmployeeRef] = []
    @State private var assignedIds: Set<String> = []
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var message: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if isLoading {
                ProgressView()
            } else if allEmployees.isEmpty {
                Text("No employee accounts yet.").font(.subheadline).foregroundColor(.secondary)
            } else {
                ForEach(allEmployees) { employee in
                    Button {
                        if assignedIds.contains(employee.id) {
                            assignedIds.remove(employee.id)
                        } else {
                            assignedIds.insert(employee.id)
                        }
                    } label: {
                        HStack {
                            Image(systemName: assignedIds.contains(employee.id) ? "checkmark.square.fill" : "square")
                                .foregroundColor(assignedIds.contains(employee.id) ? Theme.gold : .secondary)
                            Text(employee.name)
                            Spacer()
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }

                Button {
                    Task { await save() }
                } label: {
                    if isSaving { ProgressView() } else { Text("Save Assignments") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(isSaving)
            }
        }
        .task { await load() }
    }

    private func load() async {
        async let employeesTask: [EmployeeRef] = (try? await SupabaseConfig.client
            .from("profiles").select("id,first_name,last_name").eq("is_employee", value: true)
            .order("first_name", ascending: true).execute().value) ?? []

        struct Assignment: Codable { let employee_id: String }
        async let assignmentsTask: [Assignment] = (try? await SupabaseConfig.client
            .from("project_employees").select("employee_id").eq("project_id", value: projectId)
            .execute().value) ?? []

        allEmployees = await employeesTask
        assignedIds = Set((await assignmentsTask).map { $0.employee_id })
        isLoading = false
    }

    private func save() async {
        isSaving = true
        message = nil
        defer { isSaving = false }
        struct Payload: Encodable { let employeeIds: [String] }
        do {
            try await APIClient.send("api/admin/projects/\(projectId)/employees", method: "PUT", body: Payload(employeeIds: Array(assignedIds)))
            message = "Saved."
        } catch {
            message = "Could not save assignments."
        }
    }
}
