// V3 MAGREFERENCIA — K07: parancs, egyszeri hatás, újrapróbálás és KIADÁS.
//
// Az R32 K07 zárómondata a mérce, és ez a MI C08-as ellenpéldánk JAVÍTOTT alakja — a másik fél
// itt helyesbített minket, és igaza volt:
//   „Hatás visszajátszása és válasz kiadása KÜLÖN: a korábbi belső eredmény változatlan marad, de
//    az ismételt kérőnek CSAK A JELENLEG KIADHATÓ vetületet adjuk. Visszavont jog esetén sem
//    eredményadatot, sem védett létezési jelzést nem adunk pusztán a kulcs ismeretére."
//
// ═══ EZ A FÁJL HAT MEGNEVEZETT MAGHIBÁT HORDOZOTT (Q01–Q04 · Q14 · Q15) ═════════════════════════
//
// A négy fogalom, amit a régi kód EGYBE mosott — és ezért mindegyik hibás volt:
//
//   NÉVTÉR      KINEK a kulcsa ez?          → (book_id, actor, idem_key)          [Q01]
//   AZONOSSÁG   UGYANAZ a művelet?          → hash(type, type_version, declared)  [Q02 · Q03]
//   VÉGLEGESÍTÉS mikor lesz KÉSZ?           → jog ÚJRA a feloldás UTÁN            [Q04]
//   KIADÁS      mit adtunk oda, KINEK?      → EGY kapu, HÁROM hívó                [Q14 · Q15]
//
// A szétválasztás nem elegancia: a régi kódban a `type` változása NÉMÁN a régi hatásra mutatott
// (azonosság hiánya), a kulcs pedig könyvek KÖZÖTT szivárgott (névtér hiánya). Egy fogalom, egy
// otthon (KUKA-003); és ahol két fogalom egy oszlopon ült, ott mindkettő hazudott (KUKA-002).
import { createHash } from 'node:crypto';
import { rightAt } from './authz.mjs';

// ═══ KANONIZÁLÁS (Q02) ══════════════════════════════════════════════════════════════════════════
//
// A régi alak EGY sor volt: `JSON.stringify(obj, Object.keys(obj).sort())`. A második argumentum
// TÖMBKÉNT megadva NEM „rendezés", hanem MEZŐ-SZŰRŐ, és MINDEN szinten hat: a `lines[].sku` és a
// `lines[].qty` egyszerűen KIESETT a hash-elt szövegből. Mérve: a mennyiség 1 → 999 változása
// ugyanannak a kérésnek látszott, konfliktus nélkül.
//
// AMIT A KANONIZÁLÓ MEGKÖVETEL, ÉS MIÉRT:
//   · `toJSON` az ELSŐ ág — különben a mai `JSON.stringify` által megkülönböztetett `Date`-ek
//     egyetlen `{}`-vé olvadnának össze. Ez REGRESSZIÓ lett volna, nem javítás.
//   · az objektum-kulcsok MINDEN szinten rendezettek — a sorrend nem azonosság
//   · a TÖMB sorrendje JELENTÉSES marad (két tétel felcserélése MÁS kérés)
//   · nem véges szám ⇒ `non_finite_number`; `undefined`/függvény/szimbólum ⇒ `unsupported_value`
//     (a `{note: undefined}` ≡ `{}` néma összeolvadás DEKLARÁLT szabályt kap, nem véletlent)
//
// KIMONDVA, MI NEM KÉSZÜLT EL: a Q02 elvárásának másik fele — „az ISMERETLEN mezőt a séma
// UTASÍTSA EL" — ebben a körben NEM teljesül. Séma-regiszter nélkül az ismeretlen mező nem
// kiesik (ez a lelet zárva), hanem ÚJ AZONOSSÁGOT képez. A zárt bemenetséma külön, nagyobb
// döntés; kimondjuk, nem csendben hagyjuk el (KUKA-051).
export const CANON_VERSION = 'canon-1';

export class CanonError extends Error {
  constructor(reason, path) {
    super(`kanonizálás: ${reason} itt: ${path || '(gyökér)'}`);
    this.name = 'CanonError';
    this.reason = reason;
    this.path = path || '';
  }
}

export function canonicalize(v, path = '') {
  // ADAPTER CSAK NEVEZETT FAJTÁRA (R49/C08). A `toJSON` a DEKLARÁLT tartalom fölé ír: egy
  // bemondott mező más értéket kanonizálhat, mint amit hordoz, tehát KÉT különböző szándék
  // ugyanazt az azonosságot kapná. A `Date` az EGYETLEN engedélyezett adapter, mert annak az
  // alakja szabvány; minden más `toJSON`-t hordozó tárgy ELUTASÍTVA (KUKA-020: nem néma).
  if (v instanceof Date) {
    if (!Number.isFinite(v.getTime())) throw new CanonError('non_finite_number', path);
    return JSON.stringify(v.toISOString());
  }
  if (v !== null && typeof v === 'object' && typeof v.toJSON === 'function') {
    throw new CanonError('adapter_not_allowed', path);
  }
  if (v === null) return 'null';
  const t = typeof v;
  if (t === 'boolean') return v ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(v)) throw new CanonError('non_finite_number', path);
    return JSON.stringify(v);
  }
  if (t === 'string') return JSON.stringify(v);
  if (t === 'undefined' || t === 'function' || t === 'symbol' || t === 'bigint') {
    throw new CanonError('unsupported_value', path);
  }
  if (Array.isArray(v)) {
    // LYUKAS TÖMB ELUTASÍTVA (R49/C10): a `map` átlépi a lyukat, ezért az `Array(1)` és a `[]`
    // BÁJTRA azonos alakot adna — két különböző bemenet egy azonossággal (KUKA-012 a kanonizálón).
    for (let i = 0; i < v.length; i += 1) {
      if (!(i in v)) throw new CanonError('sparse_array', `${path}[${i}]`);
    }
    // A TÖMB SORRENDJE JELENTÉSES — nem rendezzük.
    return `[${v.map((x, i) => canonicalize(x, `${path}[${i}]`)).join(',')}]`;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) throw new CanonError('unsupported_value', path);
  const keys = Object.keys(v).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(v[k], path ? `${path}.${k}` : k)}`).join(',')}}`;
}

const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);

// ═══ AZONOSSÁG (Q03) — UGYANAZ A MŰVELET? ═══════════════════════════════════════════════════════
//
// A régi kód CSAK a `declared` tartalmat hash-elte, ezért a `stock.receipt` → `stock.issue` csere
// és az `1` → `2` verzióváltás is NÉMÁN a RÉGI hatásra mutatott. Névteret választani szabad, MÁS
// MŰVELETET ugyanannak minősíteni nem.
//
// A KÖNYV NINCS benne: az a NÉVTÉRBEN áll. Ugyanaz a tény ne üljön két helyen (KUKA-002).
export function commandIdentity({ type, typeVersion, declared }) {
  return hash(`${CANON_VERSION}|${canonicalize({ type, type_version: typeVersion, declared })}`);
}

// ═══ NÉVTÉR (Q01) — KINEK A KULCSA? ═════════════════════════════════════════════════════════════
//
// A hatókört a SZERVER képezi. A `commandScope` HIÁNYOS címre DOB — a bekötési hiba nem lehet
// ugyanaz a válasz, mint a valódi „nem" (KUKA-020).
export function commandScope({ bookId, actor, idemKey }) {
  const missing = [];
  if (!bookId) missing.push('bookId');
  if (!actor) missing.push('actor');
  if (!idemKey) missing.push('idemKey');
  if (missing.length) throw new Error(`commandScope: hiányos hatókör-cím: ${missing.join(', ')}`);
  return Object.freeze({ bookId, actor, idemKey });
}

export function findCommandInScope(store, scope) {
  return store.get('SELECT * FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?',
    scope.bookId, scope.actor, scope.idemKey);
}

/** A hatás azonosítója a TELJES hatókörből — két névtér SOHA nem oszthat egy hatásazonosítót. */
// ═══ A HATÓKÖR EGY ALAKJA (R49/C04 + C06) ══════════════════════════════════════════════════════
//
// A hármas (könyv · aktor · kulcs) eddig KÉT helyen lapult ki egymástól függetlenül, és MINDKÉT
// lapítás veszteséges volt: az `effectIdFor` elválasztó-karakteres összefűzést hashelt (tehát
// nem injektív — a `|` áttolható egyik tengelyről a másikra), a kiadás-leltár pedig KÉT laza
// oszlopra képezte, amiből az AKTOR tengelye egyszerűen eltűnt. A helyes kódoló MÁR OTT ÁLLT
// ugyanebben a fájlban (`canonicalize`), csak az azonosság ágán hívtuk (KUKA-039).
// A verzió-előtag nem dísz: egy későbbi kódolás-váltás így nem lesz néma.
export const SCOPE_VERSION = 'scope-1';
export function commandRef(scope) {
  const s = commandScope({
    bookId: scope.bookId ?? scope.book_id,
    actor: scope.actor,
    idemKey: scope.idemKey ?? scope.idem_key,
  });
  return `${SCOPE_VERSION}|${canonicalize({ book_id: s.bookId, actor: s.actor, idem_key: s.idemKey })}`;
}
export function effectIdFor(scope) {
  return `eff_${hash(commandRef(scope))}`;
}

// ═══ A KIADÁSI KAPU (Q15 + Q14) — EGY HELY, HÁROM HÍVÓ ═════════════════════════════════════════
//
// A K05 leltár-szabály a régi kódban EGYETLEN ág törzsében élt (`readCommandResult`), ezért a
// BEFOGADÁS és az ISMÉTLÉS nyom nélkül adott ki hatásazonosítót, állapotot és feloldott adatot:
// a leltárban NULLA sor állt. Ha egy szabály két helyen kell, de egy helyen áll, az nem szabály,
// hanem véletlen (KUKA-039).
//
// A BORÍTÉK (`ok`, `error`, `message`) NEM tartalom — a többi minden mezőútja KIADOTT TARTALOM,
// és bekerül a `fields` listába. Az `effect_id` és a `state` is: a lelet KIFEJEZETTEN megnevezte
// őket („a retry ág ugyanígy ad állapotot és effect_id-t leltár nélkül").
// A `command_accept` KIVEZETVE (R47) — de NEM a régi indokkal. Az R47-ben azt írtuk ide, hogy „a
// befogadás válasza nem közöl új tényt, tehát nincs mit leltározni". A külső fél ezt MEGCÁFOLTA,
// és igaza van: a SIKERES VÉGLEGESÍTÉS a szerver oldalán keletkezett új tény — a hívó a kulcsot
// és a tartalmat adta, azt viszont nem ő adta, hogy a parancs KÉSZ LETT.
//
// A helyes megkülönböztetés nem „új tény / nem új tény", hanem hogy MELYIK KÉRDÉSRE FELEL A SOR:
//   · KIADÁS (`disclosure`): ki látott olyan tartalmat, ami a kéréstől FÜGGETLENÜL is állt;
//   · NYUGTA (`command_event`): mit KÖTELEZETT EL a szerver ebben a kérésben.
// Két kérdés, két otthon (KUKA-002) — de EGYIK sem maradhat üresen. Az R47-es alak a kiadás-sort
// helyesen nem írta, a helyére viszont SEMMIT nem tett, és ettől a véglegesítés nyomtalan lett.
// A szót azért is elvesszük, nem csak a hívást, mert a halott rovatra állított őr hamis
// riasztás-gyár, és a `disclose` így ismeretlen fajtaként DOB rá, ha valaki visszatenné
// (KUKA-052 · fail-closed).
export const DISCLOSURE_VIEW = Object.freeze(['command_replay', 'command_result']);
const ENVELOPE = Object.freeze(['ok', 'error', 'message']);

// ═══ A NYUGTA-SZERZŐDÉS (R50) ══════════════════════════════════════════════════════════════════
//
// A nyugta ALAKJA egy helyen születik, és MINDKÉT ág hívja (KUKA-039) — a befogadás és az
// ismétlés ugyanazt a borítékot adja, tehát a hívó nem tud a kettő között alak-különbségből
// következtetni arra, hogy melyik történt (a `replayed` mező MONDJA MEG, nem a forma).
//
// NYOMOT viszont csak ott hagyunk, ahol a szerver TÉNYLEG elkötelezett valamit: az ismétlés
// semmit nem ír, tehát nyugta-sort sem szül (az ismétlés KIADÁS, és `command_replay` sorral már
// leltározva van). Egyetlen esemény-fajta él ma; a regiszter ZÁRT, tehát ismeretlen fajtára DOB.
export const RECEIPT_EVENT = Object.freeze(['command_finalized']);

/** A nyugta ALAKJA — a befogadás és az ismétlés KÖZÖS borítéka. */
export function commandReceipt({ effectId, state, replayed }) {
  return Object.freeze({ ok: true, effect_id: effectId, state, replayed });
}

/**
 * A nyugta TARTÓS nyoma. A hívó KÖTELESSÉGE a hatás tranzakcióján BELÜL hívni: ha a hatás
 * visszagördül, a nyugta sem állhat meg (KUKA-026 ellenpárja — a kudarc nyoma nem utazhat a
 * visszagördülő tranzakcióval, a siker nyugtája viszont KÖTELEZŐEN azzal utazik).
 */
export function recordCommandEvent({ store, event, scope, effectId, state, clock }) {
  if (!RECEIPT_EVENT.includes(event)) throw new Error(`recordCommandEvent: ismeretlen nyugta-fajta: ${event}`);
  store.run(
    'INSERT INTO command_event (book_id, actor, idem_key, event, state, effect_id, at) VALUES (?,?,?,?,?,?,?)',
    scope.bookId, scope.actor, scope.idemKey, event, state, effectId, clock.now());
}

/** A kiadott mezőUTAK — az ÉRTÉK szándékosan nem kerül a leltárba (az lenne a második otthon). */
export function releasedFieldPaths(body, prefix = '') {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return prefix ? [prefix] : [];
  return Object.keys(body).sort().flatMap((k) => (prefix === '' && ENVELOPE.includes(k)
    ? []
    : releasedFieldPaths(body[k], prefix ? `${prefix}.${k}` : k)));
}

export function disclose({ store, kind, scope, ref, recipient, body, clock }) {
  if (!DISCLOSURE_VIEW.includes(kind)) throw new Error(`disclose: ismeretlen kiadás-fajta: ${kind}`);
  store.run('INSERT INTO disclosure (recipient, view, scope, ref, fields, at) VALUES (?,?,?,?,?,?)',
    recipient, kind, scope, ref, JSON.stringify(releasedFieldPaths(body)), clock.now());
  return body;
}

// ── A PARANCS BEFOGADÁSA ────────────────────────────────────────────────────────────────────────
export function submitCommand({ store, idemKey, actor, bookId, type, typeVersion, declared, resolve, clock, externalEvidence }) {
  const scope = commandScope({ bookId, actor, idemKey });
  // A KANONIZÁLÁS TISZTA FELOLDÓ: DOB, ha a bemenet nem eldönthető. A HATÁR viszont nem dobhat
  // ki nyers kivételt a hívóra — az ugyanabba a csatornába kerülne, mint a programhiba
  // (KUKA-020), és a mérő nem tudná megkülönböztetni a valódi „nem"-től (KUKA-064: mondja meg,
  // mit kell javítani). Ezért a határon NEVEZETT elutasítássá fordítjuk.
  let identity;
  try {
    identity = commandIdentity({ type, typeVersion, declared });
  } catch (e) {
    if (!(e instanceof CanonError)) throw e;
    return Object.freeze({ ok: false, error: 'declared_not_canonical', reason: e.reason, at: e.path ?? null });
  }

  // A JOGOT ELŐBB kérdezzük meg, mint hogy a kulcsról bármit mondanánk. Enélkül a puszta
  // ÚJRAPRÓBÁLÁS elárulná, hogy a kulcshoz tartozik-e parancs — a kulcs próbálgatható
  // létezés-csatorna lenne (KUKA-084).
  const refused = Object.freeze({
    ok: false, error: 'not_available',
    message: 'ehhez a művelethez most nincs jogod ebben a könyvben',
    effect_id: null, state: null,
  });
  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {
    return refused;
  }

  const prior = findCommandInScope(store, scope);
  if (prior) {
    // K07: „Azonos kulcs és ELTÉRŐ deklarált tartalom KONFLIKTUS." Az azonosság a MŰVELETET és a
    // VERZIÓT is lefedi, tehát a `stock.receipt` → `stock.issue` csere is ide esik (Q03).
    if (prior.identity_hash !== identity) {
      return Object.freeze({ ok: false, error: 'idempotency_conflict', message: 'ugyanaz a kulcs más művelettel vagy tartalommal érkezett' });
    }
    // AZ ISMÉTLÉS IS KIADÁS (Q15): a hatásazonosító és az állapot védett tény. Az ismétlés NEM
    // ír semmit, tehát NYUGTA-sort nem szül — de a borítékot ugyanaz a feloldó adja (KUKA-039).
    return store.tx(() => Object.freeze(disclose({
      store, kind: 'command_replay', scope: scope.bookId, ref: commandRef(scope), recipient: actor, clock,
      body: commandReceipt({ effectId: prior.effect_id, state: prior.state, replayed: true }),
    })));
  }

  // ── A FELOLDÁS, majd a VÉGLEGESÍTÉSI KAPU (Q04) ───────────────────────────────────────────────
  // A feloldás EGYSZER fut és RÖGZÜL. De közben eltelik idő: a régi kód a feloldás UTÁN azonnal
  // véglegesített, tehát ha a `resolve` alatt visszavonták a jogot, a parancs MÉGIS `finalized`
  // lett és adatot adott vissza. A jogot ÚJRA meg kell kérdezni, közvetlenül az írás előtt.
  //
  // KUKA-088 — MELYIK ELLENŐRZÉST FAGYASZTOTTUK BE? A PILLANATKÉPET fagyasztjuk (a feloldott
  // bemenet nem változhat utólag), a JOGOT nem: az minden kiadásnál újra fut.
  const resolvedJson = JSON.stringify(resolve ? resolve() : {});

  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {
    // A feloldás alatt elveszett a jog ⇒ a parancs NEM lesz kész. Semmit nem írunk.
    return refused;
  }

  const effectId = effectIdFor(scope);
  return store.tx(() => {
    // ── VÉGLEGESÍTÉSI KAPU A PARANCS-OLDALON (R49 · a mi teljesség-vizsgálatunk lelete) ─────────
    //
    // A fenti jog-ellenőrzés a TRANZAKCIÓN KÍVÜL áll, tehát csak azt zárja le, ami a `resolve()`
    // ALATT történt. MÉRVE, a mai kódon: ha a megvonás a `store.tx` HATÁRÁN következik be, a
    // parancs `finalized` lesz és a sor megszületik — a visszavont jogú aktor hatást könyvel.
    //
    // Ez UGYANAZ a hibaosztály, mint a C02/C03 a meghívó-oldalon, csak MÁSIK ÍRÓN: a döntés
    // határa és az ÍRÁS határa két külön határ (KUKA-039 — a szabály itt is kell, nem csak ott).
    // Ugyanezt a három ágat végigmérve az ISMÉTLÉS és az OLVASÁS MÁR ZÁRVA VAN (mindkettő
    // `not_available`-t ad, nulla leltár-sorral) — ezt kimondjuk, hogy a lelet ne legyen tágabb,
    // mint amit mértünk.
    if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {
      return refused;
    }
    store.run(
      `INSERT INTO command (idem_key, actor, book_id, type, type_version, identity_hash,
                            resolved_json, effect_id, state, finalized_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      idemKey, actor, bookId, type, typeVersion, identity,
      resolvedJson, effectId, 'finalized', clock.now());
    // A BEFOGADÁS NEM SZOLGÁLTAT KI TARTALMAT — DE NYUGTÁT AD (R47 · Q14 × Q15 · R50-ben javítva).
    //
    // Az első alakunk itt visszaadta a feloldott tartalmat (`resolved: snapshot`) ÉS leltárba is
    // tette. Ezt „a ti két elvárásotok ütközik" mondattal adtuk volna ki — TÉVESEN (KUKA-091).
    // A `resolved` KISZOLGÁLÁS, tehát CSAK a leltározott olvasó úton mehet ki (Q15 szigorú
    // olvasata): a beadás válasza „ELŐKÉSZÍTVE", nem „KISZOLGÁLVA" (a ti szavaitok). Ez áll.
    //
    // A MÁSODIK FELE VISZONT NEM ÁLLT. Azt írtuk, hogy a válaszban maradó `effect_id` és `state`
    // a hívó saját bemeneteinek lenyomata, tehát „nem közöl új tényt, nincs mit leltározni". Ti
    // ezt megcáfoltátok: a SIKERES VÉGLEGESÍTÉS a szerver oldalán keletkezett új tény. Az
    // `effect_id` valóban levezethető, de az, hogy a parancs KÉSZ LETT, nem — épp ez az, amiért
    // a hívó egyáltalán hív. A hibás következtetés nem az volt, hogy nem `disclosure` sort
    // írtunk (nem kiszolgálás), hanem hogy a helyére SEMMIT nem tettünk.
    //
    // Ezért a nyugta a `command_event` könyvbe kerül, UGYANEBBEN a tranzakcióban: nyugtát csak
    // megtörtént hatásról adunk, és megtörtént hatás nem maradhat nyugta nélkül.
    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock });
    return commandReceipt({ effectId, state: 'finalized', replayed: false });
  });
}

// ── A VÁLASZ KIADÁSA (K07 + K05) ────────────────────────────────────────────────────────────────
// Külön művelet a hatástól. A kulcs ISMERETE nem jogosultság: a mai jogot minden kiadásnál
// ellenőrizzük, és a nemleges válasz NEM árulja el, hogy a parancs létezik-e (KUKA-084).
//
// A CÍM OPCIONÁLIS. Ha kötelezővé tennénk, a cím nélkül hívó ellenpróbák NEVEZETT DOBÁSRA
// futnának, és egy valódi lelet FAIL helyett MÉRŐHIBÁVÁ maszkolódna — épp az az alak, amit a
// saját mérőnk tilt. Nulla mező ⇒ puszta kulcs, de CSAK egyértelmű, MA IS LÁTHATÓ sorra.
export function readCommandResult({ store, idemKey, requester, bookId, actor, clock, externalEvidence }) {
  const refused = Object.freeze({
    ok: false,
    error: 'not_available',
    message: 'ehhez a hivatkozáshoz most nem tartozik kiadható eredmény',
    effect_id: null,
    result: null,
  });

  const addressed = bookId !== undefined || actor !== undefined;
  if (addressed && !(bookId && actor)) {
    // RÉSZLEGES cím: bekötési hiba, nem valódi „nem" (KUKA-020).
    throw new Error('readCommandResult: részleges hatókör-cím — bookId és actor együtt kell');
  }

  let cmd;
  if (addressed) {
    cmd = findCommandInScope(store, commandScope({ bookId, actor, idemKey }));
  } else {
    // A JELÖLTEKET ELŐBB A MAI JOG SZŰRI, és csak a LÁTHATÓK között követelünk egyértelműséget.
    // Enélkül egy IDEGEN könyvben megjelenő azonos kulcs átbillenthetné a kérő korábban sikeres
    // olvasását `refused`-ra — vagyis egy hatókörén KÍVÜL keletkezett tény üzenne neki.
    const rows = store.all('SELECT * FROM command WHERE idem_key = ?', idemKey);
    const visible = rows.filter((r) => rightAt({
      store, subjectId: requester, bookId: r.book_id, opClass: 'own_book', clock, externalEvidence,
    }).allowed);
    if (visible.length !== 1) return refused;
    cmd = visible[0];
  }
  if (!cmd) return refused;

  if (!rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence }).allowed) {
    return refused;
  }

  // A HATÁS változatlan; a VETÜLET most készül, mai jogon. A HATÓKÖR A KIADOTT REKORDBÓL jön,
  // nem a kérésből — különben a leltár a ROSSZ könyvre könyvelne (KUKA-002).
  const resolved = JSON.parse(cmd.resolved_json);
  return store.tx(() => Object.freeze(disclose({
    store, kind: 'command_result', scope: cmd.book_id, ref: commandRef(cmd), recipient: requester, clock,
    body: {
      ok: true,
      error: null,
      message: 'az eredmény kiadva',
      effect_id: cmd.effect_id,
      result: Object.freeze({ ...resolved }),
    },
  })));
}
