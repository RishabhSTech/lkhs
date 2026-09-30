"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, RefreshCw, Unlink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  ERROR: "border-destructive/25 bg-destructive/10 text-destructive",
  DISCONNECTED: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  NOT_CONFIGURED: "border-border bg-muted text-muted-foreground",
};

export function AnthropicConnectionCard({
  integration,
}: {
  integration: {
    status: string;
    error: string | null;
    connectedAt: string | null;
    lastCheckedAt: string | null;
  } | null;
}) {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(!integration || integration.status !== "CONNECTED");
  const [apiKey, setApiKey] = useState("");

  const connected = integration?.status === "CONNECTED";

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/integrations/anthropic/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not connect.");
      toast.success("Anthropic API key connected");
      setApiKey("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect.");
      router.refresh();
    } finally {
      setConnecting(false);
    }
  }

  async function testNow() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/integrations/anthropic/test", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not connect.");
      toast.success("Key is working");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect.");
      router.refresh();
    } finally {
      setTesting(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/admin/integrations/anthropic/disconnect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not disconnect.");
      toast.success("Anthropic API key disconnected");
      setShowForm(true);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted">
            <Sparkles className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Anthropic API key</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Powers the OTA mailbox email extractor and the guest-facing chatbot. Set it here so
              it can be rotated or fixed without a redeploy - falls back to the ANTHROPIC_API_KEY
              env var if nothing is set here.
            </p>
          </div>
        </div>
        <Badge className={STATUS_STYLES[integration?.status ?? "NOT_CONFIGURED"]}>
          {(integration?.status ?? "NOT_CONFIGURED").toLowerCase().replace(/_/g, " ")}
        </Badge>
      </div>

      {integration?.status === "ERROR" && integration.error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {integration.error}
        </p>
      )}

      {connected && !showForm && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {integration!.connectedAt && `Connected ${new Date(integration!.connectedAt).toLocaleDateString()}`}
            {integration!.lastCheckedAt && ` · last checked ${new Date(integration!.lastCheckedAt).toLocaleString()}`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={testNow} disabled={testing}>
              {testing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Test now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
              Change key
            </Button>
            <Button variant="ghost" size="sm" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="animate-spin" /> : <Unlink />}
              Disconnect
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div>
            <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              API key
            </Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-…"
            />
          </div>

          <p className="rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
            Create a key at console.anthropic.com → Settings → API Keys, with a specific Workspace
            selected (not organization-wide scope). The key is tested with a real request before
            being saved - encrypted at rest, never shown again after saving.
          </p>

          <div className="flex gap-2">
            <Button onClick={connect} disabled={connecting || !apiKey}>
              {connecting && <Loader2 className="animate-spin" />}
              {connected ? "Save & reconnect" : "Save & test connection"}
            </Button>
            {connected && (
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
