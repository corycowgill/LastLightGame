# Team review: discoveries and sustained danger

Date: 2026-10-20. Scope: style/readability, engagement/balance, and horror audio.

Three agents reviewed and implemented separate workstreams against shared simulation interfaces. Integration retained the existing fuel rates, movement speeds, procedural layout and graphics budget. This pass does not add conventional combat or replace neural GLB assets with procedural characters.

| Review | Finding | Implemented response |
| --- | --- | --- |
| Style | Tiny relics and supply-like caskets blend into dressing. | Larger original catalog GLB relics, colored emissive surfaces, depth-tested soul motes, a relic crest above the sealed casket; no extra light or shadow maps. |
| Discovery | Generic currency makes exploration feel interchangeable. | Six named votive identities and a seventh sealed discovery, authored stories, named/value interaction prompts, a short recovery reveal and journal progress. Stories bank at fire. |
| Challenge | A lone Hunter does not escalate a prolonged evasion. | An answering warning after 12 active-Hunt seconds; a second Hunter can arrive after 22 seconds. Maximum two. Invalid spawn candidates retry every 3 seconds. |
| Fairness | Additional enemies could create unavoidable captures. | Second spawn is off-camera, navigable, at least 24 navigation metres from the player, over 12 metres from the first Hunter, and farther from sanctuary than the player. It uses independent sight/hearing/memory and the same movement/collision rules. |
| Sound | Timer footsteps can imply movement when creatures stop. | Distance-based contacts for every Hunter and Stalker; player surface/crouch/boots variations; actual audible contacts drive the optional directional captions. |
| Sound | Loud beds obscure useful threats. | Quieter Hunt music, threat-driven ambience ducking, wall muffling, camera-relative stereo, restrained stone reflections, chain/stone disturbances and failing-flame sputtering. Existing generated sample provenance remains unchanged. |
| Integration | Centered framing hides nearby discoveries. | Modest shoulder offset and forward framing, retaining wall and ceiling collision checks. |

## Safety and persistence

Relighting makes both Hunters retreat. Golden fire banishes both immediately, including when banking ends the simulation before its next tick. The second Hunter and its remembered target/timers persist across refresh. A new Hunt resets escalation. Additional Hunter graphics preload before play, so arrival does not start a model download.

The goal is more pressure for remaining in darkness, not an unavoidable swarm or a secret resource penalty. Fuel drain, oil yields and upgrade prices are unchanged. This is a second instance of the Hunter archetype, not a new creature design.

## Reproduce and validate

- `npm test`: 105 passing tests, including secondary spawn timing/position, perception, pursuit/capture, immediate sanctuary safety, saved memory and artifact identity. Audio tests cover contact timing, stopping/teleports, stereo and wall muffling. Visual tests cover bounded effects and material ownership.
- `npx tsx tools/check-expeditions.ts 100`: 100 extinction/Hunt/escape routes pass. This diagnostic typically escapes before escalation; dedicated reinforcement tests exercise the second Hunter.
- `npm run build`: production build passes (existing Three.js chunk size warning remains).
- `?debug&seed=104729&encounter=reliquary`: named approach prompt and timed three-relic collection reviewed in the browser. The resulting story appears in the journal. These shortcuts clear the Stalker for art review.
- The debug menu's **REVIEW SECOND HUNTER · PRIMARY HELD** fixture holds the original Hunter banished, places the player in an ossuary, and lets the real escalation clock and spawn rules run. It isolates renderer/audio integration; it is not a two-Hunter difficulty evaluation. Browser review observed the additional Hunter enter pursuit, emitted directional footstep captions and caught the stationary fixture player at approximately 31 simulation seconds. That sample ran around 57 FPS (recent p95 18.1 ms) without console warnings/errors. It does not demonstrate a human two-Hunter escape.

Human fun/difficulty assessment, sustained two-Hunter evasion, final headphone mix and physical iPhone/Xbox validation remain review tasks. Automated outcomes do not establish those subjective or device-specific results.
