# Dungeon atmosphere pass

Reviewed the shared 221-entry graphics catalog and its art bible. The catalog's bone pile, crypt skull and short chain are now generated GLBs used in the actual game. They remain integration drafts. The bone reference produced a ribcage/spine rather than a loose heap; it is laid on the floor, with a separate nearby skull. A 2,500-triangle skeleton candidate visibly damaged the ribs; runtime uses the 12,000-triangle candidate. Skull and chain each use about 2,500 triangles. No replacement prop geometry was manually created.

Two unlit-candle references were rejected because both contained flames. They were preserved in the library and omitted from gameplay. No new decorative fire source or hiding mechanic was introduced.

Torn webs collect above side recesses; skeletal remains are clustered in neglected corners rather than spread uniformly. Rusted chains hang along the sides. Sanctuaries have no human remains around the safe fire. Seeded placement preserves the three-metre central lanes. Damp and grime are native transparent material overlays, while masonry instances receive restrained cool color variation to reduce uniform clean repetition. These changes do not alter AI perception, navigation or sanctuary rules.

## Web texture

Project file: `public/textures/corner-cobweb.png`, 768px RGBA. Original full-size output remains in the local generated-images directory. Generated with the built-in imagegen tool, resized for browser use with alpha preserved. Rendered as a lit, double-sided transparent texture with a dusty neutral material response; not a reconstructed solid web mesh.

Final generation prompt:

> Create a single game-ready transparent RGBA texture for an abandoned dark fantasy catacomb: a neglected, irregular triangular corner cobweb, delicate dusty ivory and gray silk strands, a few thicker radial threads and torn sagging wisps, uneven organic spacing, realistically fragile and old. Web spans from upper left corner to upper right and lower left, leaving lower right largely empty. Orthographic front view, flat texture intended on a transparent plane in a 3D game lit by torchlight. Only spider silk, NO spider, NO architecture, NO wall, NO background, NO lighting glow, NO shadow behind web, NO frame, NO text. Visible thin strands with generous transparent holes and true transparent background. Subtle natural dusty strands, not clean concentric perfect Halloween icon. Save a project-bound texture for The Last Light.

## Review

`/?debug&seed=104729&dressing` starts a new expedition at a repeatable art-review location using the actual game renderer. Normal games keep the sanctuary start. `/asset-review.html` includes all three new solid props. Source/reference hashes, prompts, seeds, provider jobs and preparation records are in `docs/catalog-assets/dre_*`.

This improves dressing and surface age; it does not claim photorealism or final production approval. Existing neural masonry and character deformation still have visible reconstruction limitations. Physical device and sustained performance review remain pending.
