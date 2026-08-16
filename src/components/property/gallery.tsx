"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type GalleryImage = { url: string; alt: string | null };

export function Gallery({
  images,
  propertyName,
}: {
  images: GalleryImage[];
  propertyName: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setLightboxIndex((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length,
      ),
    [images.length],
  );

  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, close, step]);

  const [hero, ...rest] = images;
  if (!hero) return null;

  return (
    <>
      {/* Mobile: swipeable strip. Desktop: hero + supporting grid. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0 lg:hidden">
        {images.map((image, i) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-[4/3] w-[86%] shrink-0 snap-center overflow-hidden rounded-xl bg-muted"
          >
            <Image
              src={image.url}
              alt={image.alt ?? `${propertyName} — photo ${i + 1}`}
              fill
              priority={i === 0}
              sizes="86vw"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <div className="hidden gap-2 lg:grid lg:grid-cols-[1.6fr_1fr] lg:grid-rows-2 lg:h-[30rem]">
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="group relative row-span-2 overflow-hidden rounded-l-xl bg-muted"
        >
          <Image
            src={hero.url}
            alt={hero.alt ?? propertyName}
            fill
            priority
            sizes="55vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </button>

        {rest.slice(0, 4).map((image, i) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setLightboxIndex(i + 1)}
            className={`group relative overflow-hidden bg-muted ${
              i === 1 ? "rounded-tr-xl" : i === 3 ? "rounded-br-xl" : ""
            }`}
          >
            <Image
              src={image.url}
              alt={image.alt ?? `${propertyName} — photo ${i + 2}`}
              fill
              sizes="25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
            {i === 3 && images.length > 5 && (
              <span className="absolute inset-0 grid place-items-center bg-brand-ink/55 text-sm font-medium text-white">
                +{images.length - 5} more
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 hidden lg:block">
        <Button variant="outline" size="sm" onClick={() => setLightboxIndex(0)}>
          <Expand />
          View all {images.length} photos
        </Button>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-brand-ink/95 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${propertyName} photo gallery`}
            onClick={close}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              aria-label="Close gallery"
              className="absolute top-4 right-4 z-10 text-white hover:bg-white/15"
            >
              <X />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                step(-1);
              }}
              className="absolute left-3 z-10 text-white hover:bg-white/15 sm:left-6"
            >
              <ChevronLeft />
            </Button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[70svh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={images[lightboxIndex].url}
                alt={
                  images[lightboxIndex].alt ??
                  `${propertyName} — photo ${lightboxIndex + 1}`
                }
                fill
                sizes="100vw"
                className="object-contain"
              />
            </motion.div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                step(1);
              }}
              className="absolute right-3 z-10 text-white hover:bg-white/15 sm:right-6"
            >
              <ChevronRight />
            </Button>

            <p className="absolute bottom-6 text-sm text-white/70">
              {lightboxIndex + 1} / {images.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
