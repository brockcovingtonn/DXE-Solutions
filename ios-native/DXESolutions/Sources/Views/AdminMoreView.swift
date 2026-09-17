import SwiftUI

struct AdminMoreView: View {
    @EnvironmentObject var auth: AuthManager

    var body: some View {
        NavigationStack {
            List {
                NavigationLink {
                    DesignStudioListView()
                } label: {
                    Label("Design Studio", systemImage: "square.stack.3d.up.fill")
                }
                NavigationLink {
                    AdminEmployeeListView()
                } label: {
                    Label("Employees", systemImage: "person.badge.key.fill")
                }
                NavigationLink {
                    AdminContactListView()
                } label: {
                    Label("Contacts", systemImage: "person.text.rectangle.fill")
                }
                NavigationLink {
                    AdminTemplatesView()
                } label: {
                    Label("Templates", systemImage: "doc.on.doc.fill")
                }
                NavigationLink {
                    AdminAccountingListView()
                } label: {
                    Label("Accounting", systemImage: "dollarsign.circle.fill")
                }
                NavigationLink {
                    AdminReviewsListView()
                } label: {
                    Label("Reviews", systemImage: "star.fill")
                }
                NavigationLink {
                    AssistantView()
                } label: {
                    Label("Assistant", systemImage: "sparkles")
                }
                NavigationLink {
                    SiteSettingsView()
                } label: {
                    Label("Site Settings", systemImage: "slider.horizontal.3")
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
