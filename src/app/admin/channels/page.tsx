import { AlertTriangle, Info } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { SyncButton } from "@/components/admin/sync-button";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  ERROR: "border-destructive/25 bg-destructive/10 text-destructive",
  DISCONNECTED: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  NOT_CONFIGURED: "border-border bg-muted text-muted-foreground",
};

export default async function ChannelsPage() {
  const channels = await db.channel.findMany({
    include: {
      properties: {
        include: {
          property: { select: { id: true, name: true } },
          syncLogs: { orderBy: { startedAt: "desc" }, take: 1 },
        },
        orderBy: { property: { name: "asc" } },
      },
    },
  });

  return (
    <AdminPage>
      <PageHeader
        title="Channels"
        description="Lime Kraft inventory is the source of truth. Channels receive availability from here."
      />

      <p className="mt-5 flex items-start gap-2 rounded-lg border border-chart-3/25 bg-chart-3/8 p-4 text-sm leading-relaxed text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-chart-3" />
        <span>
          No live OTA credentials are configured in this environment, so nothing
          is actually being pushed to Airbnb, Booking.com or Agoda. The
          connection states, sync history and error handling below are real
          parts of the system — connect a channel manager and they start
          carrying real traffic.
        </span>
      </p>

      <div className="mt-6 space-y-5">
        {channels.map((channel) => {
          const errorCount = channel.properties.filter(
            (p) => p.status === "ERROR",
          ).length;

          return (
            <section
              key={channel.id}
              className="rounded-xl border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="font-heading text-lg text-brand-green">
                    {channel.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {channel.properties.length} listings
                    {errorCount > 0 && ` · ${errorCount} needing attention`}
                  </p>
                </div>
                <SyncButton channelName={channel.name} />
              </div>

              <ul className="divide-y divide-border">
                {channel.properties.map((cp) => (
                  <li
                    key={cp.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {cp.property.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cp.externalListingId ? (
                          <span className="font-mono">{cp.externalListingId}</span>
                        ) : (
                          "No external listing linked"
                        )}
                        {cp.lastSyncAt &&
                          ` · last sync ${formatDateLong(cp.lastSyncAt)}`}
                      </p>
                      {cp.syncLogs[0]?.status === "ERROR" && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
                          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                          {cp.syncLogs[0].message}
                        </p>
                      )}
                    </div>
                    <Badge className={STATUS_STYLES[cp.status]}>
                      {cp.status.toLowerCase().replace(/_/g, " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AdminPage>
  );
}
