import { UPGRADES, type Upgrade } from "./simulation";
import "./style.css";
import { CameraControls, orbit, zoom } from "./controls";
import {
  ControllerInput,
  TouchInput,
  combineMovement,
  type PlatformAction,
  type PadSnapshot,
} from "./platform-input";
import { ExpeditionCheck } from "./qa";
let check: ExpeditionCheck | undefined;
import { Game } from "./simulation";
import { GameScene } from "./scene";
import { GameAudio } from "./audio";
import { dungeonDressing } from "./dungeon-dressing";
const $ = (id: string) => document.getElementById(id)!;
let game = new Game(104729),
  view: GameScene,
  audio = new GameAudio();
let draw = true;
let endingAnimation = 0;
let started = false;
let running = false,
  accumulator = 0,
  last = performance.now(),
  fps = 60;
const keys = new Set<string>();
const coarse =
  matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
const defaults = {
  sensitivity: 1,
  volume: 0.45,
  musicVolume: 0.7,
  cues: true,
  quality: coarse ? "low" : "high",
  touchControls: coarse || new URLSearchParams(location.search).has("touch"),
};
let settings = { ...defaults };
try {
  settings = {
    ...defaults,
    ...JSON.parse(localStorage.getItem("lastlight-settings") || "{}"),
  };
} catch {}
let screen = "menu";
const cameraControls = new CameraControls(
  $("scene"),
  () => running,
  () => settings.sensitivity,
  () => {
    draw = true;
  },
  (captured, unavailable) => {
    $("captureMouse").textContent = captured
      ? "RELEASE MOUSE"
      : "CAPTURE MOUSE";
    $("lookHint").textContent = captured
      ? "Mouse: look · Wheel: zoom · Esc: pause"
      : unavailable
        ? "Mouse capture unavailable · Drag or use arrow keys"
        : "Drag: look · Arrows: look · Wheel: zoom";
  },
);
$("captureMouse").onclick = () => void cameraControls.capture();
let inputSource = coarse ? "touch" : "keyboard";
function selectInput(source: string) {
  inputSource = source;
  document.body.dataset.input = source;
  const hint = $("hud").querySelector<HTMLElement>(".hint");
  if (hint && hint.dataset.source !== source) {
    hint.dataset.source = source;
    hint.innerHTML =
      source === "gamepad"
        ? "LS Move · RS Look · A Use<br>RT Run · LT/B Crouch · X Burst · Y Chalk<br>LB/RB Flame · View Journal · Menu Pause"
        : "WASD Move · Drag / Arrows Look · Wheel Zoom<br>SHIFT Sprint · C Crouch<br>E Use · Q Chalk · F Burst · TAB Journal";
  }
}
if (new URLSearchParams(location.search).has("touch"))
  settings.touchControls = true;
inputSource = settings.touchControls ? "touch" : "keyboard";
selectInput(inputSource);
document.body.dataset.touch = String(settings.touchControls);
const controller = new ControllerInput(platformAction);
const touchInput = new TouchInput(
  $("touchControls"),
  () => running,
  platformAction,
  (delta) => zoom(cameraControls.pose, delta),
  () => selectInput("touch"),
);
$("touchControls").addEventListener("flamemode", (e) =>
  game.setMode((e as CustomEvent<number>).detail),
);
$("audioUnlock").onclick = () => audio.start();
window.addEventListener(
  "pointerdown",
  (e) => {
    selectInput(
      settings.touchControls ||
        e.pointerType === "touch" ||
        (e.target as Element).closest?.("#touchControls")
        ? "touch"
        : "keyboard",
    );
    if (audio.needsGesture) audio.start();
  },
  { passive: true },
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    touchInput.reset();
    controller.reset();
    pause();
  }
});
function platformAction(action: PlatformAction) {
  if (action === "pause") {
    if (running) pause();
    else if (screen === "settings")
      $("overlay").querySelector<HTMLButtonElement>("#back")?.click();
    else if (started && ["pause", "journal", "settings"].includes(screen))
      resume();
    return;
  }
  if (action.startsWith("menu")) {
    const controls = [
      ...$("overlay").querySelectorAll<HTMLElement>(
        "button:not(:disabled),input,select",
      ),
    ];
    const focused = document.activeElement as HTMLElement,
      index = controls.indexOf(focused);
    if (action === "menuAccept") {
      const item = controls[index < 0 ? 0 : index];
      if (
        item instanceof HTMLButtonElement ||
        (item instanceof HTMLInputElement && item.type === "checkbox")
      )
        item.click();
      else item?.focus();
    }
    if (action === "menuBack") {
      const back = $("overlay").querySelector<HTMLButtonElement>("#back");
      if (back) back.click();
      else if (["pause", "journal"].includes(screen)) resume();
      else if (screen !== "menu") menu();
    }
    if (action === "menuUp" || action === "menuDown")
      controls[
        (index + (action === "menuUp" ? -1 : 1) + controls.length) %
          controls.length
      ]?.focus();
    if (action === "menuLeft" || action === "menuRight") {
      const direction = action === "menuRight" ? 1 : -1;
      if (focused instanceof HTMLInputElement) {
        if (focused.type === "checkbox") focused.checked = !focused.checked;
        else if (focused.type === "range") {
          direction > 0 ? focused.stepUp() : focused.stepDown();
        }
      } else if (focused instanceof HTMLSelectElement)
        focused.selectedIndex = Math.max(
          0,
          Math.min(
            focused.options.length - 1,
            focused.selectedIndex + direction,
          ),
        );
    }
    return;
  }
  if (!running) return;
  if (action === "interact") game.interact();
  if (action === "burst") game.burst();
  if (action === "chalk") game.mark();
  if (action === "journal") journal();
  if (action === "previousMode") game.setMode((game.mode + 2) % 3);
  if (action === "nextMode") game.setMode((game.mode + 1) % 3);
  if (action === "recenter") {
    cameraControls.pose.yaw = game.player.yaw;
    cameraControls.pose.pitch = 0.25;
  }
}
const intro = `<div class="eyebrow">AN EXPEDITION INTO THE FORGOTTEN CATACOMBS</div><h1>THE LAST<br><em>LIGHT</em></h1><p class="tagline">When the flame dies, the hunt begins.</p><div id="inputStatus" class="input-status">Xbox: press a button to connect · Touch: landscape recommended</div><div class="divider"></div><p class="description">Carry a fragile flame into a labyrinth that remembers.<br>Find the reliquaries. Follow the golden fires home.<br>And if your light goes out — keep moving.</p>`;
function panel(content: string) {
  touchInput.reset();
  document.body.dataset.playing = "false";
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
  screen = "menu";
  audio.setVolume(0);
  running = false;
  cameraControls.release();
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
      cameraControls.release();
    });
  if (new URLSearchParams(location.search).has("debug"))
    button("retreat-check", "CHECK HUNTER RETREAT", () => {
      begin(false);
      game.player.x = 28;
      game.player.z = 0;
      game.player.yaw = cameraControls.pose.yaw = -Math.PI / 2;
      cameraControls.pose.pitch = 0.18;
      game.hunter = { x: 42, z: 0, state: "PURSUING" };
      game.phase = "HUNT_ACTIVE";
      game.fuel = 0;
      game.enemies = [];
      game.relight();
      cameraControls.release();
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
  Object.assign(cameraControls.pose, {
    yaw: -Math.PI / 2,
    pitch: 0.25,
    distance: 3.7,
  });
  if (load) {
    try {
      game.load();
    } catch {}
  } else
    game.reset(
      Number(new URLSearchParams(location.search).get("seed")) ||
        Date.now() % 1000000,
    );
  if (load) cameraControls.pose.yaw = game.player.yaw;
  else game.player.yaw = cameraControls.pose.yaw;
  // Reproducible art-review position using the real world, light and game renderer.
  const query = new URLSearchParams(location.search);
  if (!load && query.has("debug") && query.has("dressing")) {
    const remains = dungeonDressing(game.world).find(
      (d) => d.id === "dre_small_bone_pile",
    );
    if (remains) {
      const side = Math.sign(remains.x - Math.round(remains.x / 28) * 28);
      game.player.x = remains.x - side * 3.4;
      game.player.z = remains.z;
      game.player.yaw = cameraControls.pose.yaw = (-side * Math.PI) / 2;
      cameraControls.pose.yaw += 0.35;
      cameraControls.pose.pitch = 0.24;
    }
  }
  rebuild();
  audio.start();
  audio.setVolume(settings.volume);
  resume();
}
function resume() {
  if (game.phase === "DEAD" || game.completed) return;
  screen = "playing";
  document.body.dataset.playing = "true";
  audio.setVolume(settings.volume);
  audio.setMusicVolume(settings.musicVolume);
  running = true;
  keys.clear();
  $("overlay").hidden = true;
  $("hud").hidden = false;
  last = performance.now();
  accumulator = 0;
  $("scene").focus({ preventScroll: true });
}
function pause() {
  if (!running) return;
  screen = "pause";
  audio.setVolume(0);
  running = false;
  keys.clear();
  game.save();
  cameraControls.release();
  panel(
    '<div class="eyebrow">THE DARKNESS CAN WAIT</div><h2>Take a breath.</h2><p>Your expedition is saved.</p><div id="actions"></div>',
  );
  button("resume", "RETURN TO THE FLAME", resume);
  button("journal", "EXPEDITION JOURNAL", journal);
  button("settings", "SETTINGS", showSettings);
  button("menu", "MAIN MENU", menu);
}
function controls() {
  screen = "guide";
  panel(
    '<div class="eyebrow">TORCHBEARER’S FIELD GUIDE</div><h2>Know the darkness.</h2><p>WASD · Move &nbsp; Drag mouse / arrow keys · Look &nbsp; Wheel · Zoom<br>SHIFT · Sprint &nbsp; C / CTRL · Crouch<br>E · Collect / use fire / relight<br>Q · Leave a chalk mark &nbsp; F · Flame burst<br>1 / 2 / 3 · Ember / Steady / Blaze<br>TAB · Journal &nbsp; ESC · Pause</p><p>Click Capture Mouse for free mouse look if your browser permits it. Otherwise hold either mouse button and drag over the game. Arrow keys always rotate the camera. Scroll to zoom.</p><p>Xbox: LS Move · RS Look · A Use · B Toggle Crouch · X Burst · Y Chalk · LB/RB Flame · LT Crouch · RT/LS Sprint · D-pad Up/Down Zoom · RS Click Recenter · View Journal · Menu Pause. Menus: D-pad Navigate · A Select · B Back.</p><p>Touch: Left pad Move · Drag view Look · RUN Hold Sprint · CROUCH Toggle · USE Interact/Relight · BURST, CHALK and JOURNAL actions · Flame buttons · +/− Zoom.</p><p>Ember saves fuel; Blaze spends it quickly for visibility. Crouch to quiet your steps. Break sight around corners to lose the Hunter. A match restores a reserve of fuel after a two second relight. Relit torchlight makes the Hunter recoil and flee before banishment; stronger flame protects a wider area. Sanctuary fires repel it when unobstructed. Deeper air drains fuel faster, and the Hunter grows more persistent. Stalkers can damage a steady flame at close range; use Blaze or keep your distance. Golden sanctuary fires banish the Hunt.</p><div id="actions"></div>',
  );
  button("back", "BACK", menu);
}
function showSettings() {
  const previousScreen = screen;
  screen = "settings";
  const was = running;
  touchInput.reset();
  keys.clear();
  if (was) {
    running = false;
    cameraControls.release();
  }
  panel(
    `<div class="eyebrow">SETTINGS</div><h2>Shape your experience.</h2><label>Look sensitivity <input id="sensitivity" type="range" min="0.2" max="2" step="0.1" value="${settings.sensitivity}"></label><label>Audio volume <input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>Soundtrack level <input id="musicVolume" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}"></label><label>Visual sound cues <input id="cues" type="checkbox" ${settings.cues ? "checked" : ""}></label><label>Show touch controls <input id="touchSetting" type="checkbox" ${settings.touchControls ? "checked" : ""}></label><label>Graphics <select id="quality"><option value="high">High</option><option value="low">Low</option></select></label><div id="actions"></div>`,
  );
  ($("quality") as HTMLSelectElement).value = settings.quality;
  button("back", "SAVE & RETURN", () => {
    settings.touchControls = ($("touchSetting") as HTMLInputElement).checked;
    document.body.dataset.touch = String(settings.touchControls);
    settings.sensitivity = +($("sensitivity") as HTMLInputElement).value;
    settings.volume = +($("volume") as HTMLInputElement).value;
    settings.musicVolume = +($("musicVolume") as HTMLInputElement).value;
    audio.setMusicVolume(settings.musicVolume);
    settings.cues = ($("cues") as HTMLInputElement).checked;
    settings.quality = ($("quality") as HTMLSelectElement).value;
    localStorage.setItem("lastlight-settings", JSON.stringify(settings));
    audio.setVolume(settings.volume);
    document.body.dataset.quality = settings.quality;
    view.setQuality(settings.quality === "low");
    previousScreen === "menu" ? menu() : started ? resume() : menu();
  });
}
function journal() {
  screen = "journal";
  keys.clear();
  audio.setVolume(0);
  running = false;
  cameraControls.release();
  panel(
    `<div class="eyebrow">EXPEDITION JOURNAL · SEED ${game.world.seed}</div><h2>What remains of us.</h2><p>Find the far sanctuary and bank the relics you carry.<br>Follow carved arches, chalk marks, and golden fire.</p>${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats"><span>${game.artifacts}<small>RELICS CARRIED</small></span><span>${game.banked}<small>RELICS BANKED</small></span><span>${game.chalk.length}<small>CHALK MARKS</small></span></div><p>Fuel: ${Math.ceil(game.fuel / ((1 - 0.08 * game.upgrades.wick) * (1 + game.depth * 0.3)))} seconds in Steady mode.<br>Matches: ${game.matches} · Elapsed: ${Math.floor(game.elapsed / 60)} minutes.</p><div id="actions"></div>`,
  );
  button("resume", "CLOSE JOURNAL", resume);
}
function ended() {
  updateHUD();
  screen = "ended";
  endingAnimation = 2.1;
  keys.clear();
  audio.setVolume(game.phase === "DEAD" ? 0 : settings.volume);
  running = false;
  cameraControls.release();
  if (check) {
    check.input(game);
    console.info(check.status);
  }
  const dead = game.phase === "DEAD";
  panel(
    `<div class="eyebrow">${dead ? "THE FLAME IS LOST" : "A FIRE THAT ENDURES"}</div><h2>${dead ? "Taken by the dark." : "You made it to the light."}</h2><p>${dead ? "Your unbanked discoveries remain in the Catacombs. Your banked relics endure." : "Your discoveries are safe. Rest, improve your equipment, then descend again."}</p>${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats"><span>${game.banked}<small>BANKED RELICS</small></span><span>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, "0")}<small>EXPEDITION TIME</small></span></div><div id="actions"></div>`,
  );
  if (!dead) {
    if (game.maxFuel < 1170) {
      button("upgrade", "FUEL RESERVOIR +90s | 1 RELIC", () => {
        if (game.purchaseUpgrade("reservoir")) ended();
      });
      ($("upgrade") as HTMLButtonElement).disabled = game.banked < 1;
    }
    for (const kind of Object.keys(UPGRADES) as Upgrade[]) {
      const spec = UPGRADES[kind],
        level = game.upgrades[kind];
      button(
        `upgrade-${kind}`,
        `${spec.name.toUpperCase()} | ${level}/${spec.cap} | ${level === spec.cap ? "MASTERED" : `${spec.cost} RELICS`} | ${spec.description}`,
        () => {
          if (game.purchaseUpgrade(kind)) ended();
        },
      );
      ($(`upgrade-${kind}`) as HTMLButtonElement).disabled =
        level >= spec.cap || game.banked < spec.cost;
    }
  }
  button("again", "DESCEND AGAIN", () => begin(false));
  button("menu", "MAIN MENU", menu);
}
window.addEventListener("keydown", (e) => {
  if (
    running &&
    [
      "Tab",
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ].includes(e.code)
  )
    e.preventDefault();
  selectInput("keyboard");
  if (e.repeat) return;
  if (e.code === "Escape") {
    if (running) pause();
    else if (screen === "settings")
      $("overlay").querySelector<HTMLButtonElement>("#back")?.click();
    else if (started && ["pause", "journal", "settings"].includes(screen))
      resume();
    else if (["guide", "settings"].includes(screen)) menu();
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
$("pauseButton").onclick = pause;
window.addEventListener("resize", () => {
  view?.resize();
  draw = true;
});
new ResizeObserver(() => {
  view?.resize();
  draw = true;
}).observe($("scene"));
window.visualViewport?.addEventListener("resize", () => {
  view?.resize();
  draw = true;
});
let saveTimer = 0;
function frame(now: number) {
  const rawDt = (now - last) / 1000;
  const dt = Math.min(rawDt, 0.1);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(rawDt, 0.001)) * 0.05;
  let pad: PadSnapshot | null = null;
  try {
    pad =
      [...(navigator.getGamepads?.() ?? [])].find(
        (p) => p?.connected && p.mapping === "standard",
      ) ?? null;
  } catch {}
  controller.update(document.hidden ? null : pad, dt, running);
  if (controller.used) selectInput("gamepad");
  const inputStatus = document.getElementById("inputStatus");
  if (inputStatus)
    inputStatus.textContent = controller.connected
      ? "Xbox connected · A select · B back · D-pad / left stick navigate"
      : settings.touchControls
        ? "Touch controls ready · Landscape recommended"
        : "Keyboard & mouse · Connect Xbox and press a button";

  if (running) {
    cameraControls.keyboard(keys, dt);
    orbit(
      cameraControls.pose,
      controller.look.x * 800 * dt,
      controller.look.y * 600 * dt,
      settings.sensitivity,
    );
    if (pad && controller.connected)
      zoom(
        cameraControls.pose,
        ((pad.buttons[13]?.pressed ? 1 : 0) -
          (pad.buttons[12]?.pressed ? 1 : 0)) *
          dt *
          180,
      );
    const movement = combineMovement(
      {
        forward: Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
        strafe: Number(keys.has("KeyD")) - Number(keys.has("KeyA")),
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
        crouch: keys.has("KeyC") || keys.has("ControlLeft"),
      },
      controller.movement,
      touchInput.movement,
    );

    accumulator += dt * (check ? 8 : 1);
    while (accumulator >= 1 / 60) {
      game.step(
        1 / 60,
        check
          ? check.input(game)
          : {
              ...movement,
              yaw: cameraControls.pose.yaw,
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
  const ending = screen === "ended" && endingAnimation > 0;
  if (ending) endingAnimation = Math.max(0, endingAnimation - dt);
  if (running || draw || ending) {
    view?.update(
      game,
      running || ending ? dt : 0,
      cameraControls.pose.yaw,
      cameraControls.pose.pitch,
      cameraControls.pose.distance,
    );
    draw = false;
  }
  requestAnimationFrame(frame);
}
function updateHUD() {
  $("scene").dataset.audioSamples = String(audio.sampleCount);
  $("audioUnlock").hidden = !audio.needsGesture;
  if (inputSource === "gamepad")
    $("lookHint").textContent = "LS Move · RS Look · A Use · Menu Pause";
  else if (inputSource === "touch")
    $("lookHint").textContent = "Left pad: move · Drag view: look";
  for (const button of document.querySelectorAll<HTMLElement>(
    "[data-touch-mode]",
  ))
    button.setAttribute(
      "aria-pressed",
      String(Number(button.dataset.touchMode) === game.mode),
    );
  const compass = game.sanctuaryBearing(cameraControls.pose.yaw);
  $("compass").hidden = !compass;
  if (compass) {
    $("compassNeedle").style.transform = `rotate(${-compass.angle}rad)`;
    const degrees = (Math.abs(compass.angle) * 180) / Math.PI;
    const direction =
      compass.distance < 4
        ? "NEARBY"
        : degrees < 18
          ? "AHEAD"
          : degrees > 155
            ? "BEHIND"
            : compass.angle > 0
              ? "LEFT"
              : "RIGHT";
    $("compassText").textContent = `GOLDEN FIRE | ${direction}`;
    $("compass").setAttribute(
      "aria-label",
      `Sanctuary compass: golden fire ${direction.toLowerCase()}. Bearing only; passages may turn.`,
    );
  }
  const pct = Math.max(0, game.fuel / game.maxFuel);
  $("fuelBar").style.width = `${pct * 100}%`;
  $("staminaBar").style.width = `${game.player.stamina * 100}%`;
  $("fuelText").textContent = `${Math.ceil(pct * 100)}%`;
  $("mode").textContent =
    ["EMBER", "STEADY FLAME", "BLAZE"][game.mode] || "FLAME";
  $("inventory").innerHTML =
    `<b>${game.matches}</b> MATCHES &nbsp; <b>${game.artifacts}</b> RELICS<br><small>${game.chalk.length} CHALK MARKS · ${game.banked} BANKED</small>`;
  const useLabel =
    inputSource === "gamepad" ? "A" : inputSource === "touch" ? "USE" : "E";
  $("pauseButton").textContent =
    inputSource === "gamepad"
      ? "MENU · PAUSE"
      : inputSource === "touch"
        ? "PAUSE"
        : "ESC · PAUSE";
  $("notice").textContent = (game.message || "").replace(
    /\bE to\b/g,
    inputSource === "touch" ? "Tap USE to" : `${useLabel} to`,
  );
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
    ? `${useLabel} · COLLECT ${nearby.kind.toUpperCase()}`
    : game.fuel <= 0
      ? game.matches > 0
        ? `${useLabel} · STRIKE A MATCH`
        : "NO MATCHES · FIND GOLDEN FIRE"
      : "";
  $("bearing").textContent = new URLSearchParams(location.search).has("debug")
    ? `${fps.toFixed(0)} FPS · ${game.phase} · ${game.hunter.state} · ${view.renderer.info.render.calls} DRAWS`
    : game.depth > 0
      ? `DEEP AIR · FLAME DRAIN +${Math.round(game.depth * 30)}%`
      : "SEEK THE GOLDEN FIRE";
  $("scene").dataset.cameraYaw = cameraControls.pose.yaw.toFixed(3);
  $("scene").dataset.cameraPitch = cameraControls.pose.pitch.toFixed(3);
  $("scene").dataset.cameraDistance = cameraControls.pose.distance.toFixed(2);
  $("scene").dataset.playerX = game.player.x.toFixed(2);
  $("scene").dataset.playerZ = game.player.z.toFixed(2);
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
      const pan =
          (dx * Math.cos(cameraControls.pose.yaw) -
            dz * Math.sin(cameraControls.pose.yaw)) /
          Math.max(1, d),
        front =
          -dx * Math.sin(cameraControls.pose.yaw) -
          dz * Math.cos(cameraControls.pose.yaw);
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
