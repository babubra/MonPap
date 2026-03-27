// MonPap iOS — AuthService
// Аналог auth из frontend/src/api.ts

import Foundation

enum AuthService {

    /// Запрос magic link / PIN-кода
    static func requestLink(email: String) async throws -> MessageResponse {
        try await APIClient.shared.request(
            "POST",
            path: "/auth/request-link",
            body: AuthRequest(email: email)
        )
    }

    /// Верификация magic link токена
    static func verify(token: String) async throws -> TokenResponse {
        try await APIClient.shared.request(
            "GET",
            path: "/auth/verify",
            queryItems: [URLQueryItem(name: "token", value: token)]
        )
    }

    /// Верификация по PIN-коду
    static func verifyPin(email: String, code: String) async throws -> TokenResponse {
        try await APIClient.shared.request(
            "POST",
            path: "/auth/verify-pin",
            body: PinVerifyRequest(email: email, code: code)
        )
    }

    /// Текущий пользователь
    static func me() async throws -> UserResponse {
        try await APIClient.shared.request("GET", path: "/auth/me")
    }

    /// Выход
    static func logout() async throws {
        let _: EmptyResponse = try await APIClient.shared.request("POST", path: "/auth/logout")
    }
}
