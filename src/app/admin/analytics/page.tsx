import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OccupancyChart } from "@/components/charts/occupancy-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import {
  getOccupancySeries, getPortfolioKpis, getRevenueSeries,
} from "@/lib/queries/admin-metrics";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [kpis, revenue, occupancy, finance] = await Promise.all([
    getPortfolioKpis(),
    getRevenueSeries(12),
    getOccupancySeries(12),
    getPortfolioFinance(12),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Analytics"
        description="Twelve-month view across the portfolio."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Occupancy" value={formatPercent(kpis.occupancyPercent)} />
        <KpiCard label="ADR" value={formatINR(kpis.adr)} />
        <KpiCard label="RevPAR" value={formatINR(kpis.revPar)} />
        <KpiCard
          label="Lifetime revenue"
          value={formatINRCompact(finance.lifetime.grossRevenue)}
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue vs expenses
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Last twelve months</p>
        <div className="mt-4">
          <RevenueChart data={revenue} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Occupancy</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Share of available nights sold
          </p>
          <div className="mt-4">
            <OccupancyChart data={occupancy} />
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
                    {formatINRCompact(p.lifetime.grossRevenue)}
                  </td>
                  <td className="py-2.5 tabular-nums text-muted-foreground">
                    {formatINRCompact(
                      p.lifetime.operatingExpenses +
                        p.lifetime.otaFees +
                        p.lifetime.paymentFees,
                    )}
                  </td>
                  <td className="py-2.5 font-medium tabular-nums text-foreground">
                    {formatINRCompact(p.lifetime.netOperatingIncome)}
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
