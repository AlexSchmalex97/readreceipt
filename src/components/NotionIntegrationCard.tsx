import { useCallback, useEffect, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";

type Status = {
  connected: boolean;
  reconnectRequired: boolean;
  enabled: boolean;
  databaseUrl: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  linkedBooks: number;
};

async function call<T = any>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("notion-dashboard", { body });
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    let msg = details;
    try { msg = JSON.parse(details).error ?? details; } catch { /* plain text */ }
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }
  return data as T;
}

function waitForOAuth(popup: Window) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => { window.removeEventListener("message", onMsg); window.clearInterval(poll); };
    const onMsg = (e: MessageEvent) => {
      const t = e.data?.type;
      if (e.origin !== window.location.origin || e.source !== popup || e.data?.connectorId !== "notion") return;
      if (t !== "appUserConnectorOAuthComplete" && t !== "appUserConnectorOAuthFailed") return;
      cleanup();
      if (t === "appUserConnectorOAuthComplete") resolve();
      else { popup.close(); reject(new Error(e.data?.reason ?? "Notion connection failed.")); }
    };
    window.addEventListener("message", onMsg);
    const poll = window.setInterval(() => {
      if (popup.closed) { cleanup(); reject(new Error("The Notion window was closed before finishing.")); }
    }, 500);
  });
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { timeZone: "America/New_York", month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
};

export function NotionIntegrationCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<{ id: string; title: string; icon: string | null }[] | null>(null);

  const refresh = useCallback(async () => {
    try { setStatus(await call<Status>({ action: "status" })); } catch { setStatus(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); } catch (e: any) {
      toast({ title: "Notion", description: e.message, variant: "destructive" });
    } finally { setBusy(null); refresh(); }
  };

  const connect = () => {
    const popup = window.open("", "notion-oauth", "width=600,height=720");
    if (!popup) {
      toast({ title: "Popup blocked", description: "Allow popups and try again.", variant: "destructive" });
      return;
    }
    run("connect", async () => {
      try {
        const { data, error } = await supabase.functions.invoke("notion-oauth-start", { body: { origin: window.location.origin } });
        if (error) throw error;
        const done = waitForOAuth(popup);
        popup.location.href = data.authorizationUrl;
        await done;
        toast({ title: status?.connected ? "Reconnected to Notion" : "Connected to Notion" });
      } catch (e) { popup.close(); throw e; }
    });
  };

  const search = () => run("search", async () => {
    const res = await call<{ pages: any[] }>({ action: "search_pages", query });
    setPages(res.pages);
  });

  const setup = (id: string) => run("setup", async () => {
    await call({ action: "setup", parent_page_id: id });
    setPages(null);
    toast({ title: "Notion dashboard created", description: "Your reading dashboard is now in Notion." });
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Notion</CardTitle>
        <CardDescription>
          Show your current books, progress, and yearly goal in Notion. Edit Current Page or Progress % there and ReadReceipt updates too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected || status.reconnectRequired ? (
          <>
            {status?.reconnectRequired && <p className="text-sm text-muted-foreground">Your Notion access needs to be renewed.</p>}
            <Button onClick={connect} disabled={!!busy}>
              {busy === "connect" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {status?.reconnectRequired ? "Reconnect Notion" : "Connect Notion"}
            </Button>
            <p className="text-sm text-muted-foreground">When Notion asks, share the page where the dashboard should go (for example, Media Corner).</p>
          </>
        ) : !status.enabled ? (
          <div className="space-y-3">
            <p className="text-sm">Choose the Notion page for your reading dashboard:</p>
            <div className="flex gap-2">
              <Input placeholder="Search your shared pages, e.g. Media Corner" value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()} />
              <Button variant="outline" onClick={search} disabled={!!busy}>
                {busy === "search" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            {pages && (pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages found. Make sure the page is shared with ReadReceipt in Notion, then reconnect.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {pages.map((p) => (
                  <li key={p.id} className="flex items-center justify-between p-2">
                    <span className="truncate">{p.icon ? `${p.icon} ` : ""}{p.title}</span>
                    <Button size="sm" onClick={() => setup(p.id)} disabled={!!busy}>
                      {busy === "setup" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Use this page"}
                    </Button>
                  </li>
                ))}
              </ul>
            ))}
            <Button variant="ghost" size="sm" onClick={() => run("disconnect", () => call({ action: "disconnect" }))} disabled={!!busy}>
              Disconnect Notion
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              Syncing {status.linkedBooks} book{status.linkedBooks === 1 ? "" : "s"}
              {status.lastSyncedAt ? ` · last synced ${fmt(status.lastSyncedAt)}` : ""}
            </p>
            {status.lastError && <p className="text-sm text-destructive">Last problem: {status.lastError}</p>}
            <div className="flex flex-wrap gap-2">
              {status.databaseUrl && (
                <Button variant="outline" asChild>
                  <a href={status.databaseUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open in Notion</a>
                </Button>
              )}
              <Button variant="outline" onClick={() => run("sync", async () => { await call({ action: "sync_now" }); toast({ title: "Synced with Notion" }); })} disabled={!!busy}>
                {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Sync now
              </Button>
              <Button variant="ghost" onClick={() => run("disable", () => call({ action: "disable" }))} disabled={!!busy}>Pause sync</Button>
              <Button variant="ghost" onClick={() => run("disconnect", () => call({ action: "disconnect" }))} disabled={!!busy}>Disconnect</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
