import { cn } from "@/lib/utils";

// Source art is a 2172x724 wordmark lockup; white glyph for dark surfaces,
// black glyph for light surfaces - both transparent PNGs so either drops
// onto any background. These used to be ".svg" but weren't real vector
// art - each file just wrapped this same raster image in an SVG mask/filter
// to fake transparency. Browsers rasterize that mask at the element's
// on-screen size rather than the image's native resolution, so shrinking it
// to header size (e.g. the mobile header's 144x48) blurred the serif
// letterforms into a thick, muddy blob. A plain PNG downscales cleanly, so
// serving the raster directly fixes it. Plain <img>, not next/image: Next's
// image optimizer refuses local SVGs unless `images.dangerouslyAllowSVG` is
// set, and there's no SVG here anymore anyway.
const LOGO_SRC = {
  light: "/lkhs-white.png",
  dark: "/lkhs-dark.png",
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
