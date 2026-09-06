import type { MessageChannel } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transport-agnostic outbound messaging. Email (SMTP/Resend/SES), WhatsApp
 * Business API and SMS adapters implement this; callers only ever see
 * NotificationProvider.
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

/** Real email delivery via Resend's REST API. WhatsApp/SMS have no adapter
 * yet and stay on the logging provider below. */
class ResendEmailProvider implements NotificationProvider {
  async send(message: OutboundMessage): Promise<SendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return { status: "FAILED", error: "RESEND_API_KEY or RESEND_FROM_EMAIL not set" };
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject ?? "Lime Kraft Home Stays",
          text: message.body,
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { status: "FAILED", error: `Resend HTTP ${res.status}: ${body.slice(0, 300)}` };
      }

      const data = (await res.json()) as { id: string };
      return { status: "SENT", providerRef: data.id };
    } catch (error) {
      return {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Resend request failed",
      };
    }
  }
}

/**
 * Real email delivery via SMTP — the no-reply@limekraftstays.com mailbox on
 * Hostinger. This is the account every system email (OTP, booking
 * confirmations, team alerts) actually sends from once configured. One
 * transporter is reused across sends rather than reconnecting per message.
 */
class SmtpEmailProvider implements NotificationProvider {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    this.transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: process.env.SMTP_SECURE !== "false", // true unless explicitly disabled
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    });
    return this.transporter;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    try {
      const info = await this.getTransporter().sendMail({
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: message.to,
        subject: message.subject ?? "Lime Kraft Home Stays",
        text: message.body,
      });
      return { status: "SENT", providerRef: info.messageId };
    } catch (error) {
      return {
        status: "FAILED",
        error: error instanceof Error ? error.message : "SMTP send failed",
      };
    }
  }
}

export const SMTP_IS_LIVE = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
);

export const EMAIL_IS_LIVE = Boolean(
  SMTP_IS_LIVE || (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
);

/** Routes EMAIL to SMTP (Hostinger) when configured, else Resend, else logs.
 * Everything else (WhatsApp, SMS) still has no live adapter and falls back
 * to logging. */
class CompositeNotificationProvider implements NotificationProvider {
  private readonly email = SMTP_IS_LIVE
    ? new SmtpEmailProvider()
    : EMAIL_IS_LIVE
      ? new ResendEmailProvider()
      : null;
  private readonly fallback = new LoggingNotificationProvider();

  async send(message: OutboundMessage): Promise<SendResult> {
    if (message.channel === "EMAIL" && this.email) {
      const result = await this.email.send(message);
      if (result.status === "SENT") return result;
      // Real send failed (bad key, rate limit, etc) — log it so nothing is
      // silently lost, but report the real failure rather than masking it.
      await this.fallback.send(message);
      return result;
    }
    return this.fallback.send(message);
  }
}

export function getNotificationProvider(): NotificationProvider {
  return new CompositeNotificationProvider();
}

export const NOTIFICATIONS_ARE_LOGGED_ONLY = !EMAIL_IS_LIVE;
