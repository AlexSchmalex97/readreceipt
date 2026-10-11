// Receives Notion webhook events. Public endpoint; authenticity is proven by
// the X-Notion-Signature HMAC (NOTION_WEBHOOK_VERIFICATION_TOKEN).
import { adminClient, getConnectionKeyForUser } from "../_shared/appUserConnections.ts";
import { NOTION, pullPage, pullTbr } from "../_shared/notionSync.ts";

async function validSignature(raw: string, header: string | null, token: string) {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(token), { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function handle(event: any) {
  const db = adminClient();
  if (event.id) {
    const { error } = await db.from("notion_webhook_events").insert({ event_id: event.id });
    if (error) return; // already processed
  }
  const pageId = event.entity?.type === "page" ? event.entity.id : null;
  if (!pageId) return;

  const { data: link } = await db.from("notion_book_links").select("*").eq("notion_page_id", pageId).maybeSingle();
  if (!link) return; // not one of our rows -> ignore

  if (event.type === "page.deleted") {
    await db.from("notion_book_links").delete().eq("book_id", link.book_id);
    return;
  }
  if (!["page.properties_updated", "page.undeleted", "page.moved"].includes(event.type)) return;

  const { data: settings } = await db.from("notion_sync_settings").select("*").eq("user_id", link.user_id).maybeSingle();
  if (!settings?.enabled) return;
  // Ignore edits made by our own integration (loop prevention).
  const authors: any[] = event.authors ?? [];
  if (settings.bot_id && authors.length > 0 && authors.every((a) => a.id === settings.bot_id)) return;

  const key = await getConnectionKeyForUser(link.user_id, NOTION);
  if (!key) return;
  if (link.kind === "tbr") await pullTbr(link.user_id, key, settings, link);
  else await pullPage(link.user_id, key, settings, link);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const raw = await req.text();
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }

  // One-time subscription verification: store the token so the admin can
  // paste it back into Notion and save it as a secret.
  if (body?.verification_token && !body.type) {
    await adminClient().from("notion_webhook_tokens").insert({ token: String(body.verification_token) });
    console.log("Notion webhook verification token received");
    return new Response("ok");
  }

  const token = Deno.env.get("NOTION_WEBHOOK_VERIFICATION_TOKEN");
  if (!token) {
    console.error("NOTION_WEBHOOK_VERIFICATION_TOKEN not set; ignoring event");
    return new Response("not configured", { status: 503 });
  }
  if (!(await validSignature(raw, req.headers.get("X-Notion-Signature"), token))) {
    return new Response("invalid signature", { status: 401 });
  }

  const work = handle(body).catch((e) => console.error("notion-webhook", e));
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  if (rt?.waitUntil) rt.waitUntil(work);
  else await work;
  return new Response("ok");
});
