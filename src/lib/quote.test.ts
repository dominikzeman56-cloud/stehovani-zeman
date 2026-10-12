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

const { computeQuote, readManualKm } = await import("./quote.ts");
const { FLOOR_RATES, ITEMS, MAX_VOLUME_M3, PRICE_PER_KM, TRIP_PRICE } = await import("../data/catalog.ts");

type QuoteInput = Parameters<typeof computeQuote>[0];

const route = {
  approachKm: 10,
  moveKm: 25,
  returnKm: 15,
  approachMin: 12,
  moveMin: 30,
  returnMin: 18,
};

const shuttle = {
  approachKm: 10,
  moveKm: 4.5,
  returnKm: 6,
  approachMin: 8,
  moveMin: 5,
  returnMin: 7,
};

function item(id: string) {
  const found = ITEMS.find((entry) => entry.id === id);
  if (!found) throw new Error(id);
  return found;
}

function vatCrowns(net: number) {
  const halere = net * 21;
  const whole = Math.floor(halere / 100);
  return halere % 100 >= 50 ? whole + 1 : whole;
}

function quoteOf(partial: Partial<QuoteInput>) {
  return computeQuote({
    cart: {},
    floorsFrom: 0,
    floorsTo: 0,
    liftFrom: "none",
    liftTo: "none",
    legs: null,
    includeApproach: true,
    includeReturn: true,
    useManual: false,
    manualKm: 0,
    ...partial,
  });
}

describe("readManualKm", () => {
  it("bere čárku jako desetinnou čárku a nulu nechává nulou", () => {
    assert.equal(readManualKm(""), 0);
    assert.equal(readManualKm("  "), 0);
    assert.equal(readManualKm("0"), 0);
    assert.equal(readManualKm("0,0"), 0);
    assert.equal(readManualKm("85,5"), 85.5);
    assert.equal(readManualKm("85.5"), 85.5);
    assert.equal(readManualKm("-3"), -3);
    assert.equal(Number.isNaN(readManualKm("abc")), true);
  });
});

describe("computeQuote", () => {
  it("spočítá happy path: patra z obou stran, pračku, trasu a DPH", () => {
    const quote = quoteOf({
      cart: { karton_s: 2, pracka: 1, klavir: 1 },
      floorsFrom: 2,
      floorsTo: 1,
      liftFrom: "none",
      liftTo: "passenger",
      legs: {
        approachKm: 12.5,
        moveKm: 40,
        returnKm: 13.5,
        approachMin: 15,
        moveMin: 40,
        returnMin: 16,
      },
    });

    assert.equal(quote.volume, 2.17);
    assert.equal(quote.weight, 449);
    assert.equal(quote.trips, 1);
    assert.equal(quote.tripFee, TRIP_PRICE);
    assert.equal(quote.items, 40 * 2 + 280 + 3600);
    assert.equal(quote.floors, FLOOR_RATES.light * 2 * 2 + FLOOR_RATES.heavy * 3 + FLOOR_RATES.very_heavy * 3);
    assert.equal(quote.handling, 200);
    assert.equal(quote.distanceKm, 66);
    assert.equal(quote.moveTimes, 1);
    assert.equal(quote.transport, 1320);
    assert.equal(quote.net, 10350);
    assert.equal(quote.vat, 2174);
    assert.equal(quote.vat, vatCrowns(quote.net));
    assert.equal(quote.gross, 12524);
    assert.equal(quote.overweight, false);
    assert.equal(quote.manual, false);
  });

  it("další jízdu přidá až po překročení 18,73 m³, přesný násobek zůstane", () => {
    assert.equal(quoteOf({ cart: { skrin_pos: 8 } }).trips, 1);
    assert.ok(quoteOf({ cart: { skrin_pos: 8 } }).volume <= MAX_VOLUME_M3);
    assert.equal(quoteOf({ cart: { skrin_pos: 9 } }).trips, 2);
    assert.equal(quoteOf({ cart: { skrin_pos: 9 } }).tripFee, TRIP_PRICE * 2);

    const exact = quoteOf({
      extras: [{ id: "e", name: "Bedna", qty: 1, vol: MAX_VOLUME_M3, weight: 10, wCat: "light" }],
    });
    assert.equal(exact.trips, 1);

    const justOver = quoteOf({
      extras: [{ id: "e", name: "Bedna", qty: 1, vol: MAX_VOLUME_M3 + 0.01, weight: 10, wCat: "light" }],
    });
    assert.equal(justOver.trips, 2);

    const twoFull = quoteOf({
      extras: [{ id: "e", name: "Bedna", qty: 2, vol: MAX_VOLUME_M3, weight: 10, wCat: "light" }],
    });
    assert.equal(twoFull.volume, MAX_VOLUME_M3 * 2);
    assert.equal(twoFull.trips, 2);
  });

  it("účtuje patro podle váhové třídy a osobní výtah jen u těžkých", () => {
    const lightPassenger = quoteOf({
      cart: { karton_s: 3, kreslo: 2 },
      floorsFrom: 4,
      floorsTo: 3,
      liftFrom: "passenger",
      liftTo: "passenger",
    });
    assert.equal(lightPassenger.floors, 0);

    const stairs = quoteOf({
      cart: { karton_s: 3, kreslo: 2 },
      floorsFrom: 4,
      floorsTo: 3,
    });
    assert.equal(stairs.floors, FLOOR_RATES.light * 7 * 3 + FLOOR_RATES.medium * 7 * 2);

    const heavyPassenger = quoteOf({
      cart: { pracka: 1, klavir: 1 },
      floorsFrom: 4,
      floorsTo: 3,
      liftFrom: "passenger",
      liftTo: "passenger",
    });
    assert.equal(heavyPassenger.floors, FLOOR_RATES.heavy * 7 + FLOOR_RATES.very_heavy * 7);
    assert.equal(heavyPassenger.handling, 200);

    const freight = quoteOf({
      cart: { pracka: 1, klavir: 1, karton_s: 2 },
      floorsFrom: 5,
      floorsTo: 5,
      liftFrom: "freight",
      liftTo: "freight",
    });
    assert.equal(freight.floors, 0);
    assert.equal(freight.handling, 200);

    const oneSide = quoteOf({
      cart: { klavir: 1, karton_s: 1 },
      floorsFrom: 3,
      floorsTo: 2,
      liftFrom: "none",
      liftTo: "freight",
    });
    assert.equal(oneSide.floors, FLOOR_RATES.very_heavy * 3 + FLOOR_RATES.light * 3);

    assert.equal(quoteOf({ cart: { klavir: 1 } }).floors, 0);
    assert.equal(
      quoteOf({ cart: { karton_s: 1 }, floorsFrom: 40, floorsTo: -2 }).floors,
      FLOOR_RATES.light * 30,
    );
  });

  it("odpojení pračky a myčky je 200 Kč za kus a patra jdou zvlášť", () => {
    const quote = quoteOf({
      cart: { pracka: 2, mycka: 1, susicka: 1 },
      floorsFrom: 1,
      floorsTo: 1,
    });
    assert.equal(item("susicka").handling, undefined);
    assert.equal(quote.handling, 200 * 2 + 200);
    assert.equal(quote.floors, FLOOR_RATES.heavy * 2 * 4);
    assert.equal(quote.items, 280 * 2 + 260 + 250);
  });

  it("násobí trasu stěhování počtem jízd, nájezd a návrat jen jednou", () => {
    const both = quoteOf({ cart: { skrin_pos: 10 }, legs: shuttle });
    assert.equal(both.trips, 2);
    assert.equal(both.distanceKm, 25);
    assert.equal(both.moveTimes, 2);
    assert.equal(both.transport, 25 * PRICE_PER_KM);
    assert.equal(both.minutes, 8 + 5 * 2 + 7);

    assert.equal(quoteOf({ cart: { skrin_pos: 10 }, legs: shuttle, includeApproach: false }).distanceKm, 15);
    assert.equal(quoteOf({ cart: { skrin_pos: 10 }, legs: shuttle, includeReturn: false }).distanceKm, 19);
    assert.equal(
      quoteOf({
        cart: { skrin_pos: 10 },
        legs: shuttle,
        includeApproach: false,
        includeReturn: false,
      }).distanceKm,
      9,
    );
  });

  it("ruční kilometry přepíšou celou trasu a nenásobí se jízdami", () => {
    const quote = quoteOf({
      cart: { skrin_pos: 10 },
      legs: shuttle,
      useManual: true,
      manualKm: readManualKm("15,5"),
    });
    assert.equal(quote.trips, 2);
    assert.equal(quote.manual, true);
    assert.equal(quote.distanceKm, 15.5);
    assert.equal(quote.moveTimes, 1);
    assert.equal(quote.approachKm, 0);
    assert.equal(quote.returnKm, 0);
    assert.equal(quote.transport, 310);
  });

  it("nula v ručních km vynuluje dopravné a nenechá trasu", () => {
    const quote = quoteOf({
      cart: { karton_s: 1 },
      legs: route,
      useManual: true,
      manualKm: readManualKm("0"),
    });
    assert.equal(quote.manual, true);
    assert.equal(quote.distanceKm, 0);
    assert.equal(quote.transport, 0);
    assert.equal(quote.net, 3040);
    assert.equal(quote.vat, 638);
    assert.equal(quote.gross, 3678);
  });

  it("nečíselné nebo záporné km nechají spočítanou trasu", () => {
    const junk = quoteOf({
      cart: { karton_s: 1 },
      legs: route,
      useManual: true,
      manualKm: readManualKm("abc"),
    });
    assert.equal(junk.manual, false);
    assert.equal(junk.distanceKm, 50);
    assert.equal(junk.transport, 1000);
    assert.equal(junk.net, 4040);

    const negative = quoteOf({
      cart: { karton_s: 1 },
      legs: route,
      useManual: true,
      manualKm: readManualKm("-3"),
    });
    assert.equal(negative.distanceKm, 50);
    assert.equal(negative.manual, false);

    const cleared = quoteOf({
      cart: { karton_s: 1 },
      legs: route,
      useManual: false,
      manualKm: readManualKm(""),
    });
    assert.equal(cleared.distanceKm, 50);
  });

  it("DPH zaokrouhlí půlkorunu nahoru a hmotnost sama o sobě jízdu nepřidá", () => {
    const halfKm = quoteOf({ cart: { taska: 1 }, useManual: true, manualKm: 0.5 });
    assert.equal(halfKm.transport, 10);
    assert.equal(halfKm.net, 3040);

    const half = quoteOf({ cart: { taska: 1 }, useManual: true, manualKm: 1 });
    assert.equal(half.net, 3050);
    assert.equal(half.vat, 641);
    assert.equal(half.gross, half.net + half.vat);
    assert.equal(half.vat, vatCrowns(half.net));
    assert.notEqual(half.vat, Math.floor(half.net * 0.21));

    const load = quoteOf({ cart: { trezor_v: 5 } });
    assert.equal(load.weight, 2000);
    assert.equal(load.trips, 1);
    assert.equal(load.overweight, true);
    assert.equal(load.tripFee, TRIP_PRICE);

    const empty = quoteOf({ legs: route, useManual: true, manualKm: 40 });
    assert.equal(empty.trips, 0);
    assert.equal(empty.net, 0);
    assert.equal(empty.transport, 0);
  });
});
