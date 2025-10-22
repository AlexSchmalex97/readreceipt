import Foundation

/// Service to fetch data from Supabase backend
class SupabaseService {
    static let shared = SupabaseService()
    
    // These should match your Supabase project settings
    private let supabaseURL = "YOUR_SUPABASE_URL" // Replace with actual URL
    private let supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY" // Replace with actual key
    
    // MARK: - Fetch In Progress Books
    func fetchInProgressBooks(userId: String) async throws -> [BookData] {
        let endpoint = "\(supabaseURL)/rest/v1/books"
        let query = "?user_id=eq.\(userId)&status=eq.in_progress&order=created_at.desc&limit=3"
        
        guard let url = URL(string: endpoint + query) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let books = try JSONDecoder().decode([BookData].self, from: data)
        return books
    }
    
    // MARK: - Fetch Reading Goal
    func fetchReadingGoal(userId: String) async throws -> ReadingGoalData? {
        let currentYear = Calendar.current.component(.year, from: Date())
        let endpoint = "\(supabaseURL)/rest/v1/reading_goals"
        let query = "?user_id=eq.\(userId)&year=eq.\(currentYear)&limit=1"
        
        guard let url = URL(string: endpoint + query) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let goals = try JSONDecoder().decode([ReadingGoalData].self, from: data)
        return goals.first
    }
    
    // MARK: - Update Book Progress
    func updateBookProgress(bookId: String, newPage: Int) async throws {
        let endpoint = "\(supabaseURL)/rest/v1/books"
        let query = "?id=eq.\(bookId)"
        
        guard let url = URL(string: endpoint + query) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "apikey")
        request.setValue(supabaseAnonKey, forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        
        let body = ["current_page": newPage]
        request.httpBody = try JSONEncoder().encode(body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}
