// MonPap iOS — SettingsService
// Аналог settings из frontend/src/api.ts

import Foundation

enum SettingsService {

    static func get() async throws -> UserSettings {
        try await APIClient.shared.request("GET", path: "/settings")
    }

    static func update(_ data: UserSettingsUpdate) async throws -> UserSettings {
        try await APIClient.shared.request("PUT", path: "/settings", body: data)
    }
}
