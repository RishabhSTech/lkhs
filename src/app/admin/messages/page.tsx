import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/site/empty-state";
import { db } from "@/lib/db";
import {
  COMMUNICATION_JOURNEY, TEMPLATE_LABELS,
} from "@/lib/notifications/templates";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const CHANNELS = ["WHATSAPP", "EMAIL", "SMS", "OTA"] as const;

export default async function MessagesPage() {
  const messages = await db.message.findMany({
    include: {
      reservation: {
        include: {
          guest: { select: { name: true } },
          property: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <AdminPage>
      <PageHeader
        title="Messages"
        description="Every guest conversation, across every channel."
      />

      <p className="mt-5 rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
        No email, SMS or WhatsApp provider is connected here, so outbound
        messages are logged rather than delivered. The templates, timeline and
        delivery states below are the real system — connect a provider and they
        start sending.
      </p>

      <Tabs defaultValue="inbox" className="mt-6">
        <TabsList>
          <TabsTrigger value="inbox">Activity</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-5">
          <Tabs defaultValue="ALL">
            <TabsList>
              <TabsTrigger value="ALL">All</TabsTrigger>
              {CHANNELS.map((c) => (
                <TabsTrigger key={c} value={c}>
                  {c === "OTA" ? "OTA" : c.charAt(0) + c.slice(1).toLowerCase()}
                </TabsTrigger>
              ))}
            </TabsList>

            {["ALL", ...CHANNELS].map((channel) => {
              const filtered =
                channel === "ALL"
                  ? messages
                  : messages.filter((m) => m.channel === channel);

              return (
                <TabsContent key={channel} value={channel} className="mt-4">
                  {filtered.length === 0 ? (
                    <EmptyState
                      title="No messages on this channel yet"
                      description="Messages appear here as bookings move through their journey."
                    />
                  ) : (
                    <ul className="space-y-2.5">
                      {filtered.map((m) => (
                        <li
                          key={m.id}
                          className="rounded-xl border border-border bg-card p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {m.reservation?.guest.name ?? "Guest"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.reservation?.property.name}
                                {m.reservation && ` · ${m.reservation.code}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="border-border bg-muted text-muted-foreground">
                                {m.channel.toLowerCase()}
                              </Badge>
                              <Badge
                                className={
                                  m.status === "SENT" || m.status === "DELIVERED"
                                    ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                                    : m.status === "FAILED"
                                      ? "border-destructive/25 bg-destructive/10 text-destructive"
                                      : "border-chart-4/25 bg-chart-4/10 text-chart-4"
                                }
                              >
                                {m.status.toLowerCase()}
                              </Badge>
                            </div>
                          </div>

                          {m.subject && (
                            <p className="mt-2.5 text-sm font-medium text-foreground">
                              {m.subject}
                            </p>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs whitespace-pre-line text-muted-foreground">
                            {m.body}
                          </p>
                          <p className="mt-2 text-[0.6875rem] text-muted-foreground/70">
                            {formatDateLong(m.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </TabsContent>

        <TabsContent value="templates" className="mt-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Guest journey
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Every booking moves through these touchpoints in order.
            </p>

            <ol className="mt-5 space-y-4">
              {COMMUNICATION_JOURNEY.map((step, i) => (
                <li key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-green text-xs font-semibold text-brand-ivory">
                      {i + 1}
                    </span>
                    {i < COMMUNICATION_JOURNEY.length - 1 && (
                      <span className="mt-1 h-full w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className="text-sm font-medium text-foreground">
                      {TEMPLATE_LABELS[step.key]}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.timing}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {step.channels.map((c) => (
                        <Badge
                          key={c}
                          className="border-border bg-muted text-muted-foreground"
                        >
                          {c.toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}
