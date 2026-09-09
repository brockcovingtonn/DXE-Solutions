import SwiftUI

struct MessageBubble: View {
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
