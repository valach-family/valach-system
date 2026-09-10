#!/usr/bin/env node
// V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6).
//
// ═══ EZ AZ ESZKÖZ EGYSZER MÁR HAZUDOTT — R42 Q18 ════════════════════════════════════════════════
//
// A külső fél a `run.mjs` helyére egy azonnal 86-os kóddal kilépő programot tett, ami NEM ad JSON-t
// és EGYETLEN próbát sem futtat. A régi alak erre azt írta ki, hogy **„10 mutáció · 10 elkapva"**,
// és **0-val zárt**. Reprodukáltam: pontosan így történt.
//
// Az ok EGY sor volt: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
// számolta. Ettől minden mutáció, ami csak összeomlasztotta a programot, „elkapottnak" látszott;
// és ha maga a futtató volt rossz, MIND a tíz. Mellette a `wrongCatcher` értéke ki volt számolva,
// de a kilépési feltétel nem használta: a ROSSZ próba általi elkapás is teljes sikernek számított.
//
// Ez pontosan az a hiba-osztály, amiről a saját regiszterünk szól: a nem mért dolog nem
// „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZIK (KUKA-051 · KUKA-089). A mérő-eszközön a legrosszabb
// helyen — mert innentől MINDEN rá hivatkozó bizonyíték hamis.
//
// ═══ A JAVÍTOTT SZERZŐDÉS ═══════════════════════════════════════════════════════════════════════
//
// Egy mutáció akkor és csak akkor ELKAPOTT, ha a MEGNEVEZETT próba a MEGNEVEZETT módon bukik el.
// Minden más külön néven jelenik meg, és mind PIROS:
//
//   CAUGHT         a nevesített próba FAIL-t adott (vagy a szerződésben ELŐRE rögzített kivételt)
//   WRONG_CATCHER  bukott valami, de NEM a nevesített próba — a próba-térkép hazudik
//   SURVIVED       minden próba átment — a PRÓBA lyuka, nem a kódé
//   HARNESS_ERROR  a futtató nem adott értelmezhető eredményt (nincs JSON · spawn-hiba · időtúllépés
//                  · hiányzó próba · nem várt összeomlás) — EZ NEM ÉSZLELÉS
//   STALE_ANCHOR   a mutáció horgonya nincs meg a forrásban — a mutáció elavult
//
// ÉS A LÉNYEG: az eszköz MINDEN futáskor bizonyítja, hogy a Q18-at ma is elkapná (`--self-test`
// nélkül is, alapból). Két kapu fut a mutációk ELŐTT:
//   (a) ALAPVONAL — a MUTÁLATLAN másolatnak zöldnek kell lennie. Piros alapvonalon minden utána
//       jövő „elkapás" értelmezhetetlen.
//   (b) Q18-ELLENPRÓBA — egy szándékosan elrontott futtatót HARNESS_ERROR-nak kell minősíteni,
//       NEM elkapásnak. Ha ez a kapu átmegy elkapásként, az eszköz megint hazudik.
//
// A (b) az egyetlen dolog, ami miatt a többi számnak van értéke. Ezért fut mindig, nem kapcsolóra.

import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync, spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';

const REF = dirname(fileURLToPath(import.meta.url));
const RUN_TIMEOUT_MS = 60000;

// Minden mutáció EGY őrt ront el, és megnevezi, MELYIK próbának kell elkapnia, MILYEN MÓDON.
//   expect: 'probe_fail'    — a nevesített próba FAIL-t ad (ez a szabályos alak)
//   expect: 'runtime_error' — a mutáció a szerződés szerint ELŐRE VÁRHATÓAN kivételt okoz; csak
//                             akkor bizonyíték, ha itt előre ki van mondva (R42 §2.3)
const MUTATIONS = [
  // ── A HAT EREDETI PRÓBA ŐREI (újrahorgonyozva a Q01–Q15 kör után) ───────────────────────────
  { id: 'M1', rule: 'K03', catcher: 'P-A04', expect: 'probe_fail',
    what: 'a semleges válasz elárulja, hogy a címhez tartozik-e fiók',
    file: 'invite.mjs',
    from: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {\n    return UNPROVEN;\n  }",
    to: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {\n    return Object.freeze({ ...UNPROVEN, account_exists: !!(inv && addressHolders(store, inv.invitee_namespace, inv.invitee_value, clock.now()).live.length) });\n  }" },

  // M2 SZERZŐDÉSE MÉRÉSBŐL VÁLTOZOTT, ÉS EZT KI KELL MONDANI. A meglévő hitelesítő adat védelme
  // MOST KÉT helyen áll: az alak-feloldó nem küldi az írás-ágra, ÉS az SQL `WHERE` sem engedi.
  // Egyetlen szerkesztéssel tehát NEM lehet NÉMA felülírást előidézni — a kód a próbálkozást
  // NEVEZETT hibakóddal állítja meg. A bizonyíték ereje ezért korlátozott: azt mutatja, hogy a
  // VÉDELEM TÜZEL, nem azt, hogy egy néma felülírást észlelnénk (KUKA-033: nem állítunk többet).
  { id: 'M2', rule: 'K03', catcher: 'P-K03-cred', expect: 'runtime_error',
    error_code: 'CREDENTIAL_WRITE_BLOCKED', phase: 'probe_body',
    error_match: 'hitelesítő|credential',
    what: 'a meghívó beváltása a MEGLÉVŐ hitelesítő adat írás-ágára fut (a mi KUKA-086-os hibánk)',
    evidence_limit: 'a védelem KÉT helyen áll (alak-feloldó + SQL WHERE), ezért egyetlen szerkesztés '
      + 'nem tud néma felülírást csinálni — ez a VÉDELEM TÜZELÉSÉNEK bizonyítéka',
    file: 'invite.mjs',
    from: "  return (row.credential === null || row.credential === undefined || row.credential === '')\n    ? 'credential_missing' : 'credential_set';",
    to: "  return 'credential_missing';" },

  { id: 'M3', rule: 'K03', catcher: 'P-K03-intent', expect: 'probe_fail',
    what: 'a függő szándék elvész, tehát a kézi beváltás zsákutcába fut (a mi D-VS-667-es hibánk)',
    file: 'invite.mjs',
    from: "  return row ? row.invite_token : null;",
    to: "  return null;" },

  { id: 'M4', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az eredmény kiadása kihagyja a MAI jog ellenőrzését (a mi hibás C08-as javaslatunk)',
    file: 'command.mjs',
    from: "  if (!rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return refused;\n  }",
    to: "  if (false) {\n    return refused;\n  }" },

  { id: 'M5', rule: 'K07', catcher: 'P-A08', expect: 'runtime_error',
    error_code: 'ERR_SQLITE_ERROR', phase: 'probe_body',
    error_match: 'UNIQUE constraint failed: command\\.',
    what: 'az ismétlésvédelem nem fog: a hatás MÁSODSZOR is megszületik',
    evidence_limit: 'a mai kódon egyedi kulcs-ütközést vált ki — ez a VISELKEDÉS-VÁLTOZÁS észlelése, '
      + 'NEM két sikeresen lekönyvelt hatás bizonyítéka (R42 §2.3)',
    file: 'command.mjs',
    from: "  const prior = findCommandInScope(store, scope);",
    to: "  const prior = null;" },

  { id: 'M6', rule: 'K12', catcher: 'P-A14', expect: 'probe_fail',
    what: 'a lejárt külső bizonyíték türelmi időt kap',
    file: 'authz.mjs',
    from: "  if (Number.isFinite(profile?.max_age_ms) && age > profile.max_age_ms) {",
    to: "  if (false && Number.isFinite(profile?.max_age_ms) && age > profile.max_age_ms) {" },

  { id: 'M7', rule: 'K09', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a visszavont tagság továbbra is jogot ad',
    file: 'authz.mjs',
    from: "    if (r.ms <= now.ms) return Object.freeze({ effective: false, reason: 'membership_revoked' });",
    to: "    if (false) return Object.freeze({ effective: false, reason: 'membership_revoked' });" },

  { id: 'M8', rule: 'K05', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a NEM LÉTEZŐ és a NEM LÁTHATÓ parancs válasza eltér — a kulcs próbálgathatóvá válik',
    file: 'command.mjs',
    from: "    if (visible.length !== 1) return refused;",
    to: "    if (visible.length !== 1) return Object.freeze({ ...refused, error: rows.length ? 'not_available' : 'unknown_key' });" },

  { id: 'M9', rule: 'K03', catcher: 'P-A04b', expect: 'probe_fail',
    what: 'a postafiók birtokosa is csak a semleges választ kapja — a javítás zsákutcát csinál (KUKA-064)',
    file: 'invite.mjs',
    from: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {",
    to: "  if (!inv || true) {" },

  { id: 'M10', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az ÚJRAPRÓBÁLÁS a jog-ellenőrzés ELŐTT felel a kulcsra — a kulcs létezés-csatornává válik',
    file: 'command.mjs',
    from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return refused;\n  }\n\n  const prior = findCommandInScope(store, scope);",
    to: "  const prior = findCommandInScope(store, scope);\n  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return prior ? Object.freeze({ ...refused, error: 'exists_but_not_available' }) : refused;\n  }" },

  // ── A Q01–Q15 KÖR ŐREI ──────────────────────────────────────────────────────────────────────
  { id: 'M11', rule: 'K07', catcher: 'P-CMD-namespace', expect: 'probe_fail',
    what: 'Q01 — a kulcs-keresésből kiesik az AKTOR tengely: két aktor közös névteret oszt',
    file: 'command.mjs',
    from: "  return store.get('SELECT * FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?',\n    scope.bookId, scope.actor, scope.idemKey);",
    to: "  return store.get('SELECT * FROM command WHERE book_id = ? AND idem_key = ?',\n    scope.bookId, scope.idemKey);" },

  { id: 'M12', rule: 'K07', catcher: 'P-CMD-namespace', expect: 'probe_fail',
    what: 'Q01 — a hatásazonosító nem hordozza a teljes hatókört: két névtér EGY hatásazonosítón',
    file: 'command.mjs',
    from: "  return `eff_${hash(commandRef(scope))}`;",
    to: "  return `eff_${scope.idemKey}`;" },

  { id: 'M13', rule: 'K07', catcher: 'P-CMD-identity', expect: 'probe_fail',
    what: 'Q02 — visszatér a tört kanonizálás: a BEÁGYAZOTT mezők némán kiesnek a lenyomatból',
    file: 'command.mjs',
    from: "  return hash(`${CANON_VERSION}|${canonicalize({ type, type_version: typeVersion, declared })}`);",
    to: "  return hash(`${CANON_VERSION}|${JSON.stringify(declared, Object.keys(declared).sort())}|${type}|${typeVersion}`);" },

  { id: 'M14', rule: 'K07', catcher: 'P-CMD-identity', expect: 'probe_fail',
    what: 'Q03 — a MŰVELET és a VERZIÓ kiesik az azonosságból: más művelet a régi hatásra mutat',
    file: 'command.mjs',
    from: "  return hash(`${CANON_VERSION}|${canonicalize({ type, type_version: typeVersion, declared })}`);",
    to: "  return hash(`${CANON_VERSION}|${canonicalize({ declared })}`);" },

  { id: 'M15', rule: 'K07', catcher: 'P-CMD-finalize', expect: 'probe_fail',
    what: 'Q04 — a feloldás UTÁNI jog-ellenőrzés elmarad: a közben elvesztett jog mellett is véglegesül',
    file: 'command.mjs',
    from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    // A feloldás alatt elveszett a jog ⇒ a parancs NEM lesz kész. Semmit nem írunk.\n    return refused;\n  }",
    to: "  if (false) {\n    return refused;\n  }" },

  // R47: az M16 ÚJRA-HORGONYOZVA. A régi alakja azt rontotta el, hogy a BEFOGADÁS leltározzon —
  // csakhogy a befogadás ma már SZÁNDÉKOSAN nem leltároz (nem közöl új tényt), ezért a mutáció
  // értelmét vesztette és TÚLÉLT. Az ÚJ veszély ezen a tengelyen az, hogy a befogadás megint
  // KISZOLGÁLJON: visszaadja a feloldott tartalmat, megkerülve az egyetlen leltározott olvasó utat.
  { id: 'M16', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'Q15 — a BEFOGADÁS válasza megint KISZOLGÁLJA a feloldott tartalmat, leltár nélkül',
    file: 'command.mjs',
    from: "    return Object.freeze({ ok: true, effect_id: effectId, state: 'finalized', replayed: false });",
    to: "    return Object.freeze({ ok: true, effect_id: effectId, state: 'finalized', replayed: false, resolved: JSON.parse(resolvedJson) });" },

  // A PÁRJA: az ISMÉTLÉS ága EGY MÁR LÉTEZŐ parancs állapotát közli — az a hívónak ÚJ tény, tehát
  // leltározni KELL. Ha ez elmarad, a kulcs próbálgatásával nyom nélkül derül ki, mi létezik.
  { id: 'M27', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'az ISMÉTLÉS ága nyom nélkül közli egy MÁR LÉTEZŐ parancs állapotát',
    file: 'command.mjs',
    from: "    return store.tx(() => Object.freeze(disclose({\n      store, kind: 'command_replay',",
    to: "    if (true) return Object.freeze({ ok: true, effect_id: prior.effect_id, state: prior.state, replayed: true });\n    return store.tx(() => Object.freeze(disclose({\n      store, kind: 'command_replay'," },

  { id: 'M17', rule: 'K04', catcher: 'P-AUTHZ-opclass', expect: 'probe_fail',
    what: 'Q07 — visszatér a sima objektum-indexelés: az ÖRÖKÖLT kulcs profilt talál',
    file: 'authz.mjs',
    from: "  return typeof opClass === 'string' && OP_CLASSES.has(opClass) ? OP_CLASSES.get(opClass) : null;",
    to: "  return FRESHNESS_PROFILE[opClass] || null;" },

  { id: 'M18', rule: 'K04', catcher: 'P-AUTHZ-membership-time', expect: 'probe_fail',
    what: 'Q08 — a JÖVŐBELI tagsági kezdet nem zár: a 2099-es dátum MA is jogot ad',
    file: 'authz.mjs',
    from: "  if (g.ms > now.ms) return Object.freeze({ effective: false, reason: 'membership_not_yet_effective' });",
    to: "  if (false) return Object.freeze({ effective: false, reason: 'membership_not_yet_effective' });" },

  { id: 'M19', rule: 'K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'Q06 — a HATÁLY tengelye eltűnik: friss lekérdezés mellett a LEJÁRT megbízás is enged',
    file: 'authz.mjs',
    from: "  const until = instantMs(ev.valid_until);\n  if (!until.ok) return Object.freeze({ ok: false, reason: `evidence_valid_until_${until.reason}` });\n  if (until.ms <= now.ms) return Object.freeze({ ok: false, reason: 'evidence_expired' });",
    to: "  // a hatály-tengely eltávolítva" },

  { id: 'M20', rule: 'K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'Q05 — a JÖVŐBELI lekérés frissességnek számít (a negatív kor kisebb a plafonnál)',
    file: 'authz.mjs',
    from: "  if (age < 0) return Object.freeze({ ok: false, reason: 'evidence_future_dated' });",
    to: "  if (false) return Object.freeze({ ok: false, reason: 'evidence_future_dated' });" },

  { id: 'M21', rule: 'K03', catcher: 'P-INVITE-window', expect: 'probe_fail',
    what: 'a meghívó lejárata visszatér SZÖVEG-összehasonlításra (a teljesség-kritika élő lelete)',
    file: 'invite.mjs',
    from: "  if (exp.ms <= now.ms) return Object.freeze({ open: false, reason: 'invite_expired' });",
    to: "  if (inv.expires_at <= nowIso) return Object.freeze({ open: false, reason: 'invite_expired' });" },

  { id: 'M22', rule: 'K03', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q10 — az IDEGEN alany őre elmarad: más ember alanyára is beváltható a meghívó',
    file: 'invite.mjs',
    from: "  if (shape === 'foreign_existing_subject') {\n    return Object.freeze({\n      ok: false, error: 'account_authentication_required',",
    to: "  if (shape === 'foreign_existing_subject') {\n    return Object.freeze({\n      ok: false, error: 'invite_not_actionable'," },

  { id: 'M23', rule: 'K03', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q09 — a kibocsátó MAI joga nincs megkérdezve: visszavont jogú kibocsátó meghívója is ad tagságot',
    file: 'invite.mjs',
    from: "  const grant = inviteGrantAt({ store, invite: inv, clock });",
    to: "  const grant = Object.freeze({ ok: true, issuer_role: 'admin' });" },

  { id: 'M24', rule: 'K09', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q13 — a VISSZAVONT tagság némán elnyelődik: a meghívó elfogy, hozzáférés nélkül',
    file: 'invite.mjs',
    from: "  if (!outcome.grants_access) {",
    to: "  if (false) {" },

  { id: 'M25', rule: 'K03', catcher: 'P-INVITE-effect', expect: 'probe_fail',
    what: 'Q12 — az írások NEM atomiak: a megszakadt beváltás félkész jogadást hagy',
    file: 'invite.mjs',
    from: "  return store.tx(() => {",
    to: "  return ((fn) => fn())(() => {" },

  // Az R42 P-A14 NEVEZETT maradéka: „a megvonás → képviseleti lekérdezés kombináció külön hiányzik".
  // A két tengely SORRENDJE dönt: ha a képviseleti jogcím a tagság-vizsgálat ELÉ kerül, a VISSZAVONT
  // tag hibátlan megbízással újra bejut. Ez nem elméleti: a képviseleti ág `return`-öl, tehát a
  // sorrend-csere némán ad vissza `allowed:true`-t (KUKA-002 — két tengely, és a sorrendjük a szabály).
  { id: 'M28', rule: 'K09', catcher: 'P-AUTHZ-revoke-now', expect: 'probe_fail',
    what: 'K09 — a mai viselkedes: minden meglevo revoked_at ertek blokkolja az azonnali megvonast',
    file: 'authz.mjs',
    from: "  if (prev.ms <= now.ms) return Object.freeze({ act: false, reason: 'revocation_already_effective' });\n  return Object.freeze({ act: true, effective_at: nowIso, reason: 'revocation_pulled_forward', previous_effective_at: existingRevokedAt });",
    to: "  return Object.freeze({ act: false, reason: 'revocation_already_effective' });" },

  { id: 'M29', rule: 'K09', catcher: 'P-AUTHZ-revoke-now', expect: 'probe_fail',
    what: 'K09 — TULZARAS: a mar hatalyos megvonas meghosszabbodik',
    file: 'authz.mjs',
    from: "  if (prev.ms <= now.ms) return Object.freeze({ act: false, reason: 'revocation_already_effective' });",
    to: "  if (false) return Object.freeze({ act: false, reason: 'revocation_already_effective' });" },

  { id: 'M26', rule: 'K04/K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'a képviseleti jogcím a TAGSÁG-vizsgálat elé kerül: visszavont tag megbízással újra bejut',
    file: 'authz.mjs',
    from: "  const eff = membershipEffectiveAt(m, clock.now());\n  if (!eff.effective) {",
    to: "  const eff = membershipEffectiveAt(m, clock.now());\n  if (!eff.effective && !needsExternalEvidence(profile)) {" },
];

// ═══ A MÁSODIK KÖR: ÖT TOVÁBBI HAZUGSÁG-ALAK (R45 H02–H06) ══════════════════════════════════════
//
// A Q18 javítása után a külső fél ÖT másik utat talált, amin a mérő MÉG MINDIG „10/10 elkapva"-t
// írt ki és 0-val zárt. Mind az öt reprodukált:
//
//   H02  a mutáns indulása UTÁN `process.exit(86)`, JSON nélkül → az M5 `runtime_error` szerződése
//        a TELJES FUTTATÓ hibáját is elkapásnak vette
//   H03  a mutánsok nem futtattak próbát, csak `SKIP` rekordot adtak a hat ismert azonosítóhoz →
//        a `status !== 'PASS'` bármit bukásnak fogadott el
//   H04  csak a BUKOTT rekordok kerültek a kimenetbe → a hiányzó rekordokat semmi nem vette észre
//   H05  valódi JSON, de a futtató 86-tal lépett ki → az értelmezhető JSON mellett a rendellenes
//        folyamat-kilépés elveszett
//   H06  a rekordokat idegen infrastruktúra-kivételt jelző `FAIL`-re cserélve → a mérő nem nézte,
//        hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el
//
// A KÖZÖS TANULSÁG: **előbb érvényes mérés, utána mutációs ítélet.** A mérő eddig a MÉRT FÉLTŐL
// kérdezte meg, mit kellett volna mérnie (KUKA-054 a mérőn). Innentől a várt készlet külső
// szerződés (`manifest.mjs`), a kilépési kód és az eredménycsomag ellentmondása mérőhiba, és
// bizonyíték CSAK a nevezett próba nevezett ÁLLÍTÁSÁNAK bukása.

import { MANIFEST_VERSION, EXPECTED_IDS, PROBE_STATUS, checkResultSet, assertionOf } from './manifest.mjs';

// A `run.mjs` SZERZŐDÉSE: 0 = minden próba PASS · 1 = van nem-PASS. Minden más kód mérőhiba —
// akkor is, ha közben értelmezhető JSON érkezett (H05).
const ALLOWED_EXIT_CODES = Object.freeze([0, 1]);

/**
 * EGY futtatás osztályozása — ELŐBB ÉRVÉNYESSÉG, UTÁNA ÍTÉLET.
 * Ez a függvény dönti el, mi számít BIZONYÍTÉKNAK. A hiba SOHA nem lehet észlelés.
 *
 * @returns {{kind:'ok'|'harness', why?:string, failed?:string[], threw?:object[], records?:object[]}}
 */
export function classifyRun(spawnResult) {
  // (1) el sem indult · jel állította le · időtúllépés
  if (spawnResult.error) {
    const to = spawnResult.error.code === 'ETIMEDOUT' ? ' (IDŐTÚLLÉPÉS)' : '';
    return { kind: 'harness', why: `a futtató nem futott le${to}: ${spawnResult.error.message}` };
  }
  if (spawnResult.signal) return { kind: 'harness', why: `a futtatót jel állította le: ${spawnResult.signal}` };

  // (2) RENDELLENES KILÉPÉSI KÓD — H05. Ezt a JSON megléte NEM írja felül: ha a folyamat állapota
  // és az eredménycsomag ellentmond, azt nem szabad elhallgatni.
  if (!ALLOWED_EXIT_CODES.includes(spawnResult.status)) {
    return { kind: 'harness', why: `a futtató rendellenes kilépési kóddal zárt: ${spawnResult.status} (a szerződés szerint csak 0 vagy 1 lehet)` };
  }

  // (3) értelmezhető JSON
  let out;
  try { out = JSON.parse(spawnResult.stdout); } catch {
    return {
      kind: 'harness',
      why: `a futtató nem adott értelmezhető JSON-t (kilépési kód: ${spawnResult.status})`
        + `${(spawnResult.stderr || '').trim() ? ` · stderr: ${String(spawnResult.stderr).trim().split('\n')[0]}` : ''}`,
    };
  }
  if (!out || !Array.isArray(out.records)) return { kind: 'harness', why: 'a JSON-ban nincs `records` tömb' };

  // (4) A TERVEZETT KÉSZLET — KÜLSŐ szerződésből, nem a futás eredményéből (H03 · H04).
  const set = checkResultSet(out.records);
  if (!set.ok) return { kind: 'harness', why: `az eredménycsomag nem felel meg a tervezett készletnek — ${set.problems.join(' · ')}` };
  // (4/b) A CSOMAG SAJÁT AZONOSSÁGA KÖTELEZŐ (R49/H03): manifest-verzió és MÉRT forrás-lenyomat
  // nélkül a kimenet nem mondja meg, MIT mért — a hiányzó kötés nem lehet néma (KUKA-012).
  if (!out.manifest_version) return { kind: 'harness', why: 'a kimenetből hiányzik a manifest-verzió — a csomag nem mondja meg, melyik tervezett készletre vonatkozik' };
  if (!out.source_digest) return { kind: 'harness', why: 'a kimenetből hiányzik a MÉRT forrás-lenyomat (source_digest) — a csomag nem mondja meg, melyik forráson mért' };
  if (out.manifest_version && out.manifest_version !== MANIFEST_VERSION) {
    return { kind: 'harness', why: `más manifest-verzió: ${out.manifest_version} ≠ ${MANIFEST_VERSION}` };
  }

  // (5) EGYETLEN ÁLLÍTÁS SEM FUTOTT LE — H03. A `SKIP`/`NOT_STARTED` nem bukott állítás, és a
  // mai hatpróbás csomaghoz NINCS deklarált korai-megállási profil (R45), tehát a kihagyás mérőhiba.
  const ran = out.records.filter((r) => r.status === PROBE_STATUS.PASS
    || r.status === PROBE_STATUS.FAIL || r.status === PROBE_STATUS.THREW);
  const skipped = out.records.filter((r) => r.status === PROBE_STATUS.SKIP || r.status === PROBE_STATUS.NOT_STARTED);
  if (ran.length === 0) return { kind: 'harness', why: 'EGYETLEN próba állítása sem futott le (csak SKIP/NOT_STARTED)' };
  if (skipped.length) {
    return { kind: 'harness', why: `${skipped.length} próba kimaradt (${skipped.map((r) => r.probe_id).join(', ')}) — deklarált korai-megállási profil nincs` };
  }

  // (6) A KILÉPÉSI KÓD ÉS AZ EREDMÉNY EGYEZZEN. Ha ellentmondanak, nem tudjuk, melyik igaz.
  const nonPass = out.records.filter((r) => r.status !== PROBE_STATUS.PASS);
  const expectedCode = nonPass.length ? 1 : 0;
  if (spawnResult.status !== expectedCode) {
    return { kind: 'harness', why: `a kilépési kód (${spawnResult.status}) ellentmond az eredménynek (${nonPass.length} nem-PASS ⇒ ${expectedCode})` };
  }

  return {
    kind: 'ok',
    records: out.records,
    failed: out.records.filter((r) => r.status === PROBE_STATUS.FAIL).map((r) => r.probe_id),
    threw: out.records.filter((r) => r.status === PROBE_STATUS.THREW),
  };
}

function runIn(dir) {
  return spawnSync(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'],
    { encoding: 'utf8', timeout: RUN_TIMEOUT_MS });
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    return fn(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

// ── (a) ALAPVONAL: a mutálatlan másolat zöld? ────────────────────────────────────────────────────
function baselineGate() {
  return withCopy((dir) => {
    const c = classifyRun(runIn(dir));
    if (c.kind === 'harness') return { ok: false, why: `az ALAPVONAL nem futott le: ${c.why}` };
    if (c.failed.length || c.threw.length) {
      return { ok: false, why: `az ALAPVONAL piros: ${[...c.failed, ...c.threw.map((r) => `${r.probe_id}(kivétel)`)].join(', ')}` };
    }
    return { ok: true, probes: c.records.map((r) => r.probe_id) };
  });
}

// ── (b)–(f) A HAZUGSÁG-ELLENPRÓBÁK: MINDEN futáskor, nem kapcsolóra ──────────────────────────────
//
// Mindegyik a `run.mjs` helyére tesz egy TÁMADÓ futtatót, és megköveteli, hogy az eszköz NE
// mondja elkapásnak. Ez az egyetlen dolog, amitől a többi számnak értéke van: a mérő minden
// futáskor elvégzi magán a külső fél támadásait.

/** A támadó futtató forrása: adott JSON-t ír ki, adott kóddal lép ki. */
const fakeRunner = (jsonExpr, exitCode) =>
  `const out = { source_digest: 'sha256:hamis', ...${jsonExpr} };\nprocess.stdout.write(JSON.stringify(out));\nprocess.exit(${exitCode});\n`;

const RECORDS = (mapper) => `${JSON.stringify(EXPECTED_IDS)}.map((id) => (${mapper}))`;

const ATTACKS = [
  { id: 'Q18', what: 'a futtató azonnal 86-tal kilép, JSON nélkül',
    runner: 'process.exit(86);\n' },

  { id: 'H03', what: 'egyetlen próba sem fut, csak SKIP rekordok a hat ismert azonosítóhoz',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'SKIP' }")} }`, 1) },

  { id: 'H04', what: 'csak a BUKOTT rekordok kerülnek a kimenetbe (hiányos csomag)',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: [{ probe_id: ${JSON.stringify(EXPECTED_IDS[0])}, status: 'FAIL', assertion_id: 'x' }] }`, 1) },

  { id: 'H05', what: 'valódi alakú JSON, de a futtató 86-tal lép ki',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'PASS' }")} }`, 86) },

  // H06 KÜLÖN MÉRCE, ÉS EZT KI KELL MONDANI (KUKA-048: a kivétel hatókörét a MÉRCE dönti el, nem
  // a kényelem). A H06 kimenete FORMAILAG érvényes mérés: minden tervezett próba szerepel, ismert
  // állapottal. Tehát nem mérőhiba — a követelmény az, hogy NE legyen belőle ELKAPÁS: a várt üzleti
  // állítás bukása és egy váratlan kivétel KÉT KÜLÖN kimenet (R45 H06). A helyes ítélet:
  // WRONG_CATCHER. Ha ezt is `harness`-nak követelném, a mérce hazudna arról, mit mértem.
  { id: 'H06', requires: 'not_caught', expect_verdict: 'WRONG_CATCHER',
    what: 'idegen infrastruktúra-kivétel a nevezett próbán, bukott ÁLLÍTÁS helyett',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: ${RECORDS("{ probe_id: id, status: 'THREW', error_code: 'ECONNREFUSED', phase: 'infrastructure' }")} }`, 1) },

  { id: 'H0X', what: 'ISMÉTLŐDŐ és ISMERETLEN azonosító a kimenetben',
    runner: fakeRunner(`{ manifest_version: ${JSON.stringify(MANIFEST_VERSION)}, records: [...${RECORDS("{ probe_id: id, status: 'PASS' }")}, { probe_id: ${JSON.stringify(EXPECTED_IDS[0])}, status: 'PASS' }, { probe_id: 'P-KITALALT', status: 'FAIL', assertion_id: 'x' }] }`, 1) },
];

/**
 * Egy támadás akkor VÉDETT, ha a mérő mérőhibának minősíti — ÉS ha a `runtime_error` szerződésű
 * mutáció sem tudja belőle elkapást csinálni (H02: a teljes futtató hibája SOHA nem bizonyíték).
 */
function attackGate(a) {
  const requires = a.requires || 'harness';
  return withCopy((dir) => {
    writeFileSync(join(dir, 'v3ref', 'run.mjs'), a.runner);
    const c = classifyRun(runIn(dir));

    if (requires === 'harness' && c.kind !== 'harness') {
      return { ok: false, why: `A MÉRŐ HAZUDIK: a támadást ÉRVÉNYES MÉRÉSNEK fogadta el (${a.what})` };
    }

    // A KÖZÖS, MINDIG ÉRVÉNYES KÖVETELMÉNY: egyik szerződés alatt SEM lehet ELKAPÁS.
    // A `runtime_error` ág külön is mérve — ez a H02: a teljes futtató hibája SOHA nem bizonyíték.
    const vRuntime = verdictFor({ expect: 'runtime_error', catcher: EXPECTED_IDS[0], error_code: 'A_SZERZODESBEN_ALLO' }, c);
    const vFail = verdictFor({ expect: 'probe_fail', catcher: EXPECTED_IDS[0] }, c);
    for (const [name, v] of [['runtime_error', vRuntime], ['probe_fail', vFail]]) {
      if (v.verdict === 'CAUGHT') {
        return { ok: false, why: `A MÉRŐ HAZUDIK: a(z) ${name} szerződés ELKAPÁSNAK vette (${v.why})` };
      }
    }
    if (a.expect_verdict && vFail.verdict !== a.expect_verdict) {
      return { ok: false, why: `az ítélet ${vFail.verdict}, de a szerződés ${a.expect_verdict}-t vár — ${vFail.why}` };
    }
    return {
      ok: true,
      why: c.kind === 'harness'
        ? `helyesen HARNESS_ERROR — ${c.why}`
        : `formailag érvényes mérés, de helyesen ${vFail.verdict} — ${vFail.why}`,
    };
  });
}

/**
 * AZ ÍTÉLET — a nevezett próba nevezett ÁLLÍTÁSA bukott-e el?
 * Külön függvény, hogy az ellenpróbák is EZT hívják, ne egy másolatát (KUKA-009).
 */
function verdictFor(m, c) {
  if (c.kind === 'harness') return { verdict: 'HARNESS_ERROR', why: c.why };

  const rec = (c.records || []).find((r) => r.probe_id === m.catcher);
  if (!rec) return { verdict: 'HARNESS_ERROR', why: `a nevezett próba (${m.catcher}) nincs az eredményben` };

  if (m.expect === 'runtime_error') {
    // SZŰKÍTVE (R45 §4): csak a próbán BELÜLI, ELŐRE MEGNEVEZETT hibakódú kivétel bizonyíték.
    // A teljes futtató hibája, idegen kivétel és a próba előtti összeomlás SOHA nem az.
    if (rec.status !== PROBE_STATUS.THREW) {
      const other = c.failed.filter((id) => id !== m.catcher);
      if (c.failed.includes(m.catcher)) {
        const wantA = assertionOf(m.catcher);
        if (wantA && rec.assertion_id !== wantA) {
          return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} MÁS állítást bukott: ${rec.assertion_id} ≠ ${wantA}` };
        }
        return { verdict: 'CAUGHT', why: `a nevezett ${m.catcher} ÁLLÍTÁSA bukott (a szerződés kivételt is megengedett volna)` };
      }
      return other.length
        ? { verdict: 'WRONG_CATCHER', why: `bukott: ${other.join(', ')} — de a nevezett ${m.catcher} nem` }
        : { verdict: 'SURVIVED', why: 'minden próba átment' };
    }
    if (m.error_code && rec.error_code !== m.error_code) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivételt dobott, de MÁS hibakóddal: ${rec.error_code} ≠ a szerződésben álló ${m.error_code}` };
    }
    if (m.phase && rec.phase !== m.phase) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivétele MÁS fázisban keletkezett: ${rec.phase} ≠ ${m.phase}` };
    }
    if (!m.error_match) {
      return { verdict: 'HARNESS_ERROR', why: `a ${m.id || m.catcher} runtime_error szerződése nem nevezi meg a kivétel HELYÉT (error_match hiányzik)` };
    }
    const msg = String(rec.error_message ?? rec.actual ?? '');
    if (!new RegExp(m.error_match).test(msg)) {
      return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} kivétele IDEGEN: ${msg} — nem illeszkedik a szerződésben álló helyre (${m.error_match})` };
    }
    return { verdict: 'CAUGHT', weak: true,
      why: `a nevezett ${m.catcher} a szerződésben ELŐRE rögzített kivételt dobta (${rec.error_code} · ${rec.phase})` };
  }

  // `probe_fail`: a NEVEZETT ÁLLÍTÁSNAK kell buknia — nem elég, hogy „valami történt" a próbán.
  if (rec.status === PROBE_STATUS.THREW) {
    return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} nem az állítását bukta, hanem KIVÉTELT dobott (${rec.error_code} · ${rec.phase}) — ez nem a szerződés szerinti bizonyíték` };
  }
  if (rec.status !== PROBE_STATUS.FAIL) {
    const other = c.failed.filter((id) => id !== m.catcher);
    return other.length
      ? { verdict: 'WRONG_CATCHER', why: `bukott: ${other.join(', ')} — de a nevezett ${m.catcher} NEM` }
      : { verdict: 'SURVIVED', why: 'minden próba átment' };
  }
  const want = assertionOf(m.catcher);
  if (want && rec.assertion_id !== want) {
    return { verdict: 'WRONG_CATCHER', why: `a ${m.catcher} bukott, de MÁS állításon: ${rec.assertion_id} ≠ ${want}` };
  }
  return { verdict: 'CAUGHT', why: `a nevezett ${m.catcher} a nevezett állításán bukott (${want})` };
}

const POOL = Math.max(1, Math.min(8, availableParallelism()));
function runInAsync(dir) {
  return new Promise((res) => {
    const c = spawn(process.execPath, [join(dir, 'v3ref', 'run.mjs'), '--json'], { encoding: 'utf8' });
    let stdout = ''; let stderr = '';
    const timer = setTimeout(() => { c.kill('SIGKILL'); }, RUN_TIMEOUT_MS);
    c.stdout.on('data', (d) => { stdout += d; });
    c.stderr.on('data', (d) => { stderr += d; });
    c.on('error', (error) => { clearTimeout(timer); res({ status: null, signal: null, error, stdout, stderr }); });
    c.on('close', (status, signal) => { clearTimeout(timer); res({ status, signal, error: undefined, stdout, stderr }); });
  });
}
async function pool(items, limit, fn) {
  const out = new Array(items.length); let next = 0;
  const worker = async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}
async function runMutationAsync(m, knownProbes) {
  if (!knownProbes.includes(m.catcher)) {
    return { ...m, verdict: 'STALE_ANCHOR', why: `a megnevezett próba nem létezik: ${m.catcher}` };
  }
  const dir = mkdtempSync(join(tmpdir(), 'v3mut-'));
  try {
    cpSync(REF, join(dir, 'v3ref'), { recursive: true });
    const target = join(dir, 'v3ref', m.file);
    const src = readFileSync(target, 'utf8');
    if (!src.includes(m.from)) {
      return { ...m, verdict: 'STALE_ANCHOR', why: 'a mutáció horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult' };
    }
    writeFileSync(target, src.replace(m.from, m.to));
    return { ...m, ...verdictFor(m, classifyRun(await runInAsync(dir))) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function runMutation(m, knownProbes) {
  if (!knownProbes.includes(m.catcher)) {
    return { ...m, verdict: 'STALE_ANCHOR', why: `a megnevezett próba nem létezik: ${m.catcher}` };
  }
  return withCopy((dir) => {
    const target = join(dir, 'v3ref', m.file);
    const src = readFileSync(target, 'utf8');
    if (!src.includes(m.from)) {
      return { ...m, verdict: 'STALE_ANCHOR', why: 'a mutáció horgonya NEM TALÁLHATÓ a forrásban — a mutáció elavult' };
    }
    writeFileSync(target, src.replace(m.from, m.to));
    return { ...m, ...verdictFor(m, classifyRun(runIn(dir))) };
  });
}

// ── Futtatás ─────────────────────────────────────────────────────────────────────────────────────
console.log('');
const WALL_T0 = Date.now();
console.log('V3 MAGREFERENCIA — MUTÁCIÓS PRÓBA (G6)');
console.log('='.repeat(78));

const base = baselineGate();
console.log(`  KAPU (a) ALAPVONAL: ${base.ok ? 'ZÖLD' : 'PIROS'} — ${base.ok ? `${base.probes.length} próba futott, mind PASS` : base.why}`);
console.log('');
console.log('  KAPUK (b) HAZUGSÁG-ELLENPRÓBÁK — a külső fél támadásai a SAJÁT kódunkon, minden futáskor:');
const attacks = ATTACKS.map((a) => ({ ...a, ...attackGate(a) }));
for (const a of attacks) {
  console.log(`    ${a.ok ? 'ZÖLD ' : 'PIROS'} [${a.id}] ${a.what}`);
  console.log(`           → ${a.why}`);
}
const attacksOk = attacks.every((a) => a.ok);
console.log('');

let results = [];
if (base.ok && attacksOk) {
  results = await pool(MUTATIONS, POOL, (m) => runMutationAsync(m, base.probes));
  console.log('  Minden sor EGY elrontott őr. A NEVEZETT próba NEVEZETT ÁLLÍTÁSÁNAK kell buknia.');
  console.log('');
  for (const r of results) {
    console.log(`  ${r.verdict.padEnd(13)} [${r.id}·${r.rule}] ${r.what}`);
    console.log(`                → ${r.why}`);
    if (r.weak) console.log(`                ⚠ a bizonyíték ereje korlátozott: ${r.evidence_limit || 'előre rögzített, próbán belüli kivétel'}`);
  }
} else {
  console.log('  A mutációk NEM FUTOTTAK: valamelyik kapu piros, tehát az eredményük értelmezhetetlen');
  console.log('  volna. A hiányzó mérés nem zöld (KUKA-051 · KUKA-089).');
}

const count = (v) => results.filter((r) => r.verdict === v).length;
const caught = count('CAUGHT'), survived = count('SURVIVED'), wrong = count('WRONG_CATCHER');
const harness = count('HARNESS_ERROR'), stale = count('STALE_ANCHOR');
const weak = results.filter((r) => r.weak).length;

console.log('');
console.log(`  Manifest: ${MANIFEST_VERSION} · tervezett próbák: ${EXPECTED_IDS.length} (${EXPECTED_IDS.join(', ')})`);
console.log(`  ${MUTATIONS.length} mutáció · ${caught} elkapva (ebből ${weak} korlátozott erejű)`
  + ` · ${survived} túlélte · ${wrong} rossz próba · ${harness} mérőhiba · ${stale} elavult horgony`);
console.log(`  falióra: ${Date.now() - WALL_T0} ms · párhuzamosság: ${POOL} · külső korlát: 15000 ms`);
console.log(`  ${attacks.length} hazugság-ellenpróba · ${attacks.filter((a) => a.ok).length} védett`);
const clean = base.ok && attacksOk && results.length === MUTATIONS.length
  && survived === 0 && wrong === 0 && harness === 0 && stale === 0;
console.log(`RESULT: ${clean ? 'MINDEN VESZÉLYES MUTÁCIÓ A NEVEZETT ÁLLÍTÁSSAL ÉSZLELT' : 'HIÁNYOS — lásd a fenti sorokat'}`);
process.exit(clean ? 0 : 1);
