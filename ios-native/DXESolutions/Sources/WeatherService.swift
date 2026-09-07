import Foundation

struct WeatherDay: Codable {
    let date: String
    let weatherCode: Int
    let high: Int
    let low: Int
    let precipitationChance: Int?
}

private struct WeatherResponse: Codable {
    let days: [WeatherDay]
}

enum WeatherDisplay {
    static func emoji(for code: Int) -> String {
        switch code {
        case 0: return "☀️"
        case 1: return "🌤️"
        case 2: return "⛅"
        case 3: return "☁️"
        case 45, 48: return "🌫️"
        case 51, 53, 55, 56, 57: return "🌦️"
        case 61, 63, 65, 66, 67: return "🌧️"
        case 71, 73, 75, 77: return "🌨️"
        case 80, 81, 82: return "🌦️"
        case 85, 86: return "🌨️"
        case 95, 96, 99: return "⛈️"
        default: return "🌡️"
        }
    }

    static func label(for code: Int) -> String {
        switch code {
        case 0: return "Clear"
        case 1: return "Mostly Clear"
        case 2: return "Partly Cloudy"
        case 3: return "Overcast"
        case 45, 48: return "Fog"
        case 51, 53, 55, 56, 57: return "Drizzle"
        case 61, 63, 65: return "Rain"
        case 66, 67: return "Freezing Rain"
        case 71, 73, 75, 77: return "Snow"
        case 80, 81, 82: return "Showers"
        case 85, 86: return "Snow Showers"
        case 95, 96, 99: return "Thunderstorm"
        default: return "Unknown"
        }
    }
}

// Fetched from the same server-side proxy the web app uses
// (app/api/weather), which handles the actual Open-Meteo call, the
// firm's location, and 30-minute revalidation — no auth needed here,
// it's not user data.
@MainActor
enum WeatherService {
    private static var cachedDays: [WeatherDay] = []
    private static var cachedAt: Date?

    static func days() async -> [WeatherDay] {
        if let cachedAt, Date().timeIntervalSince(cachedAt) < 600 {
            return cachedDays
        }

        guard let url = URL(string: "api/weather", relativeTo: AppConfig.siteURL) else { return cachedDays }

        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let response = try JSONDecoder().decode(WeatherResponse.self, from: data)
            cachedDays = response.days
            cachedAt = Date()
        } catch {
            // Keep whatever was last cached (possibly empty); the
            // calendar just shows no weather badge for that day.
        }
        return cachedDays
    }

    static func day(for date: Date, in days: [WeatherDay]) -> WeatherDay? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let key = formatter.string(from: date)
        return days.first { $0.date == key }
    }
}
