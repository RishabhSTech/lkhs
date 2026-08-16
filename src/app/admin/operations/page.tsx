import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

const CLEANING_STAGES = [
  "CHECKOUT",
  "CLEANING_REQUIRED",
  "CLEANING",
  "INSPECTION",
  "READY",
] as const;

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "border-destructive/25 bg-destructive/10 text-destructive",
  HIGH: "border-chart-2/25 bg-chart-2/10 text-chart-2",
  MEDIUM: "border-chart-4/25 bg-chart-4/10 text-chart-4",
  LOW: "border-border bg-muted text-muted-foreground",
};

export default async function OperationsPage() {
  const [cleaning, maintenance] = await Promise.all([
    db.cleaningTask.findMany({
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 60,
    }),
    db.maintenanceTask.findMany({
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Operations"
        description="Turnovers and maintenance across the portfolio."
      />

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-foreground">Cleaning board</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-5">
          {CLEANING_STAGES.map((stage) => {
            const tasks = cleaning.filter((t) => t.status === stage);
            return (
              <div
                key={stage}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    {stage.toLowerCase().replace(/_/g, " ")}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {tasks.length}
                  </span>
                </div>

                <ul className="mt-3 space-y-2">
                  {tasks.length === 0 ? (
                    <li className="text-xs text-muted-foreground">Nothing here.</li>
                  ) : (
                    tasks.slice(0, 8).map((task) => (
                      <li
                        key={task.id}
                        className="rounded-lg border border-border bg-background p-2.5"
                      >
                        <p className="text-xs font-medium text-foreground">
                          {task.property.name}
                        </p>
                        <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">
                          {formatDateLong(task.scheduledDate)}
                          {task.assignedTo && ` · ${task.assignedTo.name}`}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Maintenance</h2>
        {maintenance.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No maintenance issues logged.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {maintenance.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {task.property.name}
                    {task.assignedTo && ` · ${task.assignedTo.name}`} ·{" "}
                    {formatDateLong(task.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={PRIORITY_STYLES[task.priority]}>
                    {task.priority.toLowerCase()}
                  </Badge>
                  <Badge className="border-border bg-muted text-muted-foreground">
                    {task.status.toLowerCase().replace(/_/g, " ")}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminPage>
  );
}
