// MonPap iOS — Модели данных: Transaction, TransactionSummary
// Точное соответствие backend/app/schemas.py

import Foundation

// MARK: - Transaction

struct Transaction: Codable, Identifiable, Hashable {
    let id: Int
    let categoryId: Int?
    let categoryName: String?
    let categoryIcon: String?
    let type: String              // "income" | "expense"
    let amount: String            // Decimal приходит как строка из FastAPI
    let currency: String
    let comment: String?
    let rawText: String?
    let clientId: String?
    let transactionDate: String   // "2026-03-15"
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case categoryId = "category_id"
        case categoryName = "category_name"
        case categoryIcon = "category_icon"
        case type, amount, currency, comment
        case rawText = "raw_text"
        case clientId = "client_id"
        case transactionDate = "transaction_date"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    /// Сумма как Double для вычислений
    var amountValue: Double {
        Double(amount) ?? 0
    }
}

struct TransactionCreate: Codable {
    let type: String
    let amount: Double
    let transactionDate: String
    var categoryId: Int?
    var comment: String?
    var rawText: String?
    var clientId: String?
    var currency: String?

    enum CodingKeys: String, CodingKey {
        case type, amount, comment, currency
        case categoryId = "category_id"
        case transactionDate = "transaction_date"
        case rawText = "raw_text"
        case clientId = "client_id"
    }
}

struct TransactionUpdate: Codable {
    var categoryId: Int?
    var type: String?
    var amount: Double?
    var currency: String?
    var comment: String?
    var transactionDate: String?
    var categoryIcon: String?

    enum CodingKeys: String, CodingKey {
        case type, amount, currency, comment
        case categoryId = "category_id"
        case transactionDate = "transaction_date"
        case categoryIcon = "category_icon"
    }
}

// MARK: - TransactionSummary

struct TransactionSummary: Codable {
    let month: String         // "2026-03"
    let totalIncome: String
    let totalExpense: String
    let balance: String

    enum CodingKeys: String, CodingKey {
        case month
        case totalIncome = "total_income"
        case totalExpense = "total_expense"
        case balance
    }
}
