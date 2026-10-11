"use client";

import { useState } from "react";
import { Bot, Activity, ScanEye, Sparkles, Save } from "lucide-react";
import { saveAddons } from "@/app/(app)/projects/[id]/requirement/actions";
import { ADDONS, type AddonId } from "@/lib/requirement";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSave, SaveStatus } from "./save-state";

const ICONS: Record<AddonId, React.ElementType> = {
  pulseAi: Bot,
  anomalyDetection: Activity,
  irDashboard: ScanEye,
  productRecommendation: Sparkles,
};

export function AddonsEditor({
  projectId,
  initial,
  initialNotes,
}: {
  projectId: string;
  initial: Record<string, boolean>;
  initialNotes: Record<string, string>;
}) {
  const [on, setOn] = useState(initial);
  const [notes, setNotes] = useState(initialNotes);
  const save = useSave();

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {ADDONS.map((a) => {
          const Icon = ICONS[a.id];
          const active = !!on[a.id];
          return (
            <div key={a.id} className={cn("rounded-xl border bg-white p-4 transition", active ? "border-brand-500 ring-4 ring-brand-100" : "border-line")}>
              <div className="flex items-start gap-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", active ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600")}>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{a.name}</p>
                  <p className="text-xs text-muted">{a.hint}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={active}
                  aria-label={a.name}
                  onClick={() => {
                    setOn({ ...on, [a.id]: !active });
                    save.markDirty();
                  }}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition", active ? "bg-brand-600" : "bg-slate-200")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition", active ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>
              {active && (
                <Textarea
                  value={notes[a.id] ?? ""}
                  onChange={(e) => {
                    setNotes({ ...notes, [a.id]: e.target.value });
                    save.markDirty();
                  }}
                  placeholder="Anything specific the client wants from this add-on"
                  className="mt-3 min-h-16"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <SaveStatus {...save} />
        <Button type="button" disabled={save.pending} onClick={() => save.run(() => saveAddons(projectId, on, notes))}>
          <Save />
          Save add-ons
        </Button>
      </div>
    </div>
  );
}
