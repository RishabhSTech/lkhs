import { redirect } from "next/navigation";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { UserManager } from "@/components/admin/user-manager";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { user } = await getCurrentAdminUser();

  if (user.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  const users = await db.user.findMany({
    include: { propertyAssignments: { include: { property: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });

  return (
    <AdminPage>
      <PageHeader
        title="Users"
        description="Create, edit and manage backend team access for the business."
      />

      <UserManager initialUsers={users.map((member) => ({
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        propertyAssignments: member.propertyAssignments.map((assignment) => ({
          property: { name: assignment.property.name },
        })),
      }))} />
    </AdminPage>
  );
}
