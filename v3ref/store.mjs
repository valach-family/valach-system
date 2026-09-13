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

-- A FELFÜGGESZTÉS TÉNYE (R67/F01). A "suspendMembership" korábban sikert JELENTETT, de nem írt
-- semmit — a felfüggesztett tag ugyanúgy jogosult maradt. A felfüggesztés ezért TARTÓS TÉNY, saját
-- táblán, és ugyanezt a tényt olvassa az engedélyezés ÉS a véglegesítés (mindkettő a "rightAt"-en
-- megy át, tehát nem tudnak elcsúszni — KUKA-039).
--
-- MIÉRT KÜLÖN TÁBLA, ÉS MIÉRT NEM A "membership" OSZLOPA. A felfüggesztés IDEIGLENES és
-- MEGISMÉTELHETŐ; a tagsági soron egy oszlop csak a LEGUTÓBBIT tudná, a történet elveszne (K09
-- elve: az esemény nem sor-átírás). Így a feloldás sem törli a múltat: a sor megmarad, "lifted_at"
-- kap. A hatály MINDIG a kérés pillanatához mérve dől el — visszamenőleg nem ír át történetet.
CREATE TABLE membership_suspension (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id       TEXT NOT NULL,
  book_id          TEXT NOT NULL,
  actor_subject_id TEXT NOT NULL,
  suspended_at     TEXT NOT NULL,
  lifted_at        TEXT,
  lifted_by        TEXT,
  reason           TEXT
);

-- ═══ REV-N3 — A HATÁSKÖR ÉS A BEJELENTÉS (R60 req-2 · R65 §7) ═══════════════════════════════
--
-- A REV-N3 KÉT dolgot mond ki egyszerre, és a saját gap-szövegünk szerint EGYÜTT kell megépülniük:
-- hatáskör nélkül a bejelentés jogot mozdítana, bejelentés nélkül a hatáskör elfojtja a jelzést.
--
-- A HATÁSKÖR MŰVELETENKÉNT áll ("operation"), nem egy általános „bíráló" jelölésként: a legszűkebb
-- felhatalmazás nem adhat tágabb hatást. A megvonás KÜLÖN esemény marad (K09), a hatáskör pedig
-- nem a tagságból jön — egy admin tagság nem tesz senkit elbírálóvá.
CREATE TABLE adjudication_authority (
  subject_id    TEXT NOT NULL REFERENCES subject(id),
  book_id       TEXT NOT NULL REFERENCES book(id),
  operation     TEXT NOT NULL CHECK (operation IN ('suspend','adjudicate','alter_right')),
  granted_at    TEXT NOT NULL,
  revoked_at    TEXT,
  PRIMARY KEY (subject_id, book_id, operation)
);

-- A BEJELENTÉS. A panaszos NEM feltétlenül ismert alany (épp ez a lényeg: a még nem igazolt
-- panaszos jelzése is befut), ezért a "claimant_ref" szabad hivatkozás, NEM "subject(id)" idegen
-- kulcs. A bejelentés SOHA nem mozdít jogot — az állapota csak azt mondja, hol tart az ügy.
CREATE TABLE claim (
  id                TEXT PRIMARY KEY,
  book_id           TEXT NOT NULL,
  claimant_ref      TEXT NOT NULL,
  submitted_at      TEXT NOT NULL,
  statement_digest  TEXT NOT NULL,
  state             TEXT NOT NULL CHECK (state IN ('received','under_review','resolved'))
);

-- A BEADVÁNY TARTALMA (R67/F03). Korábban CSAK a lenyomat maradt meg, tehát az elbírálónak nem
-- volt MIT elolvasnia: egy sha256-ból a panasz szövege nem áll vissza. A tartalom ezért KÜLÖN
-- táblán él — nem a "claim" soron —, mert a "claim" metaadatai és a beadvány SZÖVEGE két külön
-- érzékenységű dolog: a metaadat az ügy nyilvántartása, a szöveg maga a panasz.
--
-- A LENYOMAT MEGMARAD, de már INTEGRITÁS-ellenőrzésként, nem tartalom-helyettesítőként: olvasáskor
-- a tárolt szövegből újraszámoljuk, és eltérésnél a válasz NEM a szöveg, hanem nevezett hiba.
-- A tartalom olvasása HATÁSKÖRHÖZ kötött ("adjudicate"), és NEM szélesíti a vitatott üzleti
-- adathoz (árlista, könyv) való jogot — csak azt adja vissza, amit a panaszos maga beadott.
CREATE TABLE claim_content (
  claim_id  TEXT PRIMARY KEY REFERENCES claim(id),
  content   TEXT NOT NULL
);

-- A VISSZAÉLÉS-KORLÁT MÉRHETŐ ALAPJA. Külön tábla, mert a korlát a BEADÓ viselkedéséről szól, nem
-- a bejelentés tartalmáról — és mert olyan beadást is számol, ami nem hozott létre ügyet.
--
-- R67/F05: a korlát ELSŐDLEGES kulcsa NEM a beadó által szabadon írt hivatkozás lehet (azt négy
-- különböző szöveggel négyszer meg lehet kerülni), hanem a SZERVER által képzett befogadási
-- kontextus ("intake_key"). A "claimant_ref" marad MÁSODIK, szűkebb korlátnak — de már nem ez az
-- alap. Amíg nincs adapter, ami valódi szerver-oldali kontextust ad, MINDEN beadás EGY nevezett,
-- közös vödörbe esik ("chan:unattributed") — ez kimondott referencia-helyettesítő, nem védelem.
CREATE TABLE claim_intake (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  intake_key    TEXT NOT NULL,
  claimant_ref  TEXT NOT NULL,
  submitted_at  TEXT NOT NULL
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

-- A KIADOTT MEGHÍVÓ FELTÉTELEINEK PECSÉTJE (R53/F01 — a külső fél F01 esete).
--
-- Az R52-es alak a beváltás KÉT OLVASÁSA KÖZÖTTI változást fogta meg. Ha a sort KORÁBBAN írták át,
-- mindkét olvasás már az átírt értéket látta: a szabályos "user" meghívóból "admin" tagság lett.
-- Ez TOCTOU-védelem volt, nem a KIADOTT ajánlat változtathatatlansága.
--
-- MIÉRT TRIGGER, ÉS NEM ALKALMAZÁS-OLDALI KIADÁS-FÜGGVÉNY. A meghívók egy része NYERS pozicionális
-- INSERT-tel születik (a külső fél MINDEN próbájában így), tehát bármilyen általunk írt kiadás-
-- függvényt megkerülnének — és a pecsét pont ott hiányozna, ahol a támadás történik. A tároló
-- viszont nem kerülhető meg: aki sort ír, pecsétet is ír (KUKA-013).
--
-- R55/F01 — A HATÁR MEGERŐSÍTVE, ÉS A KORÁBBI INDOKOM VISSZAVONVA.
--
-- Az R54-ben azt írtam, hogy az élő sor UPDATE-jét SZÁNDÉKOSAN nem tiltjuk, mert a külső fél saját
-- F01/N10 próbája nyers UPDATE-tel dolgozik, és kivételt nem vár. A külső fél ezt VISSZAVONTA:
-- "Nem indokolt gyengébb termékhatárt választani azért, hogy a régi F01/N10 ne dobjon kivételt."
-- Igaza van, és a saját szabályunk is ezt mondja: a próbát a HATÁRHOZ igazítjuk, nem fordítva.
--
-- ÉS A KÉT ŐR ÖNMAGÁBAN NEM VOLT APPEND-ONLY TÁROLÓ. Az R55 S01/S02 esete ezt mérve mutatta meg:
--   S01 - INSERT OR REPLACE INTO invite_terms ... : a REPLACE a régi sort TÖRLI és újat ír, a
--         törlés BEFORE DELETE triggerét viszont az SQLite csak bekapcsolt rekurzív triggerek
--         mellett futtatja (a kapcsolat alapértéke: KI). A pecsét átíródott.
--   S02 - INSERT OR REPLACE INTO invite ... ugyanazzal a tokennel, admin szereppel: a kiadott
--         ajánlat helyére új ajánlat került. Egyik esetben sem kellett sémát vagy triggert tiltani.
-- Mindkét beváltás SIKERES volt, és ADMIN tagságot adott.
--
-- A TANULSÁG A VÉDELEM ALAKJÁRÓL: az UPDATE és a DELETE TILTÁSA nem ugyanaz, mint a sor
-- VÁLTOZTATHATATLANSÁGA - a köztük lévő rést a tároló saját konfliktus-feloldása nyitotta ki. A
-- védelmet ezért a MŰVELETEK teljes halmazára kell szabni (UPDATE - DELETE - REPLACE - UPSERT -
-- ugyanazon token újra-beillesztése), és a kapcsolati beállítást az ADAPTER kényszerítse ki, ne a
-- környezet alapértéke döntse el (lásd openStore: a recursive_triggers BE, és VISSZA IS OLVASSUK).
--
-- A NÉGY ŐR EGYÜTT (mindegyik a MŰVELET oldaláról zár, nem a szándék oldaláról):
--   invite_terms_no_update / no_delete  - a pecsét sorát átírni vagy törölni nem lehet;
--   invite_terms_no_reseal              - ugyanarra a tokenre MÁSODIK pecsét nem születhet (ez
--                                         zárja a REPLACE-t a pecsét-táblán, pragmától FÜGGETLENÜL);
--   invite_no_change_sealed             - az élő meghívó KIADOTT mezői nem módosulhatnak; a
--                                         redeemed_at (az ÉLETCIKLUS mezője) igen;
--   invite_no_reissue / no_delete_sealed - lepecsételt tokent újra beilleszteni vagy törölni nem
--                                         lehet (ez zárja a REPLACE-t az élő táblán is).
--
-- A MÁSODIK RÉTEG MEGMARAD, ÉS EZ SZÁNDÉKOS. A beváltás továbbra is a PECSÉTHEZ méri az élő sort
-- (authoritativeInvite). Ma ez a tárolón nem tud tüzelni - de a védelem nem a triggerek MEGLÉTÉN
-- múlhat: egy másik adapter, egy javítóprogram vagy egy trigger nélküli séma ugyanide ír. A
-- próba ezt a réteget KÜLÖN méri, a triggereket ideiglenesen elvéve (P-INVITE-seal, (h) ág).
CREATE TABLE invite_terms (
  token             TEXT PRIMARY KEY REFERENCES invite(token),
  book_id           TEXT NOT NULL,
  invitee_namespace TEXT NOT NULL,
  invitee_value     TEXT NOT NULL,
  offered_role      TEXT NOT NULL,
  issuer_subject    TEXT NOT NULL,
  expires_at        TEXT NOT NULL
);

CREATE TRIGGER invite_terms_seal AFTER INSERT ON invite BEGIN
  INSERT INTO invite_terms (token, book_id, invitee_namespace, invitee_value, offered_role,
                            issuer_subject, expires_at)
  VALUES (NEW.token, NEW.book_id, NEW.invitee_namespace, NEW.invitee_value, NEW.offered_role,
          NEW.issuer_subject, NEW.expires_at);
END;

CREATE TRIGGER invite_terms_no_update BEFORE UPDATE ON invite_terms BEGIN
  SELECT RAISE(ABORT, 'invite_terms: a KIADOTT feltetel nem irhato at - visszavonas + uj meghivo kell');
END;

CREATE TRIGGER invite_terms_no_delete BEFORE DELETE ON invite_terms BEGIN
  SELECT RAISE(ABORT, 'invite_terms: a KIADOTT feltetel nem torolheto');
END;

-- R55/F01 (S01): a REPLACE nem "modositas", hanem TORLES + BESZURAS. A torles trigger-e a
-- kapcsolat alapertelmezesevel nem fut le, ezert a BESZURAS oldalarol is zarni kell: egy tokenre
-- MASODIK pecset soha nem szulethet. Ez a ket fenti ort a pragmatol FUGGETLENUL egesziti ki.
CREATE TRIGGER invite_terms_no_reseal BEFORE INSERT ON invite_terms
WHEN EXISTS (SELECT 1 FROM invite_terms WHERE token = NEW.token) BEGIN
  SELECT RAISE(ABORT, 'invite_terms: erre a tokenre MAR van kiadott feltetel - masodik pecset nem szulethet');
END;

-- R55/F01: az ELO meghivo KIADOTT mezoi valtozhatatlanok. Az ELETCIKLUS mezoje (redeemed_at)
-- viszont igen - a fogyasztas a rendszer sajat, szabalyos irasa. Ket kulon dolog, ket kulon
-- kezeles: a tilalom a mezokre szol, nem a sorra.
CREATE TRIGGER invite_no_change_sealed BEFORE UPDATE ON invite
WHEN NEW.token             <> OLD.token
  OR NEW.book_id           <> OLD.book_id
  OR NEW.invitee_namespace <> OLD.invitee_namespace
  OR NEW.invitee_value     <> OLD.invitee_value
  OR NEW.offered_role      <> OLD.offered_role
  OR NEW.issuer_subject    <> OLD.issuer_subject
  OR NEW.expires_at        <> OLD.expires_at BEGIN
  SELECT RAISE(ABORT, 'invite: a KIADOTT ajanlat nem irhato at - visszavonas + uj meghivo kell');
END;

-- R55/F01 (S02): ugyanaz a token nem adhato ki masodszor. Ez zarja az INSERT OR REPLACE-t es a
-- kezi ujra-beszurast is, mielott barmi torlodne.
CREATE TRIGGER invite_no_reissue BEFORE INSERT ON invite
WHEN EXISTS (SELECT 1 FROM invite_terms WHERE token = NEW.token) BEGIN
  SELECT RAISE(ABORT, 'invite: ez a token MAR ki lett adva - ugyanaz a token nem adhato ki ujra');
END;

-- R55/F01: a lepecsetelt elo sor torlese sem ut a pecseten. A meghivo eletciklusa a redeemed_at-en
-- (es kesobb a visszavonason) megy, nem a sor eltuntetesen.
CREATE TRIGGER invite_no_delete_sealed BEFORE DELETE ON invite
WHEN EXISTS (SELECT 1 FROM invite_terms WHERE token = OLD.token) BEGIN
  SELECT RAISE(ABORT, 'invite: kiadott meghivo sora nem torolheto - a visszavonas kulon esemeny');
END;

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
  // A TÁROLÓ EPHEMER, ÉS EZT KI IS MONDJUK. A séma felépítése lemezre szinkronizálva próbánként
  // ~25 ms volt, futásonként ~50 tárolóval — a mutációs battéria (43 futás) így a külső fél
  // 15 000 ms-os korlátja fölé nőtt. MÉRVE, 20 tárolón: nyitás+séma 510 ms → 28 ms ezzel a két
  // beállítással (18×).
  //
  // MI VÁLTOZIK ÉS MI NEM. A tranzakció ATOMICITÁSA és a visszagörgetés VÁLTOZATLAN (a napló a
  // memóriában él, nem eltűnik), és minden kényszer — idegen kulcs, egyediség, trigger — ugyanúgy
  // fut. AMI ELVÉSZ: a folyamat-összeomlás utáni tartósság. Ez itt fogalmilag tárgytalan, mert a
  // tároló a `close()`-zal TÖRLŐDIK, és soha nem éli túl a futást. Ezt a rekord `environment`
  // mezője is kimondja — nem néma gyorsítás (KUKA-015).
  db.exec('PRAGMA journal_mode = MEMORY;');
  db.exec('PRAGMA synchronous = OFF;');
  // A VÉDELMET AZ ADAPTER KÉNYSZERÍTSE KI, NE A KÖRNYEZET ALAPÉRTÉKE (R55/F01).
  //
  // Az SQLite alapértéke `recursive_triggers = OFF`, és emiatt a REPLACE által kiváltott TÖRLÉS
  // nem futtatja a BEFORE DELETE triggert — pontosan ezen a résen ment át az S01. A négy őr ma
  // ettől függetlenül is zár (mindegyik a BESZÚRÁS oldaláról is), de a beállítást akkor is
  // kimondjuk és VISSZAOLVASSUK: ha egy jövőbeli Node vagy build másképp állítja, azt HANGOSAN
  // tudjuk meg, nem egy szivárgásból (KUKA-014: a kapcsoló ne egyetlen titkos írásmódon múljon).
  db.exec('PRAGMA recursive_triggers = ON;');
  const rt = db.prepare('PRAGMA recursive_triggers').get();
  const rtOn = rt && Number(Object.values(rt)[0]) === 1;
  if (!rtOn) {
    const err = new Error('openStore: a recursive_triggers nem kapcsolt be — a tároló-őrök egy '
      + 'részének a viselkedése nem garantálható; a futás nem indul el');
    err.code = 'STORE_PRAGMA_NOT_APPLIED';
    throw err;
  }
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
