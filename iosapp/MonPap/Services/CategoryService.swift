// MonPap iOS — CategoryService + CounterpartService
// Аналог categories и counterparts из frontend/src/api.ts

import Foundation

// MARK: - CategoryService

enum CategoryService {

    static func list(type: String? = nil) async throws -> [Category] {
        var items: [URLQueryItem] = []
        if let type { items.append(URLQueryItem(name: "type", value: type)) }

        return try await APIClient.shared.request(
            "GET",
            path: "/categories",
            queryItems: items.isEmpty ? nil : items
        )
    }

    static func create(_ data: CategoryCreate) async throws -> Category {
        try await APIClient.shared.request("POST", path: "/categories", body: data)
    }

    static func update(id: Int, data: CategoryUpdate) async throws -> Category {
        try await APIClient.shared.request("PUT", path: "/categories/\(id)", body: data)
    }

    static func delete(id: Int) async throws {
        try await APIClient.shared.requestVoid("DELETE", path: "/categories/\(id)")
    }
}

// MARK: - CounterpartService

enum CounterpartService {

    static func list() async throws -> [Counterpart] {
        try await APIClient.shared.request("GET", path: "/counterparts")
    }

    static func create(_ data: CounterpartCreate) async throws -> Counterpart {
        try await APIClient.shared.request("POST", path: "/counterparts", body: data)
    }

    static func update(id: Int, data: CounterpartUpdate) async throws -> Counterpart {
        try await APIClient.shared.request("PUT", path: "/counterparts/\(id)", body: data)
    }

    static func delete(id: Int) async throws {
        try await APIClient.shared.requestVoid("DELETE", path: "/counterparts/\(id)")
    }
}
