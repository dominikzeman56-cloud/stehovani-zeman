import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const target = path.join(srcRoot, `${specifier.slice(2)}.ts`);
    return nextResolve(pathToFileURL(target).href, context);
  },
});

const { boxVolumeM3, fitsCargo, spaceCheck } = await import("./space.ts");
const { MAX_VOLUME_M3, PACK_EFFICIENCY } = await import("../data/catalog.ts");

describe("spaceCheck", () => {
  it("prázdný soupis nic nehlásí", () => {
    assert.equal(spaceCheck(0), null);
    assert.equal(spaceCheck(Number.NaN), null);
  });

  it("málo kusů: dost místa", () => {
    const check = spaceCheck(8);
    assert.equal(check?.status, "enough");
    assert.ok((check?.reserve ?? 0) > 0);
  });

  it("pásma podle potřebného prostoru při skládání", () => {
    const full = MAX_VOLUME_M3 * PACK_EFFICIENCY;
    assert.equal(spaceCheck(full * 0.84)?.status, "enough");
    assert.equal(spaceCheck(full * 0.9)?.status, "tight");
    assert.equal(spaceCheck(full * 0.99)?.status, "tight");
    assert.equal(spaceCheck(full * 1.05)?.status, "edge");
    assert.equal(spaceCheck(MAX_VOLUME_M3)?.status, "edge");
    assert.equal(spaceCheck(MAX_VOLUME_M3 + 0.1)?.status, "over");
  });

  it("rezerva je záporná, když prostor nestačí, a fill roste s objemem", () => {
    const over = spaceCheck(MAX_VOLUME_M3 + 1);
    assert.ok((over?.reserve ?? 0) < 0);
    assert.ok((over?.fill ?? 0) > 1);
    assert.equal(spaceCheck(MAX_VOLUME_M3 / 2)?.fill, 0.5);
  });

  it("soupis zákaznice z poptávky: 13,3 m³ se vejde, ale těsně", () => {
    const check = spaceCheck(13.29);
    assert.equal(check?.status, "tight");
    assert.ok(Math.abs((check?.needed ?? 0) - 16.6) < 0.1);
  });
});

describe("boxVolumeM3 a fitsCargo", () => {
  it("objem komody 130 × 110 × 40 cm", () => {
    assert.ok(Math.abs(boxVolumeM3(130, 110, 40) - 0.572) < 1e-9);
  });

  it("neplatné nebo nulové rozměry dají 0", () => {
    assert.equal(boxVolumeM3(0, 10, 10), 0);
    assert.equal(boxVolumeM3(-1, 10, 10), 0);
    assert.equal(boxVolumeM3(Number.NaN, 10, 10), 0);
  });

  it("skříň 250 cm se vejde, 600 cm ne, kus se může otočit", () => {
    assert.equal(fitsCargo(250, 100, 60), true);
    assert.equal(fitsCargo(600, 50, 50), false);
    assert.equal(fitsCargo(200, 120, 500), true);
    assert.equal(fitsCargo(220, 220, 220), false);
  });
});
