// Server-only Notion sync engine. ReadReceipt (Supabase) is the source of truth;
// Notion holds a mirror (Currently Reading, Completed, TBR) linked by notion_book_links.
import { appUserReconnectRequired, callAsAppUser } from "./appUserConnector.ts";
import { adminClient, getConnectionKeyForUser, markReconnectRequired } from "./appUserConnections.ts";
import { countCompletedThisYear, percentFor, resolveNotionEdit, shelfFor } from "./notionSyncMath.ts";

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
  finished: "Finished",
  notes: "Notes",
  rating: "Rating",
  quick: "Quick Update",
};

const QUICK: Record<string, number> = { "+1 page": 1, "+5 pages": 5, "+10 pages": 10, "-1 page": -1 };
const quickProp = { select: { options: Object.keys(QUICK).map((name) => ({ name, color: name.startsWith("-") ? "red" : "green" })) } };
const stars = (n: number | null) => (n && n > 0 ? "★".repeat(Math.min(5, Math.round(n))) : null);

type Kind = "reading" | "completed" | "tbr";

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

const BAR_FORMULA =
  `repeat("█", round(min(max(prop("${P.percent}"), 0), 100) / 10)) + repeat("░", 10 - round(min(max(prop("${P.percent}"), 0), 100) / 10)) + " " + format(prop("${P.percent}")) + "%"`;

const SCHEMAS: Record<Kind, { title: string; emoji: string; properties: Record<string, unknown> }> = {
  reading: {
    title: "ReadReceipt — Currently Reading",
    emoji: "📖",
    properties: {
      [P.title]: { title: {} },
      [P.author]: { rich_text: {} },
      [P.page]: { number: { format: "number" } },
      [P.percent]: { number: { format: "number" } },
      [P.total]: { number: { format: "number" } },
      [P.status]: { select: { options: [{ name: "Reading", color: "blue" }] } },
      [P.cover]: { files: {} },
      [P.synced]: { date: {} },
      [P.id]: { rich_text: {} },
    },
  },
  completed: {
    title: "ReadReceipt — Completed",
    emoji: "✅",
    properties: {
      [P.title]: { title: {} },
      [P.author]: { rich_text: {} },
      [P.total]: { number: { format: "number" } },
      [P.finished]: { date: {} },
      [P.cover]: { files: {} },
      [P.synced]: { date: {} },
      [P.id]: { rich_text: {} },
    },
  },
  tbr: {
    title: "ReadReceipt — TBR",
    emoji: "📚",
    properties: {
      [P.title]: { title: {} },
      [P.author]: { rich_text: {} },
      [P.total]: { number: { format: "number" } },
      [P.notes]: { rich_text: {} },
      [P.cover]: { files: {} },
      [P.synced]: { date: {} },
      [P.id]: { rich_text: {} },
    },
  },
};

const COLS: Record<Kind, [string, string]> = {
  reading: ["books_database_id", "books_data_source_id"],
  completed: ["completed_database_id", "completed_data_source_id"],
  tbr: ["tbr_database_id", "tbr_data_source_id"],
};

async function createDatabase(userId: string, key: string, parentPageId: string, kind: Kind) {
  const s = SCHEMAS[kind];
  const created = await notion(userId, key, "POST", "/v1/databases", {
    parent: { type: "page_id", page_id: parentPageId },
    title: [{ text: { content: s.title } }],
    icon: { type: "emoji", emoji: s.emoji },
    initial_data_source: { properties: s.properties },
  });
  const dataSourceId = created.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error("Notion did not return a data source for the new database");
  return { databaseId: created.id as string, dataSourceId: dataSourceId as string };
}

async function dbAlive(userId: string, key: string, id: string | null) {
  if (!id) return false;
  const d = await notion(userId, key, "GET", `/v1/databases/${id}`).catch(() => null);
  return !!d && !d.in_trash && !d.archived;
}

/** Make sure all three lists exist under the dashboard page; create only what's missing. */
async function ensureDatabases(userId: string, key: string, settings: any) {
  const db = adminClient();
  const patch: Record<string, string> = {};
  for (const kind of ["reading", "completed", "tbr"] as Kind[]) {
    const [dbCol, dsCol] = COLS[kind];
    if (await dbAlive(userId, key, settings[dbCol])) continue;
    const { databaseId, dataSourceId } = await createDatabase(userId, key, settings.parent_page_id, kind);
    patch[dbCol] = databaseId;
    patch[dsCol] = dataSourceId;
    await db.from("notion_book_links").delete().eq("user_id", userId).eq("kind", kind);
  }
  if (Object.keys(patch).length) {
    await db.from("notion_sync_settings").update(patch).eq("user_id", userId);
    Object.assign(settings, patch);
  }
  if (settings.books_data_source_id) {
    await notion(userId, key, "PATCH", `/v1/data_sources/${settings.books_data_source_id}`, {
      properties: { "Progress Bar": { formula: { expression: BAR_FORMULA } }, [P.quick]: quickProp },
    }).catch((e) => console.warn("progress bar column", (e as Error).message));
  }
  if (settings.completed_data_source_id) {
    await notion(userId, key, "PATCH", `/v1/data_sources/${settings.completed_data_source_id}`, {
      properties: { [P.rating]: { rich_text: {} } },
    }).catch((e) => console.warn("rating column", (e as Error).message));
  }
}

/** Set up (or reuse) the dashboard under the chosen parent page. */
export async function setupDashboard(userId: string, parentPageId: string) {
  const { db, key, settings: existing } = await loadContext(userId);
  if (!key) throw new Error("Notion is not connected");

  const samePage = existing?.parent_page_id && normId(existing.parent_page_id) === normId(parentPageId);
  if (!samePage) {
    await db.from("notion_book_links").delete().eq("user_id", userId);
  }
  const me = await notion(userId, key, "GET", "/v1/users/me");

  let goalBlockId = samePage ? existing?.goal_block_id ?? null : null;
  if (goalBlockId) {
    const b = await notion(userId, key, "GET", `/v1/blocks/${goalBlockId}`).catch(() => null);
    if (!b || b.in_trash || b.archived) goalBlockId = null;
  }
  if (!goalBlockId) {
    const appended = await notion(userId, key, "PATCH", `/v1/blocks/${parentPageId}/children`, {
      children: [{
        object: "block",
        type: "callout",
        callout: { icon: { type: "emoji", emoji: "🎯" }, rich_text: [{ text: { content: "Reading goal — syncing…" } }] },
      }],
    });
    goalBlockId = appended.results?.[0]?.id ?? null;
  }

  const base = samePage ? existing : {};
  const row = {
    ...base,
    user_id: userId,
    parent_page_id: parentPageId,
    goal_block_id: goalBlockId,
    bot_id: me.id ?? null,
    enabled: true,
    last_error: null,
    last_reconciled_at: null,
  } as any;
  if (!samePage) {
    for (const [a, b] of Object.values(COLS)) { row[a] = null; row[b] = null; }
  }
  const { error } = await db.from("notion_sync_settings").upsert(row);
  if (error) throw error;
  await ensureDatabases(userId, key, row);
}

const coverFile = (url: string | null) =>
  url && /^https?:\/\//.test(url) ? { files: [{ name: "cover", type: "external", external: { url } }] } : { files: [] };
const pageCover = (url: string | null) =>
  url && /^https?:\/\//.test(url) ? { cover: { type: "external", external: { url } } } : {};
const text = (s: string | null) => ({ rich_text: [{ text: { content: (s ?? "").slice(0, 1900) } }] });

function readingProps(b: any) {
  const pct = percentFor(b.current_page ?? 0, b.total_pages ?? 0);
  return {
    pct,
    props: {
      [P.title]: { title: [{ text: { content: b.title ?? "Untitled" } }] },
      [P.author]: text(b.author),
      [P.page]: { number: b.current_page ?? 0 },
      [P.percent]: { number: pct },
      [P.total]: { number: b.total_pages ?? 0 },
      [P.status]: { select: { name: "Reading" } },
      [P.quick]: { select: null },
      [P.synced]: { date: { start: new Date().toISOString() } },
      [P.id]: text(b.id),
      [P.cover]: coverFile(b.cover_url),
    },
  };
}

function completedProps(b: any, rating: number | null) {
  return {
    [P.rating]: text(stars(rating)),
    [P.title]: { title: [{ text: { content: b.title ?? "Untitled" } }] },
    [P.author]: text(b.author),
    [P.total]: { number: b.total_pages ?? 0 },
    [P.finished]: { date: b.finished_at ? { start: b.finished_at } : null },
    [P.synced]: { date: { start: new Date().toISOString() } },
    [P.id]: text(b.id),
    [P.cover]: coverFile(b.cover_url),
  };
}

function tbrProps(t: any) {
  return {
    [P.title]: { title: [{ text: { content: t.title ?? "Untitled" } }] },
    [P.author]: text(t.author),
    [P.total]: { number: t.total_pages ?? null },
    [P.notes]: text(t.notes),
    [P.synced]: { date: { start: new Date().toISOString() } },
    [P.id]: text(t.id),
    [P.cover]: coverFile(t.cover_url),
  };
}

async function trashLink(userId: string, key: string, link: any) {
  await notion(userId, key, "PATCH", `/v1/pages/${link.notion_page_id}`, { in_trash: true }).catch((e) =>
    console.warn("trash failed", e.message)
  );
  await adminClient().from("notion_book_links").delete().eq("book_id", link.book_id);
}

async function upsertRow(
  userId: string, key: string, settings: any, kind: Kind, id: string, link: any,
  props: Record<string, unknown>, coverUrl: string | null, extra: Record<string, unknown> = {},
) {
  const db = adminClient();
  const dataSource = settings[COLS[kind][1]];
  if (!dataSource) return;
  let pageId = link?.notion_page_id;
  if (pageId) {
    await notion(userId, key, "PATCH", `/v1/pages/${pageId}`, { properties: props, ...pageCover(coverUrl) });
  } else {
    const page = await notion(userId, key, "POST", "/v1/pages", {
      parent: { type: "data_source_id", data_source_id: dataSource },
      properties: props,
      ...pageCover(coverUrl),
    });
    pageId = page.id;
  }
  await db.from("notion_book_links").upsert({
    book_id: id, user_id: userId, notion_page_id: pageId, kind,
    last_pushed_at: new Date().toISOString(), ...extra,
  });
}

/** Push one ReadReceipt book to the right list (Currently Reading or Completed). */
export async function pushBook(userId: string, key: string, settings: any, bookId: string) {
  const db = adminClient();
  const { data: book } = await db.from("books")
    .select("id,user_id,title,author,cover_url,total_pages,current_page,status,finished_at")
    .eq("id", bookId).maybeSingle();
  const { data: link } = await db.from("notion_book_links").select("*").eq("book_id", bookId).maybeSingle();

  const kind = book && book.user_id === userId ? shelfFor(book) : null;
  if (link && link.kind !== kind) await trashLink(userId, key, link);
  if (!kind) return;
  const current = link && link.kind === kind ? link : null;

  if (kind === "reading") {
    const { props, pct } = readingProps(book);
    await upsertRow(userId, key, settings, kind, bookId, current, props, book.cover_url, {
      last_pushed_page: book.current_page ?? 0,
      last_pushed_percent: pct,
    });
  } else {
    const { data: rev } = await db.from("reviews").select("rating").eq("user_id", userId).eq("book_id", bookId)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    await upsertRow(userId, key, settings, kind, bookId, current, completedProps(book, rev?.rating ?? null), book.cover_url);
  }
}

/** Push one TBR book (create, update, or trash). */
export async function pushTbr(userId: string, key: string, settings: any, tbrId: string) {
  const db = adminClient();
  const { data: t } = await db.from("tbr_books").select("id,user_id,title,author,total_pages,notes,cover_url")
    .eq("id", tbrId).maybeSingle();
  const { data: link } = await db.from("notion_book_links").select("*").eq("book_id", tbrId).maybeSingle();
  if (!t || t.user_id !== userId) {
    if (link) await trashLink(userId, key, link);
    return;
  }
  await upsertRow(userId, key, settings, "tbr", tbrId, link, tbrProps(t), t.cover_url);
}

export async function pushGoal(userId: string, key: string, settings: any) {
  if (!settings.goal_block_id) return;
  const db = adminClient();
  const year = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", year: "numeric" }));
  const [{ data: entries }, { data: books }, { data: goal }] = await Promise.all([
    db.from("reading_entries").select("book_id,finished_at").eq("user_id", userId)
      .not("finished_at", "is", null).gte("finished_at", `${year}-01-01`).lte("finished_at", `${year}-12-31`),
    db.from("books").select("id,status,current_page,total_pages,finished_at,created_at").eq("user_id", userId),
    db.from("reading_goals").select("goal_count,manual_count").eq("user_id", userId).eq("year", year).maybeSingle(),
  ]);
  const done = countCompletedThisYear(year, entries ?? [], books ?? []) + (goal?.manual_count ?? 0);
  const target = goal?.goal_count ?? 0;
  let content: string;
  if (target > 0) {
    const ratio = Math.min(1, done / target);
    const filled = Math.round(ratio * 20);
    content = `${year} reading goal: ${done} / ${target} books (${Math.round(ratio * 100)}%)\n${"█".repeat(filled)}${"░".repeat(20 - filled)}`;
  } else {
    content = `${year}: ${done} books completed`;
  }
  await notion(userId, key, "PATCH", `/v1/blocks/${settings.goal_block_id}`, {
    callout: { icon: { type: "emoji", emoji: "🎯" }, rich_text: [{ text: { content } }] },
  });
}

const num = (p: any): number | null => (p && typeof p.number === "number" ? p.number : null);

/** Pull a Currently Reading edit into ReadReceipt. Returns true if ReadReceipt changed. */
export async function pullPage(userId: string, key: string, settings: any, link: any, page?: any) {
  if ((link.kind ?? "reading") !== "reading") return false;
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

  const quick = page.properties?.[P.quick]?.select?.name as string | undefined;
  const delta = quick ? QUICK[quick] : undefined;
  let decision: { kind: "none" } | { kind: "invalid" } | { kind: "apply"; page: number } = delta !== undefined
    ? { kind: "apply", page: Math.max(0, Math.min((book.current_page ?? 0) + delta, book.total_pages ?? 0)) }
    : resolveNotionEdit({
    notionPage: num(page.properties?.[P.page]),
    notionPercent: num(page.properties?.[P.percent]),
    lastPushedPage: link.last_pushed_page,
    lastPushedPercent: link.last_pushed_percent === null ? null : Number(link.last_pushed_percent),
    totalPages: book.total_pages ?? 0,
  });
  if (decision.kind === "none") return false;
  if (delta !== undefined && decision.kind === "apply" && decision.page === book.current_page) {
    await pushBook(userId, key, settings, link.book_id); // clears the Quick Update choice
    return false;
  }

  const notionEditedAt = new Date(page.last_edited_time).getTime();
  const rrUpdatedAt = book.updated_at ? new Date(book.updated_at).getTime() : 0;
  if (decision.kind === "invalid" || (delta === undefined && notionEditedAt < rrUpdatedAt)) {
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
  await pushBook(userId, key, settings, link.book_id);
  await db.from("notion_sync_queue").delete().eq("user_id", userId).eq("target", link.book_id);
  return true;
}

const BUDGET_MS = 110_000;

/**
 * Reconcile all three lists. Skips rows already up to date, and stops before the
 * time limit; returns done=false when more work remains (the next run continues).
 */
export async function fullSync(userId: string): Promise<{ done: boolean; remaining: number }> {
  const started = Date.now();
  const { db, key, settings } = await loadContext(userId);
  if (!key || !settings?.enabled || !settings.parent_page_id) return { done: true, remaining: 0 };
  try {
    await ensureDatabases(userId, key, settings);

    const { data: links } = await db.from("notion_book_links").select("*").eq("user_id", userId);
    const linkById = new Map((links ?? []).map((l: any) => [l.book_id, l]));
    for (const link of links ?? []) {
      if (link.kind === "reading") await pullPage(userId, key, settings, link);
    }

    const [{ data: books }, { data: tbr }] = await Promise.all([
      db.from("books").select("id,status,current_page,total_pages,updated_at").eq("user_id", userId),
      db.from("tbr_books").select("id,updated_at").eq("user_id", userId),
    ]);
    const stale = (id: string, updatedAt: string | null, kind: Kind | null) => {
      const l: any = linkById.get(id);
      if (!kind) return !!l;
      if (!l || l.kind !== kind || !l.last_pushed_at) return true;
      return !!updatedAt && new Date(updatedAt) > new Date(l.last_pushed_at);
    };
    const work: { type: "book" | "tbr"; id: string }[] = [];
    // Currently Reading first so the main list fills in quickly.
    const sorted = [...(books ?? [])].sort((a: any, b: any) =>
      (shelfFor(a) === "reading" ? 0 : 1) - (shelfFor(b) === "reading" ? 0 : 1)
    );
    for (const b of sorted) if (stale(b.id, b.updated_at, shelfFor(b))) work.push({ type: "book", id: b.id });
    for (const t of tbr ?? []) if (stale(t.id, t.updated_at, "tbr")) work.push({ type: "tbr", id: t.id });
    const known = new Set([...(books ?? []).map((b: any) => b.id), ...(tbr ?? []).map((t: any) => t.id)]);
    for (const l of links ?? []) if (!known.has(l.book_id)) await trashLink(userId, key, l);

    let i = 0;
    for (; i < work.length; i++) {
      if (Date.now() - started > BUDGET_MS) break;
      const w = work[i];
      if (w.type === "book") await pushBook(userId, key, settings, w.id);
      else await pushTbr(userId, key, settings, w.id);
      await sleep(340);
    }
    const remaining = work.length - i;
    await pushGoal(userId, key, settings);
    if (remaining === 0) await db.from("notion_sync_queue").delete().eq("user_id", userId);
    await db.from("notion_sync_settings").update({
      last_synced_at: new Date().toISOString(),
      ...(remaining === 0 ? { last_reconciled_at: new Date().toISOString() } : {}),
      last_error: null,
    }).eq("user_id", userId);
    return { done: remaining === 0, remaining };
  } catch (e) {
    await db.from("notion_sync_settings").update({ last_error: String((e as Error).message).slice(0, 500) })
      .eq("user_id", userId);
    throw e;
  }
}

/** Drain queued pushes (called by the worker). */
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
        else if (item.target.startsWith("tbr:")) await pushTbr(userId, key, settings, item.target.slice(4));
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

/** Backstop: reconcile users not fully reconciled recently. */
export async function reconcileStale() {
  const db = adminClient();
  const cutoff = new Date(Date.now() - 55 * 60 * 1000).toISOString();
  const { data: users } = await db.from("notion_sync_settings").select("user_id")
    .eq("enabled", true).or(`last_reconciled_at.is.null,last_reconciled_at.lt.${cutoff}`).limit(3);
  for (const u of users ?? []) {
    try {
      await fullSync(u.user_id);
    } catch (e) {
      console.error("reconcile failed", u.user_id, (e as Error).message);
    }
  }
}
