# V3 · R166 — JELENTÉS

**Kör:** `CMD-VS-300-002-002 R166 — DECISION` (chatgpt-v3, az operátor felhatalmazásával)
**Sáv:** Claude-v3 · **Ág:** `claude/cmd-vs-300-002-002-r166-x7rrk4` (a PR #1 fejére épülve)
**Dátum:** 2026-10-07

Ez a lap az R166 **egyetlen** jelentése. Az átadási checkpoint (`V3_R166_ATADAS_CHECKPOINT.md`) a
RÉGI munkamenet zárása volt; ez a lap az ÚJ munkamenet eredménye.

---

## 1. AZ ÖSSZVERDIKT — KIMONDVA

| | |
|---|---|
| **Kód-SHA (a csomag feje)** | lásd a lap alján: `git log -1` ezen az ágon |
| **A review által FEDETT SHA** | `6110c87` — a LEGUTÓBBI átolvasás eddig jutott (ez adta a 2.8 három leletét; a `0aea8eb` a 2.7-et, a `d570f54` a 2.4–2.5-öt, a `3747c12` a 2.1–2.3-at). Az azóta született munka — maguk a **javítások** — **NEM fedett**: a mai fejre nincs független review-bizonyíték. |
| **R166 §0 átadás** | **KÉSZ** — a checkpoint ellenőrizve, a régi író leállt, a munka a PR aktuális fejére épült (force-push nélkül) |
| **R166/P1 (a nyitott review-szál)** | **KÉSZ és MÉRVE** — `D-VS-3201` · `KUKA-393` |
| **A 3747c12 fejre jött ÚJ P2** | **KÉSZ és MÉRVE** — a titok-tisztító határa (`D-VS-3203` · `KUKA-395`); lásd a 2.1 pontot |
| **A 6110c87 fejre jött HÁROM TOVÁBBI P2** | **KÉSZ és MÉRVE** — mind a három a SAJÁT javításaim **ŐRE** felett: a titok-rejtés séma-készlete beírt névsorból jött (a `socket:` cím a jelszóval **betűre változatlanul** ment át), az általánosnak nevezett őröm **egy függvényre** volt általános és **betű szerint** keresett (négy TOVÁBBI útmutató maradt deklaráció nélkül), és a mérce azt kérdezte, hogy a kért azonosító **megvan-e**, nem azt, hogy **más is** (`D-VS-3209` · `KUKA-414` · `KUKA-415`); lásd a 2.8 pontot |
| **A 0aea8eb fejre jött NÉGY TOVÁBBI P2** | **KÉSZ és MÉRVE** — **kettő a SAJÁT korábbi javításom következménye**: shell-nyelvtant alkalmaztam egy URL-re (új szivárgás), és a mérés saját adatbázisa kimaradt a takarításból; plusz a fájlnév-egyezés elnémította a tartalom-ellenőrzést, és a tábla-útmutatók üres lapra vittek (`D-VS-3208` · `KUKA-410`…`413`); lásd a 2.7 pontot |
| **A d570f54 fejre jött ÖT TOVÁBBI P2** | **KÉSZ és MÉRVE** — három osztály: a szomszéd passzus ugyanazon a téves feltevésen állt (a kapcsolati cím elrejtése szivárgott), a próba a SAJÁT kimondott hiányát nem számolta be a verdiktbe (két helyen), és a nemleges ág romot hagyott, a bemutató pedig elnavigált a céljától — **a saját bejáróm pedig átlépett a kattintás felett** (`D-VS-3207` · `KUKA-404`…`408`); lásd a 2.5 pontot |
| **A d570f54 fejre jött NÉGY TOVÁBBI P2** | **KÉSZ és MÉRVE** — egy osztály négy helyen: a jog-kérdésre kiadást hívtam (a súgó megnyitása hamis audit-sort írt), a bukott ellenőrző kérdés „nincs ott"-ra fordult, a `socket:` séma bekötése az INDULÁSBÓL kimaradt, és a megszakítás a leváló gyereknek nem szólt (`D-VS-3206` · `KUKA-400`…`403`); lásd a 2.4 pontot |
| **A feltolt fejre jött NEGYEDIK P2** | **KÉSZ és MÉRVE** — a takarító kapcsoló a puszta igaz-értéken állt, és a szabály MÁR MEGVOLT (R164), csak nem szabályként; a javítás közben a SAJÁT battériámban találtam három ütköző pin-azonosítót (`D-VS-3205` · `KUKA-398` · `KUKA-399`); lásd a 2.3 pontot |
| **A 3747c12 fejre jött TOVÁBBI HÁROM P2** | **KÉSZ és MÉRVE** — mind a három a SAJÁT, ebben a körben épített munkám felett: a szerver-oldali folytatás a visszalépés után, és két végigvihetetlenül felkínált útmutató-csoport (`D-VS-3204` · `KUKA-396` · `KUKA-397`); lásd a 2.2 pontot |
| **R166 §1 (meghívóképernyő)** | **KÉSZ és MÉRVE** — a böngészős mérés, ami eddig **bejárhatatlan** volt, lefutott |
| **R166 §3 (19 pótolható lefedési hiány)** | **KÉSZ** — elfogadási cél: pótolható **0** · osztályozatlan **0** (`LT2` ZÖLD); `D-VS-3202` · `KUKA-394` |
| **R166 §2 (valódi két szereplős bejárás)** | **NEM KÉSZÜLT EL** — átadva, lásd a 6. szakaszt. Nem állítom késznek |
| **R166 §4 (hat külső program)** | **NEM FUTOTT** — átadva, lásd a 6. szakaszt. A `verify:external-checks` továbbra is **NEM TELJES** |
| **R166 §5 (nevezett szöveghiba)** | **KÉSZ** — az `E4e` sor már javítva volt (a régi munkamenet elvégezte), és a kód ezt mondja (`E9b`: nem nulla kilépés → BUKÁS) |
| **Merge-készség** | **NEM.** Két parancs-pont nem készült el, a külső-ellenőrző lánc nem teljes, és a mai fejnek nincs független review-ja |

**MIÉRT NEM KÉSZÜLT EL MINDEN, ÉS EZ NEM KIFOGÁS, HANEM A SZABÁLY ALKALMAZÁSA.** A `D-VS-3083`
mérce szerint a fő-szál kontextusmediánja a csomag zárásánál **421 391,5** — a **VÁLTÁSI** sáv (a
jelző 400 000-nél). A szabály kimondja: a **futó** munkablokk célzott ellenőrzéssel lezárható, a
**következő önálló nagy blokk** pedig friss beszélgetésben induljon. A §2 (valódi bejárás a
felületen) és a §4 (hat hosszú program) MINDKETTŐ önálló nagy blokk. Ezért zártam a futót, és adom
át a kettőt — nem félkészen, hanem **el sem kezdve**, kimondva. *(A mérés menete és a két
pillanatkép a 9. szakaszban; a blokk nyitásakor a medián még a FIGYELMEZTETŐ sávban volt — a
szám a hat review-kör alatt fordult át.)*

---

## 2. R166/P1 — A NYITOTT REVIEW-SZÁL (az átvevő ELSŐ teendője)

A nyolcadik review-kör P1-je (`#discussion_r4207213198`): *„Strip node-postgres `db` overrides when
retargeting"*. A szálat **nem** zártam le „nem reprodukálható" címen.

**A MÉRÉS ELŐBB.** A kitűzött könyvtáron (`pg-connection-string` **2.14.1**) a **leírt eset nem áll
elő**: a hálózati sémán az út feltétel nélkül győz, mind a négy mért cím `original`-t adott. **A
mechanizmus viszont valódi, csak a `socket:` sémán** — és ott a kár **néma** volt:

| | RÉGI | ÚJ |
|---|---|---|
| `effectiveDatabase('socket:/var/run/postgresql?db=eles')` | **`var/run/postgresql`** (az ÚT!) | **`eles`** |
| `sameDatabase(…, 'eles')` → a biztonsági kapu | **ÁTENGED** → `DROP DATABASE "eles"` a **valódi** adatbázison | **MEGÁLL** |
| `withDatabase(…, friss_cél)` | az **ÚTAT** írja át (a socket-könyvtárat), a `?db=` érintetlen → az átirányítás nem irányít át | az **ÚT érintetlen**, a `?db=` kapja a nevet |

**A javítás egy otthonban:** `PG_URL_SHAPES` + `pgUrlShape` zárt listával, és mind a **négy** feloldó
(`effectiveDatabase` · `withDatabase` · `effectiveHost` · `cliEnvFor`) erre ágazik. Ahol a **két
fogyasztó** (node-postgres a kódban, libpq a `pg_dump`/`psql` gyermekben) **mást olvas**, a név
**nem megállapítható**. Ismeretlen sémán a `withDatabase` nevezett `TypeError`-ral megáll.

**A bizonyíték — ellenpár a KÁRRA, nem a listára:**

- `verify:app-findings-r154` **AJ csoport (aj1–aj8)**, a söprésben → a battéria **297/297 PASS** (a mai fejen újramérve);
- `proof:pg-restore-safety` **E10a–E10e**, VALÓDI kiszolgálón, Unix-socketen: a régi alak kapcsolata
  nem a friss célra ment · az új alak **a friss célra** ment · az **eredeti adatbázis érintetlen**
  (0 nyom) · a nyom **a friss célban** áll · a CLI-környezet a socket-könyvtárat kapja. A lánc
  **48/48** (volt 43/43); a socket-könyvtár a **kiszolgálótól** jött, nem tippből;
- **visszacsúszás-próba mérve:** a séma-sort és a divergencia-blokkot visszaállítva a battéria **11
  pinje piros**, köztük az `aj3` — a kapu újra átengedte volna a valódi adatbázist;
- a három pg-lánc **újramérve**: `proof:pg-intent` **10 állítás / 0 eltérés** ·
  `proof:pg-restore-safety` **48/48** · `proof:pg-durability` **13/13**, valódi PostgreSQL **16.15**-en.

**ÉS A SAJÁT PINJEIM NÉGY ÁLLÍTÁSÁT ÁT KELLETT ÍRNOM.** Az `r5` · `w1` · `y2` · `aa2` a `?dbname=`
**libpq-olvasatát** állította eldöntött névnek — ez **fél igazság** volt. Ma az **eltérést** állítják,
tehát erősebbek: a kapu **mindkét** névre megáll. A `KUKA-326` gépi jele is a mai alakra igazítva.

A szálra a PR-on **válaszoltam**, a mérésekkel együtt.

### 2.1 ÉS A FELTOLT FEJRE JÖTT EGY ÚJ P2 — MEGMÉRVE ÉS JAVÍTVA

A `3747c12` fejen induló biztonsági átolvasás egy **meg nem válaszolt P2**-t hozott elő, amit a
korábbi körök nem láttak (`#discussion_r4207550936`): a titok-tisztító (`redactConnStrings`) az
**escape-elt idézőjelet** nem fogyasztja el. **Nem hittem el — megmértem**, és a lelet **valódi**:

| bemenet | RÉGI kimenet |
|---|---|
| `PGPASSWORD='pa'\''ss' psql` | `PGPASSWORD=«elrejtve»''ss' psql` — a jelszó **maradéka kiszivárgott** |
| `PGPASSWORD='nyitva marad a sor vegeig` | **változatlan** — a *teljes* jelszó a naplóba |

A shell az aposztrófot tartalmazó jelszót **egy szónak** olvassa; a határt tehát nem egy
idézőjel-pár adja. A javítás a lelet saját javaslata szerint: a titkot a **megbízható szó-határig**
rejtjük el (`shellWordEnd`), és ahol a határ nem tudható (záratlan idézet), a **sor végéig** —
titoknál a bizonytalanság nem a megengedő ág.

**A bizonyíték:** `verify:app-findings-r154` **AK csoport (ak1–ak5)** a söprésben, az ellenpárokkal
együtt (a három megszokott alak továbbra is pontosan háromszor rejtőzik el, a titokmentes szöveg
változatlan) → a battéria **297/297**. **Visszacsúszás-próba mérve:** a három régi minta
visszaállítására **három pin piros**. A pg-láncok újramérve: `proof:pg-restore-safety` **48/48**
(E9e) · `proof:pg-intent` **10/0** · `proof:pg-durability` **13/13**.

**És a `KUKA-371` gépi jele a mai otthonra igazítva** — a jele egy kommentsorra mutatott, amit a
javítás elvitt; a szabály nem változott, csak erősebb lett. Rögzítve: `D-VS-3203` · `KUKA-395`.

---

### 2.2 ÉS JÖTT MÉG HÁROM P2 — A SAJÁT, EBBEN A KÖRBEN ÉPÍTETT MUNKÁM FELETT

A `3747c12` fejen lefutó átolvasás **három további P2**-t hozott elő, és mind a három **az ebben a
körben megépített funkciómra** mutatott. Egyiket sem hittem el szövegre: mindhármat **megmértem**,
és mind a három **valódi** volt.

**(1) A „vissza" csak a böngészőt ürítette.** A §1-ben megépített visszalépés a meghívó-jegyet a
közös böngésző-oldali elfelejtővel vitte el. A névtelen látogató jegyét viszont a kiszolgáló a
**munkamenethez kötve TÁROLJA**, és a belépés visszaolvassa: aki kimondottan elhagyta a meghívót,
majd belépett, azt a tárolt folytatás **visszavitte ugyanarra a meghívóra**. A „vissza" gomb tehát
nem vitt vissza. **És a saját lapom zöld volt rá** — mert csak a böngésző állapotát és a címsort
mérte, a tárolt sort nem kérdezte meg.
**A javítás:** az elfelejtés a **magban** él (`forgetIntent` — ott, ahol a sort írjuk és olvassuk),
és a felhasználó egy **nevezett úton** mondja ki (`POST /api/invites/pending/forget`, **törzs
nélkül**: jegyet nem fogad el, tehát más munkamenet folytatását nem lehet vele elvinni). A sorrend
szándékos: **előbb a tárolt állapot, utána a böngészőé** — ha a hálózat elvágja a kérést, a
felhasználó a meghívó-képernyőn marad, nem egy olyanon, ami azt ígéri, hogy elhagyta.
**Az ellenpár is mérve:** visszalépés **nélkül** a folytatás **továbbra is megmarad** — a szűkítés
nem vitt el mást.

**(2–3) A felkínálást a környezetre és a tagságra alapoztam, nem az élő feltételre.** A §3-ban
pótolt tizenkét útmutató közül **négy** feltételhez kötött célra áll: kettő a fejlesztői
levél-fogadóra, kettő a megnyíló készlet-táblára. Telepített környezetben a levél-fogadó **nincs**,
és akinek a készlet adatkörét nem adták ki, annak a lap a **megtagadó panelt** rajzolja — az
útmutató tehát a **második lépésén megszakadt volna**. A legrosszabb: a készlet-karton bevezetőjébe
**magam írtam be**, hogy engedélyhez kötött — egy felirat viszont **nem kapu** (`KUKA-221`). Ez
pontosan a `KUKA-391`, amit **ebben a körben idéztem**: amit nem lehet végigvinni, azt nem kínáljuk
fel.
**A javítás:** az útmutató **deklarálja** a feltételét, a tényt a **kiszolgáló méri** — a
levél-fogadót a kapcsoló állásából, a készlet-jogot **a mag válaszából**, vagyis **ugyanabból a
döntésből**, amit a lap kapuja is tükröz (`KUKA-233` — egy kérdés, egy válasz).

**A BIZONYÍTÉK, SORONKÉNT:**

| állítás | gépi jel | verdikt |
|---|---|---|
| a két kapu **mindkét irányban** zár és nyit, és CSAK a sajátjait zárja (a többi 18 útmutató betűre változatlan) | `verify:app-findings-r154` **AL csoport (al1–al4)** | **ZÖLD — 297/297** |
| az új út az állapotot **KÖTŐ** utak kimondott leltárában áll | ugyanott, `s11` — **ez fogta meg** | **ZÖLD** |
| a visszalépés UTÁNI belépés **nem visz vissza** a meghívóra | `test:e2e` → `v3app-r166-invite-leave` **M6** | **ZÖLD** |
| a tizenkét útmutató **élő bejárása** ott, ahol a feltételek teljesülnek | `verify:browser-gate` | **ZÖLD — 134/0/0/0** |

**VISSZACSÚSZÁS-PRÓBA MÉRVE, MIND A HÁROMRA:** a két kaput kivéve `al1`+`al2` **piros**; a törlő
hívást kivéve az **M6 piros**.

**ÉS AZ ŐR ELKAPTA A SAJÁT REGRESSZIÓMAT.** Az új végpont **fedetlenül** jelent meg a lefedési
mérésben (`LT2` piros: pótolható **1**, `LR1`: **1 ÚJ az alapvonalhoz képest**). Nem az őrt
gyengítettem és nem az alapvonalat írtam át: **kimondtam a kötést** — az út a meghívó-elfogadás
funkció **támogató olvasása** —, amire a mérés visszatért **33/33 fedett végpontra**, `LT2` és
`LR1` **ZÖLD**. A `LT` szándékosan piros marad: az a nevesített fejlesztési rést (`page:personal`)
is számolja, és **az eredeti őrt nem gyengítjük zöld eredményért**.

Rögzítve: `D-VS-3204` · `KUKA-396` · `KUKA-397`.

---

### 2.3 ÉS EGY NEGYEDIK P2 — AMI EGY RÉGI TANULSÁG MEG NEM TÖRTÉNT TERJEDÉSE VOLT

A negyedik lelet (`#discussion_r4211157857`) a tartósság-lánc **takarító kapcsolójára** mutatott:
a megtartás a **puszta igaz-értéken** állt (`if (process.env.VS_KEEP_RESTORE_TARGET)`). A
JavaScriptben minden nem üres szöveg igaz, ezért a **kikapcsolásnak szánt** `0` és `false`
is **bekapcsolta** a megtartást — a lánc futásonként egy generált adatbázist hagyott a kiszolgálón,
pontosan annál a futtatónál, aki a megtartást kikapcsolva állította be.

**ÉS A SZABÁLY MÁR MEGVOLT.** Pontosan ezt a hibát javította az **R164** a testvér-kapcsolón
(`VS_SAFETY_ALLOW_REMOTE`), ugyanebben a fájlban — de a **helyszínen** javította, nem szabályként.
A testvér-kapcsoló ezért a régi alakban maradt, és a tanulság nem terjedt. Ez a `KUKA-003`
osztálya: **egy szabály, egy otthon**.

**Ezért nem a sort javítottam, hanem otthont adtam neki:** a kapcsoló-olvasás egy feloldó
(`explicitSwitch`, a cél-döntések fájljában), és **mindkét** fogyasztó ezt hívja. A bekapcsolás
csak a pontos `1` — ez a repó házi szabálya, amit **megmértem**: öt másik kapcsoló már így olvas, és
`VS_KEEP_RESTORE_TARGET` volt az **egyetlen** kivétel.

**ÉS A FIGYELMEN KÍVÜL HAGYOTT KAPCSOLÓ NEM NÉMA** (`KUKA-238`): a beállított, de nem `1` érték
nevezetten „nem felismert", és a takarító sor **kiírja** — különben a futtató azt hinné, megtartást
kért, holott eldobtuk.

**ÉLŐ TANÚ, VALÓDI PostgreSQL 16.15-en, mind a négy kapcsoló-álláson:**

| kapcsoló | a lánc 6. lépése |
|---|---|
| `=0` | **eldobva** · *„FIGYELEM: a `VS_KEEP_RESTORE_TARGET` értéke "0", a bekapcsolás viszont CSAK a pontos `1`"* |
| `=false` | **eldobva** + ugyanaz a nevezett figyelmeztetés |
| `=igen` | **eldobva** + ugyanaz a nevezett figyelmeztetés |
| `=1` | **MEGTARTVA**, és a sor kimondja, miért (a maradékot a mérés után kézzel dobtam el) |

**VISSZACSÚSZÁS-PRÓBA MÉRVE:** a puszta igaz-értékes olvasás visszatételére **három pin piros**
(`ai1` · `ai3` · `ai4`) — és a harmadik a **testvér-kapcsolóé**, ami bizonyítja, hogy tényleg EGY
otthon lett, nem két egymás mellé írt javítás.

#### 2.3.1 ÉS A JAVÍTÁS KÖZBEN A SAJÁT MUNKÁMBAN TALÁLTAM EGY HIBÁT — KIMONDOM

A visszacsúszás-próba kimenete leleplezte, hogy **ebben a körben háromszor adtam ütköző
csoport-előtagot** a söprés-battériában: az `ac`, az `ae` és az `ag` **mind a három már élt** az
F164-es pinekben. A battéria így **két külön mérésben** futtatott `ac1`-et, `ae1`-et és `ag1`-et —
és a jelentés, a döntés-napló, az őr-otthon **és a review-válaszaim is** ezekre a puszta
azonosítókra hivatkoztak. Aki rákeresett volna, a **másik** mérést találja meg. Egy bizonyíték,
amire nem lehet egyértelműen mutatni, nem bizonyíték (`KUKA-121`).

**A hibát nem a szemem fogta meg.** Kétszer „ellenőriztem" az előtagot, és mindkétszer rosszul
(a keresőm a soron belüli azonosítót nem látta). Amit a szem kétszer elnézett, azt harmadszor sem
a szem fogja megfogni — **ezért most mér**: a battéria a saját gyűjtött eredményeiből nézi, hogy
egyetlen pin-azonosító sem szerepel **két külön mérésben**, hogy minden pin a kötött alakban
nevezi meg magát, és hogy két pin szó szerint azonos nevet sem visz.

**ÉS A MÉRCE PONTOS, NEM CSAK SZIGORÚ** (`KUKA-216`). Az azonosító ismétlődése önmagában nem hiba:
a `(b1)` **háromszor** fut egy hurokban, **ugyanabban** a mérésben, három bemenettel, és a neve
megnevezi, melyikről van szó. Egy tiltás, ami ezt is megfogná, **jó kódot íratna át** zöld
eredményért. A hiba a **két külön mérés közti** ütközés — azt mérem, és csak azt. Az ellenpár egy
**beültetett** kétlaki azonosítót megtalál, az egy-otthonút viszont nem jelzi.

**A NÉGY R166-OS CSOPORT ÁTNEVEZVE**, és a hivatkozások mindenhol igazítva (regiszter · őr-otthon ·
archívum · döntés-napló · jelentés):

| eddig | mostantól | mit mér |
|---|---|---|
| `ac1–ac8` | **`aj1–aj8`** | a `socket:` séma és a két fogyasztó olvasata (R166/P1) |
| `ae1–ae7` | **`ak1–ak5`** | a titok-tisztító shell-szó határa (2.1) |
| `ag1–ag4` | **`al1–al4`** | a felkínálás élő feltétele (2.2) |
| — | **`ai1–ai5`** | a kapcsoló-olvasás egy otthona (2.3) |
| — | **`am1–am4`** | **a mérő önellenőrzése** (új) |

**VISSZACSÚSZÁS-PRÓBA MÉRVE:** egy R166-os pint visszanevezve a régi, ütköző azonosítóra az
**`am1` piros**.

**ÉS EGY RÉGI ŐR JELE A MAI OTTHONRA IGAZÍTVA:** a `KUKA-369` (az R164-es kapcsoló-lelet) gépi jele
arra a sorra mutatott, amit a közös feloldó elvitt. A szabály nem változott — **erősebb lett**, mert
most a testvér-kapcsoló is ugyanazt hívja.

Rögzítve: `D-VS-3205` · `KUKA-398` · `KUKA-399`.

---

### 2.4 ÉS EGY ÖTÖDIK KÖR: NÉGY TOVÁBBI P2 — EGY OSZTÁLY, NÉGY HELYEN

A `d570f54` fejre lefutott átolvasás **négy további P2**-t hozott, és mind a négy **ugyanazt az
osztályt** mutatja: egy **bizonytalan** vagy **más sémájú** bemenetet, illetve egy **hatásos**
feloldót a kód a *kényelmes* ágra fordított. Mindegyiket megmértem, mindegyik valódi volt.

#### (1) A JOG-KÉRDÉSRE KIADÁST HÍVTAM — a súgó megnyitása hamis audit-sort írt

A 2.2-ben megépített készlet-kapu (`stock_access`) a `readSample()`-t hívta. **A döntés jó volt, a
választott feloldó hatásos:** a `readSample` a kiadóra megy, aminek a **sikeres** ága `disclose()`-t
hajt végre — tehát egy **kiadási leltár-sort** ír. A súgó megnyitása (`GET /api/assistant/status`,
deklaráltan **`mutates: false`**) így olyan audit-sort keletkeztetett, ami szerint **védett adat
kiadásra került** — holott a válasz a készlet-eredményt nem is hordozza.

**MEGMÉRVE, A JAVÍTÁS ELŐTT:** három egymást követő súgó-kérés **három sort** írt (`3→5` és tovább).
Nem egyszeri eset volt, hanem **minden megnyitás**.

Egy kiadási leltár, amibe a súgó megnyitása is bekerül, **használhatatlan**: a valódi kiadást nem
lehet megkülönböztetni egy olvasástól.

**A javítás a magban, a kiadó MELLETT** (`commandResultReadable`): ugyanaz a két döntés — a
könyv-jog és az eredmény saját adatköre —, **ugyanazon az egy óraolvasáson**, de `disclose` nélkül.
**Miért nem a hívónál:** ott két szabály keletkezne egy kérdésre (`KUKA-003` · `KUKA-233`), és a
következő módosítás az egyiket elfelejtené. **És amit nem ad:** a tartalmat nem adja vissza — aki az
adatot akarja, a kiadót hívja, és akkor a leltár-sor **joggal** keletkezik.

#### (2) A BUKOTT ELLENŐRZŐ KÉRDÉS „NINCS OTT"-RA FORDULT

A visszatöltési ellenpróba-lánc létezés-kérdése a `psql` **bukását** (nem nulla kilépés, üres
kimenet) `false`-ra fordította — vagyis „az adatbázis nincs ott". Az **„eltakarítva"** állítások
(E4d · E4e4 · E3b · E6b · Z) így attól is **átmentek**, hogy az ellenőrző kérés maga nem futott le:
egy ott maradt adatbázist a lánc **sikeres takarításként** jelentett volna. A szimmetrikus irány is
sérült: a „maradékot NEM dobtuk el" állítás ugyanígy átmehetett volna mérés nélkül.

**Mostantól három állapot**, és a hiány–jelenlét **két külön, fail-closed** kérdés: az ismeretlen
**mindkettőt** megbuktatja, és a sor kiírja az okot (*„a kiszolgálón VAN" · „NINCS" · „NEM
ELDÖNTHETŐ — <ok>"*). A hurkos feloldók is a három állapotot adják tovább, nem laposítják
igaz-hamisra.

#### (3) A FELOLDÓT CSAK AZ ÁTIRÁNYÍTÁSBA KÖTÖTTEM BE, AZ INDULÁSBA NEM

Az **R166/P1** javításom a `socket:` séma olvasatát mind a **négy** cél-feloldóban rendbe tette. A
két pg-próba **induló** kérdése viszont a régi alakban maradt: az **utat** csupaszította
„adatbázis-névvé". A `socket:` címen az út a **socket-könyvtár**, nem adatbázis:

| | |
|---|---|
| a régi csupaszítás `socket:/…/sock?db=vs_proba_fo` címen | **`"home/user/vs_pg_proba/sock"`** — mint adatbázis-név |
| a feloldó ugyanazon a címen | **`vs_proba_fo`** |

A kapcsolat tehát elbukott, a mért forrás `null` lett, és a lánc a **saját, elkülönített adatbázisa
létrehozása előtt** kilépett. Vagyis a helyi-kapu által **befogadott** cím-alakon **mindkét próba
használhatatlan volt** — és ezt a javítás **önmaga** keletkeztette: a séma támogatása megjelent, a
bekötés nem lett végigvezetve. A bekötés listáját a szabály **régi** olvasóiból vezettem le
(`KUKA-227` osztálya).

**ÉLŐ TANÚ, `socket:` címmel, valódi PostgreSQL 16.15-en:** `proof:pg-intent` **10 állítás / 0
eltérés** (saját mérési adatbázis létrehozva és eldobva) · `proof:pg-restore-safety` **48/48**.
**Ellenpár:** hálózati címen a feloldó **ugyanazt** adja, amit a régi csupaszítás — a működő eset nem
változott.

#### (4) A MEGSZAKÍTÁS TAKARÍTOTT, DE A LEVÁLÓ GYEREKNEK NEM SZÓLT

A `SIGINT`/`SIGTERM` kezelő eldobta a saját adatbázisokat és kilépett. A gyerek viszont **leváló**
folyamatcsoportban indul, és a kezelő **nem küldött neki jelet** — tehát a gyerek a szülő után is
futtathatta a `pg_dump`/`pg_restore`-t, **versenyben a takarítással**: írhatott egy már eldobott
forrásra, vagy ott hagyhatta a saját generált célját. **Pontosan az a szemét, amit ez a lánc mér** —
a kezelő a saját mérésének az állítását tudta aláírni.

**Mostantól kötött a sorrend:** előbb a **folyamatcsoport** áll le (tehát a `psql`/`pg_dump` unokák
is), utána a takarítás. A `SIGKILL` a `SIGTERM` után jön, rövid türelemmel. **És a gyerek
azonosítója felkerült a kezelő regisztrálása elé** — különben egy korai jel a deklaráció előtt
olvasná, és a kezelő pont akkor bukna el, amikor a legnagyobb szükség van rá (`KUKA-360`).

#### A BIZONYÍTÉK, SORONKÉNT

| állítás | gépi jel | verdikt |
|---|---|---|
| a súgó-állapot kérése **egyetlen** kiadási leltár-sort sem ír (három kérésen mérve) | `AN` csoport, `an1`–`an3` | **ZÖLD** |
| **ellenpár:** a készlet-útmutatók **továbbra is** felkínálódnak a jogosult tagnak | `an2` | **ZÖLD** |
| a `socket:` cím induló kérdése a feloldóból jön, és **mindkét** próba ezt hívja | `ao1`–`ao3` · **`ao7`** (a hívás, nem a feloldó) | **ZÖLD** |
| a **bukott** létezés-kérdés sem „nincs ott", sem „ott van" | `ao4` · `ao5` · **`ao8`** (a hívás a láncban) | **ZÖLD** |
| a megszakítás **sorrendje** kötött, és a gyerek-azonosító a kezelő előtt áll | `ao6` | **ZÖLD** |
| a teljes battéria | `verify:app-findings-r154` | **ZÖLD — 288/288** |
| a **kötelező böngésző-kapu** a mag és a határ érintése után | `verify:browser-gate` | **ZÖLD — 134 / 0 / 0 / 0**, 24 próba-fájl |

**VISSZACSÚSZÁS-PRÓBA MÉRVE, MIND A NÉGYRE:** a javításokat visszavéve **öt pin piros** — `an1` ·
`an3` · `ao6` · `ao7` · `ao8`.

**ÉS EGY TANULSÁG A PINEKRŐL IS.** Az `ao1` első alakja **csak a feloldót** mérte, nem a hívást —
vagyis a javítás visszavétele **nem buktatta volna meg**. Ez a `KUKA-239` csapdája (*a fájl nem a
függvény*): egy pin, amit a visszacsúszás nem tesz pirossá, **nem gépi jel**. Ezért került be az
`ao7` és az `ao8`, ami a **hívást** méri a két próba forrásában.

Rögzítve: `D-VS-3206` · `KUKA-400` · `KUKA-401` · `KUKA-402` · `KUKA-403`.

---

### 2.5 ÉS EGY ÖTÖDIK KÖR: ÖT TOVÁBBI P2 — HÁROM OSZTÁLY

A `d570f54` fejre lefutott átolvasás **öt további P2**-t hozott. Mind az öt valódi; négy közülük
közvetlenül a saját, ebben a körben épített munkámban.

#### (1) A SZOMSZÉD PASSZUS UGYANAZON A TÉVES FELTEVÉSEN ÁLLT

A 2.1-ben megdöntöttem, hogy *„az idézőjel a titok határa"* — de **csak azt a passzust írtam át,
amire a lelet mutatott**. A kapcsolati cím elrejtése **ugyanabban a fájlban**, néhány sorral lentebb,
karakter-kizárásos mintával zárt:

> **A PÉLDÁKAT SZÁNDÉKOSAN NEM ÍRJUK LE HASZNÁLHATÓ ALAKBAN.** Az első változatuk valódi
> kapcsolati cím **formájú** volt (séma · felhasználó · **jelszó** · gazdagép · adatbázis), és a
> board **titok-őre elutasította a feltöltést** — joggal: a szabály az ALAKRA szól, nem a tartalom
> eredetére. Az őr tehát a saját jelentésemen is működött. A leírás ezért szerkezetet nevez meg,
> nem címet ad.

| a bemenet szerkezete | RÉGI kimenet |
|---|---|
| kapcsolati cím, amelynek a **jelszó-részében aposztróf** van | a rejtés az aposztrófnál **megállt**: a jelszó **maradéka** és a **gazdagép** a naplóba került |
| ugyanez, dupla idézőjelen belül, **escape-elt** idézőjellel a jelszóban | ugyanaz a maradék a naplóba |

**A javítás:** a cím vége is a **shell-szó** határa. A szöveget **szavakra bontjuk**, és a címet a
saját szaván belül rejtjük el — a szó végéig, de nem tovább.

**És a szavakra bontás nem dísz:** a sémától indítva a letapogató egy **idézett, kapcsolati cím alakú**
**idézett** szó belsejéből indult volna, ahol a nyitó idézőjelet már nem látja, a zárót pedig nyitónak
veszi — és a **sor végéig** rejtett volna, elvéve a hasznos részt (`-f ki.dump`). Ezt is megmértem,
mindkét irányban: a titok eltűnik, a hasznos szöveg **megmarad**, a titokmentes sor betűre változatlan.

#### (2) A PRÓBA A SAJÁT SZAVÁT NEM HALLGATTA MEG — KÉT HELYEN

**(a) A nem mért eset mellett is „RENDBEN"-t írt a lánc.** A siker-feltétel csak a bukott lépéseket
nézte; a `nemMert` listát — a **nevezetten kimaradt** eseteket — csak kiírta. Egy Unix-socket nélküli
kiszolgálón a `socket:` séma ellenpárja kimaradt, és a lánc **mégis 0-val lépett ki**: a söprés, a
jelentés és a külső fél a nem támogatott átirányítást **bizonyítottnak** vehette. Ez pontosan a
`KUKA-200`/`KUKA-206` — és **én magam írtam be** a `nemMert` listát, majd kihagytam a verdiktből.

**Mostantól három verdikt van:** `RENDBEN` (0) · **`NEM TELJES`** (4) · `LELET` (3).

**(b) A takarítás a kilépési horogról futott.** Mindkét pg-próba a saját generált adatbázisait a
`process.on('exit')` horogról dobta el — az pedig **akkor** fut, amikor a verdikt és a kilépési kód
már eldőlt. A `DROP DATABASE` bukása így csak egy figyelmeztető sor volt: a lánc **zöldet írt**,
miközben a saját adatbázisai a kiszolgálón maradtak, és ismételt futásokon halmozódtak. Egy lánc,
ami épp azt méri, hogy *„a megszakadt futás nem hagy szemetet"*, a **sajátjáról hallgatott**.

**Mostantól** a takarítás a verdikt **előtt** fut, és a maradék **mért lépés** (`Y.`) — mindkét
próbában, nem csak abban, amire a lelet mutatott.

#### (3) A NEMLEGES ÁG ROMOT HAGYOTT, A BEMUTATÓ PEDIG ELNAVIGÁLT A CÉLJÁTÓL

**(a) A telt tárból jövő `503` nem vette vissza, amit lebontott.** A belépés **előbb** törli a régi,
névtelen munkamenetet (ez az `F154-12` szándékos sorrendje), és vele a `pending_intent` sort is
(`KUKA-388`). Ha a rotált sor felvétele meghiúsul, a kezelő `503`-at adott — **és egyik sem került
vissza**. A meghívó-jegy a normál úton **csak a szerveren** létezik, a címsorban nincs: az
újrapróbálás tehát már nem tudta folytatni a meghívást, a szándék **némán elveszett**. A kód melletti
megjegyzésem viszont azt állította, hogy a hívó *„nem lesz rosszabb helyzetben, mint belépés előtt"* —
a munkamenetre igaz volt, a hozzá kötött **szándékra nem**.

**Mostantól** a nemleges ág helyreállít: a régi sor visszakerül a tárba a **saját azonosítóján** (a
hívó sütije arra mutat), és a függő szándék is újraíródik rá. **És ha a visszavétel is elbukik**, azt
a válasz **kimondja** — más üzenet és egy nevezett mező (`KUKA-050`).

**(b) A kijelentkezés-útmutató közepe navigált, és elvitte a saját célját.** A `go()` navigáláskor
**bezárja a profil-menüt**, a `data-testid="logout"` horgony pedig **csak ott** létezik (a biztonsági
lap kijelentkezés-gombján nincs). Aki a kiemelt gombot megnyomta — ami egy kiemelésnél természetes —,
annak a **harmadik lépés nevezetten megszakadt**.

**ÉS A SAJÁT BEJÁRÓM NEM FOGTA MEG.** A feltáró vezérlőt **csak akkor** nyomtam meg, ha a lépés célja
még nem létezett; itt a cél **létezett**, tehát a bejárás egyszerűen továbblépett, és soha nem
aktiválta. **A próbám egy olyan utat mért, amit ember nem jár be** (`KUKA-237`).

**A javítás kettős:** az útmutató **két lépés, egy helyen** (menű megnyitása → kijelentkezés), navigáló
lépés nélkül; és a bejáró **minden lépés saját célját megnyomja** — az utolsót kivéve, mert az a CÉL.
Ahol a cél nem megnyomható (szöveg, tábla, panel), a kattintás elmarad: **nem a próba dönti el, mi
vezérlő, hanem a lap**.

#### A BIZONYÍTÉK, SORONKÉNT

| állítás | gépi jel | verdikt |
|---|---|---|
| az aposztrófos kapcsolati cím **teljesen** eltűnik, és a hasznos szöveg megmarad | `ap1` · `ap2` · `ap3` | **ZÖLD** |
| a **nem mért** eset mellett nincs „RENDBEN" (a `NEM TELJES` ág és a 4-es kód) | `ap4` | **ZÖLD** |
| a takarítás a **verdikt előtt** fut, a maradék mért lépés — **mindkét** próbában | `ap5` | **ZÖLD** |
| az `503` **visszaveszi** a munkamenetet és a szándékot, a kudarcot **kimondja** | `ap6` · `ap7` | **ZÖLD** |
| az útmutató nem navigál el a céljától, és a bejáró **megnyomja** a kiemelt vezérlőt | `ap8` · `ap9` | **ZÖLD** |
| a teljes battéria | `verify:app-findings-r154` | **ZÖLD — 288/288** |
| a tanulságok gépi jelei | `verify:kuka` | **ZÖLD — 924/924** |
| a visszatöltési ellenpróbák (az `Y.` lépéssel) | `proof:pg-restore-safety` | **ZÖLD — 49/49** |
| az írás-szándék a két tárolón | `proof:pg-intent` | **ZÖLD — 10 állítás / 0 eltérés** |

**VISSZACSÚSZÁS-PRÓBA MÉRVE, MIND AZ ÖTRE:** a javításokat visszavéve **hat pin piros** — `ap1` ·
`ap4` · `ap5` · `ap6` · `ap8` · `ap9`.

**AMIT EZ NEM ÁLLÍT:** a telt tár **élő, böngészős** előállítása nincs a kapuban (kimondva); a
megszakítás-kezelő versenyét a **forrásból** mérem, nem élő jelből.

Rögzítve: `D-VS-3207` · `KUKA-404` … `KUKA-408`.

---

### 2.6 ÉS A JAVÍTÁS AZONNAL TALÁLT EGY MÁSODIK HIBÁT — A KAPU PIROSSAL KEZDTE

A 2.5/(3b)-ben a bejárót arra javítottam, hogy **megnyomja a kiemelt vezérlőt**, ahogy az ember. A
kötelező böngésző-kapu első futása erre **PIROSSAL** válaszolt: **1 bukott · 2 kihagyott**. Ezt nem
hallgatom el, és nem is kerültem meg — **ez a javítás értelme**.

#### A LELET, AMIT CSAK A SZIGORÍTÁS TALÁLT MEG

A `tour.resend` első lépése a **nézet-váltó gombra** állt (`auth-resend-open`). Ez a gomb **csak a
belépési nézetben létezik**: megnyomva a lap átvált az újraküldő nézetre, és a gomb **megszűnik**. A
`checkRun` ilyenkor már az **első** lépésen `targetMissing`-et ad — a buborék azt írja, hogy *„az
útmutatóban megnevezett elem nem látható ezen a képernyőn"* —, **egy teljesen ép lapon, pont azután,
hogy a felhasználó azt tette, amit kértünk**. Zsákutca működő folytatás nélkül (`KUKA-201`), ugyanaz
az osztály, mint a `tour.logout`-nál.

**A diagnosztika mondta meg, nem a találgatás.** A bukó lépésnél a próba most kiírja a panel
állapotát: `panel:1 next:0 cél(resend-email):1 · „Ez a lépés most nem folytatható…"` — vagyis a cél
**ott volt**, a panel **ott volt**, de a „Tovább" eltűnt, mert az útmutató **megszakadt**. Ez zárta
ki, hogy a cél hiányára gyanakodjak.

#### ÉS EGY SAJÁT MÉRŐHIBA UGYANITT

Az első kattintó alakom a kattintás után **azonnal** nyomta a „Tovább"-ot — az **újrarajzolás
előtt**. A próba így a saját türelmetlenségét mérte (`KUKA-121`). Mostantól megvárom, hogy a
**következő** lépés célja látható legyen; a várakozás **korlátos**, és a **lejárata nem bukás**: ha a
cél tényleg nem jelenik meg, a „Tovább" megy, és **az útmutató maga mondja ki** a megszakítást — azt
mérem. Így a szigorítás nem fedi el azt, amit mérnie kell.

#### A JAVÍTÁS — ÉS ÁLTALÁNOS ŐR, NEM HARMADIK EGYEDI PIN

A `tour.resend` **ott indul, ahol a céljai vannak**: `auth_view: 'resend'`, és a két lépés a
címmezőre meg a küldés gombjára áll — nézet-váltó lépés nélkül.

**És az osztály kapott egy általános őrt** (`KUKA-003`: egy szabály, egy otthon): **egyetlen
útmutató-lépés sem állhat nézet-váltó vezérlőn**. A váltó-készlet a **lap forrásából** jön — ami
`data-auth=`-ot hordoz, az nézetet vált —, nem beírt névsorból (`KUKA-045`), tehát egy **jövőbeli**
váltó-vezérlő is automatikusan fedve van. Mérve: **5** váltó-vezérlő a lapon, **0** lépés áll rajtuk.

| állítás | gépi jel | verdikt |
|---|---|---|
| egyetlen lépés sem áll nézet-váltón, és a készlet a lap forrásából jön | `ap10` | **ZÖLD** |
| a tizenkét útmutató élő bejárása (U0–U3), 390 px-en is | `test:e2e` → `v3app-r166-utmutatok` | **4/4 ZÖLD** |
| a **kötelező böngésző-kapu** a javítás után | `verify:browser-gate` | **ZÖLD — 134 / 0 / 0 / 0**, 24 próba-fájl · 366 s + 440 s |
| a teljes battéria | `verify:app-findings-r154` | **ZÖLD — 297/297** |
| a tanulságok gépi jelei | `verify:kuka` | **ZÖLD — 924/924** |

**VISSZACSÚSZÁS-PRÓBA MÉRVE:** a lépést visszatéve a váltó-gombra az **`ap10` piros**.

**A TANULSÁG A MÉRÉSRŐL IS SZÓL.** A kattintó bejáró a **bevezetése napján** talált egy második,
ugyanilyen zsákutcát — amit a szigorítás nélkül senki nem vett volna észre. A `KUKA-407` javítása
tehát nem formalitás volt; és egy piros kapu, ami a saját munkámat buktatja meg, **értékesebb**, mint
egy zöld, ami átengedi.

Rögzítve: `D-VS-3207` · `KUKA-409`.

---

### 2.7 ÉS EGY HATODIK KÖR: NÉGY TOVÁBBI P2 — KETTŐ A SAJÁT JAVÍTÁSOM KÖVETKEZMÉNYE

#### (1) SHELL-NYELVTANT ALKALMAZTAM EGY URL-RE — A JAVÍTÁSOM NYITOTT ÚJ SZIVÁRGÁST

A 2.5/(1)-ben a kapcsolati cím végét a **shell-szó** letapogatójával kerestem. Abban a `&` és a `;`
**elválasztó** — a shellben joggal. Egy URL-ben viszont **legálisak**: a jelszó-részben és a
query-ben is. A rejtés ezért a jelszó közepén megállt, és a **maradék meg a gazdagép** a naplóba
került. **Négy alakon mérve.**

Ez nem egy régi hiba volt: **a saját javításom keletkeztette**, néhány órával korábban.

**A javítás:** az elválasztó-készlet a **hívótól** jön. A kulcs=érték alak (`PGPASSWORD=…`)
shell-szót olvas, tehát nála a `;` **valódi** szó-vég; a **cím** viszont csak a **fehér szóközig**
tart — egy URL-ben nem lehet escape-elés nélküli szóköz, tehát ez a **pontos** határ.

**Ellenpár mérve:** a kulcs=érték passzus továbbra is a shell határát használja, a hasznos szöveg és
a titokmentes sor **betűre változatlan**.

#### (2) A MÉRÉS SAJÁT „IDEGEN" ADATBÁZISA NEM VOLT A TAKARÍTÁSI LISTÁN

A visszatöltési lánc létrehoz egy adatbázist, amit a durability-**gyerek** szemszögéből „idegennek"
nevez (épp azt mérjük, hogy a gyerek nem nyúl hozzá). A **szülő** takarítási listájába viszont nem
került — tehát **minden megszakított futás ott hagyta**. A 2.5/(3b) javítása után a gyerek leállítása
és a forrás takarítása megvolt; **ez mégis maradt**.

**Az „idegen" itt szerep, nem tulajdon.** A `CREATE` sikere a tulajdon-bizonyíték, tehát a név a
szülő listájára tartozik — és a gyerek szemszögéből továbbra is idegen (ezt tovább mérjük).

**A sorrend is mérve:** a záró `Z.` lépés **előbb** dobja el és **méri** a hiányt, a verdikt előtti
takarítás csak utána fut — különben a `Z.` a saját takarításunkat mérné.

#### (3) A FÁJLNÉV-EGYEZÉS KIHAGYTA A TARTALOM-ELLENŐRZÉST

A fogyasztás-export `--transcript` ellenőrzése a tartalmat **csak akkor** olvasta, ha a fájlnév nem
egyezett. Egy átmásolt vagy felülírt fájl, aminek a neve véletlenül a kért munkameneté, **átment**
akkor is, ha a sorai **kimondottan** más azonosítót hordoztak — a leltár tehát **más** munkamenet
fogyasztását címkézte a kértnek. A leltár **átadási bizonyíték**: a rossz hozzárendelés rosszabb,
mint a hiányzó leltár.

**Mostantól három állapot**, és mind a négy eset mérve a kilépési kóddal:

| a fájl neve | a tartalom | verdikt |
|---|---|---|
| egyezik | **ellentmond** | **elakadás** — a fájlnév nem ment föl |
| egyezik | nem hordoz azonosítót | elfogadás (visszafelé-kompatibilitás) |
| nem egyezik | egyezik | elfogadás |
| nem egyezik | nem hordoz | elakadás |

#### (4) A TÁBLA-ÚTMUTATÓK MINDEN CÉGES TAGNAK FELKÍNÁLÓDTAK

A bemutató-mintából **kettő** van, tehát egy létrehozó **harmadik** vállalkozásánál a kiosztás nincs
meg: a tábla-lap az **üres állapot** panelt rajzolja, és a lépés-célok **soha nem jönnek létre**. A
három tábla-útmutató mégis minden céges tagnak felkínálódott — a második lépésén nevezetten
megszakadt volna.

**HARMADSZOR UGYANEZ AZ OSZTÁLY EGY KÖRÖN BELÜL** (a levél-fogadó, a készlet-jog, most a mintaadat)
— **és ez a szám a tanulság**. Ezért nem negyedik egyedi kapu jött, hanem **általános őr**: minden
útmutató, aminek a lépése a mintaadattól függő tábla-horgonyra áll, **deklarálja** a feltételt — és a
horgony-készlet a **lap forrásából** jön, az üres-állapot ága **utánról** mérve, nem beírt névsorból.
Egy **jövőbeli** tábla-horgony így automatikusan fedve van.

#### HÁROM MEGLÉVŐ PINT IGAZÍTANI KELLETT — EGYIKET SEM GYENGÍTVE

| pin | mi változott | miért nem gyengítés |
|---|---|---|
| `r8` | a **pontosabb** mondatot állítja | a kilépés-kód és a nevezett elakadás követelménye változatlan; a bemenetre az *ellentmondás*-ág a helyes |
| `u6` | a minta **pontos** lett | a `ctx.demo` **részszóként** megfogta az új, KÜLÖN jelet is — most **mindkét** jel hatóköre külön mérve |
| `ah1` | a céges kontextus megkapta a minta **tényét** | ez a sor a személyes-tér szabályt méri, és a tábla-bemutatók előfeltétele mindig is a kiosztott minta volt |

#### ÉS KÉT SAJÁT HIBA, KIMONDVA

**(a) Lyuk a saját pinemben.** Az `aq3` első alakja a **kikommentelt** sort is elfogadta, tehát a
javítás visszavétele **nem buktatta volna meg** (`KUKA-239` — másodszor ebben a körben). Sor-kezdetre
kötve javítva, és **ellenpróbával mérve**, hogy a `//`-val kezdődő sor pirosra vált.

**(b) A mérésem felülírt egy commitolt artefaktumot.** A három-állapotú átirat-ellenőrzés mérése
közben `--out` nélkül futtattam az exportot, ami **felülírta a commitolt `V3_R71` export-párost**
szintetikus próbaadattal (`session: "KERT"`, 74 sor a 62 807 helyett). `git checkout`-tal
visszaállítva — **betűre az eredeti** —, és a mérő szkript mostantól `--out`-ot ad. Ez a `KUKA-120`
osztálya: a próba ne hagyjon maradékot a mért rendszerben.

#### A BIZONYÍTÉK, SORONKÉNT

| állítás | gépi jel | verdikt |
|---|---|---|
| a cím jelszó-részében a `;` és az `&` **nem** zárja a rejtést | `aq1` | **ZÖLD** |
| **ellenpár:** a kulcs=érték passzus marad a shell határán, a hasznos szöveg megmarad | `aq2` | **ZÖLD** |
| a mérés saját adatbázisa a takarítási listán áll (**sor-kezdetre** kötve) és a **sorrend** jó | `aq3` · `aq4` | **ZÖLD** |
| az átirat-ellenőrzés három állapotú | `aq5` · `r8` | **ZÖLD** |
| a minta-kapu **mindkét irányban**, és csak a sajátjait zárja | `aq6` · `aq7` | **ZÖLD** |
| **általános őr:** a minta-függő horgonyok a lap forrásából | **`aq8`** | **ZÖLD** |
| a teljes battéria | `verify:app-findings-r154` | **ZÖLD — 297/297** |
| a tanulságok gépi jelei | `verify:kuka` | **ZÖLD — 924/924** |
| a visszatöltési ellenpróbák | `proof:pg-restore-safety` | **ZÖLD — 49/49** |
| **a kötelező böngésző-kapu** | `verify:browser-gate` | **ZÖLD — 134 / 0 / 0 / 0**, 24 próba-fájl · 369 s + 440 s |

**VISSZACSÚSZÁS-PRÓBA MÉRVE, MIND A NÉGYRE:** a javításokat visszavéve **öt pin piros** (`r8` ·
`aq1` · `aq5` · `aq6` · `aq8`), és a pin-lyuk javítása után a kikommentelt sorra az **`aq3` is**.

**ÉS KÖZBEN A HELYI PostgreSQL LEÁLLT — A LÁNC PONTOSAN JÓL VISELKEDETT.** A `proof:pg-restore-safety`
nem zöldelt és nem is hallgatott: *„a cél létezése NEM MÉRHETŐ — megállás"*. Ez a 2.5-ben épített
`KUKA-401` fail-closed ága, élesben. Újraindítás után mindhárom lánc zöld.

#### A NÉGY SZÁL MEGVÁLASZOLVA ÉS LEZÁRVA — ÉS EGY SAJÁT HIBA A VÁLASZOKBAN

Mind a négy review-szálra válasz ment (a mérés · a javítás · a mért visszacsúszás-próba · a gépi
jel), és mind a négy szál **lezárva** (`PRRT_…HtSS` · `…HtSf` · `…HtSk` · `…HtSn`).

**ÉS A VÁLASZAIMBAN HÁROM NEM LÉTEZŐ DÖNTÉS-SZÁMRA HIVATKOZTAM** (`D-VS-3209` · `D-VS-3210` ·
`D-VS-3211`). A valóság: a hatodik kör négy leletét **EGY** döntés fedi, a `D-VS-3208` — a
válasz-írás pillanatában a `npm run verify:decision-numbers` szerint a legmagasabb kiadott a **3208**
volt, tehát mind a három hivatkozott szám **nem létezett**. **Nem nyitottam új számokat azért, hogy a
szövegem igaz legyen** (a `KUKA-050` iránya: a szöveg követi a valóságot, nem fordítva); a három
szálra **javítás ment ki** a helyes számmal. A repóban ilyen hivatkozás **nem** keletkezett (mérve:
`grep` a `docs/` · `contracts/` · `v3app/` · `tools/` · `v3ref/` fákon — **0 találat**).

**ÉS EGY PONTOSÍTÁS, HOGY NE LEGYEN FÉLREÉRTHETŐ:** a `D-VS-3209` **azóta létezik** — de a
**HETEDIK** kör három leletét fedi (lásd a 2.8 pontot), **nem** ezt a négyet. A fenti állítás a
válasz-írás pillanatára igaz, és a szám azóta sem ennek a négy leletnek a száma.

Rögzítve: `D-VS-3208` · `KUKA-410` … `KUKA-413`.

---

### 2.8 ÉS EGY HETEDIK KÖR: HÁROM TOVÁBBI P2 — MIND A SAJÁT JAVÍTÁSAIM ŐREI FELETT

A `6110c87` fejre lefutott átolvasás **három további P2**-t hozott. A közös bennük az, hogy nem a
javításom **szabálya** volt rossz, hanem az **őre szűkebb**, mint a szabály, amit őriznie kellett volna.
Egyiket sem hittem el szövegre — mindhármat megmértem, és mind a három **valódi**.

#### (1) A TITOK-REJTÉS SÉMA-KÉSZLETE BEÍRT NÉVSORBÓL JÖTT — ÉS A `socket:` CÍM A NAPLÓBA KERÜLT

A kapcsolati cím sémáinak zárt listája (`PG_URL_SHAPES`) **három** sémát fogad be, köztük a
`socket:`-et — ezt én magam vezettem be ebben a körben (R166/P1). A **rejtés** sémái viszont egy
kézzel írt felsorolásból jöttek, és abban a `socket:` nem szerepelt.

**MÉRVE, élő kóddal:**

| állítás | mért eredmény |
|---|---|
| a `socket:` sémájú cím átmegy a befogadó feloldón | **igen** (`pgUrlShape().shape === 'socket'`) |
| a gyermek `PGPASSWORD`-je a cím jelszó-részéből jön | **igen** (`cliEnvFor` — a mért érték **megegyezik** a jelszóval) |
| ugyanez a cím a rejtés után | **BETŰRE VÁLTOZATLAN** — a jelszó a naplóba kerülne |

Tehát egy napló- vagy hibasor a jelszót kiírta volna, pontosan azon az úton, amit a lánc **kimondottan
támogat**. Ez nem elméleti kár.

**A javítás: a készlet a MEGLÉVŐ zárt listából jön**, nem új névsorból:

```js
const REDACT_SEMA = new RegExp(`(${[...new Set([...Object.keys(PG_URL_SHAPES), ...REDACT_EXTRA_SEMA])]…})://`, 'i');
```

És a **ráadás szándékos**: a rejtés **többet** takar, mint amit a feloldó elfogad (a `pg:` séma nincs a
zárt listán, de egy diagnosztikai sorban megjelenhet). Az aszimmetria iránya csak **ez** lehet: a
rejtés soha nem szűkebb a befogadásnál (`KUKA-049`).

| eset | eredmény |
|---|---|
| `socket:` cím jelszóval | **teljesen elrejtve** |
| mind a három befogadott séma | **elrejtve** (ellenpár: a zárt lista MINDEN kulcsára mérve) |
| a `pg:` ráadás | **elrejtve** |
| titokmentes sor | **betűre változatlan** |

#### (2) AZ „ÁLTALÁNOS" ŐRÖM EGY FÜGGVÉNYRE VOLT ÁLTALÁNOS — ÉS BETŰ SZERINT KERESETT

A 2.7-ben a `KUKA-413`-ra **általános** őrt írtam: a mintaadattól függő horgonyokat a **lap
forrásából** vezeti le, nem beírt névsorból. A hetedik kör megmutatta, hogy az őröm **két okból** volt
vak — és mindkettő egy-egy egész osztály:

1. **Egy függvényt olvasott.** Csak a `tablePage()`-et. Mérve: **négy** lap-függvénynek van korai
   üres-állapot ága — `tablePage` · `stockBody` · `stockCardPage` · `movementsPage`. Ez a `KUKA-239`
   csapdája (*a fájl nem a függvény*), **harmadszor** ebben a körben.
2. **Betű szerint keresett.** A `sample-document` · `sample-document-full` · `sample-supplier`
   horgony a forrásban **sehol nem szerepel betű szerint** — `data-testid="sample-${kulcs}"` alakban
   születik, egy olyan segédben (`serverSamples`), amit a tábla-lap a korai visszatérés **UTÁN** hív.
   Egy betű-egyeztető letapogató ezt **soha** nem látja meg.

Így **négy további útmutató** maradt deklaráció nélkül — `tour.documents` · `tour.partners` ·
`tour.stockcard` · `tour.movements` —, miközben az `aq8` **zöld** volt.

**A javítás kettős, és a második a lényeg:**

· a letapogató **minden** üres-állapotos lap-függvényt olvas, **és** a régióból hívott segédeket is;
· **amit a forrás betű szerint nem mutat meg, azt VISELKEDÉS méri.** Új próba-lap
  (`tests/e2e/v3app-r166-minta-kapu.spec.mjs`): a felhasználó útján **három** vállalkozást hozunk
  létre ugyanazzal a létrehozóval — a bemutató-mintából kettő van, tehát a **harmadik** minta nélkül
  születik —, és ebben a fiókban **mindaz, amit a KISZOLGÁLÓ felkínál, VÉGIGVIHETŐ**. Ez az állítás a
  dinamikus horgonyt is méri, mert a **böngészőt** kérdezi, nem a forrást (`KUKA-207` · `KUKA-237`).

**ÉS A HELYZETET ELLENPÁRRAL MÉRJÜK**, nem feltevéssel: ugyanaz az állítás az **első** cégben (van
minta) és a **harmadikban** (nincs) **mást** ad. Enélkül egy olyan mérés maradt volna, ami akkor is
zöld, ha a minta-kiosztás elromlik (`KUKA-215` · `KUKA-216`).

**És a bejáró KÖZÖS otthonba került** (`tests/e2e/tourWalk.mjs`): a két próba-lap **ugyanazt** a
szigorítást futtatja — azt, amit a `KUKA-407` és a `KUKA-409` leletei kiköveteltek. Két példányban a
kettő előbb-utóbb elcsúszott volna (`KUKA-003`).

#### (3) A MÉRCE AZT KÉRDEZTE, HOGY A KÉRT AZONOSÍTÓ MEGVAN-E — NEM AZT, HOGY MÁS IS

A 2.7-ben az átirat-ellenőrzést három állapotúra tettem. Az ellentmondást viszont így számoltam:
„a kért azonosító **nincs** benne, de van valami". Egy **összefűzött** vagy szennyezett átiratban,
ami a kért azonosítót **és** egy idegent is hordozza, a „kért benne van" **igaz** — tehát nem volt
ellentmondás, a fájl **átment**, az exportáló pedig a sorokat `sessionId` szerint **nem szűri**. A
másik munkamenet fogyasztása **némán a kért munkamenet nevére** került volna: ugyanaz a
félre-attribuálás, amit a `KUKA-412` megelőzni hivatott, **egy ággal beljebb**.

**MÉRVE, mindkét alakkal, ugyanazon a vegyes átiraton:**

| alak | kilépés |
|---|---|
| a 2.7-es (régi) mérce | **0 — ÁTENGEDTE** |
| a mai mérce | **2 — nevezett elakadás**, és megnevezi, melyik azonosító az idegen |

A javítás a kérdés **irányát** fordítja meg: nem „megvan-e a kért", hanem **„van-e benne más"**.

#### A BIZONYÍTÉK, SORONKÉNT

| állítás | gépi jel | verdikt |
|---|---|---|
| a `socket:` cím rejtése, és a készlet a zárt listából | `ar1` · `ar2` · `ar3` | **ZÖLD** |
| a vegyes átirat elakad, és az idegen azonosító NEVEZETT | `ar4` · `ar5` · `aq5` | **ZÖLD** |
| a négy további útmutató deklarálja a feltételt | `ar6` | **ZÖLD** |
| a letapogató MINDEN üres-állapotos lap-függvényt olvas | `ar7` | **ZÖLD** |
| **a dinamikus horgonyra VISELKEDÉS-mérés áll** | **`ar8`** + `R166-MK0…MK2` | **ZÖLD** |
| a teljes battéria | `verify:app-findings-r154` | **ZÖLD — 307/307** |
| a tanulságok gépi jelei | `verify:kuka` | **ZÖLD — 931/931** |
| a három pg-lánc | `proof:pg-restore-safety` · `-intent` · `-durability` | **ZÖLD — 49/49 · 10/0 · 13/13** |
| a fogyasztás-mérő ellenpróbái | `verify:fogyasztas-meres` | **ZÖLD — 18/18** |
| a rövid láncok | `tutor` 94/94 · `assistant` 55/55 · `i18n` 49/49 · `selfcheck` 57/57 · `lefedes` 17/1 | **változatlan** |

**VISSZACSÚSZÁS-PRÓBA MÉRVE, MIND A HÁROMRA:**

| amit visszavettem | ami pirosra fordult |
|---|---|
| a séma-készlet beírt névsorra | `ar1` · `ar2` |
| az átirat-mérce a 2.7-es alakra | `aq5` · `ar4` (és a vegyes átirat **0-val átmegy**) |
| egy útmutató deklarációja | `ar6` |
| a letapogató egy függvényre | `aq8` · `ar7` |

**ÉS NÉGY MEGLÉVŐ PINT IGAZÍTANI KELLETT — EGYIKET SEM GYENGÍTVE:** az `aq5` a **mai, erősebb** alakot
állítja és a régit **tiltja**; az `aq6`/`aq7` kapuzott készlete a **regiszterből** jön, nem három
leírt névből (`KUKA-045`); az `al2` jelenete megkapta a **minta tényét** (az a csoport a készlet-jog
kapuját méri, nem a mintáét); az `ap9` és a `KUKA-404`/`KUKA-407` gépi jele a **mai otthonra** mutat.

#### ÉS A KAPU PIROSSAL KEZDTE — A SAJÁT ŐRÖM VOLT TÚL ERŐS

A viselkedés-őr első futása **PIROS** volt: a 137 helyzetből **1 bukott**, és a bukó a saját, most írt
`R166-MK2`. Két útmutató bejárását „MEGSZAKADT"-nak írta — `tour.invite` és `tour.scopeLifecycle`.

**NEM HITTEM EL, MEGMÉRTEM — ÉS A HIBA AZ ENYÉM VOLT:**

| útmutató | a megálló lépés | mit deklarál |
|---|---|---|
| `tour.invite` | `s5` → `invite-submit` | **`task: "invite.created"`** |
| `tour.scopeLifecycle` | `s3` → `member-scope-row-dokumentumok` | **`task: "grant.saved"`** |

Vagyis mindkettő olyan lépésen áll meg, ami **a felhasználó saját műveletére vár** — a `KUKA-228`
szabálya szerint joggal: *amit a bemutató nem nyom meg helyettünk, arra VÁRNI kell.* A bejáró nem tud
meghívót létrehozni és jogot kiadni, tehát a lépésen **túl nem tud mérni**. Az első alakom a saját
korlátját mondta volna a rendszer hibájának (`KUKA-216`: a verdikt nem mutathat a mérés hatókörén túl).

**A JAVÍTÁS — HÁROM KIMENET, ÉS CSAK AZ EGYIK BUKÁS:**

| kimenet | mit jelent | bukás? |
|---|---|---|
| `OK` | minden lépés végigvihető | nem |
| **`TASK-IG n/m`** | a felhasználó műveletére vár — **mért tény**, a lépés megnevezve | **nem** |
| `MEGSZAKADT` | nevezett megszakítás vagy nem létező cél | **IGEN** |

**ÉS A TASK-MEGÁLLÁS NEM TUDJA KIÜRESÍTENI AZ ÁLLÍTÁST** (`KUKA-215`): a lap kimondja, hogy **van**
teljesen bejárt útmutató (mérve: **tíz** darab), és hogy a **mintához kötött hét közül EGYIK SEM**
hordoz `task`-ot — tehát a lelet osztálya tényleg mérve van, nem a megállás mögé rejtve.

**ÉS AZ ŐR TUD PIROSRA FORDULNI — MÉRVE.** A `tour.partners` deklarációját kivéve a lap **bukik**, és
pontosan a **dinamikus** horgonyt nevezi meg:

> `tour.partners: MEGSZAKADT — s2 · cél(sample-supplier): 0 · „Ez a lépés most nem folytatható: az
> útmutatóban megnevezett elem nem látható ezen a képernyőn"`

**Ezt a horgonyt a statikus letapogató SOHA nem látta volna** — ez a bizonyíték arra, hogy a
viselkedés-mérés nem dísz. Gépi jel a saját leletre: `ar9` (a három kimenet) · `ar10` (az állítás nem
tud üresen zöld lenni).

**ÉS EGY TÉVES GYANÚT IS KIMONDOK:** a kapu kimenetét először úgy láttam, hogy `RESULT: FAIL` mellett
**0-s** kilépést ad — ami kötelező kapunál súlyos hiba lenne. **Megmértem: nem így van.** A kapu a
piros ágon `process.exit(1)`-et hív; a 0 az én `| tail` csővezetékem kilépése volt. A gyanú az enyém
volt, a hiba nem a kapué — és ezt itt írom le, nem a javítás listáján.

Rögzítve: `D-VS-3209` · `KUKA-414` · `KUKA-415`.

---

## 3. R166 §1 — A MEGHÍVÓKÉPERNYŐ NEM ZSÁKUTCA

**A termék-döntés megszületett, és a vele együtt megnyíló mérés is lefutott.** Az R164 jelentés 8/7.
tétele ezt **nevezett maradék résként** adta át: a meghívó-képernyő a teljes alkalmazás-héjat
lecseréli, ezért ott **nincs profil-menü és nincs kilépés-vezérlő** — a felületen nem volt út, amin a
meghívó-jegy a címsorban állva kilépés érné. A `KUKA-362`/`KUKA-383` kilépés-ágának böngészős mérése
emiatt volt **bejárhatatlan**.

**Ami megépült** (`v3app/public/app.js`): a folytatás sora (`invite-continue`) **minden**
meghívó-állapoton; `invite-back` a hitelesítési állapothoz igazodó megnevezéssel (belépve a saját
fiókba, belépés nélkül a kezdőlapra); `invite-logout` a **meglévő** `logout` műveleten, tehát a
közös ürítőn. A visszalépés egyetlen hatása a jegy elfelejtése a közös otthonon — **nem fogad el
meghívást és nem módosít tagságot**. A szöveg a közös nyelvi forrásból, mind a **három bekapcsolt
nyelven**; az `invite.accept` `refused` sora is a mai valóságot mondja.

**A MÉRÉS** (`tests/e2e/v3app-r166-invite-leave.spec.mjs`, **7/7**):

| | mit mér |
|---|---|
| **M1** | névtelen: visszalépés a kezdőlapra, a jegy a **címsorból** is elmegy, a **frissítés** nem hozza vissza (nincs hurok), és a meghívó **beváltatlan** marad |
| **M2** | belépett: a **héj** jön vissza, a saját nézetben |
| **M3** | **a kilépés ága**: az előző ember a meghívó-képernyőjéről lép ki, utána **más ember** lép be ugyanabban a böngészőben — a héjban landol, nem az előző ember meghívó-lapján, és a frissítés sem éleszti újra |
| **M4** | mind az **öt** meghívó-állapot kap folytatást: beváltott · visszavont · lejárt (fejlesztői óra) · ismeretlen · más személynek címzett |
| **M5** | a feliratok a nyelvcsomagból, `hu` · `en` · `de` |

**Visszacsúszás-próba:** a folytatás sorát kivéve a lap pirosra vált.

**ÉS EGY SAJÁT MÉRŐHIBA, KIMONDVA.** Az M1 első alakja **abszolút** számot állított a megosztott
tárolón (`COUNT(*) … redeemed_at IS NOT NULL` = 0). Egyedül futtatva **zöld** volt; a teljes
próbasorban **35**-öt adott — 35 másik lap váltott be meghívót. **A rendszer helyes volt, a mérőm
nem** (`KUKA-094`). Ma a mérés a **konkrét** meghívó során áll.

**Átadási kapu:** az új vezérlőt a lefedési őr **azonnal** elkapta új hiányként
(`action:invite-leave`) — regisztrálva az `invite.accept` funkció `ui_actions`-ébe és horgonyai közé.

---

## 4. R166 §3 — MIND A 19 PÓTOLHATÓ LEFEDÉSI HIÁNY LEZÁRVA

**Az elfogadási cél teljesül, és a két kérdés külön áll.**

| mérés | előtte | most |
|---|---|---|
| **pótolható hiány** | 19 | **0** |
| **osztályozatlan** | 0 | **0** |
| nevesített fejlesztési rés | 1 (`page:personal`) | **1** (változatlanul, kimondva) |
| **bemutató-lefedés** | 21/33 mért lépéssel · „csak szöveg" **12** | **33/33** mért lépéssel · „csak szöveg" **0** |
| oldal-lefedés | 9/17 | **16/17** |
| művelet-lefedés | 42/43 | **43/43** |

**Ahogy lezárult:** tizenkét **működő** funkció SAJÁT, bejárható útmutatót kapott (`tour.verify` ·
`login` · `resend` · `logout` · `personalAccount` · `documents` · `partners` · `assistant` ·
`products` · `stockcard` · `movements` · `outbox`), a `shell.profile` pedig **kimondott közös utat**
(`tour.language/s1`) — eddig ezt csak a `tour_note` **prózája** állította, tehát a gép nem mérte. A
hét lap-hiány ezekkel szűnt meg, és mindegyik olyan lépésen áll, ami a **lapra** mutat, nem egy
minden lapon ott álló héj-horgonyon: az volt a hamis zöld, amit az R164 épp megszüntetett.

**AZ ŐRT NEM GYENGÍTETTEM.** Az `LT` (teljes hiány-halmaz) szövegén és feltételén **egy karaktert sem**
változtattam, és **PIROS marad** az egyetlen megmaradó soron. Az R166 §3 elfogadási célját külön
állítás méri: **`LT2` ZÖLD** — *pótolható 0 · osztályozatlan 0 · a maradék 1 nevesített fejlesztési
rés: `page:personal`*. A két kérdés így nem mosódik össze.

### 4.1 NÉGY VALÓDI HIBA, AMIT CSAK A BÖNGÉSZŐ HOZOTT KI

A statikus őrök (lefedési leltár · tanító-őr · nyelvi őr) **mind zöldek** voltak, miközben:

| lelet | mérve |
|---|---|
| a belépés előtti útmutató **mindig a regisztrációs lapra** vitt — a cél az **egyetlen akkori** ilyen útmutatóból volt általánosítva | a „mutasd meg, hogyan lépek be" a **regisztrációs űrlapon** ért véget (`KUKA-394`) |
| a `tour.resend` célja **másik képernyőn** volt | azonnali nevezett megszakítás (`KUKA-232` osztálya) |
| a `tour.logout` a **céges térben nem létező** `nav-security` menüpontra állt | a Belépés és biztonság csak a **személyes** menüben van; az út a **profil-menűn** megy |
| a `tour.assistant` feltáró-lánca **pontatlan** volt | a kérdés-mezőt nem a súgó megnyitása tárja fel, hanem a **Kérdezz fül** |

**És egy ötödik, a legtanulságosabb — a KIEMELÉS eltűnése.** A nézet újrarajzolása kicserélte a
`main` tartalmát, és ezzel a futó útmutató **kiemelése** eltűnt: a buborék a helyes lépésen maradt,
de **semmit nem mutatott**. A tagok-lap adata ezt eddig is bejelentette (`loadMembers` →
`tourRecheck`), a többi nézet **nem** — egy szabály, sok ház. A javítás **egy** otthonba került: a
`render()` végén, mert a szabály nem az, hogy „a minta-adat megérkezett", hanem hogy „a nézet
újrarajzolt" — így egy **jövőbeli** lekérő sem tud elfelejteni bejelentkezni a listára.

**Két kisebb, ugyanitt javítva:** a megerősítő levél újraküldéséhez vezető gombnak **nem volt
fogantyúja** (`auth-resend-open` — `KUKA-011`: hol kattint?), és a `tour.outbox` feltárója nem
korábbi lépés célja volt — **ezt a `verify:tutor` fogta meg, nem én**.

**És két SAJÁT próba-lapom kézzel írt névsorát ki kellett vezetni** (`KUKA-045` negyedszer): az
`R91-03` egy beírt négy-nevű listához mérte a kizártakat (miközben a saját megjegyzése tiltja ezt),
az `R93` pedig egy kézi bejárási listához. Ma az első **padló** (a korábban kizártak maradnak
kizárva, a halmaz nőhet), a második pedig **két nevezett tanú összege**, közös otthonból olvasott
listával (`tests/e2e/r166Tours.mjs`) — ha egy új útmutató EGYIK tanúba sem kerül be, az állítás
pirosra vált.

### 4.2 A BEJÁRHATÓSÁG ÉLŐ TANÚJA

`tests/e2e/v3app-r166-utmutatok.spec.mjs` — **4/4**:
**U0** a szövegek megléte mind a három bekapcsolt nyelven · **U1** a belépés előttiek végigkattintva ·
**U2** a belépettek végigkattintva · **U3** **390 px** szélességben is. A lap a **nevezett
megszakítást bukásnak** veszi, nem „nincs is baj"-nak.

---

## 5. A MÉRT ÁLLAPOT — SORONKÉNT

| lánc | verdikt |
|---|---|
| `verify:app-findings-r154` (a HTTP-határ és a pg-feloldók) | **ZÖLD — 307/307** (AJ · AK · AL · AI · AM · AN · AO · AP · AQ · **AR ar1–ar10** új) |
| `proof:pg-intent` | **ZÖLD** — 10 állítás, mindkét tárolón, **0 eltérés**, valódi PostgreSQL 16.15 · újramérve, **és `socket:` címmel is végigfut** |
| `proof:pg-restore-safety` | **ZÖLD — 49/49** (E10a–E10e és az `Y.` takarítás-lépés új) · `socket:` címmel is végigfut |
| `proof:pg-durability` | **ZÖLD — 13/13** · a takarító kapcsoló **mind a négy állásán** újramérve (lásd 2.3) |
| `verify:kuka` | **ZÖLD — 931/931** (KUKA-393…**415** új, **23** bejegyzés ebben a körben) |
| `verify:tutor` | **ZÖLD — 94/94** (két új állítás: a zárt listás `auth_view`, és hogy a nézet-nevek a felület forrásában is megvannak) |
| `verify:i18n` | **ZÖLD — 49/49** · ellenpróba 6/6 (809 → **821** kulcs, mind a három bekapcsolt nyelven) |
| `verify:assistant` | **ZÖLD — 55/55** |
| `app:selfcheck` | **ZÖLD — 57/57** |
| `verify:decision-numbers` | **ZÖLD — 4/4** (a legmagasabb kiadott: **D-VS-3209**) |
| `verify:lefedes` | **17 ZÖLD / 1 PIROS** — a `LT` a nevesített fejlesztési résen (`LT2` és `LR1` ZÖLD: pótolható 0 · osztályozatlan 0 · **33/33 fedett végpont**) |
| `verify:browser-gate` (`test:e2e` + `proof:core-ux` + `proof:demo-walk`) | **ZÖLD** — **369 s** + **440 s** · **134 helyzet teljesült / 0 bukott / 0 ingadozó / 0 kihagyott** · **24 próba-fájl**, mind a mérésben. **A TIZENNYOLC P2-javítás UTÁN, a mai fejen.** Egy korábbi futás PIROS volt (2.6): a kattintó bejáró kibuktatott egy második zsákutcát, azt javítottam, és csak utána lett zöld |
| `verify:v3ref` (mag-mutációs battéria) | **ZÖLD — 253/253 elkapva, 0 túlélte** · *TELJES ÉS TISZTA*, **a MAI fejen újramérve** (a mag két új függvénye miatt — lásd a 6.4 pontot) |
| `verify:external-checks` | **PIROS / NEM TELJES** — a hat hiányzó program **nem futott** (R166 §4, átadva) |

---

## 6. AMI NEM KÉSZÜLT EL — ÁTADVA, NEM ELHALLGATVA

### 6.1 R166 §2 — a valódi két szereplős bejárás a VS-felületen

**EL SEM KEZDTEM.** Ez önálló nagy blokk, és a `D-VS-3083` sávja szerint friss beszélgetésbe
tartozik. Amit az átvevőnek tudnia kell:

- a `D-VS-3199` felületfüggő elrejtés **nem teljesíti** az R164 kérését, és az R166 §2 ezt
  kimondottan **felülírja**: a két történetet a **tényleges** VS-felületen, valódi HTTP-vel és
  tárolóval kell végigvinni (két böngésző-munkamenet VAGY valódi ki-/belépés);
- **a §1 munkája épp ehhez nyit utat:** a meghívóképernyőn MOST van kilépés és visszalépés, tehát a
  „valódi ki-/belépés" útja a felületen **létezik** — a két szereplős bejárás ezen mehet végig,
  megszemélyesítő éles kapcsoló nélkül (amit az R166 §2 nem is engedélyez);
- a `proof:demo-walk` a **szimulált** adapteren visz végig — pontos jelöléssel; az ő zöldje nem a
  határ zöldje;
- a javítandók a parancs szerint: a **hiányzó utolsó lépés** és a **meghívó elfogadása utáni
  folytatásvesztés**; asztali ÉS **390 px**, újraindítással is; pozitív tesztben a kívánt végeredmény
  a **befejezés**, nem a megszakadás vagy a kihagyás.

### 6.2 R166 §4 — a hat külső ellenőrző program

**NEM FUTOTT.** `r57a` · `r59` · `r57` · `r55` · `r53` (nem futott) és `r59a` (időtúllépött) — hat
program tartalmi verdiktje hiányzik. Amit az átvevőnek tudnia kell:

- a futtatás módja **egyenként**: `node v3ref/external-checks/run-all.mjs --only <prog>`, párhuzamos
  terhelés nélkül;
- a futtató **program-kerete ma 30 perc** (`PROGRAM_BUDGET_MS = 1_800_000`,
  `v3ref/external-checks/run-all.mjs`). Az R166 §4 **engedélyezi** ennek **mért** futásidőhöz
  igazítását — de csak a **szervezési** keretet, a **mutációs egység** 15 000 ms-os korlátját NEM,
  és a korlát nem válhat végtelenné. Az indokot és a megszakítás utáni folytatást rögzíteni kell;
- a részleges futás verdiktje **soha** nem a lánc összverdiktje (ezt a futtató maga mondja ki);
- **JAVÍTÁS A SAJÁT KORÁBBI ÁLLÍTÁSOMHOZ: a mag kódja IGENIS változott.** Ennek a pontnak egy
  korábbi alakja azt mondta, hogy a `v3ref/` alatt egyetlen termék-fájlt sem érintettem, és hogy a
  hat program a mai fejen ugyanazt méri, mint a `3fea359`-en. **Ez a mai fejen nem igaz** — mérve
  (`git diff --stat 3fea359..HEAD -- v3ref/`):

  | mag-fájl | mi került bele |
  |---|---|
  | `v3ref/invite.mjs` | **+20 sor** — `forgetIntent` (a §1 szerver-oldali elfelejtése) |
  | `v3ref/command.mjs` | **+58 sor** — `commandResultReadable` (a 2.4/(1) hatás nélküli jog-kérdése) |

  **Ami ebből KÖVETKEZIK az átvevőre:** a mag mutációs battériájának korábbi zöldje (`253/253` a
  `c2cccd1` fejen) **NEM fedi** ezt a két új, exportált függvényt, és a hat külső program sem a
  `3fea359`-es magot méri. Ezért a §4 futtatása ELŐTT a mag battériája is futtatandó a mai fejen
  (`npm run verify:v3ref`) — ezt **elindítottam**, a verdiktje a 6.4 pontban áll.

### 6.4 A MAG MUTÁCIÓS BATTÉRIÁJA — ÚJRAMÉRVE A MAI FEJEN

A 6.2 pontban kimondtam, hogy a mag kódja **igenis változott** (`forgetIntent` és
`commandResultReadable`), tehát a korábbi zöld nem fedi a két új függvényt. Ezért a battériát
lefuttattam a mai fejen:

| | |
|---|---|
| **verdikt** | **TELJES ÉS TISZTA** |
| mutáció | **253 · 253 elkapva · 0 túlélte** |
| mérőhiba · rossz próba · elavult horgony | **0 · 0 · 0** |
| lefedettség a részletes eredményből | **253/253** · hiány 0 · duplikátum 0 |
| egység-darabolás | **88 egység** (a futtató saját mérésére finomítva; a költségvetés változatlan) |
| legrosszabb egység falióra | **9 586 ms** · a korlát **15 000 ms** · minden egység belefér |
| norma-lánc | **169/169** elvárt klauzula-sor, hiányzó 0 · idegen 0 |

**Tehát a két új mag-függvény nem rontotta el a battériát** — és ezt most már a mai fejen mért
bizonyíték mondja, nem egy korábbi futás.

**AMIT A FUTTATÓ MAGA MOND KI, ÉS ÁTVESZEM:** *„az egység-fájl nincs kriptográfiailag a futásához
kötve — kézzel írt egység-fájl is beolvadna; a forrás-lenyomat egyezése szűkít, de nem bizonyít"*
(nevesített függő: aláírt egység-tanú). Ez a korlát nem ebben a körben keletkezett, és nem is ebben
a körben szűnik meg.

### 6.3 Ami korábbról nyitott, és most sem változott

PG 18-kompatibilitás · felhős mentés-visszaállítás · belső teszt-fiók · élő AI-szolgáltató · és a
`personal.ownMatters` nevesített fejlesztési rés. Egyik sem mozdult ebben a körben, és egyiket sem
állítom késznek.

---

## 7. A HELYI PostgreSQL — TITOKMENTESEN

A konténer **eldobható**: friss munkamenetben a klaszter nincs meg, újra kell építeni. Jelszó nincs
és nem is kell: a klaszter csak a hurok-címen hallgat, `trust` hitelesítéssel, szintetikus adattal.
**Nem éles adat és nem felhős kiszolgáló.**

**Egy ÚJ, mért csapda, hogy ne ismétlődjön:** ebben a környezetben a folyamat **root**-ként fut, és
az `initdb` **nevezetten elutasítja** (`initdb: error: cannot be run as root`). A klasztert
jogosulatlan felhasználóval kell felépíteni és indítani (`su postgres -c '…'`), a könyvtárak
tulajdonosát előtte átállítva. A kapcsolat összetevői (gazdagép · port · szerep · adatbázis ·
socket-könyvtár · a binárisok útja) az átadási checkpoint 4. pontjában állnak — **a kapcsolati cím
összeállítva a `.env`-be megy, nem a parancssorba és nem egy lapra.**

---

## 8. AMIT EZ A JELENTÉS NEM ÁLLÍT

- **Nem** állítja, hogy a csomag merge-kész: két parancs-pont nem készült el.
- **Nem** állítja, hogy a mai fejet független fél elfogadta — a review a `3fea359`-et fedi, az azóta
  született munkát **nem**. A **válaszolt vagy lezárt szál nem elfogadás**.
- **Nem** állítja, hogy a külső-ellenőrző lánc zöld: **nem teljes**, hat program verdiktje hiányzik.
  A nem futott nem „részben", és nem zöld (`KUKA-200` · `KUKA-206`).
- **Nem** állítja, hogy a lefedési őr zöld: a `LT` **PIROS**, és az ok nevesítve áll. Az elfogadási
  célt (`LT2`) teljesítettük — a kettő nem ugyanaz.
- **Nem** állítja, hogy a két szereplős történet az alkalmazás-héjban végigvihető: az R166 §2 **nem
  készült el**.
- **Nem** állítja, hogy a PostgreSQL-mérés a Railway üzemére vagy a 18-as verzióra érvényes.
- **Nem** szolgáltatói limit és nem megtakarítási ígéret a fogyasztás-szám.

---

## 9. A FOGYASZTÁS — MÉRVE, ÉS A SZÁM PONTOSAN

A csomag ablakán (`--from` a parancs board-időbélyegéhez igazítva, `2026-10-07T13:40Z` →
`16:04:59Z`): **322 hívás** · fő-szál kontextusmedián **402 476,5** · max **617 414** ·
**400 ezer fölött 165 hívás** · **ügynök-bemenet 0** (nulla al-ügynök) · lefedettség **teljes**.

**A CHATVÁLTÁSI JELZŐ ELÉRVE** (402 476,5 ≥ 400 000). A `D-VS-3083` szabálya szerint: a **futó**
munkablokk célzott ellenőrzéssel lezárható — ez meg is történt (a kötelező böngésző-kapu és a
tizenhat rövid lánc lefutott) —, a **következő önálló nagy blokk** pedig **friss beszélgetésben**
induljon. A §2 és a §4 mindkettő önálló nagy blokk, ezért nem kezdtem el őket: a lezárás címén
**nincs új feltárás, nincs új funkció és nincs opcionális teljes söprés**.

**ÉS A TIZENNYOLC P2 UTÁN ÚJRAMÉRVE** (a teljes csomag-ablak, `2026-10-07T11:00Z` → a pillanatkép
zárása `22:55:41Z`): **828 hívás** · fő-szál kontextusmedián **421 391,5** · max **784 112** ·
**ügynök-bemenet 0** (nulla al-ügynök) · lefedettség **teljes** (1 átirat, minden modell-válasz
usage-dzsal).

**A SÁV ÁTFORDULT: CHATVÁLTÁSI JELZŐ ELÉRVE** (421 391,5 ≥ 400 000) — a mérő maga írja ki. A
`D-VS-3083` szerint ilyenkor a **FUTÓ** munkablokk célzott ellenőrzéssel **lezárható**, a **KÖVETKEZŐ
önálló nagy blokk** pedig **friss beszélgetésben** induljon. Ezt tettem: a hatodik review-kör négy
P2-je a futó blokk célzott lezárása (mérés · javítás · visszacsúszás-próba · a kötelező kapu
újrafuttatása · a szálak megválaszolása), és **a lezárás címén nincs új feltárás, nincs új funkció és
nincs opcionális teljes söprés.**

**ÉS AMI A SZÁMOT FELVITTE, AZT KIMONDOM, MÉRT SZÁMMAL:** a kör nyitásakor két parancs-pont (a §2 és
a §4) átadásra került, azóta viszont **huszonegy külső P2** és **egy P1** jött a csomag SAJÁT
javításai felett, **hét** review-körben. **A szám mérve, nem emlékezetből:** a PR review-szálait
végigolvasva a külső ellenőrző (`chatgpt-codex-connector`) megjegyzései a csomag ablakában
(`2026-10-07T11:00Z` után) **25** darab, ebből **1 P1** és **24 P2**; ezekből **három** a
csomag ELŐTTI munkamenet fejére jött (a céges/személyes útmutató-hatókör és a személy-hatókörű
útvonalak — azokat a régi író zárta, lásd az átadási checkpointot), tehát **ennek** a munkamenetnek
a mérlege **21 P2 + 1 P1**. Szakaszonként: 2.1 = 1 · 2.2 = 3 · 2.3 = 1 · 2.4 = 4 · 2.5 = 5 ·
2.7 = 4 · **2.8 = 3**. Mindegyik mérést, javítást, visszacsúszás-próbát és a kötelező böngésző-kapu
**újrafuttatását** kérte — a kapu egyszer **pirossal** is válaszolt. Ez nem a lezárás címén indított
új feltárás, hanem a **futó** munkablokk célzott lezárása: a review-szálak megválaszolása és a hozzá
tartozó mérés.

**ÉS EGY SAJÁT HIBÁT ITT IS KIMONDOK:** ez a szám a jelentés korábbi alakjában **tizenhét** volt (és
egy helyen tizenhárom) — **emlékezetből**, nem mérésből. A szálak végigolvasása a hatodik kör után
**tizennyolcat** adott, a hetedik kör három leletével **huszonegyet**. A szabály ugyanaz, mint a
`KUKA-412`-nél: ami hivatkozási alap, azt MÉRJÜK, ne nézzük.

**ÉS EZ NEM VONJA VISSZA A LEZÁRÁST — DE A KORÁBBI MONDATOMAT JAVÍTOM.** A jelentés egy korábbi
alakja azt írta, hogy a medián „alacsonyabb" a korábbi 402 476,5-nél: ez **fordítva volt**, a
421 391,5 **magasabb**. A beszélgetés közben **tömörítésen** ment át — a `R114` viszont kimondja: **a tömörítéssel folytatott
beszélgetés NEM friss beszélgetés**. A négy P2 javítása a **futó** munkablokk célzott lezárása volt
(review-szálak megválaszolása és a hozzá tartozó mérés), nem új blokk. A §2 és a §4 továbbra is
**friss beszélgetésben** induljon.

A tartalom nélküli leltár a repóban: `docs/70_PLANNING/V3_R166_FOGYASZTAS_LELTAR.json`
(hívás-szám, blokk- és eszköz-összesítők, bájtszámok — tartalom, kapcsolati cím, kulcs és e-mail
nélkül; titok-minta ellenőrzéssel **0 találat**).

**Amit ez a szám NEM:** nem szolgáltatói limit, nem kimért optimum és nem megtakarítási ígéret.

---

## 10. A DÖNTÉSEK ÉS A TANULSÁGOK

| szám | miről |
|---|---|
| **D-VS-3201** | a kapcsolati cím sémája zárt lista, és a két fogyasztó eltérése megállás |
| **D-VS-3202** | a 19 pótolható lefedési hiány lezárva, és az elfogadási cél külön mérve |
| **KUKA-393** | egy címet annyiféleképpen olvasnak, ahány fogyasztó futtatja |
| **KUKA-394** | amiből egy példa van, abból nem szabad szabályt olvasni — és a regiszter zöldje nem bejárhatóság |
| **D-VS-3203** | a titok végét a shell-szó határa adja, nem az első záró idézőjel |
| **KUKA-395** | egy titok-tisztító határát az a nyelvtan adja, ami a szöveget előállította |
| **D-VS-3204** | a visszalépés szándéka a szerverig megy, és a felkínálás az ÉLŐ feltételen áll |
| **KUKA-396** | egy „elfelejtő" annyit felejt, ahány tárolót megkérdez — a böngésző-oldali ürítő a szerver állapotát nem éri el |
| **KUKA-397** | amit egy útmutató bevezetőjében leírok, az nem kapu: a feltételt a darab deklarálja, a tényt a kiszolgáló méri |
| **D-VS-3205** | a kapcsoló-olvasásnak EGY otthona van, és egy pin-azonosító EGY mérésre mutat |
| **KUKA-398** | a környezeti kapcsoló nem igaz-érték, hanem szöveg — és amikor a lelet OSZTÁLYT ír le, a javítás a feloldó, nem a sor |
| **KUKA-399** | a mérőeszköz is mérés tárgya — ami hivatkozási alap, annak egyértelműségét MÉRJÜK, ne nézzük |
| **D-VS-3206** | a döntést és a hatást külön kell tudni meghívni, és a bizonytalan bemenet nem a megengedő ág |
| **KUKA-400** | egy kérdésnek és egy kiadásnak nem ugyanaz a feloldója — a hatás ott keletkezett, ahol senki nem kereste |
| **KUKA-401** | egy ellenőrző kérdés bukása nem válasz: az ismeretlen mindkét irányban buktat |
| **KUKA-402** | egy új séma támogatása nem a feloldóval készül el, hanem az utolsó hívóval |
| **KUKA-403** | aki leváló gyereket indít, az a kilépésével nem állítja meg |
| **D-VS-3207** | a javítás hatókörét a hiba-osztály adja, és a próba a saját szavát is meghallgatja |
| **KUKA-404** | amikor egy hiba-osztályt javítok, a szomszéd passzust is meg kell kérdezni |
| **KUKA-405** | egy takarítás, ami a verdikt után fut, nem tud verdikt lenni |
| **KUKA-406** | aki kimondja a hiányt, de nem számolja be a verdiktbe, az elhallgatta |
| **KUKA-407** | egy útmutató nem navigálhat el a saját céljától — és a bejárás nyomja meg, amit az ember |
| **KUKA-408** | egy nemleges válasz nem hagyhat maga után romot |
| **KUKA-409** | egy lépés célja nem lehet olyan vezérlő, ami a használatával megszűnik — és a piros kapu, ami a saját munkámat buktatja meg, értékesebb a zöldnél |
| **D-VS-3208** | egy határ csak a saját nyelvtanában határ, és az előfeltételt a darab deklarálja |
| **KUKA-410** | shell-nyelvtant alkalmaztam egy URL-re — a javításom nyitott új szivárgást |
| **KUKA-411** | amit a mérés létrehozott, az a mérésé: az „idegen" szerep, nem tulajdon |
| **KUKA-412** | egy „vagy" kapcsolatú ellenőrzésben a gyengébb jel nem némíthatja el az erősebbet |
| **KUKA-413** | harmadszor ugyanez az osztály egy körön belül — és ez a szám a tanulság |
| **D-VS-3209** | egy őr addig általános, ameddig a hatóköre ér, és a halmazt a TILTOTT elemre kérdezzük |
| **KUKA-414** | az általánosnak nevezett őröm egy függvényre volt általános — és a dinamikus horgonyt betű szerint kereste |
| **KUKA-415** | egy „van-e benne” kérdés nem ugyanaz, mint egy „csak ez van-e benne” |
