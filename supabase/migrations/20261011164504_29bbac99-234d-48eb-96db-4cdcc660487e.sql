ALTER TABLE public.notion_sync_settings
  ADD COLUMN IF NOT EXISTS completed_database_id text,
  ADD COLUMN IF NOT EXISTS completed_data_source_id text,
  ADD COLUMN IF NOT EXISTS tbr_database_id text,
  ADD COLUMN IF NOT EXISTS tbr_data_source_id text;
ALTER TABLE public.notion_book_links ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'reading';

CREATE OR REPLACE FUNCTION public.enqueue_notion_sync()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_target text;
  v_op text := 'upsert';
BEGIN
  IF TG_TABLE_NAME = 'books' THEN
    v_user := COALESCE(NEW.user_id, OLD.user_id);
    v_target := COALESCE(NEW.id, OLD.id)::text;
    IF TG_OP = 'DELETE' THEN v_op := 'delete'; END IF;
    IF TG_OP = 'UPDATE' AND
       NEW.current_page IS NOT DISTINCT FROM OLD.current_page AND
       NEW.status IS NOT DISTINCT FROM OLD.status AND
       NEW.title IS NOT DISTINCT FROM OLD.title AND
       NEW.author IS NOT DISTINCT FROM OLD.author AND
       NEW.cover_url IS NOT DISTINCT FROM OLD.cover_url AND
       NEW.total_pages IS NOT DISTINCT FROM OLD.total_pages AND
       NEW.finished_at IS NOT DISTINCT FROM OLD.finished_at THEN
      RETURN NULL;
    END IF;
  ELSIF TG_TABLE_NAME = 'tbr_books' THEN
    v_user := COALESCE(NEW.user_id, OLD.user_id);
    v_target := 'tbr:' || COALESCE(NEW.id, OLD.id)::text;
    IF TG_OP = 'DELETE' THEN v_op := 'delete'; END IF;
  ELSE
    v_user := COALESCE(NEW.user_id, OLD.user_id);
    v_target := 'goal';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM notion_sync_settings s WHERE s.user_id = v_user AND s.enabled) THEN
    RETURN NULL;
  END IF;

  INSERT INTO notion_sync_queue (user_id, target, op, attempts, enqueued_at)
  VALUES (v_user, v_target, v_op, 0, now())
  ON CONFLICT (user_id, target) DO UPDATE SET op = EXCLUDED.op, attempts = 0, enqueued_at = now();

  IF TG_TABLE_NAME = 'books' THEN
    INSERT INTO notion_sync_queue (user_id, target, op, attempts, enqueued_at)
    VALUES (v_user, 'goal', 'upsert', 0, now())
    ON CONFLICT (user_id, target) DO UPDATE SET attempts = 0, enqueued_at = now();
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := 'https://aekzchumzoaynwryayji.supabase.co/functions/v1/notion-worker',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"reason":"enqueue"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS notion_sync_tbr ON public.tbr_books;
CREATE TRIGGER notion_sync_tbr AFTER INSERT OR UPDATE OR DELETE ON public.tbr_books
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notion_sync();