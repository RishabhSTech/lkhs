import type { AmenityCategory } from "@prisma/client";

/**
 * The amenity catalogue — modelled on Airbnb's "What this place offers".
 *
 * This list is the seed source for the `Amenity` table; admins then tick the
 * ones that apply to each property (and mark any as "not included", which is
 * how Airbnb renders the struck-through block at the bottom of the section).
 *
 * `icon` is a lucide-react export name. `AmenityIcon` falls back to a tick if a
 * name ever stops resolving, so a rename in lucide degrades rather than breaks.
 */

export type AmenitySeed = {
  name: string;
  icon: string;
  category: AmenityCategory;
};

/** Section order and labels, matching the order Airbnb renders them in. */
export const AMENITY_CATEGORY_ORDER: AmenityCategory[] = [
  "SCENIC_VIEWS",
  "BATHROOM",
  "BEDROOM_LAUNDRY",
  "ENTERTAINMENT",
  "FAMILY",
  "HEATING_COOLING",
  "HOME_SAFETY",
  "INTERNET_OFFICE",
  "KITCHEN_DINING",
  "LOCATION_FEATURES",
  "OUTDOOR",
  "PARKING_FACILITIES",
  "SERVICES",
];

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategory, string> = {
  SCENIC_VIEWS: "Scenic views",
  BATHROOM: "Bathroom",
  BEDROOM_LAUNDRY: "Bedroom and laundry",
  ENTERTAINMENT: "Entertainment",
  FAMILY: "Family",
  HEATING_COOLING: "Heating and cooling",
  HOME_SAFETY: "Home safety",
  INTERNET_OFFICE: "Internet and office",
  KITCHEN_DINING: "Kitchen and dining",
  LOCATION_FEATURES: "Location features",
  OUTDOOR: "Outdoor",
  PARKING_FACILITIES: "Parking and facilities",
  SERVICES: "Services",
};

/**
 * Shown in the collapsed "What this place offers" preview, in this order,
 * before falling back to whatever else the property has. These are the ones
 * guests actually scan for.
 */
export const AMENITY_PREVIEW_PRIORITY = [
  "Wi-Fi",
  "Free parking on premises",
  "Air conditioning",
  "Kitchen",
  "Washing machine",
  "TV",
  "Dedicated workspace",
  "Power backup",
  "Pool",
  "Self check-in",
  "Lift",
  "Hot water",
];

export const AMENITIES: AmenitySeed[] = [
  // ── Scenic views ────────────────────────────────────────────────────────
  { name: "City skyline view", icon: "Building2", category: "SCENIC_VIEWS" },
  { name: "Garden view", icon: "Flower2", category: "SCENIC_VIEWS" },
  { name: "Courtyard view", icon: "Fence", category: "SCENIC_VIEWS" },
  { name: "Pool view", icon: "Waves", category: "SCENIC_VIEWS" },
  { name: "Park view", icon: "TreePine", category: "SCENIC_VIEWS" },
  { name: "Valley view", icon: "Mountain", category: "SCENIC_VIEWS" },
  { name: "Lake view", icon: "Sailboat", category: "SCENIC_VIEWS" },
  { name: "River view", icon: "Waves", category: "SCENIC_VIEWS" },
  { name: "Sunrise view", icon: "Sunrise", category: "SCENIC_VIEWS" },
  { name: "Sunset view", icon: "Sunset", category: "SCENIC_VIEWS" },

  // ── Bathroom ────────────────────────────────────────────────────────────
  { name: "Bathtub", icon: "Bath", category: "BATHROOM" },
  { name: "Hair dryer", icon: "Wind", category: "BATHROOM" },
  { name: "Cleaning products", icon: "SprayCan", category: "BATHROOM" },
  { name: "Shampoo", icon: "Droplet", category: "BATHROOM" },
  { name: "Conditioner", icon: "Droplet", category: "BATHROOM" },
  { name: "Body soap", icon: "Droplets", category: "BATHROOM" },
  { name: "Hot water", icon: "ThermometerSun", category: "BATHROOM" },
  { name: "Shower gel", icon: "ShowerHead", category: "BATHROOM" },
  { name: "Bidet", icon: "Droplets", category: "BATHROOM" },
  { name: "Outdoor shower", icon: "ShowerHead", category: "BATHROOM" },

  // ── Bedroom and laundry ─────────────────────────────────────────────────
  { name: "Washing machine", icon: "WashingMachine", category: "BEDROOM_LAUNDRY" },
  { name: "Dryer", icon: "Fan", category: "BEDROOM_LAUNDRY" },
  { name: "Essentials", icon: "PackageCheck", category: "BEDROOM_LAUNDRY" },
  { name: "Hangers", icon: "Shirt", category: "BEDROOM_LAUNDRY" },
  { name: "Bed linen", icon: "BedDouble", category: "BEDROOM_LAUNDRY" },
  { name: "Extra pillows and blankets", icon: "Layers", category: "BEDROOM_LAUNDRY" },
  { name: "Room-darkening blinds", icon: "Blinds", category: "BEDROOM_LAUNDRY" },
  { name: "Iron", icon: "Zap", category: "BEDROOM_LAUNDRY" },
  { name: "Clothes drying rack", icon: "Shirt", category: "BEDROOM_LAUNDRY" },
  { name: "Wardrobe", icon: "Archive", category: "BEDROOM_LAUNDRY" },
  { name: "Mosquito net", icon: "Bug", category: "BEDROOM_LAUNDRY" },
  { name: "Safe", icon: "Lock", category: "BEDROOM_LAUNDRY" },

  // ── Entertainment ───────────────────────────────────────────────────────
  { name: "TV", icon: "Tv", category: "ENTERTAINMENT" },
  { name: "Smart TV with Netflix and Prime Video", icon: "MonitorPlay", category: "ENTERTAINMENT" },
  { name: "Sound system", icon: "Speaker", category: "ENTERTAINMENT" },
  { name: "Books and reading material", icon: "BookOpen", category: "ENTERTAINMENT" },
  { name: "Board games", icon: "Dices", category: "ENTERTAINMENT" },
  { name: "Games console", icon: "Gamepad2", category: "ENTERTAINMENT" },
  { name: "Piano", icon: "Piano", category: "ENTERTAINMENT" },
  { name: "Pool table", icon: "Circle", category: "ENTERTAINMENT" },
  { name: "Projector and screen", icon: "Projector", category: "ENTERTAINMENT" },
  { name: "Exercise equipment", icon: "Dumbbell", category: "ENTERTAINMENT" },

  // ── Family ──────────────────────────────────────────────────────────────
  { name: "Cot", icon: "Baby", category: "FAMILY" },
  { name: "Travel cot", icon: "Baby", category: "FAMILY" },
  { name: "High chair", icon: "Armchair", category: "FAMILY" },
  { name: "Baby bath", icon: "Bath", category: "FAMILY" },
  { name: "Baby monitor", icon: "Radio", category: "FAMILY" },
  { name: "Baby safety gates", icon: "DoorClosed", category: "FAMILY" },
  { name: "Children's books and toys", icon: "ToyBrick", category: "FAMILY" },
  { name: "Children's dinnerware", icon: "Utensils", category: "FAMILY" },
  { name: "Changing table", icon: "Table", category: "FAMILY" },
  { name: "Socket covers", icon: "Plug", category: "FAMILY" },
  { name: "Table corner guards", icon: "Shield", category: "FAMILY" },
  { name: "Window guards", icon: "Grid2x2", category: "FAMILY" },

  // ── Heating and cooling ─────────────────────────────────────────────────
  { name: "Air conditioning", icon: "AirVent", category: "HEATING_COOLING" },
  { name: "Ceiling fan", icon: "Fan", category: "HEATING_COOLING" },
  { name: "Portable fan", icon: "Fan", category: "HEATING_COOLING" },
  { name: "Heating", icon: "Thermometer", category: "HEATING_COOLING" },
  { name: "Room heater", icon: "Flame", category: "HEATING_COOLING" },
  { name: "Indoor fireplace", icon: "Flame", category: "HEATING_COOLING" },

  // ── Home safety ─────────────────────────────────────────────────────────
  { name: "Smoke alarm", icon: "AlarmSmoke", category: "HOME_SAFETY" },
  { name: "Carbon monoxide alarm", icon: "CircleAlert", category: "HOME_SAFETY" },
  { name: "Fire extinguisher", icon: "FireExtinguisher", category: "HOME_SAFETY" },
  { name: "First aid kit", icon: "BriefcaseMedical", category: "HOME_SAFETY" },
  { name: "Exterior security cameras", icon: "Cctv", category: "HOME_SAFETY" },
  { name: "Gated society security", icon: "ShieldCheck", category: "HOME_SAFETY" },
  { name: "Emergency exit", icon: "DoorOpen", category: "HOME_SAFETY" },

  // ── Internet and office ─────────────────────────────────────────────────
  { name: "Wi-Fi", icon: "Wifi", category: "INTERNET_OFFICE" },
  { name: "High-speed Wi-Fi (100+ Mbps)", icon: "Gauge", category: "INTERNET_OFFICE" },
  { name: "Dedicated workspace", icon: "Laptop", category: "INTERNET_OFFICE" },
  { name: "Ethernet connection", icon: "Cable", category: "INTERNET_OFFICE" },
  { name: "Printer", icon: "Printer", category: "INTERNET_OFFICE" },

  // ── Kitchen and dining ──────────────────────────────────────────────────
  { name: "Kitchen", icon: "CookingPot", category: "KITCHEN_DINING" },
  { name: "Fridge", icon: "Refrigerator", category: "KITCHEN_DINING" },
  { name: "Freezer", icon: "Snowflake", category: "KITCHEN_DINING" },
  { name: "Microwave", icon: "Microwave", category: "KITCHEN_DINING" },
  { name: "Cooking basics", icon: "Soup", category: "KITCHEN_DINING" },
  { name: "Dishes and cutlery", icon: "Utensils", category: "KITCHEN_DINING" },
  { name: "Dishwasher", icon: "Sparkles", category: "KITCHEN_DINING" },
  { name: "Induction hob", icon: "CircleDot", category: "KITCHEN_DINING" },
  { name: "Gas hob", icon: "Flame", category: "KITCHEN_DINING" },
  { name: "Oven", icon: "Cuboid", category: "KITCHEN_DINING" },
  { name: "Kettle", icon: "CupSoda", category: "KITCHEN_DINING" },
  { name: "Coffee maker", icon: "Coffee", category: "KITCHEN_DINING" },
  { name: "Toaster", icon: "Sandwich", category: "KITCHEN_DINING" },
  { name: "Blender", icon: "Blend", category: "KITCHEN_DINING" },
  { name: "Rice cooker", icon: "CookingPot", category: "KITCHEN_DINING" },
  { name: "Water purifier", icon: "GlassWater", category: "KITCHEN_DINING" },
  { name: "Wine glasses", icon: "Wine", category: "KITCHEN_DINING" },
  { name: "Dining table", icon: "Table", category: "KITCHEN_DINING" },

  // ── Location features ───────────────────────────────────────────────────
  { name: "Private entrance", icon: "DoorOpen", category: "LOCATION_FEATURES" },
  { name: "Walk to restaurants and cafés", icon: "Footprints", category: "LOCATION_FEATURES" },
  { name: "Close to public transport", icon: "BusFront", category: "LOCATION_FEATURES" },
  { name: "Laundromat nearby", icon: "WashingMachine", category: "LOCATION_FEATURES" },
  { name: "Waterfront", icon: "Waves", category: "LOCATION_FEATURES" },
  { name: "Resort access", icon: "Palmtree", category: "LOCATION_FEATURES" },

  // ── Outdoor ─────────────────────────────────────────────────────────────
  { name: "Private patio or balcony", icon: "Trees", category: "OUTDOOR" },
  { name: "Terrace", icon: "Sun", category: "OUTDOOR" },
  { name: "Garden", icon: "Flower2", category: "OUTDOOR" },
  { name: "Backyard", icon: "Fence", category: "OUTDOOR" },
  { name: "Outdoor furniture", icon: "Armchair", category: "OUTDOOR" },
  { name: "Outdoor dining area", icon: "Utensils", category: "OUTDOOR" },
  { name: "Barbecue grill", icon: "Beef", category: "OUTDOOR" },
  { name: "Fire pit", icon: "Flame", category: "OUTDOOR" },
  { name: "Sun loungers", icon: "Sun", category: "OUTDOOR" },
  { name: "Hammock", icon: "Palmtree", category: "OUTDOOR" },
  { name: "Bikes", icon: "Bike", category: "OUTDOOR" },

  // ── Parking and facilities ──────────────────────────────────────────────
  { name: "Free parking on premises", icon: "CircleParking", category: "PARKING_FACILITIES" },
  { name: "Free street parking", icon: "CircleParking", category: "PARKING_FACILITIES" },
  { name: "Paid parking on premises", icon: "SquareParking", category: "PARKING_FACILITIES" },
  { name: "EV charger", icon: "PlugZap", category: "PARKING_FACILITIES" },
  { name: "Pool", icon: "Waves", category: "PARKING_FACILITIES" },
  { name: "Private pool", icon: "Waves", category: "PARKING_FACILITIES" },
  { name: "Hot tub", icon: "Bath", category: "PARKING_FACILITIES" },
  { name: "Gym", icon: "Dumbbell", category: "PARKING_FACILITIES" },
  { name: "Lift", icon: "MoveVertical", category: "PARKING_FACILITIES" },
  { name: "Single-level home", icon: "Layers", category: "PARKING_FACILITIES" },
  { name: "Power backup", icon: "BatteryCharging", category: "PARKING_FACILITIES" },

  // ── Services ────────────────────────────────────────────────────────────
  { name: "Self check-in", icon: "KeyRound", category: "SERVICES" },
  { name: "Keypad entry", icon: "KeySquare", category: "SERVICES" },
  { name: "Lockbox", icon: "Lock", category: "SERVICES" },
  { name: "Smart lock", icon: "ScanFace", category: "SERVICES" },
  { name: "Building staff", icon: "ConciergeBell", category: "SERVICES" },
  { name: "Host greets you", icon: "HandHeart", category: "SERVICES" },
  { name: "Luggage drop-off allowed", icon: "Luggage", category: "SERVICES" },
  { name: "Long-term stays allowed", icon: "CalendarRange", category: "SERVICES" },
  { name: "Cleaning available during stay", icon: "Sparkles", category: "SERVICES" },
  { name: "Daily housekeeping", icon: "BrushCleaning", category: "SERVICES" },
  { name: "Breakfast available", icon: "Croissant", category: "SERVICES" },
  { name: "Airport pickup on request", icon: "Plane", category: "SERVICES" },
  { name: "On-call property manager", icon: "Headset", category: "SERVICES" },
  { name: "Pets allowed", icon: "PawPrint", category: "SERVICES" },
  { name: "Smoking allowed", icon: "Cigarette", category: "SERVICES" },
];

/** Name → catalogue entry, for seeding and admin lookups. */
export const AMENITY_BY_NAME = new Map(AMENITIES.map((a) => [a.name, a]));
