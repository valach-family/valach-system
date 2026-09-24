# R79 — A nézet-kötés szabálya kódba kerül, és az írás az ALANYHOZ is kötve

> **Kör:** CMD-VS-300-002-002 R79 · **Sáv:** Claude-v3 · **Állapot:** lezárt
> **Repó:** `valach-family/valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8`
> **Forrás-commit (kód + bemutató):** `2e60f52` — az R79 ANALYSIS által vizsgált fejre (`e78b151`) építve
> **Parancs:** a külső ellenőrző fél (chatgpt-v3) **R79 ANALYSIS** lapja · **Döntés:** D-VS-3071
> **A magreferencia (`v3ref/`) egyetlen fájlja sem változott ebben a körben.**

---

## Röviden, magyarul

Két maradék hibát javítottunk — mindkettőt a külső ellenőrző fél találta meg, és mindkettőt
**előtte/utána megmértem a saját futásaimban is**:

1. **Egy szabály eddig csak a megjegyzésben élt.** Azt írtam az előző körben, hogy „a hiányzó mező nem
   egyezés" — a kód viszont csak akkor hasonlított, ha a mező megvolt. Ha tehát a válaszból hiányzott
   volna, hogy MELYIK cégnek és KINEK szolgált ki, a képernyő akkor is kirajzolta volna az adatot.
   Mostantól a szabály **külön fájlban** áll, amit **a képernyő és a próba is ugyanúgy futtat**: a
   hiányzó, hibás vagy idegen kontextus-mező mellett a lap **nem rajzol**, és **kimondja, miért**.
2. **A régi képernyő gombja más ember nevében írhatott — ugyanabban a cégben.** Ha egy másik fülön
   valaki KILÉPETT és MÁS FELHASZNÁLÓVAL lépett be ugyanabba a céghez, a korábbi fülön maradt „adatkör
   adása" gomb lefutott, és a jogot **az új belépő nevén** adta meg. Mostantól minden ilyen művelet
   **a saját nézetének személyét ÉS cégét** viszi, és a szerver **az írás előtt** mindkettőt
   ellenőrzi: eltérésnél nem történik semmi, és a képernyő megmondja, mi változott közben.

**És a bemutató mostantól melléklet, nem hivatkozás.** A korábbi link „Page not found"-ot adott —
ennek az oka nem a lap, hanem a hozzáférés: egy artifact-hivatkozás csak annak a fióknak nyílik meg,
amelyik közzétette (és akivel megosztották). Ezért a lapot **fájlként** is átadom: önálló HTML,
internet és bejelentkezés nélkül megnyílik, és **a fejlécében ott a pontos commit**.

---

## 1. F79-01 — a szabály a megjegyzésben élt, a kódban nem

**ELŐTTE — a javítás előtti forráson (`e78b151`), VALÓDI böngészőben, hibabevitellel** (ugyanazzal a
módszerrel, amit a külső fél használt: a sikeres készlet-válaszból kivettem mindkét `served_*` mezőt,
az eredményt meghagytam):

| amit mérünk | ELŐTTE (`e78b151`) | UTÁNA (`2e60f52`) |
|---|---|---|
| a panel a mezők nélküli, sikeres válaszra | **`KIADVA { "qty": "12" }`** — kirajzolta | **`—`** — nem rajzol |
| a képernyő mondata | *(üres)* | „A válasz nem mondta meg, MELYIK munkakörnyezetnek és kinek szolgált ki, ezért nem rajzoltuk ki…" |
| indít-e magától újabb kérést | — | **nem** (mérve: 0 új adat-kérés a frissítés után) |

**A JAVÍTÁS:** a döntés egyetlen, behúzható modulba került (`v3app/public/contextBinding.mjs`), és
**ugyanazt a fájlt futtatja a lap és a battéria** — tehát a próba pontosan azt méri, amit a felhasználó
kap. A szabály: a kontextusfüggő **sikeres** válasznak meg kell adnia mindkét mezőt, **érvényes
típussal**, **pontos egyezéssel**; a hiányzó vagy `undefined` mező nem egyezés. A **nevezett nemleges**
válasz (nincs belépve · kontextus-eltérés) nem adat, de **emberi mondatot** kap, és nem indít újabb
kérést — nincs frissítési körforgás.

**A 13 soros igazság-tábla** (gépi jel: `verify:app-findings-r79` (a) szakasz): mindkettő egyezik ·
a könyv-mező hiányzik · az alany-mező hiányzik · **mindkettő hiányzik (az eredeti lelet)** · más alany ·
más könyv · rossz típus (szám) · rossz típus (objektum) · `undefined` érték · nincs belépve ·
kontextus-eltérés · **üzleti elutasítás a mai nézetben (kötött, tehát kirajzolható mondat)** · üres
válasz. Külön mérve: a `null` könyv **kimondott állapot** (null↔null kötött, null↔szöveg nem), és a
kötelező mezők listája a **szerződésből** jön, nem a hívó emlékezetéből.

**Pozitív ellenpár:** a VALÓDI olvasó válaszaink (készlet · ár · taglista) mindegyike hordozza a két
mezőt, és a mai nézethez kötött — a szigorítás tehát **nem tiltja ki a saját felületünket**.

---

## 2. F79-02 — a könyv egyezett, a személy nem

**ELŐTTE — a javítás előtti forráson (`e78b151`), valódi HTTP-n és tárolón**, a külső fél
forgatókönyvével (a másik lap kilép, BÉLÁVAL belép, és UGYANAZT a céget választja; a közös süti frissül,
Anna régi lapját nem frissítjük):

| amit mérünk | ELŐTTE (`e78b151`) | UTÁNA (`2e60f52`) |
|---|---|---|
| a munkamenet a váltás után | alany: **Béla** · könyv: **C (ugyanaz)** | ugyanaz |
| a régi nézet gombja (`expected_book_id` egyedül) | **HTTP 200 · ok=true** | **HTTP 409 `context_mismatch` · `wrote:false`** |
| `scope_grant` sorok | **0 → 1**, `granted_by = BÉLA` | **0 → 0** |
| a válasz megnevezi a nézeteket | — | `expected_subject_id` (Anna) · `served_subject_id` (Béla) · `served_book_id` (C) |

**A JAVÍTÁS (KTX-03):** minden kontextusfüggő **állapotváltoztató** művelet viszi a nézet **alanyát és
könyvét** (`expected_subject_id` · `expected_book_id`), a mezőket a HATÁR sémaregisztere deklarálja
(`confirm_only`), és a szerver **ugyanabban a kiszolgálásban, az írás ELŐTT** méri mindkettőt. A mező
**soha nem választ** cselekvőt vagy könyvet — csak szűkít; a jogot változatlanul a mag kapui döntik el.
A sikeres írás-válasz is kimondja a kiszolgált nézetet, így **az eredmény-felirat is kötött**.

**A MÁTRIX, amit a parancs kért** — négy művelet × négy kontextus-állapot, a tárolóból mért sorokkal:

| művelet | alany változik | könyv változik | mindkettő | egyik sem (pozitív pár) |
|---|---|---|---|---|
| adatkör-adás | 409, írás nélkül | 409, írás nélkül | 409, írás nélkül | **200 · a sor megszületik** |
| megvonás | 409, írás nélkül | 409, írás nélkül | 409, írás nélkül | **200 · a megvonás megtörténik** |
| meghívás | 409, írás nélkül | 409, írás nélkül | 409, írás nélkül | **201** |
| terv-változtatás | 409, írás nélkül | 409, írás nélkül | 409, írás nélkül | **200** |

**A megvonás pozitív párja KÜLÖN szereplővel áll** — ahogy a parancs kikötötte: mérve, hogy Béla admin,
de a **megvonási hatásköre nincs megalapozva** (`authority_not_established`), tehát az ő 403-a nem
bizonyítana kontextusvédelmet. Ezért a megvonást ANNA saját munkamenetében mértük: **idegen nézet
alanyával 409** (írás nélkül), **a saját nézetében 200** — ugyanaz a szereplő, ugyanaz a jog, csak a
nézet más.

**A mező nem jog:** jogosulatlan fiók **helyes** megerősítő mezőkkel is elakad, és az elutasítás **nem**
kontextus-ürüggyel megy, hanem a jog-kapu mondja ki (`role_not_delegable`) — írás nélkül.

**A korábbi kötések megmaradtak:** az olvasás idegen könyvre továbbra is 409, adat nélkül (R77), és
mostantól az **idegen alanyra is** — azonos könyv mellett is.

---

## 3. Böngésző-bizonyíték (valódi Chromium)

`tests/e2e/v3app-r79.spec.mjs` — két próba:

- **hibabevitel a válaszba**: a `served_*` mezők nélküli, sikeres válasz mellett a panel `—` marad, a
  lap kimondja, miért, és nem indít újabb kérést; a hibabevitel levétele után ugyanaz a gomb **kiad**.
- **két lap, közös süti, AZONOS cégen belüli fiókváltás**: a régi lap gombja **409**-et kap
  (`expected_subject_id` = Anna, `served_subject_id` = Béla), a tárolóban **nem születik** adatkör-adás,
  a képernyő megmondja, mi történt, és a fejléc a valódi állapotra frissül; **a mai nézetben
  (Béla, ugyanaz a cég) ugyanaz a művelet működik**.

---

## 4. Átadás — melléklet, nem csak hivatkozás

A „Page not found" oka **mérhető és kimondható**: az artifact-hivatkozás **privát** — csak a közzétevő
fióknak (és akivel megosztották) nyílik meg; a hozzáférést a lap Megosztás menüje adja, én nem tudom
átállítani. Ezért az átadás mostantól **fájlként** megy, és a hivatkozás csak kiegészítés:

- **`…_kiprobalas_kepek_tomor.html` (1,7 MB)** — ugyanaz a 15 képernyő, tömörebb képekkel: gyorsan
  megnyílik, e-mailben is továbbküldhető.
- **`…_kiprobalas_kepek.html` (4,9 MB)** — ugyanaz élesebb képekkel.
- Mindkettő **önálló fájl**: internet, bejelentkezés és kulcs nélkül megnyílik bármelyik böngészőben.
- A lap fejléce kimondja: **ág · commit `2e60f52` · a munkafa TISZTA volt** — a képek pontosan ehhez a
  forráshoz tartoznak.
- Artifact-alak (ugyanaz a tömör lap): <https://claude.ai/artifact/QJtcuoRcd2Jiw8uME8LLFG>

**A LOKÁLIS kipróbálás mostantól a RÖGZÍTETT commitra áll** (a lapon is így szerepel):

```
cd ~/Downloads
git clone https://github.com/valach-family/valach-system.git v3-proba
cd v3-proba
git checkout 2e60f52
node v3app/server.mjs
```

**Előfeltételek, nevesítve:** Node **22.5+** (`node -v`) · **Git** (`git --version`) · **hozzáférés a
repóhoz** (ugyanaz a GitHub-belépés, amivel a szokásos `git pull` megy — a repó nem nyilvános). Utána a
cím `http://127.0.0.1:3300/`, a kimenő levelek a `/dev/mailbox` lapon, leállítás **Ctrl + C**, a próba
adatai a letöltött mappán belül élnek. **Végigpróbálva** ezen a commiton: letöltés → `git checkout
2e60f52` → indítás → a lap válaszol → a `contextBinding.mjs` modul betöltődik → regisztráció → a
megerősítő levél a fejlesztői levél-fogadóban.

---

## 5. Bizonyítékok — és a NÉGY fajta külön nevezve

A parancs kikötése szerint külön áll, mi a **saját futásom**, mi **hibabevitel**, mi **átvett** mérés,
és mi **nem ellenőrizhető**:

| fajta | mérés | eredmény |
|---|---|---|
| saját futás | `npm run verify:app-findings-r79` | **49/49 PASS** |
| saját futás | `npm run verify:app-findings` (R75) · `-r77` · `app:selfcheck` | **73/73 · 34/34 · 57/57** |
| saját futás | `npm run proof:core-ux` (Chromium, 35 próba) | **35/35 PASS** |
| saját futás | `npm run verify:kuka` | **360/360 PASS** |
| **hibabevitel** | a `served_*` mezők eltávolítása a valódi válaszból (böngészőben, mindkét forráson) | ELŐTTE kirajzolt · UTÁNA nem |
| **hibabevitel** | vezérelt bukás az indítási egységen belül (R77 óta) | nevezett elutasítás, nulla sor |
| **átvett (újrahasznált) bizonyíték** | `verify:v3ref` · `verify:external-checks` | a `9bb1be7` commit ZÖLD bizonyítéka, **gépileg elfogadott** újrahasználattal |
| **nem ellenőrizhető a külső fél által** | az artifact-hivatkozás tartalma | hozzáférési korlát — ezért megy a lap **fájlként** is |

**A SÖPRÉS:** `npm run verify:sweep -- --skip verify:external-checks,verify:v3ref --reuse 9bb1be7` →
**17 verifier + 2 ÚJRAHASZNÁLT bizonyíték: 16 zöld · 0 env-kihagyás · 1 piros.**

**A kapu ELŐSZÖR elutasította — és ezt kimondom.** Az első futásnál a feloldó azt mérte, hogy „a lánc
szkriptjei változtak a package.json-ban": felvettem egy **`proof:r79-findings`** aliast, ami a hosszú
láncok ujjlenyomatához tartozó `proof:` készletet módosította. A láncok BEMENETE (a `v3ref/` fa)
viszont **nem változott** ebben a körben. Nem a kaput kerültem meg: **eltávolítottam a felesleges
aliast** (a `verify:app-findings-r79` megmaradt), és a söprést megismételtem — ekkor a feloldó a
négy azonosságot MÉRTE és elfogadta. A hosszú láncok **nem futottak újra** (a bemenetük azonos).

**Az egyetlen piros: `verify:capability-witness` — ÖRÖKÖLT.** A V2 board-regiszterében két rögzítés
elavult (`v3-ui-slice` · `v3-vertical-slice` mérve *present*, rögzítve *absent*; 9/11 egyezik). A
javítás helye a **V2 repó**, amit ez a parancs tilt; az R76-os mérés szerint a rés az R63/R64 óta áll.

---

## 6. Fogyasztás — két tengely, külön

A parancs jogos leletet tett: az előző jelentésben a hívás/cache-szám (ablak-tengely) és a
kontextus-medián (munkamenet-tengely) egy mondatba került. Most külön áll, pontos kötéssel:

| tengely | kötés | mért |
|---|---|---|
| **R79 ablak** | munkamenet `3348238d` · `2026-09-24T09:23:01Z` → `2026-09-24T16:37:12Z` | **125 hívás** · cache-olvasás **74,1 M** · **0 al-ügynök** · lefedettség: teljes |
| **teljes munkamenet** | ugyanaz a munkamenet · `2026-09-22T19:58:28Z` → `2026-09-24T16:37:12Z` (R75+R77+R79) | **816 hívás** · cache-olvasás **343,4 M** · 0 al-ügynök |
| kontextus-medián | **munkamenet-tengely**, nem ablak: a fő-szál kontextusa a munkamenet során halmozódik | ablakon belül 598 939 · a teljes munkamenetre 422 551,5 (max 783 902) |

**Ebből mi következik, és mi nem:** a hívás- és cache-szám az ablakhoz köthető; a **kontextus-medián
nem** — az a munkamenet egészének a tulajdonsága, ezért a küszöb-átlépést nem lehet egyetlen körre
terhelni. **Heti keret-arányt és megtakarítást ebből nem állítunk.** A gyakorlati következmény
változatlan: a **következő csomag ÚJ munkamenetben indul** — ez az egyetlen lépés, ami a
munkamenet-tengelyen ténylegesen számít; az al-ügynökök nullára vitele (mérve: 0) ezt nem oldotta meg.

---

## 7. Amit ez a kör NEM állít

- A **core-core teljes lezárása nincs elfogadva**; a H08 és a teljes kontextusvédelem elfogadása a
  külső ellenőrző félé, nem a miénk.
- A **„16 elfogadott / 13 részleges klauzula" nem készültségi arány**.
- Az **R19 QNT** (24 követelmény / 36 eset) és a mag alapjai változatlanul nyitva állnak; ismeretlen
  mennyiségű tétel létezhet és feldolgozható, a **becslés nem válik utólag méréssé**.
- Üzemi használat nem állítható (a lezárási lista L1 · L4 · L5 sora nyitott).
- A szintetikus minta-adat az üzleti egységen kívül marad — ebből **nem következik** semmilyen
  kiterjesztés valódi készlet-tranzakcióra.
