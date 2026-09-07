import SwiftUI
import PhotosUI

struct AdminPhotosEditor: View {
    let projectId: String

    @State private var photos: [ProjectPhoto] = []
    @State private var signedURLs: [String: URL] = [:]
    @State private var isLoading = true
    @State private var isUploading = false
    @State private var message: String?
    @State private var busyId: String?
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showCamera = false
    @State private var isSelecting = false
    @State private var selectedIds: Set<String> = []
    @State private var isBulkDeleting = false

    private let columns = [GridItem(.adaptive(minimum: 90), spacing: 8)]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                if photos.isEmpty {
                    EmptyStateView(icon: "photo", title: "No photos yet")
                } else {
                    HStack {
                        Spacer()
                        Button(isSelecting ? "Cancel" : "Select") {
                            isSelecting.toggle()
                            selectedIds = []
                        }
                        .font(.caption.weight(.medium))
                    }

                    if !selectedIds.isEmpty {
                        HStack(spacing: 12) {
                            Text("\(selectedIds.count) selected").font(.caption.weight(.medium))
                            Spacer()
                            Button(role: .destructive) {
                                Task { await bulkDelete() }
                            } label: {
                                Text(isBulkDeleting ? "Working..." : "Delete").font(.caption)
                            }
                            .disabled(isBulkDeleting)
                        }
                        .padding(8)
                        .background(Color(.tertiarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    LazyVGrid(columns: columns, spacing: 8) {
                        ForEach(photos) { photo in
                            ZStack(alignment: .topTrailing) {
                                if let url = signedURLs[photo.id] {
                                    AsyncImage(url: url) { phase in
                                        if case .success(let image) = phase {
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        } else {
                                            Color.gray.opacity(0.15)
                                        }
                                    }
                                    .frame(width: 90, height: 90)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                } else {
                                    Color.gray.opacity(0.1).frame(width: 90, height: 90)
                                }
                                if isSelecting {
                                    Button {
                                        if selectedIds.contains(photo.id) { selectedIds.remove(photo.id) } else { selectedIds.insert(photo.id) }
                                    } label: {
                                        Image(systemName: selectedIds.contains(photo.id) ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(selectedIds.contains(photo.id) ? Theme.gold : .white)
                                            .background(Circle().fill(Color.black.opacity(0.5)))
                                    }
                                    .padding(4)
                                } else {
                                    Button {
                                        Task { await delete(photo) }
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .foregroundColor(.white)
                                            .background(Circle().fill(Color.black.opacity(0.5)))
                                    }
                                    .padding(4)
                                    .disabled(busyId == photo.id)
                                }
                            }
                        }
                    }
                }

                HStack(spacing: 16) {
                    if UIImagePickerController.isCameraAvailable {
                        Button {
                            showCamera = true
                        } label: {
                            Label("Take Photo", systemImage: "camera")
                        }
                        .disabled(isUploading)
                    }

                    PhotosPicker(selection: $pickerItems, matching: .images) {
                        if isUploading {
                            ProgressView()
                        } else {
                            Label("Add Photos", systemImage: "photo.badge.plus")
                        }
                    }
                    .disabled(isUploading)
                }
                .font(.caption.weight(.medium))
                .onChange(of: pickerItems) { newItems in
                    guard !newItems.isEmpty else { return }
                    Task { await upload(newItems) }
                }

                if let message {
                    Text(message).font(.caption).foregroundColor(.secondary)
                }
            }
        }
        .task { await load() }
        .fullScreenCover(isPresented: $showCamera) {
            CameraCapture(
                onCapture: { data in
                    showCamera = false
                    Task { await uploadCaptured(data) }
                },
                onCancel: { showCamera = false }
            )
            .ignoresSafeArea()
        }
    }

    private func load() async {
        let photos: [ProjectPhoto] = (try? await SupabaseConfig.client
            .from("photos").select().eq("project_id", value: projectId)
            .order("created_at", ascending: false).execute().value) ?? []
        self.photos = photos
        isLoading = false

        await withTaskGroup(of: (String, URL?).self) { group in
            for photo in photos {
                group.addTask {
                    let url = try? await SupabaseConfig.client.storage
                        .from("project-photos")
                        .createSignedURL(path: photo.filePath, expiresIn: 3600)
                    return (photo.id, url)
                }
            }
            for await (id, url) in group {
                if let url { signedURLs[id] = url }
            }
        }
    }

    private func upload(_ items: [PhotosPickerItem]) async {
        isUploading = true
        message = nil
        defer { isUploading = false; pickerItems = [] }

        var uploadedCount = 0
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            if await uploadOne(data, photoCount: items.count) { uploadedCount += 1 }
        }
        if uploadedCount > 0 { await load() }
    }

    private func uploadCaptured(_ data: Data) async {
        isUploading = true
        message = nil
        defer { isUploading = false }

        if await uploadOne(data, photoCount: 1) { await load() }
    }

    @discardableResult
    private func uploadOne(_ data: Data, photoCount: Int) async -> Bool {
        let fileName = "\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString.prefix(8)).jpg"
        let filePath = "\(projectId)/\(fileName)"
        do {
            try await SupabaseConfig.client.storage
                .from("project-photos")
                .upload(filePath, data: data)

            struct Payload: Encodable {
                let projectId: String
                let filePath: String
                let logActivity: Bool
                let photoCount: Int
            }
            try await APIClient.send(
                "api/admin/photos", method: "POST",
                body: Payload(projectId: projectId, filePath: filePath, logActivity: true, photoCount: photoCount)
            )
            HapticManager.success()
            return true
        } catch {
            HapticManager.error()
            message = "Could not upload one or more photos."
            return false
        }
    }

    private func delete(_ photo: ProjectPhoto) async {
        busyId = photo.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/photos/\(photo.id)", method: "DELETE", body: EmptyBody())
            photos.removeAll { $0.id == photo.id }
        } catch {
            message = "Could not delete photo."
        }
    }

    private func bulkDelete() async {
        isBulkDeleting = true
        defer { isBulkDeleting = false }
        await withTaskGroup(of: Void.self) { group in
            for id in selectedIds {
                group.addTask {
                    try? await APIClient.send("api/admin/photos/\(id)", method: "DELETE", body: EmptyBody())
                }
            }
        }
        isSelecting = false
        selectedIds = []
        await load()
    }
}
