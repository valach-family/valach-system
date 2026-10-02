> **Sáv:** Claude-v3 · **Állapot:** lezárt

# A BEMUTATÓ A VALÓDI FELÜLETEN, ÉS A HATÁSKÖR ÉLETCIKLUSA

**A végrehajtott parancs:** `CMD-VS-300-002-002 R138 — SPEC` (chatgpt-v3, 2026-10-02).
**Ez a jelentés:** R139. *(A kettő NEM ugyanaz a szám: az R138 a parancs, az R139 a válasz köre.)*

---

## 1. A BEMUTATÓ — EZ A HIVATKOZÁS NYITHATÓ MEG

**https://claude.ai/artifact/Fc2pVcQUEYadMSR29kWRF9**

**Három lépés az indulásig:**

1. Nyisd meg a fenti hivatkozást, majd a lapon a **„Bemutató megnyitása”** gombot.
2. Válassz történetet a lap tetején: **1 · Meghívás visszavonása** vagy **2 · Munkatárs visszatérése**.
3. Kövesd a buborékot. Ahol műveletet kér, ott **nincs „Tovább”** — a valódi gombot kell megnyomni.

Az **Újrakezdés** bármikor tiszta kezdőállapotot ad; a **Váltás Béla nézetére** valódi ki- és
belépés, nem átcímkézett képernyő. A lap magánjellegű: rajtad kívül csak az látja, akinek megosztod.

### MI A HÁTTÉR — KIMONDVA

A bemutató a **VALÓDI felületet** tölti be: az `app.js`, a `tour.mjs`, a `style.css` és a nyelvi
csomagok ugyanazok, mint az alkalmazásban. Párhuzamos bemutató-motor, hasonmás képernyő és második
dokumentum-út **nincs**.

A válaszokat viszont **elkülönített minta-háttér** adja (`demo-adapter.mjs`), ami **csak** a
`<meta name="vs-demo">` jelre telepszik — a repó saját `index.html`-jébe nem. **Ebből sem hálózati,
sem adatbázis-bizonyíték nem következik:** a bemutató azt mutatja meg, *hogyan használható* a
funkció, nem azt, hogy a kiszolgáló helyes. Minden szereplő kitalált.

---

## 2. AMIT MEGMÉRTEM A SZÁLLÍTOTT ELŐNÉZETEN

`npm run proof:demo-walk` — **94 állítás, 0 hibás**. A tanú a szállított fájlokat szolgálja ki, és
végigKATTINTJA mind a két történetet:

| Mérés | Eredmény |
|---|---|
| 1 · Meghívás visszavonása — minden lépés, 1280 px és 390 px | zöld |
| 2 · Munkatárs visszatérése — minden lépés, 1280 px és 390 px | zöld |
| Mindkét történet **kétszer** újraindítva, tiszta kezdőállapotból | zöld |
| A feladat-lépésen **nincs „Tovább”**, és a lépés csak a szerver igazolása után zárul | zöld |
| Az útmutató **nem takarja** a célgombot, és a gomb a nézetbe hozható | zöld |
| A megerősítés megnevezi az érintettet, és kimondja: a korábbi jogok nem állnak vissza | zöld |

**A közzétett fájlok bájtra azonosak a megmértekkel** (sha256 visszaolvasva a közzétett
változatból). **KIMONDVA:** a végigjárás a szállított fájlokon futott, saját statikus kiszolgálón —
nem a claude.ai-on keresztül, mert a lap magánjellegű, és automata bejelentkezés nincs.

---

## 3. HÁROM LELET, AMIT A VÉGIGJÁRÁS TALÁLT MEG (mind SAJÁT)

### KUKA-276 — két igaz tagadásból hibára következtettem
390 px-en **mindkét történet a 0. lépésen megszakadt** egy teljesen ép képernyőn. A csukott mobil
menü miatt a menüpont rejtett (helyes), de a bemutató ezen az oldalon indul, tehát nincs mit
feltárni (szintén helyes) — a maradékot viszont a motor hibának minősítette, és egy HAMIS mondatot
írt ki. A harmadik állapot nevet kapott (`navIntentFulfilled`), és a „látszik” szava egyetlen
feloldóba került a korábbi négy másolat helyett.

### KUKA-277 — a rontás-próbám zöld maradt
A saját elfogadási tanúm a teljes panel szövegében keresett egy töredéket. A rontás-próbán a
mondatot kicseréltem a nyelvcsomagban, és az állítás **mégis zöld maradt**: a töredék a szomszéd
mondatra illeszkedett. Ráadásul a rontás első alakja észrevétlenül NO-OP volt. A mondat-állítás
azóta két horgonyzott állítás (tartalom + szállítás), a rontás-próba pedig igazolja, hogy a rontás
beíródott.

### A harmadik: a képernyőkép fogta meg, nem az állapot-mérés
A visszatérés-történet végén a buborék **egyszerre** írta ki, hogy „3. Küldd el az új meghívást —
**Elvégezve**” ÉS hogy „Ez a lépés még nem érhető el”. A küldés után a panel becsukódik, az űrlap
eltűnik, és a cél-vizsgálat újra feltárást kért egy már elvégzett lépésre. A belső állapot-mérésem
(`done`) és a záró lap („Hátravan: 0”) **helyesen zöld volt** — azt nem mértem, mit ÁLLÍT a
buborék szövege. Javítva, és a mérés kiegészült (a13); a rontás-próba igazolja, hogy fog.

### VISSZAVONVA ugyanebben a körben
Két korábbi `app.js`-módosításom **kikerült**. Megmértem: egyik sem volt load-bearing (nélkülük is
94/94), és az indoklásuk egy tévesnek bizonyult diagnózisra hivatkozott. A `revealerOf` menü-feltáró
ága **ma egyetlen szállított bemutatóval sem érhető el** (mindegyik bemutató nav-célja a saját
oldalára mutat) — ezért NEVEZETTEN előre szól, és a viselkedését a tanú közvetlenül hívja meg.

---

## 4. F138-01 — A MEGVONT RÉGI HATÁSKÖR MEGVONÁSA MEGMARAD

**A lelet (a külső ellenőrző félé):** egy korábban megvont hatáskör saját megvonása eltűnt egy új
megadás után. Mérve, változatlan termékkódon, ugyanarra az időpontra:

| | ELŐTTE | UTÁNA |
|---|---|---|
| A régi jog saját megvonása után, a régi időpontra | `true / stamped` *(hibás)* | `false / authority_revoked` |
| Az új jog ma | `true` | `true` |
| A köztes tiltott idő egy újabb megadás után | — | `false / authority_revoked` |

A generáció zárása (`revoked_at` + `superseded_at`) mostantól a vetület felülírása **előtt** íródik,
a csak-vetületi (R134 előtti) sor pedig napló-sort kap az átmenetnél. A két időtengely (hatály /
tudás) külön marad, és ahol a zárás ténye nem ismert, a válasz **nevezett elakadás** — nem néma
történeti igen. Negatív kontroll: a megvonás „elfelejtése” mérhetően visszahozza a hibát.

**A (g7) próbát ugyanitt javítottam:** óra-léptetés nélkül a „megadás előtti tudás” ugyanaz a
pillanat volt, mint a rögzítés, tehát a próba nem azt mérte, aminek a nevét viseli. **A termék
válasza helyes volt, a próba alapsokasága hibás.**

---

## 5. A MÉRT ÁLLAPOT

| Battéria | Eredmény | Frissesség |
|---|---|---|
| `proof:demo-walk` | **94 / 0 piros** | friss |
| `findings_r134` | **70/70** | friss |
| core (`v3ref/run.mjs`) | **66/66**, kilépés 0 | friss |
| mutációs battéria | **237 mutáció · 237 elkapva · 0 túlélt · 0 elavult horgony**, kilépés 0 | friss |
| `verify:kuka` | **567/567** | friss |
| `verify:tutor` | 88/88 | friss |
| `verify:i18n` | 49/49 | friss |
| `verify:app-findings-r91` | 30/30 | friss |
| `verify:doc-html` | 9/9 | friss |

**Teljes söprés NEM futott** — az R138 §6 célzott próbát kért, és a fogyasztás-jelző is a futó blokk
célzott lezárását írja elő. Ez tehát **nem igazolt**, nem zöld.

**Forrás-fej:** `75e6112d892e6f8b343675e806417bcb4cef2d67` · **záró fej:** lásd a kör utolsó
commitját ezen az ágon (`claude/cmd-vs-300-002-002-r136-7hjq1z`).

---

## 6. NEVESÍTETT FÜGGŐK

1. **A tag-táblázat oszlopai 1280 px-en összenyomódnak** — az „Árak” oszlop tartalma karakterenként
   tördelve jelenik meg. A képernyőképen látszik; a bemutatót nem akasztja meg. **Nem ebben a körben
   javítva**, mert a tag-képernyő általános elrendezési kérdése, nem a bemutatóé.
2. **A nyugta kétszer jelenik meg** (a lapon és lebegő üzenetként is), 390 px-en a lebegő rátakar a
   táblázat egy sorára. Nem akasztja meg a folyamatot.
3. **A `proof:demo-walk` böngészőt igényel**, ezért nem része a `verify:sweep`-nek — kimondva.
4. **A visszatérés-történet a szállított bemutató három lépését viszi végig.** Az R138 §1 további
   mozzanatai (Béla saját elfogadása, a jogadás utáni „mennyiséget lát, árat nem”) a bemutató
   világában **kipróbálhatók** a nézőváltóval, de **nem vezetett lépések** — a lépés-lista a termék
   deklarációja (`v3app/knowledge/features.mjs`), és a bővítése külön munkacsomag.
5. **A fogyasztás-jelző elérte a chatváltási sávot** (fő-szál kontextusmedián 453 240 ≥ 400 000):
   ez a blokk lezárható, a **következő önálló nagy blokk friss beszélgetésben induljon**.

---

## 7. AMI NEM TÖRTÉNT MEG

Nincs merge, nincs éles telepítés, nincs V2-módosítás, nincs külső címzettnek levél, nincs új
fizetős szolgáltatás, és nincs req-5/core/CMD/PR-zárás. Automata ügynök-munka nem indult.
