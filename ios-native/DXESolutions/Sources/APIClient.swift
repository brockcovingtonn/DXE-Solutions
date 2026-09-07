import Foundation

// For admin write operations that go through Next.js API routes (not
// direct Supabase) because they also log activity and email clients —
// side effects that can't happen from the native client directly. Those
// routes now accept a Bearer token as an alternative to the cookie
// session the web app uses (see lib/supabase-server.js getRequestClient).
enum APIError: LocalizedError {
    case unauthorized
    case server(String)

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Not signed in."
        case .server(let message): return message
        }
    }
}

private struct APIErrorBody: Decodable { let error: String? }
struct APISuccess: Decodable { let success: Bool? }

enum APIClient {
    private static func perform<Body: Encodable>(_ path: String, method: String, body: Body) async throws -> Data {
        guard let session = try? await SupabaseConfig.client.auth.session else {
            throw APIError.unauthorized
        }

        var request = URLRequest(url: AppConfig.siteURL.appendingPathComponent(path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorBody.self, from: data))?.error ?? "Server error."
            throw APIError.server(message)
        }
        return data
    }

    static func send<Body: Encodable>(_ path: String, method: String, body: Body) async throws {
        _ = try await perform(path, method: method, body: body)
    }

    static func sendDecoding<Body: Encodable, Response: Decodable>(
        _ path: String,
        method: String,
        body: Body
    ) async throws -> Response {
        let data = try await perform(path, method: method, body: body)
        return try JSONDecoder().decode(Response.self, from: data)
    }

    static func get<Response: Decodable>(_ path: String) async throws -> Response {
        guard let session = try? await SupabaseConfig.client.auth.session else {
            throw APIError.unauthorized
        }

        var request = URLRequest(url: AppConfig.siteURL.appendingPathComponent(path))
        request.httpMethod = "GET"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(APIErrorBody.self, from: data))?.error ?? "Server error."
            throw APIError.server(message)
        }
        return try JSONDecoder().decode(Response.self, from: data)
    }
}
