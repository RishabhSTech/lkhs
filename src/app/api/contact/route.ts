import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(2, "Enter your name."),
  email: z.email("Enter a valid email address."),
  phone: z.string().max(30).optional(),
  message: z.string().min(5, "Say a bit more about what you need."),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  const { name, email, phone, message } = parsed.data;

  const guest = await db.guest.findFirst({ where: { email } });

  await db.message.create({
    data: {
      guestId: guest?.id ?? null,
      channel: "EMAIL",
      direction: "INBOUND",
      subject: `Contact form: ${name}`,
      body: phone ? `${message}\n\nReply to: ${email} · ${phone}` : `${message}\n\nReply to: ${email}`,
      status: "DELIVERED",
    },
  });

  await db.notification.create({
    data: {
      type: "CONTACT_MESSAGE",
      title: "New contact form message",
      body: `${name} — ${message.slice(0, 120)}${message.length > 120 ? "…" : ""}`,
      severity: "INFO",
      link: "/admin/messages",
    },
  });

  return NextResponse.json({ ok: true });
}
