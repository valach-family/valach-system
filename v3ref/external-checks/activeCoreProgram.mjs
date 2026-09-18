// ACP-01 — MELYIK VÁLTOZAT AZ AKTÍV, ÉS MELYIK A TÖRTÉNETI (R35 §„Meghozott döntések" 1.).
//
// A külső fél R35-ben engedélyezte, hogy a három core-program TESZTADATAINAK mennyiség-literáljai
// kanonikus decimális szövegre álljanak (MNY-01), és egyúttal kikötötte: „A régi programok történeti
// forrását őrizzétek meg, az aktív változat és runner-hivatkozás legyen egyértelműen verziózva."
//
// EZÉRT: a `*.core.mjs` fájlokhoz TÖBBÉ NEM NYÚLUNK — azok a történeti forrás, bájtazonosan. Mellettük
// él a `*.core.adapted.mjs`, ami KIZÁRÓLAG a mennyiség-literálokban tér el. A választás NEM a burkoló
// szövegében rejtőzik: EGY nevezett feloldó dönti el, hogy melyik fut, és a döntés a gépi eredménybe
// is beleíródik (`program` + `variant`), hogy egy jelentésből visszakereshető legyen, MI futott.
//
// A TÖRTÉNETI VÁLTOZAT FUTTATHATÓ MARAD: `VS_EXT_CORE_VARIANT=historic`. Ez nem kapcsoló a zöldhöz —
// a történeti alakon a MÉRT eredmény továbbra is az elavult elvárás pirosa, és ezt nem takarjuk el.
export const CORE_VARIANTS = Object.freeze({
  active: Object.freeze({
    id: 'adapted',
    suffix: '.core.adapted.mjs',
    why: 'a tesztadat mennyiség-literáljai kanonikus decimális szövegen (MNY-01) — R35 engedélyével',
  }),
  historic: Object.freeze({
    id: 'historic',
    suffix: '.core.mjs',
    why: 'a külső fél EREDETI, bájtazonos programja — az MNY-01 előtti szám-alakkal',
  }),
});

/** A kért (vagy alapértelmezett) változat leírója. Ismeretlen kérésre NEM tippel: az aktívat adja. */
export function coreVariant(requested = process.env.VS_EXT_CORE_VARIANT) {
  return requested === 'historic' ? CORE_VARIANTS.historic : CORE_VARIANTS.active;
}

/** A futtatandó core-fájl NEVE egy program-alaphoz (pl. 'r81_chatgpt-v3'). */
export function activeCoreProgram(base, requested) {
  return `${base}${coreVariant(requested).suffix}`;
}
