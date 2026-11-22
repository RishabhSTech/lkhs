/**
 * Properties can be retired from back-office work (finance, calendar,
 * dashboards, operations) while staying live on the public site. These are
 * the Prisma filters that keep such properties out of those views.
 *
 * Config screens (properties, pricing, channels, users, settings) and the
 * reservations list deliberately do not apply them, so a retired property can
 * still be managed and any booking it receives is never hidden.
 */

/** Filter for the Property model itself. */
export const operatingProperty = { excludeFromBackOffice: false } as const;

/** Filter for models with a `property` relation (Reservation, Transaction, CleaningTask, ...). */
export const onOperatingProperty = { property: operatingProperty } as const;

/** Filter for models with a `unit` relation (InventoryNight). */
export const onOperatingUnit = { unit: onOperatingProperty } as const;
