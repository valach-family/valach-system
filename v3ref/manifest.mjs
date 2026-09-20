// V3 MAGREFERENCIA — A PRÓBAKÉSZLET KÜLSŐ SZERZŐDÉSE (MFT-01).
//
// MIÉRT SZÜLETETT (R45 §„A mérő öt fennmaradó hibaalakja", H03/H04):
//
// A mutációs eszköz eddig a FUTÁS EREDMÉNYÉBŐL olvasta ki, mely próbák léteznek. Ezért:
//   · H03 — a mutáns nem futtatott egyetlen próbát sem, csak a hat ismert azonosítóhoz adott
//     `SKIP` rekordot: a mérő MIND A TÍZ mutációt elkapottnak mondta, és 0-val zárt.
//   · H04 — a mutáns CSAK a bukott rekordokat írta ki: a hiányzó négy rekordot semmi nem vette
//     észre, tehát a hiányos eredménycsomag is „teljes bizonyítéknak" látszott.
//
// A közös ok: **a mérő a mért féltől kérdezte meg, mit KELLETT VOLNA mérnie.** Ez körkörös
// (KUKA-054): a rövidebb lista automatikusan új „teljes készletté" vált. Ezért a várt készlet
// innentől KÜLSŐ, a futás eredményétől FÜGGETLEN szerződés — ez a fájl.
//
// EZ NEM KÉZZEL LÉPTETETT DARABSZÁM (KUKA-045): nem azt mondjuk ki, hogy „hat próba van", hanem
// hogy MELYEK, NÉV SZERINT, és mindkét irányban egyeznie kell — hiányzó, ismétlődő és ISMERETLEN
// azonosító egyaránt mérőhiba. Új próba felvétele ezért tudatos szerződés-bővítés, nem mellékhatás.
//
// PURE + INERT: nincs futtatás, nincs I/O. Csak a szerződés.

export const MANIFEST_VERSION = 'v3ref-manifest-3';

/**
 * A VÁRT PRÓBÁK. Minden bejegyzés megnevezi az ÁLLÍTÁST is (`assertion`), amit a próba mér —
 * mert egy próbát nem az AZONOSÍTÓJA tesz megfelelő elkapóvá, hanem az, hogy a MEGFELELŐ ÁLLÍTÁS
 * bukik el (R45 H06: idegen infrastruktúra-kivétel ugyanazon a próbán NEM ugyanaz a bizonyíték).
 *
 * A `discharges` MEZŐ (R53 §4/2 — ÚJ). Itt fordul meg a norma ↔ bizonyíték kötés iránya. Eddig a
 * NORMA nevezett meg egy szabadon választott próbanevet, és a kapu csak a név LÉTEZÉSÉT nézte —
 * ezért lehetett a REV-N1-et az idegen `P-A04`-re átkötni úgy, hogy a kapu zöld maradjon (F03).
 * Innentől a PRÓBA mondja meg, MELYIK atomi klauzulát MELYIK állítással váltja be, a norma pedig
 * egyáltalán nem tárol próbanevet. A próbának FUTÁSIDŐBEN ki is kell adnia ezeket az
 * állítás-azonosítókat (`asserts`), különben a deklaráció üres ígéret (KUKA-016).
 */
// A SZERZŐDÉS VERZIÓJA AZ R43-AS BEKÖTÉSSEL — EGY helyen, hogy a 13 új sor ne tudjon elcsúszni.
const VERSION_R43 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d';
// R45 — a teljes tartalmi történet-megőrzés és a HATÁS-KÖZBENI hibahatár bekötése (F45-01/02).
const VERSION_R45 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history';
// R47 — a K05-DSC-c ENGEDŐ ága: az adatkörönkénti olvasási döntés rögzített alapja (RSB-01).
const VERSION_R47 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis';
// R49 — a TÉNYLEGESEN megadott olvasási jog (SGR-01): a plafon szűkít, a hiány zár.
// R63 — A HIÁNYZÓ ALAP ZÁR (pecsét nélküli meghívó · alap nélküli hatáskör), a saját munkakörnyezet
// indulási alapja és a meghívó delegálási alapja a rendszer SAJÁT írásán képződik (WSP-01 · DLG-01).
const VERSION_R63 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis + R49/K05-c-grant + R51/K05-c-grant-history + R53/ORG-N1b-adjudication + R55/ORG-N1b-granted-version + R63/CORE-UX-1-basis-closed';
const VERSION_R55 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis + R49/K05-c-grant + R51/K05-c-grant-history + R53/ORG-N1b-adjudication + R55/ORG-N1b-granted-version';
const VERSION_R53 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis + R49/K05-c-grant + R51/K05-c-grant-history + R53/ORG-N1b-adjudication';
const VERSION_R51 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis + R49/K05-c-grant + R51/K05-c-grant-history';
const VERSION_R49 = 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01 + R43/K10-a-d + R45/K10-d-history + R47/K05-c-basis + R49/K05-c-grant';

export const EXPECTED_PROBES = Object.freeze([
  Object.freeze({ id: 'P-A04', assertion: 'A04-two-worlds-byte-identical' }),
  Object.freeze({ id: 'P-A04b', assertion: 'A04b-mailbox-holder-gets-actionable-answer' }),
  Object.freeze({ id: 'P-K03-cred', assertion: 'K03-existing-credential-unchanged' }),
  Object.freeze({ id: 'P-K03-intent', assertion: 'K03-pending-intent-resumable' }),
  Object.freeze({
    id: 'P-A08', assertion: 'A08-single-effect-and-today-right',
    // R35 — K05-DSC-d: a kiadás a HATÁLYOSULÁSI PONTON ellenőrzött jogon áll, és sem a megvonás, sem
    // az ismétlés, sem a korábbi eredmény újraolvasása nem kerüli meg. A három fél három NEVEZETT
    // állításból áll össze; egyik sem új teszt, mindhárom MÁR FUTÓ próba megnevezett része.
    discharges: Object.freeze([
      Object.freeze({ clause: 'K05-DSC-d', assertion: 'A-A08-revoked-right-blocks-replay-and-reread',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
    ]),
  }),
  Object.freeze({ id: 'P-A14', assertion: 'A14-evidence-freshness-profile' }),

  // ── A Q01–Q15 KÖR (D-VS-3007) ────────────────────────────────────────────────────────────────
  // Tíz új próba a tizenöt megnevezett maghibára, plusz a teljesség-kritika ÉLŐ leletére
  // (P-INVITE-window). A készlet KÜLSŐ szerződés: ha egy próba kiesik a futásból, az MÉRŐHIBA,
  // nem „kevesebb próba".
  Object.freeze({ id: 'P-CMD-namespace', assertion: 'Q01-command-key-is-scoped' }),
  Object.freeze({ id: 'P-CMD-identity', assertion: 'Q02Q03-identity-covers-nested-type-version' }),
  Object.freeze({ id: 'P-CMD-finalize', assertion: 'Q04-right-rechecked-before-write' }),
  Object.freeze({ id: 'P-CMD-disclosure', assertion: 'Q14Q15-every-release-is-ledgered' }),
  Object.freeze({ id: 'P-AUTHZ-opclass', assertion: 'Q07-unknown-op-class-denied' }),
  Object.freeze({ id: 'P-AUTHZ-membership-time', assertion: 'Q08-membership-validity-interval' }),
  Object.freeze({ id: 'P-AUTHZ-evidence', assertion: 'Q05Q06-evidence-three-axes' }),
  Object.freeze({ id: 'P-INVITE-window', assertion: 'INV-expired-invite-grants-nothing' }),
  Object.freeze({
    id: 'P-INVITE-authority', assertion: 'Q09Q10Q13-redeem-gates',
    // ORG-N2a: a kibocsátó jogának megvonása után a függő meghívó NEM ad tagságot, és a nemleges
    // válasz NEVEZETT. Ez a próba (c) ága; a tiltó alapértelmezés az EGYETLEN szervezeti klauzula,
    // aminek ma bizonyítéka van.
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N2a', assertion: 'A-ORG-N2a-issuer-basis-withdrawn-is-fail-closed' }),
    ]),
  }),
  Object.freeze({ id: 'P-INVITE-effect', assertion: 'Q11Q12-real-effect-and-atomicity' }),
  Object.freeze({ id: 'P-AUTHZ-revoke-now', assertion: 'K09-immediate-revocation-pulls-forward' }),

  // ── A HAT HIÁNYZÓ ŐR (R49 · D-VS-3008) ───────────────────────────────────────────────────────
  // Sajat kezzel merve: a veglegesitesi kaput kitorolve a batteria 17/17 zold maradt, mikozben a
  // KULSO proba 30/30 -> 28/30 esett. A javitas legfontosabb fele orizetlen volt (KUKA-051).
  Object.freeze({ id: 'P-INVITE-finalize-gate', assertion: 'R49C02C03-redeem-gate-at-write-boundary' }),
  Object.freeze({ id: 'P-CMD-receipt', assertion: 'R50-finalization-receipt-is-durable-and-atomic' }),
  Object.freeze({ id: 'P-CMD-receipt-integrity', assertion: 'R51J3-receipt-bound-to-command-fact' }),
  Object.freeze({ id: 'P-INVITE-seal', assertion: 'R55F01-issued-offer-immutable-on-every-write-path' }),
  Object.freeze({ id: 'P-INVITE-terms', assertion: 'R51J2-invite-terms-immutable-outcome-in-tx' }),
  Object.freeze({
    id: 'P-CMD-finalize-gate', assertion: 'R49-command-gate-at-write-boundary',
    // A REV-N1 KÉT bizonyítható klauzulája. A régi alak csak az ELSŐT mérte, és a norma egészét
    // „megépült"-nek mondta — a külső fél F04 ellenpéldája (a megvonás KITÖRLI a korábbi
    // parancsokat) ezért maradhatott PASS. Egy fél feltételt zártam le, és készként jelentettem
    // (KUKA-095). A második klauzula ÖNÁLLÓ állítást kapott, a próba (Y4) ágán.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N1a', assertion: 'A-REV-N1a-dependent-new-op-and-release-blocked' }),
      Object.freeze({ clause: 'REV-N1b', assertion: 'A-REV-N1b-earlier-record-and-decision-survive' }),
      // K05-DSC-d MÁSODIK FELE (R37): a megvonás és az ISMÉTLÉS a véglegesítési határon akad el —
      // ez a P-A08-tól FÜGGETLEN bizonyíték, és a külső fél döntése szerint a klauzula ezen a
      // HÁRMASON áll (P-A08 + P-CMD-finalize-gate + P-CMD-release-effectuation).
      Object.freeze({ clause: 'K05-DSC-d', assertion: 'A-K05-DSC-d-replay-and-release-are-blocked-at-the-write-boundary',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/külső tartalmi döntés' }),
    ]),
  }),
  Object.freeze({ id: 'P-AUTHZ-roles', assertion: 'R49C05-unknown-role-grants-nothing' }),
  Object.freeze({ id: 'P-CANON-shape', assertion: 'R49C08C10-canon-shape-closed' }),
  Object.freeze({ id: 'P-TIME-calendar', assertion: 'R49C09-calendar-fields-validated' }),
  Object.freeze({ id: 'P-IDENTITY-address', assertion: 'R49C07-bindings-are-not-subjects' }),

  // ── A NORMA-BIZONYÍTÉK KAPU SAJÁT ELLENPRÓBÁI (R53 · D-VS-3010) ───────────────────────────────
  // A kapu, ami nem tud hazudni, csak akkor ér valamit, ha ezt MÉRJÜK is. Ez a próba a saját
  // norma-indexünket támadja nyolc irányból — köztük a külső fél F03 támadásának ÚJ ALAKJÁVAL
  // (idegen, létező próbára átkötés) és a KÖTELEZŐ ellenpárral (a helyes csomagon zöld), mert az
  // őr, ami mindent pirosra visz, ugyanolyan haszontalan, mint az, ami mindent átenged (KUKA-049).
  Object.freeze({ id: 'P-NORM-evidence', assertion: 'R53F03F04-norm-evidence-gate-cannot-lie' }),

  // ── REV-N3 — A HATÁSKÖR ÉS A BEJELENTÉS (req-2, R60-ban ELŐRE vállalva · R65 §7) ─────────────
  // A `discharges` itt HÁROM klauzulát vált be, KÜLÖN állításokkal. Miért külön: egy több-állításos
  // próba ÖSSZESÍTETT bukása nem igazolja mindegyik klauzulát (R55/F02 lecke — a KUKA-039 alakja a
  // bizonyítékon). Mindegyik állításhoz KÜLÖN mutáció tartozik (M50–M55).
  Object.freeze({
    id: 'P-REV-authority', assertion: 'REVN3-authority-and-intake-together',
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-authority-is-per-operation' }),
      Object.freeze({ clause: 'REV-N3c', assertion: 'A-REV-N3c-claim-intake-open-and-inert' }),
    ]),
  }),
  // R67/F01: a felfüggesztés KÖVETKEZMÉNYE külön állítás, külön próbával. Miért nem a
  // P-REV-authority-ba tettük: az a próba a HATÁSKÖR műveletenkéntiségét méri, ez pedig a HATÁST —
  // és épp az volt a lelet, hogy a kettőt egy zöld pipa alá vontuk (R55/F02 lecke).
  Object.freeze({
    id: 'P-REV-suspension', assertion: 'REVN3-suspension-has-effect',
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-suspension-has-effect' }),
    ]),
  }),
  // R67/F02–F05: a bejelentés-út HÁROM külön tulajdonsága, HÁROM külön állításon. A régi alak
  // egyetlen állítás alá vonta volna őket, és az összesített bukásból nem derülne ki, MELYIK
  // tulajdonság veszett el (R55/F02 · KUKA-039).
  Object.freeze({
    id: 'P-REV-claim-read', assertion: 'REVN3-claim-grants-no-read',
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3b', assertion: 'A-REV-N3b-claim-grants-no-read' }),
      // F03: az elbírálónak VAN MIT elolvasnia, és a sérült tartalom NEVEZETT hibát ad — az
      // olvasás-kapunak csak akkor van tárgya, ha a beadvány egyáltalán megmaradt.
      Object.freeze({ clause: 'REV-N3b', assertion: 'A-REV-N3b-claim-content-readable' }),
      // F04+F05: a korlát a SZERVER képezte kulcson áll (a hívó nem tudja átírni), és a
      // félbemaradt beadás nem hagy részleges állapotot.
      Object.freeze({ clause: 'REV-N3c', assertion: 'A-REV-N3c-intake-limit-server-keyed' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-claim-decide', assertion: 'REVN3-decision-needs-intact-evidence',
    // R69/C-F01+C-F02+C-F03 (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Két külön klauzulát old ki: az
    // ÉRDEMI DÖNTÉS csak ép beadványon születhet (REV-N3a — a hatáskör gyakorlása nem formaság),
    // és a másodlagos hivatkozás nem vehet el MÁS keretét (REV-N3c).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-decision-needs-intact-evidence' }),
      Object.freeze({ clause: 'REV-N3c', assertion: 'A-REV-N3c-secondary-ref-cannot-take-others-quota' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-ban-scope', assertion: 'REVN5-ban-scope-comes-from-cause',
    // R71 §8/1 (req-3, 1. lépés). A tiltás FAJTÁI és az ok→hatókör leképezés: ugyanaz a szó KÉT
    // különböző hatókört kap, és a hatókört az OK választja ki, nem egy általános szabály.
    // R73/C-F01–C-F02 + C-F05 (a külső fél leletei): a hatókör akkor ér valamit, ha a TÁRGYÁT nem
    // lehet elmozdítani (a belépési kontextus nem írhat a kérés tengelyeire), és ha az önmagának
    // ellentmondó tárolt rekord NEM válik „nincs tiltás"-sá.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-ban-scope-comes-from-cause' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-ban-kind-is-named-and-closed' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-request-axis-not-overridable' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-contradicting-record-is-not-a-measurement' }),
      // R75/F04 — az ISMERETLEN TÁROLT OK saját, nevezett válasza. A régi alak a hiányt NÉMÁN
      // átengedte (a feltétel `expectedKind && …` volt), tehát egy importált sor mellett a kérés
      // ENGEDÉLYT kapott. A hiány KÜLÖN válasz, nem a rossz érték ága (KUKA-124/2).
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-unknown-stored-cause-is-not-swallowed' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-ban-paths', assertion: 'REVN5-ban-reaches-every-path',
    // R71 §8/1 (req-3, 2. lépés). A klauzula előfeltétele KÉT engedő út: a tagsági (`rightAt`) és a
    // REV-N3-ban megépült hatásköri (`adjudicationRightAt`). A tiltás bevezetésének HELYE nem
    // szűkíti a hatását — enélkül a fél őr (KUKA-039) csendben megszülethetne.
    //
    // R75 — A HARMADIK ÚT: A KIADÁS. A külső fél kimondta, hogy a KIADÁSI művelet is szerepeljen a
    // fogyasztók között: egy már letiltott eljáró NEM tilthat. Mellé a két maradék: nincs gyengébb
    // szerződésű író (`imposeBan`), és a belépési kontextus VÉGIGMEGY az elbírálási úton is — úgy,
    // hogy az ÉRVÉNYES MÁSIK hitelesítő nem akad el (ez a C-F04 pontos iránya).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-ban-reaches-every-permitting-path' }),
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-ban-needs-authority' }),
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-issuing-path-is-a-permitting-path' }),
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-no-weaker-writer' }),
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-credentials-reach-adjudication' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-ban-past', assertion: 'REVN5-ban-spares-past-and-others',
    // R71 §8/1 (req-3, 3. lépés). A tiltás nem bizonyítja a korábbi műveletek érvénytelenségét, és
    // nem törli a KÖNYV vagy más, független jogosultak jogait. TARTALMI pillanatkép (R55-F02: a
    // darabszám ép maradhat úgy is, hogy a tartalom megváltozott) + ELLENPÁR a másik jogosulton.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5c', assertion: 'A-REV-N5c-ban-does-not-rewrite-the-past' }),
      Object.freeze({ clause: 'REV-N5c', assertion: 'A-REV-N5c-ban-does-not-remove-others-rights' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-ban-matrix', assertion: 'REVN5-ban-matrix-is-measured',
    // R73 · R75 §8. A külső tárgyaló fél KÉTSZER kérte a „tiltásfajta × engedő út ×
    // érintett/független cél × hiteles kontextus" mátrixot BIZONYÍTOTT alakban, és kimondta, hogy a
    // KIADÁSI művelet is szerepeljen a fogyasztók között. A mátrix itt MÉRÉS: minden cella valódi
    // futás, a VÁRT értéket a cella deklarálja (KUKA-054), a fajtákat a ZÁRT HALMAZ adja (KUKA-051),
    // és az ember-olvasható tábla UGYANEBBŐL a függvényből származik (KUKA-082).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-every-path-measured-for-every-kind' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-scope-matrix-matches-the-norm' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-bitemporal', assertion: 'REVN2-two-time-axes-are-separate',
    // R83 §7 (req-4, 1. lépés). A külső fél KÉTSZER kérte a REV-N2a/b érdemi feldolgozását; a terv
    // a `NEXT_REQUIRED_EVIDENCE.order`-ben állt, MIELŐTT a kód megszületett (KUKA-054). A klauzula
    // `gap`-je ezzel a körrel szűnik meg — a kettő nem állhat egyszerre (a norma-kapu ezt méri).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-past-view-survives-later-recording' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-present-view-reflects-the-correction' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-future-dated-correction-does-not-move-today' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-recording-needs-authority-and-evidence' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-review-circle', assertion: 'REVN2-review-circle-is-computed-and-closed',
    // R83 §7 (req-4, 2. lépés). A kör tagsága SZÁMÍTOTT (a két tengely különbsége), az eredeti
    // történet tartalmilag érintetlen, és a LEZÁRÁS külön, hatáskörhöz kötött esemény.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N2b', assertion: 'A-REV-N2b-circle-membership-is-computed' }),
      Object.freeze({ clause: 'REV-N2b', assertion: 'A-REV-N2b-original-history-is-untouched' }),
      Object.freeze({ clause: 'REV-N2b', assertion: 'A-REV-N2b-unaffected-operations-stay-out' }),
      Object.freeze({ clause: 'REV-N2b', assertion: 'A-REV-N2b-closing-is-a-separate-authorised-event' }),
    ]),
  }),

  Object.freeze({
    id: 'P-REV-grant-axis', assertion: 'REVN2-grant-has-two-time-axes',
    // R85 §3. A külső fél ellenpéldája: a JÚNIUSI jogszerzés megváltoztatta a MÁRCIUSI tudás
    // szerinti augusztusi képet. A két tengely a MEGVONÁSON már ki volt építve, a TAGSÁGADÁSON
    // nem — ez a KUKA-039 „fél őr" alakja. A gyengébb tanú (napló nélküli sor) MEGNEVEZVE.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-grant-has-its-own-knowledge-axis' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-pre-known-later-effective-grant' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-retroactively-recorded-grant' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-weaker-grant-witness-is-declared' }),
    ]),
  }),

  Object.freeze({
    id: 'P-REV-evidence-home', assertion: 'REVN2-evidence-lives-on-the-event',
    // R85 §4. A kötelezően bekért bizonyíték-hivatkozás CSAK a felülvizsgálati körbe került, a kör
    // viszont kizárólag a visszamenőleges ágon születik — jövőbeli hatálynál nyomtalanul elveszett.
    // A hivatkozás otthona innentől az ESEMÉNY; a kör ehhez kapcsolódik (KUKA-018 · KUKA-126).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-evidence-survives-without-circle' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-circle-points-at-the-event' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-all-three-branches-same-contract' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-REV-N2a-no-evidence-no-right-change' }),
    ]),
  }),

  Object.freeze({
    id: 'P-ORG-basis', assertion: 'ORGN1-authority-basis-is-recorded-in-time',
    // R85 §1 + §5. A felhatalmazás alapja: azonosító, verzió, hatály, rögzítési idő és
    // eseményhez kötött bizonyíték. A KÉT TENGELY ugyanaz, amit a megvonás és a tagságadás
    // használ — három azonos alakú tényt nem tartunk három szerkezetben (KUKA-003).
    // KIMONDOTT HATÁR: az ORG-N1b (a korlát KIKÉNYSZERÍTÉSE) a MEGHÍVÓ útján az R90 §6-ban
    // megépült (P-ORG-basis-limit); a BÍRÁLATI hatáskör útján továbbra is csak adat, és a (d)
    // állítás épp azt méri, hogy ezt a rendszer ki is mondja magáról.
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-basis-version-history-on-two-axes' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-grant-records-the-version-it-was-issued-under' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-expired-or-unknown-basis-is-named-and-closed' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-limit-is-data-not-enforcement-and-says-so' }),
      // R88/F01 (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Az alap azonossága a (basis_id, book_id) PÁR:
      // a feloldó CSAK az azonosítóra keresett, a kiadó út a könyvet meg sem kérdezte — egy „A"
      // könyvre szóló határozat „B" könyvben is adott hatáskört (KUKA-027 a bizonyíték-térben).
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-basis-identity-is-the-book-pair-and-crossing-leaves-no-trace' }),
    ]),
  }),

  Object.freeze({
    id: 'P-ORG-basis-limit', assertion: 'ORGN1-authority-may-not-exceed-its-basis',
    // R90 §6 — a req-5 terv 2. lépése, ELŐRE leírva (norms.mjs), utólag megépítve. A korlát
    // ITT lesz KAPU: a kiadás és a beváltás UGYANAZT a feloldót hívja (BLI-01 · KUKA-129), a
    // nyers `INSERT`-tel írt meghívó sem bújhat ki alóla (KUKA-013), a korláton BELÜLI kiadás
    // pedig változatlanul megy (ELLENPÁR — KUKA-122).
    // KIMONDOTT MARADÉK: a korlát DEKLARÁLÁSÁNAK kötelezővé tétele SZERVEZETI döntés, nem
    // kód-tulajdonság — ezért az ORG-N1b ebben a körben `partially_covered`, és a deklarálatlan
    // meghívó válasza NEVEZI, hogy a korlát nem hatott (KUKA-041).
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-issuing-beyond-the-basis-is-named-and-leaves-no-trace' }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-issuing-within-the-basis-is-unchanged' }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-redemption-carries-the-limit-not-only-the-role' }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-raw-written-invite-cannot-escape-the-issued-limit' }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-undeclared-basis-is-named-and-closed',
        contract: 'BLI-01', contract_version: VERSION_R63 }),
      // R92/F01–F02 (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, a teljes kiadás→beváltás úton mérve). A
      // korlát KÉT módon volt megkerülhető: a hívó átnevezhette az ellenőrzött MŰVELETET, és az
      // adatkör ELHAGYÁSA kikapcsolta a tengelyt. A javítás a MŰVELETI SZERZŐDÉS (MOP-01): a
      // művelet azonosságát a belépési pont adja, a kötelező tengelyeket a szerződés.
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-operation-identity-is-the-entry-point-not-the-caller' }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-omitting-an-axis-does-not-disable-it' }),
    ]),
  }),

  Object.freeze({
    id: 'P-ORG-grant-atomic', assertion: 'REVN2-grant-write-is-one-atomic-fact',
    // R88/F02 (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). A `grantMembership` előbb az ESEMÉNYT írta, majd a
    // vetületet; egyediségi bukásnál az esemény BENT MARADT, tehát egy SIKERTELEN hívás átírta a
    // történetet. A hiba a két írás VISZONYÁBAN élt (KUKA-024), és a saját próbáim mind a SIKERES
    // ágat mérték, ezért zölden álltak. A javítás a TÁROLÓ közös atomi egysége (`store.atomic`),
    // beágyazva mentési ponttal — hogy a jogos, tranzakcióból hívó beváltás NE akadjon el
    // (KUKA-122: a kapu csak akkor kapu, ha teljesíthető).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-ORG-grant-success-writes-event-and-projection' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-ORG-failed-grant-leaves-no-event-and-no-history-change' }),
      Object.freeze({ clause: 'REV-N2a', assertion: 'A-ORG-nested-caller-stays-legal-and-follows-the-outer-transaction' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-effectuation', assertion: 'REVN2-effectuation-point-is-explicit',
    // R77/F01. A külső tárgyaló fél mérte meg, hogy a három hatáskör-igényes író KÉTSZER olvas órát:
    // a döntés az elsőn, a rögzített hatás időbélyege a másodikon. A javítás EGY nevezett
    // hatályosulási pont (EFF-01, `authority.mjs` → `effectuate`), és a próba a VISSZAMÉRHETŐ
    // invariánst méri, nem az óraolvasások számát: minden rögzített hatásra igaz, hogy a SAJÁT
    // időbélyegén újraértékelve az eljáró joga fennállt. A negyedik út (`revokeMembership`) a saját
    // kiterjesztésem — a szabály a hiba OSZTÁLYÁRA szól (KUKA-051).
    //
    // MELYIK KLAUZULÁT TELJESÍTI — ÉS MELYIKET NEM (KUKA-041 · KUKA-087). A külső fél a javítást „a
    // REV-N2a/b részeként" kérte, és a SORREND szerint az a KÖVETKEZŐ nagy csomag. A REV-N2a saját
    // szövege viszont a HATÁLY és a TUDOMÁS KÉT IDŐTENGELYÉRŐL szól, és a `gap`-je nyitva áll: azt
    // ez a javítás NEM zárja le, és nem is állítjuk, hogy lezárja — a saját söprésem pontosan ezen
    // bukott ki („egyszerre nevez meg HIÁNYT és van rá bizonyítéka"), és igaza volt.
    // Amit ez a próba TÉNYLEGESEN bizonyít, az a REV-N3a: a felfüggesztést, a megvonást, az érdemi
    // elbírálást és a jogváltoztatást CSAK ellenőrzött hatáskörű alany végezheti — a rögzített hatás
    // pillanatában is, nem csak a kérés beérkezésekor.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-effect-time-is-the-decision-time' }),
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-denied-write-has-no-side-effect' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-ban-record-shape', assertion: 'REVN5-malformed-stored-scope-fails-closed',
    // R77/F03. A tárolt `"own_book"` cél ÜRES könyv-tengelyét a feloldó „másik könyvnek" vette,
    // és TOVÁBBENGEDTE a kérést: egy érvénytelen tiltás úgy viselkedett, mint egy érvényes, de más
    // könyvre szóló. A javítás a rekord-integritás NEGYEDIK, nevezett ága, EGY feloldóból
    // (`operationScopeProblem`), amit a `banRecordIntegrity` és a `banReaches` is hív (KUKA-039).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-malformed-stored-scope-is-fail-closed' }),
    ]),
  }),
  Object.freeze({
    // RSB-01 (R47) — A K05-DSC-c ENGEDŐ ÁGA. A `P-REV-result-scope` a TILTÓ felet bizonyítja (a
    // vegyes eredmény egészben megtagadva); ez a próba a másik felét: hogy MINDEN érintett
    // adatkörre ÉRVÉNYES OLVASÁSI DÖNTÉS áll — a tiltás HIÁNYA nem engedély. A döntés forrása a
    // MEGLÉVŐ jogalap-lánc (ORG-N1a határozat → ORG-N1b beváltás → a tagságra átvitt korlát).
    id: 'P-DSC-scope-basis', assertion: 'K05c-release-scope-decision-has-a-recorded-basis',
    discharges: Object.freeze([
      // R49 — A KÖTÉS A JAVÍTOTT NORMÁHOZ IGAZÍTVA. A „membership_only" állítás KIVEZETVE: a külső
      // fél kimondta, hogy a gyengébb alap MEGNEVEZÉSE nem teszi jogszerűvé a kiadást. Helyette a
      // HIÁNY ZÁR, és a SZŰK adás a TÁG keretből nem tágul (SGR-01).
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-missing-scope-grant-closes-the-release',
        contract: 'SGR-01', contract_version: VERSION_R49 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-narrow-grant-from-a-broad-basis-stays-narrow',
        contract: 'SGR-01', contract_version: VERSION_R49 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-reader-entitled-to-every-affected-scope-still-gets-the-result',
        contract: 'SGR-01', contract_version: VERSION_R49 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-explicit-ban-holds-alongside-a-permitting-basis',
        contract: 'RSB-01', contract_version: VERSION_R47 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-revoked-grant-or-revoked-expired-basis-closes-a-previously-open-release',
        contract: 'SGR-01', contract_version: VERSION_R49 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-refusal-keeps-the-existence-boundary',
        contract: 'RSB-01', contract_version: VERSION_R47 }),
      Object.freeze({ clause: 'K05-DSC-d', assertion: 'A-K05-c-one-effectuation-point-for-decision-and-ledger',
        contract: 'RSB-01', contract_version: VERSION_R47 }),
    ]),
  }),
  Object.freeze({
    // SGR-01 (R51/F51-01) — A JOG MEGADÁSA ÉS MEGVONÁSA UGYANAZON A KÉT IDŐ-TENGELYEN. A külső
    // ellenőrző fél lelete: az R49-es megvonás EGYETLEN időpontot írt a megadás sorába, tehát egy
    // később rögzített, visszamenőleges hatályú megvonás ÁTÍRTA a korábbi tudásállapotot is. A
    // megadás bitemporális volt, a megvonás nem — a fegyelem FELE nem fegyelem (KUKA-129).
    id: 'P-DSC-scope-grant-history', assertion: 'K05c-scope-grant-and-revocation-share-one-bitemporal-line',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-retroactive-revocation-does-not-rewrite-earlier-knowledge',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-scheduled-future-revocation-does-not-close-before-its-effect',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-re-grant-reopens-and-the-gap-day-stays-closed',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-revocation-touches-only-its-own-subject-book-and-scope',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-K05-c-invalid-revocation-time-is-a-named-write-free-refusal',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
      Object.freeze({ clause: 'K05-DSC-d', assertion: 'A-K05-c-grant-release-ledger-revocation-chain-turns-on-the-release-time-boundary',
        contract: 'SGR-01', contract_version: VERSION_R51 }),
    ]),
  }),
  Object.freeze({
    // CORE-UX-01 (R63) — AZ ELSŐ FELHASZNÁLÓI FOLYAMAT A MAG SZINTJÉN: saját indulás verziózott
    // alappal (WSP-01), a meghívó alapja a továbbadható jogból (DLG-01), explicit adatköri jog,
    // megvonás továbbgyűrűzése, a helyi admin ≠ platformbíráló, névtér és előfizetés külön tény.
    // A (f) állítás az ORG-N1a alá van kötve, mert azt méri, hogy az AZONOSÍTÓ és az ELŐFIZETÉS
    // NEM felhatalmazási alap — jogot egyik sem ad; a kötést ez a megjegyzés mondja ki (KUKA-087).
    id: 'P-CORE-startup-and-delegation', assertion: 'CORE-UX-1-the-first-user-flow-holds-on-the-core-writers',
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-CORE-own-workspace-starts-with-a-versioned-basis-and-proven-channel',
        contract: 'WSP-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-CORE-invite-basis-is-derived-from-the-delegable-right-and-capped',
        contract: 'DLG-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-CORE-membership-does-not-release-data-until-a-scope-is-explicitly-granted',
        contract: 'DLG-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-CORE-revocation-closes-the-member-and-their-pending-invites-but-not-others',
        contract: 'DLG-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-CORE-self-appointment-as-reviewer-is-refused-and-local-admin-is-not-platform-reviewer',
        contract: 'WSP-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-CORE-identifier-namespace-and-entitlement-give-no-right-and-are-separate-facts',
        contract: 'XID-01', contract_version: VERSION_R63 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-CORE-raw-rewrite-of-the-transferred-limit-is-blocked-from-any-connection',
        contract: 'BLI-01', contract_version: VERSION_R63 }),
    ]),
  }),
  Object.freeze({
    // ABL-01 (R53) — AZ ORG-N1b A BÍRÁLATI ÚTON. A külső fél mérte, és a saját fánkon
    // megismételtük: egy CSAK `invite_issue`-ra szóló határozattal `adjudicate` hatáskört lehetett
    // ADNI és HASZNÁLNI. A korlát ott állt az adatbázisban, és senki nem kérdezte meg (KUKA-126).
    id: 'P-ORG-adjudication-basis-limit', assertion: 'ORGN1b-declared-basis-limits-the-adjudication-path',
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-declared-basis-gates-the-authority-grant',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-permitted-operation-is-granted-and-usable',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-each-adjudication-operation-is-its-own-limit',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-narrowed-basis-closes-an-already-granted-authority',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-widened-basis-does-not-broaden-an-already-granted-authority',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-every-missing-or-invalid-basis-shape-is-a-named-refusal',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-the-limit-holds-on-the-real-entry-points',
        contract: 'ABL-01', contract_version: VERSION_R53 }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1b-authority-without-recorded-basis-is-named-and-closed',
        contract: 'ABL-01', contract_version: VERSION_R63 }),
      // R55/F55-01 — a HIÁNYZÓ megadáskori verzió a VALÓDI utakon is zár, hatás és írás nélkül.
      Object.freeze({ clause: 'ORG-N1b', assertion: 'A-ORG-N1b-missing-granted-version-closes-the-use-on-the-real-paths',
        contract: 'ABL-01', contract_version: VERSION_R55 }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-result-scope', assertion: 'REVN5-result-scope-is-declared-not-claimed',
    // R77/F02. A `data_scope` tiltás egy CÍMKÉRE hatott, amit a kérés hozott magával: az `arak`-ra
    // tiltott olvasó `dataScope: 'keszlet'` kontextussal EGÉSZBEN megkapta a `{qty, unit_price}`
    // eredményt. A javítás (DSC-01) a KIADANDÓ TARTALOM adatköreit méri a TÍPUS deklarációjából, és
    // a vegyes eredményt egészben tagadja meg; a hiányzó besorolás KÜLÖN, fail-closed válasz.
    //
    // R10-F05 — A KLAUZULA-KÖTÉS VISSZAVONVA, MERT ROSSZ VOLT (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL).
    // Ez a két állítás az ORG-N1b-n ült. Az ORG-N1b szövege viszont a FELHATALMAZÁS korlátjáról szól
    // („a felhatalmazás nem lehet tágabb, mint az alapja"), ez a két állítás pedig a KIADOTT EREDMÉNY
    // besorolásáról — két különböző tárgy, közös szóval („adatkör"). A REV-N5b → ORG-N1b átnevezés
    // ezért nem volt érdemi megfelelés, csak a szám cseréje (KUKA-087: a megfeleltetés a TARTALOMBÓL
    // jöjjön, ne a sorszámból).
    //
    // MÉRVE: a mai regiszterben ÖT klauzula érinti a K05-öt (REV-N3b/c/d/e · ORG-N1b), és EGYIK SEM
    // mondja ki a kiadási osztályozó tényét. A helyes válasz tehát nem egy másik klauzulára tenni
    // őket, és nem is egy klauzulát KITALÁLNI ide — a normaregiszter TÁRGYALT, közös alap —, hanem
    // NEVEZETT HIÁNYKÉNT kimondani (OB-8), az állításokat pedig MODUL-SZERZŐDÉSként megtartani:
    // a DSC-01-et továbbra is bizonyítják, csak nem állítanak valótlant egy normáról (KUKA-124/2).
    // R35 — A KÖTÉS A HELYÉRE KERÜLT. Az OB-8 pontosan azt kérte, hogy a K05 alá kimondott, atomi
    // klauzula szülessen, és a NÉGY meglévő állítás ARRA kerüljön vissza — ugyanazokkal a próbákkal
    // és mutációkkal. A klauzula-szövegeket az R35 fogadta el; a kötés a szerződés VERZIÓJÁHOZ szól,
    // nem a névhez (R55/F04). Új tesztet a klauzulák SZÁMÁHOZ nem gyártottunk (R35 kikötése): a
    // meglévő bizonyítékot TARTALMILAG vetettük össze.
    discharges: Object.freeze([
      // aOk (ár nem megy ki más címkével) · bOk (vegyes EGÉSZBEN megtagadva) · dOk (ellenpár) ·
      // fOk (a feloldó HÍVVA, zárt halmaz mindkét irányban) — a deklarációból, nem a kérő címkéjéből.
      Object.freeze({ clause: 'K05-DSC-a', assertion: 'A-ORG-N1b-result-scope-comes-from-declaration',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      // ugyanaz az állítás a „vegyes eredmény egészben megtagadva · készletjog nem ad ármezőt" felére
      Object.freeze({ clause: 'K05-DSC-c', assertion: 'A-ORG-N1b-mixed-result-is-refused-as-a-whole',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      // eOk (nevezett, fail-closed elutasítás, és a hatás sem jön létre) · cOk (a nemleges válasz
      // BÁJTRA azonos a nem létezőével — a létezés-határ nem sérül)
      Object.freeze({ clause: 'K05-DSC-b', assertion: 'A-ORG-N1b-undeclared-result-scope-is-fail-closed',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
    ]),
    module_contract: Object.freeze({ id: 'DSC-01', rule: 'K05', closes: 'OB-8' }),
    module_asserts: Object.freeze([
      'A-ORG-N1b-result-scope-comes-from-declaration',
      'A-ORG-N1b-undeclared-result-scope-is-fail-closed',
      'A-ORG-N1b-mixed-result-is-refused-as-a-whole',
    ]),
  }),
  Object.freeze({
    id: 'P-REV-result-shape', assertion: 'REVN5-nested-result-shape-is-declared',
    // R79/F01. Az R77-es javításom LAPOS mezőnév-listát deklarált, ezért a `{lines:[{qty,unit_price}]}`
    // eredményben a `lines` mező SAJÁT címkéje (`keszlet`) fedte az EGÉSZ részfát: a beágyazott ár
    // kiment az `arak`-ra tiltott olvasónak. A javítás (DSC-01 v2) SÉMÁT deklarál — a levelek
    // hordozzák a típust ÉS az adatkört —, és a besorolás a VALIDÁLT alakból gyűlik, mélységben.
    // A mérce nem a mezőnév: ugyanaz a név más típus más pozícióján mást jelenthet (KUKA-002).
    // R10-F05 — ugyanaz a visszavonás, ugyanabból az okból (lásd a P-REV-result-scope bejegyzését).
    // R35 — a K05-DSC-b MÉLYSÉG-fele: a besorolás a beágyazott alakra és a tömb ELEMEIRE is szól.
    discharges: Object.freeze([
      Object.freeze({ clause: 'K05-DSC-b', assertion: 'A-ORG-N1b-nested-result-scope-is-measured',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K05-DSC-b', assertion: 'A-ORG-N1b-result-shape-is-declared-and-typed',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
    ]),
    module_contract: Object.freeze({ id: 'DSC-01', rule: 'K05', closes: 'OB-8' }),
    module_asserts: Object.freeze([
      'A-ORG-N1b-nested-result-scope-is-measured',
      'A-ORG-N1b-result-shape-is-declared-and-typed',
    ]),
  }),
  Object.freeze({
    id: 'P-CMD-effectuation', assertion: 'REVN3-command-write-uses-the-effectuation-point',
    // R79/F02. Az R77-es EFF-01 a HATÁSKÖRI írókat kötötte be; a parancs-író kimaradt, és HÁROM
    // külön óraolvasáson állt (jog · `finalized_at` · nyugta). A javítás az `effectuateWith`: a
    // hatályosulás mechanikája KÖZÖS, a jog-feloldó INJEKTÁLT (az `authority.mjs` nem húzhatja be
    // az `authz.mjs`-t — kör lenne), és a `basis: 'membership'` KIMONDJA, hogy ez TAGSÁGI jog, nem
    // hatásköri (KUKA-062: a jog-alapot nevezni kell).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-command-effect-time-is-the-decision-time' }),
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-command-refusal-is-neutral-and-inert' }),
    ]),
  }),
  Object.freeze({
    id: 'P-CMD-release-effectuation', assertion: 'REVN3-data-release-uses-the-effectuation-point',
    // R81/F04. Az R79-ben a PARANCSÍRÁST kötöttük egyetlen hatályosulási ponthoz, az ADATKIADÁST
    // nem: a `readCommandResult` úton a jelölt-szűrés, a bebocsátás, a tranzakción belüli jog-kapu,
    // az ADATKÖR-kapu és a leltár-sor MIND külön `clock.now()`-t olvasott. Mérve (a külső fél):
    // a tagság 08:00:01-kor megszűnik, az első három olvasás 08:00:00, a negyedik 08:00:02 ⇒ az
    // eredmény KIMEGY, és a leltár-sor olyan időpontot visel, amelyen a jog már nem állt fenn.
    // A javítás ugyanaz az `effectuateWith` szerkezet, `basis: 'membership'` alappal — és a
    // tranzakción belül olvasott `at` vezetve végig MINDHÁROM fogyasztón (jog · adatkör · leltár).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-release-time-is-the-decision-time' }),
      Object.freeze({ clause: 'REV-N3a', assertion: 'A-REV-N3a-release-refusal-is-neutral-and-inert' }),
      // K05-DSC-d KIEGÉSZÍTŐ KÖTÉSE (R37, a külső fél kikötése). Az R35-ben a klauzulát EGYETLEN
      // állításra kötöttük (`A-A08-revoked-right-blocks-replay-and-reread` @ P-A08), és a külső fél
      // tartalmi döntése ezt pontosította: a P-A08 ÖNMAGÁBAN a HATÁLYOSULÁSI VERSENYT nem fedi — a
      // klauzula HÁROM próba EGYÜTTESÉN áll. Ez a sor a hiányzó harmadik fél: a kiadás ideje a
      // DÖNTÉS ideje, egyetlen hatályosulási ponton (KUKA-024: a viszonyt kell mérni, nem az oldalakat).
      Object.freeze({ clause: 'K05-DSC-d', assertion: 'A-K05-DSC-d-release-stands-on-one-effectuation-point',
        contract: 'DSC-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/külső tartalmi döntés' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-entry-points', assertion: 'REVN5-every-writer-entry-point-is-measured',
    // R79/F03. A `revokeMembership` hívta a hatáskör-ellenőrzést, de a hiteles kontextust nem vitte
    // át: a hitelesítő-alapú tiltás ezen az ÍRÓ úton nem hatott. A javítás mellé a mérés hatóköre
    // SZABÁLY lett, nem lista (KUKA-051): az ENT-01 regiszter MINDEN író belépési pontot felsorol,
    // a tengelyeket a tiltás-fajták ZÁRT halmazából SZÁRMAZTATJUK, és minden cella VALÓDI futás,
    // padlóval. A semleges utak (R67/F02) válaszát BÁJTRA hasonlítjuk (KUKA-084).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-every-writer-entry-point-carries-context' }),
      Object.freeze({ clause: 'REV-N5a', assertion: 'A-REV-N5a-neutral-entry-point-answers-are-indistinguishable' }),
    ]),
  }),

  // ═══ MCS-2 — AZ ELSŐ D-FOLYAMAT (KAT-01 · KSZ-01 · BEM-01 · MNY-01) ══════════════════════════
  //
  // A HÁROM PRÓBA a MEGÉPÍTETT modulok szerződését méri, nem a szándékot. A K10 („Típus,
  // normalizálás és számítási profil") eddig egyetlen klauzula alatt sem állt — az R8-F01-ben ezt
  // NEVEZETT HIÁNYKÉNT mondtuk ki; az MCS-2 mennyiség-szerződése az, ami betölti. A klauzula-kötés
  // ezért ITT MÉG NEM születik meg: a norma-lánc klauzulái a REV/ORG rész-indexhez tartoznak, és a
  // MCS-2 saját klauzulái az MCS-3-mal jönnek. Ezt KIMONDJUK, nem hallgatjuk el (KUKA-124/2):
  // a `discharges` SZÁNDÉKOSAN ÜRES — a próba a modul-szerződést bizonyítja, nem norma-sort old.
  Object.freeze({
    id: 'P-KAT-item-identity', assertion: 'KAT01-item-identity-is-internal-and-book-scoped',
    discharges: Object.freeze([]),
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-KAT-sku-is-unique-within-the-book',
        contract: 'KAT-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-KAT-same-sku-in-another-book-is-a-different-item',
        contract: 'KAT-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-KAT-sku-lookup-requires-the-book',
        contract: 'KAT-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
    ]),
    module_contract: Object.freeze({ id: 'KAT-01', rule: 'K10', closes: 'OB-9' }),
    module_asserts: Object.freeze([
      'A-KAT-sku-is-unique-within-the-book',
      'A-KAT-same-sku-in-another-book-is-a-different-item',
      'A-KAT-sku-lookup-requires-the-book',
      'A-KAT-unit-change-is-free-on-zero-footprint',
    ]),
  }),
  Object.freeze({
    id: 'P-KSZ-ledger-truth', assertion: 'KSZ01-ledger-is-the-truth-and-writes-are-atomic',
    discharges: Object.freeze([
      // A KÉT IDŐ-TENGELY nézetei a saját deklarált tengelyükön szűrnek (K10-TYP-e első fele). A
      // MEGFIGYELÉSI idő NINCS a magban — az a klauzula kimondott maradéka (K0/D1).
      //
      // A SÉMAVERZIÓ A KANONIKUS ÚTON (SVR-01 · R39). A külső fél lelete: a `validateInput` külön
      // hívva elutasította a rossz verziót, a BEVÉT-út viszont át sem vette az argumentumot — tehát
      // a jelentés elutasítást ígért ott, ahol a rendszer NÉMÁN eldobott egy értéket (KUKA-080: egy
      // tény nem élhet két vezérlőn, ellentmondó válasszal). A sor a VALÓDI úton mér, és a HATÁST
      // is visszaolvassa: az elutasítás írás nélkül áll meg.
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-KSZ-schema-version-is-checked-on-the-canonical-path-without-writing',
        contract: 'KSZ-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01' }),
    ]),
    module_contract: Object.freeze({ id: 'KSZ-01', rule: 'K10', closes: 'OB-9' }),
    // Az R10 HÁROM lelete után a KSZ-01 állítás-listája ÚJRA ÍRÓDOTT, nem bővült. A régi nevek egy
    // olyan világot írtak le, amiben a nyers mozgás-író NYILVÁNOS belépési pont volt: az „árva
    // mozgás" és a „hiányzó nyugta" a HÍVÓ hibája lehetett. Ma ezt a két tényt a TÁROLÓ ŐRZI, a
    // megkerülő út pedig nem létezik — tehát a mérésnek is mást kell állítania, nem ugyanazt más
    // szavakkal (KUKA-045: a szabályt mérjük, ne a régi darabszámot).
    module_asserts: Object.freeze([
      'A-KSZ-no-raw-writer-bypasses-the-command-path',
      'A-KSZ-receipt-writes-command-receipt-and-movement-together',
      'A-KSZ-replay-does-not-book-twice',
      'A-KSZ-same-key-other-scope-is-a-conflict',
      'A-KSZ-item-of-another-book-is-refused-without-writing',
      'A-KSZ-two-time-views-filter-on-their-declared-axes',
      'A-KSZ-sum-limit-rolls-back-command-receipt-and-movement',
      'A-KSZ-backdating-cannot-bypass-the-sum-limit',
      // A séma fejlécének ÁLLÍTÁSA mostantól MÉRVE van, nem csak leírva (KUKA-050 · KUKA-004).
      'A-KSZ-the-store-itself-enforces-append-only-and-the-command-binding',
    ]),
  }),
  Object.freeze({
    id: 'P-BEM-input-schema', assertion: 'BEM01-input-shape-is-declared-and-fail-closed',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-unknown-operation-is-fail-closed',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-unknown-field-decides-before-missing-field',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-missing-required-field-is-its-own-answer',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-type-is-checked-on-the-raw-value',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP' }),
      // R37/F37-02 — a ZÁRT REGISZTER és a SÉMAVERZIÓ HATÁRA saját néven. Az elsőt a külső fél
      // lelete hozta (örökölt tulajdonság-név ⇒ nyers kivétel), a másodikat a kért kimondás: a
      // verziót a REGISZTER választja, a beadó legfeljebb megerősít (SVR-01).
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-inherited-property-name-is-not-an-operation',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01' }),
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-BEM-schema-version-is-owned-by-the-register-not-the-submitter',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01' }),
      // A TESTVÉR-ÁG (CLR-01, R37): a zárt regiszter szabálya nem egy fájl tulajdonsága. A mérés
      // MINDHÁROM regisztert bejárja (mennyiség-profil · korlát-szerződés · főkönyvi nézet), és a
      // JOGOS nevet is megköveteli — a szigorítás nem törheti el a valódi használatot (KUKA-039).
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-CLR-every-closed-registry-refuses-inherited-names',
        contract: 'BEM-01', contract_version: 'R32/K01-K16 + R35/K05-DSC+K10-TYP + R37/SVR-01' }),
      // A MENNYISÉG KANONIKUS ALAKJA (MNY-01) a BEM-01 határán mérve — a K10-TYP-c ELSŐ fele. A
      // profilváltás és a korábbi tárolt érték viszonya NINCS mérve: az a klauzula kimondott maradéka.
      // A NAPTÁRI PILLANAT érvényessége az idő-fogalom része (K10-TYP-e első fele).
    ]),
    module_contract: Object.freeze({ id: 'BEM-01', rule: 'K10', closes: 'OB-9' }),
    module_asserts: Object.freeze([
      'A-BEM-unknown-operation-is-fail-closed',
      'A-BEM-unknown-field-decides-before-missing-field',
      'A-BEM-missing-required-field-is-its-own-answer',
      'A-BEM-type-is-checked-on-the-raw-value',
      'A-BEM-quantity-error-order-survives-the-boundary',
      'A-BEM-valid-input-normalizes-to-canonical-decimal-text',
      // R10-F03: az időpont VALÓDISÁGA és kanonikus alakja · a kontextus-mező nevezett elutasítása.
      'A-BEM-nonexistent-calendar-instant-is-refused-and-canonicalized',
      'A-BEM-context-field-in-the-body-is-a-named-refusal',
      // A mennyiség KÉT SZAKASZA: a határ profil-független, a jelentés a CIKK profiljáé.
      'A-BEM-quantity-profile-is-bound-where-the-item-is-known',
    ]),
  }),
  // ── R43 — A K10 KÖVETELMÉNYEK BIZONYÍTÁSA A MEGLÉVŐ REFERENCIÁN ──────────────────────────────
  // A külső ellenőrző fél (chatgpt-v3, R43) az összesítő javítását lezárta, és a MŰKÖDÉS mérését
  // kérte. MÉRVE: mind a négy klauzula viselkedése HELYES volt — a hiány a BIZONYÍTÉKBAN állt, nem
  // a rendszerben. Ez a négy próba ezért nem javít, hanem BEKÖT: minden normatív részhez saját
  // nevű állítás és saját mutáció tartozik.
  Object.freeze({
    id: 'P-KAT-identity-history', assertion: 'K10a-identity-is-not-display-or-quantity',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-K10-a-quantity-change-does-not-move-identity',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-K10-a-same-sku-in-another-book-stays-a-different-item',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-K10-a-formatting-is-not-identity',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-a', assertion: 'A-K10-a-printed-property-change-does-not-rewrite-the-identifier',
        contract_version: VERSION_R43 }),
    ]),
  }),
  Object.freeze({
    id: 'P-KSZ-canonical-input-boundary', assertion: 'K10b-input-errors-on-the-canonical-path',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-K10-b-input-errors-are-named-on-the-canonical-path-without-writing',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-b', assertion: 'A-K10-b-version-boundary-and-the-legitimate-receipt-coexist',
        contract_version: VERSION_R43 }),
    ]),
  }),
  Object.freeze({
    id: 'P-MNY-stored-profile-history', assertion: 'K10c-stored-quantity-keeps-its-own-profile',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-c', assertion: 'A-K10-c-stored-row-carries-its-own-profile',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-c', assertion: 'A-K10-c-no-public-profile-change-operation-exists',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-c', assertion: 'A-K10-c-mismatched-profile-is-a-named-refusal-not-a-reinterpretation',
        contract_version: VERSION_R43 }),
    ]),
  }),
  Object.freeze({
    id: 'P-KSZ-repeat-and-error-boundary', assertion: 'K10d-repeat-and-error-boundary',
    discharges: Object.freeze([
      Object.freeze({ clause: 'K10-TYP-d', assertion: 'A-K10-d-first-submission-creates-exactly-one-effect',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-d', assertion: 'A-K10-d-identical-and-reformatted-repeat-replay-the-same-effect',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-d', assertion: 'A-K10-d-old-version-other-profile-and-error-point-are-named-refusals',
        contract_version: VERSION_R43 }),
      Object.freeze({ clause: 'K10-TYP-d', assertion: 'A-K10-d-refusals-leave-the-snapshot-and-the-earlier-success-intact',
        contract_version: VERSION_R43 }),
      // R45/F45-02 — A HATÁS VÉGREHAJTÁSA KÖZBEN fellépő hiba: a bemeneti plafon a tranzakcióba be
      // sem lép, tehát a részleges írás visszagörgetéséről nem mond semmit (a külső fél lelete).
      Object.freeze({ clause: 'K10-TYP-d', assertion: 'A-K10-d-effect-time-failure-leaves-no-partial-write',
        contract_version: VERSION_R45 }),
    ]),
  }),
  Object.freeze({
    // AUT-01 (R16/F16-01) — A HOZZÁFÉRÉSI KAPU. A külső fél mérése szerint a bevét-út a CIKKET a
    // jogosultsági döntés ELŐTT oldotta fel, ezért a tiltott hívó a HIBAKÓD különbségéből megtudta,
    // létezik-e az objektum és melyik könyvben. A javítás a kaput a lánc elejére tette, a kifelé
    // menő választ EGYFORMÁVÁ, a valódi okot pedig BELSŐ, tartós sorrá.
    //
    // A NORMA-KÖTÉS UGYANARRA A HIÁNYRA MUTAT, MINT A KIADÁSI OSZTÁLYOZÓ (OB-8). Az elutasítás
    // ugyanis KIADÁS: azt dönti el, mit tudhat meg a kérő a védett tényről. A K05-nek ma NINCS
    // klauzulája a rész-indexben, tehát ezek az állítások MODUL-SZERZŐDÉSKÉNT állnak — klauzulát
    // ide kitalálni nem szabad (R10-F05 lecke).
    id: 'P-AUT-object-neutral', assertion: 'AUT01-authorization-decides-before-object-resolution',
    discharges: Object.freeze([]),
    module_contract: Object.freeze({ id: 'AUT-01', rule: 'K05', gap: 'OB-8' }),
    module_asserts: Object.freeze([
      'A-AUT-unauthorized-cannot-distinguish-object-classes',
      'A-AUT-refusal-leaves-no-command-receipt-or-movement',
      'A-AUT-authorized-caller-keeps-detailed-diagnostics',
      'A-AUT-true-reason-is-kept-inside-and-named',
      'A-AUT-schema-outcome-does-not-leak-to-the-unauthorized',
      'A-AUT-command-path-and-receipt-path-refuse-alike',
    ]),
  }),
]);

export const EXPECTED_IDS = Object.freeze(EXPECTED_PROBES.map((p) => p.id));

/** Az állítás azonosítója egy próbához — a mutáció-szerződés ehhez méri, mi bukott el. */
export function assertionOf(probeId) {
  const p = EXPECTED_PROBES.find((x) => x.id === probeId);
  return p ? p.assertion : null;
}

/**
 * A KIMENETI ÁLLAPOTOK ZÁRT HALMAZA (R45 §„Javítási szerződés" 3. pont — típusos kimenetek).
 *
 * A régi alak EGYETLEN megkülönböztetést ismert: `PASS` vagy „nem PASS". Emiatt a `SKIP` és az
 * idegen kivétel is „bukott állításnak" számított (H03 · H06). Innentől mind külön név, és a
 * mutációs ítélet CSAK a `FAIL`-t fogadja el bizonyítéknak — a `THREW` is csak akkor, ha a
 * mutáció szerződése ELŐRE, hibakóddal és fázissal együtt kimondta.
 */
export const PROBE_STATUS = Object.freeze({
  PASS: 'PASS',                 // az állítás teljesült
  FAIL: 'FAIL',                 // a NEVEZETT állítás megbukott — ez a szabályos bizonyíték
  THREW: 'THREW',               // a próbán BELÜL kivétel keletkezett (hibakód + fázis kötelező)
  SKIP: 'SKIP',                 // a próba szándékosan kimaradt — NEM bukott állítás
  NOT_STARTED: 'NOT_STARTED',   // el sem indult — NEM bukott állítás
});

export const KNOWN_STATUSES = Object.freeze(Object.values(PROBE_STATUS));

/**
 * A KÉSZLET ELLENŐRZÉSE — a mérő EZT hívja, nem másolja le a szabályt (KUKA-009).
 * Mindkét irányban mér: hiányzó · ismétlődő · ISMERETLEN azonosító, és ismeretlen állapot.
 *
 * @param {Array<{probe_id:string,status:string}>} records
 * @returns {{ok:boolean, problems:string[]}}
 */
export function checkResultSet(records) {
  const problems = [];
  if (!Array.isArray(records)) return { ok: false, problems: ['a rekordok nem tömbben érkeztek'] };

  const seen = new Map();
  for (const r of records) {
    const id = r && r.probe_id;
    if (typeof id !== 'string' || !id) { problems.push('rekord azonosító nélkül'); continue; }
    seen.set(id, (seen.get(id) || 0) + 1);
  }

  const missing = EXPECTED_IDS.filter((id) => !seen.has(id));
  if (missing.length) problems.push(`HIÁNYZÓ tervezett próba: ${missing.join(', ')}`);

  const dup = [...seen.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);
  if (dup.length) problems.push(`ISMÉTLŐDŐ rekord: ${dup.join(', ')}`);

  const unknown = [...seen.keys()].filter((id) => !EXPECTED_IDS.includes(id));
  if (unknown.length) problems.push(`ISMERETLEN próba a kimenetben: ${unknown.join(', ')}`);

  for (const r of records) {
    if (!r || !KNOWN_STATUSES.includes(r.status)) {
      problems.push(`ismeretlen állapot a(z) ${(r && r.probe_id) || '?'} rekordon: ${JSON.stringify(r && r.status)}`);
    }
    if (r && r.status === PROBE_STATUS.FAIL && !r.assertion_id) {
      problems.push(`a(z) ${r.probe_id} FAIL rekordján nincs állítás-azonosító (assertion_id)`);
    }
    if (r && r.status === PROBE_STATUS.THREW && (!r.error_code || !r.phase)) {
      problems.push(`a(z) ${r.probe_id} THREW rekordjáról hiányzik a hibakód vagy a fázis`);
    }
  }

  return { ok: problems.length === 0, problems };
}

// ── A MANIFEST SAJÁT LENYOMATA (R57/F03) ────────────────────────────────────────────────────────
// A tartalmi jóváhagyás ehhez is kötődik: ha a PRÓBA-KÉSZLET vagy a beváltás-deklaráció változik,
// a rá épült review elavul. Enélkül egy néma manifest-átírás túlélné a jóváhagyást — és épp ezt
// kifogásolta a külső fél (R57/F03: „azok változása a mostani két hash alapján nem avultatná el").
import { createHash as __createHashForManifestDigest } from 'node:crypto';

export function manifestDigest() {
  const bytes = JSON.stringify({
    version: MANIFEST_VERSION,
    probes: EXPECTED_PROBES.map((p) => ({
      id: p.id,
      assertion: p.assertion ?? null,
      discharges: (p.discharges || []).map((d) => [d.clause, d.assertion]),
    })),
  });
  return `sha256:${__createHashForManifestDigest('sha256').update(bytes).digest('hex')}`;
}
