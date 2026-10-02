# R145 — A lefedés bizonyítéka deklarált kötés, a teljesség piros, és a modell témájából művelet lesz

> **Kör:** R145 · **Sáv:** Claude-v3 · **Állapot:** lezárt

**A parancs:** `CMD-VS-300-002-002 R144 — SPEC` (chatgpt-v3, 2026-10-02).
**Repó:** `valach-family/valach-system` · **Ág:** `claude/eager-wright-3hwupf`.

---

## 0. Amit ez a lap NEM állít — elöl, hogy ne kelljen keresni

**Ez a kör NEM az R142 teljesítése.** A külső ellenőrző fél három nevezett leletét (F144-01..03)
javítottuk, mellé egy negyediket, amit én találtam — és a lefedés-mérés most már valóban mér. **A
SPEC hat hátralévő tételéből viszont NÉGY nem épült meg** (2. · 4. · 5. · 6.), az 1. pedig csak
részben. A részletes elszámolás a 7. szakaszban áll, soronként.

**Nem állítunk teljes lefedést** — és nem is zöld kivétel-őr alapján beszélünk: a
`npm run verify:lefedes` **MA PIROS**, mert 20 valódi, alkalmazható hiány maradt. Ez a gépi nyom,
nem egy ígéret egy lapon.

**És egy mérés, ami minden AI-állítást keretez:** ebben a konténerben **nincs engedélyezett
szolgáltató** (`npm run kapcsolat:ai` → hiányzik `VS_AI_PROVIDER` és `VS_AI_API_KEY`, az
openai-kompatibilis úthoz `VS_AI_BASE_URL` is; kulcs-ÉRTÉK nincs kiírva). Ezért **élő
nyelvértésre vonatkozó állítás egyetlen itteni mérésből sem következik** (KUKA-089 · KUKA-127).
Amit mértünk, az a SAJÁT szerződésünk, helyi szolgáltatói csonkkal: mit ad át a szerver, mikor hív,
mit fogad el, mit utasít el, és mit ajánl fel utána.

---

## 1. A megnyitható bemutató — három indulási lépés

**A bemutató linkje: https://claude.ai/artifact/B2tbELpgWxGiohhuzXzsTY**
*(frissítve a mai forrásból — 2. verzió; a link ugyanaz, mint az R143-ban.)*

1. nyisd meg a fenti linket;
2. nyomd meg a **„2 · Munkatárs visszatérése"** gombot a felső sávban;
3. kövesd a buborékot — a „Tovább" sosem végzi el helyetted a műveletet.

A két történet (**1 · Meghívás visszavonása** · **2 · Munkatárs visszatérése**) 18-18 lépés, és
mindkettő ÁTÍVEL a szereplőkön. Keskeny ablakban (≈390 px) ugyanúgy végigvihető.

**Amit a bemutató háttere KIMONDVA nem ad:** a `demo-adapter.mjs` jelölt csonk, tehát HTTP- vagy
adatbázis-bizonyíték ebből nem következik (KUKA-227). A bemutató tudás-csomagja viszont
SZÁRMAZTATOTT: a `npm run demo:knowledge` a VALÓDI szervert kérdezi meg, tehát amit a bemutató
mutat, azt a termék mondta — nem mi. Ebben a körben újra kellett generálni (a funkció-deklarációk
változtak), és utána a böngészős tanú ismét végigment.

---

## 2. Funkciónkénti előtte/utána — a MÉRT számok

| fajta | népesség | hiány ELŐTTE (R143) | hiány MA | mi javította |
|---|---|---|---|---|
| **végpont (route)** | 32 | 5 | **0** | deklarált támogató olvasás (`reads`) a négy érintett funkcióban |
| **felületi művelet** | 42 | 7 | **0** | deklarált `ui_actions` 17 funkcióban (40 művelet) |
| **űrlap** | 6 | 1 | **0** | a hiányzó kötés pótolva |
| **belépési nézet** | 3 | 0 | **0** | — |
| **oldal** | 17 | 10 | **10** | NEM javítva — tartalmi pótlás kell (3. szakasz utolsó bekezdése) |
| **bemutató** | 28 | 6 „nyitott" | **10 csak indok-szöveggel** | a szám NŐTT, mert a mérés megszigorodott (lásd lentebb) |

**A bemutató-szám NÖVEKEDÉSE nem visszacsúszás, hanem a hamis pozitívok eltűnése.** Korábban 6
nyitott bemutató-hiány volt — ma 10 funkció áll „csak indok-szöveggel": `auth.verify` ·
`auth.login` · `auth.resend` · `auth.logout` · `account.personal` · `data.documentSample` ·
`data.supplierSample` · `shell.profile` · `shell.assistant` · `shell.sample_pages`. A 28 bemutató
közül **18 áll MÉRT lépésen** (saját 13 · közös 5). Ezt a SPEC előre kimondta: *„Az R143 szerinti
5 route + 10 oldal + 6 túra ismert kiindulás, nem teljesnek tekinthető felső határ."*

**Nyitott oldalak (10):** `processes` · `documents` · `movements` · `stockcard` · `products` ·
`partners` · `warehouses` · `account` · `personal` · `security`.

---

## 3. F144-01..03 — piros → zöld, ellenpárral

### F144-01 — a mérés az ELSŐ egyező horgonyból minősített (KUKA-286)

**A lelet, visszamérve:** a `shell.assistant` a `tour.shell` 5. lépésével volt „fedett", aminek a
célja a SÚGÓGOMB; a `members.revoke` a `tour.invite` 1. lépésével, aminek a célja a Felhasználók
MENÜPONTJA; az `auth.verify` a demólevél-lépésekkel. **A második reprodukció is igaz volt:** a
művelet-kötés kötőjeles RÉSZ-SZÓRA illesztett, ezért a tagság-megszüntetés kötésének ELTÁVOLÍTÁSA
is zöld maradt (`member-scope-revoke-` és `invite-revoke-confirm` „bizonyította" a `revoke`-ot).

**A javítás:** a kötés a FUNKCIÓ oldalán áll és EXPLICIT. Bemutató: `shared_tour: { tour, steps }`
— a bemutatónak és minden deklarált lépésnek létezni kell, és legalább egy lépésnek VALÓDINAK:
`task`-ot hordoz, VAGY a funkció kimondott MUNKAFELÜLETÉRE mutat (`surface`), ami nem menü és nem
megnyitó. Művelet: `ui_actions` — a funkció megnevezi a hozzá tartozó felületi műveleteket.

**A SPEC kérése szerint a `members.revoke` a MEGLÉVŐ reentry-történet valódi lépését használja** —
nem gyártottunk miatta duplikált bemutatót.

**ELLENPÁROK (mind zöld):** `(L11)` a tagság-megszüntetés kötése nélkül a `revoke` HIÁNY, noha a
meghívó- és hatáskör-visszavonás létezik · `(L12)` a MENÜPONTRA mutató, task nélküli lépés
`declared_invalid`, nevezett indokkal · `(L10)` nincs olyan deklarált művelet, ami a forrásban nem
létezik · `(L13)` ugyanez a támogató olvasásokra. **A deklaráció tehát mindkét irányban mért:** az
elírás és a kivezetett gomb is piros.

### F144-02 — az oldaltérkép mérése nem létező mezőt olvasott (KUKA-287)

**A lelet, visszamérve:** a menü-szerkezetet a HU szótárból kértem (`dict.NAV_GROUPS` ·
`NAV_ADMIN` · `NAV_PERSONAL`), ahol ezek nem léteznek; a tartalék-ág némán ÜRES menüt adott.
**17 oldal / 0 menütalálat** — a tényleges forrással **16**. És a `sitemap: false` SOHA nem került
a hiányok közé, tehát az oldaltérkép ellenőrzése nem volt igazolt.

**A javítás:** a menü-szerkezet a TÉNYLEGES forrásból (`v3app/public/texts.mjs`), az oldaltérkép
népessége a súgó SAJÁT feloldójából (`sitemapPages`, SMP-01) — ugyanaz a függvény rajzolja a lapot
és méri a lefedést (KUKA-018). Az elérhetőség HÁROM külön mért tény: **menü · oldaltérkép ·
belépő** (`data-go`), és a hiány csak mindhárom egyidejű hiányánál áll be — a külön belépőből
elérhető `new` oldal tehát nem lesz hibás attól, hogy nincs a főmenüben, ahogy a SPEC kérte. A
**NEM MÉRT** (`null`) nem azonos a HIÁNYZÓVAL (`false`): az előbbi ELAKADT MÉRÉS, nevezetten.

**ELLENPÁR:** `(L8)` egy nem létező oldalra a feloldó NEVEZETT hiányt ad (nem néma mezőt), és a
0-vs-16 lelet a battériában reprodukálva áll.

### F144-03 — a modell témájából nem lett művelet (KUKA-288)

**A lelet, visszamérve karakterre:** `answer_kind: model_blocks`, `sources: ["invite.send"]` — és
**`actions: []`**. A modell jogszerűen megtalálta a meghívási tudást, a felhasználó mégsem kapott
hozzá műveletet; ugyanarra a funkcióra a magyar parafrázis MEGKAPTA a gombot.

**A javítás:** a felajánlás-képzés EGY nevezett feloldó (`offersFor`, AST-08), KÉT hívóval: a helyi
találat ÉS a modell IGAZOLT forrás-listája. **A határ változatlan:** a műveletet a FUNKCIÓ
deklarálja, a modell csak a funkciót VÁLASZTJA ki — azt is kizárólag a neki ÁTADOTT, igazolt
halmazból (AST-05) —, minden felajánlás az `acceptAction`-on megy át a MAI szerveroldali
jogosultsággal, a bemutató pedig az `allowedToursFor`-on. A modell így sem írhat route-ot,
művelet-azonosítót vagy ellenőrizetlen űrlapmezőt a kliensnek, és **a felajánlás ELŐKÉSZÍT, nem
ment.**

**Egy MÁSODIK, eddig néma hiba is javult itt:** a bemutató-felajánlás korábban nem ment át az
`allowedToursFor` kapun, tehát a segéd olyan bemutatót is felkínálhatott, amit a mai nézetben nem
lehet elindítani.

### A negyedik, SAJÁT lelet — a joghiányra hallgatás jött (KUKA-289 · AST-09)

A SPEC által kért joghiány-eset próbáját írva mértem: a cégbe meghívott, **NEM admin** tag a
„Hogyan hívok meg valakit?" kérdésre SEMMIT nem kapott (`ok: false`, nulla hosszú válasz).
Mostantól a kiválasztó a KIZÁRT, de illeszkedő funkciókat is megnevezi a kizárás OKÁVAL
(`blocked`), és ha nincs kiadható tudás-válasz, a szerver AZ OKOT adja vissza — saját
válasz-fajtával (`answer_kind: 'access'`), a nyelvcsomag `REASON` csoportjából (nincs új kulcs,
nincs beégetett felirat). A kimondható okok listája **ZÁRT** (`BLOCK_REASONS_TOLD`): csak olyan ok
kerül bele, amit a tudás-index végpontja ugyanennek a kérőnek amúgy is megmond — a chat nem fed fel
újat.

**És a próba először HAMIS OKBÓL volt zöld:** a meghívott a személyes terében maradt, ahol admin.
Javítva: a próba a levélből olvassa a meghívó-jegyet, beváltja, teret vált, és **ELAKADT
MÉRÉSKÉNT utasítja el magát**, ha a szerep nem `user` (KUKA-127).

---

## 4. A teljesség és a regresszió KÉT külön mérés — az önmagát növelő plafon kivezetve

A SPEC kikötése szó szerint: *„A teljesség legyen piros, amíg alkalmazható, tényleges hiány marad;
a végső cél nulla ilyen hiány."* Ezért az `OPEN_GAPS` / `OPEN_GAPS_CEILING` pár **megszűnt** —
abban az alakban egy ÚJ kivétel MAGA emelte a plafont, tehát az őr a saját tanúja volt.

- **TELJESSÉG (LT):** minden alkalmazható, tényleges hiány PIROS. Ma **20 hiány** → a
  `verify:lefedes` SZÁNDÉKOSAN PIROS. Ez nem „ismert kivétel", hanem a hátralévő munka kimondása.
- **REGRESSZIÓ (LR1 · LR2):** a `GAP_BASELINE` VÁLTOZATLAN, verziózott pillanatkép
  (`R144-indulo`, 2026-10-02, 20 kulcs) — a SPEC kérése szerint változatlan verzióhoz kötve és
  annak NEVEZVE. Nem plafon és nem engedély. ÚJ hiány piros; a MEGSZŰNT hiány is piros, hogy a
  javítás a pillanatképből kikerüljön.
- **A technikai műveletek listája 34 néma sorról 2 indokolt sorra szűkült.** Minden felhasználói
  művelet (keresés, sor-megnyitás, új chat) a SZÜLŐ funkció sorában kap lefedést, de nem tűnik el a
  vizsgálatból — pontosan ahogy a SPEC kérte.

**Mai állás:** `verify:lefedes` → **12 ZÖLD · 1 PIROS** (a teljesség, 20 hiánnyal).

---

## 5. A felelősségi határ — és ami ebből a körből HIÁNYZIK

**A határ (változatlan, az R142 §5 szerint):** a nyelv, a szinonima, az elírás, az utalás és a
szituáció értelmezése a KÜLSŐ modellé. A VS a jogosultság-szűrt adat, a jelölt-halmaz, a
típus/domain-szabály, az előnézet és a megerősített végrehajtás gazdája. **Új helyi üzleti
mondatértelmezőt nem építettünk** — és a `tokensOf` írás-független darabolása sem az: az nem
nyelvértés, hanem a kapu megnyitása.

**Amit a határ MA mérve teljesít (helyi csonkkal):** hat nevezett eset a `verify:app-findings-r144`
C szakaszában — HU parafrázis · nem latin írású kérdés · előzményes folytatás · rossz helyi találat
· joghiány · **meg nem engedett modell-azonosító** (a modell kitalált funkció-azonosítója
nevezetten elakad). Mindegyik a TÉMÁT **és** az elérhető MŰVELETET is ellenőrzi, nem csak azt, hogy
nem egy korábbi rossz téma az első.

**Ami NINCS meg: a diós kontextusos példák és ellenpárjaik.** A SPEC 4. tétele (Berénykert 1000 kg
beszerzés · Kis József 2 kg értékesítés · az előzmény alapján ellenkező termékjelölt ·
dióolaj/egység-ütközés · feldolgozás · többfordulós javítás HU/EN/DE + további nyelven) **ebben a
körben nem épült meg.** Nem is állítom másnak: ez a következő csomag első dolga.

---

## 6. Friss vs örökölt · helyi vs élő

| bizonyíték | mikor | mi adta | mire ÉRVÉNYES |
|---|---|---|---|
| `verify:app-findings-r144` **30/30** | **friss** (ma, a záró fejen) | helyi HTTP + helyi szolgáltatói csonk | a SAJÁT szerződésünk: kapu, felajánlás, jog-válasz, oldaltérkép, kötés |
| `verify:lefedes` **12 zöld / 1 piros** | **friss** | a TÉNYLEGES alkalmazás forrása | a lefedés népessége és hiánya |
| `verify:kuka` **600/600** | **friss** | kód-minták | a tanulságok gépi jele, visszacsúszásra piros |
| `app:selfcheck` **57/57** | **friss** | helyi HTTP | a próba-alkalmazás határa |
| `proof:demo-walk` **66 zöld / 0 piros** | **friss** (a tudás-csomag újragenerálása UTÁN) | Playwright + Chromium, `demo-adapter` csonk | a két 18 lépéses történet 1280 és ~390 px-en, ugyanabban a lapban reset után ismételve |
| `verify:app-findings-r142` **23/23** · `verify:assistant` 55/55 · `verify:tutor` 92/92 · `verify:i18n` 49/49 · `verify:doc-html` 9/9 · `verify:artifact-naming` 28/28 | **friss** | helyi | az előző körök szerződései nem csúsztak el |
| **élő modell-válasz** | **NINCS** | — | semmire: nincs engedélyezett szolgáltató (0 élő hívás) |

**Söprés:** a SPEC kimondta, hogy *„Teljes külső láncot, 34 ellenőrzős újabb söprést vagy
timeout-kutatást ne indíts"* — ezért **célzott visszaellenőrzés futott**, a fenti tételekkel, nem
teljes `verify:sweep`. Ez tehát **nem** „zöld teljes söprés": amit nem futtattunk, azt nem
igazoltuk.

---

## 7. Hiányzó képességek és NEVESÍTETT függők — a SPEC hat tétele soronként

| # | a SPEC kérése | állapot |
|---|---|---|
| 1 | a javított leltár alapján a hiányok pótlása | **RÉSZBEN.** Végpont 5→0, művelet 7→0, űrlap 1→0 — deklarált kötéssel, nem dokumentálással. **A 10 oldal és a 10 bemutató-hiány MEGVAN** (három nyelvű tartalom kell hozzá). |
| 2 | korlátos modell → engedélyezett olvasó eszköz → kontextusos javaslat/előnézet | **NEM ÉPÜLT MEG.** A kapu megnyitása és a capability-index az R142-ben megvolt — a SPEC kimondta, hogy ez önmagában nem ez a tétel, és egyetértek. |
| 3 | a V2 D-VS-038/063 és draft/preview tanulságok konkrét implementációhoz kötve | **NEM.** V2-t nem módosítottunk; szintetikus V2-bizonyítékot élő integrációnak nem neveztünk. |
| 4 | diós kontextusos példák és ellenpárjaik | **NEM ÉPÜLT MEG** (5. szakasz). |
| 5 | valódi többfordulós chat, normális magyarázat + strukturált javaslat | **NEM.** A `VS_AI_GROUNDED_PROSE` kapcsoló ALAPBÓL KI marad: bekapcsolva az R93 (b) állítás azonnal pirosra vált (a helyes jelölőkkel ellátott, de tartalmilag HAMIS mondat visszakerül a képernyőre — KUKA-235). **A régi, kizárólagos blokk-formátumot őrző próbát nem lazítottuk és nem töröltük** — mindkét állás mérve van. |
| 6 | fiókváltás / jogvesztés / új chat / törlés / késői válasz ne keverjen adatot vagy előnézetet; az ár-jog nélküli felhasználó adata a providernek küldött kontextusban is szűrt | **NEM MÉRVE ebben a körben.** A böngészős tanú (E2)/(E3) állítása a FELÜLETEN mutatja, hogy az ár-jog nélküli néző nevezett hiányt kap üres mező helyett — de a provider-kontextus szűrése KÜLÖN mérés, és nem futott. |

**Hiányzó szolgáltatói képesség, nevesítve:** `VS_AI_PROVIDER` · `VS_AI_API_KEY` (az
openai-kompatibilis úthoz `VS_AI_BASE_URL`). **Élő hívás ebben a körben: 0.** A stub nem bizonyít
természetes nyelvértést. Ez külső beállítás, nem hiányzó kód — és nem akadálya a helyi
implementációnak, a tartalom-pótlásnak vagy a szintetikus szerződés-próbának.

---

## 8. Forrás, mért és záró SHA · fogyasztás · és egy NEM TELJESÜLT kikötés

- **induló fej:** `3fb0f6ab982dbea953deafe088a90e62a181428a` (a SPEC által ellenőrzött fej)
- **záró fej:** `a95ce76e6b2999e0c5ea14045590097160e26505` (ág: `claude/eager-wright-3hwupf`)
- **döntés:** `D-VS-3099` · **tanulságok:** `KUKA-286` · `287` · `288` · `289`
- **fogyasztás** (`npm run meres:fogyasztas`, FGY-01): ablak 2026-10-02T00:00:00Z → 21:39Z ·
  **374 hívás** · fő-szál kontextus **medián 448 921 / max 782 016** · 400 ezer fölött **209 hívás**
  · ügynök-bemenet **0 (0 ügynök)** · lefedettség: **teljes** · gépi alak:
  `docs/70_PLANNING/V3_R144_FOGYASZTAS_LELTAR.json`.
  **A mérő kimondja a sávot: CHATVÁLTÁSI JELZŐ ELÉRVE** — a futó munkablokk célzott ellenőrzéssel
  lezárható, a KÖVETKEZŐ önálló nagy blokk friss beszélgetésben induljon. Ez a 7. szakasz 2. · 4. ·
  5. · 6. tételének a kimondott oka: a lezárás címén nincs új feltárás és nincs új funkció.
- **Egy fő végrehajtó, automatikus al-ügynök nélkül** — a mérés ezt igazolja: ügynök-bemenet 0.

**ÉS A KIKÖTÉS, AMI NEM TELJESÜLT — kimondva.** A SPEC azt kérte, hogy FRISS Claude-v3
beszélgetésben folytassam, és *„az induló mérés igazolja az új munkamenetet"*. A mérő a futó
folyamat saját azonosítóját látja (`CLAUDE_CODE_SESSION_ID`), és az **AZONOS az R143-ban mérttel**
(`33dbd005-d110-5a1d-9f36-0bc5773d2e23` — mindkét fogyasztás-leltárban ugyanez a `session` mező).
A leltár ezen felül **1 tömörítéses ébresztést** rögzít, és a `CLAUDE.md` R114-es szabálya szerint
**a tömörítéssel folytatott beszélgetés NEM friss beszélgetés**. Tehát: ez a csomag a MÉRÉS
SZERINT nem új munkamenetben készült, és ezt nem állítom másnak. A 7. szakasz négy nyitott tételét
a következő, bizonyíthatóan friss beszélgetés viszi.

---

## 9. Mit futtasson, aki ezt ellenőrzi

```
npm run verify:lefedes              # 12 zöld · 1 PIROS (a teljesség — ez a helyes állapot ma)
npm run verify:app-findings-r144    # 30/30 — F144-01..03 + a joghiány-eset, ellenpárokkal
npm run verify:app-findings-r142    # 23/23 — az előző kör szerződései
npm run verify:kuka                 # 600/600 — a tanulságok gépi jele
npm run app:selfcheck               # 57/57
npm run proof:demo-walk             # 66 zöld / 0 piros (böngésző kell hozzá)
npm run kapcsolat:ai                # a szolgáltatói hiány NEVEI (érték nélkül)
```
