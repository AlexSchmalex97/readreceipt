-- Add display_order column to books table for custom ordering
ALTER TABLE books ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_books_display_order ON books(user_id, display_order);