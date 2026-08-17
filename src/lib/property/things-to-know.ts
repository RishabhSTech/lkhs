import type { ThingToKnowGroup } from "@prisma/client";

/**
 * "Things to know" — the three-column block at the foot of an Airbnb listing:
 * House rules, Safety & property, Cancellation policy.
 *
 * Each property stores a list of selected items. `code` points at the
 * catalogue below (which supplies the icon and the default wording); `label`
 * is the resolved text, so an admin can adjust the phrasing — or add a
 * one-off item with code `CUSTOM` — without needing a code change.
 */

export type ThingToKnowDefinition = {
  code: string;
  group: ThingToKnowGroup;
  label: string;
  icon: string;
  /** Contains a placeholder the property fills in (times, guest counts). */
  templated?: boolean;
};

export const THING_TO_KNOW_GROUP_LABELS: Record<ThingToKnowGroup, string> = {
  HOUSE_RULES: "House rules",
  SAFETY_PROPERTY: "Safety & property",
  CANCELLATION: "Cancellation policy",
};

export const THING_TO_KNOW_GROUP_ORDER: ThingToKnowGroup[] = [
  "HOUSE_RULES",
  "SAFETY_PROPERTY",
  "CANCELLATION",
];

export const THINGS_TO_KNOW: ThingToKnowDefinition[] = [
  // ── House rules ─────────────────────────────────────────────────────────
  { code: "CHECK_IN_AFTER", group: "HOUSE_RULES", label: "Check-in after {checkInFrom}", icon: "LogIn", templated: true },
  { code: "CHECK_IN_WINDOW", group: "HOUSE_RULES", label: "Check-in between {checkInFrom} and {checkInTo}", icon: "Clock", templated: true },
  { code: "CHECKOUT_BEFORE", group: "HOUSE_RULES", label: "Checkout before {checkOutBy}", icon: "LogOut", templated: true },
  { code: "MAX_GUESTS", group: "HOUSE_RULES", label: "{maxGuests} guests maximum", icon: "Users", templated: true },
  { code: "SELF_CHECK_IN", group: "HOUSE_RULES", label: "Self check-in with keypad", icon: "KeyRound" },
  { code: "ID_REQUIRED", group: "HOUSE_RULES", label: "Government ID required at check-in", icon: "IdCard" },
  { code: "NO_PETS", group: "HOUSE_RULES", label: "No pets", icon: "PawPrint" },
  { code: "PETS_ALLOWED", group: "HOUSE_RULES", label: "Pets allowed", icon: "PawPrint" },
  { code: "NO_PARTIES", group: "HOUSE_RULES", label: "No parties or events", icon: "PartyPopper" },
  { code: "NO_SMOKING", group: "HOUSE_RULES", label: "No smoking", icon: "CigaretteOff" },
  { code: "SMOKING_OUTSIDE", group: "HOUSE_RULES", label: "Smoking allowed on the balcony only", icon: "Cigarette" },
  { code: "QUIET_HOURS", group: "HOUSE_RULES", label: "Quiet hours 10:00 pm – 7:00 am", icon: "Moon" },
  { code: "NO_COMMERCIAL_PHOTOGRAPHY", group: "HOUSE_RULES", label: "Commercial photography or filming not allowed", icon: "Camera" },
  { code: "NO_UNREGISTERED_VISITORS", group: "HOUSE_RULES", label: "Visitors must be registered with the host", icon: "UserCheck" },
  { code: "NO_SHOES", group: "HOUSE_RULES", label: "Please leave shoes at the door", icon: "Footprints" },
  { code: "LEAVE_TIDY", group: "HOUSE_RULES", label: "Leave the home tidy — no deep cleaning needed", icon: "Sparkles" },

  // ── Safety & property ───────────────────────────────────────────────────
  { code: "SMOKE_ALARM", group: "SAFETY_PROPERTY", label: "Smoke alarm installed", icon: "AlarmSmoke" },
  { code: "NO_SMOKE_ALARM", group: "SAFETY_PROPERTY", label: "No smoke alarm", icon: "AlarmSmoke" },
  { code: "CO_ALARM", group: "SAFETY_PROPERTY", label: "Carbon monoxide alarm installed", icon: "CircleAlert" },
  { code: "NO_CO_ALARM", group: "SAFETY_PROPERTY", label: "No carbon monoxide alarm", icon: "CircleAlert" },
  { code: "FIRE_EXTINGUISHER", group: "SAFETY_PROPERTY", label: "Fire extinguisher on site", icon: "FireExtinguisher" },
  { code: "FIRST_AID", group: "SAFETY_PROPERTY", label: "First aid kit available", icon: "BriefcaseMedical" },
  { code: "EXTERIOR_CAMERAS", group: "SAFETY_PROPERTY", label: "Exterior security cameras on property", icon: "Cctv" },
  { code: "NO_INTERIOR_CAMERAS", group: "SAFETY_PROPERTY", label: "No cameras or recording devices inside the home", icon: "VideoOff" },
  { code: "POOL_NO_GATE", group: "SAFETY_PROPERTY", label: "Pool or hot tub without a gate or lock", icon: "Waves" },
  { code: "NEARBY_WATER", group: "SAFETY_PROPERTY", label: "Nearby lake, river or other body of water", icon: "Droplets" },
  { code: "HEIGHTS_NO_RAILS", group: "SAFETY_PROPERTY", label: "Heights without rails or protection", icon: "TriangleAlert" },
  { code: "CLIMBING_STRUCTURE", group: "SAFETY_PROPERTY", label: "Climbing or play structure on property", icon: "Blocks" },
  { code: "MUST_CLIMB_STAIRS", group: "SAFETY_PROPERTY", label: "Must climb stairs", icon: "Footprints" },
  { code: "POTENTIAL_NOISE", group: "SAFETY_PROPERTY", label: "Potential for noise", icon: "Volume2" },
  { code: "PET_ON_PROPERTY", group: "SAFETY_PROPERTY", label: "Pet(s) live on the property", icon: "PawPrint" },
  { code: "NO_PARKING", group: "SAFETY_PROPERTY", label: "No parking on property", icon: "CircleParking" },
  { code: "SHARED_SPACES", group: "SAFETY_PROPERTY", label: "Some spaces are shared", icon: "Users" },
  { code: "WEAPONS", group: "SAFETY_PROPERTY", label: "Weapons on property", icon: "TriangleAlert" },
  { code: "POWER_BACKUP", group: "SAFETY_PROPERTY", label: "Full power backup during outages", icon: "BatteryCharging" },
  { code: "GATED_SECURITY", group: "SAFETY_PROPERTY", label: "Gated society with 24×7 security", icon: "ShieldCheck" },

  // ── Cancellation ────────────────────────────────────────────────────────
  { code: "FREE_CANCELLATION_WINDOW", group: "CANCELLATION", label: "Free cancellation up to 48 hours before check-in", icon: "CalendarCheck" },
  { code: "PARTIAL_REFUND", group: "CANCELLATION", label: "Cancel within 48 hours of check-in for a 50% refund of the nightly rate", icon: "Percent" },
  { code: "NO_REFUND_AFTER_CHECKIN", group: "CANCELLATION", label: "No refund once the stay has started", icon: "CalendarX2" },
  { code: "CLEANING_FEE_REFUND", group: "CANCELLATION", label: "The cleaning fee is always refunded if you cancel before check-in", icon: "Sparkles" },
  { code: "DATE_CHANGE", group: "CANCELLATION", label: "One free date change, subject to availability", icon: "CalendarSync" },
  { code: "REVIEW_FULL_POLICY", group: "CANCELLATION", label: "Review the full policy — it applies even if you cancel for illness or travel disruption", icon: "FileText" },
];

export const THING_TO_KNOW_BY_CODE = new Map(
  THINGS_TO_KNOW.map((t) => [t.code, t]),
);

/** Values available to templated labels. */
export type ThingToKnowContext = {
  checkInFrom?: string | null;
  checkInTo?: string | null;
  checkOutBy?: string | null;
  maxGuests?: number | null;
};

export function fillTemplate(label: string, context: ThingToKnowContext) {
  return label.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = context[key as keyof ThingToKnowContext];
    return value == null || value === "" ? match : String(value);
  });
}

export type ResolvedThingToKnow = {
  code: string;
  label: string;
  icon: string;
};

export function resolveThingToKnow(
  row: { code: string; label: string },
  context: ThingToKnowContext = {},
): ResolvedThingToKnow {
  const definition = THING_TO_KNOW_BY_CODE.get(row.code);
  return {
    code: row.code,
    label: fillTemplate(row.label || definition?.label || "", context),
    icon: definition?.icon ?? "Info",
  };
}
