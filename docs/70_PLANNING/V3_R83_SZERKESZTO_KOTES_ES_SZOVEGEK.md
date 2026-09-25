> **Kör:** R83 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A SZERKESZTŐ A MEGNYITÁSKORI NÉZETHEZ TARTOZIK — az R83 hat leletének lezárása

**Kör:** CMD-VS-300-002-002 **R83** (a külső ellenőrző fél, chatgpt-v3, ANALYSIS lapjára) ·
**Repó:** `valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8` ·
**Forrás-commit:** `05184e79377f4d1e05d6b2ebc3615a0f8704af2b` (tiszta munkafa)

---

## Röviden magyarul

A külső ellenőrző fél hat eltérést mért az előző átadáson. A legsúlyosabb ez volt: **ha valaki két
vállalkozást kezel, és az egyik böngészőfülön átvált a másikra, akkor a régi fülön nyitva maradt
meghívó-űrlap MÁSODSZORRA a MÁSIK cégbe küldte el a meghívót** — pedig a képernyőn még az első cég
neve állt. Nem jogosulatlan írás volt (a felhasználó mindkét céget kezeli), hanem ennél alattomosabb:
**amit a felhasználó akart, és amit a gép csinált, kettévált.**

Ezt a kör lezárja, és mellé még ötöt: a munkalap mostantól **megőrzi a megkezdett kitöltést** (eddig
némán eltűnt); a **Termékkarton és a Készletmozgások engedély nélkül nem mutat adatot** (eddig
mutatott); a mintaadat **fiókonkénti hozzárendelése kimondott** (eddig egy számításon múlt, ami
valódi elkülönítést sugallt); a **sikertelen levélkérés nem mutat sikeres folytatást** (eddig
mutatott); és a **bizonyíték-lap csak azt állítja, amit tényleg mért**.

**Mit lehet kipróbálni:** a csatolt HTML bemutató 18 képernyőn végigvezet — internet és telepítés
nélkül megnyitható. A 17. kép pontosan a fenti helyzetet mutatja.

**Mi maradt nyitva, kimondva:** nem minden felirat jön a közös szótárból (a normál mondatok igen, a
maradék nevesített tétel); a billentyűs bejárásból a fókusz-csapda és a képernyőolvasó felolvasási
sorrendje NINCS mérve; és azt sem állítjuk, hogy a melléklet meg is érkezett — az önhordóságát
mértük, a kézbesítését nem.

---

## 1. A hat lelet és a válasz

| Lelet | Mi volt | Mi lett | Hol a bizonyíték |
|---|---|---|---|
| **F83-01** (blokkoló) | a nyitva maradt panel MÁSODIK kattintása a közben aktívvá lett másik fiókba írt (HTTP 201); az első helyesen 409 volt, de a panel nyitva maradt a régi cég nevével | **PNL-01**: minden író űrlap a rajzolásakor megbélyegződik a nézettel (könyv · alany · generáció); a beküldés EZT használja, és elavult bélyegnél a kérés EL SEM INDUL — a szerkesztő bezárul, a lap kimondja, mi történt, a régi kitöltés nem megy át | `tests/e2e/v3app-r83.spec.mjs` F83-01 és F83-01/b |
| **F83-02** | a munkalap csak látszólag őrizte a munkát: visszatéréskor a kitöltés eltűnt, megerősítés nélkül | **FRM-01**: a kitöltés az állapotba kerül és minden rajzolás után visszaáll; a saját fiókváltás megkérdez, a külső okból jött váltás eldob, a sikeres mentés felejt | `…r83.spec.mjs` F83-02 |
| **F83-03** | jog nélkül is adatot rajzolt a Termékkarton és a Készletmozgások; a mintacsomag karakter-összeg paritásán dőlt el; a mag válaszához kitalált raktár és „Mért" jelleg társult | **STK-01**: a három készlet-jellegű nézet EGY hozzáférés-állapotot olvas egyetlen szerver-válaszból; a hozzárendelés kimondott; a mag sora „Bemutató tétel", raktár és jelleg „Nincs megadva" | `…r83.spec.mjs` F83-03 · UX-20 |
| **F83-04** | a „minden felirat egy forrásból" állítás részleges szótárra épült; nyolc nevesített szöveg-hiba | paraméteres sablonok a közös forrásban (`TPL` + `tpl()`); mind a nyolc tétel átvezetve (lásd a 3. szakaszt) | `verify:kuka` (KUKA-214) · UX-04 · UX-07 |
| **F83-05** | a megszakított levélkérés után is a semleges „küldünk levelet" lap jött | négy külön kimenet EGY feloldóban (`requestOutcome`): `ok` · `refused` · `network` · `uncertain` — a levél-oldal csak az elsőn születik | `…r83.spec.mjs` F83-05 |
| **F83-06** | a „21 UX-feltétel bizonyítva" összegzés két rekeszben a mérésnél többet állított | a verdikt a mért hatókörhöz kötve; új szó: `reszben_bizonyitva`; az UX-06 a 15 HELYZETET járja végig, az UX-18 a fő történet hat lépését és a fókusz visszatérését | `docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json` |

**Mind a hat lelethez ELŐBB ellenpróba készült.** Az öt böngésző-rekesz (`tests/e2e/v3app-r83.spec.mjs`)
**mind PIROSAN indult** a javítás előtti fejen — vagyis a leletek itt is reprodukálhatók voltak, nem
bizalomból fogadtuk el őket.

## 2. Az R81 huszonkét feltételének ŐSZINTE állapota

**20 bizonyítva · 2 részben bizonyítva · 0 nem futott** (`docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json`).

A korábbi „21 bizonyítva + 1 nem böngészőben" összegzés **nem áll**. Ami változott:

- **UX-06** — a mérés már nem tizenöt MENÜPONTOT nyit meg, hanem a tizenöt HASZNÁLATI HELYZETET járja
  végig: hét helyzet ebben a rekeszben, konkrét állítással (regisztráció · lejárt link · újraküldés ·
  megerősítő lap valódi tokennel · személyes fiók és egyszerű menüje · új fiók fajta-választással ·
  a meghívó panel belépője), nyolc helyzet NEVEZETT másik rekeszben (UX-09…UX-16 · R83/F83-01).
- **UX-18** — `reszben_bizonyitva`. A fő történet HAT lépése billentyűvel végigjárva (menü · fő
  művelet · panelen belüli elérés · ESC + fókusz-visszatérés a nyitó gombra · fiókválasztó ·
  munkalapsáv). **Nem mérve, ezért nem is állítjuk:** a fókusz-csapda a panelben, a képernyőolvasó
  felolvasási sorrendje, és a mobil nézet billentyűs útja.
- **UX-21** — `reszben_bizonyitva` (korábban `nem_bongeszoben`). Az **önhordóság MÉRVE van**: a
  bemutató-szerszám megméri, hogy minden kép beágyazott `data:`-URI, nincs külső szkript, stíluslap
  vagy betöltendő `http(s)://` erőforrás — talált külső erőforrásnál a futtató nevezetten megáll. A
  **kézbesítés** ténye viszont ezen kívül esik.
- **UX-05 · UX-15 · UX-19 · UX-20** — a külső fél ellenpróbái ezekbe is belevágtak, ezért a mérésük
  BŐVÜLT: UX-05 a megkezdett szerkesztés át nem vitelével és az elhagyás-kérdéssel; UX-15 azzal,
  hogy a 409 UTÁN a régi panel bezárul (a MÁSODIK kattintás nem létezik); UX-19 azzal, hogy a mag
  sorának nincs kitalált raktára és mérési eredete; UX-20 azzal, hogy mind a HÁROM készlet-jellegű
  nézet ugyanazon a kapun áll.

## 3. Az F83-04 nyolc szöveg-tétele — tételesen

| Kért változás | Mi lett |
|---|---|
| „Vállalkozási minőséget is rögzítek" → fajta-választás | „Új fiók hozzáadása" lap, **Vállalkozás** / **Közös fiók** választóval; az adószám-mező CSAK a vállalkozásnál látszik. Új jogmodell nem épült. |
| nagybetűs kiabálás a normál segédletben | megszűnt; a megszüntetés súlyát **külön szakasz** („Hozzáférés a fiókhoz") és a megerősítő mondat hordozza |
| „Később engedélyezhető adatkör" | „**Mely adatokhoz kaphat hozzáférést?**" + „A megtekintést a csatlakozás után külön engedélyezed." |
| „Mag minta-rekord" / „A magtól kapott sor külön jelölve" | „**Bemutató tétel**"; a belső magyarázat a Technikai részletekbe került |
| `a(z) „…" fiókjához` | sablonok: „Csatlakoztál ehhez a fiókhoz: …" · „Megszűnt a hozzáférésed ehhez a fiókhoz: …" |
| kétszeres sikerjelzés a létrehozás után | **EGY** sikerjelzés (fejléc-sáv) + **EGY** kártya: „Szeretnél másokat is meghívni?" → „Felhasználó meghívása" / „Most kihagyom" |
| „személyes kör" név, céges menüpontok a személyes fiókban | fejlécben „**Személyes fiók**"; a menü az R81-ben kijelölt egyszerű alak (Áttekintés · Ügyleteim · Saját adatok) |
| a lista sorai nem nyithatók meg | minden lista-sor **Részletek** panelt nyit (termék · partner · raktár · folyamat · bizonylat), **folyamatállapot-szűrővel** és **raktárhoz kötött mintanézettel** (a raktár panelje felsorolja az ott tartott tételeket). Csak meglévő fixture, üzleti végrehajtás nélkül. |
| **hiányzó meghívások** | **Felhasználók / Meghívások fülek**; a várakozó lista új olvasó végpontról jön (`GET /api/invites/waiting`), **fiókkezelői jogra és a nézet kötésére** kapuzva, a saját könyv sorival. **Nyers meghívó-token NINCS a listában** — helyette egyirányú lenyomat és az ÁLLAPOT (Elfogadásra vár / Lejárt). |
| **meghívó cégnév** | a szerver a **bizonyított címzettnek** kiadja a minimális fióknevet és a meghívási szerepet (a mag két állapota csak bizonyított csatornán születik); semleges nézőnek semmit. Általános, anonim cégnév-lekérdező nincs. A meghívó **személyét** nem találjuk ki: a ténylegesen tárolt e-mail-címét adjuk, vagy semmit. |
| **újraküldési visszaszámlálás** | elhagyva, az elfogadott szűkítés szerint — új személyazonosság-felderítő végpont nem épült |

## 4. Saját futások (ezen a commiton) és újrahasznált bizonyíték

**SAJÁT FUTÁS, ebben a körben, ezen a fejen:**

| Parancs | Eredmény |
|---|---|
| `npx playwright test` (a teljes böngészőcsomag) | **48/48 PASS** |
| `npm run app:selfcheck` | 57/57 PASS |
| `npm run verify:app-findings` (R75) | 73/73 PASS |
| `npm run verify:app-findings-r77` (R77) | 34/34 PASS |
| `npm run verify:app-findings-r79` (R79) | 49/49 PASS |
| `npm run verify:kuka` | 384/384 PASS |
| `npm run verify:doc-html` | 9/9 PASS |
| `npm run verify:artifact-naming` | 28/28 PASS |
| `npm run verify:decision-numbers` | 4/4 PASS |
| `node tools/v3_kiprobalas_kepek.mjs` (+ a tömör alak) | 18 képernyő, önhordóság OK |

**ÚJRAHASZNÁLT BIZONYÍTÉK: NINCS.** Ebben a körben a fenti listák MIND ebben a csomagban futottak le;
`--reuse` feloldót nem használtunk.

**NEM FUTOTT, KIMONDVA:** a `npm run verify:sweep` teljes söprése (és benne a `verify:external-checks`
és a `verify:v3ref` több-tízperces láncai) ebben a csomagban **nem futott le**. Az R83 munkarendje a
célzott ellenpróbákat és „egyszer az ÉRINTETT teljes böngészőcsomagot" kérte, nem tizenkét teljes
futást — ezért a fenti nevesített kapuk futottak. **Ez NEM zöld söprés**, és nem is írjuk annak: a
söprés eredménye ehhez a csomaghoz **NEM IGAZOLT**, a mag (`v3ref/`) viszont **egyetlen fájllal sem
változott** (a diff a `v3app/`, a `tests/`, a `contracts/`, a `tools/` és a `docs/` fákat érinti).

**A V2-ben tárolt képesség-regiszter két elavult sora** (`v3-ui-slice` · `v3-vertical-slice`)
változatlanul fennáll — **külön, nevesített eltérés**, amit ez a kör NEM javít, mert a parancs tiltja
a V2 módosítását. Pirosból nem lesz zöld szöveges indoklással: ez a sor MARAD piros a söprésben.

## 5. A szállított melléklet

| Fájl | Méret | SHA-256 |
|---|---|---|
| `v3_v3.0.0-alpha_20260925_053618_v3app_bemutato.html` (felhasználói, PNG) | 2,06 MB | `8341d8a204b08fda0dd70850cac64ff0ca86a6dc9c6588f4693a0308235bd9e0` |
| `v3_v3.0.0-alpha_20260925_053618_v3app_muszaki.html` (műszaki melléklet) | 9,4 kB | `4f3ce55edcbb704c261898c0f84626249ac8642899e5d9fb1715bbc367e46d5d` |
| `v3_v3.0.0-alpha_20260925_053658_v3app_bemutato_tomor.html` (tömör, JPEG) | 691 kB | `5baf70aa593dd0ac5ed654bf9ab894cfd4b2ddce33d6e8ec55eb81849528c6c1` |
| `v3_v3.0.0-alpha_20260925_053658_v3app_muszaki_tomor.html` | 9,4 kB | `5a988011227bfc7ce2583e8d206f3e7c399a0bab1e4270c432b74d19a143cb86` |

Mind a négy a `05184e79377f4d1e05d6b2ebc3615a0f8704af2b` commiton, **tiszta munkafán** készült. Az
önhordóság **mérve**: 18 kép, mind beágyazott `data:`-URI · külső szkript, stíluslap és betöltendő
`http(s)://` erőforrás: **NINCS**. A felhasználói bemutató **terminált, Git-et és Node-ot nem kíván**:
egy HTML fájl, kettős kattintásra megnyílik. A helyi indítás pontos útja a KÜLÖN **műszaki
mellékletben** áll, hogy a felhasználói lap olvasható maradjon.

## 6. Fogyasztás

Az R83 csomag ablaka **2026-09-25T04:15:00Z → 05:37:50Z**, mérve:
**186 hívás · cache-olvasás 57 891 028 · kimenet 184 999 · ügynök-bemenet 0 (0 ügynök)** ·
lefedettség **teljes**. Tartalom nélküli leltár: `docs/70_PLANNING/V3_R83_FOGYASZTAS_LELTAR.json`.
Az ELŐZŐ csomag leltára megőrizve: `docs/70_PLANNING/V3_R81_FOGYASZTAS_LELTAR.json`.

**Átlépett kísérleti jelző, kimondva:** a fő-szál kontextus **mediánja 308 262,5** (a jelző 200 ezer),
a maximum 782 404; 32 hívás ment 400 ezer fölött. **Amit ezért szűkítettem:** párhuzamos ügynököt és
workflow-t egyet sem indítottam (0 ügynök, 0 ügynök-bemenet); a terminálra csak összegzés és a hibás
sor ment, a teljes napló fájlba; a teljes böngészőcsomagot **kétszer** futtattam (nem minden javítás
után), a köztes köröket célzott rekeszekre szűkítve. **Amit nem tudtam szűkíteni:** a csomag közben
egy tömörítés történt (a mérés szerint 175 hívás esik utána), és a fő szál kontextusát ez a csomag
mérete hordozza — ez a jelző a MÉRÉS tárgya, nem hiba.

## 7. Amit ez a kör NEM állít

- **Nem állítja, hogy minden felirat a közös szótárból jön.** A normál mondatok és a paraméteres
  alakok ott vannak; a maradék beégetett felirat **nevesített nyitott tétel**, és a védelme az emberi
  képolvasás — nem gépi jel.
- **Nem állítja, hogy a felület billentyűvel teljesen akadálymentes.** A fókusz-csapda és a
  képernyőolvasó sorrendje nincs mérve (UX-18 ezért `reszben_bizonyitva`).
- **Nem állítja, hogy a melléklet megérkezett.** Az önhordóság mérve, a kézbesítés nem (UX-21).
- **Nem állít zöld söprést.** A két hosszú lánc nem futott; a V2-ben élő képesség-regiszter két
  elavult sora továbbra is piros, és ezt a kör nem javítja.
- **Nem üzemi rendszer:** nincs telepítés, migráció, valódi levélküldés, számlázás és üzleti modul.
  A termék-, partner-, raktár- és bizonylat-listák BEMUTATÓ mintaadatok, jelölve.
