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
 *
 * R64 (204 mutáció): a KILENCES bontás egységei 14 033 … 14 905 ms-ot kértek — a `mutate.mjs`
 * költségvetése (12 000 ms) fölött, ezért az r79 U04 pozitív ellenpárja pirosra ment, az r57a/r59a
 * egységei időtúllépésbe futottak. A repón belüli `--units-auto` ugyanezen a gépen TIZENNYOLC egységre
 * finomított, mind a költségvetésen belül (2 perc 50 mp). A deklarált szám ezért 18 — negyedszer
 * avult el kézzel; a származtatott alak hiánya a fenti mért korlát miatt áll.
 */
// R164 (253 mutáció, 69 mag-próba): a TIZENNYOLCAS bontás egysége ~19 s-ot kért, a TIZENEGYES
// 31 326 ms-ot — mindkettő a `mutate.mjs` SAJÁT költségvetése (12 000 ms) és a külső korlát
// (15 000 ms) fölött, ezért az `r57a`/`r59a` `spawnSync … ETIMEDOUT`-tal HALT MEG. MÉRVE ugyanezen a
// gépen: 32 egység → 12 487 ms (a saját költségvetés FÖLÖTT), 40 egység → 11 960 ms (BELEFÉR).
// A deklarált szám ezért 40 — ÖTÖDSZÖR avult el kézzel, ÉS a kézi avulás most már NEM a hívó-oldal
// egyetlen védelme: a hívók az `adaptiveUnitPlan`-en mennek át, ami IDŐTÚLLÉPÉSRE finomít (lentebb).
// A statisztika, amit ez megmutatott: az egység költsége NEM a mutáció-szám lineáris függvénye —
// van egy ~4 s-os fix indulási költség (a teljes próbafutás), ezért a „mutáció / N" osztó önmagában
// sosem lehet a szabály (KUKA-045).
export const DECLARED_UNITS = 40;

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

/**
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 * AZ ADAPTÍV DARABOLÁS — A DARABSZÁM MÉRÉSBŐL JÖN, NEM KÉZBŐL (R164/3)
 * ════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * AMIT EZ A FÁJL EDDIG MAGÁRÓL ÁLLÍTOTT, ÉS AMI IGAZ IS VOLT: a `DECLARED_UNITS` kézzel karbantartott
 * szám, és NÉGYSZER avult el a battéria növekedésekor (lásd a fenti bekezdéseket, KUKA-045). ÖTÖDSZÖR
 * is elavult: MÉRVE (R164) egy egység a TIZENEGYES bontáson 31 326 ms-ot kért, a külső fél bejelentett
 * korlátja 15 000 ms — ezért az `r57a` és az `r59a` ADAPTÁLT programok `spawnSync … ETIMEDOUT`-tal
 * haltak meg, és a lánc két örökölt pirosa ebből jött, nem tartalmi bukásból.
 *
 * A STATISZTIKA, AMI MEGMUTATTA: az egység költsége nem a mutációk számával nő egyedül, hanem a
 * MUTÁCIÓNKÉNTI költséggel is (ma 69 mag-próba, 3 890 ms egy teljes próbafutás) — tehát a „mutáció
 * / 24" osztó egy MÁSODIK, rejtett feltevést is hordozott: hogy a mutáció költsége állandó. Nem az.
 *
 * A SZABÁLY, AMI A SZÁM HELYÉRE LÉP — ugyanaz, amit ez a fájl eddig is kimondott, csak most GÉP is
 * betartatja: *minden egység férjen bele a saját költségvetésébe.* Ha nem fér, FINOMABBRA osztunk —
 * a költségvetés nem tágul (KUKA-091). A jel nem jóslat: a gyermek IDŐTÚLLÉPÉSE vagy nem-nulla
 * kilépése. Ez ugyanaz az elv, amit a repón belüli `mutate.mjs --units-auto` már követ; itt a KÜLSŐ
 * programok adaptációja kapja meg, mert azoknak a külső fél 15 000 ms-os korlátját KELL tartaniuk.
 *
 * ÉS A FINOMÍTÁS NEM NÉMA (KUKA-093): a terv minden kísérletet kiír, és ha a plafonon sem fér bele,
 * a válasz NEM zöld, hanem nevezett „nem fért bele".
 *
 * @param {(n:number) => { timedOut: boolean, exit: number|null, runs: Array }} spawnUnits
 *   A hívó adja: n egységet futtat, és megmondja, volt-e IDŐTÚLLÉPÉS. A modul nem spawn-ol — így
 *   próbából is hívható, valódi gyermek nélkül (KUKA-207).
 */
/**
 * A FUTTATÓ SAJÁT KÖLTSÉGVETÉS-TÚLLÉPÉSÉNEK JELE (R164 review, Codex, P2 — `KUKA-381` · `D-VS-3189`).
 *
 * A LELET: ha egy egység a `mutate.mjs` SAJÁT 12 000 ms-os költségvetését lépi túl, de a külső
 * 15 000 ms-os `spawnSync` korlátba még belefér, akkor NEM NULLÁVAL lép ki, miközben `timedOut: false`.
 * Az adaptív terv eddig csak az IDŐTÚLLÉPÉSRE finomított, tehát ezt az ágat „belefért"-nek jelentette,
 * és azonnal visszatért — vagyis a lánc TARTALMI bukásként adta tovább azt, amit épp a finomítás
 * oldott volna meg. És ez nem elméleti: a fenti bekezdés maga dokumentál egy 12 487 ms-os egységet a
 * 32-es bontáson, tehát egy kicsit lassabb futtatón (vagy `VS_BATTERY_UNITS=32` mellett) pontosan ez
 * az eset áll elő.
 *
 * A JEL A FUTTATÓ SAJÁT KIMENETÉBŐL JÖN, és a terv MAGA olvassa ki — nem egy új, beadandó mezőből.
 * Így egy hívó nem tudja ELFELEJTENI bejelenteni (KUKA-227: az új út bélyeg nélkül születik).
 */
export const UNIT_OVER_BUDGET_MARK = 'GEPI-JEL: unit_over_budget';

/** Mely egységek lépték túl a futtató SAJÁT költségvetését — a kimenetük gépi jele alapján. */
export function unitsOverBudget(runs = []) {
  return (Array.isArray(runs) ? runs : [])
    .filter((r) => String(r?.stdout ?? '').includes(UNIT_OVER_BUDGET_MARK))
    .map((r) => String(r?.arg ?? '?'));
}

export function adaptiveUnitPlan({ spawnUnits, startUnits = batteryUnits(), maxUnits = 256, maxAttempts = 5 }) {
  const log = [];
  let n = Math.max(1, Math.min(Number(startUnits) || 1, maxUnits));
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const r = spawnUnits(n);
    const tulLepte = unitsOverBudget(r.runs);
    if (!r.timedOut && tulLepte.length === 0) {
      log.push(`${attempt}. ${n} egység — belefért a ${EXTERNAL_CAP_MS} ms-os korlátba`);
      return { units: n, attempts: attempt, fitted: true, log: Object.freeze(log), result: r };
    }
    log.push(r.timedOut
      ? `${attempt}. ${n} egység — IDŐTÚLLÉPÉS a ${EXTERNAL_CAP_MS} ms-os korláton, finomítás`
      : `${attempt}. ${n} egység — a futtató SAJÁT költségvetését (${UNIT_BUDGET_MS} ms) lépte túl `
        + `${tulLepte.length} egységben (${tulLepte.slice(0, 3).join(', ')}${tulLepte.length > 3 ? ' …' : ''}), finomítás`);
    /**
     * A PLAFONON NEM FUTTATJUK ÚJRA UGYANAZT (R164, KÜLSŐ REVIEW, Codex, P2).
     *
     * A LELET: a régi alak a plafon elérésekor KILÉPETT a hurokból, és utána MÉG EGYSZER elindította
     * a pontosan ugyanolyan — tehát a legdrágább — bontást. Egy lassú gépen, amire ez a tartalék épp
     * készült, ez a duplikált futás nem tud finomítani, viszont elvisz még egy nagy szeletet a KÜLSŐ
     * program-keretből: a külső ellenőrző így bizonyíték-artefaktum NÉLKÜL fut időtúllépésbe. Vagyis
     * a védelem költsége nőtt azzal, ami ellen védett (KUKA-290), és a verdikt az időről szólt, nem a
     * tartalomról (KUKA-216). MA: a plafonon a MÁR MÉRT eredményt tartjuk meg, nem ismételjük.
     */
    if (n >= maxUnits) {
      log.push(`záró: ${n} egység a PLAFONON — A PLAFONON SEM FÉRT BELE (a mért eredményt tartjuk, nem futtatjuk újra)`);
      return { units: n, attempts: attempt, fitted: false, log: Object.freeze(log), result: r };
    }
    n = Math.min(n * 2, maxUnits);
  }
  // A kísérlet-korlát elfogyott, de a plafon még nem: EGY utolsó, FINOMABB bontást adunk.
  const r = spawnUnits(n);
  const tulLepte = unitsOverBudget(r.runs);
  const belefert = !r.timedOut && tulLepte.length === 0;
  log.push(`záró: ${n} egység — ${belefert ? 'belefért'
    : (r.timedOut ? 'NEM FÉRT BELE (a kísérlet-korlát elfogyott)'
      : `NEM FÉRT BELE: a futtató SAJÁT költségvetését lépte túl ${tulLepte.length} egységben`)}`);
  return { units: n, attempts: maxAttempts + 1, fitted: belefert, log: Object.freeze(log), result: r };
}
