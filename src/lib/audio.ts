import type { SceneId } from "../store/settings";

/** A scene's built-in ambience, or the user's own uploaded track. */
export type AmbienceKey = SceneId | "custom";

export type Cue = "focusEnd" | "breakEnd" | "start" | "pause" | "click" | "complete" | "add";

type Note = [freq: number, startBeat: number, beats: number, type?: OscillatorType];

const N = (name: string) => {
  const map: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(name)!;
  const semis = map[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semis / 12);
};

const CUES: Record<Cue, { bpm: number; notes: Note[]; gain: number }> = {
  // A bright little "quest complete" fanfare.
  focusEnd: {
    bpm: 300,
    gain: 0.22,
    notes: [
      [N("C5"), 0, 1], [N("E5"), 1, 1], [N("G5"), 2, 1], [N("C6"), 3, 3],
      [N("G5"), 6, 1], [N("C6"), 7, 4],
      [N("C4"), 0, 3, "triangle"], [N("G4"), 3, 3, "triangle"], [N("C5"), 6, 5, "triangle"],
    ],
  },
  // A gentle "back to work" motif.
  breakEnd: {
    bpm: 260,
    gain: 0.2,
    notes: [
      [N("G5"), 0, 1], [N("E5"), 1, 1], [N("C5"), 2, 1], [N("D5"), 3, 1], [N("G5"), 4, 3],
      [N("C4"), 0, 3, "triangle"], [N("G3"), 3, 4, "triangle"],
    ],
  },
  start: { bpm: 480, gain: 0.14, notes: [[N("E5"), 0, 1], [N("B5"), 1, 2]] },
  pause: { bpm: 480, gain: 0.14, notes: [[N("B5"), 0, 1], [N("E5"), 1, 2]] },
  click: { bpm: 600, gain: 0.08, notes: [[N("A5"), 0, 1]] },
  complete: { bpm: 480, gain: 0.14, notes: [[N("C6"), 0, 1], [N("E6"), 1, 1], [N("G6"), 2, 2]] },
  add: { bpm: 520, gain: 0.12, notes: [[N("G5"), 0, 1], [N("D6"), 1, 1]] },
};

class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: { key: AmbienceKey; nodes: AudioNode[]; gain: GainNode; stops: (() => void)[] } | null = null;
  private wanted: AmbienceKey | null = null;
  private customTrack: Blob | null = null;
  volume = 0.6;
  ambienceVolume = 0.35;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined" || !("AudioContext" in window)) return null;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Must be called from a user gesture at least once so WebKit allows playback. */
  unlock() {
    this.ensure();
  }

  play(cue: Cue) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const def = CUES[cue];
    const beat = 60 / def.bpm;
    const t0 = ctx.currentTime + 0.02;
    const out = ctx.createGain();
    out.gain.value = def.gain * this.volume;
    out.connect(this.master);
    let end = 0;
    for (const [freq, at, len, type = "square"] of def.notes) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const s = t0 + at * beat;
      const e = s + len * beat;
      const peak = type === "triangle" ? 0.9 : 0.5;
      env.gain.setValueAtTime(0, s);
      env.gain.linearRampToValueAtTime(peak, s + 0.008);
      env.gain.setValueAtTime(peak * 0.7, s + Math.min(0.06, (e - s) / 2));
      env.gain.exponentialRampToValueAtTime(0.0001, e);
      osc.connect(env).connect(out);
      osc.start(s);
      osc.stop(e + 0.02);
      end = Math.max(end, e);
    }
    setTimeout(() => out.disconnect(), (end - ctx.currentTime + 0.5) * 1000);
  }

  private noiseBuffer(ctx: AudioContext, kind: "pink" | "brown") {
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "pink") {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.2;
      }
    }
    return buf;
  }

  /** Sets the uploaded track used by the "custom" ambience; restarts it if it's playing. */
  setCustomTrack(track: Blob | null) {
    if (track === this.customTrack) return;
    this.customTrack = track;
    if (this.wanted === "custom") {
      this.stopAmbience();
      this.startAmbience("custom");
    }
  }

  /** Starts (or switches) the looping ambient bed; pass null to stop. */
  setAmbience(key: AmbienceKey | null) {
    this.wanted = key;
    if (this.ambience && this.ambience.key === key) return;
    this.stopAmbience();
    if (key) this.startAmbience(key);
  }

  /** Built-in beds are synthesized loud, so they sit lower than a user's mixed track. */
  private ambienceLevel(key: AmbienceKey) {
    return this.ambienceVolume * (key === "custom" ? 0.8 : 0.5);
  }

  private startAmbience(key: AmbienceKey) {
    if (key === "custom" && !this.customTrack) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(this.ambienceLevel(key), ctx.currentTime + 1.5);
    gain.connect(this.master);
    const nodes: AudioNode[] = [gain];
    const stops: (() => void)[] = [];

    const loop = (kind: "pink" | "brown") => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer(ctx, kind);
      src.loop = true;
      src.start();
      stops.push(() => src.stop());
      nodes.push(src);
      return src;
    };
    const filter = (type: BiquadFilterType, f: number, q = 0.7) => {
      const b = ctx.createBiquadFilter();
      b.type = type;
      b.frequency.value = f;
      b.Q.value = q;
      nodes.push(b);
      return b;
    };
    const lfo = (target: AudioParam, rate: number, depth: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = rate;
      g.gain.value = depth;
      o.connect(g).connect(target);
      o.start();
      stops.push(() => o.stop());
      nodes.push(o, g);
    };

    if (key === "custom" && this.customTrack) {
      const url = URL.createObjectURL(this.customTrack);
      const el = new Audio(url);
      el.loop = true;
      const src = ctx.createMediaElementSource(el);
      src.connect(gain);
      nodes.push(src);
      void el.play().catch(() => {
        /* retried on the first click by AudioManager's unlock handler */
      });
      stops.push(() => {
        el.pause();
        el.removeAttribute("src");
        el.load();
        URL.revokeObjectURL(url);
      });
    } else if (key === "bedroom" || key === "city") {
      // Rain on glass: pink noise with the lows trimmed, plus a soft low rumble.
      loop("pink").connect(filter("highpass", 400)).connect(filter("lowpass", key === "city" ? 3500 : 6000)).connect(gain);
      const rumble = ctx.createGain();
      rumble.gain.value = key === "city" ? 0.9 : 0.5;
      nodes.push(rumble);
      loop("brown").connect(filter("lowpass", 180)).connect(rumble).connect(gain);
    } else if (key === "cabin") {
      // Wind through pines with slow gusts, and a crackling fire.
      const wind = filter("bandpass", 500, 0.6);
      const windGain = ctx.createGain();
      windGain.gain.value = 0.7;
      nodes.push(windGain);
      loop("brown").connect(wind).connect(windGain).connect(gain);
      lfo(wind.frequency, 0.07, 220);
      lfo(windGain.gain, 0.11, 0.35);
      const crackle = ctx.createGain();
      crackle.gain.value = 0;
      nodes.push(crackle);
      loop("pink").connect(filter("highpass", 2500)).connect(crackle).connect(gain);
      const pop = () => {
        if (!this.ambience || this.ambience.gain !== gain) return;
        const t = ctx.currentTime;
        crackle.gain.setValueAtTime(0.5 + Math.random() * 0.6, t);
        crackle.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.05);
        setTimeout(pop, 60 + Math.random() * 400);
      };
      setTimeout(pop, 300);
    } else if (key === "cafe") {
      // Murmur of a quiet room and the occasional cup clink.
      const murmur = filter("bandpass", 350, 1.2);
      loop("brown").connect(murmur).connect(gain);
      lfo(murmur.frequency, 0.3, 120);
      const air = ctx.createGain();
      air.gain.value = 0.25;
      nodes.push(air);
      loop("pink").connect(filter("lowpass", 1200)).connect(air).connect(gain);
      const clink = () => {
        if (!this.ambience || this.ambience.gain !== gain) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 2400 + Math.random() * 1600;
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.connect(g).connect(gain);
        o.start(t);
        o.stop(t + 0.45);
        setTimeout(clink, 4000 + Math.random() * 9000);
      };
      setTimeout(clink, 2500);
    }
    this.ambience = { key, nodes, gain, stops };
  }

  setAmbienceVolume(v: number) {
    this.ambienceVolume = v;
    if (this.ambience && this.ctx) {
      this.ambience.gain.gain.setTargetAtTime(this.ambienceLevel(this.ambience.key), this.ctx.currentTime, 0.2);
    }
  }

  private stopAmbience() {
    const a = this.ambience;
    if (!a || !this.ctx) return;
    this.ambience = null;
    const t = this.ctx.currentTime;
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setTargetAtTime(0, t, 0.25);
    setTimeout(() => {
      a.stops.forEach((s) => {
        try {
          s();
        } catch {
          /* already stopped */
        }
      });
      a.nodes.forEach((n) => n.disconnect());
    }, 1200);
  }
}

export const audio = new AudioManager();
