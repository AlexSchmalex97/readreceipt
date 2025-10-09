import { supabase } from "@/integrations/supabase/client";

export interface GoodreadsCSVRow {
  "Book Id": string;
  "Title": string;
  "Author": string;
  "Author l-f": string;
  "Additional Authors": string;
  "ISBN": string;
  "ISBN13": string;
  "My Rating": string;
  "Average Rating": string;
  "Publisher": string;
  "Binding": string;
  "Number of Pages": string;
  "Year Published": string;
  "Original Publication Year": string;
  "Date Read": string;
  "Date Added": string;
  "Bookshelves": string;
  "Bookshelves with positions": string;
  "Exclusive Shelf": string;
  "My Review": string;
  "Spoiler": string;
  "Private Notes": string;
  "Read Count": string;
  "Owned Copies": string;
}

export const exportToGoodreadsCSV = async (userId: string): Promise<string> => {
  // Fetch all books for the user
  const { data: books, error: booksError } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId);

  if (booksError) throw booksError;

  // Fetch all reviews
  const { data: reviews, error: reviewsError } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId);

  if (reviewsError) throw reviewsError;

  // Fetch TBR books
  const { data: tbrBooks, error: tbrError } = await supabase
    .from("tbr_books")
    .select("*")
    .eq("user_id", userId);

  if (tbrError) throw tbrError;

  const rows: GoodreadsCSVRow[] = [];

  // Process regular books
  books?.forEach((book) => {
    const review = reviews?.find((r) => r.book_id === book.id);
    const shelf = book.status === "completed" ? "read" : book.status === "in_progress" ? "currently-reading" : "to-read";
    
    rows.push({
      "Book Id": book.id,
      "Title": book.title,
      "Author": book.author,
      "Author l-f": book.author,
      "Additional Authors": "",
      "ISBN": "",
      "ISBN13": "",
      "My Rating": review?.rating?.toString() || "",
      "Average Rating": "",
      "Publisher": "",
      "Binding": "",
      "Number of Pages": book.total_pages?.toString() || "",
      "Year Published": "",
      "Original Publication Year": "",
      "Date Read": book.finished_at || "",
      "Date Added": book.created_at?.split("T")[0] || "",
      "Bookshelves": shelf,
      "Bookshelves with positions": `${shelf} (#1)`,
      "Exclusive Shelf": shelf,
      "My Review": review?.review || "",
      "Spoiler": "",
      "Private Notes": book.dnf_type ? `DNF Type: ${book.dnf_type}` : "",
      "Read Count": book.finished_at ? "1" : "0",
      "Owned Copies": "0"
    });
  });

  // Process TBR books
  tbrBooks?.forEach((book) => {
    rows.push({
      "Book Id": book.id,
      "Title": book.title,
      "Author": book.author,
      "Author l-f": book.author,
      "Additional Authors": "",
      "ISBN": "",
      "ISBN13": "",
      "My Rating": "",
      "Average Rating": "",
      "Publisher": "",
      "Binding": "",
      "Number of Pages": book.total_pages?.toString() || "",
      "Year Published": "",
      "Original Publication Year": "",
      "Date Read": "",
      "Date Added": book.created_at?.split("T")[0] || "",
      "Bookshelves": "to-read",
      "Bookshelves with positions": "to-read (#1)",
      "Exclusive Shelf": "to-read",
      "My Review": "",
      "Spoiler": "",
      "Private Notes": book.notes || "",
      "Read Count": "0",
      "Owned Copies": "0"
    });
  });

  // Convert to CSV
  const headers = Object.keys(rows[0] || {});
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => {
        const value = row[header as keyof GoodreadsCSVRow];
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = value.replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") ? `"${escaped}"` : escaped;
      }).join(",")
    )
  ].join("\n");

  return csvContent;
};

export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
