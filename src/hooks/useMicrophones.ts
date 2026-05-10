import { invoke } from "@/lib/tauri";
import { useEffect, useState, useCallback } from "react";
import type { AudioDevice } from "@/lib/types";

export function useMicrophones(initialId?: string | null) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selected, setSelectedState] = useState<string | null>(initialId ?? null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const devs = await invoke<AudioDevice[]>("get_microphones");
      setDevices(devs);

      // If none selected yet, or current selection is gone, prefer the persisted
      // initialId (if it still exists), then fall back to the system default.
      const currentExists = devs.some(d => d.id === selected);
      if (!selected || !currentExists) {
        const persisted = initialId && devs.find((d) => d.id === initialId);
        if (persisted) {
          setSelectedState(persisted.id);
        } else {
          const def = devs.find((d) => d.is_default);
          if (def) setSelectedState(def.id);
        }
      }
    } catch (err) {
      console.error("Failed to load microphones:", err);
    } finally {
      setLoading(false);
    }
  }, [selected, initialId]);

  useEffect(() => {
    refresh();
  }, []); // Initial load

  const selectMic = async (id: string) => {
    await invoke("set_microphone", { deviceId: id });
    setSelectedState(id);
  };

  return { devices, selected, loading, selectMic, refresh };
}
