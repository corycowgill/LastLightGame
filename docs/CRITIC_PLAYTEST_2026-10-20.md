# Critic playtest — 20 October 2026

Baseline: live https://lastlightgame.onrender.com/, build `60ef608`. Review conducted through the normal desktop UI in Chrome. No debug URL, teleport, infinite fuel, automated escape route, or hidden game-state API was used. Existing browser progress included five banked relics; this was not a clean first-ever account.

## What I actually played

1. Began an ordinary expedition (journal seed **670247**). Walked from refuge through a flooded procession and passages into burial shelves. Used WASD, arrow camera rotation, Ember/Steady/Blaze, chalk, journal, and E interactions. Claimed **The Bell Without a Tongue**. Continued until fuel extinction, traversed darkness during the Hunt, and died. Death screen reported **1:54 expedition time**, one carried relic lost and five existing banked relics preserved.
2. Selected Descend Again. Encountered a different entry approach with rubble at the doorway. Traversed corridors into a flooded room. Used E to relight twice, gathered a match, claimed **The Ferryman's Debt**, and attempted retreat. Paused the second run with one relic, one match, and nine percent fuel remaining so developers could inspect the same view.

This was a task-driven automated-input critic playtest, not a human skill study or ten-minute pacing validation. Browser observation/tool overhead consumed fuel between actions. Exact key-hold timing is therefore unsuitable as a balance benchmark. A completed banked expedition was not achieved during this review.

## Verdict

The named votives, warm stone, burial shelves, and finite flame create a coherent horror premise. Recovering a relic is the clearest enjoyable moment: the name, short story, and bank-at-fire instruction give the pickup meaning. At present, challenge too often comes from fighting the framing and recognizing walkable openings. Fix that before increasing Hunter count or fuel drain. Players need to understand the risk they chose and the mistake that killed them.

## Priority improvements sent to the implementation team

### P0 — Camera must preserve a readable escape route

Firsthand: arch lintels and side walls repeatedly dominated the image at narrow transitions. After backing up in the flooded room, the player's hood/torso filled nearly the whole screen. This hides geometry precisely when remaining fuel demands quick decisions.

Action: center the shoulder framing in tight passages; improve obstacle response; fade the avatar when the camera compresses close to the body. Check forward/backward movement and both turn directions at room-to-corridor thresholds. Do not solve this by disabling collision or removing the architecture.

Proof: `C:/Users/coryc/.codex/visualizations/2026/10/17/01a147d8-a76c-75e3-ba03-44de4443efb8/critic-camera-occlusion-60ef608.png`.

### P1 — Stage the first thirty seconds around discovery

Firsthand: starting W movement pointed into a solid panel slightly right of the exit. The second attempt also met doorway rubble that needed an additional strafe. The generic SEEK THE GOLDEN FIRE instruction is ambiguous while standing at the starting golden fire. I spent substantial early fuel identifying the passage, without knowing which direction would lead to a first meaningful discovery.

Action: orient spawn and camera down an open, validated exit; protect that first approach from large props; stage one introductory relic in the first reachable exploration room. Give one concise find/claim/return objective, changing it after collection. Preserve optional deeper rewards rather than marking every item on an omniscient map.

### P1 — Darkness should conceal danger without concealing basic movement

Firsthand: after extinction, the nearest turn was difficult to read and the central hood silhouette competed with the corridor. Death followed without an attacker clearly visible in the sampled observations. That does not establish unfair AI perception, but does establish weak information at the moment of failure.

Action: improve local cold dark adaptation and ground/edge contrast, keeping distant geometry dark. Supply truthful nearby threat direction cues as an accessibility option. Keep real sight and navigation rules independent of display brightness.

### P1 — Explain the loss and teach counterplay

Firsthand: death said only that darkness found me. It did not distinguish Hunter capture from another creature. The screen said unbanked discoveries remain in the Catacombs, suggesting recoverability that this review did not verify.

Action: track the actual capture cause and present one appropriate tip (break sight, use flame, crouch/listen, relight). Say that carried relics were lost unless a recovery mechanic really exists. Retain clear reassurance that banked progress survives.

### P2 — Make relighting feel like an escape opportunity

Firsthand: E was clearly prompted, consumed a match, and restored flame correctly. The first relight retained Blaze and the next observation already showed only five percent fuel. The second Steady relight was more usable, restoring approximately eighteen percent before continued drain. Observation overhead exaggerates the duration, so this is a qualitative usability finding rather than a measured fuel-duration defect.

Action: consider returning a newly lit torch to Steady or Ember, or prominently communicate the reserve gained and preserved mode. Test whether a player can choose and execute a short escape after a match. Do not simply grant unlimited safety.

## Graphics and style

Strengths observed: warm/cold palette separation, consistent carved stone, shelf-mounted skulls and bones, distinct flooded-room hint, readable ivory silhouette, polished typography and relic story card. The Bell's blue glimmer made it discoverable once the camera exposed it. Preserve those features.

Weaknesses observed: repeated arch silhouettes make adjacent corridor transitions hard to distinguish; nearby stone can become harshly bright in Blaze while the route beyond stays difficult to parse; flame shapes look relatively solid and geometric compared with the environment. These are secondary to camera readability. Avoid adding clutter into traversable center lines as a substitute for atmosphere.

## Sound and atmosphere

I could not hear the browser's actual audio through the available tool output and therefore cannot honestly judge its mix, bass, sample quality, perceived scariness, headphone spatialization, or loudness. No claim of listening validation is made.

Firsthand visual evidence: the optional caption **A chain shifting to your left** communicated a distinct environmental event. Water's noise warning and relighting messages communicated relevant rules. These should supplement real audible information, not replace it.

Code corroboration (separate from play): `audio.ts` contains movement footsteps, water-specific layers, wall-muffled directional cues, Hunter cue layers, and environmental stone/chain events. Their existence does not establish that they sound convincing.

Action for an audio developer: verify no silent first transient on extinction/emergence/death; ensure actual nearby enemy footfalls remain intelligible against ambience; keep ambient metal/stone distinct from real approaching footsteps; provide captions for real threat movement without revealing enemies through walls. A human headphone pass remains required before calling the mix successful.

## Handoff and limits

Findings were sent to the root developer as they emerged so camera, gameplay, and audio work could start before the final report. The browser was released paused on the second ordinary run (browser **1**, tab **14524412**). No viewport override was changed.

Still unverified: a normal completed banked run, long-Hunt second-Hunter fairness, ten-minute human pacing, physical Xbox/iPhone controls, sustained frame rate, and subjective sound quality. Improvements should be tested against these findings rather than treated as proof those limits are resolved.
