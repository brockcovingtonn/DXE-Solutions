import SwiftUI

@main
struct DXESolutionsApp: App {
    @StateObject private var auth = AuthManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .preferredColorScheme(.light)
        }
    }
}
