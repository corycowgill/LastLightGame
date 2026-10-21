# Environment dangers

## Extension: burial webs and unstable rubble

Burial webs use the catalog `dec_corner_cobweb` GLB fitted into a small curtain. Upright movement inside 1.25m falls to 35% speed; crouching bypasses entanglement. Two uninterrupted seconds of nearby (under 3m), unobstructed Blaze burn a permanent opening. No additional fuel tax is applied beyond the normal Blaze rate. Progress resets when the player moves out of range, lowers the flame or loses sight. Burned patch IDs are saved; visuals shrink during burning and hide once cleared. The journal explains this choice.

Unstable rubble reuses `pro_rubble`. Sprinting across it reduces speed to 55% and causes a loud stumble costing 0.22 stamina, at most once per four seconds per patch. Walking/crouching are safe. It does not block navigation, cause direct death or change fuel consumption. The existing AI noise system hears the disturbance.

Selection now cycles kinds by successful placement count and seed. The old room-index cycle correlated with room designs and omitted some archetypes when furniture clearance rejected those rooms. A generated-world coverage test prevents regression. At most one hazard per eligible room remains; older saves stay compatible because no physical navigation geometry is changed. An absent burned-web list defaults to uncleared patches.

Validation now totals 145 passing tests, including continuous Blaze requirements, crouch bypass, no burning with a dark/distant torch, no extra fuel cost, rubble retrigger limits, all-five-type placement coverage and cleared-web save/load. The 100-seed escape diagnostic and production build pass. Browser fixture `?debug&seed=1&hazard=webs` supports targeted visual/clearing review; enemies are removed in that fixture, so it is not an ordinary difficulty playthrough.

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
