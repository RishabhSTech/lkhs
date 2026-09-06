import Image from "next/image";
import Link from "next/link";

/**
 * A rail rather than a six-up grid. At `lg:grid-cols-6` inside a 72rem
 * container each tile landed around 170px wide - too small to work as imagery,
 * too big to work as a chip. Scrolling sideways lets each tile be a real
 * photograph and reads as browsing rather than navigation.
 */
export function CategoryRail({
  categories,
}: {
  categories: { slug: string; label: string; image: string }[];
}) {
  return (
    <div className="rail px-5 sm:px-6">
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/stays?category=${category.slug}`}
          className="group w-[10.5rem] outline-none sm:w-[13rem]"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
            <Image
              src={category.image}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, 14rem"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <span className="absolute inset-x-3.5 bottom-3 font-display-sm text-lg text-white">
              {category.label}
            </span>
          </div>
        </Link>
      ))}
      {/* Trailing spacer so the last tile can clear the gutter when scrolled. */}
      <div aria-hidden className="w-1" />
    </div>
  );
}
