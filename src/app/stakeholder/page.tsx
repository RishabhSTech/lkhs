import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { EmptyState } from "@/components/site/empty-state";
import { getCurrentStakeholder } from "@/lib/auth/current-user";
import { getStakeholderPortfolio } from "@/lib/queries/stakeholder";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StakeholderDashboard() {
  const { stakeholder } = await getCurrentStakeholder();
  const { properties, totals } = await getStakeholderPortfolio(stakeholder.id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="font-heading text-3xl leading-tight text-foreground sm:text-4xl">
        Your portfolio
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {properties.length}{" "}
        {properties.length === 1 ? "property" : "properties"} · figures computed
        from live transaction records
      </p>

      {properties.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No properties assigned yet"
          description="Once the Lime Kraft team assigns properties to you, their performance will appear here."
        />
      ) : (
        <>
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiCard
              label="Portfolio value"
              value={formatINRCompact(totals.portfolioValue)}
              hint="Invested + net earnings"
            />
            <KpiCard
              label="Total invested"
              value={formatINRCompact(totals.invested)}
            />
            <KpiCard
              label="Total revenue"
              value={formatINRCompact(totals.revenue)}
            />
            <KpiCard
              label="Total expenses"
              value={formatINRCompact(totals.expenses)}
            />
            <KpiCard
              label="Net earnings"
              value={formatINRCompact(totals.net)}
              tone={totals.net < 0 ? "critical" : "default"}
            />
            <KpiCard
              label="Return on investment"
              value={formatPercent(totals.roiPercent)}
            />
          </div>

          <section className="mt-8">
            <h2 className="font-heading text-2xl text-foreground">
              Property performance
            </h2>

            <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Property", "Revenue", "Expenses", "Net", "ROI", "Occupancy"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {properties.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/stakeholder/${p.id}`}
                          className="group flex items-center gap-1.5 font-medium text-foreground hover:text-brand-terracotta"
                        >
                          {p.name}
                          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {p.locationArea}
                          {p.ownershipPercent !== null &&
                            ` · ${p.ownershipPercent}% held`}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatINR(p.pl.grossRevenue)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatINR(
                          p.pl.operatingExpenses + p.pl.otaFees + p.pl.paymentFees,
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {formatINR(p.pl.netOperatingIncome)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {formatPercent(p.capital.roiPercent)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatPercent(p.occupancyPercent, 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:hidden">
              {properties.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/stakeholder/${p.id}`}
                    className="block overflow-hidden rounded-xl border border-border bg-card"
                  >
                    {p.image && (
                      <div className="relative aspect-[16/9]">
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-heading text-lg text-foreground">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.locationArea}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                        <Stat label="Net" value={formatINRCompact(p.pl.netOperatingIncome)} />
                        <Stat label="ROI" value={formatPercent(p.capital.roiPercent)} />
                        <Stat label="Revenue" value={formatINRCompact(p.pl.grossRevenue)} />
                        <Stat
                          label="Occupancy"
                          value={formatPercent(p.occupancyPercent, 0)}
                        />
                      </dl>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
