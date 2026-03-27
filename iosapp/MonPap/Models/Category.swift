// MonPap iOS — Модели данных: Category, Counterpart
// Точное соответствие backend/app/schemas.py

import Foundation

// MARK: - Category

struct Category: Codable, Identifiable, Hashable {
    let id: Int
    let parentId: Int?
    let name: String
    let type: String          // "income" | "expense"
    let icon: String?
    let aiHint: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case parentId = "parent_id"
        case name, type, icon
        case aiHint = "ai_hint"
        case createdAt = "created_at"
    }
}

struct CategoryCreate: Codable {
    let name: String
    let type: String
    var parentId: Int?
    var icon: String?
    var aiHint: String?

    enum CodingKeys: String, CodingKey {
        case name, type
        case parentId = "parent_id"
        case icon
        case aiHint = "ai_hint"
    }
}

struct CategoryUpdate: Codable {
    var name: String?
    var type: String?
    var parentId: Int?
    var icon: String?
    var aiHint: String?

    enum CodingKeys: String, CodingKey {
        case name, type
        case parentId = "parent_id"
        case icon
        case aiHint = "ai_hint"
    }
}

// MARK: - Counterpart

struct Counterpart: Codable, Identifiable, Hashable {
    let id: Int
    let name: String
    let icon: String?
    let aiHint: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, name, icon
        case aiHint = "ai_hint"
        case createdAt = "created_at"
    }
}

struct CounterpartCreate: Codable {
    let name: String
    var icon: String?
    var aiHint: String?

    enum CodingKeys: String, CodingKey {
        case name, icon
        case aiHint = "ai_hint"
    }
}

struct CounterpartUpdate: Codable {
    var name: String?
    var icon: String?
    var aiHint: String?

    enum CodingKeys: String, CodingKey {
        case name, icon
        case aiHint = "ai_hint"
    }
}
