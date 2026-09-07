import SwiftUI

struct SplashView: View {
    var namespace: Namespace.ID

    var body: some View {
        ZStack {
            Theme.navyDark.ignoresSafeArea()

            VStack(spacing: 20) {
                Image("LaunchLogo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 220)
                    .matchedGeometryEffect(id: "logo", in: namespace)
                ProgressView()
                    .tint(Theme.gold)
            }
        }
    }
}
