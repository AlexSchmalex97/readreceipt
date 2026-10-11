CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  reconnect_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notion_sync_settings (
  user_id uuid PRIMARY KEY,
  parent_page_id text,
  books_database_id text,
  books_data_source_id text,
  goal_block_id text,
  bot_id text,
  enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  last_reconciled_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notion_sync_settings TO authenticated;
GRANT ALL ON public.notion_sync_settings TO service_role;
ALTER TABLE public.notion_sync_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notion settings" ON public.notion_sync_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notion_book_links (
  book_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  notion_page_id text NOT NULL UNIQUE,
  last_pushed_page integer,
  last_pushed_percent numeric,
  last_pushed_at timestamptz,
  last_notion_edit_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notion_book_links_user_idx ON public.notion_book_links(user_id);
GRANT SELECT ON public.notion_book_links TO authenticated;
GRANT ALL ON public.notion_book_links TO service_role;
ALTER TABLE public.notion_book_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notion links" ON public.notion_book_links
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.notion_sync_queue (
  user_id uuid NOT NULL,
  target text NOT NULL,
  op text NOT NULL DEFAULT 'upsert',
  attempts integer NOT NULL DEFAULT 0,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target)
);
GRANT ALL ON public.notion_sync_queue TO service_role;
ALTER TABLE public.notion_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notion_webhook_events (
  event_id text PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notion_webhook_events TO service_role;
ALTER TABLE public.notion_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notion_webhook_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.notion_webhook_tokens TO service_role;
ALTER TABLE public.notion_webhook_tokens ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_notion_sync_settings_updated_at BEFORE UPDATE ON public.notion_sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notion_book_links_updated_at BEFORE UPDATE ON public.notion_book_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_app_user_connections_updated_at BEFORE UPDATE ON public.app_user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enqueue Notion pushes only for users with sync enabled
CREATE OR REPLACE FUNCTION public.enqueue_notion_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       NEW.total_pages IS NOT DISTINCT FROM OLD.total_pages THEN
      RETURN NULL;
    END IF;
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

  -- Completion changes the goal count too
  IF TG_TABLE_NAME = 'books' THEN
    INSERT INTO notion_sync_queue (user_id, target, op, attempts, enqueued_at)
    VALUES (v_user, 'goal', 'upsert', 0, now())
    ON CONFLICT (user_id, target) DO UPDATE SET attempts = 0, enqueued_at = now();
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER notion_sync_books AFTER INSERT OR UPDATE OR DELETE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notion_sync();
CREATE TRIGGER notion_sync_goals AFTER INSERT OR UPDATE OR DELETE ON public.reading_goals
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_notion_sync();

-- Apply a Notion progress edit exactly like the app does
CREATE OR REPLACE FUNCTION public.apply_progress_from_notion(p_user_id uuid, p_book_id uuid, p_new_page integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
  v_page integer;
BEGIN
  SELECT * INTO b FROM books WHERE id = p_book_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'book not found'; END IF;

  v_page := GREATEST(0, LEAST(p_new_page, b.total_pages));
  IF v_page = b.current_page THEN RETURN v_page; END IF;

  IF v_page >= b.total_pages AND b.current_page < b.total_pages THEN
    UPDATE books SET
      current_page = v_page,
      status = 'completed',
      completed_at = now(),
      finished_at = COALESCE(finished_at, (now() AT TIME ZONE 'America/New_York')::date)
    WHERE id = p_book_id;
  ELSE
    UPDATE books SET current_page = v_page WHERE id = p_book_id;
  END IF;

  INSERT INTO reading_progress (user_id, book_id, from_page, to_page, note)
  VALUES (p_user_id, p_book_id, b.current_page, v_page, 'via Notion');

  RETURN v_page;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_progress_from_notion(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_progress_from_notion(uuid, uuid, integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.enqueue_notion_sync() FROM PUBLIC, anon, authenticated;