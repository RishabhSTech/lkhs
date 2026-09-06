import { Prisma, type BookingSource, type PaymentMethodType } from "@prisma/client";
import { db } from "@/lib/db";
import { eachNight, toUTCDate } from "@/lib/dates";
import { buildQuote } from "@/lib/pricing/engine";
import { getPaymentProvider, type PaymentIntentResult } from "@/lib/payments/provider";
import { getNotificationProvider } from "@/lib/notifications/provider";
import { renderTemplate } from "@/lib/notifications/templates";
import { alertTeam } from "@/lib/notifications/alert";
import { enqueueChannelSync, enqueueReservationExpiry } from "@/lib/queue";

export class InventoryConflictError extends Error {
  constructor() {
    super("Those dates were just taken. Please pick different dates.");
    this.name = "InventoryConflictError";
  }
}

export class PaymentIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentIntentError";
  }
}

export type CreateReservationInput = {
  propertyId: string;
  unitId?: string;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children?: number;
  guest: { name: string; email?: string | null; phone?: string | null };
  source?: BookingSource;
  paymentMethod?: PaymentMethodType;
  userId?: string | null;
};

function generateCode() {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LK-${new Date().getFullYear()}${rand}`;
}

/** OTA commission rates used to record the fee side of channel bookings. */
const OTA_FEE_RATES: Partial<Record<BookingSource, number>> = {
  AIRBNB: 0.14,
  BOOKING_COM: 0.15,
  AGODA: 0.16,
};
const PAYMENT_FEE_RATE = 0.02;

/**
 * The one path that creates a booking. Availability check, inventory lock
 * and reservation creation happen inside a single transaction - the unique
 * constraint on (unitId, date) is what actually guarantees no double-booking
 * under concurrency.
 *
 * The reservation always starts PENDING, holding the dates. Revenue is only
 * posted once payment actually settles (see confirmReservation): for the
 * mock provider that happens synchronously right here; for a real provider
 * (Razorpay) it happens later, from the checkout-confirm route or webhook,
 * and a queued job releases the hold if payment never completes.
 */
export async function createReservation(input: CreateReservationInput) {
  const checkIn = toUTCDate(input.checkIn);
  const checkOut = toUTCDate(input.checkOut);
  const nights = eachNight(checkIn, checkOut);

  if (nights.length === 0) {
    throw new Error("Checkout must be at least one night after check-in.");
  }

  const property = await db.property.findUniqueOrThrow({
    where: { id: input.propertyId },
    include: { units: true, pricingRules: { where: { isActive: true } } },
  });

  const unitId = input.unitId ?? property.units[0]?.id;
  if (!unitId) throw new Error("This property has no bookable unit.");

  const overrides = await db.dailyRate.findMany({
    where: { propertyId: property.id, date: { gte: checkIn, lt: checkOut } },
  });

  const quote = buildQuote({
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    checkIn,
    checkOut,
    rules: property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [o.date.toISOString().slice(0, 10), Number(o.price)]),
    ),
  });

  const source = input.source ?? "DIRECT";
  const method = input.paymentMethod ?? "UPI";
  const code = generateCode();

  const reservation = await db
    .$transaction(async (tx) => {
      const guest = await upsertGuest(tx, input.guest, input.userId ?? null);

      const created = await tx.reservation.create({
        data: {
          code,
          propertyId: property.id,
          unitId,
          guestId: guest.id,
          checkIn,
          checkOut,
          adults: input.adults,
          children: input.children ?? 0,
          status: "PENDING",
          source,
          nightlyRate: new Prisma.Decimal(quote.averageNightlyRate),
          nights: quote.nightCount,
          subtotal: new Prisma.Decimal(quote.subtotal),
          cleaningFee: new Prisma.Decimal(quote.cleaningFee),
          taxes: new Prisma.Decimal(quote.taxes),
          discount: new Prisma.Decimal(quote.discount),
          total: new Prisma.Decimal(quote.total),
          reservationGuests: {
            create: {
              name: input.guest.name,
              email: input.guest.email ?? null,
              phone: input.guest.phone ?? null,
              isPrimary: true,
            },
          },
        },
      });

      // Locking inventory: unique (unitId, date) rejects any concurrent booking
      // that overlaps even a single night.
      await tx.inventoryNight.createMany({
        data: nights.map((date) => ({
          unitId,
          date,
          reservationId: created.id,
        })),
      });

      return created;
    })
    .catch((error) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new InventoryConflictError();
      }
      throw error;
    });

  await notifyChannelsOfAvailabilityChange(property.id);

  const provider = getPaymentProvider();
  let intent: PaymentIntentResult;
  try {
    intent = await provider.createIntent({
      reservationCode: reservation.code,
      amount: quote.total,
      currency: "INR",
      method,
      customer: input.guest,
    });
  } catch (error) {
    await releasePendingReservation(reservation.id);
    throw new PaymentIntentError(
      error instanceof Error ? error.message : "We couldn't start the payment. Please try again.",
    );
  }

  if (intent.status === "FAILED") {
    await releasePendingReservation(reservation.id);
    throw new PaymentIntentError(
      intent.failureReason ?? "We couldn't start the payment. Please try again.",
    );
  }

  await db.reservationPayment.create({
    data: {
      reservationId: reservation.id,
      provider: provider.name,
      method,
      amount: new Prisma.Decimal(quote.total),
      status: intent.status === "SUCCEEDED" ? "SUCCEEDED" : "PENDING",
      providerRef: intent.providerRef,
    },
  });

  if (intent.status === "SUCCEEDED") {
    await confirmReservation(reservation.id);
  } else {
    // Payment settles asynchronously (real gateway) - release the hold if the
    // guest never completes checkout.
    await enqueueReservationExpiry({ reservationId: reservation.id });
  }

  return {
    reservation,
    quote,
    status: intent.status === "SUCCEEDED" ? ("CONFIRMED" as const) : ("PENDING" as const),
    clientCheckout: intent.clientCheckout,
  };
}

type TxClient = Prisma.TransactionClient;

async function upsertGuest(
  tx: TxClient,
  guest: CreateReservationInput["guest"],
  userId: string | null,
) {
  const existing = await tx.guest.findFirst({
    where: {
      OR: [
        guest.email ? { email: guest.email } : undefined,
        guest.phone ? { phone: guest.phone } : undefined,
      ].filter(Boolean) as Prisma.GuestWhereInput[],
    },
  });

  if (existing) {
    return tx.guest.update({
      where: { id: existing.id },
      data: {
        name: guest.name,
        email: guest.email ?? existing.email,
        phone: guest.phone ?? existing.phone,
        userId: existing.userId ?? userId,
      },
    });
  }

  return tx.guest.create({
    data: {
      name: guest.name,
      email: guest.email ?? null,
      phone: guest.phone ?? null,
      userId,
    },
  });
}

/** Revenue plus its OTA/payment fees are posted as separate transactions. */
async function postBookingFinancials(
  tx: TxClient,
  args: {
    propertyId: string;
    reservationId: string;
    total: number;
    source: BookingSource;
    date: Date;
  },
) {
  const revenueCategory = await tx.transactionCategory.findFirstOrThrow({
    where: { group: "REVENUE", name: "Accommodation" },
  });

  await tx.transaction.create({
    data: {
      propertyId: args.propertyId,
      categoryId: revenueCategory.id,
      reservationId: args.reservationId,
      type: "REVENUE",
      amount: new Prisma.Decimal(args.total),
      date: args.date,
      status: "PAID",
      paymentMethod: "UPI",
      description: `Booking revenue · ${args.source}`,
    },
  });

  const otaRate = OTA_FEE_RATES[args.source];
  if (otaRate) {
    const otaCategory = await tx.transactionCategory.findFirstOrThrow({
      where: { group: "OTA_FEE" },
    });
    await tx.transaction.create({
      data: {
        propertyId: args.propertyId,
        categoryId: otaCategory.id,
        reservationId: args.reservationId,
        type: "OTA_FEE",
        amount: new Prisma.Decimal(Math.round(args.total * otaRate)),
        date: args.date,
        status: "PAID",
        description: `${args.source} commission`,
      },
    });
  }

  const paymentFeeCategory = await tx.transactionCategory.findFirstOrThrow({
    where: { group: "PAYMENT_FEE" },
  });
  await tx.transaction.create({
    data: {
      propertyId: args.propertyId,
      categoryId: paymentFeeCategory.id,
      reservationId: args.reservationId,
      type: "PAYMENT_FEE",
      amount: new Prisma.Decimal(Math.round(args.total * PAYMENT_FEE_RATE)),
      date: args.date,
      status: "PAID",
      description: "Payment gateway fee",
    },
  });
}

/** A booking (or its cancellation) changes which nights are free, so every
 * OTA this property is linked to needs its calendar pushed again. Never
 * blocks the caller. */
async function notifyChannelsOfAvailabilityChange(propertyId: string) {
  try {
    const links = await db.channelProperty.findMany({
      where: { propertyId, externalListingId: { not: null } },
      select: { id: true },
    });
    await Promise.all(
      links.map((link) =>
        enqueueChannelSync({ channelPropertyId: link.id, reason: "AVAILABILITY_CHANGED" }),
      ),
    );
  } catch (error) {
    console.error("Failed to enqueue channel sync after booking", error);
  }
}

/**
 * Called once payment has actually settled - synchronously for the mock
 * provider, or from the Razorpay checkout-confirm route / webhook once a
 * real charge is captured. Idempotent: a reservation that isn't still
 * PENDING has already been confirmed (or cancelled) and is left alone, so
 * a client-side confirm racing the webhook can't double-post revenue.
 */
export async function confirmReservation(reservationId: string) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    include: { property: { select: { id: true, name: true } }, reservationGuests: { where: { isPrimary: true } } },
  });
  if (!reservation || reservation.status !== "PENDING") return;

  await db.$transaction(async (tx) => {
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "CONFIRMED" },
    });
    await tx.reservationPayment.updateMany({
      where: { reservationId: reservation.id, status: "PENDING" },
      data: { status: "SUCCEEDED" },
    });
    await postBookingFinancials(tx, {
      propertyId: reservation.propertyId,
      reservationId: reservation.id,
      total: Number(reservation.total),
      source: reservation.source,
      date: reservation.checkIn,
    });
  });

  const primaryGuest = reservation.reservationGuests[0];
  await notifyGuestBookingConfirmed({
    reservationId: reservation.id,
    code: reservation.code,
    total: Number(reservation.total),
    guest: {
      name: primaryGuest?.name ?? "Guest",
      email: primaryGuest?.email ?? null,
      phone: primaryGuest?.phone ?? null,
    },
    propertyName: reservation.property.name,
    checkIn: reservation.checkIn,
    checkOut: reservation.checkOut,
  });
}

/** Releases a PENDING reservation's hold on inventory - used both when an
 * intent fails to even start, and by the reservation-expiry worker job.
 * Returns false if there was nothing to release (already confirmed or
 * already cancelled), so callers can tell a real release from a no-op. */
export async function releasePendingReservation(reservationId: string): Promise<boolean> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { id: true, status: true, propertyId: true },
  });
  if (!reservation || reservation.status !== "PENDING") return false;

  await db.$transaction([
    db.inventoryNight.deleteMany({ where: { reservationId: reservation.id } }),
    db.reservation.update({ where: { id: reservation.id }, data: { status: "CANCELLED" } }),
    db.reservationPayment.updateMany({
      where: { reservationId: reservation.id, status: "PENDING" },
      data: { status: "FAILED" },
    }),
  ]);

  await notifyChannelsOfAvailabilityChange(reservation.propertyId);
  return true;
}

async function notifyGuestBookingConfirmed(args: {
  reservationId: string;
  code: string;
  total: number;
  guest: { name: string; email?: string | null; phone?: string | null };
  propertyName: string;
  checkIn: Date;
  checkOut: Date;
}) {
  const rendered = renderTemplate("BOOKING_CONFIRMED", {
    guestName: args.guest.name,
    propertyName: args.propertyName,
    checkIn: args.checkIn,
    checkOut: args.checkOut,
    bookingCode: args.code,
    total: args.total,
  });

  const notifier = getNotificationProvider();
  const destination = args.guest.email ?? args.guest.phone;
  if (destination) {
    const result = await notifier.send({
      channel: args.guest.email ? "EMAIL" : "WHATSAPP",
      to: destination,
      subject: rendered.subject,
      body: rendered.body,
      templateKey: "BOOKING_CONFIRMED",
    });

    await db.message.create({
      data: {
        reservationId: args.reservationId,
        channel: args.guest.email ? "EMAIL" : "WHATSAPP",
        direction: "OUTBOUND",
        templateKey: "BOOKING_CONFIRMED",
        subject: rendered.subject,
        body: rendered.body,
        status: result.status === "SENT" ? "SENT" : "FAILED",
        sentAt: new Date(),
      },
    });
  }

  await alertTeam({
    type: "NEW_BOOKING",
    title: "New booking confirmed",
    body: `${args.guest.name} booked ${args.propertyName} · ${args.code}`,
    severity: "INFO",
    link: `/admin/reservations?code=${args.code}`,
  });
}
