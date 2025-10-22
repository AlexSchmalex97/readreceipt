import Foundation

// MARK: - Book Model
struct BookData: Codable, Identifiable {
    let id: String
    let title: String
    let author: String
    let currentPage: Int
    let totalPages: Int
    let coverUrl: String?
    let status: String
    
    var progressPercentage: Double {
        guard totalPages > 0 else { return 0 }
        return Double(currentPage) / Double(totalPages) * 100
    }
    
    enum CodingKeys: String, CodingKey {
        case id, title, author, status
        case currentPage = "current_page"
        case totalPages = "total_pages"
        case coverUrl = "cover_url"
    }
}

// MARK: - Reading Goal Model
struct ReadingGoalData: Codable {
    let goalCount: Int
    let completedCount: Int
    let year: Int
    
    var progressPercentage: Double {
        guard goalCount > 0 else { return 0 }
        return Double(completedCount) / Double(goalCount) * 100
    }
    
    enum CodingKeys: String, CodingKey {
        case year
        case goalCount = "goal_count"
        case completedCount = "completed_count"
    }
}
