import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Prisma,
  type BookingSource,
  type ReviewSource,
  type TransactionCategoryGroup,
  type TripType,
} from "@prisma/client";
import { pgPoolConfig } from "../src/lib/db-config";
import {
  THING_TO_KNOW_BY_CODE,
  THING_TO_KNOW_GROUP_ORDER,
} from "../src/lib/property/things-to-know";
import {
  AMENITIES,
  GUEST_NAMES,
  PROPERTIES,
  REVIEW_SNIPPETS,
  TRANSACTION_CATEGORY_DEFS,
  type SeedProperty,
} from "./seed-data";

const db = new PrismaClient({ adapter: new PrismaPg(pgPoolConfig()) });

const D = (n: number) => new Prisma.Decimal(n);

// ── date helpers (UTC-normalised, mirroring src/lib/dates.ts) ──────────────
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const today = (() => {
  const n = new Date();
  return utc(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
})();
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};
const addMonths = (date: Date, months: number) =>
  utc(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate());
const startOfMonth = (date: Date) =>
  utc(date.getUTCFullYear(), date.getUTCMonth(), 1);
const eachNight = (from: Date, to: Date) => {
  const out: Date[] = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) out.push(new Date(d));
  return out;
};

// Deterministic PRNG so re-seeding produces the same demo portfolio.
let seedState = 20260816;
const rand = () => {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
};
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const OTA_FEE_RATES: Record<BookingSource, number> = {
  DIRECT: 0,
  AIRBNB: 0.14,
  BOOKING_COM: 0.15,
  AGODA: 0.16,
  OTHER: 0.1,
};
const PAYMENT_FEE_RATE = 0.02;

const SOURCE_WEIGHTS: BookingSource[] = [
  "DIRECT", "DIRECT", "DIRECT", "DIRECT",
  "AIRBNB", "AIRBNB", "AIRBNB",
  "BOOKING_COM", "BOOKING_COM",
  "AGODA",
];

async function reset() {
  // Order matters: children before parents.
  await db.auditLog.deleteMany();
  await db.notification.deleteMany();
  await db.emailEvent.deleteMany();
  await db.message.deleteMany();
  await db.cleaningTask.deleteMany();
  await db.maintenanceTask.deleteMany();
  await db.review.deleteMany();
  await db.wishlist.deleteMany();
  await db.budget.deleteMany();
  await db.transaction.deleteMany();
  await db.recurringExpense.deleteMany();
  await db.transactionCategory.deleteMany();
  await db.inventoryNight.deleteMany();
  await db.reservationPayment.deleteMany();
  await db.reservationGuest.deleteMany();
  await db.reservation.deleteMany();
  await db.channelSyncLog.deleteMany();
  await db.channelRoom.deleteMany();
  await db.channelProperty.deleteMany();
  await db.channel.deleteMany();
  await db.dailyRate.deleteMany();
  await db.pricingRule.deleteMany();
  await db.propertyAmenity.deleteMany();
  await db.amenity.deleteMany();
  await db.propertyHighlight.deleteMany();
  await db.propertyThingToKnow.deleteMany();
  await db.propertyImage.deleteMany();
  await db.unit.deleteMany();
  await db.stakeholderProperty.deleteMany();
  await db.stakeholder.deleteMany();
  await db.propertyAssignment.deleteMany();
  await db.promotion.deleteMany();
  await db.property.deleteMany();
  await db.guest.deleteMany();
  await db.otpCode.deleteMany();
  await db.user.deleteMany();
}

async function main() {
  console.log("Resetting database…");
  await reset();

  // ── categories ──────────────────────────────────────────────────────────
  console.log("Seeding transaction categories…");
  const categoryMap = new Map<string, string>();
  for (const def of TRANSACTION_CATEGORY_DEFS) {
    for (const name of def.names) {
      const cat = await db.transactionCategory.create({
        data: {
          name,
          group: def.group,
          isRefundableDeposit: def.refundable?.includes(name) ?? false,
        },
      });
      categoryMap.set(`${def.group}:${name}`, cat.id);
    }
  }
  const catId = (group: TransactionCategoryGroup, name: string) => {
    const id = categoryMap.get(`${group}:${name}`);
    if (!id) throw new Error(`Missing category ${group}:${name}`);
    return id;
  };

  // ── users ───────────────────────────────────────────────────────────────
  console.log("Seeding users…");
  const superAdmin = await db.user.create({
    data: {
      name: "Rishabh Pratap",
      email: "rishabh@limekraft.in",
      phone: "+919820011001",
      role: "SUPER_ADMIN",
    },
  });
  const financeUser = await db.user.create({
    data: { name: "Neha Kulkarni", email: "finance@limekraft.in", role: "FINANCE" },
  });
  const opsUser = await db.user.create({
    data: { name: "Imran Sheikh", email: "ops@limekraft.in", role: "OPERATIONS" },
  });
  const cleanerUser = await db.user.create({
    data: { name: "Sunita Bai", phone: "+919820011004", role: "CLEANER" },
  });
  const ownerUser = await db.user.create({
    data: { name: "Deepak Agrawal", email: "deepak.owner@example.com", role: "OWNER" },
  });
  const investorUser = await db.user.create({
    data: { name: "Shalini Kapoor", email: "shalini.investor@example.com", role: "INVESTOR" },
  });

  // ── amenities ───────────────────────────────────────────────────────────
  console.log("Seeding amenities…");
  const amenityMap = new Map<string, string>();
  for (const [index, a] of AMENITIES.entries()) {
    // Catalogue order is the display order inside each section.
    const created = await db.amenity.create({
      data: { ...a, sortOrder: index },
    });
    amenityMap.set(a.name, created.id);
  }

  // ── channels ────────────────────────────────────────────────────────────
  console.log("Seeding channels…");
  const channels = await Promise.all([
    db.channel.create({ data: { code: "WEBSITE", name: "Lime Kraft Direct" } }),
    db.channel.create({ data: { code: "AIRBNB", name: "Airbnb" } }),
    db.channel.create({ data: { code: "BOOKING_COM", name: "Booking.com" } }),
    db.channel.create({ data: { code: "AGODA", name: "Agoda" } }),
  ]);

  // ── properties ──────────────────────────────────────────────────────────
  console.log("Seeding properties…");
  const propertyRecords: {
    seed: SeedProperty;
    id: string;
    unitId: string;
    openedAt: Date;
  }[] = [];

  for (const p of PROPERTIES) {
    const property = await db.property.create({
      data: {
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        locationArea: p.locationArea,
        // Fall through to the schema defaults when a seed entry does not say.
        ...(p.city ? { city: p.city } : {}),
        ...(p.state ? { state: p.state } : {}),
        addressLine: p.addressLine,
        latitude: p.latitude,
        longitude: p.longitude,
        propertyType: p.propertyType,
        maxGuests: p.maxGuests,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        beds: p.beds,
        basePrice: D(p.basePrice),
        cleaningFee: D(p.cleaningFee),
        isGuestFavourite: p.isGuestFavourite ?? false,
        checkInFrom: p.checkInFrom ?? "2:00 pm",
        checkInTo: p.checkInTo ?? "9:00 pm",
        checkOutBy: p.checkOutBy ?? "11:00 am",
        houseRules:
          "Check-in from 2:00 PM · Checkout by 11:00 AM\nNo parties or events\nNo smoking indoors\nPets by prior arrangement\nQuiet hours 10:00 PM – 7:00 AM",
        cancellationPolicy:
          "Free cancellation up to 7 days before check-in for a full refund. Cancel within 7 days and the first night is charged. No-shows are charged in full.",
        images: {
          create: p.images.map((url, i) => ({
            url,
            alt: `${p.name} — photo ${i + 1}`,
            sortOrder: i,
            isHero: i === 0,
          })),
        },
        amenities: {
          create: [
            ...p.amenities
              .filter((name) => amenityMap.has(name))
              .map((name) => ({ amenityId: amenityMap.get(name)! })),
            // "Not included" — the struck-through block at the foot of the
            // amenity dialog.
            ...(p.unavailableAmenities ?? [])
              .filter((name) => amenityMap.has(name))
              .map((name) => ({
                amenityId: amenityMap.get(name)!,
                isUnavailable: true,
              })),
          ],
        },
        highlights: {
          create: p.highlights.map((code, i) => ({ code, sortOrder: i })),
        },
        thingsToKnow: {
          // The label is snapshotted from the catalogue at seed time so an
          // admin can reword it per property without touching the code.
          create: THING_TO_KNOW_GROUP_ORDER.flatMap((group) =>
            (p.thingsToKnow[group] ?? []).flatMap((code, i) => {
              const definition = THING_TO_KNOW_BY_CODE.get(code);
              if (!definition) return [];
              return [{ group, code, label: definition.label, sortOrder: i }];
            }),
          ),
        },
        units: { create: p.units },
      },
      include: { units: true },
    });

    propertyRecords.push({
      seed: p,
      id: property.id,
      unitId: property.units[0].id,
      openedAt: startOfMonth(addMonths(today, -p.openedMonthsAgo)),
    });

    // Pricing rules
    await db.pricingRule.createMany({
      data: [
        {
          propertyId: property.id,
          name: "Weekend uplift",
          type: "WEEKEND",
          adjustmentType: "PERCENT",
          adjustmentValue: D(15),
          priority: 10,
        },
        {
          propertyId: property.id,
          name: "Festive & holiday",
          type: "HOLIDAY",
          adjustmentType: "PERCENT",
          adjustmentValue: D(30),
          startDate: utc(today.getUTCFullYear(), 9, 18),
          endDate: utc(today.getUTCFullYear(), 10, 5),
          priority: 20,
        },
        {
          propertyId: property.id,
          name: "7+ night discount",
          type: "LONG_STAY",
          adjustmentType: "PERCENT",
          adjustmentValue: D(-10),
          minNights: 7,
          priority: 5,
        },
        {
          propertyId: property.id,
          name: "Last-minute fill",
          type: "LAST_MINUTE",
          adjustmentType: "PERCENT",
          adjustmentValue: D(-8),
          minNights: 3,
          priority: 1,
        },
      ],
    });

    // Channel connections — deliberately mixed states, including an error.
    for (const channel of channels) {
      const isWebsite = channel.code === "WEBSITE";
      const isAgoda = channel.code === "AGODA";
      const status = isWebsite
        ? "CONNECTED"
        : isAgoda && p.slug === "central-indore-studio"
          ? "ERROR"
          : p.slug === "bicholi-courtyard-villa" && isAgoda
            ? "NOT_CONFIGURED"
            : "CONNECTED";

      const cp = await db.channelProperty.create({
        data: {
          channelId: channel.id,
          propertyId: property.id,
          status,
          externalListingId: isWebsite ? null : `${channel.code.toLowerCase()}-${randInt(10000, 99999)}`,
          lastSyncAt: status === "CONNECTED" ? addDays(today, 0) : status === "ERROR" ? addDays(today, -2) : null,
          rooms: { create: { unitId: property.units[0].id } },
        },
      });

      if (status === "CONNECTED") {
        await db.channelSyncLog.create({
          data: {
            channelPropertyId: cp.id,
            direction: "PUSH",
            status: "SUCCESS",
            message: "Availability and rates pushed",
            finishedAt: today,
          },
        });
      }
      if (status === "ERROR") {
        await db.channelSyncLog.create({
          data: {
            channelPropertyId: cp.id,
            direction: "PUSH",
            status: "ERROR",
            message: "Authentication failed — listing credentials need to be reconnected.",
            finishedAt: addDays(today, -2),
          },
        });
      }
    }
  }

  // ── guests ──────────────────────────────────────────────────────────────
  console.log("Seeding guests…");
  const guests = [];
  for (const [i, name] of GUEST_NAMES.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".");
    guests.push(
      await db.guest.create({
        data: {
          name,
          email: `${slug}@example.com`,
          phone: `+9198${String(20000000 + i * 137).slice(0, 8)}`,
          // Staggered so the reviews carry a believable "3 years on Lime
          // Kraft" line — every guest created today reads as brand new.
          createdAt: addDays(today, -randInt(40, 1500)),
        },
      }),
    );
  }

  // ── reservations + inventory + financials ───────────────────────────────
  console.log("Seeding reservations…");
  let reservationCounter = 0;
  const createdReservations: {
    id: string;
    propertyId: string;
    guestId: string;
    checkIn: Date;
    checkOut: Date;
    total: number;
    source: BookingSource;
    isPast: boolean;
  }[] = [];

  for (const record of propertyRecords) {
    const { seed, id: propertyId, unitId, openedAt } = record;
    const occupiedNights = new Set<string>();

    // Walk from opening month to two months ahead, placing plausible stays.
    const monthsSpan = seed.openedMonthsAgo + 2;
    for (let m = 0; m < monthsSpan; m++) {
      const monthStart = addMonths(openedAt, m);
      const daysInMonth = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
      ).getUTCDate();

      // Ramp occupancy: quiet at launch, healthier later.
      const maturity = Math.min(1, m / 4);
      const targetStays = Math.round(4 + maturity * 4);

      for (let s = 0; s < targetStays; s++) {
        const startDay = randInt(1, daysInMonth - 1);
        const nights = pick([1, 2, 2, 2, 3, 3, 4, 5, 7]);
        const checkIn = utc(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth(),
          startDay,
        );
        const checkOut = addDays(checkIn, nights);

        const nightList = eachNight(checkIn, checkOut);
        const clashes = nightList.some((n) =>
          occupiedNights.has(n.toISOString().slice(0, 10)),
        );
        if (clashes) continue;
        // Don't create bookings more than 60 days ahead.
        if (checkIn > addDays(today, 60)) continue;

        for (const n of nightList) occupiedNights.add(n.toISOString().slice(0, 10));

        const source = pick(SOURCE_WEIGHTS);
        const guest = pick(guests);
        const isPast = checkOut < today;
        const isCurrent = checkIn <= today && checkOut > today;

        // Price the stay with the same weekend/long-stay shape the engine uses.
        let subtotal = 0;
        for (const n of nightList) {
          const dow = n.getUTCDay();
          let price = seed.basePrice;
          if (dow === 5 || dow === 6) price *= 1.15;
          if (nights >= 7) price *= 0.9;
          subtotal += Math.round(price);
        }
        const cleaningFee = seed.cleaningFee;
        const taxes = Math.round((subtotal + cleaningFee) * 0.12);
        const total = subtotal + cleaningFee + taxes;

        reservationCounter++;
        const reservation = await db.reservation.create({
          data: {
            code: `LK-${checkIn.getUTCFullYear()}${String(reservationCounter).padStart(4, "0")}`,
            propertyId,
            unitId,
            guestId: guest.id,
            checkIn,
            checkOut,
            adults: randInt(1, Math.min(4, seed.maxGuests)),
            children: rand() > 0.75 ? randInt(1, 2) : 0,
            status: isPast ? "COMPLETED" : "CONFIRMED",
            source,
            nightlyRate: D(Math.round(subtotal / nights)),
            nights,
            subtotal: D(subtotal),
            cleaningFee: D(cleaningFee),
            taxes: D(taxes),
            total: D(total),
            reservationGuests: {
              create: {
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                isPrimary: true,
              },
            },
            payments: {
              create: {
                provider: "MOCK",
                method: pick(["UPI", "CARD", "NETBANKING"] as const),
                amount: D(total),
                status: "SUCCEEDED",
                providerRef: `mock_${reservation_ref()}`,
              },
            },
          },
        });

        await db.inventoryNight.createMany({
          data: nightList.map((date) => ({
            unitId,
            date,
            reservationId: reservation.id,
          })),
        });

        // Revenue posts on check-in date; fees follow it.
        await db.transaction.create({
          data: {
            propertyId,
            categoryId: catId("REVENUE", "Accommodation"),
            reservationId: reservation.id,
            type: "REVENUE",
            amount: D(total),
            date: checkIn,
            status: "PAID",
            paymentMethod: "UPI",
            description: `Booking revenue · ${source}`,
          },
        });

        const otaRate = OTA_FEE_RATES[source];
        if (otaRate > 0) {
          await db.transaction.create({
            data: {
              propertyId,
              categoryId: catId("OTA_FEE", "Channel Commission"),
              reservationId: reservation.id,
              type: "OTA_FEE",
              amount: D(Math.round(total * otaRate)),
              date: checkIn,
              status: "PAID",
              description: `${source} commission`,
            },
          });
        }

        await db.transaction.create({
          data: {
            propertyId,
            categoryId: catId("PAYMENT_FEE", "Gateway Fee"),
            reservationId: reservation.id,
            type: "PAYMENT_FEE",
            amount: D(Math.round(total * PAYMENT_FEE_RATE)),
            date: checkIn,
            status: "PAID",
            description: "Payment gateway fee",
          },
        });

        createdReservations.push({
          id: reservation.id,
          propertyId,
          guestId: guest.id,
          checkIn,
          checkOut,
          total,
          source,
          isPast,
        });

        // Cleaning task follows each checkout.
        if (isPast || isCurrent) {
          await db.cleaningTask.create({
            data: {
              propertyId,
              reservationId: reservation.id,
              status: isPast ? "READY" : "CLEANING_REQUIRED",
              assignedToId: cleanerUser.id,
              scheduledDate: checkOut,
              completedAt: isPast ? checkOut : null,
            },
          });
        }
      }
    }
  }

  // ── investment + recurring expenses ─────────────────────────────────────
  console.log("Seeding financials…");
  for (const record of propertyRecords) {
    const { seed, id: propertyId, openedAt } = record;

    for (const [name, amount] of Object.entries(seed.investment)) {
      const isDeposit = name === "Security Deposit";
      await db.transaction.create({
        data: {
          propertyId,
          categoryId: isDeposit
            ? catId("DEPOSIT", "Refundable Security Deposit")
            : catId("INITIAL_INVESTMENT", name),
          // Refundable deposits are DEPOSIT_OUT, never an expense.
          type: isDeposit ? "DEPOSIT_OUT" : "INVESTMENT",
          amount: D(amount),
          date: addDays(openedAt, -randInt(5, 25)),
          status: "PAID",
          paymentMethod: "BANK_TRANSFER",
          frequency: "ONE_TIME",
          description: isDeposit
            ? "Refundable security deposit paid to landlord"
            : `Setup · ${name}`,
          createdById: financeUser.id,
        },
      });
    }

    // Monthly recurring expenses from opening through the current month.
    for (const [name, amount] of Object.entries(seed.recurring)) {
      const recurring = await db.recurringExpense.create({
        data: {
          propertyId,
          categoryId: catId("RECURRING_EXPENSE", name),
          amount: D(amount),
          frequency: "MONTHLY",
          dayOfMonth: 1,
          description: `${name} — monthly`,
          status: "ACTIVE",
          startDate: openedAt,
          nextRunDate: startOfMonth(addMonths(today, 1)),
        },
      });

      for (let m = 0; m <= seed.openedMonthsAgo; m++) {
        const monthDate = addMonths(openedAt, m);
        if (monthDate > today) break;
        const isCurrentMonth =
          monthDate.getUTCMonth() === today.getUTCMonth() &&
          monthDate.getUTCFullYear() === today.getUTCFullYear();

        // Slight month-to-month variance on usage-based costs.
        const variance =
          name === "Electricity" || name === "Consumables" || name === "Laundry"
            ? 1 + (rand() - 0.5) * 0.3
            : 1;

        await db.transaction.create({
          data: {
            propertyId,
            categoryId: catId("RECURRING_EXPENSE", name),
            recurringExpenseId: recurring.id,
            type: "EXPENSE",
            amount: D(Math.round(amount * variance)),
            date: monthDate,
            status: isCurrentMonth && rand() > 0.6 ? "PENDING" : "PAID",
            paymentMethod: name === "Rent" ? "BANK_TRANSFER" : "UPI",
            frequency: "MONTHLY",
            description: `${name} — ${monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`,
            createdById: financeUser.id,
          },
        });
      }
    }

    // A few one-off operational costs.
    const oneOffs = [
      { name: "Plumbing", amount: randInt(1800, 4500) },
      { name: "Appliance Repair", amount: randInt(2200, 6800) },
      { name: "Deep Cleaning", amount: randInt(3000, 5500) },
    ];
    for (const o of oneOffs) {
      await db.transaction.create({
        data: {
          propertyId,
          categoryId: catId("ONE_TIME_EXPENSE", o.name),
          type: "EXPENSE",
          amount: D(o.amount),
          date: addDays(today, -randInt(10, 120)),
          status: "PAID",
          paymentMethod: "UPI",
          frequency: "ONE_TIME",
          description: `${o.name} — one-off`,
          createdById: opsUser.id,
        },
      });
    }

    // Current-month budgets for the main cost lines.
    const budgetLines: [string, number][] = [
      ["Rent", seed.recurring.Rent ?? 0],
      ["Cleaning", (seed.recurring.Cleaning ?? 0) * 1.05],
      ["Maintenance", (seed.recurring.Maintenance ?? 0) * 1.2],
      ["Electricity", (seed.recurring.Electricity ?? 0) * 1.1],
      ["Consumables", (seed.recurring.Consumables ?? 0) * 1.1],
    ];
    for (const [name, amount] of budgetLines) {
      if (!amount) continue;
      await db.budget.create({
        data: {
          propertyId,
          categoryId: catId("RECURRING_EXPENSE", name),
          month: startOfMonth(today),
          amount: D(Math.round(amount)),
        },
      });
    }
  }

  // ── reviews ─────────────────────────────────────────────────────────────
  console.log("Seeding reviews…");
  const pastReservations = createdReservations.filter((r) => r.isPast);
  const reviewed = new Set<string>();
  for (let i = 0; i < Math.min(28, pastReservations.length); i++) {
    const res = pick(pastReservations);
    if (reviewed.has(res.id)) continue;
    reviewed.add(res.id);
    const snippet = pick(REVIEW_SNIPPETS);
    await db.review.create({
      data: {
        propertyId: res.propertyId,
        guestId: res.guestId,
        reservationId: res.id,
        rating: snippet.rating,
        cleanliness: snippet.cleanliness ?? null,
        accuracy: snippet.accuracy ?? null,
        checkIn: snippet.checkIn ?? null,
        communication: snippet.communication ?? null,
        location: snippet.location ?? null,
        value: snippet.value ?? null,
        tripType: snippet.tripType,
        topics: snippet.topics,
        title: snippet.title,
        body: snippet.body,
        // Nights are derived from the linked reservation at render time, so
        // they are deliberately not duplicated onto the review here.
        stayedOn: res.checkOut,
        source: "DIRECT",
        status: "PUBLISHED",
        createdAt: addDays(res.checkOut, randInt(1, 6)),
      },
    });
  }

  // A handful of reviews imported from the OTAs by hand: no guest record on
  // our side, so they carry their own author fields and a self-declared stay
  // length, and one of them shows the reply flow.
  const importedReviews: {
    slug: string;
    source: ReviewSource;
    authorName: string;
    authorLocation: string;
    authorSince: number;
    rating: number;
    title: string;
    body: string;
    nightsStayed: number;
    tripType: TripType;
    topics: string[];
    cleanliness?: number;
    accuracy?: number;
    checkIn?: number;
    communication?: number;
    location?: number;
    value?: number;
    response?: string;
  }[] = [
    {
      slug: "the-vijay-nagar-residence",
      source: "AIRBNB" as const,
      authorName: "Daniel R.",
      topics: ["WORKSPACE", "WIFI", "CHECK_IN"],
      authorLocation: "Melbourne, Australia",
      authorSince: 2019,
      rating: 5,
      title: "Ideal base for a work week",
      body: "Booked five nights around a conference and barely used the hotel booking I'd held as backup. Desk, chair, wifi and coffee all sorted from the first morning.",
      nightsStayed: 5,
      tripType: "BUSINESS" as const,
      cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 5, value: 5,
    },
    {
      slug: "the-rau-garden-house",
      source: "BOOKING_COM" as const,
      authorName: "Sunita Bhargava",
      topics: ["OUTDOORS", "KITCHEN", "LOCATION"],
      authorLocation: "Bhopal, India",
      authorSince: 2021,
      rating: 4,
      title: "Lovely house, a little far out",
      body: "The garden and the kitchen were the stars. Do factor in the drive back into town at dinner time — it is further than it looks on the map.",
      nightsStayed: 3,
      tripType: "FAMILY" as const,
      cleanliness: 5, accuracy: 4, checkIn: 5, communication: 5, location: 3, value: 4,
      response:
        "Thank you Sunita — you're right that Rau trades a little distance for the garden. We now send a shortlist of places to eat within ten minutes of the house before every stay.",
    },
    {
      slug: "bicholi-courtyard-villa",
      source: "AIRBNB" as const,
      authorName: "Meghna & Arun",
      topics: ["GROUPS", "POOL", "CLEANLINESS"],
      authorLocation: "Bengaluru, India",
      authorSince: 2018,
      rating: 5,
      title: "The courtyard makes it",
      body: "We had eleven people for a family weekend and everyone gravitated to the courtyard. Pool was spotless. The team dropped in twice to reset the kitchen without ever being in the way.",
      nightsStayed: 4,
      tripType: "GROUP" as const,
      cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 4, value: 5,
    },
  ];

  for (const imported of importedReviews) {
    const { slug, response, ...fields } = imported;
    const record = propertyRecords.find((r) => r.seed.slug === slug);
    if (!record) continue;
    await db.review.create({
      data: {
        ...fields,
        propertyId: record.id,
        response: response ?? null,
        respondedAt: response ? addDays(today, -randInt(4, 20)) : null,
        status: "PUBLISHED",
        stayedOn: addDays(today, -randInt(30, 150)),
        createdAt: addDays(today, -randInt(25, 140)),
      },
    });
  }

  // ── maintenance ─────────────────────────────────────────────────────────
  console.log("Seeding operations…");
  const maintenanceSeeds = [
    { title: "Geyser in second bathroom heats slowly", priority: "MEDIUM" as const, status: "IN_PROGRESS" as const },
    { title: "Balcony door lock sticking", priority: "LOW" as const, status: "OPEN" as const },
    { title: "AC servicing due — living room unit", priority: "MEDIUM" as const, status: "OPEN" as const },
    { title: "Kitchen tap dripping", priority: "HIGH" as const, status: "RESOLVED" as const },
  ];
  for (const [i, m] of maintenanceSeeds.entries()) {
    const record = propertyRecords[i % propertyRecords.length];
    await db.maintenanceTask.create({
      data: {
        propertyId: record.id,
        title: m.title,
        description: "Reported after guest checkout inspection.",
        priority: m.priority,
        status: m.status,
        assignedToId: opsUser.id,
        createdAt: addDays(today, -randInt(1, 20)),
        resolvedAt: m.status === "RESOLVED" ? addDays(today, -1) : null,
      },
    });
  }

  // ── stakeholders ────────────────────────────────────────────────────────
  console.log("Seeding stakeholders…");
  const investmentTotal = (p: SeedProperty) =>
    Object.values(p.investment).reduce((s, v) => s + v, 0);

  const owner = await db.stakeholder.create({
    data: {
      userId: ownerUser.id,
      type: "OWNER",
      name: ownerUser.name,
      email: ownerUser.email,
    },
  });
  // Owner holds the two Vijay Nagar / Rau homes outright.
  for (const slug of ["the-vijay-nagar-residence", "the-rau-garden-house"]) {
    const rec = propertyRecords.find((r) => r.seed.slug === slug)!;
    await db.stakeholderProperty.create({
      data: {
        stakeholderId: owner.id,
        propertyId: rec.id,
        investmentAmount: D(investmentTotal(rec.seed)),
        ownershipPercent: D(100),
      },
    });
  }

  const investor = await db.stakeholder.create({
    data: {
      userId: investorUser.id,
      type: "INVESTOR",
      name: investorUser.name,
      email: investorUser.email,
    },
  });
  // Investor holds a minority position in the villa and the loft.
  for (const [slug, pct] of [
    ["bicholi-courtyard-villa", 40],
    ["palasia-loft", 55],
  ] as const) {
    const rec = propertyRecords.find((r) => r.seed.slug === slug)!;
    await db.stakeholderProperty.create({
      data: {
        stakeholderId: investor.id,
        propertyId: rec.id,
        investmentAmount: D(Math.round((investmentTotal(rec.seed) * pct) / 100)),
        ownershipPercent: D(pct),
      },
    });
  }

  // ── property assignments (RBAC scoping) ─────────────────────────────────
  for (const record of propertyRecords) {
    await db.propertyAssignment.createMany({
      data: [
        { userId: opsUser.id, propertyId: record.id },
        { userId: cleanerUser.id, propertyId: record.id },
      ],
    });
  }

  // ── notifications ───────────────────────────────────────────────────────
  console.log("Seeding notifications…");
  const errorChannel = await db.channelProperty.findFirst({
    where: { status: "ERROR" },
    include: { property: true, channel: true },
  });

  await db.notification.createMany({
    data: [
      {
        userId: superAdmin.id,
        type: "OTA_SYNC_FAILED",
        title: "Agoda sync failed",
        body: errorChannel
          ? `${errorChannel.property.name} — authentication failed. Reconnect the listing to resume syncing.`
          : "A channel connection needs attention.",
        severity: "CRITICAL",
        link: "/admin/channels",
      },
      {
        userId: superAdmin.id,
        type: "EXPENSE_PENDING",
        title: "Expenses awaiting payment",
        body: "Several recurring expenses for this month are still marked pending.",
        severity: "WARNING",
        link: "/admin/finance/expenses?status=PENDING",
      },
      {
        userId: superAdmin.id,
        type: "PRICING_RECOMMENDATION",
        title: "Weekend demand is running high",
        body: "Occupancy for the coming weekend is above 85%. Consider a rate increase.",
        severity: "INFO",
        link: "/admin/pricing",
      },
    ],
  });

  // ── audit log ───────────────────────────────────────────────────────────
  await db.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        userName: superAdmin.name,
        action: "PRICE_CHANGED",
        entityType: "Property",
        entityId: propertyRecords[0].id,
        summary: `${propertyRecords[0].seed.name} · base price ₹2,499 → ₹${propertyRecords[0].seed.basePrice.toLocaleString("en-IN")}`,
        createdAt: addDays(today, -3),
      },
      {
        userId: financeUser.id,
        userName: financeUser.name,
        action: "EXPENSE_CREATED",
        entityType: "Transaction",
        summary: "Recorded monthly rent for all active properties",
        createdAt: addDays(today, -2),
      },
      {
        userId: opsUser.id,
        userName: opsUser.name,
        action: "MAINTENANCE_CREATED",
        entityType: "MaintenanceTask",
        summary: "Logged geyser issue after checkout inspection",
        createdAt: addDays(today, -1),
      },
    ],
  });

  // ── promotions ──────────────────────────────────────────────────────────
  await db.promotion.create({
    data: {
      code: "DIRECT10",
      description: "10% off when you book direct with Lime Kraft",
      discountType: "PERCENT",
      discountValue: D(10),
      startDate: addMonths(today, -1),
      endDate: addMonths(today, 6),
    },
  });

  const counts = {
    properties: await db.property.count(),
    reservations: await db.reservation.count(),
    guests: await db.guest.count(),
    transactions: await db.transaction.count(),
    reviews: await db.review.count(),
  };
  console.log("Seed complete:", counts);
}

let refCounter = 0;
function reservation_ref() {
  refCounter++;
  return `${Date.now().toString(36)}${refCounter}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
