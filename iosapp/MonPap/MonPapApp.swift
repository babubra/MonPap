// MonPap iOS — Точка входа приложения

import SwiftUI
import SwiftData

@main
struct MonPapApp: App {

    @State private var authViewModel = AuthViewModel()

    var body: some Scene {
        WindowGroup {
            Group {
                if authViewModel.isAuthenticated {
                    ContentView(onLogout: {
                        authViewModel.logout()
                    })
                } else {
                    LoginView(viewModel: authViewModel)
                }
            }
            .animation(.spring(duration: 0.3), value: authViewModel.isAuthenticated)
        }
        .modelContainer(for: [
            CategoryModel.self,
            CounterpartModel.self,
            TransactionModel.self,
            DebtModel.self,
            DebtPaymentModel.self
        ])
    }
}
