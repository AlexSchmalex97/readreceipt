import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { countCompletedThisYear, percentFor, resolveNotionEdit } from "./notionSyncMath.ts";

const base = { lastPushedPage: 100, lastPushedPercent: 25, totalPages: 400 };

Deno.test("editing Current Page in Notion applies that page", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: 150, notionPercent: 25 }), { kind: "apply", page: 150 });
});

Deno.test("editing Progress % converts to a page count", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: 100, notionPercent: 50 }), { kind: "apply", page: 200 });
});

Deno.test("Current Page wins when both change", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: 120, notionPercent: 90 }), { kind: "apply", page: 120 });
});

Deno.test("our own echoed values are ignored", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: 100, notionPercent: 25 }), { kind: "none" });
});

Deno.test("pages above total are clamped to total", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: 999, notionPercent: 25 }), { kind: "apply", page: 400 });
});

Deno.test("negative pages and percents over 100 are rejected", () => {
  assertEquals(resolveNotionEdit({ ...base, notionPage: -5, notionPercent: 25 }).kind, "invalid");
  assertEquals(resolveNotionEdit({ ...base, notionPage: 100, notionPercent: 150 }).kind, "invalid");
});

Deno.test("percent is rounded to one decimal", () => {
  assertEquals(percentFor(1, 3), 33.3);
});

Deno.test("goal count dedupes books that have a reading entry", () => {
  const n = countCompletedThisYear(
    2026,
    [{ book_id: "a", finished_at: "2026-02-01" }],
    [
      { id: "a", status: "completed", current_page: 10, total_pages: 10, finished_at: "2026-02-01", created_at: null },
      { id: "b", status: "completed", current_page: 10, total_pages: 10, finished_at: "2026-03-01", created_at: null },
      { id: "c", status: "dnf", current_page: 10, total_pages: 10, finished_at: "2026-03-01", created_at: null },
    ],
  );
  assertEquals(n, 2);
});
