/** A MUTÁCIÓS BATTÉRIA DARABOLÁSA — EGY DEKLARÁLT OTTHON (KUKA-129).
 *
 * MIÉRT SZÜLETETT. A darabszám HÁROM helyen élt, HÁROM különböző értékkel: a `package.json`
 * `v3ref:mutate:units` sorában (a söprés útja), az ADAPTÁLT külső programokban (`VS_BATTERY_UNITS`,
 * alapérték 6) és a SAJÁT futás-szerződés próbánkban (`r79_run_contract_restated.mjs`), ahol
 * `--unit=k/4` alakban BE VOLT ÉGETVE. Amikor a battéria 134 → 145 mutációra nőtt, a négyes bontás
 * egységei átlépték a `mutate.mjs` SAJÁT költségvetését, és a saját U04-es POZITÍV ELLENPÁRUNK
 * pirosra ment — miközben a söprés ezt a láncot tévesen „env-kihagyásnak" sorolta (OB-10), tehát a
 * kör jelentése „0 pirosat" mondott. Ez a KUKA-129 alakja: egy szabályt az egyik végén javítottam
 * (a `package.json` 4 → 7), a másik végén változatlanul maradt.
 *
 * MIT MÉR EZ, ÉS MIT NEM — KIMONDVA.
 *   · A SZABÁLY nem az, hogy „N = 7". A szabály az, hogy MINDEN egység beleférjen a saját
 *     költségvetésébe (`UNIT_BUDGET_MS`), ami a külső fél bejelentett korlátjának (`EXTERNAL_CAP_MS`)
 *     a 80%-a. Ezt a szabályt NEM ez a modul őrzi, hanem maga a `mutate.mjs`: túllépésnél NEM
 *     nullával lép ki. Egy előre beírt darabszám sosem lehet a szabály (KUKA-045).
 *   · Ez a modul azt tartja EGY helyen, ami darabszám MARAD: a mai, mért-jó bontást. A
 *     `package.json` nem tud modult behúzni, ezért a kötést GÉP méri: `verify:unit-admission`
 *     **UAD08** összeveti a deklarált értéket a tényleges parancs-sorral — enélkül ez a fájl csak
 *     DÍSZ volna (KUKA-126: amit senki nem olvas vissza, az nem kötés).
 *
 * MIÉRT ITT LAKIK, ÉS NEM A `v3ref/` ALATT (KUKA-130). Az első alakját a `v3ref/batteryUnits.mjs`
 * útra tettem, és a futás-szerződés próba `../batteryUnits.mjs` alakban húzta be. A külső-ellenőrző
 * futtató viszont a programot EGY IDEIGLENES MAPPÁBA másolja, és csak a `file` + `companions`
 * fájlokat viszi magával — a fölé nyúló behúzás ott nem oldódik fel. MÉRVE: a program a MÉRÉS
 * ELŐTT halt meg (`ERR_MODULE_NOT_FOUND`, 57 ms), miközben a forrás-olvasó ellenőrzés zölden állt
 * (KUKA-038: a létezés nem bizonyíték arra, hogy FUT). A közös lakó ezért a LEGSZŰKEBB másolt
 * fában él — a program mellett —, és a `case-manifest.mjs` KÍSÉRŐKÉNT deklarálja; a tágabb oldal
 * (`tools/vs_verify_unit_admission.mjs`) nyúl be érte.
 *   · KIMONDOTT HATÁRA: az ADAPTÁLT külső programok (`r57a` · `r59a`) SAJÁT alapértéket visznek (6),
 *     mert azok a KÜLSŐ fél szövegének jelölt adaptációi — a `VS_BATTERY_UNITS` környezeti értéket
 *     ott is olvassák, tehát igazíthatók, de a fájljukat ez a modul NEM írja felül. Ez nem baj: a
 *     hatos bontás MÉRVE belefér (mindkettő zöld). Az egyenlőség nem követelmény — a BELEFÉRÉS az.
 */

/** A `v3ref/mutate.mjs` saját költségvetése egy egységre. */
export const UNIT_BUDGET_MS = 12_000;

/** A külső fél programjaiban bejelentett futási korlát, amiből a fenti költségvetés (80%) jön. */
export const EXTERNAL_CAP_MS = 15_000;

/**
 * A MAI, MÉRT-JÓ BONTÁS — ÉS A JEL, AMI MEGMONDTA, HOGY EMELNI KELL.
 *
 * R53 (190 mutáció): a HETES bontásnál a hét egység faliórája 11 761 … 13 244 ms volt, tehát HAT
 * egység átlépte a `mutate.mjs` SAJÁT költségvetését (12 000 ms) — az `r79` futás-szerződés próba
 * POZITÍV ellenpárja (U04) emiatt pirosra ment egy ÉP rendszeren (`portable: false`, miközben
 * `clean: true` és a lefedettség 190/190). A NYOLCAS bontás ugyanezen a gépen végigfutott, mind a
 * nyolc egység a költségvetésen belül. A jelet tehát a `mutate.mjs` nem-nulla kilépése adta, nem
 * jóslat — pontosan ahogy ez a bekezdés eddig is előírta.
 *
 * KIMONDOTT GYENGE PONT (KUKA-045). Ez KÉZZEL karbantartott szám, és harmadszor avult el a
 * battéria növekedésekor. A SZÁRMAZTATOTT alak (`ceil(mutáció-szám / 24)`, ahogy a `--units-auto`
 * csinálja) itt azért NEM épült meg, mert ez a modul KÉT környezetben fut: a repóból (a söprés
 * útján) és a futtató által készített IDEIGLENES MÁSOLATBÓL — és a mutációs regiszter csak a
 * másolatban érhető el (`source/v3ref/mutations.mjs`), a repóban nincs `source` mappa. Ez MÉRT
 * korlát, nem kényelem; amíg nincs feloldva, a szám kézzel marad, és a jel a tool kilépési kódja.
 */
export const DECLARED_UNITS = 8;

/** A futásidejű darabszám: környezetből felülírható, különben a deklarált érték. */
export function batteryUnits(env = process.env) {
  const v = Number(env.VS_BATTERY_UNITS);
  return Number.isInteger(v) && v >= 1 && v <= 64 ? v : DECLARED_UNITS;
}

/** Az egység-hívások argumentumai, sorrendben (`--unit=1/N` … `--unit=N/N`). */
export function unitArgs(n = batteryUnits()) {
  return Array.from({ length: n }, (_, i) => `--unit=${i + 1}/${n}`);
}

/** Az a parancs-sor, aminek a `package.json`-ban állnia kell — az UAD08 EHHEZ méri a valóságot. */
export function unitsScriptLine(n = DECLARED_UNITS) {
  return [...unitArgs(n), '--merge'].map((a) => `node v3ref/mutate.mjs ${a}`).join(' && ');
}

/**
 * A SZÁRMAZTATOTT ALAK (R35 §2 · KUKA-177). A `--units-auto` a deklarált darabszámról INDUL, és ha
 * egy egység nem fér a költségvetésébe, finomabbra oszt — a költségvetés nem tágul. Ez ma a
 * KANONIKUS alak, mert a fix felsorolás a battéria növekedésével elavul (és pont a növekedéskor
 * bukik, ahol a legkevésbé kellene).
 */
export function unitsScriptLineAuto() {
  return 'node v3ref/mutate.mjs --units-auto';
}

/**
 * A KÉT MEGENGEDETT ALAK — MEGENGEDŐ SZABÁLY, NEM FELSOROLÁS (KUKA-057). A kérdés nem az, hogy a
 * sor melyik szöveggel EGYEZIK, hanem hogy a darabolása EBBŐL az otthonból származik-e: vagy a
 * származtatott `--units-auto`, vagy a generátor által kiírt teljes felsorolás. Kézzel gépelt
 * nevező egyik alakban sem élhet — azt a `verify:kuka` KUKA-177 tiltó-mintája is fogja.
 */
export function unitsScriptLineIsHomed(line) {
  const t = String(line || '').trim();
  if (t === unitsScriptLineAuto()) return { ok: true, form: 'derived' };
  if (t === unitsScriptLine(DECLARED_UNITS)) return { ok: true, form: 'enumerated' };
  return {
    ok: false,
    form: null,
    why: `a sor egyik OTTHONOS alakkal sem egyezik — vagy \`${unitsScriptLineAuto()}\` (származtatott), `
      + `vagy a ${DECLARED_UNITS} egységre kiírt teljes felsorolás`,
  };
}
