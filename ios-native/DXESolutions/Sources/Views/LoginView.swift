import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthManager
    var namespace: Namespace.ID
    @State private var email = ""
    @State private var password = ""
    @State private var isPasswordVisible = false

    var body: some View {
        ZStack {
            Image("LoginBackground")
                .resizable()
                .aspectRatio(contentMode: .fill)
                .ignoresSafeArea()

            LinearGradient(
                colors: [Theme.navyDark.opacity(0.55), Theme.navyDark.opacity(0.85)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    Image("LaunchLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 240)
                        .shadow(color: .black.opacity(0.4), radius: 20, y: 8)
                        .padding(.top, 60)
                        .matchedGeometryEffect(id: "logo", in: namespace)

                    Text("Client & Team Portal")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))

                    VStack(spacing: 14) {
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .foregroundColor(.black)
                            .padding(14)
                            .background(Color.white)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .colorScheme(.light)

                        passwordField

                        if let error = auth.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundColor(.white)
                                .multilineTextAlignment(.center)
                        }

                        Button {
                            Task { await auth.signIn(email: email, password: password) }
                        } label: {
                            if auth.isLoading {
                                ProgressView()
                                    .tint(Theme.navyDark)
                                    .frame(maxWidth: .infinity)
                            } else {
                                Text("Sign In")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.gold)
                        .foregroundColor(Theme.navyDark)
                        .disabled(email.isEmpty || password.isEmpty || auth.isLoading)
                    }
                    .padding(16)
                    .background(Color.black.opacity(0.28))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.top, 60)
                }
                .padding(32)
                .frame(maxWidth: 420)
            }
        }
    }

    private var passwordField: some View {
        HStack(spacing: 8) {
            Group {
                if isPasswordVisible {
                    TextField("Password", text: $password)
                } else {
                    SecureField("Password", text: $password)
                }
            }
            .textContentType(.password)
            .autocapitalization(.none)
            .foregroundColor(.black)

            Button {
                isPasswordVisible.toggle()
            } label: {
                Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                    .foregroundColor(.secondary)
            }
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .colorScheme(.light)
    }
}
