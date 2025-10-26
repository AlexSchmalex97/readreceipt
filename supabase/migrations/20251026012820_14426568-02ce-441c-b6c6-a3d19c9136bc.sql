-- Public reader for reading goals so other profiles can display goals
CREATE OR REPLACE FUNCTION public.get_reading_goal_public(p_user_id uuid, p_year integer)
RETURNS TABLE (id uuid, user_id uuid, year integer, goal_count integer, manual_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT rg.id, rg.user_id, rg.year, rg.goal_count, rg.manual_count
  FROM public.reading_goals rg
  WHERE rg.user_id = p_user_id AND rg.year = p_year
  LIMIT 1;
$$;

-- Keep profiles.current_book_id up to date from book/progress changes
DROP TRIGGER IF EXISTS trg_update_current_book_from_books ON public.books;
CREATE TRIGGER trg_update_current_book_from_books
AFTER INSERT OR UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_current_book();

DROP TRIGGER IF EXISTS trg_update_current_book_from_progress ON public.reading_progress;
CREATE TRIGGER trg_update_current_book_from_progress
AFTER INSERT ON public.reading_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_current_book();