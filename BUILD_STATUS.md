# The Last Light — build status

Updated 2026-10-17. Version 0.1: playable Catacombs checkpoint for review. The full master specification is not complete.

## Implemented

- TypeScript, Three.js and Vite; browser-only static deployment; independent simulation, rendering, audio and UI modules.
- Fixed 60 Hz simulation with acceleration, sliding collision, sprint stamina, crouching, mouse sensitivity, follow camera and camera wall avoidance.
- Eleven connected chambers, seeded room variants and alternate route connections. Navigation and collision share the generated walkable grid.
- Ember / Steady / Blaze fuel rates of 0.35 / 1 / 3.5. Base capacity 720 Steady seconds, smooth light changes, low-fuel flicker/warnings, flame and ember geometry, pickups and cooldown-limited fuel-consuming burst.
- Extinguishing, eight-second grace, active Hunt, two-second match relight, death and sanctuary transitions. No Hunt death countdown.
- Hunter off-camera spawn candidates, wall-aware vision, navigation-distance hearing, remembered positions, neighborhood searches, continuous waypoint following and capture. Relighting and sanctuary fire banish it.
- One Stalker investigates noisy visible movement, recoils from bursts and can drain a weak flame at close range. This is a simpler first archetype; it is not the complete three-enemy expansion.
- Artifacts, fuel and matches; contextual collection; persistent per-expedition chalk; starting refuge and destination sanctuary; artifact banking and loss on death.
- Browser persistence including Hunt state, flame mode, banked relics and reservoir upgrades. Reservoir upgrades cap at five purchases.
- Main menu, field guide, settings, pause, journal, death and sanctuary result/upgrade screens.
- Original procedural masonry and floor textures, enclosed architecture, arches, pillars, crypts and archive shelves, cloaked Torchbearer, shadow Hunter, Stalker, fog and contrasting firelight.
- Synthesized torch crackle, surface footsteps, breathing, warnings, phase cues, positional Hunter footsteps, ambience and sanctuary tones. Optional directional visual threat cues.
- Instanced floors, ceilings and repeated masonry; limited shadow light; low quality setting; renderer/material/texture disposal between expeditions.

## Validation

- `npm test`: **43 passed, 0 failed**.
- Connectivity and deterministic generation checked across 100 seeds.
- Rules cover movement/collision, camera clipping, fuel rates and switching, burst cooldown, extinction/grace, navigable spawn, line of sight, hearing around separating walls, relighting, sanctuary protection, pickups, chalk, persistence, banking and death loss.
- A regression requires the Hunter to traverse several cells and actually catch an exposed stationary player. This catches waypoint oscillation that an escape-only test misses.
- A scenario physically walks an escape route after Hunter activation and verifies banking and banishment.
- The full route driver physically traverses the generated expedition, collects artifacts, forces extinction, observes the active Hunt and banks discoveries.
- `npm run build`: TypeScript passes and Vite emits deployable `dist/`; game JS about 50 kB and Three.js about 489 kB before compression.
- Production build served locally using `npm run preview` at http://127.0.0.1:4173/.
- Final corrected production scenario banked one relic. Purchasing a reservoir upgrade, reloading, continuing, and opening the journal confirmed a persistent capacity of 810 Steady seconds.
- Browser UI verification observed EXPLORING → HUNT_ACTIVE → SANCTUARY / BANISHED and an explicit scenario PASS. Menus, settings, graphics selection and pause were exercised; no runtime error logs were observed.
- Browser screenshot capture timed out even on a separate blank tab. Consequently no screenshot-based visual acceptance is claimed, and hardware frame-rate acceptance remains open. The in-app browser's frame reporting was low; test on normal hardware before treating performance as accepted.

## Reproduce the browser scenario

Open `http://127.0.0.1:4173/?debug&seed=104729`, then click **Run Expedition Check**. The driver supplies ordinary movement input, collects reachable artifacts, removes matches for this test, triggers extinction after leaving safety and runs the simulation at 8× speed. It does not teleport to complete the expedition. The result screen reports PASS only if an active Hunt was observed before sanctuary recovery.

Normal developer keys with `?debug`: H forces extinction, R refills fuel, T teleports to the destination. Starting refuge correctly prevents an active Hunt while the player remains in sanctuary. Leave the fire before manually testing H.

## Limitations and next priorities

1. **Playtest pacing and fuel pressure.** The direct automated route takes roughly one simulated minute; the intended 10–20 minute exploratory expedition is not validated. Tune layout, meaningful detours, supplies, Stalker encounters and sight lines after normal human playtests. Do not describe the session-length target as achieved.
2. **Visual/audio acceptance and performance.** Review the actual dungeon, dark adaptation, camera, Hunter silhouette and audio on a normal desktop browser; validate 60 FPS / graceful 30 FPS fallback. Procedural art is the current original asset set, not a claim of AAA asset quality.
3. **Interaction polish.** Crouch and wall occlusion provide stealth; dedicated hiding volumes, fuller animation blending and smoke are not yet implemented. The director currently provides paced atmospheric messages/audio rather than a full event-spawning system.
4. **Expansion.** Hollow, Moth, additional biomes, puzzle/hazard modules, greater graph variety, endless region streaming, deeper difficulty progression, most upgrades, compass, Echo Sense and recoverable death satchels remain future work.
5. **Developer tools.** Force Hunt, refill, teleport, seed selection, AI-state/FPS/draw diagnostics and route testing exist. Free camera, cones, graph overlays and full metrics tooling remain to be added.
6. **Release hosting.** Render static-site configuration exists. The GitHub repository is connected; no public deployment has been created. Local production output is available.

## Resume instructions

Run `npm ci`, `npm test`, `npm run build`, then `npm run dev`. Read README.md and this file. Preserve the shared grid/metre convention: World cell/start/exit coordinates are grid units (two metres each); player, enemy, item, chalk and navigation-path coordinates are metres. Keep gameplay perception independent of renderer quality. Review the two early checkpoints before expanding: torchlit third-person exploration, then a fair survivable Hunter encounter.

## V1 demo recording

A 70.875-second 720p/24 fps demo with original stereo game audio is saved at `docs/demos/the-last-light-v1.mp4`. See `docs/demos/README.md` for the timeline and reproducible capture steps. The scripted fixed-step recording shows the existing game systems and does not establish real-time performance acceptance.

## Camera and controls review — 2026-10-17

Root cause: mouse-look processing required pointer lock, while embedded-browser capture rejection was silently ignored. The in-app browser reproduced the rejection during this review.

Fixed:

- Either-button drag-to-look works without pointer lock. Optional Capture Mouse reports rejection and retains the fallback.
- All four arrow keys control yaw/pitch; the wheel adjusts follow distance between 1.6 and 6.5 metres. The camera uses a real orbital pitch with ground/ceiling limits and existing wall-ray avoidance.
- Keyboard movement remains relative to camera heading. Idle camera orbit leaves character orientation unchanged; moving/strafing faces the actual movement direction. Hunter spawn checks and positional sound use camera heading independently.
- Starting placement and old saves inside the starting brazier move clear of the fire. Movement cannot pass through sanctuary braziers.
- Viewport focus, drag cancellation, paused input, menu Escape handling, and held-key cleanup prevent input from leaking across menus. Resize redraws paused views.
- Visible controls and the field guide document drag, arrows, zoom, capture and pause.

Actual production-browser input checks after capture rejection:

- Drag changed yaw from -1.571 to -2.111 and altered pitch.
- W moved the player from (0.00, 2.40) to (1.97, 3.58) relative to the rotated view.
- Arrow Up adjusted vertical pitch to 0.063; wheel increased distance from 3.70 to 4.96 metres.
- Escape opened Pause. Earlier checks exercised left/right arrow yaw and zoom to its 6.5-metre limit.
- An actual screenshot is saved at `docs/camera-controls-review.png`. This supersedes the earlier screenshot-tool limitation for this control review; full art/performance acceptance remains open.

Validation: 30 tests pass, including rejected pointer lock followed by drag, captured relative mouse movement, both arrow axes, zoom/pitch limits, inactive-input isolation, blur/disposal cleanup, idle-body independence, camera-relative movement and safe initial placement. Production build passes. The original Hunt and physical escape regressions continue to pass. The existing v1 video documents the earlier checkpoint and predates this camera fix.


## Xbox and iPhone controls — 2026-10-17

- Standard Xbox gamepad movement, analog camera, zoom, gameplay actions, recentering, pause/journal and full menu navigation. Deadzones, button edges, disconnect cleanup and normalized mixed-device movement prevent drift or doubled speed.
- Independent touch joystick, view dragging, held sprint, crouch toggle, gameplay actions, flame modes and zoom. Camera dragging owns its pointer so another finger cannot interrupt it. Pausing or losing focus clears held touch input.
- Responsive portrait/landscape HUD and menus, safe areas, dynamic viewport resizing, wider portrait camera and low graphics default for touch devices. Device-specific prompts and optional touch toggle preserve desktop controls.
- Browser audio unlock has an explicit tap fallback for controller-only starts.

Validation: 39 tests pass and the production build passes. New tests cover gamepad movement/deadzones, one-shot actions, triggers, disconnects, menus, input normalization, three simultaneous pointers and touch cleanup. Actual production-browser UI checks at 393×852 and 852×393 exercised joystick movement, camera orbit, zoom, flame selection, chalk, crouch, journal, pause and settings return. All 12 landscape controls were in bounds, at least 44 pixels in each dimension and unobstructed at their centers; no horizontal document overflow was observed. Screenshots are in docs/iphone-portrait-controls.png and docs/iphone-landscape-controls.png.

Physical Xbox hardware, iPhone Safari multitouch, notched-screen behavior and mobile performance remain unverified. Browser-size checks and synthetic unit inputs do not establish hardware acceptance. README documents controls and hosted HTTPS / manual same-Wi-Fi testing.


## Sanctuary progression — 2026-10-17

Added Efficient Wick, Soft Boots and Quick Spark alongside the existing reservoir. Each has three ranks, costs two banked relics per rank and offers a bounded benefit (24% less fuel consumption, 36% quieter footsteps or 0.75 seconds faster relighting at maximum rank). Fuel bursts and interaction noise are unaffected. Central simulation purchasing enforces sanctuary access, currency and rank limits; unavailable choices are disabled in the result menu. Reservoir purchase also refills the expanded tank. Existing version-one saves default missing ranks to zero, clamp malformed ranks and retain upgrades through reset/death.

Validation: 43 tests pass; production build passes. Regressions cover purchase restrictions/caps, consumption in all flame modes, extinction and faster relighting, residual footstep noise, save migration and expedition persistence. Full intended expedition pacing and physical mobile/controller acceptance remain open.

Production-browser route reported PASS after extinction, active Hunt and navigated sanctuary recovery. A second run banked two relics; purchasing Efficient Wick deducted both, displayed rank 1/3 and disabled unaffordable choices. Screenshot: docs/sanctuary-upgrades.png.
