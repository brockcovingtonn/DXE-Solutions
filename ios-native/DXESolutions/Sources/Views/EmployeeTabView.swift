import SwiftUI

struct EmployeeTabView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        TabView {
            EmployeeDashboardView()
                .tabItem { Label("My Projects", systemImage: "house.fill") }
                .badge(auth.unreadMessageCount)

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
                EmployeeTrainingView()
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Sign Out") {
                                Task { await auth.signOut() }
                            }
                            .font(.footnote)
                        }
                    }
            }
            .tabItem { Label("Training", systemImage: "graduationcap.fill") }

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
