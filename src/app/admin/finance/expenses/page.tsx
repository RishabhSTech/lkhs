import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { QuickAddButton } from "@/components/admin/quick-add";
import { ExpenseList } from "@/components/admin/expense-list";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { propertyScopeFilter, requireAdminPage, scopeFilter } from "@/lib/auth/guards";
import { onOperatingProperty, operatingProperty } from "@/lib/property/back-office";
import { isPayer } from "@/lib/finance/payers";
import { getReimbursementSummary, owedWhere } from "@/lib/finance/reimbursements";
import { ReimbursementPanel } from "@/components/admin/reimbursement-panel";
import { EXPENSE_SUBMIT_ROLES, FINANCE_ROLES } from "@/lib/auth/roles";
import { getExpenses } from "@/lib/queries/finance";
import { formatINR } from "@/lib/format";
import { toISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["PENDING", "PAID", "OVERDUE", "APPROVED"]);

export default async function ExpensesPage({
  searchParams,
}: PageProps<"/admin/finance/expenses">) {
  const { user, scope } = await requireAdminPage(EXPENSE_SUBMIT_ROLES);
  const isFinance = FINANCE_ROLES.includes(user.role);

  const params = await searchParams;
  const requested = typeof params.property === "string" ? params.property : undefined;
  const propertyId = requested && (!scope || scope.includes(requested)) ? requested : undefined;
  const status =
    typeof params.status === "string" && STATUSES.has(params.status) ? params.status : undefined;
  // Finance sees the whole ledger; everyone else sees what they logged.
  const createdById = isFinance ? undefined : user.id;
  // ?paidBy=AASHISH narrows to one person; with &owed=1, only what they're still owed.
  const paidBy = isPayer(params.paidBy) ? params.paidBy : undefined;
  const owedOnly = Boolean(paidBy) && params.owed === "1";

  const [expenses, properties, pendingCount, reimbursements] = await Promise.all([
    paidBy
      ? // Reimbursements span every property, including ones hidden from the back office.
        db.transaction.findMany({
          where: {
            ...(owedOnly ? owedWhere(paidBy) : { type: { in: ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] }, paidBy }),
            ...(propertyId ? { propertyId } : scope ? { propertyId: { in: scope } } : {}),
            ...(status ? { status: status as never } : {}),
            ...(createdById ? { createdById } : {}),
          },
          include: {
            category: true,
            property: { select: { id: true, name: true } },
            createdBy: { select: { name: true } },
          },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 500,
        })
      : getExpenses({ propertyId, propertyIds: scope ?? undefined, status, createdById }),
    db.property.findMany({ where: { ...propertyScopeFilter(scope), ...operatingProperty }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.transaction.count({
      where: {
        type: { in: ["EXPENSE", "INVESTMENT", "DEPOSIT_OUT"] },
        status: "PENDING",
        ...scopeFilter(scope),
        ...onOperatingProperty,
        ...(createdById ? { createdById } : {}),
      },
    }),
    isFinance && !scope ? getReimbursementSummary() : Promise.resolve(null),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <AdminPage>
      <PageHeader
        title={isFinance ? "Expenses" : "My expenses"}
        description={`${expenses.length} shown · ${formatINR(total)}`}
        actions={
          <QuickAddButton kind="expense" propertyId={propertyId}>
            <Plus />
            Add expense
          </QuickAddButton>
        }
      />

      {reimbursements && (
        <div className="mt-5">
          <ReimbursementPanel summary={reimbursements} active={paidBy && owedOnly ? paidBy : undefined} />
        </div>
      )}

      <div className="mt-5">
        <ExpenseList
          expenses={expenses.map((e) => ({
            id: e.id,
            propertyId: e.propertyId,
            propertyName: e.property.name,
            categoryId: e.categoryId,
            categoryName: e.category.name,
            type: e.type,
            amount: Number(e.amount),
            date: toISODate(e.date),
            paymentMethod: e.paymentMethod,
            status: e.status,
            description: e.description,
            receiptUrl: e.receiptUrl,
            createdById: e.createdById,
            createdByName: e.createdBy?.name ?? null,
            paidBy: e.paidBy,
            reimbursedAt: e.reimbursedAt?.toISOString() ?? null,
          }))}
          properties={properties}
          filters={{ propertyId, status, paidBy, owedOnly }}
          pendingCount={pendingCount}
          showFilters={isFinance}
        />
      </div>
    </AdminPage>
  );
}
