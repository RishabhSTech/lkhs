"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { descriptionToHtml } from "@/lib/property/rich-text";

export type PropertyDetailsValue = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
};

export function PropertyDetailsEditor({
  propertyId,
  initial,
}: {
  propertyId: string;
  initial: PropertyDetailsValue;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [tagline, setTagline] = useState(initial.tagline);
  const [description, setDescription] = useState(() => descriptionToHtml(initial.description));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugChanged = slug !== initial.slug;

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, tagline: tagline || null, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save the details.");

      toast.success("Details updated");
      if (data.slug !== initial.slug) {
        router.push(`/admin/properties/${propertyId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Title
          </Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Slug
          </Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="font-mono"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            /stays/{slug || "…"}
            {slugChanged && " - changing this breaks any links or search rankings pointing at the old URL."}
          </p>
        </div>
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Tagline
        </Label>
        <Input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="One line shown under the title and used for search previews"
          maxLength={140}
        />
      </div>

      <div>
        <Label className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Description
        </Label>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe the property…"
        />
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || !name || !slug}>
          {saving && <Loader2 className="animate-spin" />}
          Save details
        </Button>
      </div>
    </div>
  );
}
