import type { NotificationSeverity, NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { getNotificationProvider } from "@/lib/notifications/provider";
import { sendPushToTeam } from "@/lib/notifications/push";

export type TeamAlert = {
  type: NotificationType;
  title: string;
  body: string;
  severity?: NotificationSeverity;
  link?: string;
};

/**
 * The one place a new inquiry (any channel - website, chat, or a manually
 * logged OTA message) becomes something a human actually notices: it writes
 * the in-app notification, pushes to every subscribed browser, and emails a
 * backup address - all three fire immediately, none of them depend on
 * someone having the admin panel open.
 */
export async function alertTeam(alert: TeamAlert) {
  const notification = await db.notification.create({
    data: {
      type: alert.type,
      title: alert.title,
      body: alert.body,
      severity: alert.severity ?? "INFO",
      link: alert.link,
    },
  });

  const teamEmail = process.env.TEAM_ALERT_EMAIL;

  await Promise.all([
    sendPushToTeam({ title: alert.title, body: alert.body, link: alert.link }),
    teamEmail
      ? getNotificationProvider().send({
          channel: "EMAIL",
          to: teamEmail,
          subject: `New inquiry: ${alert.title}`,
          body: `${alert.body}${alert.link ? `\n\nOpen: ${process.env.APP_URL ?? ""}${alert.link}` : ""}`,
        })
      : Promise.resolve(),
  ]);

  return notification;
}
