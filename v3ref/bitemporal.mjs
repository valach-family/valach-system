/** BIT-01 — A KÉT IDŐ-TENGELY ÉS A FELÜLVIZSGÁLATI KÖR (REV-N2a · REV-N2b).
 *
 * MIÉRT ÉPP MOST. Az R53 §7 sorrendje szerint (REV-N3 → REV-N5 → REV-N2 → ORG-N1 → ORG-N3 →
 * REV-N4) a REV-N3 az R65-ben, a REV-N5 az R71-ben lezárult; a soron következő csomag a REV-N2,
 * és a külső fél (chatgpt-v3) az R83 §7-ben ismét ezt kérte: *„haladj a már kijelölt REV-N2a/b
 * core-munkával: pontos állítás, tiltott viselkedés, pozitív/negatív példa és géppel futtatható
 * bizonyíték."* A TERV a `NEXT_REQUIRED_EVIDENCE.order`-ben ÁLL, és ELŐBB állt, mint ez a kód —
 * ez szándékos: ha a mérce a megépült dologhoz igazodna, a próba a saját előfeltevését igazolná
 * vissza (KUKA-054).
 *
 * A HELYZET, EMBERI NYELVEN. Márciusban elfogadunk egy képviseleti alapot, és a rá épülő művelet
 * lefut. Júniusban bizonyíték érkezik, hogy az alap MÁR MÁRCIUSBAN érvénytelen volt. Ekkor KÉT
 * kérdés van, és MINDKETTŐRE IGAZ, KÜLÖNBÖZŐ válasz jár:
 *
 *   „március, ahogy MÁRCIUSBAN tudtuk"  → a művelet jogos volt (a rendszer nem hazudhat a múltról)
 *   „március, ahogy MA tudjuk"          → az alap érvénytelen volt (a mai tudás sem hallgatható el)
 *
 * A RÉGI MODELL EZT NEM TUDTA, ÉS A HIÁNY NEVEZETT VOLT. A `membership.revoked_at` EGYETLEN
 * időpont: „mikortól nincs joga". Ebbe a két tengely nem fér bele — ez a KUKA-002 alakja a
 * megvonáson (két független tény egy oszlopon). A `membership_revocation` napló `recorded_at` és
 * `effective_at` oszlopa MEGVOLT, de MINDEN író a MOSTot írta mindkettőbe, és egyetlen OLVASÓ sem
 * kérdezte a `recorded_at`-ot — vagyis a mező DÍSZ volt (KUKA-126: amit a küldő kiír és a fogadó
 * nem kérdez meg, az nem kötés).
 *
 * A MEGOLDÁS ALAKJA.
 *
 *   (1) `membershipAsOf({validAt, knownAt})` — EGY feloldó, KÉT bemenettel. A `validAt` a kérdezett
 *       nap JOGA, a `knownAt` a TUDÁS állapota. A válasz mindig a NAPLÓBÓL születik, és a naplót
 *       SOHA nem írjuk át (REV-N1b: a múlt tartalma sértetlen).
 *
 *   (2) `recordRetroactiveInvalidity(...)` — ÚJ ESEMÉNY-FAJTA: múltbeli hatály + mai rögzítés. Nem
 *       „javítjuk" a márciusi sort: ÚJ sort írunk, ami megmondja, mit tudunk MA, és MIRE
 *       vonatkozik. A hatáskör ugyanaz, mint a megvonásé (`alter_right`), és ugyanazon az EGYETLEN
 *       hatályosulási ponton megy át (EFF-01) — a döntés és az írás EGY időpontot lát (KUKA-139).
 *
 *   (3) `reviewCircleFor(...)` + `openReviewCircle(...)` + `closeReviewCircle(...)` — a
 *       felülvizsgálati kör. A tagsága SZÁMÍTOTT (a két tengely különbségéből), nem kézzel
 *       felsorolt; az érintett műveletek rekordjához NEM nyúlunk; a kör LEZÁRÁSA külön,
 *       hatáskörhöz kötött esemény.
 *
 * AMIT EZ A MODUL NEM ÁLLÍT. A visszamenőleges érvénytelenség nem törli a megtörtént hatásokat, és
 * nem ad jogot a múlt átírására — a kör épp azért van, hogy az érintett műveletek EMBERI döntésre
 * várjanak. A „mit kezdjünk velük" kérdés üzleti, nem gépi (K08/K09), és a kör lezárása ezt a
 * döntést RÖGZÍTI, nem helyettesíti.
 */
import { instantMs } from './store.mjs';
import { effectuate } from './authority.mjs';

/** A visszamenőleges helyesbítés NEVE a megvonás-naplóban — egy helyen, hogy író és olvasó
 *  ne tudjon elcsúszni (KUKA-018). */
export const RETROACTIVE_TRANSITION = 'retroactive_invalidity';

/** A kör állapotai — zárt készlet (KUKA-020: az ismeretlen állapot nem „valami más"). */
export const REVIEW_CIRCLE_STATES = Object.freeze(['open', 'closed']);

const frozen = (o) => Object.freeze(o);

/**
 * REV-N2a — A TAGSÁG ÁLLAPOTA KÉT TENGELYEN.
 *
 * @param validAt  MELYIK NAP jogát kérdezzük (a HATÁLY tengelye)
 * @param knownAt  MILYEN TUDÁSSAL kérdezzük (a RÖGZÍTÉS tengelye) — ami ennél később került a
 *                 naplóba, azt ez a válasz MÉG NEM ISMERI
 * @returns {{effective:boolean, reason:string, valid_at:string, known_at:string,
 *            effective_at:string|null, recorded_at:string|null, applied:Array}}
 *
 * A HIÁNYZÓ ÉS A ROSSZ IDŐPONT KÜLÖN VÁLASZ, és MINDKETTŐ ZÁR (fail-closed): ha nem tudjuk, MIKORT
 * kérdeznek, nem állíthatjuk, hogy jogos volt (KUKA-124/2 · KUKA-012).
 */
export function membershipAsOf({ store, subjectId, bookId, validAt, knownAt }) {
  const valid = instantMs(validAt);
  const known = instantMs(knownAt);
  if (!valid.ok) return frozen({ effective: false, reason: `valid_at_${valid.reason}`, valid_at: validAt ?? null, known_at: knownAt ?? null, effective_at: null, recorded_at: null, applied: [] });
  if (!known.ok) return frozen({ effective: false, reason: `known_at_${known.reason}`, valid_at: validAt, known_at: knownAt ?? null, effective_at: null, recorded_at: null, applied: [] });

  const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
  const base = { valid_at: validAt, known_at: knownAt, effective_at: null, recorded_at: null, applied: [] };
  if (!m) return frozen({ ...base, effective: false, reason: 'no_membership' });

  // A TAGSÁGADÁS IS KÉT TENGELYEN ÁLL (R85/F01 — a külső fél ellenpéldája).
  //
  // A régi alak a megvonás-eseményekre KIÉPÍTETTE a két tengelyt, a tagságadásra NEM: csak a
  // hatályt mérte (`granted_at > validAt`). Következmény, adaton mérve: egy JÚNIUSI meghívó-
  // beváltás megváltoztatta a MÁRCIUSI tudás szerinti augusztusi képet — ugyanaz a történeti
  // kérdés két különböző választ adott aszerint, hogy mikor tettük fel. Ez a KUKA-039 „fél őr"
  // alakja: a szabály EGY ág feltételében állt, a testvér-ág nem tudott róla.
  //
  // A KÉT KÉRDÉS ITT IS KÜLÖN, ÉS A TUDÁS KAPUZ ELŐBB:
  //   `granted_recorded_at <= knownAt` — EKKOR MÁR TUDTUNK erről az alapról?
  //   `granted_at <= validAt`          — a KÉRDEZETT NAPRA hatályos-e már?
  const grant = grantAsOf({ store, subjectId, bookId, membershipRow: m, valid, known });
  if (!grant.effective) return frozen({ ...base, grant_axis: grant.axis, effective: false, reason: grant.reason });
  base.grant_axis = grant.axis;
  // A NAPLÓ NÉLKÜLI (vetített) soron NINCS esemény-azonosító — és ezt nem pótoljuk kitalált
  // értékkel: a hiány NEVEZETT marad (`null`), az olvasó pedig a `grant_axis`-ból tudja, miért.
  base.grant_event_id = grant.grant_event_id ?? null;
  // R132 — A MAI IDŐSZAK AZONOSÍTÓJA KÜLÖN NÉVEN IS. Ugyanaz az érték, mint a `grant_event_id`;
  // azért kap SAJÁT nevet, mert az R132 óta egy alanynak TÖBB tagsági időszaka lehet ugyanabban a
  // könyvben, és az adatkörjog ehhez az IDŐSZAKHOZ kötődik (SGR-01 `membership_grant_id`). Egy
  // mező két jelentéssel pontosan az a KUKA-002, amit a megvonásnál már egyszer kijavítottunk.
  base.period_grant_event_id = grant.grant_event_id ?? null;

  // A KÉT SZŰRŐ KÉT KÜLÖN KÉRDÉSRE FELEL, ÉS EGYIK SEM HELYETTESÍTI A MÁSIKAT:
  //   `recorded_at <= knownAt`   — ezt az eseményt EKKOR MÁR ISMERTÜK?
  //   `effective_at <= validAt`  — a KÉRDEZETT NAPRA vonatkozik-e a hatálya?
  // A kettő összevonása (bármelyik irányban) pontosan az a hiba, amit ez a klauzula tilt.
  const events = store.all(
    'SELECT * FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id',
    subjectId, bookId);
  // ═══ R132 — A MEGVONÁS A SAJÁT IDŐSZAKÁT ZÁRJA, NEM AZ ALANY EGÉSZ TÖRTÉNETÉT ═══════════════
  //
  // MI VOLT A HIÁNY. Az R132 előtt ez a hurok az alany MINDEN megvonás-eseményét a MAI kérdésre
  // alkalmazta. Egyetlen tagsági időszaknál ez helyes volt (a `membership` kulcsa alany × könyv,
  // tehát több időszak nem is létezhetett). Az R132 óta LÉTEZIK újbóli belépés — és a régi alak egy
  // ÚJ, szabályos tagságot a RÉGI megvonással zárt volna le: az újrahívott munkatárs elfogadás után
  // sem lett volna tag. Ez a KUKA-122 alakja (a kapu fallá válik) az ellenkező irányból.
  //
  // A SZŰRŐ A RÖGZÍTÉS TENGELYÉN ÁLL, NEM A HATÁLYON — és ez SZÁNDÉKOS. A visszamenőleges
  // érvénytelenség (REV-N2b) hatálya a MÚLTBAN van (március), a rögzítése MA (június): ha a
  // hatályt hasonlítanánk, egy ilyen esemény „korábbinak" látszana a tagságadásnál, és némán
  // kiesne — pontosan az a klauzula szűnne meg, amit az R83 épített. A „mikor tudtuk meg" tengely
  // viszont helyesen rendez: ami a mai időszak rögzítése ÓTA (vagy azzal egyszerre) került a
  // naplóba, az erre az időszakra szól.
  //
  // AZONOS RÖGZÍTÉSI IDŐ ⇒ A MEGVONÁS ALKALMAZÓDIK (fail-closed, KUKA-012). A valódi újrahívási
  // úton ez nem fordul elő: a művelet NEVEZETTEN elakad, ha a hatályosulási pontja nem KÉSŐBBI a
  // záró megvonásnál (`reentry_not_after_revocation`) — tehát a kétértelműséget nem a sorrend-
  // találgatás oldja meg, hanem egy kapu (KUKA-171: ami megállít, annak neve is legyen).
  const periodRecMs = grant.recorded_ms ?? null;
  const applied = [];
  const otherPeriod = [];
  for (const e of events) {
    const rec = instantMs(e.recorded_at);
    const eff = instantMs(e.effective_at);
    // Az OLVASHATATLAN naplósor nem néma kihagyás: ha egy esemény idejét nem tudjuk értelmezni,
    // az a beadvány hibája, és ZÁR — nem „valószínűleg nem érintett" (KUKA-020).
    if (!rec.ok || !eff.ok) {
      return frozen({ ...base, effective: false, reason: 'revocation_event_undecidable' });
    }
    if (rec.ms > known.ms) continue;     // ezt akkor még nem tudtuk
    if (eff.ms > valid.ms) continue;     // erre a napra még nem hatályos
    // KORÁBBI IDŐSZAK megvonása — a MAI időszakot nem zárja. A `null` (napló nélküli, vetített
    // sor) esetén NEM szűrünk: ott nincs mihez mérni, és a régi, engedőbb alak marad (a gyengébb
    // tanú tényét a `grant_axis` amúgy is kimondja — KUKA-127).
    if (periodRecMs !== null && rec.ms < periodRecMs) { otherPeriod.push(e); continue; }
    applied.push(e);
  }
  if (otherPeriod.length) {
    // A KORÁBBI IDŐSZAKOK ZÁRÁSA NEM TŰNIK EL A VÁLASZBÓL: aki a történetet kérdezi, LÁTJA, hogy
    // volt lezárt időszak — csak nem a MAI jogra alkalmazzuk (KUKA-049: a tényt nem hallgatjuk el).
    base.earlier_period_revocations = Object.freeze(otherPeriod.map((e) => frozen({
      id: e.id, recorded_at: e.recorded_at, effective_at: e.effective_at, transition: e.transition,
    })));
  }
  if (!applied.length) return frozen({ ...base, effective: true, reason: 'membership_effective' });

  // A LEGKORÁBBI HATÁLY DÖNT: ha több esemény is vonatkozik a napra, a tagság a legkorábbi hatályú
  // pillanattól nem áll — a későbbi esemény nem „javítja vissza" (a visszavonás visszavonása külön
  // esemény volna, és ez a mag ma nem ismer ilyet; a hiányt KIMONDJUK, nem hallgatjuk el).
  const first = applied.reduce((a, e) => (instantMs(e.effective_at).ms < instantMs(a.effective_at).ms ? e : a), applied[0]);
  return frozen({
    ...base,
    effective: false,
    reason: first.transition === RETROACTIVE_TRANSITION ? 'membership_retroactively_invalid' : 'membership_revoked',
    effective_at: first.effective_at,
    recorded_at: first.recorded_at,
    applied: applied.map((e) => frozen({ id: e.id, recorded_at: e.recorded_at, effective_at: e.effective_at, transition: e.transition })),
  });
}

/**
 * A TAGSÁGADÁS EGYETLEN ÍRÓJA (GRT-01) — R85/F01.
 *
 * MIÉRT KÖZÖS OTTHON. A két időt (hatály + rögzítés) EGYÜTT kell leírni, különben a következő
 * író az egyiket elhagyja, és a hiba némán visszajön (KUKA-129: a szabály ott teljesüljön, ahol
 * az érték SZÜLETIK). A mai tagságadásnál a két idő AZONOS — ezt az `at` alak biztosítja, és a
 * writer MEGŐRZI mindkettőt, nem vezeti le egyiket a másikból.
 *
 * A KÉT ÁLTALÁNOS ALAK, amit a séma megenged és a feloldó helyesen kezel:
 *   ELŐRE ISMERT, KÉSŐBB HATÁLYOS  — `recordedAt` március, `effectiveAt` augusztus
 *   UTÓLAG RÖGZÍTETT               — `effectiveAt` március, `recordedAt` június
 * A külső fél kimondta (R85 §3), hogy ezeket KÜLÖN kell tesztelni, amikor a writer támogatja
 * őket — ez a writer támogatja, és a próbák mindkét alakot viszik.
 *
 * A HIÁNY KÜLÖN VÁLASZ, ÉS ZÁR: idő nélkül nem írunk tagságot (KUKA-124/2).
 */
export function grantMembership({ store, subjectId, bookId, role, at, effectiveAt, recordedAt }) {
  const eff = effectiveAt ?? at;
  const rec = recordedAt ?? at;
  const e = instantMs(eff);
  const r = instantMs(rec);
  if (!e.ok) return frozen({ ok: false, reason: `granted_effective_at_${e.reason}` });
  if (!r.ok) return frozen({ ok: false, reason: `granted_recorded_at_${r.reason}` });
  if (typeof role !== 'string' || !role.trim()) return frozen({ ok: false, reason: 'role_required' });

  // A NAPLÓ AZ IGAZSÁG, A SOR A VETÜLET — ugyanaz a szerkezet, mint a megvonásnál.
  //
  // A KETTŐ EGY ÍRÁS (R88/F02 — a külső fél lelete). A régi alak az eseményt ÖNÁLLÓAN szúrta be, és
  // ha a vetület elbukott (egyediség), az esemény BENT MARADT: egy SIKERTELEN hívás így
  // megváltoztatta a történetet — a márciusi kérdésre előtte „nincs tagság", utána „van". A hiba a
  // két írás VISZONYÁBAN élt, nem egyikükben sem (KUKA-024), és a saját próbáim mind a SIKERES ágat
  // mérték, ezért zölden állt (KUKA-159 rokona: a bukó ág nem volt fixtúrában).
  //
  // A BEÁGYAZOTT HÍVÓ IS JOGOS: a meghívó-beváltás tranzakcióból hív minket, ezért `atomic` és nem
  // `tx` — különben a javítás a jogos utat törné el (KUKA-122).
  return store.atomic(() => {
    // ═══ A DÖNTÉST A SAJÁT ÍRÁSUNK ELŐTT MÉRJÜK — KÜLÖNBEN A HATÁS DÖNTI EL A DÖNTÉST ═══════════
    //
    // MÉRT LELET A SAJÁT ELSŐ ALAKOMON (R132, saját próba). Az első változatom a tagságadó ESEMÉNY
    // beszúrása UTÁN kérdezte meg a bitemporális állapotot. Ekkor a frissen beírt esemény MÁR a
    // legkésőbbi alkalmazható tagságadás volt, tehát a korábbi megvonás „előző időszakként" kiesett,
    // és a válasz `membership_effective` lett — vagyis a feloldó a SAJÁT írásunk hatását mérte, nem
    // a döntés előtti világot. Következmény: az újranyitási ág SOHA nem tüzelt, és a jogos beváltás
    // `UNIQUE constraint failed: membership.subject_id, membership.book_id`-del állt meg.
    //
    // A TANULSÁG ÁLTALÁNOS, ezért itt áll, nem egy kommentben a hívónál: ahol egy feltétel a VILÁG
    // ELŐZŐ állapotára szól, ott a mérésnek meg kell előznie a hatást — különben a hatás igazolja
    // vissza a feltételt (KUKA-033: a minősítés mérés, nem besorolás; KUKA-120: a próba a saját
    // versenyhelyzetét mérte).
    const existing = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
    const before = existing
      ? membershipAsOf({ store, subjectId, bookId, validAt: eff, knownAt: rec })
      : null;

    const res = store.run(
      'INSERT INTO membership_grant (subject_id, book_id, role, recorded_at, effective_at) VALUES (?,?,?,?,?)',
      subjectId, bookId, role, rec, eff);

    // ═══ R132 — ÚJ IDŐSZAK A LEZÁRT UTÁN: A VETÜLET FRISSÜL, A NAPLÓ NEM ÍRÓDIK ÁT ═════════════
    //
    // A NEVEZETT HIÁNY, amit ez zár (norms.mjs, ORG-N1a): „a `membership` kulcsa alany × könyv, a
    // beváltás `revoked_needs_decision` néven áll meg — az újranyitás külön döntés, nincs
    // megépítve". A kulcs MARAD alany × könyv: a sor a MAI VETÜLET, és egy alanynak ma egy
    // állapota van. A TÖRTÉNET a `membership_grant` / `membership_revocation` naplókban áll, és
    // ott MINDEN időszak megmarad — ez a sor nem történelem (KUKA-018: egy fogalom, egy otthon).
    //
    // A DÖNTÉS MÉRT, NEM JELZŐS. Nem a hívó mondja meg, hogy „ez most újranyitás": a feloldó
    // megkérdezi a SAJÁT bitemporális válaszát ugyanarra a két időpontra, amit az esemény visel.
    // Egy `reopen: true` paraméter önbevalló mező lenne — kiírná magát az ellenőrzés alól, ahogy
    // azt a `grant_basis_kind`-nál már egyszer kimondtuk (invite.mjs, Q09).
    //
    // ÉS CSAK MEGVONÁS UTÁN NYIT ÚJRA. A feltétel NEVEZETT: a tagság azért nem hatályos, mert
    // MEGVONTÁK (vagy visszamenőleg érvénytelenítették). Minden MÁS nem-hatályos alak (még nem
    // hatályos, még nem rögzített, olvashatatlan sor) a RÉGI úton megy, tehát az egyediségi
    // kényszerbe fut és a teljes egység visszagördül — a bukott kísérlet TOVÁBBRA SEM ír
    // történelmet (R88/F02, P-ORG-grant-atomic). A kapu így nem lesz fal, és nem lesz kiskapu sem
    // (KUKA-122 · KUKA-039).
    const REOPENABLE = new Set(['membership_revoked', 'membership_retroactively_invalid']);
    if (existing) {
      const state = before;
      if (state.effective !== true && REOPENABLE.has(state.reason)) {
        const upd = store.run(
          'UPDATE membership SET role = ?, granted_at = ?, revoked_at = NULL WHERE subject_id = ? AND book_id = ?',
          role, eff, subjectId, bookId);
        // A NULLA ÍRT SOR NEVEZETT KUDARC, nem néma siker (KUKA-118: a hiány-jelzést nem dobjuk el).
        if (upd.changes !== 1) throw new Error('grantMembership: az újranyitás NULLA sort írt — bekötési hiba');
        return frozen({
          ok: true, grant_event_id: Number(res.lastInsertRowid),
          granted_at: eff, granted_recorded_at: rec, role,
          reopened: true, previous_granted_at: existing.granted_at,
          previous_revoked_at: existing.revoked_at ?? null,
        });
      }
    }
    store.run(
      'INSERT INTO membership (subject_id, book_id, role, granted_at, revoked_at) VALUES (?,?,?,?,NULL)',
      subjectId, bookId, role, eff);
    return frozen({
      ok: true, grant_event_id: Number(res.lastInsertRowid),
      granted_at: eff, granted_recorded_at: rec, role, reopened: false,
    });
  });
}

/**
 * A TAGSÁGADÁS FELOLDÁSA A KÉT TENGELYEN (R85/F01) — a `membershipAsOf` belső lépése.
 *
 * A KÉT SZŰRŐ UGYANAZ, MINT A MEGVONÁSNÁL, és pontosan ez a lényeg: a szabály nem állhat EGY ág
 * feltételében (KUKA-039). A régi alak csak a hatályt mérte, ezért egy JÚNIUSI beváltás
 * megváltoztatta a MÁRCIUSI tudás szerinti augusztusi képet.
 *
 * A GYENGÉBB TANÚ KIMONDVA. Ha egy tagsághoz nincs napló-esemény (közvetlenül írt sor), a
 * feloldó a sor `granted_at` értékét KÉNYTELEN mindkét tengelyen használni. Ez NEM az általános
 * szerződés — ezért jelöli az `axis` mező (`event` vagy `projected_row`), hogy az olvasó lássa,
 * milyen erős tanún áll a válasz (KUKA-127: ha a jel gyengébb, a kötés erősségét ki kell írni).
 */
function grantAsOf({ store, subjectId, bookId, membershipRow, valid, known }) {
  const events = store.all(
    'SELECT * FROM membership_grant WHERE subject_id = ? AND book_id = ? ORDER BY id',
    subjectId, bookId);

  if (!events.length) {
    const g = instantMs(membershipRow.granted_at);
    if (!g.ok) return { effective: false, axis: 'projected_row', reason: `membership_granted_at_${g.reason}` };
    if (g.ms > known.ms) return { effective: false, axis: 'projected_row', reason: 'membership_grant_not_yet_recorded' };
    if (g.ms > valid.ms) return { effective: false, axis: 'projected_row', reason: 'membership_not_yet_effective' };
    return { effective: true, axis: 'projected_row', reason: 'membership_effective' };
  }

  // ═══ R132 — A LEGKÉSŐBBI ALKALMAZHATÓ TAGSÁGADÁS DÖNT, NEM AZ ELSŐ ══════════════════════════
  //
  // MI VOLT AZ R132 ELŐTT, ÉS MIÉRT KELLETT MEGVÁLTOZNIA. A régi hurok az ELSŐ alkalmazható
  // eseménynél azonnal visszatért. Egyetlen tagsági időszaknál ez ugyanazt adta (egy esemény volt);
  // az R132 óta viszont LEHET több — és akkor a régi alak a MAI kérdésre a RÉGI, már lezárt időszak
  // esemény-azonosítóját adta volna vissza. Abból pedig a hívók a RÉGI időszak átvitt korlátját és
  // RÉGI adatkörjogait olvasták volna ki (`grant_basis`, `scope_grant.membership_grant_id`) —
  // vagyis pontosan az a „régi jog feléledése", amit a spec tilt.
  //
  // A RENDEZÉS TELJES ÉS DETERMINISZTIKUS, és ugyanaz, mint az adatkörjognál (`readScopeGrantAt`):
  // hatály → rögzítés → sor-azonosító. Azonos időbélyegnél tehát NEM a beolvasási sorrend dönt,
  // hanem a sorszám (KUKA-113: a hiányzó sorszám nem deklarált sorrend).
  //
  // A „még nem tudtuk" és a „még nem hatályos" KÜLÖN NEVEZETT válasz marad — a két tengely két
  // külön kérdés, és a hiányukat nem mossuk össze (KUKA-002).
  let knownAny = false;
  let best = null;
  for (const ev of events) {
    const rec = instantMs(ev.recorded_at);
    const eff = instantMs(ev.effective_at);
    // Az OLVASHATATLAN naplósor ZÁR — nem néma kihagyás (KUKA-020).
    if (!rec.ok || !eff.ok) return { effective: false, axis: 'event', reason: 'grant_event_undecidable' };
    if (rec.ms > known.ms) continue;           // ezt akkor még nem tudtuk
    knownAny = true;
    if (eff.ms > valid.ms) continue;           // erre a napra még nem hatályos
    const cand = { ev, effMs: eff.ms, recMs: rec.ms };
    if (best === null) { best = cand; continue; }
    if (cand.effMs !== best.effMs) { if (cand.effMs > best.effMs) best = cand; continue; }
    if (cand.recMs !== best.recMs) { if (cand.recMs > best.recMs) best = cand; continue; }
    if (cand.ev.id > best.ev.id) best = cand;
  }
  if (best !== null) {
    // AZ ESEMÉNY AZONOSÍTÓJA IS TÉNY (R47/RSB-01). A tagsághoz átvitt adatkör-korlát
    // (`grant_basis`) ehhez az ESEMÉNYHEZ kötött; enélkül a kiadási kapu egy MÁSODIK,
    // saját eseményválasztást írna, és a két út elcsúszhatna (KUKA-018 · KUKA-039).
    return {
      effective: true, axis: 'event', reason: 'membership_effective',
      grant_event_id: best.ev.id, recorded_ms: best.recMs, role: best.ev.role,
    };
  }
  return {
    effective: false,
    axis: 'event',
    reason: knownAny ? 'membership_not_yet_effective' : 'membership_grant_not_yet_recorded',
  };
}

/** A MAI VETÜLET a naplóból — a `membership.revoked_at` oszlop ebből születik, nem fordítva.
 *  Egy fogalom, egy otthon: az oszlop GYORSÍTÓTÁR, az igazság a napló (KUKA-018). */
export function projectedRevokedAt({ store, subjectId, bookId, knownAt }) {
  const known = instantMs(knownAt);
  if (!known.ok) return null;
  const events = store.all(
    'SELECT * FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id',
    subjectId, bookId);
  let best = null;
  for (const e of events) {
    const rec = instantMs(e.recorded_at);
    const eff = instantMs(e.effective_at);
    if (!rec.ok || !eff.ok || rec.ms > known.ms) continue;
    if (best === null || eff.ms < instantMs(best).ms) best = e.effective_at;
  }
  return best;
}

/**
 * R132 — A TAGSÁGI IDŐSZAKOK LISTÁJA, A NAPLÓBÓL SZÁMÍTVA (PER-01).
 *
 * MIRE KELL. Három fogyasztója van, és mind a három UGYANEZT a feloldót kérdezi, hogy ne tudjanak
 * elcsúszni egymástól (KUKA-018 · KUKA-039):
 *   · az ÚJRAHÍVÁSI döntés — melyik LEZÁRT időszakhoz kötődik az új ajánlat;
 *   · a BEVÁLTÁS — ugyanaz a lezárt időszak áll-e MA is, amire az ajánlatot kiadták;
 *   · a KÉPERNYŐ — „a korábban eltávolított tag legyen visszakereshető" (spec §6).
 *
 * AZ IDŐSZAK HATÁRAI ESEMÉNYEK, NEM DÁTUMOK. Egy időszakot egy `membership_grant` sor NYIT, és az
 * ÁLTALA megnyitott időszakra alkalmazható LEGKORÁBBI hatályú `membership_revocation` ZÁR. A
 * hozzárendelés a RÖGZÍTÉS tengelyén megy — ugyanazzal a szabállyal, amit a `membershipAsOf` is
 * használ —, mert a visszamenőleges érvénytelenség HATÁLYA a múltban van, a tudomásszerzése pedig
 * ahhoz az időszakhoz tartozik, amelyik alatt megérkezett (REV-N2b).
 *
 * A VÁLASZ MINDIG MONDJA MEG, MILYEN TANÚN ÁLL. Napló nélküli (vetített) sorra NEM gyártunk
 * időszak-listát: a hiány NEVEZETT (`axis: 'projected_row'`, egyetlen, azonosító nélküli időszak),
 * nem kitalált esemény-azonosító (KUKA-127).
 *
 * PURE: csak olvas, nem ír.
 */
export function membershipPeriodsOf({ store, subjectId, bookId, knownAt }) {
  const known = instantMs(knownAt);
  if (!known.ok) return frozen({ ok: false, reason: `known_at_${known.reason}`, periods: frozen([]) });
  const row = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
  if (!row) return frozen({ ok: true, axis: 'none', reason: 'no_membership', periods: frozen([]) });

  const grants = store.all('SELECT * FROM membership_grant WHERE subject_id = ? AND book_id = ? ORDER BY id', subjectId, bookId);
  const revocations = store.all('SELECT * FROM membership_revocation WHERE subject_id = ? AND book_id = ? ORDER BY id', subjectId, bookId);

  if (!grants.length) {
    // A GYENGÉBB TANÚ KIMONDVA: a sor ideje az EGYETLEN forrás, esemény-azonosító nincs.
    const g = instantMs(row.granted_at);
    if (!g.ok) return frozen({ ok: false, reason: `membership_granted_at_${g.reason}`, periods: frozen([]) });
    return frozen({
      ok: true, axis: 'projected_row', reason: 'membership_without_grant_event',
      periods: frozen([frozen({
        grant_event_id: null, role: row.role, opened_at: row.granted_at, opened_recorded_at: row.granted_at,
        closed_at: row.revoked_at ?? null, closed_recorded_at: null, closed_revocation_id: null,
        open: row.revoked_at === null || row.revoked_at === undefined,
      })]),
    });
  }

  const known_grants = [];
  for (const ev of grants) {
    const rec = instantMs(ev.recorded_at);
    const eff = instantMs(ev.effective_at);
    if (!rec.ok || !eff.ok) return frozen({ ok: false, reason: 'grant_event_undecidable', periods: frozen([]) });
    if (rec.ms > known.ms) continue;              // ezt akkor még nem tudtuk
    known_grants.push({ ev, recMs: rec.ms, effMs: eff.ms });
  }
  if (!known_grants.length) return frozen({ ok: true, axis: 'event', reason: 'membership_grant_not_yet_recorded', periods: frozen([]) });
  // A rögzítés tengelyén rendezve: az időszakok EBBEN a sorrendben nyíltak a rendszer tudása szerint.
  known_grants.sort((a, b) => (a.recMs - b.recMs) || (a.ev.id - b.ev.id));

  const known_revs = [];
  for (const e of revocations) {
    const rec = instantMs(e.recorded_at);
    const eff = instantMs(e.effective_at);
    if (!rec.ok || !eff.ok) return frozen({ ok: false, reason: 'revocation_event_undecidable', periods: frozen([]) });
    if (rec.ms > known.ms) continue;
    known_revs.push({ e, recMs: rec.ms, effMs: eff.ms });
  }

  const periods = known_grants.map((g, i) => {
    const next = known_grants[i + 1] ?? null;
    // ERRE az időszakra az a megvonás szól, amit az időszak megnyitása ÓTA (vagy azzal egyszerre) és
    // a KÖVETKEZŐ időszak megnyitása ELŐTT rögzítettek. Azonos rögzítésnél a megvonás a KORÁBBI
    // időszakhoz tartozik — fail-closed (KUKA-012).
    const mine = known_revs.filter((r) => r.recMs >= g.recMs && (next === null || r.recMs < next.recMs));
    const closer = mine.length
      ? mine.reduce((a, r) => (r.effMs < a.effMs ? r : a), mine[0])
      : null;
    return frozen({
      grant_event_id: g.ev.id, role: g.ev.role,
      opened_at: g.ev.effective_at, opened_recorded_at: g.ev.recorded_at,
      closed_at: closer ? closer.e.effective_at : null,
      closed_recorded_at: closer ? closer.e.recorded_at : null,
      closed_revocation_id: closer ? closer.e.id : null,
      closed_transition: closer ? closer.e.transition : null,
      open: closer === null,
    });
  });
  return frozen({ ok: true, axis: 'event', reason: 'periods_resolved', periods: frozen(periods) });
}

/**
 * R132 — A MA LEZÁRT, LEGUTÓBBI IDŐSZAK — az újrahívás KÖTÉSI PONTJA (PER-02).
 *
 * MIÉRT KELL SAJÁT NÉVEN. Az újrahívási ajánlat a spec szerint „a konkrét lezárt tagsági
 * időszakhoz/megvonási eseményhez" kötődik, és „Egy megszűnésre kiadott újrahívási ajánlat nem
 * használható egy későbbi megszűnés újranyitására". Ehhez EGY kérdésre kell EGY válasz, és
 * UGYANARRA a kérdésre a kiadásnak és a beváltásnak ugyanazt kell kapnia (KUKA-129: a szabály ott
 * teljesüljön, ahol az érték születik).
 *
 * MIT AD: a legutóbbi, MA lezárt időszak azonosító-párja, vagy NEVEZETT elutasítás, ha a tagság ma
 * ÉL (`membership_is_open`), ha sosem volt (`no_membership`), vagy ha a tanú gyengébb annál, hogy
 * időszakot lehessen rá kötni (`membership_without_grant_event`) — ez utóbbi KIMONDOTT határ: napló
 * nélküli, vetített sorra nem adunk újrahívást, mert nem tudnánk MIHEZ kötni (KUKA-012).
 *
 * PURE: csak olvas, nem ír.
 */
export function closedMembershipPeriodOf({ store, subjectId, bookId, at }) {
  const all = membershipPeriodsOf({ store, subjectId, bookId, knownAt: at });
  if (all.ok !== true) return frozen({ ok: false, reason: all.reason });
  if (all.axis === 'none') return frozen({ ok: false, reason: 'no_membership' });
  if (all.axis === 'projected_row') return frozen({ ok: false, reason: 'membership_without_grant_event' });
  if (!all.periods.length) return frozen({ ok: false, reason: all.reason });
  const last = all.periods[all.periods.length - 1];
  if (last.open === true) return frozen({ ok: false, reason: 'membership_is_open', grant_event_id: last.grant_event_id });
  return frozen({
    ok: true, reason: 'closed_period',
    grant_event_id: last.grant_event_id, revocation_id: last.closed_revocation_id,
    role: last.role, opened_at: last.opened_at,
    closed_at: last.closed_at, closed_recorded_at: last.closed_recorded_at,
    closed_transition: last.closed_transition,
    period_index: all.periods.length,
  });
}

/**
 * REV-N2b — A FELÜLVIZSGÁLATI KÖR TAGSÁGA, SZÁMÍTVA.
 *
 * Az érintett műveletek azok, amelyek a KÉT TENGELY KÜLÖNBSÉGÉBEN véglegesültek: a hatály kezdete
 * UTÁN (mert onnantól már nem volt joga), de a rögzítés előtt (mert eddig a rendszer jogosnak
 * látta őket). Ezt SZÁMOLNI kell, nem felsorolni — a kézzel írt lista a következő kör
 * legelső változtatásán elavul (KUKA-051: a hatókör SZABÁLY, nem lista).
 *
 * A „biztonság kedvéért mindent" alak KIFEJEZETTEN tilos: az a KUKA-092 rokona — egy kör, ami
 * mindent bevesz, semmit nem mond meg, és a valódi érintetteket elrejti a zajban.
 */
export function reviewCircleFor({ store, subjectId, bookId, effectiveAt, recordedAt }) {
  const from = instantMs(effectiveAt);
  const to = instantMs(recordedAt);
  if (!from.ok || !to.ok) return frozen({ ok: false, reason: 'window_undecidable', members: [] });
  const rows = store.all(
    `SELECT book_id, actor, idem_key, type, finalized_at, state FROM command
      WHERE book_id = ? AND actor = ? AND state = 'finalized' AND finalized_at IS NOT NULL
      ORDER BY finalized_at, idem_key`, bookId, subjectId);
  const members = rows.filter((r) => {
    const f = instantMs(r.finalized_at);
    return f.ok && f.ms >= from.ms && f.ms < to.ms;
  });
  return frozen({
    ok: true,
    reason: 'computed_from_time_model',
    window: frozen({ from: effectiveAt, to: recordedAt }),
    members: members.map((r) => frozen({ book_id: r.book_id, actor: r.actor, idem_key: r.idem_key, type: r.type, finalized_at: r.finalized_at })),
  });
}

/** A kör tartalma — a felsorolás ÉS az állapota, egy helyen. */
export function reviewCircleState({ store, circleId }) {
  const c = store.get('SELECT * FROM review_circle WHERE id = ?', circleId);
  if (!c) return frozen({ ok: false, reason: 'no_such_circle' });
  const members = store.all(
    'SELECT * FROM review_circle_member WHERE circle_id = ? ORDER BY finalized_at, idem_key', circleId);
  // A BIZONYÍTÉK AZ ESEMÉNYBŐL JÖN, nem a kör másolatából (R85/F02): egy fogalom, egy otthon —
  // két példány előbb-utóbb elcsúszik (KUKA-018).
  const ev = store.get('SELECT * FROM membership_revocation WHERE id = ?', c.revocation_event_id);
  return frozen({
    ok: true,
    id: c.id,
    subject_id: c.subject_id,
    book_id: c.book_id,
    basis: frozen({
      effective_at: c.basis_effective_at,
      recorded_at: c.basis_recorded_at,
      evidence_ref: ev ? ev.evidence_ref : null,
      revocation_event_id: c.revocation_event_id,
      actor_subject_id: ev ? ev.actor_subject_id : null,
    }),
    state: c.closed_at ? 'closed' : 'open',
    opened_at: c.opened_at,
    opened_by: c.opened_by,
    closed_at: c.closed_at ?? null,
    closed_by: c.closed_by ?? null,
    members: members.map((m) => frozen({ book_id: m.book_id, actor: m.actor, idem_key: m.idem_key, finalized_at: m.finalized_at })),
  });
}

/** A kör MEGNYITÁSA — a helyesbítés KÖVETKEZMÉNYE, ugyanabban a tranzakcióban.
 *  Nem külön hívás: a nyugta a hatással EGYÜTT születik (a KUKA-026 ellenpárja). */
function openReviewCircle({ store, subjectId, bookId, effectiveAt, recordedAt, revocationEventId, openedBy }) {
  const circle = reviewCircleFor({ store, subjectId, bookId, effectiveAt, recordedAt });
  if (!circle.ok) return frozen({ ok: false, reason: circle.reason });
  const res = store.run(
    `INSERT INTO review_circle (subject_id, book_id, revocation_event_id, basis_effective_at,
       basis_recorded_at, opened_at, opened_by) VALUES (?,?,?,?,?,?,?)`,
    subjectId, bookId, revocationEventId, effectiveAt, recordedAt, recordedAt, openedBy);
  const id = Number(res.lastInsertRowid);
  for (const m of circle.members) {
    store.run(
      'INSERT INTO review_circle_member (circle_id, book_id, actor, idem_key, finalized_at) VALUES (?,?,?,?,?)',
      id, m.book_id, m.actor, m.idem_key, m.finalized_at);
  }
  return frozen({ ok: true, id, members: circle.members.length });
}

/**
 * REV-N2a + REV-N2b — A VISSZAMENŐLEGES ÉRVÉNYTELENSÉG RÖGZÍTÉSE.
 *
 * @param effectiveAt  MIKORTÓL volt érvénytelen (a MÚLTBAN — vagy akár a jövőben: a jövőbeli
 *                     hatályú helyesbítés JOGOS, csak a MAI képet nem változtatja meg)
 * @param evidenceRef  MIRE hivatkozva — a bizonyíték megnevezése KÖTELEZŐ: bizonyíték nélkül ez
 *                     nem helyesbítés, hanem a múlt átírása (K08)
 */
export function recordRetroactiveInvalidity({
  store, clock, subjectId, bookId, actorSubjectId, credentials, effectiveAt, evidenceRef,
}) {
  const out = effectuate(
    { store, clock, subjectId: actorSubjectId, bookId, operation: 'alter_right', credentials },
    ({ at }) => {
      const eff = instantMs(effectiveAt);
      if (!eff.ok) return frozen({ ok: false, changed: false, reason: `effective_at_${eff.reason}` });
      if (typeof evidenceRef !== 'string' || !evidenceRef.trim()) {
        return frozen({ ok: false, changed: false, reason: 'evidence_ref_required' });
      }
      const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
      if (!m) return frozen({ ok: false, changed: false, reason: 'no_membership' });

      // A BIZONYÍTÉK AZ ESEMÉNY SAJÁT, TARTÓS ADATA (R85/F02) — az eljáróval együtt. A régi alak
      // csak a felülvizsgálati körbe tette, a kör viszont KIZÁRÓLAG a visszamenőleges ágon
      // születik: jövőbeli hatálynál a kötelezően bekért hivatkozás nyomtalanul elveszett (a
      // külső fél mérve: a szintetikus hivatkozás EGYETLEN felhasználói táblában sem maradt meg).
      // MIND A HÁROM ÁG — azonnali · jövőbeli · visszamenőleges — ugyanazt a megőrzési
      // szerződést teljesíti, mert az írás a KÖR ELŐTT és tőle FÜGGETLENÜL történik.
      const evRes = store.run(
        `INSERT INTO membership_revocation (subject_id, book_id, recorded_at, effective_at,
           previous_effective_at, transition, actor_subject_id, evidence_ref)
         VALUES (?,?,?,?,?,?,?,?)`,
        subjectId, bookId, at, effectiveAt, m.revoked_at ?? null, RETROACTIVE_TRANSITION,
        actorSubjectId, evidenceRef);
      const revocationEventId = Number(evRes.lastInsertRowid);

      // A MAI VETÜLET ÚJRASZÁMOLVA (nem „beírva"): a `revoked_at` oszlop az, amit MA tudunk — a
      // márciusi kép ettől nem változik, mert azt a NAPLÓ adja, nem az oszlop.
      const projected = projectedRevokedAt({ store, subjectId, bookId, knownAt: at });
      store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ? AND book_id = ?',
        projected, subjectId, bookId);

      // A KÖR CSAK VISSZAMENŐLEGES HATÁLYNÁL SZÜLETIK. Jövőbeli hatálynál nincs mit felülvizsgálni:
      // a múltban minden jogos volt, és a jövő még nem történt meg (KUKA-092: ami ma nem
      // teljesíthetetlen, azt nem tiltjuk — de ami fogalmilag üres, azt nem gyártjuk le).
      const retro = eff.ms < instantMs(at).ms;
      const circle = retro
        ? openReviewCircle({ store, subjectId, bookId, effectiveAt, recordedAt: at, revocationEventId, openedBy: actorSubjectId })
        : frozen({ ok: true, id: null, members: 0 });

      return frozen({
        ok: true,
        changed: true,
        reason: retro ? 'retroactive_invalidity_recorded' : 'future_dated_invalidity_recorded',
        effective_at: effectiveAt,
        recorded_at: at,
        projected_revoked_at: projected,
        revocation_event_id: revocationEventId,
        evidence_ref: evidenceRef,
        review_circle_id: circle.id ?? null,
        review_circle_members: circle.members ?? 0,
      });
    });
  if (!out.authorized) {
    return frozen({
      ok: false, changed: false, reason: out.right.reason,
      message: `${out.right.message} A visszamenőleges érvénytelenség RÖGZÍTÉSE ugyanaz a `
        + 'jogváltoztatás, mint a megvonás: `alter_right` hatáskör kell hozzá.',
    });
  }
  return out.value;
}

/**
 * A KÖR LEZÁRÁSA — KÜLÖN, HATÁSKÖRHÖZ KÖTÖTT ESEMÉNY.
 *
 * Miért külön: a kör megnyitása GÉPI következmény (a két tengely különbsége), a lezárása viszont
 * EMBERI döntés arról, hogy az érintett műveletekkel mi történjék. Ha ugyanaz a hívás tenné mindkettőt,
 * a rendszer a saját számítását fogadná el döntésnek (KUKA-041: a díszpipa sikert jelent arról, ami
 * meg sem történt).
 */
export function closeReviewCircle({ store, clock, circleId, actorSubjectId, credentials, outcomeRef }) {
  const c = store.get('SELECT * FROM review_circle WHERE id = ?', circleId);
  if (!c) return frozen({ ok: false, changed: false, reason: 'no_such_circle' });
  const out = effectuate(
    { store, clock, subjectId: actorSubjectId, bookId: c.book_id, operation: 'adjudicate', credentials },
    ({ at }) => {
      const live = store.get('SELECT * FROM review_circle WHERE id = ?', circleId);
      if (live.closed_at) return frozen({ ok: true, changed: false, reason: 'review_circle_already_closed', closed_at: live.closed_at });
      if (typeof outcomeRef !== 'string' || !outcomeRef.trim()) {
        return frozen({ ok: false, changed: false, reason: 'outcome_ref_required' });
      }
      const res = store.run('UPDATE review_circle SET closed_at = ?, closed_by = ?, outcome_ref = ? WHERE id = ?',
        at, actorSubjectId, outcomeRef, circleId);
      if (res.changes !== 1) throw new Error('closeReviewCircle: a lezárás NULLA sort írt — bekötési hiba');
      return frozen({ ok: true, changed: true, reason: 'review_circle_closed', closed_at: at });
    });
  if (!out.authorized) {
    return frozen({
      ok: false, changed: false, reason: out.right.reason,
      message: `${out.right.message} A felülvizsgálati kör LEZÁRÁSA érdemi elbírálás: `
        + '`adjudicate` hatáskör kell hozzá.',
    });
  }
  return out.value;
}
