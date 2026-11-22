import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OccupancyChart } from "@/components/charts/occupancy-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { PeriodPicker } from "@/components/admin/period-picker";
import { getPeriodStayMetrics } from "@/lib/queries/admin-metrics";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { parsePeriod, periodQuery } from "@/lib/finance/period";
import { toISODate } from "@/lib/dates";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";
import { requirePortfolioAccess } from "@/lib/auth/guards";
import { OFFICE_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requirePortfolioAccess(OFFICE_ROLES);
  // Analytics opens on the year; Finance on the month.
  const period = parsePeriod(await searchParams, "year");
  const query = periodQuery(period);
  const [stays, finance] = await Promise.all([
    getPeriodStayMetrics(period),
    getPortfolioFinance(period),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Analytics"
        description="How the portfolio performed over the selected period."
      />

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
          label="Occupancy"
          value={formatPercent(stays.occupancyPercent)}
          hint={`${stays.nightsSold} of ${stays.availableNights} nights sold`}
        />
        <KpiCard label="ADR" value={formatINR(stays.adr)} hint="Average room rate per sold night" />
        <KpiCard label="RevPAR" value={formatINR(stays.revPar)} hint="Room revenue per available night" />
        <KpiCard
          label="Revenue"
          value={formatINRCompact(finance.period.grossRevenue)}
          hint={
            finance.upcomingRevenue > 0
              ? `${formatINRCompact(finance.period.grossRevenue - finance.upcomingRevenue)} earned · ${formatINRCompact(finance.upcomingRevenue)} upcoming`
              : period.label
          }
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue vs expenses
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{period.label} · by {period.bucket}</p>
        <div className="mt-4">
          <RevenueChart data={finance.series} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Occupancy</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Share of available nights sold
          </p>
          <div className="mt-4">
            <OccupancyChart data={stays.occupancySeries} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Channel profitability
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Net of commission and payment fees
          </p>
          <div className="mt-4">
            <ChannelProfitTable channels={finance.channels} />
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Property comparison
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Property", "Revenue", "Expenses", "Net income", "Capital recovered"].map(
                  (h) => (
                    <th
                      key={h}
                      className="pb-2 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {finance.perProperty.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 font-medium text-foreground">{p.name}</td>
                  <td className="py-2.5 tabular-nums text-muted-foreground">
                    {formatINRCompact(p.period.grossRevenue)}
                  </td>
                  <td className="py-2.5 tabular-nums text-muted-foreground">
                    {formatINRCompact(
                      p.period.operatingExpenses +
                        p.period.otaFees +
                        p.period.paymentFees,
                    )}
                  </td>
                  <td className="py-2.5 font-medium tabular-nums text-foreground">
                    {formatINRCompact(p.period.netOperatingIncome)}
                  </td>
                  <td className="py-2.5 tabular-nums text-foreground">
                    {formatPercent(p.capital.capitalRecoveredPercent)}
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
