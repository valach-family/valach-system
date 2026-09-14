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
export const EXPECTED_PROBES = Object.freeze([
  Object.freeze({ id: 'P-A04', assertion: 'A04-two-worlds-byte-identical' }),
  Object.freeze({ id: 'P-A04b', assertion: 'A04b-mailbox-holder-gets-actionable-answer' }),
  Object.freeze({ id: 'P-K03-cred', assertion: 'K03-existing-credential-unchanged' }),
  Object.freeze({ id: 'P-K03-intent', assertion: 'K03-pending-intent-resumable' }),
  Object.freeze({ id: 'P-A08', assertion: 'A08-single-effect-and-today-right' }),
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
    // KIMONDOTT HATÁR: az ORG-N1b (a korlát KIKÉNYSZERÍTÉSE) NEM épült meg; a (d) állítás
    // épp azt méri, hogy ezt a rendszer ki is mondja magáról.
    discharges: Object.freeze([
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-basis-version-history-on-two-axes' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-grant-records-the-version-it-was-issued-under' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-expired-or-unknown-basis-is-named-and-closed' }),
      Object.freeze({ clause: 'ORG-N1a', assertion: 'A-ORG-N1a-limit-is-data-not-enforcement-and-says-so' }),
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
    id: 'P-REV-result-scope', assertion: 'REVN5-result-scope-is-declared-not-claimed',
    // R77/F02. A `data_scope` tiltás egy CÍMKÉRE hatott, amit a kérés hozott magával: az `arak`-ra
    // tiltott olvasó `dataScope: 'keszlet'` kontextussal EGÉSZBEN megkapta a `{qty, unit_price}`
    // eredményt. A javítás (DSC-01) a KIADANDÓ TARTALOM adatköreit méri a TÍPUS deklarációjából, és
    // a vegyes eredményt egészben tagadja meg; a hiányzó besorolás KÜLÖN, fail-closed válasz.
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-result-scope-comes-from-declaration' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-undeclared-result-scope-is-fail-closed' }),
    ]),
  }),
  Object.freeze({
    id: 'P-REV-result-shape', assertion: 'REVN5-nested-result-shape-is-declared',
    // R79/F01. Az R77-es javításom LAPOS mezőnév-listát deklarált, ezért a `{lines:[{qty,unit_price}]}`
    // eredményben a `lines` mező SAJÁT címkéje (`keszlet`) fedte az EGÉSZ részfát: a beágyazott ár
    // kiment az `arak`-ra tiltott olvasónak. A javítás (DSC-01 v2) SÉMÁT deklarál — a levelek
    // hordozzák a típust ÉS az adatkört —, és a besorolás a VALIDÁLT alakból gyűlik, mélységben.
    // A mérce nem a mezőnév: ugyanaz a név más típus más pozícióján mást jelenthet (KUKA-002).
    discharges: Object.freeze([
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-nested-result-scope-is-measured' }),
      Object.freeze({ clause: 'REV-N5b', assertion: 'A-REV-N5b-result-shape-is-declared-and-typed' }),
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
