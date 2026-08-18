import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { db } from "@/lib/db";
import { getExpenses } from "@/lib/queries/finance";
import { formatDateLong, formatINR } from "@/lib/format";
import { ExpenseFilters } from "@/components/admin/expense-filters";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Expense",
  INVESTMENT: "Investment",
  DEPOSIT_OUT: "Deposit",
};

function statusClass(status: string) {
  switch (status) {
    case "PAID":
    case "APPROVED":
      return "border-chart-1/25 bg-chart-1/10 text-chart-1";
    case "PENDING":
      return "border-chart-4/25 bg-chart-4/10 text-chart-4";
    default:
      return "border-destructive/25 bg-destructive/10 text-destructive";
  }
}

export default async function ExpensesPage({
  searchParams,
}: PageProps<"/admin/finance/expenses">) {
  const params = await searchParams;
  const propertyId = typeof params.property === "string" ? params.property : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  const [expenses, properties] = await Promise.all([
    getExpenses({ propertyId, status }),
    db.property.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <AdminPage>
      <PageHeader
        title="Expenses"
        description={`${expenses.length} records · ${formatINR(total)} total`}
        actions={
          <Button render={<Link href="/admin/finance/expenses/new" />} size="sm">
            <Plus />
            Add expense
          </Button>
        }
      />

      <div className="mt-6">
        <ExpenseFilters
          properties={properties}
          filters={{ propertyId, status }}
        />
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No expenses recorded"
          description="Add your first expense and it will show up in the property's P&L straight away."
          action={{ href: "/admin/finance/expenses/new", label: "Add an expense" }}
        />
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["Date", "Property", "Category", "Type", "Description", "Status", "Amount"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase last:text-right"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateLong(e.date)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/finance/property/${e.property.id}`}
                        className="text-foreground hover:text-brand-azure"
                      >
                        {e.property.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">{e.category.name}</td>
                    <td className="px-4 py-3">
                      <Badge className="border-border bg-muted text-muted-foreground">
                        {TYPE_LABELS[e.type] ?? e.type}
                      </Badge>
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {e.description}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusClass(e.status)}>
                        {e.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-foreground">
                      {formatINR(Number(e.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-4 space-y-2.5 lg:hidden">
            {expenses.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {e.category.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.property.name}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {formatINR(Number(e.amount))}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateLong(e.date)}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Badge className="border-border bg-muted text-muted-foreground">
                    {TYPE_LABELS[e.type] ?? e.type}
                  </Badge>
                  <Badge className={statusClass(e.status)}>
                    {e.status.toLowerCase()}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminPage>
  );
}
