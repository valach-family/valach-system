/**
 * BND-01 — A FORRÁS-KÖTEG TARTALMI LENYOMATA, EGY OTTHONBAN (R39).
 *
 * MIÉRT KÖLTÖZÖTT IDE. Az algoritmus eddig a `mutate.mjs`-ben élt — azt viszont NEM lehet behúzni
 * anélkül, hogy a teljes battéria le ne futna, tehát a lenyomatot más olvasó nem tudta megkérdezni.
 * Emiatt a norma-lánc csomag generátora a mérés `base_digest` mezőjét EL SEM olvasta, és a külső
 * ellenőrző fél (chatgpt-v3, R39) ezt ki is használta: a RÉGI, hibás forrás-alakot visszaállítva,
 * a RÉGI mérési fájllal együtt, az összesítő VÁLTOZATLANUL „70 fedett"-et írt ki, kilépés 0-val.
 *
 * Egy fogalomnak egy otthona (KUKA-003 · KUKA-018): a `mutate.mjs` innen hívja, és minden további
 * olvasó is. Az algoritmus KARAKTERRE ugyanaz maradt — a `v3ref/*.mjs` fájlok név szerint rendezve,
 * név + NUL + tartalom + NUL sorrendben egy sha256-ba.
 *
 * PURE: csak olvas.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function digestOfBundle(dir) {
  const refDir = join(dir, 'v3ref');
  const files = readdirSync(refDir).filter((f) => f.endsWith('.mjs')).sort();
  const h = createHash('sha256');
  for (const f of files) { h.update(f); h.update('\0'); h.update(readFileSync(join(refDir, f))); h.update('\0'); }
  return `sha256:${h.digest('hex')}`;
}
