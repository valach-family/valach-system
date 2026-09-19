/**
 * SGR-01 — A TÉNYLEGESEN MEGADOTT OLVASÁSI JOG, ADATKÖRÖNKÉNT (K05-DSC-c, R49).
 *
 * MI A KÜLÖNBSÉG, ÉS MIÉRT EZ A CSOMAG LÉNYEGE. A külső ellenőrző fél mondata (R49):
 *
 *     „attól, hogy a vezető készlet- és árjogot is adhat, egy készletre szóló meghívás címzettje
 *      még nem kapott árjogot. A megadható jog és a ténylegesen megadott jog két külön tény."
 *
 * Az R48-as alakom a PLAFONT mérte (`grant_basis.granted_limit` — a határozat korlátja, ami a
 * beváltáskor a tagságra került át), és abból következtetett ENGEDÉLYRE. Adaton mérve két esetben
 * ment ki mégis az ár: (1) ahol SEMMILYEN adatköri korlát nem volt rögzítve, a kiadás megtörtént
 * (`membership_only`); (2) ahol a határozat készletre ÉS árra is adhatott, de a meghívó CSAK
 * készletre szólt, a címzett a TELJES felső korlátot kapta meg.
 *
 * INNENTŐL A PLAFON CSAK SZŰKÍT, NEM AD. A kiadás alapja az ITT rögzített, alanyra + könyvre +
 * EGY adatkörre szóló jog; a plafon (a határozat mai `allowed_scopes` listája és a tagságra átvitt
 * korlát) ezt SZŰKÍTI, a megvonás/lejárat/tiltás pedig ZÁRJA.
 *
 * AMIT EZ A MODUL NEM CSINÁL: nem talál ki üzleti szerepkört, és nem ad alapértelmezett
 * „alapadatkört" senkinek. Ha nincs rögzített jog, a válasz NEM.
 *
 * A SZÓTÁR ZÁRT: a jog a TARTALOM-besorolás adatkör-azonosítóira szól (`KNOWN_DATA_SCOPES`).
 * Régi, szabad szövegű nevet (`stock` · `price`) NEM fordítunk le némán — ismeretlen név nevezett
 * elutasítás (KUKA-022 · KUKA-061).
 */
import { instantMs } from './store.mjs';
import { basisAsOf, withinBasis } from './authorityBasis.mjs';
import { KNOWN_DATA_SCOPES } from './resultScope.mjs';

const frozen = (o) => Object.freeze(o);

/** A MEGADÁS SZERZŐDÉSE — mit követelünk meg egy olvasási jog rögzítéséhez. */
export const SCOPE_GRANT_CONTRACT = Object.freeze({
  id: 'SGR-01',
  owns: 'a ténylegesen megadott, adatkörönkénti olvasási jog (alany × könyv × adatkör)',
  requires: Object.freeze([
    'a scope a TARTALOM zárt adatkör-szótárából való',
    'rögzített ALAP (basis_id + version), ami a megadás pillanatában HATÁLYOS',
    'a megadott adatkör BELEFÉR az alap adatkör-tengelyébe (ORG-N1b — a plafon szűkít)',
    'KÉT tengely: mikortól hatályos, és mikor szereztünk róla tudomást',
  ]),
  forbids: Object.freeze([
    'alap nélküli olvasási jog',
    'a plafonból LEVEZETETT jog (a megadható nem a megadott)',
    'ismeretlen vagy szabad szövegű adatkör-név néma lefordítása',
  ]),
});

/**
 * OLVASÁSI JOG MEGADÁSA — a plafon SZŰKÍT, de a jogot EZ adja.
 * Minden nemleges válasz NEVEZETT, és megmondja, mit kell javítani (KUKA-064).
 */
export function grantReadScope({
  store, subjectId, bookId, scope, basisId, basisVersion, grantedBy,
  effectiveAt, recordedAt, knownAt,
}) {
  if (!subjectId || !bookId) return frozen({ ok: false, reason: 'subject_and_book_required' });
  if (!grantedBy) return frozen({ ok: false, reason: 'granted_by_required' });
  if (typeof scope !== 'string' || !KNOWN_DATA_SCOPES.includes(scope)) {
    return frozen({
      ok: false, reason: 'unknown_data_scope',
      message: `a(z) ${JSON.stringify(scope)} nem a tartalom zárt adatkör-szótárából való — `
        + `választható: ${KNOWN_DATA_SCOPES.join(' · ')}`,
    });
  }
  const eff = instantMs(effectiveAt);
  const rec = instantMs(recordedAt ?? effectiveAt);
  if (!eff.ok) return frozen({ ok: false, reason: `effective_at_${eff.reason}` });
  if (!rec.ok) return frozen({ ok: false, reason: `recorded_at_${rec.reason}` });
  if (!basisId || basisVersion === undefined || basisVersion === null) {
    // AZ ALAP NÉLKÜLI JOG PONTOSAN A BIZONYÍTATLAN ENGEDÉLY (ORG-N1a). Nem néma tiltás: megnevezve.
    return frozen({ ok: false, reason: 'grant_needs_recorded_basis' });
  }
  // A PLAFON A MEGADÁS PILLANATÁBAN IS ÉRVÉNYES: tágabbat adni, mint az alap, tilos (ORG-N1b).
  const basis = basisAsOf({ store, basisId, bookId, validAt: effectiveAt, knownAt: knownAt ?? recordedAt ?? effectiveAt });
  if (basis.in_effect !== true) return frozen({ ok: false, reason: basis.reason });
  if (Number(basis.version) !== Number(basisVersion)) {
    return frozen({ ok: false, reason: 'basis_version_not_in_effect', in_effect_version: basis.version });
  }
  const within = withinBasis(basis, { scope, required: ['scopes'] });
  if (within.ok !== true) return frozen({ ok: false, reason: within.reason, scope });
  const res = store.run(
    `INSERT INTO scope_grant (subject_id, book_id, scope, basis_id, basis_version, granted_by,
       recorded_at, effective_at) VALUES (?,?,?,?,?,?,?,?)`,
    subjectId, bookId, scope, basisId, Number(basisVersion), grantedBy,
    rec.canonical ?? recordedAt ?? effectiveAt, eff.canonical ?? effectiveAt);
  if (res?.changes !== 1) return frozen({ ok: false, reason: 'grant_row_not_created' });
  return frozen({ ok: true, id: Number(res.lastInsertRowid), scope, basis_id: basisId, basis_version: Number(basisVersion) });
}

/**
 * A MEGADOTT JOG MEGVONÁSA — SAJÁT ESEMÉNY, SAJÁT TUDÁS-IDŐVEL (R51/F51-01).
 *
 * AZ R49-ES ALAK HIBÁJA, ADATON MÉRVE: a megvonás a MEGADÁS sorába írt egy `revoked_at` értéket,
 * és az olvasó csak a MEGADÁS `recorded_at`-ját nézte. Egy ÁPRILISBAN rögzített, MÁRCIUS 10-i
 * hatályú megvonás így visszamenőleg átírta a MÁRCIUS 20-i tudásállapotot is: a márciusi kérdésre
 * áprilisi választ adtunk. Ez ugyanaz a hiba-osztály, amit a tagságnál a `membership_revocation`
 * napló már megold (K09 · KUKA-002: két független tény nem ülhet egy oszlopon).
 *
 * INNENTŐL: a megvonás ÚJ SOR, KÉT tengellyel (mikortól hatályos · mikor tudtuk meg), és a
 * megadást SOHA nem írjuk át. A hibás idő NEVEZETT, ÍRÁSMENTES elutasítás (KUKA-124/2).
 */
export function revokeReadScope({ store, subjectId, bookId, scope, at, effectiveAt, recordedAt, actorSubjectId }) {
  const eff = instantMs(effectiveAt ?? at);
  const rec = instantMs(recordedAt ?? at);
  if (!subjectId || !bookId || !scope) return frozen({ ok: false, reason: 'subject_book_and_scope_required', wrote: 0 });
  // A HIBÁS IDŐ ELŐBB ÁLL MEG, MINT AZ ÍRÁS — a `wrote: 0` ezt ki is mondja, hogy a próba MÉRHESSE.
  if (!eff.ok) return frozen({ ok: false, reason: `effective_at_${eff.reason}`, wrote: 0 });
  if (!rec.ok) return frozen({ ok: false, reason: `recorded_at_${rec.reason}`, wrote: 0 });
  const res = store.run(
    `INSERT INTO scope_grant_revocation (subject_id, book_id, scope, actor_subject_id, recorded_at, effective_at)
       VALUES (?,?,?,?,?,?)`,
    subjectId, bookId, scope, actorSubjectId ?? null,
    rec.canonical ?? (recordedAt ?? at), eff.canonical ?? (effectiveAt ?? at));
  if (res?.changes !== 1) return frozen({ ok: false, reason: 'revocation_row_not_created', wrote: 0 });
  return frozen({
    ok: true, wrote: 1, id: Number(res.lastInsertRowid),
    effective_at: eff.canonical ?? (effectiveAt ?? at), recorded_at: rec.canonical ?? (recordedAt ?? at),
  });
}

/**
 * A JOG ÁLLAPOTA EGY IDŐPONTBAN — KÉT tengelyen (hatály × tudás), EGY IDŐVONALON.
 *
 * A MEGADÁS ÉS A MEGVONÁS UGYANAZON a vonalon áll, és a LEGKÉSŐBBI ALKALMAZHATÓ esemény dönt —
 * ettől marad értelmes az ÚJRAADÁS is (megadás → megvonás → újabb megadás). Két szűrő, két külön
 * kérdés, és egyik sem helyettesíti a másikat:
 *   `recorded_at <= knownAt`   — ezt az eseményt EKKOR MÁR ISMERTÜK?
 *   `effective_at <= validAt`  — a KÉRDEZETT NAPRA vonatkozik-e a hatálya?
 *
 * A HIÁNY NEVEZETT állapot (`no_scope_grant`), nem néma nulla (KUKA-012 · KUKA-093); az
 * OLVASHATATLAN sor ZÁR, nem néma kihagyás (KUKA-020).
 */
export function readScopeGrantAt({ store, subjectId, bookId, scope, validAt, knownAt }) {
  const valid = instantMs(validAt);
  const known = instantMs(knownAt ?? validAt);
  if (!valid.ok) return frozen({ granted: false, reason: `valid_at_${valid.reason}` });
  if (!known.ok) return frozen({ granted: false, reason: `known_at_${known.reason}` });

  const grants = store.all(
    'SELECT * FROM scope_grant WHERE subject_id = ? AND book_id = ? AND scope = ? ORDER BY id',
    subjectId, bookId, scope);
  const revocations = store.all(
    'SELECT * FROM scope_grant_revocation WHERE subject_id = ? AND book_id = ? AND scope = ? ORDER BY id',
    subjectId, bookId, scope);
  if (!grants.length) return frozen({ granted: false, reason: 'no_scope_grant' });

  const line = [];
  for (const r of grants) line.push({ kind: 'grant', row: r });
  for (const r of revocations) line.push({ kind: 'revocation', row: r });

  const applied = [];
  for (const e of line) {
    const eff = instantMs(e.row.effective_at);
    const rec = instantMs(e.row.recorded_at);
    if (!eff.ok || !rec.ok) {
      return frozen({ granted: false, reason: e.kind === 'grant' ? 'grant_row_undecidable' : 'revocation_row_undecidable' });
    }
    if (rec.ms > known.ms) continue;     // ezt akkor még nem tudtuk
    if (eff.ms > valid.ms) continue;     // erre a napra még nem hatályos
    applied.push({ ...e, effMs: eff.ms, recMs: rec.ms });
  }
  if (!applied.length) return frozen({ granted: false, reason: 'grant_not_yet_effective' });

  // A LEGKÉSŐBBI ALKALMAZHATÓ ESEMÉNY DÖNT. Azonos hatálynál a KÉSŐBB RÖGZÍTETT, azon belül a
  // nagyobb sor-azonosító — a rendezés így teljes és determinisztikus (nem „véletlen sorrend").
  // Azonos hatály + azonos rögzítés esetén a MEGVONÁS erősebb: a zárás fail-closed (KUKA-012).
  const rank = (e) => (e.kind === 'revocation' ? 1 : 0);
  const last = applied.reduce((a, e) => {
    if (e.effMs !== a.effMs) return e.effMs > a.effMs ? e : a;
    if (e.recMs !== a.recMs) return e.recMs > a.recMs ? e : a;
    if (rank(e) !== rank(a)) return rank(e) > rank(a) ? e : a;
    return e.row.id > a.row.id ? e : a;
  }, applied[0]);

  if (last.kind === 'revocation') {
    return frozen({
      granted: false, reason: 'scope_grant_revoked',
      revoked_effective_at: last.row.effective_at, revoked_recorded_at: last.row.recorded_at,
      revoked_by: last.row.actor_subject_id ?? null,
    });
  }
  return frozen({
    granted: true, reason: 'scope_granted', id: last.row.id,
    basis_id: last.row.basis_id, basis_version: Number(last.row.basis_version),
    granted_by: last.row.granted_by, effective_at: last.row.effective_at, recorded_at: last.row.recorded_at,
  });
}
