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
// MPR-01 (R134/F134-02) — AZ IDŐSZAK-OLVASÓK SEMLEGES OTTHONBAN ÁLLNAK, és innen TOVÁBB-EXPORTÁLVA
// érhetők el. Azért kellett kiemelni őket, mert a hatáskör-sor értékelője (`authority.mjs`) is
// kérdezi a MAI időszakot, ez a modul viszont AZT importálja (`effectuate`) — a közvetlen behúzás
// kört csinálna. A további export SZÁNDÉKOS: a meglévő hívók behúzása (próbák, külső ellenőrző
// programok, mutációk) változatlanul működik, és a fogalomnak továbbra is EGY otthona van (KUKA-003).
import {
  RETROACTIVE_TRANSITION, membershipAsOf, projectedRevokedAt, membershipPeriodsOf,
  closedMembershipPeriodOf,
} from './membershipPeriod.mjs';

export {
  RETROACTIVE_TRANSITION, membershipAsOf, projectedRevokedAt, membershipPeriodsOf,
  closedMembershipPeriodOf,
};

/** A kör állapotai — zárt készlet (KUKA-020: az ismeretlen állapot nem „valami más"). */
export const REVIEW_CIRCLE_STATES = Object.freeze(['open', 'closed']);

const frozen = (o) => Object.freeze(o);


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

/**
 * MELYIK FELÜLVIZSGÁLATI KÖR TARTOZIK EHHEZ A MEGVONÁSI ESEMÉNYHEZ? (R134/F134-01)
 *
 * MIÉRT KELLETT. Az R132-es újrahívási kapu a `reviewCircleFor`-t hívta, és a válaszán egy
 * `circle_id` mezőt vizsgált — az a feloldó viszont az ÉRINTETT MŰVELETEK listáját adja, kör-sort
 * nem. A feltétel így NÉMÁN hamis volt: a kapu ott állt, de nem zárt (KUKA-131 · KUKA-041). A kör
 * MEGTALÁLÁSA ezért saját, nevezett feloldót kapott, és a kötés ESEMÉNY-AZONOSÍTÓN áll (a záró
 * megvonás `id`-ja), nem időablakon — ugyanaz az elv, mint az újrahívási ajánlat kötésénél.
 *
 * A HIÁNY NEVEZETT ÁLLAPOT (`no_review_circle`), nem néma nulla (KUKA-012). PURE: csak olvas.
 */
export function reviewCircleOfRevocation({ store, revocationEventId }) {
  if (revocationEventId === null || revocationEventId === undefined) {
    return frozen({ ok: false, reason: 'revocation_event_required', circle_id: null });
  }
  const row = store.get(
    'SELECT id FROM review_circle WHERE revocation_event_id = ? ORDER BY id DESC LIMIT 1',
    Number(revocationEventId));
  if (!row) return frozen({ ok: true, reason: 'no_review_circle', circle_id: null });
  return frozen({ ok: true, reason: 'review_circle_found', circle_id: Number(row.id) });
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
