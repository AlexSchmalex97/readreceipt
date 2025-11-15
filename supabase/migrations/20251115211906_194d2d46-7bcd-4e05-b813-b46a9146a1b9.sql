-- Add 'top_five' as a valid book status
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_status_check;

ALTER TABLE books ADD CONSTRAINT books_status_check 
CHECK (status IN ('in_progress', 'completed', 'dnf', 'top_five'));