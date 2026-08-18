import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { ChannelProfitTable } from "@/components/admin/channel-profit-table";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { getPortfolioFinance } from "@/lib/queries/finance";
import { SOURCE_LABELS, sourceBadgeClass } from "@/lib/admin/sources";
import { formatDateLong, formatINR, formatINRCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const [finance, recentRevenue] = await Promise.all([
    getPortfolioFinance(12),
    db.transaction.findMany({
      where: { type: "REVENUE" },
      include: {
        property: { select: { id: true, name: true } },
        reservation: {
          select: { code: true, source: true, guest: { select: { name: true } } },
        },
      },
      orderBy: { date: "desc" },
      take: 40,
    }),
  ]);

  return (
    <AdminPage>
      <Link
        href="/admin/finance"
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

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Gross revenue"
          value={formatINRCompact(finance.lifetime.grossRevenue)}
        />
        <KpiCard
          label="Channel fees"
          value={formatINRCompact(finance.lifetime.otaFees)}
        />
        <KpiCard
          label="Payment fees"
          value={formatINRCompact(finance.lifetime.paymentFees)}
        />
        <KpiCard
          label="Net revenue"
          value={formatINRCompact(finance.lifetime.netRevenue)}
        />
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Revenue over time
        </h2>
        <div className="mt-4">
          <RevenueChart data={finance.monthlySeries} />
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
                  href={`/admin/finance/property/${p.id}`}
                  className="text-foreground hover:text-brand-azure"
                >
                  {p.name}
                </Link>
                <span className="font-medium tabular-nums text-foreground">
                  {formatINRCompact(p.lifetime.grossRevenue)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">
          Recent revenue transactions
        </h2>
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
                    {t.reservation?.guest.name ?? "—"}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-muted-foreground">
                    {t.reservation?.code ?? "—"}
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
