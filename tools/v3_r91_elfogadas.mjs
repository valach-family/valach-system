// tools/v3_r91_elfogadas.mjs — AZ R91 GÉPI ELFOGADÁSI LELTÁR ELŐÁLLÍTÁSA (F91-07).
//
// MIÉRT SZERSZÁM, NEM KÉZZEL ÍRT JSON. A külső ellenőrző fél (chatgpt-v3, R91/F91-07) lelete: a
// beadott leltár `fej` mezője az INDULÓ commit volt (`4b93d1a`), amelyben a mért tutor még nem is
// létezett — vagyis a bizonyíték a forráshoz volt kötve, de a ROSSZ forráshoz. A leltár ezért
// mostantól a GIT-BŐL olvassa a fejeket, és HÁROMFÉLE forrás-fejet nevez meg:
//   · `induló_fej`      — amit a parancs vizsgált (az R90 beadása),
//   · `mert_kod_feje`   — amin a MÉRÉSEK futottak (a munkafa állapota; ha nem tiszta, KIMONDVA),
//   · `zaro_jelentes_feje` — amit a záró REPORT commitja rögzít (a záráskor íródik be).
//
// ÉS NÉGY ÁLLAPOT, NEM KETTŐ (a reviewer kikötése): `bizonyitva` · `reszben` · `hibas` · `nem_futott`.
// A söprés három tétele KÜLÖN állapot: az elavult tanú NEM ugyanaz, mint a be nem fejeződött lánc.
import { execSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const git = (c) => execSync(`git -C ${ROOT} ${c}`, { encoding: 'utf8' }).trim();
const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const INDULO_FEJ = '3b38705b48e86fc7d20bb06be0ac7076859763a3';   // az R91 parancs vizsgált feje
const head = git('rev-parse HEAD');
const dirty = git('status --porcelain').split('\n').filter(Boolean);

const row = (id, mit, verdikt, bizonyitek, megjegyzes = null) => ({ id, mit, verdikt, bizonyitek, megjegyzes });

const out = {
  kor: 'CMD-VS-300-002-002 R91',
  sav: 'Claude-v3',
  repo: 'valach-family/valach-system',
  ag: git('rev-parse --abbrev-ref HEAD'),
  dontes: 'D-VS-3076',
  lap: 'docs/70_PLANNING/V3_R91_HASZNALATI_UTAK.md',
  /**
   * A FORRÁS-KÖTÉS HÁROM FEJE (F91-07). A `mert_kod_feje` az, amin a mérések FUTOTTAK: ha a munkafa
   * nem tiszta, azt KIMONDJUK — a „mért kód" ilyenkor a munkafa, nem a commit (KUKA-200).
   */
  forras_kotes: {
    indulo_fej: INDULO_FEJ,
    indulo_fej_rovid: INDULO_FEJ.slice(0, 7),
    mert_kod_feje: head,
    mert_kod_feje_rovid: head.slice(0, 7),
    mert_kod_munkafa_tiszta: dirty.length === 0,
    mert_kod_valtozott_fajlok: dirty.length,
    zaro_jelentes_feje: 'a záró commit rögzíti — ez a leltár a commit ELŐTT készül, ezért itt NEM állítunk fejet',
    csomag_verzio: VERSION,
    kimondva: 'a mérések a MUNKAFA állapotán futottak (a fenti fej + a felsorolt változás); a záró '
      + 'commit után ugyanezek a mérések a commit fején is megismételhetők — a leltár NEM állítja, '
      + 'hogy már megismételtük',
  },
  verdikt_szotar: {
    bizonyitva: 'a sor minden állítása MÉRT kimenetből áll össze, és a mérés MEG VAN NEVEZVE',
    reszben: 'a sor egy NEVEZETT al-esete nem futott vagy nem mérhető — a lap kimondja, melyik',
    hibas: 'MÉRT hiba: a mérés lefutott, és a rendszer nem teljesítette',
    nem_futott: 'a mérés nem futott le — ez NEM zöld és NEM piros tartalom (KUKA-093)',
  },
  elfogadas: [
    row('F91-01', 'A bemutatók befejezése és tényleges elérhetősége', 'bizonyitva', [
      'tests/e2e/v3app-r91.spec.mjs R91-01/02 — függő feladat mellett NINCS záró lap; kihagyás után 2/1; mentés után 3/0',
      'tests/e2e/v3app-r91.spec.mjs R91-03 — mind a NYOLC fiókkezelői bemutató elindul és kiemel, vagy nevezetten vár/megszakít',
      'tests/e2e/v3app-r91.spec.mjs R91-04 — a regisztrációs bemutató belépés előtt VÉGIGVIHETŐ',
      'npm run verify:tutor TUT05 — finishRun · skipStep · a záró lap három száma · a lap a modult hívja · tour_note MINDEN bemutató nélküli funkción',
      'npm run verify:app-findings-r91 C) — a nevesített hozzáférés-bemutató lépései és a tour_note ÉLŐ HTTP-n',
    ], 'A `workspace.created` tanúsítása a kontextus-váltás ELŐTT fut — ezt kód-szinten javítottuk; '
      + 'önálló böngésző-eset erre nem készült, a fiók-létrehozás bemutatója az R91-03 általános körében fut.'),
    row('F91-02', 'A nyelv a TELJES használati úton', 'bizonyitva', [
      'npm run verify:app-findings-r91 B) — levél-tárgy · a hivatkozás nyelve · a SZERVER-rajzolt lap (lang/dir/mondat) · a kudarc-lap · Accept-Language · meghívó levél',
      'tests/e2e/v3app-r91.spec.mjs R91-04/05 — névtelen nyelvválasztó, és a választás TÚLÉLI a lapfrissítést',
      'tests/e2e/v3app-r91.spec.mjs R91-06 — személyváltáskor a másik ember beállítása NEM öröklődik',
      'npm run verify:i18n — a SRV csoport mindhárom termék-nyelven, helyőrző-egyezéssel',
    ], 'A francia és az ar-x-proba csomag PRÓBA-tartalom, nem lektorált fordítás. A nyelvi lektorálás '
      + 'MÓDJA megnevezve (ember nézi át a termék-nyelveket), de ebben a körben NEM végeztük el.'),
    row('F91-03', 'Beszélgetés-generáció és VALÓBAN véges előzmény', 'bizonyitva', [
      'tests/e2e/v3app-r91.spec.mjs R91-07 — az Új beszélgetés után a visszatartott régi válasz NEM tér vissza',
      'tests/e2e/v3app-r91.spec.mjs R91-08 — hét kérdés után hat forduló marad, és a lap KIMONDJA a korlátot',
      'npm run verify:app-findings-r91 E) — a szerver 9 fordulót 6-ra vág, és a csonk TÉNYLEGESEN hatot kap; a válasz visszaadja a beszélgetés azonosítóját',
    ], 'A nyelvváltás után a futó bemutató szövege a mai nyelvre áll (retextTour) — ezt kód-szinten '
      + 'javítottuk; önálló böngésző-eset erre nem készült.'),
    row('F91-04', 'A szolgáltatói válasz-szerződés: igazolt forrás, nem díszítés', 'bizonyitva', [
      'npm run verify:app-findings-r91 D) — a külső fél PONTOS lelete reprodukálva, majd mind az ÖT elutasítási ok és egy elfogadott eset, ÉLŐ HTTP-n',
      'npm run verify:assistant — a hat eset szerződés-szinten, befecskendezett fetch-fel',
      'npm run verify:app-findings-r91 D)(h) — a KÉRT nyelv ténylegesen át van adva a szolgáltatónak',
    ], 'HELYI szolgáltatói csonkkal mérve — ez NEM élő AI-eredmény. A VS-LANG jelölő a modell '
      + 'DEKLARÁCIÓJA: nyelv-felismerés nincs. A forrás-ellenőrzés a hivatkozás LÉTÉT és verzióját '
      + 'méri, nem a mondat logikai következését.'),
    row('F91-05', 'EGY közös elérhetőségi szerződés + művelet-paraméterek', 'bizonyitva', [
      'npm run verify:tutor TUT11 — a deklaráció MINDKÉT irányban, és a négy fogyasztó ugyanazon a halmazon',
      'npm run verify:app-findings-r91 A) — három kérő-állapot (névtelen · fiók nélkül · fiókkezelő) élő HTTP-n',
      'npm run verify:assistant AST03 — a tömb, az ismeretlen mező, a hibás típus és a hosszú érték NEVEZETT elutasítása',
      'npm run verify:app-findings-r91 F) — a felkínált műveletek mind writes:false a határon is',
    ], null),
    row('F91-06', 'Emberi felület és melléklet', 'bizonyitva', [
      'tests/e2e/v3app-r91.spec.mjs R91-09 — a megnyitott mellékleten NINCS látható nyers azonosító és változónév; egy rövid jelzés; a részletek lenyithatók; a készlet-oldalon a SAJÁT műveletei',
      'v3app/public/chat.mjs — a forrás-sor EMBERI címmel, a szolgáltatói változónevek a technikai részben',
    ], 'A nyelvi lektorálás MÓDJA megnevezve, de a lektorálás nem ebben a körben történik. A '
      + 'képernyőolvasós akadálymentesség (felolvasási sorrend) továbbra sincs mérve.'),
    row('F91-07', 'Forráskötés, fogyasztás és az állítások szétválasztása', 'bizonyitva', [
      'ez a leltár: HÁROM forrás-fej megnevezve, és a munkafa tisztasága MÉRVE',
      'docs/70_PLANNING/V3_R91_FOGYASZTAS_LELTAR.json — tartalom nélküli leltár, a HELYES ablakkal (az R91 board-időbélyege)',
      'a lap 8. szakasza — az induló teher, a hívásszám, a nagy visszaolvasások és a beavatkozási pontok az AKTUÁLIS naplóból',
    ], 'A korábbi kör `--from` értékének tisztázása a lapon áll: a munkamenet MÉRT kezdete '
      + '2026-09-26T07:44:43Z, tehát a megadott 05:30Z korábbi volt minden tevékenységnél — nem '
      + 'szűkítette az ablakot, hanem tágabb volt nála.'),
    row('F91-ELO-AI', 'VALÓDI AI-integráció: engedélyezett szolgáltatóval mért kérdés–válasz', 'nem_futott', [
      'npm run kapcsolat:ai → NINCS CSATLAKOZÁS (hiányzik: VS_AI_PROVIDER)',
      'npm run proof:assistant-live → kilépési kód 2 (NEM FUTOTT), a nevezett elfogadási sorral',
    ], 'KÜLSŐ BEÁLLÍTÁS. A válasz-KEZELÉS kódhiánya ettől függetlenül javítva és mérve (F91-04).'),
  ],
  /**
   * A SÖPRÉS HÁROM TÉTELE KÜLÖN ÁLLAPOT (F91-07, a reviewer kikötése): az elavult tanú NEM ugyanaz,
   * mint a be nem fejeződött lánc — és egyik sem „zöld".
   */
  sopres: [
    { lanc: 'verify:capability-witness', allapot: 'hibas',
      // A SZÁM MÉRVE, NEM ÁTVÉVE: a csomag zárásakor futtatva HÁROM elavult rögzítés van, nem kettő.
      // A harmadik (`v3-user-facing-text`) az R89-ben született i18n-szótárak miatt lett `present`, és
      // az R89-es jelentésem még a csomag ELŐTT mért kettőt írta — ez itt KIJAVÍTVA (KUKA-050).
      mit: 'HÁROM rögzítés ELAVULT a V2 board-regiszterében: v3-ui-slice · v3-vertical-slice · v3-user-facing-text (mind „mért: present · rögzített: absent")',
      mert: '8/11 egyezik · 3 elavult rögzítés · 2 gépileg nem mérhető (kimondva) — npm run verify:capability-witness, kilépési kód 1',
      teendo: 'a V2 repó tools/chatops-board/config/matrix-capabilities.json három sorának present-re állítása',
      miert_nem_tettuk_meg: 'a parancs KIZÁRJA a V2-módosítást — az igény NEVESÍTVE áll, elvégezve nincs' },
    { lanc: 'verify:v3ref', allapot: 'nem_futott',
      mit: 'a mutációs battéria nem fér a saját egység-költségvetésébe ezen a gépen',
      teendo: 'gép vagy battéria-darabolás felülvizsgálata',
      miert_nem_tettuk_meg: 'hiányos MÉRÉS, nem piros tartalom; a v3ref/ egyetlen fájlja sem változott ebben a csomagban' },
    { lanc: 'verify:external-checks', allapot: 'nem_futott',
      mit: 'a lánc a söprés 900 s-os türelmén belül nem fejeződött be',
      teendo: 'külön futtatás',
      miert_nem_tettuk_meg: 'a csomag a v3ref magot nem érinti; a részleges futás NEM írhatja felül a teljes mérés lapját (KUKA-206)' },
  ],
  hatokoron_kivul: ['merge', 'telepítés', 'V2-módosítás', 'új üzleti Mini modul', 'új előfizetés',
    'szolgáltató-vásárlás', 'a core-core zárása', 'a CMD/PR zárása', 'nyelvi lektorálás'],
};

const target = join(ROOT, 'docs/70_PLANNING/V3_R91_ELFOGADAS.json');
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
const by = out.elfogadas.reduce((a, r) => ({ ...a, [r.verdikt]: (a[r.verdikt] || 0) + 1 }), {});
console.log('R91 ELFOGADÁSI LELTÁR —', target.replace(ROOT + '/', ''));
console.log('  sorok:', out.elfogadas.length, JSON.stringify(by));
console.log('  söprés:', out.sopres.map((s) => `${s.lanc}=${s.allapot}`).join(' · '));
console.log('  mért kód feje:', out.forras_kotes.mert_kod_feje_rovid, '· munkafa tiszta:', out.forras_kotes.mert_kod_munkafa_tiszta,
  `(${out.forras_kotes.mert_kod_valtozott_fajlok} változott fájl)`);
