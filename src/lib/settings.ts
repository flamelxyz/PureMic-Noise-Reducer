const STORAGE_KEY = "puremic.settings.v1";

export interface PersistedSettings {
  micId: string | null;
  outputId: string | null;
  inputGain: number;
  outputGain: number;
  eqEnabled: boolean;
  eqBass: number;
  eqMid: number;
  eqTreble: number;
  hardMode: boolean;
}

export const DEFAULT_SETTINGS: PersistedSettings = {
  micId: null,
  outputId: null,
  inputGain: 1.0,
  outputGain: 1.0,
  eqEnabled: true,
  eqBass: 3.0,
  eqMid: 1.5,
  eqTreble: -2.5,
  hardMode: false,
};

function readRaw(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

let cached: PersistedSettings = readRaw();

export function loadSettings(): PersistedSettings {
  return cached;
}

export function patchSettings(patch: Partial<PersistedSettings>): PersistedSettings {
  cached = { ...cached, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // localStorage unavailable — silently ignore; in-memory cache still works for the session
  }
  return cached;
}
