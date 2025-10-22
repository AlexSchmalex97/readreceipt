import Foundation

/// Manages shared data between the app and widgets using App Groups
class SharedDataManager {
    static let shared = SharedDataManager()
    
    // App Group identifier - must match in entitlements
    private let appGroupID = "group.app.lovable.cee96301737a4542a6bb93de6bf7e75c"
    
    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }
    
    // MARK: - Keys
    private enum Keys {
        static let inProgressBooks = "inProgressBooks"
        static let currentBook = "currentBook"
        static let readingGoal = "readingGoal"
        static let lastSync = "lastSync"
    }
    
    // MARK: - In Progress Books
    func saveInProgressBooks(_ books: [BookData]) {
        guard let data = try? JSONEncoder().encode(books) else { return }
        userDefaults?.set(data, forKey: Keys.inProgressBooks)
        updateLastSyncTime()
    }
    
    func getInProgressBooks() -> [BookData] {
        guard let data = userDefaults?.data(forKey: Keys.inProgressBooks),
              let books = try? JSONDecoder().decode([BookData].self, from: data) else {
            return []
        }
        return books
    }
    
    // MARK: - Current Book
    func saveCurrentBook(_ book: BookData?) {
        if let book = book, let data = try? JSONEncoder().encode(book) {
            userDefaults?.set(data, forKey: Keys.currentBook)
        } else {
            userDefaults?.removeObject(forKey: Keys.currentBook)
        }
        updateLastSyncTime()
    }
    
    func getCurrentBook() -> BookData? {
        guard let data = userDefaults?.data(forKey: Keys.currentBook),
              let book = try? JSONDecoder().decode(BookData.self, from: data) else {
            return nil
        }
        return book
    }
    
    // MARK: - Reading Goal
    func saveReadingGoal(_ goal: ReadingGoalData?) {
        if let goal = goal, let data = try? JSONEncoder().encode(goal) {
            userDefaults?.set(data, forKey: Keys.readingGoal)
        } else {
            userDefaults?.removeObject(forKey: Keys.readingGoal)
        }
        updateLastSyncTime()
    }
    
    func getReadingGoal() -> ReadingGoalData? {
        guard let data = userDefaults?.data(forKey: Keys.readingGoal),
              let goal = try? JSONDecoder().decode(ReadingGoalData.self, from: data) else {
            return nil
        }
        return goal
    }
    
    // MARK: - Last Sync Time
    private func updateLastSyncTime() {
        userDefaults?.set(Date(), forKey: Keys.lastSync)
    }
    
    func getLastSyncTime() -> Date? {
        userDefaults?.object(forKey: Keys.lastSync) as? Date
    }
}
