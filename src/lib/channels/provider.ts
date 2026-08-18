import type { ChannelCode } from "@prisma/client";

/**
 * Provider-agnostic surface for pushing availability + rates out to an OTA.
 * Nothing above this layer knows which channel it's talking to.
 */

export type ChannelCalendarNight = {
  date: string; // YYYY-MM-DD
  available: boolean;
  price: number;
};

export type ChannelSyncPayload = {
  externalListingId: string;
  calendar: ChannelCalendarNight[];
};

export type ChannelSyncOutcome =
  | { ok: true; message: string }
  | { ok: false; message: string };

export interface OtaProvider {
  readonly code: ChannelCode;
  push(payload: ChannelSyncPayload): Promise<ChannelSyncOutcome>;
}

/**
 * Airbnb gates their Calendar/Pricing API behind partner approval — the exact
 * request contract (base URL, payload shape, auth scheme) is handed over
 * during onboarding and isn't publicly documented. This adapter is wired for
 * real use — it reads live credentials, signs the request, and surfaces the
 * real HTTP result into ChannelSyncLog — but the endpoint path and payload
 * below are the best-known shape and MUST be checked against Airbnb's actual
 * partner docs once AIRBNB_API_KEY is issued, before this can be trusted.
 */
class AirbnbProvider implements OtaProvider {
  readonly code = "AIRBNB" as const;

  async push(payload: ChannelSyncPayload): Promise<ChannelSyncOutcome> {
    const apiKey = process.env.AIRBNB_API_KEY;
    const baseUrl = process.env.AIRBNB_API_BASE_URL;

    if (!apiKey || !baseUrl) {
      return {
        ok: false,
        message:
          "Airbnb partner API is not configured — set AIRBNB_API_KEY and AIRBNB_API_BASE_URL once partner access is approved.",
      };
    }

    try {
      const res = await fetch(
        `${baseUrl}/listings/${encodeURIComponent(payload.externalListingId)}/calendar`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            days: payload.calendar.map((night) => ({
              date: night.date,
              availability: night.available ? "available" : "unavailable",
              price: night.price,
            })),
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          ok: false,
          message: `Airbnb rejected the sync (HTTP ${res.status}): ${body.slice(0, 300)}`,
        };
      }

      return { ok: true, message: `Pushed ${payload.calendar.length} nights to Airbnb.` };
    } catch (error) {
      return {
        ok: false,
        message: `Airbnb sync request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      };
    }
  }
}

/** Direct bookings never need pushing anywhere — central inventory is the
 * source of truth for the site itself. */
class WebsiteProvider implements OtaProvider {
  readonly code = "WEBSITE" as const;
  async push(): Promise<ChannelSyncOutcome> {
    return { ok: true, message: "Direct listing — nothing to push." };
  }
}

/** No adapter has been built yet for this channel. Honest, not a fake
 * success — matches how the rest of the app treats unconfigured channels. */
class UnimplementedProvider implements OtaProvider {
  constructor(readonly code: ChannelCode) {}
  async push(): Promise<ChannelSyncOutcome> {
    return {
      ok: false,
      message: `No ${this.code} integration has been built yet.`,
    };
  }
}

export function getOtaProvider(code: ChannelCode): OtaProvider {
  switch (code) {
    case "WEBSITE":
      return new WebsiteProvider();
    case "AIRBNB":
      return new AirbnbProvider();
    default:
      return new UnimplementedProvider(code);
  }
}
