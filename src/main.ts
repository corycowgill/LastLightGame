import "./style.css";
import { ExpeditionCheck } from "./qa";
let check: ExpeditionCheck | undefined;
import { Game } from "./simulation";
import { GameScene } from "./scene";
import { GameAudio } from "./audio";
const $ = (id: string) => document.getElementById(id)!;
let game = new Game(104729),
  view: GameScene,
  audio = new GameAudio();
let draw = true;
let started = false;
let running = false,
  yaw = -Math.PI / 2,
  pitch = 0.18,
  accumulator = 0,
  last = performance.now(),
  fps = 60;
const keys = new Set<string>();
const defaults = { sensitivity: 1, volume: 0.45, cues: true, quality: "high" };
let settings = { ...defaults };
try {
  settings = {
    ...defaults,
    ...JSON.parse(localStorage.getItem("lastlight-settings") || "{}"),
  };
} catch {}
const intro = `<div class="eyebrow">AN EXPEDITION INTO THE FORGOTTEN CATACOMBS</div><h1>THE LAST<br><em>LIGHT</em></h1><p class="tagline">When the flame dies, the hunt begins.</p><div class="divider"></div><p class="description">Carry a fragile flame into a labyrinth that remembers.<br>Find the reliquaries. Follow the golden fires home.<br>And if your light goes out — keep moving.</p>`;
function panel(content: string) {
  $("overlay").innerHTML = `<main class="panel">${content}</main>`;
  $("overlay").hidden = false;
}
function button(id: string, text: string, action: () => void) {
  const b = document.createElement("button");
  b.id = id;
  b.textContent = text;
  $("actions").append(b);
  b.onclick = action;
}
function menu() {
  audio.setVolume(0);
  running = false;
  document.exitPointerLock?.();
  panel(
    intro +
      '<div id="actions"></div><div class="version">A CATACOMBS EXPEDITION · HEADPHONES RECOMMENDED</div>',
  );
  button("new", "BEGIN EXPEDITION", () => begin(false));
  button("continue", "CONTINUE JOURNEY", () => begin(true));
  button("settings", "SETTINGS", showSettings);
  button("controls", "FIELD GUIDE", controls);
  if (new URLSearchParams(location.search).has("debug"))
    button("check", "RUN EXPEDITION CHECK", () => {
      begin(false);
      check = new ExpeditionCheck(game.world);
      document.exitPointerLock?.();
    });
}
function rebuild() {
  draw = true;
  view?.dispose();
  $("scene").replaceChildren();
  view = new GameScene($("scene"), game.world);
  view.setQuality(settings.quality === "low");
}
function begin(load: boolean) {
  check = undefined;
  started = true;
  yaw = -Math.PI / 2;
  pitch = 0.18;
  if (load) {
    try {
      game.load();
    } catch {}
  } else
    game.reset(
      Number(new URLSearchParams(location.search).get("seed")) ||
        Date.now() % 1000000,
    );
  rebuild();
  audio.start();
  audio.setVolume(settings.volume);
  resume();
}
function resume() {
  audio.setVolume(settings.volume);
  running = true;
  keys.clear();
  $("overlay").hidden = true;
  $("hud").hidden = false;
  last = performance.now();
  accumulator = 0;
  $("scene")
    .requestPointerLock?.()
    ?.catch(() => {});
}
function pause() {
  if (!running) return;
  audio.setVolume(0);
  running = false;
  keys.clear();
  game.save();
  document.exitPointerLock?.();
  panel(
    '<div class="eyebrow">THE DARKNESS CAN WAIT</div><h2>Take a breath.</h2><p>Your expedition is saved.</p><div id="actions"></div>',
  );
  button("resume", "RETURN TO THE FLAME", resume);
  button("journal", "EXPEDITION JOURNAL", journal);
  button("settings", "SETTINGS", showSettings);
  button("menu", "MAIN MENU", menu);
}
function controls() {
  panel(
    '<div class="eyebrow">TORCHBEARER’S FIELD GUIDE</div><h2>Know the darkness.</h2><p>WASD · Move &nbsp; Mouse · Look<br>SHIFT · Sprint &nbsp; C / CTRL · Crouch<br>E · Collect / use fire / relight<br>Q · Leave a chalk mark &nbsp; F · Flame burst<br>1 / 2 / 3 · Ember / Steady / Blaze<br>TAB · Journal &nbsp; ESC · Pause</p><p>Ember saves fuel; Blaze spends it quickly for visibility. Crouch to quiet your steps. Break sight around corners to lose the Hunter. A match restores a reserve of fuel after a two second relight. Golden sanctuary fires banish the Hunt.</p><div id="actions"></div>',
  );
  button("back", "BACK", menu);
}
function showSettings() {
  const was = running;
  if (was) {
    running = false;
    document.exitPointerLock?.();
  }
  panel(
    `<div class="eyebrow">SETTINGS</div><h2>Shape your experience.</h2><label>Mouse sensitivity <input id="sensitivity" type="range" min="0.2" max="2" step="0.1" value="${settings.sensitivity}"></label><label>Audio volume <input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>Visual sound cues <input id="cues" type="checkbox" ${settings.cues ? "checked" : ""}></label><label>Graphics <select id="quality"><option value="high">High</option><option value="low">Low</option></select></label><div id="actions"></div>`,
  );
  ($("quality") as HTMLSelectElement).value = settings.quality;
  button("back", "SAVE & RETURN", () => {
    settings.sensitivity = +($("sensitivity") as HTMLInputElement).value;
    settings.volume = +($("volume") as HTMLInputElement).value;
    settings.cues = ($("cues") as HTMLInputElement).checked;
    settings.quality = ($("quality") as HTMLSelectElement).value;
    localStorage.setItem("lastlight-settings", JSON.stringify(settings));
    audio.setVolume(settings.volume);
    document.body.dataset.quality = settings.quality;
    view.setQuality(settings.quality === "low");
    started ? resume() : menu();
  });
}
function journal() {
  audio.setVolume(0);
  running = false;
  document.exitPointerLock?.();
  panel(
    `<div class="eyebrow">EXPEDITION JOURNAL · SEED ${game.world.seed}</div><h2>What remains of us.</h2><p>Find the far sanctuary and bank the relics you carry.<br>Follow carved arches, chalk marks, and golden fire.</p>${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats"><span>${game.artifacts}<small>RELICS CARRIED</small></span><span>${game.banked}<small>RELICS BANKED</small></span><span>${game.chalk.length}<small>CHALK MARKS</small></span></div><p>Fuel: ${Math.ceil(game.fuel)} seconds in Steady mode.<br>Matches: ${game.matches} · Elapsed: ${Math.floor(game.elapsed / 60)} minutes.</p><div id="actions"></div>`,
  );
  button("resume", "CLOSE JOURNAL", resume);
}
function ended() {
  audio.setVolume(0);
  running = false;
  document.exitPointerLock?.();
  if (check) {
    check.input(game);
    console.info(check.status);
  }
  const dead = game.phase === "DEAD";
  panel(
    `<div class="eyebrow">${dead ? "THE FLAME IS LOST" : "A FIRE THAT ENDURES"}</div><h2>${dead ? "Taken by the dark." : "You made it to the light."}</h2><p>${dead ? "Your unbanked discoveries remain in the Catacombs. Your banked relics endure." : "Your discoveries are safe. Rest, improve your equipment, then descend again."}</p>${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats"><span>${game.banked}<small>BANKED RELICS</small></span><span>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, "0")}<small>EXPEDITION TIME</small></span></div><div id="actions"></div>`,
  );
  if (!dead && game.maxFuel < 1170)
    button("upgrade", "UPGRADE FUEL RESERVOIR · 1 RELIC", () => {
      if (game.banked >= 1 && game.maxFuel < 1170) {
        game.banked--;
        game.maxFuel += 90;
        game.save();
        ended();
      }
    });
  button("again", "DESCEND AGAIN", () => begin(false));
  button("menu", "MAIN MENU", menu);
}
window.addEventListener("keydown", (e) => {
  if (["Tab", "Space", "ArrowUp", "ArrowDown"].includes(e.code))
    e.preventDefault();
  if (e.repeat) return;
  if (e.code === "Escape") {
    if (started) {
      running ? pause() : resume();
    }
    return;
  }
  if (!running) return;
  keys.add(e.code);
  if (e.code === "KeyE") game.interact();
  if (e.code === "KeyQ") game.mark();
  if (e.code === "KeyF") game.burst();
  if (e.code.startsWith("Digit")) game.setMode(Number(e.code.slice(-1)) - 1);
  if (e.code === "Tab") journal();
  if (new URLSearchParams(location.search).has("debug")) {
    if (e.code === "KeyH") game.forceHunt();
    if (e.code === "KeyR") game.fuel = game.maxFuel;
    if (e.code === "KeyT") {
      game.player.x = game.world.exit.x * 2;
      game.player.z = game.world.exit.z * 2;
      game.interact();
    }
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", pause);
document.addEventListener("mousemove", (e) => {
  if (running && document.pointerLockElement) {
    yaw -= e.movementX * 0.002 * settings.sensitivity;
    pitch = Math.max(
      -0.15,
      Math.min(0.9, pitch + e.movementY * 0.002 * settings.sensitivity),
    );
  }
});
$("scene").addEventListener("click", () => {
  if (running)
    $("scene")
      .requestPointerLock?.()
      ?.catch(() => {});
});
$("pauseButton").onclick = pause;
window.addEventListener("resize", () => view?.resize());
let saveTimer = 0;
function frame(now: number) {
  const rawDt = (now - last) / 1000;
  const dt = Math.min(rawDt, 0.1);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(rawDt, 0.001)) * 0.05;
  if (running) {
    yaw +=
      (Number(keys.has("ArrowLeft")) - Number(keys.has("ArrowRight"))) *
      dt *
      1.7;
    accumulator += dt * (check ? 8 : 1);
    while (accumulator >= 1 / 60) {
      game.step(
        1 / 60,
        check
          ? check.input(game)
          : {
              forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
              strafe: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
              sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
              crouch: keys.has("KeyC") || keys.has("ControlLeft"),
              yaw,
            },
      );
      accumulator -= 1 / 60;
    }
    audio.update(game, dt);
    saveTimer += dt;
    if (saveTimer > 5) {
      game.save();
      saveTimer = 0;
    }
    updateHUD();
    if (game.phase === "DEAD" || game.completed) ended();
  }
  if (running || draw) {
    view?.update(game, running ? dt : 0, yaw, pitch);
    draw = false;
  }
  requestAnimationFrame(frame);
}
function updateHUD() {
  const pct = Math.max(0, game.fuel / game.maxFuel);
  $("fuelBar").style.width = `${pct * 100}%`;
  $("staminaBar").style.width = `${game.player.stamina * 100}%`;
  $("fuelText").textContent = `${Math.ceil(pct * 100)}%`;
  $("mode").textContent =
    ["EMBER", "STEADY FLAME", "BLAZE"][game.mode] || "FLAME";
  $("inventory").innerHTML =
    `<b>${game.matches}</b> MATCHES &nbsp; <b>${game.artifacts}</b> RELICS<br><small>${game.chalk.length} CHALK MARKS · ${game.banked} BANKED</small>`;
  $("notice").textContent = game.message || "";
  const hunt = game.phase.includes("HUNT");
  $("phase").textContent = hunt
    ? "THE HUNT"
    : game.phase === "RELIGHTING"
      ? "HOLD ON TO THE SPARK"
      : "";
  document.body.classList.toggle("hunt", hunt);
  document.body.classList.toggle("lowfuel", pct < 0.1);
  const nearby = game.items.find(
    (i) =>
      !i.taken && Math.hypot(i.x - game.player.x, i.z - game.player.z) < 2.5,
  );
  $("prompt").textContent = nearby
    ? `E · COLLECT ${nearby.kind.toUpperCase()}`
    : game.fuel <= 0
      ? game.matches > 0
        ? "E · STRIKE A MATCH"
        : "NO MATCHES · FIND GOLDEN FIRE"
      : "";
  $("bearing").textContent = new URLSearchParams(location.search).has("debug")
    ? `${fps.toFixed(0)} FPS · ${game.phase} · ${game.hunter.state} · ${view.renderer.info.render.calls} DRAWS`
    : "SEEK THE GOLDEN FIRE";
  const threat =
    hunt && game.hunter.state !== "DORMANT"
      ? game.hunter
      : game.enemies.find((e) => e.state === "INVESTIGATING");
  let cue = "";
  if (settings.cues && threat) {
    const dx = threat.x - game.player.x,
      dz = threat.z - game.player.z,
      d = Math.hypot(dx, dz);
    if (d < 20) {
      const pan = (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, d),
        front = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
      cue =
        pan < -0.35
          ? "◂ Footsteps to your left"
          : pan > 0.35
            ? "Footsteps to your right ▸"
            : front > 0
              ? "Footsteps ahead"
              : "Footsteps behind you";
    }
  }
  $("direction").textContent = cue;
}
game.load();
rebuild();
menu();
requestAnimationFrame(frame);
(window as any).__lastLight = {
  get game() {
    return game;
  },
  get view() {
    return view;
  },
  begin,
  resume,
};
