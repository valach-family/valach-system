> **Kör:** R119 · **Sáv:** Claude-v3 · **Állapot:** lezárt

Repó: valach-system

# R119 — A FIÓK NÉLKÜLI BELÉPÉS BEFEJEZVE, ÉS A KÉT TÚLZÓ ÁLLÍTÁS VISSZAVÉVE

CMD-VS-300-002-002 R119 — REPORT (válasz az R118 ANALYSIS/parancsra)
PR-VS-300 · STEP-VS-300-002 · 2026-09-30
Sáv: Claude-v3 · Parancs: `CMD-VS-300-002-002 R118 — ANALYSIS` (chatgpt-v3) · szülő: R117

**Forrás-kötés:** repó `valach-family/valach-system` · ág `claude/cmd-vs-300-002-002-r116-b1e4no` ·
induló fej **`0c850ae`** (ugyanaz, amit a külső ellenőrző fél vizsgált). A parancs szó szerint:
`v3ref/source-documents/R118_board_v1.md`. A munka commitjai: **`c12178a`** (a két lelet javítása és
az új böngészős próba — **EZEN futott a mérés**) · és a záró commit ezzel a lappal, a fogyasztás-leltárral
és az újramért bizonyíték-lappal. Merge, telepítés, V2-módosítás, új üzleti modul, jogosultsági
modellváltás, core/CMD/PR-zárás nem történt.

**A KIPRÓBÁLHATÓ LAP (megnyitható link):** https://claude.ai/artifact/V2kzeaQmqnLCWYGGie44gC
Ugyanez a repóban: `docs/_olvashato/V3_R112_TORTENETEK_BEMUTATO.html` (`npm run docs:r89-bemutato`).
*A link privát: az operátor nyitja meg; másnak a lap Megosztás menüjéből adható hozzáférés.*

---

## 1. RÖVIDEN — MI VÁLTOZOTT

**A külső ellenőrző félnek igaza volt mindkét leletben, és mindkettő javítva.**

- **Aki belépett, de a címét még nem erősítette meg, eddig zsákutcába futott.** A Saját profil fül
  megnyílt, de „Válassz fiókot" állt benne — pedig nincs mit választania, hiszen a személyes fiókja
  épp a megerősítéskor születik meg. A profiloldali és a biztonsági oldali „Új megerősítő levél
  kérése" gomb így elérhetetlen maradt. **Mostantól a személyhez kötött oldalak fiók nélkül is
  megnyílnak**, a fő tartalom pedig kimondja: *„Erősítsd meg az e-mail-címedet a folytatáshoz."* —
  és mellette ott a működő levélkérő gomb, plusz egy átvezetés a Saját profilra.
- **Két ellenőrzési mondat többet állított a bizonyítéknál.** Az egyik azt írta, hogy a
  termék-nyelvek szövegét *ember* nézi át — a szövegeket MI írta és nézte át. A másik általánosan
  azt sugallta, hogy mindenről, amit a lap nem bizonyít, „külön futási bizonyíték készült" — az élő
  MI-válaszról viszont nem készült. **Mindkét mondat pontosítva, mindhárom nyelven**, és az R117-es
  jelentés túlmondó mondata is helyesbítve.

**A működő öt út, a hat kártyanév és az elfogadott elnevezések változatlanok.** Nem terveztük újra
őket, és nem nyúltunk a jogosultsági szabályokhoz.

---

## 2. F118-01 — A FIÓK NÉLKÜLI BELÉPÉS: VÉGÁLLAPOT

**Mi volt a hiba (a külső fél reprodukciója szerint, saját méréssel megerősítve).** A `render()`
a „nincs megnyitott fiók" ágon a képernyő-választó `switch` ELŐTT tért vissza. Ezért a
**személyhez kötött** oldalak — Saját profil · Belépés és biztonság — soha nem rajzolódtak ki, akkor
sem, ha a fül megnyílt. A `GET /api/me` ilyenkor `channel_proven=false`, `workspaces=[]`,
`current_book_id=null`, `personal_book_id=null`.

**Mi lett belőle.**

| Mi | Végállapot |
|---|---|
| a személyhez kötött oldalak | `PERSON_PAGES` (Saját profil · Belépés és biztonság) fiók nélkül is megnyílik és a **tényleges tartalmát** mutatja |
| a fiókhoz kötött üzleti oldalak | **változatlanul korlátozva** — a lista nem jog, csak azt mondja meg, mi nem a fiók adata |
| a fő tartalom megerősítetlen, fiók nélküli állapotban | „Erősítsd meg az e-mail-címedet a folytatáshoz." + mit hoz a megerősítés + **működő levélkérő gomb** + átvezetés a Saját profilra |
| a fő tartalom megerősítve, de fiók nélkül | változatlanul a fiókválasztó mondata (ott tényleg van mit választani) |
| fiktív fiók · jog · automatikus megerősítés | **nem keletkezik** — a tárolóban mérve (lásd 4.) |

**Három belépési pont, mind a három ténylegesen megnyomva a próbában:** a fő tartalom gombja
(`no-account-resend`), a profilmenü gombja (`profile-menu-resend`), a profiloldal gombja
(`profile-resend`). A biztonsági oldal gombja (`security-resend`) is megkapta a saját azonosítóját.

**Egy mellék-lelet, amit a saját R117-es változtatásom hagyott hátra.** A profilmenüben a levélkérő
gomb az első helyre került, egy meglévő böngészős próba viszont a menü gombját SORRENDDEL választotta
ki (`.first()`). Megerősített felhasználóval ez nem tűnt fel, mert ott a gomb meg sem jelenik — az
első megerősítetlen próbánál viszont más gombot nyitott volna meg. A menü gombjai mostantól NÉVVEL
azonosíthatók (`profile-menu-profile` · `profile-menu-security`), és a próba is névvel hivatkozik.

**És egy második mellék-lelet, ugyanebből az osztályból.** A közös próba-segéd (`registerUI`) a
regisztráció visszajelzését MAGYARUL várta, beégetve. Angol vagy német lapon ezért minden
regisztrációs próba elbukott volna — nem a rendszer hibájától, hanem a próbáétól (KUKA-237). A segéd
mostantól a lap SAJÁT nyelvén, a nyelvcsomagból veszi a mondatot.

---

## 3. F118-02 — A KÉT TÚLZÓ ÁLLÍTÁS: VÉGÁLLAPOT

A parancs pontos magyar szövege szó szerint beépítve; az angol és a német tartalmilag egyező,
természetes megfelelő.

| Kulcs | Ami eddig állt | Ami most áll |
|---|---|---|
| `STORYUI.techCoverageNote` | „…a termék-nyelvek szövegét **ember** nézi át…" | „A kulcsok és helyőrzők ellenőrzése nem nyelvi lektorálás. A szövegeket MI írta és nézte át; független anyanyelvi lektorálás nem történt. A próbanyelvek szándékosan hiányosak." |
| `STORYUI.techNotProvenNote` | „**Azokról** külön futási bizonyíték készült…" (az élő MI-válaszra is) | „A vizsgált alkalmazásutak és jogosultsági esetek böngészős eredményei a Használati utak végén olvashatók, dátummal és forrással. **Élő MI-szolgáltatói mérés még nem készült.**" |

**Az R117-es jelentés mondata is helyesbítve** (7. szakasz): az eredeti alak azt írta, hogy az
„értelmileg egyezik" állítást a kulcs- és helyőrző-mérés támasztja alá. **Ez túlmondás volt:** az a
mérés a MEGLÉTET és az ALAKOT méri — hiányzó kulcs, elcsúszott helyőrző —, a tartalmi fordítás-azonosságot
nem. A helyesbítés a lapon áll, megnevezett okkal, nem némán átírva.

**A lenyitott részleteket mindhárom nyelven elolvastam a friss, generált lapon** (nem csak a
szótárban): a fenti két mondat magyarul, angolul és németül a helyén áll, és a nyelvi lefedettség
sora `691/691` kulcsot mutat.

---

## 4. A BIZONYÍTÉK — TÉNYLEGES PARANCSOK ÉS EREDMÉNYEK

### 4.1 Az új, célzott böngészős próba (`tests/e2e/v3app-r119-fiok-nelkul.spec.mjs`)

**R119-01 — a teljes magyar út**, valódi HTTP-szerveren, valódi böngészőben, valódi adatbázissal:
regisztráció → belépés **megerősítés nélkül** → a fő tartalom mondata → a **Saját profil tényleges
tartalma** (e-mail-cím · „Még nincs megerősítve" · nyelvválasztó · levélkérő gomb) → a **Biztonság
tényleges tartalma** („nincs kiválasztott fiók" TÉNYKÉNT, nem zsákutcaként) → levélkérés mind a
három gombbal → a levél megjelenése a próbaüzenetekben → megerősítés a legutóbbi levélből →
kilépés–belépés → **saját személyes fiók**.

**R119-02/en és R119-02/de** — a fiók nélküli állapot mondata és a LÁTHATÓ művelet a választott
nyelven, a nyelvcsomagból mérve, a gomb ténylegesen megnyomva.

**Mind a három zöld.** És **ellenpróba mérve:** a javítás visszavételével (a `PERSON_PAGES` ág
kivételével) **mind a három pirosra vált** — tehát a próba a leletet méri, nem a napot.

### 4.2 Amit a próba KIMONDOTTAN nem állít — és amit közben megmértem

**A `200/ok=true` szerverválasz nem kézbesítés-bizonyíték** (a parancs kikötése). Ezért a próba a
**próbaüzenetek panelen megjelenő levelet** számolja, nem a választ. Ez egy mérhető tényt hozott fel:

> **A mag újraküldési korlátja (`min_gap_ms = 60 000`) miatt közvetlenül a regisztráció után az
> újraküldés NEM hoz létre új levelet** — a válasz akkor is semleges marad (szándékosan: nem árulhatja
> el, tartozik-e a címhez fiók). A próba ezt MÉRI: a korláton belül a levelek száma változatlan, a
> korlát letelte után (fejlesztői óra +61 s) mind a három gomb ÚJ levelet hoz. Az óra a futás végén
> visszaáll (`offset_ms = 0`).

**Ezt a korlátot nem lazítottam.** A parancs tiltja a felületi hiba megkerülését jogosultsággal vagy
automatikus megerősítéssel; egy anti-visszaélési korlát pedig nem felületi hiba. **Nevesített,
megmaradó kérdés:** aki közvetlenül a regisztráció után kér új levelet, ma nem kap külön
visszajelzést arról, hogy egy percet várnia kell — a mondat feltételes („Ha ehhez a címhez
megerősítésre váró belépés tartozik…"), tehát nem állít valótlant, de nem is segít. Ennek a
megváltoztatása a semleges válasz (K03) üzleti mérlegelése, nem szövegjavítás — ezért **nem
nyúltam hozzá**, hanem ide írom.

### 4.3 A tárolt következmény — a felület állításán túl

A megerősítetlen szakasz teljes hossza alatt a `book` · `membership` · `scope_grant` számlálók
**karakterre változatlanok**. A megerősítés után: **pontosan egy** új könyv, **pontosan egy** új
tagság — és az a SAJÁT személyes köre —, és **idegen fiókra szóló adatkör-engedély nulla**. Idegen
fiók vagy jog tehát az úton nem keletkezett.

### 4.4 Teljes battéria és gépi őrök

| Parancs | Eredmény |
|---|---|
| `npx playwright test` (teljes) | **95/95 ZÖLD** a `c12178a` commiton, tiszta munkafán (4,1 perc) — a korábbi 92 + az új 3 |
| a történet-bizonyíték újramérve | **41 bejegyzés · 44 futás · mind zöld**, hiányzó bejegyzés nincs |
| `npm run verify:i18n` | **49/49 PASS · ellenpróba 6/6** — hu/en/de mind **691/691 kulcs**, 0 hiány · 0 árva · 0 helyőrző-eltérés |
| `npm run verify:tutor` | **86/86 PASS · ellenpróba 14/14** |
| `npm run verify:assistant` | **55/55 PASS · ellenpróba 6/6** |
| `npm run app:selfcheck` | **57/57 PASS** |

**Változatlan magra nem futott új mutációs és külső lánc** — a parancs felmentése él tovább, és a
mag ebben a körben nem változott (`v3ref/` érintetlen; csak a boardról elmentett SPEC-lap került
bele). A `verify:capability-witness` V2-oldali maradékát a parancs kizárja ebből a csomagból.

---

## 5. RÖVID KIPRÓBÁLÁSI SORREND (kb. 5 perc)

A **valódi alkalmazásban** (a javítás lényege itt látszik):

1. Regisztrálj egy új címmel, és a megerősítő levelet **ne nyisd meg**.
2. Lépj be ugyanazzal a jelszóval. A lap most **nem** fiókválasztást kér, hanem azt mondja:
   *„Erősítsd meg az e-mail-címedet a folytatáshoz."*
3. Nyomd meg az **Új megerősítő levél kérése** gombot — az űrlap megnyílik és beküldhető.
4. Nyisd meg a **Saját profil** oldalt (a mondat alatti gombbal vagy a profilmenüből): a címed, az
   állapota, a nyelvválasztó és a levélkérő gomb mind a helyén van. Ugyanez a **Belépés és
   biztonság** oldalon.
5. Nyisd meg a levelet a **Próbaüzenetek** panelen, erősítsd meg, lépj ki és be: megjelenik a
   **személyes fiókod**.

A **kipróbáló lapon** (https://claude.ai/artifact/V2kzeaQmqnLCWYGGie44gC): válts a *Súgó és
képernyők* módra, nyisd le az **Ellenőrzési részletek** részt, és olvasd el a két javított mondatot
— magyarul, angolul és németül.

---

## 6. MUNKAMENET ÉS FOGYASZTÁS — ÁTADHATÓ FORRÁSSAL

**A leltár a repóban áll, a mérő saját, tartalommentes kimeneteként:**
`docs/70_PLANNING/V3_R119_FOGYASZTAS_LELTAR.json` — egyetlen fájl, amely a **csomagot**
(`window_summary`) és a **kumulatív munkamenetet** (`whole_session`) KÜLÖN hozza. Ez a mérő
(`npm run meres:fogyasztas`) kimenete, nem kézzel írt szám; a fájl a bemeneti átiratok manifesztjét
is viszi (út · bájt · sha256), tehát a mérés visszakereshető.

| | csomag (az R118 parancstól) | teljes munkamenet |
|---|---|---|
| hívás | 49 | 238 |
| fő-szál kontextusmedián | **564 304** | **400 462,5** |
| maximum | 601 655 | 601 655 |
| ügynök-bemenet (ügynök-szám) | 0 (0) | 0 (0) |
| cache-olvasás | 26 987 257 | 90 274 930 |
| lefedettség | teljes | teljes |

**A küszöb-kérdés, amit az R118 pontosított — és amit most MÉRTEM.** Az R118 helyesen mondta, hogy
az R117-ben közölt 320 666-os medián és a 441 091-es maximum önmagában **nem** teljesíti a 400 ezres
KUMULATÍV MEDIÁN szabályt, és hogy ezért nem kértem volna új beszélgetést. **A mai mérés viszont a
teljes munkamenetre 400 462,5-öt ad, ami eléri a rögzített küszöböt** (a mérő maga írja ki: sáv =
*váltás*). Ez tehát nem preferencia és nem a „következő kör" miatti kérés: **új mérés szerinti
küszöb**, amire az R118 saját mondata is kivételt enged. Ennek megfelelően: **ezt a befejező
javítást az aktuális munkamenetben végigvittem**, ahogy a parancs kérte; a **következő önálló nagy
blokk** viszont friss beszélgetésben induljon.

**Költség: ismeretlen (`null`).** Heti limitarányt és megtakarítást ebből nem számolok.

---

## 7. ŐSZINTE MARADÉKLISTA

- **Nem független anyanyelvi lektorálás.** Az angol és a német szöveget MI írta és nézte át. A
  kulcs- és helyőrző-mérés a MEGLÉTET és az ALAKOT méri, a tartalmi egyezést nem — ezt a lap szövege
  mostantól maga is kimondja.
- **Az újraküldési korlát visszajelzése** (4.2): a korláton belüli kérés nem kap külön magyarázatot.
  Nevesített, nem elfedett; a megváltoztatása a semleges válasz üzleti mérlegelése.
- **Élő MI-szolgáltatói mérés továbbra sincs** (`npm run kapcsolat:ai` · `npm run proof:assistant-live`).
  A lap szövege ezt most már kimondja, nem sugall kész bizonyítékot.
- **`verify:capability-witness`** V2-oldali maradéka változatlan — a parancs kizárja ebből a csomagból.
- **A két próbanyelv** (francia, arab írásirány-próba) szándékosan hiányos.
- **A külső ellenőrző lánc (`verify:external-checks`) nem futott** ebben a körben sem: változatlan
  magra a parancs nem kéri. Ez **NEM IGAZOLT** állapot, nem zöld.

---

## 8. A VÁLTOZÁS DARABJAI

| Fájl | Mi változott |
|---|---|
| `v3app/public/app.js` | `PERSON_PAGES`; a fiók nélküli ág kétféle mondata; a menü- és biztonsági gombok azonosítói |
| `v3app/public/i18n/hu.mjs` · `en.mjs` · `de.mjs` | 4 új kulcs a megerősítetlen, fiók nélküli állapothoz; a két pontosított ellenőrzési mondat |
| `tests/e2e/v3app-r119-fiok-nelkul.spec.mjs` | **új** — a teljes magyar út + a két nyelvi próba |
| `tests/e2e/helpers.mjs` | a regisztrációs segéd a lap saját nyelvén várja a mondatot |
| `tests/e2e/v3app-r89-tutor.spec.mjs` | a profilmenü gombja névvel, nem sorrenddel |
| `docs/70_PLANNING/V3_R117_FELULET_ES_SUGO.md` | a túlmondó mondat helyesbítve, megnevezett okkal |
| `docs/70_PLANNING/V3_R119_FOGYASZTAS_LELTAR.json` | **új** — a mérő tartalommentes leltára (csomag + kumulatív) |
| `docs/70_PLANNING/V3_R112_TORTENETEK_BIZONYITEK.json` | a bizonyíték újramérve a tiszta commiton |

---

## 9. MI A KÖVETKEZŐ

Az R116 csomag két nevesített hiányossága javítva; az elfogadott öt út, a hat kártyanév és az
elnevezések változatlanok. A következő blokk tárgya nem ebből következik — a döntés a
tervező-ellenőrző sávé. A fogyasztás-mérés szerint a következő önálló nagy blokk friss
beszélgetésben induljon (6. szakasz).
