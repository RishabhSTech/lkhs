"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SyncButton({ channelName }: { channelName: string }) {
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    setSyncing(true);
    // Deliberately does not pretend to reach the OTA: with no credentials
    // configured, the honest outcome is "not connected", not a fake success.
    await new Promise((r) => setTimeout(r, 700));
    setSyncing(false);
    toast.error(`${channelName} is not connected`, {
      description:
        "Add channel manager credentials in Settings to enable live syncing. Nothing was sent.",
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
      {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      Sync now
    </Button>
  );
}
