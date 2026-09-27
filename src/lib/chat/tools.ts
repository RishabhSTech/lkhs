import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { parseISODate, toISODate } from "@/lib/dates";
import { isPropertyAvailable } from "@/lib/booking/availability";
import { buildQuote } from "@/lib/pricing/engine";
import { alertTeam } from "@/lib/notifications/alert";

/**
 * The two things that make this "connected to our backend" rather than a
 * canned FAQ bot: it reads real property/pricing/availability data, and it
 * can actually create an inquiry that alerts the team - the same instant
 * push+email pipeline as the contact form and a logged OTA message.
 */

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "search_properties",
    description:
      "Search Lime Kraft Home Stays properties by city and/or minimum guest capacity. Returns name, slug, city, area, bedrooms, and nightly base price for each match. Use this before quoting a price or checking availability so you have the right property slug.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name, e.g. Indore. Omit to search all cities." },
        minGuests: { type: "number", description: "Minimum guests the property must sleep." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "check_availability_and_price",
    description:
      "Check whether a specific property is free for a date range and, if so, what it would cost. Dates are inclusive check-in, exclusive check-out, format YYYY-MM-DD.",
    input_schema: {
      type: "object",
      properties: {
        propertySlug: { type: "string" },
        checkIn: { type: "string", description: "YYYY-MM-DD" },
        checkOut: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["propertySlug", "checkIn", "checkOut"],
      additionalProperties: false,
    },
  },
  {
    name: "get_property_details",
    description:
      "Get a specific property's real house rules, check-in/check-out times, amenities, pet policy, and cancellation policy. Call this whenever a guest asks about policies, rules, or amenities for a property you've already found via search_properties - never guess these, they vary per property.",
    input_schema: {
      type: "object",
      properties: {
        propertySlug: { type: "string" },
      },
      required: ["propertySlug"],
      additionalProperties: false,
    },
  },
  {
    name: "request_contact_form",
    description:
      "Call this when you need the guest's name and a contact method (email or phone) - to hold a booking, log an inquiry, or have the team follow up. Don't ask for these fields in your text reply; call this tool instead and keep your reply to one short sentence like 'Sure, just share your details below.' - the UI shows an actual form. After the guest submits it, their info arrives as a normal message, so call create_inquiry next.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "One short phrase for why you need it, e.g. 'hold the Gather Villa for Oct 3'." },
      },
      required: ["reason"],
      additionalProperties: false,
    },
  },
  {
    name: "create_inquiry",
    description:
      "Log this conversation as an inquiry for the Lime Kraft team and alert them immediately (push notification + email), so a human follows up. Call this once you have the guest's name and at least one contact method (email or phone), and either they've asked to be contacted, you can't fully resolve their question, or they want to book. Only call this once per conversation.",
    input_schema: {
      type: "object",
      properties: {
        guestName: { type: "string" },
        guestEmail: { type: "string" },
        guestPhone: { type: "string" },
        summary: {
          type: "string",
          description: "A short summary of what the guest wants, written for a staff member who hasn't seen the conversation.",
        },
      },
      required: ["guestName", "summary"],
      additionalProperties: false,
    },
  },
];

export type PropertyCard = {
  slug: string;
  name: string;
  city: string | null;
  area: string | null;
  bedrooms: number;
  maxGuests: number;
  basePrice: number;
  heroImageUrl: string | null;
  availability?: { checkIn: string; checkOut: string; nights: number; total: number; currency: string };
};

async function searchProperties(input: { city?: string; minGuests?: number }) {
  const properties = await db.property.findMany({
    where: {
      status: "ACTIVE",
      ...(input.city ? { city: { equals: input.city, mode: "insensitive" } } : {}),
      ...(input.minGuests ? { maxGuests: { gte: input.minGuests } } : {}),
    },
    select: {
      slug: true, name: true, city: true, locationArea: true,
      bedrooms: true, maxGuests: true, basePrice: true, propertyType: true,
      images: { where: { isHero: true }, take: 1, select: { url: true } },
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  const cards: PropertyCard[] = properties.map((p) => ({
    slug: p.slug,
    name: p.name,
    city: p.city,
    area: p.locationArea,
    bedrooms: p.bedrooms,
    maxGuests: p.maxGuests,
    basePrice: Number(p.basePrice),
    heroImageUrl: p.images[0]?.url ?? null,
  }));

  // The model never needs the image URL - keep its context lean and let the
  // route's side-channel (`cards`) carry that to the frontend instead.
  return {
    forModel: {
      count: properties.length,
      properties: properties.map((p) => ({
        slug: p.slug,
        name: p.name,
        city: p.city,
        locationArea: p.locationArea,
        bedrooms: p.bedrooms,
        maxGuests: p.maxGuests,
        basePrice: Number(p.basePrice),
        propertyType: p.propertyType,
      })),
    },
    cards,
  };
}

async function checkAvailabilityAndPrice(input: {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
}) {
  const property = await db.property.findUnique({
    where: { slug: input.propertySlug },
    include: {
      pricingRules: { where: { isActive: true } },
      images: { where: { isHero: true }, take: 1, select: { url: true } },
    },
  });
  if (!property) return { forModel: { error: "No property with that slug exists." }, cards: [] };

  const card = (extra?: PropertyCard["availability"]): PropertyCard => ({
    slug: property.slug,
    name: property.name,
    city: property.city,
    area: property.locationArea,
    bedrooms: property.bedrooms,
    maxGuests: property.maxGuests,
    basePrice: Number(property.basePrice),
    heroImageUrl: property.images[0]?.url ?? null,
    availability: extra,
  });

  let checkIn: Date, checkOut: Date;
  try {
    checkIn = parseISODate(input.checkIn);
    checkOut = parseISODate(input.checkOut);
  } catch {
    return { forModel: { error: "Dates must be in YYYY-MM-DD format." }, cards: [] };
  }
  if (checkOut <= checkIn) return { forModel: { error: "Check-out must be after check-in." }, cards: [] };

  const [available, overrides] = await Promise.all([
    isPropertyAvailable(property.id, checkIn, checkOut),
    db.dailyRate.findMany({ where: { propertyId: property.id, date: { gte: checkIn, lt: checkOut } } }),
  ]);

  if (!available) {
    return { forModel: { available: false, propertyName: property.name }, cards: [card()] };
  }

  const quote = buildQuote({
    basePrice: Number(property.basePrice),
    cleaningFee: Number(property.cleaningFee),
    checkIn,
    checkOut,
    rules: property.pricingRules,
    dailyRateOverrides: Object.fromEntries(
      overrides.map((o) => [toISODate(o.date), Number(o.price)]),
    ),
  });

  return {
    forModel: {
      available: true,
      propertyName: property.name,
      nights: quote.nightCount,
      total: quote.total,
      currency: "INR",
    },
    cards: [
      card({
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        nights: quote.nightCount,
        total: quote.total,
        currency: "INR",
      }),
    ],
  };
}

async function getPropertyDetails(input: { propertySlug: string }) {
  const property = await db.property.findUnique({
    where: { slug: input.propertySlug },
    include: {
      amenities: { where: { isUnavailable: false }, include: { amenity: true } },
    },
  });
  if (!property) return { error: "No property with that slug exists." };

  return {
    name: property.name,
    checkInFrom: property.checkInFrom,
    checkInTo: property.checkInTo,
    checkOutBy: property.checkOutBy,
    houseRules: property.houseRules,
    cancellationPolicy:
      property.cancellationPolicy ??
      "Not explicitly stated for direct bookings - tell the guest the team will confirm this when they book. If they booked via Airbnb/Booking.com/Agoda, that platform's own cancellation policy applies instead.",
    amenities: property.amenities.map((a) => a.amenity.name),
  };
}

async function createInquiry(input: {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  summary: string;
}) {
  const guest = input.guestEmail
    ? await db.guest.findFirst({ where: { email: input.guestEmail } })
    : input.guestPhone
      ? await db.guest.findFirst({ where: { phone: input.guestPhone } })
      : null;

  await db.message.create({
    data: {
      guestId: guest?.id ?? null,
      channel: "CHAT",
      direction: "INBOUND",
      subject: `Chatbot inquiry: ${input.guestName}`,
      body: [
        input.summary,
        [input.guestEmail, input.guestPhone].filter(Boolean).length
          ? `Reply to: ${[input.guestEmail, input.guestPhone].filter(Boolean).join(" · ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: "DELIVERED",
    },
  });

  await alertTeam({
    type: "CHAT_INQUIRY",
    title: "New chatbot inquiry",
    body: `${input.guestName} - ${input.summary.slice(0, 120)}${input.summary.length > 120 ? "…" : ""}`,
    severity: "WARNING",
    link: "/admin/messages",
  });

  return { ok: true, message: "Logged - the team will reach out shortly." };
}

export type ChatToolResult = { forModel: unknown; cards: PropertyCard[]; contactFormReason?: string };

export async function runChatTool(name: string, input: unknown): Promise<ChatToolResult> {
  switch (name) {
    case "search_properties":
      return searchProperties(input as Parameters<typeof searchProperties>[0]);
    case "check_availability_and_price":
      return checkAvailabilityAndPrice(input as Parameters<typeof checkAvailabilityAndPrice>[0]);
    case "request_contact_form":
      return {
        forModel: { ok: true },
        cards: [],
        contactFormReason: (input as { reason: string }).reason,
      };
    case "get_property_details":
      return { forModel: await getPropertyDetails(input as Parameters<typeof getPropertyDetails>[0]), cards: [] };
    case "create_inquiry":
      return { forModel: await createInquiry(input as Parameters<typeof createInquiry>[0]), cards: [] };
    default:
      return { forModel: { error: `Unknown tool: ${name}` }, cards: [] };
  }
}
