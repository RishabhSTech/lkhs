import Link from "next/link";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { db } from "@/lib/db";
import { buildQuote } from "@/lib/pricing/engine";
import { addDays, addMonths, todayUTC } from "@/lib/dates";
import { formatDateShort, formatINR } from "@/lib/format";
import { PricingRuleEditor } from "@/components/admin/pricing-rule-editor";
import { DailyRateEditor } from "@/components/admin/daily-rate-editor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const today = todayUTC();
  const horizon = addMonths(today, 3);

  const properties = await db.property.findMany({
    include: {
      pricingRules: { orderBy: { priority: "desc" } },
      dailyRates: { where: { date: { gte: today, lte: horizon } }, orderBy: { date: "asc" } },
    },
    orderBy: { name: "asc" },
  });

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
                    className="font-heading text-lg text-brand-blue hover:text-brand-azure"
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
                  <PricingRuleEditor
                    propertyId={property.id}
                    rules={property.pricingRules.map((rule) => ({
                      id: rule.id,
                      name: rule.name,
                      type: rule.type,
                      adjustmentType: rule.adjustmentType,
                      adjustmentValue: Number(rule.adjustmentValue),
                      isActive: rule.isActive,
                    }))}
                  />
                  <DailyRateEditor
                    propertyId={property.id}
                    overrides={property.dailyRates.map((o) => ({
                      date: o.date.toISOString().slice(0, 10),
                      price: Number(o.price),
                    }))}
                  />
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
                              ? "font-medium tabular-nums text-brand-azure"
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
