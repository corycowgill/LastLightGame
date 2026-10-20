export type Mood = "exploration" | "hunt" | "sanctuary";
export function audioMood(phase: string, nearFire: boolean): Mood {
  if (
    [
      "EXTINGUISHING",
      "HUNT_GRACE",
      "HUNT_ACTIVE",
      "RELIGHTING",
      "DEAD",
    ].includes(phase)
  )
    return "hunt";
  return phase === "SANCTUARY" || nearFire ? "sanctuary" : "exploration";
}
export const AUDIO_FILES = [
  "exploration",
  "hunt",
  "sanctuary",
  "torch",
  "catacombs",
  "extinguish",
  "relight",
  "hunter",
  "burst",
] as const;
type Clip = (typeof AUDIO_FILES)[number];

/** Pre-rendered HF audio. Procedural gameplay cues remain available if loading fails. */
export class Soundscape {
  private buffers = new Map<Clip, AudioBuffer>();
  private loops = new Map<
    Clip,
    { source: AudioBufferSourceNode; gain: GainNode; target: number }
  >();
  private active = new Set<AudioBufferSourceNode>();
  musicVolume = 0.7;
  private disposed = false;
  private abort = new AbortController();
  constructor(
    private context: AudioContext,
    private master: GainNode,
  ) {
    void this.load();
  }
  private async load() {
    // Serial decode limits startup memory spikes on iPhone.
    for (const name of AUDIO_FILES) {
      try {
        const response = await fetch(`/audio/${name}.mp3`, {
          signal: this.abort.signal,
        });
        if (!response.ok) continue;
        const buffer = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (this.disposed) return;
        this.buffers.set(name, buffer);
      } catch {
        /* The procedural mixer is the fallback. */
      }
    }
  }
  get loaded() {
    return this.buffers.size;
  }
  has(name: Clip) {
    return this.buffers.has(name);
  }
  private loop(name: Clip, volume: number) {
    let entry = this.loops.get(name);
    if (!entry && volume > 0 && this.buffers.has(name)) {
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = this.buffers.get(name)!;
      source.loop = true;
      gain.gain.value = 0;
      source.connect(gain).connect(this.master);
      source.start();
      entry = { source, gain, target: 0 };
      this.loops.set(name, entry);
    }
    if (entry && entry.target !== volume) {
      entry.target = volume;
      entry.gain.gain.cancelScheduledValues(this.context.currentTime);
      entry.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.8);
    }
  }
  update(
    mood: Mood,
    burning: boolean,
    blaze: boolean,
    quiet = false,
    danger = false,
  ) {
    const bed = danger ? 0.45 : 1;
    this.loop(
      "exploration",
      mood === "exploration" && !quiet ? 0.22 * this.musicVolume * bed : 0,
    );
    // Leave the Hunt quiet enough for directional enemy footsteps and breathing.
    this.loop("hunt", mood === "hunt" ? 0.075 * this.musicVolume : 0);
    this.loop("sanctuary", mood === "sanctuary" ? 0.38 * this.musicVolume : 0);
    this.loop("catacombs", quiet ? 0 : mood === "hunt" ? 0.025 : 0.045 * bed);
    this.loop("torch", burning ? (blaze ? 0.14 : 0.08) : 0);
  }
  play(name: Clip, volume = 0.25, pan = 0) {
    const buffer = this.buffers.get(name);
    if (!buffer || this.disposed || this.active.size >= 6) return;
    const source = this.context.createBufferSource(),
      gain = this.context.createGain(),
      panner = this.context.createStereoPanner();
    source.buffer = buffer;
    gain.gain.value = volume;
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(gain).connect(panner).connect(this.master);
    this.active.add(source);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      panner.disconnect();
      this.active.delete(source);
    };
    source.start();
  }
  dispose() {
    this.disposed = true;
    this.abort.abort();
    for (const entry of this.loops.values()) {
      entry.source.stop();
      entry.source.disconnect();
      entry.gain.disconnect();
    }
    for (const source of this.active) source.stop();
    this.loops.clear();
    this.buffers.clear();
    this.active.clear();
  }
}
