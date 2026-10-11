// Server-only Notion sync engine. ReadReceipt (Supabase) is the source of truth;
// Notion holds a mirror linked by notion_book_links.
import { appUserReconnectRequired, callAsAppUser } from "./appUserConnector.ts";
import { adminClient, getConnectionKeyForUser, markReconnectRequired } from "./appUserConnections.ts";
import { countCompletedThisYear, percentFor, resolveNotionEdit } from "./notionSyncMath.ts";

export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const NOTION = "notion";
const NOTION_VERSION = "2025-09-03";

export class ReconnectRequired extends Error {}

export const P = {
  title: "Title",
  author: "Author",
  page: "Current Page",
  percent: "Progress %",
  total: "Total Pages",
  status: "Status",
  cover: "Cover",
  synced: "Last Synced",
  id: "RR Book ID",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function normId(id: string) {
  return id.replace(/-/g, "").toLowerCase();
}

export async function notion(
  userId: string,
  key: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey: key,
      connectorId: NOTION,
      path,
      init: {
        method,
        headers: { "Content-Type": "application/json", "Notion-Version": NOTION_VERSION },
        body: body ? JSON.stringify(body) : undefined,
      },
    });
    if (await appUserReconnectRequired(res)) {
      await markReconnectRequired(userId, NOTION);
      throw new ReconnectRequired("Notion access needs to be renewed");
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after") ?? 0) * 1000 || 500 * 2 ** attempt;
      await res.text();
      await sleep(wait);
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw new Error(`Notion ${method} ${path} failed [${res.status}]: ${text}`);
    return text ? JSON.parse(text) : {};
  }
  throw new Error(`Notion ${method} ${path} failed after retries`);
}

export async function loadContext(userId: string) {
  const db = adminClient();
  const key = await getConnectionKeyForUser(userId, NOTION);
  const { data: settings } = await db.from("notion_sync_settings").select("*").eq("user_id", userId).maybeSingle();
  return { db, key, settings };
}

const statusName = (s: string | null) =>
  s === "completed" ? "Completed" : s === "dnf" ? "DNF" : "Reading";

function bookProps(b: any) {
  const pct = percentFor(b.current_page ?? 0, b.total_pages ?? 0);
  const props: Record<string, unknown> = {
    [P.title]: { title: [{ text: { content: b.title ?? "Untitled" } }] },
    [P.author]: { rich_text: [{ text: { content: b.author ?? "" } }] },
    [P.page]: { number: b.current_page ?? 0 },
    [P.percent]: { number: pct },
    [P.total]: { number: b.total_pages ?? 0 },
    [P.status]: { select: { name: statusName(b.status) } },
    [P.synced]: { date: { start: new Date().toISOString() } },
    [P.id]: { rich_text: [{ text: { content: b.id } }] },
    [P.cover]: b.cover_url && /^https?:\/\//.test(b.cover_url)
      ? { files: [{ name: "cover", type: "external", external: { url: b.cover_url } }] }
      : { files: [] },
  };
  return { props, pct };
}

/** Create the Notion database + goal callout under the chosen parent page. */
export async function setupDashboard(userId: string, parentPageId: string) {
  const { db, key } = await loadContext(userId);
  if (!key) throw new Error("Notion is not connected");

  const me = await notion(userId, key, "GET", "/v1/users/me");
  const created = await notion(userId, key, "POST", "/v1/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ text: { content: "ReadReceipt — Currently Reading" } }],
    icon: { type: "emoji", emoji: "📚" },
    initial_data_source: {
      properties: {
        [P.title]: { title: {} },
        [P.author]: { rich_text: {} },
        [P.page]: { number: { format: "number" } },
        [P.percent]: { number: { format: "number" } },
        [P.total]: { number: { format: "number" } },
        [P.status]: {
          select: {
            options: [
              { name: "Reading", color: "blue" },
              { name: "Completed", color: "green" },
              { name: "DNF", color: "gray" },
            ],
          },
        },
        [P.cover]: { files: {} },
        [P.synced]: { date: {} },
        [P.id]: { rich_text: {} },
      },
    },
  });
  const dataSourceId = created.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error("Notion did not return a data source for the new database");

  const appended = await notion(userId, key, "PATCH", `/v1/blocks/${parentPageId}/children`, {
    children: [{
      object: "block",
      type: "callout",
      callout: { icon: { type: "emoji", emoji: "🎯" }, rich_text: [{ text: { content: "Reading goal — syncing…" } }] },
    }],
  });
  const goalBlockId = appended.results?.[0]?.id ?? null;

  // Reset any links from a previous dashboard
  await db.from("notion_book_links").delete().eq("user_id", userId);
  const { error } = await db.from("notion_sync_settings").upsert({
    user_id: userId,
    parent_page_id: parentPageId,
    books_database_id: created.id,
    books_data_source_id: dataSourceId,
    goal_block_id: goalBlockId,
    bot_id: me.id ?? null,
    enabled: true,
    last_error: null,
  });
  if (error) throw error;

  await fullSync(userId);
}

/** Push one ReadReceipt book to Notion (create, update, or trash). */
export async function pushBook(userId: string, key: string, settings: any, bookId: string) {
  const db = adminClient();
  const { data: book } = await db.from("books")
    .select("id,user_id,title,author,cover_url,total_pages,current_page,status")
    .eq("id", bookId).maybeSingle();
  const { data: link } = await db.from("notion_book_links").select("*").eq("book_id", bookId).maybeSingle();

  const shouldShow = book && book.user_id === userId &&
    ["in_progress", "completed", "dnf"].includes(book.status ?? "in_progress");

  if (!shouldShow) {
    if (link) {
      await notion(userId, key, "PATCH", `/v1/pages/${link.notion_page_id}`, { in_trash: true }).catch((e) =>
        console.warn("trash failed", e.message)
      );
      await db.from("notion_book_links").delete().eq("book_id", bookId);
    }
    return;
  }
  // Only create rows for active books; finished ones are kept but not added.
  if (!link && book.status !== "in_progress") return;

  const { props, pct } = bookProps(book);
  const cover = book.cover_url && /^https?:\/\//.test(book.cover_url)
    ? { type: "external", external: { url: book.cover_url } }
    : undefined;

  let pageId = link?.notion_page_id;
  if (pageId) {
    await notion(userId, key, "PATCH", `/v1/pages/${pageId}`, { properties: props, ...(cover ? { cover } : {}) });
  } else {
    const page = await notion(userId, key, "POST", "/v1/pages", {
      parent: { type: "data_source_id", data_source_id: settings.books_data_source_id },
      properties: props,
      ...(cover ? { cover } : {}),
    });
    pageId = page.id;
  }
  await db.from("notion_book_links").upsert({
    book_id: bookId,
    user_id: userId,
    notion_page_id: pageId,
    last_pushed_page: book.current_page ?? 0,
    last_pushed_percent: pct,
    last_pushed_at: new Date().toISOString(),
  });
}

export async function pushGoal(userId: string, key: string, settings: any) {
  if (!settings.goal_block_id) return;
  const db = adminClient();
  const year = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" }));
  const [{ data: entries }, { data: books }, { data: goal }] = await Promise.all([
    db.from("reading_entries").select("book_id,finished_at").eq("user_id", userId)
      .not("finished_at", "is", null).gte("finished_at", `${year}-01-01`).lte("finished_at", `${year}-12-31`),
    db.from("books").select("id,status,current_page,total_pages,finished_at,created_at").eq("user_id", userId),
    db.from("reading_goals").select("goal_count").eq("user_id", userId).eq("year", year).maybeSingle(),
  ]);
  const done = countCompletedThisYear(year, entries ?? [], books ?? []);
  const target = goal?.goal_count ?? 0;
  let text: string;
  if (target > 0) {
    const ratio = Math.min(1, done / target);
    const filled = Math.round(ratio * 20);
    text = `${year} reading goal: ${done} / ${target} books (${Math.round(ratio * 100)}%)\n${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  } else {
    text = `${year}: ${done} books completed`;
  }
  await notion(userId, key, "PATCH", `/v1/blocks/${settings.goal_block_id}`, {
    callout: { icon: { type: "emoji", emoji: "🎯" }, rich_text: [{ text: { content: text } }] },
  });
}

const num = (p: any): number | null => (p && typeof p.number === "number" ? p.number : null);

/**
 * Pull a Notion page edit into ReadReceipt. Returns true if ReadReceipt changed.
 */
export async function pullPage(userId: string, key: string, settings: any, link: any, page?: any) {
  const db = adminClient();
  page = page ?? await notion(userId, key, "GET", `/v1/pages/${link.notion_page_id}`);
  if (page.in_trash || page.archived) {
    await db.from("notion_book_links").delete().eq("book_id", link.book_id);
    return false;
  }
  if (settings.bot_id && page.last_edited_by?.id === settings.bot_id) return false; // our own write

  const { data: book } = await db.from("books").select("id,user_id,total_pages,current_page,updated_at")
    .eq("id", link.book_id).maybeSingle();
  if (!book || book.user_id !== userId) return false;

  const decision = resolveNotionEdit({
    notionPage: num(page.properties?.[P.page]),
    notionPercent: num(page.properties?.[P.percent]),
    lastPushedPage: link.last_pushed_page,
    lastPushedPercent: link.last_pushed_percent === null ? null : Number(link.last_pushed_percent),
    totalPages: book.total_pages ?? 0,
  });

  if (decision.kind === "none") return false;

  // Conflict: ReadReceipt changed after this Notion edit -> ReadReceipt wins.
  const notionEditedAt = new Date(page.last_edited_time).getTime();
  const rrUpdatedAt = book.updated_at ? new Date(book.updated_at).getTime() : 0;
  if (decision.kind === "invalid" || notionEditedAt < rrUpdatedAt) {
    await pushBook(userId, key, settings, link.book_id);
    return false;
  }

  const { error } = await db.rpc("apply_progress_from_notion", {
    p_user_id: userId,
    p_book_id: link.book_id,
    p_new_page: decision.page,
  });
  if (error) throw error;
  await db.from("notion_book_links").update({ last_notion_edit_at: page.last_edited_time }).eq("book_id", link.book_id);
  // Normalise both fields (pages + %) in Notion right away.
  await pushBook(userId, key, settings, link.book_id);
  await db.from("notion_sync_queue").delete().eq("user_id", userId).eq("target", link.book_id);
  return true;
}

/** Reconcile: pull Notion edits, push every active book, refresh goal. */
export async function fullSync(userId: string) {
  const { db, key, settings } = await loadContext(userId);
  if (!key || !settings?.enabled || !settings.books_data_source_id) return;
  try {
    const { data: links } = await db.from("notion_book_links").select("*").eq("user_id", userId);
    for (const link of links ?? []) await pullPage(userId, key, settings, link);

    const { data: active } = await db.from("books").select("id").eq("user_id", userId).eq("status", "in_progress");
    const ids = new Set([...(active ?? []).map((b: any) => b.id), ...(links ?? []).map((l: any) => l.book_id)]);
    for (const id of ids) {
      await pushBook(userId, key, settings, id);
      await sleep(340);
    }
    await pushGoal(userId, key, settings);
    await db.from("notion_sync_queue").delete().eq("user_id", userId);
    await db.from("notion_sync_settings").update({
      last_synced_at: new Date().toISOString(),
      last_reconciled_at: new Date().toISOString(),
      last_error: null,
    }).eq("user_id", userId);
  } catch (e) {
    await db.from("notion_sync_settings").update({ last_error: String((e as Error).message).slice(0, 500) })
      .eq("user_id", userId);
    throw e;
  }
}

/** Drain queued pushes (called by the worker cron). */
export async function processQueue(limit = 50) {
  const db = adminClient();
  const { data: rows } = await db.from("notion_sync_queue").select("*").lt("attempts", 5)
    .order("enqueued_at").limit(limit);
  const byUser = new Map<string, any[]>();
  for (const r of rows ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);

  for (const [userId, items] of byUser) {
    const { key, settings } = await loadContext(userId);
    if (!key || !settings?.enabled) {
      await db.from("notion_sync_queue").delete().eq("user_id", userId);
      continue;
    }
    for (const item of items) {
      try {
        if (item.target === "goal") await pushGoal(userId, key, settings);
        else await pushBook(userId, key, settings, item.target);
        await db.from("notion_sync_queue").delete().eq("user_id", userId).eq("target", item.target)
          .eq("enqueued_at", item.enqueued_at);
      } catch (e) {
        console.error("push failed", userId, item.target, (e as Error).message);
        await db.from("notion_sync_queue").update({ attempts: item.attempts + 1 })
          .eq("user_id", userId).eq("target", item.target);
        await db.from("notion_sync_settings").update({ last_error: String((e as Error).message).slice(0, 500) })
          .eq("user_id", userId);
        if (e instanceof ReconnectRequired) break;
      }
      await sleep(340);
    }
    await db.from("notion_sync_settings").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId);
  }
}

/** Reconcile users not reconciled in the last 15 minutes. */
export async function reconcileStale() {
  const db = adminClient();
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: users } = await db.from("notion_sync_settings").select("user_id")
    .eq("enabled", true).or(`last_reconciled_at.is.null,last_reconciled_at.lt.${cutoff}`).limit(10);
  for (const u of users ?? []) {
    try {
      await fullSync(u.user_id);
    } catch (e) {
      console.error("reconcile failed", u.user_id, (e as Error).message);
    }
  }
}
