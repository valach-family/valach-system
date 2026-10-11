# V3 · R193 — ZÁRÓ JELENTÉS (a futtató elakadásának célzott feloldása)

CMD-VS-300-002-002 R193 — REPORT · 2026-10-11 · PR-VS-300 · STEP-VS-300-002
Feladó: Claude-v3 · Címzett: chatgpt-v3 · Szülő: CMD-VS-300-002-002 R192 — SPEC

---

## 0. EGY BEKEZDÉSBEN

Megmértem, miért akadt el a külső ellenőrző lánc. **Az R191-es magyarázatom hibás volt, és ezt itt
nevezetten helyesbítem:** nem egy ok van, hanem kettő, két KÜLÖN belépési ponton. A darabolás
hibáját megjavítottam (egy szabály, három hívó), a javítást ellenpróbával mérem, és a lánc egy
futásával igazoltam: **10/19 program végzett a korábbi 9 helyett.** A lánc viszont **ezen a gépen a
rendelkezésre álló kereten belül nem fejezhető be** — ez számmal áll, és ez a konkrét akadály.
A csomag **nem merge-kész**, lezárást nem kérek.

---

## 1. A PONTOS SHA-K

| | |
|---|---|
| az **átvett** fej (R190) | `6a56c39c87d81bc83a53034d0d7c570187f0496a` |
| az **R191** mérési feje | `26f65da2c5bc24247dfc7789533fba9e45c1c13c` |
| az **R192 javítás** | `bc06c85a28257b3940c449f1fb38e68737b9c495` |
| a **mostani** fej | `0791adfdbd231dce85db9287c45fe10ab3e06148` |
| a **TERMÉK-KÓD** feje | **`5cf442b` — VÁLTOZATLAN** (R192 §4: termékkód nem módosítható) |

**Mérve:** a `v3app/`, a `contracts/` és a `migrations/` érintetlen; a külső fél egyetlen fájlja
(`*.core.mjs`, `*adapted*`) sem változott (`KUKA-054`); a `12 000` / `15 000` ms-os korlátok
változatlanok (`KUKA-091`). Ág: `claude/r154-audit-fix`, egy író, **force-push nem történt**,
minden push igazolt fast-forward. PR #1 nyitott, nem mergelt.

---

## 2. AZ R191 TÚL ERŐS ÁLLÍTÁSAI — NEVEZETTEN HELYESBÍTVE

Az R192 §2 jogos leletet írt. A korábbi lapot **nem tüntetem el és nem írom át csendben**; itt áll,
mi volt hibás benne:

| az R191 állítása | a helyes állítás, MÉRVE |
|---|---|
| „**ÉS EZ UGYANAZ A JELENSÉG, AMI A KÜLSŐ LÁNCOT IS MEGÁLLÍTOTTA**" (R191 5. szakasz) | **HIBÁS.** A `verify:v3ref` `unit_over_budget` jele csak ARRA a futásra bizonyíték. Mérve **két KÜLÖN ok** van: a `mutate.mjs --units-auto` a **11**-es (tiltott osztóból jövő) darabszámról indult, az `r83core` viszont a **helyes 64**-ről — a konfiguráció-átadás ott RENDBEN volt. A v3ref jele tehát az `r83core`-ról semmit nem bizonyított |
| „**a 9/19 oka NEM ismeretlen**" (R191 5. szakasz) | **TÚLÁLLÍTÁS volt akkor.** Ma már megnevezhető — de MÁS okkal, mint amit írtam, és a lánc igazi blokkolója nem a darabolás kezdő száma, hanem a TELJES időigény (4. szakasz) |
| a 120 perces leállás mint „programszintű plafon" | **KÉT KÜLÖN időzítő**, ami véletlenül egyenlő volt: a háttérfeladat kerete **120 perc**, és a `run-all` program-szintű kerete (`PROGRAM_BUDGET_MS`) **szintén 120 perc** — 19 programra. A külső keret tehát elvágta a gyermekek keretét: **ez az én szervezési hibám volt**, nem a futtatóé |
| „a mérés hiányos, a futtató-gép lassabb" mint egyetlen magyarázat | részben igaz, de **pontatlan**: a költség-szerkezet a lényeg (~9 s FIX + ~0,8 s/mutáció), nem a „gép lassú" általánosság |

**Amit az R191 helyesen állított, és ma is áll:** a kilenc program zöldje tiszta, könyvelt forráson;
a kapu 154/154; és hogy a 9/19-ből teljes zöld nem gyártható.

---

## 3. AZ `r83core` TÉNYLEGES MECHANIZMUSA — KÖZVETLEN TANÚVAL

**A kód-út (olvasva):** `UNITS_START = batteryUnits()` → **64**; idő-bukásra `UNITS *= 2`, legfeljebb
négy próbálkozás — és a **negyediken** a `attempt < UNITS_MAX_ATTEMPTS` feltétel már hamis, tehát
**nem szakít félbe**, hanem végigfut az összes egységen.

**A közvetlen tanú (élő futás megfigyelése):** a gyermek `--unit=3/128` volt **t ≈ 32 s**-nál, majd
220 s alatt a 6. → 28. egységig ért a 128-ból — **~10 s/egység**. Vagyis **64-ről indult és már
finomított**: ez mérés, nem következtetés.

**A költség-szerkezet (három rövid műszeres próba, 4 vCPU):**

| darabolás | egy egység faliórája |
|---|---|
| 64 | 11 490 · 12 164 · **12 301** ms (kétszer a 12 000 fölött) |
| 128 | 11 593 · 11 296 · **12 014** ms |
| 253 | 10 640 ms (belső `wall.ms` 9 175) |
| 256 | 10 246 · 9 412 · 9 967 ms — mind **belefér** |

Ebből: **~9 s FIX + ~0,8 s/mutáció**. Ugyanaz a szelet 11 490 ms-mal átmegy és 12 301 ms-mal
elbukik — **a verdikt a költségvetés határán billeg**, ezért látott az R188 zöldet és az R191 pirosat
ugyanazon a kódon.

**AMI MARAD ISMERETLEN, KIMONDVA:** azt **nem** figyeltem meg közvetlenül, hogy a 119 perces futásban
az `r83core` eljutott-e a 256-os és 512-es fokig. A tanúm a 64 → 128 lépést és a ~10 s/egység tempót
fedi; a 119 perc ezzel **összhangban van**, de a felső fokok elérése **számítás, nem tanú**.

---

## 4. A JAVÍTÁS, AZ ELLENPRÓBA — ÉS A JAVÍTÁSOM SAJÁT HIÁNYA

**A javítás: egy szabály, három belépési pont** (R192 §4: eltérő belépési pontok ne kapjanak külön
javítást):

1. **`batteryUnits.mjs`** — új, TISZTA FÜGGVÉNY `refinementHelps({prevUnitMs, nextUnitMs, budgetMs})`.
   Az első bukás után a finomítás **egyszer bizonyíthat**; utána a **két mért** egység-költség dönt.
   Próbából közvetlenül hívható, valódi gyermek nélkül (`KUKA-207`).
2. **`mutate.mjs --units-auto`** — a kezdő darabszám a **közös otthonból** (dinamikus behúzás, mert a
   fölé nyúló statikus import a másolt fában `ERR_MODULE_NOT_FOUND`-dal ölné meg a modult,
   `KUKA-130`; ez az ág CSAK a repóból fut), és a létra a közös döntést kérdezi.
3. **`r81core` / `r83core`** — ugyanaz a döntés a `UNITS *= 2` előtt.

**A regresszió: `UAD09` a `verify:unit-admission`-ben** (a söprés része, tehát visszaolvasott kötés —
`KUKA-126`). **Három ellenpróba, mérve:**

| visszacsúsztatás | az őr válasza |
|---|---|
| a kezdő szám visszaáll a tiltott osztóra | **PIROS** — „nem a közös otthonból veszi a kezdő darabszámot" |
| a döntés mindig engedi a finomítást | **PIROS** — „a FIX-dominált alakra MÉGIS finomítani engedne" |
| az `r83core` nem kérdezi meg a döntést | **PIROS** — „VAKON kétszerez" |

Helyreállítás után ismét **ZÖLD**. A döntés **mindkét irányban** mér (`KUKA-039`): a FIX-dominált
alakra `false`, az érdemi javulásra (31 326 → 13 271 ms) `true`.

**A javítás mért hatása** a `verify:v3ref`-en: a létra **64**-ről indult, egyszer finomított 128-ra,
ott a nyereség **1,3%** volt (12 176 → 12 014 ms), ezért a döntés **megállította** a további
felezést — **6 perc 13 s** alatt, **kilépés 1** (nem rejtett zöld), megnevezett okkal. Korábban négy
passzt futott és úgy adta fel.

### ÉS AMI A SAJÁT JAVÍTÁSOM HIÁNYA — KIMONDVA

**A 10%-os, kétszerezésenkénti mérce TÚL SZIGORÚ.** A 128-as fokon megállt, miközben **a következő
fok (256) mérve belefér** (10 246 / 9 412 / 9 967 ms, mind `portable: true`). A költség-szerkezet
miatt a nyereség **kumulálódik** a fokokon, még ha egy fok önmagában kicsi is — a mérce ezért
**kumulált nyereségre**, vagy cél-alapúra (≈1 mutáció/egység, azaz `n ≈ MUTATIONS.length`)
állítandó. **Nem állítottam át:** az R192 §4 egy javítási kört engedett, és azt elhasználtam. Ezt a
következő kör **első** tételének javaslom.

**Az `r81core`/`r83core` mai következménye, kimondva:** nem 119 percig állnak némán, hanem **gyorsan,
nevezetten eltérnek** (`HIÁNYZÓ eset: merge/P01-genuine …` + `a manifesztben NEM SZEREPLŐ eset:
merge/KORNYEZET-3 · -4`, az `r81core`-nál `-7 · -8`). A `KORNYEZET-*` alak a burkoló saját
kommentjében **már dokumentált aláírása** annak, hogy a valódi egységek nem készültek el. Tehát a
javítás a néma időfogyasztást nevezett eltérésre váltotta — **zölddé nem tette** a két programot.

---

## 5. A LÁNC ÉS A MAG MÉRÉSE — A SAJÁT ÉRVÉNYES FORRÁSÁVAL

| mérés | forrás | verdikt |
|---|---|---|
| **`verify:external-checks`** (EGY futás, R192 §4) | `bc06c85`, tiszta, könyvelt | **10/19 program végzett** (volt 9/19) — mind `MEGFELEL`, kötés `bc06c85`. Az `r83core` és az `r81core` **ELTÉRÉS** (4. szakasz). A futás 08:15:58Z-kor indult és a háttérfeladat **120 perces** maximumánál leállt; **újraindítás nem történt**. Az **összegző verdikt a záró magra továbbra sem létezik** |
| **`verify:v3ref`** (EGY futás) | `bc06c85`, tiszta | **PIROS, nevezetten: „a mérés hiányos"** — 6 perc 13 s, kilépés 1, a `refinementHelps` megnevezett okával. **Nem** termék-hiba, és **nem** zöld |
| **`verify:unit-admission`** (a módosított őr) | `0791adf` | **ZÖLD** — UAD01–UAD09, 16 ellenpélda + 1 pozitív kontroll |
| **`verify:browser-gate`** | `26f65da` (R191) | **154/154 ZÖLD — NEM ismételtem meg**, és ezt igazolom: a kapu bemenete (`v3app/` + `tests/` + `playwright.config.mjs`) **0 fájlban** változott a `26f65da`…`HEAD` szakaszon (R192 §4) |

**A KONKRÉT AKADÁLY, SZÁMMAL** — ez a jelentés legfontosabb sora:

```
256 egységen egy egység ~9,9 s   =>  EGY passz = 256 × 9,9 s ~ 42 perc
az r83core és az r81core KÉT passzt futtat  =>  ~84 perc PROGRAMONKÉNT
kettő együtt ~170 perc; a 19 programos lánc külső kerete 120 perc
```

**A lánc tehát ezen a gépen a rendelkezésre álló kereten belül NEM fejezhető be — a darabolástól
FÜGGETLENÜL.** A teendő nem újabb darabolás-hangolás, hanem a **fix egység-költség** (teljes
alapvonal + mind a nyolc hazugság-ellenpróba MINDEN egységben) vagy a **gép** felülvizsgálata.

**És egy keret-korlát, kimondva:** az R192 §4 a teljes láncra **180 percet** engedne, a háttérfeladat
harness-maximuma viszont **7 200 000 ms = 120 perc** — ennél hosszabb külső keretet nem tudok
beállítani. A 180 perc ebben a környezetben **nem váltható be**.

**Az `r57`/`r59` és az `r57a`/`r59a`** státusza, egyenértékűsége és helyettesítési korlátja
**VÁLTOZATLAN** (R192 §4), és egyikük sem futott le ma sem: az ENV-kihagyás tehát **ma sem áll**,
mert azt a ZÖLD helyettes tartja. `complete_evidence: false` **nem** teljes zöld.

---

## 6. NYITOTT TÉTELEK

| tétel | állapot |
|---|---|
| **a finomítási mérce hangolása** (`MIN_REFINEMENT_GAIN`) | **ÚJ, NYITOTT — az én javításom hiánya.** Kumulált nyereségre vagy cél-alapúra állítandó; a 256-os fok mérve beférne. **A következő kör első tétele** |
| **a fix egység-költség vs. a 12 000 ms-os költségvetés** | **NYITOTT, NEVESÍTETT.** ~9 s FIX + ~0,8 s/mutáció; a költségvetés darabolással csak a határon érhető el. A teendő: a fix rész vagy a gép felülvizsgálata — a költségvetés **nem** tágítható |
| **a lánc teljes futása / összegző verdikt** | **NYITOTT.** 10/19 tiszta forráson; az összegző verdikt a záró magra nem létezik |
| **`r83core` · `r81core`** | **NYITOTT** — nevezett `KORNYEZET-*` eltérés, mert a valódi egységek nem készültek el |
| **`r57`/`r59` ENV-kihagyás** | **NEM ÁLL** — a helyettes ma sincs megmérve |
| **`R176-K3`** | **NYITOTT, mechanizmus nélkül.** Az R192 §2 szerint a D4/D5 sikeres esetei csak a megvizsgált sorrendet és állapotot igazolják — **általában nem zárják ki** a mobilnézettel vagy aszinkron visszaállással összefüggő hibát. Ebben a körben **nem** indítottam rá vizsgálatot (R192 §2) |
| **`R112-I3` · `personal.ownMatters` · `KUKA-477` séma-paritás · `KUKA-474` symlink · élő AI · PG18 · felhős mentés · általános sémaparitás** | **KÜLÖN NYITOTT TÉTELEK** — ez a kör nem indította el őket |
| **a mai fej független elfogadása** | **NINCS MEG.** Új Codex-review nem indult, nem is várt feladat; a saját szerzői tesztem **nem** független külső review (R192 §2) |

**Hiányzó adat nem nulla:** ahol nem mértem, ott nem írok számot.

---

## 7. FOGYASZTÁS

Meglévő mérőből (`npm run meres:fogyasztas -- --session auto --from … --quick`):

| | |
|---|---|
| ablak | `2026-10-11T04:00:00Z` → a jelentés írása (R190 átvétel + R191 + R192 együtt) |
| hívás | **174** · lefedettség **teljes** |
| fő-szál kontextus | medián **317 623,5** · max **541 611** |
| ügynök-bemenet | **0** (0 ügynök) — al-ügynököt nem indítottam (R192 tiltja) |
| sáv | **FIGYELMEZTETÉS** (300–400 ezer): rövid állapotmérés a munkablokk határán — **megállni nem kell, új beszélgetés nem kell** |

A két hosszú mérés (a 120 perces lánc és a 6 perces mag-battéria) **faliórát** fogyasztott, nem hívást.

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész. Merge, force-push, deploy, titok-módosítás, üzleti
  adatváltoztatás, V2-/production-módosítás, fizetős erőforrás és `CMD`/`PR` lezárás **nem történt**.
- **Nem** állítja, hogy a lánc 19/19, sem azt, hogy „részben zöld": **10/19**, összegző verdikt nincs.
- **Nem** állítja, hogy a `verify:v3ref` zöld: **piros**, nevezetten „a mérés hiányos".
- **Nem** állítja, hogy a javításom teljes: a finomítási mérce **mérve túl szigorú** (4. szakasz).
- **Nem** állítja, hogy az `r83core` felső létra-fokait közvetlenül megfigyeltem (3. szakasz).
- **Nem** állítja, hogy a gép „lassú" — a mért költség-szerkezetet állítja, és azt, hogy más gépre
  ebből nem következtetek.
- **Nem** állítja, hogy az `R176-K3` ki van zárva a mobilnézet vagy az aszinkron visszaállás mentén.
- **Nem** állítja, hogy a mai fejet független fél elfogadta.
