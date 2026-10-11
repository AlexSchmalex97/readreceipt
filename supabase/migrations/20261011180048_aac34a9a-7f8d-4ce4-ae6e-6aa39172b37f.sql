CREATE OR REPLACE FUNCTION public.start_reading_from_tbr(p_user_id uuid, p_tbr_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  t record;
  v_id uuid;
BEGIN
  SELECT * INTO t FROM tbr_books WHERE id = p_tbr_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Same as the TBR page's "Move to Reading": new in-progress book, TBR row removed.
  INSERT INTO books (user_id, title, author, total_pages, current_page, cover_url, status, started_at, published_year)
  VALUES (p_user_id, t.title, t.author, COALESCE(t.total_pages, 0), 0, t.cover_url, 'in_progress',
          (now() AT TIME ZONE 'America/New_York')::date, t.published_year)
  RETURNING id INTO v_id;
  DELETE FROM tbr_books WHERE id = p_tbr_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.start_reading_from_tbr(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_reading_from_tbr(uuid, uuid) TO service_role;