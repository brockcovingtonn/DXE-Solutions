import SwiftUI

struct ReviewView: View {
    let project: Project
    @EnvironmentObject var auth: AuthManager

    @State private var review: Review?
    @State private var rating = 0
    @State private var reviewText = ""
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var isDeleting = false
    @State private var message: String?
    @State private var messageIsError = false
    @State private var showDeleteConfirm = false
    @State private var justSaved = false

    private var showGoogleCta: Bool {
        AppConfig.googleReviewURL != nil && rating >= 4 && (justSaved || review != nil)
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("YOUR RATING")
                                .font(.caption2.weight(.semibold))
                                .foregroundColor(.secondary)
                                .tracking(1)
                            starPicker
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("YOUR REVIEW (OPTIONAL)")
                                .font(.caption2.weight(.semibold))
                                .foregroundColor(.secondary)
                                .tracking(1)
                            TextEditor(text: $reviewText)
                                .frame(minHeight: 130)
                                .padding(6)
                                .background(Color(.secondarySystemBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        if let message {
                            Text(message)
                                .font(.caption)
                                .foregroundColor(messageIsError ? .red : Color(red: 0.02, green: 0.37, blue: 0.28))
                        }

                        if showGoogleCta, let url = AppConfig.googleReviewURL {
                            googleCta(url)
                        }

                        HStack(spacing: 20) {
                            Button {
                                Task { await save() }
                            } label: {
                                if isSaving {
                                    ProgressView()
                                } else {
                                    Text(review == nil ? "Submit Review" : "Update Review")
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Theme.navy)
                            .disabled(isSaving)

                            if review != nil {
                                Button(role: .destructive) {
                                    showDeleteConfirm = true
                                } label: {
                                    if isDeleting {
                                        ProgressView()
                                    } else {
                                        Text("Remove my review")
                                    }
                                }
                                .disabled(isDeleting)
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Leave a Review")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadReview() }
        .alert("Remove your review?", isPresented: $showDeleteConfirm) {
            Button("Remove", role: .destructive) { Task { await delete() } }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This cannot be undone.")
        }
    }

    private func googleCta(_ url: URL) -> some View {
        HStack(spacing: 12) {
            Text("Glad you enjoyed working with us — mind sharing this on Google too?")
                .font(.caption)
                .foregroundColor(Theme.navy)
            Spacer()
            Link(destination: url) {
                Text("Leave a Google Review")
                    .font(.caption.weight(.semibold))
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var starPicker: some View {
        HStack(spacing: 6) {
            ForEach(1...5, id: \.self) { star in
                Button {
                    rating = star
                } label: {
                    Image(systemName: star <= rating ? "star.fill" : "star")
                        .font(.system(size: 28))
                        .foregroundColor(Theme.gold)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Data

    private func loadReview() async {
        guard let userId = auth.profile?.id else {
            isLoading = false
            return
        }
        if let existing: Review? = try? await SupabaseConfig.client
            .from("reviews")
            .select()
            .eq("project_id", value: project.id)
            .eq("client_id", value: userId)
            .maybeSingle()
            .execute()
            .value {
            review = existing
            if let existing {
                rating = existing.rating
                reviewText = existing.body ?? ""
            }
        }
        isLoading = false
    }

    private func save() async {
        guard let userId = auth.profile?.id else { return }
        guard rating > 0 else {
            message = "Please select a star rating."
            messageIsError = true
            return
        }
        isSaving = true
        message = nil
        defer { isSaving = false }

        do {
            if let existing = review {
                struct ReviewUpdate: Encodable {
                    let rating: Int
                    let body: String?
                    let updated_at: String
                }
                let payload = ReviewUpdate(
                    rating: rating,
                    body: reviewText.isEmpty ? nil : reviewText,
                    updated_at: ISO8601DateFormatter().string(from: Date())
                )
                try await SupabaseConfig.client
                    .from("reviews")
                    .update(payload)
                    .eq("id", value: existing.id)
                    .execute()
            } else {
                struct NewReview: Encodable {
                    let project_id: String
                    let client_id: String
                    let client_name: String
                    let project_type: String?
                    let rating: Int
                    let body: String?
                }
                let name = fullName(auth.profile)
                let payload = NewReview(
                    project_id: project.id,
                    client_id: userId,
                    client_name: name.isEmpty ? "A DXE client" : name,
                    project_type: project.projectType,
                    rating: rating,
                    body: reviewText.isEmpty ? nil : reviewText
                )
                try await SupabaseConfig.client.from("reviews").insert(payload).execute()
            }
            message = "Thank you — your review has been saved."
            messageIsError = false
            justSaved = true
            await loadReview()
        } catch {
            message = "Could not save your review. Please try again."
            messageIsError = true
        }
    }

    private func delete() async {
        guard let existing = review else { return }
        isDeleting = true
        defer { isDeleting = false }
        do {
            try await SupabaseConfig.client
                .from("reviews")
                .delete()
                .eq("id", value: existing.id)
                .execute()
            review = nil
            rating = 0
            reviewText = ""
            message = nil
            justSaved = false
        } catch {
            message = "Could not remove your review."
            messageIsError = true
        }
    }

    private func fullName(_ profile: Profile?) -> String {
        [profile?.firstName, profile?.lastName].compactMap { $0 }.joined(separator: " ")
    }
}
