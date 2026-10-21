import { vaporPhase } from "./environment-hazards";
import { Soundscape, audioMood } from "./soundscape";
import { lineOfSight, type Game } from "./simulation";
import { FootstepTracker, spatialCue } from "./audio-spatial";
export class GameAudio {
  private ctx?: AudioContext | OfflineAudioContext;
  captureTime?: number;
  private master?: GainNode;
  private hum?: GainNode;
  private oscillator?: OscillatorNode;
  private noise?: AudioBuffer;
  private reflections?: GainNode;
  private reflectionNodes: AudioNode[] = [];
  private level = 0.45;
  private elapsed = 0;
  private nextFire = 0;
  private nextBreath = 0;
  private nextWarning = 0;
  private nextSealScrape = 0;
  private lastArtifacts = 0;
  private lastStone = 0;
  private lastRelicEcho = 0;
  private nextHeartbeat = 0;
  private nextVotiveWhisper = 0;
  private lastAmbientEvent = -1;
  private playerSteps = new FootstepTracker();
  private threatSteps = new Map<object, FootstepTracker>();
  private threatStates = new Map<object, string>();
  private lastHunterWarning = "";
  private lastWorld?: Game["world"];
  private stepSide = 1;
  private nextThreatVoice = 0;
  private lastThreatContact?: { x: number; z: number; until: number };
  get threatFootstep() {
    return this.lastThreatContact && this.elapsed < this.lastThreatContact.until
      ? this.lastThreatContact
      : undefined;
  }
  private phase = "";
  private samples?: Soundscape;
  private lastFuel = 720;
  private lastBrandId = 0;
  private lastHazardEvent = 0;
  private nextVentHiss = 0;
  private nextBrandCrackle = 0;
  private lastShortcutOpen = false;
  private musicLevel = 0.7;
  setMusicVolume(value: number) {
    this.musicLevel = Math.max(0, Math.min(1, value));
    if (this.samples) this.samples.musicVolume = this.musicLevel;
  }
  get sampleCount() {
    return this.samples?.loaded ?? 0;
  }
  start(context?: AudioContext | OfflineAudioContext) {
    if (this.ctx) {
      if (this.ctx instanceof AudioContext) void this.ctx.resume();
      return;
    }
    const c = (this.ctx = context ?? new AudioContext());
    this.master = c.createGain();
    this.master.gain.value = this.level;
    this.master.connect(c.destination);
    // One shared, low-cost stone reflection bus; dry contacts retain their direction.
    const reflections = (this.reflections = c.createGain()),
      delay = c.createDelay(0.5),
      lowpass = c.createBiquadFilter(),
      feedback = c.createGain();
    reflections.gain.value = 0.17;
    delay.delayTime.value = 0.14;
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1250;
    feedback.gain.value = 0.22;
    reflections.connect(delay).connect(lowpass).connect(this.master);
    lowpass.connect(feedback).connect(delay);
    this.reflectionNodes = [reflections, delay, lowpass, feedback];
    if (c instanceof AudioContext)
      this.samples = new Soundscape(c, this.master);
    if (this.samples) this.samples.musicVolume = this.musicLevel;
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
    if (this.ctx && this.master) {
      const time = this.captureTime ?? this.ctx.currentTime;
      // A retry, pause or settings change supersedes the previous ending envelope.
      this.master.gain.cancelAndHoldAtTime(time);
      this.master.gain.setTargetAtTime(this.level, time, 0.1);
    }
  }
  fadeAfterDefeat() {
    if (!this.ctx || !this.master) return;
    const time = this.captureTime ?? this.ctx.currentTime;
    const gain = this.master.gain;
    gain.cancelAndHoldAtTime(time);
    gain.linearRampToValueAtTime(0, time + 0.45);
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
    if (this.reflections) p.connect(this.reflections);
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
    s.loop = true;
    f.type = "bandpass";
    f.frequency.value = frequency;
    f.Q.value = 0.6;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + duration * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    p.pan.value = Math.max(-1, Math.min(1, pan));
    s.connect(f).connect(g).connect(p).connect(this.master);
    if (this.reflections) p.connect(this.reflections);
    s.start(t, Math.random() * 0.2);
    s.stop(t + duration + 0.01);
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
    if (this.lastWorld !== game.world) {
      this.lastWorld = game.world;
      this.phase = "";
      this.playerSteps = new FootstepTracker();
      this.threatSteps.clear();
      this.threatStates.clear();
      this.lastAmbientEvent = -1;
      this.lastStone = 0;
      this.lastRelicEcho = game.relicEcho;
      this.nextHeartbeat = 0;
      this.lastArtifacts = game.artifacts;
      this.lastFuel = game.fuel;
      this.lastHazardEvent = 0;
      this.nextVentHiss = 0;
      this.lastBrandId = game.brands[0]?.id ?? 0;
      this.lastShortcutOpen = game.shortcutOpen;
      this.lastHunterWarning = "";
      this.lastThreatContact = undefined;
    }
    const threats = [game.hunter, ...game.additionalHunters, ...game.enemies];
    const nearbyThreat = threats.some(
      (threat) =>
        !["DORMANT", "BANISHED", "IDLE"].includes(threat.state) &&
        Math.hypot(threat.x - game.player.x, threat.z - game.player.z) < 14,
    );
    const nearFire =
      Math.min(
        Math.hypot(game.player.x - game.start.x, game.player.z - game.start.z),
        Math.hypot(
          game.player.x - game.destination.x,
          game.player.z - game.destination.z,
        ),
      ) < 5;
    this.samples?.update(
      audioMood(game.phase, nearFire),
      game.fuel > 0 && game.phase === "EXPLORING",
      game.mode === 2,
      game.elapsed < game.quietUntil,
      nearbyThreat,
    );
    if (game.hazardEvent && game.hazardEvent.id !== this.lastHazardEvent) {
      const event = game.hazardEvent;
      this.lastHazardEvent = event.id;
      const cue = spatialCue(
        game.player,
        event,
        game.cameraYaw,
        lineOfSight(game.world, game.player, event),
        22,
      );
      this.air(
        0.4,
        0.12 * cue.gain,
        event.kind === "rubble"
          ? 450
          : event.kind === "webs"
            ? 1100
            : event.kind === "bones"
              ? 1500
              : 2300,
        cue.pan,
      );
      this.tone(
        event.kind === "rubble"
          ? 75
          : event.kind === "webs"
            ? 180
            : event.kind === "bones"
              ? 160
              : 680,
        0.6,
        0.045 * cue.gain,
        100,
        cue.pan,
      );
    }
    if (this.elapsed > this.nextVentHiss) {
      const vent = game.hazards
        .filter(
          (h) =>
            h.kind === "vapor" &&
            Math.hypot(h.x - game.player.x, h.z - game.player.z) < 12,
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - game.player.x, a.z - game.player.z) -
            Math.hypot(b.x - game.player.x, b.z - game.player.z),
        )[0];
      if (vent) {
        const cue = spatialCue(
          game.player,
          vent,
          game.cameraYaw,
          lineOfSight(game.world, game.player, vent),
          12,
        );
        const phase = vaporPhase(vent, game.elapsed);
        this.air(
          0.65,
          (phase === "active" ? 0.09 : phase === "warning" ? 0.05 : 0.012) *
            cue.gain,
          phase === "active" ? 1800 : 850,
          cue.pan,
        );
      }
      this.nextVentHiss = this.elapsed + 0.8;
    }
    if (game.distraction && game.distraction.id !== this.lastStone) {
      this.lastStone = game.distraction.id;
      const cue = spatialCue(
        game.player,
        game.distraction,
        game.cameraYaw,
        lineOfSight(game.world, game.player, game.distraction),
        20,
      );
      this.air(0.16, 0.12 * cue.gain, 1600, cue.pan);
      this.tone(260, 0.22, 0.05 * cue.gain, 100, cue.pan);
    }
    if (game.tensionHint && this.elapsed > this.nextVotiveWhisper) {
      this.air(0.65, 0.025, 520);
      this.tone(210, 0.6, 0.015, 160);
      this.nextVotiveWhisper = this.elapsed + 1;
    }
    if (game.relicEcho !== this.lastRelicEcho) {
      this.lastRelicEcho = game.relicEcho;
      this.air(1.2, 0.06, 700);
      this.tone(430, 1.1, 0.035, 140);
    }
    const proximity = Math.min(
      ...threats
        .filter((t) => !["DORMANT", "BANISHED", "FLEEING"].includes(t.state))
        .map((t) => Math.hypot(t.x - game.player.x, t.z - game.player.z)),
    );
    if (
      game.phase === "HUNT_ACTIVE" &&
      proximity < 12 &&
      this.elapsed > this.nextHeartbeat
    ) {
      this.tone(48, 0.14, 0.045 * (1 - proximity / 16), 30);
      this.nextHeartbeat = this.elapsed + 0.45 + proximity * 0.045;
    }
    const brandPlaced =
      !!game.brands[0] && game.brands[0].id !== this.lastBrandId;
    if (brandPlaced) {
      this.lastBrandId = game.brands[0].id;
      this.air(0.5, 0.035, 900);
      this.tone(95, 0.2, 0.012, 60);
    }
    if (game.shortcutOpen && !this.lastShortcutOpen) {
      const gate = game.world.shortcutGate!;
      const cue = spatialCue(game.player, gate, game.cameraYaw, true, 30);
      this.air(1.3, 0.12 * cue.gain, 350, cue.pan);
      this.tone(270, 1.6, 0.05 * cue.gain, 130, cue.pan);
      this.tone(405, 1.2, 0.025 * cue.gain, 200, cue.pan);
    }
    this.lastShortcutOpen = game.shortcutOpen;
    if (game.brands[0] && this.elapsed > this.nextBrandCrackle) {
      const brand = game.brands[0];
      const cue = spatialCue(
        game.player,
        brand,
        game.cameraYaw,
        lineOfSight(game.world, game.player, brand),
        12,
      );
      this.air(0.12, 0.018 * cue.gain, cue.muffled ? 650 : 1600, cue.pan);
      this.nextBrandCrackle = this.elapsed + 0.55;
    }
    if (
      this.lastFuel - game.fuel >= 35 &&
      game.phase === "EXPLORING" &&
      !brandPlaced
    )
      this.samples?.play("burst", 0.28);
    this.lastFuel = game.fuel;
    const phase = String(game.phase),
      hunt = phase === "HUNT_ACTIVE" || phase === "HUNT_GRACE";
    this.hum.gain.setTargetAtTime(
      hunt ? 0.022 : 0.003,
      this.captureTime ?? this.ctx.currentTime,
      1,
    );
    if (phase !== this.phase) {
      if (phase === "EXTINGUISHING") {
        this.tone(80, 2, 0.14, 25);
        this.samples?.play("extinguish", 0.25);
      }
      if (phase === "HUNT_ACTIVE") {
        this.samples?.play("hunter", 0.3);
        this.tone(110, 2, 0.16, 30);
        this.air(0.7, 0.1, 170);
      }
      if (phase === "RELIGHTING") {
        this.air(0.3, 0.15, 1800);
        this.samples?.play("relight", 0.3);
      }
      if (phase === "SANCTUARY") {
        this.tone(220, 2, 0.08);
        this.tone(330, 2.3, 0.05);
        this.tone(440, 2.6, 0.03);
      }
      if (phase === "DEAD") {
        // Brief physical signatures reinforce the result screen's cause without a loud sting.
        if (game.deathCause === "Stalker") {
          this.air(0.28, 0.065, 620);
          this.tone(145, 0.32, 0.055, 65);
        } else {
          this.tone(68, 0.35, 0.075, 27);
          this.air(0.3, 0.045, 190);
        }
      }
      this.phase = phase;
    }
    if (phase === "DEAD") return;
    if (
      game.fuel > 0 &&
      !this.samples?.has("torch") &&
      this.elapsed > this.nextFire
    ) {
      this.air(
        0.06,
        game.mode === 2 ? 0.035 : 0.018,
        1400 + Math.random() * 1800,
      );
      this.nextFire = this.elapsed + 0.25 + Math.random() * 0.5;
    }
    if (
      game.fuel > 0 &&
      game.fuel / game.maxFuel < 0.2 &&
      this.elapsed > this.nextWarning
    ) {
      // Sputtering communicates failing fire without an electronic warning beep.
      this.air(0.2, 0.045, 1400);
      if (game.fuel / game.maxFuel < 0.1) this.air(0.35, 0.035, 350);
      this.nextWarning =
        this.elapsed +
        Math.max(1.2, Math.min(6, game.fuel / game.fuelRate / 3));
    }
    const player = game.player;
    if (!player) return;
    if ((hunt || player.stamina < 0.4) && this.elapsed > this.nextBreath) {
      this.air(0.65, 0.035, 650);
      this.nextBreath = this.elapsed + (player.stamina < 0.25 ? 1.1 : 1.9);
    }
    if (this.playerSteps.sample(player, player.crouched ? 0.7 : 1.35)) {
      this.stepSide *= -1;
      const softness =
        (player.crouched ? 0.3 : 1) * (1 - game.upgrades.boots * 0.12);
      const pan = this.stepSide * 0.12;
      this.tone(87 + this.stepSide * 6, 0.1, 0.03 * softness, 43, pan);
      this.air(
        0.09,
        0.022 * softness,
        game.surface === "gravel" ? 1800 : 1100,
        pan,
      );
      if (game.surface === "water") this.air(0.24, 0.06 * softness, 850, pan);
    }
    const liveThreats = new Set<object>(threats);
    for (const tracked of this.threatSteps.keys()) {
      if (!liveThreats.has(tracked)) {
        this.threatSteps.delete(tracked);
        this.threatStates.delete(tracked);
      }
    }
    for (const threat of threats) {
      let tracker = this.threatSteps.get(threat);
      if (!tracker) {
        tracker = new FootstepTracker();
        this.threatSteps.set(threat, tracker);
      }
      const hunter =
        threat === game.hunter ||
        game.additionalHunters.includes(
          threat as (typeof game.additionalHunters)[number],
        );
      const active = !["DORMANT", "BANISHED", "IDLE"].includes(threat.state);
      const contact = tracker.sample(threat, hunter ? 1.65 : 1.1);
      const distance = Math.hypot(threat.x - player.x, threat.z - player.z);
      // Trace only audible contacts/state changes, rather than every enemy on every frame.
      const changed = this.threatStates.get(threat) !== threat.state;
      this.threatStates.set(threat, threat.state);
      if (!active || distance >= (hunter ? 28 : 18) || (!contact && !changed))
        continue;
      const cue = spatialCue(
        player,
        threat,
        game.cameraYaw,
        lineOfSight(game.world, player, threat),
        hunter ? 28 : 18,
      );
      if (contact) {
        if (cue.gain >= 0.035)
          this.lastThreatContact = {
            x: threat.x,
            z: threat.z,
            until: this.elapsed + 0.85,
          };
        if (hunter) {
          this.tone(59, 0.28, 0.16 * cue.gain, 27, cue.pan);
          this.air(0.23, 0.065 * cue.gain, cue.muffled ? 180 : 650, cue.pan);
        } else {
          this.air(0.14, 0.07 * cue.gain, cue.muffled ? 230 : 1100, cue.pan);
          this.tone(130, 0.11, 0.035 * cue.gain, 72, cue.pan);
        }
      }
      // A shared voice cooldown keeps multiple pursuers from drowning out their locations.
      if (hunter && changed && this.elapsed > this.nextThreatVoice) {
        if (threat.state === "PURSUING") {
          if (!cue.muffled)
            this.samples?.play("hunter", 0.18 * cue.gain, cue.pan);
          this.air(0.55, 0.06 * cue.gain, 190, cue.pan);
          this.nextThreatVoice = this.elapsed + 3.5;
        } else if (threat.state === "INVESTIGATING") {
          this.tone(125, 0.9, 0.03 * cue.gain, 95, cue.pan);
        } else if (threat.state === "FLEEING") {
          this.air(0.65, 0.06 * cue.gain, 380, cue.pan);
        }
      }
    }
    if (game.hunterWarning && game.hunterWarning !== this.lastHunterWarning) {
      this.tone(54, 2.2, 0.045, 31);
      this.air(1.4, 0.03, 160);
    }
    this.lastHunterWarning = game.hunterWarning;
    if (game.activeInteraction && this.elapsed > this.nextSealScrape) {
      this.air(0.25, 0.035, 950);
      this.tone(180, 0.22, 0.012, 110);
      this.nextSealScrape = this.elapsed + 0.6;
    }
    if (game.artifacts > this.lastArtifacts) {
      this.tone(660, 0.18, 0.025, 880);
      this.tone(990, 0.25, 0.015, 660);
    }
    this.lastArtifacts = game.artifacts;
    const event = game.ambientEvent;
    if (event && event.id !== this.lastAmbientEvent) {
      this.lastAmbientEvent = event.id;
      const cue = spatialCue(
        player,
        event,
        game.cameraYaw,
        lineOfSight(game.world, player, event),
        30,
      );
      const pan = cue.pan,
        gain = cue.gain;
      // Environmental sounds are stone and metal, never counterfeit approaching footsteps.
      if (event.kind === "stone") {
        this.air(1.2, 0.07 * gain, 230, pan);
        this.tone(110, 0.8, 0.035 * gain, 65, pan);
      }
      if (event.kind === "chain") {
        this.tone(cue.muffled ? 280 : 620, 0.8, 0.025 * gain, 180, pan);
        this.air(0.5, 0.035 * gain, cue.muffled ? 450 : 1700, pan);
      }
    }
  }

  dispose() {
    this.samples?.dispose();
    this.samples = undefined;
    for (const node of this.reflectionNodes) node.disconnect();
    this.reflectionNodes = [];
    this.reflections = undefined;
    this.lastThreatContact = undefined;
    this.oscillator?.stop();
    if (this.ctx instanceof AudioContext) void this.ctx.close();
    this.ctx = undefined;
    this.master = undefined;
    this.hum = undefined;
    this.oscillator = undefined;
  }
}
