import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AdminPage, PageHeader } from "@/components/admin/page-header";
import { KpiCard } from "@/components/admin/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingEditor } from "@/components/admin/listing-editor";
import { PhotoManager } from "@/components/admin/photo-manager";
import { db } from "@/lib/db";
import { buildPL, type TxWithCategory } from "@/lib/finance/calculations";
import { SOURCE_LABELS, STATUS_LABELS, sourceBadgeClass, statusBadgeClass } from "@/lib/admin/sources";
import { formatDateRange, formatINR, formatINRCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPropertyPage({
  params,
}: PageProps<"/admin/properties/[id]">) {
  const { id } = await params;

  const property = await db.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      amenities: { include: { amenity: true } },
      highlights: { orderBy: { sortOrder: "asc" } },
      thingsToKnow: { orderBy: { sortOrder: "asc" } },
      units: true,
      pricingRules: { orderBy: { priority: "desc" } },
      transactions: { include: { category: true } },
      reviews: { include: { guest: { select: { name: true } } }, take: 5, orderBy: { createdAt: "desc" } },
      channelProperties: { include: { channel: true } },
      reservations: {
        include: { guest: { select: { name: true } } },
        orderBy: { checkIn: "desc" },
        take: 10,
      },
      cleaningTasks: {
        where: { status: { not: "READY" } },
        include: { assignedTo: { select: { name: true } } },
      },
      maintenanceTasks: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
    },
  });
  if (!property) notFound();

  const pl = buildPL(property.transactions as TxWithCategory[]);

  const amenityCatalog = await db.amenity.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, icon: true, category: true },
  });

  const listingValue = {
    isGuestFavourite: property.isGuestFavourite,
    checkInFrom: property.checkInFrom ?? "",
    checkInTo: property.checkInTo ?? "",
    checkOutBy: property.checkOutBy ?? "",
    amenities: property.amenities.map((a) => ({
      amenityId: a.amenityId,
      isUnavailable: a.isUnavailable,
      note: a.note,
    })),
    highlights: property.highlights.map((h) => ({
      code: h.code,
      subtitle: h.subtitle,
    })),
    thingsToKnow: property.thingsToKnow.map((t) => ({
      group: t.group,
      code: t.code,
      label: t.label,
    })),
  };

  return (
    <AdminPage>
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-blue"
      >
        <ArrowLeft className="size-4" />
        Back to properties
      </Link>

      <div className="mt-4">
        <PageHeader
          title={property.name}
          description={`${property.locationArea}, ${property.city}`}
          actions={
            <>
              <Button
                render={<Link href={`/admin/finance/property/${property.id}`} />}
                size="sm"
              >
                Finance
              </Button>
              <Button
                render={<Link href={`/stays/${property.slug}`} target="_blank" />}
                variant="outline"
                size="sm"
              >
                <ExternalLink />
                View listing
              </Button>
            </>
          }
        />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Base price" value={formatINR(Number(property.basePrice))} />
        <KpiCard label="Revenue" value={formatINRCompact(pl.grossRevenue)} />
        <KpiCard label="Net income" value={formatINRCompact(pl.netOperatingIncome)} />
        <KpiCard
          label="Open issues"
          value={String(property.maintenanceTasks.length)}
          tone={property.maintenanceTasks.length > 0 ? "warning" : "default"}
        />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="w-full max-w-3xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listing">Listing</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-5 space-y-5">
          <Card title="Photos" description="First photo is the hero shown across the site.">
            <PhotoManager
              propertyId={property.id}
              propertyName={property.name}
              photos={property.images.map((img) => ({ id: img.id, url: img.url, alt: img.alt }))}
            />
          </Card>

          <Card title="Description">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {property.description}
            </p>
          </Card>

          <Card title={`Amenities (${property.amenities.length})`}>
            <ul className="flex flex-wrap gap-1.5">
              {property.amenities.map((a) => (
                <li key={a.amenityId}>
                  <Badge className="border-border bg-muted text-muted-foreground">
                    {a.amenity.name}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="listing" className="mt-5">
          <ListingEditor
            propertyId={property.id}
            propertyName={property.name}
            maxGuests={property.maxGuests}
            amenityCatalog={amenityCatalog}
            initial={listingValue}
          />
        </TabsContent>

        <TabsContent value="rooms" className="mt-5">
          <Card title="Units">
            <ul className="divide-y divide-border">
              {property.units.map((unit) => (
                <li key={unit.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-foreground">
                    {unit.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {unit.maxGuests} guests · {unit.bedrooms} bed ·{" "}
                    {unit.bathrooms} bath
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="mt-5">
          <Card title="Pricing rules" description={`Base rate ${formatINR(Number(property.basePrice))} per night`}>
            <ul className="divide-y divide-border">
              {property.pricingRules.map((rule) => (
                <li key={rule.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {rule.name}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {rule.type.toLowerCase().replace(/_/g, " ")}
                      {rule.minNights ? ` · ${rule.minNights}+ nights` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      Number(rule.adjustmentValue) >= 0
                        ? "text-sm font-medium tabular-nums text-chart-1"
                        : "text-sm font-medium tabular-nums text-chart-2"
                    }
                  >
                    {Number(rule.adjustmentValue) > 0 ? "+" : ""}
                    {Number(rule.adjustmentValue)}
                    {rule.adjustmentType === "PERCENT" ? "%" : "₹"}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="mt-5">
          <Card title="Channel connections">
            <ul className="divide-y divide-border">
              {property.channelProperties.map((cp) => (
                <li key={cp.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {cp.channel.name}
                    </p>
                    {cp.externalListingId && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {cp.externalListingId}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={
                      cp.status === "CONNECTED"
                        ? "border-chart-1/25 bg-chart-1/10 text-chart-1"
                        : cp.status === "ERROR"
                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                          : "border-border bg-muted text-muted-foreground"
                    }
                  >
                    {cp.status.toLowerCase().replace(/_/g, " ")}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="mt-5">
          <Card title="Recent bookings">
            <ul className="divide-y divide-border">
              {property.reservations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.guest.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateRange(r.checkIn, r.checkOut)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={sourceBadgeClass(r.source)}>
                      {SOURCE_LABELS[r.source]}
                    </Badge>
                    <Badge className={statusBadgeClass(r.status)}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatINR(Number(r.total))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>

        <TabsContent value="ops" className="mt-5 space-y-5">
          <Card title="Cleaning queue">
            {property.cleaningTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing pending — the home is turned over.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {property.cleaningTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="capitalize text-foreground">
                      {task.status.toLowerCase().replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {task.assignedTo?.name ?? "Unassigned"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Open maintenance">
            {property.maintenanceTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open issues.</p>
            ) : (
              <ul className="divide-y divide-border">
                {property.maintenanceTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="text-foreground">{task.title}</span>
                    <Badge className="border-chart-4/25 bg-chart-4/10 text-chart-4">
                      {task.priority.toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </AdminPage>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
