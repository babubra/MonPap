# Перенос MonPap на нативное iOS-приложение (Swift/SwiftUI)

## Описание

Поэтапный перенос MonPap — приложения для персонального учёта финансов — с текущего стека (React/Vite + FastAPI) на нативное iOS-приложение на Swift/SwiftUI. Бэкенд остаётся без изменений, iOS-приложение общается с ним через REST API.

> Каждая фаза согласовывается отдельно. Каждый этап завершается рабочим состоянием для тестирования в симуляторе.

## Архитектура

| Решение | Выбор |
|---------|-------|
| UI | SwiftUI |
| Архитектура | MVVM + @Observable |
| Навигация | NavigationStack + TabView |
| Сетевой слой | URLSession + async/await |
| Токен | Keychain |
| PIN/Биометрия | LocalAuthentication |
| Аудиозапись | AVFoundation |

## Фазы

### Фаза 1: Фундамент ✅ (в работе)
- Xcode-проект, сетевой слой (APIClient), модели данных, KeychainHelper

### Фаза 2: Авторизация
- LoginView, AuthViewModel, LockScreenView (PIN + Face ID)

### Фаза 3: Главный экран
- HomeView, SummaryCard, AIInputBar, ParsePreviewSheet

### Фаза 4: Транзакции
- TransactionsView, TransactionDetailSheet, ManualTransactionSheet, CategoryFilterView

### Фаза 5: Долги
- DebtsView, DebtEditSheet, DebtPaymentSheet

### Фаза 6: Статистика
- StatsView (Charts framework)

### Фаза 7: Справочники
- ReferencesView, CategoryEditSheet, CounterpartEditSheet

### Фаза 8: Настройки
- SettingsView (тема, промт, PIN, Face ID, выход)

### Фаза 9: Полировка
- Анимации, темы, адаптация

## Соответствие React → Swift

| React | Swift | Фаза |
|-------|-------|------|
| `api.ts` → `request()` | `APIClient.swift` | 1 |
| Интерфейсы из `api.ts` | `Models/*.swift` | 1 |
| `Login.tsx` | `LoginView.swift` | 2 |
| `LockScreen.tsx` | `LockScreenView.swift` | 2 |
| `Home.tsx` | `HomeView.swift` | 3 |
| `ParsePreview.tsx` | `ParsePreviewSheet.swift` | 3 |
| `TransactionList.tsx` | `TransactionsView.swift` | 4 |
| `Debts.tsx` | `DebtsView.swift` | 5 |
| `Stats.tsx` | `StatsView.swift` | 6 |
| `References.tsx` | `ReferencesView.swift` | 7 |
| `Settings.tsx` | `SettingsView.swift` | 8 |
