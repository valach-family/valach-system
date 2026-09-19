// ACP-01 — MELYIK VÁLTOZAT AZ AKTÍV, ÉS MELYIK A TÖRTÉNETI (R35 §„Meghozott döntések" 1.).
//
// A külső fél R35-ben engedélyezte, hogy a három core-program TESZTADATAINAK mennyiség-literáljai
// kanonikus decimális szövegre álljanak (MNY-01), és egyúttal kikötötte: „A régi programok történeti
// forrását őrizzétek meg, az aktív változat és runner-hivatkozás legyen egyértelműen verziózva."
//
// EZÉRT: a `*.core.mjs` fájlokhoz TÖBBÉ NEM NYÚLUNK — azok a történeti forrás, bájtazonosan. Mellettük
// él a `*.core.adapted.mjs`.
//
// MIBEN TÉR EL AZ AKTÍV VÁLTOZAT — KÉT, KÜLÖN ENGEDÉLYEZETT DOLOGBAN (R51 óta már nem egyben):
//   (1) R35 — a TESZTADAT mennyiség-literáljai kanonikus decimális szövegen (MNY-01);
//   (2) R51 — az `r79` és az `r81` tesztVILÁGA kimondott készlet- és ár-olvasási jogot kap a rendszer
//       saját íróján, rögzített alappal (`explicitReadFixture`), mert az R49 óta a kiadás igazolt,
//       adatkörre szóló olvasási jogot követel. Ez TESZT-ELŐFELTÉTEL, nem enyhítés: sem eset, sem
//       elvárás, sem óra, sem negatív ág nem változott.
// A korábbi „KIZÁRÓLAG a mennyiség-literálokban tér el" mondat az R51 óta NEM IGAZ — ezért került ki
// (KUKA-050: a leíró szöveg állítás, és az állítás elévül).
//
// A választás NEM a burkoló
// szövegében rejtőzik: EGY nevezett feloldó dönti el, hogy melyik fut, és a döntés a gépi eredménybe
// is beleíródik (`program` + `variant`), hogy egy jelentésből visszakereshető legyen, MI futott.
//
// A TÖRTÉNETI VÁLTOZAT FUTTATHATÓ MARAD: `VS_EXT_CORE_VARIANT=historic`. Ez nem kapcsoló a zöldhöz —
// a történeti alakon a MÉRT eredmény továbbra is az elavult elvárás pirosa, és ezt nem takarjuk el.
export const CORE_VARIANTS = Object.freeze({
  active: Object.freeze({
    id: 'adapted',
    suffix: '.core.adapted.mjs',
    why: 'a tesztadat mennyiség-literáljai kanonikus decimális szövegen (MNY-01) — R35 engedélyével; '
      + 'az r79/r81 tesztvilága ezen felül kimondott készlet- és ár-olvasási jogot kap — R51 engedélyével',
    adaptations: Object.freeze([
      Object.freeze({ version: 'adapted-v1', round: 'R35', source: 'v3ref/source-documents/R35_board_v1.md',
        what: 'a tesztadat mennyiség-literáljai kanonikus decimális szövegre álltak (MNY-01)',
        programs: Object.freeze(['r77_chatgpt-v3', 'r79_chatgpt-v3', 'r81_chatgpt-v3']) }),
      Object.freeze({ version: 'adapted-v2', round: 'R51', source: 'v3ref/source-documents/R51_board_v1.md',
        what: 'a tesztvilág kimondott készlet- ÉS ár-olvasási jogot kap a rendszer saját íróján, '
          + 'rögzített alappal (explicitReadFixture) — a kiadás R49 óta igazolt adatköri jogot követel',
        programs: Object.freeze(['r79_chatgpt-v3', 'r81_chatgpt-v3']) }),
    ]),
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
