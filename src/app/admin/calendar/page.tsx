import Link from "next/link";
import { CalendarRange, LayoutList } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { MasterCalendar } from "@/components/admin/master-calendar";
import { PropertyMonthCalendar } from "@/components/admin/property-month-calendar";
import { Button } from "@/components/ui/button";
import { getCalendarData } from "@/lib/queries/calendar";
import {
  getPropertyMonth, getPropertyNavigation,
} from "@/lib/queries/property-calendar";
import { addDays, parseISODate, toISODate, todayUTC } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 28;

export default async function CalendarPage({
  searchParams,
}: PageProps<"/admin/calendar">) {
  const params = await searchParams;
  const propertyId = typeof params.property === "string" ? params.property : null;
  const monthParam = typeof params.month === "string" ? params.month : null;
  const isMonthView =
    params.view === "month" || Boolean(propertyId) || Boolean(monthParam);

  const navigation = await getPropertyNavigation();

  // Per-property month view
  if (isMonthView && navigation.length > 0) {
    const activeId = propertyId ?? navigation[0]?.id;
    const month = monthParam
      ? parseISODate(`${monthParam}-01`)
      : todayUTC();

    const data = await getPropertyMonth(activeId, month);

    return (
      <AdminPage>
        <PageHeader
          title="Calendar"
          description="One property at a time, a full month at a glance."
          actions={<ViewToggle active="month" />}
        />
        <div className="mt-6">
          <PropertyMonthCalendar
            property={data.property}
            month={data.month}
            unitRows={data.unitRows}
            occupancyPercent={data.occupancyPercent}
            nightsBooked={data.nightsBooked}
            capacity={data.capacity}
            navigation={navigation}
          />
        </div>
      </AdminPage>
    );
  }

  // Multi-property timeline view
  const fromParam = typeof params.from === "string" ? params.from : null;
  const start = fromParam ? parseISODate(fromParam) : addDays(todayUTC(), -3);
  const rows = await getCalendarData(start, WINDOW_DAYS);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    toISODate(addDays(start, i)),
  );

  return (
    <AdminPage>
      <PageHeader
        title="Calendar"
        description="Every unit, every night. Colour marks the booking source."
        actions={<ViewToggle active="timeline" />}
      />
      <div className="mt-6">
        <MasterCalendar rows={rows} days={days} startDate={toISODate(start)} />
      </div>
    </AdminPage>
  );
}

function ViewToggle({ active }: { active: "timeline" | "month" }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
      <Button
        render={<Link href="/admin/calendar" />}
        variant="ghost"
        size="sm"
        className={cn(active === "timeline" && "bg-muted text-foreground")}
      >
        <LayoutList />
        All properties
      </Button>
      <Button
        render={<Link href="/admin/calendar?view=month" />}
        variant="ghost"
        size="sm"
        className={cn(active === "month" && "bg-muted text-foreground")}
      >
        <CalendarRange />
        Month view
      </Button>
    </div>
  );
}
