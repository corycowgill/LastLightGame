# The Last Light — build status

## Visual gameplay UX — 2026-10-21

Relics now have seven authored emblems (bell, ember, tear, coin, candle, key and sealed votive), shared by depth-tested world markers, brief collection reveals, a carried-relic pouch and a journal gallery. Oil and matches have distinct pickup symbols and sound cues. Long discovery prose stays in the journal; gameplay reveals last four seconds instead of twelve.

Hazards pair an illustrated danger with a response symbol. Reliquary opening, relighting and warning cycles use progress rings. Repeated explanatory notices are visually suppressed when replaced by these cues, while accessible descriptions and important failure messages remain. Journal reference prose is collapsible, and tall panels scroll from a reachable heading.

Validation: 155 tests and production build pass. Targeted Chrome review exercised opening, collection and the gallery. Physical-phone/controller and subjective audio validation remain open. See [visual UX implementation](docs/VISUAL_GAMEPLAY_UX.md).

## Graphics surface and fire pass — 2026-10-20

Catalog masonry now reuses its embedded color maps for subtle bump relief, with improved oblique texture sampling. Chains/iron retain a controlled metallic response instead of being flattened into the same roughness as stone. Bone remains matte. Exposure and ambient fill are slightly lower to preserve warm fire against cool crypt shadows, while dark adaptation is unchanged.

The handheld torch now uses a camera-facing animated translucent flame with a warm core and wavering tip. Soft ember sprites replace square particles. Bounded player/Hunter contact shadows help ground silhouettes even when dynamic shadows are disabled. Original catalog GLBs remain the environment and character assets; these additions are material and effect work.

Validation: production build and 151 tests pass. Browser review of the seed-1 burial-web room showed no shader errors and approximately 57 FPS; this is an individual observation, not a benchmark across devices. Existing automatic graphics fallback and staggered shadow budgets remain in place. See [graphics implementation and limitations](docs/GRAPHICS_POLISH.md).

## Whispering votive and distractions — 2026-10-20

The sealed three-relic votive now carries a return-trip risk: every 18 seconds away from sanctuary it can cry out. A three-second text/audio warning gives time to crouch completely still and muffle it. The cry creates ordinary audible noise; it does not spawn enemies or reveal the player globally. Ordinary relics stay unchanged.

Three throwable stones per expedition add a limited escape tool: **T / Xbox D-pad Up / touch STONE**. Aim down an open passage; the impact draws unseen Hunters and Stalkers toward it. Direct perception of the player takes priority. Throws have a five-second cooldown and stop at walls. Xbox zoom is now D-pad Down to zoom out, LT + Down to zoom in. Close active Hunts gain restrained proximity heartbeat cues.

Validation: 151 tests, 100 seeded escape scenarios and production build pass. See [mechanics and limits](docs/TENSION_MECHANICS.md). Physical controller/iPhone, human difficulty and subjective headphone mixing remain open.

## Burial webs and unstable rubble — 2026-10-20

Two more environmental challenges now join bones, chains and vents. Burial webs slow upright movement; crouch through, skirt the patch, or hold Blaze within three metres for two uninterrupted seconds to burn a permanent opening. Cleared webs survive save/load. Unstable rubble causes a noisy stamina-costing stumble when sprinted across; walking and crouching avoid it. Both reuse original catalog GLBs.

Hazard selection now cycles across valid placements instead of correlating with room-design indices, ensuring all five archetypes can actually appear. Each eligible room still gets at most one small patch, with existing opening-room, sanctuary and reward clearance rules. Validation: 145 tests, 100 seeded escape scenarios and production build pass. Targeted browser review confirmed visible burial silk and clearing it with normal Blaze controls; ordinary-run pacing and physical-device validation remain open.

## Environmental dangers — 2026-10-20

Catacombs now contain optional loose-bone patches, hanging chains and pulsing cold-vapor vents. Crossing bones or chains upright makes a loud contact that nearby enemies can investigate; crouching or going around avoids it. Vents hiss for two seconds before a three-second discharge, slowing movement and draining stamina while inside. These create pursuit and route choices without instant death or hidden fuel penalties.

Placement is seeded, bounded to one small hazard per eligible room, excludes the opening rooms and sanctuaries, and keeps rewards clear. Catalog bone, chain and rubble GLBs provide physical cues; soft vapor particles show the cycle. Local warnings and positional sound explain counterplay. See [environment hazards](docs/ENVIRONMENT_HAZARDS.md) for balancing, implementation and validation.

## Expedition choices — 2026-10-20

The Bell Crypt now offers a sealed votive and a return decision: retrace the longer route quietly, or recover its votive and raise a noisy shortcut gate. Gates use actual collision, line of sight and cached navigation invalidation. An existing catalog bell and chained crypt-door GLBs mark the encounter. It appears only where an existing loop provides a useful shortcut without disconnecting any room; other seeds retain normal expeditions.

Drop a burning brand with **G / Xbox RB / touch BRAND**. It costs 15 base Steady seconds of fuel, burns for 18 seconds, and temporarily repels visible enemies within four metres. During a Hunt, one match can ignite it immediately while your handheld torch stays out. One brand can be active, with a 24-second cooldown. Its light can sustain a sealed-relic interaction, but it never permanently banishes Hunters.

See [mechanics, pipeline, save migration and validation](docs/EXPEDITION_CHOICES.md). Validation: 133 tests, 100 seeded escape scenarios and the production build pass. Browser review exercised fuel spending and opening the return gate through normal controls in a diagnostic fixture. Physical Xbox/iPhone and subjective headphone/pacing validation remain open.

## Critic playtest and response — 2026-10-20

A critic agent played two ordinary expeditions on build `60ef608` using normal movement, camera and interactions, without debug teleports or automated routes. It recovered two named relics, experienced capture, and successfully relit twice. Its strongest finding: navigation friction and camera occlusion were consuming fuel before players could make informed risk decisions. The named discoveries were a positive and were retained.

The implementation team aligned the entrance spawn/camera, staged an existing relic on the first-room approach, added local find/claim/bank guidance, recentered the camera near obstructions and faded only the avatar when the boom compresses. A bounded cold fill improves nearby stone during darkness. Death now identifies the actual Hunter/Stalker and gives counterplay advice, accurately stating that unbanked relics are lost. Emergency relighting returns Blaze to Steady without granting extra fuel; Ember remains Ember. A short cause-specific defeat cue now fades over 0.45 seconds instead of being muted immediately.

Read the [unaltered critic report](docs/CRITIC_PLAYTEST_2026-10-20.md) and [implementation response](docs/CRITIC_RESPONSE_2026-10-20.md). Validation: 114 tests and 100 diagnostic escape routes pass; production build passes. Integration browser play completed an ordinary first-relic return-and-bank loop. These are scoped improvements, not a claim that human pacing, subjective headphone quality or every device is validated.

## Team gameplay review — 2026-10-20

The style, gameplay/balance and audio review produced a coordinated discoveries-and-danger pass. Relics now have authored names/stories, stronger real-GLB silhouettes, colored soul motes, named prompts and a recovery reveal. The sealed reliquary displays a relic crest; your journal tracks recovered votives and banked stories.

A sustained Hunt now warns at 12 seconds and can add a **second Hunter at 22 seconds**. There are at most two, with independent perception/memory, fair off-camera navigable spawns, and shared fire/sanctuary protection. No additional fuel drain was added. Every Hunter and Stalker now makes footsteps from actual traveled distance, with directional stereo and wall muffling; water/gravel contacts, restrained reflections, quieter threat beds and flame sputtering improve sound readability.

See [team findings, design decisions, tests and limitations](docs/TEAM_GAMEPLAY_REVIEW.md). Validation: 105 tests, 100 seeded escape routes and production build pass. Full subjective difficulty, headphone and physical-device validation remain open.

## Rendering stability pass — 2026-10-20

Point-light shadows now refresh on a staggered budget: at most one six-face map per rendered frame, torch at up to 20 Hz and nearby sanctuary maps at up to 4 Hz. Cached maps continue shading between updates; light intensity and flame animation still update every frame. Shadow-caster counts remain stable between room transitions. This reduces repeated GPU work without changing fuel, AI perception, navigation or darkness adaptation.

Graphics settings now include **Auto (recommended)**. New desktop settings default to Auto; existing explicit High/Low selections are preserved. After a two-second warmup, sustained frame rates below 42 FPS reduce the pixel ratio, then disable shadow maps if pressure persists. The reduced tier stays for the expedition to avoid oscillation. High keeps shadows and Low remains the phone default. Very long suspension gaps do not affect adaptation.

Browser review of seed 104729's ossuary observed approximately 56–58 FPS and a recent frame-time p95 of 18.2–18.3 ms in High/Auto at tier 0. Arrow-key camera input changed yaw correctly. These are individual observations, not a controlled speedup claim or a guarantee for all rooms/devices. Full-device iPhone/Xbox and long-session performance remain open. The prior poor browser samples below are historical observations.

Validation: 91 automated tests, including sustained slow/severe frames, suspension/stall tolerance, quality stability and shadow refresh fairness; 20/20 seeded escape scenarios. Production build passes. Rendering diagnostics on the scene element include `graphicsMode`, `renderTier`, `pixelRatio`, `shadowRefresh`, `triangles` and averaged `renderSubmitMs` (CPU submission time, not GPU timing), alongside frame p95/worst metrics.

## Expedition polish — 2026-10-19

The Catacombs now use six authored floor plans: narrow burial recesses, low whisper passages, a tall ossuary, flooded halls with dry edges, collapsed chambers and golden refuges. Seeded graph connections remain deterministic. Two-metre corridors, varied ceilings and fitted GLB doorways create a stronger rhythm between confinement and open chambers. Furniture, pillars, decals, camera blockers and navigation use the same floor data.

Three optional decisions change the route: open a noisy reliquary for three relics (3.5 seconds stationary), detour for an oil cache worth 50 base Steady seconds, or cross noisy water at reduced speed instead of following its dry edges. Loot can be banked by turning back to the starting fire. Banked journal discoveries survive later expeditions and reloads. Fuel drain has not been increased in this pass.

The Hunter has a directional sight cone, close awareness and a short visible pursuit reaction. Spawn selection keeps it behind the destination escape route. It crawls through low passages and listens while searching, using two additional clips from the preserved Mesh2Motion export. Stalker hearing respects crouching and quieter boots; it guards the reliquary instead of tracking a silent player through walls. Stone movement, chains, falling dust and occasional silence replace timed ambient text. These events never alter resources secretly.

Validation: 88 automated tests, 100/100 seeded extinction/Hunt/sanctuary escape scenarios, and a production build. Browser checks exercised the actual Hunt-to-sanctuary loop and the three-relic interaction. A landscape phone-sized viewport showed the touch HUD and narrow passage framing. These checks do not establish ten-minute human pacing or physical iPhone/Xbox compatibility. Automated Chrome review showed poor frame cadence (roughly 1–12 FPS); its cause is unresolved, so smooth performance is not certified.

Reproduce Hunter clip extensions with `python tools/assets/extend_hunter_motions.py`, then `npx tsx tools/assets/ground-hunter-clips.ts`. This preserves the existing neural mesh and fitted skin; it does not generate a new creature. The script records clip provenance in the catalog manifest. Player ivory cloth now retains more surface variation and a worn lower hem. Individual player fingers and terrain-aware foot placement remain limitations.

For visual QA only, use `?debug&seed=104729&room=tunnels` (also burial, ossuary, flooded, collapse, refuge) or `?debug&seed=104729&encounter=reliquary` / `oil_cache`. Add `&touch` for the touch HUD. Review shortcuts clear enemies; ordinary expeditions do not.

Older sections below are historical checkpoints; their counts and prior layouts are superseded by this update.

## Current player rebuild — 2026-10-19

- New image-to-3D Torchbearer with separated sleeves and short cowl; new separate unlit torch GLB. Previous player mesh and skin are replaced.
- Fresh 52-joint bind, anatomical garment weights and nine HF HY-Motion outputs: idle, walk, sprint, crouch idle/walk, interaction, relight, burst and death. Right-arm carry IK and wrist stabilization keep fire clear of the hood. Five gameplay names alias source clips rather than claiming additional generations.
- Full animated hand rotation/position attachment, grip and flame tip sockets; flame is a runtime effect. Player GLB is approximately 2.94 MiB versus the previous 5.59 MiB.
- 78 automated tests pass, including twelve deformation phases for all nine motions, 24 attachment phases per carry motion, loop seams, foot bounds, source hashes, AI and expedition checks. Production build passes; Three.js chunk warning remains.
- Reproduction, provenance and limitations: [rebuild guide](docs/torchbearer-rebuild/README.md). Individual gloved fingers remain wrist-weighted; final visual acceptance and physical-device validation remain open.

The sections below retain earlier milestone history; older player rig descriptions are superseded by this rebuild.

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

- `npm test`: **46 passed, 0 failed**.

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

## Sanctuary Compass — 2026-10-17

The navigation upgrade costs three banked relics, is limited to one purchase and persists through existing save migration and new expeditions. A compact noninteractive HUD needle and ahead/left/right/behind text use camera-relative bearing to the destination sanctuary. This remains usable with an extinguished torch, does not reveal a map or enemies and does not claim a straight path through walls. Portrait/landscape CSS keeps it clear of touch actions.

Validation: 44 tests pass and production build passes. Added locked/purchased/capped compass checks, camera-relative angle and normalization checks, and persistent ownership across resets. Existing save migration tests now cover compass ownership. Hardware mobile performance and human navigation playtests remain open.

Browser validation: three automated physical expeditions banked three relics and each reported Hunt/escape PASS. Buying the compass deducted three relics and marked it mastered. Descending again retained ownership; camera rotation changed its text from right to left. Screenshot: docs/sanctuary-compass.png. Also moved the HUD clear of touch buttons when touch controls are enabled on a wide desktop viewport. Normalized legacy mixed document line endings.


## Hugging Face character asset pipeline - 2026-10-17

Used the installed authenticated `hf` CLI to find official TripoSR (local mesh baseline), UniRig (automatic skeleton/skinning) and NVIDIA Kimodo-SOMA-RP-v1.2 (motion generation). Audited RTX 4060 8 GB, 16 GB RAM, CUDA PyTorch and installed Blender. Downloaded TripoSR config and its 1.7 GB checkpoint; downloaded NVIDIA configuration/license/stats and the complete 1,133,177,724-byte checkpoint. Hugging Face checksum verification passed for the downloaded TripoSR and Kimodo files. Sources are in ignored .asset-tools, with source/model revisions recorded in docs/AI_ASSET_PIPELINE.md and the repeatable download script. No weights are committed to Git.

Added character-specific prompts for nine Torchbearer, five Hunter and three Stalker clips. Added a structural GLB release gate and three passing Python tests for rig/clip presence, embedded resources, bone limits and truncated files. This does not establish valid deformation, animation quality or full glTF conformance. Runtime/gameplay code is unchanged.

Blockers: current HF account receives HTTP 403 for the required gated Llama text encoder. Its access and memory/offload plan must be resolved before claiming working Kimodo inference. Isolated TripoSR/UniRig/Kimodo environments and first original reference/mesh generation still remain. Generated rigs require SOMA retargeting and Blender cleanup. No generated GLBs or AI animation clips have been accepted or integrated yet. No paid hardware was launched.


## Recovered design art and playable character build - 2026-10-17

Recovered the art bible, concept board, Torchbearer and Hunter A-pose references from the session "Create stylized game art design". Preserved the selected references in docs/art-direction and art-source. Existing external library prop meshes remain drafts; none was silently promoted to approved content or overwritten.

Built original low-poly Blender interpretations rather than neural reconstructions: ochre hood/mantle, charcoal clothing, wrapped boots, belt, satchel and flask for the Torchbearer; elongated arms, dark cloth, pale eyes and torn lower silhouette for the Hunter. Shipped GLBs have 16-joint skins: Torchbearer 2,740 triangles / 246 KB / 14 named clips; Hunter 2,332 triangles / 170 KB / five named clips. The generator is editable source, and public/models/manifest.json records hashes, axes and provenance. These are an initial stylized iteration, not concept-image fidelity or final motion polish.

Integrated GLTFLoader and AnimationMixer, crossfaded locomotion/crouch, short interaction/chalk/refill gestures, relighting, flame burst, death and Hunter search/pursuit/capture/banishment. Torch basket/fire/particles follow the right-hand socket. A short render-only ending window allows death/banishment to finish without advancing simulation. Late GLB loads are discarded and resources disposed when expeditions change; fallback characters remain until the asset loads. Replaced flat wall bands with instanced beveled staggered masonry, beveled slabs and segmented arch stones using the supplied palette; gameplay navigation and collision remain simulation-owned.

Validation: 46 game tests pass. New tests load the actual GLBs with Three.js, verify normalized skin weights, skeletons, clip presence and animated socket displacement. Both structural GLB gates pass. Production build passes. Browser play reviewed the loaded explorer and camera movement, corrected the hood back closure and crouch translation, and reported PASS for extinction, active Hunt, navigated escape and sanctuary banking with no captured console warnings/errors. Physical iPhone/controller performance and broader visual/motion acceptance remain open. Stalker replacement and neural asset production are still outstanding. The formerly gated encoder metadata is now accessible after the user's permission update; inference is not yet validated.

Browser touch CROUCH selected the actual crouch_idle mixer clip; the rigged load flag was present. The gameplay capture is docs/art-direction/gameplay-checkpoint.png. The recovered art library already has a validated serial local TRELLIS workflow; prefer it for future neural reconstruction rather than duplicating the model environment. Its source assets and queue were left unchanged.

## HF audio pass — 2026-10-17

- Generated three soundtrack stems with ACE-Step v1 3.5B and six effects with MOSS-SoundEffect v2 through official Hugging Face demos. About 2.13 MB bundled MP3; no runtime service needed.
- State-based music crossfades, quieter Hunt mix, torch/room loops, event effects, independent music volume, and procedural fallback.
- Prompts, seeds, hashes and mastering scripts preserved. Listening gallery: `/audio/listen.html`. Technical mastering is complete; artistic listening review and physical device balancing remain pending.
- Validation: 47 TypeScript tests and five Python asset tests pass; production build passes.

Browser verification: all nine audio buffers decoded; listening-page playback advanced without media errors; automated expedition passed extinction, active Hunt, navigated escape and sanctuary recovery. No browser console warnings/errors observed in that run.

## Neural catalog integration — 2026-10-17

- Reconstructed all 21 original individual character/prop references with the existing serial TRELLIS pipeline; reused the earlier crate/barrel pilots. Added neural catalog wall/arch modules. Runtime has 24 GLB roles from 23 accepted reconstructions, including an explicitly documented neural masonry derivative for paving/ceilings.
- Replaced active character meshes, torch, pickups, sanctuary and room dressing, plus visible wall/floor/ceiling/arch shell. Generated meshes are used rather than newly authored/procedural mesh replacements. Layout generation, collision and fire effects remain simulation/rendering systems.
- Automatic character skinning retains existing authored motion clips with carrying-pose offsets; no NVIDIA-generated animation claim. Hollow/Moth are unrigged expansion previews only. Character contacts and deformation still need art polish.
- Shared loader, region-instanced masonry, embedded 512px textures, exact prop scale/orientation correction, material tuning and texture disposal. Camera/nav rules retained. Low wall LOD was rejected because it introduced holes. Separate floor reconstruction was rejected as fragmented; a second attempt returned a terminal provider error. Raw failures are preserved, not retried or disguised.
- Actual browser viewer decoded all 24 GLBs without observed warnings/errors. Final seed 104729 expedition check passed extinction, active Hunt, navigated escape and sanctuary. Starting view observed about 60 FPS / 138 draws on this desktop, not a sustained performance guarantee. No physical iPhone/Xbox test.
- 48 TypeScript tests, eight Python asset tests and production build pass; shared asset-pipeline suite has 18 passing tests. Screenshots and exact provenance are in docs/catalog-assets. No library asset was falsely marked production-approved; no GPU job remains active/uncertain.
- Review `/asset-review.html`; see docs/CATALOG_ASSETS.md for reproduction and remaining work. Most of the 221 catalog definitions are still planned, not completed art.

## Resumed ComfyUI / landmark work — 2026-10-17

- Generated eight ComfyUI references and eight TRELLIS.2 landmark meshes through the serial shared-library worker. Finished and imported all eight with exact provenance. Runtime set now has 32 GLB roles from 31 neural reconstructions.
- Added statues, cracked relief pillars, sun doors, bell, tomb, dais/pedestal and recessed sanctuary arches to room dressing. Clear central routes and simulation navigation are retained. Closed tomb is decorative, not a new hiding mechanic.
- All eight new GLBs decoded in the actual production browser viewer without observed console warnings/errors. Seed 104729 browser scenario passed extinction, active Hunt, navigated escape and sanctuary in 0:59; recovery view 60 FPS / 56 draws on this desktop.
- 48 TypeScript tests, eight Python asset tests and production build pass. Existing large Three.js chunk warning remains.
- NVIDIA hosted Kimodo v1 generated-session UI returned, but BVH export stalled and session expired. No motion file verified or promoted; authored runtime clips remain. Next animation work: obtain a verified motion artifact, retarget to the existing skeleton, then review feet, torch contacts and cloak deformation before replacement.

## Creepy dungeon dressing — 2026-10-17

- Reviewed graphics catalog/art bible. Generated and integrated catalog skeletal torso remains, crypt skull and rusty chain via serial ComfyUI references / TRELLIS. Skeleton uses 12k triangles to preserve thin ribs; skull and chain about 2.5k each. Two lit candle references were rejected and omitted.
- Added generated transparent dusty web texture, overhead web placements, damp/grime material overlays, cooler varied masonry, and seeded clustered remains outside central walking lanes. Sanctuary safety and AI/nav rules unchanged.
- Added deterministic placement/clearance regression check and repeatable debug art-review position. Fixed finishing helper to select mesh-stage manifests only.
- See docs/DUNGEON_ATMOSPHERE.md for prompt, texture path, review procedure and limitations.
- Verified all three new GLBs in the browser viewer; in-game scene loaded 27 shared templates with no observed warnings/errors. Screenshot: docs/catalog-assets/creepy-dungeon-gameplay.png. Browser Hunt scenario passed extinction, active Hunt, navigated escape and sanctuary in 0:59. Art-review view observed 60 FPS / 115 draws on this desktop.
- 49 TypeScript tests, eight Python asset tests and production build pass. Runtime now includes 35 GLB roles from 34 neural reconstructions plus the generated web texture. Visual drafts remain subject to art refinement; physical iPhone/Xbox testing remains pending.

## GLB-only dressing correction — 2026-10-17

- Replaced runtime web planes with genuine TRELLIS-reconstructed web GLB geometry (24k triangles, visible depth/open gaps). Removed procedural CanvasTexture damp/grime overlays and unused runtime web PNG. Every dungeon-dressing placement now uses a neural catalog GLB.
- Higher-detail source-preserving candidates: skeletal remains 24k triangles, skull 12k, chain 15,998; web 24k. All four use embedded textures up to 1024px. Import tooling records actual texture settings. Original low-detail candidates remain preserved in library history.
- Added a regression check that every dressing ID resolves to a detailed neural GLB and the web contains geometry in all three dimensions. 50 TypeScript tests, eight Python asset tests and production build pass.
- Browser Hunt scenario passed extinction, active Hunt, navigated escape and sanctuary in 0:59. Art view observed 60 FPS / 89 draws on this desktop. Runtime set: 36 GLB roles from 35 neural reconstructions. These remain reviewed integration drafts, not certified final production art.

## Torchbearer animation correction — 2026-10-17

- Fixed lower-leg vertices receiving arm weights and narrowed mantle color pinning to avoid flattened sleeves. Rebound the original neural mesh; no replacement character geometry.
- Baked new fitted player clips with foot/arm targets, forward knees, flat planted feet, stable torch carry, controlled bob and separate gait/interaction timing. Hunter/Stalker unchanged. These are authored motions, not NVIDIA-generated output.
- Smoothed movement speed to avoid idle/walk flicker above the fixed simulation rate; speed-driven playback and phase-preserving gait transitions.
- Added anatomy-weight, sampled foot-height and torch-hand-stability checks. See docs/CHARACTER_ANIMATION.md for reproduction, inspection and limits.
- Final validation: 50 TypeScript tests and eight Python asset tests pass, including loop seam checks; production build passes. Browser seed 104729 again passed extinction, active Hunt, navigated escape and sanctuary in 0:59. Idle/walk/sprint/crouch were visually reviewed in Three.js; review montage in docs/catalog-assets/character-animation-review.jpg.

## Denser catacomb layout — 2026-10-17

- Added generated burial-niche, funerary urn and carved sarcophagus-lid GLBs. Three-tier burial rows with occupied/empty shelves, skull groups, urn clusters, slabs and rubble replace sparse isolated perimeter dressing.
- Added generated soot/mineral/crack/dirt decal atlas, region-instanced for room and passage wear. User explicitly authorized decals; no procedural stain textures were added. GLB web art retained.
- Burial furniture now blocks simulation/AI navigation and camera rays. Repositioned decorative coffins and archive doors away from route mouths. QA driver uses the shared obstacle-aware pathfinder.
- 51 TypeScript tests and production build pass. Browser seed 104729 passed extinction, active Hunt, navigated escape and sanctuary in 1:00. Art view observed about 60 FPS / 174 draws on this desktop. See docs/CRYPT_DENSITY.md for prompts, limitations and reproduction.
- Eight Python asset tests pass. Final atlas-loading review showed no new browser warnings/errors. Screenshot: docs/catalog-assets/dense-crypt-gameplay.png. Runtime set now has 39 GLB roles from 38 neural reconstructions plus generated decals; shared catalog has 223 definitions, most still planned.

## Hunter retreat / depth balance — 2026-10-18

- Hunter flees visible torch/sanctuary light using valid retreat paths, with 2.8 seconds of recoil/escape before post-relight banishment. Cannot capture while fleeing or retreat through walls. Spawn candidates exclude blocked burial furniture.
- Rebuilt authored Hunter search/pursue/flee/capture/banish animations inside its original neural GLB; movement-facing turns and restrained playback replace player-facing swivel and excess bobbing.
- Deeper chambers raise fuel burn up to 30%, Hunter sight/memory/chase speed, and Stalker pressure. Player sprint remains faster than chase. HUD/guide/journal communicate fuel pressure and counterplay.
- 55 TypeScript tests, eight Python asset tests and production build pass. Actual browser retreat check visibly reached FLEEING then BANISHED. See docs/HUNTER_BALANCE.md for exact values, reproduction and limits.
- Browser seed 104729 full expedition check passed extinction, active Hunt, navigated escape and sanctuary in 1:00 with the new difficulty curve. No warnings/errors observed in retreat test. Screenshots: docs/catalog-assets/hunter-retreat-gameplay.png and hunter-flee-review.png.

## Stealth and escape balance — 2026-10-18

- Sprint recovery waits 0.65 seconds after exertion, then restores 20% stamina per second; sprint drain remains 13% per second. Initial harsher settings failed the no-match escape and were rejected.
- Relighting limits movement to 35% of walking speed and disables sprint for its existing two-second interaction. Matches and reserve fuel remain unchanged.
- Crouching reduces Hunter visual range to 55%; close detection, noise investigation, and last-known-position memory remain active. This is stealth, not invisibility.
- Flame Burst requires line of sight to repel a creature. Stone walls now block the effect. Reset clears exertion and transient noise.
- Field guide describes the counterplay. Four new regressions cover stamina recovery, exposed relighting, crouched detection and burst occlusion/cooldown. All 59 TypeScript tests and production build pass, including the existing no-match navigated escape.
- Current work does not replace character rigging; Mesh2Motion remains pending the browser file-upload setting described in docs/MESH2MOTION_STATUS.md.
- Production browser seed 104729 completed extinction, active Hunt, no-match navigated escape and sanctuary recovery in 1:00. No warning/error logs observed. Screenshot: docs/balance-escape-v2.png. This scripted check does not replace human difficulty playtesting or physical controller/iPhone testing.

## Runtime animation continuity — 2026-10-18

- Character facing now follows the shortest angular arc with frame-rate-independent smoothing instead of instantly snapping on direction changes.
- Locomotion uses simulation velocity rather than render-frame displacement, avoiding fixed-step aliasing and false sprinting after a teleport. Separate gait enter/exit thresholds suppress idle/walk and walk/sprint flicker.
- Interrupted transitions fade out all other running clips from their actual weight. Extinguish/fear/quick-turn use one-shot playback rather than looping. These changes improve playback of the existing authored clips; they do not claim a new rig or new motion source.
- Mesh2Motion upload retried in Chrome; chooser opened but file assignment explicitly failed because the ChatGPT extension lacks Allow access to file URLs. No Mesh2Motion artifact was exported or promoted. Original prepared GLBs remain ready.
- 61 TypeScript tests and production build pass. Documentation now covers prompts, generation pipelines, reproduction boundaries and rejected experiments. Title background and earlier balance pass included in this release.
- Post-build production browser check also passed extinction, active Hunt, navigated escape and sanctuary in 1:00 after these animation changes; no warning/error logs observed. Evidence: docs/animation-release-check.png. New rig quality remains unverified because Mesh2Motion export is blocked.

## Mesh2Motion Torchbearer — 2026-10-18

- User enabled Chrome file access; original generated Torchbearer successfully uploaded, fitted, bound and exported through Mesh2Motion. First fit rejected after visual review; second export preserves fitted pelvis/spine/neck/head/hips and mirrored A-pose arms.
- Replaced player skeleton, skin weights and base motion with actual site output. Preserved original bundled GLB and hash/settings. Added reproducible bone/clip aliases, root/facing/ground corrections, loop closure and site-derived torch arm carry. No new procedural mesh or NVIDIA motion claim.
- 61 TypeScript tests, eight Python asset tests and production build pass. Walk/crouch reviewed in Three.js. Motion remains a draft: generated cloak/hands and some sliding/intersection need further polish. Hunter/Stalker re-rigging remains outstanding.
- Added source-hash/site-skin/clip-provenance/in-place-root regression: 62 TypeScript tests now pass. Production browser seed 104729 passed extinction, active Hunt, no-match navigated escape and sanctuary in 1:00; no warnings/errors observed. Screenshot: docs/mesh2motion/expedition-check.png.

## Torchbearer weight discontinuities — 2026-10-18

- User review correctly identified remaining bad rigging. Structural weights/socket/bounds checks had missed sharp neighboring weight changes and severe shoulder/waist mesh stretching.
- Added reproducible adjacency smoothing over welded seam vertices, normalized four-bone influences and lower-leg exclusions. Original neural geometry, Mesh2Motion skeleton and motion retained; raw site export unchanged. Re-grounded death after correction.
- Sampled >2.5x edge stretches decreased from 20,755 to 230 across idle/walk/sprint/crouch-walk (about 98.9%); peak decreased from ~18x to <4.25x. New deformation regression rejects the prior output. Remaining localized distortion/source holes are documented rather than claimed fixed.
- Viewer review covered walk, crouch and sprint; screenshot docs/mesh2motion/skin-repair-walk.png. Updated the reproduction pipeline and provenance.
- Final validation: 63 TypeScript tests, eight Python tests and production build pass. Browser seed 104729 completed extinction, active Hunt, no-match escape and sanctuary in 1:00 without observed warning/error logs; docs/mesh2motion/skin-repair-expedition.png.

## 2026-10-18 — candidate rigs published for user validation

- Added `/asset-review.html?rigs`: raw Mesh2Motion Torchbearer (66 joints, 59 clips) and Hunter (66 joints, 44 clips), orbit controls and complete animation selection.
- Preserved multi-angle screenshots, immutable raw exports and hash/bind-position audit under `docs/mesh2motion/multiview/`.
- Gameplay assets unchanged. Candidate symmetry, deformation and ground contact review still pending; Stalker export and Hollow fitting unfinished due to browser detachment.
- Production build and all 63 tests passed. Existing Three.js bundle size warning remains.

## 2026-10-18 — gameplay integration of multi-view rigs

- Replaced active Torchbearer and Hunter GLBs and catalog aliases with 66-joint Mesh2Motion All Fingers versions. Full original animation libraries retained separately; gameplay maps 14 player and six Hunter clips.
- Fixed finger influence leaking up sleeves and discontinuities introduced by final four-weight truncation. Added hand-local taper and projected sparse diffusion; existing skin-deformation thresholds unchanged.
- Kept in-place root motion, torch hand socket, stable carry pose, facing conversion and player death grounding.
- Stalker and Hollow are not part of this replacement; their unfinished website sessions still need recovery.
- Validation: all 63 tests and production build passed; browser expedition driver reported PASS for extinction, active Hunt, navigated escape and sanctuary; separate Hunter retreat recovered to EXPLORING/BANISHED. Runtime URLs versioned to avoid stale cached GLBs.

## 2026-10-18 — denser crypt dressing and firelight

- Added nearer side-aisle funerary clusters using existing catalog GLBs: skulls, bone piles, broken urns, memorial stones, hanging chains, tomb lids and raised webs. Floor stain/grit decals tie the offerings to the stone. Central lanes and sanctuary safety remain clear.
- Repeated dressing is instanced in room-sized batches with source geometry/materials preserved, rather than creating another draw call for every prop.
- Torch shadows use a 1024 map, tighter near plane and reduced bias/normal bias. Nearby sanctuary fires now cast 512 shadows; distant fires stop rendering shadow maps. Low quality still disables shadow rendering.
- Reduced warm-mode ambient fill, smoothed torch mode range changes, added subtle flame-tip movement/color variation and independent sanctuary flicker. Hunt dark adaptation remains unchanged.
- Torch housing and solid-backed reconstructed webs no longer project oversized opaque shadows.
- Validation: production build and all 63 tests pass; browser driver completed extinction, active Hunt, escape and sanctuary with the new dressing and lighting. Observed 60 FPS at the completed sanctuary on the local desktop browser; hardware and room views will vary.

## 2026-10-18 — interior catacomb pillars

- Added four 3.85m-high catalog GLB pillars inside every chamber (44 total), arranged along the side aisles with clear central crossings and doorway approaches. Regional instancing shares the existing pillar geometry and materials.
- One shared obstacle layout drives player/Hunter walkability, line of sight, and camera avoidance. Pillars provide real cover rather than decoration that actors can pass through.
- Layout regression verifies all pillars block traversal/sight, paths can route around them, and the full sanctuary route remains connected.
- Validation: all 63 tests and production build pass. Browser expedition check passed extinction, Hunt, escape and sanctuary on regression seed 104729. An initial unseeded scripted run was caught; the driver is not a guarantee of survival on every encounter layout.

## 2026-10-18 — fuel pressure rebalance

- Base full torch: Steady 120s (was 720s), Ember ~218s, Blaze ~34s; depth still increases burn by up to 30%. Ember now burns at 0.55x Steady rather than 0.35x.
- Oil adds 30 base Steady seconds; a match restores 20. New expeditions start with two matches. Burst costs 90 fuel units (~15 Steady seconds); reservoir upgrades add ~15 base seconds. Wick/reservoir progression and existing saves are preserved.
- HUD displays approximate remaining time at the current mode, depth and efficiency. Journal, upgrade label and field guide explain the new units. Warning audio begins below 20% and accelerates toward extinction.
- All 64 tests and production build pass. New regression reaches HUNT_ACTIVE through natural depletion, then recovers with oil and verifies the short refill window. Browser Blaze run naturally reached HUNT_ACTIVE and subsequently caught an exposed stationary player.
- Browser match recovery check also returned to EXPLORING/BANISHED with a short visible countdown remaining.

## 2026-10-18 — glowing Hunter eyes

- Added red emissive-style eye cores with small additive halos to the loaded Hunter's head bone, using source mesh positions transformed by its actual inverse bind matrix. Also changed fallback eyes from teal to red.
- Glow is depth-tested and casts no gameplay light: it cannot reveal the Hunter through walls or affect perception. Normal Hunter visibility/banishment hides the eyes with the actor. Shared helper also exposes the effect in catalog asset review.
- Visual review confirmed placement during the search clip. Production build and all 64 tests pass.

## 2026-10-18 — crypt horror composition

- Added three seeded burial scenes: disturbed sarcophagi with spilled remains and displaced lids; ordered skull memorials; chained recesses veiled in torn webs. Reuses original catalog GLBs and regional instancing.
- Filled multiple real loculus tiers with irregular rows of skulls, leaving empty bays. Added damp wall runs, patches and floor scuffs at grave entrances using the existing decal atlas.
- New large sarcophagi share physical/navigation/camera blockers through `cryptStory` and `environmentBlocks`. Central crossings remain clear; sanctuaries receive no new human remains.
- Quiet, widely spaced panned stone/metal resonances add unease during exploration. They stop near sanctuary fire and during the Hunt so they do not obscure actual threats. No resource manipulation, fake enemy spawns or jump-scare stingers.
- Production build and all 64 tests pass, including connectivity and the full fixed-seed simulation escape driver.
- Browser validation: regression seed 104729 passed extinction, active Hunt, physical escape and sanctuary. Loaded art-review room ran at 60 FPS / ~170 draws on the local desktop browser. Also fixed fuel countdown overflow in the touch HUD.

## 2026-10-18 — frame pacing / system performance

- Added static spatial camera broad phase, bounded per-world navigation cache, 10 Hz HUD and change-only inventory updates, two-slot catalog decode queue and static-transform freezing.
- Added explicit expedition loading / asynchronous shader warm-up before movement/fuel starts; idle autosaves; stable shadow shader variants and explicit shadow target disposal.
- New worst-frame/p95/long-frame telemetry distinguishes gameplay from preparation. Local dense crypt and accelerated Hunt/escape validation held 60 FPS, p95 16.8ms; sampled post-warm-up gameplay worst ~33.4ms. Preparation still takes time.
- Focused camera/path benchmarks improved ~22x / ~45x; these are CPU operation measurements, not whole-game FPS claims. See docs/PERFORMANCE.md and tools/performance-benchmark.ts.
- Production build and all 67 tests pass. Browser fixed-seed extinction/Hunt/escape/sanctuary check passes with all 33 catalog types loaded. Physical-device profiling remains outstanding.

## 2026-10-19 — solid GLB furniture and arch supports

Large props now share placement data between rendering, player collision, Hunter navigation and camera avoidance. Rotated bounds are generated from the shipped GLBs: crates, barrels, coffins, tombs, doors, statues, bells, urns and pillars block movement. Arches use separate posts and overhead blocks so their openings remain traversable. Small flat debris remains passable. A landmark statue was moved out of a portal after enabling its solid footprint.

Regenerate metadata after changing source GLBs with `npx tsx tools/assets/collision-bounds.ts`. Bounds include source hashes; tests catch stale metadata. Collision checks use a spatial hash and navigation edges are cached. The diagnostic Hunt now starts on the final approach because older routes crossed non-solid furniture; gameplay Hunt timing is unchanged.

Validation: 71 tests pass and production build succeeds. Browser expedition check passed extinction, active Hunt, navigated escape and sanctuary in 1:02 simulated expedition time. Observed local frame p95 18.2 ms, worst 36.4 ms; these are a short desktop checkpoint, not a hardware guarantee.

## 2026-10-19 — remove misleading statue interactions

Removed decorative processional statues from sanctuary/landmark rooms and the floating landmark circle, which suggested an interaction without providing one. Shared placement removal also removes their collision blockers. Validation: 71 tests pass; production build succeeds.


## 2026-10-19 — fire-sensitive Stalker and critical fuel sputter

The Stalker now recoils for 0.7 seconds, then retreats at 1.35 m/s along collision-aware routes from a visible burning torch in every mode. Retreat has distance hysteresis and bounded replanning; it never drains a lit torch at contact. Runtime animation adapters reuse its recoil/investigate clips with a blended hunched, lowered skeletal pose and face it along its escape direction. This is an adaptation of the existing Stalker rig, not a newly authored motion-capture crawl. In darkness it can pursue by sight at 2.8 m/s; contact capture is enabled during the active Hunt, preserving the extinction grace period. Relighting restores its fear of fire.

Below 10% fuel, irregular bounded light dips and matching flame contraction add visible sputtering. Fuel consumption, AI visibility and extinction timing remain independent of this effect. `/?debug&stalker&seed=104729` opens a repeatable low-fuel creature review. The screenshot's statue/circle belonged to the earlier build; those placements remain removed.

Validation: 73 tests pass, including all torch modes repelling the Stalker, escape movement, no contact fuel drain, darkness state recovery and bounded critical-fuel flicker. Production build succeeds; existing Three.js chunk warning remains.

## 2026-10-19 — character lighting and survival readability

Animated character surfaces retain their generated texture maps but cap metallic response and disable self-shadow reception to avoid near-light striping. The carried torch now tilts outward from its hand socket, clearing the hood; its bounded near-field lighting reduces close-range clipping while retaining mode radii and critical-fuel flicker. Sanctuary and world shadows remain enabled. This does not repair remaining source-rig deformation defects or provide new animation assets.

Compact HUD guidance explains visible Stalker fear and critical-fuel survival actions. Directional accessibility cues now include Stalker pursuit. The menu shows a Git build ID and checks `build.json` for a newer release, offering a manual reload without interrupting an expedition. Render header rules request revalidation for HTML, build identity and mutable model paths; an existing service must sync its Blueprint to adopt those rules. Reference: https://render.com/docs/static-site-headers and https://render.com/docs/blueprint-spec.

Validation: 74 tests pass; production build succeeds. Physical iPhone/Xbox verification and broader rig/art acceptance remain outstanding.

## 2026-10-19 — varied expedition layouts

Replaced the fixed eleven-room snake with 12–18 seeded chambers, branching graphs, optional loop routes, rewarded dead ends and a farthest-by-route destination. Three themed Catacombs mixes alter room weighting and ambient palette: Bone Warrens, Drowned Tombs and Ashen Archive. Existing catalog GLBs remain the art source; this does not add three independently authored biomes. Resource positions and the Stalker lair now follow the generated rooms. Depth uses graph distance rather than room insertion order. Pickup prompts and interactions select the nearest visible item.

Old fixed-map saves safely bank carried relics, preserve upgrades and return to the new entrance. Current-generation saves keep their normal position and expedition state. See docs/WORLD_GENERATION.md for the pipeline and remaining module limitations.

Validation: 77 tests pass, including 200 seeds with all room centres reachable, topology/size/theme diversity, reward/spawn placement and migration. Twenty complete simulation expeditions passed extinction, active Hunt and sanctuary with the Stalker enabled. Browser seed 104729 passed the full escape with no warnings/errors; observed frame p95 18.1 ms, worst 35.0 ms in this short desktop run. Production build succeeds with the existing Three.js chunk warning.

## 2026-10-19 — Torchbearer arm motion and upper-body binding repair

Found and removed the adapter's frozen midpoint replacement for the right clavicle, upper arm, elbow, wrist and fingers during locomotion. The preserved Mesh2Motion Idle_Torch motion now supplies an animated grip with bounded source-gait shoulder/elbow sway. The fix transfers 120 arm rotation tracks onto the shipped asset without replacing its geometry, bind matrices, original skeleton or grounded non-locomotion clips.

A deformation diagnostic also found thigh weights on ribcage vertices and finger weights above the wrist. Spatial tapers now keep torso cloth with the torso, maintain shoulder transitions and transfer stray sleeve finger influence to the forearm. Four sampled crouch-walk phases reduced worst tested edge stretch from 4.92x to 3.11x; sprint reduced from 4.26x to 3.67x. These are diagnostic ratios on edges over 5 mm, not a claim that all deformation is eliminated. The original neural mesh and raw site export remain preserved.

The stronger regression samples 12 phases per idle/walk/sprint/crouch-walk clip, prohibits leg influence on the ribcage, requires both hands to move relative to the chest and keeps a tighter 4.5x maximum edge envelope. All 77 tests pass. Production build succeeds. Runtime GLB URL is versioned to fetch the corrected asset.
