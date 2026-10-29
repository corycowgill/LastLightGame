import { cryptSketch, unexploredPassages } from "./crypt-sketch";
import { glyphSvg, relicGlyph, visualCue } from "./visual-language";
import { BRAND_CONFIG } from "./brands";
import {
  CONFIG,
  DESCENT,
  PROVISIONS,
  UPGRADES,
  type Provision,
  type Upgrade,
} from "./simulation";
import { relicIdentity } from "./relics";
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
import { Game, lineOfSight, walkable } from "./simulation";
declare const __BUILD_ID__: string;
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
  quality: coarse ? "low" : "auto",
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
        ? "LS Move · RS Look · A Use<br>RT Run · LT/B Crouch · X Burst · Y Chalk<br>LB / D-pad Flame · RB Brand · View Journal · Menu Pause"
        : "WASD Move · Drag / Arrows Look · Wheel Zoom<br>SHIFT Sprint · C Crouch<br>E Use · Q Chalk · F Burst · G Brand · T Stone · TAB Journal";
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
// Rotation can interrupt a captured touch on Safari. Resume explicitly after reframing.
window.addEventListener("orientationchange", () => {
  if (settings.touchControls) {
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
  if (action === "stone") game.throwStone();
  if (action === "brand") game.dropBrand();
  if (action === "chalk") game.mark();
  if (action === "journal") journal();
  if (action === "previousMode") game.setMode((game.mode + 2) % 3);
  if (action === "nextMode") game.setMode((game.mode + 1) % 3);
  if (action === "recenter") {
    cameraControls.pose.yaw = game.player.yaw;
    cameraControls.pose.pitch = 0.25;
  }
}
const intro = `<div class="eyebrow">AN EXPEDITION INTO THE FORGOTTEN CATACOMBS</div><h1>THE LAST<br><em>LIGHT</em></h1><p class="tagline">When the flame dies, the hunt begins.</p><div id="inputStatus" class="input-status">Xbox: press a button to connect · Touch: landscape recommended</div><div class="divider"></div><p class="description">Recover a votive from the crypt and bring it back to golden fire.<br>Go deeper for richer discoveries. Leave before the flame fails.<br>And if your light goes out — keep moving.</p>`;
function panel(content: string) {
  touchInput.reset();
  document.body.dataset.playing = "false";
  if (screen === "menu") $("overlay").dataset.backdrop = "title";
  else if (["pause", "journal", "ended"].includes(screen))
    $("overlay").dataset.backdrop = "game";
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
const roman = (n: number) =>
  ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][n - 1] ??
  String(n);
const descentLabel = () =>
  game.deepestDescent > 1 ? ` · DESCENT ${roman(game.descent)}` : "";
function menu() {
  screen = "menu";
  audio.setVolume(0);
  running = false;
  cameraControls.release();
  panel(
    intro +
      `<div id="actions"></div><div class="version">A CATACOMBS EXPEDITION · HEADPHONES RECOMMENDED<br>BUILD ${__BUILD_ID__}</div>`,
  );
  button("new", `BEGIN EXPEDITION${descentLabel()}`, () => begin(false));
  if (game.deepestDescent > 1)
    button(
      "descent",
      `CHOOSE DESCENT · ${roman(game.descent)} OF ${roman(game.deepestDescent)}`,
      () => {
        // Cycle through unlocked Descents; deeper burns faster and pays more.
        game.descent = (game.descent % game.deepestDescent) + 1;
        game.save();
        menu();
      },
    );
  button("continue", "CONTINUE JOURNEY", () => begin(true));
  button("settings", "SETTINGS", showSettings);
  button("controls", "FIELD GUIDE", controls);
  // Offer updates only from the menu, never reload an active expedition.
  fetch("/build.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((build) => {
      if (
        screen === "menu" &&
        build?.id &&
        build.id !== __BUILD_ID__ &&
        !document.getElementById("updateBuild")
      )
        button("updateBuild", "UPDATE READY · RELOAD GAME", () =>
          location.reload(),
        );
    })
    .catch(() => {});
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
  if (new URLSearchParams(location.search).has("debug"))
    button("pack-check", "REVIEW SECOND HUNTER · PRIMARY HELD", async () => {
      await begin(false);
      const room = game.world.layout?.rooms.find((r) => r.design === "ossuary");
      if (!room) return;
      Object.assign(game.player, { x: room.x * 2, z: room.z * 2 });
      game.enemies = [];
      game.fuel = 0;
      game.phase = "HUNT_ACTIVE";
      game.hunter = { ...game.start, state: "BANISHED" };
      cameraControls.release();
    });
}
function rebuild() {
  draw = true;
  document.querySelector(".brand span")!.textContent =
    game.world.layout?.theme ?? "THE FORGOTTEN CATACOMBS";
  view?.dispose();
  $("scene").replaceChildren();
  view = new GameScene($("scene"), game.world);
  view.setQuality(
    settings.quality === "low"
      ? "low"
      : settings.quality === "high"
        ? "high"
        : "auto",
  );
}
let preparing = false;
async function begin(load: boolean) {
  if (preparing) return;
  preparing = true;
  running = false;
  $("hud").hidden = true;
  frameSample = 0;
  worstFrame = 0;
  longFrames = 0;
  metricTimer = 0;
  hudTimer = 0;
  hudPhase = "";
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
  } else {
    game.reset(
      Number(new URLSearchParams(location.search).get("seed")) ||
        Date.now() % 1000000,
    );
    game.applyProvisions();
    game.rollOmen();
  }
  if (load) cameraControls.pose.yaw = game.player.yaw;
  else game.player.yaw = cameraControls.pose.yaw = game.startingHeading;
  // Reproducible art-review position using the real world, light and game renderer.
  const query = new URLSearchParams(location.search);
  if (!load && query.has("debug") && query.has("stalker")) {
    Object.assign(game.player, { x: 28, z: 0 });
    game.enemies = [{ x: 30, z: 0, kind: "stalker", state: "LISTENING" }];
    game.fuel = game.maxFuel * 0.09;
    game.player.yaw = cameraControls.pose.yaw = -Math.PI / 2;
  }
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
  if (
    !load &&
    query.has("debug") &&
    (query.has("room") || query.has("encounter") || query.has("hazard"))
  ) {
    const item = game.items.find((i) => i.encounter === query.get("encounter"));
    const room = game.world.layout?.rooms.find(
      (r) => r.design === query.get("room"),
    );
    const hazard = game.hazards.find((h) => h.kind === query.get("hazard"));
    const target =
      hazard ??
      (query.get("encounter") === "shortcut"
        ? game.world.shortcutGate
        : (item ?? (room ? { x: room.x * 2, z: room.z * 2 } : undefined)));
    if (query.get("encounter") === "shortcut" && query.has("recovered")) {
      const votive = game.items.find((i) => i.id === game.encounterRelicId);
      if (votive) {
        votive.taken = true;
        game.artifacts = votive.value ?? 3;
      }
    }
    if (target) {
      const approach = [
        [0, 2],
        [2, 0],
        [0, -2],
        [-2, 0],
      ]
        .map(([x, z]) => ({ x: target.x + x, z: target.z + z }))
        .find((p) => walkable(game.world, p.x, p.z));
      if (approach) {
        Object.assign(game.player, approach);
        game.player.yaw = cameraControls.pose.yaw = Math.atan2(
          -(target.x - approach.x),
          -(target.z - approach.z),
        );
      }
      game.enemies = [];
    }
  }
  rebuild();
  audio.start();
  audio.setVolume(settings.volume);
  panel(
    '<div class="eyebrow">PREPARING EXPEDITION</div><h2>The stone is waking.</h2><p id="loadingStatus">Preparing the crypts, fire and shadows…</p>',
  );
  try {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    await view.prepare(
      game,
      cameraControls.pose.yaw,
      cameraControls.pose.pitch,
      cameraControls.pose.distance,
    );
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  } catch (error) {
    console.warn("Expedition warm-up used fallback rendering", error);
  } finally {
    preparing = false;
  }
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
    '<div class="eyebrow">TORCHBEARER’S FIELD GUIDE</div><h2>Know the darkness.</h2><p>WASD · Move &nbsp; Drag mouse / arrow keys · Look &nbsp; Wheel · Zoom<br>SHIFT · Sprint &nbsp; C / CTRL · Crouch<br>E · Collect / use fire / relight<br>Q · Leave a chalk mark &nbsp; F · Flame burst &nbsp; G · Drop burning brand &nbsp; T · Throw stone<br>1 / 2 / 3 · Ember / Steady / Blaze<br>TAB · Journal &nbsp; ESC · Pause</p><p>Click Capture Mouse for free mouse look if your browser permits it. Otherwise hold either mouse button and drag over the game. Arrow keys always rotate the camera. Scroll to zoom.</p><p>Xbox: LS Move · RS Look · A Use · B Toggle Crouch · X Burst · Y Chalk · LB / D-pad Flame · RB Brand · LT Crouch · RT/LS Sprint · D-pad Up Stone · D-pad Down Zoom Out (LT + Down Zoom In) · RS Click Recenter · View Journal · Menu Pause. Menus: D-pad Navigate · A Select · B Back.</p><p>Touch: Left pad Move (push forward to the rim to run; ease back to walk) · Drag view Look · RUN Hold Sprint · CROUCH Toggle · USE Interact/Relight · BURST, BRAND, STONE, CHALK and JOURNAL actions · Flame buttons · +/− Zoom.</p><p>Ember saves fuel; Blaze spends it quickly for visibility. Crouch to quiet your steps and reduce distant visual detection; close Hunters can still see you. Sprint in bursts: stamina recovers after a short rest. Break sight around corners to lose the Hunter. A fresh Steady torch lasts about two minutes. Oil adds about 30 seconds; each of your two starting matches buys about 20 seconds after a two second relight. Ember stretches fuel to about 3.6 minutes; Blaze empties a full torch in about 34 seconds. Relighting slows movement and prevents sprinting; find cover first. Flame bursts cannot reach through stone walls. Relit torchlight makes the Hunter recoil and flee before banishment; stronger flame protects a wider area. Sanctuary fires repel it when unobstructed. Deeper air drains fuel faster, and the Hunter grows more persistent. Stalkers can damage a steady flame at close range; use Blaze or keep your distance. Golden sanctuary fires banish the Hunt.</p><p>G / RB / BRAND drops a burning brand: costs 15 seconds of base Steady fuel while lit, or one match during a Hunt, lasts 18 seconds, and repels creatures within 4 metres when unobstructed. It is stationary and grants no sanctuary refill; Hunters resume searching after it dies. Its fire can also light a reliquary seal while your torch is out. Only one brand may burn, with a 24-second cooldown.</p><p>Some expeditions contain the Bell Crypt. Recover its sealed votive via the longer route, then choose: quietly retrace your steps or raise the loud return gate for a shorter route to fire. Flooded chambers have slower, noisy water and quieter dry edges.</p><div id="actions"></div>',
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
    `<div class="eyebrow">SETTINGS</div><h2>Shape your experience.</h2><label>Look sensitivity <input id="sensitivity" type="range" min="0.2" max="2" step="0.1" value="${settings.sensitivity}"></label><label>Audio volume <input id="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label>Soundtrack level <input id="musicVolume" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}"></label><label>Visual sound cues <input id="cues" type="checkbox" ${settings.cues ? "checked" : ""}></label><label>Show touch controls <input id="touchSetting" type="checkbox" ${settings.touchControls ? "checked" : ""}></label><label>Graphics <select id="quality"><option value="auto">Auto (recommended)</option><option value="high">High</option><option value="low">Low</option></select></label><div id="actions"></div>`,
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
    view.setQuality(
      settings.quality === "low"
        ? "low"
        : settings.quality === "high"
          ? "high"
          : "auto",
    );
    previousScreen === "menu" ? menu() : started ? resume() : menu();
  });
}
function sketchFigure(title: string, compact = false) {
  const open = unexploredPassages(game);
  return `<figure class="sketch-wrap${compact ? " compact" : ""}"><figcaption class="eyebrow">${title}</figcaption>${cryptSketch(game)}<small><b class="key-fire"></b> fire · <b class="key-relic"></b> relic lifted · <b class="key-chalk"></b> chalk${open ? ` · ${open} passage${open === 1 ? "" : "s"} not yet taken` : ""}</small></figure>`;
}
function journal() {
  screen = "journal";
  keys.clear();
  audio.setVolume(0);
  running = false;
  cameraControls.release();
  panel(
    `<div class="eyebrow">EXPEDITION JOURNAL · SEED ${game.world.seed}${game.descent > 1 ? ` · DESCENT ${roman(game.descent)}` : ""}</div>${game.omen.id !== "quiet" ? `<p class="descent-note"><strong>${game.omen.name}.</strong> ${game.omen.text}</p>` : ""}<h2>${game.world.layout?.theme ?? "What remains of us."}</h2><p>Find the far sanctuary and bank the relics you carry.<br>Follow carved arches, chalk marks, and golden fire.</p>${sketchFigure("CRYPT SKETCH")}${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats"><span>${game.artifacts}<small>RELICS CARRIED</small></span><span>${game.banked}<small>RELICS BANKED</small></span><span>${game.chalk.length}<small>CHALK MARKS</small></span></div><p>Fuel: ${Math.ceil(game.fuel / ((game.fuelRate * CONFIG.flameRates[1]) / CONFIG.flameRates[game.mode]))} seconds in Steady mode.<br>Matches: ${game.matches} · Elapsed: ${Math.floor(game.elapsed / 60)} minutes.</p><p>Optional: open the noisy sealed reliquary for three relics, or seek the larger oil cache. In flooded rooms, dry edges are quieter.</p><div id="discoveries"></div><div id="actions"></div>`,
  );
  const gallery = document.createElement("div");
  gallery.className = "relic-gallery";
  for (const item of game.items.filter(
    (i) => i.kind === "artifact" && i.taken,
  )) {
    const r = relicIdentity(game.world.seed, item);
    const tile = document.createElement("article");
    tile.style.setProperty("--relic-color", r.color);
    tile.innerHTML = glyphSvg(
      item.kind === "artifact"
        ? relicGlyph(game.world.seed, item)
        : item.kind === "fuel"
          ? "oil"
          : "match",
    );
    const name = document.createElement("strong");
    name.textContent = r.name;
    tile.append(name);
    const story = document.createElement("p");
    story.textContent = r.story;
    tile.append(story);
    gallery.append(tile);
  }
  $("discoveries").append(gallery);
  const tools = document.createElement("p");
  tools.textContent = `Living mist: fire clears a moving pocket (Ember 2.5m, Steady 4.5m, Blaze 7m). In darkness, prolonged exposure slows you by up to 8% and causes coughs that nearby Hunters can investigate. Relight, use a brand or find sanctuary to recover. Sealed votive: every 18 seconds it can cry out; crouch still when it whispers to muffle it. Throw one of three stones with T / D-pad Up / STONE to draw an unseen Hunter toward the impact. Five-second cooldown. Sight and player noise take priority. Environmental dangers: walk over unstable rubble instead of sprinting. Crouch through burial webs or hold Blaze within three metres for two seconds to burn a permanent opening. Crouch over loose bones and beneath hanging chains to avoid noise. Cold vents hiss for two seconds before a three-second burst; go around or wait. Active vapor slows movement and drains stamina. Burning brand: G / RB / BRAND. Cost ${BRAND_CONFIG.fuelCost / 6}s base Steady fuel; ${BRAND_CONFIG.lifetime}s stationary light, ${BRAND_CONFIG.repelRadius}m protection, ${BRAND_CONFIG.cooldown}s cooldown. During a Hunt, spend one match for instant stationary fire instead of a two-second torch relight. ${game.encounter ? `Bell Crypt return seal: ${game.shortcutOpen ? "OPEN" : game.shortcutUnlocked ? "VOTIVE RECOVERED — READY TO RAISE" : "SEALED — FIND ITS VOTIVE"}. Raising it is loud; retracing your route is quieter.` : "Explore this layout's crypts; no bell return seal was found on this expedition."}`;
  const reference = document.createElement("details");
  reference.className = "journal-reference";
  const referenceTitle = document.createElement("summary");
  referenceTitle.textContent = "CONTROLS & SURVIVAL REFERENCE";
  reference.append(referenceTitle, tools);
  $("discoveries").append(reference);
  const summary = document.createElement("p");
  const votives = game.items.filter((i) => i.kind === "artifact");
  summary.textContent = `Votives recovered: ${votives.filter((i) => i.taken).length}/${votives.length}. Search burial recesses and side chambers for glimmers; the sealed ossuary reliquary holds three names. Prolonged Hunts draw a second Hunter: find fire or relight before the answering footsteps arrive.`;
  $("discoveries").append(summary);
  for (const discovery of [
    ...new Set([...game.archive, ...game.discoveries]),
  ]) {
    const paragraph = document.createElement("p");
    paragraph.textContent = discovery;
    $("discoveries").append(paragraph);
  }
  button("resume", "CLOSE JOURNAL", resume);
}
function ended() {
  updateHUD();
  screen = "ended";
  endingAnimation = 2.1;
  keys.clear();
  if (game.phase === "DEAD") audio.fadeAfterDefeat();
  else audio.setVolume(settings.volume);
  running = false;
  cameraControls.release();
  if (check) {
    check.input(game);
    console.info(check.status);
  }
  const dead = game.phase === "DEAD";
  // The result screen speaks alone; live HUD warnings would contradict it.
  $("hud").hidden = true;
  $("presence").style.opacity = "0";
  panel(
    `<div class="eyebrow">${dead ? "THE FLAME IS LOST" : "A FIRE THAT ENDURES"}${game.deepestDescent > 1 || game.fellFrom ? ` · DESCENT ${roman(game.fellFrom || game.descent)}` : ""}</div><h2 id="resultTitle">${dead ? "Taken by the dark." : "You made it to the light."}</h2><p>${dead ? (game.lostRelics ? `The dark keeps the ${game.lostRelics === 1 ? "relic" : `${game.lostRelics} relics`} you carried. Banked relics, upgrades and stories endure.` : "You carried nothing the dark could keep. Banked relics, upgrades and stories endure.") : "Your discoveries are safe. Rest, improve your equipment, then descend again."}</p>${dead && game.fellFrom ? `<p class="descent-note">The crypt pushes you back: Descent ${roman(game.fellFrom)} → ${roman(game.descent)}.</p>` : ""}${!dead && game.deepestDescent > game.descent ? `<p class="descent-note">Descent ${roman(game.descent + 1)} is open: fuel burns ${Math.round(DESCENT.fuelDrain * 100 * game.descent)}% faster and a second Stalker waits below, but every banked relic pays more.</p>` : ""}${dead ? `<p id="deathAdvice" class="learning-note"></p>` : ""}${sketchFigure(dead ? "WHERE THE DARK TOOK YOU" : "YOUR ROUTE TO THE LIGHT", true)}${check ? `<p id="checkResult">${check.status}</p>` : ""}<div class="stats">${dead ? `<span class="lost">${game.lostRelics}<small>RELICS LOST</small></span>` : ""}${!dead && game.descentBonus ? `<span class="bonus">+${game.descentBonus}<small>DESCENT BONUS</small></span>` : ""}<span>${game.banked}<small>BANKED RELICS</small></span><span>${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, "0")}<small>EXPEDITION TIME</small></span></div><div id="actions"></div>`,
  );
  if (dead) {
    if (game.deathCause)
      $("resultTitle").textContent = `Caught by the ${game.deathCause}.`;
    $("deathAdvice").textContent =
      game.deathAdvice ||
      "Keep an escape route in mind. Carry a relic back to fire before risking the next chamber.";
  }
  if (!dead) {
    if (game.maxFuel < 1170) {
      button("upgrade", "FUEL RESERVOIR +15s BASE | 1 RELIC", () => {
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
  // Provisions: spend banked relics on supplies for the next expedition only.
  for (const kind of Object.keys(PROVISIONS) as Provision[]) {
    const spec = PROVISIONS[kind],
      bought = game.provisions[kind];
    const what =
      kind === "match" ? "+1 MATCH" : `+${spec.amount} THROWING STONES`;
    button(
      `provision-${kind}`,
      `${spec.name.toUpperCase()} | ${what} NEXT EXPEDITION | ${bought}/${spec.cap} | ${spec.cost} RELIC`,
      () => {
        if (game.buyProvision(kind)) ended();
      },
    );
    ($(`provision-${kind}`) as HTMLButtonElement).disabled =
      bought >= spec.cap || game.banked < spec.cost;
  }
  if (!dead && game.deepestDescent > game.descent)
    button(
      "deeper",
      `DESCEND DEEPER · DESCENT ${roman(game.descent + 1)}`,
      () => {
        game.descent += 1;
        game.save();
        begin(false);
      },
    );
  button("again", `DESCEND AGAIN${descentLabel()}`, () => begin(false));
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
  if (e.code === "KeyG") game.dropBrand();
  if (e.code === "KeyT") game.throwStone();
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
let savePending = false;
function queueSave() {
  if (savePending) return;
  savePending = true;
  const save = () => {
    savePending = false;
    game.save();
  };
  if ("requestIdleCallback" in window)
    window.requestIdleCallback(save, { timeout: 2000 });
  else setTimeout(save, 0);
}
let hudTimer = 0;
let hudPhase = "";
let inventoryMarkup = "";
let shownRoom = "";
let roomRevealUntil = 0;
let pouchMarkup = "";
let cueMarkup = "";
let observedGame: Game | undefined;
let observedSeed = 0;
let seenRelics = new Set<number>();
let relicRevealUntil = 0;
const frameTimes = new Float32Array(240);
let frameSample = 0;
let worstFrame = 0;
let longFrames = 0;
let metricTimer = 0;
function frame(now: number) {
  // Hold the 3D scene while the studio intro plays so it animates smoothly on
  // slower devices; a controller button still skips it.
  if (document.getElementById("hallucinated-studio-intro")) {
    try {
      if (
        [...(navigator.getGamepads?.() ?? [])].some(
          (pad) => pad?.connected && pad.buttons.some((b) => b.pressed),
        )
      )
        window.dispatchEvent(new KeyboardEvent("keydown"));
    } catch {}
    last = now;
    requestAnimationFrame(frame);
    return;
  }
  const rawDt = (now - last) / 1000;
  const dt = Math.min(rawDt, 0.1);
  last = now;
  if (preparing) {
    const status = document.getElementById("loadingStatus");
    const text = `Preparing crypts, fire and shadows · ${view?.assetsLoaded ?? 0} model types loaded`;
    if (status && status.textContent !== text) status.textContent = text;
  }
  fps = fps * 0.95 + (1 / Math.max(rawDt, 0.001)) * 0.05;
  if (running && !document.hidden) view?.sampleFrame(rawDt);
  if (running && rawDt > 0 && Number.isFinite(rawDt)) {
    worstFrame = Math.max(worstFrame, rawDt * 1000);
    if (rawDt > 0.0334) longFrames++;
    frameTimes[frameSample++ % frameTimes.length] = rawDt * 1000;
    metricTimer += dt;
    if (metricTimer >= 1) {
      metricTimer = 0;
      const samples = Array.from(
        frameTimes.subarray(0, Math.min(frameSample, frameTimes.length)),
      ).sort((a, b) => a - b);
      $("scene").dataset.frameP95 =
        samples[Math.floor((samples.length - 1) * 0.95)].toFixed(1);
      $("scene").dataset.frameWorst = worstFrame.toFixed(1);
      $("scene").dataset.longFrameTotal = String(longFrames);
      $("scene").dataset.longFramePercent = (
        (100 * samples.filter((t) => t > 33.4).length) /
        samples.length
      ).toFixed(1);
    }
  }
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
  if (inputStatus) {
    const label = controller.connected
      ? "Xbox connected · A select · B back · D-pad / left stick navigate"
      : settings.touchControls
        ? "Touch controls ready · Landscape recommended"
        : "Keyboard & mouse · Connect Xbox and press a button";
    if (inputStatus.textContent !== label) inputStatus.textContent = label;
  }

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
        (pad.buttons[13]?.pressed ? 1 : 0) *
          (pad.buttons[6]?.pressed ? -1 : 1) *
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
      queueSave();
      saveTimer = 0;
    }
    hudTimer += dt;
    if (hudTimer >= 0.1 || hudPhase !== game.phase) {
      hudTimer = 0;
      hudPhase = game.phase;
      updateHUD();
    }
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
  if (
    observedGame !== game ||
    observedSeed !== game.world.seed ||
    game.elapsed < 0.2
  ) {
    observedGame = game;
    observedSeed = game.world.seed;
    seenRelics = new Set(game.items.filter((i) => i.taken).map((i) => i.id));
    relicRevealUntil = 0;
    shownRoom = "";
  }
  for (const item of game.items) {
    if (!item.taken || seenRelics.has(item.id)) continue;
    seenRelics.add(item.id);
    const relic = relicIdentity(game.world.seed, item);
    $("pickupTitle").textContent =
      item.kind === "artifact" ? "VOTIVE RECOVERED" : "SUPPLY RECOVERED";
    $("relicName").textContent =
      item.kind === "artifact"
        ? relic.name
        : item.kind === "fuel"
          ? "Torch oil"
          : "Dry match";
    $("relicStory").textContent = relic.story;
    $("relicDiscovery").style.setProperty("--relic-color", relic.color);
    $("relicEmblem").innerHTML = glyphSvg(relicGlyph(game.world.seed, item));
    relicRevealUntil = game.elapsed + 4;
  }
  $("relicDiscovery").hidden =
    game.elapsed >= relicRevealUntil || game.phase !== "EXPLORING";
  const carried =
    game.artifacts > 0
      ? game.items.filter((i) => i.taken && i.kind === "artifact")
      : [];
  const pouch = carried
    .slice(-6)
    .map((i) => {
      const r = relicIdentity(game.world.seed, i);
      return `<span class="pouch-relic" title="${r.name}" aria-label="${r.name}" style="color:${r.color}">${glyphSvg(relicGlyph(game.world.seed, i))}</span>`;
    })
    .join("");
  if (pouch !== pouchMarkup) {
    pouchMarkup = pouch;
    $("relicPouch").innerHTML = pouch;
  }
  const visualSignal = visualCue(game);
  $("visualCue").hidden = !visualSignal;
  if (visualSignal) {
    const markup = `<div class="cue-symbol">${glyphSvg(visualSignal.glyph)}</div><span class="cue-arrow">›</span><div class="cue-action">${glyphSvg(visualSignal.action)}</div><small>${visualSignal.label}</small>`;
    if (markup !== cueMarkup) {
      cueMarkup = markup;
      $("visualCue").innerHTML = markup;
    }
    $("visualCue").style.setProperty(
      "--cue-progress",
      `${Math.round(Math.max(0, Math.min(1, visualSignal.progress)) * 360)}deg`,
    );
    $("visualCue").classList.toggle("urgent", visualSignal.urgent);
    $("visualCue").setAttribute(
      "aria-label",
      game.tensionHint || game.hazardHint || visualSignal.label,
    );
  }
  document.body.classList.toggle("visual-guidance", !!visualSignal);
  const stoneButton = document.querySelector<HTMLButtonElement>(
    '[data-touch-action="stone"]',
  );
  if (stoneButton) {
    stoneButton.disabled =
      game.stones <= 0 ||
      game.stoneCooldown > 0 ||
      !["EXPLORING", "HUNT_GRACE", "HUNT_ACTIVE"].includes(game.phase);
    stoneButton.textContent =
      game.stoneCooldown > 0
        ? `${Math.ceil(game.stoneCooldown)}s`
        : `STONE ${game.stones}`;
  }
  const brandButton = document.querySelector<HTMLButtonElement>(
    '[data-touch-action="brand"]',
  );
  if (brandButton) {
    brandButton.disabled = !game.brandReady;
    brandButton.textContent = game.brands.length
      ? `FIRE ${Math.ceil(game.brands[0].remaining)}s`
      : game.brandCooldown > 0
        ? `${Math.ceil(game.brandCooldown)}s`
        : game.phase.includes("HUNT")
          ? "BRAND · 1M"
          : "BRAND";
  }
  $("scene").dataset.mistExposure = game.mist.exposure.toFixed(2);
  $("scene").dataset.mistDensity = game.mist.densityAt(game.player).toFixed(2);
  $("scene").dataset.mistCough = String(game.mistCough);
  $("scene").dataset.brandCount = String(game.brands.length);
  $("scene").dataset.shortcutOpen = String(game.shortcutOpen);
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
  // The flame emblem and stamina line breathe with the torch and the body.
  $("hud").style.setProperty("--fuel", pct.toFixed(3));
  $("hud").dataset.flameMode = String(game.mode);
  $("hud").dataset.lit = String(game.fuel > 0);
  document.body.classList.toggle("rested", game.player.stamina > 0.98);
  $("fuelText").textContent =
    game.fuel <= 0
      ? "the flame is out"
      : `${Math.ceil(game.fuel / game.fuelRate)}s left${game.depth > 0 ? ` · +${Math.round(game.depth * 30)}% DRAIN` : ""}`;
  $("mode").textContent = ["EMBER", "STEADY", "BLAZE"][game.mode] || "FLAME";
  const closeCreature = game.enemies.find(
    (e) =>
      Math.hypot(e.x - game.player.x, e.z - game.player.z) < 8 &&
      lineOfSight(game.world, e, game.player),
  );
  const hunting = ["HUNT_GRACE", "HUNT_ACTIVE"].includes(game.phase);
  const exposure = game.hidingExposure;
  document.body.classList.toggle("hidden-nook", game.hidden && hunting);
  document.body.classList.toggle("sensed", exposure > 0.35);
  $("survivalHint").textContent = game.hidden
    ? exposure > 0.35
      ? "IT LINGERS · IT CAN SENSE YOU · SLIP AWAY OR HOLD"
      : "HIDDEN IN THE TOMB'S SHADOW · STAY CROUCHED"
    : game.fuel <= 0
      ? game.matches > 0
        ? "STRIKE A MATCH · KEEP MOVING"
        : "FIND GOLDEN FIRE · STAY QUIET"
      : pct < 0.1
        ? "FLAME FAILING · FIND OIL OR GOLDEN FIRE"
        : closeCreature?.state === "COWERING" ||
            closeCreature?.state === "FLEEING"
          ? "IT FEARS YOUR FLAME · KEEP YOUR DISTANCE"
          : game.hazardHint || game.objectiveHint;
  const markup = `<span title="Matches" aria-label="${game.matches} matches">${glyphSvg("match")}<b>${game.matches}</b></span><span title="Relics carried" aria-label="${game.artifacts} relics carried">${glyphSvg("votive")}<b>${game.artifacts}</b></span><span title="Stones" aria-label="${game.stones} stones"><i class="stone-dot"></i><b>${game.stones}</b></span>`;
  if (markup !== inventoryMarkup) {
    inventoryMarkup = markup;
    $("inventory").innerHTML = markup;
  }
  const useLabel =
    inputSource === "gamepad" ? "A" : inputSource === "touch" ? "USE" : "E";
  $("pauseButton").textContent =
    inputSource === "gamepad"
      ? "MENU · PAUSE"
      : inputSource === "touch"
        ? "PAUSE"
        : "ESC · PAUSE";
  $("notice").textContent = (
    game.tensionHint ||
    game.message ||
    game.hazardHint ||
    ""
  ).replace(
    /\bE to\b/g,
    inputSource === "touch" ? "Tap USE to" : `${useLabel} to`,
  );
  $("notice").classList.toggle(
    "visual-replaced",
    !!visualSignal &&
      (!!game.tensionHint ||
        !game.message ||
        game.message === game.hazardHint ||
        /^(Bones crack|The chains ring|The loose stones|Follow the open passage|The last light dies|Something is waking)/.test(
          game.message,
        )),
  );
  const hunt = game.phase.includes("HUNT");
  $("phase").textContent = hunt
    ? game.hunterWarning
      ? game.additionalHunters.some(
          (h) => !["DORMANT", "BANISHED"].includes(h.state),
        )
        ? "TWO HUNTERS ROAM THE DARK"
        : "ANOTHER HUNTER IS COMING"
      : "THE HUNT"
    : game.phase === "RELIGHTING"
      ? "HOLD ON TO THE SPARK"
      : "";
  // The threat cue already names a plain Hunt; keep only distinct warnings.
  $("phase").hidden =
    !!visualSignal &&
    visualSignal.label.toUpperCase() === $("phase").textContent;
  document.body.classList.toggle("hunt", hunt);
  document.body.classList.toggle("lowfuel", pct < 0.1);
  // The art bible asks for a warning below 25% and urgency below 10%.
  document.body.classList.toggle("waning", pct >= 0.1 && pct < 0.25);
  // Room names surface briefly on entry, then sink back into the dark.
  const roomName =
    (game.currentRoom?.name ?? "THE WHISPER PASSAGE") +
    (game.descent > 1 ? ` · DESCENT ${roman(game.descent)}` : "");
  if (roomName !== shownRoom) {
    shownRoom = roomName;
    roomRevealUntil = game.elapsed + 5;
    $("roomName").textContent = roomName;
  }
  document.body.classList.toggle("room-reveal", game.elapsed < roomRevealUntil);
  // Controls and mode legend only during the opening of an expedition.
  document.body.classList.toggle("learning", game.elapsed < 25);
  // Actions carry their key as a wax seal; plain warnings stay plain text.
  const crouchLabel =
    inputSource === "gamepad" ? "B" : inputSource === "touch" ? "CROUCH" : "C";
  const nookNearby =
    hunting &&
    !game.hidden &&
    game.hidingSpots.some(
      (spot) =>
        Math.hypot(spot.x - game.player.x, spot.z - game.player.z) < 2.5,
    );
  const [promptKey, promptText] = game.interactionPrompt
    ? [game.activeInteraction ? "" : useLabel, game.interactionPrompt]
    : nookNearby
      ? game.tuckedIn
        ? [crouchLabel, "CROUCH TO HIDE"]
        : game.hidingSpot
          ? ["", "PRESS DEEPER INTO THE NOOK · INSIDE THE CHALK RING"]
          : ["", "A DARK NOOK BEHIND THE TOMB · HIDE THERE"]
      : game.fuel <= 0
        ? game.matches > 0
          ? [useLabel, "STRIKE A MATCH"]
          : ["", "NO MATCHES · FIND GOLDEN FIRE"]
        : ["", ""];
  $("prompt").textContent = promptText;
  if (promptKey) {
    const key = document.createElement("kbd");
    key.textContent = promptKey;
    $("prompt").prepend(key, " ");
  }
  $("prompt").classList.toggle("timed-prompt", !!game.activeInteraction);
  const pickup = game.nearbyItem;
  if (pickup && !game.activeInteraction && !game.nearShortcut) {
    const identity = relicIdentity(game.world.seed, pickup);
    const icon =
      pickup.kind === "artifact"
        ? relicGlyph(game.world.seed, pickup)
        : pickup.kind === "fuel"
          ? "oil"
          : "match";
    const label =
      pickup.kind === "artifact"
        ? identity.name
        : pickup.kind === "fuel"
          ? "TORCH OIL"
          : "DRY MATCH";
    $("prompt").innerHTML =
      `<span class="prompt-icon">${glyphSvg(icon)}</span><kbd>${useLabel}</kbd> ${label}${pickup.encounter === "reliquary" ? " · 3.5s" : ""}`;
  }
  $("bearing").textContent = new URLSearchParams(location.search).has("debug")
    ? `${fps.toFixed(0)} FPS · ${game.phase} · ${game.hunter.state} · ${view.renderer.info.render.calls} DRAWS`
    : game.nearShortcut
      ? game.shortcutUnlocked
        ? "LOUD SHORTCUT · OR TAKE THE QUIET RETURN"
        : "THE BELL SEAL OPENS AFTER ITS VOTIVE IS RECOVERED"
      : game.activeInteraction
        ? "THE SEAL ECHOES THROUGH THE CRYPT"
        : game.surface === "water"
          ? "WATER CARRIES SOUND · DRY EDGES ARE QUIETER"
          : "";
  $("scene").dataset.cameraYaw = cameraControls.pose.yaw.toFixed(3);
  $("scene").dataset.cameraPitch = cameraControls.pose.pitch.toFixed(3);
  $("scene").dataset.cameraDistance = cameraControls.pose.distance.toFixed(2);
  $("scene").dataset.playerX = game.player.x.toFixed(2);
  $("scene").dataset.playerZ = game.player.z.toFixed(2);
  const threat = audio.threatFootstep;
  // Heard footsteps darken the screen edge they come from; it shows nothing
  // the player could not already hear, so walls still hide silent threats.
  const presence = $("presence");
  if (threat && !game.completed && game.phase !== "DEAD") {
    const dx = threat.x - game.player.x,
      dz = threat.z - game.player.z,
      d = Math.max(1, Math.hypot(dx, dz));
    const side =
      (dx * Math.cos(cameraControls.pose.yaw) -
        dz * Math.sin(cameraControls.pose.yaw)) /
      d;
    const ahead =
      (-dx * Math.sin(cameraControls.pose.yaw) -
        dz * Math.cos(cameraControls.pose.yaw)) /
      d;
    presence.style.setProperty("--px", `${50 + side * 62}%`);
    presence.style.setProperty("--py", `${50 - ahead * 62}%`);
    presence.style.opacity = Math.min(1, Math.max(0.15, (20 - d) / 12)).toFixed(
      2,
    );
  } else presence.style.opacity = "0";
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
  const event = game.ambientEvent;
  if (
    settings.cues &&
    !cue &&
    event &&
    event.kind !== "silence" &&
    game.elapsed < event.until
  ) {
    const dx = event.x - game.player.x,
      dz = event.z - game.player.z;
    const pan =
      (dx * Math.cos(cameraControls.pose.yaw) -
        dz * Math.sin(cameraControls.pose.yaw)) /
      Math.max(1, Math.hypot(dx, dz));
    cue = `${event.kind === "stone" ? "Stone settling" : "A chain shifting"} ${pan < -0.3 ? "to your left" : pan > 0.3 ? "to your right" : "nearby"}`;
  }
  if (
    hunt &&
    [
      { ...game.hunter, readiness: game.hunterReadiness },
      ...game.additionalHunters,
    ].some(
      (hunter) =>
        hunter.state === "PURSUING" &&
        (hunter.readiness ?? 0) < 1 &&
        lineOfSight(game.world, game.player, hunter),
    )
  ) {
    $("phase").textContent = "IT HAS SEEN YOU · BREAK SIGHT";
    $("phase").hidden = false;
  }
  $("direction").textContent = cue || game.hunterWarning;
  if (game.phase === "DEAD" || game.completed) {
    $("prompt").textContent = "";
    $("survivalHint").textContent = "";
    $("direction").textContent = "";
  }
}
game.load();
rebuild();
menu();
// The Hallucinated Games studio intro, shared with the studio's other games,
// plays once per page load over the title while the crypt finishes loading.
if (!new URLSearchParams(location.search).has("debug")) {
  const intro = (
    window as {
      HallucinatedIntro?: {
        play(options: { skippable: boolean; sound: boolean }): Promise<unknown>;
      };
    }
  ).HallucinatedIntro;
  intro
    ?.play({ skippable: true, sound: false })
    .catch((error: unknown) =>
      console.warn("Studio intro unavailable; continuing to the crypt.", error),
    )
    .finally(() =>
      document.getElementById("hallucinated-studio-intro")?.remove(),
    );
}
requestAnimationFrame(frame);
(window as any).__lastLight = {
  get game() {
    return game;
  },
  get view() {
    return view;
  },
  get camera() {
    return cameraControls;
  },
  begin,
  resume,
};
