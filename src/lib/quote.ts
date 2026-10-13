import {
  CARRY_MAX_M,
  DENSE_NEGOTIATE_COUNT,
  CARRY_M_PER_FLOOR,
  CARRY_STEP_M,
  FLOOR_RATES,
  ITEMS,
  MAX_VOLUME_M3,
  PAYLOAD_KG,
  PRICE_PER_KM,
  TRIP_PRICE,
  VAT_RATE,
  stairClass,
  type LiftKind,
  type WeightClass,
} from "@/data/catalog";

export type Cart = Record<string, number>;

export type RouteLegs = {
  approachKm: number;
  moveKm: number;
  returnKm: number;
  approachMin: number;
  moveMin: number;
  returnMin: number;
};

export type ExtraItem = {
  id: string;
  name: string;
  qty: number;
  vol: number;
  weight: number;
  wCat: WeightClass;
};

export type QuoteInput = {
  cart: Cart;
  floorsFrom: number;
  floorsTo: number;
  /** Metry po rovině od zaparkovaného vozu ke dveřím (u nakládky, u vykládky). */
  carryFrom?: number;
  carryTo?: number;
  liftFrom: LiftKind;
  liftTo: LiftKind;
  legs: RouteLegs | null;
  includeApproach: boolean;
  includeReturn: boolean;
  /** Když true, `manualKm` je celková fakturovaná vzdálenost (včetně nuly) a trasa se ignoruje. */
  useManual: boolean;
  manualKm: number;
  extras?: ExtraItem[];
};

export type QuoteLine = {
  id: string;
  name: string;
  qty: number;
  volume: number;
  weight: number;
  price: number;
  floor: number;
  carry: number;
  handling: number;
};

export type Quote = {
  lines: QuoteLine[];
  volume: number;
  weight: number;
  trips: number;
  items: number;
  floors: number;
  carry: number;
  handling: number;
  tripFee: number;
  approachKm: number;
  moveKm: number;
  returnKm: number;
  moveTimes: number;
  distanceKm: number;
  minutes: number;
  transport: number;
  net: number;
  vat: number;
  gross: number;
  fill: number;
  overweight: boolean;
  /** Hodně hustých beden po schodech nebo donášce: cenu domluvíme zvlášť. */
  negotiate: boolean;
  manual: boolean;
};

const money = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

const volumeFmt = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kmFmt = new Intl.NumberFormat("cs-CZ", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

export function formatKc(value: number) {
  return money.format(Math.round(value));
}

export function formatVolume(value: number) {
  return `${volumeFmt.format(value)} m³`;
}

export function formatKm(value: number) {
  return `${kmFmt.format(value)} km`;
}

function clampFloors(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(30, Math.floor(value)));
}

function floorUnits(floors: number, lift: LiftKind, wCat: WeightClass) {
  const count = clampFloors(floors);
  if (count === 0 || lift === "freight") return 0;
  if (lift === "passenger" && wCat !== "heavy" && wCat !== "very_heavy") return 0;
  return count;
}

/** Donáška po rovině v ekvivalentu pater. 40 m jsou dvě patra, pod krok nic. Výtah ji neovlivní. */
function carryUnits(meters: number | undefined) {
  if (meters === undefined || !Number.isFinite(meters) || meters <= 0) return 0;
  const clamped = Math.min(CARRY_MAX_M, meters);
  return (Math.floor(clamped / CARRY_STEP_M) * CARRY_STEP_M) / CARRY_M_PER_FLOOR;
}

function roundKm(value: number) {
  return Math.round(value * 10) / 10;
}

/** Prázdné pole je 0. Nečíselný text je NaN, aby se nula nespletla s neplatným vstupem. */
export function readManualKm(raw: string): number {
  const text = raw.trim().replace(",", ".");
  if (!text) return 0;
  const value = Number(text);
  return Number.isFinite(value) ? value : Number.NaN;
}

export function computeQuote(input: QuoteInput): Quote {
  const lines: QuoteLine[] = [];
  let volume = 0;
  let weight = 0;
  let items = 0;
  let floors = 0;
  let carry = 0;
  let denseCount = 0;
  let handling = 0;

  for (const item of ITEMS) {
    const qty = input.cart[item.id] ?? 0;
    if (qty <= 0) continue;
    const stair = stairClass(item);
    const units =
      floorUnits(input.floorsFrom, input.liftFrom, stair) +
      floorUnits(input.floorsTo, input.liftTo, stair);
    const rate = FLOOR_RATES[stair];
    const floor = rate * units * qty;
    const carried = Math.round(rate * (carryUnits(input.carryFrom) + carryUnits(input.carryTo)) * qty);
    const handle = (item.handling ?? 0) * qty;
    const price = item.price * qty;
    if (item.dense) denseCount += qty;
    volume += item.vol * qty;
    weight += item.weight * qty;
    items += price;
    floors += floor;
    carry += carried;
    handling += handle;
    lines.push({
      id: item.id,
      name: item.name,
      qty,
      volume: item.vol * qty,
      weight: item.weight * qty,
      price,
      floor,
      carry: carried,
      handling: handle,
    });
  }

  for (const extra of input.extras ?? []) {
    const qty = Math.min(99, Math.floor(extra.qty));
    const name = extra.name.trim();
    if (qty <= 0 || !name) continue;
    const vol = Number.isFinite(extra.vol) && extra.vol > 0 ? extra.vol : 0;
    const kilos = Number.isFinite(extra.weight) && extra.weight > 0 ? extra.weight : 0;
    const units =
      floorUnits(input.floorsFrom, input.liftFrom, extra.wCat) +
      floorUnits(input.floorsTo, input.liftTo, extra.wCat);
    const floor = FLOOR_RATES[extra.wCat] * units * qty;
    const carried = Math.round(
      FLOOR_RATES[extra.wCat] * (carryUnits(input.carryFrom) + carryUnits(input.carryTo)) * qty,
    );
    volume += vol * qty;
    weight += kilos * qty;
    floors += floor;
    carry += carried;
    lines.push({
      id: extra.id,
      name,
      qty,
      volume: vol * qty,
      weight: kilos * qty,
      price: 0,
      floor,
      carry: carried,
      handling: 0,
    });
  }

  const trips = volume <= 0.0001 ? 0 : Math.max(1, Math.ceil((volume - 1e-6) / MAX_VOLUME_M3));
  const tripFee = trips * TRIP_PRICE;

  let approachKm = 0;
  let moveKm = 0;
  let returnKm = 0;
  let moveTimes = 0;
  let minutes = 0;
  const manual = input.useManual && Number.isFinite(input.manualKm) && input.manualKm >= 0 && trips > 0;

  if (manual) {
    moveKm = input.manualKm;
    moveTimes = 1;
  } else if (input.legs && trips > 0) {
    approachKm = input.includeApproach ? input.legs.approachKm : 0;
    moveKm = input.legs.moveKm;
    returnKm = input.includeReturn ? input.legs.returnKm : 0;
    moveTimes = trips;
    minutes = Math.round(
      (input.includeApproach ? input.legs.approachMin : 0) +
        input.legs.moveMin * trips +
        (input.includeReturn ? input.legs.returnMin : 0),
    );
  }

  const distanceKm = roundKm(approachKm + moveKm * moveTimes + returnKm);
  const transport = Math.round(distanceKm * PRICE_PER_KM);
  const net = tripFee + items + floors + carry + handling + transport;
  const vat = Math.round(net * VAT_RATE);

  return {
    lines,
    volume,
    weight,
    trips,
    items,
    floors,
    carry,
    handling,
    tripFee,
    approachKm: roundKm(approachKm),
    moveKm: roundKm(moveKm),
    returnKm: roundKm(returnKm),
    moveTimes,
    distanceKm,
    minutes,
    transport,
    net,
    vat,
    gross: net + vat,
    fill: volume <= 0 ? 0 : Math.min(1, volume / MAX_VOLUME_M3),
    overweight: trips > 0 && weight > trips * PAYLOAD_KG,
    negotiate: denseCount >= DENSE_NEGOTIATE_COUNT && floors + carry > 0,
    manual,
  };
}
