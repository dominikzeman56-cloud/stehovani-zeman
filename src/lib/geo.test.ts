import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SERVED_COUNTRY_CODES,
  abroadCountries,
  countryName,
  isAbroad,
  isServedCountry,
  nominatimUrl,
  parseNominatim,
} from "./geo.ts";

describe("země", () => {
  it("Rakousko a sousedi jsou obsluhované, zbytek světa ne", () => {
    for (const code of ["cz", "AT", "de", "SK", "pl"])
      assert.equal(isServedCountry(code), true, code);
    for (const code of ["us", "HU", "fr"]) assert.equal(isServedCountry(code), false, code);
  });

  it("chybějící kód nezahodí dobrý nález", () => {
    assert.equal(isServedCountry(undefined), true);
    assert.equal(isServedCountry(""), true);
  });

  it("mimo ČR je všechno kromě cz, neznámý kód ne", () => {
    assert.equal(isAbroad("AT"), true);
    assert.equal(isAbroad("cz"), false);
    assert.equal(isAbroad("CZ"), false);
    assert.equal(isAbroad(undefined), false);
  });

  it("názvy zemí česky", () => {
    assert.equal(countryName("at"), "Rakousko");
    assert.equal(countryName("DE"), "Německo");
    assert.equal(countryName("hu"), "HU");
    assert.equal(countryName(undefined), "");
  });

  it("abroadCountries vypíše každou zemi mimo ČR jednou", () => {
    const cz = { lat: 49.1, lon: 15, country: "cz" };
    const at = { lat: 47.9, lon: 15, country: "at" };
    assert.deepEqual(abroadCountries([cz, at]), ["Rakousko"]);
    assert.deepEqual(abroadCountries([at, { ...at }]), ["Rakousko"]);
    assert.deepEqual(abroadCountries([cz, { lat: 49, lon: 15 }, null, undefined]), []);
    assert.deepEqual(abroadCountries([{ ...at, country: "de" }, at]), ["Německo", "Rakousko"]);
  });
});

describe("Nominatim", () => {
  it('adresu nelepí ", Česko" a hledá ve všech obsluhovaných zemích', () => {
    const url = new URL(nominatimUrl("Kienberg bei Gaming", SERVED_COUNTRY_CODES));
    assert.equal(url.searchParams.get("q"), "Kienberg bei Gaming");
    assert.equal(url.searchParams.get("countrycodes"), "cz,at,de,sk,pl");
    assert.equal(url.searchParams.get("addressdetails"), "1");
    assert.equal(url.searchParams.get("limit"), "1");
  });

  it("první hledání může být jen ČR", () => {
    const url = new URL(nominatimUrl("Rapšach", ["cz"]));
    assert.equal(url.searchParams.get("countrycodes"), "cz");
    assert.equal(url.searchParams.get("q"), "Rapšach");
  });

  it("přečte souřadnice i zemi", () => {
    const point = parseNominatim([{ lat: "47.9", lon: "15.1", address: { country_code: "at" } }]);
    assert.deepEqual(point, { lat: 47.9, lon: 15.1, country: "at" });
  });

  it("přečte krátký popis nalezeného místa", () => {
    const point = parseNominatim([
      { lat: "47.9", lon: "15.1", display_name: "Kienberg, Pockau, Gaming, Bezirk Scheibbs, Österreich", address: { country_code: "at" } },
    ]);
    assert.equal(point?.label, "Kienberg, Pockau, Gaming");
  });

  it("bez země vrátí jen souřadnice", () => {
    assert.deepEqual(parseNominatim([{ lat: "49.1", lon: "15" }]), { lat: 49.1, lon: 15 });
  });

  it("nález mimo obsluhované země zahodí", () => {
    assert.equal(
      parseNominatim([{ lat: "40", lon: "-74", address: { country_code: "us" } }]),
      null,
    );
  });

  it("prázdná nebo rozbitá odpověď je null", () => {
    assert.equal(parseNominatim([]), null);
    assert.equal(parseNominatim(null), null);
    assert.equal(parseNominatim({}), null);
    assert.equal(parseNominatim([{ lat: "x", lon: "15" }]), null);
    assert.equal(parseNominatim([{ lon: "15" }]), null);
  });
});
