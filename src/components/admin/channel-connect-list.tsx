"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ChannelCode } from "@prisma/client";
import { AlertTriangle, Link2, Link2Off, Loader2, Plug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDateLong } from "@/lib/format";
import { SyncButton } from "@/components/admin/sync-button";

type PropertyRow = {
  id: string;
  channelPropertyId: string | null;
  name: string;
  locationArea: string;
  status: string;
  externalListingId: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  ERROR: "border-destructive/25 bg-destructive/10 text-destructive",
  DISCONNECTED: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  NOT_CONFIGURED: "border-border bg-muted text-muted-foreground",
};

export function ChannelConnectList({
  channelCode,
  channelName,
  fields,
  properties,
}: {
  channelCode: ChannelCode;
  channelName: string;
  fields: { key: string; label: string; placeholder: string; help?: string }[];
  properties: PropertyRow[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PropertyRow | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function openFor(property: PropertyRow) {
    setEditing(property);
    setValues({ listingId: property.externalListingId ?? "" });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelCode,
          propertyId: editing.id,
          externalListingId:
            values.listingId ?? values.hotelId ?? values.propertyId ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");

      toast.success(`${editing.name} linked to ${channelName}`, {
        description:
          "Saved as pending. It stays disconnected until API access is approved and credentials are live.",
      });
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect(property: PropertyRow) {
    const res = await fetch("/api/admin/channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelCode, propertyId: property.id }),
    });
    if (res.ok) {
      toast.success(`${property.name} unlinked from ${channelName}`);
      router.refresh();
    } else {
      toast.error("Could not unlink that property.");
    }
  }

  const isDirect = channelCode === "WEBSITE";

  return (
    <>
      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Properties on {channelName}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isDirect
              ? "Every property is bookable directly — nothing to configure."
              : "Link each property to its listing on this channel."}
          </p>
        </div>

        <ul className="divide-y divide-border">
          {properties.map((property) => (
            <li key={property.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {property.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {property.locationArea}
                  {property.externalListingId && (
                    <>
                      {" · "}
                      <span className="font-mono">
                        {property.externalListingId}
                      </span>
                    </>
                  )}
                  {property.lastSyncAt &&
                    ` · last sync ${formatDateLong(property.lastSyncAt)}`}
                </p>
                {property.lastError && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                    {property.lastError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Badge className={STATUS_STYLES[property.status]}>
                  {property.status.toLowerCase().replace(/_/g, " ")}
                </Badge>

                {!isDirect && (
                  <>
                    {property.channelPropertyId && property.externalListingId && (
                      <SyncButton
                        channelName={channelName}
                        channelPropertyId={property.channelPropertyId}
                        onSynced={() => router.refresh()}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openFor(property)}
                    >
                      <Link2 />
                      {property.externalListingId ? "Edit" : "Connect"}
                    </Button>
                    {property.externalListingId && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => disconnect(property)}
                        aria-label={`Unlink ${property.name}`}
                      >
                        <Link2Off />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="size-4 text-brand-azure" />
              Connect {editing?.name}
            </DialogTitle>
            <DialogDescription>
              Link this property to its {channelName} listing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {field.label}
                </Label>
                <Input
                  value={values[field.key] ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  type={field.key.includes("password") ? "password" : "text"}
                />
                {field.help && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {field.help}
                  </p>
                )}
              </div>
            ))}

            <p className="rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
              Saving records the mapping so reservations from this channel land
              on the right property. Syncing stays off until {channelName} grants
              API access — the status will show as pending, not connected.
            </p>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Save connection
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
