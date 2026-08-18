"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import type { AmenityCategory, ThingToKnowGroup } from "@prisma/client";
import { AlertCircle, ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DynamicIcon } from "@/components/property/dynamic-icon";
import {
  AMENITY_CATEGORY_LABELS,
  AMENITY_CATEGORY_ORDER,
} from "@/lib/property/amenities";
import {
  HIGHLIGHTS,
  HIGHLIGHT_GROUPS,
  type HighlightCode,
} from "@/lib/property/highlights";
import {
  THINGS_TO_KNOW,
  THING_TO_KNOW_BY_CODE,
  THING_TO_KNOW_GROUP_LABELS,
  THING_TO_KNOW_GROUP_ORDER,
  fillTemplate,
} from "@/lib/property/things-to-know";

export type CatalogueAmenity = {
  id: string;
  name: string;
  icon: string;
  category: AmenityCategory;
};

export type ListingEditorValue = {
  isGuestFavourite: boolean;
  checkInFrom: string;
  checkInTo: string;
  checkOutBy: string;
  amenities: { amenityId: string; isUnavailable: boolean; note: string | null }[];
  highlights: { code: string; subtitle: string | null }[];
  thingsToKnow: { group: ThingToKnowGroup; code: string; label: string }[];
};

/** Airbnb shows three or four; past six they stop reading as highlights. */
const MAX_HIGHLIGHTS = 6;

/**
 * The listing editor: everything on the guest-facing page that is a choice
 * rather than a number. Amenities, highlights and "Things to know" all come
 * from fixed catalogues, so the admin is picking from a list with icons
 * already mapped rather than typing free text that may or may not render.
 *
 * The whole form saves as one payload — the API replaces each list wholesale,
 * which is what stops the form and the page drifting apart.
 */
export function ListingEditor({
  propertyId,
  propertyName,
  maxGuests,
  amenityCatalog,
  initial,
}: {
  propertyId: string;
  propertyName: string;
  maxGuests: number;
  amenityCatalog: CatalogueAmenity[];
  initial: ListingEditorValue;
}) {
  const router = useRouter();

  const [isGuestFavourite, setGuestFavourite] = useState(
    initial.isGuestFavourite,
  );
  const [checkInFrom, setCheckInFrom] = useState(initial.checkInFrom);
  const [checkInTo, setCheckInTo] = useState(initial.checkInTo);
  const [checkOutBy, setCheckOutBy] = useState(initial.checkOutBy);

  const [amenities, setAmenities] = useState(
    () =>
      new Map(
        initial.amenities.map((a) => [
          a.amenityId,
          { isUnavailable: a.isUnavailable, note: a.note ?? "" },
        ]),
      ),
  );
  const [highlights, setHighlights] = useState(
    () =>
      new Map(
        initial.highlights.map((h) => [h.code, h.subtitle ?? ""]),
      ),
  );
  const [things, setThings] = useState(
    () =>
      new Map(
        initial.thingsToKnow.map((t) => [
          `${t.group}:${t.code}`,
          { group: t.group, code: t.code, label: t.label },
        ]),
      ),
  );

  const [query, setQuery] = useState("");
  const [draftCustom, setDraftCustom] = useState<
    Partial<Record<ThingToKnowGroup, string>>
  >({});
  // Form-local ids for free-text rows. They never reach the database, which
  // stores every one of them under the shared CUSTOM code.
  const customKey = useRef(initial.thingsToKnow.length);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return AMENITY_CATEGORY_ORDER.map((category) => ({
      category,
      label: AMENITY_CATEGORY_LABELS[category],
      items: amenityCatalog.filter(
        (amenity) =>
          amenity.category === category &&
          (!needle || amenity.name.toLowerCase().includes(needle)),
      ),
    })).filter((group) => group.items.length > 0);
  }, [amenityCatalog, query]);

  /** Rows an admin typed themselves, keyed apart from the catalogue codes. */
  const customThings = useMemo(
    () =>
      [...things.entries()].filter(
        ([, value]) => !THING_TO_KNOW_BY_CODE.has(value.code),
      ),
    [things],
  );

  const selectedCount = [...amenities.values()].filter(
    (a) => !a.isUnavailable,
  ).length;
  const unavailableCount = amenities.size - selectedCount;

  function toggleAmenity(id: string) {
    setAmenities((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, { isUnavailable: false, note: "" });
      return next;
    });
  }

  function setAmenityUnavailable(id: string, isUnavailable: boolean) {
    setAmenities((prev) => {
      const next = new Map(prev);
      const current = next.get(id);
      if (current) next.set(id, { ...current, isUnavailable });
      return next;
    });
  }

  function toggleHighlight(code: HighlightCode) {
    setHighlights((prev) => {
      const next = new Map(prev);
      if (next.has(code)) next.delete(code);
      else if (next.size < MAX_HIGHLIGHTS) next.set(code, "");
      return next;
    });
  }

  function toggleThing(group: ThingToKnowGroup, code: string, label: string) {
    const key = `${group}:${code}`;
    setThings((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { group, code, label });
      return next;
    });
  }

  function addCustomThing(group: ThingToKnowGroup) {
    const label = (draftCustom[group] ?? "").trim();
    if (!label) return;
    // Keyed uniquely in the form; every one of them saves as code CUSTOM.
    const key = `${group}:CUSTOM_${group}_${customKey.current++}`;
    setThings((prev) =>
      new Map(prev).set(key, { group, code: "CUSTOM", label }),
    );
    setDraftCustom((prev) => ({ ...prev, [group]: "" }));
  }

  function removeThing(key: string) {
    setThings((prev) => {
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/properties/${propertyId}/listing`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isGuestFavourite,
            checkInFrom,
            checkInTo,
            checkOutBy,
            amenities: [...amenities.entries()].map(([amenityId, value]) => ({
              amenityId,
              isUnavailable: value.isUnavailable,
              note: value.note || null,
            })),
            highlights: [...highlights.entries()].map(([code, subtitle]) => ({
              code,
              subtitle: subtitle || null,
            })),
            // Anything not in the catalogue is free text, whatever local key
            // the form gave it, and saves under the shared CUSTOM code.
            thingsToKnow: [...things.values()]
              .filter((t) => t.label.trim().length > 0)
              .map((t) => ({
                group: t.group,
                code: THING_TO_KNOW_BY_CODE.has(t.code) ? t.code : "CUSTOM",
                label: t.label.trim(),
              })),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the listing.");

      toast.success("Listing updated", {
        description: `${propertyName} — ${data.amenities} amenities, ${data.highlights} highlights.`,
      });
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the listing.",
      );
    } finally {
      setSaving(false);
    }
  }

  const templateContext = { checkInFrom, checkInTo, checkOutBy, maxGuests };

  return (
    <div className="space-y-5">
      <Panel
        title="Badge and times"
        description="The check-in window feeds the templated house rules below."
      >
        <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
          <span className="min-w-0">
            <span className="text-sm font-medium text-foreground">
              Guest favourite
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              Shows the laurel badge above the reviews. It stays hidden until
              the listing has at least three reviews averaging 4.7 or better,
              so switching it on early does nothing until the scores catch up.
            </span>
          </span>
          <Switch
            checked={isGuestFavourite}
            onCheckedChange={setGuestFavourite}
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Check-in from">
            <Input
              value={checkInFrom}
              onChange={(e) => setCheckInFrom(e.target.value)}
              placeholder="2:00 pm"
            />
          </Field>
          <Field label="Check-in until">
            <Input
              value={checkInTo}
              onChange={(e) => setCheckInTo(e.target.value)}
              placeholder="9:00 pm"
            />
          </Field>
          <Field label="Checkout by">
            <Input
              value={checkOutBy}
              onChange={(e) => setCheckOutBy(e.target.value)}
              placeholder="11:00 am"
            />
          </Field>
        </div>
      </Panel>

      <Panel
        title="Listing highlights"
        description={`The icon block under the header. ${highlights.size} of ${MAX_HIGHLIGHTS} chosen.`}
      >
        <div className="space-y-5">
          {HIGHLIGHT_GROUPS.map((group) => (
            <div key={group}>
              <p className="label-eyebrow">{group}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {HIGHLIGHTS.filter((h) => h.group === group).map(
                  (highlight) => {
                    const checked = highlights.has(highlight.code);
                    const atLimit =
                      !checked && highlights.size >= MAX_HIGHLIGHTS;
                    return (
                      <div
                        key={highlight.code}
                        className={
                          checked
                            ? "rounded-lg border border-brand-mist bg-muted/40 p-3"
                            : "rounded-lg border border-border p-3"
                        }
                      >
                        <label
                          className={
                            atLimit
                              ? "flex cursor-not-allowed items-start gap-3 opacity-50"
                              : "flex cursor-pointer items-start gap-3"
                          }
                        >
                          <Checkbox
                            checked={checked}
                            disabled={atLimit}
                            onCheckedChange={() =>
                              toggleHighlight(highlight.code)
                            }
                            className="mt-1"
                          />
                          <DynamicIcon
                            name={highlight.icon}
                            className="mt-0.5 size-4 text-brand-mist"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">
                              {highlight.title}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                              {highlight.subtitle}
                              {highlight.dynamic && (
                                <span className="mt-0.5 block text-brand-mist">
                                  Filled in from live review scores when left
                                  blank.
                                </span>
                              )}
                            </span>
                          </span>
                        </label>

                        {checked && (
                          <Input
                            value={highlights.get(highlight.code) ?? ""}
                            onChange={(e) =>
                              setHighlights((prev) =>
                                new Map(prev).set(
                                  highlight.code,
                                  e.target.value,
                                ),
                              )
                            }
                            placeholder="Write your own line (optional)"
                            className="mt-3 h-9 text-[0.8125rem]"
                          />
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="What this place offers"
        description={`${selectedCount} offered · ${unavailableCount} listed as not included.`}
      >
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the amenity catalogue"
            aria-label="Search amenities"
            className="pl-9"
          />
        </div>

        <div className="mt-4 space-y-2">
          {grouped.map((group) => {
            const chosen = group.items.filter((a) =>
              amenities.has(a.id),
            ).length;
            return (
              <details
                key={group.category}
                open={Boolean(query) || chosen > 0}
                className="group rounded-lg border border-border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-medium text-foreground">
                    {group.label}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {chosen}/{group.items.length}
                    </span>
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>

                <ul className="divide-y divide-border border-t border-border">
                  {group.items.map((amenity) => {
                    const state = amenities.get(amenity.id);
                    return (
                      <li
                        key={amenity.id}
                        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5"
                      >
                        <label className="flex flex-1 cursor-pointer items-center gap-3">
                          <Checkbox
                            checked={Boolean(state)}
                            onCheckedChange={() => toggleAmenity(amenity.id)}
                          />
                          <DynamicIcon
                            name={amenity.icon}
                            className="size-4 text-muted-foreground"
                          />
                          <span className="text-sm text-foreground">
                            {amenity.name}
                          </span>
                        </label>

                        {state && (
                          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={state.isUnavailable}
                              onCheckedChange={(checked) =>
                                setAmenityUnavailable(
                                  amenity.id,
                                  checked === true,
                                )
                              }
                            />
                            Not included
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Things to know"
        description="House rules, safety and the cancellation policy. Templated items fill in from the times above."
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {THING_TO_KNOW_GROUP_ORDER.map((group) => (
            <div key={group}>
              <p className="label-eyebrow">
                {THING_TO_KNOW_GROUP_LABELS[group]}
              </p>
              <ul className="mt-2 space-y-2">
                {THINGS_TO_KNOW.filter((item) => item.group === group).map(
                  (item) => {
                    const key = `${group}:${item.code}`;
                    const checked = things.has(key);
                    return (
                      <li key={item.code}>
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() =>
                              toggleThing(group, item.code, item.label)
                            }
                            className="mt-0.5"
                          />
                          <span className="text-[0.8125rem] leading-relaxed text-foreground">
                            {fillTemplate(item.label, templateContext)}
                          </span>
                        </label>
                      </li>
                    );
                  },
                )}

                {customThings
                  .filter(([, value]) => value.group === group)
                  .map(([key, value]) => (
                    <li key={key} className="flex items-start gap-2">
                      <Input
                        value={value.label}
                        onChange={(e) =>
                          setThings((prev) =>
                            new Map(prev).set(key, {
                              ...value,
                              label: e.target.value,
                            }),
                          )
                        }
                        className="h-9 text-[0.8125rem]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove item"
                        className="size-9 shrink-0"
                        onClick={() => removeThing(key)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <Input
                  value={draftCustom[group] ?? ""}
                  onChange={(e) =>
                    setDraftCustom((prev) => ({
                      ...prev,
                      [group]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomThing(group);
                    }
                  }}
                  placeholder="Add your own…"
                  className="h-9 text-[0.8125rem]"
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Add a ${THING_TO_KNOW_GROUP_LABELS[group]} item`}
                  className="size-9 shrink-0"
                  onClick={() => addCustomThing(group)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" onClick={save} disabled={saving} className="shadow-lg">
          {saving && <Loader2 className="animate-spin" />}
          Save listing
        </Button>
      </div>
    </div>
  );
}

function Panel({
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </Label>
      {children}
    </div>
  );
}
