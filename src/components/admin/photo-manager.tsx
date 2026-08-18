"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type PhotoRow = { id: string; url: string; alt: string | null };

export function PhotoManager({
  propertyId,
  propertyName,
  photos,
}: {
  propertyId: string;
  propertyName: string;
  photos: PhotoRow[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const presign = await fetch("/api/admin/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: "properties", filename: file.name, contentType: file.type }),
        });
        const presignData = await presign.json();
        if (!presign.ok) throw new Error(presignData.error ?? "Could not get an upload URL.");

        const putRes = await fetch(presignData.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Upload to storage failed.");

        const saveRes = await fetch(`/api/admin/properties/${propertyId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: presignData.publicUrl, alt: propertyName }),
        });
        if (!saveRes.ok) throw new Error("Uploaded, but couldn't save it to the listing.");
      }
      toast.success(`${files.length > 1 ? "Photos" : "Photo"} added`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...photos];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];

    setBusyId(photos[index].id);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: next.map((p) => p.id) }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not reorder photos.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(imageId: string) {
    setBusyId(imageId);
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Could not remove that photo.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((img, index) => (
          <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
            <Image src={img.url} alt={img.alt ?? propertyName} fill sizes="20vw" className="object-cover" />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[0.625rem] font-medium text-white">
                Hero
              </span>
            )}
            {busyId === img.id ? (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <Loader2 className="size-4 animate-spin text-white" />
              </div>
            ) : (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move earlier"
                  className="rounded p-1 text-white disabled:opacity-30"
                >
                  <ArrowLeft className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(img.id)}
                  aria-label="Remove photo"
                  className="rounded p-1 text-white hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move later"
                  className="rounded p-1 text-white disabled:opacity-30"
                >
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-brand-mist hover:text-brand-mist">
          {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
          <span className="text-[0.6875rem] font-medium">Add photo</span>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>
    </div>
  );
}
