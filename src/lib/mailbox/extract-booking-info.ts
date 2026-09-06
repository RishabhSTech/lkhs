import Anthropic from "@anthropic-ai/sdk";
import type { BookingSource } from "@prisma/client";

/**
 * Turns one OTA notification email into structured fields. Uses Haiku with a
 * single forced tool call (same tool-use convention as src/lib/chat/tools.ts,
 * just a one-shot classification rather than a conversation) - this is a
 * background job classifying potentially many emails per poll, so it uses
 * the cheap/fast model, not the guest-facing chatbot's.
 */

export const EXTRACTION_IS_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

export type EmailClassification =
  | "INQUIRY"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "BOOKING_MODIFIED"
  | "OTHER";

export type ExtractedBookingInfo = {
  classification: EmailClassification;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: string | null; // YYYY-MM-DD
  checkOut: string | null; // YYYY-MM-DD
  guestsCount: number | null;
  propertyHint: string | null;
  externalReservationId: string | null;
  amountTotal: number | null;
  currency: string | null;
  messageBody: string;
  confidence: number;
};

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "extract_booking_info",
  description: "Record the structured facts extracted from an OTA notification email.",
  input_schema: {
    type: "object",
    properties: {
      classification: {
        type: "string",
        enum: ["INQUIRY", "BOOKING_CONFIRMED", "BOOKING_CANCELLED", "BOOKING_MODIFIED", "OTHER"],
        description:
          "INQUIRY = a guest question/message with no confirmed stay. BOOKING_CONFIRMED = a new confirmed reservation. BOOKING_CANCELLED = an existing reservation was cancelled. BOOKING_MODIFIED = dates/details of an existing reservation changed. OTHER = anything else (review request, marketing, payout notice, etc).",
      },
      guestName: { type: ["string", "null"] },
      guestEmail: { type: ["string", "null"] },
      guestPhone: { type: ["string", "null"] },
      checkIn: { type: ["string", "null"], description: "YYYY-MM-DD, or null if not a booking / not stated." },
      checkOut: { type: ["string", "null"], description: "YYYY-MM-DD, or null if not a booking / not stated." },
      guestsCount: { type: ["number", "null"] },
      propertyHint: {
        type: ["string", "null"],
        description: "Any listing/property/room name mentioned, verbatim, to help match it to our internal property list.",
      },
      externalReservationId: {
        type: ["string", "null"],
        description: "The OTA's confirmation/reservation number, if the email states one.",
      },
      amountTotal: { type: ["number", "null"], description: "Total stay amount if stated, as a plain number." },
      currency: { type: ["string", "null"], description: "ISO currency code if stated, e.g. INR, USD." },
      messageBody: {
        type: "string",
        description: "The guest-relevant message text (the actual question/comment), cleaned of email boilerplate/footers. If this is a booking notification with no guest message, summarize the booking in one sentence instead.",
      },
      confidence: {
        type: "number",
        description: "0 to 1 - how confident you are in this extraction, especially the dates and classification.",
      },
    },
    required: ["classification", "messageBody", "confidence"],
    additionalProperties: false,
  },
};

export async function extractBookingInfo(args: {
  source: BookingSource;
  subject: string;
  body: string;
}): Promise<ExtractedBookingInfo> {
  if (!EXTRACTION_IS_CONFIGURED) {
    throw new Error("ANTHROPIC_API_KEY is not set - cannot extract booking info from email.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 700,
    system:
      "You extract structured facts from Airbnb/Booking.com/Agoda host-notification emails for a property management system. Be conservative: if a field isn't clearly stated, use null rather than guessing. Never invent dates, names, or amounts.",
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "extract_booking_info" },
    messages: [
      {
        role: "user",
        content: `Source: ${args.source}\nSubject: ${args.subject}\n\nEmail body:\n${args.body.slice(0, 8000)}`,
      },
    ],
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a structured extraction.");
  }

  const input = toolUse.input as Record<string, unknown>;
  return {
    classification: (input.classification as EmailClassification) ?? "OTHER",
    guestName: (input.guestName as string | null) ?? null,
    guestEmail: (input.guestEmail as string | null) ?? null,
    guestPhone: (input.guestPhone as string | null) ?? null,
    checkIn: (input.checkIn as string | null) ?? null,
    checkOut: (input.checkOut as string | null) ?? null,
    guestsCount: (input.guestsCount as number | null) ?? null,
    propertyHint: (input.propertyHint as string | null) ?? null,
    externalReservationId: (input.externalReservationId as string | null) ?? null,
    amountTotal: (input.amountTotal as number | null) ?? null,
    currency: (input.currency as string | null) ?? null,
    messageBody: (input.messageBody as string) ?? "",
    confidence: typeof input.confidence === "number" ? input.confidence : 0,
  };
}
