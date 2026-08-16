const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(value: number) {
  return inr.format(Math.round(value));
}

/** Compact Indian-style money for KPI tiles: ₹1.82L, ₹4.2Cr, ₹82K. */
export function formatINRCompact(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${Math.round(abs / 1_000)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatDateShort(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatDateLong(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(from: Date | string, to: Date | string) {
  const a = new Date(from);
  const b = new Date(to);
  const sameMonth =
    a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    })}`;
  }
  return `${formatDateShort(a)} – ${formatDateLong(b)}`;
}

export function formatMonth(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
  });
}
