# R51 végrehajtása — a jog MEGVONÁSA is két időn áll, és egy saját állításom visszavonva

> **Sáv:** Claude-v3 · **Kör:** R52 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R51 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-19).
A board kör-üzenete erre a lapra hivatkozik, és rövidebb nála. A külső fél lapja szó szerint mentve:
`v3ref/source-documents/R51_board_v1.md`.

---

## Röviden, magyarul — mi történt ebben a körben

Három dolog:

1. **Megjavítottam egy történeti hibát.** Eddig a rendszer helyesen zárt, amikor valakitől elvettük
   az olvasási jogot — de ha utólag kérdeztük meg, hogy *„és akkor, márciusban mit tudtunk?"*, a mai
   választ adta a márciusi helyett. Mostantól a két kérdés két külön válasz, ahogy a tagságnál már
   régen.
2. **Visszavontam egy saját állításomat.** Az előző körben azt írtam, hogy egy bizonyos
   „elrontás-próba" valódi adatkiszivárgást okoz. Az ellenőrző fél megmérte, hogy nem — és igaza
   van. A saját mérésem megerősítette. A jelentést és a döntés-naplót **megjelölve** helyesbítettem,
   nem átírtam; és megépítettem azt a próbát, amelyik tényleg kiadást okoz.
3. **A külső fél két tesztprogramja megkapta a hiányzó előfeltételt** — az ő kimondott
   engedélyükkel, az ő szövegükkel. A régi piros mérés **valódi piros marad**: nem minősítettem át
   és nem hagytam ki egyetlen esetet sem.

---

## 1. F51-01 — a megvonásnak nem volt saját „mikor tudtuk meg" ideje

### A lelet, a saját fánkon megismételve

A jog **megadását** két időponttal tartjuk nyilván: *mikortól érvényes* és *mikor került a
nyilvántartásba*. A **megvonás** viszont egyetlen időpontot írt vissza a megadás sorába, és az
olvasó csak a megadás rögzítési idejét nézte.

A külső fél reprodukcióját karakterre megismételtem:

| lépés | eredmény |
|---|---|
| jog megadva 2026-03-01 hatállyal és rögzítéssel | — |
| kérdés: *„mi volt a helyzet március 15-én, a március 20-i tudásunk szerint?"* | **`granted: true`** |
| megvonás rögzítve **április 1-jén**, **március 10-i** hatállyal | — |
| **ugyanaz a márciusi kérdés újra** | **`granted: false` — `scope_grant_revoked`** |

Vagyis az áprilisi tudás **visszamenőleg átírta** a márciusi tudás-állapotot.

**Mi ebben a kár, és mi nem.** Nem árkiszivárgás: a **mai** kiadás mindig helyesen zárt. A kár ott
jelentkezik, ahol utólag kell megmondani, mit tudtunk akkor — felülvizsgálatnál, vitában,
elszámoltatásnál. És **néma**: nincs hibaüzenet, csak egy hihető válasz a rossz napról.

### A javítás

A megvonás mostantól **saját esemény**, saját táblában (`scope_grant_revocation`), alannyal,
könyvvel, adatkörrel, eljáróval és **két** idővel. A megadás sorához nem nyúlunk hozzá. Az olvasó
**egy idővonalat** épít a megadásokból *és* a megvonásokból, mindkét tengelyen szűrve, és a
**legkésőbbi alkalmazható esemény dönt** — ettől lesz értelmes az **újraadás** is.

Ez nem új találmány: a **tagság** megvonása már régen így működik (`membership_revocation`). Ugyanaz
a szerkezet, ugyanaz a fegyelem — csak most már az adatköri jogon is.

### Amit megmértem (a `P-DSC-scope-grant-history` próba hat ága)

| ág | mit bizonyít | mért eredmény |
|---|---|---|
| (a) visszamenőleges megvonás, később megtudva | a régi tudás sértetlen | márciusi tudás: **kiadva** · mai tudás: **zárva** |
| (b) előre ütemezett, jövőbeli megvonás | a tudás önmagában nem zár | június: **kiadva** · augusztus: **zárva** |
| (c) újraadás | a megvonás nem örök | megvonva → **újra megadva**, a közbenső nap **zárva marad** |
| (d) más alany · más adatkör · más könyv | a hatókör pontosan szabott | a megvont adatkör zárva, a többi **érintetlen** |
| (e) hibás időpont | nevezett, **írásmentes** elutasítás | 3 nevezett indok · **0 új napló-sor** · a jog áll |
| (f) a teljes lánc | megadás → kiadás → leltár → megvonás | kiadva → a határnapon kiadva → utána **zárva**; leltár 1 → 2 sor |

**A megadás sora bizonyítottan sértetlen marad:** a próba visszaolvassa, és a két eredeti időpont
változatlan.

---

## 2. F51-02 — visszavonom a saját állításomat az M179-ről

Az R50-es jelentésben és a D-VS-3058 döntésben ez állt: a határozat-állapot ellenőrzésének
kihagyása *„valódi kiadást eredményez egy megvont alapon"*. **Ez cáfolt.**

**Az ő mérésük:** a kiadás továbbra is lezárul, csak egy másik indokkal (`outside_basis_scopes`).
**A saját mérésem ugyanezt adja**, és meg is magyarázza: ha az állapot-ellenőrzést kihagyjuk, a
megvont határozat **plafonja üres** — az üres plafon pedig egy sorral lejjebb zár. Tehát az M179 a
próbát a **várt indokon** bukatja el, nem adatkiadáson.

**Mit csináltam ezzel:**

- a jelentést és a döntés-naplót **megjelölt helyesbítéssel** javítottam (a történeti szöveget nem
  írom át — megjelölöm, forrással és döntés-számmal);
- az M179 leírása mostantól a **mért hatást** mondja;
- megépítettem az **M188** mutációt, ami **tényleg kiadást okoz**: két sor rontása kell hozzá (az
  állapot-ellenőrzés kihagyása **és** az üres plafon „mindenre jogosít"-ként olvasása). Elkülönítve
  lefuttatva a mérés: **`alap megvonva: kiadva → KIADVA`** — vagyis a megvont határozatú olvasó
  valóban visszakapja a készlet-eredményt.

A kettő **két külön dolgot** bizonyít, és nem cserélhető fel.

---

## 3. A külső fél két programja — az ő engedélyükkel, az ő szövegükkel

Az R50-ben jelentett három piros eset oka valóban az volt, hogy a tesztolvasónak nem volt adatköri
olvasási joga. Az R51-ben **kimondott engedélyt** adtak: az aktív `r79`/`r81` mag-tesztvilág kapjon
készlet- **és** ár-olvasási jogot a rendszer saját íróján, rögzített alappal.

- a beillesztett előkészítés **karakterre az ő `explicitReadFixture(store)` alakjuk**, közvetlenül a
  meglévő tagsági sor után;
- a **történeti** `*.core.mjs` **bájtazonos** maradt, és `VS_EXT_CORE_VARIANT=historic` alatt ma is
  futtatható;
- **eset, elvárás, óra, negatív ág: egy sem változott**;
- a manifeszt és az `activeCoreProgram` **többé nem állítja**, hogy az aktív változat kizárólag a
  mennyiség-literálokban tér el — most **két, külön engedélyezett** adaptációt nevez meg (R35 és
  R51), verzióval és forrással.

**A régi piros mérést nem nevezem visszamenőleg zöldnek.** A manifeszt mindhárom futást külön
nevezi: a javítás előtti reprodukciót, az R50-es forráson mért pirosat (a hiányzó adatköri jog
miatt), és az R51-es teszt-előfeltétellel mértet.

---

## 4. Szöveg-helyesbítések — amit egy javítás elévültté tett

- a kiadási kapu fejléce és szerződése (`releaseScope.mjs` / `RSB_CONTRACT`) **már nem állít**
  tagság-alapú kiadást: a sorrend és a források a mai valóságot mondják;
- a `resultScope.mjs` egy mezője a régi „gyengébb alap" nevet hirdette — mérve **senki nem olvasta**,
  és mindig ugyanazt adta; a tényleges döntési alapok listájára cseréltem;
- a norma `remaining` szövege eddig **egyetlen** akadályt nevezett meg, és azt üzleti döntésnek; most
  **hármat** nevez meg, és kimondja, hogy csak az egyik üzleti — a másik kettő technikai teendő.

---

## Mérések — mi az én futásom, mi az átvett mérés, és mi puszta állítás

**A SAJÁT FUTÁSOM (ezen a fán, ma):**

MEASUREMENTS_PLACEHOLDER

**ÁTVETT MÉRÉS (a külső fél futása, nem az enyém):** az elkülönített M179-futásuk
(`outside_basis_scopes`, 5 leltár-sor) · az r79/r81 programjaik saját futása az engedélyek
hozzáadása előtt és után (18/18 és 7/7).

**AMI PUSZTA ÁLLÍTÁS, ÉS EZT KIMONDOM:** hogy egy megírt magyarázó mondat **tartalmilag** teljes-e,
arra nincs gépi jel. A tagság megvonásának **újraadása** ma sincs megoldva (ott a legkorábbi hatály
dönt) — ez **kimondott hiány**, nem ennek a körnek a tárgya.

---

## Ami kimondottan nyitva marad a K05-DSC-c alatt

1. **ÜZLETI döntés:** hordozzon-e a meghívó felajánlott olvasási adatköröket. Mérve a meghívó
   `scope` mezője a **meghívó-kiadás** tengelye, nem olvasási jog — gép ezt nem vezetheti le.
2. **KIMONDOTT HATÁR:** a felhatalmazás adatkör-neve szabad szöveg, a tartalom-besorolásé zárt
   halmaz. Olvasási jog csak a zárt halmaz nevére adható; az ismeretlen szótárú plafon **zár**.
   A megfeleltetés üzleti döntés, néma fordítás nincs.
3. **TECHNIKAI:** a mutációs bizonyíték pontossága — ezt ez a kör az M188-cal rendezte, de a
   megkülönböztetés (indok-csere vs. valódi kiadás) minden további mutációnál elvárás marad.

**Tanulság:** KUKA-192. **Döntés:** D-VS-3059.
