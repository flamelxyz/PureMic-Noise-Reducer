import { useState, useEffect, useRef } from "react";
import { invoke } from "@/lib/tauri";
import { loadSettings, patchSettings } from "@/lib/settings";
import { useMicrophones } from "@/hooks/useMicrophones";
import { useOutputDevices } from "@/hooks/useOutputDevices";
import { useAudio } from "@/hooks/useAudio";
import { useAudioLevel } from "@/hooks/useAudioLevel";
import { NoiseToggle } from "@/components/NoiseToggle";
import { MicrophoneSelector } from "@/components/MicrophoneSelector";
import { GainSlider } from "@/components/GainSlider";
import { DriverSetup } from "@/components/DriverSetup";
import { SettingsModal } from "@/components/SettingsModal";
import { VoicePoweredOrb } from "@/components/VoicePoweredOrb";
import { EQPanel } from "@/components/EQPanel";
import { PresetMenu } from "@/components/PresetMenu";
import type { AudioPreset } from "@/lib/presets";
import { ShieldCheck, Settings2, Loader2, Lock, Headphones, Mic, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import appLogo from "@/assets/menuBar.png";

export function Main() {
  // Read persisted settings synchronously so device hooks and state can
  // initialise with the user's previous choices on first render.
  const initialSettings = useRef(loadSettings()).current;

  const mics = useMicrophones(initialSettings.micId);
  const outputs = useOutputDevices(initialSettings.outputId);
  const audio = useAudio();
  const level = useAudioLevel(audio.pipelineRunning);

  const [ncEnabled, setNcEnabled] = useState(false);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [inputGain, setInputGain] = useState(initialSettings.inputGain);
  const [outputGain, setOutputGain] = useState(initialSettings.outputGain);
  const [virtualDevice, setVirtualDevice] = useState<string | null>(null);
  const [driverInstalled, setDriverInstalled] = useState<boolean | null>(null);
  const [platform, setPlatform] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [eqOpen, setEqOpen] = useState(false);
  const [eqEnabled, setEqEnabled] = useState(initialSettings.eqEnabled);
  const [isDriverInstalling, setIsDriverInstalling] = useState(false);

  useEffect(() => {
    // Re-apply persisted audio config to the backend atomics on every launch
    // (the Rust side resets these on process start).
    invoke("set_input_gain", { gain: initialSettings.inputGain }).catch(() => { });
    invoke("set_output_gain", { gain: initialSettings.outputGain }).catch(() => { });
    invoke("set_eq_enabled", { enabled: initialSettings.eqEnabled }).catch(() => { });
    invoke("set_eq_bands", {
      bass: initialSettings.eqBass,
      mid: initialSettings.eqMid,
      treble: initialSettings.eqTreble,
    }).catch(() => { });
    audio.setHardModeEnabled(initialSettings.hardMode);

    invoke<string>("get_platform").then(setPlatform).catch(() => { });
    invoke<boolean>("is_driver_installed")
      .then((installed) => {
        setDriverInstalled(installed);
        if (installed) {
          audio.detectVirtualDevice().then(setVirtualDevice).catch(console.error);
        }
      })
      .catch((err) => {
        console.error("is_driver_installed failed:", err);
        setDriverInstalled(false);
      });
  }, []);

  // Auto-refresh device lists when the window regains focus or becomes
  // visible (e.g. user plugged in headphones while the app was in the tray).
  useEffect(() => {
    const refresh = () => {
      mics.refresh();
      outputs.refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mics.refresh, outputs.refresh]);

  const handleNcToggle = async (next: boolean) => {
    setNcEnabled(next);
    try {
      if (audio.pipelineRunning) {
        await audio.setDenoiseEnabled(next);
        if (!next && !monitoringEnabled) {
          await audio.stopPipeline();
        }
      } else if (next) {
        const monId = monitoringEnabled ? outputs.selected : null;
        await audio.startPipeline(mics.selected, monId, true, virtualDevice);
      }
    } catch (e) {
      console.error("[NC] Error:", e);
    }
  };

  const handleMonitoringToggle = async (next: boolean) => {
    setMonitoringEnabled(next);
    try {
      if (next || ncEnabled) {
        const monId = next ? outputs.selected : null;
        await audio.startPipeline(mics.selected, monId, ncEnabled, virtualDevice);
      } else if (audio.pipelineRunning) {
        await audio.stopPipeline();
      }
    } catch (e) {
      console.error("[MON] Error:", e);
    }
  };

  const handleMicSelect = async (id: string) => {
    await mics.selectMic(id);
    patchSettings({ micId: id });
  };

  const handleOutputSelect = async (id: string) => {
    outputs.selectOutput(id);
    patchSettings({ outputId: id });
    if (audio.pipelineRunning && monitoringEnabled) {
      await audio.startPipeline(mics.selected, id, ncEnabled, virtualDevice);
    }
  };

  const handleInputGain = (v: number) => {
    setInputGain(v);
    audio.setInputGain(v);
    patchSettings({ inputGain: v });
  };

  const handleOutputGain = (v: number) => {
    setOutputGain(v);
    audio.setOutputGain(v);
    patchSettings({ outputGain: v });
  };

  const handleHardModeToggle = (next: boolean) => {
    audio.setHardModeEnabled(next);
    patchSettings({ hardMode: next });
  };

  const buildCurrentPreset = (): AudioPreset => {
    const s = loadSettings();
    return {
      inputGain,
      outputGain,
      eqEnabled,
      eqBass: s.eqBass,
      eqMid: s.eqMid,
      eqTreble: s.eqTreble,
      hardMode: audio.hardMode,
    };
  };

  const handleApplyPreset = async (preset: AudioPreset) => {
    setInputGain(preset.inputGain);
    setOutputGain(preset.outputGain);
    setEqEnabled(preset.eqEnabled);
    audio.setInputGain(preset.inputGain);
    audio.setOutputGain(preset.outputGain);
    audio.setHardModeEnabled(preset.hardMode);
    invoke("set_eq_enabled", { enabled: preset.eqEnabled }).catch(() => { });
    invoke("set_eq_bands", {
      bass: preset.eqBass,
      mid: preset.eqMid,
      treble: preset.eqTreble,
    }).catch(() => { });
    patchSettings({
      inputGain: preset.inputGain,
      outputGain: preset.outputGain,
      eqEnabled: preset.eqEnabled,
      eqBass: preset.eqBass,
      eqMid: preset.eqMid,
      eqTreble: preset.eqTreble,
      hardMode: preset.hardMode,
    });
  };

  // Loading state
  if (platform === null || driverInstalled === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-700">
          <div className="relative">
            <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="h-10 w-10 text-primary animate-spin relative" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            Initializing Engine
          </p>
        </div>
      </div>
    );
  }

  // Onboarding: macOS driver not installed
  if (driverInstalled === false && platform === "macos") {
    return (
      <div className="flex h-screen w-full flex-col bg-background overflow-hidden relative">
        {isDriverInstalling && (
          <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="relative">
              <div className="absolute -inset-8 bg-primary/10 rounded-full blur-2xl animate-pulse" />
              <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
            </div>
            <h2 className="mt-8 text-xl font-bold tracking-tight text-foreground">Installing Core Audio</h2>
            <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <p className="text-sm font-medium">Please enter your Mac password if prompted.</p>
            </div>
          </div>
        )}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <main className="flex-1 flex items-center justify-center p-6 z-10">
          <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="mb-2">
                <img src={appLogo} alt="PureMic Logo" className="w-[124px] h-[124px] object-contain rounded-md" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome to PureMic</h2>
              <p className="text-sm text-muted-foreground">
                Follow the steps below to prepare your system for crystal clear voice cancellation.
              </p>
            </div>

            <DriverSetup
              onInstalled={() => {
                setIsDriverInstalling(false);
                setDriverInstalled(true);
                audio.detectVirtualDevice().then(setVirtualDevice).catch(console.error);
              }}
              onInstallStart={() => setIsDriverInstalling(true)}
              onInstallError={() => setIsDriverInstalling(false)}
            />

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              <ShieldCheck className="h-3 w-3" />
              Secure Driver Installation
            </div>
          </div>
        </main>

        <footer className="p-8 text-center">
          <p className="text-[10px] text-muted-foreground/40 font-medium">
            &copy; 2026 PUREMIC TECHNOLOGY
          </p>
        </footer>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {isDriverInstalling && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur flex flex-col items-center justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">Installing driver... Enter your Mac password if prompted.</p>
        </div>
      )}

      <EQPanel open={eqOpen} enabled={eqEnabled} onEnabledChange={setEqEnabled} onClose={() => setEqOpen(false)} />

      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        driverInstalled={driverInstalled}
        virtualDevice={virtualDevice}
        onInstalled={() => {
          setIsDriverInstalling(false);
          audio.detectVirtualDevice().then(setVirtualDevice).catch(console.error);
        }}
        onInstallStart={() => setIsDriverInstalling(true)}
        onInstallError={() => setIsDriverInstalling(false)}
        outputDevices={outputs.devices}
        selectedOutput={outputs.selected}
        loadingOutputs={outputs.loading}
        onSelectOutput={handleOutputSelect}
        onRefreshOutputs={outputs.refresh}
      />

      {/* macOS Custom TitleBar */}
      <div
        data-tauri-drag-region
        className="h-7 w-full bg-zinc-950 flex items-center justify-center border-b border-white/5 relative z-50 select-none shrink-0"
      >
        <span className="text-[11px] font-semibold text-zinc-400 tracking-wider font-sans pointer-events-none">PureMic</span>
      </div>

      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img src={appLogo} alt="PureMic" className="w-7 h-7 rounded-md" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">PureMic</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleMonitoringToggle(!monitoringEnabled)}
            className={`p-2 rounded-full transition-colors ${monitoringEnabled ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
          >
            <Headphones className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEqOpen(true)}
            className={`px-2 py-1.5 rounded-full transition-colors text-[11px] font-black tracking-tight leading-none ${eqEnabled
                ? "bg-emerald-500/20 text-emerald-400"
                : "text-muted-foreground hover:bg-white/5"
              }`}
          >
            EQ
          </button>
          <PresetMenu
            currentPreset={buildCurrentPreset()}
            onApply={handleApplyPreset}
          />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full text-muted-foreground hover:bg-white/5 transition-colors"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start px-5 pt-8 pb-4 gap-6 overflow-hidden">

        {/* Power Button & Orb */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="relative flex items-center justify-center w-full h-[240px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible">
              <div className="w-[240px] h-[240px] opacity-80">
                <VoicePoweredOrb
                  active={audio.pipelineRunning}
                  level={level}
                  hue={ncEnabled ? 160 : 260}
                  voiceSensitivity={1.5}
                />
              </div>
            </div>

            <NoiseToggle
              enabled={ncEnabled}
              busy={audio.busy}
              onToggle={handleNcToggle}
            />
          </div>
        </div>

        {/* Error */}
        {audio.error && (
          <div className="w-full max-w-sm p-3 rounded-md border border-red-500/20 bg-red-500/10 text-red-400 text-[11px] text-center">
            {audio.error}
          </div>
        )}

        {/* Controls Card */}
        <Card className="w-full max-w-sm bg-zinc-900/50 border-white/5 backdrop-blur-sm mt-auto mb-4 rounded-xl">
          <CardContent className="p-4 space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Input Device</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    mics.refresh();
                    outputs.refresh();
                  }}
                  disabled={mics.loading || outputs.loading}
                  className="p-1 rounded-md hover:bg-white/5 text-muted-foreground hover:text-primary transition-all disabled:opacity-50"
                  title="Refresh devices"
                >
                  <RefreshCw className={`h-3 w-3 ${mics.loading || outputs.loading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <MicrophoneSelector
                devices={mics.devices}
                selected={mics.selected}
                loading={mics.loading}
                onSelect={handleMicSelect}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <GainSlider label="Input" value={inputGain} onChange={handleInputGain} />
              <GainSlider label="Output" value={outputGain} onChange={handleOutputGain} disabled={!monitoringEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-white/5">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  Hard Reduce
                  {audio.hardMode && ncEnabled && (
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse inline-block" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Aggressive isolation</p>
              </div>
              <Switch
                checked={audio.hardMode}
                onCheckedChange={handleHardModeToggle}
                disabled={!ncEnabled || audio.busy}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="shrink-0 px-5 py-2 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${audio.pipelineRunning ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
            {audio.pipelineRunning ? "Active" : "Idle"}
          </span>
        </div>
        {virtualDevice && (
          <span className="text-[10px] text-muted-foreground/50 truncate max-w-[140px]">{virtualDevice}</span>
        )}
      </footer>
    </div>
  );
}
