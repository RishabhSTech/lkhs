import Link from "next/link";
import {
  AlertTriangle, ArrowUpRight, BedDouble, CalendarCheck, CalendarX, CircleDollarSign,
  Percent, TrendingUp, Wallet, Wrench,
} from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OccupancyChart } from "@/components/charts/occupancy-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import {
  getChannelHealth, getOccupancySeries, getPortfolioKpis, getRevenueSeries,
  getTodayOperations, getUpcomingReservations,
} from "@/lib/queries/admin-metrics";
import { db } from "@/lib/db";
import { formatDateRange, formatINR, formatINRCompact, formatPercent } from "@/lib/format";
import { SOURCE_LABELS, sourceBadgeClass } from "@/lib/admin/sources";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getUTCHours() + 5.5; // IST
  const h = hour % 24;
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AdminOverviewPage() {
  const [
    { user }, kpis, revenueSeries, occupancySeries, upcoming, operations,
    channelHealth, alerts,
  ] = await Promise.all([
    getCurrentAdminUser(),
    getPortfolioKpis(),
    getRevenueSeries(6),
    getOccupancySeries(6),
    getUpcomingReservations(6),
    getTodayOperations(),
    getChannelHealth(),
    db.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title={`${greeting()}, ${user.name.split(" ")[0]} 👋`}
        description="Here's how the portfolio is doing today."
        actions={
          <Button render={<Link href="/admin/calendar" />} variant="outline" size="sm">
            Open calendar
          </Button>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Today's revenue"
          value={formatINR(kpis.todayRevenue)}
          icon={CircleDollarSign}
          hint="Bookings checking in today"
        />
        <KpiCard
          label="Occupancy"
          value={formatPercent(kpis.occupancyPercent)}
          icon={Percent}
          hint="This month across all units"
        />
        <KpiCard
          label="ADR"
          value={formatINR(kpis.adr)}
          icon={TrendingUp}
          hint="Average daily rate"
        />
        <KpiCard
          label="RevPAR"
          value={formatINR(kpis.revPar)}
          icon={BedDouble}
          hint="Revenue per available night"
        />
        <KpiCard
          label="Arrivals"
          value={String(kpis.arrivalsToday)}
          icon={CalendarCheck}
          hint="Checking in today"
        />
        <KpiCard
          label="Departures"
          value={String(kpis.departuresToday)}
          icon={CalendarX}
          hint="Checking out today"
        />
        <KpiCard
          label="Open issues"
          value={String(kpis.openIssues)}
          icon={Wrench}
          tone={kpis.openIssues > 3 ? "warning" : "default"}
          hint="Maintenance tasks"
        />
        <KpiCard
          label="Pending payments"
          value={formatINRCompact(kpis.pendingPaymentsAmount)}
          icon={Wallet}
          tone={kpis.pendingPaymentsAmount > 0 ? "warning" : "default"}
          hint="Expenses awaiting payment"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel
          title="Revenue vs expenses"
          description="Last six months, from transaction records"
        >
          <RevenueChart data={revenueSeries} />
        </Panel>
        <Panel title="Occupancy" description="Share of available nights sold">
          <OccupancyChart data={occupancySeries} />
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel
          title="Upcoming bookings"
          className="lg:col-span-2"
          action={{ href: "/admin/reservations", label: "All reservations" }}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              title="No upcoming bookings"
              description="New reservations will appear here as they come in."
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((reservation) => (
                <li
                  key={reservation.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {reservation.guest.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {reservation.property.name} ·{" "}
                      {formatDateRange(reservation.checkIn, reservation.checkOut)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge className={sourceBadgeClass(reservation.source)}>
                      {SOURCE_LABELS[reservation.source]}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatINR(Number(reservation.total))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Alerts">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing needs your attention.
              </p>
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => (
                  <li key={alert.id} className="flex gap-2.5">
                    <AlertTriangle
                      className={
                        alert.severity === "CRITICAL"
                          ? "mt-0.5 size-4 shrink-0 text-destructive"
                          : "mt-0.5 size-4 shrink-0 text-chart-4"
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {alert.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {alert.body}
                      </p>
                      {alert.link && (
                        <Link
                          href={alert.link}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-terracotta hover:underline"
                        >
                          Review
                          <ArrowUpRight className="size-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Channel sync"
            action={{ href: "/admin/channels", label: "Manage" }}
          >
            <ul className="space-y-2.5">
              {channelHealth.map((channel) => (
                <li
                  key={channel.code}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-foreground">{channel.name}</span>
                  {channel.errors > 0 ? (
                    <Badge className="border-destructive/25 bg-destructive/10 text-destructive">
                      {channel.errors} error{channel.errors > 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {channel.connected}/{channel.total} synced
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        title="Today's operations"
        className="mt-5"
        action={{ href: "/admin/operations", label: "Operations board" }}
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <OpsColumn
            title="Arriving"
            empty="No arrivals today."
            items={operations.arrivals.map((r) => ({
              id: r.id,
              primary: r.guest.name,
              secondary: r.property.name,
            }))}
          />
          <OpsColumn
            title="Departing"
            empty="No departures today."
            items={operations.departures.map((r) => ({
              id: r.id,
              primary: r.guest.name,
              secondary: r.property.name,
            }))}
          />
          <OpsColumn
            title="Cleaning queue"
            empty="Every home is turned over."
            items={operations.cleaning.map((c) => ({
              id: c.id,
              primary: c.property.name,
              secondary: `${c.status.replace(/_/g, " ").toLowerCase()}${
                c.assignedTo ? ` · ${c.assignedTo.name}` : ""
              }`,
            }))}
          />
        </div>
      </Panel>
    </AdminPage>
  );
}

function Panel({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: { href: string; label: string };
}) {
  return (
    <section
      className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-xs font-medium text-brand-terracotta hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OpsColumn({
  title,
  items,
  empty,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string }[];
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-medium text-foreground">{item.primary}</p>
              <p className="text-xs capitalize text-muted-foreground">
                {item.secondary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
