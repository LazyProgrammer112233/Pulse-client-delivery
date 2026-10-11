"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { saveBranding } from "@/app/(app)/projects/[id]/requirement/actions";
import { LOGO_MAX_BYTES, type Branding } from "@/lib/requirement";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useSave, SaveStatus } from "./save-state";

export function BrandingEditor({
  projectId,
  initial,
  clientName,
  onSaved,
}: {
  projectId: string;
  initial: Branding;
  clientName: string;
  onSaved: (b: Branding) => void;
}) {
  const [b, setB] = useState<Branding>({ primaryColor: "#1e56d9", secondaryColor: "#eef4ff", ...initial });
  const [fileError, setFileError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const save = useSave();
  const set = (c: Partial<Branding>) => {
    setB((prev) => ({ ...prev, ...c }));
    save.markDirty();
  };

  function onFile(f: File | undefined) {
    setFileError(null);
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)) return setFileError("Use a PNG, JPG, WebP or SVG file.");
    if (f.size > LOGO_MAX_BYTES) return setFileError("The logo must be 300 KB or smaller.");
    const reader = new FileReader();
    reader.onload = () => set({ logo: String(reader.result) });
    reader.readAsDataURL(f);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div>
          <Label>Client logo</Label>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-xl border border-dashed border-line bg-white">
              {b.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo} alt="Client logo" className="max-h-14 max-w-36 object-contain" />
              ) : (
                <span className="text-xs text-muted">No logo yet</span>
              )}
            </div>
            <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}>
              <ImagePlus />
              {b.logo ? "Replace" : "Upload logo"}
            </Button>
            {b.logo && (
              <Button type="button" variant="danger-outline" size="sm" onClick={() => set({ logo: undefined })}>
                <Trash2 />
                Remove
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-muted">PNG, JPG, WebP or SVG, up to 300 KB.</p>
          {fileError && <p className="mt-1 text-sm text-danger-600">{fileError}</p>}
        </div>
        <div>
          <Label htmlFor="displayName">Name shown on the dashboard</Label>
          <Input id="displayName" value={b.displayName ?? ""} onChange={(e) => set({ displayName: e.target.value })} placeholder={clientName} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["primaryColor", "Primary color"],
              ["secondaryColor", "Secondary color"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <div className="flex items-center gap-2 rounded-xl border border-line bg-white p-1.5">
                <input id={key} type="color" value={b[key] ?? "#1e56d9"} onChange={(e) => set({ [key]: e.target.value })} className="size-8 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                <span className="font-mono text-sm text-ink">{b[key]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Preview</Label>
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: b.primaryColor }}>
            {b.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo} alt="" className="h-6 max-w-20 rounded bg-white/90 object-contain p-0.5" />
            )}
            <span className="truncate text-sm font-semibold text-white">{b.displayName || clientName}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3" style={{ background: b.secondaryColor }}>
            {["Secondary sales", "Coverage %"].map((k) => (
              <div key={k} className="rounded-lg bg-white p-2 shadow-sm">
                <p className="text-[10px] text-muted">{k}</p>
                <p className="text-sm font-semibold" style={{ color: b.primaryColor }}>
                  {k.includes("%") ? "86%" : "₹4.2 Cr"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-2">
        <SaveStatus {...save} />
        <Button
          type="button"
          disabled={save.pending}
          onClick={() =>
            save.run(() => saveBranding(projectId, b), { pending: "Saving the logo and colors", done: "Branding saved" }, (r) => r.branding && onSaved(r.branding))
          }
        >
          {save.pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save branding
        </Button>
      </div>
    </div>
  );
}
