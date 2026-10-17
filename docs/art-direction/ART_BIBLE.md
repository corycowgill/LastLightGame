# THE LAST LIGHT — Art direction & production bible

Version 1.0 • Agent handoff • 17 October 2026

## Creative target

**A fragile ember moving through a cathedral built for the dark.**

Build premium stylized dark fantasy for the supplied Three.js survival horror specification. The player should recognize the path, threat, and cost of a decision before appreciating surface detail. Achieve polish through silhouette, composition, controlled materials, animation, and light. This document defines the art target; it does not certify a finished game or supply production-ready 3D models.

The accompanying `THE_LAST_LIGHT_CONCEPT_BOARD.png` establishes atmosphere and shape language. Written gameplay requirements and the specifications below take precedence over incidental details in the generated concept. It is visual reference, not a texture atlas, orthographic blueprint, or evidence of achievable real-time performance.

## 1. Non-negotiable visual rules

1. Fire is the visual protagonist. The torch is the brightest local focal point during exploration; sanctuary fire is the strongest stable destination cue.
2. Darkness preserves decisions. Hunt lighting must expose nearby floor, obstacles, chalk, and threat silhouettes without exposing the whole maze.
3. Small human, immense architecture. The Torchbearer feels vulnerable without becoming too small to read or control.
4. Every room gets one memorable landmark. Give junctions recognizable silhouettes, not merely different piles of rubble.
5. Sculpt large forms first. Broad planes, intentional bevels, tapered proportions, and selective wear create the stylization.
6. Threat identity survives grayscale, low graphics, and a still frame. Color and particles reinforce identity; they never carry it alone.
7. Decoration never silently changes collision, concealment, navigation, or light protection.
8. Keep the world original. Reference the brief's named games for readability, scale, restraint, and tension; do not reproduce their characters, assets, UI, or signature compositions.

## 2. Shape language and visual hierarchy

| Family | Shape grammar | Surface treatment | Read from gameplay distance |
|---|---|---|---|
| Torchbearer | Compact teardrop cloak; rounded shoulders; offset torch | Soft cloth planes, sparse stitched seams, worn leather | Hood + elevated flame + satchel |
| Sanctuary | Upright complete arch; circular basin; balanced composition | Repaired stone, clean central floor, warm soot | Unbroken arch framing stable fire |
| Catacombs | Heavy tapered piers, broad arches, deep rectangular recesses | Large chips at exposed edges, broad mineral streaks | One structural landmark per room |
| Hunter | Broken vertical wedge; dangling arms; incomplete lower contour | Mostly opaque shadow core, sparse trailing ribbons | Height and arm span before eyes |
| Stalker | Low forward wedge; compact body; listening head pose | Matted, desaturated shell or hide | Low posture and deliberate listening stops |
| Hollow | Hunched concave torso; shielding arms | Dry chalk-like plates, dark internal seams | Recoil and shield posture toward fire |
| Moth | Broad angular wings; narrow hanging body | Dusty translucent wing edges, solid central mass | Wing rhythm and orbiting approach |

Use approximately 70% large masses, 25% supporting shapes, 5% fine accents as a composition heuristic. Avoid universal spikes, noisy cracks, glowing runes on every surface, and uniform edge highlighting.

## 3. Palette and material response

Hex values are starting art swatches in sRGB, not final rendered pixel targets. Exposure, tone mapping, and light alter their appearance.

| Role | Swatch | Use |
|---|---|---|
| Deep shadow | `#080F1C` | Backdrop and deepest recesses |
| Navy atmosphere | `#152739` | Distant silhouettes and fog |
| Cold stone | `#59636B` | Broad architectural base color |
| Lit stone edge | `#92958C` | Sparse worn facets |
| Ember | `#D45B27` | Low flame and dying coals |
| Flame gold | `#F6B85B` | Main warm light identity |
| Hot core | `#FFF0C2` | Small flame core only |
| Old teal | `#547E7B` | Rare mineral deposits and biome cues |
| Muted violet | `#514659` | Occasional deep-region accent |
| Chalk / UI ivory | `#DDD7BE` | Navigation and text |

Stone: roughness starting range 0.78–0.95, metalness 0. Broad albedo variation, restrained normal maps, sculpted bevels at silhouette. Cloth: roughness 0.85–1.0, metalness 0; folds grouped into large readable planes. Leather: roughness 0.55–0.8, metalness 0. Iron: metalness near 1 only for exposed metal, with roughness 0.55–0.85; rust is a separate nonmetal surface. Wet patches lower roughness selectively, never make an entire biome mirror-like.

Do not bake moving torch illumination into base color. Use mild cavity shading without crushing surfaces. Emission is reserved for active fire, selected artifact details, and subtle threat cues. Avoid emissive outlines on ordinary loot.

## 4. Torchbearer design lock

Proposed scale: 1.55 m tall, roughly five heads high. A broad hood conceals most facial detail. A short weathered ochre cloak ends above the knees, leaving the stride readable. Charcoal underlayers, wrapped calves, practical boots, a single cross-body satchel, and a visible fuel flask communicate travel and scarcity. No armor suit, sword, or conventional combat equipment.

Carry the torch in the right hand with enough lateral offset to expose the flame around the body silhouette. Use a wrapped wooden shaft and a simple iron basket. The basket remains recognizable when extinguished. The left hand handles chalk and brief interactions. The camera must remain usable if the torch crosses the screen during turns.

Required model sheet: front, side, back, three-quarter, torch close-up, neutral materials, scale bar, and joint layout. Build actual orthographic views during modeling; the concept board's views are illustrative. Keep cloak movement secondary to precise body motion. Use a few controlled bones or authored motion before considering cloth simulation.

Required clips: idle, walk, sprint, crouch idle, crouch walk, quick turn, interact, chalk, fuel refill, extinguish, two-second relight, flame burst, restrained fear reaction, caught/death. Use in-place locomotion unless the gameplay owner explicitly adopts root motion. Fear animation must not interrupt player control.

## 5. Hunter and secondary threats

Hunter proposed height: 3.0–3.3 m, narrow enough for its validated routes. Uneven shoulders, long empty hanging arms, a bowed head, and a lower body dissolving into a few torn vertical strips. Tiny pale eyes stay subordinate to the silhouette. Avoid antlers, skull masks, weapons, and armor. Most of the body is opaque geometry; use limited alpha effects at edges to control overdraw and preserve shadow readability.

Animate search as slow weight shifts and listening pauses; pursuit as unnaturally efficient forward travel with delayed arms and upper-body lag. Motion may feel uncanny, but displacement follows real navigation. Banishment collapses inward into a few ribbons; it must not resemble an explosion or a slain combat enemy. Never use visual stretching that makes its capture reach ambiguous.

Stalker is the first secondary enemy. Its low posture contrasts with the Hunter. Author a clear listening hold, investigation walk, alert turn, and pursuit motion. Hollow and Moth remain expansion assets until the slice passes. Model enemy reaction tells so behavior is readable without labels: Hollow shields and retreats from strong fire; Moth aligns and approaches bright light; Stalker orients toward sound.

## 6. Catacombs modular kit

Proposed authoring standard: meters, Y-up, consistent glTF forward orientation documented by the engine owner, transforms applied, ground-center prop origins, connection-plane origins for room modules. Use a 1 m assembly grid and 0.25 m detail increments. Prototype a 3 m clear corridor, 4 m corridor height, and 2.4 m clear doorway; validate player, camera, and every eligible enemy before locking dimensions.

| Kit group | Initial deliverables |
|---|---|
| Structure | 2 m / 4 m wall segments, inside/outside corner, end cap, floor slab, ceiling span |
| Connections | Arch, doorway, door, straight corridor, turn, T junction, four-way junction |
| Vertical forms | Full pillar, split pillar, buttress, shallow stairs plus collision ramp |
| Crypts | Tomb, open/closed recess, sarcophagus lid, memorial slab |
| Props | Brazier, fuel vessel, barrel, supply crate, rubble clusters, hanging cloth |
| Navigation | Chalk decals, distinctive sculpted reliefs, sanctuary arch and basin |
| Gameplay items | Fuel pickup, match case, bankable artifact, optional recovery satchel |

Separate walkable shell, collision, occluders, sockets, prop anchors, hiding volumes, and navigation metadata. A rendering mesh must never be the only source of gameplay semantics. Cosmetic seeded variation may change chips, stains, and prop choice without moving doors or blocking escape routes.

Build 10–12 connected slice rooms using the kit. Include a starting sanctuary, a split-pillar junction, a supply alcove, a broken processional chamber, an optional artifact crypt, a low-ceiling detour, a hiding space, and a destination sanctuary. Distinct landmarks can be recombined across layouts, but do not repeat the same landmark at consecutive junctions.

Frame the safe route with broad floor continuity; frame optional reward with a partial occlusion and a separate visual beat. Keep clutter off the primary movement lane. Rubble that changes movement needs deliberate collision and navigation validation.

## 7. Camera, lighting, and darkness

Start camera exploration at approximately 3.2 m behind the player, 1.7 m high, with a 55–65 degree vertical field of view; these are tuning values, not locked gameplay requirements. Preserve a view beyond the torch hand. Test wall avoidance at doors, corners, crouch passages, and stairs. Near-camera character fading must not erase threat information.

| State | Lighting identity | Required readable information |
|---|---|---|
| Ember | Compact orange pool; low flame and sparse sparks | Roughly 3 m local space, crouch path, immediate items |
| Steady | Amber key with soft cool separation | Roughly 9 m gameplay visibility target and clear nearby hazards |
| Blaze | Tall pale-gold core and broader warm spill | Roughly 20 m gameplay visibility target, bigger light signature |
| Low fuel | Smaller uneven flame, irregular sparks | Warnings below 25%; unmistakable urgency below 10% |
| Hunt | Warm local key gone; limited cold adaptation | Nearby floor, chalk, hiding geometry, threat silhouette |
| Sanctuary | Stable generous amber light; quiet particles | Safety boundary and interaction station |

The supplied radii are gameplay values; rendered light falloff does not define perception or protection. Avoid abrupt circular light cutoffs. Tune light, fog, and exposure using a fixed reference room. Do not import intensity numbers between rendering configurations without calibration.

Use a restrained cool ambient contribution and art-directed local visibility during the Hunt. Distant active fire remains visible only when unobstructed. Establish a calibrated dark-adaptation curve with gameplay and accessibility owners; never rely on the user's monitor brightness. Bloom should soften fire, not obscure doorway edges. Fog provides depth without washing shadows gray. Avoid full-screen color grading changes that hide chalk or collapse fuel warnings.

Proposed baseline: one shadow-casting player light; bake or approximate static sanctuary illumination where practical. Additional dynamic lights require measured budget approval. Reduce shadow resolution and particles on lower tiers while preserving all gameplay cues.

## 8. VFX and animation language

Fire uses a small bright core, grouped flame tongues, sparse embers, and light smoke. Prefer a few well-authored flipbook planes or ribbons over many additive layers. Size and cadence distinguish the three modes as well as brightness. Keep smoke from covering the camera.

Extinction: flame contracts, sputters, produces a final ember, then warm light leaves. The eight-second grace period begins according to gameplay state, with a restrained audiovisual cue. Hunter emergence happens at the validated off-camera spawn; VFX never invent an in-view teleport. Relight: hand anticipation, spark, flame catches, warm space returns. Complete the visual exactly when the gameplay relight completes.

Flame Burst is one brief expanding fire gesture with rapid falloff and a fuel cost cue. Avoid projectile shapes, damage numbers, hit sparks, or other combat language. Provide reduced flashes and reduced camera shake settings. Echo Sense uses a short nearby contour reveal with a clear audible consequence, only if the upgrade is implemented.

## 9. UI visual direction

Use soot-dark translucent panels, thin worn brass dividers, warm ivory text, restrained serif headings, and a highly readable sans-serif for controls and numbers. Avoid decorative distress on functional text. Bundle only fonts with documented redistribution rights.

Default HUD: small lower-left fuel reservoir and named mode; matches adjacent; stamina appears while used; artifact count remains compact; contextual prompt sits near the interaction focus without hiding it. Do not rely solely on the flame image to communicate fuel. Every state has text or an identifiable shape alongside color. Keep controls remappable and prompts consistent with current bindings.

Journal resembles a travel record with spacious typography and simple discovered-room sketches, without becoming an omniscient minimap. Sanctuary upgrades use the same materials as the HUD, with a clear price, benefit, and purchase state. Death presentation is brief, quiet, and explicit about lost versus banked artifacts. Test HUD at 1280×720 and 1920×1080, with enlarged text and safe margins.

## 10. Expansion biome differentiation

| Biome | Primary silhouette / material change | Accent and landmark |
|---|---|---|
| Drowned Halls | Low water planes, waterline staining, submerged lower arches | Restrained teal; tilted flooded stair |
| Forgotten Archive | Tall shelf canyons, layered paper and wood, movable architectural masses | Muted parchment; suspended reading platform |
| Hollow Deep | Vast negative space, sparse immense rock ribs | Muted violet; distant fractured monolith |

Retain the same Torchbearer, fire colors, interaction language, and threat readability in all regions. Water, moving shelves, and cavern scale need separate gameplay and performance validation before production expansion.

## 11. Asset delivery contract

Use names such as `chr_torchbearer_lod0.glb`, `ene_hunter_lod0.glb`, `env_cat_wall_4m_a.glb`, `prop_brazier_a.glb`, `tex_cat_stone_basecolor.webp`, and `vfx_torch_flame_atlas.png`. Keep editable sources separately from shipped assets. Use unique IDs; do not rename another agent's imported asset without updating its manifest.

Each asset entry must record ID, owner, revision, source/license, units, dimensions, pivot, sockets, collision references, materials, texture sizes, animation names, LODs, triangle count, and approval status. Supply GLB for runtime geometry, optimized supported textures, and editable sources when available. Mark color textures as sRGB and data maps as linear in the loader; validate normal-map convention. Avoid absolute filesystem references inside assets.

Starting budgets below are **provisional planning limits**, not measured performance claims. Profile the real slice on a named reference machine before treating them as contracts.

| Category | Initial target |
|---|---|
| Torchbearer | 12–20k triangles at LOD0; 1–2 material slots; 2K maximum primary texture |
| Hunter | 8–16k triangles; 1–2 materials; limited transparent edge area |
| Secondary enemy | 5–12k triangles; normally one material |
| Common prop | 100–2,000 triangles; shared materials where possible |
| Visible scene | Start below 400k triangles and 180 draw calls; profile CPU and GPU separately |
| Textures | Common environment sets 1K; 2K for justified focal assets; mipmaps enabled |
| Dynamic effects | Pooled particles; cap count and transparent screen coverage per quality tier |

Use instancing for repeated kit pieces, region streaming, frustum culling, and explicit disposal of unloaded resources. Reuse material instances. Add LODs where they improve measured cost. Track compressed download size and decoded GPU memory separately. Target 60 FPS / 16.7 ms on the selected desktop reference and a graceful 30 FPS / 33.3 ms low tier. A beautiful screenshot is insufficient validation.

## 12. Agent assignments and integration order

**Art / visual owner:** owns this style contract, hero assets, materials, lighting presets, VFX, and reference captures. Publish one approved benchmark room before mass asset production.

**World owner:** assembles kit, landmarks, sockets, collision, occlusion, streaming, and navigation. Validate clearance before decorative dressing.

**Gameplay owner:** publishes torch modes, fuel thresholds, interaction durations, character dimensions, and state transitions. Owns mechanical truth independent of graphics settings.

**AI owner:** publishes threat dimensions, visibility rules, state cues, and animation event requirements. Review every threat tell against actual behavior.

**UI / progression owner:** implements HUD, journal, sanctuary screens, feedback, scaling, and accessible cue alternatives using the shared palette.

**QA / integration owner:** records seeds, build revision, browser, machine, graphics settings, frame timing, draw calls, and failure captures. Checks production assets and license provenance.

Integrate in this order: benchmark room → Torchbearer and camera → three torch states and Hunt lighting → Hunter readability → full slice kit and landmarks → HUD and VFX → performance pass. Do not expand biomes before the slice's visual and gameplay gates pass.

## 13. Art acceptance gates

- Capture the identical benchmark camera in Ember, Steady, Blaze, low fuel, Hunt, and sanctuary states. Compare visual identity and navigability across quality tiers.
- Inspect the player and each enemy in silhouette and grayscale at actual gameplay size. Identity must survive removal of bloom and particles.
- Walk the complete 10–12-room route during a forced Hunt. Nearby geometry, chalk, and unobstructed sanctuary fire remain useful; walls still occlude distant light sources.
- Test a Hunter approach, pursuit, lost line of sight, relight, and sanctuary escape. Visual reach and movement match collision and state transitions.
- Verify landmarks from both travel directions. Consecutive junctions must remain distinguishable after a return trip.
- Check glTF scale, pivots, texture color spaces, animation transitions, door seams, stair collision, camera clipping, and transparent sorting.
- Test enlarged UI, reduced flash, reduced shake, directional sound indicators, low graphics, and a dim display. Essential warnings remain available without color alone.
- Profile a representative pursuit with particles and room streaming active in the production build. Record CPU/GPU timings and memory over repeated expeditions.
- Confirm every sourced asset has a license record. Generated concepts require modeling and runtime validation before being listed as implemented assets.

## 14. Copy-ready instruction for build agents

> Implement THE LAST LIGHT using this art bible and its companion concept board as the visual contract. Preserve the supplied game mechanics, fairness rules, and Three.js browser target. Begin with one Catacombs benchmark room, a readable cloaked Torchbearer, all three torch modes, and navigable Hunt darkness. Establish scale, sockets, asset manifests, material conventions, and state-event interfaces before expanding the kit. Use original production assets or documented compatible licenses. Treat the concept board as an aesthetic reference; do not substitute it for interactive geometry. Ship a complete Catacombs expedition before biome expansion. Supply reference captures, a named performance test configuration, license records, and remaining issues. Do not claim art completion from compilation or screenshots alone.
