import SwiftUI

struct EmployeeTabView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        TabView {
            EmployeeDashboardView()
                .tabItem { Label("My Projects", systemImage: "house.fill") }

            NavigationStack {
                CalendarView(project: nil)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Sign Out") {
                                Task { await auth.signOut() }
                            }
                            .font(.footnote)
                        }
                    }
            }
            .tabItem { Label("Calendar", systemImage: "calendar") }

            NavigationStack {
                EmployeeChatView()
            }
            .tabItem { Label("Chat", systemImage: "message.fill") }
            .badge(auth.unreadMessageCount)

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

            EmployeeMoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
        }
    }
}
