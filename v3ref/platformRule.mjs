// V3 MAGREFERENCIA — PRL-01: A VÉDETT RENDSZERÜZEMELTETŐI KIINDULÓ SZABÁLY (R63 §4).
//
// MIÉRT SZÜLETETT. Az R63 kimondja: „Bírálati/felülvizsgálati hatáskör: nevezett, erre jogosult
// delegáló vagy külön védett rendszerüzemeltetői kiinduló szabály kell. Sima regisztráció vagy
// saját munkatér-létrehozás nem ad globális bírálói jogot. A helyi admin és platformbíráló nem
// olvad össze." Ugyanebben a körben a hatáskör MEGADÁSA alap nélkül ZÁR (`basis_id_required`) és a
// HASZNÁLAT alap nélküli soron ZÁR (`authority_without_recorded_basis`) — tehát a platformbírálói
// hatáskörnek is kell egy NEVEZETT, verziózott alap. Ez az.
//
// MI EZ, ÉS MI NEM. Ez a platform SAJÁT kiinduló szabálya: a rendszerüzemeltető adja, könyvenként,
// és a bizonyíték-hivatkozása magát a szabályt nevezi meg. NEM felhasználói művelet: az első
// felhasználói folyamatban (v3app) SEMMILYEN út nem hívja — sem a regisztráció, sem a saját
// munkakörnyezet létrehozása, sem a meghívó nem tud platformbírálói hatáskört adni. A próbák
// (mérési előkészítők) ezt hívják, hogy a bírálati utakat MÉRNI lehessen — ez a GPR-01 tábla
// `measurement_fixture` besorolásának megfelelő, KIMONDOTT használat, nem kiskapu.
//
// PURE + a tároló SAJÁT íróin megy (recordAuthorityBasis · grantAdjudicationAuthority) — nyers
// INSERT nincs benne, tehát ugyanazon a kapun át születik, mint bármely más alap.

import { recordAuthorityBasis, basisAsOf } from './authorityBasis.mjs';
import { grantAdjudicationAuthority, ADJUDICATION_OPS } from './adjudication.mjs';

const frozen = (o) => Object.freeze(o);

/** A SZABÁLY NEVE ÉS VERZIÓJA — ez kerül a bizonyíték-hivatkozásba, nem egy szabad szöveg. */
export const PLATFORM_RULE = frozen({
  id: 'platform-rule',
  version: 'v1',
  issuer_subject: 'platform',
  what: 'a rendszerüzemeltető kiinduló szabálya: platformbírálói hatáskör (suspend · adjudicate · '
    + 'alter_right) NEVEZETT alappal, könyvenként — felhasználói út ezt nem hívja',
});

/** Az alap azonosítója egy könyvre — egy fogalom, egy képző (KUKA-036). */
export function platformBasisId(bookId) {
  return `${PLATFORM_RULE.id}:${bookId}`;
}

/**
 * A PLATFORMBÍRÁLÓI ALAP RÖGZÍTÉSE egy könyvre. Idempotens: ha már áll, a hatályos verziót adja
 * vissza `recorded: false` jelöléssel — nem ír második, azonos alapot (KUKA-074 tükre: a meglévő
 * és helyes tényt nem duplikáljuk).
 */
export function seedPlatformReviewBasis({ store, bookId, at, operations = ADJUDICATION_OPS }) {
  if (typeof bookId !== 'string' || !bookId.trim()) return frozen({ ok: false, reason: 'book_id_required' });
  const basisId = platformBasisId(bookId);
  const existing = basisAsOf({ store, basisId, bookId, validAt: at, knownAt: at });
  if (existing.in_effect === true) {
    return frozen({ ok: true, recorded: false, basis_id: basisId, version: existing.version });
  }
  const r = recordAuthorityBasis({
    store, basisId, bookId, issuerSubject: PLATFORM_RULE.issuer_subject,
    effectiveAt: at, recordedAt: at,
    allowedOperations: [...operations], allowedRoles: [], allowedScopes: [],
    evidenceRef: `${PLATFORM_RULE.id}:${PLATFORM_RULE.version}`,
  });
  if (!r.ok) return frozen({ ok: false, reason: r.reason });
  return frozen({ ok: true, recorded: true, basis_id: basisId, version: r.version });
}

/**
 * PLATFORMBÍRÁLÓI HATÁSKÖR ADÁSA — a nevezett alap alatt. A tényleges megadás a rendszer SAJÁT
 * íróján megy (`grantAdjudicationAuthority`), tehát a megadási kapu (mode: grant) itt is fut.
 */
export function grantPlatformReviewAuthority({ store, subjectId, bookId, operation, clock }) {
  const at = clock.now();
  const seed = seedPlatformReviewBasis({ store, bookId, at });
  if (!seed.ok) return frozen({ ok: false, reason: seed.reason });
  grantAdjudicationAuthority({ store, subjectId, bookId, operation, clock, basisId: seed.basis_id });
  return frozen({ ok: true, basis_id: seed.basis_id, version: seed.version });
}
