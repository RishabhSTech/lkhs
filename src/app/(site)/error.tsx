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
      <h1 className="mt-4 font-heading text-3xl text-foreground">
        That didn&apos;t load properly
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        This one is on us, not on you. Try again - and if it keeps happening, tell
        us and we will look at it today.
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
