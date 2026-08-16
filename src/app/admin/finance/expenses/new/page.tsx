import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { ExpenseForm } from "@/components/admin/expense-form";
import { db } from "@/lib/db";
import { getExpenseCategories } from "@/lib/queries/finance";

export const dynamic = "force-dynamic";

export default async function NewExpensePage({
  searchParams,
}: PageProps<"/admin/finance/expenses/new">) {
  const params = await searchParams;
  const [properties, categories] = await Promise.all([
    db.property.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    getExpenseCategories(),
  ]);

  return (
    <AdminPage>
      <Link
        href="/admin/finance/expenses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green"
      >
        <ArrowLeft className="size-4" />
        Back to expenses
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Add an expense"
          description="Recorded against a property and reflected in its P&L immediately."
        />
      </div>

      <div className="mt-6 max-w-2xl">
        <ExpenseForm
          properties={properties}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            group: c.group,
            isRefundableDeposit: c.isRefundableDeposit,
          }))}
          defaultPropertyId={
            typeof params.property === "string" ? params.property : undefined
          }
        />
      </div>
    </AdminPage>
  );
}
