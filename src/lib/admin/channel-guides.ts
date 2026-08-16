import type { ChannelCode } from "@prisma/client";

/**
 * Setup instructions per channel. These describe the real integration path —
 * none of them are wired up here, and the UI says so rather than implying a
 * connection exists.
 */

export type ChannelGuide = {
  code: ChannelCode;
  name: string;
  blurb: string;
  commission: string;
  /** What the admin needs to paste in to connect a listing. */
  fields: { key: string; label: string; placeholder: string; help?: string }[];
  steps: { title: string; detail: string }[];
  docsUrl: string;
  requiresApproval: boolean;
};

export const CHANNEL_GUIDES: Record<ChannelCode, ChannelGuide> = {
  WEBSITE: {
    code: "WEBSITE",
    name: "Lime Kraft Direct",
    blurb:
      "Your own booking site. Always connected, no commission, and the source of truth for every other channel.",
    commission: "0% — you keep the full rate less payment processing",
    fields: [],
    steps: [
      {
        title: "Nothing to connect",
        detail:
          "Direct bookings write straight into central inventory. Every other channel receives availability from here.",
      },
    ],
    docsUrl: "/admin/settings",
    requiresApproval: false,
  },

  AIRBNB: {
    code: "AIRBNB",
    name: "Airbnb",
    blurb:
      "Airbnb does not offer a public self-serve API. Connection goes through their partner programme or a certified channel manager.",
    commission: "~14–15% host-only fee (varies by plan and region)",
    fields: [
      {
        key: "listingId",
        label: "Airbnb listing ID",
        placeholder: "12345678",
        help: "The number in your listing URL: airbnb.com/rooms/12345678",
      },
      {
        key: "apiKey",
        label: "Partner API key",
        placeholder: "Provided by Airbnb or your channel manager",
        help: "Issued after partner approval — not available from your host account.",
      },
    ],
    steps: [
      {
        title: "Apply for API access",
        detail:
          "Airbnb's API is gated. Either apply to their Software Partner programme directly, or connect through a certified channel manager such as Hostaway, Guesty, Beds24 or Rentals United.",
      },
      {
        title: "Match the listing to this property",
        detail:
          "Copy the listing ID from your Airbnb URL and paste it below so incoming reservations map to the right Lime Kraft property.",
      },
      {
        title: "Set the sync direction",
        detail:
          "Lime Kraft pushes availability and rates out to Airbnb; Airbnb pushes reservations back in. Central inventory always wins on conflict.",
      },
      {
        title: "Note the guest data limits",
        detail:
          "Airbnb only releases the guest's full contact details after a booking is confirmed, and sometimes not at all. Guest profiles will be partial until then — that's expected, not a sync failure.",
      },
    ],
    docsUrl: "https://www.airbnb.com/partner",
    requiresApproval: true,
  },

  BOOKING_COM: {
    code: "BOOKING_COM",
    name: "Booking.com",
    blurb:
      "Booking.com offers a Connectivity API to approved partners. Most small operators connect through a channel manager instead.",
    commission: "~15% commission, deducted per reservation",
    fields: [
      {
        key: "hotelId",
        label: "Property ID",
        placeholder: "1234567",
        help: "Found in the Extranet under Account → Property details.",
      },
      {
        key: "username",
        label: "Machine account username",
        placeholder: "limekraft_xml",
        help: "Created in the Extranet, separate from your login.",
      },
      {
        key: "password",
        label: "Machine account password",
        placeholder: "••••••••",
      },
    ],
    steps: [
      {
        title: "Request connectivity access",
        detail:
          "In the Booking.com Extranet, go to Account → Connectivity provider and request an XML connection, or nominate your channel manager as the provider.",
      },
      {
        title: "Create a machine account",
        detail:
          "Booking.com issues a separate machine account for API traffic. Never use your personal Extranet login for syncing.",
      },
      {
        title: "Map rooms to units",
        detail:
          "Each Booking.com room type must map to exactly one Lime Kraft unit, or availability will drift between the two systems.",
      },
      {
        title: "Enable reservation delivery",
        detail:
          "Turn on push notifications so new reservations arrive immediately rather than waiting for a polling cycle.",
      },
    ],
    docsUrl: "https://connect.booking.com/",
    requiresApproval: true,
  },

  AGODA: {
    code: "AGODA",
    name: "Agoda",
    blurb:
      "Agoda connects through YCS (Yield Control System) or a channel manager. Strongest in Asia-Pacific demand.",
    commission: "~15–18% commission depending on programme",
    fields: [
      {
        key: "propertyId",
        label: "Agoda property ID",
        placeholder: "987654",
        help: "Shown in YCS under Property Settings.",
      },
      {
        key: "apiKey",
        label: "YCS API key",
        placeholder: "Issued by Agoda partner support",
      },
    ],
    steps: [
      {
        title: "Ask partner support for API credentials",
        detail:
          "Agoda issues YCS API access on request through your account manager or partner support.",
      },
      {
        title: "Link the property",
        detail:
          "Paste the Agoda property ID below so reservations map to the right Lime Kraft home.",
      },
      {
        title: "Confirm the rate plan mapping",
        detail:
          "Agoda rate plans must line up with your Lime Kraft base rate, or the pricing rules will produce inconsistent nightly rates across channels.",
      },
    ],
    docsUrl: "https://ycs.agoda.com/",
    requiresApproval: true,
  },
};

export const CHANNEL_ORDER: ChannelCode[] = [
  "WEBSITE",
  "AIRBNB",
  "BOOKING_COM",
  "AGODA",
];
