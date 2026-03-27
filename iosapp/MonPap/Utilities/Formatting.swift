// MonPap iOS — Утилиты форматирования дат и сумм

import Foundation

enum Formatting {

    // MARK: - Суммы

    /// Форматирует строковую сумму как "12 345.67"
    static func formatAmount(_ value: String) -> String {
        guard let number = Double(value) else { return value }
        return formatAmount(number)
    }

    /// Форматирует числовую сумму
    static func formatAmount(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = " "
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: abs(value))) ?? String(format: "%.2f", abs(value))
    }

    /// Форматирует Decimal сумму
    static func formatAmount(_ value: Decimal) -> String {
        formatAmount(Double(truncating: value as NSDecimalNumber))
    }

    // MARK: - Даты

    private static let isoDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "ru_RU")
        return f
    }()

    private static let isoDateTimeFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    /// Парсит строку "2026-03-15" в Date
    static func parseDate(_ string: String) -> Date? {
        isoDateFormatter.date(from: string)
    }

    /// Форматирует дату как "15 мар."
    static func shortDate(_ string: String) -> String {
        guard let date = parseDate(string) else { return string }
        return shortDate(date)
    }

    /// Форматирует Date как "15 мар."
    static func shortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "d MMM"
        return formatter.string(from: date)
    }

    /// Форматирует дату как "15 марта 2026"
    static func fullDate(_ string: String) -> String {
        guard let date = parseDate(string) else { return string }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateStyle = .long
        return formatter.string(from: date)
    }

    /// Форматирует месяц из "2026-03" как "март 2026"
    static func monthYear(_ string: String) -> String {
        let dateString = string + "-01"
        guard let date = parseDate(dateString) else { return string }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "LLLL yyyy"
        return formatter.string(from: date)
    }

    /// Текущая дата в формате "2026-03-15"
    static var todayString: String {
        isoDateFormatter.string(from: Date())
    }
}
