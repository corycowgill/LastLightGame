# Dungeon dressing: generated GLBs

This supersedes the first atmosphere pass. Every dungeon dressing object now loads a catalog GLB reconstructed by TRELLIS.2 from original project reference art. No web planes, web shader, CanvasTexture grime, damp overlays or procedural dressing geometry remain in `dungeon-dressing.ts`. Seeded placement remains code; it places the generated assets rather than generating their shapes.

| Asset | Geometry | Embedded texture maximum | Runtime file |
|---|---:|---:|---|
| Torn corner cobweb | 24,000 triangles | 1024px | public/models/catalog/dec_corner_cobweb.glb |
| Skeletal remains | 24,000 triangles | 1024px | public/models/catalog/dre_small_bone_pile.glb |
| Crypt skull | 12,000 triangles | 1024px | public/models/catalog/dre_crypt_skull.glb |
| Rusted chain | 15,998 triangles | 1024px | public/models/catalog/dre_chain_short.glb |

The web is reconstructed geometry with depth and open gaps, not a textured rectangle packaged as GLB. Its source reference is the original generated RGBA web art, retained in the shared library at `references/props/dec_corner_cobweb.png`. The unused runtime PNG has been removed. The existing catalog ID now records the explicit neural reconstruction override from its former decal method.

The bones, skull and chain reuse their original neural sources with higher-detail Blender reductions and higher-resolution embedded textures. No new shape was manually authored. Skeletons are laid on the floor and grounded after loading. Two unlit candle references remain rejected because they contained flames; no decorative fire or hiding mechanic was added.

Source/reference hashes, generation backend, prompts/seeds where applicable, and preparation records are in `docs/catalog-assets/`. Earlier low-detail candidates remain in the library for history, not runtime use. All assets remain integration drafts pending further art review; higher polygon counts alone do not certify final quality.

## Review and validation

`/?debug&seed=104729&dressing` starts at a repeatable art-review position using the actual game renderer. Normal games retain the sanctuary start. `/asset-review.html` includes all four GLBs. The regression suite verifies that every dressing placement has a neural GLB manifest entry and that the web has geometry across all three dimensions. Existing navigation and sanctuary safety remain authoritative.

The broader game still uses procedural level layout, lighting, fire and particles as gameplay systems. This correction concerns the dungeon art props, not those systems. Physical iPhone/Xbox and sustained performance review remain pending. Generated masonry and character deformation still have visible reconstruction limitations.
