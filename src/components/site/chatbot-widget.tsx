"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Send, X, Loader2, BedDouble, Users, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";

type PropertyCard = {
  slug: string;
  name: string;
  city: string | null;
  area: string | null;
  bedrooms: number;
  maxGuests: number;
  basePrice: number;
  heroImageUrl: string | null;
  availability?: { checkIn: string; checkOut: string; nights: number; total: number; currency: string };
};

type ChatMessage = { role: "user" | "assistant"; content: string; properties?: PropertyCard[] };

const STORAGE_KEY = "lkhs-chat-history";
const GREETING: ChatMessage = {
  role: "assistant",
  content: "Hi! I'm the Lime Kraft assistant. Ask me about a property, dates, or pricing - or I can get our team to reach out.",
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch {
      // Corrupt or inaccessible sessionStorage - just start fresh.
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Storage full/blocked - conversation just won't survive a reload.
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        { role: "assistant", content: data.reply ?? "Sorry, something went wrong.", properties: data.properties },
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, something went wrong - please try again or use the contact form." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-20 z-50 lg:right-6 lg:bottom-6">
      {open && (
        <div className="mb-3 flex h-[32rem] w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-brand-blue px-4 py-3">
            <p className="text-sm font-semibold text-brand-ivory">Lime Kraft Assistant</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-brand-ivory/80 transition-colors hover:bg-white/10 hover:text-brand-ivory"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <div
                  className={
                    m.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand-azure px-3.5 py-2 text-sm text-white"
                      : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-foreground"
                  }
                >
                  {m.content}
                </div>
                {m.properties && m.properties.length > 0 && (
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {m.properties.map((p) => (
                      <PropertySuggestionCard key={p.slug} property={p} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="mr-auto flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Typing…
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a stay…"
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              maxLength={2000}
            />
            <Button type="submit" size="icon-sm" disabled={sending || !input.trim()}>
              <Send className="size-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      )}

      <Button
        type="button"
        size="icon-lg"
        className="rounded-full shadow-xl"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
      >
        {open ? <X /> : <MessageCircle />}
      </Button>
    </div>
  );
}

function PropertySuggestionCard({ property }: { property: PropertyCard }) {
  const priceLine = property.availability
    ? `${formatINR(property.availability.total)} for ${property.availability.nights} night${property.availability.nights === 1 ? "" : "s"}`
    : `From ${formatINR(property.basePrice)}/night`;

  return (
    <Link
      href={`/stays/${property.slug}`}
      className="block w-40 shrink-0 overflow-hidden rounded-xl border border-border bg-background transition-shadow hover:shadow-md"
    >
      <div className="relative h-24 w-full bg-muted">
        {property.heroImageUrl ? (
          <Image src={property.heroImageUrl} alt={property.name} fill className="object-cover" sizes="160px" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-5" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <p className="truncate text-xs font-semibold text-foreground">{property.name}</p>
        <p className="truncate text-[11px] text-muted-foreground">{[property.area, property.city].filter(Boolean).join(", ")}</p>
        <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <BedDouble className="size-3" />
            {property.bedrooms}
          </span>
          <span className="flex items-center gap-0.5">
            <Users className="size-3" />
            {property.maxGuests}
          </span>
        </p>
        <p className="text-xs font-semibold text-brand-blue">{priceLine}</p>
        <span className="mt-1 block rounded-md bg-brand-blue px-2 py-1 text-center text-[11px] font-medium text-brand-ivory">
          View &amp; book
        </span>
      </div>
    </Link>
  );
}
