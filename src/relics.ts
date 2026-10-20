const VOTIVES = [
  {
    name: "The Bell Without a Tongue",
    story: "Its keeper cut away the tongue so the dead could never answer.",
    color: "#b7dbe2",
  },
  {
    name: "The Widow's Last Ember",
    story: "A wedding offering, kept warm by hands that never came home.",
    color: "#f1bd73",
  },
  {
    name: "The Blind Saint's Tear",
    story: "The saint covered her eyes before the first light failed.",
    color: "#c8b4ed",
  },
  {
    name: "The Ferryman's Debt",
    story:
      "One passage was paid for. Two names were scratched into the silver.",
    color: "#a8d9c3",
  },
  {
    name: "The Child's Vigil",
    story: "A small votive asks the fire to stay awake until morning.",
    color: "#f0d5ac",
  },
  {
    name: "The Warden's Broken Oath",
    story:
      "The promise was to seal the door. The scratches are on its inner face.",
    color: "#d4b2ac",
  },
] as const;

/** Authored identities vary by seed; visuals remain the licensed catalog GLB. */
export function relicIdentity(
  seed: number,
  item: { id: number; encounter?: string },
) {
  const identity =
    item.encounter === "reliquary"
      ? {
          name: "The Three Unburied Names",
          story:
            "Three names were hidden beneath the seal. Someone kept tending their fire after the crypt was abandoned.",
          color: "#f5cc77",
        }
      : VOTIVES[
          ((Math.imul(seed | 0, 31) + item.id * 7) >>> 0) % VOTIVES.length
        ];
  return { ...identity, model: "pro_artifact" };
}
