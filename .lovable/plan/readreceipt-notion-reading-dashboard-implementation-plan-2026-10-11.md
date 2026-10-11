# ReadReceipt ↔ Notion Reading Dashboard — Implementation Plan

Nothing in this plan has been applied. No database, function, or app changes happen until you approve it.

## 1. What exists today (from the actual project)

**Backend:** An external Supabase project you connected yourself (ref `aekzchumzoaynwryayji`). It is not Lovable Cloud. Edge functions already run there (`search-books`, `lookup-email-by-username`, `backfill-published-year`). `SUPABASE_SERVICE_ROLE_KEY` and `LOVABLE_API_KEY` are already available to functions.

**Authentication:** Supabase Auth (email/password plus username lookup). `profiles.id` = `auth.users.id`.

**Relevant tables**
| Table | Role | Key fields |
|---|---|---|
| `books` | User library and the source of truth for progress | `id, user_id, title, author, cover_url, total_pages, current_page, status (in_progress/completed/dnf/top_five), started_at, finished_at, completed_at, updated_at, published_year` |
| `reading_progress` | Append-only session log (feed, stats) | `user_id, book_id, from_page, to_page, note, created_at` (no updates/deletes allowed) |
| `reading_entries` | Re-reads and historical reads | `book_id, user_id, started_at, finished_at, status` |
| `reading_goals` | Yearly goal | `user_id, year, goal_count, manual_count` |
| `profiles` | `current_book_id` kept up to date by the `update_current_book` trigger |

There is no separate "user library" table. A book row is owned by its user.

**Progress logic** (`Index.tsx` `handleUpdateProgress`): it updates `books.current_page`, sets `status='completed'`, `completed_at`, and `finished_at` when you reach the last page, and inserts one `reading_progress` row (`from_page → to_page`). Triggers then update `updated_at` and `profiles.current_book_id`.

**Goal "books completed"** is not stored. It is calculated in the browser from `books` (completed this year, excluding dnf/top_five) plus `reading_entries`, then deduplicated, plus `manual_count`.

**Issues found (not part of this work, flagged for later)**
- The `books` UPDATE policy has no `WITH CHECK`, so an owner could reassign `user_id`.
- `SupabaseService.swift` (iOS widget) PATCHes `books` with the anon key, so RLS blocks it. Widget progress updates likely fail today.
- Several duplicate triggers exist (3× auto-follow, 2× `update_current_book` on books). They don't break anything.

## 2. Recommended architecture

```text
 ReadReceipt (web/iOS)            Supabase (source of truth)              Notion
 ─────────────────────            ───────────────────────────             ──────
 update progress ──► books / reading_progress
                         │ DB trigger → notion_sync_queue
                         ▼
                 edge fn: notion-push  ──(gateway, per-user token)──► "ReadReceipt Library" DB
                                                                        + Goal page
                 edge fn: notion-webhook ◄── Notion webhook (page.properties_updated)
                         │ verify signature, fetch page, diff
                         ▼
                 apply_progress_from_notion() → same path as the app
                 edge fn: notion-reconcile (cron every 15 min, catches missed events)
```

- **Official Notion API**, called only from edge functions and never from the browser.
- **Per-user from day one:** use Lovable's **Notion App User Connector**. Each ReadReceipt user clicks "Connect Notion", picks pages on Notion's consent screen, and gets their own encrypted connection key stored on the server. You are simply the first user. This avoids rebuilding later. It requires a *public* Notion integration in your Notion developer settings (setup steps come at approval time).
- **Notion holds a mirror only.** One Notion database row per active book stores the ReadReceipt `book_id` in a hidden property. No book records are created from Notion, and rows added manually in Notion are ignored.

### Notion layout (created by the integration inside a page you choose, e.g. Media Corner)
- **Currently Reading** database: Title, Author, Cover (page cover + files property), Current Page (number, editable), Progress % (number, editable), Total Pages, Status, Last Synced, RR Book ID (text).
- **Reading Goal** callout/page block: "8 / 24 books in 2026" with a progress bar, rewritten on each change.
- Finished books are moved to Status = Completed (or archived, your choice), not deleted.

## 3. New database objects (additive only)

- `app_user_connections`: encrypted Notion connection key per user. Service role only.
- `notion_sync_settings`: `user_id, parent_page_id, books_database_id, goal_block_id, enabled, last_reconciled_at`.
- `notion_book_links`: `user_id, book_id, notion_page_id, last_pushed_page, last_pushed_at, last_notion_edit_at, sync_version`. This is the only mapping between the two systems.
- `notion_sync_queue`: pending pushes (book_id, reason, attempts).
- Trigger on `books` (AFTER UPDATE of `current_page/status/title/author/cover_url/total_pages`, INSERT, DELETE) and on `reading_goals` that enqueues a push **only if the user has sync enabled**. Users without Notion are unaffected.
- `apply_progress_from_notion(user_id, book_id, new_page)`: a security-definer function that reproduces exactly what `handleUpdateProgress` does today (book update, completion stamping, one `reading_progress` row with `note='via Notion'`). Statistics, feed, and goal counts keep working unchanged.

All tables get explicit GRANTs and RLS. Users can read and change only their own settings, and connection keys are never readable from the browser.

## 4. Two-way sync details

**ReadReceipt → Notion:** the trigger enqueues a push. `notion-push` (invoked right after the change, plus a cron sweep) updates the Notion row and records `last_pushed_page` and `last_pushed_at`.

**Notion → ReadReceipt:** Notion sends `page.properties_updated` to `notion-webhook`. The function verifies Notion's `X-Notion-Signature` (HMAC with the verification token), looks up `notion_book_links` by page id, re-fetches the page through the API (webhook payloads don't include values), and works out the intended page:
- If only Current Page changed, use it.
- If only Progress % changed, use `round(% × total_pages / 100)`.
- If both changed, Current Page wins.
- Values are clamped to `0..total_pages`, and negative or non-numeric input is rejected and reverted in Notion.

Then it calls `apply_progress_from_notion`, which triggers a push that rewrites both fields so pages and % stay consistent.

**Loop prevention**
1. Echo check: if the Notion value equals `last_pushed_page`, it is our own write, so ignore it.
2. Notion's `last_edited_by` equals our integration bot means ignore.
3. The DB trigger skips enqueueing when the change came from `apply_progress_from_notion` *and* the values already match Notion (uses a session flag `app.sync_source='notion'`). One confirming push is still allowed so the % gets recalculated.

**Conflict handling:** ReadReceipt is authoritative. If a Notion edit arrives with `last_edited_time` older than the book's `updated_at`, ReadReceipt wins and Notion is overwritten. Otherwise the edit is applied. Edits that would move progress backwards are allowed, matching the app's own behavior, and are logged as a progress row.

**Reliability:** webhooks are processed idempotently (event id stored). The 15-minute reconcile job compares every linked row and fixes drift or missed events. Rate limits (~3 req/s) are respected with queue batching and backoff.

## 5. Safety for existing features and data
- No existing table, column, policy, or trigger is changed or removed.
- Existing progress updates behave the same. The new trigger only adds a queue row for users who opted in.
- `reading_progress` history is never edited. Notion edits only *add* rows, like a normal update.
- Disconnecting Notion stops sync and deletes the stored key and links. Notion pages are left in place, and ReadReceipt data is untouched.
- First connection is a one-time "initial export" of in-progress books plus the goal. Nothing is imported from Notion.

## 6. Build steps (after approval)
1. You create a public Notion integration and add the gateway callback URL. I link it via the App User Connector card.
2. Migration: new tables, trigger, and `apply_progress_from_notion`.
3. Edge functions: `notion-connect` (OAuth start/finish, key storage), `notion-setup` (create the database and goal block under your chosen page), `notion-push`, `notion-webhook`, `notion-reconcile` (cron), `notion-disconnect`.
4. Integrations page: replace a placeholder card with a **Notion** card (Connect, choose the parent page, Sync now, Disconnect, last sync status).
5. Test on your account: edit pages in the app and check Notion updates within seconds. Edit Current Page or % in Notion and check the app, feed, and goal update. Finish a book from Notion and check that it moves to Completed with a correct timestamp.
6. Add small tests for the percent→page conversion, clamping, and the echo/loop rules.

## 7. Open choices (can decide at approval)
- What happens to finished books in Notion: keep with Status = Completed, or archive.
- Whether rereads (`reading_entries`) should also appear in Notion. The default is no, only active books plus the goal.
