import SwiftUI
import Supabase

private struct AssistantTurn: Identifiable {
    let id: Int
    let role: String
    let text: String
}

private struct AssistantRequestBody: Encodable {
    let messages: [AnyJSON]
    let projectId: String?
}

private struct AssistantResponseBody: Decodable {
    let reply: String?
    let messages: [AnyJSON]?
    let error: String?
}

struct AssistantView: View {
    let project: Project?

    @State private var rawMessages: [AnyJSON] = []
    @State private var draft = ""
    @State private var isSending = false
    @State private var errorMessage: String?
    @FocusState private var isDraftFocused: Bool

    init(project: Project? = nil) {
        self.project = project
    }

    private var turns: [AssistantTurn] {
        rawMessages.enumerated().compactMap { index, message in
            guard let obj = message.objectValue,
                  let role = obj["role"]?.stringValue,
                  let content = obj["content"] else { return nil }
            let text = extractText(content)
            guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
            return AssistantTurn(id: index, role: role, text: text)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        if turns.isEmpty {
                            Text("Ask about a project, or how DXE normally handles a step of the workflow.")
                                .font(.footnote)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        }
                        ForEach(turns) { turn in
                            bubble(turn).id(turn.id)
                        }
                        if isSending {
                            HStack {
                                Text("Thinking...")
                                    .font(.footnote)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            .id(-1)
                        }
                    }
                    .padding()
                }
                .onChange(of: rawMessages.count) { _ in
                    withAnimation {
                        proxy.scrollTo(isSending ? -1 : (turns.last?.id ?? -1), anchor: .bottom)
                    }
                }
                .scrollDismissesKeyboard(.immediately)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            HStack(alignment: .bottom, spacing: 8) {
                TextField("Ask the assistant", text: $draft, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
                    .focused($isDraftFocused)
                Button {
                    Task { await send() }
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 30))
                        .foregroundColor(Theme.navy)
                }
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
            }
            .padding()
        }
        .navigationTitle("Assistant")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") {
                    isDraftFocused = false
                }
            }
        }
        .onTapGesture {
            isDraftFocused = false
        }
    }

    private func bubble(_ turn: AssistantTurn) -> some View {
        let isMine = turn.role == "user"
        return HStack {
            if isMine { Spacer(minLength: 40) }
            Text(turn.text)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(isMine ? Theme.navy : Color(.secondarySystemBackground))
                .foregroundColor(isMine ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            if !isMine { Spacer(minLength: 40) }
        }
    }

    private func extractText(_ content: AnyJSON) -> String {
        if let string = content.stringValue { return string }
        if let array = content.arrayValue {
            return array.compactMap { block -> String? in
                guard let obj = block.objectValue, obj["type"]?.stringValue == "text" else { return nil }
                return obj["text"]?.stringValue
            }.joined(separator: "\n")
        }
        return ""
    }

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }
        draft = ""
        errorMessage = nil
        isSending = true
        defer { isSending = false }

        var nextMessages = rawMessages
        nextMessages.append(.object(["role": .string("user"), "content": .string(text)]))
        rawMessages = nextMessages

        guard let session = try? await SupabaseConfig.client.auth.session else {
            errorMessage = "Not signed in."
            return
        }

        do {
            var request = URLRequest(url: AppConfig.assistantChatURL)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            let body = AssistantRequestBody(messages: nextMessages, projectId: project?.id)
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await URLSession.shared.data(for: request)
            let decoded = try? JSONDecoder().decode(AssistantResponseBody.self, from: data)

            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                errorMessage = decoded?.error ?? "Could not reach the assistant."
                return
            }
            if let messages = decoded?.messages {
                rawMessages = messages
            }
        } catch {
            errorMessage = "Could not reach the assistant."
        }
    }
}
