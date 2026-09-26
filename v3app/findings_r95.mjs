// v3app/findings_r95.mjs — AZ F95-01 BATTÉRIÁJA: A SZEMÉLY VÁLASZTOTT NYELVE (CMD-VS-300-002-002 R97).
//
// A LELET (a külső ellenőrző fél, chatgpt-v3, R95 §F95-01): az új ember angol vagy német nyelve az
// ELSŐ belépéskor és frissítéskor megmaradt, de KIJELENTKEZÉS és ÚJBÓLI BELÉPÉS után magyarra váltott.
// A gyökér a forráson: a `setLang` NYELVKÓD-SZTRINGET ad (I18N-01, `i18n/dict.mjs` 82), az `app.js`
// viszont HÁROM helyen egy nem létező `got.code` mezőt olvasott rajta — két ág (a személyhez mentés)
// SOHA nem futott le, a harmadikat a tartalék-ága mentette meg, VÉLETLENÜL (KUKA-238 → KUKA-245).
//
// MIÉRT NEM FOGTA MEG A KORÁBBI PRÓBA. Az R93-04 böngésző-eset CSAK az ELSŐ belépést mérte, a
// kijelentkezés + újbóli belépés utat nem — a tudatos választás kulcsa (`vs3.lang.choice`) addig élt,
// tehát a hiányzó személyes kulcs nem derült ki. A tanulság gépi alakja ez a battéria.
//
// AMIT MÉR — és MIÉRT ÍGY:
//   A) A SZERZŐDÉS, MEGHÍVVA: a `setLang` visszatérése SZTRING, és a normalizált kódot adja. Nem a
//      szövegét olvassuk: HÍVJUK (KUKA-009).
//   B) EGY BEJÁRAT: a lapon PONTOSAN EGY `setLang(` hívás áll (a `useLang`-ben), és a visszatérésén
//      SEHOL nincs mező-olvasás — a mezőnév-találgatás így nem tud visszajönni három helyre.
//   C) A TELJES ÚT, MINDEN BEKAPCSOLT NYELVEN: névtelen tudatos választás → első belépés → frissítés
//      → KIJELENTKEZÉS → ÚJBÓLI BELÉPÉS → MÁSIK ember → az első ember visszatér. Az alanyok listáját a
//      JEGYZÉK adja (`enabledLanguages`), nem kézi felsorolás — új nyelv INGYEN bekerül (KUKA-051),
//      és PADLÓ védi a néma zsugorodást (KUKA-045).
//   D) ROMLÁS-ELLENPRÓBA: ugyanaz az út a HIBÁS (R94-es) mentési szabállyal — ott BUKNIA kell. Egy
//      próba, ami nem tud pirosra váltani, nem bizonyít semmit (KUKA-092 · KUKA-127: a rontásnak a
//      VÉDELEM miatt kell pirosra vinnie, nem valami más miatt).
//
// KIMONDVA, mit NEM bizonyít: ez a battéria a SZABÁLYT és a bekötését méri, nem a böngészőt. A valódi
// felület tanúja a `tests/e2e/v3app-r97.spec.mjs` (Playwright + Chromium) — a kettő EGYÜTT a bizonyíték.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { setLang, currentLang } from './public/i18n/dict.mjs';
import { BASE_LANGUAGE, enabledLanguages } from './public/i18n/languages.mjs';
import { decideLang, langStoreKey, LANG_CHOICE_KEY, LANG_MEMORY_CONTRACT, CONSCIOUS_SOURCES } from './public/i18n/langMemory.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const results = [];
let section = '';
const head = (s) => { section = s; console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 78 - s.length))}`); };
function step(name, cond, detail) {
  const pass = !!cond;
  results.push({ section, name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return pass;
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
head('A) A SZERZŐDÉS, MEGHÍVVA — a setLang SZTRINGET ad, nem objektumot (F95-01)');
// ════════════════════════════════════════════════════════════════════════════════════════════════
const got = setLang('de');
step('(a) a visszatérés típusa SZTRING (a `got.code` ezért volt mindig `undefined`)', typeof got === 'string', { tipus: typeof got, ertek: got });
step('(b) a visszatérés a TÉNYLEGESEN beállított kód (az aktív nyelvvel egyezik)', got === currentLang(), { visszateres: got, aktiv: currentLang() });
step('(c) ismeretlen kérés az ALAPNYELVET adja, és ezt is SZTRINGKÉNT', setLang('kl-x-nincs') === BASE_LANGUAGE, { kapott: currentLang() });
step('(d) a visszatérésen NINCS `code` mező (a hibás olvasás némán `undefined`-ot adott)',
  Object.getOwnPropertyDescriptor(Object(setLang('en')), 'code') === undefined, { probalt: 'en' });
setLang(BASE_LANGUAGE);

// ════════════════════════════════════════════════════════════════════════════════════════════════
head('B) EGY BEJÁRAT — a mezőnév-találgatás nem tud visszajönni három helyre (F95-01)');
// ════════════════════════════════════════════════════════════════════════════════════════════════
const app = read('v3app/public/app.js');
const setLangCalls = (app.match(/\bsetLang\(/g) || []).length;
step('(a) a lapon PONTOSAN EGY `setLang(` hívás áll (a `useLang` egyetlen bejáratában)', setLangCalls === 1, { hivasok: setLangCalls });
step('(b) a `useLang` a nyelv ÉRVÉNYESÍTÉSÉNEK egyetlen útja (a döntés a modulból jön)',
  /function useLang\(decision\)/.test(app) && /const code = setLang\(decision\.code\)/.test(app));
const ALL = ['v3app/public/app.js', 'v3app/public/texts.mjs', 'v3app/public/i18n/dict.mjs', 'v3app/public/i18n/langMemory.mjs'];
// A KULCS-ÉPÍTÉS TILALMA a HASZNÁLÓRA áll, nem a BIRTOKLÓRA: a `langMemory.mjs`-ben a kulcs ÉPPEN
// ott épül — ezt hibának mondani ugyanaz a hiba lenne, mint a gyűjtő-mappát egy fogalom mappájának
// olvasni (KUKA-091). Ezért minden tiltott mintának SAJÁT hatóköre van.
const FORBIDDEN = [
  { re: /setLang\([^)]*\)\s*\.\s*\w+/, why: 'mező-olvasás a setLang visszatérésén', where: ALL },
  { re: /\bgot\s*&&\s*got\.code\b/, why: 'a kitalált `got.code` mező (az R94-es alak)', where: ALL },
  { re: /LANG_STORE_PREFIX\s*\}/, why: 'kézzel összerakott tárolási kulcs a HASZNÁLÓBAN (a kulcs a LNG-02-é)',
    where: ALL.filter((f) => !f.endsWith('langMemory.mjs')) },
];
const codeOnly = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
for (const f of FORBIDDEN) {
  const hits = f.where.filter((p) => f.re.test(codeOnly(read(p))));
  step(`(c) tiltott minta nincs sehol: ${f.why}`, hits.length === 0, hits.join(', ') || `${f.where.length} fájl átnézve`);
}
step('(d) a döntés BEKÖTÉSE a modul szerződésének MEZŐNEVEIN megy (nem kitalált néven — KUKA-238)',
  ['asked:', 'askedSource:', 'storedForPerson:', 'carriedChoice:', 'acceptLanguage:', 'newPerson,'].every((k) => app.includes(k)),
  { hianyzo: ['asked:', 'askedSource:', 'storedForPerson:', 'carriedChoice:', 'acceptLanguage:', 'newPerson,'].filter((k) => !app.includes(k)) });
// A VÁLASZTÓ KEZELŐJÉNEK SAJÁT SZÖVEG-SZELETE: a mentés ott NEM ág, hanem a döntés következménye.
// (A `rememberLang`/`rememberChoice` MAGA nem tilos — a `useLang` hívja; az a kérdés, hogy a HÍVÓ
// csinál-e mellé saját ágat, mert ott csúszott el három helyen a mezőnév.)
const handler = (() => {
  const i = app.indexOf("if (d.testid === 'lang-select'");
  return i < 0 ? '' : app.slice(i, i + 1400);
})();
step('(e) a nyelvválasztó UGYANEZT az egy szabályt hívja (nincs saját mentési vagy setLang-ága)',
  /decideLang\(\{ asked: e\.target\.value, askedSource: 'choice' \}\)/.test(handler)
  && /useLang\(decision\)/.test(handler)
  && !/rememberLang\(/.test(handler) && !/rememberChoice\(/.test(handler) && !/setLang\(/.test(handler),
  { szelet_hossz: handler.length, dontes: /decideLang\(/.test(handler), sajat_mentes: /remember(Lang|Choice)\(/.test(handler) });

// ════════════════════════════════════════════════════════════════════════════════════════════════
head('C) A TELJES ÚT — MINDEN bekapcsolt nyelven, a KIJELENTKEZÉS + ÚJBÓLI BELÉPÉS is (F95-01)');
// ════════════════════════════════════════════════════════════════════════════════════════════════
/**
 * A LAP TÁROLÓJA — a próba UGYANAZT a kulcs-feloldót használja, amit a lap (`langStoreKey`), tehát a
 * kulcs alakját nem találja ki (KUKA-068: a pin ne a saját nyelvjárását mérje).
 */
class Browser {
  constructor(acceptLanguage) { this.store = new Map(); this.accept = acceptLanguage; this.subject = null; this.lang = BASE_LANGUAGE; this.source = null; }
  /** A `useLang` gépezete, a lap ágaival: érvényesítés → személyhez mentés → választás-kulcs. */
  apply(decision, { legacyPersist = false } = {}) {
    this.lang = setLang(decision.code);
    this.source = decision.source;
    // A ROMLÁS ALAKJA (R94): a mentés a `setLang` visszatérésének `code` mezőjén állt — ami SOHA
    // nem létezett, tehát a személyes kulcs sem keletkezett.
    const persist = legacyPersist ? Boolean(Object(this.lang).code) : decision.persist_for_person;
    if (persist) this.store.set(langStoreKey(this.subject), this.lang);
    if (decision.persist_choice) this.store.set(LANG_CHOICE_KEY, this.lang);
    return this.lang;
  }
  decide({ urlAsked = null, newPerson = false } = {}) {
    return decideLang({
      asked: urlAsked, askedSource: 'url',
      storedForPerson: this.store.get(langStoreKey(this.subject)) || null,
      carriedChoice: this.store.get(LANG_CHOICE_KEY) || null,
      acceptLanguage: this.accept, newPerson,
      hasPerson: Boolean(this.subject),
    });
  }
  choose(code, opts) { return this.apply(decideLang({ asked: code, askedSource: 'choice' }), opts); }
  restore(opts, applyOpts) { return this.apply(this.decide(opts), applyOpts); }
  logout() { this.subject = null; this.store.delete(LANG_CHOICE_KEY); this.lang = setLang(BASE_LANGUAGE); }
  login(subject, applyOpts) { this.subject = subject; return this.restore({ newPerson: true }, applyOpts); }
}

/** A TELJES FELHASZNÁLÓI ÚT egy nyelvre — a hét állomás, ahogy a felhasználó végigmegy. */
function walkPath(code, { legacyPersist = false, accept = 'hu-HU,hu;q=0.9' } = {}) {
  const b = new Browser(accept);
  const opts = { legacyPersist };
  const out = {};
  out.anon = b.choose(code, opts);                       // 1. névtelenül tudatosan választ
  out.first_login = b.login('s-anna', opts);             // 2. regisztrál és ELSŐ belépés
  out.stored_after_first = b.store.get(langStoreKey('s-anna')) || null;
  out.reload = b.restore({}, opts);                      // 3. frissítés (ugyanaz a személy)
  b.logout();                                            // 4. KIJELENTKEZÉS (a választás-kulcs ürül)
  out.relogin = b.login('s-anna', opts);                 // 5. ÚJBÓLI BELÉPÉS — ITT BUKOTT
  out.relogin_source = b.source;
  b.logout();
  out.other_person = b.login('s-bela', opts);            // 6. MÁSIK ember ugyanabban a böngészőben
  out.other_source = b.source;
  b.logout();
  out.back_to_first = b.login('s-anna', opts);           // 7. az első ember visszatér
  return out;
}

const enabled = enabledLanguages().map((l) => l.code);
step('(a) az alanyok a JEGYZÉKBŐL jönnek, nem kézi listából — és van PADLÓ (KUKA-045/051)',
  enabled.length >= 3, { bekapcsolt: enabled.join(', ') });
for (const code of enabled) {
  const r = walkPath(code);
  step(`(b) ${code}: az ÚJBÓLI BELÉPÉS a választott nyelvet adja (a MÉRT lelet pontja)`, r.relogin === code, r);
  step(`(c) ${code}: az első tudatos választás a SZEMÉLYHEZ mentődött`, r.stored_after_first === code, { kulcs: langStoreKey('s-anna'), ertek: r.stored_after_first });
  step(`(d) ${code}: az újbóli belépés forrása a TÁROLT választás (nem néma alapnyelv)`, r.relogin_source === 'stored', { source: r.relogin_source });
  step(`(e) ${code}: a frissítés is megtartja`, r.reload === code, { reload: r.reload });
  step(`(f) ${code}: a MÁSIK ember NEM örökli (a böngésző nyelvét kapja)`, code === BASE_LANGUAGE ? r.other_person === BASE_LANGUAGE : r.other_person !== code,
    { masik: r.other_person, source: r.other_source });
  step(`(g) ${code}: az első ember VISSZATÉRÉSE a saját nyelvét adja (a másik ember nem törölte)`, r.back_to_first === code, { vissza: r.back_to_first });
}
// A CÍMBŐL KÉRT NYELV (a megerősítő levél útja) ugyanezen az EGY szabályon megy.
const urlPath = (() => {
  const belepett = new Browser('hu-HU,hu');
  belepett.choose('en'); belepett.login('s-anna');
  const dPerson = belepett.decide({ urlAsked: 'de' });
  const nevtelen = new Browser('hu-HU,hu');
  const dAnon = nevtelen.decide({ urlAsked: 'de' });
  const pick = (d) => ({ source: d.source, persist_choice: d.persist_choice, persist_for_person: d.persist_for_person });
  return { code: dPerson.code, source: dPerson.source, person: pick(dPerson), anon: pick(dAnon) };
})();
step('(h) a lap CÍMÉBŐL kért nyelv ÉRVÉNYESÜL, és belépett emberhez EL IS TEVŐDIK (F93-02 megőrizve)',
  urlPath.code === 'de' && urlPath.source === 'url' && urlPath.person.persist_for_person === true, urlPath);
/**
 * A MÁSODLAGOS LELET, MÉRVE (F95-01). A `got.code` elírás javításával a CÍM ága FELÉLEDT — és egy
 * MÁSIK, korábban elfogadott szabályt sértett meg: a névtelen maradvány a megerősítő levél `?lang=`
 * hivatkozásán TUDATOS választássá mosódott, így a KÖVETKEZŐ ember örökölte az előzőét. Ezt a
 * böngésző-próba fogta meg (R97-02), és ITT a gépezet szintjén is mérjük.
 */
step('(h2) a CÍM ága NEM gyárt hordozó választást (a néma ág feléledése nem írhat át másik szabályt)',
  urlPath.person.persist_choice === false && urlPath.anon.persist_choice === false
  && urlPath.anon.persist_for_person === false, urlPath);
const inherit = (() => {
  // ANNA névtelenül angolt választ → belép → kilép. BÉLA ugyanabban a böngészőben regisztrál: a lap
  // az ANNA-féle maradványt mutatja, és a megerősítő hivatkozása `?lang=en`-t hoz. A kérdés: BÉLA
  // ELSŐ BELÉPÉSE angol lesz-e (az lenne az öröklés) vagy a SAJÁT böngésző-nyelve.
  const b = new Browser('hu-HU,hu;q=0.9');
  b.choose('en'); b.login('s-anna'); b.logout();
  b.restore({ urlAsked: 'en' });                // Béla megerősítő lapja, MÉG névtelenül
  const bela = b.login('s-bela');
  return { bela, source: b.source, choice_kulcs: b.store.get(LANG_CHOICE_KEY) || null };
})();
step('(i0) a MÁSIK ember NEM örökli a névtelen maradványt a megerősítő hivatkozáson keresztül sem',
  inherit.bela === BASE_LANGUAGE && inherit.choice_kulcs === null, inherit);
step('(i) a TÁROLT választás ERŐSEBB az átvitt választásnál (a másik emberre váltás szabálya)',
  decideLang({ storedForPerson: 'en', carriedChoice: 'de', newPerson: true }).code === 'en'
  && decideLang({ storedForPerson: 'en', carriedChoice: 'de', newPerson: true }).source === 'stored');
step('(j) a böngésző kérése NEM tudatos választás: nem mentődik el senkinek',
  decideLang({ acceptLanguage: 'de-DE,de;q=0.9', newPerson: true }).persist_for_person === false
  && CONSCIOUS_SOURCES.includes('accept_language') === false, { source: decideLang({ acceptLanguage: 'de-DE,de' }).source });

// ════════════════════════════════════════════════════════════════════════════════════════════════
head('D) ROMLÁS-ELLENPRÓBA — a HIBÁS (R94-es) mentési szabállyal BUKNIA kell (KUKA-092 · 127)');
// ════════════════════════════════════════════════════════════════════════════════════════════════
const nonBase = enabled.filter((c) => c !== BASE_LANGUAGE);
step('(a) van mit rontani: legalább egy nem-alapnyelv be van kapcsolva (üres alapsokaság nem zöld — KUKA-093)',
  nonBase.length >= 1, { nem_alapnyelv: nonBase.join(', ') });
const legacy = nonBase.map((code) => ({ code, r: walkPath(code, { legacyPersist: true }) }));
step('(b) a rontott szabály MINDEN nem-alapnyelvnél elbukik az ÚJBÓLI BELÉPÉSNÉL — tehát a próba TÜZEL',
  legacy.every(({ code, r }) => r.relogin !== code),
  legacy.map(({ code, r }) => `${code}→${r.relogin} (${r.relogin_source})`).join(' · '));
step('(c) a rontott szabály a MÉRT hibát adja vissza: alapnyelv a választott helyett (a lelet alakja)',
  legacy.every(({ r }) => r.relogin === BASE_LANGUAGE), legacy.map(({ code, r }) => `${code}→${r.relogin}`).join(' · '));
step('(d) …és a rontás az ELSŐ belépést NEM rontja el — ezért nem fogta meg az R93-04 (a hiba alakja)',
  legacy.every(({ code, r }) => r.first_login === code), legacy.map(({ code, r }) => `${code}: első=${r.first_login}`).join(' · '));

// ════════════════════════════════════════════════════════════════════════════════════════════════
head('E) A SZERZŐDÉS KIMONDJA A HATÁRÁT (a néma feltevés a következő kör hibája)');
// ════════════════════════════════════════════════════════════════════════════════════════════════
step('(a) az LNG-02 szerződés megnevezi, mit NEM birtokol', typeof LANG_MEMORY_CONTRACT.does_not_own === 'string' && LANG_MEMORY_CONTRACT.does_not_own.length > 20);
step('(b) a szerződés kimondja a MÉRT kimenetet (source), amitől a néma alapnyelv nem téveszthető össze',
  /source/.test(LANG_MEMORY_CONTRACT.measured_output || ''));
step('(c) a szerződés kimondja a setLang-tilalmat (mező-olvasás rajta nincs)', /SZTRING/.test(LANG_MEMORY_CONTRACT.never || ''));

const pass = results.filter((r) => r.pass).length;
console.log(`\n${'='.repeat(100)}`);
console.log(`F95-01 battéria: ${pass}/${results.length} PASS${pass === results.length ? '' : ` — ${results.length - pass} FAIL`}`);
console.log('KIMONDVA: ez a SZABÁLYT és a bekötését méri, nem a böngészőt. A felület tanúja:');
console.log('`npx playwright test tests/e2e/v3app-r97.spec.mjs` — a kettő EGYÜTT a bizonyíték.');
process.exit(pass === results.length ? 0 : 1);
