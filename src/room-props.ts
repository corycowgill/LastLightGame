export type RoomProp = {
  id: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  yaw: number;
};
/** Shared placement authority for rendered furniture and its solid footprint. */
export function roomProps(x: number, z: number, kind: string): RoomProp[] {
  const out: RoomProp[] = [];
  const add = (id: string, dx: number, dz: number, yaw = 0, scale = 1, y = 0) =>
    out.push({ id, x: x + dx, y, z: z + dz, scale, yaw });
  add("pro_barrel", -6.8, 5.8);
  add("pro_supply_crate", -6, 5.8, 0.3);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) add("pro_pillar", sx * 7.8, sz * 7.8);
  if (kind === "sanctuary") {
    add("lan_sanctuary_arch_hero", 8.2, 0, -Math.PI / 2);
  } else if (kind === "flooded") {
    add("lan_fallen_bell", 7.7, -5.8);
    add("lan_split_pillar_relief", -7.8, -5.5, Math.PI / 2);
  } else if (kind === "archive") {
    add("lan_sealed_sun_door", 8.3, -4.5, -Math.PI / 2);
    for (const side of [-1, 1]) {
      add("pro_crypt_door", side * 5.5, 8.5, Math.PI);
      add("pro_journal", side * 5.1, 5.3, 0, 0.9, 0.1);
    }
  } else if (kind === "crypt") {
    for (const side of [-1, 1])
      for (const i of [-1, 1])
        add(
          i === 1 ? "lan_hiding_tomb" : "pro_sarcophagus",
          side * 5.5,
          i * 5.7,
          Math.PI / 2,
        );
  } else if (kind === "landmark") {
    add("lan_split_pillar_relief", -7.8, 5, Math.PI / 2);
    add("lan_broken_processional_dais", -7.7, -5.5);
    add("lan_artifact_pedestal", -7.7, -5.5, 0, 1, 0.55);
  }
  return out;
}
