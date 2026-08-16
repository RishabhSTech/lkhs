import type { MessageChannel } from "@prisma/client";

/**
 * Transport-agnostic outbound messaging. Email (Resend/SES), WhatsApp Business
 * API and SMS adapters implement this; callers only ever see NotificationProvider.
 */

export type OutboundMessage = {
  channel: MessageChannel;
  to: string;
  subject?: string;
  body: string;
  templateKey?: string;
};

export type SendResult = {
  status: "SENT" | "FAILED";
  providerRef?: string;
  error?: string;
};

export interface NotificationProvider {
  send(message: OutboundMessage): Promise<SendResult>;
}

/**
 * Demo transport. No email/SMS/WhatsApp credentials are wired, so messages are
 * logged rather than delivered — never silently dropped.
 */
class LoggingNotificationProvider implements NotificationProvider {
  async send(message: OutboundMessage): Promise<SendResult> {
    console.info(
      `[notification:${message.channel}] → ${message.to}${
        message.subject ? ` · ${message.subject}` : ""
      }\n${message.body}`,
    );
    return { status: "SENT", providerRef: `log_${Date.now().toString(36)}` };
  }
}

export function getNotificationProvider(): NotificationProvider {
  return new LoggingNotificationProvider();
}

export const NOTIFICATIONS_ARE_LOGGED_ONLY = true;
