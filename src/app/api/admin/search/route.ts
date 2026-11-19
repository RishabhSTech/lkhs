import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guardApi, scopeFilter } from "@/lib/auth/guards";
import { FINANCE_ROLES, OFFICE_ROLES } from "@/lib/auth/roles";

export async function GET(request: Request) {
  const auth = await guardApi(OFFICE_ROLES);
  if ("error" in auth) return auth.error;
  const { user, scope } = auth;
  // Money only for finance; property-scoped staff only see their own homes'
  // bookings and the guests who stayed there.
  const showMoney = FINANCE_ROLES.includes(user.role);

  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ reservations: [], guests: [], transactions: [] });
  }

  const [reservations, guests, transactions] = await Promise.all([
    db.reservation.findMany({
      where: {
        ...scopeFilter(scope),
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { guest: { name: { contains: q, mode: "insensitive" } } },
          { property: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        guest: { select: { name: true } },
        property: { select: { name: true } },
      },
      take: 5,
      orderBy: { checkIn: "desc" },
    }),
    db.guest.findMany({
      where: {
        ...(scope ? { reservations: { some: { propertyId: { in: scope } } } } : {}),
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      take: 5,
    }),
    !showMoney
      ? Promise.resolve([])
      : db.transaction.findMany({
      where: { ...scopeFilter(scope), description: { contains: q, mode: "insensitive" } },
      include: { property: { select: { name: true } } },
      take: 5,
      orderBy: { date: "desc" },
    }),
  ]);

  return NextResponse.json({
    reservations: reservations.map((r) => ({
      id: r.id,
      code: r.code,
      guestName: r.guest.name,
      propertyName: r.property.name,
    })),
    guests: guests.map((g) => ({ id: g.id, name: g.name, email: g.email })),
    transactions: transactions.map((t) => ({
      id: t.id,
      description: t.description ?? "Transaction",
      amount: Number(t.amount),
      propertyName: t.property.name,
    })),
  });
}
