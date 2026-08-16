"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Building2, CalendarDays, CreditCard, Loader2, Receipt, Tags, Users,
} from "lucide-react";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ADMIN_NAV } from "@/lib/admin/nav";

type SearchResults = {
  reservations: { id: string; code: string; guestName: string; propertyName: string }[];
  guests: { id: string; name: string; email: string | null }[];
  transactions: { id: string; description: string; amount: number; propertyName: string }[];
};

export function CommandPalette({
  open,
  onOpenChange,
  properties,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then(setResults)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function go(href: string) {
    onOpenChange(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search guests, properties, reservations, transactions"
    >
      {/* Results come pre-filtered from the server, so cmdk must not re-filter. */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search guests, bookings, properties, expenses…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching…
          </div>
        )}

        {!loading && query.length >= 2 && !results && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {results && results.reservations.length > 0 && (
          <CommandGroup heading="Reservations">
            {results.reservations.map((r) => (
              <CommandItem
                key={r.id}
                onSelect={() => go(`/admin/reservations?id=${r.id}`)}
              >
                <Tags />
                <span className="font-mono text-xs">{r.code}</span>
                <span className="text-muted-foreground">
                  {r.guestName} · {r.propertyName}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results && results.guests.length > 0 && (
          <CommandGroup heading="Guests">
            {results.guests.map((g) => (
              <CommandItem
                key={g.id}
                onSelect={() => go(`/admin/guests?id=${g.id}`)}
              >
                <Users />
                {g.name}
                {g.email && (
                  <span className="text-muted-foreground">{g.email}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results && results.transactions.length > 0 && (
          <CommandGroup heading="Transactions">
            {results.transactions.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => go(`/admin/finance/expenses?id=${t.id}`)}
              >
                <Receipt />
                {t.description}
                <span className="text-muted-foreground">{t.propertyName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.length < 2 && (
          <>
            <CommandGroup heading="Properties">
              {properties.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() => go(`/admin/properties/${p.id}`)}
                >
                  <Building2 />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Go to">
              {ADMIN_NAV.map((item) => (
                <CommandItem key={item.href} onSelect={() => go(item.href)}>
                  <item.icon />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Quick actions">
              <CommandItem onSelect={() => go("/admin/finance/expenses/new")}>
                <CreditCard />
                Add an expense
              </CommandItem>
              <CommandItem onSelect={() => go("/admin/calendar")}>
                <CalendarDays />
                Open master calendar
              </CommandItem>
            </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
