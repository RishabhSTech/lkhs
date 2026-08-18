import Link from "next/link";
import { ArrowUpRight, Download, Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { Button } from "@/components/ui/button";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage() {
  const finance = await getPortfolioFinance();

  return (
    <AdminPage>
      <PageHeader
        title="Finance"
        description="Every figure below is computed from transaction records."
        actions={
          <>
            <Button
              render={<Link href="/admin/finance/expenses/new" />}
              size="sm"
            >
              <Plus />
              Add expense
            </Button>
            <Button
              render={<Link href="/admin/finance/expenses" />}
              variant="outline"
              size="sm"
            >
              All expenses
            </Button>
            <Button
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
              render={<a href="/api/admin/reports?type=portfolio" />}
              variant="outline"
              size="sm"
            >
              <Download />
              Export CSV
            </Button>
            <Button
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page route
              render={<a href="/api/admin/reports?type=portfolio&format=pdf" />}
              variant="outline"
              size="sm"
            >
              <Download />
              Export PDF
            </Button>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Funds deployed"
          value={formatINRCompact(finance.capital.totalFundsDeployed)}
          hint="Setup capital + refundable deposits"
        />
        <KpiCard
          label="Total revenue"
          value={formatINRCompact(finance.lifetime.grossRevenue)}
          hint="Gross, all channels"
        />
        <KpiCard
          label="Total expenses"
          value={formatINRCompact(
            finance.lifetime.operatingExpenses +
              finance.lifetime.otaFees +
              finance.lifetime.paymentFees,
          )}
          hint="Operating + channel + payment fees"
        />
        <KpiCard
          label="Net operating income"
          value={formatINRCompact(finance.lifetime.netOperatingIncome)}
          hint="Lifetime, all properties"
        />
        <KpiCard
          label="This month revenue"
          value={formatINRCompact(finance.currentMonth.grossRevenue)}
        />
        <KpiCard
          label="This month expenses"
          value={formatINRCompact(finance.currentMonth.operatingExpenses)}
        />
        <KpiCard
          label="This month net"
          value={formatINRCompact(finance.currentMonth.netOperatingIncome)}
          tone={
            finance.currentMonth.netOperatingIncome < 0 ? "critical" : "default"
          }
        />
        <KpiCard
          label="Capital recovered"
          value={formatPercent(finance.capital.capitalRecoveredPercent)}
          hint={`${formatINRCompact(finance.capital.remainingToRecover)} remaining`}
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue vs expenses
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Portfolio-wide, last six months
        </p>
        <div className="mt-4">
          <RevenueChart data={finance.monthlySeries} />
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
                Net operating income, lifetime
              </p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-border">
            {finance.perProperty.map((p) => (
              <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/admin/finance/property/${p.id}`}
                  className="group flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground group-hover:text-brand-azure">
                      {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPercent(p.capital.capitalRecoveredPercent)} of{" "}
                      {formatINRCompact(p.capital.totalFundsDeployed)} recovered
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatINR(p.lifetime.netOperatingIncome)}
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
