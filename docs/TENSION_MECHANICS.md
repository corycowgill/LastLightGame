# Relic tension and misdirection

## Whispering sealed votive

Recovering the existing sealed reliquary enables an 18-second cry cycle while carrying unbanked artifacts more than five metres from both sanctuary fires. The final three seconds give a text warning and a restrained whisper cue. At the pulse, crouching without movement input and with actual movement speed below 0.15 m/s muffles it. Otherwise a 2.5-second loud noise feeds normal AI hearing at the player's position. No fuel tax, enemy teleportation or additional spawn occurs. Banking or losing carried artifacts stops the pressure; sanctuary pauses the cycle.

This makes the optional three-relic reward harder to bring home while preserving ordinary early-relic recovery. The opening prompt discloses that it whispers when carried. Relic timing and curse state persist in saves. Older saves default to no curse.

## Distraction stones

Each expedition begins with three stones. T, Xbox D-pad Up or touch STONE throws one along camera heading up to eight metres, stopping before the first nonwalkable/occluded point. A throw shorter than two metres fails without consuming stock. Valid throws cost one stone, have a five-second cooldown, and create a two-second sound event. A small pooled catalog rubble GLB marks impact; there is no projectile physics or bespoke throwing animation in this pass.

Hunters within 16m and navigation distance under 24m investigate the impact only when they cannot see or hear the player. They retain the target with six seconds of search memory. Each Hunter evaluates it independently. Stalkers without a player detection investigate reachable nearby impacts; fire retreat retains priority. Stones cannot damage or banish creatures. There is no unlimited replenishment. Stock/cooldown persist; the brief active impact is not restored after reload.

Xbox D-pad Down zooms out; LT + D-pad Down zooms in. D-pad menu navigation is unchanged. Input tests verify throw edges do not repeat while held. Touch adds an eighth action button in the existing four-column grid.

## Sound and validation

A bounded heartbeat interval tightens from roughly one second toward half a second as an active threat approaches within twelve metres during HUNT_ACTIVE. It is a proximity tension cue, not a line-of-sight detector. The existing positional enemy footsteps remain the directional information. Whispers and impact cues use Web Audio synthesis; no new audio model outputs are claimed.

151 automated tests pass, including finite stock/cooldown, valid landing, unchanged fuel drain, Hunter investigation versus direct sight priority, warning timing, stationary crouch suppression, movement rejection, sanctuary safety, persistence and controller edge handling. Production build and 100 seeded diagnostic escape scenarios pass. Targeted browser fixtures remove enemies and are interaction/UI checks rather than ordinary difficulty playthroughs. Physical-device checks and subjective headphone/pacing review remain open.
