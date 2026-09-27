import type { BookingSource, EmailClassification, ProcessedEmailStatus, ReservationStatus } from "@prisma/client";

export const OTA_SOURCE_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
};

/** Shape pulled from ProcessedEmailMessage with the relations the inbox needs. */
export type InboxEmailRow = {
  id: string;
  receivedAt: Date;
  fromAddress: string;
  subject: string;
  source: BookingSource | null;
  classification: EmailClassification;
  confidence: number | null;
  status: ProcessedEmailStatus;
  error: string | null;
  message: { id: string; body: string; guest: { id: string; name: string } | null } | null;
  reservation: {
    id: string;
    code: string;
    status: ReservationStatus;
    rawData: unknown;
    property: { name: string } | null;
    guest: { id: string; name: string } | null;
  } | null;
};

export type InboxEmail = {
  id: string;
  receivedAt: Date;
  fromAddress: string;
  subject: string;
  source: BookingSource | null;
  classification: EmailClassification;
  confidence: number | null;
  status: ProcessedEmailStatus;
  error: string | null;
  bodySnippet: string | null;
  reservationCode: string | null;
  reservationStatus: ReservationStatus | null;
};

export type InboxOutcome = "BOOKED" | "CANCELLED" | "INQUIRY_ONLY";

export type InboxThread = {
  key: string;
  guestName: string | null;
  propertyName: string | null;
  sources: BookingSource[];
  outcome: InboxOutcome;
  reservationCode: string | null;
  needsAttention: boolean;
  latestAt: Date;
  emails: InboxEmail[];
};

/** The extractor always writes a `messageBody` even for booking emails - see extract-booking-info.ts - but only inquiry emails get a Message row; booking emails carry it inside Reservation.rawData instead. */
function bodyFromRawData(rawData: unknown): string | null {
  if (rawData && typeof rawData === "object" && "extraction" in rawData) {
    const extraction = (rawData as { extraction?: unknown }).extraction;
    if (extraction && typeof extraction === "object" && "messageBody" in extraction) {
      const body = (extraction as { messageBody?: unknown }).messageBody;
      if (typeof body === "string" && body.trim().length > 0) return body;
    }
  }
  return null;
}

/**
 * Groups raw mailbox emails into per-guest threads and derives, per thread,
 * whether it's still just an inquiry, converted into a live booking, or a
 * booking that was later cancelled - the whole point being to answer "did
 * this turn into a booking?" (and its inverse) at a glance.
 *
 * Threading is by resolved guestId. An email whose extraction never matched
 * an existing Guest row (common for a first-time inquiry - see
 * ingestInquiryMessage) has no guestId to key on, so it gets its own
 * single-email thread rather than being merged on a guess.
 */
export function buildInboxThreads(rows: InboxEmailRow[]): InboxThread[] {
  const groups = new Map<string, InboxEmail[]>();
  const groupGuestName = new Map<string, string | null>();
  const groupProperty = new Map<string, string | null>();

  for (const row of rows) {
    const guest = row.message?.guest ?? row.reservation?.guest ?? null;
    const key = guest ? `guest:${guest.id}` : `solo:${row.id}`;

    const email: InboxEmail = {
      id: row.id,
      receivedAt: row.receivedAt,
      fromAddress: row.fromAddress,
      subject: row.subject,
      source: row.source,
      classification: row.classification,
      confidence: row.confidence,
      status: row.status,
      error: row.error,
      bodySnippet: row.message?.body ?? bodyFromRawData(row.reservation?.rawData ?? null),
      reservationCode: row.reservation?.code ?? null,
      reservationStatus: row.reservation?.status ?? null,
    };

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(email);

    if (guest?.name && !groupGuestName.get(key)) groupGuestName.set(key, guest.name);
    if (row.reservation?.property?.name) groupProperty.set(key, row.reservation.property.name);
  }

  const threads: InboxThread[] = [];
  for (const [key, emails] of groups) {
    emails.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

    // The most recent email that actually carries a reservation wins - a
    // booking email arriving after an earlier inquiry is what "converted",
    // and a later cancellation flips a booked thread back to cancelled.
    const withReservation = [...emails].reverse().find((e) => e.reservationCode);
    const outcome: InboxOutcome =
      withReservation?.reservationStatus === "CANCELLED"
        ? "CANCELLED"
        : withReservation
          ? "BOOKED"
          : "INQUIRY_ONLY";

    const sources = [...new Set(emails.map((e) => e.source).filter((s): s is BookingSource => Boolean(s)))];

    threads.push({
      key,
      guestName: groupGuestName.get(key) ?? null,
      propertyName: groupProperty.get(key) ?? null,
      sources,
      outcome,
      reservationCode: withReservation?.reservationCode ?? null,
      needsAttention: emails.some((e) => e.status === "NEEDS_REVIEW" || e.status === "FAILED"),
      latestAt: emails[emails.length - 1].receivedAt,
      emails,
    });
  }

  threads.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  return threads;
}
