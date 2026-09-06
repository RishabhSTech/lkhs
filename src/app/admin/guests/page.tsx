import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import { formatDateLong, formatINR } from "@/lib/format";
import { EmptyState } from "@/components/site/empty-state";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const guests = await db.guest.findMany({
    include: {
      reservations: {
        include: { property: { select: { name: true } } },
        orderBy: { checkIn: "desc" },
      },
    },
    orderBy: { name: "asc" },
    take: 60,
  });

  const rows = guests.map((g) => {
    const totalRevenue = g.reservations.reduce(
      (sum, r) => sum + Number(r.total),
      0,
    );
    const propertyCounts = new Map<string, number>();
    for (const r of g.reservations) {
      propertyCounts.set(
        r.property.name,
        (propertyCounts.get(r.property.name) ?? 0) + 1,
      );
    }
    const preferred = [...propertyCounts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];

    return {
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      bookings: g.reservations.length,
      totalRevenue,
      lastStay: g.reservations[0]?.checkOut ?? null,
      preferred,
    };
  });

  return (
    <AdminPage>
      <PageHeader
        title="Guests"
        description={`${guests.length} guest profiles across every channel.`}
      />

      {rows.length === 0 ? (
        <EmptyState className="mt-6" title="No guests yet" />
      ) : (
        <>
          <div className="mt-6 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Guest", "Contact", "Bookings", "Total revenue", "Last stay", "Preferred property"].map(
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
                {rows.map((g) => (
                  <tr key={g.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {g.name}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.email && <span className="block">{g.email}</span>}
                      {g.phone && <span className="block">{g.phone}</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {g.bookings}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatINR(g.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {g.lastStay ? formatDateLong(g.lastStay) : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {g.preferred ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-2.5 lg:hidden">
            {rows.map((g) => (
              <li key={g.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{g.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.email ?? g.phone}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {formatINR(g.totalRevenue)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {g.bookings} bookings
                  {g.lastStay && ` · last stay ${formatDateLong(g.lastStay)}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPage>
  );
}
