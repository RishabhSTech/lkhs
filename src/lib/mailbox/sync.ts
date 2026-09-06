import { Prisma, type BookingSource } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, eachNight, parseISODate } from "@/lib/dates";
import { buildQuote } from "@/lib/pricing/engine";
import { alertTeam } from "@/lib/notifications/alert";
import { fetchNewMessages, type ImapCredentials } from "@/lib/mailbox/client";
import { sourceFromAddress } from "@/lib/mailbox/parse-email";
import { extractBookingInfo, type ExtractedBookingInfo } from "@/lib/mailbox/extract-booking-info";
import { matchPropertyByHint } from "@/lib/mailbox/match-property";
import { decrypt } from "@/lib/mailbox/crypto";

const CONFIDENCE_THRESHOLD_FOR_AUTO_BOOKING = 0.6;
// How far back to search on a poll — deliberately wider than the 5-minute
// cadence so a missed/late poll (worker restart, transient IMAP failure)
// can't permanently skip an email; ProcessedEmailMessage dedupe handles the
// overlap.
const SEARCH_WINDOW_DAYS = 2;

const OTA_LABELS: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
};

export async function getMailboxIntegration() {
  return db.mailboxIntegration.findFirst({ orderBy: { createdAt: "desc" } });
}

type PollSummary = { processed: number; failed: number; skipped: number };

type Envelope = { from: string; subject: string; receivedAt: Date };

/**
 * The one entry point both the scheduled job and "Sync now" call. Never
 * throws for an individual bad email — each message's outcome is isolated so
 * one malformed email can't stall the whole poll.
 */
export async function runMailboxPoll(): Promise<PollSummary> {
  const integration = await getMailboxIntegration();
  if (!integration || integration.status !== "CONNECTED") {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  const summary: PollSummary = { processed: 0, failed: 0, skipped: 0 };
  const creds: ImapCredentials = {
    host: integration.imapHost,
    port: integration.imapPort,
    secure: integration.imapSecure,
    user: integration.email,
    pass: decrypt(integration.passwordEncrypted),
  };

  const since = integration.lastSyncAt ?? addDays(new Date(), -SEARCH_WINDOW_DAYS);

  let messages: Awaited<ReturnType<typeof fetchNewMessages>>;
  try {
    messages = await fetchNewMessages(creds, since);
  } catch (error) {
    await db.mailboxIntegration.update({ where: { id: integration.id }, data: { status: "ERROR" } });
    await alertTeam({
      type: "OTA_SYNC_FAILED",
      title: "Mailbox OTA sync is broken",
      body: `Could not connect to ${integration.email} (${integration.imapHost}): ${error instanceof Error ? error.message : "unknown error"}. Reconnect it from Settings → Integrations.`,
      severity: "CRITICAL",
      link: "/admin/settings/integrations",
    });
    return summary;
  }

  for (const { uid, parsed } of messages) {
    const emailMessageId = parsed.messageId ?? `${integration.id}:uid-${uid}`;

    const already = await db.processedEmailMessage.findUnique({ where: { emailMessageId } });
    if (already) {
      summary.skipped++;
      continue;
    }

    const envelope: Envelope = {
      from: parsed.from?.value[0]?.address ?? parsed.from?.text ?? "",
      subject: parsed.subject ?? "",
      receivedAt: parsed.date ?? new Date(),
    };

    try {
      const source = sourceFromAddress(envelope.from);
      if (!source) {
        // Matched the IMAP search's domain filter but our stricter
        // per-source check disagrees (e.g. a forwarded copy) — log it
        // rather than silently drop it, but don't guess a source.
        await db.processedEmailMessage.create({
          data: {
            emailMessageId,
            receivedAt: envelope.receivedAt,
            fromAddress: envelope.from,
            subject: envelope.subject,
            classification: "OTHER",
            status: "NEEDS_REVIEW",
            error: "Could not determine which OTA this email is from.",
          },
        });
        summary.processed++;
        continue;
      }

      const bodyText = parsed.text || "";
      const extraction = await extractBookingInfo({ source, subject: envelope.subject, body: bodyText });

      const isBookingEvent =
        extraction.classification === "BOOKING_CONFIRMED" ||
        extraction.classification === "BOOKING_MODIFIED" ||
        extraction.classification === "BOOKING_CANCELLED";

      if (!isBookingEvent) {
        await ingestInquiryMessage({ emailMessageId, envelope, source, extraction });
      } else {
        await upsertBookingFromEmail({ emailMessageId, envelope, source, extraction });
      }
      summary.processed++;
    } catch (error) {
      summary.failed++;
      console.error(`[mailbox] failed to process message ${emailMessageId}:`, error);
      await db.processedEmailMessage
        .create({
          data: {
            emailMessageId,
            receivedAt: envelope.receivedAt,
            fromAddress: envelope.from,
            subject: envelope.subject,
            classification: "OTHER",
            status: "FAILED",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        })
        .catch(() => {
          /* if even this insert fails (e.g. duplicate), the next poll will retry */
        });
    }
  }

  await db.mailboxIntegration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date(), status: "CONNECTED" } });
  return summary;
}

export async function ingestInquiryMessage(args: {
  emailMessageId: string;
  envelope: Envelope;
  source: BookingSource;
  extraction: ExtractedBookingInfo;
}) {
  const { emailMessageId, envelope, source, extraction } = args;
  const label = OTA_LABELS[source] ?? source;

  const guest = extraction.guestEmail
    ? await db.guest.findFirst({ where: { email: extraction.guestEmail } })
    : extraction.guestPhone
      ? await db.guest.findFirst({ where: { phone: extraction.guestPhone } })
      : null;

  const guestName = extraction.guestName ?? "Guest";

  const createdMessage = await db.message.create({
    data: {
      guestId: guest?.id ?? null,
      channel: "OTA",
      source,
      direction: "INBOUND",
      subject: `${label} ${extraction.classification === "INQUIRY" ? "inquiry" : "notification"}: ${guestName}`,
      body: extraction.messageBody || "(no message body extracted)",
      status: "DELIVERED",
    },
  });

  await db.processedEmailMessage.create({
    data: {
      emailMessageId,
      receivedAt: envelope.receivedAt,
      fromAddress: envelope.from,
      subject: envelope.subject,
      source,
      classification: extraction.classification,
      confidence: extraction.confidence,
      status: "PROCESSED",
      messageId: createdMessage.id,
    },
  });

  await alertTeam({
    type: "OTA_MESSAGE",
    title: `New ${label} message`,
    body: `${guestName} — ${extraction.messageBody.slice(0, 120)}${extraction.messageBody.length > 120 ? "…" : ""}`,
    severity: "WARNING",
    link: "/admin/messages",
  });
}

async function upsertGuestForEmail(guestName: string | null, guestEmail: string | null, guestPhone: string | null) {
  const name = guestName ?? "Guest";
  const existing = await db.guest.findFirst({
    where: {
      OR: [guestEmail ? { email: guestEmail } : undefined, guestPhone ? { phone: guestPhone } : undefined].filter(
        Boolean,
      ) as Prisma.GuestWhereInput[],
    },
  });
  if (existing) {
    return db.guest.update({
      where: { id: existing.id },
      data: { name, email: guestEmail ?? existing.email, phone: guestPhone ?? existing.phone },
    });
  }
  return db.guest.create({ data: { name, email: guestEmail, phone: guestPhone } });
}

function generateCode() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LK-${new Date().getFullYear()}${rand}`;
}

function tryParseISODate(value: string): Date | null {
  try {
    return parseISODate(value);
  } catch {
    return null;
  }
}

export async function upsertBookingFromEmail(args: {
  emailMessageId: string;
  envelope: Envelope;
  source: BookingSource;
  extraction: ExtractedBookingInfo;
}) {
  const { emailMessageId, envelope, source, extraction } = args;
  const label = OTA_LABELS[source] ?? source;

  // Best-effort parse up front so the guest-email fallback lookup below can
  // require the dates to be in the same ballpark — without this, a repeat
  // guest's brand-new booking could get matched (and its dates silently
  // overwritten) onto an unrelated older stay just because the email address
  // is the same.
  const roughCheckIn = extraction.checkIn ? tryParseISODate(extraction.checkIn) : null;

  const existing = extraction.externalReservationId
    ? await db.reservation.findUnique({
        where: { source_externalReservationId: { source, externalReservationId: extraction.externalReservationId } },
      })
    : extraction.guestEmail
      ? await db.reservation.findFirst({
          where: {
            source,
            guest: { email: extraction.guestEmail },
            ...(roughCheckIn
              ? { checkIn: { gte: addDays(roughCheckIn, -5), lte: addDays(roughCheckIn, 5) } }
              : {}),
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (extraction.classification === "BOOKING_CANCELLED") {
    if (!existing) {
      await needsReview(
        args,
        "Cancellation email received, but no matching reservation was found to cancel — check manually.",
      );
      return;
    }
    await db.$transaction([
      db.inventoryNight.deleteMany({ where: { reservationId: existing.id } }),
      db.reservation.update({ where: { id: existing.id }, data: { status: "CANCELLED" } }),
    ]);
    await recordProcessed(args, existing.id, null);
    await alertTeam({
      type: "NEW_BOOKING",
      title: `${label} reservation cancelled`,
      body: `${existing.code} — cancelled via ${label} email.`,
      severity: "WARNING",
      link: `/admin/reservations?code=${existing.code}`,
    });
    return;
  }

  // BOOKING_CONFIRMED or BOOKING_MODIFIED from here.
  if (extraction.confidence < CONFIDENCE_THRESHOLD_FOR_AUTO_BOOKING) {
    await needsReview(args, "Booking-looking email, but extraction confidence was too low to auto-create a reservation.");
    return;
  }
  if (!extraction.checkIn || !extraction.checkOut) {
    await needsReview(args, "Booking email did not have clear check-in/check-out dates — logged as a message instead.");
    return;
  }

  let checkIn: Date, checkOut: Date;
  try {
    checkIn = parseISODate(extraction.checkIn);
    checkOut = parseISODate(extraction.checkOut);
  } catch {
    await needsReview(args, "Booking email had unparseable dates — logged as a message instead.");
    return;
  }
  if (checkOut <= checkIn) {
    await needsReview(args, "Booking email's check-out wasn't after check-in — logged as a message instead.");
    return;
  }

  const propertyMatch = extraction.propertyHint ? await matchPropertyByHint(extraction.propertyHint) : null;
  if (!propertyMatch) {
    await needsReview(args, "Could not confidently match this booking to a property — logged as a message instead.");
    return;
  }

  const property = await db.property.findUnique({
    where: { id: propertyMatch.propertyId },
    include: { units: true, pricingRules: { where: { isActive: true } } },
  });
  const unitId = property?.units[0]?.id;
  if (!property || !unitId) {
    await needsReview(args, `Matched property "${propertyMatch.propertyName}" has no bookable unit — logged as a message instead.`);
    return;
  }

  const nights = eachNight(checkIn, checkOut);
  const guest = await upsertGuestForEmail(extraction.guestName, extraction.guestEmail, extraction.guestPhone);

  let pricing: { nightlyRate: number; subtotal: number; cleaningFee: number; taxes: number; discount: number; total: number };
  if (extraction.amountTotal) {
    pricing = {
      nightlyRate: extraction.amountTotal / nights.length,
      subtotal: extraction.amountTotal,
      cleaningFee: 0,
      taxes: 0,
      discount: 0,
      total: extraction.amountTotal,
    };
  } else {
    const overrides = await db.dailyRate.findMany({ where: { propertyId: property.id, date: { gte: checkIn, lt: checkOut } } });
    const quote = buildQuote({
      basePrice: Number(property.basePrice),
      cleaningFee: Number(property.cleaningFee),
      checkIn,
      checkOut,
      rules: property.pricingRules,
      dailyRateOverrides: Object.fromEntries(overrides.map((o) => [o.date.toISOString().slice(0, 10), Number(o.price)])),
    });
    pricing = {
      nightlyRate: quote.averageNightlyRate,
      subtotal: quote.subtotal,
      cleaningFee: quote.cleaningFee,
      taxes: quote.taxes,
      discount: quote.discount,
      total: quote.total,
    };
  }

  const rawData = { extraction, emailMessageId, fromAddress: envelope.from, subject: envelope.subject } as Prisma.InputJsonValue;
  const internalNotes = `Auto-created from a parsed ${label} email — please verify guest details and amount.`;

  try {
    if (existing) {
      await db.$transaction(async (tx) => {
        const datesChanged =
          existing.checkIn.getTime() !== checkIn.getTime() || existing.checkOut.getTime() !== checkOut.getTime();
        if (datesChanged) {
          await tx.inventoryNight.deleteMany({ where: { reservationId: existing.id } });
          await tx.inventoryNight.createMany({ data: nights.map((date) => ({ unitId, date, reservationId: existing.id })) });
        }
        await tx.reservation.update({
          where: { id: existing.id },
          data: {
            checkIn,
            checkOut,
            adults: extraction.guestsCount ?? existing.adults,
            status: "CONFIRMED",
            nightlyRate: new Prisma.Decimal(pricing.nightlyRate),
            nights: nights.length,
            subtotal: new Prisma.Decimal(pricing.subtotal),
            total: new Prisma.Decimal(pricing.total),
            rawData,
          },
        });
      });
      await recordProcessed(args, existing.id, null);
    } else {
      const created = await db.$transaction(async (tx) => {
        const reservation = await tx.reservation.create({
          data: {
            code: generateCode(),
            propertyId: property.id,
            unitId,
            guestId: guest.id,
            checkIn,
            checkOut,
            adults: extraction.guestsCount ?? 1,
            status: "CONFIRMED",
            source,
            externalReservationId: extraction.externalReservationId,
            nightlyRate: new Prisma.Decimal(pricing.nightlyRate),
            nights: nights.length,
            subtotal: new Prisma.Decimal(pricing.subtotal),
            cleaningFee: new Prisma.Decimal(pricing.cleaningFee),
            taxes: new Prisma.Decimal(pricing.taxes),
            discount: new Prisma.Decimal(pricing.discount),
            total: new Prisma.Decimal(pricing.total),
            internalNotes,
            rawData,
            reservationGuests: {
              create: {
                name: extraction.guestName ?? "Guest",
                email: extraction.guestEmail,
                phone: extraction.guestPhone,
                isPrimary: true,
              },
            },
          },
        });
        await tx.inventoryNight.createMany({ data: nights.map((date) => ({ unitId, date, reservationId: reservation.id })) });
        return reservation;
      });
      await recordProcessed(args, created.id, null);
      await alertTeam({
        type: "NEW_BOOKING",
        title: `New ${label} booking`,
        body: `${extraction.guestName ?? "A guest"} booked ${property.name} · ${created.code} (from a parsed email — please verify).`,
        severity: "INFO",
        link: `/admin/reservations?code=${created.code}`,
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Genuine double-booking: those dates are already taken by another
      // reservation. Never silently overwritten — flagged for a human.
      const loggedMessage = await db.message.create({
        data: {
          guestId: guest.id,
          channel: "OTA",
          source,
          direction: "INBOUND",
          subject: `${label} booking needs manual reconciliation: ${extraction.guestName ?? "Guest"}`,
          body: `${extraction.messageBody}\n\n(Automatic import failed: these dates already have a reservation on this property/unit.)`,
          status: "DELIVERED",
        },
      });
      await recordProcessed(args, null, loggedMessage.id, "FAILED", "Possible double-booking — dates already reserved on this unit.");
      await alertTeam({
        type: "OTA_SYNC_FAILED",
        title: `Possible double-booking from a ${label} email`,
        body: `${extraction.guestName ?? "A guest"}'s ${label} booking for ${property.name} overlaps an existing reservation. Reconcile manually.`,
        severity: "CRITICAL",
        link: "/admin/reservations",
      });
      return;
    }
    throw error;
  }
}

async function needsReview(
  args: { emailMessageId: string; envelope: Envelope; source: BookingSource; extraction: ExtractedBookingInfo },
  reason: string,
) {
  await ingestInquiryMessage(args);
  await markNeedsReviewNote(args.emailMessageId, reason);
}

async function markNeedsReviewNote(emailMessageId: string, reason: string) {
  await db.processedEmailMessage.update({
    where: { emailMessageId },
    data: { status: "NEEDS_REVIEW", error: reason },
  });
}

async function recordProcessed(
  args: { emailMessageId: string; envelope: Envelope; source: BookingSource; extraction: ExtractedBookingInfo },
  reservationId: string | null,
  messageId: string | null,
  status: "PROCESSED" | "FAILED" = "PROCESSED",
  error?: string,
) {
  await db.processedEmailMessage.create({
    data: {
      emailMessageId: args.emailMessageId,
      receivedAt: args.envelope.receivedAt,
      fromAddress: args.envelope.from,
      subject: args.envelope.subject,
      source: args.source,
      classification: args.extraction.classification,
      confidence: args.extraction.confidence,
      status,
      error,
      reservationId,
      messageId,
    },
  });
}
