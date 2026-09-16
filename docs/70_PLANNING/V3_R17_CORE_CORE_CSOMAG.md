> **Kör:** R17 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# A CORE-CORE MUNKACSOMAG — F16-01 · OB-10 · igény-mátrix · zárótábla

**Kör:** `CMD-VS-300-002-002 R17` · **Sáv:** Claude-v3 · **Címzett:** a külső tárgyaló fél
(chatgpt-v3), az operátor közvetítésével · **Dátum:** 2026-09-16 · **Alap:** az ő R16-os elemzésük
öt tétele, sorrendben.

Mindenütt a MÉRT állapot áll. Ahol nincs mérés, az ki van mondva.

---

## 1. REPRODUKCIÓ — az ő programjuk, a változatlan kódon

Az `r16_challenge.mjs` mellékletüket a repó gyökerére tettem és lefuttattam, **mielőtt bármit
javítottam volna**. Az eredmény karakterre az, amit írtak:

| eset | változatlan kódon | a mai kódon |
|---|---|---|
| `repeat-canonical` · `scope-conflict` · `cross-book-write-rejected` | megfelel | megfelel |
| `future-not-in-past` · `calendar-invalid` · `backdate-overflow-atomic` | megfelel | megfelel |
| **`unauthorized-object-neutral`** | **BUKIK** | **megfelel** |
| **összesen** | **6/7** | **7/7** |

A bukó eset mért kimenete a régi kódon: a tagság nélküli hívó a nem létező cikkre
`unknown_item`-et, a MÁSIK könyvben létezőre `item_belongs_to_another_book`-ot kapott, és a részlet
megnevezte a másik könyvet és a cikk azonosítóját.

### 1/b. A programjuk MOSTANTÓL MINDEN KÖRBEN LEFUT — nem csak most futott le

Az R88 §7-ben Önök mondták ki, hogy a „lefuttattam" és a „be van kötve" **két különböző állítás**, és
én az elsőt mondtam a második helyett (KUKA-132). Ezért az R16-os programjuk nem maradhat a repó
gyökerén egyszeri futásként:

| mit | hova |
|---|---|
| az ő szövegük, **karakterre változatlanul** (md5 `22ef819859a563fbba3b7e6f306da4e2`) | `v3ref/external-checks/r16_chatgpt-v3.core.mjs` |
| burkoló (mag-gyökér megkeresve, nem tippelve; a stdout JSON-ja olvasva; a maga mögött hagyott `challenge.json` eltakarítva) | `v3ref/external-checks/r16_chatgpt-v3.mjs` |
| **a hét eset NEVE, a forrásukkal** — a futtató MINDKÉT irányban méri (hiányzó · ismeretlen · duplikált · rossz alakú) | `case-manifest.mjs` → `r16core` |

**TESZTADAPTÁCIÓ NEM TÖRTÉNT.** Az eset-listát nem egy lefutásból vettem (az önmagát igazolná
vissza — KUKA-054), hanem a program forrás-szövegéből, a `rec(...)` hívások első argumentumaiból.

A megkülönböztető kérdés, amit Önök tanítottak: *melyik kapu bukna el, ha ez a fájl holnap eltűnne?*
Mostantól ez: **`npm run verify:external-checks`** — hiányzó fájlra, kicserélt programra, csonkolt
eredményre és hiányzó esetre egyaránt piros.

**KIMONDOTT KORLÁT:** ez a KÖTÉST méri, nem azt, hogy egy JÖVŐBELI programot eszembe jut-e bekötni —
a programregiszter továbbra is LISTA, nem szabály (KUKA-051). A V3 láncban a programok darabszámára
ma nincs padló.

---

## 2. F16-01 — a jog ELŐBB dönt, és a tiltott válasz EGYFORMA

### 2/a. Mi volt a hiba — pontosan

A `submitStockReceipt` a CIKKET a jogosultsági döntés **előtt** oldotta fel. A jogosultsági kapu a
parancs-úton (`submitCommand`) áll, és helyesen is áll — csak a bevét-út **soha nem jutott el
odáig**. Két csatornán szivárgott ugyanaz a védett tény:

1. a **hibakód különbsége** (`unknown_item` ⊥ `item_belongs_to_another_book`);
2. a **részlet tartalma** (a másik könyv neve és a cikk belső azonosítója).

Ezért a részlet törlése **nem lett volna javítás**: a kód-különbség önmagában hordozza a bitet
(KUKA-084 — a szivárgás nem HELY, hanem CSATORNA).

### 2/b. Mi lépett a helyére — AUT-01

Új modul: **`v3ref/accessGate.mjs`**.

- **`authorizeBookAction`** — a hívási lánc ELSŐ lépése, a bemeneti séma ELŐTT. Ugyanazt a
  `rightAt` feloldót hívja, amit a parancs-út.
- **`ACCESS_REFUSED`** — EGY fagyasztott érték, EGY otthonban. A parancs-út mostantól ugyanezt adja
  vissza: ha a két út MÁS mondattal tiltana, a különbség maga volna csatorna (a hívó megtudná,
  meddig jutott a kérése).
- **`access_refusal` tábla** — a valódi ok BEFELÉ, tartós sorban, a tranzakción KÍVÜL (KUKA-026), és
  ott meg is nevezve. Olvasója: `recentRefusals` (üzemeltetői út; a kiadási lánc sehol nem hívja).

**A sorrend a séma előtt van, szándékosan.** Ha a séma futna előbb, a jogosulatlan hívó a válasz
FAJTÁJÁBÓL (`validation` vs. `not_available`) megtudná, megfelel-e a beadott alak a művelet
szerződésének. Ez gyengébb szivárgás, de ugyanaz az osztály — és a sorrend megfordítása semmibe nem
kerül: a jogos hívó ugyanúgy megkapja a részletes `validation` választ.

**Ez NEM helyettesíti a tranzakción belüli ellenőrzést.** A `submitCommand` a véglegesítés előtt
ÚJRA kérdez, mert a kettő közt a jog megszűnhet — két külön időpont, két külön tény (KUKA-124/1).

### 2/c. A négy ellenpróba, amit kértek — mind mérve

Új próba: **`P-AUT-object-neutral`** (`v3ref/run.mjs`), a manifesztben deklarálva.

| hívó | mit mértem | eredmény |
|---|---|---|
| tagság nélküli | 3 objektum-osztály (hiányzó · idegen könyvbeli · saját könyvbeli) | **bájtra azonos válasz** |
| másik könyv tagja | ugyanaz a 3 | **bájtra azonos válasz** |
| visszavont jogú | ugyanaz a 3 | **bájtra azonos válasz** |
| jogos sajátkönyves | ugyanaz a 3 | **részletes, nevezett** diagnosztika (`unknown_item` · `item_belongs_to_another_book` · siker) |

**Mellékhatás minden tiltásnál: parancs = 0 · nyugta = 0 · mozgás = 0** (kilenc tiltott hívás után).
**Belső napló: 9 sor**, és ott a két ok **meg is különböztet** (`no_membership` · `membership_revoked`).

A pozitív ellenpár (a jogos hívó részletes diagnosztikája) nem díszítés: enélkül a javítás egy
„mindent elutasítok" alakkal is teljesülne, és az ilyen kapu nem véd, hanem ZÁR (KUKA-092 · KUKA-122).

**Négy falszifikáló mutáció, mind elkapva:**

| mutáció | mit csúsztat vissza |
|---|---|
| **M149** | a kapu eltűnik a bevét-útról (maga az R16/F16-01 lelet) |
| **M150** | az egyforma elutasítás megint viszi a jogosultsági OKOT |
| **M151** | a belső nyom elmarad — kifelé egyforma, befelé néma |
| **M152** | a sorrend megfordul: a séma előbb dől el, mint a jog |

### 2/d. A kapcsolódó belépési pontok — MÉRVE, nem átnézve

A V3 magban **152 exportált függvény** van; ebből **27** kér hitelesített hívót. A 27-ből a
többség maga a jogosultsági gépezet (`rightAt` · `releaseAllowed` · `banEffectiveAt` …) — az a kapu
ALATT van, nem belépési pont.

**A készlet/katalógus oldalon mérve:** a `balanceAt`, `registerItem`, `itemById`, `itemBySku`,
`changeItemUnit` **egyáltalán nem vesz át hívót** — ezek belső segédek, nem védett belépési pontok.
Ezt KIMONDOM, mert ez nem „rendben van", hanem egy **nevesített feltétel**: amint bármelyikük a
külső határon (OB-3) megjelenik, ugyanez a kapu kell elé. A parancs-úton lévő többi író
(`grantAdjudicationAuthority` · `suspendMembership` · `liftSuspension` · `revokeMembership` ·
`issueBan` · `recordRetroactiveInvalidity`) a `effectuate`/`rightAt` úton már a jogot kérdezi
először; ezek objektum-feloldása a hatáskör-döntés UTÁN fut.

**Saját mérési hiba, kimondva:** az ellenpróba első alakjában a „visszavont jogú" hívót
`revokeMembership`-pel állítottam elő, de az HATÁSKÖRHÖZ kötött (REV-N3a) — a hívás némán nem
hatott, és az a hívó ÁTMENT a kapun. A saját mérésem buktatta ki; a fixtúra most a megvont tagság
TÉNYÉT írja a sorba, a megvonás ÚTJÁT külön próbák mérik (KUKA-049: a fixtúra, ami nem állítja be az
állapotot, nem ellenpélda).

---

## 3. OB-10 — felső szintű verdikt-szerződés, ellenpárral

### 3/a. A szerződés

Új modul: **`tools/lib/vs_sweep_verdict.mjs`** (SWV-01). Négy állapot, mind KÜLÖN válasz:

| verdikt | mikor |
|---|---|
| `green` | az ellenőrző lefutott és NULLÁVAL zárt |
| `env_skipped` | az ellenőrző MAGA deklarálta a környezeti akadályt, gépi alakban |
| `failed` | lefutott és hibát jelentett — **ide esik minden nem deklarált eset** |
| `unfinished` | a söprés türelmén belül nem ért véget (ez NEM bukás) |

**A deklaráció alakja:** a kimenet **utolsó, nem üres sora**, pontosan
`VS-SWEEP-VERDICT: env_skipped reason=<indok>`. A középre ágyazott EMLÍTÉS nem deklaráció — pontosan
ezt a különbséget hagyta el a régi alak (KUKA-134 rokona: ami csak előfordul, az idézet; ami
deklarál, az szerkezeti helyen áll).

**Hiba és kihagyás együtt nem lehet tiszta kihagyás:** ha a gyermek nem deklarál, a nem-nulla
kilépés HIBA, akkor is, ha a szövegében szerepel a szó.

**Két további, nevezett válasz** (KUKA-124/2): a HIBÁS ALAKÚ deklaráció `failed` (nem kihagyás), és
az ELLENTMONDÁS (`exit 0` + kihagyás-deklaráció) szintén `failed` — a feloldás nem mehet a megengedő
irányba, mert akkor az ellentmondás maga válna megkerülő úttá.

### 3/b. A gépi jel — és a POZITÍV ELLENPÁR szintetikus gyermekkel

Új ellenőrző: **`npm run verify:sweep-verdict`** (a söprés része), hat állítással:

- **SWV01** a négy állapot szétválik, és a döntést a KÖZÖS feloldó hozza;
- **SWV02** *a lelet maga:* `exit 1` + `FAIL` + beágyazott „ENV-KIHAGYÁS" ⇒ **PIROS** (négy alakon);
- **SWV03** *pozitív ellenpár:* a szabályosan deklarált kihagyás továbbra is kihagyás, **és az INDOK
  eljut a jelentésig** (a néma kihagyás ugyanaz a hiba, mint a néma zöld);
- **SWV04** a hiány és az ellentmondás külön, nevezett válasz;
- **SWV05** **VALÓDI ALFOLYAMAT-PRÓBA:** négy szintetikus gyermek-ellenőrző tényleges futtatása,
  ugyanazzal a hívási alakkal, amit a söprés használ — zöld · piros · deklarált kihagyás ·
  ellentmondó;
- **SWV06** a söprés a közös feloldót HÍVJA, és a részszöveges alak nem jött vissza.

**Az ellenpárhoz nem kellett megvárni egy valódi környezet-hiányt** — pont ahogy írták. A szerződés
tárgya a DEKLARÁCIÓ alakja, nem az akadály valódisága; ez engedte, hogy a szigorítás ellenpárral
szülessen (KUKA-049).

**Falszifikálva, mérve:** a részszöveges osztályozás visszatételére az SWV02 mind a négy alakon
piros lett, és a VALÓDI gyermek-próba is („piros" gyermek: várt `failed`, mért `env_skipped`); a
söprés helyi osztályozásának visszatételére az SWV06 piros.

**OB-10 ezzel LEZÁRVA.** A lezárás nem eltűnés: a blokkoló átköltözött a `CLOSED_BLOCKERS` listába,
a lezárás feltételével és a gépi jellel együtt, és a `node v3ref/run.mjs` KIÍRJA — enélkül a
megoldott blokkoló megkülönböztethetetlen volna az elfelejtettől (KUKA-012).

### 3/c. A V2-vel közös eredet — MÉRVE, NEM MÓDOSÍTVA

A V2 söprése ugyanezt a részszöveges osztályozót viseli, és **négy V2-verifier** a saját kihagyását
ma PRÓZÁBAN mondja ki: `verify:challenge-inventory` · `verify:doc-order` · `verify:mcp-bridge` ·
`verify:repo-root`.

**Következmény, kimondva:** a szerződés átvitele a V2-be CSAK akkor szabályos, ha az a négy verifier
ELŐBB megkapja a gépi deklaráció-sort — különben jogos kihagyásból lenne piros. **Ez nem jelen kör
hatóköre, és V2-módosításra nincs engedélyem; üzenetet sem küldtem.** A megállapítás mérés, nem
javaslat végrehajtásra.

### 3/d. AMI EBBŐL KÖVETKEZIK, ÉS NEM KELLEMES: A SÖPRÉS MOSTANTÓL PIROS

Az OB-10 javítása után a `verify:external-checks` a söprésben **PIROSKÉNT** jelenik meg — mert az.
A korábbi zöld a téves osztályozásból jött. **A söprés tehát mostantól nem zöld, és ez az igazság**;
az eltérések feloldása a §7 tárgya, és a döntés egy része az Önöké.

**A LEZÁRT ÁLLAPOTON MÉRVE, szó szerint:**

```
=== PIROS: verify:external-checks === (nem nullával zárt, és NEM deklarált környezeti akadályt
    — a kimenetben szereplő szó nem verdikt)
SÖPRÉS (10 verifier, 619s): 9 zöld · 0 env-kihagyás · 1 piros
PIROS: verify:external-checks
```

A söprés **1-es kilépési kóddal** zárt. Figyeljék meg a zárójeles indokot: ez pontosan az a mondat,
amit az OB-10 javítása tesz lehetővé — a gyermek kimenetében OTT ÁLL az „ENV-KIHAGYÁS" szó (az `r57`
és az `r59` szabályos, nevezett kihagyása miatt), és a RÉGI osztályozó ettől a **teljes** ellenőrzőt
kihagyásnak mondta volna. Most nem mondja, mert a verdikt a **gépi deklarációból** dől el, nem a
szövegből.

---

## 4. IGÉNY-MÁTRIX — forrásokkal, és ahol nincs forrás, ott kimondva

A kért kiegészítés: V2-hivatkozás · ismert hiba · board-mátrix sor. **Ahol a V2-ben nincs
előzmény, ott „ÚJ igény" áll — V2-bizonyítékot nem találtam ki.** A board-mátrix oszlop a
`DEFAULT_FRM_CATALOG` VALÓDI kulcsaiból jön (28 tétel).

| terület | V2-forrás (mért) | ismert V2-hiba | board-mátrix sor |
|---|---|---|---|
| **VShop** | `docs/70_PLANNING/VSHOP_PARITAS_LELTAR.json` + `VSHOP_FELMERES_ES_UTEMTERV.md` (D-VS-514/515) | — (a V2 hatókör-plafon KIVETTE: D-VS-674) | `frm_biztonsagi_szemle` |
| **VMarket** | **ÚJ igény** — nincs V2-előzmény | — | `frm_biztonsagi_szemle` |
| **Számlázó** | `src/masterData/partnerFieldMap.js` · `verify:partner-field-map` | KUKA-072 (az operátor mint futár) · KUKA-022 (validálatlan korrekció az importban) | `frm_verify_registries` |
| **Shoprenter sync** | `verify:sync-controls` (SCT02–SCT07) | KUKA-041 (dísz-vezérlő) · KUKA-042 (két pipa egy oszlopon) · KUKA-026 (a kudarc könyvelése a siker tranzakciójában) · KUKA-027 (vak kód-pár) | `frm_verify_vertical` |
| **eGN** | `verify:hardcoded-labels` (F-221/7 · F-5112 · F-8812 lapok) | KUKA-021 (a mai törzs-egység a múltbeli mozgáson) · KUKA-048 (a fájlra adott kivétel) | `frm_jogi_elolista` |
| **Munkagépek** | **ÚJ igény** — nincs V2-előzmény | — | `frm_biztonsagi_szemle` |
| **Csomagoló · címkéző · scanner** | GTIN-lánc (`verify:product-cleanup` környéke) | KUKA-029 (a számláló a nyers alakot nézte) · KUKA-030 (némán áttipizált paraméter) | `frm_ui_element_proba` |
| **Pricing / costing / recept** | árlista + ár-feloldó (D-VS-623) · `verify:assignment-panel` ASN18 | **KUKA-069** (a `customer_group_id` olvasva volt, ÍRVA soha — a vevőcsoport-árazás a megépítése óta halott) · KUKA-023 (a beolvasztás a receptet is átvette) | `frm_verify_registries` |
| **Készlet** | főkönyv + tulajdonos-könyv modell (D-VS-620) · `verify:stock-views` SVW21 | KUKA-008 (saját cég tulajdonosként) · KUKA-021 (egység ≠ címke) · KUKA-071 (a külső raktár három szerepe) | `frm_verify_schema` · `frm_db_proof` |
| **Kezelt terek / admin** | `src/masterData/spaceKind.js` · `partnerSpaceShape.js` · `verify:glossary` GLO05–GLO10 | KUKA-073 (helyettesítőből felelő oszlop) · KUKA-075 (tér átminősítése) · KUKA-076 (teremtőből levezetett jog) · KUKA-083/084 (létezés-szivárgás) | `frm_tenant` |
| **AI asszisztens / export** | `frm_ai_ux_elott` (PR-hatókör, CLAUDE.md) · `verify:mcp-bridge` | KUKA-081 (a külső fél kérése mint a saját jogunk plafonja) | `frm_ai` · `frm_ai_ux_elott` |
| **UX / i18n / FAQ** | `verify:screen-texts` · `verify:text-reality` · `verify:hardcoded-labels` | KUKA-050 (a szöveg a múltat állította) · KUKA-051 (a mérés nem nőtt együtt a képernyővel) | `frm_i18n` · `frm_tutor` · `frm_support_faq` |
| **Több író / tartós tárolás** | **ÚJ igény** — a V2-ben nincs MÉRT többírós bizonyíték | — | `frm_db_proof` |

**Kimondott korlát a mátrixra:** a V2-hivatkozások NEVEZETT állományok és verifierek, nem
találati számok. Egy `rg`-találat darabszáma nem forrás-hivatkozás (KUKA-054: a minta nem
igazolhatja vissza a mért tulajdonságot) — ezért ahol nincs nevezett artefaktum, ott „ÚJ igény" áll,
és nem egy hihető szám.

---

## 5. OB-3 · OB-5 · OB-6 + a három CMD-001 hiány — döntésjavaslatok

### 5/a. OB-3 — a külső határ (BEJ-01) terve

**A javasolt szabály (tárgyalási alap):**

> *„A művelet hitelesített SZEREPLŐJE és a jogosultság a szerver oldalán dől el; a kérés törzse nem
> hordozhat hatóköri tényt. A felhasználó által VÁLASZTOTT könyv, raktár és tulajdonos csak
> ELLENŐRZÖTT SZELEKCIÓKÉNT válhat kontextussá: a szerver a hitelesített szereplőhöz tartozó,
> engedélyezett halmazból fogadja el, és a halmazon kívüli érték NEVEZETT elutasítás."*

**Amit ez NEM enged meg:** a mai `unknown_field` tiltás lazítását — a kontextus-mező a kérés
törzsében továbbra is nevezett elutasítás (BEM-01). **És amit nem tesz lehetetlenné:** a több raktár
használatát. A kettő nem ugyanaz: a mező tiltása a TÖRZSBEN áll, a választás pedig a KONTEXTUS-ban,
ellenőrzött halmazból.

**Ellenpélda, amivel falszifikálható:** a hitelesített hívó olyan raktárat választ, ami nem szerepel
a hozzá tartozó engedélyezett halmazban; ha a művelet létrejön, a klauzula megsérült.

**A határ MEGVALÓSÍTÁSA a terv elfogadása UTÁN jön** — ezt a sorrendet elfogadom.

### 5/b. OB-5 — a megvonás ≠ korrekció

**A javasolt szabály (tárgyalási alap):**

> *„A jogmegvonás alapértelmezésben a TOVÁBBI cselekvést korlátozza. Egy korábban rögzített tény
> megváltoztatásához KÜLÖN jogosult, hivatkozott és auditált KOMPENZÁLÓ ESEMÉNY kell; a megvonás
> önmagában nem kompenzál. Visszamenőleges joghatás esetén a NORMAFORRÁST és a profil szabályát meg
> kell nevezni."*

**Három, egymástól elkülönített fogalom:** (1) a jog megszűnése *ezentúl*; (2) a múltbeli
képre vonatkozó felülvizsgálat (a REV-N2 kör, ami MÁR megvan); (3) a kompenzáló esemény, ami a
hatást fordítja meg — ez ma NINCS meg a magban.

**Ez tárgyalási kiindulópont, nem minden üzleti visszafordítás engedélyezése.** A kompenzáló
esemény hatásköre és a profilja külön döntés.

### 5/c. OB-6 és a három CMD-001 hiány — tételes levezetés

| tétel | korlát | pozitív eset | tiltott eset | V2-forrás | V3-eltérés |
|---|---|---|---|---|---|
| **ORG-N1b** (önálló szervezeti alap) | a kiadás nem léphet túl a határozat hatályán és korlátján | a határozaton BELÜLI kiadás változatlanul megy | a határozaton TÚLI kiadás nevezett elutasítás, nyom nélkül | — (V3-ban született) | a korlát DEKLARÁLÁSA ma nem kötelező — ez az OB-6 |
| **kezelt tér joga a VISZONYBÓL** | alvó tér + rá kötött saját partner | a kötött partner gazdája meghívhat, alap-raktárt pótolhat | a TEREMTŐ mint olyan nem szerez jogot | `mayActOnDormantSpace` · KUKA-076 · `verify:glossary` GLO09 | a V3-ban **nincs megfelelője** |
| **admin-jelölt szabály** | cégterenként EGY admin-jelölt | az ELSŐ e-mail kap admin-meghívót | a második cím `admin_already_designated`, levél nélkül | D-VS-642/8 · KUKA-083 | a V3-ban **nincs megfelelője** |
| **tér-fajta feloldás** | a négy fajta a `kind × account_state` SZORZATA, EGY feloldóból | minden olvasó ugyanazt a feloldót hívja | kézi szorzat tilos; a hiánynak SAJÁT szava van („nincs tere") | `spaceKind.js` · KUKA-073 · GLO05–GLO07 | a V3-ban **nincs megfelelője** |

**A „tárgyalás tárgya" nem indok a javaslat elhagyására** — elfogadom. A fenti négy sor a javaslat;
a klauzula-SZÖVEGET a normaregiszterbe akkor írom be, ha elfogadták (klauzulát kitalálni nem szabad,
R10-F05 lecke).

---

## 6. RENDEZETT ZÁRÓTÁBLA — négy osztály, elfogadási feltétellel

| # | tétel | osztály | elfogadási feltétel | felelős | kapu |
|---|---|---|---|---|---|
| 1 | azonosság · parancs-azonosság · hatályosulási pont · nyugta | **kész és bizonyított** | — | — | `verify:v3ref` |
| 2 | tiltás hatóköre (REV-N5a/b/c) | **kész és bizonyított** | — | — | `verify:v3ref` |
| 3 | főkönyv atomiság · idegen könyv · két idő-tengely · mennyiség-profil | **kész és bizonyított** | — | — | P-KSZ · P-KAT · P-BEM |
| 4 | **F16-01 — a jog előbb dönt** | **kész és bizonyított** (R17) | — | — | `P-AUT-object-neutral` · M149–M152 |
| 5 | **OB-10 — verdikt-szerződés** | **kész és bizonyított** (R17) | — | — | `verify:sweep-verdict` |
| 6 | **OB-3** külső határ | **most hiányzó alap** | a §5/a szabály elfogadása, majd megvalósítás + ellenpélda | chatgpt-v3 dönt · Claude-v3 épít | új próba, BEJ-01 |
| 7 | **OB-5** megvonás ≠ korrekció | **most hiányzó alap** | a §5/b hármas elfogadása + kompenzáló esemény fogalma | chatgpt-v3 dönt · Claude-v3 épít | REV-N4 próbák |
| 8 | **OB-6** + 3 CMD-001 hiány | **most hiányzó alap** | a §5/c négy sorának elfogadása | chatgpt-v3 dönt · Claude-v3 épít | ORG-N1b · új próbák |
| 9 | **OB-7** tartalmi felülvizsgálat (0/72) | **most hiányzó alap** | klauzulánként: módosított klauzula → normaforrás → működés → ellenpélda → bizonyíték | **Claude-v3 a leképezést · chatgpt-v3 az elbírálást** | `contentReviewState` |
| 10 | **OB-8** K05 klauzula | **most hiányzó alap** | a §4/a (R13) szöveg elfogadása, eredeti K05-szöveggel bizonyítva | chatgpt-v3 | modul-szerződés → klauzula |
| 11 | **OB-9** K10 négy klauzulája | **most hiányzó alap** | a négy technikai követelmény elfogadása; a kanonikus alak PROFIL-FÜGGŐ | chatgpt-v3 | modul-szerződés → klauzula |
| 12 | **OB-1** több-írós véglegesítés | **most hiányzó alap** (nem mérési korlát) | a párhuzamos véglegesítés SZERZŐDÉSE most; **valódi többírós bizonyítás** az ilyen adapter/üzem engedélyezése ELŐTT | Claude-v3 szerződés · közös elbírálás | új, párhuzamos próba |
| 13 | **OB-2** műtermék-útvonal ütközése | **most hiányzó alap** | a bizonyítékok ütközésmentes futáshoz kötése (a hiteles lezárást érinti) | Claude-v3 | egység-tanú |
| 14 | **OB-4** nem üres korpusz | **most hiányzó alap** | szintetikus POZITÍV és NEGATÍV korpusz; a valódi migrációs megfelelőség KÜLÖN, későbbi kapu | Claude-v3 | osztályozó-próba |
| 15 | VShop · VMarket · eGN · munkagépek · pricing megvalósítás | **későbbi megnevezett funkció** | a core-core zárása után, saját igényfelméréssel | — | — |
| 16 | a mutációs egység-fájl kriptográfiai kötése a futásához | **mérési korlát** | aláírt egység-tanú | Claude-v3 | ma kimondott függő |
| 17 | a V2-söprés szerződés-átvitele | **mérési korlát / hatókörön kívül** | a négy V2-verifier gépi deklaráció-sora — **V2-engedély nélkül nem indul** | operátor dönt | — |

**Az OB-1 / OB-2 / OB-4 tehát NEM „mérési korlát" címkével törölve** — elfogadom a kifogást; mindhárom
a „most hiányzó alap" osztályba került, nevezett halasztási feltétellel és fogyasztóval.

---

## 7. A KÜLSŐ LÁNC ELTÉRÉSEI — feloldási javaslat

### 7/0. ELŐSZÖR EGY HELYESBÍTÉS A SAJÁT SZÁMOMRA: AZ ELTÉRÉSEK SZÁMA NEM ÁLLANDÓ

A láncot ebben a körben **kétszer** futtattam le: egyszer önmagában, egyszer a teljes söprés
gyermekeként. **Két különböző eredményt adott:**

| futás | eredmény |
|---|---|
| önállóan (a gép egyébként üres) | `14/19 MEGFELEL` · **3 eltérés**: `r77` · `r79core` · `r81core` |
| a SÖPRÉS gyermekeként (terhelt gép) | `13/19 MEGFELEL` · **4 eltérés**: `r77` · `r79core` · `r81core` · **`r83core`** |

**Nem a kellemesebbet választom.** A megkülönböztetést megmértem, és pontosan megmondható:

- Az `r83core` burkolója a mutációs battériát **NÉGYES** bontásban futtatja le (`--unit=k/4`), és a
  program 15 000 ms-os belső korlátot visel. A söprés futásán az **1/4 és a 4/4 egység nem nullával
  zárt** (`genuine_units.problems`), ezért a burkoló két `merge/KORNYEZET-*` sort tett a lista végére,
  és a NÉGY várt `merge/*` eset elmaradt. Önállóan ugyanez a két egység épp beleférte magát.
- Ez tehát **nem véletlenszerű ingadozás**, hanem a §7/b-ben leírt darabolási probléma
  következménye: a battéria kinőtte a négyes bontást, és a határon billeg.

**Ebből két dolog következik, és mindkettőt kimondom.** (1) A §7/b javaslat nem szépészeti kérdés:
a darabolás miatt **a lánc verdiktje gépterheléstől függ**, és egy ilyen mérés nem tud regressziót
őrizni. (2) A „hány eltérés van?" kérdésre a helyes válasz **„három tartós + egy terhelésfüggő"**,
nem egy szám.

### 7/1. A MÉRT ELTÉRÉS-LISTA, OKKAL — nem összesítve, hanem tételesen

| program | eset | mért ok |
|---|---|---|
| `r77` | `F02-data-scope-context-does-not-filter-price-result` | **MNY-01** — a próba `resolve:()=>({qty:1,unit_price:12345})`-öt ad; a mag `result_shape_type_mismatch`-csel elutasít, így az `assert(... .ok)` a BEÁLLÍTÁSNÁL bukik, még mielőtt az adatkört vizsgálná |
| `r79core` | `P01-flat-quantity` | **MNY-01**, kimondott hibaüzenettel (`qty` helyen) |
| `r79core` | `P07-command-before` | **MNY-01** — `resolve:()=>({qty:1})`, az `r.ok === true` elvárás bukik |
| `r81core` | `core/P01-pure-lines` | **MNY-01**, kimondott hibaüzenettel (`lines[0].qty` helyen) |
| `r81core` | `core/F04-release-time-before` · `-after` · `-cross` (3) | **MNY-01** — mindhárom `resolve:()=>({qty:1})`-gyel állítja be a próbát |
| `r81core` | `merge/KORNYEZET-7` · `-8` (2) | **darabolás** — lásd §7/b |
| `r83core` | `merge/KORNYEZET-3` · `-4` (2) | **darabolás** — CSAK ez, valódi eset-hibája NINCS |

**Összesen: 7 valódi eset-hiba, MIND az MNY-01-ből · 4 darabolási sor, 2 programban.**

**Helyesbítem a saját korábbi megfogalmazásomat:** ugyanebben a lapban „öt mennyiség-esetet" írtam
— **mérve hét**, és három programot érint, nem kettőt. A szám nem volt gondosan megmérve, csak
emlékezetből becsülve (a KUKA-005 alakja egy jelentésben).

**És egy jel, amit érdemes kimondani:** a `P07-command-after` testvér-eset **ÁTMEGY** — de nem
azért, mert a védett viselkedés helyes, hanem mert `ok === false`-ot vár, és a mag történetesen a
mennyiség-alak miatt utasít el. **Az igaz ok másik.** Ez a KUKA-049 alakja: az „átment" jelzés itt
nem a mért tulajdonságról szól.

### 7/a. A hét mennyiség-eset (MNY-01)

**Javaslat:** a régi programok **eredeti alakja MARAD, változatlanul** — ők a regresszió tanúi.
Mellettük **UTÓD-eset** születik, ami **ugyanazt az ÜZLETI ÁLLÍTÁST** vizsgálja, csak a kanonikus
mennyiség-alakkal. Az utód nem az eredeti átírása: külön azonosítón fut, és a manifeszt kimondja,
melyik eredeti állítás utódja.

**Amit ez megőriz:** a régi eset bukása továbbra is LÁTSZIK, tehát a regresszió nem tűnik el egy
átírással. **Amit ez megold:** a mérce nem igazodik a megvalósításhoz (KUKA-054), és a lánc mégis
tud zöldet adni arra, ami tényleg rendben van.

**Amit NEM javaslok:** az MNY-01 megengedő verzióját. Az indoka (a 0,1 nem ábrázolható pontosan) a
régi verzióra ugyanúgy igaz — a megengedő verzió egy ISMERTEN HIBÁS viselkedést konzerválna.

### 7/b. A NÉGY `merge/KORNYEZET-*` sor (a darabolás) — és miért sürgősebb, mint hittem

**Javaslat:** a darabolás **KÖZÖS DEKLARÁCIÓBÓL** menjen, a költségvetés emelése nélkül. Ez a V3
oldalán már megtörtént: `v3ref/external-checks/batteryUnits.mjs` a deklarált otthon (ma **7** egység),
a `package.json` parancs-sorát gép veti össze vele (`verify:unit-admission` UAD08). Az `r81core` és
az `r83core` burkolója még a SAJÁT, rögzített **négyes** bontását használja — **az ő programjuk,
ezért az ő döntésük**: vagy átveszik a közös deklarációt (környezeti változóval is állítható), vagy a
költségvetés marad és az eset nevezett környezeti akadályt kap.

**A költségvetést nem nyújtom meg.** A mai mért érték a HETES bontáson: legrosszabb egység
**9592 ms** a 12 000 ms-os saját költségvetéssel és a 15 000 ms-os külső korláttal szemben. A
NÉGYES bontáson viszont ugyanez a battéria a 15 000 ms-os korlát FÖLÉ nyúlik — ezt a §7/0 mérése
mutatja meg: két egység a söprés terhelése alatt nem nullával zárt, üresjáratban viszont beleférte
magát.

**Ezért ez a tétel nem halasztható a többi mellé.** Amíg a darabolás nem közös deklarációból megy,
a lánc verdiktje **a gép pillanatnyi terhelésétől függ** — ami azt jelenti, hogy a lánc ezen a két
programon ma nem tud regressziót őrizni sem az egyik, sem a másik irányban (egy VALÓDI regresszió
ugyanígy elbújhat egy „ez csak a darabolás" magyarázat mögé — KUKA-049).

---

## 8. RÁFORDÍTÁSI MÉRLEG — lezárt követelmények és visszanyílt hibák

**Lezárt ebben a körben:** F16-01 (új, bizonyított biztonsági hiba — javítva, négy mutációval
falszifikálva) · OB-10 (verdikt-szerződés, ellenpárral és valódi alfolyamat-próbával) · **az Önök
R16-os programjának BEKÖTÉSE a söprésbe** (§1/b — a KUKA-132 miatt ez külön tétel, nem ráadás).

**Visszanyílt / újonnan kimondott:**
1. a söprés mostantól PIROS, mert a külső lánc az (§3/d) — ez nem új hiba, hanem egy eddig elrejtett
   állapot láthatóvá válása;
2. **ÚJ, ebben a körben mért lelet:** a lánc verdiktje **gépterheléstől függ** — ugyanaz a forrás
   üresjáratban 3, a söprés alatt 4 eltérést ad (§7/0). Ezt nem tudtam volna megtalálni, ha egyszer
   futtatom le; és nem a kellemesebb számot választottam.
3. **Helyesbítés a saját lapomban:** „öt mennyiség-eset" helyett **hét**, három programban (§7/1).

**Gépi végeredmény (mérve):**

| mérték | érték |
|---|---|
| mag-próbák | **54/54 PASS**, exit 0 (53 → 54: az új `P-AUT-object-neutral`) |
| mutációk | **149 mutáció · 149 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** |
| legrosszabb egység | **9592 ms** (saját költségvetés 12 000 · külső korlát 15 000) |
| memória-őr | **266/266 PASS** |
| az ő programjuk | **7/7** (előtte 6/7) |
| külső lánc | **üresjáratban 14/19 · 3 eltérés · a söprés alatt 13/19 · 4 eltérés** — 2 nevezett env-kihagyás (zöld helyettessel), hatókör: `full` mindkétszer (§7/0) |
| **TELJES SÖPRÉS** (a lezárt állapoton) | **10 verifier, 619 s: 9 zöld · 0 env-kihagyás · 1 PIROS** (`verify:external-checks`) — **kilépés 1** |
| `verify:kuka` | **269/269 PASS** |
| `verify:sweep-verdict` · `verify:unit-admission` · `verify:doc-html` · `verify:decision-numbers` · `verify:artifact-naming` · `verify:release-order` | **mind ZÖLD** |
| `verify:capability-witness` | **11/11 egyezik** · 2 gépileg nem mérhető, kimondva — **a V2 repó elérhetőségével MÉRVE** (a söprés alap-futásán ez nevezett env-kihagyás, mert a söprés nem állítja be a `V2_REPO_ROOT`-ot; KUKA-089: a hiányt megmértem, nem feltételeztem) |

**A KÖLTSÉG-MÉRÉSRŐL, az Önök kifogásával együtt.** Elfogadom: *„A szöveges körjelölő hiánya nem
bizonyítja, hogy egy alügynök-napló nem tartozik a körhöz."* Az R13-as lapon ezt „nem alsó korlát"
megfogalmazásban már kimondtam, de a következtetést nem vontam le elég élesen. **Helyesen:** a
665 alügynök-napló összerendelése a körhöz **ismeretlen**, tehát a lefedettség **hiányos**, nem
„teljes, csak részleges". A szám ezért **jelölt bizonytalanságú elszámolás**, se nem alsó, se nem
felső korlát.

**A KÖR MÉRT SZÁMAI** (a mérő: `tools/vs_round_cost.mjs`, jelölő: `CMD-VS-300-002-002 R16`):
136 kérés (ebből 76 ismételt rekord ugyanarra a kérésre — nem növeli a fogyasztást) · **102 944
kiírt token**, ebből gondolkodás 21 785 · friss bemenet 272 · gyorstár-írás 1 029 887 ·
gyorstár-olvasás 63 055 072 · 144 eszköz-hívás · első→utolsó kérés között 34 perc.
**Jelölt bizonytalanság: nincs** (minden rekord illeszkedett a sémára), **DE** a 665 alügynök-napló
nincs benne — a fenti szám ezért a fentiek szerint jelölt bizonytalanságú elszámolás.
**KÉT KIMONDOTT KORLÁT:** (1) a kör MÉG FUT, amikor ezt mérem, tehát a szám mozgó célpont
(KUKA-134); (2) a puszta `R16` jelölő **NULLA kérést** mér — a mérő ezt helyesen **mérési hibának**
és nem nulla költségnek nevezi: a csomagot a TELJES kör-azonosító nyitja, a rövid alak nem
(KUKA-131 határoló-szabálya). Ezt azért írom le, mert egy „R16 = 0" szám hihetőnek látszana.

**Nincs igazolt ár/érték-javulás**, és megtakarítást nem állítok. **V2-átadási engedélyt nem kértem
és nem kaptam**; a V2-re vonatkozó megállapításaim mérések, nem végrehajtandó javaslatok.

---

## 9. AMI KIMARADT — nevesítve

1. **Az OB-3 · OB-5 · OB-6 klauzula-SZÖVEGEI** — szándékosan: javaslat van (§5), kiadott klauzula
   nincs. A normaregiszterbe elfogadás után kerül.
2. **A három CMD-001 hiány MEGÉPÍTÉSE a V3-ban** — a levezetés kész (§5/c), a kód nem. Ez a
   következő csomag tárgya.
3. **Az OB-7 tartalmi felülvizsgálat 0/72 állapota** — a leképezést vállaltam, de ebben a körben
   nem készült el; a nem vizsgált sor **nem vizsgált** marad.
4. **A külső lánc három eltérése** — javaslat van (§7), a döntés az Önöké; addig a lánc piros.
5. **A `V3_ALLAPOT_MAGYARUL.md` frissítése** — az MCS-2 óta elavult (KUKA-050). Nevesített adósság.
