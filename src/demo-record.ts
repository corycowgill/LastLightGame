import { Game, findPath, type Input } from "./simulation";
import { GameScene } from "./scene";
import { GameAudio } from "./audio";
const WIDTH = 1280,
  HEIGHT = 720,
  FPS = 24,
  MAX_SECONDS = 100;
const canvas = document.getElementById("output") as HTMLCanvasElement,
  ctx = canvas.getContext("2d")!;
const status = document.getElementById("status")!,
  downloads = document.getElementById("downloads")!;
const idle: Input = {
  forward: 0,
  strafe: 0,
  sprint: false,
  crouch: false,
  yaw: -Math.PI / 2,
};
function text(
  value: string,
  x: number,
  y: number,
  size = 16,
  color = "#d8d3c7",
  font = "Arial",
) {
  ctx.fillStyle = color;
  ctx.font = `${size}px ${font}`;
  ctx.fillText(value, x, y);
}
function label(game: Game, time: number) {
  if (time < 4)
    return {
      title: "THE LAST LIGHT",
      sub: "Current state v1 · Forgotten Catacombs",
    };
  if (game.completed)
    return {
      title: "A FIRE THAT ENDURES",
      sub: `Sanctuary reached · ${game.banked} relic banked · Progress saved`,
    };
  if (game.phase === "EXTINGUISHING")
    return {
      title: "WHEN THE FLAME DIES",
      sub: "Scripted extinction · The Hunt begins after eight seconds of grace",
    };
  if (game.phase === "HUNT_GRACE")
    return {
      title: "SOMETHING IS WAKING",
      sub: "No death countdown. Find fire, hide, or strike a match.",
    };
  if (game.phase === "HUNT_ACTIVE")
    return {
      title: "THE HUNT",
      sub: "The Hunter searches using sight, sound, and the navigation graph",
    };
  if (game.phase === "RELIGHTING")
    return {
      title: "ONE MORE SPARK",
      sub: "A match takes two seconds to relight the torch",
    };
  if (game.hunter.state === "BANISHED")
    return {
      title: "THE FLAME LIVES",
      sub: "Successful relighting banishes the Hunter. Carry the relic home.",
    };
  if (time < 11)
    return {
      title: "CARRY THE LAST LIGHT",
      sub: "Third-person exploration · Seeded, connected Catacombs",
    };
  if (game.mode === 0)
    return {
      title: "EMBER",
      sub: "A smaller light signature · 0.35× fuel consumption",
    };
  if (game.mode === 2)
    return {
      title: "BLAZE",
      sub: "Reveal the chamber · 3.5× fuel consumption",
    };
  return {
    title: "TAKE ONLY WHAT YOU CAN CARRY",
    sub: "Scavenge relics, conserve fuel, leave chalk, and reach sanctuary",
  };
}
function composite(scene: GameScene, game: Game, time: number) {
  ctx.drawImage(scene.renderer.domElement, 0, 0, WIDTH, HEIGHT);
  const g = ctx.createLinearGradient(0, 0, 0, 220);
  g.addColorStop(0, "#03070be8");
  g.addColorStop(1, "#03070b00");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, 220);
  const b = ctx.createLinearGradient(0, 500, 0, 720);
  b.addColorStop(0, "#03070b00");
  b.addColorStop(1, "#03070bf0");
  ctx.fillStyle = b;
  ctx.fillRect(0, 500, WIDTH, 220);
  const l = label(game, time);
  text("THE LAST LIGHT  /  V1", 44, 42, 14, "#c1a774");
  text("SCRIPTED GAMEPLAY CAPTURE", 980, 42, 11, "#9dabb5");
  text(l.title, 44, HEIGHT - 112, 34, "#e4c285", "Georgia");
  text(l.sub, 46, HEIGHT - 80, 16, "#aebbc4");
  text(["EMBER", "STEADY FLAME", "BLAZE"][game.mode], 44, 96, 12, "#e4ba79");
  ctx.fillStyle = "#7d75664a";
  ctx.fillRect(44, 110, 270, 4);
  ctx.fillStyle = game.fuel > 0 ? "#e5ae57" : "#7295b1";
  ctx.fillRect(44, 110, 270 * Math.max(0, game.fuel / game.maxFuel), 4);
  text(
    `${Math.ceil((game.fuel / game.maxFuel) * 100)}% FUEL`,
    44,
    138,
    11,
    "#9baab5",
  );
  text(
    `${game.matches} MATCHES   ${game.artifacts} RELICS   ${game.chalk.length} CHALK`,
    940,
    98,
    12,
    "#cfc3a8",
  );
  if (game.phase === "HUNT_ACTIVE")
    text("THE HUNT", WIDTH / 2 - 60, 110, 19, "#acbecb", "Georgia");
  if (time < 4) {
    ctx.fillStyle = "#050a1170";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    text(
      "THE LAST LIGHT",
      WIDTH / 2 - 270,
      HEIGHT / 2,
      64,
      "#e6c27e",
      "Georgia",
    );
    text(
      "When the flame dies, the hunt begins.",
      WIDTH / 2 - 191,
      HEIGHT / 2 + 45,
      22,
      "#c3bbb0",
      "Georgia",
    );
  }
  if (game.completed) {
    ctx.fillStyle = "#080e1680";
    ctx.fillRect(0, 160, WIDTH, 300);
    text(
      "YOU MADE IT TO THE LIGHT",
      WIDTH / 2 - 258,
      290,
      35,
      "#e5c589",
      "Georgia",
    );
    text(`${game.banked} RELIC BANKED`, WIDTH / 2 - 95, 345, 20, "#d1b786");
    text(
      "Playable Catacombs checkpoint · Pacing and visual polish in progress",
      WIDTH / 2 - 263,
      390,
      16,
      "#9eafb9",
    );
  }
  text(
    "Recorded from the v1 game systems · Deterministic scripted walkthrough",
    44,
    HEIGHT - 28,
    11,
    "#778896",
  );
}
function ivf(chunks: { data: Uint8Array; timestamp: number }[]) {
  const head = new Uint8Array(32),
    v = new DataView(head.buffer);
  head.set(new TextEncoder().encode("DKIF"));
  v.setUint16(4, 0, true);
  v.setUint16(6, 32, true);
  head.set(new TextEncoder().encode("VP80"), 8);
  v.setUint16(12, WIDTH, true);
  v.setUint16(14, HEIGHT, true);
  v.setUint32(16, FPS, true);
  v.setUint32(20, 1, true);
  v.setUint32(24, chunks.length, true);
  const parts: BlobPart[] = [head];
  for (const c of chunks) {
    const h = new Uint8Array(12),
      view = new DataView(h.buffer);
    view.setUint32(0, c.data.length, true);
    view.setBigUint64(4, BigInt(Math.round((c.timestamp * FPS) / 1e6)), true);
    parts.push(h, c.data.buffer as ArrayBuffer);
  }
  return new Blob(parts, { type: "video/x-ivf" });
}
function wav(buffer: AudioBuffer) {
  const length = buffer.length,
    channels = buffer.numberOfChannels,
    bytes = new ArrayBuffer(44 + length * channels * 2),
    v = new DataView(bytes);
  const put = (at: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
  put(0, "RIFF");
  v.setUint32(4, bytes.byteLength - 8, true);
  put(8, "WAVE");
  put(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  put(36, "data");
  v.setUint32(40, length * channels * 2, true);
  const data = Array.from({ length: channels }, (_, i) =>
    buffer.getChannelData(i),
  );
  for (let i = 0; i < length; i++)
    for (let c = 0; c < channels; c++)
      v.setInt16(
        44 + (i * channels + c) * 2,
        Math.max(-1, Math.min(1, data[c][i])) * 32767,
        true,
      );
  return new Blob([bytes], { type: "audio/wav" });
}
function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.textContent = `Download ${name}`;
  downloads.append(a);
}
async function record() {
  (document.getElementById("record") as HTMLButtonElement).disabled = true;
  downloads.replaceChildren();
  status.textContent = "Checking encoder…";
  if (!("VideoEncoder" in window))
    throw new Error("WebCodecs video encoding is unavailable in this browser");
  const config: VideoEncoderConfig = {
    codec: "vp8",
    width: WIDTH,
    height: HEIGHT,
    framerate: FPS,
    bitrate: 3500000,
    latencyMode: "quality",
  };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error("VP8 encoding is not supported");
  const game = new Game(104729),
    scene = new GameScene(document.getElementById("stage")!, game.world);
  scene.renderer.setPixelRatio(1);
  scene.resize();
  const offline = new OfflineAudioContext(2, 48000 * MAX_SECONDS, 48000),
    audio = new GameAudio();
  audio.captureTime = 0;
  audio.start(offline);
  audio.setVolume(0.65);
  const route = findPath(game.world, game.start, game.destination),
    chunks: { data: Uint8Array; timestamp: number }[] = [];
  let encoderError: Error | undefined;
  const encoder = new VideoEncoder({
    output(chunk) {
      const data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      chunks.push({ data, timestamp: chunk.timestamp });
    },
    error(error) {
      encoderError = error;
    },
  });
  encoder.configure(config);
  let cursor = 1,
    forced = false,
    marked = false,
    huntTime = 0,
    relit = false,
    completedAt = -1,
    frameCount = 0,
    cameraYaw = -Math.PI / 2;
  const manifest = {
    seed: 104729,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    source: "Actual v1 simulation, renderer and procedural sound",
    scripted: true,
    events: [] as { time: number; event: string }[],
  };
  let previousPhase = game.phase;
  for (let frame = 0; frame < MAX_SECONDS * FPS; frame++) {
    const time = frame / FPS,
      dt = 1 / FPS;
    let input = { ...idle };
    if (time >= 4 && !game.completed) {
      if (game.phase === "HUNT_ACTIVE" || game.phase === "RELIGHTING")
        huntTime += dt;
      if (game.phase === "HUNT_ACTIVE" && huntTime >= 2 && !relit) {
        game.relight();
        relit = true;
      }
      const hold =
        (game.phase === "HUNT_ACTIVE" && huntTime < 4) ||
        game.phase === "RELIGHTING";
      let target = route[cursor];
      while (
        target &&
        Math.hypot(target.x - game.player.x, target.z - game.player.z) < 0.22
      ) {
        cursor++;
        target = route[cursor];
      }
      if (target && !hold)
        input = {
          forward: 1,
          strafe: 0,
          sprint: true,
          crouch: false,
          yaw: Math.atan2(
            -(target.x - game.player.x),
            -(target.z - game.player.z),
          ),
        };
      else input.yaw = game.player.yaw;
      if (!forced) {
        game.setMode(time < 11 ? 1 : time < 17 ? 0 : time < 23 ? 2 : 1);
        if (cursor > route.length * 0.58) {
          game.forceHunt();
          forced = true;
          manifest.events.push({ time, event: "Scripted extinction" });
        }
      }
      if (!marked && cursor > 10) {
        game.mark();
        marked = true;
      }
      if (
        game.phase === "EXPLORING" &&
        game.items.some(
          (i) =>
            !i.taken &&
            i.kind === "artifact" &&
            Math.hypot(i.x - game.player.x, i.z - game.player.z) < 2.5,
        )
      )
        game.interact();
      game.step(dt, input);
    }
    if (game.phase === "DEAD")
      throw new Error(
        `Demo capture failed: Hunter caught the player at ${time}s`,
      );
    if (previousPhase !== game.phase) {
      manifest.events.push({ time, event: game.phase });
      previousPhase = game.phase;
    }
    let wantYaw = game.player.yaw;
    if (game.phase === "HUNT_ACTIVE" || game.phase === "RELIGHTING")
      wantYaw = Math.atan2(
        -(game.hunter.x - game.player.x),
        -(game.hunter.z - game.player.z),
      );
    let angle = wantYaw - cameraYaw;
    angle = Math.atan2(Math.sin(angle), Math.cos(angle));
    cameraYaw += angle * Math.min(1, dt * 4);
    scene.update(game, dt, cameraYaw, 0.12);
    composite(scene, game, time);
    audio.captureTime = time;
    audio.update(game, dt);
    const image = new VideoFrame(canvas, {
      timestamp: Math.round(time * 1e6),
      duration: Math.round(1e6 / FPS),
    });
    encoder.encode(image, { keyFrame: frame % (FPS * 3) === 0 });
    image.close();
    frameCount++;
    if (encoderError) throw encoderError;
    if (encoder.encodeQueueSize > 6) await encoder.flush();
    if (frame % 12 === 0) {
      status.textContent = `Recording ${time.toFixed(1)}s · ${game.phase} · ${frameCount} frames`;
      await new Promise((r) => setTimeout(r, 0));
    }
    if (game.completed) {
      if (completedAt < 0) completedAt = time;
      if (time - completedAt > 4) break;
    }
  }
  if (!game.completed || !relit || game.banked < 1)
    throw new Error(
      "Capture did not complete the expedition / relighting / relic banking checks",
    );
  await encoder.flush();
  encoder.close();
  status.textContent = "Rendering original game audio…";
  const sound = await offline.startRendering();
  download(ivf(chunks), "the-last-light-v1.ivf");
  download(wav(sound), "the-last-light-v1.wav");
  download(
    new Blob(
      [
        JSON.stringify(
          {
            ...manifest,
            duration: frameCount / FPS,
            banked: game.banked,
            frames: frameCount,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    "the-last-light-v1.json",
  );
  status.textContent = `COMPLETE · ${(frameCount / FPS).toFixed(2)} seconds · ${frameCount} frames · ${game.banked} relic banked`;
  scene.dispose();
}
document.getElementById("record")!.onclick = () =>
  void record().catch((e) => {
    status.textContent = `ERROR: ${e.message}`;
    console.error(e);
    (document.getElementById("record") as HTMLButtonElement).disabled = false;
  });
