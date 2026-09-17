import SwiftUI

// Dashboard-level lead capture — mirrors components/design-studio/SendIntakeFormModal.js.
// No existing quote required; creates a design_studio_leads row and emails
// the intake-form link straight away, no preview step.
struct SendIntakeFormView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var fullName = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var address = ""
    @State private var isSending = false
    @State private var errorMessage: String?
    @State private var sent = false

    var body: some View {
        NavigationStack {
            Group {
                if sent {
                    VStack(spacing: 10) {
                        Image(systemName: "checkmark.circle.fill").font(.system(size: 36)).foregroundColor(Color(red: 0.02, green: 0.37, blue: 0.28))
                        Text("Sent").font(.headline)
                        Text("They'll get an email with a link to fill out their project details.")
                            .font(.subheadline).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal, 30)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Form {
                        Section {
                            TextField("Full name", text: $fullName)
                            TextField("Phone", text: $phone).keyboardType(.phonePad)
                            TextField("Email", text: $email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                            TextField("Address", text: $address)
                        }
                        if let errorMessage {
                            Text(errorMessage).foregroundColor(.red).font(.caption)
                        }
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.screenBackground.ignoresSafeArea())
            .listRowBackground(Theme.cardBackground)
            .navigationTitle("Send Intake Form")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(sent ? "Done" : "Cancel") { dismiss() }
                }
                if !sent {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(isSending ? "Sending…" : "Send") {
                            Task { await send() }
                        }
                        .disabled(isSending || fullName.trimmingCharacters(in: .whitespaces).isEmpty || email.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
        }
    }

    private func send() async {
        isSending = true
        errorMessage = nil
        defer { isSending = false }
        do {
            try await APIClient.send(
                "api/design-studio/leads", method: "POST",
                body: DesignStudioLeadCreatePayload(fullName: fullName, phone: phone, email: email, address: address)
            )
            HapticManager.success()
            sent = true
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not send the intake form."
        }
    }
}
