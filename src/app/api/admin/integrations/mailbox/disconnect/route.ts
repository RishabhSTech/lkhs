import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";

export async function POST() {
  const { user } = await getCurrentAdminUser();
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only an admin can disconnect the mailbox." }, { status: 403 });
  }

  const integration = await db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } });
  if (!integration || integration.status !== "CONNECTED") {
    return NextResponse.json({ error: "The mailbox isn't connected." }, { status: 404 });
  }

  await db.mailboxIntegration.update({
    where: { id: integration.id },
    data: { status: "DISCONNECTED", disconnectedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "MAILBOX_DISCONNECTED",
      entityType: "MailboxIntegration",
      entityId: integration.id,
      summary: `${user.name} disconnected ${integration.email}`,
    },
  });

  return NextResponse.json({ ok: true });
}
