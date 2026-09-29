// v3app/knowledge/stories.mjs — STR-01: AZ ÖT HASZNÁLATI TÖRTÉNET A KÖZÖS REGISZTERBEN (R112 §1–§4).
//
// MIÉRT VAN. Az R112 a meglévő funkciókat nem egyenként, hanem ÖSSZEFÜGGŐ UTAKKÉNT kéri használhatóvá és
// bemutathatóvá tenni: magánszemély · egyedül dolgozó vállalkozó · bővülő kisvállalkozás · több
// vállalkozásban dolgozó személy · kezelő és munkatárs. Egy út akkor „megvan", ha minden lépésének van
// SÚGÓJA, GYIK-je, bemutatója (vagy nevesített indoka), és a valódi alkalmazásban PRÓBA bizonyítja.
// Ezt eddig senki nem kötötte össze — egy-egy funkció rendben lehetett, miközben az út közepén hiányzott
// a segítség. Ez a fájl a KÖTÉS, gépi alakban; a SZAVAK a nyelvcsomagokban állnak (`STORY` csoport).
//
// AMIT EZ A FÁJL NEM TESZ: nem vezet be új jogosultsági modellt, új üzleti modult vagy új folyamatot
// (R112 §1). A történet a MEGLÉVŐ funkciók sorrendje; a döntéseket a szerver és a mag hozza.
//
// KI OLVASSA (KUKA-015): a `verify:tutor` STR-01 ellenőrzése (minden funkció működik, van súgója,
// GYIK-je, bemutatója vagy indoka; minden bizonyító próba PONTOSAN EGYSZER létezik) és a bemutató-
// generátor (`npm run docs:r89-bemutato` → a „Történetek" belépő). Mindkettő EZT a fájlt futtatja.
const F = (o) => Object.freeze(o);

/**
 * A BIZONYÍTÉK egy próba CÍMÉNEK ELEJE egy próbafájlban. Az elejére illesztünk, mert a ciklusban
 * született próbák címe a forrásban `${code}` helyőrzőt hordoz (pl. `R112-I1/${code} — …`), a futás
 * jelentésében pedig a nyelvkódot (`R112-I1/hu — …`) — a közös rész az eleje.
 */
const ev = (spec, title) => F({ spec: `tests/e2e/${spec}`, title });

export const STORIES = F([
  F({
    id: 'story.private',
    features: F(['auth.register', 'auth.verify', 'auth.login', 'account.personal', 'shell.language', 'auth.logout']),
    tours: F(['tour.register', 'tour.language']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '1. Anna regisztrál'),
      ev('v3app-core-flow.spec.mjs', '2. Anna a levél-fogadó hivatkozására kattint'),
      ev('v3app-core-flow.spec.mjs', '3. Anna belép'),
      ev('v3app-acceptance.spec.mjs', 'H01 —'),
      ev('v3app-r91.spec.mjs', 'R91-04/05 —'),
      ev('v3app-r93.spec.mjs', 'R93-04 —'),
      ev('v3app-r97.spec.mjs', 'R97-01 —'),
      ev('v3app-r112-stories.spec.mjs', 'R112-S1 —'),
    ]),
  }),
  F({
    id: 'story.solo',
    // A váltás a fejléc fiókválasztóján történik — a héj-bemutató (`tour.shell`) első lépése mutatja meg.
    features: F(['account.personal', 'account.add_business', 'account.switch', 'shell.navigation']),
    tours: F(['tour.addBusiness', 'tour.shell']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '4. Anna SZEMÉLYES köre'),
      ev('v3app-acceptance.spec.mjs', 'H03 —'),
      ev('v3app-acceptance.spec.mjs', 'H05 —'),
      ev('v3app-r81-ux.spec.mjs', 'UX-14 —'),
      ev('v3app-r93.spec.mjs', 'R93-01/02/03 —'),
      ev('v3app-r112-stories.spec.mjs', 'R112-S2 —'),
    ]),
  }),
  F({
    id: 'story.growing',
    features: F(['invite.send', 'invite.accept', 'members.list']),
    tours: F(['tour.invite', 'tour.inviteAccept']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '6. Anna meghívja Bélát'),
      ev('v3app-core-flow.spec.mjs', '8. MEGLÉVŐ FIÓK'),
      ev('v3app-core-flow.spec.mjs', '10. ÚJ FIÓK'),
      ev('v3app-acceptance.spec.mjs', 'H02 —'),
      ev('v3app-r109-invite.spec.mjs', 'R109-01 —'),
      ev('v3app-r109-invite.spec.mjs', 'R109-03 —'),
      ev('v3app-r112-invite.spec.mjs', 'R112-I1/'),
      ev('v3app-r112-invite.spec.mjs', 'R112-I2/'),
    ]),
  }),
  F({
    id: 'story.multi',
    features: F(['account.switch', 'shell.navigation']),
    tours: F(['tour.shell']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '11. MUNKAKÖRNYEZET-VÁLTÁS'),
      ev('v3app-acceptance.spec.mjs', 'H08 —'),
      ev('v3app-r77.spec.mjs', 'R77/F77-01 —'),
      ev('v3app-r83.spec.mjs', 'R83/F83-02 —'),
      ev('v3app-r85.spec.mjs', 'R85/F85-02 —'),
      ev('v3app-r89-tutor.spec.mjs', 'R89-09 —'),
      ev('v3app-r112-stories.spec.mjs', 'R112-S4/S5 —'),
    ]),
  }),
  F({
    id: 'story.team',
    features: F(['members.list', 'members.grant', 'data.stock', 'members.revoke']),
    tours: F(['tour.grant', 'tour.stock']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '12. ENGEDÉLYEZETT ADAT'),
      ev('v3app-core-flow.spec.mjs', '13. MEGVONÁS'),
      ev('v3app-acceptance.spec.mjs', 'H07 —'),
      ev('v3app-acceptance.spec.mjs', 'H09 —'),
      ev('v3app-r81-ux.spec.mjs', 'UX-09…UX-13, UX-22 —'),
      ev('v3app-r112-stories.spec.mjs', 'R112-S4/S5 —'),
    ]),
  }),
  // A MEGHÍVÓ-HELYZETEK (R109 P109-03): nem ötödik út, hanem a 3. történet képernyőjének állapotai —
  // új és már regisztrált meghívott, más címre szóló, lejárt és már felhasznált meghívó.
  F({
    id: 'story.invites',
    features: F(['invite.accept']),
    tours: F(['tour.inviteAccept']),
    evidence: F([
      ev('v3app-core-flow.spec.mjs', '7. ROSSZ FIÓK'),
      ev('v3app-acceptance.spec.mjs', 'H06 —'),
      ev('v3app-r109-invite.spec.mjs', 'R109-04 —'),
      ev('v3app-r112-invite.spec.mjs', 'R112-I3 —'),
      ev('v3app-r112-invite.spec.mjs', 'R112-I4 —'),
      ev('v3app-r112-invite.spec.mjs', 'R112-I5 —'),
    ]),
  }),
]);

/** Egy próbafájl FORRÁSÁBAN álló próbacímek (`test('…'` és `test(\`…\``) — a ciklus-helyőrzővel együtt. */
export function testTitlesIn(source) {
  const out = [];
  const re = /\btest\(\s*(['`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m;
  while ((m = re.exec(String(source || ''))) !== null) out.push(m[2]);
  return out;
}

/**
 * A TÖRTÉNET BIZONYÍTÉKAINAK FELOLDÁSA. Minden bejegyzéshez megmondja, hány próba címe kezdődik vele
 * a megnevezett fájlban. Az „egynél több" is HIBA: a hatókör nélküli minta a szomszéd próbát igazolná
 * (KUKA-239 — a fájl nem a függvény). A `readSpec(útvonal)` a forrást adja, vagy `null`-t, ha nincs.
 */
export function resolveEvidence(story, readSpec) {
  return story.evidence.map((e) => {
    const src = readSpec(e.spec);
    if (src === null || src === undefined) return F({ ...e, found: false, matches: 0 });
    const matches = testTitlesIn(src).filter((t) => t.startsWith(e.title)).length;
    return F({ ...e, found: true, matches });
  });
}

/**
 * EGY TÖRTÉNET HIÁNYAI — nevezett listában. Üres lista = a történet a regiszter szerint végigvihető.
 * A gépi őr (`verify:tutor` TUT11) és az ellenpróbája UGYANEZT futtatja (KUKA-068: a tükör nem ellenpár).
 *
 *   · minden funkció LÉTEZIK és `working` (tervezett vagy kivezetett funkcióra nem épülhet út);
 *   · minden funkciónak van GYIK-je, és bemutatója VAGY nevesített indoka (`tour_note`);
 *   · minden megnevezett bemutató LÉTEZIK, és a történet egyik funkciójához tartozik;
 *   · a történet címe és bevezetője MINDEN bekapcsolt nyelven megvan;
 *   · minden bizonyíték-bejegyzés PONTOSAN EGY próbát jelöl (0 = hiányzik, >1 = kétértelmű).
 */
export function storyGaps(story, { features, tours, dictFor, languages, readSpec }) {
  const gaps = [];
  const byId = new Map(features.map((f) => [f.id, f]));
  for (const id of story.features) {
    const f = byId.get(id);
    if (!f) { gaps.push(`funkció nincs: ${id}`); continue; }
    if (f.status !== 'working') gaps.push(`funkció nem működő (${f.status}): ${id}`);
    if (!f.faq || !f.faq.length) gaps.push(`funkció GYIK nélkül: ${id}`);
    if (!f.tour && !(typeof f.tour_note === 'string' && f.tour_note.length > 20)) gaps.push(`funkció bemutató és indok nélkül: ${id}`);
  }
  for (const t of story.tours) {
    const def = tours[t];
    if (!def) { gaps.push(`bemutató nincs: ${t}`); continue; }
    if (!story.features.includes(def.feature)) gaps.push(`bemutató más funkcióhoz tartozik: ${t} → ${def.feature}`);
  }
  for (const code of languages) {
    const box = (dictFor(code).STORY || {})[story.id] || {};
    if (!box.title || !box.lead) gaps.push(`szöveg hiányzik (${code}): ${story.id}`);
  }
  if (!story.evidence.length) gaps.push('bizonyíték nélkül');
  for (const e of resolveEvidence(story, readSpec)) {
    if (!e.found) gaps.push(`próbafájl nincs: ${e.spec}`);
    else if (e.matches === 0) gaps.push(`próba nincs: ${e.spec} · „${e.title}"`);
    else if (e.matches > 1) gaps.push(`kétértelmű próba-cím (${e.matches}): ${e.spec} · „${e.title}"`);
  }
  return gaps;
}

export const STR_CONTRACT = F({
  id: 'STR-01',
  owns: 'az öt használati út (és a meghívó-helyzetek) kötése a meglévő funkciókhoz, bemutatókhoz és bizonyító próbákhoz',
  does_not_own: 'a szavakat (a nyelvcsomagok `STORY` csoportja) · a jogosultsági döntéseket (a szerver és a mag) · új folyamatot vagy modult',
  evidence_rule: 'minden bizonyíték-bejegyzés PONTOSAN egy próba címének elejére illeszkedik a megnevezett fájlban (KUKA-239)',
  never: 'a történet nem állít kész nagyvállalati rendszert, számlázást, adózást vagy más üzleti modult (R112 §1)',
});
