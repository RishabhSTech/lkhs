import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { testImapLogin } from "@/lib/mailbox/client";
import { encrypt } from "@/lib/mailbox/crypto";

const schema = z.object({
  host: z.string().min(1, "Enter the IMAP server hostname."),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  email: z.email("Enter the mailbox's email address."),
  password: z.string().min(1, "Enter the mailbox password."),
});

/**
 * Hostinger/Titan mail has no OAuth alternative for a plain IMAP mailbox -
 * this tests the login before ever saving anything, so a typo'd password
 * never gets stored (encrypted or not).
 */
export async function POST(request: Request) {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can connect the mailbox." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the connection details and try again." },
      { status: 400 },
    );
  }
  const { host, port, secure, email, password } = parsed.data;

  const test = await testImapLogin({ host, port, secure, user: email, pass: password });
  if (!test.ok) {
    return NextResponse.json({ error: `Could not connect: ${test.error}` }, { status: 400 });
  }

  const passwordEncrypted = encrypt(password);
  const existing = await db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } });
  const integration = existing
    ? await db.mailboxIntegration.update({
        where: { id: existing.id },
        data: {
          email,
          imapHost: host,
          imapPort: port,
          imapSecure: secure,
          passwordEncrypted,
          status: "CONNECTED",
          connectedAt: new Date(),
          disconnectedAt: null,
        },
      })
    : await db.mailboxIntegration.create({
        data: {
          email,
          imapHost: host,
          imapPort: port,
          imapSecure: secure,
          passwordEncrypted,
          status: "CONNECTED",
          connectedAt: new Date(),
        },
      });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "MAILBOX_CONNECTED",
      entityType: "MailboxIntegration",
      entityId: integration.id,
      summary: `${user.name} connected ${email} for OTA email parsing`,
    },
  });

  return NextResponse.json({ ok: true });
}
