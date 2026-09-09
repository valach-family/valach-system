// V3 MAGREFERENCIA — K04 (engedély és frissesség) + K09 (megvonás) + K12 (kiesés).
//
// A K04 mércéje: „A jogosultsági döntés az összes releváns függőséget és lejáratot hordozza…
// Véglegesítéskor hiteles AKTUÁLIS helyi jogállapot kell; külső bizonyítékra a K12 profilja
// vonatkozik." A K09-é: „Érvényes biztonsági megvonás nem vár utódra."
// A K12-é: „elfogadott friss bizonyíték érvényes lehet szolgáltatói kiesés alatt is a rögzített
// határig… Megszűnt, lejárt vagy bizonyítottan visszavont alapra NINCS türelmi hosszabbítás."
//
// A döntés NEVEZETT alakot ad vissza (nem igent/nemet), hogy a képernyő meg tudja mondani, MIÉRT
// nem lehet (a mi KUKA-062-es tanulságunk: a jog-alapot nevezni kell).

// Jog-osztályok frissességi profilja (K12: „üres profilból nincs megengedő alapérték").
export const FRESHNESS_PROFILE = Object.freeze({
  // SAJÁT könyv: a helyi jogot minden használatnál ellenőrizzük, de nem függ külső forrástól.
  own_book: Object.freeze({ external_dependency: null, max_age_ms: null }),
  // MÁS nevében eljárás: külső megbízás-bizonyíték kell, meghatározott legnagyobb korral.
  representation: Object.freeze({ external_dependency: 'mandate_registry', max_age_ms: 24 * 3600 * 1000 }),
});

export function rightAt({ store, subjectId, bookId, opClass, clock, externalEvidence }) {
  const profile = FRESHNESS_PROFILE[opClass];
  if (!profile) return deny('unknown_op_class', 'ehhez a művelethez nincs frissességi profil');

  const m = store.get('SELECT * FROM membership WHERE subject_id = ? AND book_id = ?', subjectId, bookId);
  if (!m) return deny('no_membership', 'ehhez a könyvhöz nincs tagságod');

  // K09: a megvonás AZONNAL hat, és nem vár utódra.
  if (m.revoked_at && m.revoked_at <= clock.now()) {
    return deny('membership_revoked', 'a tagságod ehhez a könyvhöz vissza lett vonva');
  }

  // K12: külső bizonyíték csak akkor számít, ha a profil kéri.
  if (profile.external_dependency) {
    const ev = externalEvidence && externalEvidence[profile.external_dependency];
    if (!ev) return deny('evidence_missing', 'a képviselethez szükséges megbízás-bizonyíték nincs meg');
    if (ev.revoked) return deny('evidence_revoked', 'a megbízás-bizonyíték vissza lett vonva');
    const age = Date.parse(clock.now()) - Date.parse(ev.obtained_at);
    if (age > profile.max_age_ms) {
      return deny('evidence_stale', 'a megbízás-bizonyíték elavult, újat kell szerezni');
    }
    // A SZOLGÁLTATÓI KIESÉS önmagában NEM zár: érvényes, friss bizonyíték a határig él.
    return allow('representation_mandate', { evidence_age_ms: age, source_down: !!ev.source_down });
  }

  return allow('own_membership', { role: m.role });
}

function allow(basis, detail) { return Object.freeze({ allowed: true, basis, detail: Object.freeze(detail || {}) }); }
function deny(reason, message) { return Object.freeze({ allowed: false, basis: null, reason, message }); }

// K09: a megvonás KÜLÖN esemény, nem sor-törlés — a történet megmarad.
export function revokeMembership({ store, subjectId, bookId, clock }) {
  store.run('UPDATE membership SET revoked_at = ? WHERE subject_id = ? AND book_id = ? AND revoked_at IS NULL',
    clock.now(), subjectId, bookId);
}
