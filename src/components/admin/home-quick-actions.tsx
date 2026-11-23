"use client";

import { CalendarPlus, Receipt, Wrench } from "lucide-react";
import { useQuickAdd } from "@/components/admin/quick-add";

/** The three things people come to the back office to do, one tap away. */
export function HomeQuickActions() {
  const { can, openBooking, openExpense, openMaintenance } = useQuickAdd();
  const actions = [
    can.booking && { key: "booking", label: "Add a booking", icon: CalendarPlus, tone: "bg-chart-1/12 text-chart-1", run: () => openBooking({}) },
    can.expense && { key: "expense", label: "Add an expense", icon: Receipt, tone: "bg-chart-4/14 text-chart-4", run: () => openExpense({}) },
    can.maintenance && { key: "repair", label: "Report a repair", icon: Wrench, tone: "bg-destructive/10 text-destructive", run: () => openMaintenance({}) },
  ].filter(Boolean) as { key: string; label: string; icon: typeof Receipt; tone: string; run: () => void }[];

  if (actions.length === 0) return null;
  return (
    <div className="mt-5 grid grid-cols-3 gap-2.5 sm:max-w-xl">
      {actions.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.run}
          className="soft-card flex flex-col items-center gap-2 px-2 py-4 text-center transition-transform active:scale-[0.97]"
        >
          <span className={`grid size-11 place-items-center rounded-2xl ${a.tone}`}>
            <a.icon className="size-5" />
          </span>
          <span className="text-[0.8125rem] leading-tight font-medium text-foreground">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
