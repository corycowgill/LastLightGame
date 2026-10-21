# Visual gameplay UX

The goal is understanding through shape, motion and sound during movement, while keeping stories and detailed reference material available outside the immediate action.

## Relic graphics

`visual-language.ts` supplies original SVG line emblems using a consistent 48-unit grid. No copyrighted icon pack or external raster generator was used. The six ordinary emblems use the exact same seed/item identity mapping as the authored relic names. The sealed three-name votive has its own seventh emblem.

The same emblem appears as a small depth-tested world sprite above the existing catalog GLB, in a four-second pickup reveal, in the HUD pouch, and in the current-expedition journal gallery. World emblems remain occluded by walls; they are not an omniscient navigation marker. Existing model geometry and motes remain. A sealed reward contributes three relic units but one discovery emblem. The pouch shows at most six recent carried discoveries; numeric inventory remains authoritative. The gallery shows all recovered item identities in the current expedition, with stories; permanent story banking remains in the archive text.

Oil/match pickups use their own illustrations, short labels and brief distinct audio cues. The resource cues trigger from actual inventory increases; no new audio model output is claimed. Pickup instructions pair the active input label with a symbol and short item name.

## Gameplay cues

A compact danger-to-response card replaces repeated hazard prose with illustrated bones/chains/webs/rubble/vapor and crouch/walk responses. Active vent phases and cursed-votive warnings gain warm urgency; opening and relighting have rings driven by actual simulation progress. Priority is timed interaction, votive warning, relighting, Hunt, nearby visible hazard, low fuel. Shape, action pose and short label accompany color. Full descriptions remain in accessible status text and the journal.

Routine duplicate notices are visually clipped only when a replacement cue is active. Failure messages and unrelated notices remain visible. Active opening prose is accessible but visually replaced by the progress card. Reduced-motion preference disables warning pulses and pouch arrival animation. No simulation balance or enemy perception changes were made.

## Journal and layout

Recovered emblems form a gallery. The long controls/survival reference is collapsed by default. The overlay uses top-safe scrolling with automatic margins so oversized panels do not clip the heading above the viewport. Compact rules fit cue cards and emblems to short landscape displays; physical iPhone checks remain open.

## Validation and limits

155 tests and production build pass. New tests verify six distinct ordinary emblems, the special sealed emblem, timed-action progress, warning response and Hunt counterplay with/without matches. Chrome diagnostic fixture `?debug&seed=1&encounter=reliquary` exercised opening, collection and gallery. That fixture removes enemies, so it is not ordinary difficulty validation. Physical-device testing, subjective headphone mixing and first-time comprehension testing remain open. The emblems are illustrative graphics, not newly generated unique 3D relic models.
