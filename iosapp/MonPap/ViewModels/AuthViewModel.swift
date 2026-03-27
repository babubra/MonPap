// MonPap iOS — AuthViewModel
// Управляет состоянием авторизации (аналог логики из Login.tsx + App.tsx)

import Foundation
import SwiftUI

@Observable
final class AuthViewModel {

    // Состояние формы
    var email = ""
    var pin = Array(repeating: "", count: 6)
    var pinFocusedIndex: Int? = 0

    // Состояние процесса
    var isLoading = false
    var isSent = false
    var isPinLoading = false
    var error: String?

    // Результат
    var isAuthenticated = KeychainHelper.isAuthenticated

    // MARK: - Валидация

    var isEmailValid: Bool {
        let trimmed = email.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return false }
        // RFC 5322 упрощённый паттерн
        let pattern = #"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"#
        return trimmed.range(of: pattern, options: .regularExpression) != nil
    }

    // MARK: - Запрос magic link / PIN

    func requestLink() async {
        guard isEmailValid else {
            error = "Введите корректный email"
            return
        }

        isLoading = true
        error = nil

        do {
            let result = try await AuthService.requestLink(email: email.trimmingCharacters(in: .whitespaces))

            // DEV_MODE: токен может прийти сразу
            if let token = result.token {
                KeychainHelper.authToken = token
                isAuthenticated = true
                return
            }

            isSent = true
            pinFocusedIndex = 0
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Ввод PIN

    func updatePin(at index: Int, value: String) {
        // Только последняя цифра
        let digit = value.filter(\.isNumber).suffix(1)
        pin[index] = String(digit)

        if !digit.isEmpty && index < 5 {
            pinFocusedIndex = index + 1
        }

        // Автоотправка когда все 6 цифр введены
        let code = pin.joined()
        if code.count == 6 {
            Task { await verifyPin(code: code) }
        }
    }

    func handlePinBackspace(at index: Int) {
        if pin[index].isEmpty && index > 0 {
            pinFocusedIndex = index - 1
        }
    }

    func handlePinPaste(_ text: String) {
        let digits = text.filter(\.isNumber).prefix(6)
        if digits.count == 6 {
            pin = digits.map { String($0) }
            pinFocusedIndex = 5
            Task { await verifyPin(code: String(digits)) }
        }
    }

    // MARK: - Верификация PIN

    func verifyPin(code: String) async {
        guard code.count == 6 else { return }

        isPinLoading = true
        error = nil

        do {
            let result = try await AuthService.verifyPin(
                email: email.trimmingCharacters(in: .whitespaces),
                code: code
            )
            KeychainHelper.authToken = result.accessToken
            isAuthenticated = true
        } catch {
            self.error = error.localizedDescription
            // Очищаем PIN при ошибке
            pin = Array(repeating: "", count: 6)
            pinFocusedIndex = 0
        }

        isPinLoading = false
    }

    // MARK: - Сброс

    func resetToEmail() {
        isSent = false
        email = ""
        pin = Array(repeating: "", count: 6)
        error = nil
        isLoading = false
        isPinLoading = false
    }

    func logout() {
        KeychainHelper.clearAll()
        isAuthenticated = false
        resetToEmail()
    }
}
