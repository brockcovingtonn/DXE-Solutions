import SwiftUI

private let statusColors: [String: Color] = [
    "draft": .secondary,
    "sent": Theme.navy,
    "accepted": Color(red: 0.02, green: 0.37, blue: 0.28),
    "declined": .red,
    "expired": .secondary,
]

// Mirrors app/design-studio/page.js: the quote pipeline dashboard.
// Employees see their own quotes; master admins (is_admin) see everyone's,
// with the author shown, and get the Rate card entry point.
struct DesignStudioListView: View {
    @State private var quotes: [DesignStudioQuote] = []
    @State private var viewer: DesignStudioViewer?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showNewQuote = false

    private var open: [DesignStudioQuote] { quotes.filter { $0.status == "draft" || $0.status == "sent" } }
    private var accepted: [DesignStudioQuote] { quotes.filter { $0.status == "accepted" } }
    private var decided: [DesignStudioQuote] { quotes.filter { $0.status == "accepted" || $0.status == "declined" } }
    private var winRate: Int? {
        guard !decided.isEmpty else { return nil }
        return Int((Double(accepted.count) / Double(decided.count) * 100).rounded())
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        if let errorMessage {
                            Text(errorMessage).font(.caption).foregroundColor(.red)
                        }
                        statCards
                        if let viewer, viewer.isMaster {
                            NavigationLink {
                                DesignStudioRateCardView()
                            } label: {
                                Label("Rate card", systemImage: "slider.horizontal.3")
                                    .font(.subheadline.weight(.medium))
                            }
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text(viewer?.isMaster == true ? "All quotes (\(quotes.count))" : "My quotes (\(quotes.count))")
                                .font(.headline)
                                .foregroundColor(Theme.navy)
                            if quotes.isEmpty {
                                Text("No quotes yet. Start with a new quote.").font(.subheadline).foregroundColor(.secondary)
                            } else {
                                ForEach(quotes) { quote in
                                    NavigationLink {
                                        DesignStudioQuoteDetailView(quoteId: quote.id)
                                    } label: {
                                        row(quote)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Design Studio")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    showNewQuote = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showNewQuote, onDismiss: { Task { await load() } }) {
            NavigationStack {
                DesignStudioQuoteBuilderView(existingQuoteId: nil)
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private var statCards: some View {
        HStack(spacing: 12) {
            statCard("Open", "\(open.count)", sub: designStudioCurrency(open.reduce(0) { $0 + $1.total }))
            statCard("Accepted", "\(accepted.count)", sub: designStudioCurrency(accepted.reduce(0) { $0 + $1.total }))
            statCard("Win rate", winRate.map { "\($0)%" } ?? "—", sub: decided.isEmpty ? "No decisions yet" : "\(decided.count) decided")
        }
    }

    private func statCard(_ label: String, _ value: String, sub: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label.uppercased()).font(.caption2.weight(.semibold)).foregroundColor(.secondary)
            Text(value).font(.title3.weight(.bold)).foregroundColor(Theme.navy)
            Text(sub).font(.caption2).foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func row(_ quote: DesignStudioQuote) -> some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(quote.quoteNumber).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
                Text(quote.clientName?.isEmpty == false ? quote.clientName! : "No client name yet")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("\(designStudioProjectTypeLabels[quote.projectType] ?? quote.projectType) · \(designStudioServiceLevelLabels[quote.serviceLevel] ?? quote.serviceLevel)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                if let by = quote.createdByName, viewer?.isMaster == true {
                    Text("By \(by)").font(.caption2).foregroundColor(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                Text(designStudioCurrency(quote.total)).font(.subheadline.weight(.semibold)).foregroundColor(Theme.navy)
                Text(quote.status.capitalized)
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background((statusColors[quote.status] ?? .secondary).opacity(0.15))
                    .foregroundColor(statusColors[quote.status] ?? .secondary)
                    .clipShape(Capsule())
            }
        }
        .padding(10)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func load() async {
        do {
            let response: DesignStudioQuoteListResponse = try await APIClient.get("api/design-studio/quotes")
            quotes = response.quotes
            viewer = response.viewer
        } catch let apiError as APIError {
            errorMessage = apiError.errorDescription
        } catch {
            errorMessage = "Could not load quotes."
        }
        isLoading = false
    }
}
