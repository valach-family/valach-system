> **Kör:** R100 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R100 — A FUTTATÓ LEZÁRÁSA MINDHÁROM ÚTON KÉSZ: igazolatlan takarítás után nincs következő teszt, és a megszakítás szabályosan áll le

CMD-VS-300-002-002 R100 — REPORT (válasz az R98 §F98-01-re)
PR-VS-300 · STEP-VS-300-002 · 2026-09-28
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R98 — ANALYSIS` (chatgpt-v3) · Átadás: R99

---

## 1. MIT JELENT EZ A HASZNÁLATBAN?

**Két hiba volt, és mindkettő ugyanarról szólt: a rendszer nem tette rendbe maga után a gépet, mielőtt
továbbment volna.**

**Az első — „a takarítás nem sikerült, mégis indult a következő teszt".** Az ellenőrző sorozat eddig
feljegyezte, ha egy teszt után folyamatok maradtak életben, **de a következő tesztet így is elindította**.
Ez azért baj, mert a következő mérés egy leterhelt, nem tiszta gépen futott — az eredménye pedig
megbízhatatlan. Ráadásul a képernyőn közben „2 zöld" állt, tehát a jelentés jobbnak látszott a
valóságnál. **Mostantól a sorozat MEGÁLL**, a hátralévő ellenőrzések pedig nevet kapnak:
*„nem indult — az előző lezárása nem igazolt"*. Nem néma kihagyás, és főleg nem zöld.

**A második — „megszakításkor nem kapott időt a szabályos leállás".** Ha a futást menet közben
megszakították (Ctrl+C), a rendszer a leállító jelet és a kényszerleállítást **közvetlenül egymás után**
küldte. Aki szabályosan, rendben akart leállni, annak erre nem maradt ideje: a beállított türelmi idő
ezen az úton nem is létezett. **Mostantól megszakításkor ugyanaz a rend fut, mint egyébként:** jel →
türelem → és csak ha kell, kényszer → majd annak ellenőrzése, hogy tényleg nem maradt semmi.

**Egy fontos különbségtétel, ami eddig hiányzott:** ha egy ellenőrző hibát talál (piros), a sorozat
**megy tovább** — az a mérés dolga. Ha viszont a *takarítás* nem igazolható, **megáll** — az a gép
állapotáról szól. A kettő eddig egy kalap alá került.

**És amit nem ígérünk, kimondva:** ha magát a futtatót lövik ki (SIGKILL), vagy a gép esik ki, semmilyen
takarítás nem fut — erre nem vállalunk garanciát. Ugyanígy nem tudjuk felügyelni azt a folyamatot, amely
szándékosan kilép a saját csoportjából.

---

## 2. FORRÁSKÖTÉS — mit ellenőriztem induláskor

- **Parancs:** az `R98 — ANALYSIS` **teljes szövegét a boardról olvastam** (`doc_key`
  `20260928_V3_R98_R97_ELLENORZES`, board-időbélyeg `2026-09-28T16:10:58.495Z`), nem csak az R99
  közvetítésében. A `R99 — REPORT` átadást szintén.
- **Ág:** `claude/admiring-euler-ylij2e` · **átadási fej:** `9f0af95369bae26e36f419da14b3ff66ada6d207` —
  ellenőrizve, hogy ez az ág feje. A munka a `claude/peaceful-fermat-g7nsx2` ágon folyik, amelynek
  korábbi feje (`d950392`) **őse** az átadási fejnek, tehát ráállítása semmit nem dobott el.
- **FRISS MUNKAMENET — MÉRVE, nem állítva** (az R98 §F98-02/1 belépő feltétele):
  munkamenet `32f4f8b5-01de-5bd4-a530-499ccd2cdfa5` (env-kötés), **eltér** az R97/R99
  `9a15ba99-…` munkamenetétől; induló mérés: 10 hívás, fő-szál kontextus **medián 121 819,5 /
  max 134 962**, lefedettség teljes, küszöbök rendben (kilépési kód 0).

---

## 3. A KÉT JAVÍTÁS

### F98-01/A — igazolatlan takarítás után nincs következő teszt

A sorrend eddig a söprés törzsében, egyetlen `for` ciklusban élt — **kívülről meghívhatatlanul, tehát
bizonyíthatatlanul**. Ezért a vezérlés külön feloldóba került: **SEQ-01
(`tools/lib/vs_sweep_sequence.mjs`)**, amit a söprés és a próba **ugyanúgy hív** (KUKA-207).

- A takarítás állapota **három nevezett válasz**: `igazolt` · `maradvany` · `nem_igazolhato`.
- Megáll: maradvány · **nem mérhető lezárás (platform-korlát)** · hiányzó takarítás-válasz.
  **A platform-korlát nem hallgatólagos engedély a folytatásra.**
- A kimaradók nevezett állapotot kapnak, a söprés **hibával zár**, és a megállás **a pillanatában**
  kiíródik, nem a futás végén.
- A feladat **eredménye** és a **lezárás** külön mező marad.

### F98-01/B — megszakításkor véges, szabályos leállítás

`tools/lib/vs_child_runner.mjs`: a jelkezelő (SIGINT · SIGTERM · SIGHUP) **ugyanazt a véges láncot**
futtatja, mint a normál út, **a hívó türelmével** (a nyilvántartás mostantól hordozza a `graceMs`/
`verifyMs` értéket).

- **Ismételt jel:** nem indít második, versengő takarítást — a **türelmet zárja le**, és a már futó rend
  lép a kényszerre. Így a viselkedés egyértelmű és véges.
- A szinkron `exit`-hook **csak végső védőháló**.
- A jel nem nyelődik el: a kilépési kód továbbra is igaz (130 / 143), csak most **a lezárás igazolása
  után**.
- **A garancia határa kimondva** (`CHILD_RUNNER_CONTRACT.not_guaranteed`): futtatóra küldött SIGKILL ·
  operációsrendszer-kiesés · a saját csoportjából önállóan kilépő leszármazott.
- Mellette egy versenyhelyzet lezárva: ha a megszakítási és a normál út egyszerre ér a lezáráshoz, a
  jel-küldés kivétele **nevezett `nem_igazolt`** lesz, nem néma összeomlás a takarítás közben.

---

## 4. AZ ÖT CÉLZOTT ELFOGADÁSI PRÓBA — `npm run verify:child-runner`

Az R98 öt pontja CR09–CR13 néven épült be; a meglévő CR01–CR08 **változatlanul megmaradt**, a CR05
nevezett-kihagyás útja is. **Saját futásom: 46/46 PASS.**

| próba | mit mér | mért eredmény |
|---|---|---|
| **CR09** | igazolt lezárás után a második feladat **pontosan egyszer** indul | `["elso","masodik"]`, megállás nincs |
| **CR09** | **piros** verifier NEM állítja meg a sorozatot (két külön tény) | `["a","b"]` lefutott |
| **CR10** | maradvány · platform-korlát · hiányzó válasz ⇒ a következő **nulla alkalommal** indul | mindhárom ágon csak `["elso"]` |
| **CR10** | a kimaradók **megnevezve**, nevezett okkal | `masodik`, `harmadik` — „nem indult — az előző lezárása nem igazolt" |
| **CR11** | a **szabályos** gyermek a türelmen BELÜL befejezi a takarítását | a jelzőfájl **megszületett**, kilépés 130, 1 327 ms |
| **CR12** | makacs gyermek/unoka után a **véges kényszerleállítás** is igazolt | 2 PID mérve, mind megszűnt; 2 249 ms |
| **CR13** | **ismételt** megszakítás: véges, versengés nélküli | **9 000 ms türelem mellett 301 ms** alatt kilépett, 130, maradvány nincs |
| **CR13** | normál siker és hibás kilépés után a nyilvántartás üres | `[]` |

**A próbák a TÉNYLEGES söprés-vezérlőt hívják** (SEQ-01), és a CR11–CR13 valódi folyamatfákon mér —
rövid szintetikus úton, hosszú lánc nélkül, ahogy az R98 kérte.

### 4/b. ELLENPRÓBA — a zöld önmagában nem bizonyíték

| visszarontott alak | a próba válasza |
|---|---|
| a jelkezelő a RÉGI alakra (SIGTERM+SIGKILL azonnal) | **CR11 PIROS** — `jelzo_letrejott: false`, a futtató **6 ms** alatt kilép (az R98 leletének pontos reprodukciója) |
| a sorozat megállása kivéve | **CR10 hat ága PIROS** — mindhárom ágon `["elso","masodik","harmadik"]` indult el |

A visszaállítás **sha256-tal igazolva** mindkét fájlra, és a munkafán rontás-nyom nem maradt (KUKA-126).

### 4/c. EGY LELET A SAJÁT PRÓBÁMBAN

A CR13 első alakja **pirosat adott egy helyes kódra**: a zárás figyelőjét a jel-küldő ciklus *után*
kötöttem be, ezért az ismételt jelre gyorsan (≈180 ms) kilépő futtató `close` eseménye elveszett, és a
12 s-os várakozás járt le. **A próba a saját versenyhelyzetét mérte a rendszer helyett** (KUKA-120 ·
KUKA-127). Javítva: a figyelő a jelek elé került.

---

## 5. SÖPRÉS ÉS MÉRÉSEK

`npm run verify:sweep -- --skip verify:external-checks,verify:v3ref` — **24 zöld · 1 piros · 0
env-kihagyás · 2 NEM IGAZOLT kihagyás**, 41 s. Kilépési kód 1.

- **A két hosszú lánc nem futott, és NEM igazolt** (`verify:external-checks` · `verify:v3ref`). Az R98
  kimondta, hogy ehhez a javításhoz nem kell elindítani őket; a söprés ezt **nem zöldnek**, hanem
  nevezett hiánynak írja ki, és az összverdikt emiatt sem zöld. Külön futtathatók.
- **A piros ÖRÖKÖLT, és mérve az:** `verify:capability-witness` — `8/11 egyezik, 3 ELAVULT RÖGZÍTÉS`.
  **Ugyanezt mértem az átadási fejen is**, a saját változtatásaim nélkül (git stash-sel mérve, a munkám
  sha256-tal visszaigazolva). Ez a V2-képesség-katalógus három eltérése, amit az R98 külön nyitottként
  nevez meg — **bizonyíték nélkül nem állítom át** (KUKA-122).
- **KUKA-247 + D-VS-3080** rögzítve (regiszter · őr-otthon · archívum-tábla · döntésnapló);
  `verify:kuka` **461/461 PASS**, `verify:decision-numbers` 4/4 PASS.

**Fogyasztás (a csomag ablaka):** a kör induló mérése medián 121 819,5; a kód-munka után **medián
161 784 / max 259 856**, 47 hívás, ügynök 0, lefedettség teljes, **küszöbök rendben** (a 200 000-es
mediánjelző alatt). A záró pillanatkép a 7. szakaszban.

---

## 6. AMI VÁLTOZATLANUL NYITOTT — nem rejtett pluszfeladat

`verify:external-checks` és `verify:v3ref` **nem futott és nem igazolt** · a V2-képesség-katalógus **három
eltérése** (hiány, nem felhatalmazás az átállításukra) · a külső lánc korábbi hibái (`r79` · `r59a` ·
`r59`) · élő AI-mérés · a modell kiválasztási minőségének mérése · teljes háromnyelvű lektorálás
(részleges átnézés marad) · a meghívó-elfogadás saját képernyőjének súgója/túrája · a fogyasztásmérő
út-paraméterének védelme (`--`-sal kezdődő érték — az R99 nevezett, elkezdés nélküli lelete; **ebben a
körben sem indult el**, mert új kódolás).

**Teljes rendszer-zöld nem állítható**; a 16 elfogadott / 13 részleges klauzula **nem** készültségi
százalék; teljes core-core lezárás nincs. Nincs merge, telepítés, V2-módosítás, új szolgáltató, új
üzleti Mini modul, core/CMD/PR-zárás. **Ismeretlen költség `null`, nem nulla.**

---

## 7. ZÁRÓ FOGYASZTÁSI PILLANATKÉP — és a munkamenet-határ

**Mérve** (`--session 32f4f8b5-… --from 2026-09-28T16:45:00Z --to 2026-09-28T17:26:34Z`), gépi alak:
`docs/70_PLANNING/V3_R100_FOGYASZTAS_LELTAR.json`.

| mutató | érték |
|---|---|
| munkamenet | `32f4f8b5-01de-5bd4-a530-499ccd2cdfa5` — **friss**, eltér az R97/R99 munkamenetétől |
| ablak | 2026-09-28T16:49:34.166Z → 17:26:33.255Z |
| hívás | 66 (fő szál; **ügynök 0**) |
| friss bemenet / cache-írás / cache-olvasás / kimenet | 132 / 264 712 / 13 446 280 / 107 471 |
| fő-szál kontextus | **medián 208 389,5 · max 304 950** · 400 ezer fölött 0 hívás |
| lefedettség | **teljes** (1 átirat, minden modell-válasz usage-dzsal) |

**A KÍSÉRLETI JELZŐ ÁTLÉPVE:** medián 208 389,5 > 200 000. **A csomag munkája ekkor már kész volt** (a
két javítás, az öt elfogadási próba, az ellenpróba, a söprés, a KUKA-247/D-VS-3080 és ez a lap). Az
R98 §F98-02/2 szerint innentől **új kódolás, új próbasorozat és további nagy beolvasás nem indul** —
ami még következik, az a **minimális zárás**: commit, feltolás, board-feltöltés, olvasható alak.

**Ezért az R99 nevezett, elkezdés nélküli leletét (a fogyasztásmérő út-paraméterének védelme) ebben a
körben sem kezdtem el** — az továbbra is a következő csomag döntése.

**A következő csomag FRISS munkamenetben induljon.** A váltást én nem tudom elvégezni; ezt kérem az
operátortól. Az induló csomag: ez a lap + a board `R98 — ANALYSIS`, az ág `claude/peaceful-fermat-g7nsx2`.

**Amit ebből NEM állítok** (az R98 §F98-02/4 nyomán): megtakarítást, heti limit-arányt vagy V2-re
átadható ár/érték-javulást — a feladatok terjedelme és időablaka eltér. **Ismeretlen költség `null`,
nem nulla.** A publikálási farok továbbra is nevezett hiány: a záró pillanatkép az akkor elérhető
napló feldolgozási lefedettségét jelenti, a későbbi időre nem bizonyít teljességet.
