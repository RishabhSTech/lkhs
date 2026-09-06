import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { CHANNEL_GUIDES, CHANNEL_ORDER } from "@/lib/admin/channel-guides";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  ERROR: "border-destructive/25 bg-destructive/10 text-destructive",
  DISCONNECTED: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  NOT_CONFIGURED: "border-border bg-muted text-muted-foreground",
};

export default async function ChannelsPage() {
  const [channels, propertyCount] = await Promise.all([
    db.channel.findMany({
      include: {
        properties: {
          include: {
            property: { select: { name: true } },
            syncLogs: { orderBy: { startedAt: "desc" }, take: 1 },
          },
        },
      },
    }),
    db.property.count(),
  ]);

  const byCode = new Map(channels.map((c) => [c.code, c]));

  return (
    <AdminPage>
      <PageHeader
        title="Channels"
        description="Lime Kraft inventory is the source of truth. Channels receive availability from here."
      />

      <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-chart-3/25 bg-chart-3/8 p-4 text-sm leading-relaxed">
        <Info className="mt-0.5 size-4 shrink-0 text-chart-3" />
        <span className="text-muted-foreground">
          No live OTA credentials are configured, so nothing is syncing to
          Airbnb, Booking.com or Agoda yet. You can map listings to properties
          now - open a channel for its setup instructions.
        </span>
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {CHANNEL_ORDER.map((code) => {
          const guide = CHANNEL_GUIDES[code];
          const channel = byCode.get(code);
          const links = channel?.properties ?? [];
          const connected = links.filter((l) => l.status === "CONNECTED").length;
          const errors = links.filter((l) => l.status === "ERROR").length;
          const mapped = links.filter((l) => l.externalListingId).length;
          const lastSync = links
            .map((l) => l.lastSyncAt)
            .filter(Boolean)
            .sort((a, b) => (b! > a! ? 1 : -1))[0];

          return (
            <Link
              key={code}
              href={`/admin/channels/${code.toLowerCase()}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-lg text-foreground">
                    {guide.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {guide.blurb}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                {code === "WEBSITE" ? (
                  <Badge className={STATUS_STYLES.CONNECTED}>
                    always connected
                  </Badge>
                ) : errors > 0 ? (
                  <Badge className={STATUS_STYLES.ERROR}>
                    {errors} need attention
                  </Badge>
                ) : connected > 0 ? (
                  <Badge className={STATUS_STYLES.CONNECTED}>
                    {connected} connected
                  </Badge>
                ) : (
                  <Badge className={STATUS_STYLES.NOT_CONFIGURED}>
                    not connected
                  </Badge>
                )}

                <span className="text-xs text-muted-foreground">
                  {mapped} of {propertyCount} properties mapped
                  {lastSync && ` · last sync ${formatDateLong(lastSync)}`}
                </span>
              </div>

              <p className="mt-2.5 text-xs text-muted-foreground">
                Commission: {guide.commission}
              </p>
            </Link>
          );
        })}
      </div>
    </AdminPage>
  );
}
