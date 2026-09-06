import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { enqueueMailboxPoll } from "@/lib/queue";

export async function POST() {
  const { user } = await getCurrentAdminUser();

  const integration = await db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } });
  if (!integration || integration.status !== "CONNECTED") {
    return NextResponse.json({ error: "Connect the mailbox before syncing." }, { status: 400 });
  }

  const job = await enqueueMailboxPoll();

  await db.auditLog.create({
    data: {
      userId: user.id,
      userName: user.name,
      action: "MAILBOX_SYNC_REQUESTED",
      entityType: "MailboxIntegration",
      entityId: integration.id,
      summary: `${user.name} requested a manual mailbox sync`,
    },
  });

  if (!job) {
    return NextResponse.json(
      { error: "No background worker is running, so nothing was queued. Set REDIS_URL and start the worker." },
      { status: 503 },
    );
  }

  return NextResponse.json({ queued: true });
}
