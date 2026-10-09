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
import { membershipAsOf, closedMembershipPeriodOf } from './bitemporal.mjs';
// R134/F134-01 (RNV-02) — A VÁLTOZHATÓ KIZÁRÁSOK EGY FELOLDÓBÓL. A kiadás és a véglegesítés
// UGYANEZT hívja: a felfüggesztés, a tiltás, a nyitott felülvizsgálat és a visszamenőleges
// érvénytelenség kérdése nem lehet két példányban (KUKA-018 · KUKA-039).
import { reentryExclusionsAt } from './reentryGate.mjs';
// R134/F134-03 (OON-01) — AZ EGYSZERI HATÁS: ugyanaz a szándék EGY ajánlatot ad, az elveszett
// nyugta utáni ismétlés ugyanahhoz vezet, az ELTÉRŐ tartalom nevezett ütközés.
import { onceOnlyBegin, onceOnlyCommit } from './onceOnly.mjs';
import { recordAuthorityBasis, basisAsOf, revokeAuthorityBasis, INVITE_ISSUE_OPERATION } from './authorityBasis.mjs';
import { issueInviteUnderBasis, grantBasisFor } from './basisLimit.mjs';
import { grantReadScope, revokeReadScope, readScopeGrantAt } from './scopeGrant.mjs';
import { scopeGrantLiveAt } from './releaseScope.mjs';
import { effectuate, atomicOutcome, refuseAndRollBack } from './authority.mjs';
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
/**
 * A DELEGÁLÁSI PLAFON — ÍRÁS NÉLKÜL (DCE-01, R123/F123-01).
 *
 * A LELET, AMIT EZ JAVÍT (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R123/F123-01). A
 * `revokeScopeFromMember` a plafont a `deriveDelegationBasis`-tól kérte — az pedig, ha a plafon
 * változott vagy még nem volt alap, `recordAuthorityBasis`-szal ÍR. A plafon-ellenőrzés csak
 * EZUTÁN futott. Mérve: a plafonon túli megvonás NEVEZETTEN elakadt, a `scope_grant_revocation`
 * üres maradt — és az `authority_basis` 3 → 4 lett. Vagyis egy ELUTASÍTOTT jogosultsági döntés
 * megváltoztatta a jogosultsági nyilvántartást.
 *
 * A HIBA OSZTÁLYA: A DÖNTÉS ÉS A KÖNYVELÉS EGY HÍVÁSBAN (KUKA-002 a jogosultságon). A „mennyi a
 * plafonom" KÉRDÉS, a „rögzítsük az alapomat" TETT — a régi alak a kérdést a tetten keresztül
 * tette fel. A jogosultsági döntés SOHA nem lehet írás (KUKA-220: az elutasításnak nyoma sem
 * lehet a védett nyilvántartásban).
 *
 * MIÉRT NEM MÁSOLAT. A számítás UGYANEZ a feloldó, és a `deriveDelegationBasis` IS ezt hívja —
 * tehát a döntés és a rögzítés nem tud elcsúszni egymástól (KUKA-039: egy tény, egy otthon).
 *
 * MIT AD: `{ ok:true, roles, scopes, parent }` vagy nevezett `{ ok:false, reason }`. Az `at`-ot
 * KAPJA, nem olvas órát — a hatályosulási pont ugyanazt az `at`-ot adja a döntésnek (EFF-01).
 */
export function delegationCeilingOf({ store, subjectId, bookId, at }) {
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
  // ── AZ ÜRES KORLÁT NEM „NINCS KORLÁT" — ÉS A KÉT TENGELY UGYANAZT OLVASSA (R158/3, MÉRVE) ──────
  //
  // A LELET. A két tengely UGYANERRE a tárolt alakra ELLENTÉTES választ adott:
  //   roles:  `pRoles.length ? szűrés : [...delegable]`  → az ÜRES lista „nincs korlát" (ENGEDŐ)
  //   scopes: `pScopes.filter(...)`                      → az ÜRES lista „semmi"      (ZÁRÓ)
  // MÉRVE: egy `allowed_roles: []` szülő-korláttal a plafon `["admin","user"]` lett, vagyis az
  // ÜRES korlát ADMIN továbbadására jogosított. A normál úton ilyen sor nem keletkezik (a plafon
  // kiszámítása `delegation_ceiling_empty`-vel elakad, mielőtt írna), de egy sérült, migrált vagy
  // importált sor pontosan ezt hozza — és az OLVASÓ-oldali ellenőrzés hiánya ugyanaz a hiba-osztály,
  // amit a tiltásnál már egyszer kijavítottunk (R73/C-F05: a séma-kényszer a migrációt köti, a már
  // bent lévő sort nem). A hiányzó/nem-tömb alak sem „nincs korlát": az NEM MEGÁLLAPÍTHATÓ, és a
  // nem tudást nem oldjuk fel a kedvezőbb irányba (KUKA-020 · KUKA-236: a zárt lista a MEZŐKRE is).
  const pRoles = Array.isArray(parent.limit && parent.limit.roles) ? parent.limit.roles : null;
  const pScopes = Array.isArray(parent.limit && parent.limit.scopes) ? parent.limit.scopes : null;
  if (pRoles === null || pScopes === null) {
    return frozen({ ok: false, reason: 'parent_limit_undecidable', parent_basis: parent.basis_id ?? null });
  }
  const roles = delegable.filter((r) => pRoles.includes(r));
  const scopes = pScopes.filter((s) => KNOWN_DATA_SCOPES.includes(s));
  if (!roles.length) return frozen({ ok: false, reason: 'delegation_ceiling_empty', parent_basis: parent.basis_id });
  return frozen({ ok: true, role, roles: frozen([...roles]), scopes: frozen([...scopes]), parent });
}

export function deriveDelegationBasis({ store, subjectId, bookId, at }) {
  // A PLAFON ELŐBB, ÍRÁS NÉLKÜL (DCE-01) — és UGYANABBÓL a feloldóból, amit a döntési kapuk hívnak.
  const ceiling = delegationCeilingOf({ store, subjectId, bookId, at });
  if (!ceiling.ok) return ceiling;
  const { role, roles, scopes, parent } = ceiling;

  const basisId = delegationBasisId(bookId, subjectId);
  // R136/F136-02 (AOR-01) — AZ EREDET A MAI TAGSÁGI IDŐSZAK, és a MEGLÉVŐ generáció újrahasználata
  // ettől is függ. A régi alak CSAK a korlátot hasonlította: egy MÁS időszakból származó, azonos
  // korlátú, még hatályos generációt tehát NÉMÁN újrahasznált volna — pontosan az a feléledés, amit
  // a beváltási kapu oldalán most zárunk (a két oldalnak ugyanazt a tényt kell nézni; KUKA-039).
  const origin = parent.grant_event_id ?? null;
  const existing = basisAsOf({ store, basisId, bookId, validAt: at, knownAt: at });
  if (existing.in_effect === true
    && same(existing.limit.operations, [INVITE_ISSUE_OPERATION])
    && same(existing.limit.roles, roles) && same(existing.limit.scopes, scopes)
    && Number(existing.origin_grant_event_id ?? -1) === Number(origin ?? -1)) {
    return frozen({ ok: true, recorded: false, basis_id: basisId, version: existing.version, limit: existing.limit, parent, origin_grant_event_id: existing.origin_grant_event_id ?? null });
  }
  const r = recordAuthorityBasis({
    store, basisId, bookId, issuerSubject: subjectId, effectiveAt: at, recordedAt: at,
    allowedOperations: [INVITE_ISSUE_OPERATION], allowedRoles: roles, allowedScopes: scopes,
    evidenceRef: `delegated-from:${parent.basis_id}@v${parent.basis_version} · membership_grant#${parent.grant_event_id} · role=${role}`,
    originGrantEventId: origin,
  });
  if (!r.ok) return frozen({ ok: false, reason: r.reason });
  return frozen({ ok: true, recorded: true, basis_id: basisId, version: r.version,
    limit: frozen({ operations: frozen([INVITE_ISSUE_OPERATION]), roles: frozen(roles), scopes: frozen(scopes) }), parent,
    origin_grant_event_id: origin });
}

/**
 * MUNKATÁRS MEGHÍVÁSA — a képzett alap alatt, a rendszer SAJÁT kiadóján. A plafonon túli szerep
 * NEVEZETTEN elakad (`outside_basis_roles`), és nem születik meghívó (R63 §5.3/6).
 */
export function inviteColleague({ store, inviterSubjectId, bookId, inviteeEmail, offeredRole, scope, token, expiresAt, at }) {
  // A DÖNTÉSI KAPUK ÍRÁS NÉLKÜL, A RÉGI SORRENDBEN (R124, saját lelet az ATO-01 mellé). A régi
  // alak ELSŐ lépése a `deriveDelegationBasis` volt, ami RÖGZÍT — tehát MINDEN elutasított
  // meghívás (hibás cím, ismeretlen adatkör, plafonon túli szerep) írhatott egy új alapverziót.
  //
  // A SORREND SZÁNDÉKOSAN VÁLTOZATLAN: a JOG kérdése előbb, az ALAK utána. Az első javításomban
  // megcseréltem őket (alak előbb), és ezzel egy jogosulatlan hívó is megtudta volna, hogy a
  // beírt cím alakja rossz — a nemleges válaszok PRECEDENCIÁJA is szerződés, nem stílus
  // (KUKA-129: a nyugta pontossága; KUKA-047: a jogosulatlan nem kap több információt).
  const ceilingOf = delegationCeilingOf({ store, subjectId: inviterSubjectId, bookId, at });
  if (!ceilingOf.ok) return frozen({ ok: false, reason: ceilingOf.reason });
  const email = String(inviteeEmail ?? '').trim();
  if (!email.includes('@')) return frozen({ ok: false, reason: 'invitee_email_required' });
  if (!KNOWN_DATA_SCOPES.includes(scope)) {
    return frozen({ ok: false, reason: 'data_scope_required', message: `választható adatkörök: ${KNOWN_DATA_SCOPES.join(' · ')}` });
  }
  // ÉS AZ ÍRÁS OSZTHATATLAN EGYSÉGBEN (ATO-01). MÉRVE ebben a körben: a régi alakban egy bukott
  // meghívó-kiadás (`invite` sor nem jött létre → idegen kulcs hiba) mellett az `authority_basis`
  // 2 → 3 lett, és a kivétel a hívóig ment. UGYANAZ a hiba-osztály, mint az F123-02 — ugyanabban a
  // fájlban, a szomszéd íróban (KUKA-039: a közös feloldó helyessége nem bizonyítja, hogy minden
  // HÍVÓ helyesen használja; KUKA-257 tanulsága: a fegyelem FELE nem fegyelem).
  return atomicOutcome(store, () => {
  const basis = deriveDelegationBasis({ store, subjectId: inviterSubjectId, bookId, at });
  if (!basis.ok) refuseAndRollBack({ ok: false, reason: basis.reason });
  // AZ ADATKÖR A MEGHÍVÓ RÉSZE, NEM UTÓGONDOLAT. A kiadó szerződése (MOP-01) az adatkör-tengelyt
  // KÖTELEZŐNEK mondja, és ez helyes: a meghívó a kiadó KIFEJEZETT döntése arról is, MILYEN adatot
  // láthat majd a címzett (R63 §5.3/7: a raktári szerep mennyiség-nézetéből ár nem következik). A
  // beváltás ebből a pecsételt adatkörből adja meg az olvasási jogot — egy sorral, alappal.
  const issued = issueInviteUnderBasis({
    store, token, bookId, inviteeNamespace: 'email', inviteeValue: email, offeredRole, scope,
    issuerSubject: inviterSubjectId, expiresAt, basisId: basis.basis_id, issuedAt: at,
  });
  if (!issued.ok) refuseAndRollBack({ ok: false, reason: issued.reason, basis_id: basis.basis_id, ceiling: basis.limit });
  return frozen({ ok: true, token, basis_id: basis.basis_id, basis_version: issued.basis_version, ceiling: basis.limit });
  });
}

/**
 * ADATKÖRI OLVASÁSI JOG ADÁSA EGY TAGNAK — a jogosult delegálási alapja alatt. A plafonon túli
 * adatkör NEVEZETTEN elakad (`outside_basis_scopes`): raktári mennyiség-nézetből ár nem következik
 * (R63 §5.3/7), és a helyi admin sem adhat többet, mint amennyit ő maga kapott (§5.3/10).
 */
export function grantScopeToMember({ store, granterSubjectId, bookId, targetSubjectId, scope, at }) {
  // ══ A DÖNTÉS ÍRÁS NÉLKÜL, ÉS AZ ÍRÁS OSZTHATATLANUL (R123/F123-01 · F123-02 · F123-03) ══════
  //
  // HÁROM LELET EGY MŰVELETEN (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R123):
  //   · a régi alak ELSŐ lépése a `deriveDelegationBasis` volt, ami RÖGZÍT — tehát minden
  //     elutasított megadás is írhatott egy új alapverziót (F123-01 osztálya a megadási úton);
  //   · a `grantReadScope` bukása után a rögzített alap BENT MARADT (F123-02);
  //   · és az ismételt, AZONOS megadás új jog-sort gyártott: `scope_grant` 8 → 10, közbeni
  //     megvonás nélkül, mindkét kérés `ok=true`-val (F123-03).
  //
  // A SORREND MOSTANTÓL SZERZŐDÉS: (1) a plafon és a tagság KÉRDÉS — írás nélkül; (2) a MAI
  // állapot KÉRDÉS — ha a jog már hatályos, NINCS írás és `changed:false`; (3) csak ezután, EGY
  // atomi egységben, a rögzítés és a jog-sor együtt.
  //
  // MIÉRT NEM HTTP-SZINTŰ AZ IDEMPOTENCIA. A dupla kattintás és a hálózati újraküldés ugyanazt az
  // ÜZLETI szándékot hordozza, de egy KÉSŐBBI, valódi újramegadás (megvonás UTÁN) MÁS szándék —
  // azt nem szabad elnyelni. Ezért a mérce nem a kérés azonossága, hanem a JOG MAI ÁLLAPOTA: ha
  // ma hatályos, nincs mit tenni; ha megvonás után kérik újra, az VALÓDI új esemény (KUKA-129: a
  // nyugtának is igazat kell mondania arról, történt-e változás).
  const ceilingOf = delegationCeilingOf({ store, subjectId: granterSubjectId, bookId, at });
  if (!ceilingOf.ok) return frozen({ ok: false, changed: false, reason: ceilingOf.reason });
  const m = membershipAsOf({ store, subjectId: targetSubjectId, bookId, validAt: at, knownAt: at });
  if (m.effective !== true) return frozen({ ok: false, changed: false, reason: 'target_not_a_member', detail: m.reason });
  // A CÉL TAG SAJÁT PLAFONJA IS KAPU (R63 §5.3/7 · az R64 ellenséges felülvizsgálat H06/H07/H10
  // lelete): a beváltáskor átvitt korlát (a pecsételt adatkör) szűkíti, mit kaphat — a kezelő
  // tágabb alapja sem írja felül. Az indulási (bootstrap) tagságnak a teljes szabály a plafonja.
  const target = parentBasisOfMembership({ store, subjectId: targetSubjectId, bookId, at });
  if (target.ok && target.origin === 'grant_basis' && KNOWN_DATA_SCOPES.includes(scope)) {
    const tScopes = Array.isArray(target.limit.scopes) ? target.limit.scopes : [];
    if (!tScopes.includes(scope)) {
      return frozen({ ok: false, changed: false, reason: 'outside_transferred_limit', scope, ceiling: frozen([...tScopes]), message: `a tag átvitt plafonja: ${tScopes.join(' · ') || '(üres)'}` });
    }
  }
  // A SAJÁT PLAFON IS KAPU, ÍRÁS NÉLKÜL — ezt eddig a `deriveDelegationBasis` rögzítő ága vitte.
  if (KNOWN_DATA_SCOPES.includes(scope) && !ceilingOf.scopes.includes(scope)) {
    return frozen({
      ok: false, changed: false, reason: 'outside_basis_scopes', scope, ceiling: ceilingOf.scopes,
      message: `a te adatkör-plafonod: ${ceilingOf.scopes.join(' · ') || '(üres)'} — ezen kívül nem rendelkezel`,
    });
  }
  // ÜZLETI IDEMPOTENCIA — DE A MEGADÁS ESEMÉNYE NEM AZONOS A MAI HASZNÁLHATÓ JOGGAL
  // (GLV-01 · R125/F125-01).
  //
  // A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R125). Az R124-es alakom a
  // `readScopeGrantAt`-ot kérdezte meg — az a megadás/megvonás ESEMÉNYSORÁT olvassa, és nem
  // mondja meg, hogy a hivatkozott ALAP ma is érvényes-e. Mérve: LEJÁRT delegált alap alatt a
  // kiadási kapu `basis_expired`-et adott, ez az ág viszont `scope_already_granted`-et — a
  // kezelő SZABÁLYOS helyreállítása elakadt, és a nyugta sikert mondott egy használhatatlan
  // jogra. Nem jogosulatlan hozzáférés volt, hanem a javítás megakadályozása (KUKA-122: a kapu
  // nem lehet fal) és FÉLREVEZETŐ nyugta (KUKA-129).
  //
  // MOSTANTÓL UGYANAZT A KÉRDÉST TESZI FEL, AMIT A KIADÁS: `scopeGrantLiveAt` — hatályos esemény
  // ÉS ma is álló alap ÉS az alap mai plafonjában lévő adatkör. A tiltás és az előfizetés
  // SZÁNDÉKOSAN nincs benne: azokat egy új megadás nem javítja meg, tehát nem is keletkeztethetnek
  // új grant-igényt (az R125 kikötése).
  const cur = scopeGrantLiveAt({ store, subjectId: targetSubjectId, bookId, scope, nowIso: at, knownAt: at });
  if (cur.allowed === true) {
    return frozen({ ok: true, changed: false, scope, reason: 'scope_already_granted' });
  }
  // AZ ELŐKÉSZÍTŐ ÉS AZ ÉRDEMI ÍRÁS EGY EGYSÉGBEN (ATO-01): a delegálási alap rögzítése és a
  // jog-sor EGYÜTT marad vagy EGYÜTT tűnik el — nevezett kudarcon is.
  return atomicOutcome(store, () => {
    // SOR-ZÁR + A TAGSÁG ÚJRAELLENŐRZÉSE A ZÁRON BELÜL (LCK-01 · R150/F150-03).
    //
    // AZ ATTRIBÚCIÓ HELYESBÍTVE (R152/F152-02 — a külső ellenőrző fél jogos kifogása erre a
    // kommentre). Az első alakom itt azt állította, hogy a megvont tag ÉLŐ adatkört kapott, és
    // ezt „néma jogosultság-szivárgásnak" nevezte. **EZ NEM IGAZ, és a saját jelentésem (R151)
    // meg is cáfolta** — a kommentet viszont elfelejtettem utána igazítani, így a kód
    // SÚLYOSABBAT állított, mint amit a mérés kibír (a szöveg a valóságot követi — KUKA-050).
    //
    // AMIT A MÉRÉS VALÓJÁBAN MUTATOTT:
    //   · a kiadás KÉT KAPUN áll (tagság ÉS adatkör, külön mérve — ENT-02), és a kettő EGYÜTT
    //     helyesen tagad; a valódi HTTP-úton a megvont tag `not_a_member`-t kap;
    //   · a NEGATÍV KONTROLL (ugyanaz a két művelet SORBAN, verseny nélkül) ugyanazt adta,
    //     tehát a jelenség nem is versenyfüggő;
    //   · szivárgás tehát NEM volt mérve — sem versennyel, sem anélkül.
    //
    // AKKOR MIÉRT MARAD ITT A ZÁR? Mert a parancs kikötése szerint a közös zárolási rend MINDEN
    // érintett íróra vonatkozik, nem csak arra, amelyiken a hibát megtaláltuk — és mert a
    // későbbi hívók nem támaszkodhatnak arra, hogy éppen két kapu áll a sorban. Ez MEGELŐZÉS,
    // kimondottan: nem egy mért szivárgás javítása.
    //
    // A DÖNTÉS SZABÁLYA VÁLTOZATLAN: UGYANAZT a feloldót (`membershipAsOf`) kérdezzük újra,
    // UGYANAZZAL az elutasítási okkal — nem születik második üzleti motor, csak a döntés kerül
    // a zár mögé (a parancs kikötése: „ne új üzleti motort építs").
    store.lockRows('membership', 'subject_id = ? AND book_id = ?', targetSubjectId, bookId);
    const mFresh = membershipAsOf({ store, subjectId: targetSubjectId, bookId, validAt: at, knownAt: at });
    if (mFresh.effective !== true) {
      refuseAndRollBack({ ok: false, changed: false, reason: 'target_not_a_member', detail: mFresh.reason });
    }
    const basis = deriveDelegationBasis({ store, subjectId: granterSubjectId, bookId, at });
    if (!basis.ok) refuseAndRollBack({ ok: false, changed: false, reason: basis.reason });
    const g = grantReadScope({
      store, subjectId: targetSubjectId, bookId, scope, basisId: basis.basis_id, basisVersion: basis.version,
      grantedBy: granterSubjectId, effectiveAt: at, recordedAt: at, knownAt: at,
    });
    if (!g.ok) refuseAndRollBack({ ok: false, changed: false, reason: g.reason, ceiling: basis.limit.scopes });
    return frozen({ ok: true, changed: true, scope, basis_id: basis.basis_id, basis_version: basis.version });
  });
}

/**
 * R132/2 — ÚJBÓLI MEGHÍVÁS EGY ELTÁVOLÍTOTT MUNKATÁRSNAK (RNV-01, spec §3).
 *
 * MIT ÉPÍT, ÉS MIT NEM BONT EL. A spec §3 első mondata kikötés: *„A rendes meghívás meglévő
 * `revoked_needs_decision` védelmét ne töröld és ne alakítsd csendes reaktiválássá."* Ezért ez EGY
 * ÚJ, KIFEJEZETT művelet a régi MELLÉ — nem a régi kilazítása. A rendes `inviteColleague` úton egy
 * megvont tag meghívója a beváltásnál VÁLTOZATLANUL `revoked_needs_decision`-re fut.
 *
 * ÉS AMIT EZ A MŰVELET SEM AD: TAGSÁGOT. Csak AJÁNLATOT hoz létre + a hozzá tartozó, tárolt
 * DÖNTÉST. *„A címzett saját, igazolt belépéssel fogadja el"* — a tagság a beváltási lánc minden
 * kapuján át, a címzett saját cselekvésével születik (KUKA-143).
 *
 * A KAPUK, MIND A VÉGLEGESÍTÉSI PONTON (EFF-01 — egy óraolvasás a döntésnek ÉS a hatásnak):
 *   1. az eljáró `alter_right` hatásköre — a jog ÚJRANYITÁSA jogváltoztatás, ugyanaz a hatáskör,
 *      ami a megvonáshoz kell; a puszta (akár admin) tagság nem elég;
 *   2. a CÉL tagságának MA LEZÁRT időszaka — ez az ajánlat kötési pontja (PER-02). Ha a tagság MA
 *      ÉL, nincs mit újranyitni (`membership_is_open`), ha sosem volt, nincs mihez kötni;
 *   3. az eljáró DELEGÁLÁSI PLAFONJA, írás nélkül (DCE-01): az új szerep és az új adatkör-plafon a
 *      MAI hatásköréből származik, a MAI korláton belül — *„Új szerep és új alap/verzió a mai
 *      kezelői hatáskörből származzon"*;
 *   4. a hatályosulási pont KÉSŐBBI a záró megvonásnál — különben az új időszak és a régi megvonás
 *      azonos pillanaton állna, és a feloldó fail-closed szabálya (a megvonás erősebb) egy
 *      „megszületett, de nem hatályos" tagságot adna. Ezt NEM sorrend-találgatással oldjuk meg,
 *      hanem NEVEZETT kapuval (KUKA-171: ami megállít, annak neve is legyen).
 *
 * A NÉGY KIMONDOTT HATÁR (spec §3 utolsó bekezdése) — MIND NEVEZETT ELUTASÍTÁS, A MEGLÉVŐ ELJÁRÁSRA
 * MUTATÓ FOLYTATÁSSAL (KUKA-064 · KUKA-201). *„Visszamenőleges érvénytelenségi döntés, nyitott
 * felülvizsgálat, felfüggesztés, személy-/hitelesítő-/fióktiltás nem oldható fel ezzel."*:
 *   · a lezárást VISSZAMENŐLEGES ÉRVÉNYTELENSÉG adta ⇒ `reentry_blocked_retroactive_invalidity`;
 *   · NYITOTT felülvizsgálati kör ⇒ `reentry_blocked_open_review_circle`;
 *   · FELFÜGGESZTÉS ⇒ `reentry_blocked_suspension`;
 *   · TILTÁS ⇒ `reentry_blocked_ban`.
 * Ezek nem „még nem építettük meg" alakok, hanem a művelet HATÓKÖRÉNEK határai: a visszahívás nem
 * utólagos joghatás-felülvizsgálat és nem a REV-N4 kompenzáló folyamat.
 *
 * AZ ÍRÁS OSZTHATATLAN (ATO-01, spec §5: *„Az ajánlat, pecsét, újrahívási döntés és kapcsolódó
 * alapírás egységben szülessen"*): a delegálási alap, a meghívó, a pecsét és a döntés-sor EGYÜTT
 * marad vagy EGYÜTT tűnik el.
 */
export function reinviteMember({
  store, clock, deciderSubjectId, bookId, targetSubjectId, offeredRole, scope, token, expiresAt,
  operationId, credentials,
}) {
  if (!targetSubjectId || !bookId) return frozen({ ok: false, changed: false, reason: 'subject_and_book_required' });
  if (!token) return frozen({ ok: false, changed: false, reason: 'token_required' });
  if (!KNOWN_DATA_SCOPES.includes(scope)) {
    return frozen({
      ok: false, changed: false, reason: 'data_scope_required',
      message: `választható adatkörök: ${KNOWN_DATA_SCOPES.join(' · ')}`,
    });
  }
  // R134/F134-03 — A MŰVELETI AZONOSSÁG KÖTELEZŐ (OON-01). A hiánya NEM néma engedély: azonosság
  // nélkül az egyszeri hatás nem kikényszeríthető, tehát NEVEZETTEN elakadunk (KUKA-041). A HTTP
  // határ ugyanezt kéri a sémában — a mag mégis ellenőrzi, mert egy jövőbeli HÍVÓ kihagyhatná
  // (KUKA-039: a közös feloldó helyessége nem bizonyítja, hogy minden hívó átadja).
  const idemKey = String(operationId ?? '').trim();
  if (!idemKey) {
    return frozen({
      ok: false, changed: false, reason: 'operation_id_required',
      message: 'az újbóli meghívás kiadásához MŰVELETI AZONOSSÁG kell (egy szándék = egy azonosság), '
        + 'hogy a hálózati újraküldés ne gyártson második ajánlatot',
    });
  }

  const out = effectuate(
    { store, clock, subjectId: deciderSubjectId, bookId, operation: 'alter_right', credentials },
    ({ at }) => {
      // (1/b) MÁR MEGTÖRTÉNT EZ A SZÁNDÉK? — a KAPU UTÁN, az írás ELŐTT (OON-01).
      //
      // A SORREND SZERZŐDÉS: a hatáskör-kapu (`effectuate`) ELŐBB dönt, tehát a kulcs
      // próbálgatása nem lesz létezés-csatorna (KUKA-084), és csak utána felel a rendszer arról,
      // hogy ez a szándék már lefutott-e. A VÁLASZ ALAKJA mindkét ágon ugyanaz, a `replayed` mező
      // MONDJA MEG, melyik történt (nem a forma — R50 tanulsága a parancs-úton).
      const declared = frozen({
        subject_id: String(targetSubjectId), offered_role: String(offeredRole ?? ''), scope: String(scope),
      });
      const once = onceOnlyBegin({
        store, bookId, actor: deciderSubjectId, idemKey, operation: 'member.reinvite', declared,
      });
      if (once.state === 'refused') {
        return frozen({ ok: false, changed: false, reason: once.reason, at: once.at ?? null });
      }
      if (once.state === 'conflict') {
        return frozen({
          ok: false, changed: false, reason: 'operation_identity_conflict',
          message: 'ugyanaz a műveleti azonosság MÁS tartalommal érkezett — ez ütközés, nem ismétlés: '
            + 'egy új, tudatos ajánlathoz ÚJ azonosság kell',
        });
      }
      if (once.state === 'replay') {
        return frozen({ ok: true, changed: false, replayed: true, reason: 'reentry_offer_replayed', ...once.effect });
      }

      // (2) A KÖTÉSI PONT: a MA lezárt, legutóbbi időszak (PER-02).
      const closed = closedMembershipPeriodOf({ store, subjectId: targetSubjectId, bookId, at });
      if (closed.ok !== true) {
        return frozen({
          ok: false, changed: false, reason: `reentry_target_${closed.reason}`,
          message: closed.reason === 'membership_is_open'
            ? 'ennek a munkatársnak MA is él a tagsága — újbóli meghívásra nincs szükség'
            : 'ehhez a személyhez nincs olyan lezárt tagsági időszak, amire az újbóli belépés szólhatna',
        });
      }

      // A NÉGY HATÁR — EGY FELOLDÓBÓL (RNV-02, R134/F134-01). Ugyanezt hívja a VÉGLEGESÍTÉS is
      // (`invite.mjs` → `reentryAdmission`), tehát a kiadáskori és az elfogadáskori kizárás-készlet
      // NEM tud elcsúszni egymástól, és a nemleges válasz NEVE is azonos (KUKA-018 · KUKA-039).
      // A kötési pont feloldása UTÁN fut, hogy a válasz NEVEZHESSE, mit látott.
      const excl = reentryExclusionsAt({ store, subjectId: targetSubjectId, bookId, closed, nowIso: at });
      if (excl.ok !== true) {
        return frozen({
          ok: false, changed: false, reason: excl.reason, message: excl.message,
          next_step: excl.next_step ?? null, circle_id: excl.circle_id ?? null,
          checked: excl.checked,
        });
      }

      // (4) A HATÁLYOSULÁS LEGYEN KÉSŐBBI A ZÁRÓ MEGVONÁSNÁL.
      const atMs = instantMs(at);
      const closedMs = instantMs(closed.closed_at);
      if (!atMs.ok || !closedMs.ok) return frozen({ ok: false, changed: false, reason: 'reentry_time_undecidable' });
      if (atMs.ms <= closedMs.ms) {
        return frozen({
          ok: false, changed: false, reason: 'reentry_not_after_revocation',
          closed_at: closed.closed_at,
          message: 'az újbóli belépés hatálya nem lehet a megvonással egyidejű vagy korábbi — '
            + 'különben a két esemény ugyanazon a pillanaton állna, és a tagság nem lenne hatályos',
        });
      }

      // (3) A PLAFON, ÍRÁS NÉLKÜL (DCE-01).
      const ceilingOf = delegationCeilingOf({ store, subjectId: deciderSubjectId, bookId, at });
      if (!ceilingOf.ok) return frozen({ ok: false, changed: false, reason: ceilingOf.reason });
      if (!ceilingOf.roles.includes(offeredRole)) {
        return frozen({
          ok: false, changed: false, reason: 'outside_basis_roles', role: offeredRole,
          ceiling: frozen([...ceilingOf.roles]),
          message: `a te szerep-plafonod: ${ceilingOf.roles.join(' · ') || '(üres)'} — ezen kívül nem rendelkezel`,
        });
      }
      if (!ceilingOf.scopes.includes(scope)) {
        return frozen({
          ok: false, changed: false, reason: 'outside_basis_scopes', scope,
          ceiling: frozen([...ceilingOf.scopes]),
          message: `a te adatkör-plafonod: ${ceilingOf.scopes.join(' · ') || '(üres)'} — ezen kívül nem rendelkezel`,
        });
      }

      // AZ AJÁNLAT, A PECSÉT, AZ ALAP, A DÖNTÉS ÉS AZ EGYSZERI-HATÁS NYUGTÁJA EGY EGYSÉGBEN
      // (ATO-01, spec §5 · OON-01). Ha bármelyik bukik, a NYUGTA SEM marad — tehát egy bukott
      // kiadás NEM foglalja le az azonosságot, és a jogos újrapróbálás végigmegy (KUKA-122).
      const issue = atomicOutcome(store, () => {
        const basis = deriveDelegationBasis({ store, subjectId: deciderSubjectId, bookId, at });
        if (!basis.ok) refuseAndRollBack({ ok: false, changed: false, reason: basis.reason });
        const email = addressOfSubject(store, targetSubjectId);
        if (!email) {
          // A CÍM A SZEMÉLY TÁROLT TÉNYE, NEM KLIENS-BEMENET (spec §3: „Címváltozás vagy másik
          // személyhez átkerült e-mail nem lehet a korábbi személy tagságának átvételi útja").
          refuseAndRollBack({
            ok: false, changed: false, reason: 'reentry_target_has_no_address',
            message: 'ehhez a személyhez nincs tárolt e-mail cím, amire az új meghívás szólhatna',
          });
        }
        const issued = issueInviteUnderBasis({
          store, token, bookId, inviteeNamespace: 'email', inviteeValue: email, offeredRole, scope,
          issuerSubject: deciderSubjectId, expiresAt, basisId: basis.basis_id, issuedAt: at,
        });
        if (!issued.ok) refuseAndRollBack({ ok: false, changed: false, reason: issued.reason, ceiling: basis.limit });
        const res = store.run(
          `INSERT INTO membership_reentry (subject_id, book_id, token, closed_grant_event_id,
             closed_revocation_id, offered_role, decided_by, basis_id, basis_version, recorded_at, effective_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          targetSubjectId, bookId, token, Number(closed.grant_event_id), Number(closed.revocation_id),
          offeredRole, deciderSubjectId, basis.basis_id, Number(issued.basis_version ?? basis.version), at, at);
        if (res?.changes !== 1) refuseAndRollBack({ ok: false, changed: false, reason: 'reentry_row_not_created' });
        // A TÁROLT NYUGTA (OON-01): az ISMÉTLÉS EBBŐL felel, tehát ugyanazt az ajánlatot adja —
        // ugyanazzal a tokennel, jelölővel és lezárt időszakkal, ÚJ hatás nélkül.
        const effect = {
          token,
          reentry_id: Number(res.lastInsertRowid),
          closed_grant_event_id: Number(closed.grant_event_id),
          closed_revocation_id: Number(closed.revocation_id),
          basis_id: basis.basis_id, basis_version: Number(issued.basis_version ?? basis.version),
          invitee_value: email, offered_role: offeredRole, scope,
          requires_acceptance: true, restores_previous_scopes: false,
        };
        const once2 = onceOnlyCommit({
          store, bookId, actor: deciderSubjectId, idemKey, operation: 'member.reinvite',
          identity: once.identity, effect, at,
        });
        if (once2.ok !== true) refuseAndRollBack({ ok: false, changed: false, reason: once2.reason });
        return frozen({
          ok: true, changed: true, reason: 'reentry_offer_issued', replayed: false, ...effect,
        });
      });
      // A KÉT VALÓDI KAPCSOLAT VERSENYE: a vesztes NEM ír másodszor, hanem a GYŐZTES ajánlatát
      // adja vissza ISMÉTLÉSKÉNT — így a két kérésből EGY üzleti hatás lesz, és mindkét nyugta
      // IGAZAT mond (KUKA-129 · KUKA-139: egy zár, amit a másik fél nem vesz fel, nem zár).
      if (issue && issue.ok !== true && issue.reason === 'once_only_race') {
        const again = onceOnlyBegin({
          store, bookId, actor: deciderSubjectId, idemKey, operation: 'member.reinvite',
          declared: frozen({
            subject_id: String(targetSubjectId), offered_role: String(offeredRole ?? ''), scope: String(scope),
          }),
        });
        if (again.state === 'replay') {
          return frozen({ ok: true, changed: false, replayed: true, reason: 'reentry_offer_replayed', ...again.effect });
        }
        if (again.state === 'conflict') {
          return frozen({
            ok: false, changed: false, reason: 'operation_identity_conflict',
            message: 'ugyanaz a műveleti azonosság MÁS tartalommal érkezett — ez ütközés, nem ismétlés',
          });
        }
      }
      return issue;
    });

  if (!out.authorized) {
    return frozen({
      ok: false, changed: false, reason: out.right.reason,
      message: `${out.right.message ?? ''} Az újbóli meghíváshoz \`alter_right\` hatáskör kell — `
        + 'ugyanaz, mint a tagság megvonásához; a puszta tagság nem elég.',
    });
  }
  return out.value;
}

/** A SZEMÉLY TÁROLT CÍME — a kliens NEM adhatja meg (spec §3). Több élő címnél fail-closed. */
/**
 * A SZEMÉLY EGYETLEN TÁROLT CÍME — ÍRÁS-MENTES FELOLDÓ, ÉS MOSTANTÓL MEGKÉRDEZHETŐ (R186 §5).
 *
 * MIÉRT EXPORT. A `reinviteMember` ezzel dönti el, van-e cím, amire az új meghívás szólhat: HA
 * nincs pontosan EGY élő e-mail azonossága a személynek, az újbóli meghívás `reentry_target_has_no_address`
 * okkal elutasít. A felkínálás viszont eddig ezt a feltételt NEM kérdezte meg, tehát a bemutató
 * egy olyan tagra is felkínálódott, akit a NEGYEDIK lépésen már nem lehet újra meghívni — MIKÖZBEN
 * a HARMADIK lépés a tagságát MÁR megszüntette (külső review, Codex, R186 — P2).
 *
 * Ami nem változik: a feltétel és a döntés egyetlen helyen áll (`KUKA-003` · `KUKA-039`), és a
 * feloldó most sem ír — csak elolvasható lett (`KUKA-207`: amit próba nem tud MEGHÍVNI, azt
 * bizalomból hisszük).
 */
export function addressOfSubject(store, subjectId) {
  const rows = store.all(
    `SELECT value_raw FROM external_id
       WHERE subject_id = ? AND namespace = 'email' AND (valid_to IS NULL OR valid_to = '')
       ORDER BY rowid`, subjectId);
  if (rows.length !== 1) return null;
  return rows[0].value_raw;
}

/**
 * EGY ADATKÖRI JOG MEGVONÁSA EGY TAGTÓL — RÉSZLEGESEN, A TAGSÁG ÉRINTÉSE NÉLKÜL (SCR-01, R121 §2).
 *
 * A LELET, AMIT EZ JAVÍT. A felületen eddig EGYETLEN "visszavonás" létezett: a
 * `/api/members/revoke`, ami a TELJES tagságot és a delegálási alapot szüntette meg. Ha a kezelő
 * csak az ÁRAT akarta elvenni a raktári munkatárstól, a rendszer az egész céges tagságát vitte —
 * vagyis a felhasználó szándékához (`egy jog`) a legközelebbi elérhető művelet egy NAGYSÁGRENDDEL
 * tágabb hatás volt. Ez a KUKA-002 alakja a MŰVELETEKEN: két különböző szándék egy gombon.
 *
 * MIÉRT NEM ELÉG A NYERS TÁROLÓ-SEGÉD. A `revokeReadScope` (scopeGrant.mjs) ÍR, de hatáskört NEM
 * kérdez — pontosan úgy, ahogy a `revokeMembership` sem kérdezett az R60 előtt. Egy publikus
 * HTTP-út nem hívhatja közvetlenül: az a "bárki megvonhatná" alakja lenne (KUKA-047 · KUKA-084).
 * Ezért a nyers író BELSŐ marad, és EZ a művelet a felhatalmazott kapu.
 *
 * A NÉGY KAPU, MIND A VÉGLEGESÍTÉSI PONTON (R121 §2). Az `effectuate` EGYSZER olvas órát, és
 * ugyanazt az `at`-ot adja a döntésnek ÉS a hatásnak — tehát a jog a hatás SAJÁT bélyegén áll
 * fenn, nem egy korábbi óraolvasáson (EFF-01 · R77/F01):
 *   1. az eljáró `alter_right` hatásköre  — ugyanaz a művelet-név, mint a tagság-megvonásnál;
 *   2. a CÉL aktuális tagsága             — nem tag embernek nincs mit elvenni;
 *   3. az eljáró DELEGÁLÁSI PLAFONJA      — amit ő maga nem kaphatott meg, azon nem is rendelkezik;
 *   4. az adatkör a ZÁRT szótárból való   — szabad szöveg némán nem oldódik fel (KUKA-236).
 *
 * "A JOGOSULATLAN TAG SAJÁT MAGÁNAK SEM" (R121 §2): a hatáskör-kapu nem ismer kivételt a célra —
 * ha az eljárónak nincs `alter_right`-ja, a saját sorára sem írhat ezen az adminisztratív úton.
 *
 * AZ IDEMPOTENCIA ÜZLETI, NEM HTTP-SZINTŰ (R121 §2: "dupla kattintás és hálózati újraküldés ne
 * gyártson több üzleti változást"). Ha a jog MA amúgy sincs meg, NEM írunk újabb megvonás-sort:
 * a válasz `changed: false`, nevezett okkal. Így a kétszer megnyomott gomb ugyanazt a végállapotot
 * adja EGY naplósorral — és a nyugta IGAZAT mond arról, hogy történt-e változás (KUKA-129).
 *
 * AMIT EZ A MŰVELET SOHA NEM TESZ: nem nyúl a tagsághoz, a szerephez, a többi adatkörhöz, más
 * alanyhoz és más könyvhöz; és nem TÖRÖL korábbi eseményt — a megvonás ÚJ sor a két idő-tengelyen
 * (R51/F51-01), tehát a történeti nézet a megvonás előtti napra továbbra is a megadást mutatja.
 */
export function revokeScopeFromMember({ store, clock, revokerSubjectId, bookId, targetSubjectId, scope, credentials }) {
  if (typeof scope !== 'string' || !KNOWN_DATA_SCOPES.includes(scope)) {
    return frozen({
      ok: false, changed: false, reason: 'unknown_data_scope',
      message: `a(z) ${JSON.stringify(scope)} nem a tartalom zárt adatkör-szótárából való — `
        + `választható: ${KNOWN_DATA_SCOPES.join(' · ')}`,
    });
  }
  if (!targetSubjectId || !bookId) return frozen({ ok: false, changed: false, reason: 'subject_and_book_required' });

  const out = effectuate(
    { store, clock, subjectId: revokerSubjectId, bookId, operation: 'alter_right', credentials },
    ({ at }) => {
      const m = membershipAsOf({ store, subjectId: targetSubjectId, bookId, validAt: at, knownAt: at });
      if (m.effective !== true) {
        return frozen({ ok: false, changed: false, reason: 'target_not_a_member', detail: m.reason });
      }
      // A PLAFON A VÉGLEGESÍTÉSI PONTON (ORG-N1b): az eljáró a SAJÁT átvitt korlátján belül
      // rendelkezhet. A hiányzó alap NEM "nincs korlát", hanem nevezett elakadás (KUKA-124/2).
      //
      // ÉS A PLAFON KÉRDÉSE ÍRÁS NÉLKÜL FUT (DCE-01 · R123/F123-01). A régi alak a
      // `deriveDelegationBasis`-t hívta — az pedig RÖGZÍT, ha a plafon változott vagy még nem
      // volt alap —, és csak UTÁNA ellenőrizte a plafont: így a plafonon TÚLI, tehát ELUTASÍTOTT
      // megvonás is ÚJ `authority_basis` verziót írt (mérve: 3 → 4, üres megvonás-tábla mellett).
      // A megvonáshoz nem is kell RÖGZÍTETT delegálási alap: a megvonás nem a delegálási alap
      // ALATT születik, hanem az `alter_right` hatáskörön — a plafon itt KORLÁT, nem jogcím.
      const ceilingOf = delegationCeilingOf({ store, subjectId: revokerSubjectId, bookId, at });
      if (!ceilingOf.ok) return frozen({ ok: false, changed: false, reason: ceilingOf.reason });
      const ceiling = ceilingOf.scopes;
      if (!ceiling.includes(scope)) {
        return frozen({
          ok: false, changed: false, reason: 'outside_basis_scopes', scope, ceiling: frozen([...ceiling]),
          message: `a te adatkör-plafonod: ${ceiling.join(' · ') || '(üres)'} — ezen kívül nem rendelkezel`,
        });
      }
      // ÜZLETI IDEMPOTENCIA: ha ma nincs joga, nincs mit elvenni — és nem írunk fölösleges sort.
      // R132 — AZ IDEMPOTENCIA IS A MAI IDŐSZAKRA KÉRDEZ (SGP-01). Enélkül egy korábbi, LEZÁRT
      // időszak jog-sora „megadott"-nak látszana, és a kezelő megvonása `changed:false`-ot adna egy
      // olyan jogra, ami ma amúgy sem él — a nyugta hazudna arról, mi történt (KUKA-129).
      const cur = readScopeGrantAt({
        store, subjectId: targetSubjectId, bookId, scope, validAt: at, knownAt: at,
        periodGrantEventId: m.period_grant_event_id ?? null,
      });
      if (cur.granted !== true) {
        return frozen({ ok: true, changed: false, scope, reason: cur.reason ?? 'scope_not_granted' });
      }
      // AZ ÍRÁS OSZTHATATLAN EGYSÉGBEN (ATO-01 · R123/F123-02): ami itt születik, EGYÜTT marad
      // vagy EGYÜTT tűnik el. A NEVEZETT tárolási kudarc (nulla írt sor) visszagörget, és
      // ÉRTÉKKÉNT jön vissza — a hívó szerződése (`ok:false, changed:false`, nevezett ok)
      // változatlan, de sikertelen művelet nyoma nem marad a tárolóban.
      //
      // AMIT EZ AZ ÁG MA NEM BIZONYÍT, KIMONDVA. A DCE-01 javítás után ezen az úton EGYETLEN írás
      // áll (`revokeReadScope` egy sort szúr be), tehát itt nincs mit visszagörgetni: a burkolat
      // VÉDELEM a jövőbeli hozzáadás ellen, nem MÉRT viselkedés-különbség — a rontása (M312)
      // ezen az ágon TÚLÉLT, és ezt nem takarjuk el. Az ATO-01 mérhető bizonyítéka a MEGADÁSI
      // ágon áll, ahol valóban KÉT írás van (alap-rögzítés + jog-sor). Ez a sor azért marad, hogy
      // a szerződés EGY alakban éljen mindkét íróban (KUKA-003) — de a hatását itt nem
      // állítjuk mértnek (KUKA-207: amit próba nem tud megbuktatni, azt bizalomból hisszük).
      return atomicOutcome(store, () => {
        const r = revokeReadScope({
          store, subjectId: targetSubjectId, bookId, scope, at,
          effectiveAt: at, recordedAt: at, actorSubjectId: revokerSubjectId,
        });
        if (!r.ok) refuseAndRollBack({ ok: false, changed: false, reason: r.reason, scope });
        return frozen({
          ok: true, changed: true, scope, revocation_id: r.id,
          effective_at: r.effective_at, recorded_at: r.recorded_at,
        });
      });
    });

  if (!out.authorized) {
    return frozen({
      ok: false, changed: false, reason: out.right.reason,
      message: `${out.right.message ?? ''} Egy adatkör visszavonásához \`alter_right\` hatáskör kell — `
        + 'ugyanaz, mint a tagság megvonásához; a puszta tagság nem elég.',
    });
  }
  return out.value;
}

/** A MEGVONT TAG DELEGÁLÁSI ALAPJA IS MEGSZŰNIK — a függő meghívói nem élhetik túl (R63 §5.3/9). */
export function revokeDelegationsOf({ store, subjectId, bookId, at }) {
  const basisId = delegationBasisId(bookId, subjectId);
  const r = revokeAuthorityBasis({ store, basisId, bookId, at });
  if (!r.ok && r.reason === 'no_recorded_basis') return frozen({ ok: true, changed: false, reason: 'no_delegation_basis' });
  return r;
}
