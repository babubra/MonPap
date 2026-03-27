// MonPap iOS — HomeView
// Главный экран: сводка, последние транзакции, шорткаты, панель ввода

import SwiftUI
import SwiftData

struct HomeView: View {

    @Environment(\.modelContext) private var modelContext
    @AppStorage("hideAmounts") private var hideAmounts = false

    // Последние 3 транзакции
    @Query(sort: \TransactionModel.transactionDate, order: .reverse)
    private var allTransactions: [TransactionModel]

    private var recentTransactions: [TransactionModel] {
        Array(allTransactions.prefix(3))
    }

    // Сводка текущего месяца
    private var currentMonthTransactions: [TransactionModel] {
        let calendar = Calendar.current
        let now = Date()
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: now))!
        return allTransactions.filter { $0.transactionDate >= startOfMonth }
    }

    private var totalIncome: Decimal {
        currentMonthTransactions
            .filter { $0.type == .income }
            .reduce(Decimal.zero) { $0 + $1.amount }
    }

    private var totalExpense: Decimal {
        currentMonthTransactions
            .filter { $0.type == .expense }
            .reduce(Decimal.zero) { $0 + $1.amount }
    }

    private var balance: Decimal { totalIncome - totalExpense }

    // Состояние UI
    @State private var inputText = ""
    @State private var showManualTransaction = false
    @State private var showAddDebt = false
    @State private var showAddCategory = false
    @State private var showAddCounterpart = false
    @State private var selectedTransaction: TransactionModel?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView {
                    VStack(spacing: 20) {

                        // ── Карточка сводки ──
                        summaryCard
                            .padding(.horizontal)

                        // ── Последние транзакции ──
                        recentSection
                            .padding(.horizontal)

                        // ── Шорткаты ──
                        shortcutsRow
                            .padding(.horizontal)

                        // Отступ снизу для панели ввода
                        Spacer()
                            .frame(height: 80)
                    }
                    .padding(.top, 8)
                }

                // ── Панель ввода (фикс внизу) ──
                inputBar
            }
            .navigationTitle("MonPap")
            .navigationBarTitleDisplayMode(.large)
            .fullScreenCover(isPresented: $showManualTransaction) {
                ManualTransactionView()
            }
        }
    }

    // MARK: - Карточка сводки

    private var summaryCard: some View {
        VStack(spacing: 16) {
            // Месяц и год
            Text(currentMonthYear)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Доходы и расходы
            HStack(spacing: 0) {
                // Доходы
                VStack(alignment: .leading, spacing: 4) {
                    Text("Доходы")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(hideAmounts ? "•••••" : "+\(Formatting.formatAmount(totalIncome)) ₽")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(.green)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                // Расходы
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Расходы")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(hideAmounts ? "•••••" : "-\(Formatting.formatAmount(totalExpense)) ₽")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(.red)
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
            }

            Divider()

            // Баланс
            HStack {
                Text("Баланс")
                    .foregroundStyle(.secondary)

                Spacer()

                Text(hideAmounts ? "•••••" : "\(Formatting.formatAmount(balance)) ₽")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(balance >= 0 ? .green : .red)
            }
        }
        .padding(20)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    // MARK: - Последние транзакции

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Последние операции")
                .font(.headline)
                .padding(.leading, 4)

            if recentTransactions.isEmpty {
                emptyState
            } else {
                VStack(spacing: 2) {
                    ForEach(recentTransactions) { transaction in
                        transactionRow(transaction)
                            .onTapGesture {
                                selectedTransaction = transaction
                            }
                    }
                }
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func transactionRow(_ tx: TransactionModel) -> some View {
        HStack(spacing: 12) {
            // Иконка категории
            Text(tx.category?.icon ?? "💸")
                .font(.title3)
                .frame(width: 36, height: 36)
                .background(Color(.tertiarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            // Описание + категория + дата
            VStack(alignment: .leading, spacing: 3) {
                Text(tx.comment ?? tx.category?.name ?? "Без описания")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    if let categoryName = tx.category?.name {
                        Text(categoryName)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.tertiarySystemGroupedBackground))
                            .clipShape(Capsule())
                    }

                    Text(Formatting.shortDate(tx.transactionDate))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            // Сумма
            Text(hideAmounts ? "•••" : "\(tx.type == .income ? "+" : "-")\(Formatting.formatAmount(tx.amount)) ₽")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(tx.type == .income ? .green : .red)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Text("Пока нет операций")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("Введите текст внизу для создания")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Шорткаты

    private var shortcutsRow: some View {
        HStack(spacing: 12) {
            shortcutButton(
                title: "Транзакция",
                icon: "plus.circle",
                color: .blue
            ) {
                showManualTransaction = true
            }

            shortcutButton(
                title: "Долг",
                icon: "arrow.left.arrow.right",
                color: .orange
            ) {
                showAddDebt = true
            }

            shortcutButton(
                title: "Категория",
                icon: "folder.badge.plus",
                color: .purple
            ) {
                showAddCategory = true
            }

            shortcutButton(
                title: "Субъект",
                icon: "person.badge.plus",
                color: .teal
            ) {
                showAddCounterpart = true
            }
        }
    }

    private func shortcutButton(
        title: String,
        icon: String,
        color: Color,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundStyle(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Text(title)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Панель ввода

    private var inputBar: some View {
        HStack(alignment: .bottom, spacing: 8) {
            // Многострочное поле
            TextField("Получил 50000 зарплату...", text: $inputText, axis: .vertical)
                .lineLimit(1...4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.tertiarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 20))

            // Микрофон
            Button {
                // TODO: Фаза 3 — запись аудио
            } label: {
                Image(systemName: "mic.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(.secondary)
                    .frame(width: 36, height: 36)
            }

            // Отправить
            Button {
                // TODO: Фаза 3 — AI-парсинг текста
                sendText()
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(inputText.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray : Color.blue)
            }
            .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.bar)
    }

    // MARK: - Helpers

    private var currentMonthYear: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateFormat = "LLLL yyyy"
        return formatter.string(from: Date()).capitalized
    }

    private func sendText() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        // TODO: вызов AI-парсинга
        inputText = ""
    }
}

#Preview {
    HomeView()
        .modelContainer(for: [
            CategoryModel.self,
            TransactionModel.self,
            DebtModel.self,
            DebtPaymentModel.self,
            CounterpartModel.self
        ], inMemory: true)
}
