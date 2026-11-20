import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSettings, type AmbienceSource, type Appearance, type SceneLighting, type Settings } from "../store/settings";
import { useHistory } from "../store/history";
import { useTimer } from "../store/timer";
import { audio } from "../lib/audio";
import { checkPlayable, deleteCustomAmbience, saveCustomAmbience } from "../lib/customAmbience";
import { ensureNotificationPermission, notify } from "../lib/notify";
import { isTauri } from "../lib/platform";
import { Modal } from "./Modal";
import { PixelIcon } from "./PixelIcon";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-pixel m-0 text-[9px]" style={{ color: "var(--muted)" }}>
        {title}
      </h3>
      <div className="px-inset flex flex-col gap-3 p-3">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span>{label}</span>
        {hint && (
          <span className="text-[16px] leading-tight" style={{ color: "var(--faint)" }}>
            {hint}
          </span>
        )}
      </div>
      <div className="flex flex-none items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-[20px] w-[42px] border-0 p-0"
      style={{ background: on ? "var(--short)" : "var(--panel-3)", boxShadow: "0 0 0 2px var(--border), inset 2px 2px 0 0 rgba(0,0,0,.2)" }}
    >
      <span
        className="absolute top-[2px] h-[16px] w-[16px]"
        style={{
          left: on ? 24 : 2,
          background: "var(--panel)",
          boxShadow: "0 0 0 2px var(--border), inset -2px -2px 0 0 var(--lo)",
        }}
      />
    </button>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
  suffix,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  suffix?: string;
  label: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = Math.round(Number(raw));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
    else setText(String(value));
  };
  return (
    <div className="flex items-center gap-1">
      <button className="px-btn-ghost border-0" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}>
        <PixelIcon name="minus" size={12} />
      </button>
      <input
        className="px-input font-pixel !w-[54px] text-center text-[11px]"
        value={text}
        inputMode="numeric"
        aria-label={label}
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
      />
      <button className="px-btn-ghost border-0" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}>
        <PixelIcon name="plus" size={12} />
      </button>
      {suffix && (
        <span className="w-8 text-[17px]" style={{ color: "var(--muted)" }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex" style={{ boxShadow: "0 0 0 2px var(--border)" }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className="border-0 px-3 py-[2px] text-[18px]"
          style={{
            background: o.value === value ? "var(--accent)" : "var(--panel-3)",
            color: o.value === value ? "var(--border)" : "var(--text)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const AUDIO_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

function AmbienceTrack() {
  const source = useSettings((s) => s.ambienceSource);
  const custom = useSettings((s) => s.customAmbience);
  const set = (patch: Partial<Settings>) => useSettings.getState().update(patch);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const usingCustom = source === "custom" && custom !== null;

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      await checkPlayable(file);
      await saveCustomAmbience(file);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
      audio.unlock();
      set({
        customAmbience: { name: file.name, type: file.type || AUDIO_TYPES[ext] || "", savedAt: Date.now() },
        ambienceSource: "custom",
        ambience: true,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that file.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(null);
    try {
      await deleteCustomAmbience();
      set({ customAmbience: null, ambienceSource: "builtin" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't remove the file.");
    }
  };

  return (
    <>
      <Row label="Ambient track" hint="Yours plays in every world.">
        <Segmented<AmbienceSource>
          value={usingCustom ? "custom" : "builtin"}
          onChange={(v) => {
            if (v === "custom" && !custom) input.current?.click();
            else set({ ambienceSource: v });
          }}
          options={[
            { value: "builtin", label: "Built-in" },
            { value: "custom", label: "My file" },
          ]}
        />
      </Row>
      {(custom || busy) && (
        <div className="flex items-center justify-between gap-4">
          <span className="min-w-0 truncate text-[17px]" style={{ color: "var(--muted)" }} title={custom?.name}>
            {busy ? "Saving…" : `♪ ${custom?.name}`}
          </span>
          <div className="flex flex-none items-center gap-2">
            <button className="px-btn text-[16px]" style={{ padding: "0 8px" }} disabled={busy} onClick={() => input.current?.click()}>
              Replace…
            </button>
            <button className="px-btn text-[16px]" style={{ padding: "0 8px" }} disabled={busy} onClick={() => void remove()} aria-label="Remove my ambient track">
              <PixelIcon name="trash" size={12} />
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="m-0 text-[16px]" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        hidden
        accept="audio/*,.mp3,.m4a,.aac,.wav,.aif,.aiff,.flac,.ogg"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const set = (patch: Partial<Settings>) => useSettings.getState().update(patch);
  const sessions = useHistory((h) => h.sessions.length);
  const [confirmClear, setConfirmClear] = useState(false);
  const [dataDir, setDataDir] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isTauri) return;
    import("@tauri-apps/api/core")
      .then((c) => c.invoke<string>("data_dir"))
      .then(setDataDir)
      .catch(() => setDataDir(null));
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="SETTINGS" width={560}>
      <div className="flex flex-col gap-6">
        <Section title="TIMER">
          <Row label="Focus">
            <Stepper label="Focus minutes" value={s.focusMin} min={1} max={120} suffix="min" onChange={(v) => set({ focusMin: v })} />
          </Row>
          <Row label="Short break">
            <Stepper label="Short break minutes" value={s.shortBreakMin} min={1} max={60} suffix="min" onChange={(v) => set({ shortBreakMin: v })} />
          </Row>
          <Row label="Long break">
            <Stepper label="Long break minutes" value={s.longBreakMin} min={1} max={90} suffix="min" onChange={(v) => set({ longBreakMin: v })} />
          </Row>
          <Row label="Long break every">
            <Stepper
              label="Sessions before long break"
              value={s.longBreakInterval}
              min={2}
              max={12}
              suffix="focus"
              onChange={(v) => set({ longBreakInterval: v })}
            />
          </Row>
          <Row label="Auto-start next session" hint="Off: wait for you to press Start after each session.">
            <Toggle label="Auto-start next session" on={s.autoAdvance} onChange={(v) => set({ autoAdvance: v })} />
          </Row>
          <p className="m-0 text-[16px]" style={{ color: "var(--faint)" }}>
            New durations apply to the next session that starts.
          </p>
        </Section>

        <Section title="SOUND & ALERTS">
          <Row label="Sound effects">
            <input
              type="range"
              className="px-range !w-[110px]"
              min={0}
              max={1}
              step={0.05}
              value={s.volume}
              disabled={!s.sound}
              aria-label="Sound effects volume"
              onChange={(e) => {
                audio.volume = Number(e.target.value);
                set({ volume: Number(e.target.value) });
              }}
              onPointerUp={() => audio.play("focusEnd")}
            />
            <Toggle
              label="Sound effects"
              on={s.sound}
              onChange={(v) => {
                set({ sound: v });
                if (v) audio.play("start");
              }}
            />
          </Row>
          <Row
            label="Ambient sounds"
            hint={
              s.ambienceSource === "custom" && s.customAmbience
                ? "Your own track, on a loop."
                : "Rain, wind and fire, café murmur."
            }
          >
            <input
              type="range"
              className="px-range !w-[110px]"
              min={0}
              max={1}
              step={0.05}
              value={s.ambienceVolume}
              disabled={!s.ambience}
              aria-label="Ambient volume"
              onChange={(e) => {
                audio.setAmbienceVolume(Number(e.target.value));
                set({ ambienceVolume: Number(e.target.value) });
              }}
            />
            <Toggle
              label="Ambient sounds"
              on={s.ambience}
              onChange={(v) => {
                audio.unlock();
                set({ ambience: v });
              }}
            />
          </Row>
          <AmbienceTrack />
          <Row label="Desktop notifications">
            <button
              className="px-btn text-[16px]"
              style={{ padding: "0 8px" }}
              disabled={!s.notifications}
              onClick={() => notify("Pixel Pomodoro", "Notifications are working. See you after your next session!")}
            >
              <PixelIcon name="bell" size={12} /> Test
            </button>
            <Toggle
              label="Desktop notifications"
              on={s.notifications}
              onChange={(v) => {
                set({ notifications: v });
                if (v) void ensureNotificationPermission();
              }}
            />
          </Row>
        </Section>

        <Section title="LOOK & FEEL">
          <Row label="Appearance">
            <Segmented<Appearance>
              value={s.appearance}
              onChange={(v) => set({ appearance: v })}
              options={[
                { value: "system", label: "Auto" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
          </Row>
          <Row label="Scene lighting" hint="Auto follows your clock.">
            <Segmented<SceneLighting>
              value={s.lighting}
              onChange={(v) => set({ lighting: v })}
              options={[
                { value: "auto", label: "Auto" },
                { value: "day", label: "Day" },
                { value: "dusk", label: "Dusk" },
                { value: "night", label: "Night" },
              ]}
            />
          </Row>
          <Row label="Unlock all worlds" hint="Skip earning scenes with pomodoros.">
            <Toggle label="Unlock all worlds" on={s.unlockAll} onChange={(v) => set({ unlockAll: v })} />
          </Row>
        </Section>

        <Section title="DATA">
          <Row label="Session history" hint={`${sessions} focus sessions recorded`}>
            {confirmClear ? (
              <>
                <button className="px-btn text-[16px]" style={{ padding: "0 8px" }} onClick={() => setConfirmClear(false)}>
                  Keep
                </button>
                <button
                  className="px-btn text-[16px]"
                  style={{ padding: "0 8px", ["--btn-bg" as string]: "var(--danger)", color: "#fff8ec" }}
                  onClick={() => {
                    useHistory.getState().clearHistory();
                    useTimer.getState().resetCycle();
                    setConfirmClear(false);
                  }}
                >
                  Erase
                </button>
              </>
            ) : (
              <button className="px-btn text-[16px]" style={{ padding: "0 8px" }} onClick={() => setConfirmClear(true)}>
                <PixelIcon name="trash" size={12} /> Clear
              </button>
            )}
          </Row>
          <Row label="Restore default settings">
            <button className="px-btn text-[16px]" style={{ padding: "0 8px" }} onClick={() => useSettings.getState().restoreDefaults()}>
              <PixelIcon name="reset" size={12} /> Reset
            </button>
          </Row>
          {dataDir && (
            <p className="m-0 text-[15px] break-all" style={{ color: "var(--faint)" }}>
              Saved locally in {dataDir}
            </p>
          )}
        </Section>

        <p className="m-0 text-center text-[16px]" style={{ color: "var(--faint)" }}>
          Space start/pause · R reset · S skip · T new task · 1–4 worlds · ⌘, settings
        </p>
      </div>
    </Modal>
  );
}
