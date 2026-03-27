// MonPap iOS — LoginView
// Редизайн: PNG-лого, блобы на фоне, capsule-поля, Google/Apple Sign In

import SwiftUI
import AuthenticationServices

struct LoginView: View {

    @Bindable var viewModel: AuthViewModel

    // Анимация логотипа (float effect)
    @State private var logoOffset: CGFloat = 0

    var body: some View {
        ZStack {
            // Фоновые блобы
            blobBackground

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 80)

                    // PNG-логотип
                    logoSection

                    Spacer().frame(height: 56)

                    // Форма
                    if viewModel.isSent {
                        pinSection
                            .transition(.asymmetric(
                                insertion: .move(edge: .trailing).combined(with: .opacity),
                                removal: .move(edge: .leading).combined(with: .opacity)
                            ))
                    } else {
                        emailSection
                            .transition(.asymmetric(
                                insertion: .move(edge: .leading).combined(with: .opacity),
                                removal: .move(edge: .trailing).combined(with: .opacity)
                            ))
                    }

                    Spacer().frame(height: 60)
                }
                .padding(.horizontal, 28)
            }
        }
        .animation(.spring(duration: 0.4), value: viewModel.isSent)
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                logoOffset = -8
            }
        }
    }

    // MARK: - Фоновые блобы

    private var blobBackground: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            // Синий блоб — вверху слева
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [.blue.opacity(0.35), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: 220
                    )
                )
                .frame(width: 340, height: 340)
                .offset(x: -100, y: -260)
                .blur(radius: 20)
                .ignoresSafeArea()

            // Фиолетовый блоб — внизу справа
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [.purple.opacity(0.3), .clear],
                        center: .center,
                        startRadius: 0,
                        endRadius: 200
                    )
                )
                .frame(width: 300, height: 300)
                .offset(x: 130, y: 380)
                .blur(radius: 24)
                .ignoresSafeArea()
        }
    }

    // MARK: - Логотип (PNG placeholder)

    private var logoSection: some View {
        Group {
            if let uiImage = UIImage(named: "AppLogo") {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 110, height: 110)
            } else {
                // Плейсхолдер пока нет PNG
                RoundedRectangle(cornerRadius: 26)
                    .fill(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 100, height: 100)
                    .overlay(
                        Text("М")
                            .font(.system(size: 48, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                    )
                    .shadow(color: .blue.opacity(0.4), radius: 20, y: 10)
            }
        }
        .offset(y: logoOffset)
    }

    // MARK: - Email-секция

    private var emailSection: some View {
        VStack(spacing: 14) {

            // Поле email
            HStack(spacing: 10) {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(.secondary)
                    .frame(width: 20)

                TextField("Ваш email", text: $viewModel.email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .font(.body)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .background(.thinMaterial)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(.separator.opacity(0.4), lineWidth: 1)
            )

            // Подсказка об ошибке формата
            if !viewModel.email.isEmpty && !viewModel.isEmailValid {
                Text("Некорректный формат email")
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .transition(.opacity)
            }

            // Кнопка «Войти»
            Button {
                Task { await viewModel.requestLink() }
            } label: {
                HStack(spacing: 8) {
                    if viewModel.isLoading {
                        ProgressView().tint(.white)
                    } else {
                        Text("Войти по email")
                            .fontWeight(.semibold)
                        Image(systemName: "arrow.right")
                    }
                }
                .font(.body)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 60)
                .background(
                    LinearGradient(
                        colors: viewModel.isEmailValid
                            ? [.blue, Color(red: 0.35, green: 0.2, blue: 0.9)]
                            : [.gray.opacity(0.5), .gray.opacity(0.4)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
                .shadow(
                    color: viewModel.isEmailValid ? .blue.opacity(0.35) : .clear,
                    radius: 12, y: 6
                )
            }
            .disabled(!viewModel.isEmailValid || viewModel.isLoading)
            .animation(.easeInOut(duration: 0.2), value: viewModel.isEmailValid)

            // Ошибка сервера
            if let error = viewModel.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 4)
                    .transition(.opacity)
            }

            // Разделитель
            HStack(spacing: 12) {
                Rectangle()
                    .fill(.separator)
                    .frame(height: 1)
                Text("или")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                Rectangle()
                    .fill(.separator)
                    .frame(height: 1)
            }
            .padding(.vertical, 4)

            // Sign in with Apple
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                // TODO: подключить бэкенд
                print("Apple Sign In:", result)
            }
            .signInWithAppleButtonStyle(.white)
            .frame(height: 60)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(.separator.opacity(0.5), lineWidth: 1)
            )
        }
    }

    // MARK: - PIN-секция

    private var pinSection: some View {
        VStack(spacing: 20) {

            VStack(spacing: 6) {
                Text("Введите код")
                    .font(.title2.bold())

                Text("Код отправлен на")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text(viewModel.email)
                    .font(.subheadline.bold())
                    .foregroundStyle(.primary)
            }
            .multilineTextAlignment(.center)

            // 6 ячеек PIN
            PinInputView(
                pin: $viewModel.pin,
                focusedIndex: $viewModel.pinFocusedIndex,
                isDisabled: viewModel.isPinLoading,
                onDigitEntered: { index, value in
                    viewModel.updatePin(at: index, value: value)
                },
                onBackspace: { index in
                    viewModel.handlePinBackspace(at: index)
                }
            )

            // Ошибка
            if let error = viewModel.error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .transition(.opacity)
            }

            // Загрузка
            if viewModel.isPinLoading {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("Проверяю...")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            Text("Также можно нажать кнопку в письме")
                .font(.caption2)
                .foregroundStyle(.tertiary)

            // Кнопка «Другой email»
            Button {
                withAnimation { viewModel.resetToEmail() }
            } label: {
                Text("Другой email")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 10)
                    .background(.thinMaterial)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule()
                            .strokeBorder(.separator.opacity(0.4), lineWidth: 1)
                    )
            }
        }
    }
}

// MARK: - PinInputView (6 отдельных полей)

struct PinInputView: View {

    @Binding var pin: [String]
    @Binding var focusedIndex: Int?
    let isDisabled: Bool
    let onDigitEntered: (Int, String) -> Void
    let onBackspace: (Int) -> Void

    @FocusState private var focused: Int?

    var body: some View {
        HStack(spacing: 10) {
            ForEach(0..<6, id: \.self) { index in
                TextField("", text: Binding(
                    get: { pin[index] },
                    set: { newValue in
                        onDigitEntered(index, newValue)
                    }
                ))
                .keyboardType(.numberPad)
                .textContentType(.oneTimeCode)
                .multilineTextAlignment(.center)
                .font(.system(size: 24, weight: .bold, design: .monospaced))
                .frame(width: 46, height: 58)
                .background(.thinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(
                            focused == index ? Color.blue : Color(.separator).opacity(0.4),
                            lineWidth: focused == index ? 2 : 1
                        )
                )
                .shadow(
                    color: focused == index ? .blue.opacity(0.2) : .clear,
                    radius: 8
                )
                .focused($focused, equals: index)
                .disabled(isDisabled)
                .opacity(isDisabled ? 0.5 : 1)
            }
        }
        .padding(.vertical, 8)
        .onChange(of: focusedIndex) { _, newValue in
            focused = newValue
        }
        .onAppear {
            focused = focusedIndex
        }
    }
}

#Preview("Email") {
    LoginView(viewModel: AuthViewModel())
}

#Preview("PIN") {
    let vm = AuthViewModel()
    vm.isSent = true
    vm.email = "test@example.com"
    return LoginView(viewModel: vm)
}
