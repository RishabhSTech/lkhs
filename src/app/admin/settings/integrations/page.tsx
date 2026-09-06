import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { MailboxConnectionCard } from "@/components/admin/mailbox-connection-card";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  PROCESSED: "Logged",
  NEEDS_REVIEW: "Needs review",
  FAILED: "Failed",
};

const STATUS_STYLES: Record<string, string> = {
  PROCESSED: "border-chart-1/25 bg-chart-1/10 text-chart-1",
  NEEDS_REVIEW: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  FAILED: "border-destructive/25 bg-destructive/10 text-destructive",
};

const OTA_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  DIRECT: "Direct",
  OTHER: "Other",
};

export default async function IntegrationsPage() {
  const [integration, recent] = await Promise.all([
    db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } }),
    db.processedEmailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        message: { select: { id: true } },
        reservation: { select: { id: true, code: true } },
      },
    }),
  ]);

  return (
    <AdminPage>
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Settings
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Integrations"
          description="Airbnb, Booking.com and Agoda have no messaging or reservation API for this account - their notification emails are parsed instead."
        />
      </div>

      <div className="mt-6 space-y-6">
        <MailboxConnectionCard
          integration={
            integration
              ? {
                  email: integration.email,
                  imapHost: integration.imapHost,
                  imapPort: integration.imapPort,
                  status: integration.status,
                  connectedAt: integration.connectedAt?.toISOString() ?? null,
                  lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
                }
              : null
          }
        />

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">Recently parsed emails</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every email checked, and exactly what happened to it - nothing here is hidden.
            </p>
          </div>

          {recent.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              Nothing parsed yet. Connect the mailbox and run &ldquo;Sync now&rdquo; to check.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.subject || "(no subject)"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.source ? OTA_LABELS[row.source] : "Unknown source"} · {row.fromAddress} ·{" "}
                      {formatDateLong(row.receivedAt)}
                    </p>
                    {row.error && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
                        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                        {row.error}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {row.reservation && (
                      <Link
                        href={`/admin/reservations?code=${row.reservation.code}`}
                        className="text-xs font-medium text-brand-azure hover:underline"
                      >
                        {row.reservation.code}
                      </Link>
                    )}
                    {row.message && (
                      <Link href="/admin/messages" className="text-xs font-medium text-brand-azure hover:underline">
                        View message
                      </Link>
                    )}
                    <Badge className={STATUS_STYLES[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminPage>
  );
}
