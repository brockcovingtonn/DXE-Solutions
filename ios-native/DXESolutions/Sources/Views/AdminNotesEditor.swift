import SwiftUI

struct AdminNotesEditor: View {
    let projectId: String

    @State private var notes: [Note] = []
    @State private var isLoading = true
    @State private var message: String?
    @State private var busyId: String?
    @State private var draft = ""
    @State private var isPosting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                ForEach(notes) { note in
                    HStack(alignment: .top, spacing: 10) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(note.authorName.uppercased())
                                .font(.caption2.weight(.semibold))
                                .foregroundColor(note.authorRole == "client" ? .secondary : Theme.gold)
                            Text(note.body).font(.subheadline)
                        }
                        Spacer()
                        if busyId == note.id {
                            ProgressView()
                        } else {
                            Button {
                                Task { await delete(note) }
                            } label: {
                                Image(systemName: "trash").foregroundColor(.red)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(10)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Divider()

                TextField("Write a note...", text: $draft, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(2...5)
                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
                Button {
                    Task { await post() }
                } label: {
                    if isPosting { ProgressView() } else { Text("Post Note") }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.navy)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPosting)
            }
        }
        .task { await load() }
    }

    private func load() async {
        notes = (try? await SupabaseConfig.client
            .from("notes").select().eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        isLoading = false
    }

    private func delete(_ note: Note) async {
        busyId = note.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/notes/\(note.id)", method: "DELETE", body: EmptyBody())
            notes.removeAll { $0.id == note.id }
        } catch {
            message = "Could not delete note."
        }
    }

    private func post() async {
        isPosting = true
        message = nil
        defer { isPosting = false }
        struct Payload: Encodable { let projectId: String; let text: String }
        do {
            try await APIClient.send("api/admin/notes", method: "POST", body: Payload(projectId: projectId, text: draft))
            draft = ""
            await load()
        } catch {
            message = "Could not post note."
        }
    }
}
