import type { BookingSource } from "@prisma/client";
import type { SearchObject } from "imapflow";

/** Known sender domains per OTA. Extend here as you spot new sending
 * addresses - deliberately conservative so we never misattribute a source. */
const SOURCE_DOMAINS: { source: BookingSource; domains: string[] }[] = [
  { source: "AIRBNB", domains: ["airbnb.com", "mail.airbnb.com"] },
  { source: "BOOKING_COM", domains: ["booking.com", "message.booking.com"] },
  { source: "AGODA", domains: ["agoda.com", "mail.agoda.com"] },
];

export function sourceFromAddress(address: string): BookingSource | null {
  const match = address.match(/@([\w.-]+)/);
  const domain = match?.[1]?.toLowerCase();
  if (!domain) return null;

  for (const entry of SOURCE_DOMAINS) {
    if (entry.domains.some((d) => domain === d || domain.endsWith(`.${d}`))) {
      return entry.source;
    }
  }
  return null;
}

/** IMAP SEARCH criteria for the poller: any of the known OTA sender domains,
 * received since the given date. Kept next to the domain list above so the
 * two can never drift apart. */
export function buildImapSearchQuery(since: Date): SearchObject {
  return {
    since,
    or: SOURCE_DOMAINS.flatMap((entry) => entry.domains).map((domain) => ({ from: domain })),
  };
}
