"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition,
  type KeyboardEvent, type MouseEvent, type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Instant feedback for every navigation in the back office. Dynamic pages
 * render on the server, so a click can take a moment to land; without a cue
 * people click again. This shows a top progress bar from the moment a link
 * is clicked (or `navigate` is called) until the new URL has rendered.
 */
type Navigate = (href: string, options?: { replace?: boolean; scroll?: boolean }) => void;

const NavigationContext = createContext<{ navigate: Navigate; pending: boolean } | null>(null);

/** Give up on a navigation that never resolves (offline, same URL, ...). */
const PENDING_TIMEOUT_MS = 15_000;

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [transitionPending, startTransition] = useTransition();
  // The URL that was showing when a link was clicked; the navigation is
  // done as soon as we render a different one.
  const [clickedFrom, setClickedFrom] = useState<string | null>(null);
  const timeout = useRef<number | undefined>(undefined);

  const url = `${pathname}?${searchParams.toString()}`;
  const urlRef = useRef(url);
  useEffect(() => {
    urlRef.current = url;
  }, [url]);
  const linkPending = clickedFrom === url;

  // Catch clicks on any internal <a> (next/link renders one) - sidebar,
  // tabs, cards, server-rendered lists - without touching each of them.
  useEffect(() => {
    function onClick(event: globalThis.MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const next = new URL(anchor.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      const current = new URL(window.location.href);
      if (next.pathname === current.pathname && next.search === current.search) return; // same page / hash only
      if (next.pathname.startsWith("/api/")) return; // file downloads
      setClickedFrom(urlRef.current);
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setClickedFrom(null), PENDING_TIMEOUT_MS);
    }
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(timeout.current);
    };
  }, []);

  const navigate = useCallback<Navigate>(
    (href, options) => {
      startTransition(() => {
        if (options?.replace) router.replace(href, { scroll: options.scroll ?? false });
        else router.push(href, { scroll: options?.scroll ?? false });
      });
    },
    [router],
  );

  const pending = transitionPending || linkPending;
  const value = useMemo(() => ({ navigate, pending }), [navigate, pending]);

  return (
    <NavigationContext.Provider value={value}>
      <div
        role="progressbar"
        aria-label="Loading page"
        aria-hidden={!pending}
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden transition-opacity duration-200",
          pending ? "opacity-100" : "opacity-0",
        )}
      >
        <div className="nav-progress-bar h-full w-1/3 bg-brand-azure" />
      </div>
      {children}
    </NavigationContext.Provider>
  );
}

/** `navigate(href)` with progress feedback; falls back to plain routing outside the provider. */
export function useNavigate() {
  const ctx = useContext(NavigationContext);
  const router = useRouter();
  return useMemo(
    () => ({
      pending: ctx?.pending ?? false,
      navigate:
        ctx?.navigate ??
        ((href: string, options?: { replace?: boolean; scroll?: boolean }) =>
          options?.replace ? router.replace(href, { scroll: options.scroll ?? false }) : router.push(href, { scroll: options?.scroll ?? false })),
    }),
    [ctx, router],
  );
}

/**
 * A table row that is clickable end to end. Ctrl/⌘-click opens a new tab;
 * Enter works from the keyboard. Highlights immediately on click.
 */
export function RowLink({
  href,
  className,
  children,
  label,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  /** Accessible name, e.g. "Open booking LK-1234". */
  label?: string;
}) {
  const { navigate } = useNavigate();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  // Highlighted from the click until the URL changes.
  const [clickedAt, setClickedAt] = useState<string | null>(null);
  const clicked = clickedAt === url;

  function open(event: MouseEvent | KeyboardEvent) {
    // Let real links and buttons inside the row do their own thing.
    if ((event.target as Element).closest("a, button, input, select, textarea, label")) return;
    if ("metaKey" in event && (event.metaKey || event.ctrlKey)) {
      window.open(href, "_blank", "noopener");
      return;
    }
    setClickedAt(url);
    navigate(href, { scroll: true });
  }

  return (
    <tr
      role="link"
      tabIndex={0}
      aria-label={label}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter") open(e);
      }}
      className={cn(
        "cursor-pointer transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
        clicked && "bg-muted/70",
        className,
      )}
    >
      {children}
    </tr>
  );
}
