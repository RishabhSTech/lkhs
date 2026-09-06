import Link from "next/link";
import { notFound } from "next/navigation";
import type { ChannelCode } from "@prisma/client";
import { ArrowLeft, ExternalLink, Info, ShieldAlert } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { ChannelConnectList } from "@/components/admin/channel-connect-list";
import { db } from "@/lib/db";
import { CHANNEL_GUIDES } from "@/lib/admin/channel-guides";

export const dynamic = "force-dynamic";

export default async function ChannelGuidePage({
  params,
}: PageProps<"/admin/channels/[code]">) {
  const { code } = await params;
  if (!code) notFound();
  const channelCode = code.toUpperCase() as ChannelCode;
  const guide = CHANNEL_GUIDES[channelCode];
  if (!guide) notFound();

  const [channel, properties] = await Promise.all([
    db.channel.findUnique({
      where: { code: channelCode },
      include: {
        properties: {
          include: {
            property: { select: { id: true, name: true, locationArea: true } },
            syncLogs: { orderBy: { startedAt: "desc" }, take: 1 },
          },
          orderBy: { property: { name: "asc" } },
        },
      },
    }),
    db.property.findMany({
      select: { id: true, name: true, locationArea: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const connections = new Map(
    (channel?.properties ?? []).map((cp) => [cp.propertyId, cp]),
  );

  return (
    <AdminPage>
      <Link
        href="/admin/channels"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All channels
      </Link>

      <div className="mt-4">
        <PageHeader
          title={guide.name}
          description={guide.blurb}
          actions={
            guide.docsUrl.startsWith("http") ? (
              <a
                href={guide.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-[0.8125rem] font-medium transition-colors hover:bg-muted"
              >
                <ExternalLink className="size-3.5" />
                Official docs
              </a>
            ) : null
          }
        />
      </div>

      {guide.requiresApproval && (
        <p className="mt-5 flex items-start gap-2.5 rounded-lg border border-chart-4/30 bg-chart-4/8 p-4 text-sm leading-relaxed">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-chart-4" />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {guide.name} requires approval before any connection works.
            </span>{" "}
            You can save your listing IDs and credentials below now, but nothing
            will sync until {guide.name} approves API access — either directly or
            via a channel manager. Commission: {guide.commission}.
          </span>
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <ChannelConnectList
          channelCode={channelCode}
          channelName={guide.name}
          fields={guide.fields}
          properties={properties.map((p) => {
            const connection = connections.get(p.id);
            return {
              id: p.id,
              channelPropertyId: connection?.id ?? null,
              name: p.name,
              locationArea: p.locationArea,
              status: connection?.status ?? "NOT_CONFIGURED",
              externalListingId: connection?.externalListingId ?? null,
              lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
              lastError:
                connection?.syncLogs[0]?.status === "ERROR"
                  ? (connection.syncLogs[0].message ?? "Sync failed")
                  : null,
            };
          })}
        />

        <aside className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              How to connect
            </h2>
            <ol className="mt-4 space-y-4">
              {guide.steps.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Commission</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {guide.commission}
            </p>
            <Link
              href="/admin/finance"
              className="mt-3 inline-block text-xs font-medium text-brand-azure hover:underline"
            >
              See what each channel actually nets →
            </Link>
          </section>

          <p className="flex items-start gap-2 rounded-lg bg-muted/70 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Central Lime Kraft inventory is always the source of truth. Channels
            receive availability from here — never the other way round.
          </p>
        </aside>
      </div>
    </AdminPage>
  );
}
