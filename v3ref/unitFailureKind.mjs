// A NEM-NULLA EGYSÉG KÉT OKBÓL JÖHET — ÉS A KETTŐT MEG KELL KÜLÖNBÖZTETNI (UFK-01).
//
// Ha egy egység nem nullával zár, az vagy IDŐ (a szelet nem fért a költségvetésbe — ezen a darabolás
// segít), vagy TARTALOM (a mag tényleg elbukott — ezen a darabolás NEM segít, és elfedni bűn). A
// döntés NEVEZETT feloldóban áll, hogy a próba UGYANAZT hívhassa, amit a futtató használ (KUKA-009).
//
// ── R35/F35-01 — AZ ELSŐ ALAKOM HIBÁS VOLT, ÉS EZ A JAVÍTÁSA ────────────────────────────────────
//
// Az R33-ban azt írtam, hogy „ami nem bizonyítottan idő, az NEM idő". A kód ezt NEM teljesítette:
// csak a szigorúan `false` tisztaság-tanút kezelte tartalomként, tehát a HIÁNYZÓ (`undefined`), a
// `null` és a szöveges `'false'` tanú mellett is IDŐT mondott — és ezzel finomítást engedett egy
// olyan egységre, amiről nem tudjuk, hogy tartalmilag tiszta volt-e. A saját próbám azért nem fogta
// meg, mert MINDEN „nincs tanú" esetem az IDŐ-tanút hagyta el, a TISZTASÁG-tanút soha (KUKA-054: a
// fixtúra a saját előfeltevésemet igazolta vissza).
//
// A SZABÁLY MOSTANTÓL: `too_slow` CSAK akkor, ha MINDKÉT tanú megvan és típushelyes —
// `slice_clean === true` (szigorúan logikai) ÉS érvényes idő-tanú, ami túl is lépett. A `false`
// TARTALOM. Minden más: `unknown` — és az `unknown` NEM finomítható, tehát a futtató megáll.
export function unitFailureKind(unit) {
  if (!unit || typeof unit !== 'object' || Array.isArray(unit)) return 'unknown';
  if (unit.slice_clean === false) return 'content';       // a szelet TARTALMILAG bukott
  if (unit.slice_clean !== true) return 'unknown';        // hiányzó · null · szöveg · szám ⇒ nincs tanú
  const w = unit.wall;
  if (!w || typeof w !== 'object') return 'unknown';
  if (!Number.isFinite(w.ms) || !Number.isFinite(w.budget_ms)) return 'unknown';
  if (w.ms < 0 || w.budget_ms <= 0) return 'unknown';     // értelmetlen idő-tanú nem tanú
  return w.ms > w.budget_ms ? 'too_slow' : 'unknown';     // befért, mégis bukott ⇒ ismeretlen
}

// ── A TANÚ FRISSESSÉGE ÉS AZONOSSÁGA (UFK-02, R35) ──────────────────────────────────────────────
//
// A futtató a gyermek egység-fájljából olvassa ki a bukás okát. Ha a gyermek úgy halt meg, hogy
// fájlt NEM írt, de ugyanazon a néven ott áll egy KORÁBBI futás eredménye, akkor a régi, zöld tanú
// indokolná az új, sikertelen futás újradarabolását — a mérés csendben zölddé minősülne (KUKA-052:
// az őr azt mérje, ami MOST van; KUKA-121: amit be lehet gépelni/örökölni, az nem mérés).
//
// Ezért a tanút ELŐBB hitelesíteni kell: ugyanahhoz az EGYSÉGHEZ tartozzon (k/n), és a futás
// ELINDULÁSA UTÁN keletkezzen. Ami nem hitelesíthető, az nem tanú — a válasz NEVEZETT `null`.
export function freshUnitWitness(raw, { k, n, startedAt } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, unit: null, why: 'nincs egység-fájl' };
  const u = raw.unit;
  if (!u || u.k !== k || u.n !== n) {
    return { ok: false, unit: null, why: `a tanú MÁS egységé (várt: ${k}/${n}, kapott: ${u ? `${u.k}/${u.n}` : 'nincs'})` };
  }
  const at = Date.parse(raw.at);
  if (!Number.isFinite(at)) return { ok: false, unit: null, why: 'a tanún nincs értelmezhető időbélyeg' };
  if (!Number.isFinite(startedAt)) return { ok: false, unit: null, why: 'a futás kezdete nincs megadva — a frissesség nem mérhető' };
  if (at < startedAt) {
    return { ok: false, unit: null, why: `a tanú KORÁBBI futásé (${raw.at}) — régi eredmény nem indokolhat újradarabolást` };
  }
  return { ok: true, unit: raw, why: null };
}
