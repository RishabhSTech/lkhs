"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AREAS = [
  "Anywhere in Indore",
  "Vijay Nagar",
  "Palasia",
  "Central Indore",
  "Rau",
  "Bicholi Mardana",
];

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function SearchPanel({
  variant = "floating",
  className,
  defaults,
}: {
  variant?: "floating" | "inline";
  className?: string;
  defaults?: { where?: string; checkIn?: string; checkOut?: string; guests?: number };
}) {
  const router = useRouter();
  const [where, setWhere] = useState(defaults?.where ?? AREAS[0]);
  const [checkIn, setCheckIn] = useState(defaults?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(defaults?.checkOut ?? "");
  const [guests, setGuests] = useState(defaults?.guests ?? 2);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (where && where !== AREAS[0]) params.set("area", where);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    params.set("guests", String(guests));
    router.push(`/stays?${params.toString()}`);
  }

  const fieldClass =
    "w-full bg-transparent text-sm font-medium text-brand-ink outline-none placeholder:text-muted-foreground";
  const labelClass =
    "flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase";

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl bg-white p-2 shadow-[0_8px_40px_-12px_rgba(36,58,50,0.28)]",
        variant === "floating" && "ring-1 ring-black/5",
        className,
      )}
    >
      <div className="grid gap-px overflow-hidden rounded-xl bg-border/60 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto]">
        <label className="flex flex-col gap-1.5 bg-white px-4 py-3">
          <span className={labelClass}>
            <MapPin className="size-3" /> Where
          </span>
          <select
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            className={cn(fieldClass, "cursor-pointer")}
          >
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 bg-white px-4 py-3">
          <span className={labelClass}>
            <CalendarDays className="size-3" /> Check-in
          </span>
          <input
            type="date"
            value={checkIn}
            min={todayISO()}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && e.target.value >= checkOut) setCheckOut("");
            }}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 bg-white px-4 py-3">
          <span className={labelClass}>
            <CalendarDays className="size-3" /> Check-out
          </span>
          <input
            type="date"
            value={checkOut}
            min={checkIn || todayISO(1)}
            onChange={(e) => setCheckOut(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 bg-white px-4 py-3">
          <span className={labelClass}>
            <Users className="size-3" /> Guests
          </span>
          <input
            type="number"
            min={1}
            max={16}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
            className={fieldClass}
          />
        </label>

        <div className="flex items-stretch bg-white p-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" size="lg" className="w-full lg:aspect-square lg:w-auto lg:px-5">
            <Search />
            <span className="lg:hidden">Find a stay</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
