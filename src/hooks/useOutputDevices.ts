import { invoke } from "@/lib/tauri";
import { useEffect, useState, useCallback } from "react";
import type { AudioDevice } from "@/lib/types";

export function useOutputDevices(initialId?: string | null) {
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selected, setSelectedState] = useState<string | null>(initialId ?? null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const devs = await invoke<AudioDevice[]>("get_output_devices");
      setDevices(devs);

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
      console.error("Failed to load output devices:", err);
    } finally {
      setLoading(false);
    }
  }, [selected, initialId]);

  useEffect(() => {
    refresh();
  }, []);

  const selectOutput = async (id: string) => {
    await invoke("set_output_device", { deviceId: id });
    setSelectedState(id);
  };

  return { devices, selected, loading, selectOutput, refresh };
}
