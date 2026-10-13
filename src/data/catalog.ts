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
  /**
   * Dlouhé nebo hluboké. Na podestě paneláku se s tím neotočí,
   * patro se proto účtuje sazbou velmi těžkého kusu.
   */
  bulky?: boolean;
  /**
   * Hustá bedna (knihy). Pár kusů je běžná sazba, ale plné auto beden po schodech
   * nebo přes dvůr už je práce navíc, kterou kalkulačka neocení. Viz DENSE_NEGOTIATE_COUNT.
   */
  dense?: boolean;
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
/**
 * Bez DPH. Základní jízda je přistavení Daily a posádky, ne celá práce.
 * Těžké kusy drží pásmo Stěhování Leo: pianino 4–6 tis., nad 300 kg od 7,5 tis.,
 * křídlo 8–12 tis., trezor podle váhy od 3 / 5 / 7,5 tis. To je cena pro zákazníka.
 * Patro je za kus a jde navrch. Krabice skoro nic, piano, trezor a dlouhá skříň poctivě.
 */
export const TRIP_PRICE = 3000;
export const PRICE_PER_KM = 20;
/** Donáška od vozu ke dveřím po rovině: tolik metrů se počítá jako jedno patro. */
export const CARRY_M_PER_FLOOR = 20;
/** Donáška se zaokrouhluje dolů po tomto kroku, kratší vzdálenost je běžný přístup zdarma. */
export const CARRY_STEP_M = 10;
export const CARRY_MAX_M = 300;
/**
 * Od tolika hustých beden (knihy) po schodech nebo donášce se cena domlouvá zvlášť.
 * Pár beden se do sazby vejde, plné auto ne.
 */
export const DENSE_NEGOTIATE_COUNT = 20;
export const VAT_RATE = 0.21;

export const FLOOR_RATES: Record<WeightClass, number> = {
  light: 10,
  medium: 40,
  heavy: 90,
  very_heavy: 520,
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

/** Viditelné u součtu, v poptávce a v mailu. Kalkulačka není závazná cena. */
export const ESTIMATE_CAVEAT =
  "Kalkulačka je orientační a počítá s běžným přístupem. Když je třeba stěhovat atypický nábytek, například holandskou stěnu, nebo je přístup složitý — úzké schody na půdu či do sklepa — řekneme pevnou cenu. Buď platí, nebo to udělá někdo jiný.";

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
  { id: "karton_s", name: "Karton malý", vol: 0.06, weight: 12, price: 40, cat: "kartony", wCat: "light" },
  { id: "karton_l", name: "Karton velký", vol: 0.12, weight: 18, price: 55, cat: "kartony", wCat: "light" },
  { id: "karton_knihy", name: "Karton knihy", vol: 0.06, weight: 25, price: 70, cat: "kartony", wCat: "medium", dense: true },
  { id: "karton_sklo", name: "Karton sklo", vol: 0.06, weight: 10, price: 90, cat: "kartony", wCat: "light" },
  { id: "taska", name: "Přepravka / taška", vol: 0.04, weight: 8, price: 30, cat: "kartony", wCat: "light" },
  { id: "lednice_m", name: "Lednice malá", vol: 0.55, weight: 45, price: 280, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "lednice_v", name: "Lednice velká", vol: 1.2, weight: 85, price: 420, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "lednice_ss", name: "Lednice side-by-side", vol: 1.6, weight: 140, price: 560, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "mrazak", name: "Mrazák", vol: 0.5, weight: 45, price: 250, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "sporak", name: "Sporák", vol: 0.4, weight: 50, price: 220, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "pracka", name: "Pračka", vol: 0.45, weight: 75, price: 280, cat: "spotrebice_velke", wCat: "heavy", handling: 200 },
  { id: "mycka", name: "Myčka nádobí", vol: 0.45, weight: 45, price: 260, cat: "spotrebice_velke", wCat: "heavy", handling: 200 },
  { id: "susicka", name: "Sušička", vol: 0.45, weight: 45, price: 250, cat: "spotrebice_velke", wCat: "heavy" },
  { id: "mikrovlnka", name: "Mikrovlnka", vol: 0.08, weight: 14, price: 80, cat: "spotrebice_male", wCat: "light" },
  { id: "varna_deska", name: "Varná deska", vol: 0.08, weight: 12, price: 100, cat: "spotrebice_male", wCat: "light" },
  { id: "trouba", name: "Trouba", vol: 0.3, weight: 35, price: 200, cat: "spotrebice_male", wCat: "medium" },
  { id: "digestor", name: "Digestoř", vol: 0.15, weight: 12, price: 100, cat: "spotrebice_male", wCat: "light" },
  { id: "gauc_2", name: "Gauč 2místný", vol: 1, weight: 55, price: 280, cat: "obyvak", wCat: "heavy" },
  { id: "gauc_3", name: "Gauč 3místný", vol: 1.4, weight: 80, price: 360, cat: "obyvak", wCat: "heavy" },
  { id: "gauc_roh", name: "Rohový gauč", vol: 2.2, weight: 110, price: 480, cat: "obyvak", wCat: "heavy" },
  { id: "kreslo", name: "Křeslo", vol: 0.6, weight: 28, price: 150, cat: "obyvak", wCat: "medium" },
  { id: "tv", name: "Televize s konzolí", vol: 0.4, weight: 22, price: 180, cat: "obyvak", wCat: "light" },
  { id: "obraz", name: "Obraz nebo zrcadlo", vol: 0.1, weight: 8, price: 100, cat: "obyvak", wCat: "light" },
  { id: "koberec_s", name: "Koberec malý", vol: 0.1, weight: 6, price: 50, cat: "obyvak", wCat: "light" },
  { id: "koberec_v", name: "Koberec velký", vol: 0.25, weight: 15, price: 90, cat: "obyvak", wCat: "light" },
  { id: "komoda", name: "Komoda", vol: 0.6, weight: 40, price: 220, cat: "obyvak", wCat: "heavy" },
  { id: "vitrina", name: "Vitrína", vol: 0.8, weight: 55, price: 260, cat: "obyvak", wCat: "heavy" },
  { id: "postel_90", name: "Postel 90 cm", vol: 0.9, weight: 35, price: 180, cat: "loznice", wCat: "medium" },
  { id: "postel_140", name: "Postel 140 cm", vol: 1.4, weight: 50, price: 260, cat: "loznice", wCat: "heavy" },
  { id: "postel_160", name: "Postel 160 cm", vol: 1.6, weight: 60, price: 300, cat: "loznice", wCat: "heavy" },
  { id: "postel_180", name: "Postel 180 cm", vol: 1.8, weight: 70, price: 340, cat: "loznice", wCat: "heavy" },
  { id: "matrace", name: "Matrace", vol: 0.35, weight: 22, price: 90, cat: "loznice", wCat: "light" },
  { id: "skrin_m", name: "Skříň malá", vol: 0.8, weight: 45, price: 260, cat: "loznice", wCat: "heavy" },
  { id: "skrin_v", name: "Skříň velká", vol: 1.5, weight: 80, price: 380, cat: "loznice", wCat: "heavy" },
  { id: "skrin_pos", name: "Posuvná skříň", vol: 2.2, weight: 140, price: 640, cat: "loznice", wCat: "heavy", bulky: true },
  { id: "nocnice", name: "Noční stolek", vol: 0.1, weight: 12, price: 60, cat: "loznice", wCat: "light" },
  { id: "satni", name: "Šatní skříň", vol: 1.2, weight: 65, price: 340, cat: "loznice", wCat: "heavy" },
  { id: "stul_jid", name: "Stůl jídelní", vol: 0.8, weight: 35, price: 180, cat: "jidelna", wCat: "medium" },
  { id: "stul_konf", name: "Stůl konferenční", vol: 0.25, weight: 15, price: 100, cat: "jidelna", wCat: "light" },
  { id: "stul_prac", name: "Stůl pracovní", vol: 0.5, weight: 28, price: 150, cat: "jidelna", wCat: "medium" },
  { id: "zidle_d", name: "Dřevěná židle", vol: 0.12, weight: 6, price: 40, cat: "jidelna", wCat: "light" },
  { id: "zidle_k", name: "Kancelářská židle", vol: 0.2, weight: 14, price: 60, cat: "jidelna", wCat: "light" },
  { id: "zidle_pot", name: "Čalouněná židle", vol: 0.2, weight: 9, price: 55, cat: "jidelna", wCat: "light" },
  { id: "policka", name: "Police nebo regál", vol: 0.5, weight: 20, price: 140, cat: "jidelna", wCat: "medium" },
  { id: "skrin_k", name: "Kancelářská skříň", vol: 0.8, weight: 40, price: 220, cat: "jidelna", wCat: "heavy" },
  { id: "kontejner", name: "Kontejner se zásuvkami", vol: 0.2, weight: 22, price: 90, cat: "jidelna", wCat: "medium" },
  { id: "pianino", name: "Pianino", vol: 1.2, weight: 220, price: 1400, cat: "specialni", wCat: "very_heavy" },
  { id: "klavir", name: "Pianino těžké", vol: 1.6, weight: 350, price: 3600, cat: "specialni", wCat: "very_heavy" },
  { id: "kridlo", name: "Klavírní křídlo", vol: 2.6, weight: 480, price: 4500, cat: "specialni", wCat: "very_heavy" },
  { id: "trezor_s", name: "Trezor malý", vol: 0.35, weight: 220, price: 2000, cat: "specialni", wCat: "very_heavy" },
  { id: "trezor_v", name: "Trezor velký", vol: 0.9, weight: 400, price: 4000, cat: "specialni", wCat: "very_heavy" },
  { id: "saf", name: "Sejf", vol: 0.2, weight: 120, price: 900, cat: "specialni", wCat: "heavy" },
  { id: "krb", name: "Krbová vložka", vol: 0.4, weight: 110, price: 1400, cat: "specialni", wCat: "very_heavy" },
  { id: "bazen", name: "Zahradní bazén", vol: 1.5, weight: 35, price: 320, cat: "specialni", wCat: "medium" },
  { id: "kolo", name: "Kolo", vol: 0.3, weight: 12, price: 100, cat: "zahrada", wCat: "light" },
  { id: "kolo_e", name: "Elektrokolo", vol: 0.35, weight: 24, price: 140, cat: "zahrada", wCat: "light" },
  { id: "grill", name: "Gril", vol: 0.5, weight: 30, price: 140, cat: "zahrada", wCat: "medium" },
  { id: "sekacka", name: "Sekačka", vol: 0.4, weight: 28, price: 140, cat: "zahrada", wCat: "medium" },
  { id: "zahrada", name: "Zahradní nábytek, sada", vol: 1.5, weight: 45, price: 280, cat: "zahrada", wCat: "medium" },
  { id: "lyze", name: "Lyže s vázáním", vol: 0.1, weight: 5, price: 70, cat: "zahrada", wCat: "light" },
  { id: "golf", name: "Golfový bag", vol: 0.12, weight: 12, price: 80, cat: "zahrada", wCat: "light" },
];

const ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]));

export function findItem(id: string) {
  return ITEM_MAP.get(id);
}

/** Patrová sazba. Dlouhý kus v paneláku bolí stejně jako piano, i když má míň kil. */
export function stairClass(item: { wCat: WeightClass; bulky?: boolean }): WeightClass {
  return item.bulky ? "very_heavy" : item.wCat;
}

export function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
