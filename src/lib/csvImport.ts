import { supabase } from "@/integrations/supabase/client";
import { GoodreadsCSVRow } from "./csvExport";

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

export const parseGoodreadsCSV = (csvContent: string): GoodreadsCSVRow[] => {
  const lines = csvContent.split("\n").filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: GoodreadsCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row as GoodreadsCSVRow);
  }

  return rows;
};

export const importGoodreadsCSV = async (csvContent: string, userId: string) => {
  const rows = parseGoodreadsCSV(csvContent);
  const errors: string[] = [];
  let imported = 0;

  for (const row of rows) {
    try {
      const shelf = row["Exclusive Shelf"];
      const isRead = shelf === "read";
      const isCurrentlyReading = shelf === "currently-reading";
      const isTBR = shelf === "to-read";

      // Import to appropriate table
      if (isTBR) {
        const { error } = await supabase.from("tbr_books").insert({
          user_id: userId,
          title: row.Title,
          author: row.Author,
          total_pages: row["Number of Pages"] ? parseInt(row["Number of Pages"]) : null,
          notes: row["Private Notes"],
        });
        if (error) errors.push(`TBR: ${row.Title} - ${error.message}`);
        else imported++;
      } else {
        // Insert into books table
        const { data: book, error: bookError } = await supabase
          .from("books")
          .insert({
            user_id: userId,
            title: row.Title,
            author: row.Author,
            total_pages: row["Number of Pages"] ? parseInt(row["Number of Pages"]) : null,
            status: isRead ? "completed" : isCurrentlyReading ? "in_progress" : "to_read",
            started_at: isCurrentlyReading ? new Date().toISOString().split("T")[0] : null,
            finished_at: row["Date Read"] || null,
          })
          .select()
          .single();

        if (bookError) {
          errors.push(`Book: ${row.Title} - ${bookError.message}`);
          continue;
        }

        // If there's a rating or review, add it
        if (row["My Rating"] || row["My Review"]) {
          const { error: reviewError } = await supabase.from("reviews").insert({
            user_id: userId,
            book_id: book.id,
            rating: row["My Rating"] ? parseInt(row["My Rating"]) : null,
            review: row["My Review"] || null,
          });
          if (reviewError) {
            errors.push(`Review for ${row.Title} - ${reviewError.message}`);
          }
        }

        imported++;
      }
    } catch (error: any) {
      errors.push(`${row.Title} - ${error.message}`);
    }
  }

  return { imported, errors };
};
