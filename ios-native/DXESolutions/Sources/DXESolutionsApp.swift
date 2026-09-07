import SwiftUI

@main
struct DXESolutionsApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var auth = AuthManager()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .preferredColorScheme(.light)
        }
        .onChange(of: scenePhase) { newPhase in
            if newPhase == .active {
                Task { await auth.refreshUnreadCount() }
            }
        }
    }
}
