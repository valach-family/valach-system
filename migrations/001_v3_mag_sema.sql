-- 001_v3_mag_sema.sql — A V3 MAG ELSŐ TARTÓS SÉMÁJA PostgreSQL-en.
--
-- SZÁRMAZÁS. A MAG szakasz a kanonikus sémából származik (`v3ref/store.mjs` SCHEMA), a
-- `tools/v3_pg_schema_gen.mjs` szerszámmal. A SZÁRMAZÁST a generátor adja, a FOLYAMATOS egyezést
-- viszont nem ő tartja, hanem a `npm run verify:pg-schema-parity` őr, ami a két alakot MINDKÉT
-- irányban visszaméri (KUKA-018: egy fogalomnak egy otthona; KUKA-051: a védelem SZABÁLY legyen).
--
-- HATÓKÖR (R146 §4). Ez a migráció a MA TÉNYLEGESEN HASZNÁLT vertikumot viszi tartós tárolóra —
-- nem a jövőbeli ERP-séma előretervezése, és nem a V2 220 migrációjának átmásolása. A jövőbeli
-- modulok KÉSŐBBI, bővítő migrációkkal jönnek.
--
-- BONTÁS NINCS BENNE, ezért `-- KIVEZETVE:` fejléc sem kell: minden utasítás LÉTREHOZÁS. A
-- `verify:release-order` ezt méri.
--
-- MERGE UTÁN EZ A FÁJL ÉRINTHETETLEN (D-VS-3000 / 2. szabály). Javítani ÚJ migrációval lehet.
--
-- BESOROLÁS: restrictive — a szorító alakok (CREATE TRIGGER · CREATE UNIQUE INDEX) kizárólag OLYAN
-- táblákra vonatkoznak, amelyeket UGYANEZ a migráció hoz létre néhány sorral feljebb. Nincs tehát
-- sem MÚLTBELI adat, amin a kényszer megbukhatna, sem RÉGI ÍRÓ, akit a trigger korlátozhatna: ez a
-- 001-es, vagyis az ELSŐ migráció, előtte a séma ÜRES (a `schema_migration` nyilvántartás ezt
-- visszaolvashatóan rögzíti). A szorító besorolás ettől nem „lebeszélve" van: a következő
-- migrációban UGYANEZEK az alakok MÁR MEGLÉVŐ táblára mennének, és akkor az indoklás is más lesz
-- — ezért marad a kimondott fejléc, nem a minta gyengítése (KUKA-048: a kivétel hatókörét a mérce
-- dönti el, nem a kényelem).

CREATE TABLE subject (
  id            text PRIMARY KEY,
  kind          text NOT NULL CHECK (kind IN ('person','legal_entity','org_unit'))
);

CREATE TABLE external_id (
  subject_id    text NOT NULL REFERENCES subject(id),
  namespace     text NOT NULL,
  issuer        text NOT NULL,
  jurisdiction  text NOT NULL,
  value_raw     text NOT NULL,
  value_norm    text NOT NULL,
  cardinality   text NOT NULL CHECK (cardinality IN ('one_to_one','one_to_many','many_to_many')),
  valid_from    text NOT NULL,
  valid_to      text
);

CREATE TABLE account (
  subject_id    text PRIMARY KEY REFERENCES subject(id),
  credential    text
);

CREATE TABLE book (
  id            text PRIMARY KEY,
  name          text NOT NULL
);

-- A SZEMÉLYES KÖR TÉNYE — SAJÁT TÁBLÁN (SZK-01, R75/L11 · R64 L11).
--
-- MIT MOND KI. Ez a könyv a SZEMÉLY saját köre: a csatorna bizonyításakor MAGÁTÓL születik, nevet
-- nem kell kitalálni hozzá, és a váltóban NEVESÍTETT cél („személyes kör"), nem egy sokadik cég.
--
-- MIÉRT KÜLÖN TÁBLA, ÉS MIÉRT NEM OSZLOP A KÖNYVÖN. Két okból. (1) A könyv sorrendfüggő,
-- pozicionális INSERT-tel is íródik tizenkilenc KÜLSŐ, beadott programban — egy új oszlop azokat
-- TÖRNÉ, a beadott bizonyítékot pedig nem írjuk át (KUKA-121/122: a külső fél programja tanú, nem
-- a mi szövegünk). (2) A tény ÍGY tud a MODELLBEN is igaz lenni: az „egy alany — egy személyes kör"
-- szabályt itt a KULCS tartja (PRIMARY KEY + UNIQUE), nem egy alkalmazás-oldali ellenőrzés, amit
-- egy versenyhelyzet megkerülhet (KUKA-047).
--
-- AMI NEM VÁLTOZIK: a személyes kör UGYANAZZAL az indulási szabállyal (WSP-01), ugyanazzal az
-- alappal és ugyanazzal a tagsággal születik, mint bármely más könyv — ez a sor csak a CÉLJÁT
-- mondja ki, nem ad külön jogot és nem külön jogosultsági motor.
CREATE TABLE personal_space (
  subject_id    text PRIMARY KEY REFERENCES subject(id),
  book_id       text NOT NULL UNIQUE REFERENCES book(id),
  created_at    text NOT NULL
);

-- A TAGSÁGADÁS IS KÉT TENGELYEN ÁLL (R85/F01). A "granted_at" a HATÁLY ("melyik naptól jár a
-- jog"), a "granted_recorded_at" a TUDÁS ("mikor került a rendszerbe"). A kettő a mai
-- tagságadásnál AZONOS, és ezt az író biztosítja — de a modell nem köti össze őket, mert az
-- előre ismert, később hatályos alap (rögzítés márciusban, hatály augusztustól) és az utólag
-- rögzített alap (hatály márciusban, rögzítés júniusban) EGYARÁNT értelmes.
--
-- MIÉRT KÉT OSZLOP, ÉS MIÉRT NEM EGY FELTÉTEL. A külső fél R85/F01 ellenpéldája pontosan azt
-- mutatta meg, hogy a megvonás-eseményekre kiépített két tengely a TAGSÁGADÁSRA nem volt
-- kiépítve: a júniusi beváltás megváltoztatta a MÁRCIUSI tudás szerinti augusztusi képet. Egy
-- puszta "granted_at <= knownAt" feltétel ezt nem oldja meg, mert a HATÁLY idejét használná a
-- TUDÁS idejeként — ez a KUKA-002 alakja a tagságadáson (két független tény egy oszlopon).
CREATE TABLE membership (
  subject_id    text NOT NULL REFERENCES subject(id),
  book_id       text NOT NULL REFERENCES book(id),
  role          text NOT NULL,
  granted_at    text NOT NULL,
  revoked_at    text,
  PRIMARY KEY (subject_id, book_id)
);

-- A TAGSÁGADÁS ESEMÉNY-NAPLÓJA — pontosan úgy, ahogy a megvonásé. A "membership" sor ettől
-- kezdve a MAI VETÜLET (mint a "revoked_at" oszlop), az igazság a napló.
--
-- MIÉRT NEM EGY ÚJ OSZLOP A "membership"-EN. Két okból. (1) FOGALMI: egy tagságadás ESEMÉNY,
-- aminek saját hatálya és rögzítési ideje van; a sor csak az összegzése — ugyanaz a szerkezet,
-- amit a megvonásnál már kimondtunk, és két azonos alakú tényt nem szabad két különböző
-- szerkezetben tartani (KUKA-003). (2) MÉRHETŐ: a külső fél programja a "membership" sort
-- POZICIONÁLISAN írja; egy új oszlop az ő VÁLTOZATLANUL futtatandó ellenpéldájukat törte volna
-- el — a mérce nem igazodhat a megvalósításhoz (KUKA-054).
--
-- A NAPLÓ NÉLKÜLI SOR NEM HIBA, HANEM GYENGÉBB TANÚ: a feloldó ilyenkor a sor "granted_at"
-- értékét KÉNYTELEN mindkét tengelyen használni, és ezt a válaszában KIMONDJA
-- ("grant_axis: projected_row") — a gyengeséget nem hallgatjuk el (KUKA-049 · KUKA-127).
CREATE TABLE membership_grant (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id    text NOT NULL,
  book_id       text NOT NULL,
  role          text NOT NULL,
  recorded_at   text NOT NULL,
  effective_at  text NOT NULL
);

-- A JOGVÁLTOZÁS ESEMÉNYE HORDOZZA A SAJÁT BIZONYÍTÉKÁT (R85/F02). Az "evidence_ref" korábban
-- CSAK a felülvizsgálati körbe került, a kör viszont kizárólag a VISSZAMENŐLEGES ágon születik —
-- jövőbeli hatálynál tehát a kötelezően bekért bizonyíték nyomtalanul elveszett. A hivatkozás
-- ezért az ESEMÉNY tartós adata, az eljáróval együtt; a kör ehhez az eseményhez kapcsolódik.
CREATE TABLE membership_revocation (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id    text NOT NULL,
  book_id       text NOT NULL,
  recorded_at   text NOT NULL,
  effective_at  text NOT NULL,
  previous_effective_at text,
  transition    text NOT NULL,
  actor_subject_id text,
  evidence_ref  text
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
  id               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id       text NOT NULL,
  book_id          text NOT NULL,
  actor_subject_id text NOT NULL,
  suspended_at     text NOT NULL,
  lifted_at        text,
  lifted_by        text,
  reason           text
);

-- ═══ REV-N5 — A CÉLZOTT TILTÁS (BAN-01, R71 §8/1) ══════════════════════════════════════════
--
-- MIÉRT NEM A "membership" OSZLOPA. A tiltás ALANY-szintű, nem könyv-szintű: épp az a lényege, hogy
-- a hatókörét az OK választja ki (REV-N5b), és lehet a tagságtól FÜGGETLEN is (kompromittált
-- hitelesítő ⇒ minden könyvön). Tagsági oszlopként a fogalom sem férne el.
--
-- MIÉRT NINCS "CHECK (kind IN (...))". A norma kimondja: „ismeretlen fajta NEM »általános tiltás«,
-- hanem nem dönthető". Ha az adatbázis zárná ki az ismeretlen fajtát, ez az ág BE SEM KERÜLHETNE a
-- tárolóba, tehát MÉRHETETLEN volna — és a nem mért ág zöldnek látszik (KUKA-051). A zárt halmazt
-- ezért a FELOLDÓ őrzi ("ban.mjs" → "BAN_KINDS"), és az ismeretlen fajta ott kap nevet.
--
-- A "target_ref" a fajtához tartozó MEGKÜLÖNBÖZTETŐ értéke (könyv-azonosító · művelet-osztály ·
-- hitelesítő-azonosító …). Alany-szintű fajtánál ("subject") NULL: ott nincs mit egyeztetni.
CREATE TABLE subject_ban (
  id               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id       text NOT NULL,
  kind             text NOT NULL,
  cause            text NOT NULL,
  target_ref       text,
  actor_subject_id text NOT NULL,
  banned_at        text NOT NULL,
  lifted_at        text,
  lifted_by        text
);

-- azt nem, hogy MI ALAPJÁN. A határozatnak SAJÁT azonosítója, VERZIÓJA és HATÁLYA van, és a róla
-- szerzett tudomás KÉSŐBB is érkezhet — ezért itt is a KÉT TENGELY áll (effective_at × recorded_at),
-- ugyanaz a szerkezet, amit a tagságadás és a megvonás már használ (KUKA-003: azonos alakú tényt
-- nem tartunk két különböző szerkezetben).
--
-- A VERZIÓ NEM ÍRJA ÁT A MÚLTAT: egy új verzió ÚJ SOR, a régi érintetlen marad (REV-N1b). A
-- bizonyíték-hivatkozás itt is az ESEMÉNY saját adata (R85/F02 tanulsága átvíve).
CREATE TABLE authority_basis (
  basis_id       text NOT NULL,
  version        bigint NOT NULL,
  book_id        text NOT NULL REFERENCES book(id),
  issuer_subject text NOT NULL,
  effective_at   text NOT NULL,
  recorded_at    text NOT NULL,
  expires_at     text,
  revoked_at     text,
  allowed_operations text NOT NULL,
  allowed_roles      text NOT NULL,
  allowed_scopes     text NOT NULL,
  evidence_ref   text NOT NULL,
  -- R136/F136-02 — AZ ALAP EREDETE: MELYIK TAGSÁGI IDŐSZAKBÓL SZÁRMAZIK (AOR-01).
  --
  -- A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R136/F136-02). A delegálási alap
  -- AZONOSSÁGA alany × könyv ("deleg:<könyv>:<alany>"), tehát egy megszűnt és ÚJRA megszerzett
  -- tagság ugyanazt az azonosítót képzi újra. Mérve: a RÉGI időszakból kiadott, (b7)-ben HELYESEN
  -- elutasított meghívó az ÚJ alap megszületése után "ok:true · membership_only · granted"
  -- választ adott — a JELEN IDEJŰ új alap IGAZOLTA a régi időszak ajánlatát.
  --
  -- MIÉRT NEM A VERZIÓ-EGYENLŐSÉG A VÁLASZ. A beváltási kapu a verziót a KIADÁS idejére méri, és
  -- ez szándékos: az R64 (H06/H07) kimondta, hogy az alap későbbi, JOGOS bővítése ne zárja a már
  -- kiadott meghívót. A verzió MAI egyenlőségének követelése tehát falat csinálna a kapuból
  -- (KUKA-122). A megkülönböztető tény nem a verzió, hanem az EREDET: ugyanazon a tagsági
  -- időszakon belüli újra-rögzítés (bővítés) VAGY időszak-határon átnyúló ÚJRA-KÉPZÉS.
  origin_grant_event_id bigint,
  PRIMARY KEY (basis_id, version)
);

-- R134/F134-02 — A HATÁSKÖR A TAGSÁGI IDŐSZAKHOZ IS KÖTŐDIK ("period_grant_event_id").
--
-- A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R134/F134-02). Az R132 az ADATKÖRJOGRA
-- megépítette az időszak-kötést ("scope_grant.membership_grant_id"), a BÍRÁLATI HATÁSKÖRRE nem —
-- holott a spec §4 ugyanabban a felsorolásban tiltja mindkettő feléledését: „Új belépéskor a régi
-- adatkörjogok, BÍRÁLATI HATÁSKÖRÖK, delegálási alapok és korábban kiadott függő meghívók NEM
-- éledhetnek fel." Mérve: a megvonás utáni újbóli belépés után a RÉGI "alter_right" hatáskör
-- UGYANAZZAL a "granted_at"-tal végrehajthatónak látszott, új hatásköradás nélkül.
--
-- A NULL JELENTÉSE UGYANAZ, MINT AZ ADATKÖRJOGNÁL (SGP-01): a már létező sorok az alany × könyv
-- ELSŐ tagsági időszakához tartoznak. Egyetlen időszaknál az ELSŐ EGYBEN a MAI, tehát a NULL-os
-- sorok viselkedése VÁLTOZATLAN (a spec kikötése: „nincs adateldobás"). Aki NEM tag (külső
-- elbíráló), annak a hatásköre nem időszakhoz, hanem az ALAPJÁHOZ kötődik — ezt a feloldó KIMONDJA
-- ("period_binding" mező), nem hallgatja el (KUKA-012 · KUKA-049).
CREATE TABLE adjudication_authority (
  subject_id    text NOT NULL REFERENCES subject(id),
  book_id       text NOT NULL REFERENCES book(id),
  operation     text NOT NULL CHECK (operation IN ('suspend','adjudicate','alter_right')),
  granted_at    text NOT NULL,
  revoked_at    text,
  -- MI ALAPJÁN adták (ORG-N1a). Üresen hagyható — de akkor a feloldó KIMONDJA, hogy nincs
  -- rögzített alap; a néma hiány ugyanaz a hazugság, mint a néma üres lista (KUKA-012).
  basis_id      text,
  basis_version bigint,
  period_grant_event_id bigint,
  PRIMARY KEY (subject_id, book_id, operation)
);

-- A HATÁSKÖRADÁS ESEMÉNY-NAPLÓJA (R134/F134-02) — ugyanaz a szerkezet, mint a tagságadásnál:
-- a "adjudication_authority" sor a MAI VETÜLET, az igazság a napló (KUKA-003: azonos alakú tényt
-- nem tartunk két különböző szerkezetben).
--
-- MIÉRT KELLETT. A vetület kulcsa (alany × könyv × művelet) EGY sort engedett, tehát egy ÚJ
-- időszakhoz tartozó, KIFEJEZETT új megadás a régi sorba futott: mérve, nyers
-- "UNIQUE constraint failed" hibával állt meg — vagyis az időszak-kötés önmagában FALLÁ tette volna
-- a szabályos helyreállítást (KUKA-122: a kapu nem lehet fal). A napló megőrzi a RÉGI megadást
-- (történeti igazság), a vetület pedig a MAI állapotot hordozza.
CREATE TABLE adjudication_authority_grant (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id    text NOT NULL,
  book_id       text NOT NULL,
  operation     text NOT NULL,
  granted_at    text NOT NULL,
  recorded_at   text NOT NULL,
  basis_id      text,
  basis_version bigint,
  period_grant_event_id bigint,
  -- R138/F138-01 — A GENERÁCIÓ ZÁRÓ ÁLLAPOTA (AHI-02).
  --
  -- A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R138/F138-01). Az R136-os alak a
  -- felülírt generációhoz "revoked_at: null" sort képzett, a vetület régi "revoked_at"-ját pedig a
  -- következő megadás "DO UPDATE SET revoked_at = NULL" ága TÖRÖLTE. Következmény, MÉRVE: egy
  -- VALÓBAN megvont régi jogot a rendszer az új megadás után történetileg ENGEDÉLYNEK olvasott
  -- ("false/authority_revoked" → "true/stamped"). A "revocation_known_for_event:false" kísérőmező
  -- a tényt nem pótolta: a bizonytalanság MEGNEVEZÉSE nem megőrzés.
  --
  -- EZÉRT A GENERÁCIÓT ZÁRJUK, NEM ELDOBJUK. Amikor egy új megadás felülírja a vetületet, a
  -- felülírás ELŐTT ide mentjük a lezáruló generáció végállapotát:
  --   · "revoked_at"    — a generáció SAJÁT megvonása (ha volt), a vetületből átvéve;

--   · "superseded_at" — mikor zárta le egy későbbi megadás. NULL = még ez az ÉLŐ generáció.
  --
  -- A "superseded_at" KIMONDOTT bizonyíték arra, hogy a zárás MEGTÖRTÉNT. Egy felülírt, de nem
  -- lezárt sor (ilyet csak a javítás ELŐTTI adat vagy nyers írás hagyhat) NEM kap néma történeti
  -- igent — a feloldó nevezetten elakad (R138 §4: „Amihez nincs elég történeti tény, ne legyen
  -- néma történeti igen").
  revoked_at    text,
  superseded_at text
);

CREATE INDEX adjudication_authority_grant_who
  ON adjudication_authority_grant (subject_id, book_id, operation);

-- A BEJELENTÉS. A panaszos NEM feltétlenül ismert alany (épp ez a lényeg: a még nem igazolt
-- panaszos jelzése is befut), ezért a "claimant_ref" szabad hivatkozás, NEM "subject(id)" idegen
-- kulcs. A bejelentés SOHA nem mozdít jogot — az állapota csak azt mondja, hol tart az ügy.
CREATE TABLE claim (
  id                text PRIMARY KEY,
  book_id           text NOT NULL,
  claimant_ref      text NOT NULL,
  submitted_at      text NOT NULL,
  statement_digest  text NOT NULL,
  state             text NOT NULL CHECK (state IN ('received','under_review','resolved'))
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
  claim_id  text PRIMARY KEY REFERENCES claim(id),
  content   text NOT NULL
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
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  intake_key    text NOT NULL,
  claimant_ref  text NOT NULL,
  submitted_at  text NOT NULL
);

CREATE TABLE invite (
  token             text PRIMARY KEY,
  book_id           text NOT NULL REFERENCES book(id),
  invitee_namespace text NOT NULL,
  invitee_value     text NOT NULL,
  offered_role      text NOT NULL,
  issuer_subject    text NOT NULL REFERENCES subject(id),
  expires_at        text NOT NULL,
  redeemed_at       text
);

--   invite_no_reissue / no_delete_sealed - lepecsételt tokent újra beilleszteni vagy törölni nem
--                                         lehet (ez zárja a REPLACE-t az élő táblán is).
--
-- A MÁSODIK RÉTEG MEGMARAD, ÉS EZ SZÁNDÉKOS. A beváltás továbbra is a PECSÉTHEZ méri az élő sort
-- (authoritativeInvite). Ma ez a tárolón nem tud tüzelni - de a védelem nem a triggerek MEGLÉTÉN
-- múlhat: egy másik adapter, egy javítóprogram vagy egy trigger nélküli séma ugyanide ír. A
-- próba ezt a réteget KÜLÖN méri, a triggereket ideiglenesen elvéve (P-INVITE-seal, (h) ág).
CREATE TABLE invite_terms (
  token             text PRIMARY KEY REFERENCES invite(token),
  book_id           text NOT NULL,
  invitee_namespace text NOT NULL,
  invitee_value     text NOT NULL,
  offered_role      text NOT NULL,
  issuer_subject    text NOT NULL,
  expires_at        text NOT NULL
);

CREATE FUNCTION invite_terms_seal_fn() RETURNS trigger AS $trg$
BEGIN
  INSERT INTO invite_terms (token, book_id, invitee_namespace, invitee_value, offered_role,
                            issuer_subject, expires_at)
  VALUES (NEW.token, NEW.book_id, NEW.invitee_namespace, NEW.invitee_value, NEW.offered_role,
          NEW.issuer_subject, NEW.expires_at);
  RETURN NULL;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_terms_seal AFTER INSERT ON invite
FOR EACH ROW EXECUTE FUNCTION invite_terms_seal_fn();

-- ═══ ORG-N1b — A KORLÁT A KIADOTT PAPÍRON (BLI-01, R90 §6) ═══════════════════════════════════
--
-- MIÉRT KÜLÖN TÁBLA, ÉS NEM OSZLOP AZ "invite"-ON. Két okból, és mindkettő mért tény.
--   (1) A meghivok egy resze NYERS, POZICIONALIS INSERT-tel szuletik (a kulso fel MINDEN
--       programjaban: "INSERT INTO invite VALUES (?,?,?,?,?,?,?,NULL)"). Egy uj oszlop ezeket
--       AZONNAL eltorne - a javitas a jogos utat zarna ki (KUKA-122: a kapu nem lehet fal).
--   (2) FOGALMI: a korlat a KIADAS aktusahoz tartozik, nem a meghivo allapotahoz. Ket kulon
--       alaku tenyt nem teszunk egy sorra (KUKA-002).
--
-- A HIANY NEM NEMA ENGEDELY, DE NEM IS FAL: ha egy meghivohoz nincs ilyen sor, a beváltás a MAI
-- szabály szerint megy (tagsagi delegalas), es a valasz KIMONDJA, hogy a korlat nem volt
-- kikenyszeritve ("basis_declared: false") - KUKA-041: a nem-kapuzo tenyt latni kell.
-- ═══ R132/1 — A MEGHÍVÓ VISSZAVONÁSA SAJÁT ESEMÉNY (INVR-01) ═════════════════════════════════
--
-- A HIÁNY, AMIT EZ ZÁR — és nem mi találtuk ki, hanem a SAJÁT norma-szövegünk nevezte meg
-- (norms.mjs, ORG-N1a "remaining", az R132 előtti alak): "a MEGHÍVÓ VISSZAVONÁSA mint saját
-- esemény (ma a lejárat és a kiadó jogának megvonása zár; a meghívón nincs revoked_at)".
--
-- MIÉRT KÜLÖN TÁBLA, ÉS NEM OSZLOP AZ "invite"-ON. Ugyanaz a MÉRT ok, ami az "invite_basis"-nál,
-- és ott szó szerint le is van írva: a meghívók egy része NYERS, POZICIONÁLIS, nyolc értéket
-- felsoroló beszúrással születik (a külső fél MINDEN programjában), és egy kilencedik oszlop
-- ezeket AZONNAL eltörné — a javítás a jogos utat zárná ki (KUKA-122: a kapu nem lehet fal).
--
-- A SQL-ALAKOT ITT SZÁNDÉKOSAN NEM IDÉZZÜK MÉG EGYSZER. A GP06 őr (GPR-01) a modul jogadó
-- írás-helyeit SZÁMOLJA, és a séma-szöveg SQL-kommentjeit nem tudja prózaként felismerni — egy
-- MÁSODIK szó szerinti idézet tehát „új jogadó utat" jelentett volna egy olyan modulban, ahol
-- egyetlen sor kód sem változott. A helyes válasz nem a pin átírása (KUKA-045: az tanítaná be, hogy
-- a javítás = a szám növelése), hanem az, hogy a próza ne tegyen úgy, mintha írás lenne. FOGALMI ok
-- is van: a visszavonás ESEMÉNY, saját hatállyal, rögzítési idővel és CSELEKVŐVEL; a meghívó
-- "redeemed_at" oszlopa ÁLLAPOT. Két külön alakú tényt nem teszünk egy sorra (KUKA-002).
--
-- KÉT TENGELY, mint minden más jogváltozásnál, és APPEND-ONLY. Az ismételt visszavonás NEM ír
-- második sort (az üzleti idempotenciát a domain-művelet dönti el); ha mégis állna itt több sor, a
-- feloldó a LEGKORÁBBI hatályút veszi — a zárás fail-closed (KUKA-012).
CREATE TABLE invite_revocation (
  id               bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  token            text NOT NULL REFERENCES invite(token),
  book_id          text NOT NULL,
  actor_subject_id text,
  recorded_at      text NOT NULL,
  effective_at     text NOT NULL
);

CREATE INDEX invite_revocation_token ON invite_revocation (token);

-- ═══ R132/2 — AZ ÚJRAHÍVÁSI DÖNTÉS (RNV-01) ══════════════════════════════════════════════════
--
-- A MÁSODIK NEVEZETT HIÁNY ugyanabból a norma-szövegből: "az ÚJRA-MEGHÍVÁS MEGVONÁS UTÁN (a
-- membership kulcsa alany × könyv, a beváltás revoked_needs_decision néven áll meg — az
-- újranyitás külön döntés, nincs megépítve)".
--
-- MIT TÁROL, ÉS MIÉRT ÉPP EZT. A spec kikötése: "A rendszer tárolja, ki, mikor, milyen alapon
-- engedte az új belépési ajánlatot", és "Az új ajánlat kötődjön a kiválasztott korábbi személyhez,
-- fiókhoz és a konkrét lezárt tagsági időszakhoz/megvonási eseményhez."
--
-- A KÖTÉS ESEMÉNY-AZONOSÍTÓKON ÁLL (nem dátumon): "closed_grant_event_id" = MELYIK tagsági
-- időszak zárult le, "closed_revocation_id" = MELYIK megvonás zárta le. Ebből következik a spec
-- másik kikötése is: "Egy megszűnésre kiadott újrahívási ajánlat nem használható egy későbbi
-- megszűnés újranyitására" — a beváltás összeméri a MAI lezárt időszakot az ajánlatban
-- rögzítettel, és eltérésnél NEVEZETTEN elakad.
--
-- A DÖNTÉS NEM TAGSÁG. Ez a sor AJÁNLATOT engedélyez; a tagságot a címzett SAJÁT, igazolt
-- elfogadása adja, a beváltási lánc MINDEN kapuján át (KUKA-143: a feladáskori bizonyíték nem
-- küldéskori engedély).
CREATE TABLE membership_reentry (
  id                    bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id            text NOT NULL REFERENCES subject(id),
  book_id               text NOT NULL REFERENCES book(id),
  token                 text NOT NULL REFERENCES invite(token),
  closed_grant_event_id bigint NOT NULL,
  closed_revocation_id  bigint NOT NULL,
  offered_role          text NOT NULL,
  decided_by            text NOT NULL,
  basis_id              text NOT NULL,
  basis_version         bigint NOT NULL,
  recorded_at           text NOT NULL,
  effective_at          text NOT NULL
);

CREATE UNIQUE INDEX membership_reentry_token ON membership_reentry (token);

CREATE INDEX membership_reentry_who ON membership_reentry (subject_id, book_id);

-- ═══ R134/F134-03 — AZ EGYSZERI HATÁS KÖNYVE A HATÁSKÖRI MŰVELETEKEN (OON-01) ════════════════
--
-- A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R134/F134-03). Két azonos, egymás utáni
-- "POST /api/members/reinvite" kérés KÉT önálló ajánlatot adott (invite 10→12 · invite_basis 10→12 ·
-- membership_reentry 2→4), és a HTTP-út minden kéréshez ÚJ tokent gyártott. Az R132 §5 viszont
-- SZERVERES egyszeri hatást kért: „Dupla kattintás, hálózati újraküldés, elveszett sikeres válasz és
-- párhuzamos elfogadás ne adjon új üzleti hatást."
--
-- MIÉRT NEM A "command" TÁBLA. Az azonosság FELOLDÓI közösek ("commandIdentity" · "commandScope" ·
-- "canonicalize" — KUKA-003), a TÁROLÁS viszont nem lehet ugyanaz: a "command" a TAGSÁGI jogon
-- működő parancs-út könyve (kiadási leltárral, nyugtával, "stock_movement" őrökkel). Egy
-- HATÁSKÖRI ("alter_right") műveletet oda írni azt jelentené, hogy a parancs-út jogosultsági
-- modellje ("own_book") dönt egy olyan műveletről, amit a bírálati hatáskör engedélyez — vagyis a
-- kapu fajtája csúszna el (KUKA-002: két különböző tény egy ábrázoláson).
--
-- A KULCS ALAKJA A PARANCS-ÚTTAL AZONOS: a hatókört a SZERVER képezi (könyv × cselekvő), az
-- azonosságot a hívó adja ("idem_key"), és a TARTALOM kanonikus lenyomata külön oszlop — így
-- „ugyanaz a kulcs MÁS tartalommal" NEVEZETT ÜTKÖZÉS, nem néma felülírás (K07 alakja).
-- A "effect_json" a MÁR KIADOTT ajánlat nyugtája: az ismétlés EBBŐL felel, és nem ír semmit.
CREATE TABLE operation_once (
  book_id       text NOT NULL,
  actor         text NOT NULL,
  idem_key      text NOT NULL,
  operation     text NOT NULL,
  identity_hash text NOT NULL,
  effect_json   text NOT NULL,
  recorded_at   text NOT NULL,
  PRIMARY KEY (book_id, actor, idem_key)
);

CREATE TABLE invite_basis (
  token          text PRIMARY KEY REFERENCES invite(token),
  basis_id       text NOT NULL,
  basis_version  bigint NOT NULL,
  book_id        text NOT NULL,
  issued_at      text NOT NULL,
  operation      text NOT NULL,
  scope          text,
  sealed_limit   text NOT NULL
);

-- A KIADOTT KORLAT UGYANUGY VALTOZTATHATATLAN, MINT A KIADOTT FELTETEL (R53/F01 mintaja).
-- Enelkul a szukites megkerulheto volna EGY DELETE-tel: a korlat eltunne, es a bevaltas a
-- "nincs deklarált alap" agra esne vissza - vagyis a vedelem a sajat kiskapujat hordozna
-- (KUKA-013: ha az or csak az egyik irot ismeri, egy masik iro visszateszi az adatot).
CREATE FUNCTION invite_basis_no_update_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'invite_basis: a KIADOTT korlat nem irhato at - visszavonas + uj meghivo kell';
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_basis_no_update BEFORE UPDATE ON invite_basis
FOR EACH ROW EXECUTE FUNCTION invite_basis_no_update_fn();

CREATE FUNCTION invite_basis_no_delete_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'invite_basis: a KIADOTT korlat nem torolheto';
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_basis_no_delete BEFORE DELETE ON invite_basis
FOR EACH ROW EXECUTE FUNCTION invite_basis_no_delete_fn();

CREATE FUNCTION invite_basis_no_reseal_fn() RETURNS trigger AS $trg$
BEGIN
  IF EXISTS (SELECT 1 FROM invite_basis WHERE token = NEW.token) THEN
    RAISE EXCEPTION 'invite_basis: erre a tokenre MAR van kiadott korlat - masodik pecset nem szulethet';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_basis_no_reseal BEFORE INSERT ON invite_basis
FOR EACH ROW EXECUTE FUNCTION invite_basis_no_reseal_fn();

-- A BEVALTASSAL ATVITT KORLAT (ORG-N1b (c)). A norma szerint "a bevaltas a korlatot is atviszi,
-- nem csak a szerepet": a tagsagado esemenyhez tartozik a korlat, amely alatt keletkezett.
-- Kulon tabla, mert a "membership_grant" sorait mas utak is irjak - es a korlat NEM minden
-- tagsagadasnak a tulajdonsaga, csak annak, amelyik deklaralt alapon szuletett (KUKA-124/2).
CREATE TABLE grant_basis (
  grant_event_id bigint PRIMARY KEY REFERENCES membership_grant(id),
  token          text NOT NULL,
  basis_id       text NOT NULL,
  basis_version  bigint NOT NULL,
  granted_limit  text NOT NULL
);

CREATE FUNCTION grant_basis_no_update_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'grant_basis: az ATVITT korlat nem irhato at';
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER grant_basis_no_update BEFORE UPDATE ON grant_basis
FOR EACH ROW EXECUTE FUNCTION grant_basis_no_update_fn();

CREATE FUNCTION grant_basis_no_delete_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'grant_basis: az ATVITT korlat nem torolheto';
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER grant_basis_no_delete BEFORE DELETE ON grant_basis
FOR EACH ROW EXECUTE FUNCTION grant_basis_no_delete_fn();

-- R63 (a felterkepezo olvaso lelete, ket kapcsolaton MERVE): a REPLACE torles-triggere csak
-- recursive_triggers=ON alatt fut, egy pragma nelkuli MASODIK kapcsolatrol az INSERT OR REPLACE
-- az ATVITT korlatot nemán atirta volna (verzio, muveletek). Ezert a BESZURAS oldalarol is zarva,
-- a pragmatol FUGGETLENUL: egy tagsagado esemenyhez MASODIK atvitt korlat nem szulethet
-- (ugyanaz az or, amit az invite_terms/invite_basis mar R55 ota hordoz).
CREATE FUNCTION grant_basis_no_reseal_fn() RETURNS trigger AS $trg$
BEGIN
  IF EXISTS (SELECT 1 FROM grant_basis WHERE grant_event_id = NEW.grant_event_id) THEN
    RAISE EXCEPTION 'grant_basis: ehhez a tagsagado esemenyhez MAR van atvitt korlat - masodik nem szulethet';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER grant_basis_no_reseal BEFORE INSERT ON grant_basis
FOR EACH ROW EXECUTE FUNCTION grant_basis_no_reseal_fn();

CREATE FUNCTION invite_terms_no_update_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'invite_terms: a KIADOTT feltetel nem irhato at - visszavonas + uj meghivo kell';
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_terms_no_update BEFORE UPDATE ON invite_terms
FOR EACH ROW EXECUTE FUNCTION invite_terms_no_update_fn();

CREATE FUNCTION invite_terms_no_delete_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'invite_terms: a KIADOTT feltetel nem torolheto';
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_terms_no_delete BEFORE DELETE ON invite_terms
FOR EACH ROW EXECUTE FUNCTION invite_terms_no_delete_fn();

-- R55/F01 (S01): a REPLACE nem "modositas", hanem TORLES + BESZURAS. A torles trigger-e a
-- kapcsolat alapertelmezesevel nem fut le, ezert a BESZURAS oldalarol is zarni kell: egy tokenre
-- MASODIK pecset soha nem szulethet. Ez a ket fenti ort a pragmatol FUGGETLENUL egesziti ki.
CREATE FUNCTION invite_terms_no_reseal_fn() RETURNS trigger AS $trg$
BEGIN
  IF EXISTS (SELECT 1 FROM invite_terms WHERE token = NEW.token) THEN
    RAISE EXCEPTION 'invite_terms: erre a tokenre MAR van kiadott feltetel - masodik pecset nem szulethet';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_terms_no_reseal BEFORE INSERT ON invite_terms
FOR EACH ROW EXECUTE FUNCTION invite_terms_no_reseal_fn();

-- R55/F01: az ELO meghivo KIADOTT mezoi valtozhatatlanok. Az ELETCIKLUS mezoje (redeemed_at)
-- viszont igen - a fogyasztas a rendszer sajat, szabalyos irasa. Ket kulon dolog, ket kulon
-- kezeles: a tilalom a mezokre szol, nem a sorra.
CREATE FUNCTION invite_no_change_sealed_fn() RETURNS trigger AS $trg$
BEGIN
  IF NEW.token             <> OLD.token
  OR NEW.book_id           <> OLD.book_id
  OR NEW.invitee_namespace <> OLD.invitee_namespace
  OR NEW.invitee_value     <> OLD.invitee_value
  OR NEW.offered_role      <> OLD.offered_role
  OR NEW.issuer_subject    <> OLD.issuer_subject
  OR NEW.expires_at        <> OLD.expires_at THEN
    RAISE EXCEPTION 'invite: a KIADOTT ajanlat nem irhato at - visszavonas + uj meghivo kell';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_no_change_sealed BEFORE UPDATE ON invite
FOR EACH ROW EXECUTE FUNCTION invite_no_change_sealed_fn();

-- R55/F01 (S02): ugyanaz a token nem adhato ki masodszor. Ez zarja az INSERT OR REPLACE-t es a
-- kezi ujra-beszurast is, mielott barmi torlodne.
CREATE FUNCTION invite_no_reissue_fn() RETURNS trigger AS $trg$
BEGIN
  IF EXISTS (SELECT 1 FROM invite_terms WHERE token = NEW.token) THEN
    RAISE EXCEPTION 'invite: ez a token MAR ki lett adva - ugyanaz a token nem adhato ki ujra';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_no_reissue BEFORE INSERT ON invite
FOR EACH ROW EXECUTE FUNCTION invite_no_reissue_fn();

-- R55/F01: a lepecsetelt elo sor torlese sem ut a pecseten. A meghivo eletciklusa a redeemed_at-en
-- (es kesobb a visszavonason) megy, nem a sor eltuntetesen.
CREATE FUNCTION invite_no_delete_sealed_fn() RETURNS trigger AS $trg$
BEGIN
  IF EXISTS (SELECT 1 FROM invite_terms WHERE token = OLD.token) THEN
    RAISE EXCEPTION 'invite: kiadott meghivo sora nem torolheto - a visszavonas kulon esemeny';
  END IF;
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER invite_no_delete_sealed BEFORE DELETE ON invite
FOR EACH ROW EXECUTE FUNCTION invite_no_delete_sealed_fn();

CREATE TABLE pending_intent (
  session_id    text PRIMARY KEY,
  invite_token  text NOT NULL,
  created_at    text NOT NULL
);

CREATE TABLE channel_proof (
  subject_id    text NOT NULL,
  namespace     text NOT NULL,
  value_norm    text NOT NULL,
  proven_at     text NOT NULL,
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
  idem_key      text NOT NULL,
  actor         text NOT NULL,
  book_id       text NOT NULL,
  type          text NOT NULL,
  type_version  text NOT NULL,
  -- A NÉV IS TÉNY: a régi "declared_hash" azt állította, hogy csak a tartalom van benne, holott
  -- a művelet és a verziója is beleszámít (Q03). Ez nem kozmetika — a hibás név hibás modellt tanít.
  identity_hash text NOT NULL,
  resolved_json text NOT NULL,
  effect_id     text,
  state         text NOT NULL,
  finalized_at  text,
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
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  recipient     text NOT NULL,
  view          text NOT NULL,
  scope         text NOT NULL,
  ref           text NOT NULL,
  fields        text NOT NULL,
  at            text NOT NULL
);

--   · EGYEDISÉG a (parancs × esemény) páron ⇒ egy véglegesítéshez EGY nyugta.
-- Amit a séma nem tud (a nyugta ÁLLAPOTA és HATÁSAZONOSÍTÓJA egyezzen a parancséval, és a hívás
-- a véglegesítés tranzakciójából jöjjön), azt az író recordCommandEvent kényszeríti ki.
-- ═══ REV-N2 — A KÉT IDŐ-TENGELY FELÜLVIZSGÁLATI KÖRE (BIT-01, R83 §7) ═══════════════════════
--
-- MIÉRT SAJÁT TÁBLA. A visszamenőleges érvénytelenség nem írja át a múltat: az érintett műveletek
-- NEVESÍTETT körbe kerülnek, és a kör SAJÁT állapottal, saját lezárással él. Ha ez a tény a
-- parancs sorára kerülne (pl. egy "under_review" állapot), akkor a helyesbítés ÁTÍRNÁ az eredeti
-- rekordot — pontosan az, amit a REV-N2b tilt (REV-N1b: a múlt TARTALMA is sértetlen).
--
-- A TAGSÁG SZÁMÍTOTT, DE RÖGZÍTETT. A kör tagjait a két tengely különbsége adja (BIT-01
-- reviewCircleFor), és a számítás eredménye BELEÍRÓDIK — mert a kör egy adott TUDÁS-állapot
-- pillanatképe; ha később újraszámolnánk, a kör tartalma némán változna a naplóval együtt
-- (KUKA-090: amit a másolás/újraszámolás felülír, arra nem szabad döntést építeni).
--
-- IDEGEN KULCS a parancs elsődleges kulcsára ⇒ árva kör-tag lehetetlen; EGYEDISÉG a
-- (kör × parancs) páron ⇒ egy művelet egy körben egyszer szerepel.
-- A KÖR AZ ESEMÉNYHEZ KAPCSOLÓDIK (R85/F02). A bizonyíték-hivatkozás otthona a jogváltozási
-- ESEMÉNY; a kör csak MUTAT rá. Így a kör nélküli ágakon (azonnali, jövőbeli hatály) is megmarad
-- a hivatkozás, és nem kell fölösleges kört gyártani pusztán a megőrzés kedvéért.
CREATE TABLE review_circle (
  id                 bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id         text NOT NULL,
  book_id            text NOT NULL,
  revocation_event_id bigint NOT NULL REFERENCES membership_revocation(id),
  basis_effective_at text NOT NULL,
  basis_recorded_at  text NOT NULL,
  opened_at          text NOT NULL,
  opened_by          text NOT NULL,
  closed_at          text,
  closed_by          text,
  outcome_ref        text,
  UNIQUE (subject_id, book_id, basis_effective_at, basis_recorded_at)
);

CREATE TABLE review_circle_member (
  circle_id     bigint NOT NULL REFERENCES review_circle(id),
  book_id       text NOT NULL,
  actor         text NOT NULL,
  idem_key      text NOT NULL,
  finalized_at  text NOT NULL,
  UNIQUE (circle_id, book_id, actor, idem_key),
  FOREIGN KEY (book_id, actor, idem_key) REFERENCES command (book_id, actor, idem_key)
);

CREATE TABLE command_event (
  id        bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  book_id   text NOT NULL,
  actor     text NOT NULL,
  idem_key  text NOT NULL,
  event     text NOT NULL,
  state     text NOT NULL,
  effect_id text NOT NULL,
  at        text NOT NULL,
  FOREIGN KEY (book_id, actor, idem_key) REFERENCES command (book_id, actor, idem_key),
  UNIQUE (book_id, actor, idem_key, event)
);

-- ═══ MCS-2 — A KÉSZLET ALAPJA ═══════════════════════════════════════════════════════════════════
--
-- KAT-01 — CIKK-AZONOSSÁG. A "item_id" a STABIL BELSŐ azonosító, az "sku" az EMBER-KULCS: az SKU
-- változhat (átnevezés, szabvány-váltás), tehát hivatkozni SOHA nem rá kell. Az SKU a KÖNYVÖN BELÜL
-- egyedi — kereszt-könyves SKU-egyezésből azonosságot levonni tilos (KUKA-027: közös csatornán
-- minden azonosító csak a SAJÁT terében egyedi).
--
-- A "unit" NEM CÍMKE, hanem a mennyiség JELENTÉSE (KUKA-021), a "qty_profile" pedig a SKÁLÁJA.
-- A kettő együtt mondja meg, mit jelent egy tárolt szám — enélkül a "1500" csak számjegy-sor.
CREATE TABLE item (
  item_id     text PRIMARY KEY,
  book_id     text NOT NULL,
  sku         text NOT NULL,
  unit        text NOT NULL,
  qty_profile text NOT NULL,
  created_at  text NOT NULL,
  FOREIGN KEY (book_id) REFERENCES book (id),
  UNIQUE (book_id, sku)
);

-- KSZ-01 — KÉSZLET-FŐKÖNYV. HOZZÁFŰZÉSES: mozgás-sort MÓDOSÍTANI és TÖRÖLNI tilos, a helyesbítés
-- ÚJ sor (KUKA-023 · a V2 doktrínája: a főkönyv az igazság, a vetület származtatott).
--
-- MINDEN SOR EGY VÉGLEGESÍTETT PARANCSHOZ ÉS ANNAK NYUGTÁJÁHOZ KÖTVE ("effect_id") — árva
-- mozgás-sor nem születhet, és az atomiság így MÉRHETŐ, nem ígéret.
--
-- KÉT IDŐ (a KSZ-01 két nézete):
--   · "recorded_at" MIKOR TUDTUK MEG          → NÉZET-A: "tegnap mit tudtunk a tegnapi készletről"
--   · "effective_at" MIKORRA VONATKOZIK       → NÉZET-B: "mai tudásunk szerint mennyi volt tegnap"
-- A MAI egyenlegre a HATÁLYOS idő hat. A tagság kétidős modulja ("bitemporal.mjs") ezt NEM
-- bizonyítja — saját próbája van (P4), mert más a tárgya (KUKA-038).
--
-- A MENNYISÉG ELŐJELES SKÁLÁZOTT EGÉSZ, SZÖVEGKÉNT tárolva: a SQLite INTEGER 64 bites, de a
-- JS-oldali "Number" 2^53 fölött NÉMÁN kerekít — a szöveg + BigInt lánc sehol nem veszít (KUKA-125:
-- ahol az érték típusa a védett tény, ott a konverzió a hiba).
CREATE TABLE stock_movement (
  id           bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  book_id      text NOT NULL,
  item_id      text NOT NULL,
  owner_id     text NOT NULL,
  warehouse_id text NOT NULL,
  qty_scaled   text NOT NULL,
  qty_profile  text NOT NULL,
  effect_id    text NOT NULL,
  recorded_at  text NOT NULL,
  effective_at text NOT NULL,
  FOREIGN KEY (book_id) REFERENCES book (id),
  FOREIGN KEY (item_id) REFERENCES item (item_id)
);

CREATE INDEX stock_movement_key ON stock_movement (book_id, item_id, owner_id, warehouse_id);

-- ── A FENTI HÁROM ÁLLÍTÁS MOSTANTÓL ŐR, NEM MONDAT (a SAJÁT leletem az R10-F01 bekötése közben) ──
--
-- A tábla fejléce azt állította, hogy „árva mozgás-sor nem születhet, és az atomiság MÉRHETŐ, nem
-- ígéret" — MÉRVE viszont sem idegenkulcs, sem őr nem állt az "effect_id" mögött: a kötést KIZÁRÓLAG
-- a JS-oldali író tartotta. Amíg az író volt az egyetlen út, ez „működött"; amint az R10-F01 miatt
-- a nyers írót kivezettem a nyilvános felületről, a JS-ellenőrzés helye is elmozdult — és a tárolóban
-- SEMMI nem maradt. Ez a KUKA-050 alakja a sémán: a leíró szöveg ÁLLÍTÁS a rendszerről, és az
-- állítás elévül; a javítás nem a mondat átírása, hanem az ŐR megépítése (KUKA-004: a magyarázó
-- szöveg nem őr).
--
-- HÁROM KÜLÖN TÉNY, HÁROM KÜLÖN ŐR (KUKA-124/2: a hiány külön válasz):
--   1. a hivatkozott hatás VÉGLEGESÍTETT parancsé   → "unknown_effect"
--   2. ahhoz a hatáshoz NYUGTA is tartozik          → "receipt_missing"
--   3. a főkönyv HOZZÁFŰZÉSES: se módosítás, se törlés
CREATE FUNCTION stock_movement_requires_finalized_command_fn() RETURNS trigger AS $trg$
BEGIN
  IF (SELECT COUNT(*) FROM command WHERE effect_id = NEW.effect_id AND state = 'finalized') = 0 THEN
    RAISE EXCEPTION 'unknown_effect';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_requires_finalized_command BEFORE INSERT ON stock_movement
FOR EACH ROW EXECUTE FUNCTION stock_movement_requires_finalized_command_fn();

-- A MÁSODIK ŐR FELTÉTELE KIZÁRJA AZ ELSŐÉT — és ez nem stílus (a saját mérésem lelete).
--
-- Az első alakban mindkét őr feltétele önállóan igaz volt a HIÁNYZÓ PARANCS esetére, és az SQLite a
-- BEFORE INSERT őrök sorrendjét NEM garantálja: a mérés ezért a „nincs ilyen hatás" esetre a
-- "receipt_missing" mondatot kapta. A két tény KÉT KÜLÖN válasz (KUKA-124/2), tehát a
-- megkülönböztetés nem múlhat a végrehajtási sorrenden (KUKA-046 a tároló-őrökön: két HELYES
-- ellenőrzés rossz sorrendben is hibás eredményt ad).
CREATE FUNCTION stock_movement_requires_receipt_fn() RETURNS trigger AS $trg$
BEGIN
  IF (SELECT COUNT(*) FROM command WHERE effect_id = NEW.effect_id AND state = 'finalized') > 0
 AND (SELECT COUNT(*) FROM command_event
        WHERE effect_id = NEW.effect_id AND event = 'command_finalized') = 0 THEN
    RAISE EXCEPTION 'receipt_missing';
  END IF;
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_requires_receipt BEFORE INSERT ON stock_movement
FOR EACH ROW EXECUTE FUNCTION stock_movement_requires_receipt_fn();

CREATE FUNCTION stock_movement_no_update_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'a mozgás-sor hozzáfűzéses: a helyesbítés ÚJ sor, nem átírás (KSZ-01)';
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_no_update BEFORE UPDATE ON stock_movement
FOR EACH ROW EXECUTE FUNCTION stock_movement_no_update_fn();

CREATE FUNCTION stock_movement_no_delete_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'a mozgás-sor hozzáfűzéses: törölni tilos, a helyesbítés ÚJ sor (KSZ-01)';
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER stock_movement_no_delete BEFORE DELETE ON stock_movement
FOR EACH ROW EXECUTE FUNCTION stock_movement_no_delete_fn();

--   · ez a sor BEFELÉ nevezi meg a valódi okot (a jogosultsági döntés indokát), és SOHA nem kerül
--     kiadásra — nincs olvasója a kiadási úton.
--
-- A SOR A TRANZAKCIÓN KÍVÜL SZÜLETIK (KUKA-026): a tiltás könyvelése nem utazhat egy visszagörgetett
-- tranzakcióban, különben épp a kudarc nyoma tűnne el. A kapu a parancs-tranzakció ELŐTT fut, tehát
-- ez a sor akkor is megmarad, ha a hívás után semmi más nem történik.
--
-- AMIT EZ A TÁBLA NEM CSINÁL — KIMONDVA: nem korlátoz (nincs rá épített sebesség-kapu), és nem
-- bizonyítja, hogy a hívó KI volt — az azonosságot a hívó oldala hitelesíti (AUTH-01).
CREATE TABLE access_refusal (
  id         bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  at         text NOT NULL,
  subject_id text NOT NULL,
  book_id    text NOT NULL,
  op_class   text NOT NULL,
  operation  text NOT NULL,
  reason     text NOT NULL,
  detail     text
);

-- ═══ SGR-01 — A TÉNYLEGESEN MEGADOTT OLVASÁSI JOG, ADATKÖRÖNKÉNT (K05-DSC-c, R49) ═══════════
--
-- MIÉRT SZÜLETETT. Az R48-as alak a TAGSÁGRA ÁTVITT KORLÁTOT ("grant_basis.granted_limit") mérte,
-- és abból következtetett ENGEDÉLYRE. A külső ellenőrző fél két esetben mutatta meg, hogy ez nem
-- elég (R49): (1) ahol semmilyen adatköri korlát nem volt rögzítve, a kiadás megtörtént; (2) ahol a
-- HATÁROZAT készletre ÉS árra is adhatott volna felhatalmazást, de a MEGHÍVÓ csak készletre szólt,
-- a címzett mégis megkapta az árat — a rendszer a teljes FELSŐ KORLÁTOT adta oda.
--
-- A KÉT TÉNY KÜLÖN: „mit ADHAT a kiadó" (plafon) és „mit ADTAK MEG ennek az alanynak" (jog). A
-- plafon SZŰKÍT, de nem ad. Ez a tábla a MEGADOTT jogot tárolja — alanyra, könyvre és a tartalom
-- ZÁRT adatkör-szótárának EGY nevére szólóan.
--
-- KÉT TENGELY, mint minden más jogváltozásnál ("effective_at" × "recorded_at"), és a megvonás a
-- soron "revoked_at"-ként áll. A "basis_id"/"basis_version" KÖTELEZŐ: egy olvasási jog, aminek
-- nincs rögzített alapja, pontosan az a „bizonyítatlan engedély", amit a klauzula tilt (ORG-N1a).
--
-- R132 — A JOG A TAGSÁGI IDŐSZAKHOZ TARTOZIK ("membership_grant_id").
--
-- MIÉRT KELL. Az R132 előtt a jog kulcsa alany × könyv × adatkör volt, a tagsági IDŐSZAK nélkül.
-- Mérve a régi forráson: egy tag megvonása után, ÚJ belépéskor a régi "scope_grant" sor
-- változatlanul hatályosnak olvasódott (a megvonás a TAGSÁGOT vonta meg, a jog-sort nem), tehát az
-- új tagsággal a RÉGI adatkörjogok maguktól visszatértek. A spec ezt kifejezetten tiltja: "Új
-- belépéskor a régi adatkörjogok … NEM éledhetnek fel."
--
-- MIÉRT ESEMÉNY-AZONOSÍTÓ, ÉS NEM DÁTUM-ÖSSZEHASONLÍTÁS. A spec kimondja: "A »régebbi dátum ⇒
-- valószínűleg régi jog« heurisztika nem megfelelő." Az időszakot ezért a tagságadó ESEMÉNY
-- azonosítója jelöli — ez azonos időbélyegű eseményeknél is egyértelmű (KUKA-113: a sorrendet nem
-- helyettesíthetjük idő-becsléssel).
--
-- MIÉRT NULLABLE, ÉS MIT JELENT A NULL. A már létező, EGYSZERI tagságok sorai NULL-t viselnek, és
-- ezeknek maradnia kell reprodukálható feloldásuk (a spec kikötése: "nincs adateldobás"). A NULL
-- jelentése KIMONDOTT: az adott alany × könyv ELSŐ (legkisebb azonosítójú) tagságadó eseményéhez
-- tartozik — ez is esemény-rend, nem dátum-becslés.
--
-- OSZLOP ÉS NEM ÚJ TÁBLA: a "scope_grant" MINDEN írója NEVESÍTETT oszloplistát használ (mérve:
-- scopeGrant.mjs és a mutáció is), tehát egy nullable oszlop egyetlen meglévő írót sem tör el — a
-- "membership"/"invite" táblákon ez NEM lett volna igaz (ott POZICIONÁLIS írók is vannak, KUKA-122).
CREATE TABLE scope_grant (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id    text NOT NULL REFERENCES subject(id),
  book_id       text NOT NULL REFERENCES book(id),
  scope         text NOT NULL,
  basis_id      text NOT NULL,
  basis_version bigint NOT NULL,
  granted_by    text NOT NULL,
  recorded_at   text NOT NULL,
  effective_at  text NOT NULL,
  membership_grant_id bigint
);

CREATE INDEX scope_grant_who ON scope_grant (subject_id, book_id, scope);

-- A MEGVONÁS SAJÁT ESEMÉNY, SAJÁT TUDÁS-IDŐVEL (R51/F51-01 — a külső ellenőrző fél lelete).
--
-- AZ R49-ES ALAK a megadás sorába írt egy "revoked_at" értéket, és az olvasó CSAK a megadás
-- "recorded_at"-ját nézte. Mérve: egy ÁPRILISBAN rögzített, MÁRCIUS 10-i hatályú megvonás
-- visszamenőleg átírta a MÁRCIUS 20-i tudásállapotot is — a márciusi kérdésre áprilisi választ
-- adtunk. Ez ugyanaz a hiba-osztály, amit a tagságnál a "membership_revocation" tábla már megold
-- (K09: az esemény nem sor-átírás; KUKA-003: azonos alakú tényt nem tartunk két szerkezetben).
--
-- A MEGADÁS ÉS A MEGVONÁS EGY IDŐVONALON: mindkettő KÉT tengelyen áll, és a LEGKÉSŐBBI ALKALMAZHATÓ
-- esemény dönt. Így az ÚJRAADÁS is értelmes marad (a tagságnál ez ma nincs — ott kimondottan hiány).
CREATE TABLE scope_grant_revocation (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  subject_id    text NOT NULL,
  book_id       text NOT NULL,
  scope         text NOT NULL,
  actor_subject_id text,
  recorded_at   text NOT NULL,
  effective_at  text NOT NULL
);

CREATE INDEX scope_grant_revocation_who ON scope_grant_revocation (subject_id, book_id, scope);

CREATE INDEX access_refusal_subject ON access_refusal (subject_id, book_id, at);

-- ═══ R63 — A SAJÁT MUNKAKÖRNYEZET INDULÁSA ÉS AZ ELSŐ FELHASZNÁLÓI FOLYAMAT (CORE-UX-01) ═════════
--
-- MIÉRT ÚJ TÁBLA, ÉS NEM A grant_basis. A beváltáskor átvitt korlát (grant_basis) a MEGHÍVÓ
-- tokenjéhez kötött (token NOT NULL), mert ott a jog egy KIADOTT meghívóból születik. A saját
-- munkakörnyezet létrehozásánál NINCS meghívó: a jogot az ELLENŐRZÖTT FIÓK SAJÁT létrehozási
-- művelete és a VERZIÓZOTT indulási szabály alapozza meg (R63 §4). Ez más tény, más otthonnal
-- (KUKA-002: két független tény nem ülhet egy oszlopon) — de ugyanúgy AUDITÁLHATÓ: melyik
-- fiók, melyik szabály-verzió alatt, melyik alap-verzióval, melyik tagságadó eseménnyel.
CREATE TABLE workspace_bootstrap (
  book_id            text PRIMARY KEY REFERENCES book(id),
  creator_subject_id text NOT NULL REFERENCES subject(id),
  grant_event_id     bigint NOT NULL REFERENCES membership_grant(id),
  basis_id           text NOT NULL,
  basis_version      bigint NOT NULL,
  rule_version       text NOT NULL,
  recorded_at        text NOT NULL
);

CREATE FUNCTION workspace_bootstrap_no_update_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'workspace_bootstrap: az indulasi alap nem irhato at';
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_bootstrap_no_update BEFORE UPDATE ON workspace_bootstrap
FOR EACH ROW EXECUTE FUNCTION workspace_bootstrap_no_update_fn();

CREATE FUNCTION workspace_bootstrap_no_delete_fn() RETURNS trigger AS $trg$
BEGIN
  RAISE EXCEPTION 'workspace_bootstrap: az indulasi alap nem torolheto';
  RETURN OLD;
END;
$trg$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_bootstrap_no_delete BEFORE DELETE ON workspace_bootstrap
FOR EACH ROW EXECUTE FUNCTION workspace_bootstrap_no_delete_fn();

-- A CÍMZETTI CSATORNA BIZONYÍTÁSÁNAK KIHÍVÁSA (K03). A fiók regisztrációjakor az e-mail cím
-- ÖNBEVALLOTT (external_id, issuer=self_asserted); a csatorna BIZONYÍTÉKA (channel_proof) csak
-- akkor születik, ha a címre kiküldött egyszeri kihívást a birtokosa beváltja. Egyszeri, lejáró,
-- és a beváltás ténye a sorban marad (used_at) — a hiány nem néma.
--
-- A LEVÁLTÁS KÜLÖN TÉNY (CHR-01, R75/F75-01). Ha a birtokos ÚJ megerősítő levelet kér, a korábbi,
-- még be nem váltott hivatkozás nem maradhat élő — de nem is hazudhatjuk rá, hogy „beváltották"
-- (used_at) vagy hogy „lejárt" (expires_at átírása): mindkettő MÁS tényt állítana (KUKA-050 · a
-- szöveg a valóságot követi). Ezért a leváltás SAJÁT oszlopon áll, a leváltó hivatkozás nevével —
-- így a beváltó NEVEZETTEN tud challenge_superseded-et mondani, és a napló megmondja, mi váltotta.
CREATE TABLE channel_challenge (
  token          text PRIMARY KEY,
  subject_id     text NOT NULL REFERENCES subject(id),
  namespace      text NOT NULL,
  value_norm     text NOT NULL,
  created_at     text NOT NULL,
  expires_at     text NOT NULL,
  used_at        text,
  superseded_at  text,
  superseded_by  text
);

-- AZ ELŐFIZETÉS FUNKCIÓT BIZTOSÍT, NEM CÉGES ADATJOGOT (R63 §3 — „A két feltételt külön
-- ellenőrizzük"). Ezért KÜLÖN tábla, KÜLÖN feloldó (entitlement.mjs), és a jogosultsági
-- döntésbe (rightAt · scopeReleaseDecision) SOHA nem folyik bele. Tesztprofil: fizetési
-- integráció nélkül, a terv és a funkció-lista rögzített ténye.
CREATE TABLE entitlement_profile (
  book_id      text PRIMARY KEY REFERENCES book(id),
  plan         text NOT NULL,
  features     text NOT NULL,
  recorded_at  text NOT NULL
);

-- A MUNKAKÖRNYEZET VÁLLALKOZÁSI MINŐSÉGE (K01 · R63 §3). Adóregisztráció, jogalany, személy és
-- fiók NÉGY külön objektum: a fiók a SZEMÉLY alanyához tartozik; a vállalkozási minőség egy
-- KÜLÖN, legal_entity fajtájú alany, aminek a külső azonosítója NÉVTEREZETT (namespace +
-- jurisdiction + issuer) — a HU és az AT adószám azonos karaktersora két különböző tény. Az
-- issuer=self_asserted kimondja: ez BEÍRT állítás, nem hatósági igazolás; ugyanazt a
-- karaktersort más is beírhatja, és attól SEM kap hozzáférést ehhez a munkakörnyezethez.
CREATE TABLE business_identity (
  book_id            text PRIMARY KEY REFERENCES book(id),
  entity_subject_id  text NOT NULL REFERENCES subject(id),
  namespace          text NOT NULL,
  jurisdiction       text NOT NULL,
  recorded_at        text NOT NULL
);

-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- ALKALMAZÁS-RÉTEG — NEM A MAG RÉSZE, ezért a séma-paritás őre KÜLÖN kezeli (deklarált kivétel).
--
-- A bemutató mintaadat-hozzárendelése. Eddig a FUTÓ alkalmazás hozta létre (`CREATE TABLE IF NOT
-- EXISTS` indulásnál); telepített környezetben ez séma-módosítás futásidőben, ami a kiadási
-- szerződést sértené (R146 §5: „Build alatt nincs DB-módosítás"). Innentől a migráció hozza.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

CREATE TABLE app_demo_fixture (
  book_id     text PRIMARY KEY REFERENCES book(id),
  fixture     text NOT NULL,
  created_by  text NOT NULL,
  assigned_at text NOT NULL
);
