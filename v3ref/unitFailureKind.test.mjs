// UFK-01 — A NEM-NULLA EGYSÉG OKÁNAK MEGKÜLÖNBÖZTETÉSE (R32 §B3 ellenpárja).
// A `--units-auto` mód CSAK az IDŐ miatt bukott egységet oszthatja finomabbra. Ha a TARTALMI bukást
// is „lassúnak" minősítené, a darabolás elfedne egy valódi mag-hibát — a zöld battéria akkor nem
// védelem, hanem takaró (KUKA-049 · KUKA-093: a kihagyás nem zöld).
import assert from 'node:assert/strict';
import test from 'node:test';
import { unitFailureKind } from './unitFailureKind.mjs';

const wall = (ms, budget = 12000) => ({ ms, budget_ms: budget, external_cap_ms: 15000 });

test('a TÚLLÉPŐ, de tartalmilag tiszta szelet: IDŐ — ezen a darabolás segít', () => {
  assert.equal(unitFailureKind({ slice_clean: true, wall: wall(12406) }), 'too_slow');
});
test('a TARTALMILAG bukott szelet SOHA nem minősül lassúnak — akkor sem, ha túl is lépett', () => {
  assert.equal(unitFailureKind({ slice_clean: false, wall: wall(12406) }), 'content');
  assert.equal(unitFailureKind({ slice_clean: false, wall: wall(500) }), 'content');
});
test('ami BEFÉRT és mégis bukott: ISMERETLEN — nem mentegetjük', () => {
  assert.equal(unitFailureKind({ slice_clean: true, wall: wall(9000) }), 'unknown');
});
test('nincs tanú ⇒ ISMERETLEN: hiányzó egység-fájl · hiányzó falióra · nem-szám', () => {
  for (const bad of [null, undefined, 'x', {}, { slice_clean: true },
    { slice_clean: true, wall: {} }, { slice_clean: true, wall: { ms: 'sok', budget_ms: 12000 } }]) {
    assert.equal(unitFailureKind(bad), 'unknown');
  }
});
