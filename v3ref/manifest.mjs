// V3 MAGREFERENCIA — A PRÓBAKÉSZLET KÜLSŐ SZERZŐDÉSE (MFT-01).
//
// MIÉRT SZÜLETETT (R45 §„A mérő öt fennmaradó hibaalakja", H03/H04):
//
// A mutációs eszköz eddig a FUTÁS EREDMÉNYÉBŐL olvasta ki, mely próbák léteznek. Ezért:
//   · H03 — a mutáns nem futtatott egyetlen próbát sem, csak a hat ismert azonosítóhoz adott
//     `SKIP` rekordot: a mérő MIND A TÍZ mutációt elkapottnak mondta, és 0-val zárt.
//   · H04 — a mutáns CSAK a bukott rekordokat írta ki: a hiányzó négy rekordot semmi nem vette
//     észre, tehát a hiányos eredménycsomag is „teljes bizonyítéknak" látszott.
//
// A közös ok: **a mérő a mért féltől kérdezte meg, mit KELLETT VOLNA mérnie.** Ez körkörös
// (KUKA-054): a rövidebb lista automatikusan új „teljes készletté" vált. Ezért a várt készlet
// innentől KÜLSŐ, a futás eredményétől FÜGGETLEN szerződés — ez a fájl.
//
// EZ NEM KÉZZEL LÉPTETETT DARABSZÁM (KUKA-045): nem azt mondjuk ki, hogy „hat próba van", hanem
// hogy MELYEK, NÉV SZERINT, és mindkét irányban egyeznie kell — hiányzó, ismétlődő és ISMERETLEN
// azonosító egyaránt mérőhiba. Új próba felvétele ezért tudatos szerződés-bővítés, nem mellékhatás.
//
// PURE + INERT: nincs futtatás, nincs I/O. Csak a szerződés.

export const MANIFEST_VERSION = 'v3ref-manifest-2';

/**
 * A VÁRT PRÓBÁK. Minden bejegyzés megnevezi az ÁLLÍTÁST is (`assertion`), amit a próba mér —
 * mert egy próbát nem az AZONOSÍTÓJA tesz megfelelő elkapóvá, hanem az, hogy a MEGFELELŐ ÁLLÍTÁS
 * bukik el (R45 H06: idegen infrastruktúra-kivétel ugyanazon a próbán NEM ugyanaz a bizonyíték).
 */
export const EXPECTED_PROBES = Object.freeze([
  Object.freeze({ id: 'P-A04', assertion: 'A04-two-worlds-byte-identical' }),
  Object.freeze({ id: 'P-A04b', assertion: 'A04b-mailbox-holder-gets-actionable-answer' }),
  Object.freeze({ id: 'P-K03-cred', assertion: 'K03-existing-credential-unchanged' }),
  Object.freeze({ id: 'P-K03-intent', assertion: 'K03-pending-intent-resumable' }),
  Object.freeze({ id: 'P-A08', assertion: 'A08-single-effect-and-today-right' }),
  Object.freeze({ id: 'P-A14', assertion: 'A14-evidence-freshness-profile' }),

  // ── A Q01–Q15 KÖR (D-VS-3007) ────────────────────────────────────────────────────────────────
  // Tíz új próba a tizenöt megnevezett maghibára, plusz a teljesség-kritika ÉLŐ leletére
  // (P-INVITE-window). A készlet KÜLSŐ szerződés: ha egy próba kiesik a futásból, az MÉRŐHIBA,
  // nem „kevesebb próba".
  Object.freeze({ id: 'P-CMD-namespace', assertion: 'Q01-command-key-is-scoped' }),
  Object.freeze({ id: 'P-CMD-identity', assertion: 'Q02Q03-identity-covers-nested-type-version' }),
  Object.freeze({ id: 'P-CMD-finalize', assertion: 'Q04-right-rechecked-before-write' }),
  Object.freeze({ id: 'P-CMD-disclosure', assertion: 'Q14Q15-every-release-is-ledgered' }),
  Object.freeze({ id: 'P-AUTHZ-opclass', assertion: 'Q07-unknown-op-class-denied' }),
  Object.freeze({ id: 'P-AUTHZ-membership-time', assertion: 'Q08-membership-validity-interval' }),
  Object.freeze({ id: 'P-AUTHZ-evidence', assertion: 'Q05Q06-evidence-three-axes' }),
  Object.freeze({ id: 'P-INVITE-window', assertion: 'INV-expired-invite-grants-nothing' }),
  Object.freeze({ id: 'P-INVITE-authority', assertion: 'Q09Q10Q13-redeem-gates' }),
  Object.freeze({ id: 'P-INVITE-effect', assertion: 'Q11Q12-real-effect-and-atomicity' }),
  Object.freeze({ id: 'P-AUTHZ-revoke-now', assertion: 'K09-immediate-revocation-pulls-forward' }),

  // ── A HAT HIÁNYZÓ ŐR (R49 · D-VS-3008) ───────────────────────────────────────────────────────
  // Sajat kezzel merve: a veglegesitesi kaput kitorolve a batteria 17/17 zold maradt, mikozben a
  // KULSO proba 30/30 -> 28/30 esett. A javitas legfontosabb fele orizetlen volt (KUKA-051).
  Object.freeze({ id: 'P-INVITE-finalize-gate', assertion: 'R49C02C03-redeem-gate-at-write-boundary' }),
  Object.freeze({ id: 'P-CMD-receipt', assertion: 'R50-finalization-receipt-is-durable-and-atomic' }),
  Object.freeze({ id: 'P-CMD-finalize-gate', assertion: 'R49-command-gate-at-write-boundary' }),
  Object.freeze({ id: 'P-AUTHZ-roles', assertion: 'R49C05-unknown-role-grants-nothing' }),
  Object.freeze({ id: 'P-CANON-shape', assertion: 'R49C08C10-canon-shape-closed' }),
  Object.freeze({ id: 'P-TIME-calendar', assertion: 'R49C09-calendar-fields-validated' }),
  Object.freeze({ id: 'P-IDENTITY-address', assertion: 'R49C07-bindings-are-not-subjects' }),
]);

export const EXPECTED_IDS = Object.freeze(EXPECTED_PROBES.map((p) => p.id));

/** Az állítás azonosítója egy próbához — a mutáció-szerződés ehhez méri, mi bukott el. */
export function assertionOf(probeId) {
  const p = EXPECTED_PROBES.find((x) => x.id === probeId);
  return p ? p.assertion : null;
}

/**
 * A KIMENETI ÁLLAPOTOK ZÁRT HALMAZA (R45 §„Javítási szerződés" 3. pont — típusos kimenetek).
 *
 * A régi alak EGYETLEN megkülönböztetést ismert: `PASS` vagy „nem PASS". Emiatt a `SKIP` és az
 * idegen kivétel is „bukott állításnak" számított (H03 · H06). Innentől mind külön név, és a
 * mutációs ítélet CSAK a `FAIL`-t fogadja el bizonyítéknak — a `THREW` is csak akkor, ha a
 * mutáció szerződése ELŐRE, hibakóddal és fázissal együtt kimondta.
 */
export const PROBE_STATUS = Object.freeze({
  PASS: 'PASS',                 // az állítás teljesült
  FAIL: 'FAIL',                 // a NEVEZETT állítás megbukott — ez a szabályos bizonyíték
  THREW: 'THREW',               // a próbán BELÜL kivétel keletkezett (hibakód + fázis kötelező)
  SKIP: 'SKIP',                 // a próba szándékosan kimaradt — NEM bukott állítás
  NOT_STARTED: 'NOT_STARTED',   // el sem indult — NEM bukott állítás
});

export const KNOWN_STATUSES = Object.freeze(Object.values(PROBE_STATUS));

/**
 * A KÉSZLET ELLENŐRZÉSE — a mérő EZT hívja, nem másolja le a szabályt (KUKA-009).
 * Mindkét irányban mér: hiányzó · ismétlődő · ISMERETLEN azonosító, és ismeretlen állapot.
 *
 * @param {Array<{probe_id:string,status:string}>} records
 * @returns {{ok:boolean, problems:string[]}}
 */
export function checkResultSet(records) {
  const problems = [];
  if (!Array.isArray(records)) return { ok: false, problems: ['a rekordok nem tömbben érkeztek'] };

  const seen = new Map();
  for (const r of records) {
    const id = r && r.probe_id;
    if (typeof id !== 'string' || !id) { problems.push('rekord azonosító nélkül'); continue; }
    seen.set(id, (seen.get(id) || 0) + 1);
  }

  const missing = EXPECTED_IDS.filter((id) => !seen.has(id));
  if (missing.length) problems.push(`HIÁNYZÓ tervezett próba: ${missing.join(', ')}`);

  const dup = [...seen.entries()].filter(([, c]) => c > 1).map(([id, c]) => `${id}×${c}`);
  if (dup.length) problems.push(`ISMÉTLŐDŐ rekord: ${dup.join(', ')}`);

  const unknown = [...seen.keys()].filter((id) => !EXPECTED_IDS.includes(id));
  if (unknown.length) problems.push(`ISMERETLEN próba a kimenetben: ${unknown.join(', ')}`);

  for (const r of records) {
    if (!r || !KNOWN_STATUSES.includes(r.status)) {
      problems.push(`ismeretlen állapot a(z) ${(r && r.probe_id) || '?'} rekordon: ${JSON.stringify(r && r.status)}`);
    }
    if (r && r.status === PROBE_STATUS.FAIL && !r.assertion_id) {
      problems.push(`a(z) ${r.probe_id} FAIL rekordján nincs állítás-azonosító (assertion_id)`);
    }
    if (r && r.status === PROBE_STATUS.THREW && (!r.error_code || !r.phase)) {
      problems.push(`a(z) ${r.probe_id} THREW rekordjáról hiányzik a hibakód vagy a fázis`);
    }
  }

  return { ok: problems.length === 0, problems };
}
