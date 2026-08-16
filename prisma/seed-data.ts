import type { AmenityCategory, PropertyType } from "@prisma/client";

/**
 * Invented but realistic Lime Kraft portfolio across Indore micro-markets.
 * Photography is hotlinked from Unsplash (stable IDs) so every screen has
 * real imagery without shipping binaries.
 */

export const AMENITIES: {
  name: string;
  icon: string;
  category: AmenityCategory;
}[] = [
  { name: "Wi-Fi", icon: "Wifi", category: "BASIC" },
  { name: "Air conditioning", icon: "Wind", category: "BASIC" },
  { name: "Free parking", icon: "Car", category: "BASIC" },
  { name: "Power backup", icon: "Zap", category: "BASIC" },
  { name: "Workspace", icon: "Laptop", category: "BASIC" },
  { name: "Washing machine", icon: "WashingMachine", category: "BASIC" },
  { name: "Full kitchen", icon: "CookingPot", category: "KITCHEN" },
  { name: "Refrigerator", icon: "Refrigerator", category: "KITCHEN" },
  { name: "Microwave", icon: "Microwave", category: "KITCHEN" },
  { name: "Coffee maker", icon: "Coffee", category: "KITCHEN" },
  { name: "Smart TV", icon: "Tv", category: "ENTERTAINMENT" },
  { name: "Sound system", icon: "Speaker", category: "ENTERTAINMENT" },
  { name: "Balcony", icon: "Trees", category: "OUTDOOR" },
  { name: "Terrace", icon: "Sun", category: "OUTDOOR" },
  { name: "Garden", icon: "Flower2", category: "OUTDOOR" },
  { name: "Smoke alarm", icon: "AlarmSmoke", category: "SAFETY" },
  { name: "First aid kit", icon: "BriefcaseMedical", category: "SAFETY" },
  { name: "CCTV (exterior)", icon: "Cctv", category: "SAFETY" },
  { name: "Self check-in", icon: "KeyRound", category: "SAFETY" },
];

const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

export type SeedProperty = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  locationArea: string;
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
      "Wi-Fi", "Air conditioning", "Free parking", "Power backup", "Workspace",
      "Full kitchen", "Refrigerator", "Microwave", "Smart TV", "Balcony",
      "Smoke alarm", "Self check-in", "Washing machine",
    ],
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
      "Wi-Fi", "Air conditioning", "Power backup", "Workspace", "Full kitchen",
      "Refrigerator", "Coffee maker", "Smart TV", "Smoke alarm", "Self check-in",
    ],
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
      "Wi-Fi", "Air conditioning", "Free parking", "Power backup", "Full kitchen",
      "Refrigerator", "Microwave", "Smart TV", "Sound system", "Garden",
      "Terrace", "Washing machine", "Smoke alarm", "First aid kit", "CCTV (exterior)",
    ],
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
      "Wi-Fi", "Air conditioning", "Power backup", "Workspace", "Refrigerator",
      "Microwave", "Smart TV", "Self check-in", "Smoke alarm",
    ],
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
      "Wi-Fi", "Air conditioning", "Free parking", "Power backup", "Full kitchen",
      "Refrigerator", "Microwave", "Coffee maker", "Smart TV", "Sound system",
      "Garden", "Terrace", "Balcony", "Washing machine", "Smoke alarm",
      "First aid kit", "CCTV (exterior)", "Workspace",
    ],
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
];

export const GUEST_NAMES = [
  "Ananya Sharma", "Rohan Mehta", "Priya Iyer", "Karan Malhotra", "Sneha Desai",
  "Aditya Rao", "Meera Krishnan", "Vikram Singh", "Tanvi Joshi", "Arjun Nair",
  "Ishita Bansal", "Rahul Verma", "Nikhil Kulkarni", "Divya Menon", "Sameer Khan",
  "Pooja Reddy", "Harsh Agarwal", "Neha Chopra", "Aman Gupta", "Ritika Shah",
  "Siddharth Bose", "Kavya Pillai", "Manav Thakur", "Anjali Dubey",
];

export const REVIEW_SNIPPETS = [
  { rating: 5, title: "Better than the photos", body: "We booked for two nights and extended to four. The bed, the light in the morning, the fact that the kitchen actually had sharp knives — small things done properly." },
  { rating: 5, title: "Exactly what we needed", body: "Spotless, easy self check-in, and someone from the Lime Kraft team messaged the morning after to check we had everything. Never felt intrusive." },
  { rating: 4, title: "Great stay, minor niggle", body: "Lovely space and very well kept. Water pressure in the second bathroom was a bit weak, mentioned it and it was fixed the same day." },
  { rating: 5, title: "Worked from here for a week", body: "The desk and chair are genuinely good, which is rare. Wi-Fi held up through a full day of calls. Would book again for a longer stint." },
  { rating: 5, title: "Family trip sorted", body: "Six of us, three generations, and nobody was cramped. The garden got used every evening. Check-in instructions were clear." },
  { rating: 4, title: "Very good value", body: "Clean, central and quiet at night. Parking was easier than expected. Would happily stay again on a work trip." },
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
    image: U("1524492412937-b28074a5d7da"),
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

export const DESTINATIONS = [
  {
    slug: "vijay-nagar",
    name: "Vijay Nagar",
    blurb: "Indore's business and dining district — offices by day, restaurants by night.",
    image: U("1567157577867-05ccb1388e66"),
  },
  {
    slug: "central-indore",
    name: "Central Indore",
    blurb: "Rajwada, Sarafa and the old city. Dense, historic and best explored on foot.",
    image: U("1524492412937-b28074a5d7da"),
  },
  {
    slug: "palasia",
    name: "Palasia",
    blurb: "Central without the chaos. Leafy side streets, cafés and easy access everywhere.",
    image: U("1513635269975-59663e0ac1ad"),
  },
  {
    slug: "rau",
    name: "Rau",
    blurb: "Quieter, greener and close to the airport. Where the city starts to loosen up.",
    image: U("1500375592092-40eb2168fd21"),
  },
  {
    slug: "bicholi-mardana",
    name: "Bicholi Mardana",
    blurb: "Large homes and open space on Indore's eastern edge.",
    image: U("1449844908441-8829872d2607"),
  },
];

export const CATEGORIES = [
  { slug: "weekend-escape", label: "Weekend Escape", image: U("1501785888041-af3ef285b470") },
  { slug: "work-trip", label: "Work Trip", image: U("1497366754035-f200968a6e72") },
  { slug: "couples", label: "Couples", image: U("1517248135467-4c7edcad34c4") },
  { slug: "family-stay", label: "Family Stay", image: U("1600585154340-be6161a56a0c") },
  { slug: "long-stay", label: "Long Stay", image: U("1493809842364-78817add7ffb") },
  { slug: "city-explorer", label: "City Explorer", image: U("1524492412937-b28074a5d7da") },
];
