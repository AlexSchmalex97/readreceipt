import WidgetKit
import SwiftUI

// MARK: - Timeline Provider
struct InProgressBooksProvider: TimelineProvider {
    func placeholder(in context: Context) -> InProgressBooksEntry {
        InProgressBooksEntry(date: Date(), books: Self.placeholderBooks)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (InProgressBooksEntry) -> Void) {
        let books = SharedDataManager.shared.getInProgressBooks()
        let entry = InProgressBooksEntry(date: Date(), books: books.isEmpty ? Self.placeholderBooks : books)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<InProgressBooksEntry>) -> Void) {
        // Get books from cache
        var books = SharedDataManager.shared.getInProgressBooks()
        
        // If cache is empty, try to fetch from Supabase
        if books.isEmpty {
            // In production, fetch from Supabase here
            // For now, use cached data
        }
        
        let entry = InProgressBooksEntry(date: Date(), books: books.isEmpty ? Self.placeholderBooks : books)
        
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    static var placeholderBooks: [BookData] {
        [
            BookData(id: "1", title: "Project Hail Mary", author: "Andy Weir", currentPage: 170, totalPages: 476, coverUrl: nil, status: "in_progress"),
            BookData(id: "2", title: "11/22/63", author: "Stephen King", currentPage: 300, totalPages: 849, coverUrl: nil, status: "in_progress")
        ]
    }
}

// MARK: - Timeline Entry
struct InProgressBooksEntry: TimelineEntry {
    let date: Date
    let books: [BookData]
}

// MARK: - Widget View
struct InProgressBooksWidgetView: View {
    var entry: InProgressBooksProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.95, green: 0.95, blue: 0.97), Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 12) {
                // Header
                HStack {
                    Image(systemName: "book.fill")
                        .foregroundColor(.blue)
                    Text("In Progress")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, 8)
                
                // Books
                if entry.books.isEmpty {
                    emptyState
                } else {
                    booksGrid
                }
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "books.vertical")
                .font(.largeTitle)
                .foregroundColor(.gray)
            Text("No books in progress")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var booksGrid: some View {
        VStack(spacing: 8) {
            ForEach(Array(entry.books.prefix(3).enumerated()), id: \.element.id) { index, book in
                Link(destination: URL(string: "readreceipt://book/\(book.id)")!) {
                    bookRow(book: book)
                }
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
    
    private func bookRow(book: BookData) -> some View {
        HStack(spacing: 10) {
            // Book Cover Placeholder
            if let coverUrl = book.coverUrl, let url = URL(string: coverUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    bookCoverPlaceholder
                }
                .frame(width: 35, height: 50)
                .cornerRadius(4)
            } else {
                bookCoverPlaceholder
            }
            
            // Book Info
            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
                    .foregroundColor(.primary)
                
                Text(book.author)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
                
                HStack(spacing: 4) {
                    Text("\(book.currentPage)")
                        .font(.caption2)
                        .foregroundColor(.blue)
                    Text("of \(book.totalPages)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("(\(Int(book.progressPercentage))%)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
        }
        .padding(8)
        .background(Color.white.opacity(0.5))
        .cornerRadius(8)
    }
    
    private var bookCoverPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(Color.gray.opacity(0.2))
            Image(systemName: "book.fill")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .frame(width: 35, height: 50)
    }
}

// MARK: - Widget Configuration
struct InProgressBooksWidget: Widget {
    let kind: String = "InProgressBooksWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: InProgressBooksProvider()) { entry in
            InProgressBooksWidgetView(entry: entry)
        }
        .configurationDisplayName("In Progress Books")
        .description("View your currently reading books")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Previews
struct InProgressBooksWidget_Previews: PreviewProvider {
    static var previews: some View {
        InProgressBooksWidgetView(entry: InProgressBooksEntry(
            date: Date(),
            books: InProgressBooksProvider.placeholderBooks
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
