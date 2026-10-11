import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { disconnectAppUser } from "../_shared/appUserConnector.ts";
import { adminClient, deleteConnectionForUser, getConnectionKeyForUser } from "../_shared/appUserConnections.ts";
import { getUser } from "../_shared/auth.ts";
import {
  fullSync,
  GATEWAY_BASE_URL,
  notion,
  NOTION,
  ReconnectRequired,
  ensureDatabases,
  pushGoal,
  setupDashboard,
} from "../_shared/notionSync.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("search_pages"), query: z.string().max(200).optional() }),
  z.object({ action: z.literal("setup"), parent_page_id: z.string().min(10).max(64) }),
  z.object({ action: z.literal("sync_now") }),
  z.object({ action: z.literal("disable") }),
  z.object({ action: z.literal("set_style"), style: z.enum(["classic", "segmented", "circular"]) }),
  z.object({ action: z.literal("disconnect") }),
]);

function pageTitle(p: any): string {
  const t = Object.values(p.properties ?? {}).find((v: any) => v?.type === "title") as any;
  return t?.title?.map((r: any) => r.plain_text).join("") || "Untitled";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const user = await getUser(req);
  if (!user) return json({ error: "Sign in required" }, 401);

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const body = parsed.data;
  const db = adminClient();

  try {
    if (body.action === "status") {
      const [{ data: conn }, { data: settings }, { count }] = await Promise.all([
        db.from("app_user_connections").select("reconnect_required").eq("user_id", user.id).eq("connector_id", NOTION)
          .maybeSingle(),
        db.from("notion_sync_settings").select("enabled,parent_page_id,books_database_id,progress_style,completed_database_id,tbr_database_id,last_synced_at,last_reconciled_at,last_error")
          .eq("user_id", user.id).maybeSingle(),
        db.from("notion_book_links").select("book_id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return json({
        connected: !!conn,
        reconnectRequired: !!conn?.reconnect_required,
        enabled: !!settings?.enabled,
        databaseUrl: settings?.books_database_id
          ? `https://www.notion.so/${settings.books_database_id.replace(/-/g, "")}`
          : null,
        completedUrl: settings?.completed_database_id ? `https://www.notion.so/${settings.completed_database_id.replace(/-/g, "")}` : null,
        tbrUrl: settings?.tbr_database_id ? `https://www.notion.so/${settings.tbr_database_id.replace(/-/g, "")}` : null,
        pageUrl: settings?.parent_page_id ? `https://www.notion.so/${settings.parent_page_id.replace(/-/g, "")}` : null,
        progressStyle: settings?.progress_style ?? "classic",
        fullySynced: !!settings?.last_reconciled_at,
        lastSyncedAt: settings?.last_synced_at ?? null,
        lastError: settings?.last_error ?? null,
        linkedBooks: count ?? 0,
      });
    }

    const key = await getConnectionKeyForUser(user.id, NOTION);
    if (!key) return json({ connected: false, error: "Notion is not connected" }, 400);

    if (body.action === "search_pages") {
      const res = await notion(user.id, key, "POST", "/v1/search", {
        query: body.query ?? "",
        filter: { property: "object", value: "page" },
        page_size: 25,
      });
      const pages = (res.results ?? [])
        .filter((p: any) => p.parent?.type !== "data_source_id" && p.parent?.type !== "database_id")
        .map((p: any) => ({ id: p.id, title: pageTitle(p), icon: p.icon?.emoji ?? null }));
      return json({ pages });
    }

    if (body.action === "setup") {
      await setupDashboard(user.id, body.parent_page_id);
      return json({ ok: true, ...(await fullSync(user.id)) });
    }

    if (body.action === "sync_now") {
      return json({ ok: true, ...(await fullSync(user.id)) });
    }

    if (body.action === "set_style") {
      // Display only: rewrites the Progress Bar formula; reading progress is untouched.
      const { data: settings } = await db.from("notion_sync_settings").update({ progress_style: body.style })
        .eq("user_id", user.id).select("*").maybeSingle();
      if (settings?.parent_page_id) {
        await pushGoal(user.id, key, settings);
        await ensureDatabases(user.id, key, settings);
      }
      return json({ ok: true });
    }

    if (body.action === "disable") {
      await db.from("notion_sync_settings").update({ enabled: false }).eq("user_id", user.id);
      await db.from("notion_sync_queue").delete().eq("user_id", user.id);
      return json({ ok: true });
    }

    if (body.action === "disconnect") {
      await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: NOTION })
        .catch((e) => console.warn("gateway disconnect", e.message));
      await deleteConnectionForUser(user.id, NOTION);
      await db.from("notion_sync_queue").delete().eq("user_id", user.id);
      await db.from("notion_book_links").delete().eq("user_id", user.id);
      await db.from("notion_sync_settings").delete().eq("user_id", user.id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    if (e instanceof ReconnectRequired) return json({ connected: true, reconnectRequired: true }, 200);
    console.error("notion-dashboard", e);
    return json({ error: (e as Error).message }, 500);
  }
});
