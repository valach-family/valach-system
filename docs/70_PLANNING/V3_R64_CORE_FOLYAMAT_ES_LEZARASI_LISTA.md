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
`npm install --include=dev`). A böngésző-próba eredménye JSON-ban: «E2E_JSON».

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
| `npm run verify:v3ref` (mutációs battéria) | 202 mutáció (M204–M205 új; M196–M203 az R63 magjára) | «BATTERY» |
| `npm run app:selfcheck` | a teljes lánc a valódi végpontokon | **57/57 PASS** |
| `npm run proof:core-ux` (Playwright) | a lánc böngészőben + a 14 helyzet, böngésző- és szerver-bizonyíték külön | «E2E» |
| `npm run proof:multiconn` (MCN-01) | OB-1: KÉT valódi folyamat — meghívó-beváltás versenye · megvonás ↔ véglegesítés · visszajátszás | **40/40 OK** (20+20 menet; mindkét sorrend előfordult; a vesztes nevezett elutasítást kapott; a megvont jog visszajátszással nem tér vissza) |
| `npm run verify:external-checks` | a külső fél 19 programja (7 program adapted-v3 fixtúrával) | «EXT» |
| `npm run verify:grant-paths` | GPR-01: 12 jogadási út, mindkét irányban + önpróba | **12/12 + 3/3 piros ellenpélda** |
| `npm run verify:kuka` | 190 tanulság, tiltó/pozitív minták (KUKA-199 új) | **324/324 PASS** |
| `npm run verify:sweep` | minden `verify:*` | «SWEEP» |

**Mit NEM bizonyít a több-folyamatos mérés (kimondva, a szerszám maga írja ki):** nem Postgres, nem
hálózati határ, nem kettőnél több író, nem terhelés — az **OB-1 nem zárult**, a szövege viszont
helyesbítve (6. szakasz). Az egyírós közbeiktatást továbbra sem nevezzük többfelhasználós bizonyítéknak;
ilyen a csomagban nincs.

## 5. A 14 elfogadási helyzet eredménye a rögzített commiton

«H14_TABLE»

**Közös jóváhagyás (10. helyzet):** a magban NINCS kétszemélyes jóváhagyás — mérve: a `v3ref/`
egyetlen írója sem kér második jóváhagyót; ez **tényleges hiány**, nem beállítás kérdése, és a
lezárási listán áll.

## 6. Az eltéréslista (R63 §5.1) és a helyesbített OB-szövegek

A gépi alak: **`docs/70_PLANNING/V3_R64_CORE_ELTERESLISTA_LELTAR.json`** — «GAP_SUMMARY».
Minden sor: mi működik ma · forrás és bizonyíték · mi hiányzik · mit blokkol (első core-folyamat /
mini-modul közös alap / későbbi üzemi használat / semmit) · mi zárja le. **A 29 klauzula nem a teljes
leltár:** a teljességi kritika «CRIT_N» olyan követelményt talált, ami még nem volt a regiszterben — ezek
a JSON `missing_requirements` blokkjában állnak, ugyanazzal a mezőkészlettel.

**Helyesbített OB-szövegek (ugyanebben a munkában, nem külön körben — KUKA-050):**
- **OB-1:** a régi „minden határ-mérésünk determinisztikus közbeiktatás" állítás ma nem igaz — a
  MCN-01 két valódi folyamaton mér; ami nem áll: Postgres, hálózat, >2 író, terhelés. Nyitva.
- **OB-6:** a régi „a modell nincs" állítás ma nem igaz — a saját kör alapja (WSP-01) és a delegált
  alap (DLG-01) nevezett, verziózott, hatályos; ami nem áll: ORG-N3, a szervezet KÉPVISELETE. Nyitva.
- **USE-G1:** a „egyetlen folyamaton, egyetlen írón mérve" mondat a két-folyamatos mérésre
  frissítve; a kapu zárva marad.
«OB_MORE»

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
«GAP_ROWS»

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
