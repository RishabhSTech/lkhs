import Link from "next/link";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { buildCapitalPosition, buildPL, type TxWithCategory } from "@/lib/finance/calculations";
import { formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StakeholdersPage() {
  const stakeholders = await db.stakeholder.findMany({
    include: {
      properties: {
        include: {
          property: {
            include: { transactions: { include: { category: true } } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AdminPage>
      <PageHeader
        title="Stakeholders"
        description="Owners and investors, and what each of them can see."
      />

      <div className="mt-6 space-y-5">
        {stakeholders.map((s) => {
          const totals = s.properties.reduce(
            (acc, link) => {
              const txs = link.property.transactions as TxWithCategory[];
              const pl = buildPL(txs);
              return {
                invested: acc.invested + Number(link.investmentAmount),
                net: acc.net + pl.netOperatingIncome,
              };
            },
            { invested: 0, net: 0 },
          );

          return (
            <section
              key={s.id}
              className="rounded-xl border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="font-heading text-lg text-brand-blue">
                    {s.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {s.email ?? s.phone ?? "No contact on file"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="border-chart-3/25 bg-chart-3/10 text-chart-3">
                    {s.type.toLowerCase()}
                  </Badge>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatINRCompact(totals.invested)} invested ·{" "}
                    <span className="font-medium text-foreground">
                      {formatINRCompact(totals.net)} net
                    </span>
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {s.properties.map((link) => {
                  const txs = link.property.transactions as TxWithCategory[];
                  const pl = buildPL(txs);
                  const capital = buildCapitalPosition(txs);

                  return (
                    <li
                      key={link.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-5"
                    >
                      <div>
                        <Link
                          href={`/admin/finance/property/${link.propertyId}`}
                          className="text-sm font-medium text-foreground hover:text-brand-azure"
                        >
                          {link.property.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {formatINRCompact(Number(link.investmentAmount))}{" "}
                          invested
                          {link.ownershipPercent !== null &&
                            ` · ${Number(link.ownershipPercent)}% held`}
                        </p>
                      </div>
                      <div className="flex gap-5 text-sm">
                        <span className="tabular-nums text-muted-foreground">
                          Net{" "}
                          <span className="font-medium text-foreground">
                            {formatINRCompact(pl.netOperatingIncome)}
                          </span>
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          ROI{" "}
                          <span className="font-medium text-foreground">
                            {formatPercent(capital.roiPercent)}
                          </span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </AdminPage>
  );
}
