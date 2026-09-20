// V3 MAGREFERENCIA — DLG-01: A MEGHÍVÓ ALAPJA A KIADÓ TOVÁBBADHATÓ JOGÁBÓL (K04 · R63 §4).
//
// A SZABÁLY, SZÓ SZERINT (R63 §4): „Munkatárs meghívása: a rendszer a meghívó jogosultjának
// aktuális, továbbadható jogából képezi az alapot. Címzetti kötés, lejárat, egyszeri beváltás, a
// kiadáskori plafon és a beváltáskori aktuális érvényesség kötelező."
//
// HOGYAN KÉPZŐDIK AZ ALAP. A meghívó-kiadó (`issueInviteUnderBasis`) az R37 óta KÖVETELI az alapot;
// eddig azt a próbák adták meg kézzel. Innentől a rendszer képzi, a kiadó SAJÁT tagságának alapjából:
//   · a kiadó tagsága melyik alap alatt született (indulási szabály VAGY egy korábbi meghívó
//     átvitt korlátja) — ez a SZÜLŐ alap;
//   · a kiadó szerepe szerint mely szerepeket adhat tovább (`roleDelegates`) — ÉS a szülő alap
//     szerep-plafonja; a kettő METSZETE a delegálás plafonja;
//   · az adatkör-plafon a szülőé — tágabbat nem lehet továbbadni (R63 §5.3/10: „a delegálási
//     plafon megmarad").
// A képzett alap VALÓDI `authority_basis` sor (`deleg:<könyv>:<kiadó>`), a bizonyíték-hivatkozása
// a szülő alapot és a tagságadó eseményt nevezi meg. Új verzió csak akkor születik, ha a plafon
// megváltozott — különben a meglévő, hatályos verzió alá megy a meghívó (nem duplikálunk).
//
// A MEGVONÁS TOVÁBBGYŰRŰZIK. Ha a kiadó tagságát megvonják, az ő delegálási alapja is megszűnik
// (`revokeAuthorityBasis`), tehát a FÜGGŐ meghívója a beváltáskor `basis_revoked` néven elakad — a
// beváltás a kiadáskori alaphoz mér, és annak MA is hatályosnak kell lennie (R63 §5.3/9).
//
// AZ ALAP NÉLKÜLI TAGSÁG NEM DELEGÁLHAT. Ha a kiadó tagságának nincs rögzített alapja (nyers
// írással vagy történeti alakban keletkezett), a delegálás NEVEZETTEN elakad — a hiányzó eredetből
// nem képződhet új engedély (R63 §4: „Ismeretlen eredetű régi aktív jog nem lesz automatikusan
// érvényes").

import { instantMs } from './store.mjs';
import { rightAt, roleDelegates } from './authz.mjs';
import { membershipAsOf } from './bitemporal.mjs';
import { recordAuthorityBasis, basisAsOf, revokeAuthorityBasis, INVITE_ISSUE_OPERATION } from './authorityBasis.mjs';
import { issueInviteUnderBasis, grantBasisFor } from './basisLimit.mjs';
import { grantReadScope } from './scopeGrant.mjs';
import { KNOWN_DATA_SCOPES } from './resultScope.mjs';

const frozen = (o) => Object.freeze(o);

export function delegationBasisId(bookId, subjectId) {
  return `deleg:${bookId}:${subjectId}`;
}

/**
 * A TAGSÁG SZÜLŐ ALAPJA — melyik alap alatt született a kiadó tagsága. Két otthon, egy feloldó:
 * az indulás (`workspace_bootstrap`) vagy a beváltás átvitt korlátja (`grant_basis`).
 */
export function parentBasisOfMembership({ store, subjectId, bookId, at }) {
  const m = membershipAsOf({ store, subjectId, bookId, validAt: at, knownAt: at });
  if (m.effective !== true) return frozen({ ok: false, reason: m.reason || 'membership_not_effective' });
  const eventId = m.grant_event_id ?? null;
  if (eventId === null) return frozen({ ok: false, reason: 'membership_without_grant_event' });
  const boot = store.get('SELECT * FROM workspace_bootstrap WHERE book_id = ? AND grant_event_id = ?', bookId, eventId);
  if (boot) {
    const b = basisAsOf({ store, basisId: boot.basis_id, bookId, validAt: at, knownAt: at });
    if (b.in_effect !== true) return frozen({ ok: false, reason: b.reason, basis_id: boot.basis_id });
    return frozen({ ok: true, origin: 'workspace_bootstrap', basis_id: boot.basis_id, basis_version: b.version, limit: b.limit, grant_event_id: eventId });
  }
  const gb = grantBasisFor(store, eventId);
  if (gb.declared !== true) return frozen({ ok: false, reason: 'membership_has_no_recorded_basis', grant_event_id: eventId });
  if (gb.reason !== 'granted_limit_recorded') return frozen({ ok: false, reason: gb.reason, grant_event_id: eventId });
  const b = basisAsOf({ store, basisId: gb.basis_id, bookId, validAt: at, knownAt: at });
  if (b.in_effect !== true) return frozen({ ok: false, reason: b.reason, basis_id: gb.basis_id });
  // A tagságra ÁTVITT korlát a plafon (ORG-N1b) — nem a szülő alap mai, esetleg tágabb alakja.
  return frozen({ ok: true, origin: 'grant_basis', basis_id: gb.basis_id, basis_version: gb.basis_version, limit: gb.limit, grant_event_id: eventId });
}

const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

/**
 * A DELEGÁLÁSI ALAP KÉPZÉSE a kiadó MAI jogából. Idempotens a plafonra: ha a meglévő verzió
 * ugyanazt a plafont hordozza és hatályos, azt adja vissza; ha a plafon változott, ÚJ verzió.
 */
export function deriveDelegationBasis({ store, subjectId, bookId, at }) {
  const t = instantMs(at);
  if (!t.ok) return frozen({ ok: false, reason: `at_${t.reason}` });
  const right = rightAt({ store, subjectId, bookId, opClass: 'own_book', nowIso: at });
  if (!right.allowed) return frozen({ ok: false, reason: right.reason || 'issuer_right_withdrawn' });
  const role = right.detail && right.detail.role;
  const delegable = roleDelegates(role);
  if (!delegable) return frozen({ ok: false, reason: 'role_not_recognised' });
  if (!delegable.length) return frozen({ ok: false, reason: 'role_not_delegable', role });
  const parent = parentBasisOfMembership({ store, subjectId, bookId, at });
  if (!parent.ok) return frozen({ ok: false, reason: parent.reason });
  const pRoles = Array.isArray(parent.limit.roles) ? parent.limit.roles : [];
  const pScopes = Array.isArray(parent.limit.scopes) ? parent.limit.scopes : [];
  const roles = pRoles.length ? delegable.filter((r) => pRoles.includes(r)) : [...delegable];
  const scopes = pScopes.filter((s) => KNOWN_DATA_SCOPES.includes(s));
  if (!roles.length) return frozen({ ok: false, reason: 'delegation_ceiling_empty', parent_basis: parent.basis_id });

  const basisId = delegationBasisId(bookId, subjectId);
  const existing = basisAsOf({ store, basisId, bookId, validAt: at, knownAt: at });
  if (existing.in_effect === true
    && same(existing.limit.operations, [INVITE_ISSUE_OPERATION])
    && same(existing.limit.roles, roles) && same(existing.limit.scopes, scopes)) {
    return frozen({ ok: true, recorded: false, basis_id: basisId, version: existing.version, limit: existing.limit, parent });
  }
  const r = recordAuthorityBasis({
    store, basisId, bookId, issuerSubject: subjectId, effectiveAt: at, recordedAt: at,
    allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: roles, allowedScopes: scopes,
    evidenceRef: `delegated-from:${parent.basis_id}@v${parent.basis_version} · membership_grant#${parent.grant_event_id} · role=${role}`,
  });
  if (!r.ok) return frozen({ ok: false, reason: r.reason });
  return frozen({ ok: true, recorded: true, basis_id: basisId, version: r.version,
    limit: frozen({ operations: frozen([INVITE_ISSUE_OPERATION]), roles: frozen(roles), scopes: frozen(scopes) }), parent });
}

/**
 * MUNKATÁRS MEGHÍVÁSA — a képzett alap alatt, a rendszer SAJÁT kiadóján. A plafonon túli szerep
 * NEVEZETTEN elakad (`outside_basis_roles`), és nem születik meghívó (R63 §5.3/6).
 */
export function inviteColleague({ store, inviterSubjectId, bookId, inviteeEmail, offeredRole, scope, token, expiresAt, at }) {
  const basis = deriveDelegationBasis({ store, subjectId: inviterSubjectId, bookId, at });
  if (!basis.ok) return frozen({ ok: false, reason: basis.reason });
  const email = String(inviteeEmail ?? '').trim();
  if (!email.includes('@')) return frozen({ ok: false, reason: 'invitee_email_required' });
  // AZ ADATKÖR A MEGHÍVÓ RÉSZE, NEM UTÓGONDOLAT. A kiadó szerződése (MOP-01) az adatkör-tengelyt
  // KÖTELEZŐNEK mondja, és ez helyes: a meghívó a kiadó KIFEJEZETT döntése arról is, MILYEN adatot
  // láthat majd a címzett (R63 §5.3/7: a raktári szerep mennyiség-nézetéből ár nem következik). A
  // beváltás ebből a pecsételt adatkörből adja meg az olvasási jogot — egy sorral, alappal.
  if (!KNOWN_DATA_SCOPES.includes(scope)) {
    return frozen({ ok: false, reason: 'data_scope_required', message: `választható adatkörök: ${KNOWN_DATA_SCOPES.join(' · ')}` });
  }
  const issued = issueInviteUnderBasis({
    store, token, bookId, inviteeNamespace: 'email', inviteeValue: email, offeredRole, scope,
    issuerSubject: inviterSubjectId, expiresAt, basisId: basis.basis_id, issuedAt: at,
  });
  if (!issued.ok) return frozen({ ok: false, reason: issued.reason, basis_id: basis.basis_id, ceiling: basis.limit });
  return frozen({ ok: true, token, basis_id: basis.basis_id, basis_version: issued.basis_version, ceiling: basis.limit });
}

/**
 * ADATKÖRI OLVASÁSI JOG ADÁSA EGY TAGNAK — a jogosult delegálási alapja alatt. A plafonon túli
 * adatkör NEVEZETTEN elakad (`outside_basis_scopes`): raktári mennyiség-nézetből ár nem következik
 * (R63 §5.3/7), és a helyi admin sem adhat többet, mint amennyit ő maga kapott (§5.3/10).
 */
export function grantScopeToMember({ store, granterSubjectId, bookId, targetSubjectId, scope, at }) {
  const basis = deriveDelegationBasis({ store, subjectId: granterSubjectId, bookId, at });
  if (!basis.ok) return frozen({ ok: false, reason: basis.reason });
  const m = membershipAsOf({ store, subjectId: targetSubjectId, bookId, validAt: at, knownAt: at });
  if (m.effective !== true) return frozen({ ok: false, reason: 'target_not_a_member', detail: m.reason });
  // A CÉL TAG SAJÁT PLAFONJA IS KAPU (R63 §5.3/7 · az R64 ellenséges felülvizsgálat H06/H07/H10
  // lelete): a beváltáskor átvitt korlát (a pecsételt adatkör) szűkíti, mit kaphat — a kezelő
  // tágabb alapja sem írja felül. Az indulási (bootstrap) tagságnak a teljes szabály a plafonja.
  const target = parentBasisOfMembership({ store, subjectId: targetSubjectId, bookId, at });
  if (target.ok && target.origin === 'grant_basis' && KNOWN_DATA_SCOPES.includes(scope)) {
    const tScopes = Array.isArray(target.limit.scopes) ? target.limit.scopes : [];
    if (!tScopes.includes(scope)) {
      return frozen({ ok: false, reason: 'outside_transferred_limit', scope, ceiling: tScopes, message: `a tag átvitt plafonja: ${tScopes.join(' · ') || '(üres)'}` });
    }
  }
  const g = grantReadScope({
    store, subjectId: targetSubjectId, bookId, scope, basisId: basis.basis_id, basisVersion: basis.version,
    grantedBy: granterSubjectId, effectiveAt: at, recordedAt: at, knownAt: at,
  });
  if (!g.ok) return frozen({ ok: false, reason: g.reason, ceiling: basis.limit.scopes });
  return frozen({ ok: true, scope, basis_id: basis.basis_id, basis_version: basis.version });
}

/** A MEGVONT TAG DELEGÁLÁSI ALAPJA IS MEGSZŰNIK — a függő meghívói nem élhetik túl (R63 §5.3/9). */
export function revokeDelegationsOf({ store, subjectId, bookId, at }) {
  const basisId = delegationBasisId(bookId, subjectId);
  const r = revokeAuthorityBasis({ store, basisId, bookId, at });
  if (!r.ok && r.reason === 'no_recorded_basis') return frozen({ ok: true, changed: false, reason: 'no_delegation_basis' });
  return r;
}
