import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { onOperatingProperty } from "@/lib/property/back-office";
import { PeriodPicker } from "@/components/admin/period-picker";
import { parsePeriod, periodDateFilter, periodQuery } from "@/lib/finance/period";
import { toISODate } from "@/lib/dates";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { SOURCE_LABELS, sourceBadgeClass } from "@/lib/admin/sources";
import { formatDateLong, formatINR, formatINRCompact } from "@/lib/format";

import { requirePortfolioAccess } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function RevenuePage({ searchParams }: PageProps<"/admin/finance/revenue">) {
  await requirePortfolioAccess(FINANCE_ROLES);
  const period = parsePeriod(await searchParams);
  const query = periodQuery(period);
  const [finance, recentRevenue] = await Promise.all([
    getPortfolioFinance(period),
    db.transaction.findMany({
      where: { type: "REVENUE", date: periodDateFilter(period), ...onOperatingProperty },
      include: {
        property: { select: { id: true, name: true } },
        reservation: {
          select: { code: true, source: true, guest: { select: { name: true } } },
        },
      },
      orderBy: { date: "desc" },
      take: 200,
    }),
  ]);

  return (
    <AdminPage>
      <Link
        href={`/admin/finance?${query}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-blue"
      >
        <ArrowLeft className="size-4" />
        Back to finance
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Revenue"
          description="Where the money comes from, and what's left after fees."
        />
      </div>

      <div className="mt-5">
        <PeriodPicker
          key={query}
          kind={period.kind}
          from={toISODate(period.from)}
          to={toISODate(period.to)}
          label={period.label}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Gross revenue"
          value={formatINRCompact(finance.period.grossRevenue)}
          hint={
            finance.upcomingRevenue > 0
              ? `${formatINRCompact(finance.period.grossRevenue - finance.upcomingRevenue)} earned · ${formatINRCompact(finance.upcomingRevenue)} upcoming`
              : "Counted on check-in date"
          }
        />
        <KpiCard
          label="Channel fees"
          value={formatINRCompact(finance.period.otaFees)}
        />
        <KpiCard
          label="Payment fees"
          value={formatINRCompact(finance.period.paymentFees)}
        />
        <KpiCard
          label="Net revenue"
          value={formatINRCompact(finance.period.netRevenue)}
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue over time
        </h2>
        <div className="mt-4">
          <RevenueChart data={finance.series} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">By channel</h2>
          <div className="mt-4">
            <ChannelProfitTable channels={finance.channels} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">By property</h2>
          <ul className="mt-4 divide-y divide-border">
            {finance.perProperty.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <Link
                  href={`/admin/finance/property/${p.id}?${query}`}
                  className="text-foreground hover:text-brand-azure"
                >
                  {p.name}
                </Link>
                <span className="font-medium tabular-nums text-foreground">
                  {formatINRCompact(p.period.grossRevenue)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue transactions
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {period.label}
          {recentRevenue.length === 200 ? " · latest 200 shown" : ` · ${recentRevenue.length} entries`}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Date", "Property", "Guest", "Booking", "Channel", "Amount"].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-2 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase last:text-right"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentRevenue.map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 whitespace-nowrap text-muted-foreground">
                    {formatDateLong(t.date)}
                  </td>
                  <td className="py-2.5 text-foreground">{t.property.name}</td>
                  <td className="py-2.5 text-foreground">
                    {t.reservation?.guest.name ?? "-"}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">
                    {t.reservation?.code ?? "-"}
                  </td>
                  <td className="py-2.5">
                    {t.reservation && (
                      <Badge className={sourceBadgeClass(t.reservation.source)}>
                        {SOURCE_LABELS[t.reservation.source]}
                      </Badge>
                    )}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums text-foreground">
                    {formatINR(Number(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminPage>
  );
}
