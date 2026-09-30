// v3ref/legacyAccountFixture.mjs — A RÉGI, v1 INDULÁSI SZABÁLLYAL SZÜLETETT FIÓK ALAKJA.
//
// MIÉRT KELL, ÉS MIÉRT ITT ÁLL. Az R123 kikötése (F123-01): a plafon-korlátot „valódi, szűk alapú
// fixture-rel" kell mérni, és a régi, tárolt v1 fiók változatlanságát is „valódi fixture-rel, nem
// csak konstans-lista egyezéssel". A MAI `createWorkspace` viszont — helyesen — CSAK a MAI
// (`STARTUP_RULE`, ma v2) szabályt írja: új v1 fiók nem is születhet. A v1 fiók tehát TÖRTÉNETI
// állapot, amit MÉRNI kell tudni, de GYÁRTANI a termékben nem szabad.
//
// AMIT EZ A FIXTURE NEM TESZ: nem ír kézzel összeállított adatkör-listát. A v1 plafona a
// DEKLARÁLT `STARTUP_RULE_V1`-ből jön — így ha a v1 deklarációja elmozdulna, a fixture is elmozdul
// vele, és nem egy hazudó másolatot igazolna vissza (KUKA-039: egy tény, egy otthon).
//
// AMIT KIMONDVA NEM ÁLLÍT: nem állítja, hogy a mai kód ilyen fiókot LÉTREHOZ — azt állítja, hogy
// egy ilyen TÁROLT fiókon a mai szabályok hogyan viselkednek. A `rule_version` a `workspace_bootstrap`
// sorban `v1` marad, pontosan mint egy 2026 nyarán nyitott fiókban.
//
// MIÉRT ITT ÁLL, A MAG FÁJÁBAN — ÉS MIÉRT NEM TERMÉK-BELÉPŐ. Ez PRÓBA-kellék. A `tests/` fa alá
// tettem először, mert oda tartozik fogalmilag — de MÉRT korlát döntött: a mutációs battéria a
// próba-futtatót egy ÁTMENETI könyvtárba másolja, és CSAK a `v3ref/` fát viszi magával
// (`mutate.mjs` → `cpSync(REF, …)`). Egy `../tests/…` import ott fel sem oldódik, tehát az
// alapvonal-kapu PIROS lett — vagyis a fixture a `tests/` alatt a mutációs mérést ELLEHETETLENÍTI.
// A top szinten viszont a forrás-lenyomatba is beleszámít (a futtató a `v3ref/*.mjs` fájlokat
// hasheli), tehát az elmozdulása nem tud észrevétlen maradni.
//
// AMI EBBŐL KÖVETKEZIK, KIMONDVA: ez NEM termék-belépő. Terméki kód (a `v3app/server.mjs` és a
// `v3ref/entryPoints.mjs` útjai) SOHA nem hívja — egy „csinálj nekem régi fiókot" művelet a
// felületen maga lenne a visszacsúszás (KUKA-092: a próba kényelme nem termék-jog). Hívói: a
// magreferencia próba-futtatója (`v3ref/run.mjs`) és az R123-as HTTP-battéria.
import { recordAuthorityBasis } from './authorityBasis.mjs';
import { grantMembership } from './bitemporal.mjs';
import { grantAdjudicationAuthority } from './adjudication.mjs';
import { grantReadScope } from './scopeGrant.mjs';
import { setEntitlementProfile } from './entitlement.mjs';
import { STARTUP_RULE_V1 } from './workspace.mjs';

/**
 * EGY v1 SZABÁLLYAL SZÜLETETT KÖNYV — ugyanazokkal a primitívekkel, mint a mai `createWorkspace`,
 * de a v1 DEKLARÁLT listáival. Egy tranzakcióban: ha bármelyik lépés bukik, semmi nem marad.
 *
 * @returns {{ok:true, book_id:string, basis_id:string, basis_version:number, rule_version:'v1',
 *            grant_event_id:number, scopes:readonly string[]}}
 */
export function createLegacyV1Workspace({ store, creatorSubjectId, bookId, name, at, plan = 'pro', rule = STARTUP_RULE_V1 }) {
  const basisId = `${rule.id}:${bookId}`;
  const clock = { now: () => at };
  return store.atomic(() => {
    store.run('INSERT INTO book (id, name) VALUES (?, ?)', bookId, name);
    const basis = recordAuthorityBasis({
      store, basisId, bookId, issuerSubject: creatorSubjectId, effectiveAt: at, recordedAt: at,
      allowedOperations: [...rule.operations], allowedRoles: [...rule.roles], allowedScopes: [...rule.scopes],
      evidenceRef: `${rule.id}:${rule.version} · creator=${creatorSubjectId} · fixture=legacy-account`,
    });
    if (!basis.ok) throw new Error(`createLegacyV1Workspace: az alap nem írható — ${basis.reason}`);
    const g = grantMembership({ store, subjectId: creatorSubjectId, bookId, role: rule.local_admin_role, at });
    if (!g.ok) throw new Error(`createLegacyV1Workspace: a tagság nem írható — ${g.reason}`);
    store.run(
      `INSERT INTO workspace_bootstrap (book_id, creator_subject_id, grant_event_id, basis_id, basis_version, rule_version, recorded_at)
       VALUES (?,?,?,?,?,?,?)`,
      bookId, creatorSubjectId, g.grant_event_id, basisId, basis.version, rule.version, at);
    grantAdjudicationAuthority({ store, subjectId: creatorSubjectId, bookId, operation: 'alter_right', clock, basisId });
    for (const scope of rule.scopes) {
      const sg = grantReadScope({
        store, subjectId: creatorSubjectId, bookId, scope, basisId, basisVersion: basis.version,
        grantedBy: creatorSubjectId, effectiveAt: at, recordedAt: at, knownAt: at,
      });
      if (!sg.ok) throw new Error(`createLegacyV1Workspace: az adatköri jog nem írható — ${sg.reason}`);
    }
    const ent = setEntitlementProfile({ store, bookId, plan, at });
    if (!ent.ok) throw new Error(`createLegacyV1Workspace: az előfizetési profil nem írható — ${ent.reason}`);
    return Object.freeze({
      ok: true, book_id: bookId, basis_id: basisId, basis_version: basis.version,
      rule_version: rule.version, grant_event_id: g.grant_event_id, scopes: Object.freeze([...rule.scopes]),
    });
  });
}
