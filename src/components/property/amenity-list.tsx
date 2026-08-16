"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";

type Amenity = { id: string; name: string; icon: string };

function AmenityIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name];
  const Fallback = Icons.Check;
  const Resolved = Icon ?? Fallback;
  return <Resolved className="size-4 text-brand-sage" />;
}

export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? amenities : amenities.slice(0, 8);

  return (
    <div>
      <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {visible.map((amenity) => (
          <li key={amenity.id} className="flex items-center gap-2.5 text-sm">
            <AmenityIcon name={amenity.icon} />
            {amenity.name}
          </li>
        ))}
      </ul>

      {amenities.length > 8 && (
        <Button
          variant="outline"
          size="sm"
          className="mt-5"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "Show fewer amenities"
            : `Show all ${amenities.length} amenities`}
        </Button>
      )}
    </div>
  );
}
