import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import { CleaningBoard } from "@/components/admin/cleaning-board";
import { MaintenanceList } from "@/components/admin/maintenance-list";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const [cleaning, maintenance, properties, staff] = await Promise.all([
    db.cleaningTask.findMany({
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 60,
    }),
    db.maintenanceTask.findMany({
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.property.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: { in: ["CLEANER", "OPERATIONS", "MANAGER"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Operations"
        description="Turnovers and maintenance across the portfolio."
      />

      <section className="mt-6">
        <CleaningBoard
          tasks={cleaning.map((t) => ({
            id: t.id,
            propertyName: t.property.name,
            scheduledDate: t.scheduledDate.toISOString(),
            status: t.status,
            assignedToId: t.assignedToId,
            assignedToName: t.assignedTo?.name ?? null,
          }))}
          staff={staff}
          properties={properties}
        />
      </section>

      <MaintenanceList
        tasks={maintenance.map((t) => ({
          id: t.id,
          title: t.title,
          propertyName: t.property.name,
          createdAt: t.createdAt.toISOString(),
          status: t.status,
          priority: t.priority,
          assignedToId: t.assignedToId,
        }))}
        staff={staff}
        properties={properties}
      />
    </AdminPage>
  );
}
