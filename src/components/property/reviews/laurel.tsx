import { cn } from "@/lib/utils";

/**
 * One laurel branch. Two of these flank the rating on a Guest favourite
 * listing. Drawn inline rather than shipped as an asset so it inherits
 * `currentColor` and stays crisp at any size in either theme.
 *
 * The stem is the two cubics below — a long outward sweep that hooks back in
 * at the foot — and the leaves are sampled off it, each rotated to sit on the
 * outer edge. Full almond leaves rather than thin ellipses: at the size this
 * renders (around 80px tall) anything narrower reads as a smudge.
 */
const LEAF =
  "M0 0C2.6 -3.1 6.6 -3.8 9 0C6.6 3.8 2.6 3.1 0 0Z";

const LEAVES: { x: number; y: number; angle: number }[] = [
  { x: 13.7, y: 10.1, angle: 248 },
  { x: 10.0, y: 18.7, angle: 232 },
  { x: 7.9, y: 28.2, angle: 216 },
  { x: 7.4, y: 37.7, angle: 200 },
  { x: 8.2, y: 46.0, angle: 186 },
];

export function Laurel({
  className,
  flipped = false,
}: {
  className?: string;
  flipped?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 64"
      fill="none"
      aria-hidden
      className={cn("h-full w-auto", flipped && "-scale-x-100", className)}
    >
      <path
        d="M17 5C9 16 6 30 8 44C9.5 54 12 58 14 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {LEAVES.map((leaf) => (
        <path
          key={`${leaf.x}-${leaf.y}`}
          d={LEAF}
          fill="currentColor"
          transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle})`}
        />
      ))}
    </svg>
  );
}
