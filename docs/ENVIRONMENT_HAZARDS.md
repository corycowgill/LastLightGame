# Environment dangers

## Player decisions

- **Loose bones:** an original catalog bone-pile GLB marks a noisy floor patch. Moving upright triggers a crunch; crouching or skirting it avoids the disturbance.
- **Hanging chains:** three catalog chain GLBs form a readable curtain. Cross upright and they rattle; crouch beneath or go around. Chains are a sound hazard, not an invisible wall.
- **Cold vents:** a catalog rubble patch emits soft blue-gray vapor. Each seeded ten-second cycle has five quiet seconds, two warning seconds and three active seconds. Active vapor reduces movement speed to 55% of its otherwise applicable speed and drains stamina at 0.32 per second before ordinary recovery. Water slowdown still applies. Waiting or taking the clear edge avoids exposure. Vents do not inflict health damage or extinguish torches.

These dangers make haste and escape routes matter. They do not spawn enemies, secretly spend resources, or replace fair Hunter hearing and navigation.

## Architecture and art pipeline

`environment-hazards.ts` plans deterministic, nonblocking patches after reward and Bell Crypt decoration placement. At most one per eligible room; rooms 0/1, sanctuaries and rewards are excluded. A patch requires clear floor with 1.5m padding and prop clearance. Unsafe placements are omitted rather than forced. No new navigation walls or save geometry migration is needed. Vent timing derives from saved expedition elapsed time and the world seed.

`simulation.ts` applies contact radius 1.25m, loudness 15, 2.2-second audible duration and four-second per-patch retrigger cooldown. Noise uses existing AI sound investigation. Warnings appear within five metres with line of sight. Crouching is honored from keyboard, controller and touch through the shared input system. Vent state advances on the fixed simulation clock, including during a Hunt; pause freezes it.

`hazard-visuals.ts` reuses `dre_small_bone_pile`, `dre_chain_short` and `pro_rubble` from the existing catalog. These are original generated GLB assets with the provenance already recorded in the catalog pipeline. No new primitive substitute props or external generation jobs were used. Vapor is a visual effect: 36 pooled vertices per vent, one shared soft radial texture, no lights or shadows added. Expedition disposal releases geometry/materials/texture normally.

`audio.ts` adds positional bone/chain contacts and a bounded nearby vent hiss, muffled by walls. Environmental contacts are not falsely labeled as enemy footsteps. Text warnings also expose the hazard state.

## Verification

139 automated tests pass. New checks cover deterministic placement and reward/sanctuary clearance across 100 seeds, exact warning/discharge boundaries, crouch/no-movement counterplay, repeat-contact throttling, unchanged fuel consumption, stamina effects and an out-of-view Hunter investigating a loud environmental contact. The 100-seed extinction/escape diagnostic and production build pass.

Browser review used diagnostic `?debug&seed=1&hazard=vapor` and `hazard=chains` fixtures, which remove enemies and position the player near a hazard. Vent visuals/warnings and an upright crossing of the chains were inspected through normal controls. These targeted checks do not establish ordinary-run difficulty, subjective headphone quality or physical-device performance. Long-run human balancing remains a follow-up.
