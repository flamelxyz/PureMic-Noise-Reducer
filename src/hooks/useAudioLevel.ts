import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";

export function useAudioLevel(active: boolean): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active) {
      setLevel(0);
      return;
    }

    let cancelled = false;
    const unlistenPromise = listen<number>("audio-level", (event) => {
      if (cancelled) return;
      setLevel(Math.min(event.payload * 4, 1.0));
    });

    return () => {
      cancelled = true;
      unlistenPromise.then((u) => u()).catch(() => { });
    };
  }, [active]);

  return level;
}
