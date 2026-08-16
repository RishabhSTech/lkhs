"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SiteError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <div className="grid size-11 place-items-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-5 text-destructive" />
      </div>
      <h1 className="mt-4 font-heading text-3xl text-brand-green">
        That didn't load properly
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Something went wrong on our end. Try again, or head back and pick up
        where you left off.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button render={<Link href="/" />} variant="outline">
          Back to home
        </Button>
      </div>
    </div>
  );
}
