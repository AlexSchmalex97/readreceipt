import { useState, useEffect } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { TrendingUp, Target } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
}

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);

  // Load books from localStorage on component mount
  useEffect(() => {
    const savedBooks = localStorage.getItem("reading-tracker-books");
    if (savedBooks) {
      try {
        setBooks(JSON.parse(savedBooks));
      } catch {
        // ignore corrupted data
      }
    }
  }, []);

  // Save books to localStorage whenever books change
  useEffect(() => {
    localStorage.setItem("reading-tracker-books", JSON.stringify(books));
  }, [books]);

  const handleAddBook = (bookData: Omit<Book, "id" | "currentPage">) => {
    const newBook: Book = {
      id: Date.now().toString(),
      ...bookData,
      currentPage: 0,
    };
    setBooks((prev) => [...prev, newBook]);
  };

  const handleUpdateProgress = (id: string, currentPage: number) => {
    setBooks((prev) =>
      prev.map((book) => (book.id === id ? { ...book, currentPage } : book))
    );
  };

  const totalBooks = books.length;
  const booksInProgress = books.filter(
    (book) => book.currentPage > 0 && book.currentPage < book.totalPages
  ).length;
  const completedBooks = books.filter(
    (book) => book.currentPage === book.totalPages
  ).length;

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* ReadReceipt logo */}
              <img
                src="/assets/readreceipt-logo.png"
                alt="ReadReceipt logo"
                className="w-18 h-18"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ReadReceipt
                </h1>
                <p className="text-sm text-muted-foreground">
                  Track your reading progress and stay motivated
                </p>
              </div>
            </div>
            <AddBookDialog onAddBook={handleAddBook} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        {totalBooks > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  {/* tiny logo in stat tile */}
                  <img
                    src="/assets/readreceipt-logo.png"
                    alt="ReadReceipt logo"
                    className="w-5 h-5"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {totalBooks}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Books</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {booksInProgress}
                  </p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {completedBooks}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Books Grid or Empty State */}
        {books.length === 0 ? (
          <div className="text-center py-16">
            {/* Empty state logo */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <img
                src="/assets/readreceipt-logo.png"
                alt="ReadReceipt logo"
                className="w-45 h-45"
              />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Start Your Reading Journey
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add your first book to begin tracking your reading progress and
              stay motivated with encouraging messages.
            </p>
            <AddBookDialog onAddBook={handleAddBook} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
