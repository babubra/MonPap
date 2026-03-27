// MonPap iOS — AIService
// Аналог ai из frontend/src/api.ts

import Foundation

enum AIService {

    /// Парсинг текстового описания транзакции
    static func parse(text: String) async throws -> AiParseResult {
        try await APIClient.shared.requestMultipart(
            path: "/ai/parse",
            fields: ["text": text]
        )
    }

    /// Парсинг аудиозаписи
    static func parseAudio(data: Data, mimeType: String = "audio/m4a") async throws -> AiParseResult {
        try await APIClient.shared.requestMultipart(
            path: "/ai/parse-audio",
            fields: [:],
            fileField: "audio",
            fileData: data,
            fileName: "recording.m4a",
            mimeType: mimeType
        )
    }
}
