-- Add foreign key constraints for proper relationships
ALTER TABLE reading_progress 
ADD CONSTRAINT reading_progress_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

ALTER TABLE reviews 
ADD CONSTRAINT reviews_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;