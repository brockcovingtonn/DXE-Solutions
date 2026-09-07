import SwiftUI
import Supabase
import PhotosUI
import UniformTypeIdentifiers

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

    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showCamera = false
    @State private var showImporter = false
    @State private var attachmentURLs: [String: URL] = [:]
    @State private var previewItem: PreviewItem?

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
                                    readByOther: readByOther,
                                    attachmentURL: message.attachmentPath.flatMap { _ in attachmentURLs[message.id] },
                                    onTapAttachment: { Task { await openAttachment(message) } }
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
                        Task {
                            await markAsRead()
                            await loadAttachmentURLs()
                        }
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
                Menu {
                    PhotosPicker(selection: $pickerItems, matching: .images) {
                        Label("Photo Library", systemImage: "photo")
                    }
                    if UIImagePickerController.isCameraAvailable {
                        Button {
                            showCamera = true
                        } label: {
                            Label("Take Photo", systemImage: "camera")
                        }
                    }
                    Button {
                        showImporter = true
                    } label: {
                        Label("Choose File", systemImage: "doc")
                    }
                } label: {
                    Image(systemName: "paperclip")
                        .font(.system(size: 20))
                        .foregroundColor(Theme.navy)
                        .padding(.bottom, 6)
                }
                .disabled(isSending)

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
            await loadAttachmentURLs()
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
        .onChange(of: pickerItems) { newItems in
            guard let item = newItems.first else { return }
            pickerItems = []
            Task {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    await sendAttachment(data: data, fileName: "\(Int(Date().timeIntervalSince1970 * 1000)).jpg", fileType: "image/jpeg")
                }
            }
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraCapture(
                onCapture: { data in
                    showCamera = false
                    Task { await sendAttachment(data: data, fileName: "\(Int(Date().timeIntervalSince1970 * 1000)).jpg", fileType: "image/jpeg") }
                },
                onCancel: { showCamera = false }
            )
            .ignoresSafeArea()
        }
        .fileImporter(isPresented: $showImporter, allowedContentTypes: [.item], allowsMultipleSelection: false) { result in
            if case .success(let urls) = result, let url = urls.first {
                Task { await sendPickedFile(url) }
            }
        }
        .sheet(item: $previewItem) { item in
            QuickLookPreview(url: item.url).ignoresSafeArea()
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
        HapticManager.impact(.light)

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

    private func sendAttachment(data: Data, fileName: String, fileType: String) async {
        guard !userId.isEmpty else { return }
        isSending = true
        defer { isSending = false }

        let filePath = "dm/\(userId)/\(Int(Date().timeIntervalSince1970 * 1000))-\(fileName)"

        do {
            try await SupabaseConfig.client.storage.from("chat-attachments").upload(filePath, data: data)

            struct Payload: Encodable {
                let dmUserId: String
                let text: String
                let attachmentPath: String
                let attachmentName: String
                let attachmentType: String
            }
            try await APIClient.send(
                "api/messages", method: "POST",
                body: Payload(dmUserId: userId, text: "", attachmentPath: filePath, attachmentName: fileName, attachmentType: fileType)
            )
        } catch {
            errorMessage = "Could not send attachment."
        }
    }

    private func sendPickedFile(_ url: URL) async {
        guard url.startAccessingSecurityScopedResource() else {
            errorMessage = "Could not access the selected file."
            return
        }
        defer { url.stopAccessingSecurityScopedResource() }

        guard let data = try? Data(contentsOf: url) else {
            errorMessage = "Could not read the selected file."
            return
        }

        let ext = url.pathExtension.lowercased()
        let mimeType = UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        await sendAttachment(data: data, fileName: url.lastPathComponent, fileType: mimeType)
    }

    private func loadAttachmentURLs() async {
        let missing = messages.filter { $0.attachmentPath != nil && attachmentURLs[$0.id] == nil }
        guard !missing.isEmpty else { return }

        await withTaskGroup(of: (String, URL?).self) { group in
            for message in missing {
                guard let path = message.attachmentPath else { continue }
                group.addTask {
                    let url = try? await SupabaseConfig.client.storage
                        .from("chat-attachments")
                        .createSignedURL(path: path, expiresIn: 3600)
                    return (message.id, url)
                }
            }
            for await (id, url) in group {
                if let url { attachmentURLs[id] = url }
            }
        }
    }

    private func openAttachment(_ message: ChatMessage) async {
        guard let path = message.attachmentPath else { return }
        do {
            let data = try await SupabaseConfig.client.storage.from("chat-attachments").download(path: path)
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(message.attachmentName ?? "attachment")
            try data.write(to: tempURL)
            previewItem = PreviewItem(url: tempURL)
        } catch {
            errorMessage = "Could not open attachment."
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
    let attachmentURL: URL?
    let onTapAttachment: () -> Void

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 40) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 2) {
                Text(isMine ? "You" : message.senderName)
                    .font(.caption2.weight(.semibold))
                    .foregroundColor(.secondary)

                if message.attachmentPath != nil {
                    Button(action: onTapAttachment) {
                        attachmentView
                    }
                    .buttonStyle(.plain)
                }

                if !message.body.isEmpty {
                    Text(message.body)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(isMine ? Theme.navy : Color(.secondarySystemBackground))
                        .foregroundColor(isMine ? .white : .primary)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                if showReadReceipt {
                    Text(readByOther ? "✓✓ Read" : "✓ Sent")
                        .font(.caption2)
                        .foregroundColor(readByOther ? Theme.gold : .secondary)
                }
            }
            if !isMine { Spacer(minLength: 40) }
        }
    }

    @ViewBuilder
    private var attachmentView: some View {
        if message.attachmentType?.hasPrefix("image/") == true {
            Group {
                if let attachmentURL {
                    AsyncImage(url: attachmentURL) { phase in
                        if case .success(let image) = phase {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Color.gray.opacity(0.15)
                        }
                    }
                } else {
                    Color.gray.opacity(0.1)
                }
            }
            .frame(width: 160, height: 160)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        } else {
            HStack(spacing: 6) {
                Image(systemName: "doc")
                Text(message.attachmentName ?? "Attachment")
                    .lineLimit(1)
            }
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isMine ? Theme.navy.opacity(0.85) : Color(.secondarySystemBackground))
            .foregroundColor(isMine ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}
