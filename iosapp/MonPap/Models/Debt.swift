// MonPap iOS — Модели данных: Debt, DebtPayment
// Точное соответствие backend/app/schemas.py

import Foundation

// MARK: - DebtPayment

struct DebtPayment: Codable, Identifiable, Hashable {
    let id: Int
    let debtId: Int
    let amount: String
    let paymentDate: String
    let comment: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case debtId = "debt_id"
        case amount
        case paymentDate = "payment_date"
        case comment
        case createdAt = "created_at"
    }

    var amountValue: Double {
        Double(amount) ?? 0
    }
}

struct DebtPaymentCreate: Codable {
    let amount: Double
    let paymentDate: String
    var comment: String?

    enum CodingKeys: String, CodingKey {
        case amount
        case paymentDate = "payment_date"
        case comment
    }
}

// MARK: - Debt

struct Debt: Codable, Identifiable, Hashable {
    let id: Int
    let counterpartId: Int?
    let counterpartName: String?
    let direction: String         // "gave" | "took"
    let amount: String
    let paidAmount: String
    let currency: String
    let comment: String?
    let rawText: String?
    let clientId: String?
    let debtDate: String
    let isClosed: Bool
    let createdAt: String
    let updatedAt: String
    let payments: [DebtPayment]

    enum CodingKeys: String, CodingKey {
        case id
        case counterpartId = "counterpart_id"
        case counterpartName = "counterpart_name"
        case direction, amount
        case paidAmount = "paid_amount"
        case currency, comment
        case rawText = "raw_text"
        case clientId = "client_id"
        case debtDate = "debt_date"
        case isClosed = "is_closed"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case payments
    }

    var amountValue: Double {
        Double(amount) ?? 0
    }

    var paidAmountValue: Double {
        Double(paidAmount) ?? 0
    }

    /// Остаток долга
    var remainingAmount: Double {
        amountValue - paidAmountValue
    }
}

struct DebtCreate: Codable {
    let direction: String
    let amount: Double
    let debtDate: String
    var counterpartId: Int?
    var comment: String?
    var clientId: String?
    var currency: String?

    enum CodingKeys: String, CodingKey {
        case direction, amount, comment, currency
        case debtDate = "debt_date"
        case counterpartId = "counterpart_id"
        case clientId = "client_id"
    }
}

struct DebtUpdate: Codable {
    var counterpartId: Int?
    var direction: String?
    var amount: Double?
    var currency: String?
    var comment: String?
    var debtDate: String?
    var isClosed: Bool?

    enum CodingKeys: String, CodingKey {
        case direction, amount, currency, comment
        case counterpartId = "counterpart_id"
        case debtDate = "debt_date"
        case isClosed = "is_closed"
    }
}
