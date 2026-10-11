// Called every minute by pg_cron: drains queued pushes and reconciles drift.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { processQueue, reconcileStale } from "../_shared/notionSync.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    await processQueue();
    await reconcileStale();
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("notion-worker", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
