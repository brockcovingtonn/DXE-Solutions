import SwiftUI

struct EmployeeMoreView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        NavigationStack {
            List {
                NavigationLink {
                    EmployeeTrainingView()
                } label: {
                    Label("Training", systemImage: "graduationcap.fill")
                }
                NavigationLink {
                    SettingsView()
                } label: {
                    Label("Account Settings", systemImage: "gearshape")
                }
            }
            .navigationTitle("More")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Sign Out") {
                        Task { await auth.signOut() }
                    }
                    .font(.footnote)
                }
            }
        }
    }
}
