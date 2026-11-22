import Link from "next/link";
import { ArrowUpRight, Download, Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { Button } from "@/components/ui/button";
import { QuickAddButton } from "@/components/admin/quick-add";
import { PeriodPicker } from "@/components/admin/period-picker";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { parsePeriod, periodQuery } from "@/lib/finance/period";
import { toISODate } from "@/lib/dates";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

import { requirePortfolioAccess } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage({ searchParams }: PageProps<"/admin/finance">) {
  await requirePortfolioAccess(FINANCE_ROLES);
  const period = parsePeriod(await searchParams);
  const query = periodQuery(period);
  const finance = await getPortfolioFinance(period);
  const pl = finance.period;
  const expenses = pl.operatingExpenses + pl.otaFees + pl.paymentFees;

  return (
    <AdminPage>
      <PageHeader
        title="Finance"
        description="Every figure below is computed from transaction records."
        actions={
          <>
            <QuickAddButton kind="expense">
              <Plus />
              Add expense
            </QuickAddButton>
            <Button
              render={<Link href="/admin/finance/expenses" />}
              variant="outline"
              size="sm"
            >
              All expenses
            </Button>
            <Button
               
              render={<a href={`/api/admin/reports?type=portfolio&${query}`} />}
              variant="outline"
              size="sm"
            >
              <Download />
              Export CSV
            </Button>
            <Button
               
              render={<a href={`/api/admin/reports?type=portfolio&format=pdf&${query}`} />}
              variant="outline"
              size="sm"
            >
              <Download />
              Export PDF
            </Button>
          </>
        }
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
        <KpiCard label="Revenue" value={formatINRCompact(pl.grossRevenue)} hint={`Gross, all channels · ${period.label}`} />
        <KpiCard label="Expenses" value={formatINRCompact(expenses)} hint="Operating + channel + payment fees" />
        <KpiCard
          label="Net operating income"
          value={formatINRCompact(pl.netOperatingIncome)}
          hint={pl.grossRevenue > 0 ? `${formatPercent((pl.netOperatingIncome / pl.grossRevenue) * 100)} margin` : undefined}
          tone={pl.netOperatingIncome < 0 ? "critical" : "default"}
        />
        <KpiCard label="Net revenue" value={formatINRCompact(pl.netRevenue)} hint="Revenue after channel + payment fees" />
        <KpiCard label="Operating expenses" value={formatINRCompact(pl.operatingExpenses)} />
        <KpiCard label="Channel fees" value={formatINRCompact(pl.otaFees + pl.paymentFees)} />
        <KpiCard
          label="Funds deployed"
          value={formatINRCompact(finance.capital.totalFundsDeployed)}
          hint="Lifetime · setup capital + deposits"
        />
        <KpiCard
          label="Capital recovered"
          value={formatPercent(finance.capital.capitalRecoveredPercent)}
          hint={`Lifetime · ${formatINRCompact(finance.capital.remainingToRecover)} remaining`}
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue vs expenses
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Portfolio-wide, {period.label} · by {period.bucket}
        </p>
        <div className="mt-4">
          <RevenueChart data={finance.series} />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Channel profitability
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What each channel actually nets after commission
          </p>
          <div className="mt-4">
            <ChannelProfitTable channels={finance.channels} />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Property performance
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Net operating income, {period.label}
              </p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {finance.perProperty.map((p) => (
              <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/admin/finance/property/${p.id}?${query}`}
                  className="group flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-brand-azure">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatINRCompact(p.period.grossRevenue)} revenue ·{" "}
                      {formatPercent(p.capital.capitalRecoveredPercent)} capital recovered
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatINR(p.period.netOperatingIncome)}
                    </span>
                    <ArrowUpRight className="size-3.5 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AdminPage>
  );
}
