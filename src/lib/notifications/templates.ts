import type { MessageChannel, NotificationSeverity } from "@prisma/client";
import { formatDateLong, formatINR } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo/site";
import {
  EMAIL_COLORS as c,
  emailCallout,
  emailDetailCell as detail,
  escapeHtml,
  renderEmailShell,
} from "@/lib/notifications/email-layout";

export type TemplateKey =
  | "BOOKING_REQUESTED"
  | "BOOKING_CONFIRMED"
  | "DIGITAL_CHECKIN"
  | "BOOKING_CANCELLED"
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
  // Only used to build the richer HTML emails, which mirror the
  // /booking-confirmation page's layout.
  nights?: number;
  adults?: number;
  children?: number;
  locationArea?: string;
  city?: string;
  propertyImageUrl?: string;
  paymentMethod?: string;
};

type Rendered = { subject: string; body: string; html?: string };

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  BOOKING_REQUESTED: "Booking request received",
  BOOKING_CONFIRMED: "Booking confirmed",
  DIGITAL_CHECKIN: "Digital check-in",
  BOOKING_CANCELLED: "Booking cancelled",
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
  { key: "BOOKING_REQUESTED", channels: ["EMAIL", "WHATSAPP"], timing: "Immediately" },
  { key: "BOOKING_CONFIRMED", channels: ["EMAIL", "WHATSAPP"], timing: "Once our team confirms payment" },
  { key: "DIGITAL_CHECKIN", channels: ["EMAIL"], timing: "Right after booking is confirmed" },
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
    case "BOOKING_REQUESTED":
      return {
        subject: `We've received your booking request · ${ctx.bookingCode}`,
        body: `Hi ${ctx.guestName}, thanks for requesting a stay.\n\n${ctx.propertyName}\n${stay}\nBooking ${ctx.bookingCode}${
          ctx.total ? `\nTotal: ${formatINR(ctx.total)}` : ""
        }\n\nWe don't take payment online yet - our team will reach out shortly to confirm your dates and share payment details. Nothing is charged until then.\n\n- Lime Kraft Home Stays`,
        html: renderBookingRequestedHtml(ctx),
      };
    case "BOOKING_CONFIRMED":
      return {
        subject: `Your stay at ${ctx.propertyName} is confirmed`,
        body: `Hi ${ctx.guestName}, you're booked.\n\n${ctx.propertyName}\n${stay}\nBooking ${ctx.bookingCode}\n\nThe address and access details reach you three days before you travel. Anything you need before then - an early check-in, a question about the area - just reply to this message.\n\n- Lime Kraft Home Stays`,
        html: renderBookingConfirmedHtml(ctx),
      };
    case "DIGITAL_CHECKIN": {
      const adultCount = ctx.adults ?? 1;
      return {
        subject: `Complete your digital check-in · ${ctx.bookingCode}`,
        body: `Hi ${ctx.guestName}, one last thing before you arrive at ${ctx.propertyName}.\n\nIndian homestay rules require a government ID on file for every adult guest (${adultCount} in your party${ctx.children ? `, plus ${ctx.children} ${ctx.children === 1 ? "child" : "children"} - no ID needed for them` : ""}). Complete it in two minutes here:\n${absoluteUrl(`/checkin/${ctx.bookingCode}`)}\n\nAccepted: Aadhaar, Passport, Driving Licence or Voter ID. This only needs doing once, before ${formatDateLong(ctx.checkIn)}.\n\n- Lime Kraft Home Stays`,
        html: renderDigitalCheckinHtml(ctx),
      };
    }
    case "BOOKING_CANCELLED":
      return {
        subject: `Your booking · ${ctx.bookingCode} has been cancelled`,
        body: `Hi ${ctx.guestName}, booking ${ctx.bookingCode} for ${ctx.propertyName} (${stay}) has been cancelled.\n\nIf you have questions, or this wasn't you, just reply to this message and we'll sort it out.\n\n- Lime Kraft Home Stays`,
        html: renderBookingCancelledHtml(ctx),
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
        html: renderPreArrivalHtml(ctx),
      };
    case "CHECK_IN_DAY":
      return {
        subject: `Today's the day · ${ctx.propertyName}`,
        body: `Welcome, ${ctx.guestName}. ${ctx.propertyName} is cleaned, checked and ready for you from 2:00 PM.${
          ctx.address ? `\n\n${ctx.address}` : ""
        }\n\nYour access code follows 30 minutes before check-in. Someone from our team is on this number the whole way through.`,
        html: renderCheckInDayHtml(ctx),
      };
    case "DURING_STAY":
      return {
        subject: `Settling in?`,
        body: `Hi ${ctx.guestName}, hope the first night at ${ctx.propertyName} went well. Fresh towels, a spare key, somewhere good to eat nearby - reply here and one of us will sort it.`,
        html: renderDuringStayHtml(ctx),
      };
    case "CHECKOUT":
      return {
        subject: `Checkout tomorrow · ${ctx.propertyName}`,
        body: `Hi ${ctx.guestName}, checkout is by 11:00 AM tomorrow. Leave the keys on the kitchen counter and pull the door shut behind you - that's all there is to it.\n\nNeed a couple of extra hours? Ask, and we'll check what's coming in after you. Safe travels.`,
        html: renderCheckoutHtml(ctx),
      };
    case "REVIEW_REQUEST":
      return {
        subject: `How was ${ctx.propertyName}?`,
        body: `Hi ${ctx.guestName}, thank you for staying with us. If you have two minutes, we'd genuinely like to know how it went - the good and the parts we got wrong. We read every one, and it's how these homes get better.`,
        html: renderReviewRequestHtml(ctx),
      };
  }
}

/** First name plus the escaped property/location/code strings every booking
 * email needs - keeps the per-template render functions focused on layout. */
function guestBasics(ctx: TemplateContext) {
  const firstName = escapeHtml(ctx.guestName.split(" ")[0] ?? ctx.guestName);
  const propertyName = escapeHtml(ctx.propertyName);
  const location = [ctx.locationArea, ctx.city]
    .filter((part): part is string => Boolean(part))
    .map(escapeHtml)
    .join(", ");
  const bookingCode = escapeHtml(ctx.bookingCode);
  return { firstName, propertyName, location, bookingCode };
}

/** Property name/location + Booking ID pill row shared by every booking-status email. */
function propertyHeaderRow(propertyName: string, location: string, bookingCode: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;">
          <p style="margin:0;font-size:19px;font-weight:500;color:${c.ink};">${propertyName}</p>
          ${location ? `<p style="margin:4px 0 0;font-size:13px;color:${c.mutedFg};">${location}</p>` : ""}
        </td>
        <td align="right" style="vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:${c.muted};border-radius:8px;">
            <tr>
              <td style="padding:8px 14px;text-align:right;">
                <p style="margin:0;font-size:9px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${c.mutedFg};">Booking ID</p>
                <p style="margin:2px 0 0;font-size:13px;font-weight:500;font-family:'SFMono-Regular',Consolas,Menlo,monospace;color:${c.ink};">${bookingCode}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function detailGridRow(cells: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${c.border};padding-top:20px;">
      <tr>${cells}</tr>
    </table>`;
}

function guestsLine(ctx: TemplateContext): string {
  const adults = ctx.adults ?? 1;
  return `${adults} ${adults === 1 ? "adult" : "adults"}${
    ctx.children ? `, ${ctx.children} ${ctx.children === 1 ? "child" : "children"}` : ""
  }`;
}

/**
 * HTML body for BOOKING_REQUESTED - same shell as the confirmed email below,
 * but framed as a request awaiting the team rather than a done deal, since
 * there's no payment gateway to settle it automatically yet.
 */
function renderBookingRequestedHtml(ctx: TemplateContext): string {
  const stay = `${formatDateLong(ctx.checkIn)} – ${formatDateLong(ctx.checkOut)}`;
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(
      detail("Dates", stay, `${ctx.nights ?? ""} ${ctx.nights === 1 ? "night" : "nights"}`.trim()) +
        detail("Guests", guestsLine(ctx)),
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${detail("Total", ctx.total ? formatINR(ctx.total) : "-", "Pay when we confirm")}
      ${detail("Requested check-in", `From 2:00 PM on ${formatDateLong(ctx.checkIn)}`)}
    </tr></table>
    ${emailCallout("We don&rsquo;t take payment online yet - once our team confirms availability, we&rsquo;ll follow up with how to pay. Nothing has been charged.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#9200;",
    badgeColor: c.mutedFg,
    headline: "We&rsquo;ve got your request.",
    subhead: `Thanks, ${firstName}. Our team will reach out shortly to confirm your stay and share payment details.`,
    bodyHtml,
    ctaLabel: "View my request",
    ctaUrl: bookingUrl,
  });
}

/**
 * HTML body for BOOKING_CONFIRMED, mirroring the /booking-confirmation page's
 * layout and brand tokens (colors from globals.css, logo, detail grid) since
 * that's the guest's next reference point after this email.
 */
function renderBookingConfirmedHtml(ctx: TemplateContext): string {
  const stay = `${formatDateLong(ctx.checkIn)} – ${formatDateLong(ctx.checkOut)}`;
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);

  const bodyHtml = `
    ${
      ctx.propertyImageUrl
        ? `<img src="${escapeHtml(ctx.propertyImageUrl)}" alt="${propertyName}" width="536" style="width:100%;max-width:536px;height:auto;border-radius:10px;display:block;margin-bottom:20px;border:0;" />`
        : ""
    }
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(
      detail("Dates", stay, `${ctx.nights ?? ""} ${ctx.nights === 1 ? "night" : "nights"}`.trim()) +
        detail("Guests", guestsLine(ctx)),
    )}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${detail("Payment", ctx.total ? formatINR(ctx.total) : "Pending", ctx.paymentMethod ? escapeHtml(ctx.paymentMethod) : undefined)}
      ${detail("Check-in", `From 2:00 PM on ${formatDateLong(ctx.checkIn)}`, "Checkout by 11:00 AM")}
    </tr></table>
    ${emailCallout("The address and access details reach you three days before you travel. Anything you need before then - an early check-in, a question about the area - just reply to this email.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#10003;",
    badgeColor: c.blue,
    headline: "Your stay is confirmed.",
    subhead: `Thanks, ${firstName}. Everything&rsquo;s set - here are the details.`,
    bodyHtml,
    ctaLabel: "View my booking",
    ctaUrl: bookingUrl,
  });
}

/**
 * HTML body for DIGITAL_CHECKIN - sent as its own message right after
 * BOOKING_CONFIRMED once a reservation is paid. Links to /checkin/[code],
 * the guest-facing form that collects a government ID for every adult
 * guest in the party - India homestay guest-registration's paperless
 * replacement for a front-desk register.
 */
function renderDigitalCheckinHtml(ctx: TemplateContext): string {
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);
  const adultCount = ctx.adults ?? 1;
  const checkinUrl = absoluteUrl(`/checkin/${ctx.bookingCode}`);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(
      detail(
        "Guests to check in",
        `${adultCount} ${adultCount === 1 ? "adult" : "adults"}`,
        ctx.children ? `+ ${ctx.children} ${ctx.children === 1 ? "child" : "children"}, no ID needed` : "One ID per guest",
      ) + detail("Arrive by", formatDateLong(ctx.checkIn), "From 2:00 PM"),
    )}
    ${emailCallout("A valid government ID (Aadhaar, Passport, Driving Licence or Voter ID) is required for every adult guest staying, per India&rsquo;s homestay guest-registration rules. Submitting it here takes about two minutes and saves the paperwork at arrival.")}
    <p style="margin:0 0 4px;font-size:12px;color:${c.mutedFg};">Or paste this link: ${checkinUrl}</p>
  `;

  return renderEmailShell({
    badgeIcon: "ID",
    badgeColor: "#b98b3e",
    headline: "Let&rsquo;s get you checked in.",
    subhead: `Thanks, ${firstName}. One last step before you arrive - a quick digital check-in for your party.`,
    bodyHtml,
    ctaLabel: "Complete digital check-in",
    ctaUrl: checkinUrl,
  });
}

/** HTML body for BOOKING_CANCELLED - a plain record of what was cancelled,
 * plus a way back in (browse other stays) rather than a dead end. */
function renderBookingCancelledHtml(ctx: TemplateContext): string {
  const stay = `${formatDateLong(ctx.checkIn)} – ${formatDateLong(ctx.checkOut)}`;
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);

  const detailCells =
    ctx.nights !== undefined
      ? detail("Dates", stay, `${ctx.nights} ${ctx.nights === 1 ? "night" : "nights"}`) +
        detail("Guests", guestsLine(ctx))
      : detail("Dates", stay);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(detailCells)}
    ${emailCallout("If this wasn&rsquo;t you, or you have questions, just reply to this email and we&rsquo;ll sort it out.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#10005;",
    badgeColor: c.mutedFg,
    headline: "Your booking has been cancelled.",
    subhead: `Hi ${firstName}, here&rsquo;s a record of what was cancelled.`,
    bodyHtml,
    ctaLabel: "Browse other stays",
    ctaUrl: absoluteUrl("/stays"),
  });
}

/** HTML body for PRE_ARRIVAL - sent ~3 days out with the address/access
 * details that the confirmation email deliberately held back. */
function renderPreArrivalHtml(ctx: TemplateContext): string {
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(
      detail("Arriving", `From 2:00 PM on ${formatDateLong(ctx.checkIn)}`) +
        detail("Address", ctx.address ? escapeHtml(ctx.address) : "On its way shortly"),
    )}
    ${emailCallout("Arriving early, or late off a flight? Reply and tell us roughly when, and we&rsquo;ll work around it.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#128273;",
    badgeColor: c.blue,
    headline: "Your stay is coming up.",
    subhead: `Hi ${firstName}, we&rsquo;re three days out from ${propertyName}.`,
    bodyHtml,
    ctaLabel: "View my booking",
    ctaUrl: bookingUrl,
  });
}

/** HTML body for CHECK_IN_DAY - designed for parity with the WhatsApp/SMS
 * copy in case an email leg is ever added to that journey step. */
function renderCheckInDayHtml(ctx: TemplateContext): string {
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(
      detail("Address", ctx.address ? escapeHtml(ctx.address) : "Sent separately") +
        detail("Access code", "Follows 30 minutes before check-in"),
    )}
    ${emailCallout("Someone from our team is on this number the whole way through.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#127968;",
    badgeColor: c.blue,
    headline: "Today&rsquo;s the day.",
    subhead: `Welcome, ${firstName}. ${propertyName} is ready for you from 2:00 PM.`,
    bodyHtml,
    ctaLabel: "View my booking",
    ctaUrl: bookingUrl,
  });
}

/** HTML body for DURING_STAY - a light-touch, reply-oriented check-in. */
function renderDuringStayHtml(ctx: TemplateContext): string {
  const { firstName, propertyName } = guestBasics(ctx);

  const bodyHtml = emailCallout(
    "Fresh towels, a spare key, somewhere good to eat nearby - reply here and one of us will sort it.",
  );

  return renderEmailShell({
    badgeIcon: "&#9749;",
    badgeColor: c.blue,
    headline: "Settling in?",
    subhead: `Hi ${firstName}, hope the first night at ${propertyName} went well.`,
    bodyHtml,
  });
}

/** HTML body for CHECKOUT - the evening-before reminder. */
function renderCheckoutHtml(ctx: TemplateContext): string {
  const { firstName, propertyName, location, bookingCode } = guestBasics(ctx);

  const bodyHtml = `
    ${propertyHeaderRow(propertyName, location, bookingCode)}
    ${detailGridRow(detail("Checkout", "By 11:00 AM") + detail("Keys", "Leave on the kitchen counter"))}
    ${emailCallout("Need a couple of extra hours? Ask, and we&rsquo;ll check what&rsquo;s coming in after you. Safe travels.")}
  `;

  return renderEmailShell({
    badgeIcon: "&#128188;",
    badgeColor: c.blue,
    headline: "Checkout is tomorrow.",
    subhead: `Hi ${firstName}, a couple of details before you go.`,
    bodyHtml,
  });
}

/** HTML body for REVIEW_REQUEST - sent a day after checkout. */
function renderReviewRequestHtml(ctx: TemplateContext): string {
  const { firstName, propertyName } = guestBasics(ctx);

  const bodyHtml = emailCallout(
    "If you have two minutes, we&rsquo;d genuinely like to know how it went - the good and the parts we got wrong. We read every one, and it&rsquo;s how these homes get better.",
  );

  return renderEmailShell({
    badgeIcon: "&#9733;",
    badgeColor: c.gold,
    headline: `How was ${propertyName}?`,
    subhead: `Hi ${firstName}, thank you for staying with us.`,
    bodyHtml,
    ctaLabel: "Leave a review",
    ctaUrl: absoluteUrl("/account/trips"),
  });
}

const SEVERITY_STYLE: Record<NotificationSeverity, { badgeColor: string; label: string }> = {
  INFO: { badgeColor: c.blue, label: "Info" },
  WARNING: { badgeColor: c.gold, label: "Warning" },
  CRITICAL: { badgeColor: "#b3261e", label: "Critical" },
};

/** HTML body for internal team alerts (alertTeam) - a plain, utilitarian
 * notification rather than the warmer guest-facing design language. */
export function renderTeamAlertHtml(alert: {
  title: string;
  body: string;
  severity: NotificationSeverity;
  link?: string;
}): string {
  const style = SEVERITY_STYLE[alert.severity];
  const bodyHtml = `<p style="margin:0;font-size:14px;line-height:1.6;color:${c.ink};white-space:pre-line;">${escapeHtml(alert.body)}</p>`;

  return renderEmailShell({
    badgeIcon: "!",
    badgeColor: style.badgeColor,
    headline: escapeHtml(alert.title),
    subhead: `${style.label} · internal notification`,
    bodyHtml,
    ctaLabel: alert.link ? "Open in admin" : undefined,
    ctaUrl: alert.link ? absoluteUrl(alert.link) : undefined,
    footerNote: "Lime Kraft Home Stays · Internal notification",
  });
}

/** HTML body for the OTP sign-in code email. */
export function renderOtpEmailHtml(code: string, ttlMinutes: number): string {
  const bodyHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
      <tr>
        <td align="center" style="background-color:${c.muted};border-radius:8px;padding:20px;">
          <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.35em;color:${c.ink};font-family:'SFMono-Regular',Consolas,Menlo,monospace;">${escapeHtml(code)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:${c.mutedFg};text-align:center;">This code expires in ${ttlMinutes} minutes. If you didn&rsquo;t request it, you can safely ignore this email.</p>
  `;

  return renderEmailShell({
    badgeIcon: "&#128274;",
    badgeColor: c.blue,
    headline: "Your sign-in code",
    subhead: "Use this code to finish signing in to Lime Kraft Home Stays.",
    bodyHtml,
  });
}
