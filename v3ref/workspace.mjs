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
export function createWorkspace({ store, creatorSubjectId, bookId, name, at, plan = 'starter' }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `created_at_${t.reason}` });
  if (typeof creatorSubjectId !== 'string' || !creatorSubjectId.trim()) return frozen({ ok: false, reason: 'creator_required' });
  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });
  if (typeof name !== 'string' || !name.trim()) return frozen({ ok: false, reason: 'name_required' });
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
      grant_event_id: g.grant_event_id, rule_version: STARTUP_RULE.version, plan,
    });
  });
}

/** Az indulás TÉNYE — auditálható: ki, mikor, melyik szabály-verzióval. */
export function bootstrapOf({ store, bookId }) {
  const row = store.get('SELECT * FROM workspace_bootstrap WHERE book_id = ?', bookId);
  return row ? frozen({ ...row }) : null;
}

/** MELY KÖNYVEKBEN ÉL az alany tagsága MOST — a munkatér-váltó ebből dolgozik, nem kliens-listából. */
export function workspacesOf({ store, subjectId, at }) {
  const rows = store.all(
    `SELECT b.id, b.name, m.role FROM membership m JOIN book b ON b.id = m.book_id
     WHERE m.subject_id = ? ORDER BY b.name, b.id`, subjectId);
  const out = [];
  for (const r of rows) {
    const m = membershipAsOf({ store, subjectId, bookId: r.id, validAt: at, knownAt: at });
    if (m.effective === true) out.push(frozen({ book_id: r.id, name: r.name, role: r.role }));
  }
  return frozen(out);
}
