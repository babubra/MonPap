// MonPap iOS — Базовый HTTP-клиент
// Аналог request() из frontend/src/api.ts

import Foundation

/// Ошибка API с HTTP-статусом
struct APIError: LocalizedError {
    let message: String
    let statusCode: Int

    var errorDescription: String? { message }
}

/// Колбэк при 401 (логаут)
protocol APIClientDelegate: AnyObject {
    func apiClientDidReceiveUnauthorized()
}

/// Центральный HTTP-клиент для общения с бэкендом MonPap
final class APIClient {

    static let shared = APIClient()

    weak var delegate: APIClientDelegate?

    /// Базовый URL бэкенда. В dev — localhost, в prod — серверный адрес.
    var baseURL: String {
        #if DEBUG
        // Симулятор использует localhost Mac'а
        return "http://localhost:8000/api"
        #else
        return "https://monpap.mooo.com/api"
        #endif
    }

    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    // MARK: - Основной метод запроса

    /// Выполняет HTTP-запрос и декодирует ответ
    func request<T: Decodable>(
        _ method: String,
        path: String,
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) async throws -> T {
        let request = try buildRequest(method: method, path: path, body: body, queryItems: queryItems)
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError(message: "Неверный ответ сервера", statusCode: 0)
        }

        // 401 — разлогиниваем
        if httpResponse.statusCode == 401 {
            KeychainHelper.authToken = nil
            await MainActor.run {
                delegate?.apiClientDidReceiveUnauthorized()
            }
            throw APIError(message: "Требуется авторизация", statusCode: 401)
        }

        // 204 No Content
        if httpResponse.statusCode == 204 {
            // Для Void-ответов используем EmptyResponse
            if let empty = EmptyResponse() as? T {
                return empty
            }
            throw APIError(message: "Пустой ответ", statusCode: 204)
        }

        // Ошибки
        if httpResponse.statusCode >= 400 {
            let errorMessage = parseErrorMessage(data: data, statusCode: httpResponse.statusCode)
            throw APIError(message: errorMessage, statusCode: httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError(
                message: "Ошибка декодирования: \(error.localizedDescription)",
                statusCode: httpResponse.statusCode
            )
        }
    }

    /// Запрос без декодирования ответа (DELETE и т.д.)
    func requestVoid(
        _ method: String,
        path: String,
        body: (any Encodable)? = nil
    ) async throws {
        let _: EmptyResponse = try await request(method, path: path, body: body)
    }

    // MARK: - Multipart (для AI и аудио)

    /// Отправка multipart/form-data (текст)
    func requestMultipart<T: Decodable>(
        path: String,
        fields: [String: String],
        fileField: String? = nil,
        fileData: Data? = nil,
        fileName: String? = nil,
        mimeType: String? = nil
    ) async throws -> T {
        let boundary = UUID().uuidString

        let urlComponents = URLComponents(string: baseURL + path)!
        let url = urlComponents.url!

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = KeychainHelper.authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        var bodyData = Data()

        // Текстовые поля
        for (key, value) in fields {
            bodyData.append("--\(boundary)\r\n".data(using: .utf8)!)
            bodyData.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n".data(using: .utf8)!)
            bodyData.append("\(value)\r\n".data(using: .utf8)!)
        }

        // Файл (аудио)
        if let fileField, let fileData, let fileName, let mimeType {
            bodyData.append("--\(boundary)\r\n".data(using: .utf8)!)
            bodyData.append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
            bodyData.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
            bodyData.append(fileData)
            bodyData.append("\r\n".data(using: .utf8)!)
        }

        bodyData.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = bodyData

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError(message: "Неверный ответ сервера", statusCode: 0)
        }

        if httpResponse.statusCode == 401 {
            KeychainHelper.authToken = nil
            await MainActor.run {
                delegate?.apiClientDidReceiveUnauthorized()
            }
            throw APIError(message: "Требуется авторизация", statusCode: 401)
        }

        if httpResponse.statusCode >= 400 {
            let errorMessage = parseErrorMessage(data: data, statusCode: httpResponse.statusCode)
            throw APIError(message: errorMessage, statusCode: httpResponse.statusCode)
        }

        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Вспомогательные методы

    private func buildRequest(
        method: String,
        path: String,
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil
    ) throws -> URLRequest {
        var urlComponents = URLComponents(string: baseURL + path)!

        if let queryItems, !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }

        guard let url = urlComponents.url else {
            throw APIError(message: "Неверный URL: \(path)", statusCode: 0)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        // Авторизация
        if let token = KeychainHelper.authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // JSON-тело
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            let encoder = JSONEncoder()
            request.httpBody = try encoder.encode(body)
        }

        return request
    }

    /// Парсит сообщение об ошибке из ответа (аналог логики из api.ts)
    private func parseErrorMessage(data: Data, statusCode: Int) -> String {
        // Пробуем {"detail": "строка"}
        if let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            if let detail = dict["detail"] as? String {
                return detail
            }
            // {"detail": [{"msg": "..."}]}
            if let details = dict["detail"] as? [[String: Any]] {
                let messages = details.compactMap { $0["msg"] as? String }
                if !messages.isEmpty {
                    return messages.joined(separator: "; ")
                }
            }
        }
        return "Ошибка \(statusCode)"
    }
}

// MARK: - EmptyResponse (для 204 и DELETE)

struct EmptyResponse: Codable {}
