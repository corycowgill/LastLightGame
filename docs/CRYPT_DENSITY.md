# Catacombs density and layout pass

The previous 18-metre chambers had only a handful of isolated perimeter props. This pass gives non-sanctuary rooms a burial function: eight shelf positions per chamber, each rendered as three stacked niches, with alternating occupied shelves, skulls, concentrated funerary urn groups, carved stone lids and rubble. Existing crypt coffins were moved into side groups instead of crossing the central routes. Decorative archive doors were moved away from corridor mouths.

Three new catalog GLBs use original ComfyUI reference art and the serial TRELLIS pipeline: `arc_wall_niche_2m` (18k triangles), `dre_urn_broken` (10k) and `dre_sarcophagus_lid` (12k), with embedded textures up to 1K. The niche source produced one cavity rather than three, so three copies make the burial tiers. The urn candidate is intact despite its original catalog ID; it is used as a funerary urn, not claimed as broken. The lid has an eroded figure relief. They remain integration drafts; definitions, hashes, seeds and source/preparation records are preserved.

Burial shelves have shared bounds for simulation navigation and camera collision. The player and Hunter cannot walk through them. The central three-metre cross aisles remain clear, and sanctuary-to-sanctuary paths are tested across seeds. The browser expedition driver now uses the same obstacle-aware pathfinder rather than building a separate route from raw floor cells.

The generated RGBA atlas `public/textures/crypt-decals.png` supplies soot, mineral seepage, cracked mortar and ground dirt. Decals use native transparent render surfaces, as authorized by the user; they are generated raster art rather than procedural CanvasTexture stains. GLB webs and solid props remain. Regional instancing shares the burial mesh and decal atlas and culls distant batches.

## Decal generation provenance

Built-in imagegen tool. Original output retained in the local generated-images directory; the project copy preserves alpha. Final prompt:

> A game production RGBA decal atlas for an ancient damp catacomb. Square image divided into an exact 2 by 2 grid of equal quadrants. Four ISOLATED surface decals, each centered entirely within its quadrant with at least 12% empty transparent margin. Upper left: asymmetric black soot and dusty charcoal smear, ragged feathered edges. Upper right: long hanging dark green brown mineral seepage and dirty water rivulets, subtle gray salt deposits. Lower left: branching dark hairline cracks and chipped mortar debris, no solid background. Lower right: irregular dark brown dirt, old dust and scattered tiny stone chips ground stain. True transparent background throughout gaps and margins. No background stone wall or floor, no surrounding scene, no labels or grid lines, no text, no lighting, no painted shadows, no skulls, no blood. Realistic restrained grunge textures, flat orthographic front view, diffuse unlit pigment intended to blend over existing 3D masonry and paving in a torchlit horror game. Deliberately natural irregular silhouettes. This single atlas will be sampled per quadrant as four decals.

## Verification

51 TypeScript tests, including furniture collision, sanctuary connectivity, deterministic density, original simulation/input/animation tests and GLB provenance. Production build passes with the existing Three.js chunk-size warning. Browser seed 104729 completed extinction, active Hunt, obstacle-aware escape and sanctuary in 1:00. Actual art-review view observed about 60 FPS / 174 draws on this desktop, not a sustained device benchmark. Physical iPhone/Xbox validation remains pending.

Use `/?debug&seed=104729&dressing` for the repeatable real-game art view, or `/asset-review.html` for the individual meshes. This makes the current modular catacombs substantially denser; it does not claim final photorealism or completion of the entire art catalog.
