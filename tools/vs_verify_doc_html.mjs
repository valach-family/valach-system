#!/usr/bin/env node
// VS — AZ OLVASHATÓ VÁLTOZAT ŐRE (DHT-01, D-VS-648 / KUKA-079). READ-ONLY.
//
// OPERÁTORI PARANCS (2026-09-05): „mint mondtam már sokszor, .md-ket nem tudok megnyitni … kellene
// egy html verzió is mindig, ami rám is vonatkozik."
//
//   DHT01  a FELOLDÓ HÍVVA (KUKA-009): egy VALÓDI repó-lapot renderel, és a kimenet önálló HTML
//          (doctype · magyar nyelv-jelölés · a forrás H1-e a címben · a forrás útja a lapon)
//   DHT02  a markdown ALAKJAI tényleg átfordulnak — cím · tábla · idézet · kód-blokk · lista ·
//          félkövér · hivatkozás · vízszintes vonal: mind mérve, EGY fixtúrán
//   DHT03  NEM marad NYERS jelölés a kimeneten (`**` · sor eleji `#` · `| --- |` sor) — sem a
//          fixtúrán, sem az operátornak szánt VALÓDI lapokon (KUKA-012: a fél-fordítás is hazugság)
//   DHT04  a lap ÖNÁLLÓ: nincs benne külső betöltés (script/link/img/@import http-re) — az operátor
//          gépén dupla kattintásra megnyílik, internet nélkül is
//   DHT05  a kimenet SZÁRMAZTATOTT és HORDOZHATÓ: `docs/_olvashato/` a .gitignore-ban (egy fogalomnak
//          egy otthona) · az eszközben nincs abszolút gép-út (KUKA-031) · a `--mind` mód a
//          terv-lapokat ÉS a doktrínát is felsorolja
//
//   node tools/vs_verify_doc_html.mjs
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let pass = 0; let fail = 0; const bad = [];
const check = (id, name, ok) => { if (ok) { pass++; } else { fail++; bad.push(`  FAIL [${id}] ${name}`); } };

const mod = await import(join(ROOT, 'tools', 'vs_doc_html.mjs'));
const TMP = join(tmpdir(), `vs-doc-html-${process.pid}`);
mkdirSync(TMP, { recursive: true });
const renderTo = (rel) => readFileSync(join(ROOT, mod.renderDocToHtml(rel, TMP)), 'utf8');

// ── DHT01 — a feloldó HÍVVA, valódi lapon ────────────────────────────────────────────────────
// A HORGONY SZABÁLYBÓL JÖN, NEM NÉVBŐL (KUKA-051): a `docs/70_PLANNING/` ábécé-rendben ELSŐ lapja.
// Egy NÉVVEL beírt horgony a lap átnevezésekor/kivezetésekor összeomlik, és épp azt a mérést viszi
// magával, ami a szállítási formát védi. Ha egyetlen lap sincs, az kimondott hiba, nem néma zöld.
const PLANNING_DIR = 'docs/70_PLANNING';
const planningPages = existsSync(join(ROOT, PLANNING_DIR))
  ? readdirSync(join(ROOT, PLANNING_DIR)).filter((f) => f.endsWith('.md')).sort()
  : [];
check('DHT01', `van legalább egy operátori lap a ${PLANNING_DIR}/ alatt (a horgony szabályból jön, nem névből)`,
  planningPages.length > 0);
const realDoc = `${PLANNING_DIR}/${planningPages[0] || 'NINCS.md'}`;
let real = '';
try { real = renderTo(realDoc); } catch { /* a check méri */ }
const h1 = (read(realDoc).match(/^#\s+(.+)$/m) || [])[1] || '';
check('DHT01', 'a renderDocToHtml EXPORTÁLT és egy valódi lapot önálló HTML-lé fordít (doctype · lang="hu" · a forrás H1-e a <title>-ben · a forrás útja kiírva)',
  typeof mod.renderDocToHtml === 'function'
  && /^<!doctype html>/i.test(real) && /<html lang="hu">/.test(real)
  && real.includes(`<title>${h1.replace(/[*`]/g, '').trim()}</title>`)
  && real.includes(realDoc));

// ── DHT02 — minden markdown-alak átfordul ────────────────────────────────────────────────────
const FIX = join(TMP, 'fixtura.md');
writeFileSync(FIX, [
  '# Cím', '', '## Alcím', '', 'Sima **félkövér** és `kód` és [link](https://pelda.hu).', '',
  '- első', '- második', '',
  // A TÖRDELT tétel/idézet: a jelölés ÁTÉR a sortörésen. Mindkettőt mérjük, mert a javítás
  // előbb csak az idézetnél élt, és a testvér-ág (lista) némán nyers `**`-ot hagyott (KUKA-039).
  '- tördelt **tétel', '  a folytatás sorában**.', '',
  '1. egy', '2. kettő', '',
  // A TÖRDELT MONDAT, ami számmal folytatódik: NEM lista (különben kettévágná a félkövéret).
  'Egy mondat, ami átér **és', 'vagy 5. szinten van.**', '',
  // A GLOB nem jelölés: változatlanul kell kiírni, és az őr sem riaszthat rá.
  'A minta: src/**/*.js — ez glob.', '',
  '> idézet', '', '> tördelt **idézet', '> a folytatás sorában**.', '',
  '| A | B |', '| --- | --- |',
  '| 1 | 2 |', '', '```bash', 'echo szia', '```', '', '---', '',
].join('\n'), 'utf8');
let fx = '';
try { fx = readFileSync(join(ROOT, mod.renderDocToHtml(join('..', ...FIX.split('/').slice(1)), TMP)), 'utf8'); } catch { /* alább */ }
if (!fx) { // az abszolút út a repón kívül van — a fixtúrát a repó alatt rendereljük
  const local = 'docs/_olvashato/.fixtura.md';
  mkdirSync(join(ROOT, 'docs', '_olvashato'), { recursive: true });
  writeFileSync(join(ROOT, local), readFileSync(FIX, 'utf8'), 'utf8');
  fx = readFileSync(join(ROOT, mod.renderDocToHtml(local, TMP)), 'utf8');
  rmSync(join(ROOT, local), { force: true });
}
check('DHT02', 'a markdown ALAKJAI átfordulnak: cím · alcím · félkövér · kód · hivatkozás · két lista-fajta · idézet · tábla (fejléc+sor) · kód-blokk · vonal',
  /<h1 [^>]*>Cím<\/h1>/.test(fx) && /<h2 [^>]*>Alcím<\/h2>/.test(fx)
  && fx.includes('<strong>félkövér</strong>') && fx.includes('<code>kód</code>')
  && fx.includes('<a href="https://pelda.hu">link</a>')
  && /<ul>[\s\S]*<li>első<\/li>[\s\S]*<\/ul>/.test(fx) && /<ol>[\s\S]*<li>egy<\/li>[\s\S]*<\/ol>/.test(fx)
  && fx.includes('<li>tördelt <strong>tétel a folytatás sorában</strong>.</li>')
  && fx.includes('<p>Egy mondat, ami átér <strong>és vagy 5. szinten van.</strong></p>')
  && fx.includes('src/**/*.js — ez glob.')
  && fx.includes('<p>tördelt <strong>idézet a folytatás sorában</strong>.</p>')
  && /<blockquote><p>idézet<\/p><\/blockquote>/.test(fx)
  && /<table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead>/.test(fx) && fx.includes('<td>1</td>')
  && /<pre><code>echo szia<\/code><\/pre>/.test(fx) && fx.includes('<hr>'));

// ── DHT03 — nem marad nyers jelölés (fixtúrán ÉS a valódi operátor-lapokon) ───────────────────
// AZ ELMARADT JELÖLÉS JELE — de a `**` nem mindig jelölés: a `src/**/*.js` GLOB is így néz ki, és
// azt HELYES változatlanul kiírni. A megkülönböztető a SZOMSZÉD: a glob mellett `/` vagy `*` áll,
// az elmaradt félkövér mellett szó vagy szóköz. A kód-részlet és a kód-blokk tartalma pedig
// fogalmilag nem jelölés — azt előbb kivesszük (KUKA-049: a jel a MECHANIZMUST mérje, ne a tünetet;
// a téves riasztás előbb-utóbb kikapcsoltatja az őrt).
const RAW = (html) => {
  const body = (html.split('</header>')[1] || html)
    .replace(/<pre>[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
  return /(^|[^*/])\*\*(?![/*])/.test(body)
    || /^#{1,6}\s/m.test(body) || /^\s*\|[\s:|-]+\|\s*$/m.test(body);
};
// A HATÓKÖR SZABÁLY, NEM LISTA (KUKA-051). Az első alak név-előtagra szűrt (`LEVEL_`/`V3_`), és
// épp az operátornak írt board-útmutató maradt ki belőle — abban KÉT tételen nyers `**` ment ki.
// A `docs/70_PLANNING/` MINDEN lapja az operátornak (vagy a tárgyaló félnek) szól: mind mérve,
// padlóval, hogy a néma zsugorodás is piros legyen.
const operatorDocs = readdirSync(join(ROOT, 'docs', '70_PLANNING'))
  .filter((f) => f.endsWith('.md')).map((f) => `docs/70_PLANNING/${f}`);
const rawLeaks = [];
for (const d of operatorDocs) { try { if (RAW(renderTo(d))) rawLeaks.push(d); } catch (e) { rawLeaks.push(`${d} (${e.message})`); } }
// A PADLÓ ITT 1, NEM 40 — és ezt ki kell mondani. A V2-ben a 40 a meglévő lap-készletet védte a
// néma zsugorodástól; ebben a repóban a készlet még NŐ, tehát egy magas szám csak arra tanítana,
// hogy időnként átírjuk (KUKA-045: a kézzel léptetett darabszám betanít a saját megkerülésére).
// Amit a padló itt véd: hogy a mérés ne legyen ÜRES — nulla lapon a DHT03 semmit sem mérne, mégis
// zöld volna (KUKA-051 · KUKA-089). A valódi védelem az, hogy MINDEN lap mérve van.
check('DHT03', `NINCS nyers markdown a kimeneten — a fixtúrán és mind a(z) ${operatorDocs.length} operátor-lapon, padló 1 (talált: ${rawLeaks.join(', ') || 'nincs'})`,
  !RAW(fx) && rawLeaks.length === 0 && operatorDocs.length >= 1);

// ── DHT04 — a lap ÖNÁLLÓ (offline megnyílik) ─────────────────────────────────────────────────
check('DHT04', 'a lap önálló: nincs külső betöltés (script src · link href · img src · @import http-re), tehát internet nélkül is megnyílik',
  !/<script[^>]+src=/i.test(real) && !/<link[^>]+href="https?:/i.test(real)
  && !/<img[^>]+src="https?:/i.test(real) && !/@import\s+url\(\s*['"]?https?:/i.test(real));

// ── DHT05 — származtatott kimenet + hordozhatóság ────────────────────────────────────────────
const gitignore = existsSync(join(ROOT, '.gitignore')) ? read('.gitignore') : '';
const src = read('tools/vs_doc_html.mjs');
check('DHT05', 'a kimenet SZÁRMAZTATOTT (docs/_olvashato a .gitignore-ban) · az eszközben nincs abszolút gép-út (KUKA-031) · a --mind a terv-lapokat ÉS a doktrínát is viszi',
  /docs\/_olvashato/.test(gitignore)
  && !/require\(['"]\/(home|Users)\//.test(src) && !/['"]\/(home|Users)\/[a-z]/i.test(src)
  && /docs\/70_PLANNING/.test(src) && src.includes('DECISION_LOG.md'));

// ── DHT06 — a TARTALOMJEGYZÉK: EGY lap, ahonnan minden elérhető, és a blokk FRISSÍTI ────────────
// Az operátornak nem lapokat kell megjegyeznie, hanem EGY hivatkozást; és a frissítés nem a MI
// emlékezetünkön áll, hanem a terminál-blokkon, amit amúgy is lefuttat (KUKA-079 gépi fele).
const idxDir = join(TMP, 'idx');
const sample = [
  { src: 'docs/70_PLANNING/V3_TERV.md', file: 'V3_TERV.html', title: 'Terv', mtime: new Date(0) },
  { src: 'docs/10_DOCTRINE/00_BASELINE.md', file: '00_BASELINE.html', title: 'Alapzat', mtime: new Date(0) },
  { src: 'DECISION_LOG.md', file: 'DECISION_LOG.html', title: 'Napló', mtime: new Date(0) },
];
let idxHtml = '';
try { mkdirSync(idxDir, { recursive: true }); mod.renderIndex(sample, idxDir); idxHtml = readFileSync(join(idxDir, 'index.html'), 'utf8'); } catch { /* a check méri */ }
const claudeMd = read('CLAUDE.md');
const pkg = JSON.parse(read('package.json'));
check('DHT06', 'a TARTALOMJEGYZÉK létezik és teljes (a három forrás-csoport külön, minden lap hivatkozva, a frissítő parancs kiírva) · a `docs:html` a package.json-ban ÉS az operátori terminál-blokkban is benne van',
  typeof mod.renderIndex === 'function'
  && /<title>VS — olvasható lapok<\/title>/.test(idxHtml)
  && sample.every((s) => idxHtml.includes(`href="./${s.file}"`) && idxHtml.includes(s.title))
  && /Tervek, levelek/.test(idxHtml) && /Doktrína/.test(idxHtml) && /Napló/.test(idxHtml)
  && /npm run docs:html/.test(idxHtml)
  && String(pkg.scripts['docs:html'] || '').includes('vs_doc_html.mjs')
  && (claudeMd.match(/```bash\n[\s\S]*?```/g) || []).some((b) => /npm run docs:html/.test(b) && /git pull origin main/.test(b)));

rmSync(TMP, { recursive: true, force: true });

console.log('='.repeat(70));
console.log('VS — AZ OLVASHATÓ VÁLTOZAT ŐRE (DHT-01)');
console.log('='.repeat(70));
if (bad.length) console.log(bad.join('\n'));
console.log(`RESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
