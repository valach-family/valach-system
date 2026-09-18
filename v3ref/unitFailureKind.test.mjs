// UFK-01 · UFK-02 — A NEM-NULLA EGYSÉG OKA ÉS A TANÚ HITELESSÉGE (R32 §B3 · R35/F35-01).
// A `--units-auto` mód CSAK az IDŐ miatt bukott egységet oszthatja finomabbra. Ha a TARTALMI vagy az
// ISMERETLEN okú bukást is „lassúnak" minősítené, a darabolás elfedne egy valódi mag-hibát — a zöld
// battéria akkor nem védelem, hanem takaró (KUKA-049 · KUKA-093: a kihagyás nem zöld).
import assert from 'node:assert/strict';
import test from 'node:test';
import { unitFailureKind, freshUnitWitness } from './unitFailureKind.mjs';

const wall = (ms, budget = 12000) => ({ ms, budget_ms: budget, external_cap_ms: 15000 });

test('IDŐ: tiszta szelet + érvényes, TÚLLÉPŐ idő-tanú', () => {
  assert.equal(unitFailureKind({ slice_clean: true, wall: wall(12406) }), 'too_slow');
});
test('TARTALOM: a bukott szelet SOHA nem lassú — akkor sem, ha túl is lépett', () => {
  assert.equal(unitFailureKind({ slice_clean: false, wall: wall(12406) }), 'content');
  assert.equal(unitFailureKind({ slice_clean: false, wall: wall(500) }), 'content');
  assert.equal(unitFailureKind({ slice_clean: false }), 'content');
});
// ── R35/F35-01: A HIÁNYZÓ TISZTASÁG-TANÚ NEM IDŐ ────────────────────────────────────────────────
// Az első alakom csak a szigorúan `false` értéket kezelte tartalomként, ezért a HIÁNYZÓ, a `null` és
// a szöveges tanú mellett is IDŐT mondott. A saját próbám nem fogta meg, mert minden „nincs tanú"
// esetem az IDŐ-tanút hagyta el, a TISZTASÁGÉT soha (KUKA-054).
test('F35-01: érvénytelen vagy hiányzó TISZTASÁG-tanú ⇒ unknown, nem too_slow', () => {
  for (const bad of [undefined, null, 'false', 'true', 0, 1, {}, []]) {
    const u = { wall: wall(13000) };
    if (bad !== undefined) u.slice_clean = bad;
    assert.equal(unitFailureKind(u), 'unknown', `slice_clean=${JSON.stringify(bad)}`);
  }
});
test('érvénytelen vagy hiányzó IDŐ-tanú ⇒ unknown, tiszta szelet mellett is', () => {
  for (const w of [undefined, null, 'gyors', {}, { ms: 'sok', budget_ms: 12000 },
    { ms: 13000 }, { ms: -1, budget_ms: 12000 }, { ms: 13000, budget_ms: 0 }]) {
    const u = { slice_clean: true };
    if (w !== undefined) u.wall = w;
    assert.equal(unitFailureKind(u), 'unknown', JSON.stringify(w));
  }
});
test('befért, mégis bukott ⇒ unknown — nem mentegetjük', () => {
  assert.equal(unitFailureKind({ slice_clean: true, wall: wall(9000) }), 'unknown');
  assert.equal(unitFailureKind({ slice_clean: true, wall: wall(12000) }), 'unknown');  // = a korlát, nem fölötte
});
test('nem objektum bemenet ⇒ unknown', () => {
  for (const bad of [null, undefined, 'x', 7, []]) assert.equal(unitFailureKind(bad), 'unknown');
});

// ── UFK-02 — A TANÚ FRISSESSÉGE ÉS AZONOSSÁGA ───────────────────────────────────────────────────
const START = Date.parse('2026-09-18T06:00:00.000Z');
const unitFile = (over = {}) => ({ unit: { k: 2, n: 7 }, at: '2026-09-18T06:00:05.000Z',
  slice_clean: true, wall: wall(13000), ...over });

test('UFK-02: a FRISS, azonos egységhez tartozó tanú elfogadva', () => {
  const w = freshUnitWitness(unitFile(), { k: 2, n: 7, startedAt: START });
  assert.equal(w.ok, true);
  assert.equal(unitFailureKind(w.unit), 'too_slow');
});
test('UFK-02: a KORÁBBI futás tanúja nem indokolhat újradarabolást', () => {
  const w = freshUnitWitness(unitFile({ at: '2026-09-18T05:59:59.000Z' }), { k: 2, n: 7, startedAt: START });
  assert.equal(w.ok, false);
  assert.match(w.why, /KORÁBBI futásé/);
});
test('UFK-02: MÁS egység tanúja nem fogadható el', () => {
  for (const u of [{ k: 3, n: 7 }, { k: 2, n: 14 }, null]) {
    assert.equal(freshUnitWitness(unitFile({ unit: u }), { k: 2, n: 7, startedAt: START }).ok, false);
  }
});
test('UFK-02: hiányzó fájl · értelmezhetetlen időbélyeg · hiányzó kezdet ⇒ nem tanú', () => {
  assert.equal(freshUnitWitness(null, { k: 2, n: 7, startedAt: START }).ok, false);
  assert.equal(freshUnitWitness(unitFile({ at: 'tegnap' }), { k: 2, n: 7, startedAt: START }).ok, false);
  assert.equal(freshUnitWitness(unitFile(), { k: 2, n: 7 }).ok, false);
});
