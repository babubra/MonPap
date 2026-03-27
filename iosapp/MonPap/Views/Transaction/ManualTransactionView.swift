// MonPap iOS — Форма ручного добавления транзакции
// Полноэкранный модал с встроенным списком категорий

import SwiftUI
import SwiftData

struct ManualTransactionView: View {

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    // Категории из БД
    @Query(sort: \CategoryModel.name)
    private var allCategories: [CategoryModel]

    // Поля формы
    @State private var type: TransactionType = .expense
    @State private var amountText = ""
    @State private var comment = ""
    @State private var transactionDate = Date()
    @State private var selectedCategory: CategoryModel?

    // UI состояние
    @State private var showCategoryCreate = false
    @State private var isSaving = false
    @State private var categoriesExpanded = true

    @FocusState private var amountFocused: Bool

    /// Корневые категории нужного типа
    private var rootCategories: [CategoryModel] {
        allCategories.filter { $0.type == type && $0.parent == nil }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {

                    // ── Тип транзакции ──
                    Picker("Тип", selection: $type) {
                        Text("Расход").tag(TransactionType.expense)
                        Text("Доход").tag(TransactionType.income)
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: type) {
                        selectedCategory = nil
                    }

                    // ── Сумма ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Сумма")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        HStack(alignment: .center) {
                            TextField("0", text: $amountText)
                                .keyboardType(.decimalPad)
                                .font(.system(size: 40, weight: .bold, design: .rounded))
                                .multilineTextAlignment(.center)
                                .focused($amountFocused)

                            Text("₽")
                                .font(.system(size: 30, weight: .medium, design: .rounded))
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 8)
                    }

                    // ── Категория ──
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Категория")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            Spacer()

                            Button {
                                showCategoryCreate = true
                            } label: {
                                Label("Новая", systemImage: "plus.circle.fill")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                        }

                        // Встроенный список категорий
                        if rootCategories.isEmpty {
                            Text("Нет категорий")
                                .font(.subheadline)
                                .foregroundStyle(.tertiary)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color(.secondarySystemGroupedBackground))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            VStack(spacing: 0) {
                                ForEach(rootCategories) { category in
                                    // Родительская категория
                                    categoryRowButton(category, indent: 0)

                                    // Дочерние
                                    ForEach(category.children) { child in
                                        categoryRowButton(child, indent: 1)
                                    }
                                }
                            }
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    // ── Дата ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Дата")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        DatePicker(
                            "",
                            selection: $transactionDate,
                            displayedComponents: .date
                        )
                        .datePickerStyle(.compact)
                        .environment(\.locale, Locale(identifier: "ru_RU"))
                        .labelsHidden()
                    }

                    // ── Комментарий ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Комментарий")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        TextField("Необязательно", text: $comment)
                            .padding(14)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 40)
            }
            .navigationTitle("Новая транзакция")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        saveTransaction()
                    }
                    .fontWeight(.semibold)
                    .disabled(!isFormValid || isSaving)
                }
            }
            .sheet(isPresented: $showCategoryCreate) {
                CategoryCreateSheet(preselectedType: type) { newCategory in
                    selectedCategory = newCategory
                }
                .presentationDetents([.large])
            }
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    amountFocused = true
                }
            }
        }
    }

    // MARK: - Строка категории

    private func categoryRowButton(_ category: CategoryModel, indent: Int) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                selectedCategory = category
            }
        } label: {
            HStack(spacing: 10) {
                Text(category.icon ?? "📁")
                    .font(.title3)

                Text(category.name)
                    .font(.subheadline)
                    .foregroundStyle(.primary)

                Spacer()

                if selectedCategory?.id == category.id {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.blue)
                        .font(.system(size: 18))
                }
            }
            .padding(.horizontal, 16)
            .padding(.leading, CGFloat(indent) * 28)
            .padding(.vertical, 11)
            .contentShape(Rectangle())
            .background(
                selectedCategory?.id == category.id
                    ? Color.accentColor.opacity(0.08)
                    : Color.clear
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Валидация

    private var isFormValid: Bool {
        guard let amount = Decimal(string: amountText), amount > 0 else {
            return false
        }
        return true
    }

    // MARK: - Сохранение

    private func saveTransaction() {
        guard let amount = Decimal(string: amountText), amount > 0 else { return }

        isSaving = true

        let transaction = TransactionModel(
            type: type,
            amount: amount,
            transactionDate: transactionDate,
            comment: comment.isEmpty ? nil : comment,
            category: selectedCategory
        )

        modelContext.insert(transaction)

        do {
            try modelContext.save()
            dismiss()
        } catch {
            isSaving = false
        }
    }
}

#Preview {
    ManualTransactionView()
        .modelContainer(for: [
            CategoryModel.self,
            TransactionModel.self
        ], inMemory: true)
}
