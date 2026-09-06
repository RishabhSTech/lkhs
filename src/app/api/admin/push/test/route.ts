import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { alertTeam } from "@/lib/notifications/alert";

/** "Send a test alert" button — lets the team confirm push actually reaches
 * their phone/desktop before they rely on it for a real inquiry. */
export async function POST() {
  const { user } = await getCurrentAdminUser();

  await alertTeam({
    type: "CONTACT_MESSAGE",
    title: "Test alert",
    body: `Triggered by ${user.name} — if you saw this, instant alerts are working.`,
    severity: "INFO",
    link: "/admin/messages",
  });

  return NextResponse.json({ ok: true });
}
