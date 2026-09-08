import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthManager
    @Namespace private var logoNamespace
    @State private var minimumSplashElapsed = false
    @State private var splashTimedOut = false

    private let minimumSplashDuration: Double = 1.6
    // Hard cap — session restoration involves a couple of network calls
    // (token refresh, profile fetch) that can occasionally run long; the
    // splash should never block on that past 2 seconds.
    private let maximumSplashDuration: Double = 2.0

    private var showSplash: Bool {
        (auth.isRestoringSession && !splashTimedOut) || !minimumSplashElapsed
    }

    var body: some View {
        Group {
            if showSplash {
                SplashView(namespace: logoNamespace)
            } else if auth.isLockedByBiometrics {
                BiometricLockView()
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
        .task {
            try? await Task.sleep(nanoseconds: UInt64(maximumSplashDuration * 1_000_000_000))
            splashTimedOut = true
        }
    }
}
