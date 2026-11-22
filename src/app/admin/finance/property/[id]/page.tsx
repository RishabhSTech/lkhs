import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { CapitalRecovery } from "@/components/admin/capital-recovery";
import { PLStatement } from "@/components/admin/pl-statement";
import { BudgetTable } from "@/components/admin/budget-table";
import { QuickAddButton } from "@/components/admin/quick-add";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getPropertyFinance } from "@/lib/queries/finance";
import { PeriodPicker } from "@/components/admin/period-picker";
import { parsePeriod, periodQuery } from "@/lib/finance/period";
import { toISODate } from "@/lib/dates";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

import { requirePortfolioAccess } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function PropertyFinancePage({
  params,
  searchParams,
}: PageProps<"/admin/finance/property/[id]">) {
  const { id } = await params;
  const period = parsePeriod(await searchParams);
  const query = periodQuery(period);
  await requirePortfolioAccess(FINANCE_ROLES);
  if (!id) notFound();

  const [finance, budgetCategories] = await Promise.all([
    getPropertyFinance(id, period).catch(() => null),
    db.transactionCategory.findMany({
      where: { group: { in: ["RECURRING_EXPENSE", "ONE_TIME_EXPENSE"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!finance) notFound();

  const { property, lifetime, capital, channels, breakEven } = finance;
  const pl = finance.period;

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
          title={property.name}
          description={`${property.locationArea}, ${property.city} · financial performance`}
          actions={
            <div className="flex items-center gap-2">
              <QuickAddButton kind="expense" propertyId={property.id}>
                <Plus />
                Add expense
              </QuickAddButton>
              <Button
                render={<Link href={`/admin/properties/${property.id}`} />}
                variant="outline"
                size="sm"
              >
                Property settings
              </Button>
            </div>
          }
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
          label="Total funds deployed"
          value={formatINRCompact(capital.totalFundsDeployed)}
        />
        <KpiCard
          label="Revenue"
          value={formatINRCompact(pl.grossRevenue)}
          hint={finance.upcomingRevenue > 0 ? `${formatINRCompact(pl.grossRevenue - finance.upcomingRevenue)} earned · ${formatINRCompact(finance.upcomingRevenue)} upcoming` : period.label}
        />
        <KpiCard
          label="Expenses"
          value={formatINRCompact(pl.operatingExpenses + pl.otaFees + pl.paymentFees)}
          hint={period.label}
        />
        <KpiCard
          label="Net operating income"
          value={formatINRCompact(pl.netOperatingIncome)}
          hint={period.label}
          tone={pl.netOperatingIncome < 0 ? "critical" : "default"}
        />
        <KpiCard
          label="ROI"
          value={formatPercent(capital.roiPercent)}
          hint="Earnings against capital deployed"
        />
        <KpiCard
          label="Capital recovery"
          value={formatPercent(capital.capitalRecoveredPercent)}
          hint={`${formatINRCompact(capital.remainingToRecover)} to go`}
        />
        <KpiCard
          label="Lifetime revenue"
          value={formatINRCompact(lifetime.grossRevenue)}
        />
        <KpiCard
          label="Lifetime net"
          value={formatINRCompact(lifetime.netOperatingIncome)}
          tone={lifetime.netOperatingIncome < 0 ? "critical" : "default"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">
            Revenue vs expenses
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{period.label} · by {period.bucket}</p>
          <div className="mt-4">
            <RevenueChart data={finance.series} />
          </div>
        </section>

        <CapitalRecovery capital={capital} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PLStatement
          title={`Profit & loss - ${period.label}`}
          pl={pl}
          channels={channels}
        />

        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Break-even</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Monthly revenue needed to cover fixed and variable costs
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row
                label="Monthly fixed costs"
                value={formatINR(breakEven.monthlyFixedCosts)}
              />
              <Row
                label="Variable cost ratio"
                value={formatPercent(breakEven.variableCostRatio * 100)}
              />
              <Row
                label="Break-even revenue"
                value={formatINR(breakEven.breakEvenRevenue)}
                strong
              />
              <Row
                label="Current month revenue"
                value={formatINR(breakEven.currentRevenue)}
              />
              <div className="flex items-baseline justify-between border-t border-border pt-2.5">
                <dt className="text-muted-foreground">
                  {breakEven.surplus >= 0 ? "Above break-even" : "Below break-even"}
                </dt>
                <dd
                  className={
                    breakEven.surplus >= 0
                      ? "font-semibold tabular-nums text-chart-1"
                      : "font-semibold tabular-nums text-destructive"
                  }
                >
                  {formatINR(Math.abs(breakEven.surplus))}
                </dd>
              </div>
            </dl>
          </section>

          <BudgetTable budgets={finance.budgets} propertyId={property.id} categories={budgetCategories} />
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Channel profitability
        </h2>
        <div className="mt-4">
          <ChannelProfitTable channels={channels} />
        </div>
      </section>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">
            Recurring expenses
          </h2>
          <Link
            href="/admin/finance/expenses"
            className="text-xs font-medium text-brand-azure hover:underline"
          >
            Manage
          </Link>
        </div>
        {finance.recurring.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No recurring expenses set up for this property.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {finance.recurring.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span className="text-foreground">{r.categoryName}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span className="text-xs capitalize">
                    {r.frequency.toLowerCase().replace("_", " ")} · day{" "}
                    {r.dayOfMonth}
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatINR(r.amount)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPage>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          strong
            ? "font-semibold tabular-nums text-foreground"
            : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
