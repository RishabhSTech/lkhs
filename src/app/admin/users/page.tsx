import { redirect } from "next/navigation";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { UserManager } from "@/components/admin/user-manager";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { STAFF_USER_ROLES } from "@/lib/admin/user-management";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { user } = await getCurrentAdminUser();

  if (user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const [users, properties] = await Promise.all([
    db.user.findMany({
      where: { role: { in: STAFF_USER_ROLES } },
      include: { propertyAssignments: { include: { property: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    }),
    db.property.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Users"
        description="Who can get into the back office, and what each of them can do."
      />

      <UserManager properties={properties} initialUsers={users.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        propertyAssignments: member.propertyAssignments.map((assignment) => ({
          property: { id: assignment.property.id, name: assignment.property.name },
        })),
      }))} />
    </AdminPage>
  );
}
