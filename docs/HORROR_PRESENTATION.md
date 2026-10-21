# Horror presentation pass

Request: “Keep improving the graphics I want it to be scarier.”

The original Hunter GLBs and animations remain in use. A material shader darkens their textured surface with slowly moving tonal bands; no vertices, skeletons or hitboxes change. Each actual Hunter has 28 depth-tested shadow particles rising around its torso. The shroud fades during retreat, and existing red eyes remain untouched. Effects follow real actor visibility rather than introducing phantom enemies.

Mist uses one instanced draw with a maximum of 96 nearby clouds. A shared seeded 32×32 noise texture supplies three layers of rolling detail. Height, scale and phase vary by position; cleared cells disappear through the existing gameplay density field. Selection is refreshed at four Hz, while motion interpolates every rendered frame. The original field still controls exposure, fire clearing and coughing independently of rendering.

An initial arithmetic noise shader was replaced with texture sampling and the old 160-cloud pool reduced to 96. This limits effect work, but is not evidence that overall frame rate improved.

## Validation and limits

Production build and 163 existing tests pass. Browser review covered the seeded web corridor and the actual Hunter retreat scenario. No shader errors were observed. The corridor measured 46–49 FPS; the much larger Choir of Bones retreat scene measured 17–22 FPS with roughly 390 draw calls and 18.8 million submitted triangles including shadow passes. That large-room cost remains unresolved; this is not a 60 FPS certification or a controlled before/after benchmark. Physical iPhone and Xbox review remains open.

Next graphics priority: profile large-room geometry and point-light shadow submission, retaining authored props and readable escape routes.
