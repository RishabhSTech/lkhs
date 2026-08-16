import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CapitalRecovery } from "@/components/admin/capital-recovery";
import { PLStatement } from "@/components/admin/pl-statement";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { getCurrentStakeholder } from "@/lib/auth/current-user";
import { getStakeholderProperty } from "@/lib/queries/stakeholder";
import { formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StakeholderPropertyPage({
  params,
}: PageProps<"/stakeholder/[id]">) {
  const { id } = await params;
  const { stakeholder } = await getCurrentStakeholder();

  // Returns null when this property isn't assigned to the stakeholder.
  const data = await getStakeholderProperty(stakeholder.id, id);
  if (!data) notFound();

  const { property, pl, capital, channels, occupancyPercent } = data;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        href="/stakeholder"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green"
      >
        <ArrowLeft className="size-4" />
        Back to portfolio
      </Link>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          {property.images[0] && (
            <div className="relative hidden size-16 shrink-0 overflow-hidden rounded-lg sm:block">
              <Image
                src={property.images[0].url}
                alt={property.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
          <div>
            <h1 className="font-heading text-3xl leading-tight text-brand-green">
              {property.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {property.locationArea}, {property.city}
              {data.ownershipPercent !== null &&
                ` · you hold ${data.ownershipPercent}%`}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiCard
          label="Total investment"
          value={formatINRCompact(capital.totalFundsDeployed)}
        />
        <KpiCard label="Total revenue" value={formatINRCompact(pl.grossRevenue)} />
        <KpiCard
          label="Total expenses"
          value={formatINRCompact(
            pl.operatingExpenses + pl.otaFees + pl.paymentFees,
          )}
        />
        <KpiCard
          label="Net operating income"
          value={formatINRCompact(pl.netOperatingIncome)}
          tone={pl.netOperatingIncome < 0 ? "critical" : "default"}
        />
        <KpiCard label="ROI" value={formatPercent(capital.roiPercent)} />
        <KpiCard
          label="Occupancy"
          value={formatPercent(occupancyPercent, 0)}
          hint="This month"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-brand-ink">
            Monthly performance
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Last six months</p>
          <div className="mt-4">
            <RevenueChart data={data.monthlySeries} />
          </div>
        </section>

        <CapitalRecovery capital={capital} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PLStatement
          title="Profit & loss — lifetime"
          pl={pl}
          channels={channels}
        />

        <section className="rounded-xl border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-brand-ink">
            Where bookings come from
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Net revenue after channel commission
          </p>
          <div className="mt-4">
            <ChannelProfitTable channels={channels} />
          </div>
        </section>
      </div>
    </div>
  );
}
