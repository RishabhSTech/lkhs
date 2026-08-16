import Link from "next/link";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { buildQuote } from "@/lib/pricing/engine";
import { addDays, todayUTC } from "@/lib/dates";
import { formatDateShort, formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const properties = await db.property.findMany({
    include: { pricingRules: { orderBy: { priority: "desc" } } },
    orderBy: { name: "asc" },
  });

  const today = todayUTC();

  return (
    <AdminPage>
      <PageHeader
        title="Pricing"
        description="Base rates and the rules layered on top of them."
      />

      <div className="mt-6 space-y-5">
        {properties.map((property) => {
          // Preview the next seven nights with the rules actually applied.
          const preview = buildQuote({
            basePrice: Number(property.basePrice),
            cleaningFee: 0,
            checkIn: today,
            checkOut: addDays(today, 7),
            rules: property.pricingRules,
          });

          return (
            <section
              key={property.id}
              className="rounded-xl border border-border bg-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <Link
                    href={`/admin/properties/${property.id}`}
                    className="font-heading text-lg text-brand-green hover:text-brand-terracotta"
                  >
                    {property.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Base rate {formatINR(Number(property.basePrice))} / night
                  </p>
                </div>
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-2">
                <div>
                  <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    Active rules
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {property.pricingRules.map((rule) => (
                      <li
                        key={rule.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-foreground">{rule.name}</span>
                        <span className="flex items-center gap-2">
                          <Badge className="border-border bg-muted text-muted-foreground">
                            {rule.type.toLowerCase().replace(/_/g, " ")}
                          </Badge>
                          <span
                            className={
                              Number(rule.adjustmentValue) >= 0
                                ? "font-medium tabular-nums text-chart-1"
                                : "font-medium tabular-nums text-chart-2"
                            }
                          >
                            {Number(rule.adjustmentValue) > 0 ? "+" : ""}
                            {Number(rule.adjustmentValue)}
                            {rule.adjustmentType === "PERCENT" ? "%" : "₹"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    Next seven nights
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {preview.nights.map((night) => (
                      <li
                        key={night.date}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {formatDateShort(night.date)}
                          {night.appliedRules.length > 0 && (
                            <span className="ml-2 text-xs">
                              {night.appliedRules.join(", ")}
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            night.price !== night.basePrice
                              ? "font-medium tabular-nums text-brand-terracotta"
                              : "tabular-nums text-foreground"
                          }
                        >
                          {formatINR(night.price)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </AdminPage>
  );
}
