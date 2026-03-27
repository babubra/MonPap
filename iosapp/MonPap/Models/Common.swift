// MonPap iOS — Модели: UserSettings, AiParseResult, StatsResponse
// Точное соответствие backend/app/schemas.py и frontend/src/api.ts

import Foundation

// MARK: - UserSettings

struct UserSettings: Codable {
    let id: Int
    let customPrompt: String?
    let theme: String             // "dark" | "light"

    enum CodingKeys: String, CodingKey {
        case id
        case customPrompt = "custom_prompt"
        case theme
    }
}

struct UserSettingsUpdate: Codable {
    var customPrompt: String?
    var theme: String?

    enum CodingKeys: String, CodingKey {
        case customPrompt = "custom_prompt"
        case theme
    }
}

// MARK: - AI Parse Result

struct AiParseResult: Codable {
    let status: String            // "ok" | "incomplete" | "rejected"
    let message: String?
    let missing: [String]?
    let type: String?
    let amount: Double?
    let currency: String?
    let categoryId: Int?
    let categoryName: String?
    let categoryIsNew: Bool?
    let categoryIcon: String?
    let categoryParentName: String?
    let categoryParentId: Int?
    let categoryParentIcon: String?
    let counterpartId: Int?
    let counterpartName: String?
    let counterpartIsNew: Bool?
    let comment: String?
    let date: String?
    let rawText: String?

    enum CodingKeys: String, CodingKey {
        case status, message, missing, type, amount, currency, comment, date
        case categoryId = "category_id"
        case categoryName = "category_name"
        case categoryIsNew = "category_is_new"
        case categoryIcon = "category_icon"
        case categoryParentName = "category_parent_name"
        case categoryParentId = "category_parent_id"
        case categoryParentIcon = "category_parent_icon"
        case counterpartId = "counterpart_id"
        case counterpartName = "counterpart_name"
        case counterpartIsNew = "counterpart_is_new"
        case rawText = "raw_text"
    }
}

// MARK: - Stats

struct CategoryStatsItem: Codable, Identifiable {
    let categoryId: Int?
    let categoryName: String
    let icon: String?
    let total: String

    var id: Int? { categoryId }

    var totalValue: Double {
        Double(total) ?? 0
    }

    enum CodingKeys: String, CodingKey {
        case categoryId = "category_id"
        case categoryName = "category_name"
        case icon, total
    }
}

struct StatsResponse: Codable {
    let items: [CategoryStatsItem]
    let totalSum: String
    let periodFrom: String
    let periodTo: String

    enum CodingKeys: String, CodingKey {
        case items
        case totalSum = "total_sum"
        case periodFrom = "period_from"
        case periodTo = "period_to"
    }
}

// MARK: - Auth

struct AuthRequest: Codable {
    let email: String
}

struct PinVerifyRequest: Codable {
    let email: String
    let code: String
}

struct TokenResponse: Codable {
    let accessToken: String
    let tokenType: String?

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
    }
}

struct UserResponse: Codable {
    let id: Int
    let email: String
}

struct MessageResponse: Codable {
    let message: String
    let token: String?
}
