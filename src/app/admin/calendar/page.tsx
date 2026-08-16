import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { MasterCalendar } from "@/components/admin/master-calendar";
import { getCalendarData } from "@/lib/queries/calendar";
import { addDays, parseISODate, toISODate, todayUTC } from "@/lib/dates";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 28;

export default async function CalendarPage({
  searchParams,
}: PageProps<"/admin/calendar">) {
  const params = await searchParams;
  const fromParam = typeof params.from === "string" ? params.from : null;

  // Start a few days before "today" so recent arrivals stay visible.
  const start = fromParam ? parseISODate(fromParam) : addDays(todayUTC(), -3);
  const rows = await getCalendarData(start, WINDOW_DAYS);
  const days = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    toISODate(addDays(start, i)),
  );

  return (
    <AdminPage>
      <PageHeader
        title="Master calendar"
        description="Every unit, every night. Colour marks the booking source."
      />
      <div className="mt-6">
        <MasterCalendar
          rows={rows}
          days={days}
          startDate={toISODate(start)}
        />
      </div>
    </AdminPage>
  );
}
