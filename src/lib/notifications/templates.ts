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
        body: `Hi ${ctx.guestName}, you're booked.\n\n${ctx.propertyName}\n${stay}\nBooking ${ctx.bookingCode}\n\nThe address and access details reach you three days before you travel. Anything you need before then - an early check-in, a question about the area - just reply to this message.\n\n- Lime Kraft Home Stays`,
      };
    case "PAYMENT_RECEIVED":
      return {
        subject: `Payment received · ${ctx.bookingCode}`,
        body: `Hi ${ctx.guestName}, ${
          ctx.total ? `we've received ${formatINR(ctx.total)}` : "your payment has come through"
        } for ${ctx.propertyName}. Booking ${ctx.bookingCode} is paid in full - nothing else to settle, at the house or on the way out.`,
      };
    case "PRE_ARRIVAL":
      return {
        subject: `Getting ready for your stay at ${ctx.propertyName}`,
        body: `Hi ${ctx.guestName}, we're three days out - your stay begins ${formatDateLong(
          ctx.checkIn,
        )} and the house is yours from 2:00 PM.${
          ctx.address ? `\n\nAddress: ${ctx.address}` : ""
        }\n\nArriving early, or late off a flight? Tell us roughly when and we'll work around it.`,
      };
    case "CHECK_IN_DAY":
      return {
        subject: `Today's the day · ${ctx.propertyName}`,
        body: `Welcome, ${ctx.guestName}. ${ctx.propertyName} is cleaned, checked and ready for you from 2:00 PM.${
          ctx.address ? `\n\n${ctx.address}` : ""
        }\n\nYour access code follows 30 minutes before check-in. Someone from our team is on this number the whole way through.`,
      };
    case "DURING_STAY":
      return {
        subject: `Settling in?`,
        body: `Hi ${ctx.guestName}, hope the first night at ${ctx.propertyName} went well. Fresh towels, a spare key, somewhere good to eat nearby - reply here and one of us will sort it.`,
      };
    case "CHECKOUT":
      return {
        subject: `Checkout tomorrow · ${ctx.propertyName}`,
        body: `Hi ${ctx.guestName}, checkout is by 11:00 AM tomorrow. Leave the keys on the kitchen counter and pull the door shut behind you - that's all there is to it.\n\nNeed a couple of extra hours? Ask, and we'll check what's coming in after you. Safe travels.`,
      };
    case "REVIEW_REQUEST":
      return {
        subject: `How was ${ctx.propertyName}?`,
        body: `Hi ${ctx.guestName}, thank you for staying with us. If you have two minutes, we'd genuinely like to know how it went - the good and the parts we got wrong. We read every one, and it's how these homes get better.`,
      };
  }
}
