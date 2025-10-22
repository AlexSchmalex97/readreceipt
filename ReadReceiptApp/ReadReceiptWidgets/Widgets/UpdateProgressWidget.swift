import WidgetKit
import SwiftUI
import AppIntents

// MARK: - App Intents for Interactive Buttons (iOS 17+)
@available(iOS 17.0, *)
struct IncrementPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Increment Page"
    static var description = IntentDescription("Increment current page by 1")
    
    func perform() async throws -> some IntentResult {
        guard let book = SharedDataManager.shared.getCurrentBook() else {
            return .result()
        }
        
        let newPage = min(book.currentPage + 1, book.totalPages)
        var updatedBook = book
        updatedBook = BookData(
            id: book.id,
            title: book.title,
            author: book.author,
            currentPage: newPage,
            totalPages: book.totalPages,
            coverUrl: book.coverUrl,
            status: book.status
        )
        
        SharedDataManager.shared.saveCurrentBook(updatedBook)
        
        // Background sync to Supabase will happen in main app
        return .result()
    }
}

@available(iOS 17.0, *)
struct DecrementPageIntent: AppIntent {
    static var title: LocalizedStringResource = "Decrement Page"
    static var description = IntentDescription("Decrement current page by 1")
    
    func perform() async throws -> some IntentResult {
        guard let book = SharedDataManager.shared.getCurrentBook() else {
            return .result()
        }
        
        let newPage = max(book.currentPage - 1, 0)
        var updatedBook = book
        updatedBook = BookData(
            id: book.id,
            title: book.title,
            author: book.author,
            currentPage: newPage,
            totalPages: book.totalPages,
            coverUrl: book.coverUrl,
            status: book.status
        )
        
        SharedDataManager.shared.saveCurrentBook(updatedBook)
        
        return .result()
    }
}

// MARK: - Timeline Provider
struct UpdateProgressProvider: TimelineProvider {
    func placeholder(in context: Context) -> UpdateProgressEntry {
        UpdateProgressEntry(date: Date(), book: Self.placeholderBook)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (UpdateProgressEntry) -> Void) {
        let book = SharedDataManager.shared.getCurrentBook() ?? Self.placeholderBook
        let entry = UpdateProgressEntry(date: Date(), book: book)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<UpdateProgressEntry>) -> Void) {
        let book = SharedDataManager.shared.getCurrentBook() ?? Self.placeholderBook
        let entry = UpdateProgressEntry(date: Date(), book: book)
        
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    static var placeholderBook: BookData {
        BookData(
            id: "1",
            title: "Project Hail Mary",
            author: "Andy Weir",
            currentPage: 170,
            totalPages: 476,
            coverUrl: nil,
            status: "in_progress"
        )
    }
}

// MARK: - Timeline Entry
struct UpdateProgressEntry: TimelineEntry {
    let date: Date
    let book: BookData
}

// MARK: - Widget View
struct UpdateProgressWidgetView: View {
    var entry: UpdateProgressProvider.Entry
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.95, green: 0.95, blue: 0.97), Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(spacing: 0) {
                // Header
                HStack {
                    Image(systemName: "book.pages")
                        .foregroundColor(.blue)
                    Text("Update Progress")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 12)
                .padding(.bottom, 8)
                
                Divider()
                
                // Book Info
                Link(destination: URL(string: "readreceipt://book/\(entry.book.id)")!) {
                    HStack(spacing: 12) {
                        // Book Cover
                        if let coverUrl = entry.book.coverUrl, let url = URL(string: coverUrl) {
                            AsyncImage(url: url) { image in
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } placeholder: {
                                bookCoverPlaceholder
                            }
                            .frame(width: 50, height: 70)
                            .cornerRadius(6)
                        } else {
                            bookCoverPlaceholder
                        }
                        
                        // Book Details
                        VStack(alignment: .leading, spacing: 4) {
                            Text(entry.book.title)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .lineLimit(2)
                                .foregroundColor(.primary)
                            
                            Text(entry.book.author)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            
                            // Progress Bar
                            ProgressView(value: entry.book.progressPercentage, total: 100)
                                .tint(.blue)
                            
                            Text("\(Int(entry.book.progressPercentage))% complete")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 8)
                }
                
                Divider()
                
                // Interactive Controls
                HStack(spacing: 20) {
                    // Decrement Button
                    if #available(iOS 17.0, *) {
                        Button(intent: DecrementPageIntent()) {
                            Image(systemName: "minus.circle.fill")
                                .font(.title2)
                                .foregroundColor(.red)
                        }
                        .buttonStyle(.plain)
                    }
                    
                    // Page Display
                    VStack(spacing: 2) {
                        Text("\(entry.book.currentPage)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("of \(entry.book.totalPages)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    // Increment Button
                    if #available(iOS 17.0, *) {
                        Button(intent: IncrementPageIntent()) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title2)
                                .foregroundColor(.green)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 12)
            }
        }
    }
    
    private var bookCoverPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.gray.opacity(0.2))
            Image(systemName: "book.fill")
                .font(.title3)
                .foregroundColor(.gray)
        }
        .frame(width: 50, height: 70)
    }
}

// MARK: - Widget Configuration
struct UpdateProgressWidget: Widget {
    let kind: String = "UpdateProgressWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UpdateProgressProvider()) { entry in
            UpdateProgressWidgetView(entry: entry)
        }
        .configurationDisplayName("Update Progress")
        .description("Quickly update your reading progress")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Previews
struct UpdateProgressWidget_Previews: PreviewProvider {
    static var previews: some View {
        UpdateProgressWidgetView(entry: UpdateProgressEntry(
            date: Date(),
            book: UpdateProgressProvider.placeholderBook
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
