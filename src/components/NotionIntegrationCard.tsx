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
  completedUrl?: string | null;
  tbrUrl?: string | null;
  pageUrl?: string | null;
  fullySynced?: boolean;
  progressStyle?: "classic" | "segmented" | "circular";
};

const STYLES = [
  { id: "classic", name: "Classic Bar", preview: "████████████░░░░░░░░" },
  { id: "segmented", name: "Segmented Bar", preview: "▰▰▰▰▰▰▱▱▱▱" },
  { id: "circular", name: "Circular", preview: "◕ 60%" },
] as const;

type SyncResult = { done?: boolean; remaining?: number };

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

export function NotionIntegrationCard({ embedded = false }: { embedded?: boolean }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
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

  // Once connected but no page chosen, list shared pages automatically.
  useEffect(() => {
    if (status?.connected && !status.reconnectRequired && !status.enabled && pages === null && !busy) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.enabled, status?.reconnectRequired]);

  // Large libraries sync in batches; keep going until everything is in Notion.
  const syncUntilDone = async (first: SyncResult) => {
    let r = first;
    while (r && r.done === false) {
      setProgress(`Adding books to Notion… about ${r.remaining} left`);
      await refresh();
      r = await call<SyncResult>({ action: "sync_now" });
    }
    setProgress(null);
  };

  const setup = (id: string) => run("setup", async () => {
    await syncUntilDone(await call<SyncResult>({ action: "setup", parent_page_id: id }));
    setPages(null);
    toast({ title: "Notion dashboard ready", description: "Look for “ReadReceipt — Currently Reading” on the page you chose." });
  });

  const body = (
        !status?.connected || status.reconnectRequired ? (
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
            <p className="text-sm rounded-md border border-primary/40 bg-primary/5 p-2">
              <strong>One more step:</strong> Notion is connected, but nothing has been added to Notion yet. Pick the page for your reading dashboard below and click <strong>Use this page</strong>.
            </p>
            {status.lastError && <p className="text-sm text-destructive">Last problem: {status.lastError}</p>}
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
              {status.lastError ? "⚠️ Sync is having trouble. " : "✅ Working. "}
              {status.linkedBooks} book{status.linkedBooks === 1 ? "" : "s"} in Notion (Currently Reading, Completed, TBR)
              {status.lastSyncedAt ? ` · last synced ${fmt(status.lastSyncedAt)}` : " · first sync hasn't finished yet"}
            </p>
            <details className="rounded-md border p-3">
              <summary className="cursor-pointer text-sm font-medium">Customize Dashboard</summary>
              <div className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Choose how the reading goal bar at the top of your Notion dashboard looks (the Progress Bar column in Currently Reading matches it). This only changes the look, never your progress.</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {STYLES.map((st) => {
                    const active = (status.progressStyle ?? "classic") === st.id;
                    return (
                      <button key={st.id} type="button" disabled={!!busy}
                        onClick={() => run("style", async () => { await call({ action: "set_style", style: st.id }); toast({ title: `${st.name} applied in Notion` }); })}
                        className={`rounded-md border p-3 text-left transition ${active ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/60"}`}>
                        <p className="text-sm font-medium">{st.name}{active ? " ✓" : ""}</p>
                        <p className="font-mono text-sm text-muted-foreground">{st.preview}</p>
                      </button>
                    );
                  })}
                </div>
                {busy === "style" && <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating Notion…</p>}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Want Notion's own smooth bar or ring?</strong> Notion doesn't let apps set this, so it's a one-time step in Notion:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Open your Currently Reading list and click the <strong>Progress %</strong> column header.</li>
                    <li>Choose <strong>Edit property</strong> → <strong>Show as</strong> → <strong>Bar</strong> or <strong>Ring</strong>.</li>
                    <li>Set <strong>Divide by</strong> to <strong>100</strong> and pick a color.</li>
                  </ol>
                  <p>Progress % stays editable either way. In Gallery view, open <strong>Properties</strong> and turn on Progress Bar or Progress % to show it on each card.</p>
                </div>
              </div>
            </details>
            {progress && <p className="text-sm text-muted-foreground flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress}</p>}
            {!progress && status.fullySynced === false && <p className="text-sm text-muted-foreground">Some books haven't been added yet. Click Sync now to finish.</p>}
            {status.lastError && <p className="text-sm text-destructive">Last problem: {status.lastError}</p>}
            <div className="flex flex-wrap gap-2">
              {status.pageUrl && (
                <Button variant="outline" asChild>
                  <a href={status.pageUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open dashboard</a>
                </Button>
              )}
              {status.databaseUrl && (
                <Button variant="outline" asChild>
                  <a href={status.databaseUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Currently Reading</a>
                </Button>
              )}
              {status.completedUrl && <Button variant="outline" asChild><a href={status.completedUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Completed</a></Button>}
              {status.tbrUrl && <Button variant="outline" asChild><a href={status.tbrUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />TBR</a></Button>}
              <Button variant="outline" onClick={() => run("sync", async () => { await syncUntilDone(await call<SyncResult>({ action: "sync_now" })); toast({ title: "Synced with Notion" }); })} disabled={!!busy}>
                {busy === "sync" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Sync now
              </Button>
              <Button variant="ghost" onClick={() => run("disable", () => call({ action: "disable" }))} disabled={!!busy}>Pause sync</Button>
              <Button variant="ghost" onClick={() => run("disconnect", () => call({ action: "disconnect" }))} disabled={!!busy}>Disconnect</Button>
            </div>
          </div>
        )
  );

  const stateLabel = !status?.connected
    ? "Not connected"
    : status.reconnectRequired
      ? "Needs reconnecting"
      : status.enabled ? "Connected · syncing" : "Connected · choose a page";

  if (embedded) {
    return (
      <div className="p-4 border rounded-lg space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold">N</div>
          <div>
            <p className="font-medium">Notion</p>
            <p className="text-xs text-muted-foreground">{stateLabel}</p>
          </div>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Notion</CardTitle>
        <CardDescription>
          Show your current books, progress, and yearly goal in Notion. Edit Current Page or Progress % there and ReadReceipt updates too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  );
}
