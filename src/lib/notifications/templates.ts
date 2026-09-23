import type { MessageChannel } from "@prisma/client";
import { formatDateLong, formatINR } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo/site";

export type TemplateKey =
  | "BOOKING_REQUESTED"
  | "BOOKING_CONFIRMED"
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
  // Only used to build the richer BOOKING_CONFIRMED HTML email, which mirrors
  // the /booking-confirmation page's layout.
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
    case "BOOKING_CANCELLED":
      return {
        subject: `Your booking · ${ctx.bookingCode} has been cancelled`,
        body: `Hi ${ctx.guestName}, booking ${ctx.bookingCode} for ${ctx.propertyName} (${stay}) has been cancelled.\n\nIf you have questions, or this wasn't you, just reply to this message and we'll sort it out.\n\n- Lime Kraft Home Stays`,
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML body for BOOKING_REQUESTED - same shell as the confirmed email below,
 * but framed as a request awaiting the team rather than a done deal, since
 * there's no payment gateway to settle it automatically yet.
 */
function renderBookingRequestedHtml(ctx: TemplateContext): string {
  const stay = `${formatDateLong(ctx.checkIn)} – ${formatDateLong(ctx.checkOut)}`;
  const firstName = escapeHtml(ctx.guestName.split(" ")[0] ?? ctx.guestName);
  const propertyName = escapeHtml(ctx.propertyName);
  const location = [ctx.locationArea, ctx.city]
    .filter((part): part is string => Boolean(part))
    .map(escapeHtml)
    .join(", ");
  const bookingCode = escapeHtml(ctx.bookingCode);
  const guestsLine = `${ctx.adults ?? 1} ${(ctx.adults ?? 1) === 1 ? "adult" : "adults"}${
    ctx.children ? `, ${ctx.children} ${ctx.children === 1 ? "child" : "children"}` : ""
  }`;
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);
  const logoUrl = absoluteUrl("/lkhs-dark.svg");

  const c = {
    blue: "#0b2f6b",
    ivory: "#f7f9fc",
    ink: "#0e1420",
    border: "#e3e8f1",
    muted: "#f4f7fc",
    mutedFg: "#5b6b82",
  };
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

  const detail = (label: string, value: string, sub?: string) => `
    <td style="padding:0 12px 20px 0;vertical-align:top;width:50%;">
      <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${c.mutedFg};">${label}</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:500;color:${c.ink};">${value}</p>
      ${sub ? `<p style="margin:2px 0 0;font-size:12px;color:${c.mutedFg};">${sub}</p>` : ""}
    </td>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${c.muted};font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.muted};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
            <tr>
              <td align="center" style="padding:28px 32px;border-bottom:1px solid ${c.border};">
                <img src="${logoUrl}" alt="Lime Kraft Home Stay" height="32" style="height:32px;width:auto;display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:40px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td width="56" height="56" align="center" valign="middle" style="background-color:${c.mutedFg};border-radius:999px;font-size:24px;line-height:56px;color:${c.ivory};font-weight:700;">&#9200;</td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 0;font-size:28px;line-height:1.25;font-weight:500;color:${c.ink};letter-spacing:-0.02em;font-family:${font};">We&rsquo;ve got your request.</h1>
                <p style="margin:10px 0 0;font-size:15px;color:${c.mutedFg};">Thanks, ${firstName}. Our team will reach out shortly to confirm your stay and share payment details.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
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
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${c.border};padding-top:20px;">
                  <tr>
                    ${detail("Dates", stay, `${ctx.nights ?? ""} ${ctx.nights === 1 ? "night" : "nights"}`.trim())}
                    ${detail("Guests", guestsLine)}
                  </tr>
                  <tr>
                    ${detail("Total", ctx.total ? formatINR(ctx.total) : "-", "Pay when we confirm")}
                    ${detail("Requested check-in", `From 2:00 PM on ${formatDateLong(ctx.checkIn)}`)}
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:${c.muted};border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:${c.mutedFg};">
                      We don&rsquo;t take payment online yet - once our team confirms availability, we&rsquo;ll follow up with how to pay. Nothing has been charged.
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                  <tr>
                    <td style="border-radius:8px;background-color:${c.blue};">
                      <a href="${bookingUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${font};">View my request</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid ${c.border};">
                <p style="margin:0;font-size:13px;color:${c.mutedFg};">- Lime Kraft Home Stays</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * HTML body for BOOKING_CONFIRMED, mirroring the /booking-confirmation page's
 * layout and brand tokens (colors from globals.css, logo, detail grid) since
 * that's the guest's next reference point after this email. Built with
 * inline styles and table layout rather than the site's Tailwind classes -
 * most email clients strip <style> classes and don't run a CSS pipeline.
 */
function renderBookingConfirmedHtml(ctx: TemplateContext): string {
  const stay = `${formatDateLong(ctx.checkIn)} – ${formatDateLong(ctx.checkOut)}`;
  const firstName = escapeHtml(ctx.guestName.split(" ")[0] ?? ctx.guestName);
  const propertyName = escapeHtml(ctx.propertyName);
  const location = [ctx.locationArea, ctx.city]
    .filter((part): part is string => Boolean(part))
    .map(escapeHtml)
    .join(", ");
  const bookingCode = escapeHtml(ctx.bookingCode);
  const guestsLine = `${ctx.adults ?? 1} ${(ctx.adults ?? 1) === 1 ? "adult" : "adults"}${
    ctx.children ? `, ${ctx.children} ${ctx.children === 1 ? "child" : "children"}` : ""
  }`;
  const bookingUrl = absoluteUrl(`/booking-confirmation/${ctx.bookingCode}`);
  const logoUrl = absoluteUrl("/lkhs-dark.svg");

  // Matches the CSS custom properties in src/app/globals.css.
  const c = {
    blue: "#0b2f6b",
    ivory: "#f7f9fc",
    ink: "#0e1420",
    border: "#e3e8f1",
    muted: "#f4f7fc",
    mutedFg: "#5b6b82",
  };
  // Single-quoted: this string is interpolated inside double-quoted style="" attributes.
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

  const detail = (label: string, value: string, sub?: string) => `
    <td style="padding:0 12px 20px 0;vertical-align:top;width:50%;">
      <p style="margin:0;font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${c.mutedFg};">${label}</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:500;color:${c.ink};">${value}</p>
      ${sub ? `<p style="margin:2px 0 0;font-size:12px;color:${c.mutedFg};">${sub}</p>` : ""}
    </td>`;

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:${c.muted};font-family:${font};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${c.muted};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${c.border};">
            <tr>
              <td align="center" style="padding:28px 32px;border-bottom:1px solid ${c.border};">
                <img src="${logoUrl}" alt="Lime Kraft Home Stay" height="32" style="height:32px;width:auto;display:block;border:0;" />
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:40px 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td width="56" height="56" align="center" valign="middle" style="background-color:${c.blue};border-radius:999px;font-size:24px;line-height:56px;color:${c.ivory};font-weight:700;">&#10003;</td>
                  </tr>
                </table>
                <h1 style="margin:20px 0 0;font-size:28px;line-height:1.25;font-weight:500;color:${c.ink};letter-spacing:-0.02em;font-family:${font};">Your stay is confirmed.</h1>
                <p style="margin:10px 0 0;font-size:15px;color:${c.mutedFg};">Thanks, ${firstName}. Everything&rsquo;s set - here are the details.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 8px;">
                ${
                  ctx.propertyImageUrl
                    ? `<img src="${escapeHtml(ctx.propertyImageUrl)}" alt="${propertyName}" width="536" style="width:100%;max-width:536px;height:auto;border-radius:10px;display:block;margin-bottom:20px;border:0;" />`
                    : ""
                }
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
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${c.border};padding-top:20px;">
                  <tr>
                    ${detail("Dates", stay, `${ctx.nights ?? ""} ${ctx.nights === 1 ? "night" : "nights"}`.trim())}
                    ${detail("Guests", guestsLine)}
                  </tr>
                  <tr>
                    ${detail("Payment", ctx.total ? formatINR(ctx.total) : "Pending", ctx.paymentMethod ? escapeHtml(ctx.paymentMethod) : undefined)}
                    ${detail("Check-in", `From 2:00 PM on ${formatDateLong(ctx.checkIn)}`, "Checkout by 11:00 AM")}
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;background-color:${c.muted};border-radius:8px;">
                  <tr>
                    <td style="padding:14px 16px;font-size:13px;line-height:1.5;color:${c.mutedFg};">
                      The address and access details reach you three days before you travel. Anything you need before then - an early check-in, a question about the area - just reply to this email.
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
                  <tr>
                    <td style="border-radius:8px;background-color:${c.blue};">
                      <a href="${bookingUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:${font};">View my booking</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid ${c.border};">
                <p style="margin:0;font-size:13px;color:${c.mutedFg};">- Lime Kraft Home Stays</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
