import { Skeleton } from "@/components/ui/skeleton";

export default function SiteLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="mt-3 h-4 w-96" />
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[4/3] rounded-xl" />
            <Skeleton className="mt-3.5 h-5 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
            <Skeleton className="mt-3 h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
