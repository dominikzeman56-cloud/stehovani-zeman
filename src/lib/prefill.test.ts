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

const { buildPrefillSearch, parsePrefill } = await import("./prefill.ts");

describe("parsePrefill", () => {
  it("přečte soupis, patra, výtah, donášku a adresy", () => {
    const p = parsePrefill(
      "?items=pracka:2,mycka:1&check=pracka&ff=0&ft=2&lt=none&ct=40&from=Rapšach&to=Kienberg&fp=48.8792,14.9329,cz&tp=47.9424,15.1136,at",
    );
    assert.ok(p);
    assert.deepEqual(p.cart, { pracka: 2, mycka: 1 });
    assert.deepEqual(p.check, ["pracka"]);
    assert.equal(p.floorsTo, 2);
    assert.equal(p.liftTo, "none");
    assert.equal(p.carryTo, 40);
    assert.equal(p.toPoint?.country, "at");
    assert.equal(p.toPoint?.label, "Kienberg");
  });

  it("zahodí neznámé položky, ořízne počty a patra", () => {
    const p = parsePrefill("?items=neexistuje:3,pracka:500,mycka:abc,susicka&ft=99&ct=9999");
    assert.ok(p);
    assert.deepEqual(p.cart, { pracka: 99, susicka: 1 });
    assert.equal(p.floorsTo, 30);
    assert.equal(p.carryTo, 300);
  });

  it("check obsahuje jen položky, které v soupisu jsou", () => {
    const p = parsePrefill("?items=pracka:1&check=pracka,mycka");
    assert.deepEqual(p?.check, ["pracka"]);
  });

  it("špatný výtah a souřadnice se ignorují, země mimo obsluhované také", () => {
    const p = parsePrefill("?items=pracka:1&lt=raketa&fp=abc,def&tp=40.7,-74,us");
    assert.equal(p?.liftTo, undefined);
    assert.equal(p?.fromPoint, undefined);
    assert.equal(p?.toPoint, undefined);
  });

  it("bez užitečného obsahu vrátí null", () => {
    assert.equal(parsePrefill(""), null);
    assert.equal(parsePrefill("?utm_source=mail"), null);
    assert.equal(parsePrefill("?items=neexistuje:1"), null);
  });

  it("osobní údaje se z odkazu nečtou", () => {
    const p = parsePrefill("?items=pracka:1&name=Jan&phone=602663183&email=a@b.cz") as Record<string, unknown> | null;
    assert.ok(p);
    for (const key of ["name", "phone", "email"]) assert.equal(key in p, false);
  });
});

describe("buildPrefillSearch", () => {
  it("je opakem parsePrefill", () => {
    const original = {
      cart: { pracka: 2, komoda: 5 },
      check: ["komoda"],
      floorsFrom: 0,
      floorsTo: 2,
      liftTo: "none" as const,
      carryFrom: 10,
      from: "Rapšach",
      to: "Kienberg u Gaming",
      fromPoint: { lat: 48.8792, lon: 14.9329, country: "cz", label: "Rapšach" },
      toPoint: { lat: 47.9424, lon: 15.1136, country: "at", label: "Kienberg u Gaming" },
    };
    const back = parsePrefill(buildPrefillSearch({ ...original }));
    assert.deepEqual(back?.cart, original.cart);
    assert.deepEqual(back?.check, original.check);
    assert.equal(back?.floorsFrom, 0);
    assert.equal(back?.floorsTo, 2);
    assert.equal(back?.carryFrom, 10);
    assert.equal(back?.to, "Kienberg u Gaming");
    assert.deepEqual(back?.toPoint, original.toPoint);
  });
});
