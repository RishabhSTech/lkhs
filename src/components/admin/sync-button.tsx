"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton({
  channelName,
  channelPropertyId,
  onSynced,
}: {
  channelName: string;
  channelPropertyId: string;
  onSynced?: () => void;
}) {
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/channels/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelPropertyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed.");

      toast.success(`Sync queued for ${channelName}`, {
        description: "The worker will push availability and rates shortly.",
      });
      onSynced?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
      {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Sync now
    </Button>
  );
}
