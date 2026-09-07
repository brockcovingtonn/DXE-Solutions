import SwiftUI

struct NotesView: View {
    let project: Project
    @EnvironmentObject var auth: AuthManager

    @State private var notes: [Note] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var draft = ""
    @State private var isPosting = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 12) {
                            if notes.isEmpty {
                                EmptyStateView(icon: "note.text", title: "No notes yet", subtitle: "Updates on your project will show up here.")
                            } else {
                                ForEach(notes) { note in
                                    noteCard(note)
                                }
                            }
                        }

                        composer
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Notes & Updates")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadNotes() }
    }

    private func noteCard(_ note: Note) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(note.authorName.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundColor(note.authorRole == "client" ? .secondary : Theme.gold)
                .tracking(0.5)
            Text(note.body)
                .font(.subheadline)
                .foregroundColor(.primary)
            Text(formatDate(note.createdAt))
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(note.authorRole == "client" ? Color.secondary : Theme.gold)
                .frame(width: 3)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var composer: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Add a Note")
                .font(.subheadline.weight(.semibold))
                .foregroundColor(Theme.navy)
            TextEditor(text: $draft)
                .frame(minHeight: 90)
                .padding(6)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            if let errorMessage {
                Text(errorMessage).font(.caption).foregroundColor(.red)
            }
            Button {
                Task { await postNote() }
            } label: {
                if isPosting {
                    ProgressView()
                } else {
                    Text("Post Note")
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(Theme.navy)
            .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPosting)
        }
        .padding(.top, 12)
    }

    private func formatDate(_ dateStr: String) -> String {
        guard let date = parseDate(dateStr) else { return "—" }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy 'at' h:mm a"
        return formatter.string(from: date)
    }

    private func parseDate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }

    private func loadNotes() async {
        do {
            let notes: [Note] = try await SupabaseConfig.client
                .from("notes")
                .select()
                .eq("project_id", value: project.id)
                .order("created_at", ascending: false)
                .execute()
                .value
            self.notes = notes
        } catch {
            errorMessage = "Could not load notes."
        }
        isLoading = false
    }

    private func postNote() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, auth.profile?.id != nil else { return }
        isPosting = true
        errorMessage = nil
        defer { isPosting = false }

        // Routed through the same API route the web app uses so it logs
        // activity and emails/pushes the admin, matching web behavior.
        struct Payload: Encodable {
            let projectId: String
            let text: String
        }
        do {
            try await APIClient.send("api/notes", method: "POST", body: Payload(projectId: project.id, text: text))
            draft = ""
            await loadNotes()
        } catch {
            errorMessage = "Could not post your note. Please try again."
        }
    }
}
