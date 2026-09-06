import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

const schema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await getCurrentAdminUser();
  await db.pushSubscription.deleteMany({ where: { endpoint: parsed.data.endpoint } });

  return NextResponse.json({ ok: true });
}
