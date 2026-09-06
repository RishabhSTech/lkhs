"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type Status = "checking" | "unsupported" | "unconfigured" | "off" | "on";

/**
 * Enables browser push so a new inquiry reaches the team the instant it
 * lands — install this as an app (Add to Home Screen / Install app) and it
 * behaves like a real push notification even with the tab closed.
 */
export function PushAlertButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (!publicKey) {
      setStatus("unconfigured");
      return;
    }
    navigator.serviceWorker.getRegistration("/").then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notifications were blocked — enable them in your browser's site settings to get instant alerts.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });

      const res = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not enable alerts.");

      setStatus("on");
      toast.success("Instant alerts enabled — send yourself a test to confirm it reaches this device.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not enable instant alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/admin/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("off");
      toast.success("Instant alerts turned off on this device.");
    } catch {
      toast.error("Could not turn off alerts.");
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/push/test", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Test alert sent — check for a push notification.");
    } catch {
      toast.error("Could not send the test alert.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking" || status === "unsupported" || status === "unconfigured") return null;

  if (status === "on") {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={sendTest} title="Send a test alert">
          <BellRing className="text-chart-1" />
          <span className="sr-only">Instant alerts on — send test</span>
        </Button>
        <Button variant="ghost" size="icon-sm" disabled={busy} onClick={disable} title="Turn off instant alerts">
          <BellOff />
          <span className="sr-only">Turn off instant alerts</span>
        </Button>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={enable} className="gap-1.5">
      <BellRing className="size-3.5" />
      Enable instant alerts
    </Button>
  );
}
