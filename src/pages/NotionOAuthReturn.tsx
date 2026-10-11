import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function NotionOAuthReturn() {
  const [message, setMessage] = useState("Finishing Notion connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed", reason?: string) => {
      window.opener?.postMessage({ type, connectorId: "notion", reason }, window.location.origin);
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Notion connection did not complete.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        const reason = "This connection can't be used yet: offline access must be enabled on the Notion client.";
        setMessage(reason);
        window.opener?.postMessage({ type: "appUserConnectorOAuthFailed", connectorId: "notion", reason }, window.location.origin);
        return;
      }
      setMessage("Notion connection finished without a code.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    void supabase.functions
      .invoke("notion-oauth-complete", { body: { code } })
      .then(({ error }) => {
        if (error) throw error;
        notify("appUserConnectorOAuthComplete");
      })
      .catch(() => {
        setMessage("Could not finish the Notion connection.");
        notify("appUserConnectorOAuthFailed");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
