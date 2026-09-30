# R128 REPORT — A KÉSŐI ADATVÁLASZ AZ ÚJ MINTANÉZETEKEN (az A121-07 utolsó hiánya)

> **Kör:** R128 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R127 — COMMAND` (chatgpt-v3) — „R126 elfogadott javításai; az
utolsó késői adatválasz-bizonyíték". A kör az F125-01 javítását, az eredeti A121-azonosítók
helyreállítását, a tranzakciós állítás szűkítését és a kumulatív fogyasztásmérés pontosítását
**elfogadta**. A teljes R121 csomag elfogadása **egyetlen** dolgon állt: az A121-07-ben nevesített
**késői adatválasz** bizonyítéka a három új mintanézet-úton.

**Ez a csomag pontosan azt az egy hiányt zárja.** Nincs merge, éles telepítés, V2-módosítás, új
szolgáltatás, core/CMD/PR-zárás; nincs új teljes HTTP-, böngésző- vagy mutációs söprés.

---

## 1. A VÁLASZ RÖVIDEN: A VÉDELEM HELYES, TERMÉKKÓDOT NEM VÁLTOZTATTAM

A parancs kikötése: *„Ha a jelenlegi védelem helyes, termékkódot ne változtass csak a kör
kedvéért."* **Hibát nem találtam** — a hat mért eset mindegyikében a régi válasz nem írta felül az
új nézetet. Ezért ez a csomag **egyetlen fájlt ad hozzá**, és a `v3ref/`, `v3app/` fát nem érinti.

- **A célzott próba fájlja:** `tests/e2e/v3app-r127.spec.mjs` (új, 6 eset)
- **Futtatási parancs:** `npx playwright test tests/e2e/v3app-r127.spec.mjs`
- **Mért SHA:** `d3c53f08ebb2a9f5d4d44723fbea40c642639ded` — az R126 záró commitja, **változatlan
  termékkóddal**; a mérés idején a munkafában csak az új próba-fájl állt.
- **Eredmény:** **6/6 PASS** (9,4 s). Szomszéd-regresszióval együtt (`r127` + `r121` + `r123` +
  `r77`): **19/19 PASS**.

---

## 2. MIT MÉR A PRÓBA, ÉS HOGYAN

**A visszatartás eseménnyel szinkronizált, nem alvással** (a parancs kikötése). A `holdRoute`
segéd a szerverrel **kiszolgáltatja** a választ (`route.fetch()`), majd a lapnak csak akkor adja át,
amikor a próba elengedi (`release()`). A „folyamatban van" tényt nem egy üres panel, hanem a
visszatartás **állapota** bizonyítja (`seen === 1` · a válasz kiszolgálva · `releasedAt === null`),
várakozó állítással.

**Az illesztés függvénnyel megy, nem glob-bal.** A `/api/data/document` és a
`/api/data/document-full` út egymás prefixe: egy `**/api/data/document**` alakú minta **mindkettőt**
elkapná, és a mérés a szomszéd végpontot igazolná (KUKA-239). Ezért
`page.route((u) => u.pathname === '/api/data/document', …)`.

**Szintetikus jelölőt NEM tettem a válaszba.** A régi és az új nézet **valódi** különbségén mérünk:
az egyik fiók `pro` (a minta **KIADVA**, benne a `BEJ-2026-0042` bizonylatszám), a másik `starter`
(a minta az **ELŐFIZETÉS-kapun ELUTASÍTVA**). Így a „régi **adat** szivárgott be" és a „régi
**elutasítás** szivárgott be" irány külön mérhető, és a kötési meg jogosultsági mezők érintetlenek.

### A hat eset és a mért eredmény

| Eset | Mit mér | Eredmény |
|---|---|---|
| **R127-E1** | `/api/data/document` + `/api/data/document-full` visszatartva, fiókváltás `pro` → `starter`, elengedés **fejléc → vegyes** sorrendben | a régi **KIADOTT** válasz nem rajzol; az új nézet ELUTASÍTOTT marad (`data-gate="entitlement"`), a `BEJ-2026-0042` a lap törzsében sem jelenik meg |
| **R127-E2** | ugyanez `starter` → `pro`, elengedés **vegyes → fejléc** sorrendben (a másik sorrend) | a régi **ELUTASÍTÁS** nem rajzol és nem „ragad be"; az új nézet KIADOTT |
| **R127-E3** | `/api/data/supplier` (partnerek lap), fiókváltás közben | a késői válasz nem írja felül az új nézetet |
| **R127-E4** | **személyváltás a MÁSIK lapon** (közös süti), majd a régi válasz elengedése — és **mikor vált ismertté** az új személy | lásd a 3. szakaszt |
| **R127-E5** | **POZITÍV KONTROLL**: változatlan kontextusban, oldal-újratöltés után mindhárom végpont késleltetve elengedett válasza | **megjelenik** — tehát az E1–E4 üressége nem hibás fixture-ből vagy el sem engedett kérésből jön (KUKA-051) |
| **R127-E6** | **A HATÁR MEGMÉRVE**: mi történik, ha a régi válasz az **észlelés ELŐTT** érkezik | lásd a 4. szakaszt |

**A fiókváltás mért viselkedése, kimondva:** a váltás **szándékosan** az áttekintésre visz és ürít
(`switchWorkspace` → `newContext` + `resetViewCaches`, majd `state.page = 'overview'`) — „előbb
ürít, aztán kér". Ezért a régi válasz olyan nézetbe érkezik, ahol a minta-szakasz **nincs is
kirajzolva**: a védelem itt **két** ténnyel áll — a nézet-nemzedék lépett, **és** a lap más. A
próba ezt nem egyesíti egyetlen állításba, hanem kimondja.

---

## 3. MIKOR VÁLT ISMERTTÉ AZ ÚJ SZEMÉLY (R127-E4) — MÉRT VÁLASZ

A parancs kikötése: *„A mérés mondja meg, mikor vált ismertté az új személy az adott lapon; ne
állítson ennél erősebb azonnali védelmet."*

**A mért lánc:**

1. Anna a bizonylat-lapon van, a `/api/data/document` válasza **visszatartva** (a szerver már
   kiszolgálta, `ok: true`).
2. A **másik lapon** — ugyanabban a böngésző-kontextusban, közös sütivel — **új személy** (béla)
   regisztrál, megerősít és belép.
3. **A lap ekkor még nem tud róla:** a fejléc Annát mutatja. A mintanézet-lapok maguktól nem
   kérdezik újra a szervert.
4. **A szokásos alkalmazásút, amin a lap ÉSZLELI:** a felhasználó a készlet-lapra lép. A lap első
   lekérése a **megnyitáskori (régi) alanyt** viszi, a szerver pedig a **kontextus-kapun** utasítja
   el:

   > **HTTP 409 · `context_mismatch`** · értesítés: *„Másik felhasználó lépett be ebben a
   > böngészőben. Az oldal frissült."* · fejléc: az ÚJ személy címe

   **Ez a pillanat.** Nem egy külön figyelő jelez, hanem az első olyan kérés, amit a lap magától
   elindít.
5. **Csak ezután** engedjük el a régi választ: a régi személy adata **sehol** nem jelenik meg.
6. A bizonylat-lap az új személy nézetében **nem elérhető** (a saját jogosultsága szerint) — a próba
   ezt **kimondja**, nem pipálja (KUKA-041); ahol elérhető lenne, ott is ellenőrzi.

**Amit ez NEM állít:** azonnali, kérés nélküli védelmet. Erősebb, azonnali tudás csak cross-tab
csatornával vagy folyamatos kérdezéssel lenne meg — a parancs kifejezetten tiltja, hogy ennél
erősebbet állítsunk, és ilyet nem is építettem be.

---

## 4. A HATÁR MEGMÉRVE (R127-E6) — ÉS MIÉRT NEM JAVÍTÁS TÁRGYA

Megmértem azt is, amit a 3. szakasz logikusan felvet: **mi történik, ha a régi válasz az észlelés
ELŐTT érkezik meg?**

```
[R127-E6] a régi válasz az ÉSZLELÉS ELŐTT érkezett · kirajzolódott: true
          · a lap fejléce ekkor még: …anna@pelda.hu
[R127-E6] helyreállás: az első szokásos lekérés (HTTP 409) után a régi adat eltűnt,
          és a fejléc az ÚJ személyt mutatja
```

**Kirajzolódik — és ez nem idegen adat idegen nézetben.** A válasz a **régi** alanynak, a **régi**
nézetébe, a **régi** fiók adatával érkezett; a lap ekkor még joggal hiszi, hogy ő az. A rendszer
nem tud a másik fül belépéséről, amíg nem kérdez.

**Miért nem új kitettség.** A régi lap a személyváltás előtt is Anna adatát mutatta a képernyőn — a
késői válasz nem ad hozzá semmit ahhoz, amit az elavult lap már megjelenít. Aki a böngészőhöz
hozzáfér, azt már a belépése előtt is látta. A védelem **következő** pontja a szokásos
alkalmazásút (3. szakasz), és a mérés szerint ott a régi adat **eltűnik**.

**Ezért nem változtattam termékkódot.** Egy azonnali védelem cross-tab csatornát vagy folyamatos
kérdezést kívánna — az **tervezési** változás, nem hiba-javítás, és a parancs kizárta.

---

## 5. AZ A121-07 SOR KIEGÉSZÍTÉSE

Az R126-os jelentés 4. szakaszának A121-07 sora **RÉSZLEGES** volt, ezzel a nevesített hiánnyal:
*„a »késői adatválasz« … az ÚJ mintanézet-útvonalakra (`/api/data/document`, `-supplier`,
`-document-full`) NINCS mérve."*

**A sor mai alakja** (az azonosító jelentése változatlan, az R121 SPEC szó szerinti szövege):

> **A121-07** — „Késői adatválasz, nyitott szerkesztő és másik lap személy-/fiókváltása nem kever
> adatot és nem ír más kontextusba. Ismételt beküldés és tárolási hiba nem hagy részleges
> jogváltozást." → **TELJESÜLT**
>
> · **késői adatválasz, fiókváltás közben, mindhárom új mintanézet-úton:**
> `tests/e2e/v3app-r127.spec.mjs` **E1 · E2 · E3** — a `document` és a `document-full` **mindkét**
> elengedési sorrendben
> · **késői adatválasz, MÁSIK lap személyváltása közben:** **E4**, az észlelés pillanatát
> megnevezve (HTTP 409 · `context_mismatch`)
> · **a határ megmérve:** **E6** — az észlelés előtt megérkező válasz kirajzolódik a régi nézetbe,
> és az első szokásos lekérésnél eltűnik; ennél erősebb azonnali védelmet nem állítunk
> · **pozitív kontroll:** **E5** — változatlan kontextusban a késleltetve elengedett, jogosult
> válasz **megjelenik**
> · **nyitott szerkesztő:** `v3app-r123.spec.mjs` C2 (elavult gomb nyitott panelen)
> · **kontextusváltás íráson / olvasáson:** `findings_r121` G(a)–(e)
> · **ismételt beküldés:** `findings_r123` (c2) · `findings_r125` (b1)
> · **tárolási hiba:** `findings_r123` B szakasz · `findings_r125` (b5)

**Az A121-01…A121-10 többi sorának jelentése és állapota VÁLTOZATLAN** (az R126-os jelentés 4.
szakasza). Ezzel a tábla **10/10 teljesült**, és a korábban nevesített egyetlen részleges hiány
megszűnt.

---

## 6. A BEMUTATÓ — VÁLTOZATLANUL, ÚJRATERVEZÉS NÉLKÜL

- **Megnyitható hivatkozás:** https://claude.ai/artifact/NDfQsPZYDQ6myj9Cnf5wCo
- **Kanonikus forrás a repóban:** `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html`
- **Generálási parancs:** `npm run bemutato:onallo` →
  `var/reports/…_v3app_r121_adatkorok_bemutato.html` (önálló dokumentum, hálózat nélkül
  megnyitható; a szerszám kiírja a forrás SHA-256 lenyomatát)

Ezen a csomagon nem változtattam. A külső fél által közölt forráslenyomat
(`5eada9dda9442c5de9424e0b72ddbd63421c217a1180619bd7f08e339ae6183e`) az ő futásából származik; a
saját futásom lenyomatát az R126-os jelentés tartalmazza. **Kimondva:** a két lenyomat
összevetését nem végeztem el, mert a generátor a `package.json` verziójától és a forrás bájtjaitól
függ, a repóbeli forrás pedig azóta nem változott — a lenyomat-egyezés önmagában nem bizonyítéka a
működésnek, a működés bizonyítéka az önálló fájl megnyithatósága.

---

## 7. SAJÁT FRISS MÉRÉS ÉS ÖRÖKÖLT EREDMÉNY — SZÉTVÁLASZTVA

**ÖRÖKÖLT (nem ebben a körben mértem újra):** az R126-os csomag teljes mérés-sora — `findings_r125`
29/29, `findings_r123` 47/47, `findings_r121` 55/55, mag 63/63, rontás-battéria 221/221,
`verify:kuka` 518/518, teljes böngésző-készlet 105/105, a nyelvi és súgó-kapuk. Ezek a **d3c53f0**
commit állapotára szólnak, és a termékkód **azóta nem változott**, tehát érvényesek.
**A külső fél saját futásai** (az F125-01 HTTP-reprodukció újrafuttatása, `findings_r125` 29/29,
`findings_r123` 47/47, `npm run bemutato:onallo`) az **ő** mérései — nem az enyémek.

**SAJÁT FRISS MÉRÉS ebben a körben:**

| Mérés | Parancs | Eredmény |
|---|---|---|
| A célzott késői-válasz regresszió | `npx playwright test tests/e2e/v3app-r127.spec.mjs` | **6/6 PASS** (9,4 s) |
| Szomszéd-regresszió (ugyanaz a felület és kontextus-verseny) | `npx playwright test tests/e2e/v3app-r127.spec.mjs tests/e2e/v3app-r121.spec.mjs tests/e2e/v3app-r123.spec.mjs tests/e2e/v3app-r77.spec.mjs` | **19/19 PASS** (57,8 s) |

**Miért nincs több mérés ebben a körben:** a csomag **nem** érint termékkódot — egyetlen új
próba-fájlt ad hozzá. A parancs kifejezetten nem kért új teljes söprést, és egy nem módosított
kódon a teljes készlet újrafuttatása nem új bizonyíték.

---

## 8. AZ SHA-K

- **Ág:** `claude/chatgpt-board-r121-error-favm2e`
- **Kiinduló és MÉRT SHA:** `d3c53f08ebb2a9f5d4d44723fbea40c642639ded` — az R126 záró commitja. A
  6/6 és a 19/19 **ezen** a termékkódon futott; a munkafában csak az új próba-fájl állt.
- **Záró SHA:** a board-üzenet záró sorában. **A mért és a záró SHA eltérése, kimondva:** a záró
  commit a mért állapothoz **az új próba-fájlt, ezt a jelentést és a fogyasztás-leltárt** teszi
  hozzá — `v3ref/` és `v3app/` termékkód **nem** változott, tehát a mért eredmény a záró állapotra
  is érvényes.

**Fájl-delta:**

| Fájl | Mi változott |
|---|---|
| `tests/e2e/v3app-r127.spec.mjs` | **új:** 6 eset — a késői adatválasz a három mintanézet-úton, mindkét elengedési sorrendben, személyváltással, pozitív kontrollal és a határ megmérésével |
| `docs/70_PLANNING/V3_R128_KESOI_ADATVALASZ_A_MINTANEZETEKEN.md` | **új:** ez a jelentés |
| `docs/70_PLANNING/V3_R128_FOGYASZTAS_LELTAR.json` | **új:** tartalom nélküli fogyasztás-leltár |

---

## 8/b. FOGYASZTÁS — EGY SOR

`npm run meres:fogyasztas -- --session a8dcd237… --from 2026-09-30T17:54:19.050Z --label "R128 csomag"`
· **hívás 32** · **ügynök-bemenet 0 (0 ügynök)** — egy fő végrehajtó, automatikus agentmunka nélkül
· csomagablak fő-szál medián **713 781** · a **chatváltási jelző elérve**. A parancs ezt előre
kimondta: ez a csomag a megkezdett munka **célzott** befejezése, a **következő önálló nagy blokk
friss beszélgetésben** induljon. A tartalom nélküli leltár:
`docs/70_PLANNING/V3_R128_FOGYASZTAS_LELTAR.json`.

---

## 9. NEVESÍTETT MARADÉK

1. **A határ az E6-ban** (az észlelés előtt megérkező válasz kirajzolódik a régi nézetbe) — mérve,
   megnevezve, nem javítás tárgya; az azonnali védelem tervezési kérdés.
2. **A mintanézet-lapok maguktól nem szinkronizálnak** — az új személy az első szokásos lekérésnél
   válik ismertté. Ez a mai, mért viselkedés; a stock/price út szinkronizál (`syncView`), a
   minta-út nem. Ha a jövőben egységesíteni kell, az külön parancs tárgya.
3. **Az R106, az `external-checks` hiánya, a V2 képesség-tanú eltérése és a hivatalos darabolt
   mutációs futtató korlátja** — a parancs szerint e célzott csomagon **kívül** marad, és **nem**
   minősül zöldnek.
4. **A bemutató lenyomat-összevetése** a külső fél futásával nem történt meg (6. szakasz).

---

## 10. AMIT EZ A CSOMAG KIMONDVA NEM BIZONYÍT

- Nem bizonyít **azonnali** védelmet a másik fül személyváltására (4. szakasz).
- Nem bizonyít mást, mint amit a **hat mért eset** fed: a három mintanézet-út, a két elengedési
  sorrend, a fiók- és a személyváltás, a pozitív kontroll és a határ. Más útvonalak késői válaszát
  a korábbi körök lapjai (R77 · R79 · R83 · R85 · R112) mérik.
- Nem teljes söprés, és a 9/3. pont alatti négy nyitott tétel **nem** zöld.
