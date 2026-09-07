import SwiftUI

struct AdminTabView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        TabView {
            AdminDashboardView()
                .tabItem { Label("Dashboard", systemImage: "house.fill") }

            AdminChatListView()
                .tabItem { Label("Chat", systemImage: "message.fill") }
                .badge(auth.unreadMessageCount)

            AdminClientListView()
                .tabItem { Label("Clients", systemImage: "person.2.fill") }

            AdminProjectListView()
                .tabItem { Label("Projects", systemImage: "folder.fill") }

            AdminMoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
        }
    }
}
