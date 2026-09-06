import { cn } from "@/lib/utils";

function MonthGrid({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="mx-auto h-[--cell-size] w-28 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 42 }, (_, cell) => (
          <div
            key={cell}
            className="size-[--cell-size] animate-pulse rounded-md bg-muted/60"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Stand-in for the real calendar while its chunk arrives.
 *
 * `Calendar` pulls in `react-day-picker` and its `date-fns` helpers - around
 * 21 kB gzipped - for a control that only ever appears inside a popover. Both
 * pickers load it on demand instead, so the homepage and the listing pages no
 * longer ship a date picker to visitors who never open one.
 *
 * Sized to the grid it replaces (seven columns of `--cell-size`, six week rows
 * plus the caption) so the popover does not jump when the real one lands.
 *
 * `months={2}` mirrors `useMonthCount` in the search panel, which shows a
 * second month from 40rem up. It is expressed as a media query here rather
 * than a hook result because this renders from module scope, before the
 * component that would measure the viewport exists.
 */
export function CalendarSkeleton({ months = 1 }: { months?: 1 | 2 }) {
  return (
    <div
      className="flex gap-4 p-3 [--cell-size:--spacing(9)]"
      role="status"
      aria-label="Loading calendar"
    >
      <MonthGrid />
      {months === 2 && <MonthGrid className="hidden sm:flex" />}
    </div>
  );
}
