import { X, ShieldCheck, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { DriverSetup } from "./DriverSetup";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { invoke } from "@/lib/tauri";
import type { AudioDevice } from "@/lib/types";
import { OutputDeviceSelector } from "./OutputDeviceSelector";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverInstalled: boolean | null;
  virtualDevice: string | null;
  onInstalled: () => void;
  onInstallStart: () => void;
  onInstallError: (error: string) => void;
  outputDevices: AudioDevice[];
  selectedOutput: string | null;
  loadingOutputs: boolean;
  onSelectOutput: (id: string) => void;
  onRefreshOutputs?: () => void;
}

export function SettingsModal({
  open,
  onOpenChange,
  driverInstalled,
  virtualDevice,
  onInstalled,
  onInstallStart,
  onInstallError,
  outputDevices,
  selectedOutput,
  loadingOutputs,
  onSelectOutput,
  onRefreshOutputs,
}: SettingsModalProps) {
  const [uninstalling, setUninstalling] = useState(false);
  const [uninstallError, setUninstallError] = useState<string | null>(null);

  const handleUninstall = async () => {
    if (!confirm("Are you sure you want to remove the virtual audio driver?")) return;
    setUninstalling(true);
    setUninstallError(null);
    try {
      await invoke("uninstall_driver");
      onOpenChange(false);
    } catch (e) {
      setUninstallError(e as string);
    } finally {
      setUninstalling(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in-0 duration-200">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-white/5">
          <h2 className="text-sm font-bold tracking-tight">System Settings</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-3 flex flex-col gap-2">
          {/* Driver Status */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/40 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    driverInstalled && virtualDevice
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  )}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-tight">Core Audio Driver</span>
                  <span className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-medium truncate max-w-[200px]">
                    {driverInstalled
                      ? virtualDevice
                        ? `Active: ${virtualDevice}`
                        : "Awaiting Device Detection..."
                      : "Driver Not Found"}
                  </span>
                </div>
              </div>

              {driverInstalled && virtualDevice ? (
                <Badge
                  variant="outline"
                  className="border-green-500/30 text-green-400 bg-green-500/10 flex items-center gap-1.5 py-0 h-5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[9px]">ONLINE</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 text-amber-400 bg-amber-500/10 flex items-center gap-1.5 py-0 h-5"
                >
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span className="text-[9px]">SYNCING</span>
                </Badge>
              )}
            </div>

            {/* Install card only when driver missing — avoids redundant "Driver Required" UI */}
            {!driverInstalled && (
              <DriverSetup
                onInstalled={onInstalled}
                onInstallStart={onInstallStart}
                onInstallError={onInstallError}
              />
            )}
          </div>

          {/* Loopback Device */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/40 border border-white/5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold tracking-tight">Loopback Device</div>
              <button
                type="button"
                onClick={onRefreshOutputs}
                disabled={loadingOutputs}
                className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                title="Refresh output devices"
              >
                <RefreshCw className={cn("h-3 w-3", loadingOutputs && "animate-spin")} />
              </button>
            </div>
            <OutputDeviceSelector
              devices={outputDevices}
              selected={selectedOutput}
              loading={loadingOutputs}
              onSelect={onSelectOutput}
            />
          </div>

          {/* Remove Driver */}
          {driverInstalled && (
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-background/40 border border-white/5">
              {uninstallError && (
                <div className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
                  {uninstallError}
                </div>
              )}
              <button
                type="button"
                onClick={handleUninstall}
                disabled={uninstalling}
                className="flex items-center justify-center gap-2 w-full h-8 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[11px] font-semibold transition-colors disabled:opacity-50"
              >
                {uninstalling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                {uninstalling ? "Removing..." : "Remove Virtual Driver"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
