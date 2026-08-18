import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { pgPoolConfig } from "../src/lib/db-config";
import { TRANSACTION_CATEGORY_DEFS } from "./seed-data";

/**
 * Bootstraps just the TransactionCategory rows application code assumes
 * exist (postBookingFinancials, the budget routes, the recurring-expense
 * rollover all look categories up by group+name) — without the full demo
 * seed in seed.ts, which wipes every table. Safe to run repeatedly: each
 * category is upserted on its (name, group) unique constraint.
 *
 * Used by CI against a bare, freshly migrated database, and usable the same
 * way against any fresh non-demo deployment.
 */
async function main() {
  const db = new PrismaClient({ adapter: new PrismaPg(pgPoolConfig()) });
  let count = 0;

  for (const def of TRANSACTION_CATEGORY_DEFS) {
    for (const name of def.names) {
      await db.transactionCategory.upsert({
        where: { name_group: { name, group: def.group } },
        create: {
          name,
          group: def.group,
          isRefundableDeposit: def.refundable?.includes(name) ?? false,
        },
        update: {},
      });
      count += 1;
    }
  }

  console.log(`[seed-reference-data] ensured ${count} transaction categories exist`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
