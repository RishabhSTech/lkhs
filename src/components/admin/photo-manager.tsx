"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type PhotoRow = { id: string; url: string; alt: string | null };
type LibraryImage = { url: string; alt: string | null; propertyName: string };

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [library, setLibrary] = useState<LibraryImage[] | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const usedUrls = new Set(photos.map((p) => p.url));

  async function openPicker() {
    setDialogOpen(true);
    if (library !== null) return;
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/admin/uploads/library");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setLibrary(data.images);
    } catch {
      toast.error("Could not load the photo library.");
      setLibrary([]);
    } finally {
      setLibraryLoading(false);
    }
  }

  function toggleSelected(url: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  async function addSelectedFromLibrary() {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const chosen = library?.filter((img) => selected.has(img.url)) ?? [];
      for (const img of chosen) {
        const saveRes = await fetch(`/api/admin/properties/${propertyId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: img.url, alt: img.alt ?? propertyName }),
        });
        if (!saveRes.ok) throw new Error("Couldn't add one of the selected photos.");
      }
      toast.success(`${chosen.length > 1 ? "Photos" : "Photo"} added`);
      setSelected(new Set());
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the selected photos.");
    } finally {
      setAdding(false);
    }
  }

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
      setLibrary(null);
      setDialogOpen(false);
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

        <button
          type="button"
          onClick={openPicker}
          className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-brand-mist hover:text-brand-mist"
        >
          <ImagePlus className="size-5" />
          <span className="text-[0.6875rem] font-medium">Add photo</span>
        </button>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected(new Set());
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add photos</DialogTitle>
            <DialogDescription>
              Reuse a photo already uploaded for another listing, or upload a new one.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="library">
            <TabsList>
              <TabsTrigger value="library">Media library</TabsTrigger>
              <TabsTrigger value="upload">Upload new</TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="mt-4">
              {libraryLoading ? (
                <div className="grid h-40 place-items-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : !library || library.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No photos uploaded yet - use the &ldquo;Upload new&rdquo; tab to add the first one.
                </p>
              ) : (
                <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
                  {library.map((img) => {
                    const alreadyAdded = usedUrls.has(img.url);
                    const isSelected = selected.has(img.url);
                    return (
                      <button
                        key={img.url}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => toggleSelected(img.url)}
                        title={alreadyAdded ? "Already added to this listing" : img.propertyName}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Image src={img.url} alt={img.alt ?? img.propertyName} fill sizes="15vw" className="object-cover" />
                        {isSelected && !alreadyAdded && (
                          <div className="absolute inset-0 bg-brand-mist/40 ring-2 ring-inset ring-brand-mist">
                            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-brand-mist text-white">
                              <Check className="size-3" />
                            </span>
                          </div>
                        )}
                        {alreadyAdded && (
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[0.5625rem] font-medium text-white">
                            Added
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-brand-mist hover:text-brand-mist">
                {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
                <span className="text-sm font-medium">{uploading ? "Uploading…" : "Click to choose photos"}</span>
                <span className="text-xs">You can select more than one</span>
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
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={addSelectedFromLibrary} disabled={selected.size === 0 || adding}>
              {adding && <Loader2 className="animate-spin" />}
              Add {selected.size > 0 ? selected.size : ""} photo{selected.size === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
