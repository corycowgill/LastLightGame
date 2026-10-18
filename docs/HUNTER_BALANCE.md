# Hunter behavior and depth balance

## Light response

The Hunter now enters FLEEING when threatened by visible flame. Torch protection radii are Ember 2.8m, Steady 6m, Blaze 11m. Sanctuary fire repels within 8m when line of sight is clear. Successful relighting starts a 2.8-second navigated retreat before banishment rather than immediately removing the creature. A fleeing Hunter cannot capture the player. Retreat goals must be navigable and their initial route must not approach the threatening light. Cornered Hunters recoil instead of teleporting through a wall.

Relighting still takes time and remains dangerous: a Hunter already within catching distance can reach you before the torch catches. Existing sanctuary safety, off-camera spawn rules, collision and perception remain. Blocked cells are now excluded from spawn candidates.

## Difficulty progression

Pressure follows the nearest chamber's depth along the expedition. At the deepest room, fuel burn is 30% higher, Hunter sight is 15% longer, memory increases from 12 to 16 seconds, and chase speed rises from 4.5 to 5.05m/s. Player sprint stays 5.5m/s, leaving a speed advantage that still requires stamina management and breaking sight. Starting fuel and the opening eight-second grace remain unchanged.

The Stalker investigates farther and moves from 1.8 toward 2.3m/s deeper down. Close contact drains a Steady torch as well as Ember; crouching, spacing and Blaze provide counterplay. The HUD reports deeper-air fuel pressure and journal fuel estimates include it. No random hidden fuel theft or forced extinction was added.

## Animation

`tools/assets/hunter_motion.py` bakes six authored skeleton clips into the existing generated Hunter GLB: idle, search, pursue, flee, capture and banish. Search has a deliberate head sweep; pursuit has a stronger stride/torso counter-motion; flee has a guarded arm posture. Movement-facing turns replace omniscient facing toward the player. Extra runtime bobbing and excessive legacy clip-speed multipliers were removed. Geometry, rig source and texture provenance are retained. These are authored animations, not NVIDIA-generated motion.

## Validation

55 TypeScript tests and eight Python asset tests pass; production build passes. Tests cover navigated retreat, capture exclusion while recoiling, delayed banishment, line-of-sight light protection, sanctuary fire, depth pressure and sprint escape speed. In debug mode CHECK HUNTER RETREAT starts a repeatable real-game relight encounter; the browser visibly reached FLEEING and then BANISHED. RUN EXPEDITION CHECK remains the full extinction/escape/sanctuary route.

This is a tested balance pass, not a conclusion that difficulty is final. Longer human playtests and physical controller/mobile checks remain valuable. Current mesh skinning and motion still have reconstruction/art-polish limits.
