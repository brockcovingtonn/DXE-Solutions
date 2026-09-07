import Foundation
import SwiftUI

// Disk-backed cache for the read-heavy summary screens (dashboards,
// calendar) so they show the last-synced data instead of a blank or
// misleadingly-empty state when there's no signal — common on job
// sites. Not used for documents/photos/chat, which inherently need a
// live connection to fetch their file bytes.
enum OfflineCache {
    private static var directory: URL {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("offline-cache", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    private static func url(for key: String) -> URL {
        directory.appendingPathComponent("\(key).json")
    }

    static func save<T: Encodable>(_ value: T, key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url(for: key), options: .atomic)
    }

    static func load<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = try? Data(contentsOf: url(for: key)) else { return nil }
        return try? JSONDecoder().decode(T.self, from: data)
    }

    static func lastSavedAt(key: String) -> Date? {
        (try? FileManager.default.attributesOfItem(atPath: url(for: key).path))?[.modificationDate] as? Date
    }
}

struct OfflineBanner: View {
    let lastSyncedAt: Date?

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "wifi.slash")
            Text(lastSyncedAt.map { "Offline — showing data from \(relativeSyncText($0))" } ?? "Offline — no saved data yet")
        }
        .font(.caption)
        .foregroundColor(.secondary)
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func relativeSyncText(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
