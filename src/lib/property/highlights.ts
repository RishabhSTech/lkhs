/**
 * Listing highlights - the icon + headline + one-liner block Airbnb renders
 * directly under the host row ("Self check-in", "Unbeatable location",
 * "Park for free", …).
 *
 * Airbnb derives most of these from its own review telemetry. We can't, so the
 * catalogue below is admin-selectable per property: pick a highlight, and
 * optionally override the default one-liner. Anything with `dynamic: true` has
 * its one-liner filled in from live data (review scores, cancellation policy)
 * when the admin hasn't written their own - see `resolveHighlight`.
 */

export type HighlightCode =
  | "SELF_CHECK_IN"
  | "KEYPAD_CHECK_IN"
  | "LOCKBOX_CHECK_IN"
  | "SMART_LOCK_CHECK_IN"
  | "GREAT_CHECK_IN"
  | "UNBEATABLE_LOCATION"
  | "GREAT_LOCATION"
  | "WALKABLE_AREA"
  | "PEACE_AND_QUIET"
  | "PARK_FOR_FREE"
  | "DIVE_RIGHT_IN"
  | "DESIGNED_FOR_WORK"
  | "DEDICATED_WORKSPACE"
  | "FAST_WIFI"
  | "ENTIRE_HOME"
  | "SPARKLING_CLEAN"
  | "HOME_AWAY_FROM_HOME"
  | "GREAT_COMMUNICATION"
  | "EXPERIENCED_HOST"
  | "TOP_RATED_HOME"
  | "GUEST_FAVOURITE"
  | "FREE_CANCELLATION"
  | "FAMILY_FRIENDLY"
  | "BRING_YOUR_PETS"
  | "POWER_BACKUP"
  | "LONG_STAY_FRIENDLY"
  | "SCENIC_SETTING";

export type HighlightDefinition = {
  code: HighlightCode;
  /** Bold headline. */
  title: string;
  /** Default supporting line; admin may override per property. */
  subtitle: string;
  /** lucide-react export name. */
  icon: string;
  /** Subtitle is computed from live data when no override is set. */
  dynamic?: boolean;
  /** Grouping in the admin picker. */
  group: "Check-in" | "Location" | "Amenities" | "Hosting" | "Booking";
};

export const HIGHLIGHTS: HighlightDefinition[] = [
  // ── Check-in ────────────────────────────────────────────────────────────
  {
    code: "SELF_CHECK_IN",
    title: "Self check-in",
    subtitle: "Check yourself in - no waiting around for anyone.",
    icon: "KeyRound",
    group: "Check-in",
  },
  {
    code: "KEYPAD_CHECK_IN",
    title: "Self check-in",
    subtitle: "Check yourself in with the keypad.",
    icon: "KeySquare",
    group: "Check-in",
  },
  {
    code: "LOCKBOX_CHECK_IN",
    title: "Self check-in",
    subtitle: "Check yourself in with the lockbox.",
    icon: "Lock",
    group: "Check-in",
  },
  {
    code: "SMART_LOCK_CHECK_IN",
    title: "Self check-in",
    subtitle: "Check yourself in with the smart lock.",
    icon: "ScanFace",
    group: "Check-in",
  },
  {
    code: "GREAT_CHECK_IN",
    title: "Exceptional check-in experience",
    subtitle: "Recent guests gave the check-in process a 5-star rating.",
    icon: "DoorOpen",
    dynamic: true,
    group: "Check-in",
  },

  // ── Location ────────────────────────────────────────────────────────────
  {
    code: "UNBEATABLE_LOCATION",
    title: "Unbeatable location",
    subtitle: "100% of recent guests gave the location a 5-star rating.",
    icon: "MapPin",
    dynamic: true,
    group: "Location",
  },
  {
    code: "GREAT_LOCATION",
    title: "Great location",
    subtitle: "Recent guests loved how close everything is.",
    icon: "Map",
    dynamic: true,
    group: "Location",
  },
  {
    code: "WALKABLE_AREA",
    title: "Walk everywhere",
    subtitle: "Restaurants, cafés and shops are all within a short walk.",
    icon: "Footprints",
    group: "Location",
  },
  {
    code: "PEACE_AND_QUIET",
    title: "Peace and quiet",
    subtitle: "Guests say this home is in an unusually quiet spot.",
    icon: "Moon",
    group: "Location",
  },
  {
    code: "SCENIC_SETTING",
    title: "Beautiful setting",
    subtitle: "Guests love the views from this home.",
    icon: "Mountain",
    group: "Location",
  },

  // ── Amenities ───────────────────────────────────────────────────────────
  {
    code: "PARK_FOR_FREE",
    title: "Park for free",
    subtitle: "This is one of the few places in the area with free parking.",
    icon: "CircleParking",
    group: "Amenities",
  },
  {
    code: "DIVE_RIGHT_IN",
    title: "Dive right in",
    subtitle: "This is one of the few places in the area with a pool.",
    icon: "Waves",
    group: "Amenities",
  },
  {
    code: "DESIGNED_FOR_WORK",
    title: "Designed for staying connected",
    subtitle: "A dedicated workspace in a room with fast, reliable Wi-Fi.",
    icon: "Laptop",
    group: "Amenities",
  },
  {
    code: "DEDICATED_WORKSPACE",
    title: "Dedicated workspace",
    subtitle: "A desk and chair you can genuinely work at all day.",
    icon: "Armchair",
    group: "Amenities",
  },
  {
    code: "FAST_WIFI",
    title: "Fast Wi-Fi",
    subtitle: "Tested at over 100 Mbps - good for calls and streaming.",
    icon: "Gauge",
    group: "Amenities",
  },
  {
    code: "POWER_BACKUP",
    title: "Never lose power",
    subtitle: "Full-home backup keeps the lights, fans and Wi-Fi running.",
    icon: "BatteryCharging",
    group: "Amenities",
  },
  {
    code: "FAMILY_FRIENDLY",
    title: "Great for families",
    subtitle: "Cot, high chair and childproofing available on request.",
    icon: "Baby",
    group: "Amenities",
  },
  {
    code: "BRING_YOUR_PETS",
    title: "Bring your pets",
    subtitle: "Well-behaved pets are welcome here.",
    icon: "PawPrint",
    group: "Amenities",
  },

  // ── Hosting ─────────────────────────────────────────────────────────────
  {
    code: "ENTIRE_HOME",
    title: "Entire home",
    subtitle: "You'll have the whole place to yourself.",
    icon: "House",
    group: "Hosting",
  },
  {
    code: "SPARKLING_CLEAN",
    title: "Sparkling clean",
    subtitle: "Recent guests said this place was sparkling clean.",
    icon: "Sparkles",
    dynamic: true,
    group: "Hosting",
  },
  {
    code: "HOME_AWAY_FROM_HOME",
    title: "Home away from home",
    subtitle: "Guests say this place is well-equipped and comfortable.",
    icon: "HeartHandshake",
    group: "Hosting",
  },
  {
    code: "GREAT_COMMUNICATION",
    title: "Great communication",
    subtitle: "Recent guests rated the team 5 stars for communication.",
    icon: "MessageSquareHeart",
    dynamic: true,
    group: "Hosting",
  },
  {
    code: "EXPERIENCED_HOST",
    title: "Experienced hosts",
    subtitle: "Lime Kraft has hosted hundreds of stays across its homes.",
    icon: "BadgeCheck",
    group: "Hosting",
  },
  {
    code: "TOP_RATED_HOME",
    title: "Top 10% of homes",
    subtitle:
      "This home is highly ranked based on ratings, reviews and reliability.",
    icon: "Trophy",
    group: "Hosting",
  },
  {
    code: "GUEST_FAVOURITE",
    title: "Guest favourite",
    subtitle:
      "One of the most loved homes on Lime Kraft, based on ratings, reviews and reliability.",
    icon: "Award",
    group: "Hosting",
  },

  // ── Booking ─────────────────────────────────────────────────────────────
  {
    code: "FREE_CANCELLATION",
    title: "Free cancellation",
    subtitle: "Cancel free of charge - see the policy for the exact window.",
    icon: "CalendarCheck",
    dynamic: true,
    group: "Booking",
  },
  {
    code: "LONG_STAY_FRIENDLY",
    title: "Better for longer stays",
    subtitle: "The nightly rate drops the longer you stay.",
    icon: "CalendarRange",
    group: "Booking",
  },
];

export const HIGHLIGHT_BY_CODE = new Map(HIGHLIGHTS.map((h) => [h.code, h]));

export const HIGHLIGHT_GROUPS = [
  "Check-in",
  "Location",
  "Amenities",
  "Hosting",
  "Booking",
] as const;

export type ResolvedHighlight = {
  code: string;
  title: string;
  subtitle: string;
  icon: string;
};

/**
 * Live figures a dynamic highlight can quote. Anything missing simply falls
 * back to the catalogue copy rather than printing a hole.
 */
export type HighlightContext = {
  locationFiveStarPercent?: number | null;
  checkInFiveStarPercent?: number | null;
  communicationFiveStarPercent?: number | null;
  cleanlinessAverage?: number | null;
  cancellationPolicy?: string | null;
};

function dynamicSubtitle(
  code: string,
  context: HighlightContext,
): string | null {
  switch (code) {
    case "UNBEATABLE_LOCATION":
    case "GREAT_LOCATION":
      return context.locationFiveStarPercent != null
        ? `${Math.round(context.locationFiveStarPercent)}% of recent guests gave the location a 5-star rating.`
        : null;
    case "GREAT_CHECK_IN":
      return context.checkInFiveStarPercent != null
        ? `${Math.round(context.checkInFiveStarPercent)}% of recent guests gave the check-in process a 5-star rating.`
        : null;
    case "GREAT_COMMUNICATION":
      return context.communicationFiveStarPercent != null
        ? `${Math.round(context.communicationFiveStarPercent)}% of recent guests rated communication 5 stars.`
        : null;
    case "SPARKLING_CLEAN":
      return context.cleanlinessAverage != null
        ? `Recent guests rated cleanliness ${context.cleanlinessAverage.toFixed(1)} out of 5.`
        : null;
    case "FREE_CANCELLATION":
      return context.cancellationPolicy ?? null;
    default:
      return null;
  }
}

/**
 * Turns a stored highlight row into something renderable. Precedence is:
 * admin's own copy → live figure → catalogue default.
 */
export function resolveHighlight(
  row: { code: string; subtitle: string | null },
  context: HighlightContext = {},
): ResolvedHighlight | null {
  const definition = HIGHLIGHT_BY_CODE.get(row.code as HighlightCode);
  if (!definition) return null;

  return {
    code: definition.code,
    title: definition.title,
    icon: definition.icon,
    subtitle:
      row.subtitle?.trim() ||
      (definition.dynamic ? dynamicSubtitle(row.code, context) : null) ||
      definition.subtitle,
  };
}
