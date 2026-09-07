import SwiftUI

struct PhotosView: View {
    let project: Project

    @State private var photos: [ProjectPhoto] = []
    @State private var signedURLs: [String: URL] = [:]
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var selectedPhoto: ProjectPhoto?

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 8)]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                Text(error).foregroundColor(.red).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if photos.isEmpty {
                Text("No photos yet")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
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
