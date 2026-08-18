import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="text-center">
          <p className="font-heading text-6xl text-brand-mist">404</p>
          <h1 className="mt-4 font-heading text-3xl text-foreground">
            We couldn&apos;t find that page
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            It may have moved, or the link might be out of date.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Button render={<Link href="/" />}>Back to home</Button>
            <Button render={<Link href="/stays" />} variant="outline">
              Browse stays
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
