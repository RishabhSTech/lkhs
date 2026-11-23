"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { RoleName } from "@prisma/client";
import { CalendarPlus, Receipt, Sparkles, Wrench } from "lucide-react";
import { ResponsiveSheet } from "@/components/admin/responsive-sheet";
import { ExpenseSheet, type ExpenseCategoryOption, type ExpenseRecord } from "@/components/admin/expense-sheet";
import { BookingSheet, type BookingProperty, type BookingRecord } from "@/components/admin/booking-sheet";
import { CleaningTaskSheet, type CleaningTaskRecord } from "@/components/admin/cleaning-task-sheet";
import { MaintenanceSheet, type MaintenanceRecord } from "@/components/admin/maintenance-sheet";
import {
  BOOKING_WRITE_ROLES, CLEANING_MANAGE_ROLES, EXPENSE_SUBMIT_ROLES, MAINTENANCE_REPORT_ROLES,
} from "@/lib/auth/roles";

export type QuickAddData = {
  role: RoleName;
  userId: string;
  properties: BookingProperty[];
  categories: ExpenseCategoryOption[];
  staff: { id: string; name: string }[];
};

type QuickAddContext = {
  data: QuickAddData;
  can: { booking: boolean; expense: boolean; cleaning: boolean; manageCleaning: boolean; maintenance: boolean };
  openMenu: () => void;
  openExpense: (opts?: { propertyId?: string; expense?: ExpenseRecord }) => void;
  openBooking: (opts?: {
    propertyId?: string;
    checkIn?: string;
    booking?: BookingRecord;
    onSaved?: (id: string) => void;
  }) => void;
  openCleaning: (opts?: { propertyId?: string; scheduledDate?: string; task?: CleaningTaskRecord }) => void;
  openMaintenance: (opts?: { propertyId?: string; task?: MaintenanceRecord }) => void;
};

const Ctx = createContext<QuickAddContext | null>(null);

export function useQuickAdd() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useQuickAdd must be used inside <QuickAddProvider>");
  return ctx;
}

type Open<T> = { open: boolean; session: number; opts: T };

function useSheetState<T>(initial: T) {
  const [state, setState] = useState<Open<T>>({ open: false, session: 0, opts: initial });
  const show = useCallback((opts: T) => setState((s) => ({ open: true, session: s.session + 1, opts })), []);
  const setOpen = useCallback((open: boolean) => setState((s) => ({ ...s, open })), []);
  return [state, show, setOpen] as const;
}

export function QuickAddProvider({ data, children }: { data: QuickAddData; children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expense, showExpense, setExpenseOpen] = useSheetState<{ propertyId?: string; expense?: ExpenseRecord }>({});
  const [booking, showBooking, setBookingOpen] = useSheetState<{
    propertyId?: string;
    checkIn?: string;
    booking?: BookingRecord;
    onSaved?: (id: string) => void;
  }>({});
  const [cleaning, showCleaning, setCleaningOpen] = useSheetState<{
    propertyId?: string;
    scheduledDate?: string;
    task?: CleaningTaskRecord;
  }>({});
  const [maintenance, showMaintenance, setMaintenanceOpen] = useSheetState<{
    propertyId?: string;
    task?: MaintenanceRecord;
  }>({});

  const can = useMemo(
    () => ({
      booking: BOOKING_WRITE_ROLES.includes(data.role),
      expense: EXPENSE_SUBMIT_ROLES.includes(data.role),
      cleaning: CLEANING_MANAGE_ROLES.includes(data.role),
      manageCleaning: CLEANING_MANAGE_ROLES.includes(data.role),
      maintenance: MAINTENANCE_REPORT_ROLES.includes(data.role),
    }),
    [data.role],
  );

  // A sheet opening while the menu is closing would fight over focus, so the
  // menu closes first and the sheet opens on the next frame.
  const fromMenu = useCallback((fn: () => void) => {
    setMenuOpen(false);
    window.setTimeout(fn, 180);
  }, []);

  const value = useMemo<QuickAddContext>(
    () => ({
      data,
      can,
      openMenu: () => setMenuOpen(true),
      openExpense: (opts = {}) => showExpense(opts),
      openBooking: (opts = {}) => showBooking(opts),
      openCleaning: (opts = {}) => showCleaning(opts),
      openMaintenance: (opts = {}) => showMaintenance(opts),
    }),
    [data, can, showExpense, showBooking, showCleaning, showMaintenance],
  );

  const actions = [
    can.booking && {
      key: "booking",
      label: "Booking",
      hint: "Phone, walk-in or OTA",
      icon: CalendarPlus,
      tone: "bg-chart-1/12 text-chart-1",
      run: () => fromMenu(() => showBooking({})),
    },
    can.expense && {
      key: "expense",
      label: "Expense",
      hint: "Snap the receipt",
      icon: Receipt,
      tone: "bg-chart-4/12 text-chart-4",
      run: () => fromMenu(() => showExpense({})),
    },
    can.cleaning && {
      key: "cleaning",
      label: "Cleaning",
      hint: "One-off or deep clean",
      icon: Sparkles,
      tone: "bg-chart-3/12 text-chart-3",
      run: () => fromMenu(() => showCleaning({})),
    },
    can.maintenance && {
      key: "maintenance",
      label: "Report an issue",
      hint: "Something broken or missing",
      icon: Wrench,
      tone: "bg-destructive/10 text-destructive",
      run: () => fromMenu(() => showMaintenance({})),
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    hint: string;
    icon: typeof Receipt;
    tone: string;
    run: () => void;
  }[];

  return (
    <Ctx.Provider value={value}>
      {children}

      <ResponsiveSheet open={menuOpen} onOpenChange={setMenuOpen} title="Add new" size="sm">
        <ul className="grid gap-2 pb-2">
          {actions.map((a) => (
            <li key={a.key}>
              <button
                type="button"
                onClick={a.run}
                className="flex w-full items-center gap-3.5 soft-card p-3.5 text-left transition-colors active:bg-muted"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${a.tone}`}>
                  <a.icon className="size-5" />
                </span>
                <span>
                  <span className="block text-base font-semibold text-foreground">{a.label}</span>
                  <span className="block text-xs text-muted-foreground">{a.hint}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ResponsiveSheet>

      {can.expense && (
        <ExpenseSheet
          open={expense.open}
          onOpenChange={setExpenseOpen}
          session={expense.session}
          role={data.role}
          userId={data.userId}
          properties={data.properties}
          categories={data.categories}
          defaultPropertyId={expense.opts.propertyId}
          expense={expense.opts.expense}
        />
      )}
      {can.booking && (
        <BookingSheet
          open={booking.open}
          onOpenChange={setBookingOpen}
          session={booking.session}
          properties={data.properties}
          booking={booking.opts.booking}
          defaults={{ propertyId: booking.opts.propertyId, checkIn: booking.opts.checkIn }}
          onSaved={booking.opts.onSaved}
        />
      )}
      <CleaningTaskSheet
        open={cleaning.open}
        onOpenChange={setCleaningOpen}
        session={cleaning.session}
        canManage={can.manageCleaning}
        properties={data.properties}
        staff={data.staff}
        task={cleaning.opts.task}
        defaults={{ propertyId: cleaning.opts.propertyId, scheduledDate: cleaning.opts.scheduledDate }}
      />
      {can.maintenance && (
        <MaintenanceSheet
          open={maintenance.open}
          onOpenChange={setMaintenanceOpen}
          session={maintenance.session}
          canManage={can.manageCleaning}
          properties={data.properties}
          staff={data.staff}
          task={maintenance.opts.task}
          defaultPropertyId={maintenance.opts.propertyId}
        />
      )}
    </Ctx.Provider>
  );
}

/** Drop-in button for server-rendered pages. */
export function QuickAddButton({
  kind,
  propertyId,
  children,
  className,
  variant = "default",
}: {
  kind: "expense" | "booking" | "cleaning";
  propertyId?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline";
}) {
  const qa = useQuickAdd();
  const allowed = kind === "booking" ? qa.can.booking : kind === "expense" ? qa.can.expense : qa.can.cleaning;
  if (!allowed) return null;
  const run = () =>
    kind === "expense"
      ? qa.openExpense({ propertyId })
      : kind === "booking"
        ? qa.openBooking({ propertyId })
        : qa.openCleaning({ propertyId });
  return (
    <button
      type="button"
      onClick={run}
      className={
        className ??
        (variant === "outline"
          ? "inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[0.8125rem] font-semibold text-foreground hover:bg-muted [&_svg]:size-3.5"
          : "inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[0.8125rem] font-semibold text-primary-foreground hover:bg-primary/90 [&_svg]:size-3.5")
      }
    >
      {children}
    </button>
  );
}
