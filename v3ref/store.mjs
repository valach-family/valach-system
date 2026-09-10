// V3 MAGREFERENCIA — ELKÜLÖNÍTETT TÁROLÓ (G5).
//
// Ez NEM a V2 adatbázisa és nem éles adat: minden futás SAJÁT, ideiglenes SQLite-fájlt kap
// (`node:sqlite`, Node 22 beépített). Ezért a „nincs DATABASE_URL" NEM indok a magpróba
// elmaradására — az R32 §4 ezt kimondta, és igaza volt.
//
// A séma a K01–K09 szabályokat követi, NEM a V2 sémáját másolja:
//   · az alany BELSŐ azonosítója soha nem e-mail és nem adószám (K01)
//   · a külső azonosító névtérrel, kibocsátóval, joghatósággal és SZÁMOSSÁGGAL jár (K01)
//   · a hitelesítő adat MEGLÉTE külön tény — ez a K03 alak-döntés bemenete
//   · a tagság visszavonása KÜLÖN esemény, nem sor-törlés (K09)
//   · a kiadás LELTÁRBA kerül (K05)
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCHEMA = `
CREATE TABLE subject (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('person','legal_entity','org_unit'))
);

CREATE TABLE external_id (
  subject_id    TEXT NOT NULL REFERENCES subject(id),
  namespace     TEXT NOT NULL,
  issuer        TEXT NOT NULL,
  jurisdiction  TEXT NOT NULL,
  value_raw     TEXT NOT NULL,
  value_norm    TEXT NOT NULL,
  cardinality   TEXT NOT NULL CHECK (cardinality IN ('one_to_one','one_to_many','many_to_many')),
  valid_from    TEXT NOT NULL,
  valid_to      TEXT
);

CREATE TABLE account (
  subject_id    TEXT PRIMARY KEY REFERENCES subject(id),
  credential    TEXT
);

CREATE TABLE book (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL
);

CREATE TABLE membership (
  subject_id    TEXT NOT NULL REFERENCES subject(id),
  book_id       TEXT NOT NULL REFERENCES book(id),
  role          TEXT NOT NULL,
  granted_at    TEXT NOT NULL,
  revoked_at    TEXT,
  PRIMARY KEY (subject_id, book_id)
);

CREATE TABLE membership_revocation (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id    TEXT NOT NULL,
  book_id       TEXT NOT NULL,
  recorded_at   TEXT NOT NULL,
  effective_at  TEXT NOT NULL,
  previous_effective_at TEXT,
  transition    TEXT NOT NULL
);

CREATE TABLE invite (
  token             TEXT PRIMARY KEY,
  book_id           TEXT NOT NULL REFERENCES book(id),
  invitee_namespace TEXT NOT NULL,
  invitee_value     TEXT NOT NULL,
  offered_role      TEXT NOT NULL,
  issuer_subject    TEXT NOT NULL REFERENCES subject(id),
  expires_at        TEXT NOT NULL,
  redeemed_at       TEXT
);

CREATE TABLE pending_intent (
  session_id    TEXT PRIMARY KEY,
  invite_token  TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE channel_proof (
  subject_id    TEXT NOT NULL,
  namespace     TEXT NOT NULL,
  value_norm    TEXT NOT NULL,
  proven_at     TEXT NOT NULL,
  PRIMARY KEY (subject_id, namespace, value_norm)
);

-- A PARANCS NÉVTERE (Q01). Az "idem_key" EGYEDÜL NEM azonosság: az ismétlésvédelmi kulcsot a
-- KLIENS adja, tehát két különböző hívó ugyanazt a szöveget választhatja. A régi
-- "idem_key TEXT PRIMARY KEY" miatt Bob — akinek CSAK a B könyvben volt tagsága — ugyanazzal a
-- kulccsal az A KÖNYV hatásazonosítóját kapta vissza, "replayed:true"-val, és B-ben SOHA nem
-- született hatás. A hatókört a SZERVER képezi, nem a hívó.
--
-- A "type"/"type_version" SZÁNDÉKOSAN NINCS a névtérben: ott MÁSODIK, néma hatást szülne. Az
-- AZONOSSÁG-lenyomatban viszont KONFLIKTUST ad — ez a Q03 követelménye (mérve: a két alak
-- kizárja egymást, ezért a névtér és az azonosság KÉT KÜLÖN fogalom).
CREATE TABLE command (
  idem_key      TEXT NOT NULL,
  actor         TEXT NOT NULL,
  book_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  type_version  TEXT NOT NULL,
  -- A NÉV IS TÉNY: a régi "declared_hash" azt állította, hogy csak a tartalom van benne, holott
  -- a művelet és a verziója is beleszámít (Q03). Ez nem kozmetika — a hibás név hibás modellt tanít.
  identity_hash TEXT NOT NULL,
  resolved_json TEXT NOT NULL,
  effect_id     TEXT,
  state         TEXT NOT NULL,
  finalized_at  TEXT,
  PRIMARY KEY (book_id, actor, idem_key)
);

-- A KIADÁS-LELTÁR (K05). Az azonosságot a TÁROLÓ adja (Q14): a régi, IDŐBŐL képzett azonosító
-- determinisztikus órán ütközött, és a MÁSODIK jogos olvasás nyers
-- "UNIQUE constraint failed"-del állt meg. Kézzel léptetett sorszámot NEM írunk — az a saját
-- megkerülésére tanít (KUKA-045).
--   · "ref"    MIRE vonatkozik a kiadás (enélkül két parancs kiadása egy könyvben azonos sort ad)
--   · "fields" MIT adtunk ki (a mezőUTAKAT, nem az ÉRTÉKET — a leltár ne legyen az adat MÁSODIK
--     otthona: akkor ő maga lenne a következő szivárgás)
CREATE TABLE disclosure (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient     TEXT NOT NULL,
  view          TEXT NOT NULL,
  scope         TEXT NOT NULL,
  ref           TEXT NOT NULL,
  fields        TEXT NOT NULL,
  at            TEXT NOT NULL
);

-- A NYUGTA-KÖNYV (R50 — a külső fél cáfolatára). KÉT KÜLÖN KÉRDÉS, KÉT KÜLÖN OTTHON (KUKA-002):
--   · a disclosure arra felel, MILYEN VÉDETT TARTALMAT ENGEDETT KI a rendszer, KINEK, MILYEN
--     ALAPON — beleértve a kérés közben FRISSEN ELŐÁLLÓ tartalmat is (R51/J4 pontosítás);
--   · a command_event arra, MIT KÖTELEZETT EL A SZERVER ebben a kérésben.
--
-- Az R47-es alakunk azt állította, hogy a befogadás válasza „nem közöl új tényt, tehát nincs mit
-- leltározni". A külső fél ezt megcáfolta, és IGAZA VAN: a hívó a saját bemeneteit adta, de azt,
-- hogy a parancs VÉGLEGESÜLT-E, nem ő adta — az a szerver oldalán keletkezett új tény.
--
-- PONTOSÍTVA (R51/J4): az R50-ben azt írtuk ide, hogy a tény „SEHOL nem hagyott nyomot". Ez TÚL
-- ERŐS volt, és a külső fél helyesbítette: a a parancs sor a végleges állapotot MÁR RÖGZÍTETTE.
-- Az eseménykönyv ettől még hasznos — de KÜLÖN MEGNEVEZETT szerződésként, nem egy nemlétező
-- hiány pótlásaként. A valódi hiba az volt, hogy a véglegesítés tényéhez nem tartozott NEVEZETT,
-- a hatással atomi nyugta, amire a rá épülő mini modulok építhetnének.
--
-- A sor a HATÁSSAL EGY TRANZAKCIÓBAN születik. Ez a KUKA-026 ellenpárja, és fordított előjelű:
-- a KUDARC nyoma nem utazhat a visszagördülő tranzakcióban, a SIKER nyugtája viszont KÖTELEZŐEN
-- azzal utazik — különben nyugtát adnánk olyan hatásról, ami nem történt meg.
-- A NYUGTA INVARIÁNSAI A SÉMÁBAN, NEM A JÓINDULATBAN (R51/J3 — a külső fél N03/N04 esete).
-- Az R50-es alak csak egy ZÁRT ESEMÉNY-NÉVLISTÁT védett, és ezt „a regiszter zárt" mondattal
-- készre is jelentettük. A név csak az EGYIK feltétel: megengedett névvel is lehetett ÁRVA nyugtát
-- írni (nem létező parancsra) és MÁSODIK nyugtát ugyanarra a parancsra.
--   · IDEGEN KULCS a parancs elsődleges kulcsára ⇒ árva sor lehetetlen (a foreign_keys pragma BE
--     van kapcsolva a nyitáskor — enélkül a kényszer néma dísz volna, KUKA-041);
--   · EGYEDISÉG a (parancs × esemény) páron ⇒ egy véglegesítéshez EGY nyugta.
-- Amit a séma nem tud (a nyugta ÁLLAPOTA és HATÁSAZONOSÍTÓJA egyezzen a parancséval, és a hívás
-- a véglegesítés tranzakciójából jöjjön), azt az író recordCommandEvent kényszeríti ki.
CREATE TABLE command_event (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id   TEXT NOT NULL,
  actor     TEXT NOT NULL,
  idem_key  TEXT NOT NULL,
  event     TEXT NOT NULL,
  state     TEXT NOT NULL,
  effect_id TEXT NOT NULL,
  at        TEXT NOT NULL,
  FOREIGN KEY (book_id, actor, idem_key) REFERENCES command (book_id, actor, idem_key),
  UNIQUE (book_id, actor, idem_key, event)
);
`;

export function openStore() {
  const dir = mkdtempSync(join(tmpdir(), 'v3ref-'));
  const path = join(dir, 'ref.sqlite');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return {
    db,
    path,
    close() { db.close(); rmSync(dir, { recursive: true, force: true }); },
    run(sql, ...params) { return db.prepare(sql).run(...params); },
    // A tranzakció a TÁROLÓ szolgáltatása — a hívó nem ír BEGIN-t a kezével (KUKA-003).
    tx(fn) { return withTransaction(db, fn); },
    all(sql, ...params) { return db.prepare(sql).all(...params); },
    get(sql, ...params) { return db.prepare(sql).get(...params); },
  };
}

// ── AZ IDŐPILLANAT EGY ALAKJA (INS-01) ──────────────────────────────────────────────────────────
//
// MIÉRT SZÜLETETT. A rendszerben NÉGY helyen áll idő-összehasonlítás, és MIND A NÉGY SZÖVEGET
// hasonlított össze (`a <= b`), nem időpontot. Ez ISO-8601-en általában működik — amíg mindenki
// ugyanabban a zónában, ugyanazzal a tizedes-pontossággal ír. Amint nem:
//
//   MÉRVE, ÉLŐ KÓDON:  expires_at = '2026-09-09T09:00:00+02:00'  (valósan 07:00Z, tehát LEJÁRT)
//                      óra        = '2026-09-09T08:00:00.000Z'
//                      szöveg-összehasonlítás: '…09:00:00+02:00' <= '…08:00:00.000Z'  →  FALSE
//                      eredmény:  a LEJÁRT meghívó ÉLŐ TAGSÁGOT adott (shape:'birth')
//
// Ez a lelet NINCS a külső fél tizenöt esete között — a saját teljesség-kritikánk találta meg,
// és élő kódon megmértük. A hiba-osztály a KUKA-039 (a fél őr): három hívóra terveztünk
// idő-ellenőrzést, a negyedikre nem, és a negyedik NÉMÁN adott jogot.
//
// A SZABÁLY: a döntés a bizonyíték BÁJTJAIBÓL jöjjön, ne a futtató gép időzónájából.
//   · ZÓNA KÖTELEZŐ — a zóna nélküli alakot a `Date.parse` HELYI időként értelmezi, tehát
//     ugyanaz a bemenet két gépen két időpontot jelentene. Ez nem elemzés-kérdés: ELUTASÍTJUK.
//   · nem véges eredmény (`NaN`) ⇒ nem ok. A `NaN` JSON-ban `null`-ként látszik, tehát a hívó
//     azt hihetné, hogy „nincs megadva" — a KUKA-020 alakja az időn.
//   · MINDEN olvasó EZT hívja (KUKA-009): a tagság, a bizonyíték, a meghívó-ablak és a próbák.
//     Aki a saját `Date.parse`-át írja, az egy ötödik igazságot teremt (KUKA-003).
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Egy időpont-szöveg ELDÖNTHETŐ ezredmásodperce.
 * @returns {{ok: true, ms: number} | {ok: false, reason: string}}
 */
export function instantMs(iso) {
  if (typeof iso !== 'string' || iso.trim() === '') return { ok: false, reason: 'instant_missing' };
  const s = iso.trim();
  if (!ISO_WITH_ZONE.test(s)) return { ok: false, reason: 'instant_not_canonical' };
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return { ok: false, reason: 'instant_unparseable' };
  // NEM LÉTEZŐ NAPTÁRI NAP (R49/C09). A `Date.parse` a '2026-02-30'-at NÉMÁN március 2-ra fordítja,
  // tehát egy ÉRVÉNYTELEN bizonyíték érvényes időtartammá normalizálódna. A dátum-mezőket
  // VISSZAOLVASSUK: ha a naptár nem adja vissza ugyanazt a napot, a bemenet nem eldönthető.
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  const d = new Date(ms);
  const off = /([+-])(\d{2}):(\d{2})$/.exec(s);
  const local = off
    ? new Date(ms + (off[1] === '+' ? 1 : -1) * ((+off[2]) * 60 + (+off[3])) * 60000)
    : d;
  if (local.getUTCFullYear() !== +f[1] || local.getUTCMonth() + 1 !== +f[2] || local.getUTCDate() !== +f[3]) {
    return { ok: false, reason: 'instant_not_a_calendar_day' };
  }
  return { ok: true, ms };
}

/**
 * KÉT időpont viszonya — a hívó ne a nyers számokkal dolgozzon.
 * @returns {{ok: true, cmp: -1|0|1} | {ok: false, reason: string, which: 'a'|'b'}}
 */
export function compareInstants(a, b) {
  const x = instantMs(a);
  if (!x.ok) return { ok: false, reason: x.reason, which: 'a' };
  const y = instantMs(b);
  if (!y.ok) return { ok: false, reason: y.reason, which: 'b' };
  return { ok: true, cmp: x.ms < y.ms ? -1 : (x.ms > y.ms ? 1 : 0) };
}

// ── TRANZAKCIÓ-PRIMITÍV (TX-01) ─────────────────────────────────────────────────────────────────
//
// MIÉRT A TÁROLÓBAN. A Q12 gyökér-oka nem a `redeemInvite` figyelmetlensége volt, hanem hogy a
// tároló NEM ADOTT tranzakció-primitívet — tehát egyetlen hívó SEM tudott atomi lenni. Egy
// fogalomnak EGY otthona (KUKA-003).
//
// MÉRVE (Node v22.22.2, node:sqlite):
//   · a `BEGIN`/`ROLLBACK` az `exec`-en át működik,
//   · egy közbeni hiba (trigger ABORT) után a ROLLBACK a MÁR BEÍRT sorokat is eldobja → 0 sor,
//   · a BEÁGYAZOTT `BEGIN` hibát dob ('cannot start a transaction within a transaction'),
//     ezért a beágyazást KI KELL ZÁRNI, nem „általában nem fordul elő" alapon remélni.
//
// A COMMIT a `try`-on BELÜL van, a ROLLBACK pedig CSAK futó tranzakcióra megy: egy bukott COMMIT
// után a vak ROLLBACK MÁSODIK kivétele elnyelné az elsőt — a valódi ok eltűnne (KUKA-026).
export function withTransaction(db, fn) {
  if (db.isTransaction) throw new Error('withTransaction: beágyazott tranzakció — a hívó már tranzakcióban van');
  db.exec('BEGIN IMMEDIATE');
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    if (db.isTransaction) { try { db.exec('ROLLBACK'); } catch { /* az EREDETI hiba megy tovább */ } }
    throw e;
  }
}

// Determinisztikus idő: a próbának reprodukálhatónak kell lennie (R32 §4 bizonyítékrekord).
export function clockFrom(iso) {
  let t = Date.parse(iso);
  return { now: () => new Date(t).toISOString(), advance: (ms) => { t += ms; } };
}
