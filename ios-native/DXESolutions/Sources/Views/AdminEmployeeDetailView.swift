import SwiftUI

private struct EmployeeDetail: Codable {
    let id: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case id, email, phone
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

private struct SimpleProject: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let status: String
}

struct AdminEmployeeDetailView: View {
    let employeeId: String

    @Environment(\.dismiss) private var dismiss

    @State private var employee: EmployeeDetail?
    @State private var allProjects: [SimpleProject] = []
    @State private var assignedIds: Set<String> = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    @State private var firstName = ""
    @State private var lastName = ""
    @State private var phone = ""
    @State private var isSaving = false
    @State private var saveMessage: String?

    @State private var isRemoving = false
    @State private var showRemoveConfirm = false
    @State private var removeMessage: String?

    @State private var isSavingAssignments = false
    @State private var assignmentsMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 28) {
                        infoSection
                        assignmentsSection
                    }
                    .padding()
                }
            }
        }
        .navigationTitle(employee.map { [$0.firstName, $0.lastName].compactMap { $0 }.joined(separator: " ") } ?? "Employee")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .alert("Remove this employee's account?", isPresented: $showRemoveConfirm) {
            Button("Remove", role: .destructive) { Task { await removeEmployee() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They will immediately lose access. This cannot be undone.")
        }
    }

    private var infoSection: some View {
        sectionCard("Employee Details") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    labeledField("First Name", text: $firstName)
                    labeledField("Last Name", text: $lastName)
                }
                VStack(alignment: .leading, spacing: 4) {
                    Text("EMAIL").font(.caption2.weight(.semibold)).foregroundColor(.secondary)
                    Text(employee?.email ?? "")
                        .foregroundColor(.secondary)
                        .padding(14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    Text("This is their login email and can't be changed here.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                labeledField("Phone", text: $phone, keyboard: .phonePad)

                if let saveMessage {
                    Text(saveMessage).font(.caption).foregroundColor(.secondary)
                }

                HStack {
                    Button {
                        Task { await saveEmployee() }
                    } label: {
                        if isSaving { ProgressView() } else { Text("Save Employee") }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.navy)
                    .disabled(isSaving)

                    Spacer()

                    Button(role: .destructive) {
                        showRemoveConfirm = true
                    } label: {
                        if isRemoving { ProgressView() } else { Text("Remove Employee") }
                    }
                    .disabled(isRemoving)
                }

                if let removeMessage {
                    Text(removeMessage).font(.caption).foregroundColor(.red)
                }
            }
        }
    }

    private var assignmentsSection: some View {
        sectionCard("Assigned Projects") {
            VStack(alignment: .leading, spacing: 8) {
                if allProjects.isEmpty {
                    Text("No projects exist yet to assign.").font(.subheadline).foregroundColor(.secondary)
                } else {
                    ForEach(allProjects) { project in
                        Button {
                            if assignedIds.contains(project.id) {
                                assignedIds.remove(project.id)
                            } else {
                                assignedIds.insert(project.id)
                            }
                        } label: {
                            HStack {
                                Image(systemName: assignedIds.contains(project.id) ? "checkmark.square.fill" : "square")
                                    .foregroundColor(assignedIds.contains(project.id) ? Theme.gold : .secondary)
                                Text(project.name)
                                Spacer()
                                Text(project.status.capitalized).font(.caption2).foregroundColor(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                        .padding(10)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    if let assignmentsMessage {
                        Text(assignmentsMessage).font(.caption).foregroundColor(.secondary)
                    }

                    Button {
                        Task { await saveAssignments() }
                    } label: {
                        if isSavingAssignments { ProgressView() } else { Text("Save Assignments") }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.navy)
                    .disabled(isSavingAssignments)
                }
            }
        }
    }

    // MARK: - Shared UI

    private func sectionCard<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline).foregroundColor(Theme.navy)
            content()
        }
        .padding()
        .background(Color(.tertiarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
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
        do {
            let employee: EmployeeDetail = try await SupabaseConfig.client
                .from("profiles")
                .select("id,first_name,last_name,email,phone")
                .eq("id", value: employeeId)
                .eq("is_employee", value: true)
                .single()
                .execute()
                .value
            self.employee = employee
            firstName = employee.firstName ?? ""
            lastName = employee.lastName ?? ""
            phone = employee.phone ?? ""
        } catch {
            errorMessage = "Could not load employee."
            isLoading = false
            return
        }

        async let projectsTask: [SimpleProject] = (try? await SupabaseConfig.client
            .from("projects").select("id,name,status")
            .order("created_at", ascending: false).execute().value) ?? []

        struct Assignment: Codable { let project_id: String }
        async let assignmentsTask: [Assignment] = (try? await SupabaseConfig.client
            .from("project_employees").select("project_id").eq("employee_id", value: employeeId)
            .execute().value) ?? []

        allProjects = await projectsTask
        assignedIds = Set((await assignmentsTask).map { $0.project_id })
        isLoading = false
    }

    private func saveEmployee() async {
        isSaving = true
        saveMessage = nil
        defer { isSaving = false }
        struct Payload: Encodable { let firstName: String; let lastName: String; let phone: String }
        do {
            try await APIClient.send(
                "api/admin/employees/\(employeeId)", method: "PUT",
                body: Payload(firstName: firstName, lastName: lastName, phone: phone)
            )
            saveMessage = "Saved."
        } catch {
            saveMessage = "Could not save changes."
        }
    }

    private func removeEmployee() async {
        isRemoving = true
        removeMessage = nil
        defer { isRemoving = false }
        do {
            try await APIClient.send("api/admin/employees/\(employeeId)", method: "DELETE", body: EmptyBody())
            dismiss()
        } catch {
            removeMessage = "Could not remove this employee."
        }
    }

    private func saveAssignments() async {
        isSavingAssignments = true
        assignmentsMessage = nil
        defer { isSavingAssignments = false }
        struct Payload: Encodable { let projectIds: [String] }
        do {
            try await APIClient.send(
                "api/admin/employees/\(employeeId)/projects", method: "PUT",
                body: Payload(projectIds: Array(assignedIds))
            )
            assignmentsMessage = "Saved."
        } catch {
            assignmentsMessage = "Could not save assignments."
        }
    }
}
