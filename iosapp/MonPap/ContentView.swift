// MonPap iOS — Главный экран с навигацией (TabView)
// Будет расширяться по мере добавления экранов в следующих фазах

import SwiftUI

struct ContentView: View {

    var onLogout: () -> Void

    var body: some View {
        TabView {
            // Главная
            HomeView()
                .tabItem {
                    Label("Главная", systemImage: "house.fill")
                }

            // Транзакции
            Text("Транзакции — Фаза 4")
                .tabItem {
                    Label("Операции", systemImage: "list.bullet")
                }

            // Долги
            Text("Долги — Фаза 5")
                .tabItem {
                    Label("Долги", systemImage: "arrow.left.arrow.right")
                }

            // Статистика
            Text("Статистика — Фаза 6")
                .tabItem {
                    Label("Статистика", systemImage: "chart.pie.fill")
                }

            // Настройки
            SettingsStubView(onLogout: onLogout)
                .tabItem {
                    Label("Настройки", systemImage: "gearshape.fill")
                }
        }
        .tint(.blue)
    }
}

// MARK: - Заглушка главного экрана (Фаза 3)

struct HomeStubView: View {

    @State private var summary: TransactionSummary?
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Сводка — тест API
                    if loading {
                        ProgressView("Загрузка...")
                            .padding(.top, 40)
                    } else if let error {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(.orange)
                            Text(error)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                            Button("Повторить") {
                                Task { await loadSummary() }
                            }
                        }
                        .padding(.top, 40)
                    } else if let summary {
                        // Карточка сводки
                        VStack(spacing: 12) {
                            Text(Formatting.monthYear(summary.month))
                                .font(.headline)
                                .foregroundStyle(.secondary)

                            HStack {
                                VStack(alignment: .leading) {
                                    Text("Доходы")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text("+\(Formatting.formatAmount(summary.totalIncome)) ₽")
                                        .font(.title3.bold())
                                        .foregroundStyle(.green)
                                }
                                Spacer()
                                VStack(alignment: .trailing) {
                                    Text("Расходы")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Text("-\(Formatting.formatAmount(summary.totalExpense)) ₽")
                                        .font(.title3.bold())
                                        .foregroundStyle(.red)
                                }
                            }

                            Divider()

                            HStack {
                                Text("Баланс")
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text("\(Formatting.formatAmount(summary.balance)) ₽")
                                    .font(.title3.bold())
                                    .foregroundStyle(
                                        (Double(summary.balance) ?? 0) >= 0 ? .green : .red
                                    )
                            }
                        }
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal)

                        // Информация для разработки
                        VStack(spacing: 8) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(.green)
                            Text("API работает!")
                                .font(.headline)
                            Text("Сетевой слой подключён к бэкенду")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 20)
                    }
                }
            }
            .navigationTitle("MonPap")
            .task {
                await loadSummary()
            }
        }
    }

    private func loadSummary() async {
        loading = true
        error = nil
        do {
            summary = try await TransactionService.summary()
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}

// MARK: - Заглушка настроек (для выхода)

struct SettingsStubView: View {
    var onLogout: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button(role: .destructive) {
                        onLogout()
                    } label: {
                        Label("Выйти из аккаунта", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Настройки")
        }
    }
}

#Preview {
    ContentView(onLogout: {})
}
