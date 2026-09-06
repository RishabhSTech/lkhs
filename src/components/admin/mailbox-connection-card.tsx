"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  ERROR: "border-destructive/25 bg-destructive/10 text-destructive",
  DISCONNECTED: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  NOT_CONFIGURED: "border-border bg-muted text-muted-foreground",
};

export function MailboxConnectionCard({
  integration,
}: {
  integration: {
    email: string;
    imapHost: string;
    imapPort: number;
    status: string;
    connectedAt: string | null;
    lastSyncAt: string | null;
  } | null;
}) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(!integration || integration.status !== "CONNECTED");

  const [host, setHost] = useState(integration?.imapHost ?? "imap.hostinger.com");
  const [port, setPort] = useState(String(integration?.imapPort ?? 993));
  const [secure, setSecure] = useState(true);
  const [email, setEmail] = useState(integration?.email ?? "homestay@limekraftgroup.com");
  const [password, setPassword] = useState("");

  const connected = integration?.status === "CONNECTED";

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/integrations/mailbox/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port: Number(port), secure, email, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not connect.");
      toast.success("Mailbox connected");
      setPassword("");
      setShowForm(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/integrations/mailbox/sync-now", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not start a sync.");
      toast.success("Sync queued", { description: "New emails will be parsed shortly." });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start a sync.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/admin/integrations/mailbox/disconnect", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not disconnect.");
      toast.success("Mailbox disconnected");
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
            <Mail className="size-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mailbox — OTA email parsing</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Reads homestay@limekraftgroup.com (Hostinger/IMAP — no OAuth needed) for Airbnb,
              Booking.com and Agoda notification emails every 5 minutes and pulls inquiries and
              bookings into the site.
            </p>
          </div>
        </div>
        <Badge className={STATUS_STYLES[integration?.status ?? "NOT_CONFIGURED"]}>
          {(integration?.status ?? "NOT_CONFIGURED").toLowerCase().replace(/_/g, " ")}
        </Badge>
      </div>

      {connected && !showForm && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {integration!.email} · {integration!.imapHost}
            {integration!.connectedAt && ` · connected ${new Date(integration!.connectedAt).toLocaleDateString()}`}
            {integration!.lastSyncAt && ` · last synced ${new Date(integration!.lastSyncAt).toLocaleString()}`}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing}>
              {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Sync now
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
              Edit
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Mailbox email
              </Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="homestay@limekraftgroup.com" />
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Mailbox password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                IMAP host
              </Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Port
              </Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="imap-secure" checked={secure} onCheckedChange={(v) => setSecure(v === true)} />
              <Label htmlFor="imap-secure" className="text-sm font-normal text-foreground">
                Use SSL/TLS (recommended)
              </Label>
            </div>
          </div>

          <p className="rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
            Hostinger/Titan mail defaults: imap.hostinger.com, port 993, SSL/TLS on. Username is the
            full email address; use the mailbox password (or an app password if the mailbox has
            extra verification enabled). The connection is tested before anything is saved, and the
            password is encrypted at rest — never shown again after saving.
          </p>

          <div className="flex gap-2">
            <Button onClick={connect} disabled={connecting || !email || !password || !host}>
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
