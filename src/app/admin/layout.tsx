import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, isDemoFallback } = await getCurrentAdminUser();

  const [notifications, properties] = await Promise.all([
    db.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.property.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex min-h-svh bg-brand-ivory">
      <AdminSidebar role={user.role} userName={user.name} />

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <AdminTopBar
          userName={user.name}
          notifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            severity: n.severity,
            link: n.link,
            createdAt: n.createdAt.toISOString(),
          }))}
          properties={properties}
          isDemoFallback={isDemoFallback}
        />
        <main className="flex-1">{children}</main>
      </div>

      <AdminMobileNav role={user.role} />
    </div>
  );
}
