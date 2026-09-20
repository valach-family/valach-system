# R63 végrehajtva — az első felhasználói folyamat a V3 magon, és az egyetlen core-lezárási lista

> **Sáv:** Claude-v3 · **Kör:** R64 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R63 — SPEC** (chatgpt-v3 → Claude-v3, 2026-09-20). A külső fél lapja
szó szerint mentve: `v3ref/source-documents/R63_board_v1.md`. **Ez az R63 §6-ban kért EGYETLEN
összesített REPORT.** Egyoldalas útmutató külön lapon: `V3_R64_CORE_FOLYAMAT_UTMUTATO.md`.

---

## Röviden, magyarul — mi lett lehetséges, miért fontos, mi hiányzik, ki dolgozik rajta

**Mi lett lehetséges felhasználóként.** Egy ember regisztrál egy e-mail címmel, megerősíti, hogy a
cím az övé, saját munkakörnyezetet indít (magán- vagy adószámos céges kört), meghív egy munkatársat,
a munkatárs meglévő vagy új fiókkal elfogadja, vált a személyes és a céges munkatere között, látja azt
az adatot, amit a kezelő KÜLÖN megadott neki — és amikor a kezelő megvonja, a következő kérésétől
kezdve nem lát semmit. Mindezt egy böngészőben, telepítés nélkül futó próba-alkalmazáson, ahol
**minden döntést a szerver hoz** a mag saját szabályaival; a képernyő csak rajzol. Levél külső
személynek nem megy ki: a leveleket egy fejlesztői fogadó mutatja.

**Miért fontos.** Az előző körökben a jogadás alapja „operátori döntésre várt". Az R63 kimondta, hogy
ez szakmai alapértelmezés, nem üzleti kérdés — és ezt most a kód is mondja: **minden aktív jognak
nevezhető eredete, hatóköre, szabály-verziója és érvényessége van**, a felhasználótól viszont senki
nem kér alap-dokumentumot. A saját munkakörnyezet joga az indulási szabályból (v1) és a bizonyított
csatornából születik; a meghívó alapját a rendszer a meghívó továbbadható jogából képzi, plafonnal;
alap nélküli hatáskör vagy meghívó **nem ad új jogot** — nyers írással sem. A helyi admin nem
platformbíráló; a sima regisztráció nem ad bírálói jogot.

**Mi hiányzik.** Nem valódi levélküldés, nem Postgres, nem több-írós terhelés, nem országonkénti
hivatalos igazolás, nem közös (kétszemélyes) jóváhagyás, nem üzleti modul. Ezek nevesítve állnak a
lezárási listán (7. szakasz) — egyik sem tűnt el „a bemutató kevesebbet használ" címén.

**Ki dolgozik rajta.** Egy sáv (Claude-v3), a chatgpt-v3 ellenőriz. A modellváltás megtörtént, és
mérve van (1. szakasz).

---

## 1. A kör kerete — mérve, nem feltételezve

- **Modell:** az operátor a munkamenetben **Fable 5.1**-re váltott, ÉS UTÁNA adta át az R63-at. Mérve
  (`get_session`): `session_context.model = claude-fable-5-1` · `last_served_model =
  claude-fable-5-1` · `user_switched_model = claude-fable-5-1`. Az R63 §7 „claude-opus-5, medium"
  ajánlást ír — a váltás az operátoré, a feladat ezen nem múlt; a kör Fable 5.1-en futott, és ezt
  kimondom. **A fogyasztás R24-től ismeretlen; a költség `null`, nem nulla** — ez a lap sem állít
  számot.
- **Határok tartva:** nincs merge · nincs éles telepítés · nincs V2-módosítás · nincs új üzleti
  mini-modul · nincs fizetős szolgáltatás · a board-integráció a `valach-family/vs` repóé, itt nem
  épült újra. Egy sáv, párhuzamos nincs.
- **Amit az R63 kimondottan visszavont, és ez a kör követ:** az „A/B operátori döntés" keretezés
  (R61/R62) helyett a §4 szakmai alapértelmezés; az R59/R61 adapter-/UI-tilalma ehhez az egy
  core-folyamathoz feloldva — ez **nem** igazolja visszamenőleg az R58 „nincs hívó, tehát új
  burkoló kell" érvelését (KUKA-198 marad).

## 2. Futtatható core-folyamat és reprodukálható indítás

**Nyilvános előnézeti cím ebben a környezetben NINCS** (nem állítok olyat, amit nem értem el). A
pontos indítási út — nulla új futásidejű csomag, csak a Node beépített moduljai:

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git checkout main && git fetch origin && git pull origin main
npm run app:dev            # → http://127.0.0.1:3300/  (két böngésző-ablak: Anna és Béla)
```

Gépi végigjárás (nem kell hozzá kattintani): `npm run app:selfcheck` (a valódi végpontokon,
süti-tárcával) és `npm run proof:core-ux` (Playwright, valódi böngésző; ehhez egyszer
`npm install --include=dev`). A böngésző-próba eredménye JSON-ban: `docs/70_PLANNING/V3_R64_ELFOGADAS_HELYZETEK.json` (+ a futás-jelentés a `var/reports` alatt).

A kipróbálás lépései szereplőnként, „mi történik és miért" magyarázattal: **`V3_R64_CORE_FOLYAMAT_UTMUTATO.md`**
(egy oldal).

## 3. Mi épült a magban — és mi lett VISSZAVONVA

| Szerződés | Mi | Hol | Gépi jel |
|---|---|---|---|
| **ACC-01** | fiók: scrypt-lenyomat, semleges regisztráció, csatorna-kihívás (24 óra, egyszeri), `provenEmailOf` | `v3ref/account.mjs` | P-CORE (a),(c) · M203 |
| **WSP-01** | saját munkakörnyezet EGY tranzakcióban: könyv + `startup-rule:v1` alap + admin tagság + helyi `alter_right` + adatköri jog + előfizetés-profil; CSAK bizonyított csatornával | `v3ref/workspace.mjs` | P-CORE (a),(e) · M196–M198 |
| **DLG-01** | a meghívó alapja a kiadó továbbadható jogából (`deleg:<könyv>:<alany>`), plafonnal; adatkör kötelező; a jogot a kezelő KÜLÖN adja (`grantScopeToMember`); megvonáskor a delegálási alap is megszűnik | `v3ref/delegation.mjs` | P-CORE (b),(c),(d) · M199–M200 |
| **PRL-01** | a platform bírálói kezdő szabálya (`platform-rule:<könyv>`) — a fixtúrák és a jövőbeli üzemeltetői kör ezen át kapnak hatáskört, nem alap nélkül | `v3ref/platformRule.mjs` | a külső programok adapted-v3 futása |
| **XID-01** | névterezett külső azonosító (névtér × joghatóság × normalizált érték); ismeretlen országprofil: nincs képviselet, saját munka szabad | `v3ref/externalId.mjs` | P-CORE (f) · M201 |
| **ENT-02** | előfizetés-profil (starter/pro) és KÉT KAPU külön ítélete (`twoGateVerdict`: jog · előfizetés · mindkettő) | `v3ref/entitlement.mjs` | P-CORE (f) · M202 |
| **ALAP-ZÁRÁS** | alap nélküli hatáskör: `basis_id_required` a megadásnál, `authority_without_recorded_basis` a használatnál; pecsét nélküli meghívó: `invite_without_basis`; a történeti sor MARAD, a mai használat külön | `adjudication.mjs` · `authority.mjs` · `basisLimit.mjs` · `invite.mjs` | P-ORG-basis-limit (e) · P-ORG-adjudication-basis-limit (g4/h) · M190 |
| **BLI-01 őr** | az ÁTVITT korlát (`grant_basis`) beszúrás-oldali újrapecsét-tilalma — egy pragma nélküli MÁSODIK kapcsolatról az `INSERT OR REPLACE` némán átírta volna | `v3ref/store.mjs` | P-CORE (g) · M205 |
| **tároló** | `openStoreAt` — tartós, több-kapcsolatos WAL-tároló (a próba-alkalmazásnak és a több-folyamatos mérésnek) | `v3ref/store.mjs` | proof:multiconn |

**Visszavont első alak — KUKA-199.** A beváltás első változata a meghívó pecsételt adatkörét rögtön
olvasási joggá írta. A saját P-DSC próbák az első futáson piros lettek: az elfogadott K05-DSC-c szerint
a **megadható nem a megadott**. Visszavonva; a jog a kezelő külön lépése; a válasz kimondja, hogy a
beváltás nem adott jogot (`read_scope_granted: null`); az M204 mutáció a régi alakot visszateszi, és a
próba piros. **Ezt a hibát a saját próbám találta meg, kiadás előtt** — a külső fél nem látta.

**Amit NEM tettünk, kimondva:** meglévő rekordokat nem töltöttünk fel alappal; a próba-fixtúrákat
kifejezetten adaptáltuk (adapted-v3, 3.4. szakasz); élő migráció nincs, mert élő adat nincs.

## 4. A bizonyíték-csomag — saját futás, átvett mérés és dokumentumállítás külön

| Jel | Mit mér | Eredmény (saját futás, ezen a fán) |
|---|---|---|
| `node v3ref/run.mjs` | 62 próba, benne a P-CORE-startup-and-delegation 7 állítása (a)–(g) | **62/62 PASS** |
| `npm run verify:v3ref` (mutációs battéria) | 204 mutáció (M196–M207 az R63 magjára és a felülvizsgálat javításaira) | **204/204 elkapva · 0 túlélte · 0 rossz próba · 0 elavult horgony — TELJES ÉS TISZTA (a felülvizsgálat utáni végső futás: 18 egység, 2 perc 50 mp, nyugodt gépen)** |
| `npm run app:selfcheck` | a teljes lánc a valódi végpontokon | **57/57 PASS** |
| `npm run proof:core-ux` (Playwright) | a lánc böngészőben + a 14 helyzet, böngésző- és szerver-bizonyíték külön | **27/27 PASS** (13 folyamat-lépés + 14 helyzet; 35 s) |
| `npm run proof:multiconn` (MCN-01) | OB-1: KÉT valódi folyamat — meghívó-beváltás versenye · megvonás ↔ véglegesítés · visszajátszás | **40/40 OK** (20+20 menet; mindkét sorrend előfordult; a vesztes nevezett elutasítást kapott; a megvont jog visszajátszással nem tér vissza) |
| `npm run verify:external-checks` | a külső fél 19 programja (7 program adapted-v3 fixtúrával) | **17/19 MEGFELEL · 2 nevezett ENV-KIHAGYÁS helyettessel** (a történeti r57/r59: a battéria egy hívásban a 15 s-os gyermek-korlát fölött — időtúllépés, mérve; az r57 három T-esete R63 szabályváltás miatt bukik, MÉRT okkal/predikátummal, az adaptált r57a mind a kilencet zölden futtatja) · kilépés 0 · 24 perc 44 mp. **Amit ez a kör a láncon javított:** öt burkoló (r67 · r69 · r75 · r85 · r88) még a történeti fájlt hívta kézzel — most a feloldón át; a külső programok egység-darabszáma EGY otthonból (18, mérve — a kilences bontás túllépte a költségvetést); a szabályváltás miatt bukó történeti eseteket a manifest MÉRT alakon menti fel, nem deklarációval |
| `npm run verify:grant-paths` | GPR-01: 12 jogadási út, mindkét irányban + önpróba | **12/12 + 3/3 piros ellenpélda** |
| `npm run verify:kuka` | 190 tanulság, tiltó/pozitív minták (KUKA-199 új) | **324/324 PASS** |
| `npm run verify:sweep` | minden `verify:*` | «SWEEP» |

**Mit NEM bizonyít a több-folyamatos mérés (kimondva, a szerszám maga írja ki):** nem Postgres, nem
hálózati határ, nem kettőnél több író, nem terhelés — az **OB-1 nem zárult**, a szövege viszont
helyesbítve (6. szakasz). Az egyírós közbeiktatást továbbra sem nevezzük többfelhasználós bizonyítéknak;
ilyen a csomagban nincs.

## 5. A 14 elfogadási helyzet eredménye a rögzített commiton

| # | Helyzet | Ítélet | Böngésző-bizonyíték | Szerver/adatbázis-bizonyíték | Hiány / megjegyzés |
|---|---|---|---|---|---|
| H01 | Egyszerű magánfiók céges adatbekérés nélkül létrejön; csak saját adata… | **bizonyítva** | 4 tétel — A regisztrációs űrlap mezői: email, password — céges adatot (adószám, cégnév) nem kér; a megerősítő hivatkozás… | 3 tétel — POST /api/workspaces → 201; business=null; role=admin; plan=starter… | A minta-rekordok minden munkakörnyezetben azonos tartalmúak (qty 12), ezért a „saját adat" azonosságát nem a tartalom, hanem a munkamenet könyve és az idegen könyv-paraméter figyelmen kívül hagyása bizonyítja; a terv-különbség (sa… |
| H02 | A meglévő magánfiók alkalmazotti meghívót elfogad; saját jelszava, sze… | **bizonyítva** | 3 tétel — Béla (meglévő, belépett fiók) megnyitja a meghívó hivatkozását: a lap „redeem_as_existing"-t mutat, a következ… | 2 tétel — POST /api/invites/redeem → 200; shape=membership_only, outcome=granted, read_scope_granted=null — a beváltás C… | A második faktor a magban nem létező fogalom (nincs mit törölni); a „személyes adat" itt az e-mail azonosító sora és az alany fajtája.… |
| H03 | A fiókhoz adószámos működési minőség társul; a magán- és üzleti kör ne… | **bizonyítva** | 2 tétel — Magántér: „Létrejött: Anna magántere (ws_c34d95e7) · terv: starter" · Céges: „Létrejött: Anna Kft (ws_caf41202… | 2 tétel — POST /api/workspaces (céges) → business: {"ok":true,"book_id":"ws_caf41202","entity_subject_id":"ent_ws_caf412… | A vállalkozási minőség önbevallott (verification: none_available) — hatósági igazoló adapter a magban ma nincs, és ezt a válasz és a lap egyaránt kimondja.… |
| H04 | Saját családi munkakörnyezet indul; második tagot meghívhat a jogosult… | **bizonyítva** | 3 tétel — Anna a felületen indítja a családi munkakörnyezetet: „Létrejött: Családi Kft (ws_5690a9df) · terv: starter · v… | 5 tétel — POST /api/workspaces → 201; business.verification=none_available (állami igazolási kör NEM futott, nem is kért… | A második tag a HELYI körbe kerül (tagság a családi könyvben); adatot a tagság önmagában nem ad — azt az admin külön adatkör-adása nyitja (H07).… |
| H05 | Azonos beírt cégazonosítóval más jelentkező nem kapja meg e munkakörny… | **bizonyítva** | 1 tétel — Cili UGYANAZT a HU adószámot írja be, mint Anna és a harmadik szolgáltató: „Létrejött: Cili Kft (ws_9c62cb29) … | 3 tétel — POST /api/workspaces (Cili, azonos adószám) → 201; business.ok=true, value_norm=05345678242… | Nincs globális cégnév-/adószám-lefoglalás: az azonos karaktersor három független jogalanyon áll, egyik sem nyit a másik könyvére.… |
| H06 | Továbbadható körön túli meghívás/jogadás elutasított. Lejárt, visszavo… | részben | 5 tétel — A meghívó szerep-választója CSAK a zárt regiszter szerepeit kínálja: [user, admin]… | 6 tétel — KÖRÖN TÚLI meghívás: role=owner → 403 outside_basis_roles, plafon={"operations":["invite_issue"],"roles":["adm… | LEJÁRT meghívó a böngészőből nem hajtható meg: a héjnak nincs óra-állító végpontja, és a próba a mag íróit nem hívja (nem gyárt lejárt sort) — a lejárat mag-bizonyítéka: `P-INVITE-window` (v3ref/run.mjs, valódi idő-összehasonlítás… |
| H07 | A raktári szerepnek adott mennyiségnézetből ár-, számla- vagy beszállí… | **bizonyítva** | 3 tétel — Béla (raktári user) készlet-nézete az adatkör-adás ELŐTT: „ELUTASÍTVA — melyik kapu: right · ok: not_available… | 2 tétel — GET /api/data/stock → ok=true, a kiadott mezők: [qty] (ár NINCS benne); GET /api/data/price → ok=false, refuse… | A magreferencia adatkör-szótára KÉT tagú (keszlet · arak): „számla" és „beszállítói" adatkör a rendszerben nem létezik, ezért azokra a helyzet tartalmilag üres — a kimondott elv (mennyiségből ár nem következik) a létező két körön … |
| H08 | Cégváltáskor a session-kontextus, válaszok és klienscache nem keverik … | **bizonyítva** | 3 tétel — Anna a saját pro cégében (fejléc „Anna Kft · admin · pro"): ár-nézet „KIADVA"… | 3 tétel — MÓDOSÍTOTT PARAMÉTER a magánteres munkamenetben: ár ?book_id=<saját pro cég> → param_ignored=true [book_id], o… | A kliensnek nincs saját gyorsítótára: minden panel a váltás pillanatában ürül, és minden válasz `Cache-Control: no-store`; a cselekvő és a könyv KIZÁRÓLAG a szerveroldali munkamenetből jön, a kliens-mezők NEVEZETTEN figyelmen kívü… |
| H09 | Megvonás/lejárat után új kérés és függő meghívó nem használhatja a meg… | részben | 5 tétel — Kiindulás: Cili admin a családi könyvben (fejléc „Családi Kft · admin · starter"), készlet-nézete „ELUTASÍTVA … | 3 tétel — Cili: GET /api/data/stock → ok=false not_a_member/membership_revoked; váltás a családi könyvre → 403 not_a_mem… | A MEGVONÁS ága teljesen bizonyítva (új kérés · függő meghívó · független jog). A LEJÁRAT ága a héjból nem hajtható meg: az alap `expires_at`-ját és a meghívó lejáratát a héj nem állítja, a próba a mag íróit nem hívja — mag-bizonyí… |
| H10 | Két szervezeti egység és korlátozott helyi admin példája: a vezető nem… | **bizonyítva** | 1 tétel — A egység: Anna admin; B egység: Béla admin (a „vezető"); Cili az A egység HELYI adminja (fejléc „A egység · ad… | 4 tétel — A vezető (Béla) váltása az A egységre → 403 not_a_member/no_membership; /api/me könyvei: B egység — NEM kap au… | KÖZÖS JÓVÁHAGYÁS: TÉNYLEGES HIÁNY — a mag egyetlen műveletet sem köt két személy egyetértéséhez (mérve: 0 találat a forrásban, nincs ilyen végpont); minden jogváltoztatás egyetlen jogosult cselekvő döntése, alappal. A plafon ebben… |
| H11 | Előfizetésileg elérhető funkcióhoz jogosulatlan munkatárs nem jut; jog… | **bizonyítva** | 2 tétel — STARTER terven: Anna (admin, arak adatkörrel) ár-nézete: „ELUTASÍTVA — melyik kapu: entitlement · előfizetés-k… | 2 tétel — Anna price → refused_by=entitlement (feature_not_in_plan, terv starter) — a JOG megvan, az ELŐFIZETÉS zár; Bél… | Tesztprofil: a tervek a kódban zárt szótár (starter · pro), a profil az `entitlement_profile` táblában áll; fizetési integráció nincs, nem is kell — a két kapu (jog · előfizetés) külön mér és külön jelent. MÉRT LELET (a héj szöveg… |
| H12 | Két joghatósági azonosítónévtér azonos karaktersora nem téves azonossá… | **bizonyítva** | 1 tétel — Anna HU joghatósággal: „Létrejött: Anna HU (ws_4fe8e888) · terv: starter · vállalkozási minőség: HU 1234567824… | 3 tétel — Cili ismeretlen országprofillal (XX) → 201; business: profile_known=false, jurisdiction=XX, verification=none_… | Az azonosság kulcsa a teljes négyes (névtér · joghatóság · kibocsátó · érték), nem a puszta szöveg; az ismeretlen profil ugyanazt a szerkezetet példányosítja (representation_from_identifier: false · own_work_allowed: true), csak „… |
| H13 | Kezdő jogosultság, alap nélküli történeti sor, szabályos új felhatalma… | nem böngészőben | 1 tétel — A felületen nincs bírálati / hatásköri vezérlő: a lap hat szakasza fiók · munkakörnyezet · munkatársak · adato… | 1 tétel — A héjban nincs bírálati végpont (mérve): /api/adjudicate → 404 unknown_endpoint; /api/claims → 404 unknown_end… | A négy külön eredmény (kezdő jog · alap nélküli történeti sor · szabályos új felhatalmazás · jogosulatlan bírálói önfeljogosítás) a magban mérve áll: `P-CORE-startup-and-delegation` (e) — a helyi admin az indulási alapra hivatkozv… |
| H14 | Két valódi kapcsolat meghívóbeváltási és megvonás–véglegesítési versen… | nem böngészőben | 1 tétel — A böngésző-próba EGY szerver-folyamattal beszél, amely EGY tároló-kapcsolatot tart: két VALÓDI, külön OS-folya… | 1 tétel — A többkapcsolatos bizonyíték szerszáma a repóban áll (mérve): tools/v3_multiconn_proof.mjs létezik=true; packa… | Bizonyíték: `npm run proof:multiconn` (tools/v3_multiconn_proof.mjs, MCN-01) — két külön gyermek-folyamat, saját `openStoreAt` kapcsolattal, WAL-naplón: (1) ugyanazt a meghívót egyszerre váltják be → pontosan EGY tagság, a vesztes… |

A teljes bizonyíték-szöveg soronként (böngésző · szerver külön): `docs/70_PLANNING/V3_R64_ELFOGADAS_HELYZETEK.json` (saját futás, 2026-09-20; a generált másolat a `var/reports` alatt). **Ítéletek: 10 bizonyítva · 2 részben (H06, H09: a LEJÁRT ág a héjból nem hajtható meg — mag-bizonyíték `P-INVITE-window`) · 2 nem böngészőben (H13 mag-próba, H14 `proof:multiconn`).** A tábla az ellenséges felülvizsgálat UTÁNI, javított futás eredménye (27/27); a felülvizsgálat leletei és javításai az 5/b. szakaszban.

**Közös jóváhagyás (10. helyzet):** a magban NINCS kétszemélyes jóváhagyás — mérve: a `v3ref/`
egyetlen írója sem kér második jóváhagyót; ez **tényleges hiány**, nem beállítás kérdése, és a
lezárási listán áll.

## 5/b. Ellenséges felülvizsgálat a 14 helyzeten — mit talált, mit javítottunk, mi maradt

Tizennégy független szkeptikus (egy helyzet — egy ügynök) kapta a feladatot, hogy **cáfolja** a
bizonyítékot: kód-olvasással és saját kis próbákkal (a battéria és a külső lánc futtatása tiltva volt).
Eredmény: 7 helyzetet „cáfoltnak" jelöltek — **egyik sem a mag jogosultsági döntését** döntötte meg
(adat idegen kézbe egyetlen úton sem került), hanem a BIZONYÍTÉK alakját, a képernyő ígéretét, vagy egy
R63-ban kimondott, de meg nem épített részszabályt. **Ugyanebben a körben javítva, saját próbával:**

| Lelet (helyzet) | Mi volt | Javítás | Gépi jel |
|---|---|---|---|
| **beváltáskori érvényesség** (H09) | a beváltás csak a KIADÁSKORI alaphoz mért; a közben visszavont delegálási alapon kiadott meghívó beváltható maradt, amíg a kiadó tagsága élt — az R63 §4 „beváltáskori aktuális érvényesség kötelező" mondata dísz volt (KUKA-024) | `redemptionLimitGate` a MAI napra is mér: `basis_not_in_effect_at_redemption`; új alap-verzióval a következő meghívó megint működik (pozitív ellenpár) | P-CORE (d) · **M206** |
| **halott meghívó a lapon** (H06 · H09) | a megfigyelés a kiadó mai jogát nem mérte: a megvont admin függő meghívójára a lap „jelentkezz be, és a meghívás folytatódik"-ot ígért, gombbal, amit a beváltás rögtön elutasított (KUKA-064) | `observeInvite` ugyanazt a feloldót hívja, mint a beváltás: `not_actionable` / `issuer_right_withdrawn`, gomb nélkül | P-CORE (d) · **M207** · e2e H06/H09 |
| **„adatkör-plafon" felirat** (H06 · H07) | a képernyő és a levél plafont ígért a meghívó adatkörére, a gép az alap teljes korlátját vitte át — a pipa dísz volt (KUKA-015/041). MÉRTÜK a szűkítő alakot is: a pecsét szerepére/adatkörére szűkített átvitel a delegálási láncot törte volna | a felirat a valóságot mondja: „a meghívás tárgya — a jogot beváltás után külön adod meg"; a cél tag átvitt plafonja a jogadásnál is kapu (`outside_transferred_limit`) | delegation.mjs · e2e |
| **kiadás az előfizetés-kapu előtt** (H11) | az ár-nézet ELŐBB olvasta ki a mintát (a mag kiadásként könyvelte), és csak utána kérdezte az előfizetést | a jog-kapu kiadás NÉLKÜL mérve (`scopeReleaseDecision`), kiadás csak ha mindkét kapu enged | selfcheck · e2e H11 |
| **ismeretlen terv / üres adószám → 500** (H11 · H03) | a létrehozás bejáratán az ismeretlen terv és az üres adószám programhibaként (500) jelent meg | nevezett 400: `unknown_plan` · `tax_id_value_required` | selfcheck · e2e |
| **a vállalkozási minőségnek nem volt olvasója** (H03) | `businessIdentityOf` importálva, de egyetlen végpont sem hívta (KUKA-015) | a `/api/me` minden könyv mellett hozza (névtér · joghatóság · igazolás) | e2e H03 |
| **váltási verseny a kliensen** (H08) | egy lassú adat-válasz a már átváltott cég paneljébe írhatta a régi cég adatát; egy második lap a nyitáskori céget mutatta | generáció-őr az adat-gombokon + a fejléc frissítése minden adat-kérés előtt | app.js · e2e H08 |
| **tiltó felsorolás a kliens-mezőkre** (H08, KUKA-057) | nyolc írásmód volt felsorolva; más írásmód (`bookId`, `tenant_id`) némán maradt | MEGENGEDŐ szabály: minden végpont kimondja, mit fogad, minden más `param_ignored` | server.mjs · e2e H08 |
| **egyoldalú sorrend a mérőben** (H14) | nyugodt gépen a megvonás mindig előbb ért célba; a „parancs előbb" ág mérése elmaradt, a szerszám mégis zöldet adott (KUKA-054/093) | mindkét sorrend KÖTELEZŐ (különben HIÁNYOS MÉRÉS, kilépés 3); a megvonó munkás páros menetekben 1–5 ms lépcsőt kap — a fixtúra időzítése, nem a mag | proof:multiconn (12/8 sorrend, 40/40) |
| **ismeretlen joghatóság két írásmódon** (H12) | `''` → `unknown`, `'unknown'` → `UNKNOWN` | egy írásmód: `UNKNOWN` (KUKA-029) | externalId.mjs |

**Amit a szkeptikusok találtak, és NEM javítottunk — nevesítve:** a `/dev/mailbox` globális, hitelesítés
nélküli (fejlesztői fogadó, a lap és az útmutató kimondja — élesben nem létezhet) · a delegálási plafon
részhalmaz-mérése üres bizonyíték, mert a zárt regiszter kéttagú és az indulási szabály teljes — a
szűkülő lánc csak nagyobb regiszterrel mérhető (L2/L10) · a `recordAuthorityBasis` nyers írónak nincs
eljáró-kapuja (a mag hatóköre; a héj nem hív ilyet — `later_adapter_surface`) · a H02 „más céges jogai
változatlanok" a böngésző-próbában üres alapsokaságon állt (a mag-szintű saját próba zárta: a beváltás
csak a cél-könyv tagságát írja) · a H07 „számla · beszállítói" adatosztály a kéttagú szótárban nem létezik
— ott a helyes szó „nincs alkalmazható eset", és a lap ezt kimondja · H13 négy eredménye a magban áll, a
héjból nem mérhető (nincs bírálati végpont) · a szkeptikusok maguk sem futtatták a battériát — a
cáfolatok kód-olvasásból és kis próbákból jöttek; a végső bizonyíték az itt felsorolt gépi jelek zöldje.

**Nincs új KUKA-bejegyzés ezekre, kimondva:** a leletek a meglévő osztályokba esnek (KUKA-024 a két
időpontra · KUKA-015/041 a díszfeliratra · KUKA-064 a zsákutcára · KUKA-057 a tiltó felsorolásra ·
KUKA-054/093 a mérő egyoldalúságára); a KUKA-199 marad az egyetlen új tanulság.

## 6. Az eltéréslista (R63 §5.1) és a helyesbített OB-szövegek

A gépi alak: **`docs/70_PLANNING/V3_R64_CORE_ELTERESLISTA_LELTAR.json`** — 87 sor (élethelyzet 22 · K 19 · OB 10 · G 8 · USE 4 · QNT 24) + 3 regiszteren kívüli követelmény; blokkolás: első core-folyamat **0** · mini-modul közös alap 16 · későbbi üzemi használat 52 · semmit 19. **Kimondva:** az élethelyzet-, K- és OB-sorokat három független olvasó írta forrás-kötéssel; a G/USE/QNT sorokat a sáv (egyszerzős, gyengébb — KUKA-033).
Minden sor: mi működik ma · forrás és bizonyíték · mi hiányzik · mit blokkol (első core-folyamat /
mini-modul közös alap / későbbi üzemi használat / semmit) · mi zárja le. **A 29 klauzula nem a teljes
leltár:** a teljességi kritika — NEM FUTOTT (a futtatási keret kimerült): a sáv három sort írt az R63 §4–§5.2 kimondott határaiból; az A01–A18 tételes egyeztetése nevezett hiány, a következő kör első tétele — olyan követelményt talált, ami még nem volt a regiszterben — ezek
a JSON `missing_requirements` blokkjában állnak, ugyanazzal a mezőkészlettel.

**Helyesbített OB-szövegek (ugyanebben a munkában, nem külön körben — KUKA-050):**
- **OB-1:** a régi „minden határ-mérésünk determinisztikus közbeiktatás" állítás ma nem igaz — a
  MCN-01 két valódi folyamaton mér; ami nem áll: Postgres, hálózat, >2 író, terhelés. Nyitva.
- **OB-6:** a régi „a modell nincs" állítás ma nem igaz — a saját kör alapja (WSP-01) és a delegált
  alap (DLG-01) nevezett, verziózott, hatályos; ami nem áll: ORG-N3, a szervezet KÉPVISELETE. Nyitva.
- **USE-G1:** a „egyetlen folyamaton, egyetlen írón mérve" mondat a két-folyamatos mérésre
  frissítve; a kapu zárva marad.
- **OB-3:** R63 óta VAN külső határ (a v3app HTTP-rétege), de a séma ott nem kapuz — a „nincs külső határ" mondat elavult (inputSchema.mjs is javítva). Nyitva, L7.
- **OB-5:** a számok elévültek: 15 megvonási klauzula, tíznek van deklarált próbája, öt nyitott (REV-N1c · N3d · N3e · N4a · N4b). Nyitva, L8.
- **OB-7:** a külső fél klauzula-szintű döntés-sorai külön tengelyen állnak — a mondat ezt eddig elhallgatta. Nyitva.
- **OB-8 (lezárt) guard:** a kézzel léptetett „28 támadás" helyett a mért alak. · **OB-9 (lezárt) residual:** „három nyitott" → egy nyitott (K10-TYP-e), kettő részleges.
- **ORG-N2 szabály-szöveg:** „ideiglenes alapértelmezés, amíg a modell nincs" → tervezett szabály, a delegált alap következménye; a képviseleti kivétel (ORG-N3) marad nyitva.

## 7. AZ EGYETLEN CORE-LEZÁRÁSI LISTA — az eredeti normákhoz kötve

| # | Maradék | Eredeti norma / klauzula | Mit blokkol | Következő szükséges munka | Lezárási feltétel |
|---|---|---|---|---|---|
| L1 | Több-írós véglegesítési határ Postgres (vagy egyenértékű) tárolón | OB-1 · USE-G1 · K14 | üzemi használat | a tároló-réteg (Postgres) + a MCN-01 ugyanazon a mérőn | 2 valódi kapcsolat, sor-zár/verzió-őr, a MCN-01 három forgatókönyve zöld |
| L2 | A szervezet KÉPVISELETE (jogi személy nevében eljárás) | ORG-N3 · OB-6 · R63 §4 | mini-modul közös alap (ahol a modul képviseletet igényel) | képviseleti alap cserélhető darabként (külső tanú · okirat · országprofil-adapter), próbával | nevezett képviseleti alap + próba; nem regisztrációs akadály |
| L3 | Közös (kétszemélyes) jóváhagyás | R63 §5.3/10 | későbbi üzemi használat | döntés: kell-e a core-ba; ha igen, második jóváhagyó mint saját esemény | próba két jóváhagyóval, egy hiányzóval piros |
| L4 | Valódi levélküldés (szolgáltató, kézbesítés-tanú) | K03 · R63 §5.2 | üzemi használat | a fejlesztői fogadó mögé valódi csatorna, kimondott kapuval | egy valódi kézbesítés mérve; a csomag továbbra sem küld külső személynek engedély nélkül |
| L5 | Országprofil-adapterek hivatalos műveletekhez | K01 · R63 §7 | későbbi üzemi használat országonként | profilonként ellenőrzött adapter | adapter-próba; a hiány ma nem tilt saját munkát |
| L6 | QNT — mennyiség-bizonytalanság (R19 PLAN 24 követelmény / 36 eset) | K10-TYP-e · USE-G3 | későbbi üzemi használat (készlet-modul) | a QNT csomag; a megfigyelés mint hatásmentes esemény | a 24 követelmény próbával; a becslés nem válik méréssé |
| L7 | A bemeneti séma KÜLSŐ határon (HTTP) kapuz | OB-3 · BEJ-01 | mini-modul közös alap | a v3app végpontjain a BEM-01 séma kapuzása, idegen beadóval mérve | próba idegen mezővel a HTTP-határon: nevezett elutasítás |
| L8 | A megvonás visszamenőleges hatályának teljes klauzula-készlete | OB-5 · REV-N* | core-core lezárás (req-5) | a hiányzó REV-klauzulák próbái a rögzített sorrendben | mind a 13 klauzula deklarált állítású próbával |
| L9 | A kötelező bizonyíték-készlet (req-4 → req-5) | ORG-N1a · ORG-N1b | core-core lezárás | a mutációs battéria falszifikációs eredményei a két klauzulára | `verify:v3ref` „KÖTELEZŐ BIZONYÍTÉK" sora `covered` |
| L10 | A01–A18 elfogadási esetek tételes egyeztetése ezzel a leltárral (a teljességi kritika nem futott) | R32 A01–A18 · R63 §5.1 | mini-modul közös alap | a kritika lefuttatása, a hiányzó sorok felvétele | minden A-eset sorral vagy nevezett hiánnyal |
| L11 | A „személyes kör" nevesített állapota a váltóban (könyv nélküli magánfiók saját iratai) | R63 §3 EH-1 | mini-modul közös alap | nevezett személyes cél a váltóban vagy saját alap-könyv | selfcheck/e2e lépés |

**Elfogadott korábbi munka nem tűnt el:** az R57–R62 leltár és a 16 elfogadott egész klauzula
változatlan; az R63 §4 szerint az alap-kötelezettség most a kódban áll, a történeti sorok megmaradtak.

## 8. Világos állítás — a három dolog nem szinonima

- **Az ELSŐ UX elkészült:** a §5.2 lánc böngészőben végigjárható, szerveroldali döntéssel és tárolással,
  szintetikus mintarekordon. **Igen.**
- **A mini-modulok KÖZÖS ALAPJA elkészült:** **RÉSZBEN.** Megvan: fiók · csatorna · saját kör alapja ·
  delegált alap · külön adatköri jogadás · két kapu · névterezett azonosító · többkapcsolatos tároló.
  Hiányzik a közös alapból: L2 (képviselet), L7 (séma a HTTP-határon), L3 döntése.
- **Üzemi használat bizonyítva:** **NEM.** L1, L4, L5 nélkül nem állítható; a nagyvállalati skálát és
  minden ország megfelelőségét néhány példa nem bizonyítja.

## 9. A mini-modulok igényfelmérésének / UX-egyeztetésének belépési feltétele — végesen

A közös alapból levezetve, **pontosan ennyi**: (1) L7 zárva (a mag sémája a HTTP-határon kapuz,
idegen beadóval mérve); (2) L2 **döntése** megvan — nem a teljes képviseleti modell, hanem az, hogy
melyik modul igényel képviseletet és melyik nem (ami nem igényel, az indulhat); (3) a 14 helyzet
mindegyike vagy zöld, vagy nevesített hiány, saját futással; (4) a független ellenőrzés (chatgpt-v3)
elfogadta ezt a lapot. **Amit NEM teszünk a kapu elé:** globális országadapterek (L5), Postgres-határ
(L1), valódi levélküldés (L4) — ezek üzemi feltételek, nem az igényfelmérés feltételei. **És amit nem
halasztunk „majd a modul megoldja" felirattal:** a közös biztonsági alap (jog · alap · kapu) a magban
marad, modul nem írhatja felül.

## 10. Amit ez a kör NEM csinált — kimondva

- Nem futott mutációs ellenpélda a MCN-01 mérő piros útjára (a szerszám HIBA/ELAKADT/NEM VERSENGETT
  ágai megvannak, szándékos mag-rontással nem lettek megtüzeltetve) — nevesített függő.
- A bolti pult / üzleti modul semmilyen alakban nem épült; a mintarekord jelölten szintetikus.
- Élő adatot nem migráltunk; alap nélküli történeti sorokat nem töltöttünk fel.
- A §5.3/13 négy eredménye (kezdő jog · alap nélküli történeti sor · szabályos új felhatalmazás ·
  jogosulatlan bírálói önfeljogosítás) a MAG szintjén mért (P-CORE (e), P-ORG-adjudication-basis-limit),
  a böngészőben nem — a próba-alkalmazásnak nincs bírálati végpontja, és ezt a helyzet-tábla kimondja.

## 11. Gépi jelek, parancsok, döntés

- Döntésnapló: **D-VS-3065** (a modellváltás mérve · az R63 §4 alapértelmezés kódban · KUKA-199 · az
  OB-szövegek helyesbítése · a lezárási lista otthona).
- Új tanulság: **KUKA-199** (a plafon nem jog). A többi hiba ebben a körben a meglévő osztályokba esett
  (KUKA-050 szöveg-elévülés az OB-listán; KUKA-187 WRONG_CATCHER a P-CORE első mutációs futásán —
  javítva: a lánc első lépésének bukása állítás-bukás, nem kivétel).
- Board: ez a lap és az útmutató a Dokumentumok fülön, R64 kör, a `CMD-VS-300-002-002` alatt.
