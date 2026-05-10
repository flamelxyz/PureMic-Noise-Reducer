import { useState, useEffect, useCallback } from "react";
import { invoke } from "@/lib/tauri";
import { patchSettings } from "@/lib/settings";
import { X, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EQBand {
  label: string;
  freq: string;
  value: number;
  key: "bass" | "mid" | "treble";
  color: string;
}

const DEFAULTS = { bass: 3.0, mid: 1.5, treble: -2.5 };
const MIN_DB = -12;
const MAX_DB = 12;

interface Props {
  open: boolean;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  onClose: () => void;
}

export function EQPanel({ open, enabled, onEnabledChange, onClose }: Props) {
  const [bands, setBands] = useState<Record<string, number>>(DEFAULTS);

  useEffect(() => {
    if (open) {
      invoke<[number, number, number]>("get_eq_bands")
        .then(([bass, mid, treble]) => setBands({ bass, mid, treble }))
        .catch(console.error);
    }
  }, [open]);

  const updateBand = useCallback(
    (key: string, value: number) => {
      const next = { ...bands, [key]: value };
      setBands(next);
      invoke("set_eq_bands", { bass: next.bass, mid: next.mid, treble: next.treble }).catch(console.error);
      patchSettings({ eqBass: next.bass, eqMid: next.mid, eqTreble: next.treble });
    },
    [bands]
  );

  const resetAll = useCallback(() => {
    setBands(DEFAULTS);
    invoke("set_eq_bands", { bass: DEFAULTS.bass, mid: DEFAULTS.mid, treble: DEFAULTS.treble }).catch(console.error);
    patchSettings({ eqBass: DEFAULTS.bass, eqMid: DEFAULTS.mid, eqTreble: DEFAULTS.treble });
  }, []);

  if (!open) return null;

  const eqBands: EQBand[] = [
    { label: "Bass", freq: "300 Hz", value: bands.bass, key: "bass", color: "from-indigo-500 to-indigo-600" },
    { label: "Mid", freq: "2.5 kHz", value: bands.mid, key: "mid", color: "from-violet-500 to-violet-600" },
    { label: "Treble", freq: "6 kHz", value: bands.treble, key: "treble", color: "from-purple-500 to-purple-600" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Switch
              checked={enabled}
              onCheckedChange={(v) => {
                onEnabledChange(v);
                invoke("set_eq_enabled", { enabled: v }).catch(console.error);
                patchSettings({ eqEnabled: v });
              }}
              className="data-[state=checked]:bg-emerald-500"
            />
            <div>
              <h3 className="text-sm font-bold tracking-tight">Equalizer</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {enabled ? "Active" : "Bypassed"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={resetAll}
              className="p-2 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* EQ Sliders */}
        <div className={`px-5 py-5 space-y-5 transition-opacity duration-200 ${enabled ? "" : "opacity-40 pointer-events-none"}`}>
          {eqBands.map((band) => (
            <EQSlider
              key={band.key}
              label={band.label}
              freq={band.freq}
              value={band.value}
              color={band.color}
              onChange={(v) => updateBand(band.key, v)}
            />
          ))}
        </div>

        <div className="h-2" />
      </div>
    </div>
  );
}

function EQSlider({
  label,
  freq,
  value,
  color,
  onChange,
}: {
  label: string;
  freq: string;
  value: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - MIN_DB) / (MAX_DB - MIN_DB)) * 100;
  const isPositive = value > 0;
  const displayDb = value.toFixed(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[10px] text-muted-foreground">{freq}</span>
        </div>
        <span
          className={`text-xs font-mono font-bold tabular-nums ${isPositive ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-muted-foreground"
            }`}
        >
          {isPositive ? "+" : ""}{displayDb} dB
        </span>
      </div>

      <div className="relative group">
        <div className="h-2 rounded-full bg-white/5 relative overflow-hidden">
          <div className="absolute left-1/2 top-0 w-px h-full bg-white/10 -translate-x-px" />
          <div
            className={`absolute top-0 h-full rounded-full bg-gradient-to-r ${color} opacity-80 transition-all duration-75`}
            style={{
              left: value >= 0 ? "50%" : `${pct}%`,
              width: value >= 0 ? `${pct - 50}%` : `${50 - pct}%`,
            }}
          />
        </div>

        <input
          type="range"
          min={MIN_DB}
          max={MAX_DB}
          step={0.5}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-black/50 border-2 border-zinc-600 group-hover:border-zinc-400 transition-all pointer-events-none"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
    </div>
  );
}
