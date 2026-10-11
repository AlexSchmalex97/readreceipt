// Pure sync rules (no I/O) so they can be unit tested.

export function percentFor(page: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((Math.max(0, Math.min(page, total)) / total) * 1000) / 10;
}

export function pageForPercent(percent: number, total: number): number {
  return clampPage(Math.round((percent * total) / 100), total);
}

export function clampPage(page: number, total: number): number {
  return Math.max(0, Math.min(Math.round(page), Math.max(0, total)));
}

export type NotionEdit =
  | { kind: "none" }
  | { kind: "invalid" }
  | { kind: "apply"; page: number };

/**
 * Decide what a Notion edit means. Values equal to what we last pushed are
 * our own echo and are ignored (loop prevention). Current Page wins when both
 * fields changed.
 */
export function resolveNotionEdit(input: {
  notionPage: number | null;
  notionPercent: number | null;
  lastPushedPage: number | null;
  lastPushedPercent: number | null;
  totalPages: number;
}): NotionEdit {
  const { notionPage, notionPercent, lastPushedPage, lastPushedPercent, totalPages } = input;
  const pageChanged = notionPage !== null && notionPage !== lastPushedPage;
  const pctChanged = notionPercent !== null &&
    (lastPushedPercent === null || Math.abs(notionPercent - lastPushedPercent) >= 0.05);

  if (pageChanged) {
    if (!Number.isFinite(notionPage) || (notionPage as number) < 0) return { kind: "invalid" };
    return { kind: "apply", page: clampPage(notionPage as number, totalPages) };
  }
  if (pctChanged) {
    if (!Number.isFinite(notionPercent) || (notionPercent as number) < 0 || (notionPercent as number) > 100) {
      return { kind: "invalid" };
    }
    return { kind: "apply", page: pageForPercent(notionPercent as number, totalPages) };
  }
  // Someone cleared a field: restore it.
  if (notionPage === null || notionPercent === null) return { kind: "invalid" };
  return { kind: "none" };
}

/** Mirrors the home page's "books completed this year" count. */
export function countCompletedThisYear(
  year: number,
  entries: { book_id: string; finished_at: string | null }[],
  books: { id: string; status: string | null; current_page: number | null; total_pages: number | null; finished_at: string | null; created_at: string | null }[],
): number {
  const yearEntries = entries.filter((e) => e.finished_at && new Date(e.finished_at).getFullYear() === year);
  const withEntry = new Set(yearEntries.map((e) => e.book_id));
  const extra = books.filter((b) => {
    if (withEntry.has(b.id)) return false;
    if (b.status === "dnf" || b.status === "top_five") return false;
    const done = b.status === "completed" || (b.current_page ?? 0) >= (b.total_pages ?? 0);
    if (!done) return false;
    if (b.finished_at) return new Date(b.finished_at).getFullYear() === year;
    if (b.status === "completed" && b.created_at) return new Date(b.created_at).getFullYear() === year;
    return false;
  }).length;
  return yearEntries.length + extra;
}

/**
 * Which Notion list a ReadReceipt book belongs on. Mirrors the home page:
 * Currently Reading = current page < total pages (not DNF / Top Five);
 * Completed = reached the last page or marked completed (not DNF / Top Five).
 */
export function shelfFor(b: { status: string | null; current_page: number | null; total_pages: number | null }):
  "reading" | "completed" | null {
  if (b.status === "dnf" || b.status === "top_five") return null;
  if ((b.current_page ?? 0) < (b.total_pages ?? 0)) return "reading";
  return "completed";
}

export const PROGRESS_STYLES = ["classic", "segmented", "circular"] as const;
export type ProgressStyle = typeof PROGRESS_STYLES[number];

/**
 * Notion formula for the read-only "Progress Bar" column. Display only: it reads
 * Progress % and never changes reading progress.
 */
export function progressFormula(style: string | null | undefined, percentProp: string): string {
  const pct = `min(max(prop("${percentProp}"), 0), 100)`;
  const label = `format(round(${pct})) + "%"`;
  if (style === "segmented") {
    // 5 sections of 20%: ▰▰▰▱▱
    return `repeat("▰", floor(${pct} / 20)) + repeat("▱", 5 - floor(${pct} / 20)) + "  " + ${label}`;
  }
  if (style === "circular") {
    return `(if(${pct} >= 100, "●", if(${pct} >= 75, "◕", if(${pct} >= 50, "◑", if(${pct} >= 25, "◔", "○"))))) + " " + ${label}`;
  }
  return `repeat("█", round(${pct} / 10)) + repeat("░", 10 - round(${pct} / 10)) + " " + ${label}`;
}
