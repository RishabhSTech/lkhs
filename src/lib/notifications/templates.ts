import type { MessageChannel } from "@prisma/client";
import { formatDateLong, formatINR } from "@/lib/format";

export type TemplateKey =
  | "BOOKING_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PRE_ARRIVAL"
  | "CHECK_IN_DAY"
  | "DURING_STAY"
  | "CHECKOUT"
  | "REVIEW_REQUEST";

export type TemplateContext = {
  guestName: string;
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
  bookingCode: string;
  total?: number;
  address?: string;
};

type Rendered = { subject: string; body: string };

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  BOOKING_CONFIRMED: "Booking confirmed",
  PAYMENT_RECEIVED: "Payment received",
  PRE_ARRIVAL: "Pre-arrival",
  CHECK_IN_DAY: "Check-in day",
  DURING_STAY: "During stay",
  CHECKOUT: "Checkout",
  REVIEW_REQUEST: "Review request",
};

/** Ordered guest communication journey; drives the per-booking timeline. */
export const COMMUNICATION_JOURNEY: {
  key: TemplateKey;
  channels: MessageChannel[];
  timing: string;
}[] = [
  { key: "BOOKING_CONFIRMED", channels: ["EMAIL", "WHATSAPP"], timing: "Immediately" },
  { key: "PAYMENT_RECEIVED", channels: ["EMAIL"], timing: "On payment" },
  { key: "PRE_ARRIVAL", channels: ["WHATSAPP", "EMAIL"], timing: "3 days before" },
  { key: "CHECK_IN_DAY", channels: ["WHATSAPP", "SMS"], timing: "9:00 AM on arrival" },
  { key: "DURING_STAY", channels: ["WHATSAPP"], timing: "Morning after check-in" },
  { key: "CHECKOUT", channels: ["WHATSAPP"], timing: "Evening before departure" },
  { key: "REVIEW_REQUEST", channels: ["EMAIL", "WHATSAPP"], timing: "1 day after checkout" },
];

export function renderTemplate(
  key: TemplateKey,
  ctx: TemplateContext,
): Rendered {
  const stay = `${formatDateLong(ctx.checkIn)} → ${formatDateLong(ctx.checkOut)}`;

  switch (key) {
    case "BOOKING_CONFIRMED":
      return {
        subject: `Your stay at ${ctx.propertyName} is confirmed`,
        body: `Hi ${ctx.guestName}, your stay is confirmed.\n\n${ctx.propertyName}\n${stay}\nBooking ${ctx.bookingCode}\n\nWe'll send check-in details closer to your arrival.\n\n— Lime Kraft Home Stays`,
      };
    case "PAYMENT_RECEIVED":
      return {
        subject: `Payment received · ${ctx.bookingCode}`,
        body: `Hi ${ctx.guestName}, we've received ${
          ctx.total ? formatINR(ctx.total) : "your payment"
        } for ${ctx.propertyName}. Booking ${ctx.bookingCode} is fully paid.`,
      };
    case "PRE_ARRIVAL":
      return {
        subject: `Getting ready for your stay at ${ctx.propertyName}`,
        body: `Hi ${ctx.guestName}, your stay begins ${formatDateLong(
          ctx.checkIn,
        )}. Check-in is from 2:00 PM.${
          ctx.address ? `\n\nAddress: ${ctx.address}` : ""
        }\n\nReply here if you'd like an early check-in and we'll try to arrange it.`,
      };
    case "CHECK_IN_DAY":
      return {
        subject: `Check-in today · ${ctx.propertyName}`,
        body: `Welcome, ${ctx.guestName}. Your home is ready from 2:00 PM today.${
          ctx.address ? `\n\n${ctx.address}` : ""
        }\n\nYour access code will arrive 30 minutes before check-in.`,
      };
    case "DURING_STAY":
      return {
        subject: `Settling in well?`,
        body: `Hi ${ctx.guestName}, hope ${ctx.propertyName} is treating you well. Anything you need — fresh towels, directions, a recommendation — just reply here.`,
      };
    case "CHECKOUT":
      return {
        subject: `Checkout tomorrow · ${ctx.propertyName}`,
        body: `Hi ${ctx.guestName}, checkout is by 11:00 AM tomorrow. Leave the keys on the kitchen counter and pull the door shut behind you. Safe travels.`,
      };
    case "REVIEW_REQUEST":
      return {
        subject: `How was ${ctx.propertyName}?`,
        body: `Hi ${ctx.guestName}, thank you for staying with us. If you have a moment, we'd love to hear how it went — it genuinely shapes how we run our homes.`,
      };
  }
}
