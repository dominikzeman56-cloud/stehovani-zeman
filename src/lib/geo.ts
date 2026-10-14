/** Bod na mapě. `country` je ISO kód malými písmeny (cz, at, ...), když ho zdroj adresy uvedl. */
export type Point = { lat: number; lon: number; country?: string };

/** Země, kam stěhování bere hledání adres. Zbytek světa se z návrhů zahazuje. */
export const COUNTRY_NAMES: Record<string, string> = {
  cz: "Česko",
  at: "Rakousko",
  de: "Německo",
  sk: "Slovensko",
  pl: "Polsko",
};

export const HOME_COUNTRY = "cz";

/** Obdélník kolem ČR a sousedních zemí (west,south,east,north) pro Photon. Přesný výběr zemí dělá `isServedCountry`. */
export const SEARCH_BBOX = "9.0,46.3,22.6,51.8";

export function normalizeCountry(code: string | undefined): string | undefined {
  const value = code?.trim().toLowerCase();
  return value ? value : undefined;
}

/** Neznámá země projde, ať nezahodíme dobrý nález jen proto, že mu chybí kód. */
export function isServedCountry(code: string | undefined): boolean {
  const country = normalizeCountry(code);
  return !country || country in COUNTRY_NAMES;
}

export function isAbroad(code: string | undefined): boolean {
  const country = normalizeCountry(code);
  return Boolean(country) && country !== HOME_COUNTRY;
}

export function countryName(code: string | undefined): string {
  const country = normalizeCountry(code);
  return (country && COUNTRY_NAMES[country]) || country?.toUpperCase() || "";
}

/** Názvy zemí mimo ČR u zadaných bodů, bez opakování, ve stejném pořadí jako body. */
export function abroadCountries(points: (Point | null | undefined)[]): string[] {
  const names: string[] = [];
  for (const point of points) {
    if (!point || !isAbroad(point.country)) continue;
    const name = countryName(point.country);
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * Adresa pro Nominatim. Nejdřív se hledá jen v ČR, ať se napsané "Hradec" nerozběhne do Německa.
 * Teprve když to v ČR nic nenajde, hledá se i v sousedních zemích.
 */
export function nominatimUrl(query: string, countries: string[]): string {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "1",
    addressdetails: "1",
    countrycodes: countries.join(","),
  });
  return `https://nominatim.openstreetmap.org/search?${params}`;
}

export const SERVED_COUNTRY_CODES = Object.keys(COUNTRY_NAMES);

type NominatimHit = { lat?: string; lon?: string; address?: { country_code?: string } };

/** První použitelný nález z odpovědi Nominatimu, nebo null. */
export function parseNominatim(data: unknown): Point | null {
  const hit = Array.isArray(data) ? (data[0] as NominatimHit | undefined) : undefined;
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const country = normalizeCountry(hit.address?.country_code);
  if (!isServedCountry(country)) return null;
  return country ? { lat, lon, country } : { lat, lon };
}
