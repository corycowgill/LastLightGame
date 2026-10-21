# Living mist

## Gameplay

The mist is a persistent scalar density field aligned with navigable two-metre floor cells, not a cosmetic fog switch. Each cell begins at 0.62 density outside sanctuary space. Nearby density updates at five Hz, refilling at 0.045/second or clearing at 1.6/second when reached by unobstructed fire. Only cells within 24m of the player update. Pausing freezes the simulation.

Torch clear radii are 2.5m / 4.5m / 7m for Ember / Steady / Blaze. This creates a moving pocket while walking. Sanctuary fires clear eight metres, active brands four. Fire clearing requires line of sight, so a torch does not clear the far side of a wall. The mist returns gradually behind the player and after extinction. This is local regrowth, not fluid dynamics or physically advected smoke.

Exposure rises at 0.055 times local density per second and recovers at 0.32/second in fire or thin mist. The 0.4 threshold adds a mist-to-fire visual warning. At 0.65, an unprotected Torchbearer can cough once every six seconds. Coughs are actual seven-metre sound pulses evaluated by existing Hunter perception/navigation. They do not reveal the player globally, bypass walls for sight, increase Hunter speed or create enemies. Breathing/cough cues use bounded Web Audio effects.

Movement scales by 1 minus exposure times 0.08. Maximum mist-only sprint is 5.06m/s versus a 4.5m/s Hunter chase. Existing water, web and rubble modifiers still apply: choosing routes matters. Mist does not directly kill or consume fuel. Fire immediately suppresses coughing; exposure then fades rather than resetting invisibly. A match, a brand or sanctuary is meaningful recovery. Ordinary hiding is still possible before the next cough, and sound decoys remain useful.

Density values, exposure and cough cooldown persist in saves. Older saves without mist data receive the initial field; no geometry migration is needed. Invalid density payloads are bounded/ignored. Save precision is one percent per cell.

## Rendering

`mist-visuals.ts` uses one instanced draw of at most 160 camera-facing cloud quads, selected from nearby floor cells. Shader motion, soft elliptical edges and density-dependent alpha create cloud banks. Quads are depth tested, fade near the camera and beyond 15–22m, and do not write depth. Local clearings use the same density field as gameplay. No new shadow lights or post-processing buffers are added. This is an environmental visual effect, not a replacement prop or character asset.

The field is intentionally bounded and low to preserve landmarks, chalk and distant fires. The renderer is approximate: translucent intersections are not volumetric ray-marched fog. Physical-phone GPU cost and long-session balancing remain open.

## Validation

161 tests pass, including fire clearing, occlusion, gradual refill, warning-before-cough exposure, recovery, sanctuary safety, density persistence/invalid inputs, sprint margin and a nearby out-of-view Hunter investigating a cough. The 100-seed extinction/escape scenario and production build pass. Chrome diagnostic review saw the torch-cleared space and surrounding mist at around 57 FPS with no shader errors; this is a single-room observation. Debug H was used to inspect extinction. These are scoped checks, not a human difficulty benchmark.
