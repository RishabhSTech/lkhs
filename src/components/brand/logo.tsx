import { cn } from "@/lib/utils";

// Source art is a 2172x724 wordmark lockup; white glyph for dark surfaces,
// black glyph for light surfaces - both transparent SVGs so either drops
// onto any background. Plain <img>, not next/image: Next's image optimizer
// refuses local SVGs unless `images.dangerouslyAllowSVG` is set.
const LOGO_SRC = {
  light: "/lkhs-white.svg",
  dark: "/lkhs-dark.svg",
} as const;

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={LOGO_SRC[tone]}
      alt="Lime Kraft Home Stay"
      className={cn("h-12 w-auto object-contain", className)}
    />
  );
}

export function LogoStacked({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  return <Logo tone={tone} className={cn("h-11", className)} />;
}
