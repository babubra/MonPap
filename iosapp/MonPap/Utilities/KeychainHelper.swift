// MonPap iOS — KeychainHelper
// Безопасное хранение токена авторизации (замена localStorage из веб-версии)

import Foundation
import Security

enum KeychainHelper {

    private static let service = "com.monpap.ios"

    // MARK: - Токен авторизации

    private static let tokenKey = "auth_token"

    static var authToken: String? {
        get { read(key: tokenKey) }
        set {
            if let value = newValue {
                save(key: tokenKey, value: value)
            } else {
                delete(key: tokenKey)
            }
        }
    }

    static var isAuthenticated: Bool {
        authToken != nil
    }

    // MARK: - PIN-код

    private static let pinKey = "app_pin"

    static var pin: String? {
        get { read(key: pinKey) }
        set {
            if let value = newValue {
                save(key: pinKey, value: value)
            } else {
                delete(key: pinKey)
            }
        }
    }

    static var isPinEnabled: Bool {
        pin != nil
    }

    // MARK: - Приватные методы

    private static func save(key: String, value: String) {
        let data = Data(value.utf8)

        // Удаляем старое значение, если есть
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    private static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    private static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        SecItemDelete(query as CFDictionary)
    }

    /// Удаляет все данные (для логаута)
    static func clearAll() {
        delete(key: tokenKey)
        delete(key: pinKey)
    }
}
