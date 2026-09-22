# R75 — A három lelet javítva, és az első core-folyamat kipróbálható átadása

> **Kör:** CMD-VS-300-002-002 R75 · **Sáv:** Claude-v3 · **Állapot:** lezárt
> **Repó:** `valach-family/valach-system` · **Ág:** `claude/affectionate-dijkstra-76w5e8`
> **Forrás-commit (kód):** `6a7bfc2` — az R75 ANALYSIS által vizsgált fejre (`f8828ba`) építve
> **Parancs:** a külső ellenőrző fél (chatgpt-v3) **R75 ANALYSIS** lapja · **Döntés:** D-VS-3069

---

## Röviden, magyarul — mi lett most kipróbálható

**Egy ember végig tud menni az egész láncon, és sehol nem ér zsákutcába.** Anna regisztrál, megerősíti a
címét — és ettől **magától megszületik a saját, személyes köre**: nem kell „céget" alapítania ahhoz, hogy
legyen hova belépnie. Ha a megerősítő levél lejárt, **a lap megmondja, mi a következő lépés, és ad is rá
gombot**: új hivatkozást kér, a jelszava nem változik, új fiókot sem kell csinálnia. Elindítja a családi
vállalkozás körét (az adószám **önbevallott állítás**, és a képernyő ezt ki is mondja), meghívja Bélát,
majd **külön lépésben** megadja neki az olvasási jogot — mert a meghívás önmagában nem ad adatot. Béla a
saját fiókjával vált a személyes és a céges nézet között, és amikor Anna megvonja a tagságát, azt az új
kérésén azonnal látja — **a saját személyes köre viszont megmarad**.

**Három konkrét hibát javítottunk, mindhármat a külső ellenőrző fél találta meg** (chatgpt-v3, valódi
méréssel): a lejárt megerősítés zsákutcáját, a cégváltáskori „régi válasz az új képernyőn" rést, és azt,
hogy a bejáraton egy **hibás típusú kérésből adat lett** (egy munkakörnyezet neve `[object Object]` lett).
Mindhárom javításhoz **piros/zöld próba** tartozik — és mindegyik mellé odatettük a pozitív ellenpárt is,
hogy ne úgy „védjünk", hogy közben a jó eset is elakad.

**Amit ez NEM jelent.** Ez továbbra sem üzemi rendszer: nincs valódi levélküldés, nincs adatbázis-szerver,
nincs nyilvános cím. A core-core teljes lezárása **nincs elfogadva** — azt a külső ellenőrző fél mondja ki,
nem mi.

---

## 1. A kör kerete — mit mértem SAJÁT futással, és mit vettem át

| | |
|---|---|
| **Saját mérés (ebben a körben futott)** | `verify:app-findings` **73/73** (az R75 leletei, célzott piros/zöld) · `verify:app-selfcheck` **57/57** (HTTP-szint) · `proof:core-ux` **30/30** (Playwright + Chromium, valódi böngésző) · `v3ref:run` **62/62** (magpróbák) · `verify:kuka` **338/338** · `verify:decision-numbers` 4/4 · a teljes söprés (lásd 9. szakasz) |
| **Átvett állítás (NEM ebben a körben mérve)** | az R64 történeti külsőteszt-összesítője · a korábbi körök mutációs futásai · a külső fél saját futásai (az ő ANALYSIS lapjának számai) |
| **Amit a külső fél mért, és én reprodukáltam** | F75-01 (valódi HTTP, támogatott órával) · F75-02 (valódi böngésző, késleltetett válaszokkal) · F75-03 (valódi HTTP, az eredeti kéréssel) |
| **Környezet** | node v22.22.2 · node:sqlite · Chromium (Playwright 1.56) · elkülönített, eldobható tároló — hálózat és kulcs nélkül |

**Kimondva:** az R64 „27/27 böngészőeredmény" sorát nem vettem át zöldként — a böngésző-csomag ebben a
körben ÚJRA futott (mostantól **30** próba), és a helyzet-lap is újra készült.

---

## 2. F75-01 — a lejárt megerősítésnek VAN folytatása (CHR-01)

**Mi volt.** A megerősítő hivatkozás 24 óráig élt; lejárás után a lap azt írta: *„A hivatkozás lejárt —
regisztrálj újra."* Az újraregisztráció viszont (helyesen) semleges választ ad, mert a cím foglalt: **új
levél nem ment ki**. A felhasználó be tudott lépni, de a csatornája bizonyítatlan maradt, tehát
munkakörnyezetet sem indíthatott (`creator_channel_unproven`). A felirat által ígért út **nem létezett**.

**Mi lett.**
- **Újrakérhető megerősítés:** `POST /api/verification/resend` + a bejelentkező képernyőn űrlap; a
  megerősítő lap MINDEN nemleges ága folytatást kínál (`verify-resend-link`).
- **A válasz minden ágon semleges** (ismeretlen cím · már bizonyított cím · korlátba ütközött kérés —
  bájtra ugyanaz a JSON), a **jelszóhoz egyetlen ág sem nyúl**.
- **Egy címre egy élő hivatkozás:** az új hivatkozás a korábbi ÉLŐT **leváltja** (`superseded_at` +
  `superseded_by` — saját tény, nem a „használt"/„lejárt" oszlop átírása); a **lejárt** és a **beváltott**
  hivatkozás SOHA nem éled újra (külön nevezett válasz: `challenge_expired` · `challenge_already_used` ·
  `challenge_superseded`).
- **Az ismétlés korlátos, címenként:** legalább 60 mp két levél között, ablakonként legfeljebb 5
  (`CHALLENGE_POLICY`) — ez egyben az első címzett-védő korlát a rendszerben (A17 részéhez).

**Bizonyíték (mind ebben a körben futott):** `verify:app-findings` F75-01 (a)–(k): lejárat támogatott
órával · a lap folytatást ad és a régi mondat nincs benne · új levél · a lejárt nem éled · az új működik ·
a beváltott másodszorra elakad · az eredeti jelszó működik · a munkakörnyezet MOST elindítható · leváltás ·
ismétlés-korlát mérve · anti-enumeráció két ágon. Böngésző: `tests/e2e/v3app-r75.spec.mjs` — a felhasználó
útján végigkattintva. **Tanulság:** KUKA-201.

---

## 3. F75-02 — a kontextusváltás védelme teljes (KTX-01)

**Mi volt.** A generáció-számlálót CSAK a munkakörnyezet-váltó léptette, és CSAK az adat-gombok nézték.
Ezért (1) a visszatartott **taglista**-válasz a RÉGI cég tagját írta az ÚJ nézetbe, (2) a kilépés után
beérkező adat-válasz a kiürített panelbe íródott vissza, (3) a `/me` semmit nem ellenőrzött — a **másik
lapon** (közös munkameneten) történt váltásról a lap nem tudott, és (4) a **szerver** nem tudta, melyik
képernyőn született a gomb.

**Mi lett — három réteg, és mind a három kell:**
1. **Generáció:** minden kontextus-váltó esemény lépteti (belépés · kilépés · váltás · létrehozás ·
   beváltás); minden kérés a saját generációjával tér vissza, az elavult választ a lap eldobja.
2. **A szerver igazsága:** a `/me` minden válaszánál a lap összeveti az alanyt és a könyvet azzal, amit
   hitt — eltérésnél kontextus-váltás (léptet + ürít). Ez fogja meg a **második lapot**.
3. **A szerver megerősítése (a döntő réteg):** minden állapotváltoztató kérés viszi a könyvet, amiben a
   gomb született (`expected_book_id`), és a szerver eltérésnél **409 `context_mismatch`**-t ad, **írás
   nélkül**. A mező **megerősítés, nem felhatalmazás**: könyvet SOHA nem választ (a hatóság a munkameneté),
   csak szűkít — ugyanaz a minta, mint a sémaverziónál (SVR-01).

**Bizonyíték:** böngésző-próba valódi versenyben (`v3app-r75.spec.mjs`): visszatartott taglista → a régi
cég tagja **sehol**, miközben az új cég tagja megjelenik (pozitív ellenpár) · **második lap** vált, a régi
képernyő megvonás-gombja 409-et kap, és az adatbázisban **nem született megvonás-esemény** · késve érkező
adat-válasz a váltás után nem rajzolódik vissza · kilépés után sem. HTTP-szinten: `verify:app-findings`
F75-02 (a)–(d), köztük „a megerősítő mező nem ad hatóságot" és „a mező elhagyható (visszafelé
kompatibilis)". **Tanulság:** KUKA-202.

**Amit KIMONDOTTAN nem állítunk** (a külső fél kikötése): a kilépés után rejtett DOM-ban maradó szöveg
önmagában **nem** látható adatkiadás és nem szerveroldali jogosultság-megkerülés. Amit mérünk: a panel
üres marad, tehát nincs mit visszaírni.

---

## 4. F75-03 — a bemeneti séma a KÜLSŐ határon (HTP-01, az OB-3 / L7 zárása)

**Mi volt.** A héj kézzel olvasta a törzs-mezőket (`String(body.name ?? '')`). Az eredeti lelet:

```
POST /api/workspaces  {"name":{"invalid":true},"plan":"starter"}
→ HTTP 201 · name = "[object Object]" · munkakörnyezetek: 0 → 1
```

**Mi lett.** `v3app/httpSchema.mjs` (HTP-01): **végpontonként SAJÁT séma**, a **KÖZÖS** BEM-01 motoron
(`validateAgainstSchema`) — nem a `stock.receipt` üzleti sémájára húzva, és nem a motor második másolatával.

| | állapotváltoztató végpont | olvasó végpont |
|---|---|---|
| ismeretlen mező | **elutasítás** (`unknown_field`, 400) | nevezett figyelmen kívül (`param_ignored`) |
| rossz típus · hiányzó kötelező | **elutasítás** (`invalid_type` · `missing_field`) | — |
| zárt készleten kívüli érték | **elutasítás** (`invalid_value`, a választhatók felsorolásával) | — |
| nem támogatott sémaverzió | **elutasítás** (`unsupported_schema_version`) | — |
| írás az elutasított kérésből | **nincs** (mérve) | — |

**A két szerződés határát a regiszter mondja ki** (`mutates` mező), nem a végpont kódja — így nem maradt
két ellentétes külső szerződés. **A változást átvezettük a próbákba és a szövegekbe:** a `param_ignored`
ígérete az állapotváltoztató végpontokról eltűnt (selfcheck, e2e H06/H08/H10/H11, útmutató-szöveg).

**Mérve az elutasítás írás-mentessége:** öt hibás kérés után (rossz típus · zárt készleten kívüli szerep ·
ismeretlen adatkör · rossz típusú könyv-azonosító · hiányzó jelszó) a könyv · tagság · tagságadás · alap ·
meghívó · parancs · adatköri jog · alany · kihívás **soronként azonos** maradt; a megengedett technikai
munkamenet-kezelés külön mérve (a süti sem változott).

**A többi kikötés is mérve:** örökölt tulajdonság-név nem ad sémát (`toString` · `constructor` ·
`__proto__`, és nem-szöveg név sem) · a `__proto__` mező nevezett elutasítás, az `Object.prototype`
érintetlen · beágyazott objektum típusa ÉS mezői (pontos hely-megnevezéssel: `business.tax_id`) · a
sémaverziót a REGISZTER választja, a beadó legfeljebb megerősít · **pozitív ellenpár**: a jó kérés
változatlanul működik, és a DEKLARÁLT alapértelmezést a válasz felsorolja (`defaults_applied`).

**Egy kimondott kivétel:** a `GET /api/verify` ír (beváltja a kihívást), de **nem kapuzó** — ez levélből
megnyitott hivatkozás, és egy idegen paraméter miatt a megerősítés nem futhat zsákutcába (pont az, amit az
F75-01 javít). Az írást ott a kihívás saját szerződése védi (egyszeri · lejáró · leváltható).

**Tanulság:** KUKA-203.

---

## 5. Az R64 közvetlenül kapcsolódó maradékai

**L7 — LEZÁRVA** (a saját feltétele szerint: „próba idegen mezővel a HTTP-határon: nevezett elutasítás").
Lásd a 4. szakaszt.

**L11 — LEZÁRVA (SZK-01).** A csatorna bizonyításakor **magától születik a személyes kör**: ugyanazzal a
`createWorkspace`-szel, ugyanazzal az indulási szabállyal (WSP-01) és ugyanazzal a tagsággal, mint bármely
más kör — **nem új jogosultsági motor**. Alanyonként legfeljebb egy, és ezt a **kulcs tartja**
(`personal_space` tábla: PRIMARY KEY + UNIQUE), nem egy alkalmazás-oldali ellenőrzés. A váltóban nevesítve
áll („személyes kör" / „közös munkakörnyezet"), a fejléc pedig kimondja, **ki nevében jár el**. A
vállalkozási minőség **nem új személyazonosság**: az adószámos kör KÜLÖN könyv, a személyes érintetlen, az
alany ugyanaz — és a céges meghívó elfogadása után is megmarad (mérve Bélán). **Kimondott maradék:** a
személyes kör ugyanazokat a szintetikus minta-rekordokat kapja, mint bármely kör; valódi „saját iratok"
(dokumentum, feltöltés) nincsenek, és nem is ígérjük.

**L10 — LEZÁRVA.** Az A01–A18 tételes megfeleltetés elkészült:
`docs/70_PLANNING/V3_R75_A01_A18_MEGFELELTETES.json` — **18/18 sor**, soronként *mi működik ma · bizonyíték
· PONTOS maradék · mit blokkol*. Eredmény: **3 fedett · 11 részben · 4 nevezett hiány**. Az azonosítók a
FORRÁS-dokumentumból mérve jönnek, az összegzés a sorokból SZÁMOLT (gépi jel: `verify:app-findings` L10).
**Kimondva:** ez megfeleltetés, **nem futtatás** — egyetlen A-eset forgatókönyve sem lett végigjátszva
(ezt az R32 maga mondja ki). Részletek a 7. szakaszban.

**L2 — LEZÁRVA a saját feltétele szerint (REP-01).** Cserélhető képviseleti ellenőrzés: zárt
művelet-osztály-regiszter (`own_self_declared_work` ⇒ engedett · `represent_existing_legal_person` és
`take_over_existing_space` ⇒ zárt), **fail-closed** ismeretlen osztályra, és a nemleges válasz **kimondja,
hogy CSAK az adott műveletet zárja** — a regisztrációt, a saját kör indítását és a saját adatok kezelését
soha. A felületi állítás is pontos lett: *„Az adószám ÁLLÍTÁS, nem igazolás… más, már létező szervezet
nevében eljárni ebből NEM következik."* **Kimondott hiány:** **nulla** adapter és **nulla** megépített
művelet a két zárt osztályban. **Országadaptereket nem kértünk és nem építettünk** (L5 marad nyitva).

**L3 — DÖNTÉS MEGVAN.** A közös (kétszemélyes) jóváhagyás **választható szervezeti szabály** lesz, nem
kötelező teher a kétszemélyes családi cégnél. A megvalósításhoz saját jóváhagyási esemény és eltérő
jogosult jóváhagyók kellenek; amíg ez nincs meg, **a rendszer ilyen védelmet nem ígérhet** — és nem is
ígér: mérve **0 ilyen ígéret** a héj és a felület forrásában (`verify:app-findings` L3 · böngésző H10).
A teljes megvalósítás **nevesített üzemi hiány**, nem akadálya a mostani alapfolyamatnak.

**H10 — mi működik ténylegesen szervezeti egységként, és mi hiányzik.** *Működik:* könyvenként külön
tagság és szerep (a szerep nem összevont tulajdonság), könyvenként külön adatköri jog, delegálási alap,
aminek a plafonja **részhalmaza** a delegálóénak (adatbázison mérve), és a helyi admin **nem** kap
bírálói hatáskört (az indulási alapra hivatkozva sem). *Hiányzik:* valódi szervezeti hierarchia (nincs
egység-fa, nincs öröklődő jog, nincs könyvek fölötti szerep), nincs közös jóváhagyás (L3), és nincs
szervezeti egység mint önálló fogalom. **Két elkülönített munkakörnyezet NEM bizonyít nagyvállalati
hierarchiát** — ezt a helyzet-lap is így mondja.

**H06 / H09 — a lejárati ágak mostantól a böngészőből is mérve.** A héj **támogatott idővezérlést** kapott
(`POST /dev/clock`, eltolás oda-vissza), a fejlesztői felület kapcsolója mögött. Ezzel: a lejárt meghívóra
a lap nem kínál gombot, az erőltetett beváltás nevezetten elakad, tagság nem születik — és a **friss**
meghívó ugyanannak a címzettnek beváltható (pozitív ellenpár). **A három szint külön áll:** böngésző
(H06/H09 · `v3app-r75.spec.mjs`) · HTTP (`verify:app-findings`) · mag (`P-INVITE-window`,
`P-CORE-startup-and-delegation` (d)). **Kimondott határ:** az ALAP (`authority_basis.expires_at`) lejárata
a héjból továbbra sem hajtható meg — arra a mag-bizonyíték áll.

**A fejlesztői felület határa kimondva:** a levél-fogadó és az óra a `devSurface` kapcsoló mögött él;
kikapcsolva **nem létezik** (404 `unknown_endpoint`, nem „letiltva"). A szintetikus levél-fogadót
nyilvánosan kitenni továbbra sem szabad.

---

## 6. A 14 elfogadási helyzet friss, pontos állapota

Gépi alak (ebben a körben újra futtatva): `docs/70_PLANNING/V3_R75_ELFOGADAS_HELYZETEK.json` ·
parancs: `npm run proof:core-ux`.

| | R64 | **R75** |
|---|---|---|
| bizonyítva | 10 | **12** |
| részben | 2 (H06 · H09) | **0** |
| nem böngészőben | 2 (H13 · H14) | **2** (változatlan, a magban mérve) |

**Ami változott, és miért:** a H06 és a H09 „részben" minősítésének egyetlen oka a lejárati ág volt, amit a
héjból nem lehetett meghajtani. A fejlesztői órával ez megszűnt — a maradék kettő (H13 bírálati út · H14
két valódi kapcsolat versenye) **továbbra sem** böngésző-eset, és ezt a lap kimondja: `nem_bongeszoben`
**nem sikeres próba**, hanem mutató a mag-próbára (`P-CORE` (e), `P-ORG-adjudication-basis-limit`) és a
szerszámra (`npm run proof:multiconn`).

---

## 7. A01–A18 — a tételes megfeleltetés (L10)

| # | eset (rövidítve) | állapot | a PONTOS maradék |
|---|---|---|---|
| A01 | csoportos adóregisztráció, egyik kilép | részben | nincs „adójogi csoport" fogalom; a párhuzamos független állítás mérve |
| A02 | téves kötésből export, majd javítás | **nevezett hiány** | nincs export-fogalom (fájl, letöltés, külső példány) |
| A03 | könyvvezető szolgáltató megszűnik | részben | nincs őrzési/átadási profil; automatikus platform-admin nincs (mérve) |
| A04 | ugyanarra a címre szóló meghívó két világban | **fedett** | — |
| A05 | együttes képviselet, két jóváhagyó | **nevezett hiány** | közös jóváhagyás nincs (L3) |
| A06 | rögzített idejű aggregátumjog | **nevezett hiány** | nincs idő-/csatornaprofil, nincs következtetési határ |
| A07 | két bejelentő ugyanarról | részben | ismétlés-védelem és ütközés mérve; a két bejelentő EGYEZTETÉSE nincs |
| A08 | szabályverzió-váltás menet közben | részben | a megvonás utáni visszajátszás zárva; a verzió-váltás nincs modellezve |
| A09 | márciusi jelentés, júniusi javítás | **fedett** | a „régi beadott fájl" az A02 export-hiányához tartozik |
| A10 | link · cache · letöltött PDF | részben | cégváltás és gyorsítótár mérve; aláírt link és dokumentum nincs |
| A11 | kerekítés soronként vs. végösszegre | részben | profil és kanonikus alak megvan; kerekítési stratégia nincs (QNT) |
| A12 | azonosító-normalizálás, ß/ss | részben | a teljes négyes egyezés mérve; verziózott normalizáló és ütközésleltár nincs |
| A13 | modul fél év után visszatér | **nevezett hiány** | nincs modul-életciklus és nincs kimenő hatás |
| A14 | külső bizonyítékforrás kiesik | részben | a helyi jog-ellenőrzés mindig fut (mérve); külső forrás nincs bekötve |
| A15 | nyitóállomány + régi mozgás + import | részben | a két időtengely mérve; nyitó és import nincs |
| A16 | egy szervezet két szerepben | részben | könyvenkénti szerep és a hatáskör-korlát mérve; „jogi minősítés" mint tény nincs |
| A17 | tömeges meghívás egy célszemélyre | részben | nincs névfoglalás (mérve); **meghívó-kvóta nincs** — az első korlát a megerősítő levélre épült |
| A18 | idegen áru saját helyen | **fedett** | a fizikai leltározás MŰVELETE később (készlet-modul) |

---

## 8. Az egyetlen core-lezárási lista — mai alakja

**Élő alak:** `docs/70_PLANNING/V3_CORE_LEZARASI_LISTA.json` (az R64-es lap a maga körének jelentése marad
— a történetet nem írjuk át; a lista MAI állapota innentől ez a fájl, egy fogalom egy otthonban).

| sor | állapot | mi mozdult ebben a körben |
|---|---|---|
| L1 többírós határ (Postgres) | nyitott | — |
| **L2 képviselet** | **lezárva** | REP-01: nevezett, cserélhető ellenőrzés + próba; nulla adapter kimondva |
| **L3 közös jóváhagyás** | **döntés megvan** | választható szervezeti szabály; a rendszer nem ígéri (mérve) |
| L4 valódi levélküldés | nyitott | a fejlesztői felület határa kimondva (kapcsoló + 404) |
| L5 országadapterek | nyitott | az ismeretlen profil **nem** tiltja a saját munkát (a határ sémája szándékosan nem zárt készlet) |
| L6 QNT | nyitott | — |
| **L7 séma a HTTP-határon** | **lezárva** | HTP-01 |
| L8 megvonási klauzulák | nyitott | **szám helyesbítve:** 15 klauzula (10 hiány nélkül · 5 nevezett hiánnyal) — a „mind a 13" elavult volt |
| L9 kötelező bizonyíték-készlet | nyitott | a mutációs battéria a söprésben futott (9. szakasz) |
| **L10 A01–A18** | **lezárva** | 18/18 sor, számolt összegzéssel |
| **L11 személyes kör** | **lezárva** | SZK-01 |

**A „lezárt" NEM készültségi százalék:** minden sor a SAJÁT, korábban kimondott feltételére zárult, és
mindegyik viszi a kimondott maradékát. **A 16 elfogadott / 13 részleges klauzula sem készültségi
százalék** — a core-core teljes lezárása **továbbra sincs elfogadva**, és üzemi használat sem állítható
(L1 · L4 · L5 nyitott).

---

## 9. A bizonyíték-csomag — parancsok és számok

| parancs | mit mér | eredmény |
|---|---|---|
| `npm run verify:app-findings` | az R75 leletei célzott piros/zöld próbákkal + L8/L10 szám-őrök | **73/73 PASS** |
| `npm run verify:app-selfcheck` | a teljes folyamat a valódi HTTP-héjon, süti-tárcával | **57/57 PASS** |
| `npm run proof:core-ux` | a 14 helyzet + az R75 két felületi lelete valódi böngészőben | **30/30 PASS** |
| `npm run v3ref:run` | a mag próbái | **62/62 PASS** |
| `npm run verify:kuka` | a tanulság-regiszter, az archívum és az őr-otthon | **338/338 PASS** |
| `npm run verify:sweep` | MINDEN `verify:*` | lásd alább |

**A söprés eredménye:** `@@SWEEP@@`

**ÖRÖKÖLT PIROS, ami NEM ebben a körben keletkezett — mérve:** `verify:capability-witness`
**9/11** („2 ELAVULT RÖGZÍTÉS": `v3-ui-slice` és `v3-vertical-slice` mérve *present*, a board
képesség-regiszterében *absent*). **Bizonyíték, hogy örökölt:** ugyanez a verifier a kör KIINDULÓ fején
(`f8828ba`, külön munkafában, a VALÓDI V2-regiszterre mutatva) szintén **9/11** — tehát a rés az R63/R64
óta áll. **Nem javítottam**, mert a rögzítés a **V2 repóban** él
(`tools/chatops-board/config/matrix-capabilities.json`), és ez a parancs kimondottan tiltja a
V2-módosítást. Javaslat a következő körnek: a két sor átállítása `present`-re, a V2 sáv által.

**Kockázat alapján kiválasztva, ami NEM futott újra ebben a körben:** a teljes mutációs battéria
egységenkénti újrafuttatása a jogosultsági magon kívül, és a 19 külső program teljes sorozata — a söprés
ezeket a saját láncain viszi, az eredményét a fenti sor mondja meg. Ahol a lánc nem fejeződött be, ott a
verdikt **NEM zöld**, hanem „nem futott — nem igazolt" (SRU-01 · KUKA-200).

---

## 10. Kipróbálható átadás — a lánc, a képek, és a hozzáférés módja

**A lánc, amit végig lehet járni** (a felhasználó útján, nem végpontokon):
regisztráció → megerősítés (vagy: **lejárt hivatkozás → új kérése**) → **személyes kör magától** →
családi/céges kör indítása önbevallott adószámmal → Béla meghívása → Béla beváltja (adat még NINCS) →
az admin **külön** megadja az olvasási jogot → Béla készlet-nézete KIADVA, az ár NEM következik belőle →
megvonás → Béla új kérése elutasítva, **a személyes köre megmarad**.

**Képernyő-bizonyíték (13 kép, valódi futásból):** `npm run docs:kiprobalas-kepek` → önálló HTML a
`var/reports/` alatt, a képek beágyazva (se hálózat, se kulcs). Ez a lap megy az operátornak
artifact-hivatkozásként — a `.md` a gépé, a HTML az emberé (KUKA-079).

**Hozzáférés — pontosan, kerülés nélkül.** **Megosztható, nyilvános cím NINCS**, és ez szándékos: a lapon
látható fejlesztői levél-fogadó hitelesítés nélkül mutatja a kimenő leveleket, azt nyilvánosan kitenni nem
szabad. Új telepítés, Railway-módosítás és merge ebből a körből nem következik (a parancs tiltja). Az
R64-es útmutató „checkout main / pull main" sora **erre az ágra nem érvényes** — a munka az ágon áll, a
`main` az operátoré.

**EGYETLEN konkrét következő hozzáférési lépés — a döntés az operátoré:**
> **Ha ki akarja próbálni a saját gépén**, a következő körben odaadom a pontos, két soros indító parancsot
> erre az ágra (letöltés + indítás; hálózat és kulcs nélkül fut). **Ha inkább közös, kattintható címet**
> szeretne, az külön munka: belépéssel védett előnézet, a fejlesztői levél-fogadó nélkül — azt külön
> parancsra építem meg.

---

## 11. Amit ez a kör NEM csinált, és amit NEM állít

- **Nincs V2-módosítás, merge, telepítés, migráció, fizetős szolgáltatás, külső címzettnek levél és új
  üzleti mini-modul.** A `var/` alatti kimenetek eldobhatók, a repóba nem kerülnek.
- **A core-core teljes lezárása nincs elfogadva** — ezt a külső ellenőrző fél mondja ki.
- **Üzemi használat nem állítható** (L1 · L4 · L5 nyitott). A nagyvállalati skálát és az országos
  megfelelőséget néhány példa nem bizonyítja.
- **Az A-esetek forgatókönyve nem futott le** — a 7. szakasz megfeleltetés, nem futtatás.
- **Teszt-, bizonyíték- vagy utasítás-tömörítés nem törölt kötelező szabályt:** ahol a próba szövege
  változott (H01 · H02 · H05 · H06 · H08 · H10 · H11 és a magfolyam 4–5. lépése), ott a MAI valóságot
  mérjük, és a korábbi állítás mag-szintű bizonyítéka nevesítve maradt.

**Megőrzendő állítások (változatlanul érvényesek):** az R19 **QNT 24 követelmény / 36 eset** későbbi
csomag, a core-alapjai (mennyiség-profil · kanonikus alak · tárolt profil-történet) nem tűnhetnek el ·
**ismeretlen mennyiségű tétel létezhet és feldolgozható**, a becslés utólag **nem válik méréssé**, a
pontosítás **nem készletmozgás** · a történeti fogyasztás ismeretlen helyén **`null`, nem nulla** ·
**V2-re átadható ár/érték-javulást mérés nélkül nem állítunk**.

---

## 12. Fogyasztás — egy rövid, tartalommentes sor

`npm run meres:fogyasztas -- --session auto --from <a parancs időbélyege> --quick`:
**178 hívás · fő-szál kontextus medián 333 999,5 / max 568 051 · ügynök-bemenet 0 (0 ügynök) ·
cache-olvasás 59 826 428 · lefedettség: teljes.**

**A jelző átlépve** (`main_context_median > 200 000`) — **indoklás, nem mentegetés:** ez EGY összefüggő
munkacsomag EGY munkamenetben (a munkarend ezt írja elő), **nulla al-ügynökkel** (a parancs kimondta: nincs
szükség helyzetenként külön ügynökre), és a csomag mérete miatt a fő szál egyszerre viszi a magot, a héjt,
a próbákat és a lapokat. **Amit a következő csomagban szűkítek:** a lapokból célzott szakasz-olvasás
(`sed -n`), a hosszú futások kimenete fájlba, és a próba-battériák eredményéből csak az összesítő +
a bukott sor. Új nyomozás ebből nem indult.

---

## 13. Döntés, tanulságok, gépi jelek

- **Döntés:** **D-VS-3069** (`DECISION_LOG.md`).
- **Új tanulságok:** **KUKA-201** (a lejárat is út, nem végállomás) · **KUKA-202** (a verseny elleni őrt ott
  kell állítani, ahol a kár keletkezik) · **KUKA-203** (a külső határon a típus kérdés, nem formázás) —
  mindhárom a **külső ellenőrző fél** lelete, a regiszterben, az archívumban és az őr-otthonban.
- **Új gépi jelek (a söprés része):** `verify:app-findings` · `verify:app-selfcheck`.
- **Új szerződések:** CHR-01 (megerősítés újrakérése) · KTX-01 (kontextus-megerősítés) · HTP-01 (séma a
  határon) · SZK-01 (személyes kör) · REP-01 (képviseleti ellenőrzés).
- **Board:** ez a lap a Dokumentumok fülön, R75 kör, a `CMD-VS-300-002-002` alatt.
