import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { parseISODate, toISODate } from "@/lib/dates";
import { isPropertyAvailable } from "@/lib/booking/availability";
import { buildQuote } from "@/lib/pricing/engine";
import { alertTeam } from "@/lib/notifications/alert";

/**
 * The two things that make this "connected to our backend" rather than a
 * canned FAQ bot: it reads real property/pricing/availability data, and it
 * can actually create an inquiry that alerts the team — the same instant
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
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return {
    count: properties.length,
    properties: properties.map((p) => ({
      ...p,
      basePrice: Number(p.basePrice),
    })),
  };
}

async function checkAvailabilityAndPrice(input: {
  propertySlug: string;
  checkIn: string;
  checkOut: string;
}) {
  const property = await db.property.findUnique({
    where: { slug: input.propertySlug },
    include: { pricingRules: { where: { isActive: true } } },
  });
  if (!property) return { error: "No property with that slug exists." };

  let checkIn: Date, checkOut: Date;
  try {
    checkIn = parseISODate(input.checkIn);
    checkOut = parseISODate(input.checkOut);
  } catch {
    return { error: "Dates must be in YYYY-MM-DD format." };
  }
  if (checkOut <= checkIn) return { error: "Check-out must be after check-in." };

  const [available, overrides] = await Promise.all([
    isPropertyAvailable(property.id, checkIn, checkOut),
    db.dailyRate.findMany({ where: { propertyId: property.id, date: { gte: checkIn, lt: checkOut } } }),
  ]);

  if (!available) {
    return { available: false, propertyName: property.name };
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
    available: true,
    propertyName: property.name,
    nights: quote.nightCount,
    total: quote.total,
    currency: "INR",
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
    body: `${input.guestName} — ${input.summary.slice(0, 120)}${input.summary.length > 120 ? "…" : ""}`,
    severity: "WARNING",
    link: "/admin/messages",
  });

  return { ok: true, message: "Logged — the team will reach out shortly." };
}

export async function runChatTool(name: string, input: unknown): Promise<unknown> {
  switch (name) {
    case "search_properties":
      return searchProperties(input as Parameters<typeof searchProperties>[0]);
    case "check_availability_and_price":
      return checkAvailabilityAndPrice(input as Parameters<typeof checkAvailabilityAndPrice>[0]);
    case "create_inquiry":
      return createInquiry(input as Parameters<typeof createInquiry>[0]);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
