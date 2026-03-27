// MonPap iOS — DebtService
// Аналог debts из frontend/src/api.ts

import Foundation

enum DebtService {

    /// Список долгов
    static func list(isClosed: Bool? = nil, direction: String? = nil) async throws -> [Debt] {
        var items: [URLQueryItem] = []
        if let isClosed { items.append(URLQueryItem(name: "is_closed", value: String(isClosed))) }
        if let direction { items.append(URLQueryItem(name: "direction", value: direction)) }

        return try await APIClient.shared.request(
            "GET",
            path: "/debts",
            queryItems: items.isEmpty ? nil : items
        )
    }

    /// Создать долг
    static func create(_ data: DebtCreate) async throws -> Debt {
        try await APIClient.shared.request("POST", path: "/debts", body: data)
    }

    /// Обновить долг
    static func update(id: Int, data: DebtUpdate) async throws -> Debt {
        try await APIClient.shared.request("PUT", path: "/debts/\(id)", body: data)
    }

    /// Удалить долг
    static func delete(id: Int) async throws {
        try await APIClient.shared.requestVoid("DELETE", path: "/debts/\(id)")
    }

    /// Добавить платёж к долгу
    static func addPayment(debtId: Int, data: DebtPaymentCreate) async throws -> DebtPayment {
        try await APIClient.shared.request("POST", path: "/debts/\(debtId)/payments", body: data)
    }
}
