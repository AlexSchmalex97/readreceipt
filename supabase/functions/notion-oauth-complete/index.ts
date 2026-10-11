import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { exchangeAppUserOAuthCode } from "../_shared/appUserConnector.ts";
import { saveConnectionKeyForUser } from "../_shared/appUserConnections.ts";
import { getUser } from "../_shared/auth.ts";
import { GATEWAY_BASE_URL, NOTION } from "../_shared/notionSync.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "Sign in required" }, 401);

    const parsed = z.object({ code: z.string().min(1).max(2000) }).safeParse(await req.json());
    if (!parsed.success) return json({ error: "Missing code" }, 400);

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, parsed.data.code);
    if (connectorId !== NOTION) return json({ error: "Wrong connector" }, 400);
    await saveConnectionKeyForUser(user.id, connectorId, connectionAPIKey);
    return json({ ok: true });
  } catch (e) {
    console.error("notion-oauth-complete", e);
    return json({ error: (e as Error).message }, 500);
  }
});
