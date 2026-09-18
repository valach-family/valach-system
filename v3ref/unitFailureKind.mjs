// A NEM-NULLA EGYSÉG KÉT OKBÓL JÖHET — ÉS A KETTŐT MEG KELL KÜLÖNBÖZTETNI (UFK-01).
//
// Ha egy egység nem nullával zár, az vagy IDŐ (a szelet nem fért a költségvetésbe — ezen a darabolás
// segít), vagy TARTALOM (a mag tényleg elbukott — ezen a darabolás NEM segít, és elfedni bűn). A
// döntés NEVEZETT feloldóban áll, hogy a próba UGYANAZT hívhassa, amit a futtató használ (KUKA-009);
// és ami nem bizonyítottan idő, az NEM idő: hiányzó egység-fájlra `unknown`, tehát nem mentegetünk.
export function unitFailureKind(unit) {
  if (!unit || typeof unit !== 'object') return 'unknown';        // nincs tanú ⇒ nem mentegetünk
  if (unit.slice_clean === false) return 'content';               // a szelet TARTALMILAG bukott
  const w = unit.wall;
  if (!w || !Number.isFinite(w.ms) || !Number.isFinite(w.budget_ms)) return 'unknown';
  return w.ms > w.budget_ms ? 'too_slow' : 'unknown';             // befért, mégis bukott ⇒ ismeretlen
}

