"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps a surface so it catches a soft highlight under the pointer.
 *
 * The move handler writes two CSS custom properties straight onto the node and
 * never calls `setState`. A twelve-card grid therefore does no React work while
 * the mouse crosses it - the gradient in `.spotlight` (globals.css) is redrawn
 * by the compositor alone. Reduced-motion and touch both opt out in CSS.
 */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function track(event: PointerEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    target.style.setProperty(
      "--mx",
      `${((event.clientX - rect.left) / rect.width) * 100}%`,
    );
    target.style.setProperty(
      "--my",
      `${((event.clientY - rect.top) / rect.height) * 100}%`,
    );
  }

  return (
    <div
      onPointerMove={track}
      className={cn("spotlight relative isolate", className)}
    >
      {children}
    </div>
  );
}
