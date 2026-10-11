import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { authorizeAppUserOAuth } from "../_shared/appUserConnector.ts";
import { getConnectionKeyForUser } from "../_shared/appUserConnections.ts";
import { getUser } from "../_shared/auth.ts";
import { GATEWAY_BASE_URL, NOTION } from "../_shared/notionSync.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Sign in required" }, 401);

    const clientAPIKey = Deno.env.get("NOTION_APP_USER_CONNECTOR_CLIENT_API_KEY");
    if (!clientAPIKey) return json({ error: "Notion is not configured for this app" }, 500);

    const parsed = z.object({ origin: z.string().url() }).safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid origin" }, 400);
    const returnUrl = new URL("/oauth/notion/return", parsed.data.origin).toString();

    const existing = await getConnectionKeyForUser(user.id, NOTION);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: NOTION,
      appUserId: user.id,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: existing ?? undefined,
    });
    return json({ authorizationUrl });
  } catch (e) {
    console.error("notion-oauth-start", e);
    return json({ error: (e as Error).message }, 500);
  }
});
