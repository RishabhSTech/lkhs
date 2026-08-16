import Image from "next/image";
import Link from "next/link";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { buildPL, type TxWithCategory } from "@/lib/finance/calculations";
import { endOfMonthUTC, startOfMonthUTC, todayUTC } from "@/lib/dates";
import { formatINR, formatINRCompact, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PropertiesPage() {
  const today = todayUTC();
  const monthStart = startOfMonthUTC(today);
  const monthEnd = endOfMonthUTC(today);

  const properties = await db.property.findMany({
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" } },
      transactions: { include: { category: true } },
      units: { select: { id: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows = await Promise.all(
    properties.map(async (p) => {
      const soldNights = await db.inventoryNight.count({
        where: {
          unitId: { in: p.units.map((u) => u.id) },
          date: { gte: monthStart, lte: monthEnd },
          reservationId: { not: null },
        },
      });
      const availableNights = p.units.length * monthEnd.getUTCDate();
      return {
        property: p,
        pl: buildPL(p.transactions as TxWithCategory[]),
        occupancy:
          availableNights > 0 ? (soldNights / availableNights) * 100 : 0,
      };
    }),
  );

  return (
    <AdminPage>
      <PageHeader
        title="Properties"
        description={`${properties.length} homes in the portfolio.`}
      />

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ property, pl, occupancy }) => (
          <li key={property.id}>
            <Link
              href={`/admin/properties/${property.id}`}
              className="group block overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-brand-sage"
            >
              {property.images[0] && (
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <Image
                    src={property.images[0].url}
                    alt={property.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-lg text-brand-green">
                      {property.name}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {property.locationArea}, {property.city}
                    </p>
                  </div>
                  <Badge
                    className={
                      property.status === "ACTIVE"
                        ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                        : "border-chart-4/25 bg-chart-4/10 text-chart-4"
                    }
                  >
                    {property.status.toLowerCase()}
                  </Badge>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-3 text-sm">
                  <Stat label="Type" value={property.propertyType.toLowerCase()} />
                  <Stat
                    label="Occupancy"
                    value={formatPercent(occupancy, 0)}
                  />
                  <Stat
                    label="Net income"
                    value={formatINRCompact(pl.netOperatingIncome)}
                  />
                  <Stat
                    label="Base price"
                    value={formatINR(Number(property.basePrice))}
                  />
                </dl>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 truncate capitalize tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}
