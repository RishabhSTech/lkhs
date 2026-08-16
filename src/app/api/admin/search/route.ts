import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ reservations: [], guests: [], transactions: [] });
  }

  const [reservations, guests, transactions] = await Promise.all([
    db.reservation.findMany({
      where: {
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
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      take: 5,
    }),
    db.transaction.findMany({
      where: { description: { contains: q, mode: "insensitive" } },
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
