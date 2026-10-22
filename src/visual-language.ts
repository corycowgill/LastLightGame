import type { Game } from "./simulation";
import { lineOfSight } from "./simulation";
import { vaporPhase } from "./environment-hazards";
import { relicIdentity } from "./relics";
export type Glyph =
  | "bell"
  | "ember"
  | "tear"
  | "coin"
  | "candle"
  | "key"
  | "votive"
  | "oil"
  | "match"
  | "crouch"
  | "walk"
  | "web"
  | "rubble"
  | "bones"
  | "chain"
  | "vapor"
  | "ear"
  | "lock"
  | "fire";
const paths: Record<Glyph, string> = {
  bell: '<path d="M9 23h30l-4-7v-5a11 11 0 0 0-22 0v5zM19 29a5 5 0 0 0 10 0M24 4V1"/>',
  ember:
    '<path d="M25 3c2 13-15 14-13 26 1 15 26 16 27-1 0-7-5-12-7-14 1 10-8 12-7 3-1-5 1-10 0-14z"/>',
  tear: '<path d="M24 4C20 15 10 22 10 30a14 14 0 0 0 28 0C38 22 28 15 24 4zM17 30c0 5 3 7 7 7"/>',
  coin: '<circle cx="24" cy="24" r="18"/><circle cx="24" cy="24" r="13"/><path d="m27 13-9 13h12l-9 10"/>',
  candle:
    '<path d="M18 21h12v20H18zM12 42h24M24 4c-8 8-6 14 0 14s8-6 0-14zM24 22v6"/>',
  key: '<circle cx="17" cy="15" r="10"/><circle cx="17" cy="15" r="3"/><path d="m24 23 16 16-4 4-4-4-4 1-1-4-4-1"/>',
  votive:
    '<path d="M6 36h36v7H6zM9 17h7v19H9zM21 12h7v24h-7zM33 17h7v19h-7zM12 4v8M24 1v6M36 4v8"/>',
  oil: '<path d="M18 7h12v8l7 7v19H11V22l7-7zM17 4h14M15 29h18M24 20v6"/>',
  match:
    '<path d="m10 39 23-26M18 43l21-25"/><circle cx="35" cy="10" r="5"/><circle cx="41" cy="15" r="4"/>',
  crouch:
    '<circle cx="27" cy="10" r="5"/><path d="m23 18-9 10 14 1 9 13M23 18l10 7h9M15 29l-7 12h15"/>',
  walk: '<circle cx="26" cy="8" r="5"/><path d="m25 16-4 13 10 12M21 29l-8 13M24 18l10 7h8M24 18l-10 6H7"/>',
  web: '<path d="M24 3v42M3 24h42M9 9l30 30M9 39 39 9M24 10l10 4 4 10-4 10-10 4-10-4-4-10 4-10zM24 17l5 2 2 5-2 5-5 2-5-2-2-5 2-5z"/>',
  rubble:
    '<path d="m4 38 5-15 12 1 6 18H4zM23 19l5-13 11 8 5 24-16-2M9 18l4-8M34 42h10"/>',
  bones:
    '<path d="m14 12 22 22M12 14l22 22M10 7c-7-2-7 9-1 9-2 7 9 8 9 1M38 31c7-1 7 9 1 9 1 6-9 7-9 0"/>',
  chain:
    '<rect x="17" y="2" width="14" height="20" rx="7"/><rect x="17" y="26" width="14" height="20" rx="7"/><path d="M24 15v18"/>',
  vapor:
    '<path d="M8 40h32M13 32c-10-8 8-10 0-20M24 32c-10-8 8-10 0-26M35 32c-10-8 8-10 0-20"/>',
  ear: '<path d="M15 29C3 6 38 0 37 20c0 9-12 8-12 17-1 10-13 9-13 1M17 21c-3-11 15-13 13-1l-7 6"/>',
  lock: '<rect x="10" y="21" width="28" height="23" rx="3"/><path d="M16 21V12a8 8 0 0 1 16 0v9M24 30v6"/>',
  fire: '<path d="M25 3c2 13-15 14-13 26 1 15 26 16 27-1 0-7-5-12-7-14 1 10-8 12-7 3-1-5 1-10 0-14z"/>',
};
export function glyphSvg(glyph: Glyph, color = "currentColor") {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[glyph]}</svg>`;
}
export function relicGlyph(
  seed: number,
  item: { id: number; encounter?: string },
): Glyph {
  return relicIdentity(seed, item).glyph;
}
export function visualCue(g: Game):
  | {
      glyph: Glyph;
      action: Glyph;
      label: string;
      progress: number;
      urgent: boolean;
    }
  | undefined {
  if (g.activeInteraction)
    return {
      glyph: "lock",
      action: "votive",
      label: "OPENING",
      progress: 1 - g.activeInteraction.remaining / g.activeInteraction.total,
      urgent: false,
    };
  if (g.tensionHint)
    return {
      glyph: "ear",
      action: "crouch",
      label: "BE STILL",
      progress: 1 - g.relicPulse / 3,
      urgent: true,
    };
  if (g.phase === "RELIGHTING")
    return {
      glyph: "match",
      action: "fire",
      label: "RELIGHTING",
      progress: 1 - g.phaseTimeRemaining / g.relightDuration,
      urgent: false,
    };
  if (g.mist?.exposure > 0.4)
    return {
      glyph: "vapor",
      action: g.matches > 0 && g.fuel <= 0 ? "match" : "fire",
      label: g.mist.exposure >= 0.65 ? "CHOKING MIST" : "MIST CLOSING",
      progress: g.mist.exposure,
      urgent: true,
    };
  if (g.phase.includes("HUNT") || g.phase === "EXTINGUISHING")
    return {
      glyph: "ear",
      action: g.matches > 0 ? "match" : "fire",
      label: "THE HUNT",
      progress: g.phase === "HUNT_GRACE" ? 1 - g.phaseTimeRemaining / 8 : 1,
      urgent: true,
    };
  const h = g.hazards
    .filter(
      (h) =>
        !h.burned &&
        Math.hypot(h.x - g.player.x, h.z - g.player.z) < 5 &&
        lineOfSight(g.world, g.player, h),
    )
    .sort(
      (a, b) =>
        Math.hypot(a.x - g.player.x, a.z - g.player.z) -
        Math.hypot(b.x - g.player.x, b.z - g.player.z),
    )[0];
  if (h) {
    const glyph: Glyph = (
      {
        webs: "web",
        bones: "bones",
        chains: "chain",
        vapor: "vapor",
        rubble: "rubble",
      } as const
    )[h.kind];
    return {
      glyph,
      action:
        h.kind === "vapor" ? "walk" : h.kind === "rubble" ? "walk" : "crouch",
      label:
        h.kind === "vapor"
          ? vaporPhase(h, g.elapsed).toUpperCase()
          : h.kind === "webs"
            ? "BURIAL SILK"
            : h.kind.toUpperCase(),
      progress:
        h.kind === "webs"
          ? (h.burnProgress ?? 0) / 2
          : h.kind === "vapor"
            ? ((g.elapsed + h.offset) % 10) / 10
            : 0,
      urgent: h.kind === "vapor" && vaporPhase(h, g.elapsed) !== "quiet",
    };
  }
  if (g.fuel / g.maxFuel < 0.1)
    return {
      glyph: "fire",
      action: "oil",
      label: "LOW FUEL",
      progress: (g.fuel / g.maxFuel) * 10,
      urgent: true,
    };
  return undefined;
}
