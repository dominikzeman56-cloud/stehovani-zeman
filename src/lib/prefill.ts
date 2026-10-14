import { CARRY_MAX_M, ITEMS, LIFT_LABEL, type LiftKind } from "@/data/catalog";
import { isServedCountry, normalizeCountry, type Point } from "@/lib/geo";

/**
 * Předvyplnění kalkulačky z odkazu. Do adresy patří jen soupis, patra a adresy stěhování,
 * nikdy jméno, telefon ani e-mail (zůstávají v historii prohlížeče a v logách).
 */
export type Prefill = {
  cart: Record<string, number>;
  /** Položky, u kterých se typ nebo velikost museli odhadnout. Zákazník je má ověřit. */
  check: string[];
  floorsFrom?: number;
  floorsTo?: number;
  liftFrom?: LiftKind;
  liftTo?: LiftKind;
  carryFrom?: number;
  carryTo?: number;
  from?: string;
  to?: string;
  fromPoint?: Point;
  toPoint?: Point;
};

const KNOWN = new Set(ITEMS.map((item) => item.id));

function int(value: string | null | undefined, min: number, max: number): number | undefined {
  if (value === null || value === undefined || value.trim() === "") return undefined;
  const number = Math.floor(Number(value));
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : undefined;
}

function lift(value: string | null): LiftKind | undefined {
  return value && value in LIFT_LABEL ? (value as LiftKind) : undefined;
}

function text(value: string | null): string | undefined {
  const clean = value?.replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
  return clean ? clean : undefined;
}

/** `lat,lon,cc` (kód země je nepovinný) nebo undefined. */
function point(value: string | null, label: string | undefined): Point | undefined {
  if (!value) return undefined;
  const [lat, lon, cc] = value.split(",").map((part) => part.trim());
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  const country = normalizeCountry(cc);
  if (!isServedCountry(country) || (country && !(country in COUNTRIES))) return undefined;
  return { lat: latitude, lon: longitude, ...(country ? { country } : {}), ...(label ? { label } : {}) };
}

const COUNTRIES: Record<string, true> = { cz: true, at: true, de: true, sk: true, pl: true };

/** Přečte `?items=pracka:2,mycka:1&check=lednice_v&...`. Neznámé položky se zahodí, nesmysly se ořežou. */
export function parsePrefill(search: string): Prefill | null {
  const params = new URLSearchParams(search);

  const cart: Record<string, number> = {};
  for (const entry of (params.get("items") ?? "").split(",")) {
    const [id, qty] = entry.split(":").map((part) => part.trim());
    const count = qty === undefined ? 1 : int(qty, 1, 99);
    if (id && KNOWN.has(id) && count) cart[id] = Math.min(99, (cart[id] ?? 0) + count);
  }
  const check = (params.get("check") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id in cart);

  const from = text(params.get("from"));
  const to = text(params.get("to"));
  const result: Prefill = {
    cart,
    check,
    floorsFrom: int(params.get("ff"), 0, 30),
    floorsTo: int(params.get("ft"), 0, 30),
    liftFrom: lift(params.get("lf")),
    liftTo: lift(params.get("lt")),
    carryFrom: int(params.get("cf"), 0, CARRY_MAX_M),
    carryTo: int(params.get("ct"), 0, CARRY_MAX_M),
    from,
    to,
    fromPoint: point(params.get("fp"), from),
    toPoint: point(params.get("tp"), to),
  };

  const meaningful = Object.keys(cart).length > 0 || from || to || result.floorsFrom || result.floorsTo;
  return meaningful ? result : null;
}

/** Sestaví query část odkazu z předvyplnění. Opak `parsePrefill`. */
export function buildPrefillSearch(prefill: Prefill): string {
  const params = new URLSearchParams();
  const items = Object.entries(prefill.cart).map(([id, qty]) => `${id}:${qty}`);
  if (items.length) params.set("items", items.join(","));
  if (prefill.check.length) params.set("check", prefill.check.join(","));
  const numbers: [string, number | undefined][] = [
    ["ff", prefill.floorsFrom],
    ["ft", prefill.floorsTo],
    ["cf", prefill.carryFrom],
    ["ct", prefill.carryTo],
  ];
  for (const [key, value] of numbers) if (value !== undefined) params.set(key, String(value));
  if (prefill.liftFrom) params.set("lf", prefill.liftFrom);
  if (prefill.liftTo) params.set("lt", prefill.liftTo);
  if (prefill.from) params.set("from", prefill.from);
  if (prefill.to) params.set("to", prefill.to);
  const pt = (p: Point) => `${p.lat},${p.lon}${p.country ? `,${p.country}` : ""}`;
  if (prefill.fromPoint) params.set("fp", pt(prefill.fromPoint));
  if (prefill.toPoint) params.set("tp", pt(prefill.toPoint));
  return params.toString();
}
