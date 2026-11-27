import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { ExtraIncomeManager } from "@/components/admin/extra-income-manager";
import { PeriodPicker } from "@/components/admin/period-picker";
import { db } from "@/lib/db";
import { propertyScopeFilter, requireAdminPage, scopeFilter } from "@/lib/auth/guards";
import { EXTRA_INCOME_ROLES } from "@/lib/auth/roles";
import { operatingProperty, onOperatingProperty } from "@/lib/property/back-office";
import { parsePeriod, periodDateFilter } from "@/lib/finance/period";
import { EXTRA_INCOME_CATEGORY_NAMES, extraIncomeTypeOf } from "@/lib/finance/extra-income";
import { toISODate } from "@/lib/dates";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ExtraIncomePage({ searchParams }: PageProps<"/admin/finance/extra-income">) {
  const { scope } = await requireAdminPage(EXTRA_INCOME_ROLES);
  const period = parsePeriod(await searchParams);

  const [entries, properties] = await Promise.all([
    db.transaction.findMany({
      where: {
        type: "REVENUE",
        reservationId: null,
        category: { name: { in: EXTRA_INCOME_CATEGORY_NAMES } },
        date: periodDateFilter(period),
        ...scopeFilter(scope),
        ...onOperatingProperty,
      },
      include: {
        category: { select: { name: true } },
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 500,
    }),
    db.property.findMany({
      where: { ...propertyScopeFilter(scope), ...operatingProperty },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = entries.flatMap((e) => {
    const type = extraIncomeTypeOf(e.category.name);
    return type
      ? [
          {
            id: e.id,
            propertyId: e.propertyId,
            propertyName: e.property.name,
            type,
            amount: Number(e.amount),
            date: toISODate(e.date),
            description: e.description,
            paymentMethod: e.paymentMethod,
          },
        ]
      : [];
  });
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <AdminPage>
      <PageHeader
        title="Extra income"
        description="Money we earn besides our own guests' stays - extra mattresses, bookings given to other flats, and so on. It counts in Finance."
      />

      <div className="mt-5">
        <PeriodPicker
          key={`${period.kind}-${toISODate(period.from)}-${toISODate(period.to)}`}
          kind={period.kind}
          from={toISODate(period.from)}
          to={toISODate(period.to)}
          label={period.label}
        />
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {rows.length} {rows.length === 1 ? "entry" : "entries"} · <span className="font-semibold text-foreground">{formatINR(total)}</span>
      </p>

      <div className="mt-3">
        <ExtraIncomeManager rows={rows} properties={properties} total={total} />
      </div>
    </AdminPage>
  );
}
