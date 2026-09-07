import SwiftUI

struct ClientTabView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "house.fill") }
                .badge(auth.unreadMessageCount)
            ProjectListView()
                .tabItem { Label("Projects", systemImage: "folder.fill") }
            NavigationStack {
                AssistantView()
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Sign Out") {
                                Task { await auth.signOut() }
                            }
                            .font(.footnote)
                        }
                    }
            }
            .tabItem { Label("Assistant", systemImage: "sparkles") }
        }
    }
}
