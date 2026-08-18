import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-heading text-lg leading-none tracking-tight",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 translate-y-[-2px] rounded-full",
          tone === "light" ? "bg-brand-azure" : "bg-brand-azure",
        )}
      />
      Lime Kraft
    </span>
  );
}

export function LogoStacked({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <Logo tone={tone} />
      <span
        className={cn(
          "mt-1 pl-3.5 font-sans text-[0.625rem] font-medium tracking-[0.18em] uppercase",
          tone === "light" ? "text-white/55" : "text-muted-foreground",
        )}
      >
        Home Stays
      </span>
    </span>
  );
}
