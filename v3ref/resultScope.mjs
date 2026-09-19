// V3 MAGREFERENCIA — DSC-01: A KIADOTT EREDMÉNY ADATKÖRE (R77/F02).
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R77/F02). Egy parancs eredménye `{qty:1,
// unit_price:12345}` volt, az olvasót pedig az `arak` adatkörre TILTOTTUK. `dataScope: 'arak'`
// kontextussal a kiadás helyesen megtagadta; UGYANAZT az eredményt `dataScope: 'keszlet'`
// kontextussal viszont EGÉSZBEN visszaadta — az ÁRMEZŐVEL együtt. A tiltás tehát nem az adatra
// hatott, hanem egy CÍMKÉRE, amit a kérés hozott magával.
//
// A HIBA OSZTÁLYA: KÉT KÜLÖNBÖZŐ TÉNY EGY NÉVEN (KUKA-002). A `dataScope` a kérésben a
// HITELESÍTÉSI KONTEXTUS egyik tengelye („milyen körben lépek be"), az `arak` tiltásnak viszont
// arról kellene szólnia, hogy MILYEN ADAT jöhet ki. A kettő ugyanazt a szót viselte, ezért úgy
// nézett ki, mintha a védelem megvolna — miközben a kimenő tartalomhoz SEMMI nem volt kötve
// (KUKA-126: amit a küldő kiír és a fogadó nem mér, az dísz; itt a fogadó a ROSSZ dolgot mérte).
//
// A SZERZŐDÉS: A SZÜKSÉGES ADATKÖRT A TÍPUS DEKLARÁLJA, NEM A KÉRŐ MONDJA MEG. Amit a beadó
// begépelhet, az állítás, nem mérés (KUKA-121); ezért a kiadás azt kérdezi meg, hogy a KIADANDÓ
// EREDMÉNY mezői MELY adatkörökbe tartoznak — a rendszer saját, megbízható deklarációjából —, és
// MINDEGYIKRE külön megnézi, tilos-e az olvasónak.
//
// A BIZTONSÁGOS ALAPÉRTELMEZÉS: A VEGYES EREDMÉNY EGÉSZBEN MEGTAGADVA. Szabályos mezővetítés
// (csak-mennyiség válasz) ma NINCS a magreferenciában, és nem tettetjük, hogy van: amíg nem épül
// meg, a tiltott adatkört ÉRINTŐ eredmény nem megy ki részlegesen sem. Ezt a korlátot kimondjuk,
// nem elhallgatjuk (KUKA-015).
//
// R79 — EGY SAJÁT ÁLLÍTÁS HELYESBÍTVE. Az R78-as alakban ide azt írtam, hogy „vegyes adatkörű
// RÉSZFA ma nem ábrázolható, mert ahhoz mezővetítés kellene". A külső fél ezt megcáfolta, és igaza
// van: a BESOROLÁS és a RÉSZLEGES KIADÁS két külön képesség. A vegyes tartalmat akkor is meg lehet
// tagadni EGÉSZBEN, ha a rendszer PONTOSAN felismeri, melyik mező mennyiségi és melyik ár — sőt
// éppen az a helyes sorrend: előbb ismerjük fel, aztán döntsünk a kiadásról. A téves összekapcsolás
// egy KÉPESSÉG hiányát tette egy MÁSIK képesség feltételévé (KUKA-050: a kódba írt próza is elévül).
//
// A HIÁNYZÓ BESOROLÁS KÜLÖN VÁLASZ, ÉS ZÁR (KUKA-124/2). Ha a típus nincs deklarálva, vagy az
// eredmény olyan mezőt hoz, amit a deklaráció nem sorol be, az NEM „nincs korlátozás", hanem
// NEM TUDJUK — tehát nem adható ki. A kettőt nem mossuk össze a „nincs jogod" válasszal sem: a
// helye dönti el, melyik alakban jelenik meg (lásd a `command.mjs` két bekötését).

// A TILTÁS-KAPU innentől a KÖZÖS döntés-feloldón át fut (RSB-01, R47) — egy fogalomnak egy
// otthona: ez a modul a TARTALOM adatköreit sorolja be, a JOGOT nem maga dönti el (KUKA-003).
import { scopeReleaseDecision } from './releaseScope.mjs';
import { parseQuantity, formatQuantity, QUANTITY_PROFILES, DEFAULT_PROFILE_ID } from './quantity.mjs';

// ═══ A ZÁRT HALMAZ ══════════════════════════════════════════════════════════════════════════════
//
// `Map`, nem sima objektum — az örökölt kulcs (`toString`, `constructor`) nem tud „ismert
// adatkörré" oldódni (a Q07 tanulsága, ugyanúgy, ahogy a tiltás-fajtáknál).
export const KNOWN_DATA_SCOPES = Object.freeze(['keszlet', 'arak']);

const SCOPE_MEANING = new Map([
  ['keszlet', 'készlet-adat: mennyiség, cikkazonosító, tételsorok'],
  ['arak', 'ár-adat: egységár, listaár, árlista-hivatkozás'],
]);

// ═══ A TÍPUS DEKLARÁCIÓJA — AZ EREDMÉNY ALAKJA ÉS A LEVELEK ADATKÖRE (R79/F01) ══════════════════
//
// A kulcs a TÍPUS és a VERZIÓ együtt: egy típus új verziója új mezőket hozhat, és a besorolást
// akkor ÚJRA ki kell mondani — a régi deklaráció nem öröklődik hallgatólagosan.
//
// AZ R78-AS ALAK CSAK A LEGFELSŐ SZINTET NÉZTE, és a mező teljes részfáját a felső címkéjével
// azonosnak vette. A külső fél FUTÁSSAL mutatta meg, mit jelent ez (R79/F01):
//
//     {"lines":[{"qty":1,"unit_price":12345}]}      → a `lines` „keszlet", tehát az ÁR IS kiment
//     {"qty":{"unit_price":12345}}                  → a `qty` „keszlet", tehát az ÁR IS kiment
//
// Mindkettő az `arak`-ra TILTOTT olvasónak, `keszlet` kontextussal. A felső mező CÍMKÉJE tehát nem
// helyettesíti a részfa SÉMÁJÁT — és még a mennyiségnek szánt `qty` is tetszőleges objektumot
// fogadott (KUKA-038: a deklaráció LÉTEZÉSE nem bizonyítja, hogy a tartalmat MÉRTÜK is).
//
// A MAI ALAK: a deklaráció SÉMA, a levelek hordozzák az adatkört.
//
//   `{ kind:'number'|'string', scope:'keszlet'|'arak' }`   LEVÉL — típus ÉS adatkör
//   `{ kind:'array', of:<spec> }`                          TÖMB — az elemek alakja is deklarált
//   `{ kind:'object', fields:{ név:<spec> } }`             OBJEKTUM — zárt mező-lista
//
// A KIADÁS ADATKÖREI A VALIDÁLT ALAKBÓL jönnek: annyi adatkör, ahány LEVÉL ténylegesen ott van.
// Ezért a `{lines:[{qty:1}]}` TISZTA mennyiségi eredmény (kiadható a készlet-olvasónak), a
// `{lines:[{qty:1,unit_price:1}]}` viszont VEGYES — és egészben megtagadva.
//
// NINCS GLOBÁLIS MEZŐNÉV-TALÁLGATÁS (a külső fél kimondott kérése): a `unit_price` NÉV önmagában
// semmit nem jelent — a jelentését az adja, hogy melyik TÍPUS melyik POZÍCIÓJÁN áll. Ugyanaz a név
// egy másik típusban mást jelenthet, ezért a séma típusonként zárt (KUKA-002).
const SEP = '';
const declKey = (type, typeVersion) => `${String(type ?? '')}${SEP}${String(typeVersion ?? '')}`;

// ── A MENNYISÉG LEVELE: `decimal`, NEM `number` (a SAJÁT leletem, R10-F01 bekötése közben) ───────
//
// AMI KIBUKOTT. Amikor a bevétet a VALÓDI parancs-útra kötöttem, a `stock.receipt` eredménye ezen az
// osztályozón ment át — és ELBUKOTT: a séma itt `qty: number`-t követel, az MNY-01 viszont kimondja,
// hogy a mennyiség SOHA nem hagyhatja el a rendszert JSON-számként (a 0,1 nem ábrázolható pontosan).
// Két SAJÁT szerződésem mondott ellent egymásnak, két különböző körből — és a söprés végig zöld
// volt, mert egyikük sem HÍVTA a másikat: az osztályozó próbái kézzel írt eredmény-objektumokon
// futottak, számmal. Pontosan ez a KUKA-038: a deklaráció LÉTEZÉSE nem bizonyítja, hogy a lánc
// végigmegy rajta — a bizonyíték az, hogy a VALÓDI út átér.
//
// MIÉRT NEM „a `number` fogadjon el szöveget is". Az a KUKA-125 hibája lenne fordítva: a levél
// típus-ellenőrzése pont azért van itt, mert egy objektumba csomagolt ár egyszer már kiment egy
// `qty` néven (R79/F01). Ha a `number` mostantól szöveget is elfogad, akkor a `qty: "akármi"` is
// átmegy, és a védelem NÉVLEG megmarad, TARTALMILAG eltűnik. Ezért a mennyiségnek SAJÁT levél-fajtája
// van, ami a KANONIKUS decimális alakot követeli — azt, amit az MNY-01 tulajdonosa állít elő —, és a
// döntést NEM másolja le, hanem a `formatQuantity`/`parseQuantity` párossal MÉRI vissza (KUKA-009).
const leaf = (kind, scope) => Object.freeze({ kind, scope });
const arrayOf = (of) => Object.freeze({ kind: 'array', of });
const objectOf = (fields) => Object.freeze({ kind: 'object', fields: Object.freeze(new Map(Object.entries(fields))) });

// A TÉTELSOR alakja — EGY helyen, mert a bevét és a kiadás ugyanazt a sort hordozza (KUKA-003).
const LINE_SHAPE = objectOf({
  qty: leaf('decimal', 'keszlet'),
  sku: leaf('string', 'keszlet'),
  unit_price: leaf('number', 'arak'),
});

const STOCK_RESULT_SHAPE = objectOf({
  qty: leaf('decimal', 'keszlet'),
  sku: leaf('string', 'keszlet'),
  lines: arrayOf(LINE_SHAPE),
  price: leaf('number', 'arak'),
  unit_price: leaf('number', 'arak'),
  price_list: leaf('string', 'arak'),
});

const RESULT_SHAPES = new Map([
  [declKey('stock.receipt', '1'), STOCK_RESULT_SHAPE],
  [declKey('stock.issue', '1'), STOCK_RESULT_SHAPE],
]);

/** A deklarált típusok listája — a nemleges válasz megnevezheti, mi közül lehet választani (KUKA-064). */
export const DECLARED_RESULT_TYPES = Object.freeze(
  [...RESULT_SHAPES.keys()].map((k) => k.split(SEP).join('/')).sort());

/**
 * A SÉMA BEJÁRÁSA — a VALIDÁLT alakból gyűjtjük az adatköröket, mélységben is.
 *
 * A hiba NEM kivétel: nevezett válasz, mert a bemenet a beadó sajátja, és meg kell tudnia, MIT
 * javítson (KUKA-064). A három hiba-fajta KÜLÖN nevet visel — az ismeretlen mező, a rossz típus és
 * a be nem sorolt levél három különböző teendő (KUKA-020).
 *
 * @returns {{ok:true, scopes:Set<string>} | {ok:false, reason:string, at:string, detail?:string}}
 */
function walk(spec, value, path, scopes) {
  if (spec.kind === 'array') {
    if (!Array.isArray(value)) return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'tömböt vártunk' };
    for (let i = 0; i < value.length; i += 1) {
      if (!(i in value)) return { ok: false, reason: 'result_shape_sparse_array', at: `${path}[${i}]` };
      const r = walk(spec.of, value[i], `${path}[${i}]`, scopes);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  if (spec.kind === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'objektumot vártunk' };
    }
    for (const key of Object.keys(value)) {
      const sub = spec.fields.get(key);
      if (!sub) {
        return {
          ok: false,
          reason: 'result_scope_field_undeclared',
          at: path ? `${path}.${key}` : key,
          detail: `a deklaráció ezen a helyen ezeket a mezőket ismeri: ${[...spec.fields.keys()].sort().join(', ')}`,
        };
      }
      const r = walk(sub, value[key], path ? `${path}.${key}` : key, scopes);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  // LEVÉL: a típus ÉS az adatkör is itt dől el. A típus-ellenőrzés NEM formaság: a `qty` objektumba
  // csomagolt ár pontosan azért ment ki, mert a levélen senki nem kérdezte meg, szám-e (R79/F01).
  const t = typeof value;
  if (spec.kind === 'number' && (t !== 'number' || !Number.isFinite(value))) {
    return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'véges számot vártunk' };
  }
  if (spec.kind === 'string' && t !== 'string') {
    return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'szöveget vártunk' };
  }
  // A MENNYISÉG: KANONIKUS DECIMÁLIS SZÖVEG, az MNY-01 tulajdonosától visszamérve (KUKA-009).
  //
  // A JSON-szám itt NEM engedmény-kérdés: a 0,1 lebegőpontos alakja nem pontos, tehát egy `number`
  // mennyiség a kiadás pillanatában HAMIS adattá válhat. És a szöveg önmagában sem elég: a
  // `qty: "akármi"` ugyanúgy szöveg. Ezért a levél a KANONIKUS alakot követeli — azt, amit a
  // `formatQuantity` állít elő —, és a mérés a két feloldó ODA-VISSZA futtatása, nem egy ide másolt
  // reguláris kifejezés (KUKA-018: ahol két ábrázolás él, a fogyasztó a tulajdonosét kérdezze).
  if (spec.kind === 'decimal') {
    if (t === 'number') {
      return { ok: false, reason: 'result_shape_type_mismatch', at: path,
        detail: 'a mennyiség KANONIKUS DECIMÁLIS SZÖVEG, nem JSON-szám (MNY-01) — a lebegőpontos '
          + 'alak a 0,1-et sem ábrázolja pontosan, tehát a kiadott szám hamis lenne' };
    }
    if (t !== 'string') {
      return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'decimális szöveget vártunk' };
    }
    // A PROFIL-KÉRDÉS, KIMONDVA (KUKA-045 · KUKA-051). Ez a réteg a TÍPUST és az ADATKÖRT sorolja
    // be — a CIKKET nem ismeri, tehát a mennyiség profilját sem tudja megkötni. Ha egyetlen,
    // beégetett profilhoz mérnék, akkor egy MÁSIK tizedes-számú profil születése (amit az MNY-01
    // kifejezetten megenged) ezt a kaput NÉMÁN pirosra vinné jogos eredményen. Ezért a kérdés
    // SZABÁLY, nem lista: kanonikus-e VALAMELYIK deklarált profil szerint. A profil KÖTÉSE ott
    // történik, ahol a cikk ismert — a főkönyvben (KSZ-01) —, és ezt a korlátot a szerződés kiírja.
    const canonicalUnder = Object.keys(QUANTITY_PROFILES).find((pid) => {
      const q = parseQuantity(value, { profileId: pid });
      return q.ok && formatQuantity(q.scaled, pid) === value;
    });
    if (!canonicalUnder) {
      const probe = parseQuantity(value);
      return { ok: false, reason: 'result_shape_type_mismatch', at: path,
        detail: probe.ok
          ? `a mennyiség nem KANONIKUS alakban áll: "${value}" — egyik deklarált profil szerint sem `
            + `(a ${DEFAULT_PROFILE_ID} szerinti kanonikus alak "${probe.text}")`
          : `a mennyiség nem érvényes (${probe.error}): ${probe.detail ?? ''}`.trim() };
    }
  }
  if (!KNOWN_DATA_SCOPES.includes(spec.scope)) {
    return { ok: false, reason: 'result_scope_leaf_unclassified', at: path };
  }
  scopes.add(spec.scope);
  return { ok: true };
}

/**
 * MELY ADATKÖRÖKET ÉRINTI EZ AZ EREDMÉNY — a TÍPUS SÉMÁJÁBÓL, a VALIDÁLT alakon mérve.
 *
 * @returns {{ok:true, scopes:string[]}
 *          | {ok:false, reason:string, message:string, at?:string}}
 */
export function resultScopesOf({ type, typeVersion, result }) {
  const shape = RESULT_SHAPES.get(declKey(type, typeVersion));
  if (!shape) {
    return Object.freeze({
      ok: false,
      reason: 'result_scope_type_undeclared',
      message: `a(z) "${type}" / "${typeVersion}" parancstípus eredményének SÉMÁJA nincs deklarálva. `
        + 'A kiadás nem tudja eldönteni, milyen adatot adna ki, ezért nem ad ki semmit. A ma deklarált '
        + `típusok: ${DECLARED_RESULT_TYPES.join(', ')}. Új típusnál a deklaráció a megépítés része `
        + '(DSC-01), nem utólagos ráadás.',
    });
  }
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    return Object.freeze({
      ok: false,
      reason: 'result_not_an_object',
      message: 'a parancs eredménye nem mezőkre bontható objektum, ezért az adatköre nem sorolható be. '
        + 'A kiadás zárva marad; ez nem „üres eredmény", hanem el nem dönthető besorolás.',
    });
  }
  const scopes = new Set();
  const r = walk(shape, result, '', scopes);
  if (!r.ok) {
    const where = r.at ? `"${r.at}"` : '(gyökér)';
    const msg = r.reason === 'result_scope_field_undeclared'
      ? `a(z) "${type}" / "${typeVersion}" eredményében a ${where} helyen olyan mező áll, amit a séma nem `
        + `ismer. A be nem sorolt mező NEM „korlátozás nélküli": nem tudjuk, mi ez, ezért nem adjuk ki. `
        + `${r.detail || ''} A zárt adatkör-halmaz: ${KNOWN_DATA_SCOPES.join(', ')}.`
      : `a(z) "${type}" / "${typeVersion}" eredménye a ${where} helyen nem felel meg a deklarált sémának`
        + `${r.detail ? ` (${r.detail})` : ''}. A séma a BEÁGYAZOTT alakra és a tömb ELEMEIRE is szól: a `
        + 'felső mező címkéje nem helyettesíti a részfa sémáját (R79/F01).';
    return Object.freeze({ ok: false, reason: r.reason, at: r.at ?? null, message: msg.trim() });
  }
  return Object.freeze({ ok: true, scopes: Object.freeze([...scopes].sort()) });
}

/**
 * KIADHATÓ-E EZ AZ EREDMÉNY ENNEK AZ OLVASÓNAK — a MÉRT adatkörökre mérve.
 *
 * A `request` a kérés egyéb tengelyeit hozza (könyv, művelet, hitelesítő, munkamenet, jogalap), hogy
 * a többi tiltás-fajta ne váljon eldönthetetlenné; a `dataScope` tengelyt viszont MINDIG a MÉRT
 * érték írja felül — épp ez a javítás lényege: nem a kérő címkéje dönt.
 *
 * @returns {{releasable:true, scopes:string[]}
 *          | {releasable:false, reason:string, message:string, scope?:string, scopes?:string[]}}
 */
export function resultReleasable({ store, subjectId, bookId, nowIso, knownAt, type, typeVersion, result, request }) {
  const cls = resultScopesOf({ type, typeVersion, result });
  if (!cls.ok) return Object.freeze({ releasable: false, reason: cls.reason, message: cls.message });

  const base = request && typeof request === 'object' ? request : {};
  const decisions = [];
  for (const scope of cls.scopes) {
    // A DÖNTÉS EGY KAPUN MEGY ÁT (RSB-01 · R47). A régi alak CSAK a tiltást kérdezte meg, tehát a
    // „tiltás hiánya = engedély" hallgatólagos szabályon állt — a K05-DSC-c épp ezt tiltja. A kapu
    // mostantól a MEGLÉVŐ jogalap-láncot is megnézi (a tagságra átvitt adatkör-korlátot), és a
    // döntés MEGNEVEZI az alapját. A tiltás továbbra is ELŐBB dönt, az engedély mellett is.
    const d = scopeReleaseDecision({ store, subjectId, bookId, scope, nowIso, knownAt, request: base });
    decisions.push(d);
    if (!d.allowed) {
      return Object.freeze({
        releasable: false,
        reason: d.reason,
        basis: d.basis,
        scope,
        scopes: cls.scopes,
        decisions: Object.freeze(decisions),
        message: `az eredmény a(z) "${scope}" adatkört is érinti (${SCOPE_MEANING.get(scope) || scope}), `
          + 'az olvasónak pedig erre nincs érvényes olvasási döntése. A VEGYES eredményt egészben '
          + 'tagadjuk meg: szabályos mezővetítés ma nincs megépítve, félkész válasz pedig nem mehet ki. '
          + `${d.message || ''}`.trim(),
      });
    }
  }
  return Object.freeze({
    releasable: true,
    scopes: cls.scopes,
    decisions: Object.freeze(decisions),
    // MIN ÁLLT A KIADÁS — KIMONDVA, NEM LEVEZETVE (KUKA-049 · KUKA-127). Az R47-es alak itt a
    // `membership_only` gyengébb alapot nevezte meg; az R49 óta ilyen alap NINCS (a megadott jog
    // hiánya ZÁR), tehát minden engedő döntés a rögzített olvasási jogon áll. A mezőt ezért a
    // TÉNYLEGES alapokból képezzük — így nem tud némán elcsúszni a valóságtól (KUKA-050).
    bases: Object.freeze([...new Set(decisions.map((d) => d.basis))].sort()),
  });
}
