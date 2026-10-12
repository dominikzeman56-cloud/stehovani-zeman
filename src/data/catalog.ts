export type WeightClass = "light" | "medium" | "heavy" | "very_heavy";

export type LiftKind = "none" | "passenger" | "freight";

export type CatalogItem = {
  id: string;
  name: string;
  vol: number;
  weight: number;
  price: number;
  cat: string;
  wCat: WeightClass;
  /** Odpojení a fixace — pračka, myčka. */
  handling?: number;
};

export const COMPANY = {
  name: "Václav Zeman",
  brand: "Stěhování Zeman",
  slogan: "S námi je vše lehké!",
  ico: "407 24 077",
  dic: "CZ6410191128",
  databox: "fqd24cp",
  email: "stehovani-zeman@post.cz",
  phones: [
    { label: "+420 602 663 183", tel: "+420602663183" },
    { label: "+420 724 140 818", tel: "+420724140818" },
  ],
  street: "Claudiusova 413/II",
  city: "377 01 Jindřichův Hradec",
  since: 1987,
  /** Claudiusova 413/II. Předtím tu byla Svatojánská 155, asi 600 m vedle. */
  depot: { lat: 49.1485367, lon: 15.0078986 },
} as const;

/** IVECO Daily 3.0, nákladový prostor změřený firmou. */
export const MAX_VOLUME_M3 = 18.73;
/** Orientační objem zabaleného bytu 3+1. Vejde se do jedné jízdy. */
export const FLAT_31_M3 = 16.8;
/** Orientační užitečná hmotnost jedné jízdy — jen upozornění, ne sazba. */
export const PAYLOAD_KG = 1400;
export const TRIP_PRICE = 4000;
export const PRICE_PER_KM = 20;
export const VAT_RATE = 0.21;

export const FLOOR_RATES: Record<WeightClass, number> = {
  light: 80,
  medium: 150,
  heavy: 250,
  very_heavy: 500,
};

export const WEIGHT_LABEL: Record<WeightClass, string> = {
  light: "lehké",
  medium: "střední",
  heavy: "těžké",
  very_heavy: "velmi těžké",
};

export const LIFT_LABEL: Record<LiftKind, string> = {
  none: "bez výtahu",
  passenger: "osobní výtah",
  freight: "nákladní výtah",
};

export const CATEGORIES = [
  { id: "kartony", name: "Kartony" },
  { id: "spotrebice_velke", name: "Velké spotřebiče" },
  { id: "spotrebice_male", name: "Malé spotřebiče" },
  { id: "obyvak", name: "Obývací pokoj" },
  { id: "loznice", name: "Ložnice" },
  { id: "jidelna", name: "Jídelna a kancelář" },
  { id: "specialni", name: "Speciální" },
  { id: "zahrada", name: "Zahrada a sport" },
] as const;

export const ITEMS: CatalogItem[] = [
  { id: "karton_s", name: "Karton malý", vol: 0.06, weight: 15, price: 60, cat: "kartony", wCat: "light" },
  { id: "karton_l", name: "Karton velký", vol: 0.12, weight: 30, price: 80, cat: "kartony", wCat: "light" },
  { id: "karton_knihy", name: "Karton knihy", vol: 0.06, weight: 35, price: 100, cat: "kartony", wCat: "medium" },
  { id: "karton_sklo", name: "Karton sklo", vol: 0.06, weight: 15, price: 120, cat: "kartony", wCat: "light" },
  { id: "taska", name: "Přepravka / taška", vol: 0.04, weight: 10, price: 40, cat: "kartony", wCat: "light" },
  { id: "lednice_m", name: "Lednice malá", vol: 0.7, weight: 55, price: 450, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "lednice_v", name: "Lednice velká", vol: 1.4, weight: 110, price: 700, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "lednice_ss", name: "Lednice side-by-side", vol: 1.8, weight: 130, price: 900, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "mrazak", name: "Mrazák", vol: 0.5, weight: 50, price: 400, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "sporak", name: "Sporák", vol: 0.4, weight: 45, price: 350, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "pracka", name: "Pračka", vol: 0.3, weight: 70, price: 400, cat: "spotrebice_velke", wCat: "heavy", handling: 200 },
  { id: "mycka", name: "Myčka nádobí", vol: 0.3, weight: 40, price: 400, cat: "spotrebice_velke", wCat: "heavy", handling: 200 },
  { id: "susicka", name: "Sušička", vol: 0.3, weight: 50, price: 400, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "mikrovlnka", name: "Mikrovlnka", vol: 0.08, weight: 15, price: 100, cat: "spotrebice_male", wCat: "light" },
  { id: "varna_deska", name: "Varná deska", vol: 0.1, weight: 20, price: 150, cat: "spotrebice_male", wCat: "light" },
  { id: "trouba", name: "Trouba", vol: 0.3, weight: 35, price: 250, cat: "spotrebice_male", wCat: "medium" },
  { id: "digestor", name: "Digestoř", vol: 0.15, weight: 15, price: 150, cat: "spotrebice_male", wCat: "light" },
  { id: "gauc_2", name: "Gauč 2místný", vol: 1, weight: 60, price: 350, cat: "obyvak", wCat: "heavy" },
  { id: "gauc_3", name: "Gauč 3místný", vol: 1.4, weight: 90, price: 450, cat: "obyvak", wCat: "heavy" },
  { id: "gauc_roh", name: "Rohový gauč", vol: 2.2, weight: 120, price: 600, cat: "obyvak", wCat: "heavy" },
  { id: "kreslo", name: "Křeslo", vol: 0.6, weight: 30, price: 200, cat: "obyvak", wCat: "medium" },
  { id: "tv", name: "Televize s konzolí", vol: 0.4, weight: 25, price: 250, cat: "obyvak", wCat: "light" },
  { id: "obraz", name: "Obraz nebo zrcadlo", vol: 0.1, weight: 10, price: 150, cat: "obyvak", wCat: "light" },
  { id: "koberec_s", name: "Koberec malý", vol: 0.1, weight: 8, price: 80, cat: "obyvak", wCat: "light" },
  { id: "koberec_v", name: "Koberec velký", vol: 0.25, weight: 20, price: 150, cat: "obyvak", wCat: "light" },
  { id: "komoda", name: "Komoda", vol: 0.6, weight: 45, price: 300, cat: "obyvak", wCat: "heavy" },
  { id: "vitrina", name: "Vitrína", vol: 0.8, weight: 50, price: 350, cat: "obyvak", wCat: "heavy" },
  { id: "postel_90", name: "Postel 90 cm", vol: 0.9, weight: 40, price: 250, cat: "loznice", wCat: "medium" },
  { id: "postel_140", name: "Postel 140 cm", vol: 1.4, weight: 55, price: 350, cat: "loznice", wCat: "heavy" },
  { id: "postel_160", name: "Postel 160 cm", vol: 1.6, weight: 65, price: 400, cat: "loznice", wCat: "heavy" },
  { id: "postel_180", name: "Postel 180 cm", vol: 1.8, weight: 75, price: 450, cat: "loznice", wCat: "heavy" },
  { id: "matrace", name: "Matrace", vol: 0.35, weight: 20, price: 120, cat: "loznice", wCat: "light" },
  { id: "skrin_m", name: "Skříň malá", vol: 0.8, weight: 50, price: 350, cat: "loznice", wCat: "heavy" },
  { id: "skrin_v", name: "Skříň velká", vol: 1.5, weight: 90, price: 500, cat: "loznice", wCat: "heavy" },
  { id: "skrin_pos", name: "Posuvná skříň", vol: 2, weight: 110, price: 700, cat: "loznice", wCat: "heavy" },
  { id: "nocnice", name: "Noční stolek", vol: 0.1, weight: 10, price: 80, cat: "loznice", wCat: "light" },
  { id: "satni", name: "Šatní skříň", vol: 1.2, weight: 70, price: 450, cat: "loznice", wCat: "heavy" },
  { id: "stul_jid", name: "Stůl jídelní", vol: 0.8, weight: 40, price: 250, cat: "jidelna", wCat: "medium" },
  { id: "stul_konf", name: "Stůl konferenční", vol: 0.25, weight: 18, price: 150, cat: "jidelna", wCat: "light" },
  { id: "stul_prac", name: "Stůl pracovní", vol: 0.5, weight: 30, price: 200, cat: "jidelna", wCat: "medium" },
  { id: "zidle_d", name: "Dřevěná židle", vol: 0.12, weight: 8, price: 60, cat: "jidelna", wCat: "light" },
  { id: "zidle_k", name: "Kancelářská židle", vol: 0.2, weight: 12, price: 80, cat: "jidelna", wCat: "light" },
  { id: "zidle_pot", name: "Čalouněná židle", vol: 0.2, weight: 10, price: 80, cat: "jidelna", wCat: "light" },
  { id: "policka", name: "Police nebo regál", vol: 0.5, weight: 25, price: 200, cat: "jidelna", wCat: "medium" },
  { id: "skrin_k", name: "Kancelářská skříň", vol: 0.8, weight: 45, price: 300, cat: "jidelna", wCat: "heavy" },
  { id: "kontejner", name: "Kontejner se zásuvkami", vol: 0.2, weight: 20, price: 120, cat: "jidelna", wCat: "medium" },
  { id: "klavir", name: "Klavír nebo pianino", vol: 1.5, weight: 250, price: 3000, cat: "specialni", wCat: "very_heavy" },
  { id: "trezor_s", name: "Trezor malý", vol: 0.25, weight: 100, price: 1000, cat: "specialni", wCat: "very_heavy" },
  { id: "trezor_v", name: "Trezor velký", vol: 0.7, weight: 300, price: 2500, cat: "specialni", wCat: "very_heavy" },
  { id: "saf", name: "Sejf", vol: 0.15, weight: 60, price: 800, cat: "specialni", wCat: "very_heavy" },
  { id: "krb", name: "Krbová vložka", vol: 0.4, weight: 120, price: 1500, cat: "specialni", wCat: "very_heavy" },
  { id: "bazen", name: "Zahradní bazén", vol: 1.5, weight: 50, price: 500, cat: "specialni", wCat: "medium" },
  { id: "kolo", name: "Kolo", vol: 0.3, weight: 15, price: 150, cat: "zahrada", wCat: "light" },
  { id: "kolo_e", name: "Elektrokolo", vol: 0.35, weight: 25, price: 200, cat: "zahrada", wCat: "light" },
  { id: "grill", name: "Gril", vol: 0.5, weight: 40, price: 200, cat: "zahrada", wCat: "medium" },
  { id: "sekacka", name: "Sekačka", vol: 0.4, weight: 30, price: 200, cat: "zahrada", wCat: "medium" },
  { id: "zahrada", name: "Zahradní nábytek, sada", vol: 1.5, weight: 60, price: 400, cat: "zahrada", wCat: "medium" },
  { id: "lyze", name: "Lyže s vázáním", vol: 0.1, weight: 8, price: 100, cat: "zahrada", wCat: "light" },
  { id: "golf", name: "Golfový bag", vol: 0.12, weight: 12, price: 120, cat: "zahrada", wCat: "light" },
];

const ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]));

export function findItem(id: string) {
  return ITEM_MAP.get(id);
}

export function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
