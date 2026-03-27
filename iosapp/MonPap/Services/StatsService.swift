// MonPap iOS — StatsService
// Аналог stats из frontend/src/api.ts

import Foundation

enum StatsService {

    static func byCategory(type: String, dateFrom: String, dateTo: String) async throws -> StatsResponse {
        try await APIClient.shared.request(
            "GET",
            path: "/stats/by-category",
            queryItems: [
                URLQueryItem(name: "type", value: type),
                URLQueryItem(name: "date_from", value: dateFrom),
                URLQueryItem(name: "date_to", value: dateTo),
            ]
        )
    }
}
