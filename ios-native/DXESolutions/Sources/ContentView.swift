import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthManager
    @Namespace private var logoNamespace
    @State private var minimumSplashElapsed = false

    private let minimumSplashDuration: Double = 1.6

    private var showSplash: Bool {
        auth.isRestoringSession || !minimumSplashElapsed
    }

    var body: some View {
        Group {
            if showSplash {
                SplashView(namespace: logoNamespace)
            } else if let profile = auth.profile {
                if !profile.isAdmin && !profile.isEmployee {
                    ClientTabView()
                } else if profile.isEmployee {
                    EmployeeTabView()
                } else {
                    AdminTabView()
                }
            } else if auth.isAuthenticated {
                ProgressView("Loading your account...")
            } else {
                LoginView(namespace: logoNamespace)
            }
        }
        .animation(.easeInOut(duration: 0.7), value: showSplash)
        .task {
            try? await Task.sleep(nanoseconds: UInt64(minimumSplashDuration * 1_000_000_000))
            minimumSplashElapsed = true
        }
    }
}
