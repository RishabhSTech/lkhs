import type { BookingSource, ReservationStatus } from "@prisma/client";

export const SOURCE_LABELS: Record<BookingSource, string> = {
  DIRECT: "Direct",
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  AGODA: "Agoda",
  OTHER: "Other",
};

/**
 * Booking source is identity, so it keeps a fixed colour per channel - the
 * chart series slots, so calendar blocks and charts agree. Every use pairs the
 * colour with the channel name, never colour alone.
 */
export const SOURCE_VAR: Record<BookingSource, string> = {
  DIRECT: "var(--chart-1)",
  AIRBNB: "var(--chart-2)",
  BOOKING_COM: "var(--chart-3)",
  AGODA: "var(--chart-4)",
  OTHER: "var(--chart-5)",
};

export function sourceBadgeClass(source: BookingSource) {
  switch (source) {
    case "DIRECT":
      return "border-chart-1/25 bg-chart-1/10 text-chart-1";
    case "AIRBNB":
      return "border-chart-2/25 bg-chart-2/10 text-chart-2";
    case "BOOKING_COM":
      return "border-chart-3/25 bg-chart-3/10 text-chart-3";
    case "AGODA":
      return "border-chart-4/25 bg-chart-4/10 text-chart-4";
    default:
      return "border-chart-5/25 bg-chart-5/10 text-chart-5";
  }
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
};

export function statusBadgeClass(status: ReservationStatus) {
  switch (status) {
    case "CONFIRMED":
      return "border-chart-1/25 bg-chart-1/10 text-chart-1";
    case "COMPLETED":
      return "border-border bg-muted text-muted-foreground";
    case "PENDING":
      return "border-chart-4/25 bg-chart-4/10 text-chart-4";
    case "CANCELLED":
    case "NO_SHOW":
      return "border-destructive/25 bg-destructive/10 text-destructive";
  }
}
