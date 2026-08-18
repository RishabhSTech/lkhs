"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center p-8 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h1 className="mt-4 font-heading text-2xl text-brand-blue">
        Something went wrong loading this page
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This is usually a database connection hiccup. Try again — if it keeps
        happening, check that DATABASE_URL is reachable.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
