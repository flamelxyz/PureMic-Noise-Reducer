import { useState, useEffect, useRef } from "react";
import { Bookmark, Save, X } from "lucide-react";
import {
  loadPresets,
  savePreset,
  deletePreset,
  type AudioPreset,
  type PresetMap,
} from "@/lib/presets";

interface Props {
  currentPreset: AudioPreset;
  onApply: (preset: AudioPreset) => void;
}

export function PresetMenu({ currentPreset, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<PresetMap>({});
  const [name, setName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setPresets(loadPresets());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setPresets(savePreset(trimmed, currentPreset));
    setName("");
  };

  const handleApply = (preset: AudioPreset) => {
    onApply(preset);
    setOpen(false);
  };

  const handleDelete = (n: string) => {
    setPresets(deletePreset(n));
  };

  const entries = Object.entries(presets);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`p-2 rounded-full transition-colors ${open ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
        title="Presets"
      >
        <Bookmark className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-zinc-950 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Save current
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
                placeholder="Preset name"
                maxLength={40}
                className="flex-1 h-8 px-2 rounded-md bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim()}
                className="h-8 w-8 flex items-center justify-center rounded-md bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Save preset"
              >
                <Save className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {entries.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
                No saved presets yet
              </p>
            ) : (
              entries.map(([n, preset]) => (
                <div
                  key={n}
                  className="group flex items-center hover:bg-white/5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => handleApply(preset)}
                    className="flex-1 text-left px-3 py-2 text-xs font-medium truncate"
                  >
                    {n}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(n)}
                    className="opacity-0 group-hover:opacity-100 mr-2 p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-red-400 transition-all"
                    title="Delete preset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
