import { useState, useEffect } from "react";
import { AddBookDialog } from "@/components/AddBookDialog";
import { BookCard } from "@/components/BookCard";
import { AuthDialog } from "@/components/AuthDialog";
import { SocialFeed } from "@/components/SocialFeed";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { BookOpen, TrendingUp, Target, LogOut } from "lucide-react";

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
}

const Index = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const { user, signOut, loading } = useAuth();

  // Load books from Supabase if authenticated, otherwise localStorage
  useEffect(() => {
    if (user) {
      loadBooksFromSupabase();
    } else {
      const savedBooks = localStorage.getItem("reading-tracker-books");
      if (savedBooks) {
        setBooks(JSON.parse(savedBooks));
      }
    }
  }, [user]);

  // Save books to localStorage only if not authenticated
  useEffect(() => {
    if (!user) {
      localStorage.setItem("reading-tracker-books", JSON.stringify(books));
    }
  }, [books, user]);

  const loadBooksFromSupabase = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedBooks = data.map(book => ({
        id: book.id,
        title: book.title,
        author: book.author,
        totalPages: book.total_pages,
        currentPage: book.current_page,
      }));

      setBooks(formattedBooks);
    } catch (error) {
      console.error('Error loading books:', error);
    }
  };

  const handleAddBook = async (bookData: Omit<Book, "id" | "currentPage">) => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('books')
          .insert({
            user_id: user.id,
            title: bookData.title,
            author: bookData.author,
            total_pages: bookData.totalPages,
            current_page: 0,
            is_public: true,
          })
          .select()
          .single();

        if (error) throw error;

        const newBook: Book = {
          id: data.id,
          title: data.title,
          author: data.author,
          totalPages: data.total_pages,
          currentPage: data.current_page,
        };

        setBooks([...books, newBook]);
      } catch (error) {
        console.error('Error adding book:', error);
      }
    } else {
      const newBook: Book = {
        id: Date.now().toString(),
        ...bookData,
        currentPage: 0,
      };
      setBooks([...books, newBook]);
    }
  };

  const handleUpdateProgress = async (id: string, currentPage: number) => {
    if (user) {
      try {
        const { error } = await supabase
          .from('books')
          .update({ current_page: currentPage })
          .eq('id', id);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }

    setBooks(books.map(book => 
      book.id === id ? { ...book, currentPage } : book
    ));
  };

  const totalBooks = books.length;
  const booksInProgress = books.filter(book => book.currentPage > 0 && book.currentPage < book.totalPages).length;
  const completedBooks = books.filter(book => book.currentPage === book.totalPages).length;

  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Page Petal Progress
                </h1>
                <p className="text-sm text-muted-foreground">Track your reading journey with friends</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!user && <AuthDialog />}
              <AddBookDialog onAddBook={handleAddBook} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {user ? (
          <Tabs defaultValue="my-books" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-books">My Books</TabsTrigger>
              <TabsTrigger value="social">Social Feed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-books" className="space-y-8">
              {/* Stats */}
              {totalBooks > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalBooks}</p>
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
                  <p className="text-2xl font-bold text-foreground">{booksInProgress}</p>
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
                  <p className="text-2xl font-bold text-foreground">{completedBooks}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </div>
          </div>
              )}

              {/* Books Grid */}
              {books.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-12 h-12 text-accent-foreground" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">Start Your Reading Journey</h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Add your first book to begin tracking your reading progress and stay motivated with encouraging messages.
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
            </TabsContent>
            
            <TabsContent value="social">
              <SocialFeed />
            </TabsContent>
          </Tabs>
        ) : (
          // Non-authenticated view
          <>
            {/* Stats */}
            {totalBooks > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-lg p-4 shadow-soft border border-border">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalBooks}</p>
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
                      <p className="text-2xl font-bold text-foreground">{booksInProgress}</p>
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
                      <p className="text-2xl font-bold text-foreground">{completedBooks}</p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Books Grid */}
            {books.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                  <BookOpen className="w-12 h-12 text-accent-foreground" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">Start Your Reading Journey</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Add your first book to begin tracking your reading progress and stay motivated with encouraging messages.
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
          </>
        )}
      </main>
    </div>
  );
};

export default Index;