import SwiftUI

struct RoleHomeView: View {
    @EnvironmentObject var auth: AuthManager

    private var roleLabel: String {
        guard let profile = auth.profile else { return "Unknown" }
        if profile.isAdmin { return "Master" }
        if profile.isEmployee { return "Employee" }
        return "Client"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Signed in as")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text(roleLabel)
                    .font(.system(size: 32, weight: .bold, design: .serif))
                if let profile = auth.profile {
                    let name = [profile.firstName, profile.lastName].compactMap { $0 }.joined(separator: " ")
                    if !name.isEmpty {
                        Text(name)
                            .foregroundColor(.secondary)
                    }
                }
                Text("This confirms sign-in and role detection work against the same Supabase project as the portal. Real screens get built here next.")
                    .font(.footnote)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
                    .padding(.top, 8)

                Button("Sign Out") {
                    Task { await auth.signOut() }
                }
                .buttonStyle(.bordered)
                .padding(.top, 24)
            }
            .padding(32)
            .navigationTitle("DXE Solutions")
        }
    }
}
