import { Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CleaningTasks } from "@/components/admin/cleaning-tasks";
import { CleaningTeam } from "@/components/admin/cleaning-team";
import { MaintenanceList } from "@/components/admin/maintenance-list";
import { QuickAddButton } from "@/components/admin/quick-add";
import type { CleaningTaskRecord } from "@/components/admin/cleaning-task-sheet";
import { db } from "@/lib/db";
import { propertyScopeFilter, requireAdminPage, scopeFilter } from "@/lib/auth/guards";
import { CLEANING_MANAGE_ROLES, CLEANING_STAFF_ROLES } from "@/lib/auth/roles";
import { addDays, toISODate, todayUTC } from "@/lib/dates";
import { syncTurnoverTasks } from "@/lib/operations/turnovers";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const { user, scope } = await requireAdminPage();
  const canManage = CLEANING_MANAGE_ROLES.includes(user.role);
  const isCleaner = user.role === "CLEANER";

  await syncTurnoverTasks().catch((error) => {
    // The list still renders from what's already scheduled.
    console.error("Turnover sync failed", error);
  });

  const today = todayUTC();
  const weekAgo = addDays(today, -7);

  const [cleaning, upcomingStays, maintenance, properties, staff] = await Promise.all([
    db.cleaningTask.findMany({
      where: {
        AND: [
          scopeFilter(scope),
          { OR: [{ status: { not: "READY" } }, { completedAt: { gte: weekAgo } }, { scheduledDate: { gte: weekAgo } }] },
          ...(isCleaner ? [{ OR: [{ assignedToId: user.id }, { assignedToId: null }] }] : []),
        ],
      },
      include: {
        property: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
        reservation: { select: { id: true, code: true, guest: { select: { name: true } } } },
      },
      orderBy: { scheduledDate: "asc" },
      take: 300,
    }),
    db.reservation.findMany({
      where: { ...scopeFilter(scope), status: { in: ["CONFIRMED", "PENDING"] }, checkIn: { gte: addDays(today, -7) } },
      select: { propertyId: true, checkIn: true, guest: { select: { name: true } } },
      orderBy: { checkIn: "asc" },
      take: 500,
    }),
    isCleaner
      ? Promise.resolve([])
      : db.maintenanceTask.findMany({
          where: scopeFilter(scope),
          include: {
            property: { select: { name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        }),
    db.property.findMany({ where: propertyScopeFilter(scope), select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.user.findMany({
      where: { role: { in: CLEANING_STAFF_ROLES } },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        propertyAssignments: { select: { propertyId: true } },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  function nextArrival(propertyId: string, from: Date) {
    const stay = upcomingStays.find((r) => r.propertyId === propertyId && r.checkIn >= from);
    return stay ? { date: toISODate(stay.checkIn), guestName: stay.guest.name } : null;
  }

  const tasks: CleaningTaskRecord[] = cleaning.map((t) => ({
    id: t.id,
    propertyId: t.propertyId,
    propertyName: t.property.name,
    scheduledDate: toISODate(t.scheduledDate),
    status: t.status,
    assignedToId: t.assignedToId,
    assignedToName: t.assignedTo?.name ?? null,
    notes: t.notes,
    completedAt: t.completedAt?.toISOString() ?? null,
    reservation: t.reservation
      ? { id: t.reservation.id, code: t.reservation.code, guestName: t.reservation.guest.name }
      : null,
    nextArrival: nextArrival(t.propertyId, t.scheduledDate),
  }));

  const todayISO = toISODate(today);
  const team = staff.map((m) => {
    const mine = cleaning.filter((t) => t.assignedToId === m.id);
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      phone: m.phone,
      propertyIds: m.propertyAssignments.map((a) => a.propertyId),
      openTasks: mine.filter((t) => t.status !== "READY").length,
      dueToday: mine.filter((t) => t.status !== "READY" && toISODate(t.scheduledDate) <= todayISO).length,
      doneThisWeek: mine.filter((t) => t.status === "READY" && t.completedAt && t.completedAt >= weekAgo).length,
    };
  });
  const unassignedOpen = cleaning.filter((t) => t.status !== "READY" && !t.assignedToId).length;

  const tasksView = (
    <CleaningTasks
      tasks={tasks}
      today={todayISO}
      userId={user.id}
      canManage={canManage}
      properties={properties}
      staff={staff.map(({ id, name }) => ({ id, name }))}
    />
  );

  return (
    <AdminPage>
      <PageHeader
        title={isCleaner ? `Hi ${user.name.split(" ")[0]}` : "Cleaning & upkeep"}
        description={
          isCleaner
            ? "Your turnovers. Tap the big button as you go."
            : "Turnovers are created automatically from confirmed checkouts."
        }
        actions={
          canManage ? (
            <QuickAddButton kind="cleaning" variant="outline">
              <Plus />
              Schedule cleaning
            </QuickAddButton>
          ) : undefined
        }
      />

      <div className="mt-5">
        {isCleaner ? (
          tasksView
        ) : (
          <Tabs defaultValue="tasks">
            <TabsList className="w-full lg:w-fit">
              <TabsTrigger value="tasks" className="flex-1 lg:flex-none lg:px-4">
                Tasks
              </TabsTrigger>
              <TabsTrigger value="team" className="flex-1 lg:flex-none lg:px-4">
                Team
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="flex-1 lg:flex-none lg:px-4">
                Maintenance
              </TabsTrigger>
            </TabsList>
            <TabsContent value="tasks" className="mt-4">
              {tasksView}
            </TabsContent>
            <TabsContent value="team" className="mt-4">
              <CleaningTeam
                members={team}
                properties={properties}
                canManage={canManage}
                unassignedOpen={unassignedOpen}
              />
            </TabsContent>
            <TabsContent value="maintenance" className="mt-4">
              <MaintenanceList
                tasks={maintenance.map((t) => ({
                  id: t.id,
                  title: t.title,
                  propertyId: t.propertyId,
                  propertyName: t.property.name,
                  createdAt: t.createdAt.toISOString(),
                  status: t.status,
                  priority: t.priority,
                  assignedToId: t.assignedToId,
                }))}
                staff={staff.map(({ id, name }) => ({ id, name }))}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminPage>
  );
}
