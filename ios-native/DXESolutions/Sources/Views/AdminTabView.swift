import SwiftUI

struct AdminTabView: View {
    var body: some View {
        TabView {
            AdminDashboardView()
                .tabItem { Label("Dashboard", systemImage: "house.fill") }

            AdminClientListView()
                .tabItem { Label("Clients", systemImage: "person.2.fill") }

            AdminProjectListView()
                .tabItem { Label("Projects", systemImage: "folder.fill") }

            AdminMoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle.fill") }
        }
    }
}
