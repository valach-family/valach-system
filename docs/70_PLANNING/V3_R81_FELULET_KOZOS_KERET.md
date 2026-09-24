# R81 — A V3 felülete: közös alkalmazáskeret, magyar szavak, 15 képernyő újrarendezve

> **Kör:** CMD-VS-300-002-002 R81 · **Sáv:** Claude-v3 · **Állapot:** lezárt
> **Repó:** `valach-family/valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8`
> **Parancs:** a külső ellenőrző fél (chatgpt-v3) **R81 PLAN** lapja · **Döntés:** D-VS-3072
> **A magreferencia (`v3ref/`) egyetlen fájlja sem változott ebben a körben.**

---

## Röviden, magyarul

Eddig a V3 próba-alkalmazása **egyetlen hosszú, számozott lap** volt: a regisztráció, a belépés, a
meghívás, a cégalapítás és az adat-lekérés egymás alatt, a válaszok pedig nyers gépi alakban
(`KIADVA {"qty":"12"}`, `ELUTASÍTVA — melyik kapu: right`, `challenge_superseded`). Fejlesztői
próbapadnak megfelelt, **felhasználói felületnek nem**: a külső ellenőrző fél mind a tizenöt
képernyőn megmutatta, hogy a felhasználó nem tudja megmondani, sikerült-e csatlakoznia, mi a teendő
egy lejárt hivatkozással, vagy mit jelent, hogy „a plafon" nem jog.

**Mostantól rendes alkalmazás-keret van.** Felül a fiókválasztó (a személyes fiók és a
vállalkozások), mellette a saját profil menüje; balra a V2-ből ismerős menü (Műveletek · Riportok ·
Törzsadatok · Beállítások); középen az éppen végzett feladat, egyetlen kiemelt művelettel; jobbról
nyíló panel a meghívásnak és a jogosultságoknak. **Minden felirat EGY forrásból jön**, a gépi ok
pedig nem tűnik el: a „Technikai részletek" lenyílóban megmarad.

**Amit ez a kör NEM tett:** nem nyúlt a maghoz, nem olvasztott össze semmit, nem telepített, nem
küldött valódi levelet, és nem épített új üzleti modult. A termékek, partnerek, raktárak és
bizonylatok listája **bemutató**: szintetikus sorok, a felületen jelölve — és csak akkor látszanak,
ha a VALÓDI mag kiadja az adatot.

---

## 1. Mi épült meg

| Rész | Hol él | Mit old meg |
|---|---|---|
| **Közös keret** | `v3app/public/index.html` (üres váz) + `v3app/public/app.js` | fejléc fiókválasztóval és profillal · bal menü · munkalapok · tartalom egy kiemelt művelettel · jobb oldali panel |
| **EGY szövegforrás (SZO-01)** | `v3app/public/texts.mjs` | a menücím, az oldalcím, a gomb-felirat, az állapot-mondat és a szerver hibakódjának emberi megfelelője MIND innen jön — sablonba feliratot nem égetünk |
| **Bemutató-adat (DEM-01)** | `v3app/public/demoData.mjs` | fiókonként KÜLÖN szintetikus csomag; a mennyiség három állapota (mért · becsült · nem ismert) deklarált adat |
| **Vizuális rend** | `v3app/public/style.css` | a terv színei és méretei (alap `#f6f7f9` · szöveg `#1c2330` · kiemelés `#2d5bd7` · keret `#d4d7dd`), 224 px menü, ~64 px fejléc, töréspontok 1000 px és 760 px |
| **Belépési oldalak** | `app.js` + a szerver `/api/verify` lapja | bejelentkezés · fiók létrehozása · új megerősítő levél · „nézd meg a leveleidet" · lejárt link · meghívás — mind ÖNÁLLÓ kártya |
| **Próbaüzenetek** | a fejléc „Próbaüzenetek" gombja | a bemutató levél-fogadója PANELBŐL nyílik, nem a lap alján áll; a meghívó elkészülte után egy gomb visz a levélhez |

**A védelem nem gyengült (UX-15).** A nézet-kötés szabálya változatlanul EGY modulban él
(`v3app/public/contextBinding.mjs`), amit a lap és a próba-battéria is ugyanonnan hív; minden
kontextusfüggő olvasás és írás viszi a nézet ALANYÁT és KÖNYVÉT, a késve érkező válasz nem írhat az
új nézetbe, és a jogot változatlanul a szerver dönti el.

---

## 2. Amit menet közben MÉRTEM el — két új KUKA-bejegyzés

**KUKA-209 — az újrarajzolás indította a lekérést.** Az első alakban a képernyő rajzolása maga
indította az adat-lekérést. Amikor egy válasz nem volt a nézethez kötve, a lap kiírta a mondatot,
frissítette az állapotát — és ezzel újrarajzolt, ami újra kért. **A saját böngésző-próbám mérte:
700 ezredmásodperc alatt 33 kérés.** Ez pontosan az, amit az R79 parancsa tiltott („a nevezett
nemleges válasz nem indít frissítési kört"). Javítva: a lekérés nézetenként EGYSZER indul magától,
minden további a felhasználó „Frissítés" gombja vagy egy művelet utáni célzott újratöltés; a panel
tartalma állapot, nem csak DOM.

**KUKA-210 — a felület a mag szavait mondta a felhasználónak.** Ezt a külső ellenőrző fél találta
meg, képernyőről képernyőre. Javítva: SZO-01, egy szövegforrás, és a gépi ok a „Technikai
részletek" alá kerül.

---

## 3. A tizenöt képernyő — mi lett belőlük

| # | Régi | Új |
|---|---|---|
| 01 | két űrlap egy lapon, levélnaplóval | **Fiók létrehozása** önálló kártyán; semleges válasz: „Ha ezzel a címmel folytatható a regisztráció, elküldjük a következő lépést." |
| 02 | „Nem sikerült" + angol hibakód | **„Ez a megerősítő link lejárt"** + „Új megerősítő levél kérése"; a gépi ok a Technikai részletek alatt |
| 03 | harmadik e-mail-mező a hosszú lapon | **„Új megerősítő levél"** — egy mező, egy gomb |
| 04 | „bizonyítva", „személyes kör" | **„Az e-mail-címed megerősítve"** + „Tovább a bejelentkezéshez" |
| 05 | minden űrlap egyszerre | **Áttekintés** a közös keretben; személyes fiókban nincs adminszerep-felirat és taglista |
| 06 | „vállalkozási minőség", „joghatóság" | **Vállalkozás hozzáadása**: név · ország/terület · adószám (országfüggő címke); siker után „Hozzáadtad a vállalkozást" + következő lépés |
| 07 | angol szerep, „plafon", token, ISO-lejárat | **Beállítások → Felhasználók → Felhasználó meghívása**: Tag/Fiókkezelő · „Később engedélyezhető adatok" · „A meghívó elkészült." (nem „elküldtük") |
| 08 | JSON a lap alján | **Meghívó-kártya** középen; a cég nevét csak akkor írjuk ki, ha a szerver kiadja a látogatónak — egyébként a semleges mondat |
| 09 | fekete panel angol elutasítással | **„Csatlakoztál…"** + állapotkártya: „A készletadatokhoz még nincs hozzáférésed" + Frissítés |
| 10 | belső azonosítók, „van/nincs" | **Táblázat**: Felhasználó · Szerepkör · Készletadatok · Árak · Állapot · Műveletek; a panelen „Megtekintés engedélyezése" |
| 11 | `KIADVA` + JSON | **Készletegyenleg**: Termék · Raktár · Mennyiség · Egység · Mennyiség jellege; „Nem ismert" ≠ 0, „Becsült" jelölve, „Egység nincs megadva" ahol nincs |
| 12 | „megvonás" gomb a jogválasztó mellett | **„Céges hozzáférés megszüntetése"** külön szakaszban + megerősítés névvel, fiókkal és következménnyel |
| 13 | „másik munkakörnyezetre váltottak" | **„Megszűnt a hozzáférésed a(z) … fiókjához."** + „Személyes fiók megnyitása" |
| 14 | angol mezőút, szürke kísérőszöveg | a hiba **A MEZŐNÉL**: „Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő." + fenti összegzés |
| 15 | hosszú piros mondat, maradványokkal | **„Másik böngészőfülön fiókot váltottál…"** / **„Másik felhasználó jelentkezett be ebben a böngészőben."**; írás-elutasításnál „A módosítást nem mentettük, mert közben másik fiókra váltottál." |

---

## 4. Amit a terv kért, de NEM épült meg — nevesítve

Három tétel a tervből a mai szerver-képességekkel nem teljesíthető, és **nem is színleltük**:

1. **A visszaszámlálás az újraküldésnél** („Új levél 43 másodperc múlva kérhető"). A szerver
   válasza szándékosan SEMLEGES, és nem ad vissza hátralévő időt — kitalálni pedig nem szabad
   (KUKA-050: a szöveg a valóságot követi). Kivezetési feltétel: ha a `/api/verification/resend`
   nevezetten visszaadja a hátralévő időt, a lap kiírja.
2. **A „Meghívások" fül a taglista mellett** (várakozó meghívók). A `GET /api/members` a TAGSÁGOKAT
   adja vissza, a függő meghívókat nem; lekérdező végpont nincs rá. Ezért a „Meghívásra vár"
   állapot sem jelenik meg a táblázatban. Kivezetési feltétel: egy meghívó-lista végpont.
3. **A meghívó cégneve és a meghívó személy neve a meghívó-kártyán.** A megfigyelés (`observeInvite`)
   szándékosan nem árulja el ezeket annak, aki a címzetti csatornát nem bizonyította (KUKA-084) —
   ezért a kártya a semleges mondatot viszi. Kivezetési feltétel: a szerver kimondott, jogosultsághoz
   kötött kiadása.

**És egy negyedik, ami nem a mi hatáskörünk:** a bemutató HTML megnyithatóságát a címzett gépén
(UX-21) böngésző-próba nem igazolja — ezt a melléklet átadása bizonyítja, nem egy zöld teszt.

---

## 5. Bizonyítékok — mi futott le, és mit mért

| Parancs | Eredmény | Mit mér |
|---|---|---|
| `npm run app:selfcheck` | **57/57 PASS** | a héj és a mag szerződéseinek HTTP-szintű önellenőrzése |
| `npm run verify:app-findings` | **73/73 PASS** | az R75 leletei (semleges regisztráció · folytatás lejárt hivatkozásnál · séma a határon) |
| `npm run verify:app-findings-r77` | **34/34 PASS** | az R77 leletei (nézet-kötés az olvasáson · atomi indítás hibás adószámnál) |
| `npm run verify:app-findings-r79` | **49/49 PASS** | az R79 leletei (a hiányzó kontextus-mező NEM egyezés · alany+könyv az íráson) |
| `npm run verify:kuka` | **367/367 PASS** | a visszacsúszás-tiltó minták, benne a két ÚJ tanulság (209 · 210) |
| `npm run proof:core-ux` | **43/43 böngésző-próba** | az R63 tizennégy elfogadási helyzete + az R75/R77/R79 lelet-próbái + az R81 **22 UX-feltétele** |

**A KÉT BIZONYÍTÉK-LAP (gépi alak, a repóban):**

- `docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json` — az R81 huszonkét feltétele: **21 bizonyítva ·
  1 nem böngészőben** (UX-21, az átadott melléklet megnyithatósága — ez a SZÁLLÍTÁS ténye, nem az
  alkalmazásé, ezért nem írjuk zöldnek).
- `docs/70_PLANNING/V3_R75_ELFOGADAS_HELYZETEK.json` — az R63 tizennégy helyzete: **9 bizonyítva ·
  3 részben · 2 nem böngészőben**, azaz a felület átalakítása UTÁN is ugyanaz az ítélet, mint előtte.

Mindkét lap NEVEZETTEN kezeli a részleges futást: ha egy tétel abban a futásban nem futott, a lap
`nem_futott`-ként viszi, és a közzétett példányt NEM írja felül (KUKA-206).

**A ZÁRÓ SÖPRÉS** (`npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse c8c8b25`):
**16 zöld · 0 env-kihagyás · 1 piros**, plusz KÉT ÚJRAHASZNÁLT BIZONYÍTÉK. A feloldó (SRU-01) mind a
négy feltételt MÉRTE mindkét hosszú láncnál — feloldott commit · a commitban ZÖLD, tiszta forráson
született bizonyíték · azonos lánc-bemenet a munkafán · azonos lánc-szkriptek, függőségek és futtató
(v22.22.2) —, tehát ez „újrahasznált bizonyíték", nem kihagyás.

**A PIROS NEVESÍTVE: `verify:capability-witness` — és NEM ennek a körnek a műve.** A board
képesség-regisztere két tételt (`v3-ui-slice` · `v3-vertical-slice`) `absent`-ként tart nyilván,
miközben a fájl-szintű tanújuk MEGVAN (playwright-konfiguráció, `test:e2e`, `.html` lap, illetve
`server.mjs`). **Ugyanez a piros állt az R80 söprésében is, karakterre ugyanazzal az összeggel
(9/11 egyezik · 2 elavult rögzítés)** — tehát a felület átalakítása nem rontotta el és nem is javította.
**Miért nem javítottuk most:** a regiszter a V2 repóban él
(`tools/chatops-board/config/matrix-capabilities.json`), az R81 parancs pedig kimondottan tiltja a
V2 módosítását ebben a körben. A rögzítést az a kör vezeti át, amelyik erre felhatalmazást kap.

**A BEMUTATÓ KÉT LAPJA** (`npm run docs:kiprobalas-kepek`, illetve `VS_KEPEK_JPEG=1` a tömör alakhoz):
`…_v3app_bemutato.html` (felhasználói, 18 képernyő, lépésenként „mit próbálhat ki" és „miből látja a
sikert") és `…_v3app_muszaki.html` (forráscommit · helyi indítás · szerződés-azonosítók · hiányok).
A felhasználói laphoz **nem kell terminál, Git vagy Node** — böngésző elég, internet nélkül is.

---

## 6. Fogyasztás — egy sor, mérve

`npm run meres:fogyasztas -- --session auto --from 2026-09-24T17:55:06Z --label "R81 csomag" --quick`
→ **hívás 402 · fő-szál kontextus medián 493 380,5 (max 761 514) · ügynök-bemenet 0 (0 ügynök) ·
cache-olvasás 194 693 918 · lefedettség: teljes.**

**A kísérleti jelző ÁTLÉPVE** (fő-szál medián > 200 ezer), és ezt nem az operátorra hárítom:
ez EGY csomag volt, egy munkamenetben — teljes felület-átírás plusz a 43 böngésző-próba zöldre
vitele, tizenkét teljes csomag-futással. Az ügynök-oldal nulla (párhuzamos ügynököt nem indítottam,
mert a feladat nem volt szétválasztható). **A szűkítés helye a KÖVETKEZŐ csomag:** a felület-munka
befejeződött, a következő kör új munkamenetben indul, és a hosszú böngésző-iterációt érdemes
előbb célzott, EGY-próbás futásokkal végezni, csak a végén teljes csomaggal — ebben a körben az
első három teljes futás nagyrészt ugyanazt az információt adta, mint amit egy szűkített futás is
megadott volna.

## 7. Amit ez a kör NEM állít

- Nem állítja, hogy a V3 core-lezárása elfogadott — az a külső ellenőrző félé.
- Nem állítja, hogy a bemutatóadatok mögött üzleti modul áll: nincs készletmozgás, könyvelés,
  számlázás, és valódi levél sem megy ki.
- Nem állítja, hogy a képernyők emberi olvashatóságát a zöld teszt igazolja — a terv is kimondja,
  hogy a végső képeket emberileg kell átnézni. A felhasználói bemutató ezért képekkel megy át.
