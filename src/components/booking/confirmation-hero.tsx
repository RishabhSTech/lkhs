"use client";

import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import type { ReservationStatus } from "@prisma/client";

const COPY: Record<string, { headline: string; subtext: string }> = {
  PENDING: {
    headline: "We've got your request.",
    subtext: "Everything's noted - our team will reach out shortly to confirm your stay and share payment details.",
  },
  CONFIRMED: {
    headline: "Your stay is confirmed.",
    subtext: "Everything's set - here are the details.",
  },
};

export function ConfirmationHero({
  guestName,
  status,
}: {
  guestName: string;
  status: ReservationStatus;
}) {
  const isPending = status === "PENDING";
  const copy = COPY[status] ?? COPY.PENDING;

  return (
    <div className="text-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={
          isPending
            ? "mx-auto grid size-14 place-items-center rounded-full bg-muted-foreground"
            : "mx-auto grid size-14 place-items-center rounded-full bg-brand-blue"
        }
      >
        <motion.span
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          {isPending ? (
            <Clock className="size-7 text-brand-ivory" strokeWidth={2.5} />
          ) : (
            <Check className="size-7 text-brand-ivory" strokeWidth={2.5} />
          )}
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="mt-6 font-heading text-4xl leading-tight text-foreground sm:text-5xl">
          {copy.headline}
        </h1>
        <p className="mt-3 text-[0.9375rem] text-muted-foreground">
          Thanks, {guestName.split(" ")[0]}. {copy.subtext}
        </p>
      </motion.div>
    </div>
  );
}
