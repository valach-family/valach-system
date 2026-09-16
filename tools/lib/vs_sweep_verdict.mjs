/** SWV-01 — A SÖPRÉS FELSŐ SZINTŰ VERDIKT-SZERZŐDÉSE (OB-10 · R16 §2).
 *
 * MIÉRT SZÜLETETT. A söprés eddig a gyermek KIMENETÉNEK SZÖVEGÉBŐL döntött: ha a bukott ellenőrző
 * kimenetében BÁRHOL szerepelt az „ENV-KIHAGYÁS" szó, az EGÉSZ ellenőrzőt kihagyásnak minősítette.
 * A `verify:external-checks` jelentése viszont JOGOSAN tartalmazza ezt a szót (a 18 programjából
 * kettőt ő maga hagy ki, nevezett akadállyal) — így a verifier SAJÁT, szabályos jelentése nyelte el
 * a SAJÁT piros verdiktjét, és a kör riportja „0 pirosat" mondott egy piros lánc mellett.
 *
 * A SZERZŐDÉS NÉGY ÁLLAPOTA — és mindegyik KÜLÖN válasz (KUKA-124/2):
 *   · `green`      — az ellenőrző lefutott és NULLÁVAL zárt;
 *   · `env_skipped`— az ellenőrző NEM tudta elvégezni a dolgát, és ezt MAGA deklarálta, gépi alakban;
 *   · `failed`     — az ellenőrző lefutott és HIBÁT jelentett (ide esik minden nem deklarált eset);
 *   · `unfinished` — a söprés türelmén belül nem ért véget (ez NEM azt jelenti, hogy elbukott).
 *
 * A DÖNTŐ KÜLÖNBSÉG: a kihagyást a gyermeknek DEKLARÁLNIA kell, a kimenete UTOLSÓ, önálló sorában.
 * Egy beágyazott EMLÍTÉS a jelentés közepén nem deklaráció — pontosan ezt a különbséget hagyta el a
 * régi alak. „Hiba és kihagyás együtt nem lehet tiszta kihagyás": ha a gyermek nem deklarál, a
 * nem-nulla kilépés HIBA, akkor is, ha a szövegében szerepel a szó.
 *
 * AMIT EZ NEM CSINÁL — KIMONDVA. Nem ellenőrzi, hogy a gyermek IGAZAT mond-e a kihagyásról: a
 * deklaráció a gyermek felelőssége, és a söprés csak azt köti ki, hogy MONDJA KI, gépi alakban. A
 * bizonyított környezeti akadály fogalma külön szerződés (a külső-ellenőrző lánc `env_obstacle`
 * mezője azt méri, esetenként). Ez a modul azt zárja ki, hogy egy SZÓ döntsön egy VERDIKT helyett.
 */

export const SWEEP_VERDICTS = Object.freeze(['green', 'env_skipped', 'failed', 'unfinished']);

/** A gépi deklaráció alakja. Szándékosan feltűnő és egysoros — nem próza, hanem szerződés. */
export const VERDICT_MARKER = 'VS-SWEEP-VERDICT:';
const DECLARATION = /^VS-SWEEP-VERDICT:[ \t]+env_skipped[ \t]+reason=(\S.*)$/;

/**
 * A DEKLARÁCIÓ CSAK AZ UTOLSÓ, NEM ÜRES SORBAN ÉRVÉNYES.
 *
 * Miért így: a gyermek a jelentését a végén zárja le, tehát az utolsó sor az ÖSSZEGZÉSE. Egy
 * középre ágyazott sor lehet idézet, részlet-jelentés vagy épp egy MÁSIK, belső kihagyás — az
 * ilyet a régi alak összetévesztette a teljes verdikttel (KUKA-134 rokona: ami csak ELŐFORDUL,
 * az idézet; ami DEKLARÁL, az szerkezeti helyen áll).
 */
export function declaredVerdict(stdout) {
  const lines = String(stdout ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || '';
  if (!last.startsWith(VERDICT_MARKER)) return null;
  const m = DECLARATION.exec(last);
  if (!m) return Object.freeze({ kind: 'malformed', line: last });
  return Object.freeze({ kind: 'env_skipped', reason: m[1] });
}

/**
 * A FELSŐ SZINTŰ VERDIKT. A söprés EZT hívja — nem részszöveget keres.
 *
 * @param {{exitCode:number|null, timedOut:boolean, stdout:string}} run
 * @returns {{verdict:string, why:string, reason:string|null}}
 */
export function sweepVerdict({ exitCode, timedOut = false, stdout = '' }) {
  if (timedOut) {
    return Object.freeze({ verdict: 'unfinished', reason: null,
      why: 'a söprés türelmén belül nem ért véget — ez NEM bukás, külön kell lefuttatni' });
  }
  const declared = declaredVerdict(stdout);
  if (exitCode === 0) {
    // ELLENTMONDÁS: nullával zárt, mégis kihagyást deklarál. Az önmagának ellentmondó rekord nem
    // mérés (KUKA-122) — és a feloldás NEM mehet a megengedő irányba, mert akkor a ellentmondás
    // maga válna megkerülő úttá.
    if (declared && declared.kind === 'env_skipped') {
      return Object.freeze({ verdict: 'failed', reason: declared.reason,
        why: 'ELLENTMONDÁS: nullával zárt, mégis környezeti kihagyást deklarál — a két állítás nem állhat együtt' });
    }
    return Object.freeze({ verdict: 'green', reason: null, why: 'nullával zárt' });
  }
  if (declared && declared.kind === 'env_skipped') {
    return Object.freeze({ verdict: 'env_skipped', reason: declared.reason,
      why: 'a gyermek a kimenete UTOLSÓ sorában, gépi alakban deklarálta a környezeti akadályt' });
  }
  if (declared && declared.kind === 'malformed') {
    return Object.freeze({ verdict: 'failed', reason: null,
      why: `HIBÁS ALAKÚ deklaráció (${declared.line}) — a hibás alak nem kihagyás, hanem hiba` });
  }
  return Object.freeze({ verdict: 'failed', reason: null,
    why: 'nem nullával zárt, és NEM deklarált környezeti akadályt — a kimenetben szereplő szó nem verdikt' });
}

export const SWV_CONTRACT = Object.freeze({
  id: 'SWV-01',
  title: 'A söprés a gyermek GÉPI verdiktjéből dönt, nem a kimenete részszövegéből',
  verdicts: SWEEP_VERDICTS,
  marker: VERDICT_MARKER,
  origin: 'OB-10 · R16 §2 (chatgpt-v3)',
});
