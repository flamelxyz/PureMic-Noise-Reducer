const STORAGE_KEY = "puremic.presets.v1";

export interface AudioPreset {
  inputGain: number;
  outputGain: number;
  eqEnabled: boolean;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  hardMode: boolean;
}

export type PresetMap = Record<string, AudioPreset>;

export function loadPresets(): PresetMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePresets(presets: PresetMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage full or unavailable — ignore; in-memory state still updates.
  }
}

export function savePreset(name: string, preset: AudioPreset): PresetMap {
  const next = { ...loadPresets(), [name]: preset };
  writePresets(next);
  return next;
}

export function deletePreset(name: string): PresetMap {
  const current = loadPresets();
  if (!(name in current)) return current;
  const { [name]: _removed, ...rest } = current;
  writePresets(rest);
  return rest;
}
