/** MPR-01 — A TAGSÁGI IDŐSZAK OLVASÓI, EGY SEMLEGES OTTHONBAN (R134/F134-02).
 *
 * MIÉRT KÖLTÖZÖTT IDE. Az R134 lelete (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3) az volt, hogy
 * a RÉGI bírálati hatáskör az ÚJ tagsági időszakban is használható maradt. A javításhoz a hatáskör-sor
 * ÉRTÉKELŐJÉNEK (`authority.mjs` → `authorityRowAt`) tudnia kell, MELYIK tagsági időszak áll MA — azt
 * viszont a `bitemporal.mjs` oldja fel, és az a modul az `authority.mjs`-t importálja (`effectuate`).
 * A közvetlen behúzás tehát KÖRT csinálna.
 *
 * A VÁLASZ UGYANAZ, MINT AZ R73-BAN (AUT-01) ÉS AZ R79-BEN (EFF-01): *„A függőségi kör szerkezeti
 * feladat, nem indok az ellenőrzés elhagyására."* Ezért a TISZTA, CSAK OLVASÓ időszak-feloldók ide
 * költöztek, egy olyan modulba, ami SEMMIT nem importál a `store.mjs`-en kívül — tehát mindkét oldal
 * behúzhatja. A `bitemporal.mjs` ugyanezeket a neveket TOVÁBB-EXPORTÁLJA, így egyetlen meglévő hívó
 * behúzása sem változott (KUKA-003: egy fogalom, egy otthon — két példány előbb-utóbb elcsúszik).
 *
 * MIT NEM TETT A KÖLTÖZÉS. Egyetlen sort sem változtatott a feloldók VISELKEDÉSÉN: a szöveg
 * karakterre ugyanaz, csak a fájl más. A mutációs battéria horgonyai ezért ÁT VANNAK HORGONYOZVA
 * erre a fájlra (M100 · M102 · M108 · M109 · M110 · M111) — elavult horgony nem marad, mert az
 * „nem mértünk ott" állapot, nem zöld (KUKA-200 · R133 M24-es lelete).
 *
 * PURE: csak olvas, nem ír. Hálózat és óra nincs — az időt a hívó adja.
 */
import { instantMs } from './store.mjs';

/** A visszamenőleges helyesbítés NEVE a megvonás-naplóban — egy helyen, hogy író és olvasó
 *  ne tudjon elcsúszni (KUKA-018). */
export const RETROACTIVE_TRANSITION = 'retroactive_invalidity';

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
