# The Last Light

**When the flame dies, the hunt begins.** A browser survival horror expedition built with TypeScript, Three.js and Vite. Explore ancient catacombs, manage a fragile torch, collect relics and escape to sanctuary. Extinction starts a survivable Hunt rather than an arbitrary death countdown.

This repository documents the development process as well as the game: prompts, generated asset provenance, rejected experiments, animation tools, deterministic tests and actual browser checks. The shipped game runs on static hosting without inference services, API keys or a backend.

Expeditions now generate **12–18 chambers** with changing routes, branches, loops and destination sanctuaries. Bone Warrens, Drowned Tombs and Ashen Archive vary the room mix and atmosphere within the Catacombs. See [world generation](docs/WORLD_GENERATION.md) for implementation, testing and save migration.

## Baked floor and ceiling tiles — 2026-10-30

Floor and ceiling tiles were the largest remaining cost: 1,530 instances of a near-flat 2,500-triangle generated tile, about 40% of every frame, and impossible to simplify without tearing texture seams. At load the game now renders the real tile straight down into a 512-pixel texture and draws every floor, wet floor and ceiling as a two-triangle square wearing that bake, with bump detail taken from it. The original stonework is kept; only its shallow relief geometry is gone.

Triangles per frame, original → now: refuge 20.5M → 5.1M, corridor 18.5M → 4.4M, ossuary 13.5M → 3.6M, flooded 5.1M → 0.7M (73–86% lower overall). Rendered High-quality frames of the ossuary, start room and burial shelves show the floors unchanged to the eye. Validation: 190 tests and production build pass. Real-device frame rates remain to be measured.

## Omens and provisions — 2026-10-30

**Omens** vary every expedition after the first. Each run draws one seeded condition, always a trade, announced at the start and kept in the journal:

| Omen | Drawback | Benefit |
| --- | --- | --- |
| A Quiet Crypt (about a quarter of runs) | — | — |
| Echoing Halls | footsteps carry 25% farther | +2 throwing stones |
| Thin Oil | oil pickups worth 30% less | +1 match |
| Restless Dead | a second Stalker even at Descent I | +1 relic per 3 banked at the far fire |
| Ember Wind | the Hunter wakes 3 s sooner | the torch burns 7% slower |

A first-ever expedition always plays plain.

**Provisions** give banked relics a use after upgrades are maxed. Between expeditions, after an escape or a death, spend a relic on a spare match (up to two) or a pouch of two extra throwing stones. They are carried into the next expedition only and survive closing the game.

A balance sweep (80 seeds each at Descents I and III) found Ember Wind nearly free: its slower burn helped all expedition while its drawback only mattered after extinction. It now gives 7% less burn and wakes the Hunter three seconds sooner. The expedition journal's "seconds in Steady mode" also now uses the real burn rate, including Descent and Omen effects.

End-to-end check: the built-in expedition driver passed extinction, active Hunt, navigated escape and sanctuary through the real main loop on three seeds, and on a Descent III veteran save with Restless Dead and both provisions bought, with no console errors.

Validation: 190 tests and production build pass, covering Omen seeding and coverage, each Omen's exact trade, the plain first expedition, clearing between runs, provision purchase rules, one-expedition use and save/load bounds. A browser check confirmed the start announcement and buying a provision after a death.

## Rendering load cut by more than half — 2026-10-29

Profiling the production build at High quality found 5–20 million triangles per frame, mostly from generated dressing far denser than its size: 12,000-triangle skulls (651 per map), 24,000-triangle bone piles and cobwebs, 18,000-triangle wall niches. Every catalog batch also cast shadows, including floor and ceiling tiles that can never shadow anything visible, multiplied by six cube faces per point-light shadow refresh.

Five dressing models now ship as seam-preserving LODs made with gltfpack 0.24 (skull 1,200, bone pile 2,400, cobweb 3,600, chain 2,700, wall niche 3,600 triangles), with updated provenance in the catalog manifest. Floors, ceilings, skulls and cobwebs no longer cast shadows. Per-frame triangles fell 55–70% in every room type (refuge 20.5M → 8.6M, corridor 18.5M → 7.7M, flooded 5.1M → 1.5M). An aggressive topology-ignoring pass reached 80% but tore texture seams, so it was rejected after a rendered review; floor and wall tiles cannot be simplified without tearing and keep their source meshes. A test now holds dressing to a per-instance budget while still requiring real generated geometry.

Validation: 185 tests and production build pass; rendered High-quality frames of burial shelves and the ossuary show intact textures. Frame rate on real phones and desktops still needs measuring.

## Descents and approximate hearing — 2026-10-29

**Descents** give the game a goal after upgrades are maxed. Each escape to the far sanctuary unlocks the next Descent (up to IX); choose it from the result screen or the main menu's **Choose Descent**. Each level past the first burns fuel 12% faster, shortens the grace after extinction by a second (never under four), makes searching Hunters 0.3 m/s quicker and 2 s more persistent, adds a second Stalker deep in the crypt, and removes a starting match every two levels (never below one). Banking at the far sanctuary pays half a relic extra per relic per level; turning back to the first fire never does. Dying drops you one Descent. Chase speed never rises, so a sprint can still outrun pursuit.

**Hearing is now approximate.** A heard sound sends a Hunter to an estimate of where it came from: within about half a metre when close and loud, up to about 3.5 m when faint or distant. Sight stays exact. Quiet movement and hiding now pay off more often.

In 30-seed bot runs the careful "human" policy averaged 0.2 Hunts per run at Descent I, 1.1 at III, 1.7 at V and 2.3 at VII, with first losses appearing from Descent V; banked relics per run rose from about 3 to 6, and up to about 21 for full clears. The bots navigate perfectly and collect every match on their route, so human runs will be harder.

Validation: 185 tests and production build pass, including Descent scaling, the second Stalker, banking bonus and unlock, the death penalty, starting matches, save/load bounds and approximate hearing. Menu and result screens were reviewed in a browser.

## Tomb nooks: hiding during the Hunt — 2026-10-22

Each crypt chamber's hiding tombs now have a dark nook between tomb and wall, off every line a Hunter walks. During a Hunt a faint chalk ring marks each one. Step inside the ring and crouch to hide (**C / Xbox B / touch CROUCH**): a Hunter will not see you beyond arm's reach (0.7 m) and cannot grab you by brushing past. Two things still find you: a Hunter that watched you go in, and one that lingers within 2.5 m for 3.5 seconds and senses you. The HUD warns when one starts to sense you, so you can slip away or hold your nerve.

In controlled runs, a quietly hidden player was found 1–3% of the time over 30 seconds of searching nearby. When the Hunter had heard the player enter and investigated that exact spot, it found them 67% of the time within 20 seconds. Approach quietly.

Enemies now route to the nearest navigable cell when a target lies just off the grid, and a pursuer that has seen its prey closes the last metres directly. Previously a player standing in an off-grid pocket could not be reached at all.

Validation: tests cover nook placement and clearance across 40 seeds, concealment, arm's-reach and sensed discovery, catching a sensed player, and pursuit after being seen entering.

## 3D presentation pass — 2026-10-22

A review of rendered frames, rigs and clips found and fixed:

- **Sunken Hunter.** In idle, search, pursue, flee, capture and banish its feet sat 18–24 cm below the floor (only crawl and listen had been grounded). Each clip's lowest foot joint is now measured at load and lifted to ankle height, blended by animation weight.
- **Undersized Hunter.** The rigged Hunter was 1.54 m tall, shorter than the 1.63 m Torchbearer, against an art-bible target of 3.0–3.3 m. It now grows with the ceiling up to 1.3× (about 2.15 m idle, 2.4 m in pursuit), capped so hanging arms never look longer than the real 1.1 m capture reach. Low corridors keep its crawl fitting.
- **Foot sliding.** Locomotion playback rates now come from measured planted-foot speed in the shipped clips instead of hand-picked constants, for all three characters. The Stalker glided about 80% of its movement and the searching Hunter about 55%; fleeing Hunter legs outran the body. Cadence caps keep short authored strides from looking frantic, so some sprint slide remains until longer-stride clips exist.
- **Stalker.** It now faces where it walks (not always at the player), uses its faster gait at speed, and no longer floats on a sine bob.
- **Sanctuary fire.** The destination landmark was an opaque stretched icosahedron; it is now three animated flame layers and a soft glow sharing the torch shader.
- **Blue seams.** Generated wall, floor and ceiling modules do not tile perfectly, letting fog colour show through as blue lines. Near-black instanced backings (three draw calls) close every seam; floor and ceiling tiles also take a seeded quarter turn to break texture repetition.
- **Flooded rooms** gain a translucent water sheet with drifting procedural ripple normals, so torchlight shimmers on it.
- **Camera clipping.** The boom now uses a small fan of rays for a camera-sized clearance, so protruding stonework cannot fill the lens.
- **Lighting.** The cool ambient fill drops from 0.46 to 0.34 while the torch burns, letting the torch act as the key light.

Validation: tests cover measured gait speeds, foot grounding, Hunter ceiling clearance and side clearance for the camera. Visual review used software-rendered frames; live motion, frame rate on real hardware and physical devices remain unreviewed.

## Relics, presence and defeat — 2026-10-22

Eighteen authored votives (three per emblem) replace six, and each chamber's relic is assigned so no votive repeats within an expedition. Heard footsteps now gather a cold shadow at the screen edge they come from; it is driven by the same audio contact as the footstep cue, so it reveals nothing the player could not already hear. The defeat screen states how many carried relics were lost beside the banked total, and live HUD warnings no longer show through result screens.

Validation: 169 tests (including no-repeat relics across 40 seeds) and production build pass. Visual review used desktop screenshots over captured frames; live animation and physical devices remain unreviewed.

## Tension and risk pass — 2026-10-21

Seeded bot playtests showed that a run could be won in 13 seconds by returning the first relic to the first fire, that efficient players never dropped below about 80% fuel, and that no threat could touch a lit torch. Turning back now banks half the haul, oil is scarcer and uneven, deep votives are worth two relics, and close Stalkers smother part of the flame. In 20-seed bot runs, efficient players now bottom out at 26–82% fuel and full clears at 0–30%, with occasional burnouts into a Hunt. The bot plays the simulation, not the rendered game; human difficulty remains to be confirmed.

Validation: 167 tests and production build pass.

## iPhone touch ergonomics — 2026-10-21

Push the movement stick to its forward rim to sprint while keeping the other thumb free to turn the camera. Ease back to walk; crouching suppresses sprint. The existing hold-to-run button remains available. Portrait actions use three columns, zoom sits above the movement stick, and landscape HUD spacing leaves more room for the view. Rotation pauses play and releases held controls.

Validation: 164 input/game tests and production build pass; Chrome layout review at 390×844 and 844×390 showed all touch controls within the viewport. This is responsive desktop review, not physical iPhone Safari, multi-touch or thermal-performance certification. Existing mobile low graphics defaults are retained; large-room performance remains unresolved.

## Horror presentation — 2026-10-21

Both Hunters now have a dark, subtly shifting surface and rising shadow wisps, while their glowing eyes remain readable. Living mist rolls at varied heights with layered texture detail. These effects retain the original GLBs, rigs and gameplay perception rules. See [implementation and review limits](docs/HORROR_PRESENTATION.md).

Validation: 163 tests and production build pass. Chrome corridor review measured 46–49 FPS; the larger Hunter-retreat chamber measured only 17–22 FPS and remains a performance priority. No shader errors were observed. Physical-device review remains open.

## Generated foley and audio gap audit — 2026-10-21

Six new original MOSS-SoundEffect clips now cover mist coughing, stone and water footfalls, crypt timber creaks, hanging-chain contact and bone crunch. They are triggered by real gameplay events, with positional panning, wall muffling, modest pitch variation and bounded overlap. Existing procedural effects remain fallbacks rather than doubling every recorded impact. The soundtrack is retained.

The HF CLI verified the existing account and running official MOSS demo; the established authenticated queue pipeline generated the clips without local weight downloads or paid hardware changes. Prompts, seeds, provider job IDs and technical decoding reports are preserved in [the audio audit](docs/AUDIO_GAP_AUDIT.md). Listen individually at [/audio/listen.html](https://lastlightgame.onrender.com/audio/listen.html).

Validation: 163 game tests, two mastering tests and production build pass; all six MP3s decode without clipping or invalid samples. Subjective headphone quality and physical-device mix remain open. Remaining audio gaps include generated exertion breaths, differentiated Hunter foot textures, vent jets and wordless relic whispers.

## Living mist — 2026-10-21

A drifting ground-mist field now fills the crypt. Torch modes clear different pockets (Ember 2.5m, Steady 4.5m, Blaze 7m); sanctuary fire and dropped brands also repel it. Cleared floor slowly refills when fire leaves. Fire clearing respects walls and the field persists in current-generation saves.

Long exposure in darkness produces a mist warning, strained breathing and periodic coughs. A cough can lead a nearby Hunter to investigate through ordinary sound perception; the mist does not grant wall vision or spawn enemies. Exposure slows movement by up to 8%, leaving a clear-floor sprint faster than a pursuing Hunter. Fire immediately prevents further coughs and restores breathing over time. No resource tax, instant death or suffocation countdown was added.

Validation: 161 tests, 100 seeded escape scenarios and production build pass. Chrome review observed the cleared torch pocket and surrounding cloud bank at about 57 FPS, with no shader errors. See [mechanics, rendering and limits](docs/LIVING_MIST.md).

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

![Title-screen artwork](public/art/title-background-v1.png)

## Rebuilt Torchbearer (2026-10-19)

The Torchbearer wears ivory-white cloth with dark leather accents. A player-only material recolor preserves the neural surface, face, rig and animations.

The player is a **new TRELLIS image-to-3D body**, with a separate generated torch GLB, a fresh 52-joint bind and nine torch-specific motions generated through the authenticated Hugging Face HY-Motion service. The old player mesh, skin and Mesh2Motion clips are no longer used by gameplay. The right-hand socket drives the prop's position and rotation; a prop tip socket drives the runtime flame. Hunter and Stalker are unchanged by this rebuild.

Review the shipped player with its separate torch at `/asset-review.html?rebuild`. Select idle, walk, sprint, crouch, relight or other motions and drag to orbit. [Rebuild guide](docs/torchbearer-rebuild/README.md) includes the reference images, prompts, source hashes, failed approaches, carry IK, licensing and reproduction commands. Gloves follow the wrist as a unit; individual finger skin articulation and terrain-aware foot placement remain future work.

## Play and build locally

Node.js 22+ recommended. Install dependencies, then choose a command:

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Open the URL printed by Vite. WebGL2 is required. Audio starts after a click or tap. `npm run build` creates `dist/`; the included [render.yaml](render.yaml) configures a Render static site with `npm ci && npm run build` and publish directory `dist`. Python, Blender, Hugging Face and ComfyUI are asset-authoring tools, not requirements to play or build the shipped game. Optional Google Fonts have system fallbacks.

## Controls and survival

| Device                | Controls                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keyboard/mouse        | WASD move; drag either mouse button or arrows to look; wheel zoom; Shift sprint; C/Ctrl crouch; E interact/relight; Q chalk; F burst; 1/2/3 flame mode; Tab journal; Esc pause |
| Xbox standard mapping | LS move; RS look; RT/LS click sprint; B toggle crouch or hold LT; A use; X burst; Y chalk; LB/RB flame mode; D-pad up/down zoom; RS click recenter; View journal; Menu pause   |
| Touch                 | Left joystick move; drag open view to look; hold RUN; toggle CROUCH; USE/BURST/CHALK/JOURNAL buttons; flame and zoom buttons                                                   |

Optional Capture Mouse enables free look when supported; dragging remains available when pointer lock is rejected. Controller menus support stick/D-pad navigation, A select, B back, and left/right adjustment. Touch supports simultaneous movement, looking and sprinting, safe-area padding, portrait/landscape layouts and a scrollable menu. Preview touch layout with `?touch`. Settings include sensitivity, sound, visual audio cues and graphics quality.

For an iPhone, use the deployed HTTPS site. PC localhost is not reachable from the phone. For same-Wi-Fi development, explicitly run `npm run dev:lan` and use the PC LAN address on port 5173; controller APIs may require HTTPS. Physical Xbox/iPhone validation remains pending; automated input tests are not a substitute.

- Ember conserves fuel, Steady supports exploration, and Blaze spends fuel quickly for stronger light. Deeper rooms increase fuel pressure.
- A full basic torch burns for about 120 seconds in Steady, 218 seconds in Ember, or 34 seconds in Blaze before depth modifiers. Fuel pickups add about 22 base Steady seconds, and about a third of chambers beyond the first two hold no supplies; matches provide about 20. Extinction gives an eight-second grace period, followed by an active searching Hunter.
- Relighting consumes a match, takes two seconds before upgrades, restores reserve fuel, slows movement and prevents sprinting. Find cover first.
- Crouching quiets footsteps and reduces Hunter visual range; close detection and remembered positions still matter. Corners break line of sight.
- Sprint stamina recovers after a brief rest. Flame Burst costs fuel and cannot repel creatures through masonry.
- Relit torchlight makes the Hunter flee along navigable paths before banishment. Sanctuary fire provides safety. Stalkers threaten a weak flame; brighten it or retreat.
- Bank carried relics at the destination sanctuary. Turning back to the first fire banks only half (rounded down), so a single relic is not worth the retreat. Votives in deeper chambers count as two relics.
- A Stalker that reaches you around a corner, before your light drives it off, smothers part of the flame (about 10 Steady seconds, never a full extinction). Death loses carried relics; browser-local permanent upgrades survive. Saves belong to the browser and origin.

At sanctuary, buy Reservoir (+90 fuel-seconds, one relic, five ranks), Efficient Wick (8% less burn/rank), Soft Boots (12% quieter footsteps/rank), Quick Spark (0.25 seconds faster relighting/rank), or Sanctuary Compass. The latter costs three relics and provides a bearing, not a route through walls; the other three upgrades cost two relics/rank, up to three ranks.

## How we are building it

The project began with a full game specification, then prioritized an integrated Catacombs slice: controller/camera, torch, Hunt, expedition, persistence, generated art, audio and balancing. Each pass changes a small coherent system, adds meaningful regressions, builds the production bundle and exercises gameplay. [BUILD_STATUS.md](BUILD_STATUS.md) records outcomes and remaining work.

Our practical loop is **specify → implement → generate/review assets → integrate → test → play → revise**. Compilation alone is not acceptance. For example, an initially harsher stamina recovery change caused the existing no-match escape scenario to fail; it was retuned before keeping it. We also rejected fragmented floor reconstructions, kept their provenance, and used an explicitly documented derivative of an accepted neural wall mesh instead.

[Build prompts and contributor workflow](docs/BUILD_WORKFLOW.md) contains a reusable condensed development brief and the review checklist. This is a reusable summary of the original specification, not a claim to preserve every conversational prompt verbatim.

### Architecture

| Module                                                                  | Responsibility                                                                                                  |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/simulation.ts`                                                     | Seeded rooms, shared collision/navigation, torch/Hunt/perception, stamina, expedition, upgrades and persistence |
| `src/main.ts`                                                           | 60 Hz fixed-step accumulator, input integration, HUD, menus and progression screens                             |
| `src/scene.ts`, `src/character.ts`                                      | Three.js rendering, camera collision, particles, skeletal animation and torch socket                            |
| `src/catalog-assets.ts`                                                 | Shared generated GLB loading, cloning, instancing and disposal                                                  |
| `src/crypt-layout.ts`, `src/dungeon-dressing.ts`, `src/crypt-decals.ts` | Burial furniture, shared blockers, seeded dressing and wear decals                                              |
| `src/controls.ts`, `src/platform-input.ts`                              | Camera controls, gamepad mapping, touch pointers and menu input                                                 |
| `src/audio.ts`, `src/soundscape.ts`                                     | Generated/synthesized audio, positional cues and state-based mixing                                             |
| `src/qa.ts`, `src/*.test.ts`                                            | Navigated expedition driver and deterministic regression tests                                                  |

Grid cells represent two metres. Simulation light/perception does not depend on graphical quality. Rendering does not own character collision or AI decisions. Procedural room placement assembles assets; it does not replace generated art with procedural prop meshes.

## Art prompts and the image-to-GLB pipeline

The palette and silhouettes come from the [art bible](docs/art-direction/ART_BIBLE.md) and [concept board](docs/art-direction/concept-board.png): ochre cloak and satchel, elongated ragged Hunter, cold masonry, warm flame, oppressive burial architecture.

The runtime catalog currently contains **39 GLB roles from 38 accepted neural reconstructions**, including generated characters, architecture, props, skeletal remains, webs and burial details. Hollow/Moth are expansion previews, not implemented enemy behaviors. See [catalog pipeline and provenance](docs/CATALOG_ASSETS.md), [dungeon dressing](docs/DUNGEON_ATMOSPHERE.md), and [dense crypts and decals](docs/CRYPT_DENSITY.md).

1. **Catalog and reference.** Define a stable asset ID, prompt, dimensions, triangle budget and reference image. Reference batches used the existing local ComfyUI SDXL/Juggernaut workflow. Inspect silhouette, material and reconstruction suitability before continuing.
2. **Neural reconstruction.** Use the shared asset library's serial queue. Accepted sources used TRELLIS.2-4B through the Hugging Face demo, with the brazier using the installed local ComfyUI TRELLIS workflow. This was not full local TRELLIS inference on the 8 GB development GPU.
3. **Finish.** Preserve the original source; use Blender for scale, ground pivot, budget reduction and LOD inspection. Reject unusable results rather than disguising them as finished art.
4. **Import.** Pack embedded textures, record hashes/reference/model/seed/provider provenance, and install the GLB plus its catalog manifest. Most textures use 512px; detailed dressing uses up to 1024px. Actual settings are recorded per asset.
5. **Integrate and inspect.** View `/asset-review.html`, then review scale, visibility, collision, dressing density and performance in real gameplay. Generated drafts are not automatically approved production art.

The original shared library is **outside this repository**, at `C:/Users/coryc/Documents/Codex/2026-10-17/cre/outputs/last-light-asset-library`. Its `scripts/assetlib.py`, full catalog, raw jobs and authoring environments are not supplied by a clone of this repo. Runtime GLBs and per-import provenance are included in `public/models/catalog/` and `docs/catalog-assets/`. Repository finishing scripts currently contain development-machine Blender paths; adapt them to your installation.

With that external library and its dependencies available, first read its instructions, run `status` and `doctor`, and resolve uncertain jobs. Use one serial worker on the shared GPU. From the game repository, completed candidates can be finished/imported with:

```sh
python tools/assets/finish_catalog.py LIBRARY_ROOT ASSET_ID
python tools/assets/import_catalog.py LIBRARY_ROOT ASSET_ID
```

Do not run import commands against unfinished or rejected jobs. [The catalog guide](docs/CATALOG_ASSETS.md) explains binding, promotion and the paving derivative. Model weights and authoring caches remain ignored in `.asset-tools/`.

### Where the exact prompts live

| Material                  | Reproducible record                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imported 3D assets        | Per-asset `definition.json`, `generation.json` and `preparation.json` under [docs/catalog-assets](docs/catalog-assets/), plus runtime manifests                   |
| Soundtrack and effects    | [audio-prompts.json](tools/assets/audio-prompts.json): exact prompts, durations and seeds; [audio manifest](public/audio/manifest.json): actual output provenance |
| Planned motion generation | [motions.json](tools/assets/motions.json); these prompts are not evidence that generated motions shipped                                                          |
| Title-screen background   | [full imagegen prompt](docs/TITLE_BACKGROUND.md) and [PNG](public/art/title-background-v1.png); no lettering or menu was baked into the art                       |
| Crypt wear decal atlas    | [full prompt and integration notes](docs/CRYPT_DENSITY.md)                                                                                                        |

Prompting lesson: specify the intended use, silhouette, material, pose, scale and exclusions, then inspect the result in context. A pleasing reference image does not guarantee usable 3D geometry or deformation.

### Rigging and animation: actual status

Current Torchbearer/Hunter/Stalker meshes are neural outputs. The Torchbearer now uses the new HF-generated motion rebuild described above; Hunter/Stalker retain their existing rigs and clips. Earlier player revisions below are preserved as development history. The player pass corrected lower-leg weights and fitted locomotion/torch carry; the Hunter pass added navigated fleeing and new state clips. [Player animation notes](docs/CHARACTER_ANIMATION.md) and [Hunter notes](docs/HUNTER_BALANCE.md) explain the implementation and limitations.

`build_characters.py` creates legacy donors; `bind_generated_character.py`, `player_motion.py`, `hunter_motion.py` and `promote_character.py` bind, bake and promote generated characters. This is **not** a successful NVIDIA-generated animation pipeline. Kimodo export stalled; no verified output was integrated. The Torchbearer Mesh2Motion export is integrated, with the original file and reproduction scripts preserved; Hunter/Stalker replacement remains pending: [handoff](docs/MESH2MOTION_STATUS.md). [Earlier model research](docs/AI_ASSET_PIPELINE.md) is historical, not the current shipped mesh source.

## Soundtrack and effects pipeline

Nine generated clips ship alongside synthesized gameplay audio. Music used ACE-Step-v1-3.5B and effects used MOSS-SoundEffect-v2.0 through their official Hugging Face demos. These were hosted generations, not local audio-model inference. Model/provider links, limitations and license records are in [AUDIO.md](docs/AUDIO.md).

The exploration prompt begins: “Instrumental dark ambient survival horror soundtrack in D minor, very sparse bowed low strings, distant resonant stone chamber…” Constraints exclude vocals, drums, jump scares and ambient footsteps, preserving real enemy footsteps as useful signals. The Hunt bed stays restrained so positional threats remain audible; sanctuary offers fragile relief. Exact full prompts and seeds are in the linked JSON.

`generate_audio.py` records provider responses and raw sources in ignored `.asset-tools/audio/raw`; `master_audio.py` removes DC/rumble, conditions loop boundaries, bounds peaks and encodes MP3 using FFmpeg. These authoring scripts need Python dependencies, HF authentication and provider availability. A fresh clone cannot remaster without raw sources. Runtime crossfades by game state, caps one-shots and retains synthesized fallbacks. Listen at `/audio/listen.html`.

Licensing notes record the models used at generation time; inspect the per-asset records and applicable terms before redistribution. No AI model weights are bundled.

## Verification and learning checkpoints

- `npm test`: currently 63 tests covering collision, camera, fuel, extinction, navigation, sight/sound, sanctuary, saves, upgrades, inputs, catalog integrity and balance.
- Python asset checks: `python -m unittest discover -s tools/assets -p "test_*.py"` (requires authoring dependencies).
- `/?debug&seed=104729`: reproducible world and developer menu. H forces Hunt, R refills, T teleports to destination. **RUN EXPEDITION CHECK** physically follows navigation through extinction, active Hunt, escape and banking; it is not a human pacing test.
- **CHECK HUNTER RETREAT** exercises relighting and fleeing. `/?debug&seed=104729&dressing` opens a repeatable dressing review position.
- Latest balance browser run completed the no-match escape in 1:00, with no warning/error logs observed. This accelerated route does not establish the intended 10–20 minute human expedition length.
- [v1 video](docs/demos/README.md), [title screen](docs/title-screen-v1.png), [latest escape](docs/balance-escape-v2.png), and [build log](BUILD_STATUS.md) show checkpoints, not promises of final quality.

This is a playable Catacombs checkpoint. Intended session pacing, physical device testing, sustained performance, final art/deformation acceptance, Hunter/Stalker Mesh2Motion replacement, additional biomes and expansion enemy behavior remain work in progress. The production build still reports a large Three.js chunk warning. Keep experimental failures and pending work visible so others can learn what actually worked.

## Mesh2Motion candidate review (2026-10-18)

Open `/asset-review.html?rigs` to inspect the new 66-joint Torchbearer and Hunter site exports. Orbit front/back/both sides and select any of their 59 / 44 library animations. These raw candidates are published for user validation and do not replace gameplay models yet. Stalker export and Hollow fitting remain pending after the browser connection stalled. Fitting evidence, exact clip names and hashes are in `docs/mesh2motion/multiview/`.

## 2026-10-18 — multi-view rigs installed in gameplay

At this historical checkpoint, the main game loaded the 66-joint All Fingers Torchbearer and Hunter exports. The October 19 player rebuild supersedes that Torchbearer rig. Runtime adapters map the player library to 14 gameplay clips and the Hunter library to idle, search, pursuit, flee, capture and banishment. The full 103 original clips remain available at `/asset-review.html?rigs`.

Rebuild from preserved exports with `prepare_mesh2motion.py SOURCE DESTINATION [hunter]`, then `smooth_mesh2motion_weights.py DESTINATION`. The weight repair uses 48 welded adjacency diffusion passes, a hand-local finger influence taper, and 240 projected passes under the GPU four-influence limit. Ground the player's death motion using `npx tsx tools/assets/ground_mesh2motion.ts DESTINATION`, then run `promote_character.py` with the per-model provenance JSON. This changes weights and clip adapters, not source mesh geometry. Raw site exports remain immutable. Stalker and Hollow still use their previous assets.

### Crypt dressing and lighting

Room dressing reuses catalog image-to-3D GLBs and the generated decal atlas. Seeded offering clusters sit in side aisles, clear of central crossing routes. `CatalogAssets.scatter` instances repeated source meshes in room-sized batches, preserving source materials and geometry. Firelight uses one torch shadow map plus nearby sanctuary shadow maps; low graphics disables them. Flame motion changes rendered shadows only, not enemy detection, fuel use or navigation.

Crypt horror scenes are selected deterministically by `cryptStory(world, room)` and assembled from preserved neural GLBs. The same story data supplies large-coffin navigation/camera blockers. Small skulls and remains use regional instancing, while generated-atlas decals add damp runs and grave scuffs. Decorative stone/metal audio is quiet and suppressed during Hunt states and near sanctuary fire, preserving enemy-audio readability.

### Performance profiling

See [the performance report](docs/PERFORMANCE.md) for measured frame pacing, CPU comparisons, remaining hardware limits and reproduction commands. Run `npx tsx tools/performance-benchmark.ts` for focused camera/path benchmarks. Expeditions now prepare models, shaders and the first render before play begins; this keeps initial loading separate from movement and fuel consumption. Camera collision remains exact after spatial filtering; cached navigation preserves the same route rules.

### Solid prop pipeline

`room-props.ts` and `dungeon-props.ts` are shared placement plans for GLB rendering and physical obstacles. `prop-bounds.ts` stores bounds and source hashes generated from shipped models. After replacing a solid GLB, run `npx tsx tools/assets/collision-bounds.ts`, then `npm test` and `npm run build`. Collision preserves each model's yaw and scale. Arch posts and lintels are separate so open doorways remain usable. Player movement, Hunter routes and camera avoidance consume the same solids; small debris and decals stay passable. The solid-prop tests verify source hashes, rotated footprints, arch openings, sprint collision and navigation detours.

### Stalker fire response and low fuel

A burning torch now triggers a brief Stalker cower followed by a slow, hunched retreat using navigable routes; Ember has the shortest protection radius. Its existing recoil and investigate clips supply the motion, with a blended skeletal fear pose. It resumes pursuit in darkness. Below 10% fuel, `flame.ts` drives irregular light dips and flame contraction without changing simulation visibility or fuel. Review both at `/?debug&stalker&seed=104729`.

### Readability and release identity

Character cloth uses restrained metallic response and avoids self-shadow reception; world shadows remain active. The torch tilts outward from its animation socket and uses bounded near-field light to reduce clipping beside the hood. Critical-fuel and visible-creature hints explain survival decisions without revealing creatures through walls.

The menu displays the Git commit used to build the game. Vite emits `build.json`; returning to the menu can offer an update when the deployed ID differs. Reloading is always a player action. Render's Blueprint declares revalidation headers for HTML, build identity and mutable GLB paths; sync the Blueprint for existing services to apply them. Source archives build with the label `local` when Git is unavailable.

### Torchbearer arm repair (2026-10-19)

The previous adapter froze the torch arm at one frame of Idle_Torch. `torch_arm_motion.py` now samples its full motion and blends bounded source-gait sway while retaining the grip. `prepare_mesh2motion.py` applies that correction on future rebuilds. To update an already smoothed/grounded shipped GLB without replacing other data, prepare a temporary source, use `transplant_arm_motion.py PREPARED SHIPPED OUTPUT`, then `repair_upper_body_weights.py INPUT OUTPUT` and promote the result with `promote_character.py` and its provenance JSON. The upper-body repair is specific to the fitted Torchbearer: it removes leg weights on torso cloth and finger weights above the wrist, with smooth shoulder tapers. Full rebuilds should run it after smoothing and before death grounding.

The skin regression checks 12 phases, torso influence exclusions, real hand movement relative to the chest and edge stretching. The raw Mesh2Motion export and all neural mesh geometry remain unchanged. Remaining cloak/collar deformation still needs visual review; passing numeric envelopes alone does not establish final animation quality.
