// MonPap iOS — Форма создания категории (шторка)
// Визуальная форма с emoji-picker, без вложенных окон

import SwiftUI
import SwiftData

struct CategoryCreateSheet: View {

    /// Предзаполненный тип (из формы транзакции)
    let preselectedType: TransactionType

    /// Callback при создании
    let onCreated: (CategoryModel) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @Query(sort: \CategoryModel.name)
    private var allCategories: [CategoryModel]

    // Поля формы
    @State private var name = ""
    @State private var selectedEmoji = "📁"
    @State private var type: TransactionType = .expense
    @State private var selectedParent: CategoryModel?
    @State private var showParentPicker = false

    /// Только корневые категории нужного типа (для выбора родительской)
    private var rootCategories: [CategoryModel] {
        allCategories.filter { $0.type == type && $0.parent == nil }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {

                    // ── Название ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Название")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        TextField("Например: Продукты", text: $name)
                            .font(.title3)
                            .padding(14)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    // ── Тип ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Тип")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        Picker("Тип", selection: $type) {
                            Text("Расход").tag(TransactionType.expense)
                            Text("Доход").tag(TransactionType.income)
                        }
                        .pickerStyle(.segmented)
                    }

                    // ── Родительская категория ──
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Родительская категория")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)

                        Menu {
                            Button("Без родительской") {
                                selectedParent = nil
                            }

                            Divider()

                            ForEach(rootCategories) { category in
                                Button {
                                    selectedParent = category
                                } label: {
                                    Label(category.name, systemImage: "folder")
                                }
                            }
                        } label: {
                            HStack {
                                if let parent = selectedParent {
                                    Text(parent.icon ?? "📁")
                                    Text(parent.name)
                                        .foregroundStyle(.primary)
                                } else {
                                    Text("Без родительской")
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                            .padding(14)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    // ── Иконка (Emoji Picker) ──
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Иконка")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            Spacer()

                            // Превью выбранной иконки
                            Text(selectedEmoji)
                                .font(.system(size: 32))
                                .frame(width: 48, height: 48)
                                .background(Color.accentColor.opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        EmojiPickerView(selectedEmoji: $selectedEmoji)
                            .frame(height: 280)
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .navigationTitle("Новая категория")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Создать") {
                        createCategory()
                    }
                    .fontWeight(.semibold)
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear {
                type = preselectedType
            }
        }
    }

    private func createCategory() {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        let category = CategoryModel(
            name: trimmedName,
            type: type,
            icon: selectedEmoji
        )
        category.parent = selectedParent

        modelContext.insert(category)

        onCreated(category)
        dismiss()
    }
}
