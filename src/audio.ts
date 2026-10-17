import type { Game } from "./simulation";
export class GameAudio {
  private ctx?: AudioContext | OfflineAudioContext;
  captureTime?: number;
  private master?: GainNode;
  private hum?: GainNode;
  private oscillator?: OscillatorNode;
  private noise?: AudioBuffer;
  private level = 0.45;
  private elapsed = 0;
  private nextFire = 0;
  private nextStep = 0;
  private nextBreath = 0;
  private nextWarning = 0;
  private nextPlayerStep = 0;
  private nextAmbient = 12;
  private phase = "";
  private lastX = 0;
  private lastZ = 0;
  start(context?: AudioContext | OfflineAudioContext) {
    if (this.ctx) {
      if (this.ctx instanceof AudioContext) void this.ctx.resume();
      return;
    }
    const c = (this.ctx = context ?? new AudioContext());
    this.master = c.createGain();
    this.master.gain.value = this.level;
    this.master.connect(c.destination);
    this.oscillator = c.createOscillator();
    this.oscillator.frequency.value = 42;
    this.hum = c.createGain();
    this.hum.gain.value = 0.005;
    this.oscillator.connect(this.hum).connect(this.master);
    this.oscillator.start();
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const values = this.noise.getChannelData(0);
    for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;
    if (c instanceof AudioContext) void c.resume();
  }
  get needsGesture() {
    return this.ctx instanceof AudioContext && this.ctx.state === "suspended";
  }
  set volume(v: number) {
    this.setVolume(v);
  }
  get volume() {
    return this.level;
  }
  setVolume(v: number) {
    this.level = Math.max(0, Math.min(1, v));
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        this.level,
        this.captureTime ?? this.ctx.currentTime,
        0.1,
      );
  }
  private tone(f: number, duration: number, volume: number, end = f, pan = 0) {
    if (!this.ctx || !this.master) return;
    const c = this.ctx,
      t = this.captureTime ?? c.currentTime,
      o = c.createOscillator(),
      g = c.createGain(),
      p = c.createStereoPanner();
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, end), t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    o.connect(g).connect(p).connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }
  private air(duration: number, volume: number, frequency: number, pan = 0) {
    if (!this.ctx || !this.master || !this.noise) return;
    const c = this.ctx,
      t = this.captureTime ?? c.currentTime,
      s = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain(),
      p = c.createStereoPanner();
    s.buffer = this.noise;
    f.type = "bandpass";
    f.frequency.value = frequency;
    f.Q.value = 0.6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + duration * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(f).connect(g).connect(p).connect(this.master);
    s.start(t, Math.random() * 0.2, Math.min(duration, 0.8));
    s.onended = () => {
      s.disconnect();
      f.disconnect();
      g.disconnect();
      p.disconnect();
    };
  }
  update(game: Game, dt: number) {
    if (!this.ctx || !this.hum) return;
    this.elapsed += Math.min(0.1, dt);
    const phase = String(game.phase),
      hunt = phase === "HUNT_ACTIVE" || phase === "HUNT_GRACE";
    this.hum.gain.setTargetAtTime(
      hunt ? 0.055 : 0.005,
      this.captureTime ?? this.ctx.currentTime,
      1,
    );
    if (phase !== this.phase) {
      if (phase === "EXTINGUISHING") this.tone(80, 2, 0.14, 25);
      if (phase === "HUNT_ACTIVE") {
        this.tone(110, 2, 0.16, 30);
        this.air(0.7, 0.1, 170);
      }
      if (phase === "RELIGHTING") this.air(0.3, 0.15, 1800);
      if (phase === "SANCTUARY") {
        this.tone(220, 2, 0.08);
        this.tone(330, 2.3, 0.05);
        this.tone(440, 2.6, 0.03);
      }
      if (phase === "DEAD") this.tone(110, 1.3, 0.15, 20);
      this.phase = phase;
    }
    if (game.fuel > 0 && this.elapsed > this.nextFire) {
      this.air(
        0.06,
        game.mode === 2 ? 0.035 : 0.018,
        1400 + Math.random() * 1800,
      );
      this.nextFire = this.elapsed + 0.25 + Math.random() * 0.5;
    }
    if (
      game.fuel > 0 &&
      game.fuel / game.maxFuel < 0.1 &&
      this.elapsed > this.nextWarning
    ) {
      this.tone(440, 0.25, 0.035, 220);
      this.nextWarning = this.elapsed + 10;
    }
    const player = game.player;
    if (!player) return;
    if ((hunt || player.stamina < 0.4) && this.elapsed > this.nextBreath) {
      this.air(0.65, 0.035, 650);
      this.nextBreath = this.elapsed + (player.stamina < 0.25 ? 1.1 : 1.9);
    }
    const moved = Math.hypot(player.x - this.lastX, player.z - this.lastZ);
    this.lastX = player.x;
    this.lastZ = player.z;
    if (moved > 0.004 && this.elapsed > this.nextPlayerStep) {
      const cell = game.world.cells.find(
        (c: any) =>
          c.x === Math.round(player.x / 2) && c.z === Math.round(player.z / 2),
      );
      this.tone(95, 0.12, 0.035, 48);
      if (cell?.kind === "flooded") this.air(0.2, 0.045, 900);
      this.nextPlayerStep = this.elapsed + (moved / dt > 4 ? 0.3 : 0.47);
    }
    const h = game.hunter;
    if (
      h &&
      hunt &&
      this.elapsed > this.nextStep &&
      !["DORMANT", "BANISHED"].includes(h.state)
    ) {
      const dx = h.x - player.x,
        dz = h.z - player.z,
        d = Math.hypot(dx, dz),
        volume = 0.13 * Math.max(0, 1 - d / 28),
        yaw = game.cameraYaw ?? player.yaw ?? 0,
        pan = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, d);
      this.tone(65, 0.25, volume, 28, pan);
      this.air(0.2, volume * 0.4, 280, pan);
      this.nextStep = this.elapsed + (h.state === "PURSUING" ? 0.43 : 0.8);
    }
    if (this.elapsed > this.nextAmbient) {
      this.air(0.8, 0.025, 190, Math.sin(this.elapsed));
      this.nextAmbient = this.elapsed + 14 + Math.random() * 15;
    }
  }
  dispose() {
    this.oscillator?.stop();
    if (this.ctx instanceof AudioContext) void this.ctx.close();
    this.ctx = undefined;
    this.master = undefined;
    this.hum = undefined;
    this.oscillator = undefined;
  }
}
