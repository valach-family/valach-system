// V3 MAGREFERENCIA — WSP-01: A SAJÁT MUNKAKÖRNYEZET INDULÁSA (K02 · R63 §4 · §5.3/1,4).
//
// A SZABÁLY, SZÓ SZERINT (R63 §4): „Saját új, elkülönült munkakörnyezet: az ellenőrzött fiók saját
// létrehozási művelete és verziózott indulási szabálya alapozza meg a helyi kezelői jogot. A
// keletkező jog csak az új saját körre szól. Nem igazolt törvényes képviselet, nem idegen adatok
// átvétele, nem egy cégnév globális lefoglalása."
//
// MIÉRT NEM „ALAP NÉLKÜLI JOG". Az R57–R61 vitájának lezárása: minden aktív joghoz megnevezhető
// EREDET, HATÓKÖR, SZABÁLYVERZIÓ és IDŐBELI ÉRVÉNY kell — normál indulásnál viszont a
// felhasználótól NEM kérünk külön alapobjektumot vagy okiratot. A kettő úgy fér össze, hogy az
// alapot a RENDSZER képzi: az indulási szabály (`startup-rule:v1`) egy VALÓDI `authority_basis`
// sor, aminek a bizonyíték-hivatkozása a létrehozó ELLENŐRZÖTT fiókját és a szabály verzióját
// nevezi meg. Így a helyi admin joga UGYANAZON a kapun megy át, mint bármely más jog.
//
// MIT AD ÉS MIT NEM AD AZ INDULÁSI SZABÁLY (v1) — kimondva, mert ez a „helyi admin ≠
// platformbíráló" határ (R63 §4):
//   · ad: `admin` tagságot a SAJÁT könyvben · `invite_issue` alapot (továbbadható szerepek: admin,
//     user — a szerep-regiszter szerint) · `alter_right` hatáskört a SAJÁT könyvben (ez a megvonás
//     helyi kezelői joga) · a két ismert adatkör olvasási jogát a létrehozónak;
//   · NEM ad: `suspend` és `adjudicate` (platformbírálói) hatáskört, más könyvre szóló bármit,
//     képviseleti jogot egy cégnév vagy azonosító alapján.
//
// ELŐFELTÉTEL: a létrehozó fiókjának BIZONYÍTOTT e-mail csatornája van (K03). Beírt, nem
// bizonyított címmel nem indulhat munkakörnyezet — a hiány nevezett válasz, nem néma engedély.

import { instantMs } from './store.mjs';
import { recordAuthorityBasis } from './authorityBasis.mjs';
import { grantMembership, membershipAsOf } from './bitemporal.mjs';
import { grantAdjudicationAuthority } from './adjudication.mjs';
import { grantReadScope } from './scopeGrant.mjs';
import { KNOWN_DATA_SCOPES } from './resultScope.mjs';
import { INVITE_ISSUE_OPERATION } from './authorityBasis.mjs';
import { KNOWN_ROLES } from './authz.mjs';
import { setEntitlementProfile } from './entitlement.mjs';
import { provenEmailOf } from './account.mjs';
import { attachBusinessIdentity, businessIdentityProblem } from './externalId.mjs';

const frozen = (o) => Object.freeze(o);

export const STARTUP_RULE = frozen({
  id: 'startup-rule',
  version: 'v1',
  local_admin_role: 'admin',
  operations: frozen([INVITE_ISSUE_OPERATION, 'alter_right']),
  roles: frozen([...KNOWN_ROLES]),
  scopes: frozen([...KNOWN_DATA_SCOPES]),
  not_granted: frozen(['suspend', 'adjudicate']),
});

export function startupBasisId(bookId) {
  return `${STARTUP_RULE.id}:${bookId}`;
}

/**
 * A MUNKAKÖRNYEZET LÉTREHOZÁSA — EGY tranzakcióban: könyv · indulási alap · admin tagság · az
 * indulás ténye · helyi jogváltoztatási hatáskör · adatköri olvasási jog · előfizetési tesztprofil.
 * Bármelyik bukása az egészet visszagörgeti (KUKA-026: a hatás és a nyoma nem szakad el).
 */
export function createWorkspace({ store, creatorSubjectId, bookId, name, at, plan = 'starter', kind = 'shared' }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `created_at_${t.reason}` });
  if (typeof creatorSubjectId !== 'string' || !creatorSubjectId.trim()) return frozen({ ok: false, reason: 'creator_required' });
  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });
  if (typeof name !== 'string' || !name.trim()) return frozen({ ok: false, reason: 'name_required' });
  if (kind !== 'personal' && kind !== 'shared') return frozen({ ok: false, reason: 'unknown_book_kind' });
  // EGY ALANY — EGY SZEMÉLYES KÖR (SZK-01). A második kérés nevezetten elakad, nem gyárt párhuzamos
  // „saját" könyvet: a váltóban ugyanaz a cél kétszer nem állhat (KUKA-003).
  if (kind === 'personal' && personalSpaceOf({ store, subjectId: creatorSubjectId })) {
    return frozen({ ok: false, reason: 'personal_space_exists', message: 'ennek a fióknak már van személyes köre' });
  }
  if (!store.get('SELECT 1 AS ok FROM subject WHERE id = ?', creatorSubjectId)) return frozen({ ok: false, reason: 'creator_unknown' });
  const acc = store.get('SELECT credential FROM account WHERE subject_id = ?', creatorSubjectId);
  if (!acc || !acc.credential) return frozen({ ok: false, reason: 'creator_has_no_credential' });
  const email = provenEmailOf(store, creatorSubjectId);
  if (!email) return frozen({ ok: false, reason: 'creator_channel_unproven', message: 'a munkakörnyezet indításához bizonyított e-mail csatorna kell — váltsd be a címedre küldött hivatkozást' });
  if (store.get('SELECT 1 AS ok FROM book WHERE id = ?', bookId)) return frozen({ ok: false, reason: 'book_id_taken' });

  const basisId = startupBasisId(bookId);
  const clock = { now: () => at };
  return store.atomic(() => {
    store.run('INSERT INTO book (id, name) VALUES (?, ?)', bookId, name.trim());
    // A SZEMÉLYES KÖR TÉNYE UGYANEBBEN A TRANZAKCIÓBAN (SZK-01): ha ez bukik, a könyv sem marad —
    // „személyes kör" nevű, de a váltóban fel nem ismerhető könyv nem születhet (KUKA-026).
    if (kind === 'personal') store.run('INSERT INTO personal_space (subject_id, book_id, created_at) VALUES (?,?,?)', creatorSubjectId, bookId, at);
    const basis = recordAuthorityBasis({
      store, basisId, bookId, issuerSubject: creatorSubjectId, effectiveAt: at, recordedAt: at,
      allowedOperations: [...STARTUP_RULE.operations], allowedRoles: [...STARTUP_RULE.roles],
      allowedScopes: [...STARTUP_RULE.scopes],
      evidenceRef: `${STARTUP_RULE.id}:${STARTUP_RULE.version} · creator=${creatorSubjectId} · channel=email:${email}:proven`,
    });
    if (!basis.ok) throw Object.assign(new Error(`createWorkspace: az indulási alap nem írható — ${basis.reason}`), { code: basis.reason });
    const g = grantMembership({ store, subjectId: creatorSubjectId, bookId, role: STARTUP_RULE.local_admin_role, at });
    if (!g.ok) throw Object.assign(new Error(`createWorkspace: a tagság nem írható — ${g.reason}`), { code: g.reason });
    store.run(
      `INSERT INTO workspace_bootstrap (book_id, creator_subject_id, grant_event_id, basis_id, basis_version, rule_version, recorded_at)
       VALUES (?,?,?,?,?,?,?)`,
      bookId, creatorSubjectId, g.grant_event_id, basisId, basis.version, STARTUP_RULE.version, at);
    // A HELYI JOGVÁLTOZTATÁS (megvonás) hatásköre — a megadási kapun át, az indulási alap alatt.
    grantAdjudicationAuthority({ store, subjectId: creatorSubjectId, bookId, operation: 'alter_right', clock, basisId });
    for (const scope of STARTUP_RULE.scopes) {
      const sg = grantReadScope({
        store, subjectId: creatorSubjectId, bookId, scope, basisId, basisVersion: basis.version,
        grantedBy: creatorSubjectId, effectiveAt: at, recordedAt: at, knownAt: at,
      });
      if (!sg.ok) throw Object.assign(new Error(`createWorkspace: az adatköri jog nem írható — ${sg.reason}`), { code: sg.reason });
    }
    const ent = setEntitlementProfile({ store, bookId, plan, at });
    if (!ent.ok) throw Object.assign(new Error(`createWorkspace: az előfizetési profil nem írható — ${ent.reason}`), { code: ent.reason });
    return frozen({
      ok: true, book_id: bookId, basis_id: basisId, basis_version: basis.version,
      grant_event_id: g.grant_event_id, rule_version: STARTUP_RULE.version, plan, kind,
    });
  });
}

/**
 * PRV-01 — A MUNKAKÖRNYEZET LÉTREHOZÁSA EGY KONZISZTENS EGYSÉGKÉNT (R77/F77-02).
 *
 * A LELET, amit lezár (a külső ellenőrző fél, chatgpt-v3, R77/F77-02 — valódi HTTP-n mérve):
 *   POST /api/workspaces {"name":"Hibas ceg","business":{"tax_id":"---","jurisdiction":"HU"}}
 *   → HTTP 500 (`attachBusinessIdentity: value_required`), ÉS a munkakörnyezetek száma 1 → 2.
 * A `createWorkspace` addigra VÉGLEGESÍTETT (saját tranzakció), az azonosító-rögzítés pedig a SAJÁT
 * tranzakciójában bukott el — a hibaválasz mellett ottmaradt a könyv és az összes indulási joga.
 *
 * A JAVÍTÁS KÉT RÉSZE, EGYÜTT:
 *   (1) a BEMENET baját ÍRÁS ELŐTT kérdezzük meg (`businessIdentityProblem`) — a szabály a meglévő
 *       normalizálóé, nem új „adóellenőrzés";
 *   (2) a könyv · az indulási alap · a tagság · az indulás ténye · a helyi hatáskör · az adatköri
 *       jogok · az előfizetési profil · ÉS a vállalkozási minőség EGYETLEN tranzakcióban születik.
 *       Bármelyik lépés bukása MINDENT visszagörget (KUKA-026: a hatás és a nyoma nem szakad el).
 *
 * AMI KIMONDOTTAN KÍVÜL MARAD: a demonstrációs MINTA-REKORDOK. Azokat a parancs-út írja, aminek a
 * tranzakció-határa SAJÁT, mért szerződés (`store.tx`, a véglegesítési kapu mérési pontja) — azt
 * beágyazni annyi volna, mint egy mért határt elmozdítani (a KUKA-018 lecke a saját söprésünkből).
 * A minta tehát az egység UTÁN íródik, és a válasz KIMONDJA, ha elmaradt (`seeded`) — a hiánya nem
 * félkész JOG, csak hiányzó példa-adat.
 *
 * @param {{ onAfterCore?: () => void }} opts `onAfterCore` a PRÓBA vezérelt hibája: az egységen
 *   BELÜL fut, tehát a visszagörgetés mérhető. Üzemi úton nem hívja senki.
 */
export function provisionWorkspace({
  store, creatorSubjectId, bookId, name, at, plan = 'starter', kind = 'shared',
  business = null, seed = null, onAfterCore = null,
}) {
  // 1. A BEMENET — ÍRÁS ELŐTT. Ha a vállalkozási minőség nem rögzíthető, a könyv MEG SEM SZÜLETIK.
  if (business) {
    const problem = businessIdentityProblem(business);
    if (problem) {
      return frozen({ ok: false, wrote: false, at: 'business', reason: problem.error, message: problem.detail });
    }
  }
  // 2. AZ EGYSÉG. A belső írók savepointot kapnak (`store.atomic` beágyazva), tehát egyetlen
  //    bukás az EGÉSZET visszagörgeti — nem marad félkész könyv vagy jog.
  let out;
  try {
    out = store.atomic(() => {
      const ws = createWorkspace({ store, creatorSubjectId, bookId, name, at, plan, kind });
      if (!ws.ok) throw Object.assign(new Error(ws.message || ws.reason), { provision: { at: 'workspace', reason: ws.reason, message: ws.message ?? null } });
      let biz = null;
      if (business) {
        biz = attachBusinessIdentity({ store, bookId, namespace: business.namespace, jurisdiction: business.jurisdiction, valueRaw: business.valueRaw, at });
        if (!biz.ok) throw Object.assign(new Error(biz.message || biz.reason), { provision: { at: 'business', reason: biz.reason, message: biz.message ?? null } });
      }
      if (typeof onAfterCore === 'function') onAfterCore({ bookId });
      return frozen({ ok: true, wrote: true, workspace: ws, business: biz });
    });
  } catch (e) {
    const named = e && e.provision
      ? e.provision
      : { at: 'unit', reason: 'provision_failed', message: String((e && e.message) || e) };
    // A VISSZAGÖRGETÉS MEGTÖRTÉNT — a válasz ezt KIMONDJA, nem a hívóra bízza a találgatást.
    return frozen({ ok: false, wrote: false, ...named });
  }
  // 3. A MINTA — az egység UTÁN, és a hiánya NEVEZETT (nem néma).
  let seeded = null;
  if (typeof seed === 'function') {
    try { seeded = seed({ bookId }); } catch (e) {
      return frozen({ ...out, seeded: null, seed_failed: String((e && e.message) || e) });
    }
  }
  return frozen({ ...out, seeded });
}

/** Az indulás TÉNYE — auditálható: ki, mikor, melyik szabály-verzióval. */
export function bootstrapOf({ store, bookId }) {
  const row = store.get('SELECT * FROM workspace_bootstrap WHERE book_id = ?', bookId);
  return row ? frozen({ ...row }) : null;
}

/** MELY KÖNYVEKBEN ÉL az alany tagsága MOST — a munkatér-váltó ebből dolgozik, nem kliens-listából. */
export function workspacesOf({ store, subjectId, at }) {
  const rows = store.all(
    `SELECT b.id, b.name, m.role, ps.subject_id AS personal_of
       FROM membership m
       JOIN book b ON b.id = m.book_id
       LEFT JOIN personal_space ps ON ps.book_id = b.id
     WHERE m.subject_id = ?
     ORDER BY CASE WHEN ps.subject_id IS NULL THEN 1 ELSE 0 END, b.name, b.id`, subjectId);
  const out = [];
  for (const r of rows) {
    const m = membershipAsOf({ store, subjectId, bookId: r.id, validAt: at, knownAt: at });
    // A FAJTA IS A VÁLTÓ ADATA (SZK-01): a „személyes kör" a képernyőn NEVESÍTETT cél, nem a név
    // kitalálása. A rendezés a személyes kört hozza elöl — az ember a sajátjából indul.
    // A FAJTA A VÁLTÓ ADATA (SZK-01): „személyes kör" CSAK az, ami a SAJÁT alanyáé — másnak a
    // személyes köre (ha valaha tagságot kapna benne) NEM az övé, és a felirat sem mondhatja annak.
    if (m.effective === true) {
      const personal = r.personal_of === subjectId;
      out.push(frozen({ book_id: r.id, name: r.name, role: r.role, kind: personal ? 'personal' : 'shared', personal }));
    }
  }
  return frozen(out);
}

/**
 * SZK-01 — A SZEMÉLYES KÖR (R64 L11 · R75 §3/1).
 *
 * A LELET, amit lezár: „egyszerű vásárlói regisztráció után ne kelljen »céget« vagy kézzel
 * elnevezett munkakörnyezetet létrehozni csak a saját fiókhoz". A régi alakban a megerősített fiók
 * NULLA körrel állt: a képernyő azt mondta, „még nincs munkakörnyezeted — hozz létre egyet", tehát
 * a magánszemélynek is egy NEVET kellett kitalálnia ahhoz, hogy bármit lásson.
 *
 * AMIT EZ NEM CSINÁL, KIMONDVA: NEM új jogosultsági motor és nem új alap-fajta. A személyes kör
 * UGYANAZZAL a `createWorkspace`-szel, UGYANAZZAL az indulási szabállyal (WSP-01) és ugyanazzal a
 * tagsággal születik, mint bármely más kör — a különbség egyetlen tárolt tény (`book.kind`) és a
 * felület szava. A vállalkozási minőség később sem személyazonosság: az adószámos kör KÜLÖN könyv,
 * a személyes kör érintetlen marad, és az ALANY (a fiók) mindkettőben ugyanaz.
 */
export function personalSpaceOf({ store, subjectId }) {
  const row = store.get(
    `SELECT b.id, b.name, ps.created_at FROM personal_space ps
     JOIN book b ON b.id = ps.book_id
     WHERE ps.subject_id = ?`, subjectId);
  return row ? frozen({ book_id: row.id, name: row.name, created_at: row.created_at }) : null;
}

/** A személyes kör MEGLÉTÉT biztosítja — idempotens: ha már van, nem születik második. */
export function ensurePersonalSpace({ store, subjectId, bookId, name, at, plan = 'starter' }) {
  const existing = personalSpaceOf({ store, subjectId });
  if (existing) return frozen({ ok: true, created: false, book_id: existing.book_id, name: existing.name });
  const r = createWorkspace({ store, creatorSubjectId: subjectId, bookId, name, at, plan, kind: 'personal' });
  if (!r.ok) return frozen({ ok: false, created: false, reason: r.reason, message: r.message ?? null });
  return frozen({ ok: true, created: true, book_id: r.book_id, name, basis_id: r.basis_id, basis_version: r.basis_version });
}
