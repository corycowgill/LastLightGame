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

- `npm test`: **22 passed, 0 failed**.
- Connectivity and deterministic generation checked across 100 seeds.
- Rules cover movement/collision, camera clipping, fuel rates and switching, burst cooldown, extinction/grace, navigable spawn, line of sight, hearing around separating walls, relighting, sanctuary protection, pickups, chalk, persistence, banking and death loss.
- A regression requires the Hunter to traverse several cells and actually catch an exposed stationary player. This catches waypoint oscillation that an escape-only test misses.
- A scenario physically walks an escape route after Hunter activation and verifies banking and banishment.
- The full route driver physically traverses the generated expedition, collects artifacts, forces extinction, observes the active Hunt and banks discoveries.
- `npm run build`: TypeScript passes and Vite emits deployable `dist/`; game JS about 37 kB and Three.js about 489 kB before compression.
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
6. **Release hosting.** Render static-site configuration exists. No remote repository or public deployment was created; local Git and production output are available.

## Resume instructions

Run `npm ci`, `npm test`, `npm run build`, then `npm run dev`. Read README.md and this file. Preserve the shared grid/metre convention: World cell/start/exit coordinates are grid units (two metres each); player, enemy, item, chalk and navigation-path coordinates are metres. Keep gameplay perception independent of renderer quality. Review the two early checkpoints before expanding: torchlit third-person exploration, then a fair survivable Hunter encounter.
