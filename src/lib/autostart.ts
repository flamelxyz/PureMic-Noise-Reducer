import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";

const inTauri = () =>
  typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;

/** Whether the app is registered to launch when the user logs in. */
export async function isAutostartEnabled(): Promise<boolean> {
  if (!inTauri()) return false;
  return isEnabled();
}

/** Register / unregister the app to launch at login (started with --minimized). */
export async function setAutostart(on: boolean): Promise<void> {
  if (!inTauri()) return;
  if (on) await enable();
  else await disable();
}
