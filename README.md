# The Last Light

A browser survival horror expedition built with TypeScript, Three.js, Vite, and a hybrid generated/procedural Web Audio soundscape. Runtime artwork uses original authored and procedural geometry. No backend or API keys.

## Run

Node.js 22+ recommended.

```sh

npm ci

npm run dev

npm test

npm run build

npm run preview

```

Open the URL printed by Vite. Click Begin Expedition. Hold either mouse button and drag over the game to look around, or use the arrow keys. Scroll to zoom. The optional Capture Mouse button enables free mouse look when supported; embedded browsers can always use dragging. Escape pauses. Keyboard/mouse, standard Xbox controllers, and iPhone touch controls are supported. WebGL2 is required. Audio begins after a click or tap; a Tap for sound button appears when browser audio remains suspended.

## Controls

WASD move relative to the view, drag mouse or arrow keys to look horizontally and vertically, wheel to zoom, Shift sprint, C/Ctrl crouch, E interact or relight, Q chalk, F flame burst, 1/2/3 torch modes, Tab journal, Escape pause. Settings include look sensitivity, volume, visual sound cues, graphics quality, and an optional touch-controls toggle.

### Xbox controller

Connect the controller, open the game, and press a controller button to activate it.

| Input | Action |

| --- | --- |

| Left stick / right stick | Move / orbit camera |

| RT or left-stick click | Sprint |

| B / hold LT | Toggle crouch / crouch |

| A / X / Y | Interact or relight / flame burst / chalk |

| LB / RB | Previous / next flame mode |

| D-pad up / down | Zoom in / out |

| Right-stick click | Recenter camera |

| View / Menu | Journal / pause |

Menus support stick or D-pad navigation, A to select, B to return, and left/right to adjust settings. Prompts switch with the active input device. Disconnecting a controller releases its movement.

### iPhone touch

Touch controls appear automatically on touch devices. Use the left joystick to move and drag the open game view to orbit the camera. RUN is held; CROUCH toggles. Action buttons provide interaction, burst, chalk and journal; the bottom buttons select flame modes and zoom. Movement, camera dragging and sprint can run simultaneously.

Portrait and landscape layouts include safe-area padding, compact HUD, scrollable menus, and larger touch targets. Portrait uses a wider camera field of view. Low graphics is the default on coarse-pointer devices. Preview the layout on desktop with `?touch`.

For an iPhone, open the deployed HTTPS site. The PC localhost address will not work on the phone. For same-Wi-Fi development only, manually run `npm run dev:lan`, then open the PC LAN address on port 5173; touch works there, while controller APIs may require HTTPS. No LAN server is started automatically.

Automated controller snapshots and independent touch pointers are tested; physical Xbox controller and iPhone Safari validation remains pending. Responsive browser screenshots: [portrait](docs/iphone-portrait-controls.png) and [landscape](docs/iphone-landscape-controls.png).

Reach the far golden sanctuary with artifacts to bank discoveries. Fuel depletion starts the Hunt; it does not kill you. Use a match to relight, break sight and quiet your footsteps, or reach sanctuary. Death loses carried artifacts. Progress saves to this browser and origin.

## Sanctuary equipment

Bank relics at the destination fire, then spend them before descending again. Reservoir ranks cost one relic and add 90 fuel seconds (five ranks). Efficient Wick, Soft Boots and Quick Spark each cost two relics per rank, up to three ranks: 8% less fuel burn, 12% less footstep noise, or 0.25 seconds faster relighting per rank. Bursts and noisy interactions retain their cost/noise. Upgrades persist through death, refresh and new expeditions. Unaffordable or mastered upgrades are disabled. The Sanctuary Compass is a single purchase for three relics. Its golden needle and directional text point toward the destination fire relative to your camera, including during a Hunt. This is a bearing, not a route through walls; use chalk and landmarks to find passages.

## Architecture

- `src/simulation.ts`: seeded walkable world, fixed-step gameplay, collision, pathfinding, perception, torch and Hunt state machines, expedition and save state. No rendering dependencies.

- `src/scene.ts`: original dungeon geometry, character and creature models, lighting, particles, camera collision, and Three.js lifecycle.

- `src/audio.ts`: synthesized atmospheric and gameplay audio.

- `src/controls.ts`: pointer-lock-independent drag look, optional mouse capture, arrow-key look, zoom and input cleanup.

- `src/platform-input.ts`: standard gamepad mapping, menu navigation, analog movement and independent touch pointers.

- `src/platform-input.test.ts`: controller edges, disconnects, menus and simultaneous movement/look/sprint regressions.

- `src/controls.test.ts`: camera input regressions, including rejected capture and paused input.

- `src/main.ts`: input, fixed-step accumulator, menus, HUD and integration.

- `src/simulation.test.ts`: deterministic rules and scenario regression tests.

The simulation advances at 60 Hz. World grid cells represent two metres. Gameplay light and perception use simulation values independently of renderer settings. Room generation and AI navigation share the same walkable graph.

## Deployment

`npm run build` creates `dist/`. Serve this directory from any static host. The included `render.yaml` configures a Render static site with `npm ci && npm run build`. The game does not require server routes. Optional Google Fonts have system font fallbacks.

## Developer mode

Append `?debug` to the URL. H forces extinction/Hunt, R refills fuel, T teleports to the destination sanctuary. Use `?debug&seed=104729` for a reproducible seed. The header shows frame rate, AI state and draw calls. The developer menu has an accelerated physical route check for extinction, Hunt activation, escape and artifact banking. Developer controls are for verification and do not represent normal expedition progression.

## Scope

This is the playable Catacombs checkpoint toward the complete vertical slice. The intended 10–20 minute pacing, visual acceptance and hardware performance still need review. Additional biomes, advanced progression branches, region streaming and a full developer visualization suite are future work. See BUILD_STATUS.md for verification and known limitations. Do not treat a successful build alone as playtest acceptance.

## Current-state demo

[Watch the v1 gameplay demo](docs/demos/README.md) — 71 seconds with original game audio, demonstrating torch modes, the Hunt, relighting, and sanctuary banking.

## Generated character assets

See [the Hugging Face / Blender asset pipeline](docs/AI_ASSET_PIPELINE.md) for the local hardware audit, selected mesh/rig/motion models, exact clip requirements and current encoder-access blocker. Downloaded AI weights remain ignored in `.asset-tools/`; the game now includes original Blender-authored skinned Torchbearer and Hunter characters based on the recovered design references. These are not neural model outputs.

## Recovered art direction

The art bible and concept board from **Create stylized game art design** are preserved in `docs/art-direction/`; character references are in `art-source/`. The current implementation follows the ochre hood, satchel, charcoal clothing, ragged Hunter silhouette, cold masonry and warm fire palette. It is an initial low-poly interpretation, not a claim of matching the concept image fidelity.

`tools/assets/build_characters.py` rebuilds both skinned GLBs with installed Blender. Torchbearer has 14 named authored clips; Hunter has five. Runtime blends locomotion/crouch, interaction, relight, burst, death and Hunter states, and attaches torch hardware/fire to a hand socket. Simulation retains ownership of movement and collision. `public/models/manifest.json` records triangle counts, hashes, axes, provenance and clip names. Neural reconstruction, polished motion retargeting and Stalker replacement remain future asset work.

## Generated soundtrack and effects

Nine creepy atmospheric clips are included. Listen at `/audio/listen.html`; see [audio provenance and reproduction](docs/AUDIO.md). Settings include an independent soundtrack level.
