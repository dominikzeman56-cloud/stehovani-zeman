import { CARGO_CM, MAX_VOLUME_M3, PACK_EFFICIENCY } from "@/data/catalog";

/**
 * Orientační kontrola, jestli se soupis vejde do vozu. Objem kusů je součet obálek, do vozu se ale
 * nikdy nenaloží na 100 %: mezi kusy zůstávají mezery (židle, pneumatiky, nepravidelné tvary).
 * Proto se počítá s využitím PACK_EFFICIENCY. Skutečné naskládání posoudí člověk podle soupisu a fotek.
 */
export type SpaceStatus = "enough" | "tight" | "edge" | "over";

export type SpaceCheck = {
  status: SpaceStatus;
  /** Součet objemů kusů, m³. */
  volume: number;
  /** Prostor potřebný při skládání (objem / využití), m³. */
  needed: number;
  /** Kolik m³ zbývá do kapacity vozu při skládání. Záporné, když nestačí. */
  reserve: number;
  /** Podíl součtu objemů na kapacitě jedné jízdy, 0 až víc než 1. */
  fill: number;
};

export const SPACE_LABEL: Record<SpaceStatus, string> = {
  enough: "Prostoru by mělo být dost",
  tight: "Vejde se, ale těsně",
  edge: "Na hraně jedné jízdy",
  over: "Na jednu jízdu se nevejde",
};

/** Do 85 % kapacity (při skládání) je dost místa, do 100 % těsně. Když se kusy vejdou jen sečtené, je to na hraně. */
export function spaceCheck(volume: number, capacity = MAX_VOLUME_M3, efficiency = PACK_EFFICIENCY): SpaceCheck | null {
  if (!Number.isFinite(volume) || volume <= 0.0001) return null;
  const needed = volume / efficiency;
  const ratio = needed / capacity;
  const status: SpaceStatus = ratio <= 0.85 ? "enough" : ratio <= 1 ? "tight" : volume <= capacity ? "edge" : "over";
  return { status, volume, needed, reserve: capacity - needed, fill: volume / capacity };
}

/** Objem obálky v m³ z rozměrů v centimetrech. */
export function boxVolumeM3(length: number, width: number, height: number): number {
  const dims = [length, width, height];
  if (!dims.every((value) => Number.isFinite(value) && value > 0)) return 0;
  return (length * width * height) / 1_000_000;
}

/** Vejde se kus rozměrů v cm do ložného prostoru, když se otočí jak je třeba? */
export function fitsCargo(length: number, width: number, height: number): boolean {
  const piece = [length, width, height].sort((a, b) => b - a);
  const cargo = [CARGO_CM.length, CARGO_CM.width, CARGO_CM.height].sort((a, b) => b - a);
  return piece.every((value, index) => value <= cargo[index]);
}
