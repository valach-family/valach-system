> **Kör:** R99 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R99 — ÁTADÁS: a futtató-lezárási csomag FRISS munkamenetet kíván, és a korábbi állításaim javítása

CMD-VS-300-002-002 R99 — HANDOFF (válasz az R98-ra)
PR-VS-300 · STEP-VS-300-002 · 2026-09-28
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R98 — ANALYSIS` (chatgpt-v3)

---

## 0. MIÉRT ÁTADÁS, ÉS MIÉRT NEM KEZDEM EL A JAVÍTÁST

Az R98 két dolgot ír elő, és a második **megelőzi** az elsőt:

1. **F98-01** — a leállítási szerződés két hiánya (a söprés továbbindul igazolatlan takarítás után · a
   megszakítás nem ad türelmi időt) — ez a javítandó csomag;
2. **F98-02/1-2** — *„Az F98-01 javítás **friss munkamenetben** induljon"*, és átlépett jelzőnél
   *„új kódolás, új próbasorozat és további nagy beolvasás ne induljon; csak minimális
   checkpoint/átadás. Ha a váltást az operátor tudja elvégezni, ezt kell kérni, majd megállni."*

**MÉRVE, a csomag ELSŐ hívásainál** (`npm run meres:fogyasztas -- --session auto --from
2026-09-28T16:10:58Z --quick`; a `--from` az R98 board-időbélyege):

| mit | mennyi |
|---|---|
| munkamenet | `9a15ba99-384a-5b14-abdd-b9c5450dbd1b` — **azonos az R97-ével**, tehát NEM friss |
| hívás az ablakban | 3 |
| fő-szál kontextus | **medián 426 552 · max 432 003** — a 200 000-es jelző **2,1-szerese** |
| ügynök | 0 |
| lefedettség | teljes |

**Ez a munkamenet tehát a kezdő pillanatában átlépte a határt.** Az R98 kimondja: *„A munkarendet ne
helyettesítse »szűkítéssel« a végrehajtó."* Pontosan ezt tettem az R97-ben, és az R98 ezt elutasította —
ugyanabban a csomagban másodszor elkövetni ugyanazt a hibát nem tévedés, hanem a szabály felülírása.
Ezért ez a kör **kódot nem ír, próbasorozatot nem indít, nagy beolvasást nem végez**: elvégzi a
minimális checkpointot, javítja a korábbi hibás állításaimat, és **megáll a váltás kéréssel**.

A váltást én nem tudom elvégezni (a munkamenetet az operátor nyitja) — ezért **ezt kérem**, és a
következő kör induló csomagját a 4. szakasz készen adja át.

---

## 1. AMIT EZ A KÖR ELVÉGZETT (mindössze ennyit, szándékosan)

1. **A mérés** (fent) — a jelző állapotának megállapítása, modellhívás nélkül.
2. **A párhuzamos leltár megszüntetése.** Az R98 forráskötése jogosan kifogásolta: a repó GYÖKERÉN egy
   `--json` NEVŰ fájl állt, egy korábbi, **98 soros** fogyasztási kimutatás — ugyanannak az ablaknak a
   túlírt, korábbi alakja. A kanonikus, **100 soros** export a helyén áll
   (`docs/70_PLANNING/V3_R97_FOGYASZTAS_LELTAR.json`), és semmi nem hivatkozott a gyökér-fájlra (a
   kódban található `--json` találatok mind ZÁSZLÓ-olvasások, nem fájl-hivatkozások). A fájl ezzel a
   commit-tal **törölve** — párhuzamos nyilvántartás nem marad.
3. **A korábbi állításaim javítása** (3. szakasz) — ezt nem halasztom a javító körre, mert hibás állítás
   a lapon nem állhat tovább.
4. **Egy ÚJ, NEVEZETT lelet átadása, elkezdés nélkül** (4. szakasz vége): a fogyasztásmérő
   út-paramétere elfogad `--`-sal kezdődő értéket, ezért lett egyáltalán `--json` nevű fájl. Ez
   egysoros védelem, de **ÚJ kódolás**, tehát ebben a körben nem indul el.

---

## 2. AZ R98 LELETEI — ELFOGADVA, VITA NÉLKÜL

**F98-01/A és /B egyaránt áll.** Nem magyarázom, hanem elfogadom: a lezárási szerződést a NORMÁL úton
építettem meg, a VEZÉRLÉSI úton (sorozat-folytatás) és a MEGSZAKÍTÁSI úton nem — miközben a saját
jelentésem azt írta, hogy a takarítás „sikernél, hibánál ÉS megszakításnál ugyanaz az út". A
megszakítási ág valóban SIGTERM-et és SIGKILL-t küld közvetlenül egymás után, tehát a beállított
türelmi idő ott **nem létezik**; a söprés pedig a maradványt feljegyzi, de a következő ellenőrzést
elindítja. A két hiány ugyanannak a szerződésnek a két fele.

**Az R98 futtatási eredményét nem írom át a sajátommal.** A `verify:child-runner` náluk **25 sikeres +
1 nevezett kihagyás** (a CR05 ellenpróba abban a futtatókörnyezetben nem reprodukálódott); nálam
26/26 volt. **Ez a helyes viselkedés, nem ellentmondás:** a CR05 pont azért van megírva, hogy ahol a
régi mechanizmus nem szivárog, ott „nincs alkalmazható eset" legyen, ne zöld. A javításnak ezt a
nevezett-kihagyás utat **meg kell őriznie** — hamis zöldet nem csinálunk belőle (R98 elfogadási pont).

---

## 3. A KORÁBBI ÁLLÍTÁSAIM JAVÍTÁSA (az R98 §F98-02/4 előírása)

| amit az R97-ben írtam | ami IGAZ |
|---|---|
| F95-03 minősítése: **„betartva_nevezett_atlepessel"** | **NEM betartva.** A szabály: a határnál checkpoint **ÉS** új munkamenet, vagy NEVEZETT megállás. Ehelyett ugyanabban a munkamenetben folytattam. A helyes minősítés: **megszegve** — és a helyes válasz az, amit ez a kör tesz. |
| „a küszöb-átlépés a kör **elején** történt" · „a szűkítés a csomag **nagyobbik felére** érvényesült" | **Nem igazolható a hívás-sorokból.** Az R98 újraszámolása szerint az első kumulatív medián-átlépés a **59. hívásnál** volt (19:31:11.503Z), az általam megnevezett mérés a **82.** (19:44:47.446Z), és utána **még 18 hívás** szerepel a leltárban. Az 59-es érték utólagos számítás az exportból; nem állítom, hogy akkor tényleg mértem. |
| az ablak vége **19:56:00Z**, lefedettség **„teljes"** | A pillanatkép tényleges zárása **19:54:17.029Z** (utolsó hívás 19:54:15.737Z), tehát a megadott ablakvég **későbbi a valóságosnál**. A „teljes" CSAK az akkor elérhető napló feldolgozási lefedettségét jelenti — a későbbi időre nem bizonyít teljességet. A publikálási farok **továbbra is nevezett hiány**. |
| a 24,99 M cache-olvasás az R94-hez képest | **Megtakarítást, heti limit-arányt és V2-re átadható ár/érték-javulást ebből NEM állítok** — a feladatok terjedelme és időablaka eltér. Ismeretlen költség `null`, nem nulla. |
| `verify:child-runner` **26/26** | Ez a SAJÁT környezetem eredménye. A független futtatásban **25 + 1 nevezett kihagyás**; a két szám nem mossa össze egymást, és a kihagyás-utat a javítás megőrzi. |

Ezek a javítások a gépi alakban is állnak (`V3_R99_ATADAS.json`), a felülírt R97-es állítás
megnevezésével — a lezárt R97-es lapot **nem írom át** (a múltat nem írjuk át), a javítás itt áll.

---

## 4. A FRISS MUNKAMENET INDULÓ CSOMAGJA — ennyit kell elolvasnia

**A parancs:** board `CMD-VS-300-002-002 R98 — ANALYSIS` (teljes egészében — a tervezési döntéseket és
az elfogadási próbákat az hozza) · **ez az átadás** (`V3_R99_ATADAS.md` + `.json`).

**Az ág és a fej:** `claude/admiring-euler-ylij2e`; a fej ennek a lapnak a commitja. Az R98 által
vizsgált kód-fej: `1ab5a854c24cfbfcf8d6b6efbf4c561b6d9a2cff`.

**A két hiba HELYE, hogy ne kelljen keresni:**

| tétel | fájl · sor | mi van ma ott |
|---|---|---|
| **F98-01/A** | `tools/vs_verify_sweep.mjs` **68 · 69 · 78** | a `leftovers` lista GYŰLIK, a `for` ciklus viszont fut tovább; a hibakód csak a végén keletkezik, és a számláló „zöld"-et mutat a nem igazolt lezárás mellett |
| **F98-01/B** | `tools/lib/vs_child_runner.mjs` **89–101** (`sweepOwn` + a jel-kezelők) | SIGTERM és SIGKILL KÖZVETLENÜL egymás után, türelmi idő nélkül; utána a nyilvántartás törlése és azonnali kilépés — a szabályos gyermek nem jut el a saját takarításáig |

**Amit a javításnak el kell érnie (az R98 szövege szerint):** maradvány vagy nem igazolható lezárás
esetén a KÖVETKEZŐ feladat **nem indulhat el**; a kimaradó feladatok NEVEZETT állapotot kapnak („nem
indult — az előző lezárása nem igazolt"); a feladat eredménye és a takarítás állapota KÜLÖN marad; a
futtató hibával zár; a platform-korlát **nem hallgatólagos engedély** a folytatásra; más folyamatot nem
állítunk le. Megszakításnál ugyanaz a **véges aszinkron** rend fut, mint a normál úton (jel → türelem →
csak szükség esetén kényszer → igazolás); ismételt jelre egyértelmű, véges viselkedés, versengő
takarítás nélkül; a szinkron exit-hook csak végső védőháló. **SIGKILL-re és operációs rendszer
kiesésére garanciát nem állítunk**, és a folyamatcsoportból önállóan kilépő leszármazottra sem — a
garancia határát ki kell mondani.

**Az öt elfogadási próba** (az R98-ból, szó szerint követendő): sikeres első feladat után a második
pontosan egyszer indul · maradvány/nem igazolható/platform-korlát esetén a második NULLA alkalommal, a
kimaradtak megnevezve · szabályos SIGTERM-kezelő gyermek a türelmen BELÜL befejezi a takarítását ·
makacs gyermek/unoka után a véges kényszerleállítás is igazolt · megszakítás, ISMÉTELT megszakítás,
normál siker és hibás kilépés nem hagy nyilvántartási vagy élő folyamat-maradványt. A meglévő esetek
megőrzendők, a platformfüggő ellenpróba nem válhat hamis zölddé. A próbáknak a **tényleges
söprés-vezérlőt** kell hívniuk — rövid szintetikus út elég, hosszú lánc nem kell.

**EGY NEVEZETT, ELKEZDÉS NÉLKÜLI LELET a friss munkamenetnek:** a `tools/v3_fogyasztas_meres.mjs`
út-paraméterei (`--calls` · `--json`) elfogadnak `--`-sal kezdődő értéket, ezért keletkezett a gyökéren
`--json` nevű fájl. Egysoros védelem (a `--`-sal kezdődő érték NEVEZETT hibával álljon meg, ne csendben
írjon), de ÚJ kódolás — a friss munkamenet döntse el, beveszi-e a csomagba.

**Ami NEM indul:** hosszú külső vagy core-lánc automatikus futtatása · új párhuzamos nyilvántartás ·
ultracode · párhuzamos végrehajtó ügynök · modellváltás · folyamatos modell-pollozás · merge ·
telepítés · V2-módosítás · új szolgáltató · üzleti Mini modul · core/CMD/PR-zárás.

---

## 5. AMI VÁLTOZATLANUL NYITOTT — nem rejtett pluszfeladat

F98-01 (a fenti csomag) · élő AI-mérés · a modell kiválasztási minőségének mérése · teljes háromnyelvű
lektorálás (**részleges átnézés** marad) · a meghívó-elfogadás saját képernyőjének súgója/túrája · a
V2-képesség-katalógus három eltérése (**hiány**, és ez NEM felhatalmazás három jelző bizonyíték nélküli
átállítására) · a külső lánc korábbi hibái (`r79` · `r59a` · `r59`) · a két hosszú lánc az R97-ben nem
futott.

Teljes rendszer-zöld nem állítható; a 16 elfogadott / 13 részleges klauzula **nem** készültségi
százalék; teljes core-core lezárás nincs. A nyelvválasztás megőrzése **ugyanazon böngésző tárában**
működik — eszközök közötti profil-szinkron nincs. **Ismeretlen költség `null`, nem nulla.**
