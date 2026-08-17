import type {
  PropertyType,
  ThingToKnowGroup,
  TripType,
} from "@prisma/client";
import type { HighlightCode } from "../src/lib/property/highlights";

/**
 * Invented but realistic Lime Kraft portfolio, spanning Indore's micro-markets
 * and North Goa. Photography is hotlinked from Unsplash (stable IDs) so every
 * screen has real imagery without shipping binaries.
 */

/**
 * The amenity catalogue is application data, not seed data — the admin picker
 * and the listing page both read it — so it lives in src/lib/property and is
 * re-exported here for the seed rather than duplicated.
 */
export { AMENITIES } from "../src/lib/property/amenities";

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export type SeedProperty = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  locationArea: string;
  /**
   * Optional so the existing Indore entries stay untouched, but present so a
   * seed can express a city at all. Without these the schema defaults silently
   * make every seeded property Indore/Madhya Pradesh, which is the one thing
   * standing between this data pipeline and a second city.
   */
  city?: string;
  state?: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  propertyType: PropertyType;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  beds: number;
  basePrice: number;
  cleaningFee: number;
  images: string[];
  amenities: string[];
  /** Rendered struck through under "Not included", the way Airbnb does it. */
  unavailableAmenities?: string[];
  /** Codes from src/lib/property/highlights.ts, in display order. */
  highlights: HighlightCode[];
  /** Codes from src/lib/property/things-to-know.ts, by column. */
  thingsToKnow: Partial<Record<ThingToKnowGroup, string[]>>;
  isGuestFavourite?: boolean;
  checkInFrom?: string;
  checkInTo?: string;
  checkOutBy?: string;
  units: { name: string; maxGuests: number; bedrooms: number; bathrooms: number; beds: number }[];
  /** Initial capital deployed, by category. */
  investment: Record<string, number>;
  /** Monthly recurring costs. */
  recurring: Record<string, number>;
  openedMonthsAgo: number;
};

export const PROPERTIES: SeedProperty[] = [
  {
    slug: "the-vijay-nagar-residence",
    name: "The Vijay Nagar Residence",
    tagline: "A calm two-bedroom above the city's best coffee",
    description:
      "A quiet, light-filled apartment a few minutes from Vijay Nagar's restaurants and offices. Designed for people who want the ease of a hotel without the anonymity of one — deep sofas, a proper kitchen, blackout curtains in both bedrooms, and a desk that's genuinely comfortable to work at for eight hours.",
    locationArea: "Vijay Nagar",
    addressLine: "Scheme 54 PU4, Vijay Nagar, Indore",
    latitude: 22.7533,
    longitude: 75.8937,
    propertyType: "APARTMENT",
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    beds: 3,
    basePrice: 4200,
    cleaningFee: 800,
    images: [
      U("1502672260266-1c1ef2d93688"),
      U("1522708323590-d24dbb6b0267"),
      U("1560448204-e02f11c3d0e2"),
      U("1556909212-d5b604d0c90d"),
      U("1493809842364-78817add7ffb"),
    ],
    amenities: [
      "Wi-Fi", "High-speed Wi-Fi (100+ Mbps)", "Dedicated workspace",
      "Air conditioning", "Ceiling fan", "Power backup",
      "Free parking on premises", "Lift", "Gated society security",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Induction hob",
      "Cooking basics", "Dishes and cutlery", "Kettle", "Coffee maker",
      "Toaster", "Water purifier", "Dining table",
      "Washing machine", "Iron", "Hangers", "Bed linen",
      "Extra pillows and blankets", "Room-darkening blinds", "Wardrobe",
      "Hot water", "Hair dryer", "Shampoo", "Conditioner", "Body soap",
      "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Books and reading material",
      "Private patio or balcony", "City skyline view",
      "Smoke alarm", "Fire extinguisher", "First aid kit",
      "Self check-in", "Keypad entry", "Long-term stays allowed",
      "Luggage drop-off allowed", "On-call property manager",
      "Walk to restaurants and cafés",
    ],
    unavailableAmenities: ["Pool", "Bathtub", "Pets allowed"],
    highlights: [
      "KEYPAD_CHECK_IN",
      "DESIGNED_FOR_WORK",
      "PARK_FOR_FREE",
      "POWER_BACKUP",
      "UNBEATABLE_LOCATION",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS", "QUIET_HOURS",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID",
        "NO_INTERIOR_CAMERAS", "EXTERIOR_CAMERAS", "GATED_SECURITY",
        "POWER_BACKUP", "POTENTIAL_NOISE",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    isGuestFavourite: true,
    units: [{ name: "Whole apartment", maxGuests: 4, bedrooms: 2, bathrooms: 2, beds: 3 }],
    investment: {
      "Security Deposit": 180000,
      Furniture: 165000,
      Interior: 92000,
      Paint: 28000,
      Appliances: 74000,
      "Kitchen Setup": 36000,
      Electronics: 58000,
      Decor: 31000,
      Repairs: 18000,
      Miscellaneous: 12000,
    },
    recurring: {
      Rent: 30000,
      Cleaning: 6000,
      Laundry: 3200,
      Electricity: 4800,
      Internet: 1200,
      Maintenance: 2500,
      Consumables: 2800,
    },
    openedMonthsAgo: 11,
  },
  {
    slug: "palasia-loft",
    name: "Palasia Loft",
    tagline: "A high-ceilinged one-bedroom in the middle of everything",
    description:
      "A compact loft on a leafy side street off Palasia, walking distance to Sarafa and the old city. Exposed brick, a mezzanine bedroom and windows on two sides. Best for couples and solo travellers who want to be in the centre of Indore without the noise of a main road.",
    locationArea: "Palasia",
    addressLine: "Old Palasia, Near Greater Kailash Road, Indore",
    latitude: 22.7244,
    longitude: 75.8839,
    propertyType: "APARTMENT",
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    basePrice: 2800,
    cleaningFee: 600,
    images: [
      U("1522771739844-6a9f6d5f14af"),
      U("1560185007-cde436f6a4d0"),
      U("1484154218962-a197022b5858"),
      U("1507089947368-19c1da9775ae"),
    ],
    amenities: [
      "Wi-Fi", "Dedicated workspace", "Air conditioning", "Ceiling fan",
      "Power backup", "Free street parking",
      "Kitchen", "Fridge", "Induction hob", "Cooking basics",
      "Dishes and cutlery", "Kettle", "Coffee maker", "Water purifier",
      "Washing machine", "Hangers", "Bed linen", "Room-darkening blinds",
      "Wardrobe", "Iron",
      "Hot water", "Hair dryer", "Shampoo", "Body soap", "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Books and reading material",
      "Board games",
      "Smoke alarm", "First aid kit",
      "Self check-in", "Lockbox", "Luggage drop-off allowed",
      "On-call property manager", "Long-term stays allowed",
      "Walk to restaurants and cafés", "Close to public transport",
      "Private entrance",
    ],
    unavailableAmenities: ["Free parking on premises", "Lift", "Pets allowed"],
    highlights: [
      "LOCKBOX_CHECK_IN",
      "WALKABLE_AREA",
      "DEDICATED_WORKSPACE",
      "GREAT_LOCATION",
      "LONG_STAY_FRIENDLY",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRST_AID", "NO_INTERIOR_CAMERAS",
        "MUST_CLIMB_STAIRS", "NO_PARKING", "POTENTIAL_NOISE",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "REVIEW_FULL_POLICY",
      ],
    },
    units: [{ name: "Whole loft", maxGuests: 2, bedrooms: 1, bathrooms: 1, beds: 1 }],
    investment: {
      "Security Deposit": 120000,
      Furniture: 98000,
      Interior: 64000,
      Paint: 19000,
      Appliances: 52000,
      "Kitchen Setup": 27000,
      Electronics: 41000,
      Decor: 22000,
      Miscellaneous: 9000,
    },
    recurring: {
      Rent: 22000,
      Cleaning: 4500,
      Laundry: 2200,
      Electricity: 3400,
      Internet: 1200,
      Maintenance: 1800,
      Consumables: 1900,
    },
    openedMonthsAgo: 9,
  },
  {
    slug: "the-rau-garden-house",
    name: "The Rau Garden House",
    tagline: "Three bedrooms, a long table and a garden that gets used",
    description:
      "An independent house on the quieter edge of Rau with a walled garden, a dining table that seats ten and enough bedrooms for a family or two. Slower than the city addresses — you hear birds in the morning — but only twenty minutes from the airport.",
    locationArea: "Rau",
    addressLine: "Rau-Pithampur Link Road, Rau, Indore",
    latitude: 22.6154,
    longitude: 75.8125,
    propertyType: "HOME",
    maxGuests: 8,
    bedrooms: 3,
    bathrooms: 3,
    beds: 5,
    basePrice: 6800,
    cleaningFee: 1400,
    images: [
      U("1568605114967-8130f3a36994"),
      U("1583608205776-bfd35f0d9f83"),
      U("1600585154340-be6161a56a0c"),
      U("1600607687939-ce8a6c25118c"),
      U("1600566753086-00f18fb6b3ea"),
    ],
    amenities: [
      "Wi-Fi", "Dedicated workspace", "Air conditioning", "Ceiling fan",
      "Power backup", "Free parking on premises", "Single-level home",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Gas hob", "Oven",
      "Cooking basics", "Dishes and cutlery", "Kettle", "Coffee maker",
      "Water purifier", "Dining table", "Wine glasses", "Rice cooker",
      "Washing machine", "Clothes drying rack", "Iron", "Hangers",
      "Bed linen", "Extra pillows and blankets", "Wardrobe", "Mosquito net",
      "Hot water", "Hair dryer", "Shampoo", "Body soap", "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Sound system",
      "Board games", "Books and reading material",
      "Garden", "Terrace", "Outdoor furniture", "Outdoor dining area",
      "Barbecue grill", "Backyard", "Garden view",
      "Cot", "High chair", "Children's books and toys",
      "Smoke alarm", "Fire extinguisher", "First aid kit",
      "Exterior security cameras",
      "Self check-in", "Host greets you", "Cleaning available during stay",
      "On-call property manager", "Airport pickup on request",
      "Long-term stays allowed", "Private entrance",
    ],
    unavailableAmenities: ["Pool", "Lift", "Gym"],
    highlights: [
      "SELF_CHECK_IN",
      "PARK_FOR_FREE",
      "FAMILY_FRIENDLY",
      "PEACE_AND_QUIET",
      "ENTIRE_HOME",
      "SPARKLING_CLEAN",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "QUIET_HOURS", "NO_SHOES", "LEAVE_TIDY",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID", "EXTERIOR_CAMERAS",
        "NO_INTERIOR_CAMERAS", "CLIMBING_STRUCTURE", "POWER_BACKUP",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    isGuestFavourite: true,
    units: [{ name: "Entire house", maxGuests: 8, bedrooms: 3, bathrooms: 3, beds: 5 }],
    investment: {
      "Security Deposit": 240000,
      Furniture: 285000,
      Interior: 148000,
      Paint: 46000,
      Appliances: 118000,
      "Kitchen Setup": 62000,
      Electronics: 84000,
      Decor: 54000,
      Repairs: 32000,
      Miscellaneous: 21000,
    },
    recurring: {
      Rent: 45000,
      Cleaning: 9000,
      Laundry: 5200,
      Electricity: 8400,
      Internet: 1500,
      Maintenance: 4200,
      Consumables: 4600,
      Staff: 8000,
    },
    openedMonthsAgo: 14,
  },
  {
    slug: "central-indore-studio",
    name: "Central Indore Studio",
    tagline: "A small, well-made studio for short city stays",
    description:
      "Everything you need and nothing you don't: a firm bed, a real shower, fast Wi-Fi and a kitchenette. Two minutes from Rajwada and the station side of town. Priced for a night or two rather than a week.",
    locationArea: "Central Indore",
    addressLine: "Near Rajwada Palace, Central Indore",
    latitude: 22.7177,
    longitude: 75.8545,
    propertyType: "APARTMENT",
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    beds: 1,
    basePrice: 2200,
    cleaningFee: 500,
    images: [
      U("1554995207-c18c203602cb"),
      U("1505873242700-f289a29e1e0f"),
      U("1586023492125-27b2c045efd7"),
      U("1522708323590-d24dbb6b0267"),
    ],
    amenities: [
      "Wi-Fi", "Dedicated workspace", "Air conditioning", "Ceiling fan",
      "Power backup", "Free street parking",
      "Fridge", "Microwave", "Kettle", "Dishes and cutlery", "Water purifier",
      "Hangers", "Bed linen", "Room-darkening blinds", "Wardrobe",
      "Hot water", "Hair dryer", "Shampoo", "Body soap", "Cleaning products",
      "Smart TV with Netflix and Prime Video",
      "Smoke alarm", "First aid kit",
      "Self check-in", "Keypad entry", "Luggage drop-off allowed",
      "On-call property manager",
      "Walk to restaurants and cafés", "Close to public transport",
    ],
    unavailableAmenities: [
      "Kitchen", "Washing machine", "Free parking on premises", "Lift",
    ],
    highlights: [
      "KEYPAD_CHECK_IN",
      "WALKABLE_AREA",
      "GREAT_LOCATION",
      "FAST_WIFI",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS", "NO_UNREGISTERED_VISITORS",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRST_AID", "NO_INTERIOR_CAMERAS",
        "MUST_CLIMB_STAIRS", "SHARED_SPACES", "POTENTIAL_NOISE", "NO_PARKING",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "NO_REFUND_AFTER_CHECKIN",
        "CLEANING_FEE_REFUND", "REVIEW_FULL_POLICY",
      ],
    },
    units: [{ name: "Studio", maxGuests: 2, bedrooms: 1, bathrooms: 1, beds: 1 }],
    investment: {
      "Security Deposit": 90000,
      Furniture: 64000,
      Interior: 38000,
      Paint: 14000,
      Appliances: 36000,
      "Kitchen Setup": 16000,
      Electronics: 28000,
      Decor: 13000,
      Miscellaneous: 7000,
    },
    recurring: {
      Rent: 16000,
      Cleaning: 3600,
      Laundry: 1800,
      Electricity: 2600,
      Internet: 1000,
      Maintenance: 1400,
      Consumables: 1500,
    },
    openedMonthsAgo: 6,
  },
  {
    slug: "bicholi-courtyard-villa",
    name: "Bicholi Courtyard Villa",
    tagline: "A four-bedroom villa built around an open courtyard",
    description:
      "Lime Kraft's largest home. Four bedrooms arranged around a planted courtyard, a separate living pavilion and a kitchen set up for people who actually cook. Made for families travelling together, small offsites and the occasional very good dinner party.",
    locationArea: "Bicholi Mardana",
    addressLine: "Bicholi Mardana Road, Indore",
    latitude: 22.7008,
    longitude: 75.9264,
    propertyType: "VILLA",
    maxGuests: 10,
    bedrooms: 4,
    bathrooms: 4,
    beds: 6,
    basePrice: 9500,
    cleaningFee: 1800,
    images: [
      U("1613490493576-7fde63acd811"),
      U("1600596542815-ffad4c1539a9"),
      U("1600607687920-4e2a09cf159d"),
      U("1600566753190-17f0baa2a6c3"),
      U("1600210492486-724fe5c67fb0"),
    ],
    amenities: [
      "Wi-Fi", "High-speed Wi-Fi (100+ Mbps)", "Dedicated workspace",
      "Air conditioning", "Ceiling fan", "Power backup",
      "Free parking on premises", "EV charger", "Private pool",
      "Single-level home",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Gas hob", "Oven",
      "Dishwasher", "Cooking basics", "Dishes and cutlery", "Kettle",
      "Coffee maker", "Toaster", "Blender", "Water purifier", "Dining table",
      "Wine glasses",
      "Washing machine", "Dryer", "Iron", "Clothes drying rack", "Hangers",
      "Bed linen", "Extra pillows and blankets", "Wardrobe", "Safe",
      "Hot water", "Bathtub", "Hair dryer", "Shampoo", "Conditioner",
      "Body soap", "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Sound system",
      "Projector and screen", "Board games", "Books and reading material",
      "Games console",
      "Garden", "Terrace", "Private patio or balcony", "Outdoor furniture",
      "Outdoor dining area", "Barbecue grill", "Fire pit", "Sun loungers",
      "Courtyard view", "Pool view",
      "Cot", "High chair", "Children's books and toys", "Baby safety gates",
      "Smoke alarm", "Carbon monoxide alarm", "Fire extinguisher",
      "First aid kit", "Exterior security cameras",
      "Self check-in", "Smart lock", "Host greets you", "Daily housekeeping",
      "Cleaning available during stay", "Breakfast available",
      "Airport pickup on request", "On-call property manager",
      "Private entrance",
    ],
    unavailableAmenities: ["Lift", "Gym", "Pets allowed", "Smoking allowed"],
    highlights: [
      "SMART_LOCK_CHECK_IN",
      "DIVE_RIGHT_IN",
      "PARK_FOR_FREE",
      "FAMILY_FRIENDLY",
      "HOME_AWAY_FROM_HOME",
      "TOP_RATED_HOME",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS", "QUIET_HOURS",
        "NO_COMMERCIAL_PHOTOGRAPHY",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "CO_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID",
        "EXTERIOR_CAMERAS", "NO_INTERIOR_CAMERAS", "POOL_NO_GATE",
        "POWER_BACKUP", "GATED_SECURITY",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    isGuestFavourite: true,
    checkInFrom: "3:00 pm",
    checkOutBy: "11:00 am",
    units: [{ name: "Entire villa", maxGuests: 10, bedrooms: 4, bathrooms: 4, beds: 6 }],
    investment: {
      "Security Deposit": 350000,
      Furniture: 420000,
      Interior: 245000,
      Paint: 68000,
      Appliances: 176000,
      "Kitchen Setup": 94000,
      Electronics: 132000,
      Decor: 88000,
      Repairs: 41000,
      Miscellaneous: 28000,
    },
    recurring: {
      Rent: 68000,
      Cleaning: 13000,
      Laundry: 7400,
      Electricity: 12800,
      Internet: 1800,
      Maintenance: 6500,
      Consumables: 6800,
      Staff: 14000,
      "Property Management": 5000,
    },
    openedMonthsAgo: 8,
  },

  // ── Goa ──────────────────────────────────────────────────────────────────
  // The second city. Every entry below sets `city`/`state` explicitly: the
  // schema defaults are Indore/Madhya Pradesh, so an omitted field here would
  // silently file a Goa villa under Indore and the whole location hierarchy —
  // `/villas-in-goa`, the destinations grid, the sitemap — would never see it.
  {
    slug: "assagao-garden-villa",
    name: "Assagao Garden Villa",
    tagline: "A three-bedroom villa with a private pool, ten minutes from Anjuna",
    description:
      "A low, white villa set back behind a wall of frangipani in Assagao. Three bedrooms open onto a covered verandah, the pool is properly private rather than overlooked, and the kitchen is set up for people who cook. Ten minutes to Anjuna and Vagator, far enough back from the road that you hear birds instead of scooters.",
    locationArea: "Assagao",
    city: "Goa",
    state: "Goa",
    addressLine: "Badem, Assagao, Bardez, North Goa",
    latitude: 15.5892,
    longitude: 73.7714,
    propertyType: "VILLA",
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 3,
    beds: 4,
    basePrice: 12500,
    cleaningFee: 2200,
    images: [
      U("1613490493576-7fde63acd811"),
      U("1600596542815-ffad4c1539a9"),
      U("1600566753086-00f18fb6b3ea"),
      U("1600607687920-4e2a09cf159d"),
      U("1600210492486-724fe5c67fb0"),
    ],
    amenities: [
      "Wi-Fi", "High-speed Wi-Fi (100+ Mbps)", "Dedicated workspace",
      "Air conditioning", "Ceiling fan", "Power backup", "Mosquito net",
      "Free parking on premises", "Private pool", "Single-level home",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Gas hob", "Oven",
      "Cooking basics", "Dishes and cutlery", "Kettle", "Coffee maker",
      "Toaster", "Blender", "Water purifier", "Dining table", "Wine glasses",
      "Washing machine", "Clothes drying rack", "Iron", "Hangers",
      "Bed linen", "Extra pillows and blankets", "Room-darkening blinds",
      "Wardrobe", "Safe",
      "Hot water", "Outdoor shower", "Hair dryer", "Shampoo", "Conditioner",
      "Body soap", "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Sound system",
      "Books and reading material", "Board games",
      "Garden", "Terrace", "Private patio or balcony", "Outdoor furniture",
      "Outdoor dining area", "Barbecue grill", "Sun loungers", "Hammock",
      "Bikes", "Garden view", "Pool view", "Sunset view",
      "Cot", "High chair",
      "Smoke alarm", "Fire extinguisher", "First aid kit",
      "Exterior security cameras",
      "Self check-in", "Smart lock", "Host greets you",
      "Cleaning available during stay", "Breakfast available",
      "Airport pickup on request", "On-call property manager",
      "Private entrance", "Long-term stays allowed", "Pets allowed",
    ],
    unavailableAmenities: ["Lift", "Gym", "Bathtub", "Smoking allowed"],
    highlights: [
      "SMART_LOCK_CHECK_IN",
      "DIVE_RIGHT_IN",
      "PEACE_AND_QUIET",
      "SCENIC_SETTING",
      "BRING_YOUR_PETS",
      "ENTIRE_HOME",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_WINDOW", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "PETS_ALLOWED", "QUIET_HOURS",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID",
        "NO_INTERIOR_CAMERAS", "EXTERIOR_CAMERAS", "POOL_NO_GATE",
        "POWER_BACKUP",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    isGuestFavourite: true,
    checkInFrom: "2:00 pm",
    checkInTo: "9:00 pm",
    checkOutBy: "11:00 am",
    units: [{ name: "Entire villa", maxGuests: 6, bedrooms: 3, bathrooms: 3, beds: 4 }],
    investment: {
      "Security Deposit": 600000,
      Furniture: 380000,
      Interior: 260000,
      Paint: 74000,
      Appliances: 148000,
      "Kitchen Setup": 82000,
      Electronics: 96000,
      Decor: 105000,
      Repairs: 52000,
      Miscellaneous: 34000,
    },
    recurring: {
      Rent: 95000,
      Cleaning: 14000,
      Laundry: 8200,
      Electricity: 11500,
      Internet: 1600,
      Maintenance: 9500,
      Consumables: 6200,
      Staff: 18000,
      "Property Management": 6000,
    },
    openedMonthsAgo: 5,
  },
  {
    slug: "siolim-riverside-house",
    name: "Siolim Riverside House",
    tagline: "A restored Portuguese house on the Chapora river",
    description:
      "A 90-year-old Goan-Portuguese house in Siolim, restored rather than gutted — oyster-shell windows, red oxide floors and a balcão that catches the evening breeze off the Chapora. Two bedrooms, a wide central sala and a garden that runs down towards the water. Best for couples and small families who want the old Goa rather than the beach-club one.",
    locationArea: "Siolim",
    city: "Goa",
    state: "Goa",
    addressLine: "Vaddy, Siolim, Bardez, North Goa",
    latitude: 15.6247,
    longitude: 73.7616,
    propertyType: "HOME",
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 2,
    beds: 3,
    basePrice: 7800,
    cleaningFee: 1400,
    images: [
      U("1600566753086-00f18fb6b3ea"),
      U("1600585154340-be6161a56a0c"),
      U("1505873242700-f289a29e1e0f"),
      U("1600607687939-ce8a6c25118c"),
      U("1554995207-c18c203602cb"),
    ],
    amenities: [
      "Wi-Fi", "High-speed Wi-Fi (100+ Mbps)", "Dedicated workspace",
      "Air conditioning", "Ceiling fan", "Power backup", "Mosquito net",
      "Free parking on premises", "Single-level home",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Gas hob",
      "Cooking basics", "Dishes and cutlery", "Kettle", "Coffee maker",
      "Water purifier", "Dining table",
      "Washing machine", "Clothes drying rack", "Iron", "Hangers",
      "Bed linen", "Extra pillows and blankets", "Wardrobe",
      "Hot water", "Hair dryer", "Shampoo", "Conditioner", "Body soap",
      "Cleaning products",
      "Smart TV with Netflix and Prime Video",
      "Books and reading material", "Board games",
      "Garden", "Terrace", "Private patio or balcony", "Outdoor furniture",
      "Outdoor dining area", "Hammock", "Bikes",
      "Garden view", "River view", "Waterfront",
      "Smoke alarm", "Fire extinguisher", "First aid kit",
      "Self check-in", "Keypad entry", "Host greets you",
      "Breakfast available", "On-call property manager",
      "Private entrance", "Long-term stays allowed",
      "Walk to restaurants and cafés",
    ],
    unavailableAmenities: ["Pool", "Lift", "Dishwasher", "Pets allowed"],
    highlights: [
      "KEYPAD_CHECK_IN",
      "PEACE_AND_QUIET",
      "SCENIC_SETTING",
      "HOME_AWAY_FROM_HOME",
      "LONG_STAY_FRIENDLY",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_AFTER", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS", "QUIET_HOURS", "NO_SHOES",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID",
        "NO_INTERIOR_CAMERAS", "NEARBY_WATER", "POWER_BACKUP",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    checkInFrom: "2:00 pm",
    checkOutBy: "11:00 am",
    units: [{ name: "Entire house", maxGuests: 4, bedrooms: 2, bathrooms: 2, beds: 3 }],
    investment: {
      "Security Deposit": 320000,
      Furniture: 215000,
      Interior: 185000,
      Paint: 52000,
      Appliances: 88000,
      "Kitchen Setup": 46000,
      Electronics: 54000,
      Decor: 62000,
      Repairs: 78000,
      Miscellaneous: 21000,
    },
    recurring: {
      Rent: 52000,
      Cleaning: 8000,
      Laundry: 4600,
      Electricity: 6400,
      Internet: 1400,
      Maintenance: 5200,
      Consumables: 3400,
      "Property Management": 3500,
    },
    openedMonthsAgo: 3,
  },
  {
    slug: "panjim-fontainhas-apartment",
    name: "Fontainhas Apartment",
    tagline: "A one-bedroom in the Latin Quarter, above the bakery",
    description:
      "A first-floor apartment on a narrow ochre street in Fontainhas, Panjim's Latin Quarter. High ceilings, shuttered windows onto the street, and a bakery downstairs that opens at seven. One bedroom, a real kitchen and a desk in the window — set up for long stays as much as for weekends. Everything in Panjim is walkable from the door.",
    locationArea: "Panjim",
    city: "Goa",
    state: "Goa",
    addressLine: "31st January Road, Fontainhas, Panjim, North Goa",
    latitude: 15.4972,
    longitude: 73.8296,
    propertyType: "APARTMENT",
    maxGuests: 3,
    bedrooms: 1,
    bathrooms: 1,
    beds: 2,
    basePrice: 5400,
    cleaningFee: 900,
    images: [
      U("1502672260266-1c1ef2d93688"),
      U("1522708323590-d24dbb6b0267"),
      U("1560185007-cde436f6a4d0"),
      U("1493809842364-78817add7ffb"),
      U("1586023492125-27b2c045efd7"),
    ],
    amenities: [
      "Wi-Fi", "High-speed Wi-Fi (100+ Mbps)", "Dedicated workspace",
      "Air conditioning", "Ceiling fan", "Power backup", "Mosquito net",
      "Free street parking",
      "Kitchen", "Fridge", "Freezer", "Microwave", "Induction hob",
      "Cooking basics", "Dishes and cutlery", "Kettle", "Coffee maker",
      "Toaster", "Water purifier", "Dining table",
      "Washing machine", "Clothes drying rack", "Iron", "Hangers",
      "Bed linen", "Extra pillows and blankets", "Room-darkening blinds",
      "Wardrobe",
      "Hot water", "Hair dryer", "Shampoo", "Conditioner", "Body soap",
      "Cleaning products",
      "Smart TV with Netflix and Prime Video", "Books and reading material",
      "Private patio or balcony",
      "Smoke alarm", "Fire extinguisher", "First aid kit",
      "Self check-in", "Keypad entry", "Luggage drop-off allowed",
      "Long-term stays allowed", "On-call property manager",
      "Walk to restaurants and cafés", "Close to public transport",
      "Laundromat nearby",
    ],
    unavailableAmenities: ["Pool", "Lift", "Free parking on premises", "Pets allowed"],
    highlights: [
      "KEYPAD_CHECK_IN",
      "UNBEATABLE_LOCATION",
      "WALKABLE_AREA",
      "DESIGNED_FOR_WORK",
      "LONG_STAY_FRIENDLY",
    ],
    thingsToKnow: {
      HOUSE_RULES: [
        "CHECK_IN_AFTER", "CHECKOUT_BEFORE", "MAX_GUESTS", "ID_REQUIRED",
        "NO_PARTIES", "NO_SMOKING", "NO_PETS", "QUIET_HOURS",
      ],
      SAFETY_PROPERTY: [
        "SMOKE_ALARM", "FIRE_EXTINGUISHER", "FIRST_AID",
        "NO_INTERIOR_CAMERAS", "MUST_CLIMB_STAIRS", "POTENTIAL_NOISE",
        "NO_PARKING", "POWER_BACKUP",
      ],
      CANCELLATION: [
        "FREE_CANCELLATION_WINDOW", "PARTIAL_REFUND", "CLEANING_FEE_REFUND",
        "DATE_CHANGE", "REVIEW_FULL_POLICY",
      ],
    },
    checkInFrom: "1:00 pm",
    checkOutBy: "11:00 am",
    units: [{ name: "Whole apartment", maxGuests: 3, bedrooms: 1, bathrooms: 1, beds: 2 }],
    investment: {
      "Security Deposit": 220000,
      Furniture: 148000,
      Interior: 96000,
      Paint: 34000,
      Appliances: 68000,
      "Kitchen Setup": 38000,
      Electronics: 52000,
      Decor: 41000,
      Repairs: 26000,
      Miscellaneous: 14000,
    },
    recurring: {
      Rent: 34000,
      Cleaning: 5400,
      Laundry: 2800,
      Electricity: 4200,
      Internet: 1200,
      Maintenance: 2600,
      Consumables: 2200,
    },
    openedMonthsAgo: 2,
  },
];

export const GUEST_NAMES = [
  "Ananya Sharma", "Rohan Mehta", "Priya Iyer", "Karan Malhotra", "Sneha Desai",
  "Aditya Rao", "Meera Krishnan", "Vikram Singh", "Tanvi Joshi", "Arjun Nair",
  "Ishita Bansal", "Rahul Verma", "Nikhil Kulkarni", "Divya Menon", "Sameer Khan",
  "Pooja Reddy", "Harsh Agarwal", "Neha Chopra", "Aman Gupta", "Ritika Shah",
  "Siddharth Bose", "Kavya Pillai", "Manav Thakur", "Anjali Dubey",
];

/**
 * Sub-scores are seeded alongside the overall rating so the category strip and
 * the dynamic highlight copy ("100% of recent guests gave the location a
 * 5-star rating") have something real to compute from. A couple deliberately
 * leave categories blank — imported reviews often do, and the maths has to
 * survive it.
 */
export const REVIEW_SNIPPETS: {
  rating: number;
  title: string;
  body: string;
  tripType: TripType;
  topics: string[];
  cleanliness?: number;
  accuracy?: number;
  checkIn?: number;
  communication?: number;
  location?: number;
  value?: number;
}[] = [
  {
    rating: 5,
    title: "Better than the photos",
    body: "We booked for two nights and extended to four. The bed, the light in the morning, the fact that the kitchen actually had sharp knives — small things done properly.",
    tripType: "COUPLE",
    topics: ["CONDITION", "BEDS", "KITCHEN"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 5, value: 5,
  },
  {
    rating: 5,
    title: "Exactly what we needed",
    body: "Spotless, easy self check-in, and someone from the Lime Kraft team messaged the morning after to check we had everything. Never felt intrusive.",
    tripType: "SOLO",
    topics: ["CLEANLINESS", "CHECK_IN", "HOSPITALITY"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 5, value: 4,
  },
  {
    rating: 4,
    title: "Great stay, minor niggle",
    body: "Lovely space and very well kept. Water pressure in the second bathroom was a bit weak — mentioned it and it was fixed the same day, which counts for a lot.",
    tripType: "FRIENDS",
    topics: ["CONDITION", "BATHROOM", "HOSPITALITY"],
    cleanliness: 5, accuracy: 4, checkIn: 5, communication: 5, location: 4, value: 4,
  },
  {
    rating: 5,
    title: "Worked from here for a week",
    body: "The desk and chair are genuinely good, which is rare. Wi-Fi held up through a full day of calls without a single drop. Would book again for a longer stint.",
    tripType: "BUSINESS",
    topics: ["WORKSPACE", "WIFI", "COMFORT"],
    cleanliness: 5, accuracy: 5, checkIn: 4, communication: 5, location: 5, value: 5,
  },
  {
    rating: 5,
    title: "Family trip sorted",
    body: "Six of us across three generations and nobody was cramped. The garden got used every single evening. Check-in instructions were clear enough that my parents managed it before we arrived.",
    tripType: "FAMILY",
    topics: ["FAMILY", "OUTDOORS", "CHECK_IN"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 4, value: 5,
  },
  {
    rating: 4,
    title: "Very good value",
    body: "Clean, central and quiet at night. Parking was easier than expected. Would happily stay again on a work trip.",
    tripType: "BUSINESS",
    topics: ["VALUE", "QUIET", "PARKING"],
    cleanliness: 4, accuracy: 4, checkIn: 5, communication: 4, location: 5, value: 5,
  },
  {
    rating: 5,
    title: "Felt looked after",
    body: "Third time booking with Lime Kraft and the standard doesn't move. Fresh linen, water stocked, and a message the day before with everything I needed and nothing I didn't.",
    tripType: "SOLO",
    topics: ["HOSPITALITY", "CLEANLINESS", "COMMUNICATION"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 4, value: 5,
  },
  {
    rating: 5,
    title: "Perfect for the weekend",
    body: "Walked everywhere. Sarafa at midnight, back in ten minutes. The blackout curtains meant we actually slept in afterwards.",
    tripType: "COUPLE",
    topics: ["LOCATION", "COMFORT", "BEDS"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 4, location: 5, value: 4,
  },
  {
    rating: 4,
    title: "Solid, honest stay",
    body: "Does exactly what the listing says. No surprises, which on a work trip is the whole point.",
    tripType: "BUSINESS",
    topics: ["CONDITION", "VALUE"],
  },
  {
    rating: 5,
    title: "Would book the whole house again",
    body: "We took it for an offsite — twelve of us in and out all weekend and the team handled the extra cleaning without being asked twice. The long table earned its keep.",
    tripType: "GROUP",
    topics: ["GROUPS", "HOSPITALITY", "CLEANLINESS"],
    cleanliness: 5, accuracy: 5, checkIn: 5, communication: 5, location: 4, value: 5,
  },
];

export const JOURNAL_POSTS = [
  {
    slug: "how-we-choose-a-home",
    title: "How we choose a home",
    excerpt: "Before we sign anything, we sleep there. Here's the rest of the checklist.",
    body: "Every Lime Kraft home starts with a night on site. Not a viewing — a night. You learn more about a building between 11pm and 7am than you ever will on a Tuesday afternoon walkthrough: which way the traffic noise carries, whether the water runs hot at six in the morning, how much light actually reaches the bedroom.\n\nAfter that come the unglamorous checks. Power backup that covers the whole flat, not just one socket. A lift that works. Neighbours who are happy to have short-stay guests next door — we ask, every time. Mobile signal in every room.\n\nOnly then do we talk about how it looks.",
    readMinutes: 4,
    image: U("1522708323590-d24dbb6b0267"),
  },
  {
    slug: "indore-for-a-weekend",
    title: "Indore for a weekend",
    excerpt: "Sarafa after dark, Rajwada at opening time, and where to actually eat.",
    body: "Start at Sarafa, but go late — the jewellery shops shut around ten and the food stalls take over the same street until two in the morning. Order the garadu in winter, the bhutte ka kees whenever.\n\nSaturday morning belongs to Rajwada, ideally before the crowds. The palace is worth an hour, the streets around it worth two. Walk to the Kanch Mandir afterwards; the mirror work is genuinely disorienting in the best way.\n\nSunday, go slow. Coffee in Vijay Nagar, then out towards Patalpani if the monsoon has been kind.",
    readMinutes: 6,
    image: U("1679556369532-bacc9cbdb8da"),
  },
  {
    slug: "north-goa-without-the-crowds",
    title: "North Goa without the crowds",
    excerpt: "Assagao, Siolim and the Fontainhas end of Panjim — where to stay when the beach isn't the point.",
    body: "Most people book North Goa by beach and end up on a main road. The villages one ridge back are quieter, greener and ten minutes from the same coast.\n\nAssagao is the obvious one — old Portuguese houses behind frangipani walls, a good bakery, and Anjuna and Vagator close enough to reach before breakfast finishes. Siolim is slower again: the Chapora river, the Saturday night market at Arpora nearby, and almost no through traffic.\n\nIf you would rather be in a town than a village, stay in Fontainhas. Panjim's Latin Quarter is walkable end to end, the buildings are repainted every monsoon, and you can eat properly without driving anywhere.\n\nGo between November and February for the weather, or in September for the prices — the rain is mostly finished and the crowds have not arrived.",
    readMinutes: 5,
    image: U("1600566753086-00f18fb6b3ea"),
  },
  {
    slug: "why-we-price-the-way-we-do",
    title: "Why we price the way we do",
    excerpt: "Transparent nightly rates, no drip pricing, and what the cleaning fee actually pays for.",
    body: "Our rates move with demand — weekends cost more, long stays cost less per night, and a Tuesday in low season is genuinely cheap. What doesn't happen is a price that changes between the search page and the checkout page.\n\nThe cleaning fee is a real number, not a margin lever. It covers a professional turnover: full linen change, bathroom deep clean, restocked consumables, and an inspection before the next guest arrives.\n\nBooking direct is always at least as cheap as any channel you'll find us on. The OTAs take between fourteen and sixteen percent; when you book with us, some of that comes back to you.",
    readMinutes: 3,
    image: U("1560448204-e02f11c3d0e2"),
  },
];

// Neighbourhood imagery. Every photograph below was opened and looked at
// before being used: the previous set was captioned for Indore but actually
// showed Mumbai's Marine Drive, the Taj Mahal in Agra, Tower Bridge in London,
// an ocean wave and a Nordic cabin — in a landlocked Madhya Pradesh city.
// If you swap one, view the image first. An Unsplash search for "Indore"
// returns plenty of photographs taken nowhere near Indore.
//
// `city` is not decoration. Neighbourhood slugs are only unique *within* a
// city — "Panjim" and "Palasia" are fine today, but the first time two cities
// share an area name, a city-less list resolves the wrong page and two
// neighbourhoods start competing for one URL. Every consumer matches on
// city + slug for that reason.
export const DESTINATIONS: {
  slug: string;
  name: string;
  city: string;
  blurb: string;
  image: string;
}[] = [
  {
    slug: "vijay-nagar",
    name: "Vijay Nagar",
    city: "Indore",
    blurb: "Indore's business and dining district — offices by day, restaurants by night.",
    image: U("1580041319554-bd27187ca097"),
  },
  {
    slug: "central-indore",
    name: "Central Indore",
    city: "Indore",
    blurb: "Rajwada, Sarafa and the old city. Dense, historic and best explored on foot.",
    image: U("1699953792735-f684145f1e39"),
  },
  {
    slug: "palasia",
    name: "Palasia",
    city: "Indore",
    blurb: "Central without the chaos. Leafy side streets, cafés and easy access everywhere.",
    image: U("1623047361712-326efdb34175"),
  },
  {
    slug: "rau",
    name: "Rau",
    city: "Indore",
    blurb: "Quieter, greener and close to the airport. Where the city starts to loosen up.",
    image: U("1609533944476-2cb471a3d6fe"),
  },
  {
    slug: "bicholi-mardana",
    name: "Bicholi Mardana",
    city: "Indore",
    blurb: "Large homes and open space on Indore's eastern edge.",
    image: U("1623047361712-326efdb34175"),
  },

  // Goa. These three carry photographs from the homes themselves rather than
  // landmark shots — the Indore set above exists because stock "Goa" results
  // are just as unreliable, and an un-viewed beach photograph is exactly the
  // mistake that comment describes. Swap them for real location photography
  // when we have it.
  {
    slug: "assagao",
    name: "Assagao",
    city: "Goa",
    blurb: "Old villas behind frangipani walls, ten minutes from Anjuna and Vagator.",
    image: U("1613490493576-7fde63acd811"),
  },
  {
    slug: "siolim",
    name: "Siolim",
    city: "Goa",
    blurb: "Portuguese houses on the Chapora river. Quiet, green and still properly Goan.",
    image: U("1600566753086-00f18fb6b3ea"),
  },
  {
    slug: "panjim",
    name: "Panjim",
    city: "Goa",
    blurb: "The Latin Quarter — ochre streets, bakeries and everything within walking distance.",
    image: U("1560185007-cde436f6a4d0"),
  },
];

// Interiors rather than landmarks: this is a homes business, and the stock
// travel shots (a tropical lagoon, the Taj Mahal) had nothing to do with Indore.
export const CATEGORIES = [
  { slug: "weekend-escape", label: "Weekend Escape", image: U("1560448204-e02f11c3d0e2") },
  { slug: "work-trip", label: "Work Trip", image: U("1497366754035-f200968a6e72") },
  { slug: "couples", label: "Couples", image: U("1522708323590-d24dbb6b0267") },
  { slug: "family-stay", label: "Family Stay", image: U("1600585154340-be6161a56a0c") },
  { slug: "long-stay", label: "Long Stay", image: U("1493809842364-78817add7ffb") },
  { slug: "city-explorer", label: "City Explorer", image: U("1502672260266-1c1ef2d93688") },
];
