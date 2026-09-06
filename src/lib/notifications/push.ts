import webpush from "web-push";
import { db } from "@/lib/db";

/**
 * Browser push to every team member who has enabled instant alerts — this is
 * what closes the gap between "an inquiry landed" and "someone saw it".
 * Delivered even if no one has the admin panel open.
 */

export const PUSH_IS_CONFIGURED = Boolean(
  process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT,
);

if (PUSH_IS_CONFIGURED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  link?: string | null;
};

/** Sends to every stored subscription; prunes any the push service reports as gone. */
export async function sendPushToTeam(payload: PushPayload): Promise<void> {
  if (!PUSH_IS_CONFIGURED) {
    console.info(`[push:not-configured] would have alerted the team: ${payload.title}`);
    return;
  }

  const subscriptions = await db.pushSubscription.findMany();
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  const staleIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // 404/410 mean the browser unsubscribed or the push service forgot
        // this endpoint — safe to drop, anything else is worth keeping.
        if (statusCode === 404 || statusCode === 410) {
          staleIds.push(sub.id);
        } else {
          console.error(`[push:send-failed] ${sub.id}`, error);
        }
      }
    }),
  );

  if (staleIds.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }
}
