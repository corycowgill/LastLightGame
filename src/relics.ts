// Three authored votives per emblem family; one per chamber, never repeated in a run.
const VOTIVES = [
  {
    name: "The Bell Without a Tongue",
    story: "Its keeper cut away the tongue so the dead could never answer.",
    color: "#b7dbe2",
    glyph: "bell",
  },
  {
    name: "The Widow's Last Ember",
    story: "A wedding offering, kept warm by hands that never came home.",
    color: "#f1bd73",
    glyph: "ember",
  },
  {
    name: "The Blind Saint's Tear",
    story: "The saint covered her eyes before the first light failed.",
    color: "#c8b4ed",
    glyph: "tear",
  },
  {
    name: "The Ferryman's Debt",
    story:
      "One passage was paid for. Two names were scratched into the silver.",
    color: "#a8d9c3",
    glyph: "coin",
  },
  {
    name: "The Child's Vigil",
    story: "A small votive asks the fire to stay awake until morning.",
    color: "#f0d5ac",
    glyph: "candle",
  },
  {
    name: "The Warden's Broken Oath",
    story:
      "The promise was to seal the door. The scratches are on its inner face.",
    color: "#d4b2ac",
    glyph: "key",
  },
  {
    name: "The Drowned Choir's Handbell",
    story:
      "Water filled the lower nave mid-hymn. The bell still rings when it rains.",
    color: "#9fc7cf",
    glyph: "bell",
  },
  {
    name: "The Coal From the First Pyre",
    story:
      "Carried down in a clay cup to light the crypt. It was never meant to go out.",
    color: "#f2a964",
    glyph: "ember",
  },
  {
    name: "The Mourner's Glass Tear",
    story:
      "Hired mourners wept into these. This one was filled by someone who meant it.",
    color: "#b9c4ec",
    glyph: "tear",
  },
  {
    name: "The Gravedigger's Wage",
    story: "Paid twice for the same grave. The second coin is bitten through.",
    color: "#c9d0a2",
    glyph: "coin",
  },
  {
    name: "The Unlit Taper of Saint Ide",
    story:
      "She asked that it never be lit until the last of her order returned.",
    color: "#ead9b8",
    glyph: "candle",
  },
  {
    name: "The Ossuary Key",
    story:
      "It fits every bone-house lock in the crypt, and one door that has no lock.",
    color: "#cdb59a",
    glyph: "key",
  },
  {
    name: "The Plague Bell of Low Marren",
    story:
      "Rung before each cart of the dead. The village rang it for itself last.",
    color: "#a9bfd6",
    glyph: "bell",
  },
  {
    name: "The Smith's Banked Fire",
    story:
      "A forge ember sealed in iron, so the trade would not die with the town.",
    color: "#e99b5f",
    glyph: "ember",
  },
  {
    name: "The Anchoress's Tear",
    story:
      "Walled into the crypt by choice. She wept once, on the day they forgot her.",
    color: "#d0b8e6",
    glyph: "tear",
  },
  {
    name: "The Toll for the Dark Road",
    story:
      "Left on the eyes of a pilgrim who walked deeper instead of resting.",
    color: "#b3d6c1",
    glyph: "coin",
  },
  {
    name: "The Lantern-Wife's Stub",
    story:
      "She walked the passages nightly. This is all that was left of her last round.",
    color: "#f3dfb6",
    glyph: "candle",
  },
  {
    name: "The Key to the Inner Sanctuary",
    story:
      "The sanctuary it opens has never been found. The fire inside, they say, still burns.",
    color: "#dbbba4",
    glyph: "key",
  },
] as const;
export type VotiveGlyph = (typeof VOTIVES)[number]["glyph"];

/** Authored identities vary by seed; visuals remain the licensed catalog GLB. */
export function relicIdentity(
  seed: number,
  item: { id: number; encounter?: string },
) {
  if (item.encounter === "reliquary")
    return {
      name: "The Three Unburied Names",
      story:
        "Three names were hidden beneath the seal. Someone kept tending their fire after the crypt was abandoned.",
      color: "#f5cc77",
      glyph: "votive" as const,
      model: "pro_artifact",
    };
  // Each chamber holds one relic (ids 2i/2i+1), so stepping the chamber index
  // by a stride coprime with the pool never repeats a votive within a run.
  const chamber = Math.floor(item.id / 2);
  const offset = (Math.imul(seed | 0, 31) >>> 0) % VOTIVES.length;
  const identity = VOTIVES[(offset + chamber * 5) % VOTIVES.length];
  return { ...identity, model: "pro_artifact" };
}
