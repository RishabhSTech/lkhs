import type { Metadata, Viewport } from "next";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminTopBar } from "@/components/admin/admin-top-bar";
import { QuickAddProvider } from "@/components/admin/quick-add";
import { getCurrentAdminUser } from "@/lib/auth/current-user";
import { getPropertyScope, propertyScopeFilter } from "@/lib/auth/guards";
import { CLEANING_STAFF_ROLES } from "@/lib/auth/roles";
import { getUnreadNotifications } from "@/lib/queries/admin-metrics";
import { getExpenseCategories } from "@/lib/queries/finance";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Installed to the home screen, the back office runs full-screen like an app.
export const metadata: Metadata = {
  title: "Back office",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Lime Kraft", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1a33" },
  ],
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { user, isDemoFallback } = await getCurrentAdminUser();
  const scope = await getPropertyScope(user);

  const [notifications, properties, categories, staff] = await Promise.all([
    scope ? Promise.resolve([]) : getUnreadNotifications(),
    db.property.findMany({
      where: propertyScopeFilter(scope),
      select: {
        id: true,
        name: true,
        slug: true,
        units: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
    getExpenseCategories(),
    db.user.findMany({
      where: { role: { in: CLEANING_STAFF_ROLES } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <QuickAddProvider
      data={{
        role: user.role,
        userId: user.id,
        properties: properties.map((p) => ({ id: p.id, name: p.name, units: p.units })),
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          group: c.group,
          isRefundableDeposit: c.isRefundableDeposit,
        })),
        staff,
      }}
    >
      <div className="admin-app flex min-h-svh bg-muted/30">
        <AdminSidebar role={user.role} userName={user.name} scoped={Boolean(scope)} />

        <div className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <AdminTopBar
            role={user.role}
            scoped={Boolean(scope)}
            userName={user.name}
            notifications={
              user.role === "CLEANER"
                ? []
                : notifications.map((n) => ({
                    id: n.id,
                    title: n.title,
                    body: n.body,
                    severity: n.severity,
                    link: n.link,
                    createdAt: n.createdAt.toISOString(),
                  }))
            }
            properties={properties.map(({ id, name, slug }) => ({ id, name, slug }))}
            isDemoFallback={isDemoFallback}
          />
          <main className="flex-1">{children}</main>
        </div>

        <AdminMobileNav role={user.role} userName={user.name} scoped={Boolean(scope)} />
      </div>
    </QuickAddProvider>
  );
}
