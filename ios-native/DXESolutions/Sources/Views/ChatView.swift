import SwiftUI
import Supabase

struct ChatView: View {
    @EnvironmentObject var auth: AuthManager

    @State private var messages: [ChatMessage] = []
    @State private var roster: [RosterMember] = []
    @State private var onlineIds: Set<String> = []
    @State private var reads: [String: Date] = [:]
    @State private var draft = ""
    @State private var isLoading = true
    @State private var isSending = false
    @State private var errorMessage: String?

    @State private var messagesChannel: RealtimeChannelV2?
    @State private var readsChannel: RealtimeChannelV2?
    @State private var presenceChannel: RealtimeChannelV2?
    @State private var listenTasks: [Task<Void, Never>] = []

    private var userId: String { auth.profile?.id ?? "" }

    private var others: [RosterMember] {
        roster.filter { $0.id != auth.profile?.id }
    }

    private var lastMine: ChatMessage? {
        messages.last(where: { $0.senderId == auth.profile?.id })
    }

    private var readByOther: Bool {
        guard let lastMine, let createdAt = parseDate(lastMine.createdAt) else { return false }
        return others.contains { other in
            guard let readAt = reads[other.id] else { return false }
            return readAt >= createdAt
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if !others.isEmpty {
                rosterStrip
            }

            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            ForEach(messages) { message in
                                let isMine = message.senderId == auth.profile?.id
                                MessageBubble(
                                    message: message,
                                    isMine: isMine,
                                    showReadReceipt: isMine && message.id == lastMine?.id,
                                    readByOther: readByOther
                                )
                                .id(message.id)
                            }
                        }
                        .padding()
                    }
                    .onChange(of: messages.count) { _ in
                        if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                        Task { await markAsRead() }
                    }
                }
            }

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.red)
                    .padding(.horizontal)
            }

            HStack(alignment: .bottom, spacing: 8) {
                TextField("Message", text: $draft, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
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
        .navigationTitle("Chat with DXE Solutions")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadRoster()
            await loadMessages()
            await loadReads()
            await markAsRead()
            await subscribeToMessages()
            await subscribeToReads()
            await setupPresence()
        }
        .onDisappear {
            for task in listenTasks { task.cancel() }
            listenTasks = []
            Task {
                await messagesChannel?.unsubscribe()
                await readsChannel?.unsubscribe()
                await presenceChannel?.unsubscribe()
            }
        }
    }

    private var rosterStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(others) { member in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(onlineIds.contains(member.id) ? Color.green : Color.gray.opacity(0.4))
                            .frame(width: 8, height: 8)
                        Text(member.name)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
        .background(Color(.secondarySystemBackground))
    }

    // MARK: - Data loading

    private func loadRoster() async {
        guard let admins: [Profile] = try? await SupabaseConfig.client
            .from("profiles")
            .select()
            .eq("is_admin", value: true)
            .execute().value else { return }
        roster = admins.map { RosterMember(id: $0.id, name: fullName($0), role: "admin") }
    }

    private func loadMessages() async {
        do {
            let messages: [ChatMessage] = try await SupabaseConfig.client
                .from("messages")
                .select()
                .is("project_id", value: nil)
                .eq("dm_user_id", value: userId)
                .order("created_at", ascending: true)
                .execute()
                .value
            self.messages = messages
        } catch {
            errorMessage = "Could not load messages."
        }
        isLoading = false
    }

    private func loadReads() async {
        guard let rows: [MessageRead] = try? await SupabaseConfig.client
            .from("message_reads")
            .select()
            .eq("dm_user_id", value: userId)
            .execute().value else { return }
        var map: [String: Date] = [:]
        for row in rows {
            if let date = parseDate(row.lastReadAt) { map[row.userId] = date }
        }
        reads = map
    }

    private func markAsRead() async {
        guard !userId.isEmpty, !messages.isEmpty else { return }
        let now = ISO8601DateFormatter().string(from: Date())
        struct ReadUpsert: Encodable {
            let dm_user_id: String
            let user_id: String
            let last_read_at: String
        }
        let payload = ReadUpsert(dm_user_id: userId, user_id: userId, last_read_at: now)
        _ = try? await SupabaseConfig.client.from("message_reads").upsert(payload).execute()
        if let date = parseDate(now) { reads[userId] = date }
    }

    // MARK: - Realtime

    private func subscribeToMessages() async {
        let channel = SupabaseConfig.client.channel("messages-dm-\(userId)")
        let insertions = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "messages",
            filter: "dm_user_id=eq.\(userId)"
        )
        messagesChannel = channel
        await channel.subscribe()

        let task = Task {
            for await insertion in insertions {
                if let message = try? insertion.decodeRecord(as: ChatMessage.self, decoder: JSONDecoder()) {
                    if !messages.contains(where: { $0.id == message.id }) {
                        messages.append(message)
                    }
                }
            }
        }
        listenTasks.append(task)
    }

    private func subscribeToReads() async {
        let channel = SupabaseConfig.client.channel("reads-dm-\(userId)")
        let inserts = channel.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "message_reads",
            filter: "dm_user_id=eq.\(userId)"
        )
        let updates = channel.postgresChange(
            UpdateAction.self,
            schema: "public",
            table: "message_reads",
            filter: "dm_user_id=eq.\(userId)"
        )
        readsChannel = channel
        await channel.subscribe()

        let insertTask = Task {
            for await action in inserts {
                if let record = try? action.decodeRecord(as: MessageRead.self, decoder: JSONDecoder()),
                   let date = parseDate(record.lastReadAt) {
                    reads[record.userId] = date
                }
            }
        }
        let updateTask = Task {
            for await action in updates {
                if let record = try? action.decodeRecord(as: MessageRead.self, decoder: JSONDecoder()),
                   let date = parseDate(record.lastReadAt) {
                    reads[record.userId] = date
                }
            }
        }
        listenTasks.append(insertTask)
        listenTasks.append(updateTask)
    }

    private func setupPresence() async {
        guard !userId.isEmpty else { return }
        let channel = SupabaseConfig.client.channel("messages:dm:\(userId)") { config in
            config.presence.key = userId
        }
        let presenceChanges = channel.presenceChange()
        presenceChannel = channel

        let task = Task {
            for await change in presenceChanges {
                for join in change.joins { onlineIds.insert(join.key) }
                for leave in change.leaves { onlineIds.remove(leave.key) }
            }
        }
        listenTasks.append(task)

        await channel.subscribe()
        try? await channel.track(["online_at": ISO8601DateFormatter().string(from: Date())])
    }

    // MARK: - Sending

    private func send() async {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !userId.isEmpty else { return }
        draft = ""
        isSending = true
        defer { isSending = false }

        // Routed through the same API route the web app uses (rather than
        // inserting directly) so the server can push-notify the other side
        // and correctly derive sender_role from the caller's real profile
        // — a native-only direct insert had been hardcoding "client" even
        // for employee/admin senders.
        struct Payload: Encodable {
            let dmUserId: String
            let text: String
        }
        do {
            try await APIClient.send("api/messages", method: "POST", body: Payload(dmUserId: userId, text: text))
        } catch {
            errorMessage = "Could not send message."
        }
    }

    // MARK: - Helpers

    private func fullName(_ profile: Profile?) -> String {
        [profile?.firstName, profile?.lastName].compactMap { $0 }.joined(separator: " ")
    }

    private func parseDate(_ string: String) -> Date? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso.date(from: string) { return date }
        iso.formatOptions = [.withInternetDateTime]
        return iso.date(from: string)
    }
}

private struct MessageBubble: View {
    let message: ChatMessage
    let isMine: Bool
    let showReadReceipt: Bool
    let readByOther: Bool

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 40) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 2) {
                Text(isMine ? "You" : message.senderName)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)
                Text(message.body)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(isMine ? Theme.navy : Color(.secondarySystemBackground))
                    .foregroundColor(isMine ? .white : .primary)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                if showReadReceipt {
                    Text(readByOther ? "✓✓ Read" : "✓ Sent")
                        .font(.caption2)
                        .foregroundColor(readByOther ? Theme.gold : .secondary)
                }
            }
            if !isMine { Spacer(minLength: 40) }
        }
    }
}
