# Expedition choices

Implemented from the comparison review: a memorable relic encounter, an escape tool and an earned shortcut. The purpose is to give players decisions beyond simply following corridors.

## Burning brand

G, Xbox RB or touch BRAND drops a preloaded original catalog torch GLB. While exploring it costs 90 fuel units (15 base Steady seconds), requires at least 96 units, and leaves the handheld torch lit. During HUNT_GRACE/HUNT_ACTIVE it instead consumes exactly one match and leaves the handheld torch out. This trades a match that could relight the stronger mobile torch for instant stationary protection.

The brand lasts 18 simulation seconds, protects within four metres with unobstructed line of sight, and has a 24-second cooldown. Only one can be active. Hunters retreat temporarily, then resume searching; it does not grant permanent banishment or sanctuary recovery. Stalkers flee from the actual flame position. Nearby brand light can sustain a 3.5-second noisy sealed-relic opening. Movement or loss of light cancels opening.

Xbox RB now places the brand; D-pad right cycles to the next flame mode, while LB/D-pad left select the previous mode. The field guide and journal explain costs and state.

## Bell Crypt

The seeded planner selects an existing removable loop edge beyond the opening rooms. Its closed gate never disconnects the world; opening must save at least two room graph steps. It prefers appropriate crypt rooms where possible. A 500-layout survey found 366 eligible layouts; this encounter is optional, not guaranteed on every expedition.

Its sealed votive unlocks the gate. Players can return through the longer route quietly or raise the gate for a shorter route and an audible disturbance. Nearby Hunters investigate according to normal perception and navigation. Opening clears the physical blocker, camera proxy and navigation caches together. A catalog fallen-bell GLB is placed only where floor, props and rewards allow safe clearance. Existing door/chain/bell models are reused; no generated replacement primitive props or new inference services were introduced.

## Implementation and persistence

`brands.ts` owns resource/placement/lifetime rules. `expedition-encounter.ts` plans deterministic loop encounters. `simulation.ts` integrates collision, AI, interaction and save state. `encounter-visuals.ts` pools the brand mesh, a shadowless light and twelve embers. Audio adds bounded positional crackle and gate movement cues.

Save generation is now 4. Older saves preserve upgrades, safely bank carried relics and archive discoveries, then reset stale expedition coordinates. Current saves preserve gate state, valid active-brand remaining life and cooldown.

## Validation and limits

133 automated tests pass, including closed-gate connectivity across 30 seeds, 500-layout planner validation, real navigation shortening, Hunter noise investigation, line-of-sight protection, both Hunters resuming after retreat, match/fuel accounting and save/load. The 100-seed deterministic extinction/escape scenario and production build pass.

Browser review used `?debug&seed=1&encounter=shortcut&recovered` and normal G/E input to place a brand and open the gate. The `recovered` diagnostic flag grants the votive and removes enemies, so this is interaction/render review, not an ordinary difficulty playthrough. `?debug&seed=1&encounter=reliquary` reviews the sealed reward. Headphone mix, human pacing and physical Xbox/iPhone validation remain open.
