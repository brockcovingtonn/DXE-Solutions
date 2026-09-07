import SwiftUI

struct EmployeeTrainingView: View {
    @State private var stepsByCategory: [String: [TrainingStep]] = [:]
    @State private var isLoading = true
    @State private var selectedCategory = EmployeeTrainingView.categories.first!

    private static let categories = [
        "General",
        "Residential — New Construction",
        "Residential — ADU",
        "Residential — Renovation / Addition",
        "Commercial — New Construction",
        "Commercial — Tenant Improvement",
        "Mixed-Use Development",
        "Permitting",
        "Utilities",
        "Other",
    ]

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 0) {
                    Picker("Category", selection: $selectedCategory) {
                        ForEach(Self.categories, id: \.self) { category in
                            Text(category).tag(category)
                        }
                    }
                    .pickerStyle(.menu)
                    .padding(.horizontal)
                    .padding(.top, 8)

                    let steps = stepsByCategory[selectedCategory] ?? []
                    if steps.isEmpty {
                        Text("No training steps in this category yet.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            VStack(alignment: .leading, spacing: 16) {
                                ForEach(Array(steps.enumerated()), id: \.element.id) { index, step in
                                    stepRow(index: index, step: step)
                                }
                            }
                            .padding()
                        }
                    }
                }
            }
        }
        .navigationTitle("Training")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadSteps() }
    }

    private func stepRow(index: Int, step: TrainingStep) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index + 1)")
                .font(.title3.weight(.semibold))
                .foregroundColor(Theme.gold)
                .frame(width: 28, alignment: .leading)
            VStack(alignment: .leading, spacing: 4) {
                Text(step.title)
                    .font(.subheadline.weight(.medium))
                    .foregroundColor(Theme.navy)
                if let description = step.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }

    private func loadSteps() async {
        do {
            let steps: [TrainingStep] = try await SupabaseConfig.client
                .from("training_steps")
                .select()
                .order("sort_order", ascending: true)
                .execute()
                .value
            var grouped: [String: [TrainingStep]] = [:]
            for step in steps {
                grouped[step.projectType, default: []].append(step)
            }
            stepsByCategory = grouped
        } catch {
            stepsByCategory = [:]
        }
        isLoading = false
    }
}
