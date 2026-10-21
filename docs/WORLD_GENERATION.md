# Seeded catacomb layouts

## Current generation: version 4

Version 4 adds optional closed return gates and Bell Crypt placement; the underlying floor masks remain unchanged. Older saves preserve upgrades, bank carried relics and archive discoveries before resetting stale coordinates.

Six handcrafted floor masks now replace the shared square footprint. Every room retains clear cardinal connections, while side alcoves, dry routes, rubble gaps and ceiling heights vary by design. Corridors are one two-metre cell wide. GLB furniture is filtered against the floor mask; structural doorposts share collision and rendering placement. Tall ossuaries carry interior pillars; low passages avoid blocking pillar arrangements. Wet floor GLBs use a separate tinted material batch.

Navigation validates room-centre connectivity across 200 seeds. The complete diagnostic extinction/Hunt/escape driver passes 100 seeds. This is route and state-machine validation, not a human difficulty or pacing score.

Version 3 and older saves retain upgrades and bank carried relics before restarting at the new entrance, avoiding stale geometry and AI coordinates. Current saves retain expedition state.

## Historical generation 2

Generation version 2 replaces the fixed eleven-room snake with 12–18 chambers on a bounded grid. The opening refuge and first eastward passage remain consistent for learning the controls; the rest of the room positions, connections and destination vary by seed.

`src/worldgen.ts` grows a connected room graph with nonoverlapping footprints, then adds adjacent loop connections. Cardinal corridors never cross unrelated rooms. A breadth-first traversal chooses a farthest destination sanctuary and assigns route-based depth. Optional dead ends contain relics and oil. Resources vary among clear central positions and the Stalker lair follows the generated rooms. Rendering continues to use existing catalog GLBs and decals.

The Bone Warrens favor burial rooms, the Drowned Tombs favor flooded chambers with teal ambient light, and the Ashen Archive favors library rooms, longer procession growth and muted violet ambience. These are themed mixes inside the Catacombs, not three new fully authored biomes. Room footprints still share the same basic chamber modules; there is no endless streaming or multi-floor generation yet.

Tests check deterministic output, size/theme/destination diversity, duplicate footprints and all room-centre navigation paths over 200 seeds. `npx tsx tools/check-expeditions.ts 20` follows real simulation paths through collection, forced extinction, an active Hunt and sanctuary, including the Stalker. Its diagnostic driver waits through the grace period near the final escape corridor so short and long layouts both exercise the Hunt. It is not a human pacing or difficulty evaluation.

Generation is versioned in saves. Fixed-map saves keep permanent upgrades, safely bank carried relics and return to the new entrance; stale old-map item/chalk/AI coordinates are discarded. Current-generation saves retain their normal expedition state.
