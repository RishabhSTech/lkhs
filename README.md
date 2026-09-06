# Lime Kraft Home Stays

A hospitality platform for a small boutique property collection in Indore: a
guest-facing booking site, a property management system, a property-level
finance module, and a read-only stakeholder portal - all on one data model.

## Running it

The app needs Node 20+. If you don't have Node installed locally, everything
below works through Docker (`docker compose run --rm app <command>`).

```bash
cp .env.example .env          # fill in DATABASE_URL and AUTH_SECRET
npm install
npx prisma migrate deploy     # or `migrate dev` when changing the schema
npx tsx prisma/seed.ts        # demo portfolio: 5 properties, ~250 bookings
npm run dev
```

Then open http://localhost:3000.

Optional local services for caching, background jobs and uploads:

```bash
docker compose up -d redis minio
```

### Database

`DATABASE_URL` points at Postgres. With Supabase, use the **Supavisor pooler**
host rather than `db.<ref>.supabase.co` - the direct host is IPv6-only and
unreachable from most Docker networks. Do not append `sslmode` to the URL: the
`pg` driver lets it override the TLS options set in `src/lib/db-config.ts`. To
verify certificates properly, set `PGSSLROOTCERT` to Supabase's CA bundle.

## How it fits together

```
Guest books  →  POST /api/bookings
                  ├─ availability check + inventory lock  (single transaction)
                  ├─ Reservation + ReservationGuest
                  ├─ Transaction rows: REVENUE, OTA_FEE, PAYMENT_FEE
                  ├─ Guest created or matched
                  └─ confirmation message + admin notification
                          ↓
        Admin calendar · Reservations · Property P&L · Stakeholder portal
```

Two rules hold the system together:

**Inventory is the source of truth.** `InventoryNight` has one row per occupied
unit-night with a unique constraint on `(unitId, date)`. Double-booking is
prevented by the database, not by application checks - two concurrent bookings
for the same night cannot both commit.

**Money is derived, never stored as a total.** Every figure in the finance
module - P&L, ROI, capital recovery, channel profitability, break-even, budget
variance - is computed from `Transaction` rows at read time
(`src/lib/finance/calculations.ts`). Refundable security deposits are tracked as
`DEPOSIT_OUT`, so they count towards capital deployed but never as an expense.

## Layout

```
prisma/schema.prisma        data model
prisma/seed.ts              demo portfolio
src/lib/finance/            P&L, ROI, capital recovery, break-even
src/lib/pricing/engine.ts   base rate + stacked pricing rules
src/lib/booking/            transaction-safe reservation creation
src/lib/payments/           provider-agnostic payment interface
src/lib/notifications/      email / WhatsApp / SMS interface + templates
src/app/(site)/             guest website
src/app/admin/              property management system
src/app/stakeholder/        owner & investor portal
```

## Authentication

OTP-first - email or mobile, no passwords. A booking does not require an
account; one is created automatically afterwards and linked to the guest
profile. Roles (`SUPER_ADMIN` … `CLEANER`, `OWNER`, `INVESTOR`) drive both
navigation and data scoping; stakeholders only ever see properties joined to
them through `StakeholderProperty`.

Admin and stakeholder areas fall back to a seeded demo user when no session
exists, so the dashboards are explorable without logging in. Remove the fallback
in `src/lib/auth/current-user.ts` before deploying anywhere real.

## What is not connected

These have real interfaces, data models and error states, but no live
credentials - nothing pretends to be connected:

| Area | Status |
|---|---|
| Payments (Razorpay/Stripe) | Interface + mock provider that settles synchronously |
| OTA channels | Connection states, sync logs and error handling; no live API calls |
| Email / WhatsApp / SMS | Messages are logged, never delivered; OTP codes surface in the UI |
| Ask Lime | Deterministic queries over real aggregates - not a language model |
| PDF export | Stubbed; CSV export is real |

Swap any of them by implementing its interface - `PaymentProvider`,
`NotificationProvider` - and returning it from the corresponding factory.
