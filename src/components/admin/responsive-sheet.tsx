"use client";

import type { ReactNode } from "react";
import { XIcon } from "lucide-react";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import {
  Dialog, DialogContent, DialogDescription, DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

/**
 * One surface for every admin form and detail view: a thumb-reachable bottom
 * drawer on phones, a dialog (or side panel) on desktop. Header and footer
 * stay pinned so the primary action is always on screen above the keyboard.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  desktop = "dialog",
  size = "md",
  headerExtra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  desktop?: "dialog" | "side";
  size?: "sm" | "md" | "lg";
  headerExtra?: ReactNode;
}) {
  const isDesktop = useIsDesktop();

  const body = (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 sm:px-5">
      {children}
    </div>
  );
  const foot = footer && (
    <div className="shrink-0 border-t border-border bg-popover px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
      {footer}
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
        <DrawerContent>
          <div className="flex shrink-0 items-start gap-3 px-4 pt-2 pb-3">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="font-heading text-lg leading-tight font-semibold text-foreground">
                {title}
              </DrawerTitle>
              {description && (
                <DrawerDescription className="mt-0.5 text-xs text-muted-foreground">
                  {description}
                </DrawerDescription>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          {headerExtra && <div className="shrink-0 px-4 pb-3">{headerExtra}</div>}
          {body}
          {foot}
        </DrawerContent>
      </Drawer>
    );
  }

  const header = (
    <div className="shrink-0 px-5 pt-5 pb-3 pr-12">
      {desktop === "side" ? (
        <>
          <SheetTitle className="font-heading text-xl text-primary">{title}</SheetTitle>
          {description && <SheetDescription className="mt-0.5 text-xs">{description}</SheetDescription>}
        </>
      ) : (
        <>
          <DialogTitle className="font-heading text-lg font-semibold">{title}</DialogTitle>
          {description && <DialogDescription className="mt-1 text-xs">{description}</DialogDescription>}
        </>
      )}
      {headerExtra && <div className="mt-3">{headerExtra}</div>}
    </div>
  );

  if (desktop === "side") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="gap-0 p-0 sm:max-w-lg">
          {header}
          {body}
          {foot}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90svh] flex-col gap-0 overflow-hidden p-0 sm:pb-0",
          size === "sm" && "sm:max-w-md",
          size === "md" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-2xl",
        )}
      >
        {header}
        {body}
        {foot}
      </DialogContent>
    </Dialog>
  );
}
