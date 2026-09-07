import SwiftUI

struct AdminReviewsListView: View {
    @State private var reviews: [Review] = []
    @State private var isLoading = true
    @State private var busyId: String?
    @State private var deleteTarget: Review?

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if reviews.isEmpty {
                Text("No reviews submitted yet.").foregroundColor(.secondary).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(reviews) { review in
                            reviewCard(review)
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Client Reviews")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .alert("Delete this review?", isPresented: Binding(get: { deleteTarget != nil }, set: { if !$0 { deleteTarget = nil } })) {
            Button("Delete", role: .destructive) {
                if let target = deleteTarget { Task { await delete(target) } }
            }
            Button("Cancel", role: .cancel) { deleteTarget = nil }
        } message: {
            Text("This cannot be undone.")
        }
    }

    private func reviewCard(_ review: Review) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    starRow(review.rating)
                    Text([review.clientName, review.projects?.name].compactMap { $0 }.joined(separator: " — "))
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(Theme.navy)
                    if let type = review.projectType {
                        Text(type).font(.caption2).foregroundColor(.secondary)
                    }
                }
                Spacer()
                if busyId == review.id {
                    ProgressView()
                } else {
                    Button {
                        Task { await toggleFeatured(review) }
                    } label: {
                        Image(systemName: review.featured ? "star.fill" : "star")
                            .foregroundColor(review.featured ? Theme.gold : .secondary)
                    }
                    .buttonStyle(.plain)
                    Button {
                        deleteTarget = review
                    } label: {
                        Image(systemName: "trash").foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                }
            }
            if let body = review.body, !body.isEmpty {
                Text(body).font(.subheadline).foregroundColor(.primary)
            }
        }
        .padding()
        .background(review.featured ? Theme.cream : Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func starRow(_ rating: Int) -> some View {
        HStack(spacing: 2) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= rating ? "star.fill" : "star")
                    .font(.caption2)
                    .foregroundColor(Theme.gold)
            }
        }
    }

    private func load() async {
        reviews = (try? await SupabaseConfig.client
            .from("reviews")
            .select("*, projects(id,name)")
            .order("created_at", ascending: false)
            .execute().value) ?? []
        isLoading = false
    }

    private func toggleFeatured(_ review: Review) async {
        busyId = review.id
        defer { busyId = nil }
        struct Payload: Encodable { let featured: Bool }
        do {
            try await APIClient.send("api/admin/reviews/\(review.id)", method: "PATCH", body: Payload(featured: !review.featured))
            await load()
        } catch {
            // Row stays as-is; user can retry.
        }
    }

    private func delete(_ review: Review) async {
        deleteTarget = nil
        busyId = review.id
        defer { busyId = nil }
        do {
            try await APIClient.send("api/admin/reviews/\(review.id)", method: "DELETE", body: EmptyBody())
            reviews.removeAll { $0.id == review.id }
        } catch {
            // Leave in place; user can retry.
        }
    }
}
