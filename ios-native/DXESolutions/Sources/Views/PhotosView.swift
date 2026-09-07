import SwiftUI
import PhotosUI

struct PhotosView: View {
    let project: Project

    @State private var photos: [ProjectPhoto] = []
    @State private var signedURLs: [String: URL] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedPhoto: ProjectPhoto?
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showCamera = false
    @State private var isUploading = false
    @State private var uploadMessage: String?

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 8)]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        if photos.isEmpty {
                            Text("No photos yet")
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity)
                                .padding(.top, 40)
                        } else {
                            LazyVGrid(columns: columns, spacing: 8) {
                                ForEach(photos) { photo in
                                    Button {
                                        selectedPhoto = photo
                                    } label: {
                                        thumbnail(for: photo)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }

                        uploadControls
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Photos")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadPhotos() }
        .sheet(item: $selectedPhoto) { photo in
            PhotoDetailView(photo: photo, url: signedURLs[photo.id])
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraCapture(
                onCapture: { data in
                    showCamera = false
                    Task { await upload(data) }
                },
                onCancel: { showCamera = false }
            )
            .ignoresSafeArea()
        }
    }

    private var uploadControls: some View {
        VStack(alignment: .leading, spacing: 6) {
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
                        Label("Add Photo", systemImage: "photo.badge.plus")
                    }
                }
                .disabled(isUploading)
                .onChange(of: pickerItems) { newItems in
                    guard let item = newItems.first else { return }
                    pickerItems = []
                    Task {
                        if let data = try? await item.loadTransferable(type: Data.self) {
                            await upload(data)
                        }
                    }
                }
            }
            .font(.caption.weight(.medium))

            if let uploadMessage {
                Text(uploadMessage).font(.caption).foregroundColor(.secondary)
            }
        }
        .padding(.top, 8)
    }

    private func upload(_ data: Data) async {
        isUploading = true
        uploadMessage = nil
        defer { isUploading = false }

        let fileName = "\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString.prefix(8)).jpg"
        let filePath = "\(project.id)/\(fileName)"

        do {
            try await SupabaseConfig.client.storage.from("project-photos").upload(filePath, data: data)

            struct Payload: Encodable {
                let projectId: String
                let filePath: String
            }
            try await APIClient.send("api/photos", method: "POST", body: Payload(projectId: project.id, filePath: filePath))
            await loadPhotos()
        } catch {
            uploadMessage = "Could not upload photo."
        }
    }

    @ViewBuilder
    private func thumbnail(for photo: ProjectPhoto) -> some View {
        Group {
            if let url = signedURLs[photo.id] {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    case .failure:
                        Color.gray.opacity(0.15)
                    default:
                        ProgressView()
                    }
                }
            } else {
                Color.gray.opacity(0.1)
            }
        }
        .frame(width: 110, height: 110)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func loadPhotos() async {
        do {
            let photos: [ProjectPhoto] = try await SupabaseConfig.client
                .from("photos")
                .select()
                .eq("project_id", value: project.id)
                .order("created_at", ascending: false)
                .execute()
                .value
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
        } catch {
            errorMessage = "Could not load photos."
            isLoading = false
        }
    }
}

private struct PhotoDetailView: View {
    let photo: ProjectPhoto
    let url: URL?

    var body: some View {
        VStack {
            if let url {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fit)
                    case .failure:
                        Text("Could not load photo").foregroundColor(.secondary)
                    default:
                        ProgressView()
                    }
                }
            } else {
                ProgressView()
            }
            if let caption = photo.caption, !caption.isEmpty {
                Text(caption)
                    .font(.footnote)
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
        .padding()
    }
}
