/**
 * Review topics — the emoji chips Airbnb shows between the rating breakdown
 * and the reviews themselves ("🧸 Family 3", "🛋️ Comfort 2"), each counting how
 * many reviews talk about that thing and filtering the list when tapped.
 *
 * Airbnb derives these from the review text with a model. We do it two ways,
 * in this order of precedence:
 *
 *  1. Whatever the reviewer or an admin ticked explicitly (`Review.topics`).
 *  2. Failing that, the keywords below, matched against the review body.
 *
 * The fallback means the chips work on reviews that predate the feature and on
 * anything imported from a channel, with no back-filling. A review that has
 * been tagged is never also keyword-matched, so nothing is counted twice.
 */

export type ReviewTopic = {
  code: string;
  label: string;
  emoji: string;
  /** Matched as whole words, case-insensitively, against the review body. */
  keywords: string[];
};

export const REVIEW_TOPICS: ReviewTopic[] = [
  {
    code: "CLEANLINESS",
    label: "Cleanliness",
    emoji: "🧴",
    keywords: ["clean", "cleaned", "spotless", "immaculate", "tidy", "hygiene", "housekeeping", "fresh linen"],
  },
  {
    code: "COMFORT",
    label: "Comfort",
    emoji: "🛋️",
    keywords: ["comfortable", "comfy", "cosy", "cozy", "sofa", "relaxing", "spacious", "roomy"],
  },
  {
    code: "HOSPITALITY",
    label: "Hospitality",
    emoji: "🎁",
    keywords: ["host", "hosts", "team", "welcoming", "friendly", "polite", "helpful", "looked after", "hospitality", "courteous"],
  },
  {
    code: "COMMUNICATION",
    label: "Communication",
    emoji: "💬",
    keywords: ["messaged", "message", "responsive", "replied", "communication", "in touch", "answered"],
  },
  {
    code: "CHECK_IN",
    label: "Check-in",
    emoji: "🔑",
    keywords: ["check-in", "check in", "checkin", "keypad", "lockbox", "self check", "arrival", "instructions"],
  },
  {
    code: "LOCATION",
    label: "Location",
    emoji: "📍",
    keywords: ["location", "located", "central", "walk", "walking distance", "nearby", "close to", "convenient"],
  },
  {
    code: "VALUE",
    label: "Value",
    emoji: "🏷️",
    keywords: ["value", "worth", "priced", "price", "cheap", "affordable", "reasonable"],
  },
  {
    code: "CONDITION",
    label: "Condition",
    emoji: "🛠️",
    keywords: ["well kept", "maintained", "condition", "as described", "photos", "new", "fixed", "repair"],
  },
  {
    code: "FAMILY",
    label: "Family",
    emoji: "🧸",
    keywords: ["family", "families", "kids", "children", "child", "parents", "grandparents", "generations", "cot"],
  },
  {
    code: "WORKSPACE",
    label: "Workspace",
    emoji: "💻",
    keywords: ["desk", "workspace", "work trip", "worked", "working", "calls", "office", "laptop"],
  },
  {
    code: "WIFI",
    label: "Wi-Fi",
    emoji: "📶",
    keywords: ["wifi", "wi-fi", "internet", "broadband", "connection", "mbps"],
  },
  {
    code: "KITCHEN",
    label: "Kitchen",
    emoji: "🍳",
    keywords: ["kitchen", "cook", "cooked", "cooking", "knives", "fridge", "stove", "hob", "utensils"],
  },
  {
    code: "BEDS",
    label: "Beds",
    emoji: "🛏️",
    keywords: ["bed", "beds", "mattress", "slept", "sleep", "pillows", "linen"],
  },
  {
    code: "BATHROOM",
    label: "Bathroom",
    emoji: "🛁",
    keywords: ["bathroom", "shower", "water pressure", "hot water", "geyser", "toilet"],
  },
  {
    code: "QUIET",
    label: "Peace and quiet",
    emoji: "🤫",
    keywords: ["quiet", "peaceful", "calm", "noise", "noisy", "silent"],
  },
  {
    code: "PARKING",
    label: "Parking",
    emoji: "🚗",
    keywords: ["parking", "park", "car", "driveway", "garage"],
  },
  {
    code: "OUTDOORS",
    label: "Outdoor space",
    emoji: "🌳",
    keywords: ["garden", "balcony", "terrace", "courtyard", "outdoor", "patio", "lawn"],
  },
  {
    code: "POOL",
    label: "Pool",
    emoji: "🏊",
    keywords: ["pool", "swim", "swimming"],
  },
  {
    code: "VIEWS",
    label: "Views",
    emoji: "🌇",
    keywords: ["view", "views", "skyline", "sunset", "sunrise", "scenery"],
  },
  {
    code: "AIR_CONDITIONING",
    label: "Air conditioning",
    emoji: "❄️",
    keywords: ["air conditioning", "ac ", "a/c", "cool", "fan"],
  },
  {
    code: "SAFETY",
    label: "Safety",
    emoji: "🔒",
    keywords: ["safe", "safety", "secure", "security", "gated"],
  },
  {
    code: "GROUPS",
    label: "Groups",
    emoji: "🎉",
    keywords: ["group", "offsite", "friends", "party of", "twelve", "eleven", "everyone"],
  },
];

export const REVIEW_TOPIC_BY_CODE = new Map(
  REVIEW_TOPICS.map((topic) => [topic.code, topic]),
);

/**
 * Word-boundary matchers, built once. Keywords are escaped because several
 * contain characters (`-`, `/`) that would otherwise change the pattern.
 */
const MATCHERS = new Map(
  REVIEW_TOPICS.map((topic) => [
    topic.code,
    new RegExp(
      `\\b(${topic.keywords
        .map((k) => k.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})`,
      "i",
    ),
  ]),
);

export type TopicableReview = {
  body: string;
  /**
   * Optional on purpose. A caller may hand us a row selected without the
   * column, and topics are decoration — they must never be able to take a
   * listing page down. Absent behaves exactly like empty: infer from the body.
   */
  topics?: string[] | null;
};

/** The topic codes a single review counts towards. */
export function topicsForReview(review: TopicableReview): string[] {
  const tagged = (review.topics ?? []).filter((code) =>
    REVIEW_TOPIC_BY_CODE.has(code),
  );
  if (tagged.length > 0) return tagged;

  return REVIEW_TOPICS.filter((topic) =>
    MATCHERS.get(topic.code)!.test(review.body),
  ).map((topic) => topic.code);
}

export type ReviewTopicCount = {
  code: string;
  label: string;
  emoji: string;
  count: number;
};

/**
 * Chips are only worth showing when a topic recurs — a chip reading "1" tells
 * a guest nothing they couldn't get from reading the one review. Below six
 * reviews there isn't enough to recur, so the row stays hidden entirely.
 */
export function summariseReviewTopics(
  reviews: TopicableReview[],
  { limit = 6 }: { limit?: number } = {},
): ReviewTopicCount[] {
  if (reviews.length < 4) return [];

  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const code of topicsForReview(review)) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }

  return REVIEW_TOPICS.map((topic) => ({
    code: topic.code,
    label: topic.label,
    emoji: topic.emoji,
    count: counts.get(topic.code) ?? 0,
  }))
    .filter((topic) => topic.count >= 2)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}
