import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = SearchX,
  className,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-border bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="grid size-11 place-items-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 font-heading text-xl text-brand-green">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && (
        <Button render={<Link href={action.href} />} variant="outline" className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
