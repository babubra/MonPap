// MonPap iOS — TransactionService
// Аналог transactions из frontend/src/api.ts

import Foundation

enum TransactionService {

    /// Список транзакций с фильтрами
    static func list(
        type: String? = nil,
        year: Int? = nil,
        month: Int? = nil,
        dateFrom: String? = nil,
        dateTo: String? = nil,
        categoryIds: [Int]? = nil,
        search: String? = nil,
        limit: Int? = nil,
        offset: Int? = nil
    ) async throws -> [Transaction] {
        var items: [URLQueryItem] = []

        if let type { items.append(URLQueryItem(name: "type", value: type)) }
        if let year { items.append(URLQueryItem(name: "year", value: String(year))) }
        if let month { items.append(URLQueryItem(name: "month", value: String(month))) }
        if let dateFrom { items.append(URLQueryItem(name: "date_from", value: dateFrom)) }
        if let dateTo { items.append(URLQueryItem(name: "date_to", value: dateTo)) }
        if let search { items.append(URLQueryItem(name: "search", value: search)) }
        if let limit { items.append(URLQueryItem(name: "limit", value: String(limit))) }
        if let offset { items.append(URLQueryItem(name: "offset", value: String(offset))) }

        // category_id может быть несколько
        if let categoryIds {
            for id in categoryIds {
                items.append(URLQueryItem(name: "category_id", value: String(id)))
            }
        }

        return try await APIClient.shared.request(
            "GET",
            path: "/transactions",
            queryItems: items.isEmpty ? nil : items
        )
    }

    /// Создать транзакцию
    static func create(_ data: TransactionCreate) async throws -> Transaction {
        try await APIClient.shared.request("POST", path: "/transactions", body: data)
    }

    /// Обновить транзакцию
    static func update(id: Int, data: TransactionUpdate) async throws -> Transaction {
        try await APIClient.shared.request("PUT", path: "/transactions/\(id)", body: data)
    }

    /// Удалить транзакцию
    static func delete(id: Int) async throws {
        try await APIClient.shared.requestVoid("DELETE", path: "/transactions/\(id)")
    }

    /// Сводка за месяц
    static func summary(year: Int? = nil, month: Int? = nil) async throws -> TransactionSummary {
        var items: [URLQueryItem] = []
        if let year { items.append(URLQueryItem(name: "year", value: String(year))) }
        if let month { items.append(URLQueryItem(name: "month", value: String(month))) }

        return try await APIClient.shared.request(
            "GET",
            path: "/transactions/summary",
            queryItems: items.isEmpty ? nil : items
        )
    }
}
