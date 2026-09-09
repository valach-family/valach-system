// V3 MAGREFERENCIA — HATÓKÖRÖS FELÜLVIZSGÁLATOK (R42 §1).
//
// MIÉRT NEM EGY `verified_by` MEZŐ. Az R42 kimondta: *„Az összesítő, hatókör nélküli `verified_by`
// maradjon üres, amíg a rekord nem különbözteti meg ezeket."* Igaza van, és a saját szabályunk is ez
// (KUKA-041: a díszpipa sikert jelent arról, ami meg sem történt). Egy „ellenőrizte: X" pecsét a
// próba TELJES címére vonatkozónak látszik, holott a felülvizsgálat csak egy RÉSZÁLLÍTÁST fogadott
// el — és az olvasó a pecsétet hiszi el, nem a lábjegyzetet.
//
// Ezért minden felülvizsgálat KÜLÖN rekord, és mindegyik megmondja:
//   · KI vizsgálta és MELYIK körben (`reviewed_by`, `review_ref`)
//   · MELYIK forrás-állapoton (`source_commit`) — más commiten a rekord nem érvényes
//   · MI az ÍTÉLET és MEDDIG tart (`verdict`, `scope`)
//   · a TELJES forgatókönyv hitelesítve van-e (`full_scenario_verified`) — ez szinte mindig `false`
//   · a KAPU lezárult-e (`gate_closed`) — a felülvizsgálat NEM zár kaput
//
// A `residual` mező a legfontosabb: a felülvizsgáló SAJÁT szavaival mondja meg, mi MARADT KI.
// Enélkül a rekord ugyanaz a hatókör nélküli pecsét volna, csak több mezővel.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak adat.

export const REVIEW_CONTRACT_ID = 'REV-01';

// Az a forrás-állapot, amelyen az alábbi felülvizsgálat készült. Ha a mai kód ettől eltér, a
// rekordok NEM a mai kódra vonatkoznak — ezt a `staleFor()` mondja ki, nem hallgatjuk el.
export const REVIEWS = Object.freeze([
  Object.freeze({
    probe_id: 'P-A04',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'azonos címzetti feltétel és azonos jogosulatlan néző mellett a fiók létezése nem '
      + 'változtathatja a kiadható választ — a visszaadott objektum JSON-alakjára',
    residual: 'nem méri a HTTP státuszt, fejlécet, redirectet, böngészőképet, háttérkérést vagy '
      + 'időzítést; működő fiókváltási utat sem igazol',
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A04b',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'partially_rejected',
    scope: 'az útválasztási részállítás elfogadva (az observeInvite két státusza)',
    residual: 'a „mindkét világban végigjut" cím NEM hitelesített: egyik világban sem vált be '
      + 'meghívót, nem hoz létre fiókot, nem jelentkezik be; a csatornabizonyítékot közvetlenül '
      + 'adatbázisba írja — tesztbemenet, nem hitelesítéspróba. Ellenpélda: Q10, Q11',
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'meglévő, megfelelően hitelesített fiók ÚJ TAGSÁGÁNAK esetére: az eredeti hitelesítő '
      + 'változatlan marad és új tagság jön létre',
    residual: 'nem igazolja az MFA, a másik fiók, a kibocsátói jog, a régi/visszavont tagság és a '
      + 'tranzakciós hibák kezelését. Ellenpélda: Q09–Q13',
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-K03-intent',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'a folytonossági CÉL elfogadva: a függő szándék tárolható és visszaolvasható',
    residual: 'teljes kézi felhasználói út NINCS hitelesítve — nincs valódi belépés, '
      + 'session-rotáció, sessionhöz kötött folytatás, lejárati teszt, több párhuzamos meghívó '
      + 'vagy visszatérési cél; a pending_intent csak created_at-ot tárol, a resumeIntent nem '
      + 'ellenőriz lejáratot',
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A08',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'EGY könyv, EGY aktor, LAPOS bemenet esetén az újrapróbálás és a visszavont tagság '
      + 'utáni kiadás ága helyes',
    residual: 'K07-re NEM elég: más könyv, beágyazott bemenet, műveletverzió, véglegesítés '
      + 'közbeni megvonás és kiadási leltár esetén eltérés. Ellenpélda: Q01–Q04, Q14–Q15',
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A14',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'a NEVEZETT, SZINTETIKUS frissességi profil részállításaként: friss bizonyíték kiesés '
      + 'alatt érvényes marad, elavult és ismerten visszavont nem',
    residual: 'a 24 óra TESZTPARAMÉTER, nem jogi/adminisztratív szabály; hibás idő, valódi '
      + 'hatálylejárat, ismeretlen osztály és jövőbeli tagság nincs kezelve; a megvonás → '
      + 'képviseleti lekérdezés kombináció hiányzik. Ellenpélda: Q05–Q08',
    full_scenario_verified: false,
    gate_closed: false,
  }),
]);

/** Egy próbához tartozó felülvizsgálatok (a rekordba ágyazva). */
export function REVIEWS_FOR(probeId) {
  return REVIEWS.filter((r) => r.probe_id === probeId);
}

/**
 * A felülvizsgálat a FORRÁS-ÁLLAPOTHOZ kötött. Ha a mai commit más, a rekord nem a mai kódra
 * vonatkozik — ezt ki kell mondani, mert különben a régi pecsét új kódot igazolna (KUKA-050:
 * az állítás elévül).
 */
export function staleFor(currentCommit) {
  if (!currentCommit) return REVIEWS.map((r) => ({ ...r, stale: 'ismeretlen mai commit' }));
  return REVIEWS.filter((r) => r.source_commit !== currentCommit)
    .map((r) => ({ ...r, stale: `a felülvizsgálat a ${r.source_commit.slice(0, 12)} állapoton készült` }));
}
