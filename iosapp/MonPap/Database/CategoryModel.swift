// MonPap iOS — SwiftData модель: Category (Категория)
// Таблица 1 из 5

import Foundation
import SwiftData

@Model
final class CategoryModel {

    // MARK: - Идентификация

    /// Автоинкрементный ID (SwiftData управляет автоматически через PersistentIdentifier)

    /// ID на сервере — nil если ещё не синхронизировано
    @Attribute(.unique)
    var serverId: Int?

    // MARK: - Данные

    /// Название: «Зарплата», «Продукты», «Транспорт»
    var name: String

    /// Тип: income / expense
    var typeRaw: String

    /// Emoji-иконка: «🍕», «🚗», «💰»
    var icon: String?

    /// Подсказка для AI: «сюда относятся все покупки еды»
    var aiHint: String?

    /// Дата создания
    var createdAt: Date

    // MARK: - Связи

    /// Родительская категория (nil = корневая)
    @Relationship
    var parent: CategoryModel?

    /// Дочерние категории
    @Relationship(deleteRule: .cascade, inverse: \CategoryModel.parent)
    var children: [CategoryModel] = []

    /// Транзакции в этой категории
    @Relationship(deleteRule: .nullify, inverse: \TransactionModel.category)
    var transactions: [TransactionModel] = []

    // MARK: - Вычисляемые свойства

    var type: TransactionType {
        get { TransactionType(rawValue: typeRaw) ?? .expense }
        set { typeRaw = newValue.rawValue }
    }

    // MARK: - Инициализатор

    init(
        name: String,
        type: TransactionType,
        icon: String? = nil,
        aiHint: String? = nil,
        parent: CategoryModel? = nil,
        serverId: Int? = nil
    ) {
        self.name = name
        self.typeRaw = type.rawValue
        self.icon = icon
        self.aiHint = aiHint
        self.parent = parent
        self.serverId = serverId
        self.createdAt = Date()
    }
}
