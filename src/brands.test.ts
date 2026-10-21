import assert from "node:assert/strict";
import test from "node:test";
import { BRAND_CONFIG, brandRepels, stepBrands, tryDropBrand } from "./brands";

const setup = () => ({
  fuel: 120,
  cooldown: 0,
  brands: [],
  player: { x: 0, z: 0 },
  yaw: 0,
  nextId: 1,
  walkable: () => true,
});

test("a dropped brand trades fifteen fuel seconds for eighteen stationary seconds", () => {
  const options = setup();
  const result = tryDropBrand(options);
  assert.ok(result.ok);
  assert.equal(result.fuel, 30);
  assert.equal(result.cooldown, 24);
  assert.equal(result.brand.remaining, 18);
  assert.ok(Math.abs(result.brand.z - 0.6) < 1e-9);
  assert.equal(result.brand.x, 0);
  assert.equal(options.fuel, 120);
});

test("invalid placement, insufficient fuel and repeat attempts do not spend fuel", () => {
  for (const [override, reason] of [
    [{ walkable: () => false }, "placement"],
    [{ fuel: 95 }, "fuel"],
    [{ cooldown: 1 }, "cooldown"],
    [{ brands: [{ id: 9, x: 0, z: 0, remaining: 1 }] }, "active"],
  ] as const) {
    const options = { ...setup(), ...override };
    assert.deepEqual(tryDropBrand(options), { ok: false, reason });
    assert.equal(options.fuel, override.fuel ?? 120);
  }
});

test("brand placement stops before thin walls even when ground beyond is valid", () => {
  const result = tryDropBrand({
    ...setup(),
    walkable: (_x, z) => z < 0.25 || z > 0.4,
  });
  assert.ok(result.ok);
  assert.equal(result.brand.z, 0.2);
  const atFeet = tryDropBrand({ ...setup(), walkable: (_x, z) => z === 0 });
  assert.ok(atFeet.ok);
  assert.equal(atFeet.brand.z, 0);
});

test("brand protection ends exactly at expiry and cannot reach through walls", () => {
  const brands = [{ id: 1, x: 0, z: 0, remaining: BRAND_CONFIG.lifetime }];
  const target = { x: 3, z: 0 };
  assert.equal(brandRepels(brands, target, () => true)?.id, 1);
  assert.equal(
    brandRepels(brands, target, () => false),
    undefined,
  );
  assert.equal(
    brandRepels(brands, { x: 4.01, z: 0 }, () => true),
    undefined,
  );
  assert.equal(stepBrands(brands, 17.9).length, 1);
  assert.deepEqual(stepBrands(brands, 18), []);
  assert.equal(brands[0].remaining, 18);
  assert.equal(
    brandRepels([{ ...brands[0], remaining: 0 }], target, () => true),
    undefined,
  );
});

test("a last-fuel brand remains useful after extinction and Hunt grace", () => {
  const result = tryDropBrand({ ...setup(), fuel: 96 });
  assert.ok(result.ok);
  assert.equal(result.fuel, 6);
  const afterGrace = stepBrands([result.brand], 10);
  assert.equal(afterGrace[0].remaining, 8);
  assert.equal(
    brandRepels(afterGrace, { x: 0, z: 2 }, () => true)?.id,
    result.brand.id,
  );
});
