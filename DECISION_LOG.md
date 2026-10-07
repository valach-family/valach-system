# DECISION LOG — Valach System (V3)

**A számozás a 3000-es blokkból megy.** A V2 (`valach-family/vs`) a 3000 ALATT marad, a V3 a
3000-től — így két repó egyszerre oszthat számot ütközés nélkül, és a `D-VS-…` továbbra is EGY
dolgot jelöl, nem kettőt. Gépi őr: `npm run verify:decision-numbers` (kiírja a következő szabad
számot, és piros lesz, ha valaki a blokkon kívülre lép).

**A határ mérésből jön, nem tippből** (D-VS-3005): az első alak a 700 volt, és a V2 akkor a 670-nél
állt — 29 szabad szám, a git-történetből mért ütemen (433 → 670 huszonkét nap alatt) **egy hét**.
A V2 nem áll le: a Shoprenter-szinkron és a folyamatok alapszintű működése még hátravan, három
cégtér használja a KS kiváltására. A 3000-es határ **2329 szabad számot** hagy neki, ami a mért
leggyorsabb ütemen is 215 nap, a mai ütemen másfél év.

A 3000 előtti döntések a V2 repó `DECISION_LOG.md`-jében élnek. Nem másoljuk át: egy fogalomnak EGY
otthona van (KUKA-018).

---

## D-VS-3206 — A DÖNTÉST ÉS A HATÁST KÜLÖN KELL TUDNI MEGHÍVNI, ÉS A BIZONYTALAN BEMENET NEM A MEGENGEDŐ ÁG (R166, négy külső P2)

**A NÉGY LELET EGY OSZTÁLYT MUTAT:** egy bizonytalan vagy más sémájú bemenetet, illetve egy hatásos
feloldót a kód a **kényelmes** ágra fordított. Mind a négy javítva, mért visszacsúszás-próbával.

**(1) A jog-kérdésre kiadást hívtam** (`KUKA-400`). Az R166 §3-ban a felkínálás kapuja a
`readSample()`-t hívta — annak a sikeres ága `disclose()`-t hajt végre. A súgó megnyitása (`GET
/api/assistant/status`, deklaráltan `mutates: false`) így **minden alkalommal** olyan kiadási
leltár-sort írt, ami szerint védett adat kiadásra került. **Mérve: három kérés három sor.** Egy
kiadási leltár, amibe a súgó megnyitása is bekerül, használhatatlan. A javítás: a kérdés **hatás
nélküli** alakja a **magban, a kiadó mellett** (`commandResultReadable`) — ugyanaz a két döntés,
ugyanazon az egy óraolvasáson, `disclose` nélkül. Nem a hívónál, mert ott két szabály keletkezne
egy kérdésre.

**(2) A bukott ellenőrző kérdés „nincs ott"-ra fordult** (`KUKA-401`). Az „eltakarítva" állítások
attól is átmentek, hogy az ellenőrző kérés maga nem futott le. Mostantól három állapot, és a
hiány–jelenlét **két külön, fail-closed** kérdés: az ismeretlen **mindkettőt** megbuktatja, és a sor
kimondja az okot.

**(3) A feloldót csak az átirányításba kötöttem be, az indulásba nem** (`KUKA-402`). Az R166/P1
javításom a `socket:` sémát mind a négy cél-feloldóban rendbe tette, a két pg-próba **induló**
kérdése viszont tovább csupaszította az utat „adatbázis-névvé" — vagyis a helyi-kapu által
**befogadott** cím-alakon mindkét próba el sem indult. A bekötés listáját a szabály **régi**
olvasóiból vezettem le (`KUKA-227` osztálya).

**(4) A megszakítás takarított, de a leváló gyereknek nem szólt** (`KUKA-403`). A gyerek a szülő
kilépése után is futtathatta a `pg_dump`/`pg_restore`-t, versenyben a takarítással — a kezelő tehát
a saját mérésének az állítását tudta aláírni. Mostantól kötött sorrend: előbb a **folyamatcsoport**
áll le, utána a takarítás.

**Gépi jel:** `npm run verify:app-findings-r154` — **AN csoport** (an1–an3) és **AO csoport**
(ao1–ao8) · `npm run verify:kuka` · `npm run proof:pg-restore-safety` · `npm run proof:pg-intent`.
**Élő tanú:** mindkét pg-lánc **`socket:` címmel végigfut** (10 állítás / 0 eltérés, illetve 48/48).
**Visszacsúszás-próba mérve, mind a négyre:** a javításokat visszavéve **öt pin piros**
(`an1` · `an3` · `ao6` · `ao7` · `ao8`).

**Amit ez NEM állít:** a mérés a feloldókra, a határ-végpontra és a próba-láncokra áll. Üzleti
folyamatról, felhős üzemről és a PG 18-ról ebből nem következik állítás.

**KUKA-400** · **KUKA-401** · **KUKA-402** · **KUKA-403**

---

## D-VS-3205 — A KAPCSOLÓ-OLVASÁSNAK EGY OTTHONA VAN, ÉS EGY PIN-AZONOSÍTÓ EGY MÉRÉSRE MUTAT (R166, külső review P2 + saját lelet)

**A DÖNTÉS KÉT RÉSZE.**

**(1) A kapcsoló-olvasás EGY feloldó, és a bekapcsolás CSAK a pontos `1`.** A külső átolvasás (Codex,
P2) kimutatta, hogy a `VS_KEEP_RESTORE_TARGET` a PUSZTA igaz-értéken állt (`if (process.env.X)`),
ezért a kikapcsolásnak szánt `VS_KEEP_RESTORE_TARGET=0` vagy `=false` **bekapcsolta** a megtartást —
futásonként egy maradék adatbázis a kiszolgálón, pontosan azért, amiért a futtató ki akarta kapcsolni.

**És a szabály már megvolt.** Pontosan ezt a hibát javította az R164 a `VS_SAFETY_ALLOW_REMOTE`
kapcsolón — de a HELYSZÍNEN javította, nem szabályként. A testvér-kapcsoló így a régi alakban maradt.
Mostantól **egy feloldó** (`explicitSwitch`, a cél-döntések otthonában), mindkét fogyasztó ezt hívja,
és a beállított-de-nem-`1` érték **nevezetten nem felismert** — a néma tartalék-ág elrejtené az
elírást (KUKA-238). A takarító sor ezt kiírja, tehát a futtató látja, hogy a kapcsolóját figyelmen
kívül hagytuk.

**Amit ez NEM állít:** a mérés a feloldóra és a takarító ágra áll. Hogy a korábbi futások hagytak-e
maradékot az operátor kiszolgálóján, arról ebből nem következik állítás — a maradék-jelentés
megnevezi őket, de eldobni SOHA nem dobjuk el (nem a mi tulajdonunk).

**(2) Egy pin-azonosító EGY mérésre mutat.** A javítás közben kiderült, hogy ebben a körben
**háromszor** adtam ütköző csoport-előtagot a söprés-battériában (`ac` · `ae` · `ag` — mind a három
ÉLT már az F164-es pinekben), és a harmadikat csak a visszacsúszás-próba kimenete buktatta le. A
hivatkozás ilyenkor NÉMÁN kétértelmű: a jelentés és a KUKA-jegy `ag1`-re mutat, a battéria viszont
két KÜLÖN mérésben futtat `ag1`-et. A négy R166-os csoport átnevezve (`aj` · `ak` · `al` · `ai`),
a hivatkozások a regiszterben, az őr-otthonban, az archívumban és a jelentésben igazítva.

**A mérce PONTOS, nem csak szigorú** (KUKA-216): az azonosító ismétlődése önmagában nem hiba — a
`(b1)` háromszor fut egy hurokban, UGYANABBAN a mérésben, három bemenettel, és a neve megnevezi,
melyikről van szó. A hiba a **két külön mérés közti** ütközés. Ezt méri az új őr, és csak ezt.

**Gépi jel:** `npm run verify:app-findings-r154` — **AI csoport** (ai1–ai5: a kapcsoló mindkét
irányban, az üres és a nem felismert érték, az ellenpár a testvér-kapcsolóra) és **AM csoport**
(am1–am4: a kétlaki azonosító, a beültetett ellenpár, a kötött alak, a szó szerinti név-egyezés) ·
`npm run verify:kuka` · `npm run proof:pg-durability`. **Visszacsúszás-próba mérve:** a puszta
igaz-értékes olvasás visszatételére **három pin piros** (köztük a testvér-kapcsolóé — ez bizonyítja,
hogy tényleg EGY otthon); az ütközés visszatételére az **am1 piros**.

**KUKA-398** · **KUKA-399**

---

## D-VS-3204 — AMIT NEM LEHET VÉGIGVINNI, AZT NEM KÍNÁLJUK FEL — ÉS A „VISSZA" A SZERVERIG MEGY (R166, három P2)

> **Hatály:** V3 — a meghívó-folytatás és az útmutatók felkínálása. **V2-módosítás nem történt.**

**Dátum:** 2026-10-07 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R166 (a kód-review HÁROM
P2-je a `3747c12` fejen, mind az ebben a körben épített SAJÁT munkám felett) · **KUKA-396 · 397**

**A döntés — három tétel.**

1. **A MEGHÍVÓ ELHAGYÁSA A SZERVERIG MEGY.** A visszalépés a **tárolt** folytatást is elviszi:
   `forgetIntent` a magban (ahol a sort írjuk és olvassuk — egy otthon) és egy **nevezett** út, amin
   a felhasználó kimondja (`POST /api/invites/pending/forget`, **törzs nélkül**: jegyet nem fogad el,
   tehát más munkamenet folytatását nem lehet vele elvinni). A sorrend kimondott: **előbb a tárolt
   állapot, utána a böngészőé**.
2. **A FELKÍNÁLÁS AZ ÉLŐ FELTÉTELHEZ KÖTÖTT.** `requires_dev_hozzáférés` helyett a tények:
   **`dev_mailbox`** (a `devSurface` kapcsolóból) és **`stock_access`** (a **mag** válaszából a
   minta-készlet olvasására — ugyanaz a döntés, amit a lap kapuja tükröz). Az útmutató **deklarálja**
   a feltételét (`requires_dev_mailbox` · `requires_stock_access`), a kapu a deklarációt kérdezi, és
   a mezők a **határon is** átmennek.
3. **A KAPUT MINDKÉT IRÁNYBAN MÉRJÜK** (`KUKA-091`): zárva nem kínál, nyitva igen — és egy ellenpár
   kimondja, hogy a két kapu **csak a sajátjait** zárja (a többi 18 útmutató készlete betűre
   változatlan).

**Miért — és ez mind a saját munkám feletti lelet.**

| lelet | a kár, mérve |
|---|---|
| a „vissza" csak a böngészőt ürítette | aki **kimondottan** elhagyta a meghívót, majd belépett, azt a tárolt folytatás **visszavitte** ugyanarra a meghívóra. A saját lapom (`M1`) **zöld** volt rá, mert csak a böngésző állapotát és a címsort mérte |
| a megerősítés és a Próbaüzenetek útmutatója | telepített környezetben a `devSurface` hamis → a `/dev/mailbox` **404**, a `mailbox` cél nem létezik → a második lépésen nevezett megszakítás |
| a két készlet-nézet útmutatója | kiadott `keszlet` adatkör nélkül a lap a **megtagadó** panelt rajzolja a tábla helyett → azonnali megszakítás. **És a bevezető szövegébe magam írtam be, hogy engedélyhez kötött — egy felirat viszont nem kapu** (`KUKA-221`) |

A második és a harmadik pontosan a **`KUKA-391`**, amit **ebben a körben idéztem** — és három körön
belül másodszor buktam el ugyanazon: a feltételt a környezet jeléből vagy a tagságból vezettem le,
pedig a kérdés az, hogy a **cél ott van-e a lapon**.

**A bizonyíték.** `verify:app-findings-r154` **259/259** — az új **AL csoport** (`al1`–`al4`) a két
kaput **mindkét** irányban, az ellenpárral és a deklaráció kétirányú mérésével; az **`s11`** őr
(az állapotot **kötő** utak kimondott leltára) pedig **elkapta** az új végpontot, mielőtt a csomag
lezárult — ezért van. Élő tanú: `tests/e2e/v3app-r166-invite-leave.spec.mjs` **M6** — a visszalépés
utáni belépés **nem visz vissza**, és az **ellenpár**: visszalépés **nélkül** a folytatás továbbra is
megmarad (a `KUKA-297` ígérete nem veszett el). **Visszacsúszás-próba mérve, mind a háromra:** a két
kaput kivéve `al1`+`al2` piros; a törlő hívást kivéve az `M6` piros. `verify:kuka` **877/877**.

**Amit ez NEM állít.** Nem állítja, hogy minden útmutató minden környezetben végigvihető: azt
állítja, hogy ahol nem, ott **nem is kínálódik fel** — és a kizárás **nevezett**, nem néma
megszakadás.

---

## D-VS-3203 — A TITOK VÉGÉT A SHELL-SZÓ HATÁRA ADJA (R166, külső review P2)

> **Hatály:** V3 — a mentési/visszatöltési szerszámlánc titok-tisztítója
> (`tools/lib/vs_pg_target.mjs`). **V2-módosítás nem történt.**

**Dátum:** 2026-10-07 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R166 (a biztonsági
átolvasás P2-je, `#discussion_r4207550936`) · **KUKA-395**

**A döntés.** A jelszó-érték végét **nem** az első záró idézőjel adja, hanem a **shell-szó** határa:
a `shellWordEnd` letapogató az értéket egy szóként fogyasztja (aposztróf-idézett szakasz ·
idézőjel-idézett szakasz `\x` escape-ekkel · escape-elt karakter · sima karakter), amíg idézeten
**kívüli** szóköz, `&` vagy `;` nem jön. A három korábbi minta helyére **egy** szabály lép. A
**záratlan** idézet a sor végéig tart.

**Miért — és ez a saját javításom feletti lelet.** Az `R164` köre (`KUKA-371`) azt javította, hogy az
idézett érték egyáltalán eltűnjön; a határt viszont az első záró idézőjelnél húztam meg. A shell
máshol húzza: egy **aposztrófot tartalmazó** jelszót `'pa'\''ss'` alakban ír ki, és azt **egy szónak**
olvassa. Mérve, javítás előtt:

| bemenet | RÉGI kimenet |
|---|---|
| `PGPASSWORD='pa'\''ss' psql` | `PGPASSWORD=«elrejtve»''ss' psql` — a **maradék kiszivárgott** |
| `PGPASSWORD='nyitva marad a sor vegeig` | **változatlan** — a *teljes* jelszó a naplóba |

Ez a `KUKA-203` osztálya a legrosszabb alakjában: a fél-tisztító **bizalmat ad**, miközben
szivárog — és épp a próba-naplókba, amiket bizonyítékként commitolunk.

**A bizonyíték.** `verify:app-findings-r154` **AK csoport (ak1–ak7)**, a söprésben: a glued aposztróf ·
az escape-elt idézőjel · a záratlan idézet · **és az ellenpárok a jogos esetekre** (a három megszokott
alak pontosan háromszor rejtőzik el, a titokmentes szöveg változatlan, a `;` utáni nem-titkos mező
megmarad, és a kapcsolati címmel együtt is helyes). A battéria **255/255**. **Visszacsúszás-próba
mérve:** a három régi minta visszaállítására **három pin piros**, köztük a záratlan idézet.
`proof:pg-restore-safety` **48/48** (E9e), `proof:pg-intent` **10/0 eltérés**,
`proof:pg-durability` **13/13** — mind valódi PostgreSQL 16.15-en. `verify:kuka` **870/870**.

**És a `KUKA-371` gépi jele a mai otthonra igazítva:** a jele egy kommentsorra mutatott, amit a
javítás elvitt. A szabály nem változott (az idézett érték teljesen eltűnik), csak **erősebb** lett,
ezért a minta mostantól a `shellWordEnd` letapogatóra áll — a védő erő megmarad: ha a letapogató
eltűnik, a jel piros.

**Amit ez NEM állít.** Nem teljes shell-elemző, és nem állítja, hogy minden naplózó út át van
vizsgálva: ez a feloldó a pg-láncok gyermek-diagnosztikáját tisztítja, és a hatóköre ennyi.

---

## D-VS-3202 — A TIZENKILENC PÓTOLHATÓ LEFEDÉSI HIÁNY LEZÁRVA, ÉS AZ ELFOGADÁSI CÉL KÜLÖN MÉRVE (R166 §3)

> **Hatály:** V3 — a tudás-regiszter, a felület útmutatói és a lefedési őr. **V2-módosítás nem történt.**

**Dátum:** 2026-10-07 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R166 §3 · **KUKA-394**

**A döntés — négy tétel.**

1. **A TIZENKÉT MŰKÖDŐ FUNKCIÓ SAJÁT, BEJÁRHATÓ ÚTMUTATÓT KAP** (`tour.verify` · `login` · `resend` ·
   `logout` · `personalAccount` · `documents` · `partners` · `assistant` · `products` · `stockcard` ·
   `movements` · `outbox`), a `shell.profile` pedig **kimondott közös utat** (`tour.language/s1`) —
   eddig ezt csak a `tour_note` prózája állította, tehát a gép nem mérte. A hét **lap-hiány** ezekkel
   szűnt meg, és mindegyik olyan lépésen áll, ami a **lapra** mutat, nem egy minden lapon ott álló
   héj-horgonyon: az volt a hamis zöld, amit az R164 épp megszüntetett.
2. **AZ ELFOGADÁSI CÉL KÜLÖN ÁLLÍTÁS, ÉS AZ EREDETI ŐR VÁLTOZATLAN.** Az R166 §3 célja szó szerint
   „pótolható hiány 0; osztályozatlan 0" — ezt az **`LT2`** méri, és **ZÖLD**: *pótolható 0 ·
   osztályozatlan 0*. A `LT` (teljes hiány-halmaz) **PIROS marad** az egyetlen megmaradó soron
   (`page:personal`), és a szövegén egy karaktert sem változtattunk — különben a zöld a mérés
   lazításából jönne, nem a munkából.
3. **A `personal.ownMatters` MARAD NEVESÍTETT FEJLESZTÉSI RÉS** — a Saját ügyek listája mint
   *képesség* nem létezik, tehát nem „megírható leírás" kérdése. A regiszter ezt nevesíti, az `LC2`
   pedig megköveteli, hogy a hiányzó üzleti képességet kimondja.
4. **A BEJÁRHATÓSÁG ÉLŐ TANÚT KAP.** A regiszter zöldje nem bejárhatóság: a
   `tests/e2e/v3app-r166-utmutatok.spec.mjs` mind a tizenkét útmutatót **végigkattintja** a valódi
   felületen (U0 a szövegek három nyelven · U1 a belépés előttiek · U2 a belépettek · U3 **390 px**),
   és a **nevezett megszakítást bukásnak** veszi, nem „nincs is baj"-nak.

**Miért kellett ez az élő tanú — NÉGY VALÓDI HIBA, amit csak a böngésző hozott ki.** A statikus őrök
(lefedési leltár · tanító-őr · nyelvi őr) **mind zöldek** voltak, miközben:

| lelet | mérve |
|---|---|
| a belépés előtti útmutató **mindig a regisztrációs lapra** vitt (a cél az egyetlen akkori ilyen útmutatóból volt általánosítva) | a „mutasd meg, hogyan lépek be" a **regisztrációs űrlapon** ért véget — `KUKA-394` |
| a `tour.resend` célja **másik képernyőn** volt | azonnali nevezett megszakítás (`KUKA-232` osztálya) |
| a `tour.logout` a **céges térben nem létező** `nav-security` menüpontra állt | a Belépés és biztonság csak a **személyes** menüben van; az út a **profil-menűn** megy |
| a `tour.assistant` feltáró-lánca **pontatlan** volt | a kérdés-mezőt nem a súgó megnyitása tárja fel, hanem a **Kérdezz fül** |

**És két kisebb, ugyanebben a körben javítva:** a megerősítő levél újraküldéséhez vezető gombnak
**nem volt fogantyúja** (`auth-resend-open` — `KUKA-011`: hol kattint?), és a `tour.outbox`
feltárója nem korábbi lépés célja volt — ezt a **`verify:tutor` fogta meg**, nem én.

**Gépi jel.** `verify:lefedes` **17 ZÖLD / 1 PIROS** (a `LT` a nevesített fejlesztési résen) ·
`LT2` **ZÖLD** · `verify:tutor` **94/94** (két új állítással: a zárt listás `auth_view`, és hogy a
nézet-nevek a felület forrásában is megvannak) · `verify:i18n` **49/49** (a 12 útmutató szövege
**mind a három bekapcsolt nyelven**: 809 → 821 kulcs) · `verify:assistant` **55/55** ·
`app:selfcheck` **57/57** · `verify:kuka` **867/867**.

**Amit ez NEM állít.** Nem állítja, hogy a lefedési őr zöld — **nem az**, és az ok nevesítve áll.
Nem állítja, hogy minden funkciónak SAJÁT útmutatója van: a közös út továbbra is elfogadható, de
**csak kimondva és valódi lépéssel** (a `shell.profile` így áll). És nem állítja, hogy a két
engedélyhez kötött nézet (`stockcard` · `movements`) jogot ad a felhasználó helyett: az útmutató
ott a jogadás útjára mutat, és a lap kimondja, ha nincs kiadva az adatkör.

---

## D-VS-3201 — A KAPCSOLATI CÍM SÉMÁJA ZÁRT LISTA, ÉS A KÉT FOGYASZTÓ ELTÉRÉSE MEGÁLLÁS (R166/P1)

> **Hatály:** V3 — a visszatöltési/mentési szerszámlánc (`tools/lib/vs_pg_target.mjs`). **V2-módosítás
> nem történt, és nincs rá engedély.**

**Dátum:** 2026-10-07 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R166 (a nyolcadik review-kör
nyitott P1-je, `#discussion_r4207213198`) · **KUKA-393**

**A döntés — három tétel.**

1. **A SÉMA ZÁRT LISTÁN ÁLL, EGY OTTHONBAN.** A `PG_URL_SHAPES` + `pgUrlShape` adja meg, hol áll az
   adatbázis és hol a gazdagép: `postgres:` és `postgresql:` → **hálózati** (az ÚT az adatbázis),
   `socket:` → **socket** (az ÚT a socket-KÖNYVTÁR, az adatbázist a `?db=` nevezi meg). Mind a négy
   feloldó — `effectiveDatabase` · `withDatabase` · `effectiveHost` · és rajtuk keresztül a
   `cliEnvFor` — **erre ágazik**, nem a saját feltevésére. Ami nincs a listán, az **nevezett
   megállás**, nem tipp (`KUKA-236`).
2. **AHOL A KÉT FOGYASZTÓ MÁST OLVAS, A NÉV NEM MEGÁLLAPÍTHATÓ.** A lánc **két** klienst futtat:
   node-postgres a kódban, libpq a `pg_dump`/`psql` gyermekben. A hálózati sémán a `?dbname=`-et a
   libpq **veszi**, a node-postgres pedig az utat írja a `database`-re **feltétel nélkül** — ezért a
   feloldó a két olvasatot **összeveti**, és eltérésnél **megáll**. Nincs „helyes érték", ahol a lánc
   végén `DROP DATABASE` áll (`KUKA-049` · `KUKA-203`).
3. **A `socket:` CÍMET A CLI-GYERMEK SOHA NEM KAPJA MEG KAPCSOLATI SZTRINGKÉNT** — a libpq ezt az
   URI-t nem értelmezi. A gyermek a `cliEnvFor` **környezetét** kapja: `PGHOST` a socket-könyvtár,
   `PGDATABASE` a megnevezett cél.

**Miért — és mi volt a KÁR.** A lelet szövege a `postgres://…?db=…` felülírást állította. A kitűzött
könyvtáron (`pg-connection-string` **2.14.1**) **megmérve ez az eset nem áll elő**: a hálózati sémán
az út feltétel nélkül győz, mind a négy mért cím `original`-t adott. **A mechanizmus viszont létezik,
csak a `socket:` sémán** — és ott a kár **néma** volt:

| | RÉGI alak | ÚJ alak |
|---|---|---|
| `effectiveDatabase('socket:/var/run/postgresql?db=eles')` | **`var/run/postgresql`** (az ÚT!) | **`eles`** |
| `sameDatabase(…, 'eles')` → a biztonsági kapu | **ÁTENGED** → `DROP DATABASE "eles"` a **valódi** adatbázison | **MEGÁLL** |
| `withDatabase(…, friss_cél)` | az **ÚTAT** írja át (a socket-könyvtárat rontja el), a `?db=` **érintetlen** → az átirányítás nem irányít át | az **ÚT érintetlen**, a `?db=` kapja a nevet |

**A LELETET NEM ZÁRTAM LE „NEM REPRODUKÁLHATÓ" CÍMEN.** A mért tény az, hogy a *leírt* eset nem áll
elő a kitűzött könyvtáron — a *mechanizmus* viszont valódi, és a safety-kritikus feloldóban nyitva
volt. Egy lelet leírt esetének megdőlése nem a lelet megdőlése.

**A bizonyíték — és az ellenpár a KÁRRA, nem a listára.**

- **`verify:app-findings-r154` AJ csoport (aj1–aj8), a söprésben:** a zárt lista · a név · a kapu · az
  átirányítás · a fail-closed dobás ismeretlen sémán · a hálózati divergencia · a gazdagép · a
  CLI-környezet. A battéria **250/250 PASS**.
- **`proof:pg-restore-safety` E10a–E10e, VALÓDI kiszolgálón, Unix-socketen:** a régi alak kapcsolata
  nem a friss célra ment · az új alak **a friss célra** ment · az **eredeti adatbázis érintetlen**
  (0 nyom) · a nyom **a friss célban** áll · és a CLI-környezet a socket-könyvtárat kapja. A lánc
  **48/48** (korábban 43/43). A socket-könyvtár a **kiszolgálótól** jött
  (`SHOW unix_socket_directories`), nem tippből; ha a kiszolgáló nem hallgat Unix-socketen, a lépés
  **NEM MÉRT** — nevezetten, nem néma zöldként (`KUKA-093` · `KUKA-363`).
- **VISSZACSÚSZÁS-PRÓBA MÉRVE:** a séma-sort és a divergencia-blokkot visszaállítva a battéria **11
  pinje piros**, köztük az `aj3` — a kapu újra átengedte volna a valódi adatbázis eldobását.
- A három pg-lánc **újramérve** az új feloldóval: `proof:pg-intent` **10 állítás / 0 eltérés** ·
  `proof:pg-restore-safety` **48/48** · `proof:pg-durability` **13/13**, valódi PostgreSQL **16.15**-en.

**A SAJÁT PINJEIM NÉGY ÁLLÍTÁSÁT ÁT KELLETT ÍRNI, ÉS EZT KIMONDOM.** Az `r5` · `w1` · `y2` · `aa2` a
`?dbname=` **libpq-olvasatát** állította eldöntött névnek (`F158-01` · `F158-16` · `F158-22` körei).
Ez **fél igazság volt**: a másik fogyasztó ugyanazt a címet máshogy olvassa. A négy pin ma az
**eltérést** állítja, tehát **erősebb** — a leletek eredeti kára (a cím félreolvasott neve átengedte a
kaput) ezzel **mindkét** névre zárva. A `KUKA-326` gépi jele is a mai alakra igazítva (a `dbname`
törlése háromkulcsos hurokban áll; a védő erő megmarad: a kulcslista eltűnése piros).

**Amit ez NEM állít.** Nem a libpq teljes utánzata, és nem PostgreSQL 18-kompatibilitás. A kliens
által elfogadott két alakot (`socket://u@/út` pót-gazdagéppel, és a perjellel kezdődő
„gazdagép SZÓKÖZ adatbázis") a feloldó **szándékosan nem** utánozza le: ott nevezetten megáll — a
második értelmezési szabály a második hibalehetőség lenne.

---

## D-VS-3200 — A SZEMÉLYES TÉR LAP-LISTÁJA A KLIENS TELJES SZABÁLYÁBÓL JÖN, NEM A MENÜBŐL (R164 review, P2)

**A döntés.** A személyes körben elérhető lapok listája (`PERSONAL_SCREENS`) a **mindig elérhető lapok**
(`ALWAYS_AVAILABLE_SCREENS` — a kliens `pageAvailable` feloldójának első sora: `overview` · `new` ·
`profile` · `security`) és a **személyes menü** lapjainak **uniója**. A „mindig elérhető" listát a
próba a kliens **fájljából** olvassa ki, tehát nem lehet elhinni, csak mérni.

**Miért.** A `D-VS-3198` javításban a listát a személyes MENÜ lapjaival egyeztettem. A `new` lap
viszont nem menüpont: a fiókváltó `ws-add` gombja nyitja. Így az `account.add_business` súgója, a
`prepare.business` művelete és a `tour.addBusiness` bemutató **eltűnt a személyes körből** — pontosan
ott, ahol az ember az **első** vállalkozását létrehozza. A kár tehát nem elméleti: a legfontosabb
kezdő utat rejtettem el.

**És a mérés is rossz volt.** A saját ellenpárom (`ah2`) a MENÜVEL egyeztetett, tehát a hibás listát
**helyesnek mérte**. Egy javítás ellenpárja nem az lehet, amiből a javítást levezettem: a **kár** felé
kell mérni. Az új `ah5` ezt teszi — a személyes körben a vállalkozás-létrehozás elérhető, a
`tour.addBusiness` felkínálódik és a `prepare.business` engedélyezett, miközben a könyv-hatókörű
`members` továbbra sem elérhető.

**Gépi jel.** `npm run verify:app-findings-r154` (ah2 az unió · ah4 a kliens fájljából mért lista ·
ah5 a kár ellenpárja) · `npm run verify:kuka` (KUKA-392).

---

## D-VS-3199 — AMIT NEM LEHET VÉGIGVINNI, AZT NEM KÍNÁLJUK FEL: A BEMUTATÓ A FELÜLET VEZÉRLŐJÉHEZ KÖTÖTT (R164 review, P2)

**A döntés.** A szereplő-váltó végigvezetéseket (`tour.inviteRevoke` · `tour.reentry`) **nem a
kiszolgáló környezete** kapuzza, hanem a **betöltött felület**: a kérés megnevezi a felületét (zárt
lista: `app` · `demo`), a kiszolgáló pedig a lap **fájljából MÉRI** a horgonyokat
(`data-testid` · `data-tour-anchor`), és a bemutató **saját** `switch_actor` lépéseinek célját kéri
tőle. Nyilatkozat nélkül, nem ismert névre, hiányzó horgonyra: **zárva**.

**Miért.** A `VS_DEMO` környezet-jel nem mondja meg, hogy a lapon van-e „váltás a másik nézetére"
vezérlő. A böngészős próbapad a **valódi** alkalmazás-héjat futtatja bemutató-környezetben, ahol ilyen
vezérlő nincs — a kiszolgáló mégis felkínálta a két végigvezetést, és azok a váltó lépésen
megszakadtak. A próba pedig éppen ezt a megszakadást írta elő **elvárt** eredménynek, tehát a kötelező
böngésző-kapu zöldje a hibás felkínálást igazolta.

**Mi lett a bizonyíték.** A két történetet a bemutató **lapján** visszük végig (`proof:demo-walk`, a
kötelező kapu része), és az a lap a **valódi** kiszolgálótól kapja a listát (`demo:knowledge`,
`surface=demo`) — amit tehát a termék a bemutató-felületnek felkínál, azt ott végig is viszik. A héj
próbája a három **valódi** műveletet (meghívó visszavonása · tag eltávolítása · visszahívás) bemutató
nélkül, a nyugtáikkal együtt mérve tartja meg: a hiba-elkapó erő nem csökkent.

**Amit ez NEM állít.** A kérés megnevezheti a felületét, de **képességet nem állíthat magáról**: a
horgony-készlet mérésből születik. Egy hamis felület-megnevezés így legfeljebb magának kínál végig nem
vihető bemutatót — jogot nem ad, jogosultsági kaput nem kerül meg (mérve: `U` csoport, u3–u5).

**Gépi jel.** `npm run verify:app-findings-r154` (U csoport: u1 · u2 · u6–u9) ·
`npm run verify:browser-gate` (a héj próbája a KIZÁRÁST méri, a bemutató lapja a VÉGIGVITELT) ·
`npm run verify:kuka` (KUKA-391).

---

## D-VS-3198 — A SZEMÉLYES TÉR ZÁRT LAP-LISTÁBÓL DÖNT, ÉS A LAPOT MINDKÉT MEZŐRŐL OLVASSA (R164 review, P2)

**A döntés.** A személyes térben elérhető képességet **zárt lap-lista** dönti el
(`PERSONAL_SCREENS`, a tudás-regiszterben, a személyes menü mellett), és a feloldó a lapot
**mindkét** deklarált mezőről olvassa: `item.screen ?? item.page`. Ami nincs a listán, az a személyes
térben nem elérhető — hacsak nevezetten nem kivétel (`personal_space_ok`).

**Miért.** Az alapértelmezett személyes térben a `book_id` és a `member` is áll, tehát a
`scope: 'book'` nem zár. A szűrő `item.page`-et olvasott, a három új útmutató viszont `screen`-t
deklarál, és a `shell` csoport sem volt tiltott — így a `tour.warehouses` · `tour.processes` ·
`tour.accountSettings` a személyes térben is felkínálódott, pedig a személyes menü egyik lapjukat sem
tartalmazza. A csoport-nevek tiltásán álló szűrő tehát **nyitva hagyta az új alakot**.

**Gépi jel.** `npm run verify:app-findings-r154` (AH csoport: ah1 a két tér, ah2 a lista-azonosság a
menüvel, ah3 a nevezett kivétel ellenpárja) · `npm run verify:kuka` (KUKA-390).

---

## D-VS-3197 — AMI TÖRÖL, AZ ÍRÁS: A LEJÁRAT OLVASÁSI KAPUJA IS KÖVETI AZ INDEXET (R164 review, P2)

**A döntés.** Ha a függő folytatás feloldója **nem ad** folytatást, a munkamenet azonosítója kikerül a
védett-indexből — akár nem is volt sora, akár a feloldó most dobta el a lejártat.

**Miért.** A feloldó olvasáskor is **kapu**: a lejárt sort nem adja vissza, és el is dobja. Ez a
törlés eddig nem jutott el az indexhez: rövid türelmi idő vagy óra-ugrás mellett az index **bízható**
maradt egy **elavult** azonosítóval, és elég ilyen munkamenet után a „csupa védett" rövidre zárás új
folytatásokat utasított volna el, pedig volt nem védett áldozat.

**A legszűkebb igaz állítás.** Nem kellett a magot új visszajelzéssel bővíteni: a „nincs folytatás"
mindkét esetben igaz, és az index-törlés nem létező bejegyzésre is biztonságos.

**Gépi jel.** `npm run verify:app-findings-r154` (al2 — fejlesztői órával, várakozás nélkül) ·
`npm run verify:kuka` (KUKA-389).

---

## D-VS-3196 — A KILÉPÉS IS BEJELENT, TEHÁT A TÁROLÓ-SOR SEM MARAD OTT (R164 review, P2)

**A döntés.** A munkamenet-tár publikus törlése — amit a **kilépés** használ — a **bejelentés** útján
megy: a sort a várólistára teszi és azonnal bejelenti, tehát a hívó ugyanazt a takarítást futtatja rá,
mint a kiszorításra. A tár továbbra sem ismeri a táblákat.

**Miért.** A kiszorítás bejelentett, a kilépés nem — így az adatbázis-sor **elérhetetlenül** ott
maradt a teljes türelmi időre. A `folytatás → kilépés` ismétlése **hitelesítés nélkül** halmozott
adatbázis-állapotot, miközben a munkamenet-tár **üres** maradt: a tár plafonja fogalmilag sem fogta
meg. Ez a `D-VS-3186` hiányzó fele — ott a **memória** könyvelését vittem egy helyre, a **tároló**
oldala külön maradt.

**Gépi jel.** `npm run verify:app-findings-r154` (al1 — a határon mérve) · `npm run verify:kuka`
(KUKA-388).

---

## D-VS-3195 — A SÉRTETLENSÉG MINDEN TÁBLÁRA MÉRVE, ÉS AZ ÁLLÍTÁS A PONTOS ALAKJÁBAN (R164 review, P2)

**A döntés.** A forrás pillanatképe **minden** `public` séma-táblát visz, a teljes sor szövegével, és a
tábla-lista maga is összevetésre kerül. Az állítás a pontos alakjában szól: amit mérünk, az az
**eltűnés** — és a **módosítás is eltűnésként** jelenik meg, mert a sor szövege megváltozik.

**Miért.** A `D-VS-3188` a mérce **alakját** javította (tartalmazás helyett három osztály), a
**hatókörét** nem: a kép csak két táblát vitt, miközben a gyermek előkészítése hitelesítőt,
azonosítót, csatorna-igazolást, tagságot és engedélyt is ír. Egy nem szánt törlés a többi táblában
**zölden** maradt volna.

**Miért így mérjük.** Így nem kell tudnunk, melyik az elsődleges kulcs: a teljes sor szövege minden
táblán egyformán működik. A hozzáadást (a gyermek előkészítése) kimondjuk és a mért mértékhez kötjük.

**Gépi jel.** `npm run proof:pg-restore-safety` (E2 · E2c · E6d — a kiírt sor megmondja, hány táblát
mértünk) · `npm run verify:kuka` (KUKA-387).

---

## D-VS-3194 — A BIZTONSÁGI LÁNC A SAJÁT FORRÁSÁN DOLGOZIK (R164 review, P2)

**A döntés.** A `proof:pg-restore-safety` **saját, friss** forrás-adatbázist hoz létre, a repó
migrációs eszközével építi fel, a gyermekeket erre állítja, és a végén eldobja. A megadott
`DATABASE_URL` innentől a **kiszolgálót** jelöli, nem a forrást — a megadott adatbázist a lánc **nem
írja**.

**Miért.** A lánc minden esete elindítja a tartóssági próbát, aminek az előkészítése fiókot regisztrál
és vállalkozást hoz létre a forrásban. A helyi kapu csak azt mondta ki, hogy a kiszolgáló **helyi** —
a helyi viszont nem jelenti az **eldobhatót**: egy mindennapi fejlesztői adatbázis maradandó sorokat
kapott volna, pedig a lánc szerződése épp a sértetlenség. Két külön kérdést mostam össze: **hol** fut
és **mit** szabad elrontani.

**A tulajdon itt is a létrehozás.** Ugyanaz az `acquireFreshTarget` hurok dönt, mint a célnál: már
létező adatbázist nem veszünk át, névütközésre új nevet generálunk. A takarítás kilépésre **és** jelre
is fut, és ami marad, azt nevezetten kiírjuk.

**Gépi jel.** `npm run proof:pg-restore-safety` (a futás a saját forrást nevezetten kiírja és eldobja) ·
`npm run verify:kuka` (KUKA-386).

---

## D-VS-3193 — A MEGŐRZÉS VÁLASZÁT MEGMÉRJÜK, ÉS A KUDARCOT KIMONDJUK (R164 review, P2)

**A döntés.** A meghívó-képernyő megmérte a folytatás-megőrzés válaszát, és ha az elutasítás, a lap
**kimondja** — a szöveg a nyelvcsomagból jön, és megnevezi a **működő** folytatást (lépj be először,
majd nyisd meg újra a hivatkozást).

**Miért.** A szerver helyesen utasítja el a megőrzést telt tár (503) vagy nézet-váltás (409) esetén,
nevezett indokkal. A lap viszont a választ **eldobta**: a felhasználó elindult a megerősítő levéllel,
a jegy egyetlen példánya a kliens memóriájában maradt, és a belépés után a folytatás **csendben
eltűnt**. Egy nevezett elutasítás annyit ér, amennyit a hívó elolvas belőle.

**És a mondat valódi.** A `refusalText` a nem talált kulcsra a generikus mondatot adná, ezért minden
bekapcsolt nyelvre **mérjük**, hogy a két ok kulcsa megvan és **nem** egyezik a generikussal
(KUKA-238). A végponton **tényleg** csak ez a két ok áll — ezt is mérjük, tehát egy új, le nem
fordított ok azonnal pirosra vált.

**Amit ez NEM mér, kimondva.** A telt tár **böngészős** előállítása nincs a kapuban: a kliens-ág
javítása a forrás-mintán és a szótár-mérésen áll, nem egy élő 503-as képernyőn (KUKA-207).

**Gépi jel.** `npm run verify:app-findings-r154` (AF: af1 · af2) · `npm run verify:i18n` ·
`npm run verify:kuka` (KUKA-385).

---

## D-VS-3192 — A HIÁNY-OSZTÁLYOZÁS A GÉPI ARTEFAKTUMBAN ÁLL (R164 review, P2)

**A döntés.** A lefedési leltár gépi JSON-ja viszi a `gap_classes` blokkot: a három osztály
darabszámát és teljes listáját, kulccsal és indokkal. Az önpróba pedig a **kiírt fájlt** olvassa
vissza (LC4), nem a memóriában lévő objektumot.

**Miért.** A kettéosztás eddig kizárólag az önpróba konzol-állításaiban létezett, a `--json` út pedig
a nyomtatás **előtt** kilép. Ami nincs a fájlban, az a következő körben **nem létezik** — ebben a
repóban a memória a repó.

**Gépi jel.** `npm run verify:lefedes` (LC4) · `npm run verify:kuka` (KUKA-384).

---

## D-VS-3191 — A MEGHÍVÓ-JEGYET A CÍMSORRÓL IS ELVISSZÜK (R164 review, P2)

**A döntés.** Egy közös elfelejtő (`forgetInvite`) viszi el a belső jegyet **és** a címsor-paramétert,
és **mindkét** ág ezt hívja: a kilépés és a sikeres beváltás is. Csak a meghívó paramétert visszük el
— a többi (például a nyelvválasztás) a címsorban marad.

**Miért.** A kilépés a belső jegyet ürítette, a címsort nem: egy frissítés — vagy ugyanannak a
történet-bejegyzésnek az újbóli megnyitása **más ember** által — újra beolvasta a jegyet, és a felület
visszatért az előző ember meghívó-folyamatára. A címsor is állapot.

**Amit ez NEM mér, kimondva.** A **kilépés** ágát böngészőben nem mérjük: a meghívó-képernyőn ma
nincs kilépés-vezérlő (a profil-menü ott nem rajzolódik ki), tehát a felületen **nincs út**, amin a
jegy a címsorban állva kilépés érné. A böngészős kapu a **beváltás** ágán méri a közös elfelejtőt; a
kilépés ágát az **egy otthon** viszi, nem egy második, külön mért kódrészlet (KUKA-207).

**Gépi jel.** `npm run verify:browser-gate` (a beváltás után a címsorban nincs jegy) ·
`npm run verify:kuka` (KUKA-383).

---

## D-VS-3190 — A KORLÁTOZOTT PÁSZTA KULCS-KURZORON HALAD (R164 review, P2)

**A döntés.** A nem kanonikus sorok pásztája **kulcs-kurzorral** megy: minden pászta a kurzor utáni
sorokkal folytatja, és ha a köteg nem lett tele, a kurzor visszaáll az elejére. A kurzor az időbélyeg
és a munkamenet-azonosító **párja** — egy csak időbélyeg-alapú kurzor az egyező sorokat átlépné.

**Miért.** A rendezés önmagában **nem** ad előrehaladást: egy friss, érvényes eltolásos időbélyeg
számmal kezdődik, egy romlott érték betűvel, tehát mögé kerül. Korlátnyi friss sor mögött a romlott
sor határtalanul ott maradt. A `D-VS-3180` tehát **szűkül**: a sorrend szükséges, de nem elégséges.

**Gépi jel.** `npm run verify:app-findings-r154` (ak6, ellenpárral) · `npm run verify:kuka` (KUKA-382).

---

## D-VS-3189 — A FUTTATÓ KÖLTSÉGVETÉS-TÚLLÉPÉSE KÜLÖN JEL (R164 review, P2)

**A döntés.** A mutációs futtató **stabil gépi jelet** ír ki, ha egy egység a saját költségvetését
lépte túl, és az adaptív daraboló ezt a jelet a gyermek kimenetéből **maga** olvassa ki — tehát
finomít rá. A **tartalmi** bukás viszont nem indít finomítást.

**Miért.** A nem nulla kilépésnek két független oka lehet (idő vagy tartalom). A terv eddig csak a
külső időtúllépésre finomított, tehát a saját költségvetés túllépését „beleférésnek" olvasta — és a
lánc tartalmi bukásként adta tovább azt, amit a finomítás oldott volna meg.

**Gépi jel.** `npm run verify:app-findings-r154` (ak5, ellenpárral) · `npm run verify:kuka` (KUKA-381).

---

## D-VS-3188 — A FORRÁS VÁLTOZATLANSÁGA HÁROM OSZTÁLYON DŐL EL (R164 review, P1)

**A döntés.** A forrás pillanatképe a **teljes sor-tartalmat** viszi, és az összevetés három osztályt
ad: **eltűnt · megváltozott · jött**. Az állítás az első kettőre szól; a harmadikat (a próba saját
előkészítése) **kimondjuk** és a mért mértékhez **kötjük**. A pillanatkép minden futás **előtt** újra
készül.

**Miért.** A korábbi mérés tartalmazás-vizsgálat volt: bármennyi új sort elfogadott, a megváltozott
sort pedig egyáltalán nem látta — miközben minden futás tényleg írt a forrásba. Egy biztonsági
bizonyíték nem állíthat többet, mint amit mér.

**Gépi jel.** `npm run proof:pg-restore-safety` (E2 · E2c · E6d) · `npm run verify:kuka` (KUKA-380).

---

## D-VS-3187 — A PARANCSSORI KLIENSEK KÖRNYEZETE EGY OTTHONBÓL JÖN (R164 review, 2× P2)

**A döntés.** Egy feloldó (`cliEnvFor`) állítja össze a `psql`/`pg_dump`/`pg_restore` környezetét,
**ugyanazzal a gazdagép-feloldóval**, amit a helyi kapu használ — és ha a tényleges gazdagép nem
eldönthető, **nem ad környezetet**: a hívó megáll.

**Miért.** A két pg-próba egymás másolatát jelentő feloldóval a cím **autoritás**-gazdagépéből
épített, tehát a `?host=` felülírást eldobta. A kaput ugyanebben a csomagban javítottam, a tényleges
végrehajtást nem — a bizonyíték így nem arra a klaszterre szólt, amit mértünk.

**Gépi jel.** `npm run verify:app-findings-r154` (ak2 · ak3) · `npm run verify:kuka` (KUKA-379).

---

## D-VS-3186 — A SOR-ELTÁVOLÍTÁS KÖNYVELÉSE EGY HELYEN ÁLL (R164 review, P1)

**A döntés.** A munkamenet-tárban egy könyvelő (`forget`) viszi el a névtelen számlálót, a
védett-indexet és a térkép-sort — és a **kilépés** útja is ezt hívja, nem saját másolatot.

**Miért.** A kiszorítás leszedte a védett-indexet, a kilépés nem. A folytatás–kilépés ismétlése így a
tár plafonján **kívül** növelte a memóriát, és az elavult azonosítók végül azt is elhitették a
rövidre zárással, hogy a tár csupa védett sorral telt: egy új munkamenet felvétele elutasításra
futott. Ez a `D-VS-3182` növekményes indexének hiányzó fele.

**Gépi jel.** `npm run verify:app-findings-r154` (ak4) · `npm run verify:kuka` (KUKA-378).

---

## D-VS-3185 — CSAK AZ ABSZOLÚT ÚT SOCKET (R164 review, P1)

**A döntés.** A destruktív pg-próbák helyi-kapuja a nevesített helyi gazdagépeket és az **abszolút,
perjellel kezdődő** utat fogadja el helyinek. A ponttal kezdődő érték **nem** socket.

**Miért.** A PostgreSQL kizárólag az abszolút path-szerű gazdagépet kezeli Unix-socketként; minden
más hálózati gazdagép-név. Egy `?host=.belso.pelda.hu` alakú, a telepítési környezetben feloldódó cím
így átment a kapun — a kimondott felülírás nélkül, oda, ahol a próba ír és töröl.

**Amit ez NEM állít.** Nem mértem meg élő távoli kiszolgálón: a mérés a kapu **döntésére** szól
(ak1), nem egy valódi távoli kapcsolatra. Ezt szándékosan nem is próbáltam ki.

**Gépi jel.** `npm run verify:app-findings-r154` (ak1) · `npm run verify:kuka` (KUKA-377).

---

## D-VS-3184 — A LÁTOGATÓ CÍMÉT HORDOZÓ FEJLÉCET A TELEPÍTÉS DEKLARÁLJA (R164, külső review, P1)

**A döntés.** A bízott proxy mögött a látogató címét **deklarált** fejlécből olvassuk
(`VS_APP_CLIENT_IP_HEADER`). Deklaráció nélkül a történelmi sorrend áll
(`x-forwarded-for` → `x-real-ip`), de a feloldás **alapja** ilyenkor kimondottan *kikövetkeztetett*,
nem *deklarált*. Ha egyetlen cím-fejléc sem jön, a kéréskorlát kulcsa **nevezetten nem** látogató-cím
(`proxy-cim-nelkul:` előtag, `decided: false`), és a szolgáltatás **egyszer** kimondja, mit kell
beállítani.

**Miért.** Eddig kizárólag az `X-Forwarded-For` számított, és ha az nem jött, a **proxy**
kapcsolat-címe lett a kulcs. Olyan szolgáltatónál, amelyik más fejlécben adja a címet (a reviewer a
Railway dokumentációját idézi: `X-Real-IP`), ez azt jelentette, hogy **minden látogató ugyanabba a
kosárba** került — tehát szerény összforgalom is kizárta az **egész** szolgáltatást. A kéréskorlát
nem a találgatót fogta meg, hanem a felhasználókat.

**Miért a telepítés dönt.** Mert a konfiguráció az egyetlen, amit a **kérés nem tud hamisítani**. Egy
fejléc-nevet kitalálni a kérésből lehet; a telepítés állítását nem.

**Amit ez NEM állít.** Nem mértem meg a Railway tényleges fejlécét — a környezet hálózati szabálya a
szolgáltató dokumentációjának letöltését nem engedi (mérve: `curl: (56) CONNECT tunnel failed,
response 403`), ezért a `x-real-ip` itt a **reviewer idézete**,
nem a saját mérésem. Ezért nem is égetem be: a sorrend tartalék, a döntés a deklaráción áll.

**Gépi jel.** `npm run verify:app-findings-r154` (AD: ad1–ad9, köztük a **kár ellenpárja**: a javítás
előtti feloldó két külön látogatót ugyanarra a kulcsra vitt) · `npm run verify:kuka` (KUKA-376).

---

## D-VS-3183 — AZ ÁLLÍTÁS NEVEZZE MEG AZ UTAT, ÉS AZ IDŐ-BUKÁS NEM TARTALMI ZÖLD (R164/3, saját lelet)

**A döntés.** Ahol két külön kódág **ugyanabba az összegbe** dolgozik, ott az állítás ne az összeget
mérje, hanem az **utat**. A függő szándék takarításának próbája (`P-K03-intent-expiry`) ezért mostantól
kimondja, hogy a csak a **fejében** kanonikus romlott sor az **értelmező** ágon tűnik el
(`odd_rows = 1` és `odd_purged = 1`), nem a szövegesen — a puszta „eltűnt" (`purged = 1`) ezt nem
mondta meg, mert mindkét ág ugyanabba a számba számol.

**Miért.** A battéria **saját, deklarált** M222 mutációja (a kanonikus alak-minta farkát `%`-ra
engedi) **túlélt**: a próba zöld maradt rajta. A mutált alakon egy romlott sor, aminek csak a feje
kanonikus, a szöveges ágra kerül, az időablakon belülre esik — tehát **soha nem törlődik** —, és az
értelmező ág sem látja, mert az a nem kanonikus sorokat kéri. A sor **örökéletű és láthatatlan**:
egyetlen jelentésben sem jelenik meg.

**És a mérés rendje.** A túlélést mind a négy külső-ellenőrző lánc jelezte, de a lánc az **időkorláton**
bukott el a tartalom kimondása **előtt**, a söprés pedig „nem fejeződött be"-ként sorolta. Ezért: a
nem-nulla kilépés **okát** (idő vagy tartalom) ki kell mondani, mert a „nem futott le" csendben
„nincs is baj"-ra fordul (KUKA-093). A/B összevetés a korábbi `4a308da` fejen ugyancsak `SURVIVED`-et
adott — tehát **örökölt, méretlen** állapot, nem a mostani javítások regressziója.

**Amit ez NEM állít.** Nem állítja, hogy a takarítás kódja hibás volt: a hossz-kötött alak-minta
mindvégig a helyes alakban állt. Azt állítja, hogy **nem volt megmérve**, és hogy egy méretlen
állítás nem véd.

**Gépi jel.** `npm run verify:v3ref` (az M222 mutáció `CAUGHT`) · `npm run verify:kuka` (KUKA-375:
három pozitív és egy tiltó minta) · `npm run verify:external-checks` (r79/U04 · r59a/P01 · r81core ·
r83core pozitív ellenpárjai).

---

## D-VS-3182 — A VÉDETT NÉVTELEN SOROK NYILVÁNTARTÁSA A TÁRBAN ÁLL, NÖVEKMÉNYESEN (R164, külső review, P1)

**A döntés.** A munkamenet-tár maga tartja nyilván, mely **névtelen** sorok hordoznak szerver-oldali
folytatást — a tényleges írások pillanatában (`markIntent` · `clearIntent`). A felvétel döntése így
**O(1)**: ha a beszúrt soron kívül nincs nem védett névtelen sor, a beszúrt az egyetlen elvehető —
nincs adatbázis-kérdés és nincs rendezés.

**Miért.** Az F154-17-es rövidre zárás csak `anonOthers === 0` mellett állt. A támodó **hitelesítés
nélkül** tölthette tele a tárat védett névtelen sorokkal, és onnantól minden kérés kifizettette a
teljes védett-lista kérdést és a teljes térkép rendezését — hogy a végén mégis csak a beszúrt sort
dobjuk el. MÉRVE (a reviewer): 20 000 védett sor mellett 100 felvétel ~2 s. **Ötödször ugyanaz a
hibaosztály ebben a csomagban:** a védelem költsége a támadással nő (KUKA-290).

**És a bizalom kimondott, a képesség deklarált.** A halmazos takarítás nem nevezi meg, mit törölt —
ilyenkor az index **nem bízható**, és a felvétel a régi, adatbázist kérdező úton megy (ami
visszaállítja a bizalmat). A tárat közvetlenül használó hívó pedig **nem** kapja meg az indexet
(`intentIndex: false` az alapérték): saját lelet, mert az első alakom „bízhatónak" vette az ÜRES
indexet, és három battéria-állítás azonnal pirosra ment.

**MÉRVE (a jel a HÍVÁS-SZÁM, nem az óra — KUKA-344):** 200 védett sorral telt táron 50 felvétel
**nulla** védett-lista kérdést futtat; bejelentő nélkül ugyanaz a forgalom **50** kérdést; mind a 200
védett sor **túléli**; és a halmazos takarítás után a következő felvétel **megkérdezi** a listát.
Gépi jel: `verify:kuka` (KUKA-374) · `verify:app-findings-r154` (AC: aj1–aj4).

---

## D-VS-3174 — A HELYI-KAPU A TÉNYLEGES GAZDAGÉPRE ÁLL (R164, külső review, P1)

**A döntés.** A destruktív láncok „csak helyi kiszolgálón fut" kapuja a **tényleges** gazdagépet oldja
fel, a kliens sorrendjével (`effectiveHost`: `?host=` → a cím autoritása → `PGHOST`), és a kapu ebből
dönt (`localOnlyVerdict`). Ahol a feloldás **nem eldönthető** — `?service=`/`PGSERVICE`,
`?hostaddr=`/`PGHOSTADDR`, vesszős több-gazdagép, vagy semmi nem nevez meg —, a kapu **zár**.

**Miért.** A régi alak a cím AUTORITÁS-gazdagépét olvasta, a `node-postgres` viszont a `?host=`
paramétert felülírónak kezeli. MÉRVE: `postgres://u@localhost/db?host=production.example` → a régi
kapu átengedte, a mai a `production.example` gazdagépet nevezi meg és **zár**.

**Amit ez NEM állít.** Nem teljes libpq-feloldás. Gépi jel: `verify:kuka` (KUKA-366) ·
`verify:app-findings-r154` (AB: ab8) · `proof:pg-restore-safety`.

---

## D-VS-3175 — A VISSZATÖLTÉS CSAK NULLA KILÉPÉS MELLETT SIKER (R164, külső review, P1)

**A döntés.** `restoreOutcome` **csak** nulla kilépési kód mellett ad `ok: true`. A figyelmeztetés nem
buktat, a kilépési kód igen; a hiba-sorok számolása megmarad, mert nulla kód mellett is buktat.

**Miért.** A `pg_restore` diagnosztikája lehet **üres** vagy **más nyelvű**, és a PostgreSQL a
visszatöltést az SQL-hibák **után** is folytatja, a hibák számát a végén jelenti — a nem nulla kilépés
tehát épp a hiba jele. A részleges tartalmi visszaolvasás ezt nem pótolja (KUKA-216).

**Ez SZŰKÍTI a D-VS-3167-et:** a „nevezetten tolerált nem nulla kilépés" ága **megszűnt**. Gépi jel:
`verify:kuka` (KUKA-367) · `verify:app-findings-r154` (ab6) · `proof:pg-restore-safety` (E4e · E9b).

---

## D-VS-3176 — AMI ÍR VAGY TÖRÖL, AZ ELDOBHATÓ KÖRNYEZETET ÉS SAJÁT CÉLT KÉR (R164, külső review, P1)

**A döntés.** A `proof:pg-intent` lánc két kapun megy át: **helyi és eldobható** kiszolgáló
(`localOnlyVerdict`), és **saját, friss adatbázis**, amit a futás létrehoz, a séma a repó saját
migrációs eszközével megy be, és a végén a futás eldobja — jelre és a kilépési horgon is.

**Miért.** A lánc minden állítás elején korlátlan `DELETE FROM pending_intent`-et futtatott a
megadott adatbázisban. Staging vagy éles cím mellett egy rutin párhuzam-ellenőrzés **minden**
felhasználó függő folytatását törölte volna. Ugyanazt a hibát írtam meg máshol, amit a visszatöltési
kapuban órákkal korábban javítottam (KUKA-227).

**MÉRVE:** a lánc a saját friss adatbázisában 10 állításon **0 eltérést** ad. Gépi jel:
`verify:kuka` (KUKA-368) · `proof:pg-intent`.

---

## D-VS-3177 — A BIZTONSÁGI FELÜLÍRÁS PONTOS ÉRTÉKET KÉR (R164, külső review, P1)

**A döntés.** A `VS_SAFETY_ALLOW_REMOTE` **csak** a pontos, trimmelt `1` értékre nyitja a helyi kaput.
Minden más érték — `0` · `false` · bármi — nem felülírás.

**Miért.** A régi alak a felülírás **létezését** kérdezte meg. Minden nem üres sztring igaz értékű,
tehát a szándék szerint **kikapcsolt** felülírás (`=0`) kapcsolta ki a védelmet — pont annál, aki
kimondottan ki akarta kapcsolni. Gépi jel: `verify:kuka` (KUKA-369) · `verify:app-findings-r154` (ab8).

---

## D-VS-3178 — AMI „MINDENT" MÉR, ANNAK A LISTÁJA A NÉPESSÉGBŐL JÖN (R164, külső review, P1)

**A döntés.** A böngészős próba három új útmutatója a **tényleges** bejárásba és a **várt
verdikt-halmazba** is bekerült; a mondatot („minden deklarált bemutató végig lett járva") a
halmaz-egyenlőség tartja igazzá, nem a kézi darabszám.

**Miért.** A szám kézi pin volt (`toBe(11)`), a bejárási listák pedig az új útmutatókat nem
tartalmazták — a szám átírása önmagában **hamis zöld** lett volna. Gépi jel: `verify:kuka`
(KUKA-370) · `verify:browser-gate` → `test:e2e`.

---

## D-VS-3179 — A TITOK-TISZTÍTÓ AZ IDÉZETT ALAKOT IS VISZI (R164, külső review, P2)

**A döntés.** Három alak, egy helyen: aposztróf-idézett · idézőjel-idézett · idézet nélküli. Az
idézett alaknál a záró idézőjelig megyünk, tehát a belső szóköz is eltűnik; a kulcs-nevek listája
bővült (`PGPASSWORD` · `PGPASSFILE` · `password` · `passwd` · `pwd`).

**Miért.** A régi érték-osztály **kizárta** az idézőjelet, ezért a megszokott `PGPASSWORD='top secret'`
alakra egyáltalán nem illett. Gépi jel: `verify:kuka` (KUKA-371) · `verify:app-findings-r154` (ab9).

---

## D-VS-3180 — A KORLÁTOZOTT PÁSZTA RENDEZETT, ÉS A RÉSZLEGESSÉG KIMONDOTT (R164, külső review, P2)

**A döntés.** A nem kanonikus időbélyegű sorok vizsgálata `ORDER BY created_at ASC` szerint megy
(a legrégebbi és a nem értelmezhető sorok előre), a korlát megmarad, és a válasz **kimondja**, ha a
köteg tele volt (`odd_capped`).

**Miért.** Rendezés nélkül a `LIMIT` ugyanazt a köteget adhatta: friss, érvényes sorok előtt a
romlott vagy lejárt sorok **soha** nem kerültek sorra.

**Amit ez NEM állít.** Nem garantál egyetlen pásztán teljes takarítást — azt állítja, hogy minden
romlott sor **véges** számú pászta után sorra kerül, és a részlegességet kimondjuk. Gépi jel:
`verify:kuka` (KUKA-372) · `verify:v3ref` · `proof:pg-intent` (i7–i9).

---

## D-VS-3181 — AZ ELŐTAG-EGYEZÉS NEM KÖNYVTÁR-TARTALMAZÁS (R164, külső review, P2)

**A döntés.** Egy út csak akkor van egy könyvtáron belül, ha **azonos** vele, vagy a könyvtár + `/`
előtaggal kezdődik (`belul`). A repó-gyökér és a HOME ág ugyanezt a feloldót hívja, a hiba-ágak is.

**Miért.** A HOME-felismerés puszta szöveg-kezdetet vizsgált: `/home/user` HOME mellett a
`/home/user-customer/private/run.jsonl` út „HOME-on belülinek" számított, és egy telepítési vagy
**ügyfél**-könyvtár neve kikerült a naplóba. Gépi jel: `verify:kuka` (KUKA-373) ·
`verify:app-findings-r154` (N csoport).

---

## D-VS-3173 — AZ EGYEDI AZONOSÍTÓ SAJÁT SZÁMLÁLÓT KÉR (R164/4)

**A döntés.** Az olvashatóvá tett lapokon a fejezet-azonosító **saját, monoton számlálóból** jön
(`headingSeq`), nem a tartalomjegyzék hosszából. A tartalomjegyzék továbbra is csak a két felső
szintet listázza — a két fogalom szétválasztva.

**Miért.** Az azonosító `sz-${toc.length + 1}` volt, a tartalomjegyzék viszont csak a 2. szintig nő.
MÉRVE az R164-es jelentés lapján: **öt ismétlődő azonosító** 25 fejezetre, és a tartalomjegyzék
kattintása az ELSŐ egyezésre vitt — egy alfejezetre, nem a megnevezett fejezetre. Az operátor EZT a
lapot olvassa (KUKA-079), tehát ez a lap funkciójának elvesztése, nem szépséghiba.

**Amit kimondok.** Az ismétlődő azonosítót a `verify:doc-html` ma **nem** kérdezi meg — a
visszacsúszást a `verify:kuka` tiltó mintája fogja meg (KUKA-365). A hiba nem őrön derült ki, hanem
azon, hogy a feltöltés előtt **átolvastam** az operátornak szánt lapot.

---

## D-VS-3169 — A LEFEDÉST KIZÁRÓLAGOS JEL MÉRI, ÉS A HÉJ VEZÉRLŐI NEM AZONOSÍTANAK LAPOT (R164/3)

**A döntés.** A lefedési őrben egy HORGONY csak akkor azonosít lapot, ha más lap funkciói **nem**
deklarálják; a héj vezérlői (profil-menü · kijelentkezés · fiókválasztó · súgó-nyitó · menü-kapcsoló ·
levél-nyitó) pedig **kimondottan kivett halmaz** (`SHELL_ANCHORS`). A menüpont (`nav-<lap>`) és a
bemutató kimondott lapja változatlanul azonosít.

**Miért.** A `list-rows`/`list-search` horgonyt öt lap funkciói deklarálják. MÉRVE: egy új raktár-útmutató
lépése a termékek, a partnerek, a bizonylatok és az `outbox` lapját is „bejártnak" minősítette.

**És amit ez visszamenőleg javít.** Az R158 jelentésemben a „10 lap (gépi) kontra 11 lap (kézi)" eltérést
úgy zártam le, hogy „az ŐR száma az irányadó". A mérés megmutatta: a **kézi szám volt a helyes**, az
őrnek volt hamis zöldje. A hiány-alapvonal mindkét irányban frissült, indokkal.

**Amit ez NEM állít.** A hiány nem lett kevesebb: a 20 hiány-kulcs marad, csak az ÖSSZETÉTELE igaz.
Gépi jel: `npm run verify:kuka` (KUKA-361) · `npm run verify:lefedes` (LR1 · LR2).

---

## D-VS-3170 — A KILÉPÉS A KÖZÖS ÜRÍTŐN MEGY ÁT, ÉS A MEGHÍVÓ JEGYE IS ODA TARTOZIK (R164/3)

**A döntés.** A kijelentkezés nem végez saját, részleges ürítést: a `resetViewCaches()`-t hívja, és a
meghívó **jegyét** (`state.inviteToken`) is törli.

**Miért.** A rajzolás legelső döntése a jegy. MÉRVE: a meghívott megnyitja a meghívó-képernyőt, kilép,
és a következő belépő — **más ember** — ugyanazon a meghívó-képernyőn érkezik meg, héj-nézet nélkül.
A nézethez kötött tárak sem ürültek a kilépéskor, és a futó útmutató sem adódott át ott — ezért hamis
„eltűnt az elem" üzenettel szakadt meg egy ép átadás közepén.

**Amit ez NEM állít.** Viselkedés-szintű böngészős mérés erre a konkrét szivárgásra ma nincs: a két
szereplős történet mai útja (rövidítő gomb + újratöltés) nem járja be ezt az ágat. NEVESÍTETT hiány,
az R158 7/1. tételében megy tovább. Gépi jel: `npm run verify:kuka` (KUKA-362).

---

## D-VS-3171 — AZ IDŐKERET MÉRÉSBŐL JÖN, ÉS A NEM FUTOTT NEM „NEM FELEL MEG" (R164/3)

**A döntés.** A külső-ellenőrző futtató program-kerete **1 800 000 ms** (két battéria-pass + a program
saját munkája), a saját újrafogalmazásunk mag-próba-kerete **180 000 ms**, és a battéria darabszáma
**mérésből** jön (`adaptiveUnitPlan`: időtúllépésre finomabbra oszt). A külső fél 15 000 ms-os
EGYSÉG-korlátját nem lazítjuk — az az ő szava.

**Miért.** A 600 s-os keret egy feltevésen állt. MÉRVE: 253 mutáció és 69 mag-próba mellett egy teljes
battéria-pass ~8 perc (40 egység × 11 960 ms), és a két passzt futtató `r81core`/`r83core` a kereten
HALT MEG (`kilépés null · 600 107 ms`) — a lánc IDŐ-okból mondott eltérést olyan programra, aminek a
tartalmáról semmit nem mért. A kézzel tartott darabszám ÖTÖDSZÖR avult el.

**Amit kimondok: a két korlát egymásnak feszül.** A finomabb darabolás betartja az egység-korlátot, de
NÖVELI a teljes időt (egységenkénti indulási költség). Ez nem „gyorsabb lett" — ezért hosszú a lánc, és
ezért nem fut a söprésben. Gépi jel: `npm run verify:kuka` (KUKA-363) · `npm run verify:external-checks`.

---

## D-VS-3172 — A PRÓBA DIAGNOSZTIKÁJA A PRÓBA RÉSZE (R164/3)

**A döntés.** A böngészős tanú a modális panelt bezárja (egy otthonban, a zárás **tényét megmérve**), a
váltás és a belépés utáni rajzolást **megvárja**, és minden megszakadást a KÉPERNYŐ állapotával együtt
nevez meg: fiók · menü-elemek · panel nyitva-e · belépési űrlap · meghívó-lap · a következő lépés célja.

**Miért.** Három egymást követő néma elakadás után a napló csak Playwright-belső sorokat írt; a
`(null)` lépés-azonosító miatt a hiba helye kitalálás kérdése volt. A diagnosztika beépítése után
EGY futásból kiderült a valódi ok (az előző ember meghívó-képernyője).

**Amit ez NEM állít.** A tanú nem lett szigorúbb: ugyanazt méri, csak megmondja, hol állt meg.
Gépi jel: `npm run verify:kuka` (KUKA-364) · `npm run proof:demo-walk`.

---

## D-VS-3166 — A VISSZATÖLTÉS CÉLJA FRISS, SAJÁT ADATBÁZIS: A TULAJDONT A LÉTREHOZÁS ADJA (R164/1)

**A döntés.** A `proof:pg-durability` célja alapértelmezésben **generált, egyedi név**, amit a futás
maga **létrehoz** (`freshTargetName` → `CREATE DATABASE`). A `CREATE` sikere a **tulajdon-bizonyíték**:
PostgreSQL-ben nincs `IF NOT EXISTS`, tehát ütközésnél 42P04 jön — a siker azt jelenti, hogy a cél
ELŐTTE nem létezett. **Már létező célhoz a próba nem nyúl**, akkor sem, ha a neve más, mint a forrásnak,
és akkor sem, ha az előtagot hordozza. A takarítás kizárólag arra a névre áll, amin a `CREATE` sikerrel
futott; a `VS_RESTORE_TEST_DB` megmarad kimondott választásnak, de csak akkor használható, ha **nem
létezik** (akkor a próba létrehozza, tehát a sajátja lesz).

**Miért.** A régi alak `DROP DATABASE IF EXISTS <cél>`-t futtatott, és az egyetlen kapu az volt, hogy a
cél ne EGYEZZEN a forrással. A „nem a forrás" viszont nem azonos azzal, hogy „az enyém": e kettő között
ott áll minden más adatbázis a kiszolgálón. **A név előtagja önmagában nem tulajdonbizonyíték**
(chatgpt-v3 szava, R164/1).

**És a feloldó nem az egyetlen védelem.** A forrás nevét a kiszolgáló mondja meg (`SELECT
current_database()`), a libpq-utánzó feloldó jóslatát ehhez MÉRJÜK, és **eltérésnél megállunk**; a cél
megnyitása után is visszaellenőrizzük, hogy a kapcsolat oda megy, ahová hittük. A titkok nem mennek a
parancssorba (a kapcsolat `PG*` környezeti változókban), és minden kiírt szöveg titok-tisztítón megy át.

**Amit ez NEM állít.** Nem Railway-mentés bizonyítéka és nem PITR: helyi, eldobható PostgreSQL 16.15-en
mért viselkedés. Gépi jel: `npm run verify:kuka` (KUKA-358) · `npm run proof:pg-restore-safety` (E1 ·
E5 · E7) — a lánc eldobható HELYI kiszolgálót kér, ezért a söprésben nem fut (KUKA-307).

---

## D-VS-3167 — A VISSZATÖLTÉS VERDIKTJE SORONKÉNTI OSZTÁLYOZÁS, NEM RÉSZSZTRING (R164/1)

**A döntés.** A `pg_restore` kimenetét **soronként** osztályozzuk (`restoreOutcome`): a `error:`-sorok és
a `warning:`-sorok külön számolva. **Egyetlen hiba-sor mellett a verdikt FAIL** — akkor is, ha
figyelmeztetés is jött, és akkor is, ha a kilépési kód NULLA. Nem nulla kilépés CSAK nulla hiba-sor
mellett tolerálható, és akkor is NEVEZETTEN. A végső mérce ettől függetlenül a **tartalmi
visszaolvasás**, ami kötelezően lefut.

**Miért.** A régi alak `if (!/warning/i.test(stderr)) throw e;` volt — bármilyen hiba elnyelődött, ha a
kimenet bárhol tartalmazta a „warning" szót, és a nem nulla kilépés általánosan PASS-szá vált. MÉRVE
(E4): egy `warning` ÉS egy `error` sort kiíró, 1-gyel kilépő visszatöltő-helyettesítőn a mai alak FAIL-t
ad és megnevezi a hiba-sort; a **sikeres pár** is mérve (E4e): csak figyelmeztetés + 1-es kilépés → PASS,
de a 4a/4b/4c visszaolvasás tényleg lefutott.

**Amit ez NEM állít.** Nem minden `pg_restore`-kimenet osztályozható: ha a kliens máshogy jelöl, a
szabály nem segít — ezért nem a némaság, hanem a TARTALOM a mérce. Gépi jel: `npm run verify:kuka`
(KUKA-359) · `npm run proof:pg-restore-safety` (E4 · E4e · E9a–E9d).

---

## D-VS-3168 — A MEGSZAKÍTÁS KEZELŐJE CSAK AKKOR ŐR, HA MEG IS TUD SZÓLALNI (R164/1)

**A döntés.** A próba a mért lépések KÖZÖTT **átadja a vezérlést** (`await megszakithato()` — egy
`setImmediate`-kör), és a takarításnak **egy otthona** van: a `process.on('exit')` horog, ami MINDEN
kilépési úton (rendes vég, kivétel, jel) eldobja, ami bizonyítottan a miénk. Amit egy kezelhetetlen
leállás (SIGKILL) hátrahagy, azt a következő futás **megnevezi**, de nem dobja el.

**Miért.** A jel-kezelőt megírtam, az ellenpróba viszont azt mérte, hogy SOHA nem szólal meg: a 3.
szakasz végig blokkoló gyermekhívásokban áll (`execFileSync`), a Node a JS jel-kezelőt csak az
eseményhurok következő körében futtatja, és a szakasz után a próba `process.exit`-tel zárt. A gyerek
0-s kilépéssel, ZÖLDEN fejezte be azt a futást, amit meg kellett volna szakítani — **a KUKA-207 pontos
osztálya**: a kezelő létezéséből a működésére következtettem. MÉRVE (E6): a visszatöltés közben a
folyamatCSOPORTnak küldött SIGTERM után a kilépés 130, a megszakítás-ág lefutott, a saját cél
eltakarítva, a forrás és az idegen adatbázis érintetlen.

**Amit ez NEM állít.** A SIGKILL ettől sem kezelhető — ezért a maradék-jelentés, és ezért nem töröljük
az idegen maradékot. Gépi jel: `npm run verify:kuka` (KUKA-360) · `npm run proof:pg-restore-safety`
(E6a–E6d · E6e1–E6e5).

---

## D-VS-3163 — AZ ÜRES KAPCSOLATI-KULCS FELÜLÍRÁS MEGÁLLÁST AD (R158, a visszatöltési kapu)

**A döntés.** A kapcsolati cím kulcsainál a JELENLÉT és az ÉRTÉK két külön tény (`queryLast`): ha a
`dbname` kulcs jelen van, és az UTOLSÓ előfordulása ÜRES, a forrás neve **NEM MEGÁLLAPÍTHATÓ**, tehát
a lánc megáll. Ugyanez a felhasználóra: egy üres `?user=` felülírja a cím felhasználóját, tehát az
innentől nem jelölt.

**Miért.** A libpq az üres felülírást IS eltárolja, és az üres `dbname`-et a FELHASZNÁLÓ nevére oldja
fel. MÉRVE: `postgres://source@host/decoy?dbname=` + `VS_RESTORE_TEST_DB=source` → a régi alak
`decoy`-t mondott forrásnak (`same: false`), tehát a lánc elindult, és a `DROP DATABASE "source"` a
VALÓDI forrást törölte volna; a mostani alak megáll.

**Amit kimondok: a válasz nem a libpq pontos utánzása, hanem a megállás.** Az ismételt-kulcs
szabályról (F158-01) azt vettem alapul, hogy az UTOLSÓ, NEM ÜRES érték győz; ez a lelet azt mutatja,
hogy az üres érték AKTÍV. A két olvasat ott válik el, ahol a `DROP DATABASE` áll — ezért ahol MÁST
adnának, a név nem tudható. A `w1` battéria-sort ennek megfelelően PONTOSÍTOTTAM (az üres utolsó érték
most megállás), nem töröltem: az F158-01 eredeti kárát (`dbname=decoy&dbname=source` → `decoy`) ez nem
oldja vissza.

**Amit ez NEM állít.** Továbbra sem teljes libpq-feloldás: a szolgáltatás-fájl tartalmát nem olvassuk,
és a rendszer-felhasználót nem tippeljük. Gépi jel: `npm run verify:app-findings-r154` (AA: aa1, aa2
· W: w1) · `npm run verify:kuka` (KUKA-355).

---

## D-VS-3164 — A JOKER JOGOSULTSÁGÁNÁL A POZITÍV TARTOMÁNY A FELOLDOTT NYELVRE IS „EMLÍTÉS" (R158, LNG-03)

**A döntés.** A `*` joker jelöltjeiből kimaradnak azok a nyelvek is, amelyekre egy KIFEJEZETTEN,
pozitív súllyal megnevezett REGIONÁLIS tartomány feloldódik (`hu-HU` → `hu`). A `q=0` KIZÁRÁSOK
pontossága változatlan: azokat továbbra is a szigorú RFC 4647 tartomány-illesztés dönti el.

**Miért.** MÉRVE: `Accept-Language: hu-HU;q=0.5, *;q=1` → a régi alak `hu`-t adott. A joker az
EMLÍTÉS NÉLKÜLI nyelvekre szól, tehát egy elérhető `en` 1-es súllyal megelőzi a 0,5-es magyart — a
régi alak NÉMÁN felminősítette a kérő alacsonyabb preferenciáját. A javítás után `en`.

**És csak a TÉNYLEGES feloldás számít.** A `normalizeLanguage` ismeretlen címkére az ALAPNYELVRE esik
vissza; ha azt említésnek vennénk, egy ismeretlen `xx-YY` „említené" a magyart, és a joker elnémulna.
MÉRVE: `xx-YY;q=0.5, *;q=1` → `hu` (változatlan), `de-AT;q=0, de;q=1` → `de` (a KUKA-330 szabálya áll).

**Amit ez NEM állít.** Nem teljes RFC 4647 kiterjesztett szűrés, és a joker jelöltjei között továbbra
is a nyelvi jegyzék sorrendje dönt. Gépi jel: `npm run verify:i18n` ·
`npm run verify:app-findings-r154` (AA: aa3 — hat eset, köztük négy ellenpár) · `npm run verify:kuka`
(KUKA-356).

---

## D-VS-3165 — A KANONIKUS IDŐBÉLYEG-ALAK VIZSGÁLATA BETŰRE PONTOS, NEM `LIKE`-ON ÁLL (R158, K03 · SQL-02)

**A döntés.** A `pending_intent` takarításában a kanonikus alak két betűjét (`T` és `Z`) BÁJTRA
hasonlítjuk (`substr(created_at, 11, 1) = 'T'`, `substr(created_at, 24, 1) = 'Z'`); a `LIKE` innentől
csak az ALAKOT szűri. Ami így nem kanonikus, az az időpillanat-ágra kerül, és `Date.parse` ítéli meg.

**Miért.** A `node:sqlite` `LIKE`-ja ASCII-ra kis/nagybetű-ÉRZÉKETLEN, a PostgreSQL-é nem. MÉRVE: egy
importált, FRISS és értelmezhető `2026-10-06t12:00:00.000z` sor SQLite-on KANONIKUSNAK számított, és a
szöveges összevetés a kisbetűs `t`-t (0x74) a nagybetűs `T`-nél (0x54) nagyobbnak látta — jövőbelinek
minősítette és TÖRÖLTE (`purged: 1`); PostgreSQL-en ugyanaz a sor az időpillanat-ágra ment és
megmaradt. A takarítás viselkedése tehát a TÁROLÓTÓL függött, és a folytatás CSAK SQLite-on veszett el.

**Mérve a javítás után, öt soron:** a két FRISS (kis- és nagybetűs) marad, a két lejárt és a romlott
megy — `purged: 3`, ebből a nem kanonikus ágról 2.

**Amit ez NEM állít.** A mérés `node:sqlite` tárolón fut; a PostgreSQL-oldali viselkedést a `proof:pg-*`
láncok mérnék, azok valódi kiszolgálót kérnek (`KUKA-307`). A `created_at` oszlop alakját a séma
továbbra sem kényszeríti. Gépi jel: `npm run verify:v3ref` (P-K03-intent-expiry (k) ág + M223) ·
`npm run verify:app-findings-r154` (AA: aa4) · `npm run verify:kuka` (KUKA-357).

---

## D-VS-3162 — A DIAGNOSZTIKAI UTAK IS A TISZTÍTÓN MENNEK, ÉS A KÉTÉRTELMŰSÉG LISTÁJA VÁLASZTHATÓ MARAD (R158, a fogyasztás-export)

**A döntés.** A fogyasztás-exportáló MIND A NÉGY diagnosztikai út-kiírása a `safePath` tisztítón megy
(`safeErrPath`), és a tisztító EGY feloldó marad, egy paraméterrel: az exportban „nem exportált", a
hiba-üzenetben „ELREJTVE". A kétértelműség listája a jelöltet a `--projects` GYÖKÉRHEZ KÉPEST nevezi
meg (`pickPath`).

**Miért.** Az előző körben a leltár `source.path` mezőjét vezettem át a tisztítón (`KUKA-343`), a
hiba-ágak viszont nyers út-kiírással mentek. MÉRVE: egy repón ÉS HOME-on kívüli `--transcript` esetén
a régi alak kiírta a teljes abszolút utat (a mérésben `…/telepites/ugyfel_titkos_nev/nincs.jsonl`), a
mostani csak az ELREJTVE jelzést. A hiba-ág épp az az út, ami akkor szólal meg, amikor valami nem
sikerült — tehát pont akkor beszél a legtöbbet, amikor a legkevésbé figyelünk rá.

**A KÉT SZABÁLY EGYÜTT, mert ütköztek.** A `KUKA-319` azt kéri, hogy a kétértelmű átirat hibája
NEVEZZE MEG a jelölteket — különben az operátor nem tud választani (`KUKA-201`). A puszta tisztítás
ezt elvette volna (mindkét jelölt „ELREJTVE"-ként jelent meg, és a `verify:app-findings-r154` n6 sora
JOGGAL lett piros). A megoldás nem az egyik szabály feladása: a jelölt a `--projects` gyökérhez képest
van megnevezve — azt az utat a HÍVÓ adta meg, tehát nem mond neki újat, a választás viszont működik.
MÉRVE: a lista megnevezi mindkét jelöltet, a gyökeret nem írja ki.

**Amit ez NEM állít.** Nem titkos-őr: a `safePath` három esetet ismer (repón belül · HOME-on belül ·
azon kívül), és a HOME-on belüli utat `~`-os alakban továbbra is kiírja — az operátor saját gépén ez
szándékos. Gépi jel: `npm run verify:app-findings-r154` (Z: z8–z10) · `npm run verify:kuka`
(KUKA-354). A böngésző-kapu ehhez a javításhoz NEM futott újra, és nem is kell: a változás a
`tools/` alatti exportálóban van, a v3app FUTTATOTT kódját nem érinti.

---

## D-VS-3159 — AZ ÁLLAPOT-ÍRÁS KAPUJA A HASZNÁLAT PILLANATÁT OLVASSA, ÉS MEG IS ÚJÍTJA A SORT (R158, SES-01)

**A döntés.** A `materialize` saját, FRISS időbélyeget vesz (`hasznalatkor`), azzal kérdezi a
munkamenet-tárat, és `touch`-csal meg is újítja a sort. A kérés BELÉPŐ kikeresés+érintés párja
változatlanul a kérés egyetlen idejét (`requestNow`) használja — azt a `KUKA-314` kötötte meg.

**Miért.** A kapu a kérés ELEJI pillanattal kérdezett. Egy lassan feltöltött törzs átvihet a
tétlenségi korláton: a tár a RÉGI pillanatra még élőnek mondta a sort, a kezelő megírta a
`pending_intent` sort, és **200**-at adott — a következő kérés viszont a VALÓDI időt mérte, eldobta a
munkamenetet, és a most írt sort törölte. MÉRVE élő HTTP-n (400 ms korlát, 700 ms-os törzs):
`200 {"ok":true}` + egy sor, majd a következő kérés után NULLA sor. Ez pontosan az, amit az R158/1
tiltott: nincs hamis siker, és nincs félig végrehajtott tartós művelet. A javítás után ugyanez a
kérés `409 session_gone`-t kap, és nem keletkezik sor.

**A KÉT SZABÁLY EGYÜTT, kimondva.** „EGY DÖNTÉS — EGY IDŐ" (`KUKA-314`) NEM azt jelenti, hogy „egy
KÉRÉS — egy idő". Egy várakozó kérés KÉT döntést hoz KÉT pillanatban: a belépő kikeresés a kérés
elejéhez tartozik, az állapot-írás kapuja a HASZNÁLAT pillanatához. A két javítás tehát nem
fordítja vissza egymást; a közös szabály: **minden döntés a SAJÁT pillanatát olvassa, és azon belül
csak egyet.**

**Amit ez NEM állít.** Nem ad új toleranciát a tétlenségi korlátnak: a korláton túlvivő kérés
NEVEZETTEN elakad. A `touch` csak azt a sort újítja meg, amelyik a kapun át is ment. Gépi jel:
`npm run verify:app-findings-r154` (Z: z1, z2) · `npm run verify:kuka` (KUKA-351).

---

## D-VS-3160 — A TÉTLENSÉGI PÁSZTA RITKÍTÁSA A SÖPRÉSBEN DŐL EL, EGY HELYEN (R158, SES-01)

**A döntés.** A tétlenségi pászta a `sweep`-en belül dönti el, hogy esedékes-e
(`now >= nextIdleSweep`, percenként egyszer), és a hívó már csak azt mondja meg, hogy VAN ok söpörni
(plafon VAGY esedékes pászta). A PLAFON változatlanul azonnali.

**Miért.** A ritkítás eddig a HÍVÓBAN állt, ezért csak a plafon alatti úton érvényesült: a plafon
fölötti úton a pászta MINDIG végigjárta a teljes tárat — azon az ágon is, ahol az O(1) rövidre zárás
(`F154-17`) rögtön utána eldobja a jövevényt. Az ELUTASÍTOTT felvétel így `O(maxSessions)`-t
fizetett, alapértéken 20 000 sort, és mindezt a hitelesítési kapu ELŐTT, tehát cím-rotáló,
hitelesítés nélküli forgalom közvetlenül ránk tudta terhelni. MÉRVE 300 elutasított felvétellel:
5 000-es plafon **0,113 ms/kérés** · 20 000-es **0,622** · 80 000-es **1,432**. A javítás után
20 000-es plafonnál **0,0064 ms/kérés**, és a kérésenkénti költség négyszeres táron sem nő
négyszeresére.

**Amit ez VESZÍT, kimondva.** Egy percen belül a kiszorítás olyan névtelen sort is választhat, amit a
pászta amúgy lejártként elvitt volna. A kár elhanyagolható, mert az áldozat-sorrend a LEGRÉGEBBEN
LÁTOTT sort veszi előbb — a lejárt sor pedig épp a legrégebben látott —, és a tétlenségi korlát
helyességét az OLVASÁS is érvényesíti (`KUKA-296`). Gépi jel: `npm run verify:app-findings-r154`
(Z: z3 a viselkedés idő-mérés nélkül, z3b az ellenpár a plafonra, z4 a skála-független költség-arány)
· `npm run verify:kuka` (KUKA-352).

---

## D-VS-3161 — AZ IDŐBÉLYEG KANONIKUS UTC ALAKBAN SZÜLETIK, ÉS A NEM KANONIKUS SORT IDŐPILLANATKÉNT ÍTÉLJÜK MEG (R158, K03)

**A döntés.** A `rememberIntent` a pillanatot UTC `toISOString()` alakban tárolja, és a nem
értelmezhető órára NEVEZETTEN elakad. A `purgeExpiredIntents` két lépésben dolgozik: a KANONIKUS
(`____-__-__T__:__:__.___Z`) sorokon egy halmaz-utasítás (ott a szöveges rendezés AZONOS alakot
hasonlít, tehát érvényes), a NEM kanonikus sorokat pedig korlátos darabszámban (`LIMIT`) kiolvassa és
`Date.parse`-szal, IDŐPILLANATKÉNT ítéli meg.

**Miért.** Az előző alak MINDEN sort szövegesen vetett össze a `Z`-s határokkal. Egy eltolásos alak
(`2026-10-06T01:00:00+02:00`) ugyanazt a PILLANATOT jelenti, mint a `…T23:00:00.000Z`, szövegként
viszont „nagyobb" — ezért egy FRISS sor JÖVŐBELINEK minősült, és a takarítás TÖRÖLTE. MÉRVE ugyanazzal
az órával írva és takarítva: a sor azonnal eltűnt. A javítás után ugyanez a sor megmarad, és négy
importált sorból a romlott, a lejárt és a jövőbeli megy, a friss eltolásos marad.

**Amit kimondok a saját munkámról.** Ezt a hiba-osztályt a repó MÁR egyszer kivezette: a
`P-INVITE-window` mag-próba épp azt méri, hogy a MEGHÍVÓ lejárata IDŐ-összehasonlítással dől el, nem
szöveggel. A `KUKA-347` javításomban ugyanazt a szöveges összevetést vittem be a szomszéd táblára —
és a kár itt a legrosszabb fajta volt: nem elmaradt védelem, hanem TÖRLÉS.

**Amit ez NEM állít.** A `created_at` oszlop alakját a séma továbbra sem kényszeríti (`TEXT NOT
NULL`): a kanonizálás az ÍRÁS oldalán áll, a tárolóban nincs megkötés — a migrációs lánc ebben a
körben nem nyílt ki. A korlátos (`LIMIT`) második lépés egy importált, csupa nem kanonikus sorból álló
táblát több takarítási körben visz el, nem egyben. Gépi jel: `npm run verify:v3ref`
(P-K03-intent-expiry (i) és (j) ág + M220/M221/M222 + az újra-horgonyzott M209/M217) ·
`npm run verify:app-findings-r154` (Z: z5–z7) · `npm run verify:kuka` (KUKA-353).

---

## D-VS-3157 — A FOLYTATÁS TÜRELMI IDEJE A MUNKAMENET ÉLETÉBŐL SZÁRMAZIK, A 24 ÓRA PLAFON (R158, K03)

**A döntés.** A függő meghívó-szándék ténylegesen kiszolgálható türelmi idejét EGY feloldó adja:
`intentTtlMs({ sessionIdleMs, ceilingMs })` = a kimondott PLAFON (24 óra) és a munkamenet tétlenségi
korlátjának KISEBBIKE. A kiszolgáló a sajátját adja át (`sessionIdleMs: limits.idleMs`), és MINDEN
olvasó, valamint a halmazos takarítás is EZEN a kapun megy (`folytatasa(sessionId)`). A hiányzó
tétlenségi korlát NEVEZETTEN elakad — nincs néma visszaesés a plafonra.

**Miért.** A `pending_intent` sort KIZÁRÓLAG a munkamenet azonosítója találja meg, a munkamenet pedig
12 óra tétlenség után kiesik, és a kiesés a sort is törli (`onEvicted`). A kimondott 24 óra tehát a
MÁSODIK 12 órában elvileg sem teljesülhetett: aki 13 óra múlva tért vissza, annak a belépése
folytatás NÉLKÜL sikerült, miközben a kódban és a szerződés `limit` szövegében is „24 óra" állt.
MÉRVE a javítás előtt és után: a 13 órás ÁRVA sort a régi, 24 órás mérce a táblában hagyta
(`takarítva: 0`), a mostani elviszi (`takarítva: 1`), a 11 órás pedig marad. A HATÁRON mérve mindkét
irány: 12 órás munkamenetnél a tényleges érték 12 óra, egy 48 órásnál a 24 órás plafon fog.

**A választott irány, és a VESZTESE.** A reviewer két irányt ajánlott; a munkamenet megnyújtása
helyett a RÖVIDÍTÉST választottam. Ok: a `pending_intent` sort belépés ELŐTT, NÉVTELENÜL is létre
lehet hozni, tehát a hosszabb munkamenet-élet egy látogató szerver-oldali helyét duplázná — pont azt
a felületet növelve, amit a KUKA-300/302/329 szűkített —, és a tétlenségi söprésnek munkamenetenként
a tárolót is kérdeznie kellene (KUKA-290). A rövidítés VESZTESE: a folytatás a 12. óra után nem
él tovább. Ez eddig sem élt — most a SZÖVEG mondja ezt, nem az ellenkezőjét.

**Amit ez NEM állít.** Nem hosszabbítja meg egyetlen folytatást sem, és nem takarítja ki
visszamenőleg a korábban keletkezett árva sorokat. Gépi jel: `npm run verify:v3ref`
(P-K03-intent-expiry (h) ág + M218/M219 mutáció) · `npm run verify:app-findings-r154` (Y: y6–y8) ·
`npm run verify:kuka` (KUKA-350).

---

## D-VS-3158 — A KAPCSOLATI CÍM JELENTÉSÉHEZ A KÖRNYEZET IS HOZZÁTARTOZIK (R158, a visszatöltési kapu)

**A döntés.** A forrás adatbázis nevét a `tools/lib/vs_pg_target.mjs` feloldója a libpq TELJES
sorrendjében adja meg, és a CÍM megelőzi a KÖRNYEZETET: query `dbname` → út → `PGDATABASE` → query
`user` → cím-felhasználó → `PGUSER`. Ha egyik sem nevez meg, a név NEM TUDHATÓ (a kliens a
rendszer-felhasználóból veszi), tehát a `sameDatabase` óvatosan megáll. A szolgáltatást a környezet
is megnevezheti (`PGSERVICE`): erre ugyanaz a válasz, mint a `?service=`-re. A környezet INJEKTÁLHATÓ
paraméter, az alapértelmezése a futó folyamat környezete.

**Miért.** A `pg_dump` a környezetet ÖRÖKLI. MÉRVE a reviewer példáján: `postgres://decoy@host` +
`PGDATABASE=source` esetén a régi alak `decoy`-t mondott forrásnak, tehát a `VS_RESTORE_TEST_DB=source`
„eltér"-t kapott, a lánc elindult, és a végén álló `DROP DATABASE "source"` a VALÓDI forrást
törölte volna. Most ugyanez `source` → `same: true` → megállás; az ellenpár (ugyanaz a cím környezet
nélkül) továbbra is jogosan indul.

**Amit kimondok, mert nem jó irányba tévedni: a KORÁBBI mondatom nem volt igaz.** A KUKA-341-ben azt
írtam, hogy a környezeti változók „nincsenek benne, és pont ezért esik minden bizonytalanság az
óvatos ágra". Nem esett: a felhasználó-alapú tartalék NEVET adott, a név pedig ELDÖNTÖTT válasz —
a kapu nem megállt, hanem továbbengedett. Egy kimondott hiány csak akkor védelem, ha a kód tényleg
megáll (KUKA-020 · KUKA-050).

**Amit ez NEM állít, és ami TUDATOSAN óvatosabb a kelleténél.** Ez nem teljes libpq-feloldás: a
szolgáltatás-fájl tartalmát NEM olvassuk (más gépen, más engedélyekkel áll, és a `PGSERVICEFILE`
is átállítható), és a rendszer-felhasználó nevét sem tippeljük meg. Ezért `?service=` vagy
`PGSERVICE` jelenlétében a lánc akkor is megáll, ha a cím KIMONDOTTAN megnevezi az adatbázist (ott a
szolgáltatás-fájl már nem szólhatna bele) — ez a tévedés a NEM TÖRLÉS irányába esik, és így
szándékos. Gépi jel: `npm run verify:app-findings-r154` (Y: y1–y5) · `npm run verify:kuka`
(KUKA-349). A `proof:pg-durability` lánc valódi PostgreSQL-t kér, ezért a söprésben nem fut
(KUKA-307).

---

## D-VS-3100 — A VÉDELEM KÖLTSÉGE KORLÁTOS: A KÉRÉSKORLÁT SORA VÁGOTT, A DARABSZÁM KIMONDVA ALSÓ KORLÁT (R154, NET-04)

**A döntés.** A `makeRateLimiter` egy címhez a LEGFRISSEBB `max + 1` kérés-bélyeget tartja meg, és a
vágás után a verdikt kimondja (`capped: true`), hogy a darabszám ALSÓ KORLÁT, nem pontos szám.

**Miért.** A korábbi alak MINDEN bélyeget megtartott, és kérésenként végigszűrte a sort. MÉRVE:
60 000 kérés egy címről `count=60000` 240-es korlát mellett és **28 987 ms** tiszta CPU; 120 000
kérés **225 327 ms** — négyszeres kérésre 7,8-szoros idő, vagyis a költség KVADRATIKUS. Egyszálú
folyamatban a kéréskorlát maga állítja meg a szolgáltatást, miközben a 429-ek helyesen mennek ki,
tehát a napló „megfogtuk"-ot mutat. A javítás után ugyanaz a 60 000 kérés **105 ms** (276×), a
verdikt pedig BETŰRE ugyanaz: a korlátig engedünk, utána tiltunk, és a lejárt ablak után újra
engedünk.

**Amit ez NEM állít.** Nem elosztott kéréskorlát (továbbra is példányonként számol), és nem
teljesítmény-hangolás: a próba 5 másodperces plafonja a KVADRATIKUS nagyságrendet zárja ki, nem a
gépet méri. Gépi jel: `npm run verify:app-findings-r154` (A: a1–a6) · `npm run verify:kuka`
(KUKA-290).

---

## D-VS-3101 — A HIBÁS BEMENET NEVEZETT 4xx, NEM 500: A HIBÁS SZÁZALÉK-ESCAPE (R154, HTP-01)

**A döntés.** A statikus kiszolgáló útfeloldása `try`-ban áll, és a hibás százalék-escape NEVEZETT
`400 path_malformed` + `refused_by: "static_path"` választ kap.

**Miért.** MÉRVE: `GET /%`, `GET /%zz`, `GET /a%E0%A4%A` mind **500 `internal_error`** volt, mert a
`decodeURIComponent` `URIError`-ja a kérés-ciklus programhiba-ágára esett. A hiba a KÉRÉSBEN volt, a
válasz mégis a SZOLGÁLTATÁST mondta hibásnak: ez terheli a hibakeretet, riaszt, és elrejti a valódi
5xx-eket. A határ szerződése nevezett elutasítást ír elő.

**Amit ez NEM állít.** A kiszolgálás nem szűkült: a létező lap 200, a nem létező 404 `not_found`, az
útvonal-átlépés 403 `path_rejected` — mindhárom ellenpár mérve. Gépi jel:
`npm run verify:app-findings-r154` (B: b1–b4) · `npm run verify:kuka` (KUKA-291).

---

## D-VS-3102 — A MUNKAMENET-TÁR KORLÁTOS: TÉTLENSÉGI IDŐ ÉS PLAFON, A NÉVTELEN ESIK ELŐBB (R154, SES-01)

**A döntés.** A munkamenet-tár NEVEZETT feloldó (`makeSessionStore`) két kimondott korláttal:
TÉTLENSÉGI IDŐ (alap 12 óra) és PLAFON (alap 20 000 sor). A plafon fölött a LEGRÉGEBBEN LÁTOTT sorok
mennek előbb, és a NÉVTELENEK ELŐBB, mint a belépettek; a belépett munkamenet kiszorítása NAPLÓBAN
nevezett sor. Mindkét korlát környezetből állítható (`VS_APP_SESSION_MAX` ·
`VS_APP_SESSION_IDLE_MS`).

**Miért.** A korábbi alak sima `Map` volt: MINDEN süti nélküli kérés új sort tett bele, és törölni
egyedül a be- és kilépés törölt. MÉRVE: 10 000 süti nélküli `GET /api/me` után a tár 10 000 sort
tartott — a növekedés soha nem áll meg magától. Lejárat SEMMILYEN nem volt, tehát egy ellopott
munkamenet-süti időkorlát nélkül használható volt. A kiszorítás sorrendje azért jogosultsági döntés,
mert az elárasztás NÉVTELEN sorokat gyárt: a kár ott keletkezik, tehát az őr ott áll.

**Amit ez NEM állít.** Nem osztott munkamenet-tár (példányonkénti, memóriabeli — újraindítás
nullázza), és a 12 órás tétlenségi idő nem mért optimum, hanem kimondott alapérték. A környezeti
felülírás NEM kényelmi kapcsoló: egy 20 000-es plafont élő HTTP-n másképp nem lehet MEGMÉRNI
(KUKA-207). Gépi jel: `npm run verify:app-findings-r154` (C/1: c1–c6 · C/2: c7–c10) ·
`npm run verify:kuka` (KUKA-292).

---

## D-VS-3104 — A TALÁLAT TÉNYE A FELOLDÓBÓL JÖN, MINDEN BEMENETI ÚTON (R154, LNG-03)

**A döntés.** Az `Accept-Language` fejléc választását és a TALÁLAT TÉNYÉT egy feloldó adja
(`pickFromAcceptLanguage` → `{ code, matched }`); a `resolveLanguage` ezt HASZNÁLJA, nem pótolja. A
`parseAcceptLanguage` szerződése szándékosan változatlan (a kódot adja, szövegként).

**Miért.** A `matched` mező egyetlen dolga megmondani, hogy a hívó a KÉRT nyelvet kapta-e, és a
fejléc-úton HARDKÓDOLT `true` volt. MÉRVE: `Accept-Language: fr-FR` → `code: hu, matched: true`,
miközben UGYANEZ a kérés `explicit: 'fr'`-ként helyesen `matched: false`. Egy kérdés két úton két
választ adott. Az ok egy szinttel lejjebb volt: az alapnyelv visszatérése kétértelmű — ugyanaz a
„magyart kért és magyart kapott" és a „franciát kért, nincs francia, ezért magyar".

**Amit ez NEM állít.** Nem fordítás-minőségi állítás, és a nyelvjegyzék nem változott. A hiba
felhasználói hatása MA nulla, mert a `matched`-et továbbadó `langMemory.mjs`-re ma nincs fogyasztó —
de a mező pont erre a kérdésre való, és a következő fogyasztó némán kapott volna hamisat. Gépi jel:
`npm run verify:app-findings-r154` (D: d1–d4, d8) · `npm run verify:kuka` (KUKA-294).

---

## D-VS-3106 — AZ OLVASÁS IS KAPU: A LEJÁRT MUNKAMENET NEM ADHATÓ VISSZA (R154, SES-01 javítása)

**A döntés.** A munkamenet-tár `get`-je (és rajta keresztül a `has` és a `touch`) lejáratot MÉR: a
lejárt sort nem adja vissza, és el is dobja. Tudatosan mellékhatásos olvasó — a tár lejárattal bíró
tár, nem `Map`.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: a `get` lejárat nélkül adta vissza a sort, a
kérés-ciklus rögtön `touch`-olta, és a tétlenségi söprés csak ÚJ sor beszúrásakor futott. Mérve (1 s
korlát, 5 s tétlenség): a `get` visszaadta, a `touch` után a sor megmaradt. Egy csendes példányon a
korlát SOHA nem lépett működésbe, egy ellopott süti pedig korlátlanul megújítható volt — pont az az
eset, amiért a D-VS-3102 a korlátot bevezette.

**Amit ez NEM állít.** A korlát ALATT semmi nem változott: a sor megmarad, és az érintés
meghosszabbítja (ellenpár mérve). Gépi jel: `npm run verify:app-findings-r154` (E: e1–e3) ·
`npm run verify:kuka` (KUKA-296).

---

## D-VS-3107 — A FOLYTATÁST HORDOZÓ NÉVTELEN MUNKAMENET KÜLÖN OSZTÁLY — DE NEM MENTESÜL (R154)

**A döntés.** A kiszorítás HÁROM osztályt ismer: (0) folytatást nem hordozó névtelen · (1) folytatást
hordozó névtelen · (2) belépett — ebben a sorrendben. A tényt a kanonikus otthona adja
(`SELECT session_id FROM pending_intent`), nem egy kézzel tett bélyeg. **A védettség SORRENDET ad,
mentességet NEM:** a plafon minden osztályra áll.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: a belépés előtti meghívó-szándék a munkamenet
azonosítójához kötött, és a kiszorítás minden névtelen sort szemétnek vett. Mérve élő HTTP-n: 300
névtelen kérés után a meghívott munkamenete kiesett, a böngésző új azonosítót kapott, a DB-sor pedig
elérhetetlenül ott maradt.

**Miért nem mentesség.** A `POST /api/invites/pending` HITELESÍTÉS NÉLKÜL ír a `pending_intent`
táblába. Ha a védettség kivonna a plafon alól, egy elárasztó minden saját sorát védetté tehetné, és a
memória-korlát megkerülhető lenne — a védelem nyitná a kaput. Ezt a BIZTONSÁGI ellenpár méri (e9):
minden sor „védett" mellett a plafon mégis áll.

**Amit ez NEM állít.** Az árva `pending_intent` sorok takarítása (lejárat szerint) továbbra is nyitott
kérdés — a tábla ma csak `created_at`-ot tárol, és a `resumeIntent` nem ellenőriz lejáratot
(D-VS-3007 nevezett függője). Ez a döntés annyit ér el, hogy ÚJ árva sort a kiszorítás nem gyárt.
Gépi jel: `npm run verify:app-findings-r154` (E: e6–e9) · `npm run verify:kuka` (KUKA-297).

---

## D-VS-3110 — A VÉDELMI KÉRDÉS HATÓKÖRÉT A DÖNTÉS SZABJA MEG, ÉS AZ ÁRVA ÁLLAPOT TAKARÍTÓDIK (R154)

**A döntés.** A munkamenet-tár védett-lista kérdése a JELÖLTEKRE szűkítve, 500-as darabokban megy
(`protectedIds(candidates)`), és a tár BEJELENTI a kiszorított azonosítókat (`onEvicted`), amire a
hívó törli az árván maradt `pending_intent` sorokat. A tár nem ismeri a táblákat — a takarítás a hívóé.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére, és ez a csomag egyik legfontosabb tanulsága:
**ugyanazt a hibát követtem el, amit ebben a csomagban én magam vezettem ki.** A D-VS-3100 (KUKA-290)
kimondta, hogy a védelem költsége nem nőhet azzal, amivel szemben véd — hat javítással később,
ugyanabban a fájlban, a védett-lista a TELJES `pending_intent` táblát olvasta be minden söprésnél.
Abba pedig a `POST /api/invites/pending` HITELESÍTÉS NÉLKÜL ír. Mérve: 400 hitelesítés nélküli kérés
után a tár 19 sornál állt, a tábla 400-nál. A javítás után: 120 kérés → a tábla 36 sornál áll.

**Amit ez NEM állít.** A `pending_intent` sorok LEJÁRAT szerinti takarítása továbbra is nyitott
(D-VS-3007 nevezett függője); ez a döntés annyit ér el, hogy a tábla a TÁRRAL EGYÜTT korlátos. Gépi
jel: `npm run verify:app-findings-r154` (G: g1, g6, g7) · `npm run verify:kuka` (KUKA-300).

---

## D-VS-3111 — A ROTÁCIÓ ELŐBB ADJA VISSZA A HELYÉT, AZTÁN FOGLAL (R154)

**A döntés.** A belépés a függő szándék kiolvasása után TÖRLI a saját régi munkamenetét, és csak
azután születik a rotált azonosító.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: a korábbi sorrend előbb szúrt be, és telt táron a
beszúrás egy IDEGEN belépett munkamenetet szorított ki — a saját régi sor törlése pedig utána mégis
felszabadított egy helyet. Mérve: 4 belépett sor 4-es plafonon, újra-belépés → egy idegen kiesett, a
tár 3-nál állt. Egy embert feleslegesen léptettünk ki.

**Amit ez NEM állít.** A kiolvasás sorrendje nem változott: a `resumeIntent` továbbra is a törlés
ELŐTT fut, mert a függő meghívó-szándékot a régi azonosítóról kell áthozni. Gépi jel:
`npm run verify:app-findings-r154` (G: g5) · `npm run verify:kuka` (KUKA-301).

---

## D-VS-3114 — A NULLA BÁJT TILALMA EGY FELOLDÓBAN ÁLL, ÉS MINDEN SZÖVEGES TÍPUS HÍVJA (R154)

**A döntés.** A nulla bájt tilalma önálló feloldó (`nulCheck`), amit mind a négy szöveges típus hív:
`string` · `nonempty_string` · `nonempty_text` · `email_address`. Az e-mail cím azonosító-fajta érték,
ezért ott a teljes vezérlő-karakter-tilalom áll. A `secret_string` kimarad (scrypt lenyomat).

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: az ISC-02-ben a tilalmat KÉT típusba írtam be
kézzel, az `email_address` viszont a saját ellenőrzőjét futtatja. Mérve: a
`{"email":"a\u0000@b.test"}` törzsre a `validateRequest` `ok: true`-t adott — tehát pont az a
tároló-eltérés maradt nyitva (SQLite eltárolja, PostgreSQL elutasítja), aminek a megszüntetése az
ISC-02 CÉLJA volt. Gépi jel: `npm run verify:app-findings-r154` (I: i1–i3) · `npm run verify:kuka`
(KUKA-304).

---

## D-VS-3115 — A TELT PÉLDÁNY NEVEZETTEN MOND NEMET, NEM SZOLGÁL KI MUNKAMENET NÉLKÜL (R154)

**A döntés.** A `newSession` kimondja, felvette-e a tár (`admitted`). Ha nem, a kérés-ciklus
`503 at_capacity` + `Retry-After` választ ad azokra az utakra, amiknek munkamenet kell; a statikus lap
továbbra is kimegy, de süti nélkül.

**Miért.** A KÜLSŐ REVIEW (Codex) **P1** leletére, ami a D-VS-3112 következménye: telt, csupa belépett
sorral teli táron a friss névtelen munkamenet azonnal kiesik — a kérés viszont lefutott, a süti
kiment, és egy állapotíró kezelő olyan azonosítóra írt, ami nincs a tárban. Mérve: 30 süti nélküli
állapotíró kérés → **30 árva** adatbázis-sor, és a takarítás már lefutott, mielőtt a sor megszületett.
A rendszer sikert jelentett egy olyan hatásra, amit senki nem tud visszaolvasni.

**Amit ez NEM állít.** A 503 egy VALÓDI korlát kimondása, nem hibakezelés: ha a staging rendszeresen
ezt adja, a plafon kevés, és a `VS_APP_SESSION_MAX` emelése a válasz. Gépi jel:
`npm run verify:app-findings-r154` (I: i7, i8) · `npm run verify:kuka` (KUKA-305).

---

## D-VS-3118 — A KISZOLGÁLÁS IDEJÉRE VÉDETT MUNKAMENET, A KAPU HELYETT (R154, SES-03)

**A döntés.** Amíg egy kérés egy munkamenetet kiszolgál, annak a sora VÉDETT (`sessions.pin(id, token)`),
és a kérés végén minden pinje elenged (`unpinAll` a `finally` ágon). Az `admitted` mező és a
`503 at_capacity` ág KIKERÜLT — egy mechanizmus kettő helyett.

**Miért.** A KÜLSŐ REVIEW (Codex) két újabb leletére, amik a D-VS-3115 ÁRAI voltak:
· **P1:** a felvétel ellenőrzése egyszeri volt, a kérés viszont `await readBody`-n megszakad. Mérve
`maxSessions=2` mellett: a lassú, darabolt POST **200**-at adott, és ÁRVA `pending_intent` sort hagyott.
· **P2:** az átfogó `503` a `GET /api/verify`-t is elzárta, ami munkamenetet nem is használ. Mérve
csupa belépett sorral teli táron: a megerősítő levél hivatkozása **503** — a felhasználó nem tudta
megerősíteni a fiókját, és a token közben lejárhat.

A tanulság nem „hiányzott egy ellenőrzés", hanem hogy a munkamenet létezését FELTEVÉSKÉNT kezeltem, és
a feltevést előbb ellenőrzéssel, aztán kapuval akartam pótolni.

**Amit ez NEM állít.** A plafon nem pontos korlát: a tár a plafon fölött lehet annyival, ahány kérés
ÉPP FUT, és a plafon a KÖVETKEZŐ beszúrásnál érvényesül — tehát egy sorral túl is lóghat, amíg új kérés
nem jön. Ez korlátos és kimondott tűrés. A pin elengedését külön ellenpár méri. Gépi jel:
`npm run verify:app-findings-r154` (J: j1–j5, I: i7) · `npm run verify:kuka` (KUKA-308).

---

## D-VS-3119 — A VISSZAVÉTEL-PRÓBA A MECHANIZMUS FORRÁSÁNÁL TÖRTÉNIK (R154)

**A döntés.** A KUKA-092 szerinti visszavétel-próbát a mechanizmus SAJÁT FORRÁSÁNÁL végezzük, nem a
hatásai egyikénél; ha a mechanizmus több ponton hat, a lista a visszavétel ELŐTT készül el.

**Miért.** A pin bevezetése után a `drop` védelmét vettem ki, és a battéria joggal maradt 76/76 zöld —
mert a pin a plafon-számításban is hat, és az még megakadályozta a söprést. Ebből azt a HAMIS
következtetést vontam le, hogy a próbáim nem védenek, és feleslegesen újraírtam egy jó próbát. Amikor a
pint a `pin()` feloldónál tettem hatástalanná, a battéria azonnal 3 pirosat adott, és a `j2` pontosan
azt az 1 árva sort mérte, amit kézzel reprodukáltam.

**Amit ez NEM állít.** Ennek a döntésnek NINCS gépi jele: a visszavétel-próba kézi lépés (ahogy a
KUKA-293 is kimondja), a tanulság helye a munkarend. Gépi jel: nincs — kimondva.

---

## D-VS-3120 — AZ ÁTIRAT HELYÉT A MÉRŐ FELOLDÓJA ADJA, AZ EXPORT NEM RAK ÖSSZE SAJÁT UTAT (R154)

**A döntés.** A `tools/v3_fogyasztas_export.mjs` a mérő közös feloldóját hívja
(`transcriptsOf(projectsDir, session)`), a projekt-gyökér `--projects`-szel felülírható, és a hiba
kimondja, hol keresett. Saját projekt-utat az export nem állít össze.

**Miért.** A korábbi alak BEÉGETVE a `-home-user` projekt-könyvtárat kereste. MÉRVE (R154 zárás):
ugyanabból az átiratból a mérő **315 hívást** olvasott be — a projekt itt `-home-user-valach-system`
—, az export viszont `NINCS ÁTIRAT`-tal elhasalt. Egy tény (hol van az átirat) két helyen élt, és a
hibás példány éppen a csomagváltáshoz KÖTELEZŐ tartalom nélküli fogyasztás-leltár írását állította
meg (CLAUDE.md 1. szakasz). A beégetett út a saját környezetében zöldnek látszott — ez a KUKA-051
családja —, és mert az export nem része a söprésnek, egyetlen verifier sem jelezte.

**Amit ez NEM állít.** Nem állítja, hogy a többi egyszeri eszköz át van vizsgálva: ez EGY eszköz EGY
környezet-függő útja. Gépi jel: `npm run verify:kuka` (KUKA-310: egy pozitív + egy tiltó minta) ·
`npm run verify:app-findings-r154` (K: k1 a feloldó viselkedése szintetikus projekt-néven, k2 a
forrás-kötés).

---

## D-VS-3121 — A PLAFON A VÉDELEM MEGSZŰNÉSEKOR IS ÁLL, ÉS AZ ELENGEDÉSI ÚT IS MEGKÉRDEZI A VÉDETTSÉGET (R154)

**A döntés.** A kérés végén az `unpinAll` nem csak elengedi a pint: ha a tár a plafon fölé került, a
MOST elengedett, folytatást NEM hordozó névtelen sorok mennek elsőként, és ha a plafon utána is
sérül, a rendes söprés dönt a maga osztály-sorrendjével. A védettséget az elengedési út is
megkérdezi — de CSAK a most elengedett azonosítókra.

**Miért.** A pin (D-VS-3118) a plafon-számításból is kivonta a sort, ezért egy ÁTFEDŐ kérés-köteg
minden tagja felvételt nyert, az elengedés viszont nem söpört. MÉRVE `maxSessions=2` mellett 10
átfedő kéréssel: a tár a köteg lefutása után is **12 sornál** állt — a tár szintjén és ÉLŐ HTTP-n
egyaránt. A javítás után **2**. A saját soros próbám (`j5`) ezt nem kapta el: átfedés nélkül a hiba
elő sem áll. A javítás ELSŐ alakja viszont a védettséget nem kérdezte meg, és egy ÉLŐ munkamenet
meghívó-folytatását vitte el — ezt a saját `g7` ellenpárom kapta el, commit előtt (KUKA-315).

**Amit ez NEM állít.** A tár továbbra is annyival lóghat túl a plafonon, ahány kérés ÉPP FUT — ez
korlátos és kimondott tűrés, nem „majdnem jó". Gépi jel: `npm run verify:kuka` (KUKA-311 · KUKA-315)
· `npm run verify:app-findings-r154` (L: l1, l7, l2, l8 · g7).

---

## D-VS-3122 — A SIKERTELEN TAKARÍTÁS AZONOSÍTÓI VÁRÓLISTÁN MARADNAK, A VÁRÓLISTA KORLÁTOS (R154)

**A döntés.** Ha a kiszorított munkamenetek szerver-oldali állapotának takarítása elhasal, az
azonosítók várólistára kerülnek, és a következő bejelentés leadja őket. A várólista 10 000
azonosítónál korlátos, és a túlfolyást a napló megnevezi.

**Miért.** A korábbi alak az azonosítókat a hiba előtt kivette a listából, és csak naplózott. A
munkamenet a tárból eltűnt, tehát a jelölt-listába sem kerülhet vissza: a `pending_intent` sorai
SOHA többé nem lettek volna megtalálhatók. MÉRVE: dobó takarítás után a várólista 0 volt, és az
első azonosító elveszett; a javítás után a várólista 1, és a következő bejelentés mind a kettőt
leadja.

**Amit ez NEM állít.** A `pending_intent` sorok LEJÁRAT szerinti takarítása továbbra is nyitott
(D-VS-3007 nevezett függője). Gépi jel: `npm run verify:kuka` (KUKA-312) ·
`npm run verify:app-findings-r154` (L: l3).

---

## D-VS-3123 — A PINEK JEL SZERINTI FORDÍTOTT INDEXE: A KÉRÉS A SAJÁT PINJEIT ENGEDI EL (R154)

**A döntés.** A pinek azonosító szerint ÉS a kérés jele szerint is indexeltek; az elengedés a saját
azonosítókat járja be, nem a teljes pin-táblát.

**Miért.** MÉRVE: 4000 átfedő kérés pinjeinek elengedése **593 ms** → **6 ms** (≈100×). Ez a
NEGYEDIK eset ugyanabból a hibaosztályból ebben a csomagban (D-VS-3100 a kéréskorlát sora ·
D-VS-3110 a teljes tábla-olvasás · D-VS-3116 a rendezés telt táron · ez): a védelem költsége azzal
nő, amivel szemben véd.

**Amit ez NEM állít.** Nem teljesítmény-hangolás: a próba korlátja a KVADRATIKUS nagyságrendet zárja
ki, nem a gépet méri. Gépi jel: `npm run verify:kuka` (KUKA-313) ·
`npm run verify:app-findings-r154` (L: l4).

---

## D-VS-3124 — A KÉRÉSNEK EGY IDEJE VAN, ÉS AZ ÉRINTÉS MEGMONDJA, SIKERÜLT-E (R154)

**A döntés.** A kérés-ciklus egyetlen időbélyeget (`requestNow`) ad a munkamenet kikeresésének és az
érintésének, a `touch` pedig logikai értéket ad vissza. A hamis érintés munkamenet-hiánynak számít:
a kérés friss munkamenetet kap, nem használ tovább egy lejártat.

**Miért.** A két külön `Date.now()` rést nyitott: ha a sor a két hívás között lépte át a tétlenségi
határt, a `get` még visszaadta, a `touch` eldobta — a helyi `session` változó viszont továbbra is
belépettnek látszott, és a pin egy már nem létező sorra került. A kérés így nem követett
munkamenettel futott le, és árva szerver-oldali állapotot hagyhatott. Ez a D-VS-3115 alakja a
`touch`-ra alkalmazva: egy feloldó, ami csendben el is dobhatja, amit a hívó használni akar, minden
hívójánál hibát szül.

**Amit ez NEM állít.** Nem állítja, hogy a kérés-ciklus minden más idő-használata át van vizsgálva:
ez EGY pár (kikeresés + érintés). Gépi jel: `npm run verify:kuka` (KUKA-314) ·
`npm run verify:app-findings-r154` (L: l5, l6).

---

## D-VS-3125 — A PLAFON A BESZÚRÁSNÁL DÖNT: AMIT A TÁR NEM TUD MEGTARTANI, AZT FEL SEM VESSZÜK (R154)

**A döntés.** A munkamenet-tár plafonja a TÁR MÉRETÉRE áll (a pin nem mentesít a számolás alól, csak az
áldozat-választásból zárja ki a sort), a munkamenet ELŐBB kerül be és CSAK UTÁNA kap pint, a süti pedig
csak akkor megy ki, ha a tár meg is tartotta a sort. A munkamenethez kötött ÍRÁS — az egyetlen ilyen út,
a `POST /api/invites/pending` — NEVEZETTEN nemet mond (`503 at_capacity`), ha a sort a tár nem tartotta meg.

**Miért.** A D-VS-3121 a plafont a pin ELENGEDÉSEKOR állította helyre. Telt, BELÉPETT sorokkal teli táron
viszont a friss névtelen sor a helyes osztály-sorrend szerint is előbb esik ki, mint bármely belépett
(D-VS-3107: a védettség sorrend, nem mentesség) — így az utólagos söprés pontosan azt a sort vitte el,
amelyhez a kezelő ÉPP AKKOR írt. MÉRVE (`maxSessions=2`, csupa belépett sor): a süti nélküli
`POST /api/invites/pending` **200**-at ÉS sütit adott, a munkamenet NEM volt a tárban, a kiírt
`pending_intent` sort az árva-takarítás törölte, és a következő kérés ugyanazzal a sütivel ÚJ
munkamenetet kapott, `invite_context: null`-lal. A javítás után ugyanaz a kérés: **503 `at_capacity`**,
süti nélkül, nulla sorral — és 10 átfedő kérés mellett a tár a plafont KÖZBEN sem lépi túl (régen 11–12).

**Ez HÁROM egymást visszafordító kör vége, és ezt kimondjuk.** Felvételi kapu (D-VS-3115) → pin
(D-VS-3118) → utólagos söprés (D-VS-3121) → most a sorrend megfordítása. Ha három kör egymást fordítja
vissza ugyanazon a helyen, nem a lépések hibásak, hanem a SORREND.

**Amit ez NEM állít.** Nem oldja meg a gyökér-okot: minden süti nélküli kérésre továbbra is munkamenet
SZÜLETIK, csak már nem marad bent, ha nincs hely. A lusta munkamenet átalakítása továbbra is DÖNTÉSRE
vár (a lefedettségi lap gyökér-ok szakasza). Gépi jel: `npm run verify:kuka` (KUKA-316) ·
`npm run verify:app-findings-r154` (M: m0–m5 · L: l1).

---

## D-VS-3126 — AZ AZONOSSÁG-VIZSGÁLAT DEKÓDOLJA A FORRÁS ADATBÁZIS NEVÉT (R154)

**A döntés.** A `proof:pg-durability` a forrás adatbázis nevét a `DATABASE_URL`-ből DEKÓDOLVA veti össze
a visszatöltési céllal; a hibás százalék-kódolás „nem megállapítható", és ott ÓVATOSAN megállunk. A két
tiszta döntés (alak-ellenőrzés, azonosság) külön modulba került — `tools/lib/vs_pg_target.mjs` —, hogy a
battéria MEGHÍVHASSA őket.

**Miért.** A `URL.pathname` nyers, kódolt alakot ad: egy `postgres://…/foo%24bar` forrás és egy
`VS_RESTORE_TEST_DB=foo$bar` cél UGYANAZ az adatbázis, a nyers összehasonlítás szerint viszont
különböző — a lánc másik végén pedig `DROP DATABASE` áll. A próba tehát a FORRÁST törölte volna, amit
ígérete szerint soha nem ír felül. MÉRVE a feloldón: nyersen `same: false`, dekódolva `same: true`.

**Amit ez NEM állít.** A lánc továbbra is VALÓDI PostgreSQL-t kér, tehát a söprésben nem fut; a két
döntés viszont mostantól a battériából mérve van (KUKA-207). Gépi jel: `npm run verify:kuka` (KUKA-317 ·
a KUKA-307 két mintája az új otthonra) · `npm run verify:app-findings-r154` (N: n1–n3).

---

## D-VS-3127 — A HIBÁS VISSZATÖLTÉSI CÉLT AZ ÉRTÉK NÉLKÜL JELEZZÜK (R154)

**A döntés.** A `VS_RESTORE_TEST_DB` alak-hibája a MÉRT TÉNYEKET mondja el — hossz, kezdet-osztály,
kapcsolati-cím alak —, az ÉRTÉKET nem írjuk ki.

**Miért.** A leggyakoribb hiba éppen az, hogy valaki kapcsolati CÍMET ad meg adatbázis-név helyett; abban
felhasználónév és JELSZÓ van. A korábbi alak `JSON.stringify`-jal a naplóba tette — terminálba és
CI-naplóba egyaránt. Ebben a rendszerben a szabály nem tűr kivételt: `DATABASE_URL` és bármely kulcs
soha nem kerül chatbe, és ugyanígy naplóba sem. MÉRVE: a jelzés egy jelszavas kapcsolati címre sem
tartalmazza az értéket, de kimondja, hogy „kapcsolati cím alakú".

**Amit ez NEM állít.** Nem állítja, hogy minden eszköz hibaága át van vizsgálva — ez EGY hibaág. Gépi
jel: `npm run verify:kuka` (KUKA-318) · `npm run verify:app-findings-r154` (N: n4–n5).

---

## D-VS-3128 — A TÖBBES ÁTIRAT-TALÁLAT NEVEZETT ELAKADÁS (R154)

**A döntés.** Ha ugyanaz a munkamenet-azonosító több projekt-könyvtárban is szerepel, a fogyasztás-export
MEGÁLL (2-es kilépés), felsorolja a talált utakat, és a `--projects` megadását kéri.

**Miért.** A D-VS-3120 javítása után az export minden projekt-könyvtárat végignéz, de a találatok közül
csendben az elsőt vette — így ELAVULT példányt is exportálhatott, miközben sikeresnek látszott, és a
leltár ÁTADÁSI bizonyíték. MÉRVE két szintetikus projekt-könyvtárral: a régi alak 0-s kilépéssel
exportált, a mostani 2-essel megnevezi mindkét utat.

**Amit ez NEM állít.** A mérő (FGY-01/3) továbbra is MINDET beolvassa — a két viselkedés különbségét nem
elrejtjük, hanem kimondjuk. Gépi jel: `npm run verify:kuka` (KUKA-319) ·
`npm run verify:app-findings-r154` (N: n6 — az eszköz tényleges futtatásával).

---

## D-VS-3129 — A `q=0` KIZÁRÁS A DÖNTÉS MINDEN ÁGÁN SZÁMÍT, ÉS A `*` JOKER IS (R154)

**A döntés.** Az `Accept-Language` feloldásában a `q=0` címkék KIZÁRÁST képeznek (`*;q=0` = minden más
kizárva), a `*` joker a nyelvi jegyzék sorrendjében ad egy NEM kizárt nyelvet, és kizárt nyelvre az
alapnyelvre-esés sem vezethet. Ha minden elfogadható nyelvet kizártak, a lap akkor is kirajzolódik —
alapnyelven, de `matched: false`-szal.

**Miért.** A D-VS-3105 javításakor a nulla súlyú címkéket KISZŰRTEM, ezzel a kizárás ténye elveszett.
MÉRVE: `Accept-Language: hu;q=0, *;q=1` → **`hu`**, vagyis pont a kizárt nyelv; a javítás után `en`.
A szűrés tehát a hiba egyik felét orvosolta (a kizárt nyelv nem nyer a pozitív ágon), a másikat
elrejtette (a visszaesési ágon mégis nyert).

**Amit ez NEM állít.** Nem teljes RFC 4647-es nyelvi-tartomány illesztés (nincs `en-*` mintázat-kezelés
a nyelv-alcímkén túl); a jegyzék sorrendje dönt a joker esetében, és ezt kimondjuk. Gépi jel:
`npm run verify:kuka` (KUKA-320) · `npm run verify:app-findings-r154` (O: o1–o7) ·
`npm run verify:i18n`.

---

## D-VS-3130 — A PRÓBA KIMENETE SOHA NEM A KÖNYVELT BIZONYÍTÉK ÚTJA (R154)

**A döntés.** Minden próba, ami egy repó-eszközt futtat, KIMONDOTTAN megadja a saját kimeneti útját
(ideiglenes könyvtár). Az eszközök alapértelmezett, könyvelt kimeneti útjára próba nem írhat.

**Miért.** A KUKA-319 próbája `--out` nélkül futtatta az exportálót, és ezzel — különösen a
visszavétel-próbában, ahol az őr szándékosan nincs ott — felülírta a KÖNYVELT
`V3_R71_FOGYASZTAS_EXPORT.json`/`.csv` bizonyítékot: a JSON a szintetikus munkamenetet nevezte meg
nulla hívással, a CSV kiürült, és a kár a `00e4251` commitban fel is ment. A fájlokat visszaállítottam
a SPEC-alappal (`e24860f4`) **bájtra azonos** alakra.

**Amit ez NEM állít.** Nem állítja, hogy a többi próba át van vizsgálva erre — ez EGY próba EGY
mellékhatása; a `verify:artifact-naming` a NEVEKRE áll, nem arra, hogy ki írja őket. Gépi jel:
`npm run verify:kuka` (KUKA-321).

---

## D-VS-3131 — A PLAFON A `set` UTÁN MINDIG ÁLL: A FELVÉTEL ELUTASÍTHATÓ, DE KILÉPTETÉS NINCS (R154)

**A döntés.** Ha a plafon a két kiszorítási kör után is sérül (mert minden áldozat épp kiszolgálás
alatt áll), akkor a BESZÚRT sor megy — akkor is, ha belépett. A belépés ilyenkor NEVEZETTEN nem
sikerül (`503 at_capacity`), süti nélkül. A már bent lévőket nem léptetjük ki.

**Miért.** A D-VS-3125 után a plafont a beszúrás érvényesíti, az elengedés nem söpör. MÉRVE (plafon 2,
két belépett sor PINELVE, majd egy belépés): a tár **3 sornál** állt és ott is maradt; élő HTTP-n
1-es plafonnal ugyanez. Vagyis a „kimondott tűrés" nem volt múló: egy érvényes jelszóval rendelkező
kérő ismételhette, és a memória-korlát megkerülhető volt. A javítás után: a tár a plafonon marad, a
számláló pedig ELUTASÍTÁST mond (`refused_cap`), nem kiléptetést (`evicted_cap_signed_in: 0`).

**Amit ez NEM állít.** Az elutasítás ÁTMENETI, nem kapu: amint a futó kérések elengedik a sorukat, a
belépés sikerül (mérve: `p7`). És ha a staging rendszeresen ezt adja, a plafon kevés — a
`VS_APP_SESSION_MAX` emelése a válasz, nem az elutasítás elrejtése. Gépi jel:
`npm run verify:kuka` (KUKA-322) · `npm run verify:app-findings-r154` (P: p1–p7).

---

## D-VS-3132 — MINDEN MÉRÉS MÉRJE MEG A SAJÁT ALAPSOKASÁGÁT (R154)

**A döntés.** A teljesítmény- és viselkedés-mérések KIMONDOTTAN állítják a saját előfeltételüket (itt:
`l4a` — a pinek száma tényleg annyi, amennyit a mérés feltételez), mielőtt bármit állítanának.

**Miért.** A KUKA-313 mérése a pint a beszúrás ELŐTT tette; az F154-29 megfordította a sorrendet, és a
`pin()` nem létező sorra már nem pinel — a mérés NULLA pint hozott létre, tehát akkor is zöld lett
volna, ha a kvadratikus alak visszatér. MÉRVE: a javított próba 4000 pinnel, a kvadratikus alak
visszatételével **452 ms**-mal piros; a hibás alak 2 ms-mal zöld maradt.

**Amit ez NEM állít.** Nem állítja, hogy a battéria MINDEN mérése kimondja az alapsokaságát — ez EGY
mérés javítása és EGY szabály kimondása. Gépi jel: `npm run verify:kuka` (KUKA-323) ·
`npm run verify:app-findings-r154` (l4a, l4).

---

## D-VS-3133 — A NEVEZETT ELUTASÍTÁSNAK MŰKÖDŐ KIÚTJA VAN (R154)

**A döntés.** A fogyasztás-export kétértelműségénél három feloldási út van, és MIND a három működik:
`--transcript <fájl>`, `--projects <a KIVÁLASZTOTT projekt-könyvtár>`, vagy a szülő-könyvtár minden
projektje. A hibaüzenet mind a hármat megnevezi.

**Miért.** A korábbi üzenet a projekt-gyökér megadását tanácsolta, de a feloldó a kapott utat a
projekt-könyvtárak SZÜLŐJÉNEK veszi — a kiválasztott könyvtárral tehát `NINCS ÁTIRAT`-tal elhasalt
(mérve: 2-es kilépés). Egy nevezett elutasítás annyit ér, amennyit a folytatása (KUKA-201).

**Amit ez NEM állít.** Nem fűzi össze a több átiratot — az továbbra is a mérő dolga, és ezt az üzenet
kimondja. Gépi jel: `npm run verify:kuka` (KUKA-324) · `npm run verify:app-findings-r154` (Q: q5–q8).

---

## D-VS-3134 — AZ ÚT NÉLKÜLI KAPCSOLATI CÍM ADATBÁZIS-NEVE A FELHASZNÁLÓ (R154)

**A döntés.** Ha a `DATABASE_URL` nem nevez meg adatbázist, az adatbázis-név a kapcsolódó FELHASZNÁLÓ
neve (dekódolva) — ezt vetjük össze a visszatöltési céllal. Ha felhasználó sincs, a tényleges név NEM
megállapítható, és ott ÓVATOSAN megállunk.

**Miért.** A PostgreSQL-kliensek alapértelmezése ez. A korábbi alak üres nevet képzett, így egy
`postgres://source_user:pw@host` forrás és egy `VS_RESTORE_TEST_DB=source_user` cél „eltér"-nek
számított, holott UGYANAZ az adatbázis — a lánc végén pedig `DROP DATABASE` áll. Ugyanaz a hibaosztály,
mint a D-VS-3126 (ott a százalék-kódolás, itt az elhagyott út).

**Amit ez NEM állít.** Nem teljes libpq-kompatibilis feloldás (környezeti változók, `.pgpass`, `PGDATABASE`
nincs figyelembe véve) — ezért is esik a „nem tudom" az óvatos ágra. Gépi jel: `npm run verify:kuka`
(KUKA-325) · `npm run verify:app-findings-r154` (Q: q1–q4).

---

## D-VS-3135 — A KAPCSOLATI CÍM FELÜLÍRÁSAIT FEL KELL OLDANI, ÉS A SAJÁT URL-EKBŐL KIVENNI (R154)

**A döntés.** A forrás tényleges adatbázis-nevét EGY feloldó adja (`effectiveDatabase`): query `dbname` →
út → query `user` → cím-felhasználó; ha egyik sincs, NEM TUDHATÓ, és ott megállunk. A kiszolgáló-URL-eket
a `withDatabase` állítja elő: beállítja az utat ÉS kiveszi a `?dbname=` felülírást.

**Miért.** `postgres://decoy@host/?user=source` `source`-ként kapcsolódik, és út híján a `source`
adatbázist nyitja — a korábbi alak a `decoy`-t vetette össze a céllal, „eltér"-t mondott, és a
`DROP DATABASE "source"` a VALÓDI forrást törölte volna. Ez a HARMADIK eset ugyanebben az eszközben
(D-VS-3126 a százalék-kódolás, D-VS-3134 az elhagyott út, ez a query).

**Amit ez NEM állít.** Nem teljes libpq-feloldás: környezeti változók és `service` fájl nincs benne —
ezért esik a „nem tudom" az óvatos ágra. Gépi jel: `npm run verify:kuka` (KUKA-326) ·
`npm run verify:app-findings-r154` (R: r1–r5).

---

## D-VS-3136 — AZ ÚJ KÉZI BEMENET IS HATÁR: A `--transcript` A KÉRT MUNKAMENETHEZ KÖTVE (R154)

**A döntés.** A `--transcript` csak akkor fogadható el, ha a fájlnév `<munkamenet>.jsonl`, VAGY a tartalom
első 50 sorának `sessionId`-ja a kért munkamenetre mutat. Különben nevezett elakadás.

**Miért.** A kapcsoló (a D-VS-3133 új kiútja) bármely létező fájlt elfogadott, a kimenet viszont a
parancssori azonosítót írta a fejlécbe: egy elgépelt út HIHETŐ, de hibásan attribuált leltárt adott
(mérve: régen 0-s kilépés idegen átirattal). A leltár átadási bizonyíték.

**Amit ez NEM állít.** Nem ellenőrzi az átirat tartalmi épségét — csak a HOZZÁRENDELÉST. Gépi jel:
`npm run verify:kuka` (KUKA-327) · `npm run verify:app-findings-r154` (R: r8–r9).

---

## D-VS-3137 — A MUNKAMENET-KORLÁTOK POZITÍV EGÉSZ SZÁMOK (R154)

**A döntés.** A `VS_APP_SESSION_MAX` és a `VS_APP_SESSION_IDLE_MS` csak pozitív EGÉSZ szám
(`Number.isSafeInteger`); a hibás értéket a napló megnevezi, és az alapértelmezés áll be.

**Miért.** `0.5` korábban érvényes volt, az első beszúrás után viszont a tár azonnal a plafon fölé
került: a névtelen sor kiesett, a belépett a végső elutasításra futott — a szolgáltatás egyetlen
munkamenetet sem tudott megtartani, miközben a beállítás „átment az ellenőrzésen".

**Amit ez NEM állít.** Nem tagadja meg az indulást: a memória-korlát nélkül nem futhatna a kiszolgálás,
egy indulás-megtagadás pedig a mai üzemben nagyobb kárt tenne, mint a KIMONDOTT visszaállás. Gépi jel:
`npm run verify:kuka` (KUKA-328) · `npm run verify:app-findings-r154` (R: r6–r7).

---

## D-VS-3138 — A FRISS, ÁLLAPOT NÉLKÜLI SOR ELŐBB ESIK KI, MINT EGY FOLYTATÁST HORDOZÓ (R154)

**A döntés.** Ha a plafon betartásához a VÉDETT (folytatást hordozó) körbe kellene lépni, és a beszúrt
sor névtelen és nem hordoz folytatást, akkor a BESZÚRT sor megy. A jövevény ilyenkor nevezett
elutasítást kap az írásra, és egyetlen meglévő folytatás sem esik ki.

**Miért.** A `keep` védelme a 0. körből is kivette a friss sort, ezért csupa folytatást hordozó táron az
1. kör kezdett ürítni. MÉRVE (`maxSessions=4`): négy folytatást hordozó sor + egy friss kérés → **két**
meghívó-folytatás elveszett; élő HTTP-n a jövevény **200**-at kapott, a tábla 37→38 lett. Vagyis egy
látogató, aki semmit nem tett, mások állapotát törölte.

**Amit ez NEM állít.** A `keep` védelme megmarad ott, ahol a beszúrt sor BELÉPETT (D-VS-3112), és a
védettség továbbra is SORREND, nem mentesség (D-VS-3107). Gépi jel: `npm run verify:kuka` (KUKA-329) ·
`npm run verify:app-findings-r154` (g7: míg van hely, a folytatás túlél · g8: telt táron a jövevény
elutasítva).

---

## D-VS-3139 — A NYELVI KIZÁRÁS TARTOMÁNY-ILLESZTÉSSEL ÁLL (R154)

**A döntés.** A `q=0` kizárás a TELJES nyelvi tartományra szól: akkor áll, ha a kód maga a tartomány,
vagy a tartomány + kötőjel kezdetű. Így `de-AT;q=0` nem zárja ki az általános `de`-t.

**Miért.** A D-VS-3129 megtartotta a kizárást, de az első alcímkére vágta, ezért egy regionális kizárás
az általános nyelvet is elnémította: `de-AT;q=0, de;q=1` → **`hu`**, most `de`. Az RFC 4647 alap-illesztése
szerint a hosszabb tartomány a rövidebb címkére nem illeszkedik.

**Amit ez NEM állít.** Nem teljes RFC 4647 (nincs kiterjesztett szűrés, és a jegyzék sorrendje dönt a
jokernél). Gépi jel: `npm run verify:kuka` (KUKA-330) · `npm run verify:app-findings-r154` (R: r10–r11) ·
`npm run verify:i18n`.

---

## D-VS-3154 — A VÉDELEM KÖLTSÉGÉT A JAVÍTÁS UTÁN IS MEG KELL MÉRNI (R158, KUKA-346)

**A döntés.** A kéréskorlát kulcs-kiszorítása a `Map` beszúrási sorrendjét használja LRU-listaként
(`delete`+`set` minden találatnál), és az ELEJÉRŐL dob annyit, amennyi a plafon fölött van — rendezés
NÉLKÜL; a figyelmeztetés ablakonként legfeljebb egyszer megy ki. **Miért.** Az első javításom telt
plafonnál minden kérésnél RENDEZTE a teljes térképet (a reviewer gépén 20 000 kulcs ~9,5 s), és
kérésenként naplózott — vagyis a KUKA-290 hiba-osztályát, amit ebben a PR-ben magam vezettem ki,
visszaépítettem a megoldásba. **Ki találta meg.** Külső review (Codex, F158-12, P1). **Amit ez NEM
állít.** A kiszorítás nem ingyenes: egy eldobott kulcs számlálója újraindul (ez a KIMONDOTT csere), és
a mérce skála-független — a kiszorításonkénti költség négyszeres munkánál sem nő kétszeresére.

---

## D-VS-3155 — AZ IDŐ-KORLÁT KÉT IRÁNYÚ, ÉS A TAKARÍTÁS AZ ÁRVA SORT IS ELÉRI (R158, KUKA-347)

**A döntés.** A `resumeIntent` a NEGATÍV kort (jövőbeli `created_at`) is lejártnak veszi, és a halmazos
takarítás három esetet visz egy utasításban, tároló-függetlenül: a türelmi időn túli · a jövőbeli · és a
nem kanonikus alakú sort (`created_at NOT LIKE '____-__-__T%'`). **Miért.** A negatív kor VÉGES, tehát
átment a frissességi ellenőrzésen (egy 2099-es sor 2099-ig folytatódott volna); a romlott időbélyegű
ÁRVA sorhoz pedig sem a szöveges `<` összehasonlítás, sem az olvasás nem ér el. **Ki találta meg.**
Külső review (Codex, F158-13 · F158-14). **Amit ez NEM állít.** A `created_at` alakját sémában továbbra
sem kényszerítjük — a védelem az olvasó és a takarító oldalon áll.

---

## D-VS-3156 — A KAPU TANÚJA A FUTÁSHOZ KÖTÖTT (R158, KUKA-348)

**A döntés.** A böngésző-kapu a jelentést a futtatás ELŐTT törli, és a jelentés kezdő időpontjának a
mostani futás indulása UTÁN kell lennie (2000 ms tűrés). **Miért.** A létezés-ellenőrzés egy korábbi
futás fájlját is elfogadta volna — pontosan az a helyzet, ami a kapu első futásánál elő is állt.
**Ki találta meg.** Külső review (Codex, F158-15). **Amit ez NEM állít.** A tűrés a jelentő saját
órájából következik; a kötés szerkezeti, és a battéria `x6` sora ezt KIMONDJA (nem viselkedés-mérés).

---

## D-VS-3147 — A FÜGGŐ SZÁNDÉK NEM ÉRTELMEZHETŐ IDŐBÉLYEGE LEJÁRTNAK SZÁMÍT (R158, KUKA-339)

**A döntés.** A `resumeIntent` a NaN korú sort (romlott `created_at` vagy óra) LEJÁRTNAK veszi: a
folytatás elmarad, és a sor törlődik. **Miért.** A `Number.isFinite(kor) && …` alak a nem tudást a
MEGENGEDŐ irányba oldotta fel — egy importált sor időkorlát nélkül folytatódott volna. **Ki találta
meg.** Külső review (Codex, F158-04). **Amit ez NEM állít.** A `created_at` alakját sémában nem
kényszerítjük; a romlott sort az OLVASÁS dobja el, a halmazos takarítás string-összehasonlítással
nem talál rá. KIMONDVA: ugyanezt a hiba-osztályt a KUKA-337 EBBEN a körben vezette ki — a tanulság
kimondása nem védett meg a megismétléstől.

---

## D-VS-3148 — A KÉRÉSKORLÁT BEÁLLÍTÁSA MÉRT ALAK, A KULCS-TÉRKÉPE KEMÉNY PLAFON (R158, KUKA-340)

**A döntés.** A `rateLimitConfig` ugyanazt a `posInt` szabályt használja, mint a `sessionLimits`
(hibás érték → nevezett naplósor + alapértelmezés), és a kulcs-térkép plafonja FRISS kulcsokra is
áll: előbb a lejártak mennek, aztán a legrégebben láttak. **Miért.** `VS_APP_RATE_WINDOW_MS=bogus|0|-1`
csendben KIKAPCSOLTA a védelmet, `VS_APP_RATE_MAX=0.5` pedig mindent 429-re vitt; a térkép pedig egy
ablakon belül korlátlanul nőtt. **Ki találta meg.** Külső review (Codex, F158-07 · F158-08). **Amit ez
NEM állít.** A plafon nem ingyenes: egy eldobott kulcs számlálója ÚJRAINDUL, tehát a korlát a
legcsendesebb címekre nézve lazul. A `VS_APP_RATE_MAX=0` továbbra is KIMONDOTT kikapcsolás.

---

## D-VS-3149 — A KAPCSOLATI CÍM OLVASATA libpq SZEMANTIKÁVAL MEGY (R158, KUKA-341)

**A döntés.** Ismételt kulcsnál az UTOLSÓ, nem üres érték dönt; `?service=` jelenlétében a forrás NEM
MEGÁLLAPÍTHATÓ, és a `sameDatabase` óvatosan megáll. **Miért.** A régi alak az ELSŐ értéket vette, és
út nélküli címnél a felhasználót — mindkét úton `DROP DATABASE` fenyegette a VALÓDI forrást. **Ki
találta meg.** Külső review (Codex, F158-01 · F158-02, mindkettő P1), dokumentációs hivatkozással.
**Amit ez NEM állít.** A szolgáltatás-fájl tartalmát nem olvassuk be — nem is tudnánk; a válasz a
bizonytalanság kimondása.

---

## D-VS-3150 — A JOKER A KIFEJEZETTEN MEGNEVEZETT NYELVEKET KIHAGYJA (R158, KUKA-342)

**A döntés.** Az `Accept-Language` `*` jokere csak az EMLÍTÉS NÉLKÜLI nyelvekre szól — súlytól
függetlenül (RFC 9110 §12.4.3). **Miért.** `hu;q=0.5, *;q=1` esetén magyart adtunk, holott egy
elérhető `en`/`de` 1-es súllyal megelőzi. **Ki találta meg.** Külső review (Codex, F158-09). **Amit ez
NEM állít.** A jegyzék sorrendje továbbra is dönt a jelöltek között; a szabály hét határesetre van
kötve, nem egy példára.

---

## D-VS-3151 — A KAPU A HASZNÁLAT PILLANATÁBAN ÁLL, ÉS A NEMLEGES VÁLASZ A SAJÁT NEVÉN MEGY (R158, KUKA-343)

**A döntés.** A `materialize` a tartós munkamenet LÉTÉT is ellenőrzi; a lejárat-eldobás bejelenti
magát (`announceDropped`); az exportált út a közös tisztítón megy. A kiszolgálás közben eltűnt
munkamenet válasza `409 session_gone` — nem a „tár megtelt" neve. **Miért.** A tűzés a kiszorítás ellen
véd, a KIMONDOTT törlés ellen nem: egy lassú, darabolt POST egy már törölt azonosítóra írt, és 200-at
adott. **Ki találta meg.** Külső review (Codex, F158-05 (P1) · F158-06 · F158-10). **Amit ez NEM
állít.** A már korábban árván maradt sorok visszamenőleges takarítását nem végezzük el.

---

## D-VS-3152 — A KÖLTSÉG-REGRESSZIÓ MÉRCÉJE SKÁLA-FÜGGETLEN (R158, KUKA-344)

**A döntés.** A „nem nő a költség" állítást KÉT tárméret ARÁNYA méri (tízszeres tár ⇒ legfeljebb
négyszeres idő), nem absztrakt millisekundum. **Miért.** A `ms < 200` őr a reviewer gépén 219 ms-ot
mért HELYES viselkedés mellett, és pirosat jelzett regresszió nélkül. **Ki találta meg.** Külső review
(Codex, F158-03). **Amit ez NEM állít.** Az arány-tűrés (négyszeres, +50 ms) a mi gépünkön mért zajhoz
van szabva; a nagyvonalú 5 s-os plafon csak a végtelen hurkot fogja meg.

---

## D-VS-3153 — AZ ŐR-OTTHON A MAI MECHANIZMUST NEVEZI MEG (R158, KUKA-345)

**A döntés.** A KUKA-311 őr-otthona a BESZÚRÁSNÁL álló felvételi döntést nevezi meg, és a bejegyzés
`replaced_by` mondata ELÖL jelöli, hogy a felülírt alakot írja le. **Miért.** A régi szöveg a pin
elengedésekor álló söprésre mutatott, ami az R154 hatodik köre óta nem létezik — a regiszter rosszat
tanított, miközben lefedést állított. **Ki találta meg.** Külső review (Codex, F158-11). **Amit ez NEM
állít.** Ennek NINCS gépi jele: a `verify:kuka` a regisztert és az őr-otthon fájlt szándékosan kizárja
a minta-illesztésből, különben a regiszter a saját szövegén teljesítené a saját őreit.

**A hét döntés közös tanulsága, kimondva:** a tizenegy review-lelet közül EGY SEM volt új funkció
hibája — mind egy MÁR KIJAVÍTOTT szabály másik előfordulása, vagy a MÉRÉS (próba, regiszter) és a kód
közti elcsúszás. A javítások fele a saját előző javításaim mellékhatása volt.

---

## D-VS-3146 — AZ ÜRES ÁTVITT KORLÁT KORLÁT, A SÉRÜLT ALAK PEDIG NEM MEGÁLLAPÍTHATÓ (R158/3)

**A döntés.** A delegálási plafon mindkét tengelye UGYANÚGY olvassa a tárolt korlátot: az ÜRES lista
KORLÁT (semmi nem adható tovább), a hiányzó vagy nem-tömb alak pedig NEVEZETTEN elakad
(`parent_limit_undecidable`). A szerep-tengely szűrése feltétel nélkül lefut.

**Miért.** A két tengely ELLENTÉTESEN olvasta ugyanazt az alakot: a szerepeknél az üres lista „nincs
korlát"-ot jelentett, az adatköröknél „semmit". MÉRVE (visszavonás-próbával, a javítás előtti alakon):
`roles: []` átvitt korláttal a plafon `["admin","user"]` lett — az ÜRES korlát tehát ADMIN továbbadására
jogosított; és ugyanez történt, ha a mező HIÁNYZOTT vagy nem tömb volt (`roles: "admin"`). A tagságra
átvitt korlát a `grant_basis.granted_limit` JSON-ja, amit a beolvasó szerkezet-vizsgálat NÉLKÜL vesz át.

**Ki találta meg.** SAJÁT AUDIT-LELET (Claude-v3, R158/3).

**Amit ez NEM állít.** A HTTP-határról ma NEM elérhető: a rendes út nem ír üres szerep-korlátot (a
számítás `delegation_ceiling_empty`-vel elakad, mielőtt írna). A lelet az OLVASÓ oldalán áll — ott, ahol
egy sérült, migrált vagy importált sor hatása eldől; ugyanaz a válasz, amit a tiltásnál már egyszer
megépítettünk (R73/C-F05: a séma-kényszer a migrációt köti, a már bent lévő sort nem). Gépi jel:
`npm run verify:v3ref` (`P-AUTHZ-parent-limit` + M213/M214) · `npm run verify:kuka` (KUKA-338).

---

## D-VS-3145 — A VÉDŐ KAPUK MINDEN ÓRÁJA A VÉDŐ IRÁNYBA DŐL, ÉS A ZÁRÁS A SAJÁT NEVÉN MEGY (R158/3)

**A döntés.** A tiltás (`banEffectiveAt`) és a felfüggesztés (`suspensionEffectiveAt`) értelmezhetetlen
KÉRÉS-óra esetén is ZÁR: `banned: true` / `suspended: true`, `decidable: false`, `clock_*` okkal és a
hívónak szóló mondattal. Az újbóli belépés kapuja ezt a SAJÁT nevén utasítja el
(`reentry_undecidable_clock`, `next_step: fix_request_clock`), nem a felfüggesztés nevén.

**Miért.** A `banScope.mjs` saját bevezetője kimondja: „a tiltás VÉDŐ intézkedés, tehát az eldönthetetlen
óra nem oldhatja fel" — a kód viszont csak a TÁROLT sor óráira alkalmazta ezt, a kérés órájára nem.
MÉRVE: egy bírósági végzéssel alany-szélesen tiltott személy `reentry_admissible`-t kapott, ha a kérés
„most"-ja `undefined`, üres vagy nem kanonikus volt — és a `checked` lista közben felsorolta a
`suspension`+`ban` lépést, tehát a nyom lefutott kapukat ígért.

**Ki találta meg.** SAJÁT AUDIT-LELET (Claude-v3, R158/3, a jogosultsági mag átvizsgálása).

**Amit ez NEM állít.** A rés a HTTP-határról MA NEM elérhető: a `nowIso` minden éles úton a kiszolgáló
órájából jön (`clock.now()`), és az kanonikus. A lelet a NYILVÁNOS feloldó szintjén áll — ott, ahol
minden új hívó örökölné (KUKA-227). Nem állítjuk tehát, hogy élő megkerülés történt; azt állítjuk, hogy
a védelem féloldalas volt, és a féloldalas őr a megengedő irányba dőlt. Gépi jel: `npm run verify:v3ref`
(`P-AUTHZ-protective-clock` + M210/M211/M212) · `npm run verify:kuka` (KUKA-337).

---

## D-VS-3142 — A BÖNGÉSZŐS ELLENŐRZÉS A KÖTELEZŐ KAPU RÉSZE, ÉS AZ EL SEM INDULT MÉRÉS NEM PASS (R158/2)

**A döntés.** A böngészős láncok (`test:e2e` · `proof:core-ux` · `proof:demo-walk`) a KÖTELEZŐ kapu
részei: a `npm run verify:browser-gate` a `verify:` névtérben áll, tehát a söprés név-szűrője magától
elindítja. A kapu a SCRIPTEKET futtatja, és kimondja, ha egy script parancsa megváltozott.

**Miért.** A söprés minden `verify:*`-ot lefuttat — a böngészős láncok más néven futnak, tehát SOHA nem
kerültek a kapuba. MÉRVE: a böngészőben 3 helyzet bukott és 119 teljesült, miközben a kör-végi söprés
zöldet jelentett. Egy ellenőrző, amit a kapu nem indít el, pontosan annyit véd, mint egy nem létező.

**Három dolog KÜLÖN mérve.** (1) A böngésző nemcsak ott VAN, hanem EL IS INDUL — a hiánya **PIROS**, nem
„env-kihagyás" (ez a kapu soha nem deklarál környezeti kihagyást). (2) A mérés EL INDULT: a JSON-jelentés
megvan, nem nulla helyzet futott, és nincs kihagyott helyzet. (3) MINDEN próba-fájl bekerült a mérésbe —
egy néma gyűjtés-kimaradás különben „0 bukás"-ként jelenne meg.

**Ki döntötte el.** Az `R158 — DECISION` kör (chatgpt-v3, az **operátor** felhatalmazásával) szó szerint:
„hiányzó böngésző vagy el sem indult mérés NEM PASS."

**Amit ez NEM állít.** Nem állítja, hogy a böngészős bizonyíték minden pontján HTTP- vagy
tároló-bizonyíték: a `proof:demo-walk` háttere a SZIMULÁLT bemutató-adapter, és ezt a lánc maga kimondja
(KUKA-227). A kapu azt köti meg, hogy a mérés MEGTÖRTÉNT, és minden verdikt zöld. MÉRT futásidő a mi
gépünkön: a Playwright-lánc 350 s, a bemutató-járás 439 s — a söprés 900 s-os türelmén belül.
Gépi jel: `npm run verify:browser-gate` · `npm run verify:kuka` (KUKA-333).

---

## D-VS-3143 — A BÖNGÉSZŐS PRÓBAPAD AZ ELKÜLÖNÍTETT BEMUTATÓ-KÖRNYEZET, ÉS A DEMÓ-JEL JOGOT NEM AD (R158/2)

**A döntés.** A böngészős próbapad (`tests/e2e/global-setup.mjs`) `VS_DEMO=1`-gyel indul: ez az
elkülönített bemutató-környezet, ahol a KÉT ÉLŐ MUNKAMENETET igénylő végigvezetések felkínálódnak. A jel
a kiszolgálón EGYETLEN döntést érint — a `requires_demo` végigvezetések felkínálását.

**Miért.** Két végigvezetés (`tour.inviteRevoke` · `tour.reentry`) `requires_demo`, a próbák viszont a
teljes, tizenegyes készletet várták: három helyzet körökön át ezen piroslott. A javítás iránya NEM az
elvárás leszállítása 11-ről 9-re (az a próba gyengítése volna, KUKA-045), hanem a hiányzó KÖRNYEZET
bekötése.

**És a jog nem jár vele — MÉRVE** (`verify:app-findings-r154`, U csoport: u1–u6). Ugyanazon a szerveren,
ugyanazokkal a fiókokkal, CSAK a jelet átállítva: a két végigvezetés a jellel megjelenik (11) és nélküle
nevezetten eltűnik (9); a meghívó-visszavonás belépés nélkül mindkét jelálláskor `401/login_required`, a
kívülállónak mindkét jelálláskor `404/invite_unknown` — és a meghívó ÉL, tehát az elutasítások a JOGRÓL
szólnak, nem a hiányról. A jel HATÓKÖRE a forrásból mérve: a kiszolgáló EGY helyen olvassa, és a döntés
CSAK a végigvezetés-felkínálóban áll.

**Ki döntötte el.** Az `R158 — DECISION` kör kikötése: „a demó bekapcsolása ne kerülje meg a normál
jogosultsági védelmet."

**Amit ez NEM állít.** A böngésző-oldali bemutató-adapter ettől NEM kapcsol be: azt a lap `vs-demo` meta
jele telepíti, amit a repó `index.html`-je nem hordoz. És egy ÉLES, `demo`-ra állított telepítésről ebből
nem következik állítás: ott az alkalmazás-héj a két szereplős történetet a váltás-lépésnél NEVEZETTEN
megállítja (lásd D-VS-3144).

---

## D-VS-3144 — A VÉGIGVIHETŐSÉG HATÓKÖRE KIMONDVA: TÍZ A HÉJBAN, KETTŐ A BEMUTATÓ-KÖRNYEZETBEN (R158/2)

**A döntés.** A tizenkét végigvezetésből TÍZ az alkalmazás-héjban VÉGIGVIHETŐ — ott a „befejezve" a
mérce. KETTŐ (`tour.inviteRevoke` · `tour.reentry`) DEKLARÁLTAN átível a szereplőkön (`switch_actor`), és
két élő munkamenetet kér: ezek a héjban a VALÓDI műveleteiket lefuttatják (meghívó visszavonása · tag
eltávolítása · visszahívás — mind igazi HTTP-művelet), és a szereplő-váltásnál NEVEZETTEN megállnak
(`targetMissing`). A TELJES végigjárásuk tanúja a `proof:demo-walk` a bemutató-lapon, ahol a
váltás-vezérlő létezik — és ez a lánc a kötelező kapu része (D-VS-3142).

**Miért.** A héjban nincs „váltás a másik nézetére" vezérlő — ezt a `requires_demo` kapu indoklása maga
mondja ki. A lépés-ellenőrző viszont a váltás-ágon NEM kérdezte meg, hogy a vezérlő létezik-e: a buborék
„válts át a KIEMELT gombbal"-t írt ki, miközben semmi nem volt kiemelve (KUKA-335). Ez most nevezett
megszakítás. Ugyanígy megszólal az ELVÉGZETT lépés is, ha a célja a becsukott panelben van — saját
mondattal, mert a meglévő „ez a lépés még nem érhető el" egy elvégzett lépésről hazugság (KUKA-334).

**Ki döntötte el.** Az `R158 — DECISION` kör: a három örökölt pirosat „a meglévő működési szerződés
szerint" kellett javítani, és az „örökölt" sem kifogás, sem zöld eredmény.

**Amit ez NEM állít — ÉS AMI NEVEZETTEN NYITVA MARAD.** NEM állítjuk, hogy a két szereplős történet az
alkalmazás-héjban végigvihető. Ahhoz a héjnak DEKLARÁLT váltás-vezérlő kellene: a kijelentkezés ma egy
lenyitható menüben áll, tehát a lépésnek saját `appears_after`-re volna szüksége, a váltás pedig VALÓDI
ki- és belépés a másik emberrel (a futás-átadás ezt már ma is túléli: `vs3.tour.handover`). Ez egy
KÉPESSÉG, nem hibajavítás — ezért nem ebben a körben épül meg, és a maradékot a REPORT nevezetten viszi.
A `proof:demo-walk` tanúja pedig a SZIMULÁLT adapterrel mér: HTTP- és tároló-bizonyíték nem következik
belőle. Gépi jel: `npm run verify:browser-gate` · `npm run verify:kuka` (KUKA-334 · 335 · 336).

---

## D-VS-3141 — A FÜGGŐ SZÁNDÉK 24 ÓRA ALATT LEJÁR, ÉS AZ OLVASÁS IS KAPU (R158/1b)

**A döntés.** A `pending_intent` sor türelmi ideje **24 óra**, nevezett állandóból
(`PENDING_INTENT_TTL_MS`). A lejáratot KÉT helyen érvényesítjük: az OLVASÁS (`resumeIntent`) a
határon túli sort nem adja vissza, és TÖRLI; a TAKARÍTÁS (`purgeExpiredIntents`) pedig halmazon megy,
egyetlen `DELETE … WHERE created_at < ?`-tel, megszámolva. A takarítás a kérés útján fut, de
**percenként legfeljebb egyszer** — így nem hoz vissza kérésenkénti teljes bejárást, és nem tart
nyitva időzítőt. Óra nélkül mindkét belépő NEVEZETTEN elakad.

**Miért.** Ez a D-VS-3007 kimondott, NEVEZETT függője volt (a maradék-mondat szó szerint: „a
pending_intent csak created_at-ot tárol, a resumeIntent nem ellenőriz lejáratot"). Amíg nyitva volt, egy
régen elfelejtett meghívó-kattintás a KÖVETKEZŐ belépéskor — akár évekkel később — folytatta a
szándékot, miközben a meghívó jogosultsági háttere (kibocsátói jog, tagság, tilalom) közben bármit
változhatott; a lejárt sorok pedig korlátlanul gyűltek.

**Ki döntötte el.** Az `R158 — DECISION` kör (chatgpt-v3, az **operátor** felhatalmazásával) kifejezetten
ezt kérte: „A lejárt pending_intent takarítása is kapjon meghatározott időbeli szabályt a meglévő döntés
szerint. A takarítás ne hozzon vissza kérésenkénti teljes bejárást vagy korlátlan memória-növekedést."

**Amit ez NEM állít.** A tábla ALAKJA nem változott (ma is három oszlop: `session_id`, `invite_token`,
`created_at`) — a lejárat ebből a `created_at`-ból számol, külön lejárat-oszlop nincs. A 24 óra FIX
kiszolgáló-oldali állandó: nem meghívónként állítható, és nem az eredeti meghívó saját lejáratát követi.
A takarítás AMORTIZÁLT, tehát egy lejárt sor legfeljebb egy percig még a táblában állhat — folytatni
azonban nem lehet, mert az olvasás is kapu. A mérés HELYI tárakon (`node:sqlite` és PostgreSQL 16.15)
óra-előretolással fut, nem 24 órás valós várakozással. Gépi jel: `npm run verify:v3ref`
(`P-K03-intent-expiry` + az M208/M209 mutáció) · `npm run verify:kuka` (KUKA-332) ·
`npm run verify:app-findings-r154` (T: t1–t6).

---

## D-VS-3140 — IGÉNY SZERINTI MUNKAMENET: ÁLLAPOT NÉLKÜL NINCS SOR ÉS NINCS SÜTI (R158/1)

**A döntés.** Süti nélküli kérés ÁTMENETI munkamenetet kap: nincs a tárban, nem jár sütivel. Tárolt sor
csak akkor születik, amikor a kérés TÉNYLEGESEN állapotot kötne hozzá — belépéskor (rotáció) vagy
`materialize()`-szal. Ma egyetlen ilyen út van: a meghívó-folytatás írása. A lejárt vagy kiszorított süti
TÖRLŐDIK, és a kilépés sem nyit új sort.

**Miért.** Ez volt az R154 tíz review-körének GYÖKÉR-OKA: a 43 leletből **26** ugyanebben a tárban volt, és
a körök leletei rendre az előző kör javításaiból fakadtak. A terület nem azért hibázott, mert a szabályai
rosszak voltak, hanem mert a helyzet elő sem állhatott volna. MÉRVE: 200 süti nélküli olvasás után a tár
**üres** (régen a plafonig telve, kiszorításokkal); a statikus lap és az olvasó végpont sütit sem kap.

**Ki döntötte el.** A tervet az R154 lefedettségi lapja NEVESÍTVE tette döntésre, és az **operátor** a
chatgpt-v3 `R158 — DECISION` körében engedélyezte. Nem egyoldalú javítás.

**Amit ez NEM állít.** A memória-korlát TOVÁBBRA IS kell: az állapotot KÉRŐ forgalom sort nyit (mérve: 120
hitelesítés nélküli folytatás-írás után a tár a plafonnál áll) — az igény szerinti létrehozás nem
helyettesíti a plafont, a kiszorítási sorrendet és a védettséget. Gépi jel: `npm run verify:kuka`
(KUKA-331) · `npm run verify:app-findings-r154` (S: s1–s11, köztük s11 az ÁLLAPOT-IGÉNY LELTÁRA) ·
`npm run app:selfcheck`.

---

## D-VS-3117 — A KONFIGURÁCIÓS ÉRTÉK ALAKJA IS MÉRT, ÉS AZ AZONOSÍTÓ IDÉZŐJELEZVE MEGY (R154)

**A döntés.** A `proof:pg-durability` megméri a `VS_RESTORE_TEST_DB` alakját (zárt azonosító-minta), és
az értéket idézőjelezve illeszti az utasításba. A rossz alak NEVEZETT elutasítás, ami megmondja a
helyes alakot.

**Miért.** Mérve (saját lelet): az értéket kapcsolati címmel adtam meg — kézenfekvő tévedés, hiszen a
`DATABASE_URL` is cím —, és a lánc a `3b` lépésen `ERROR: syntax error at or near ":"` üzenettel bukott
el. A „cél nem azonos a forrással" kapu ezt átengedte, mert a cím nem egyezett a forrás *nevével*. Két
hiba egy helyen: szöveg-összefűzéssel épített SQL, aminek a másik végén `DROP DATABASE` áll a gazda
adatbázison; és egy nyers SQL-üzenet olyan eszközben, aminek a FELADATA a gyakorlás.

**És amit ez a lánc ezzel IGAZOLT.** A helyes névvel a `proof:pg-durability` **végig zöld**, 7 mért
lépéssel: írás a futó alkalmazáson át · ÚJRAINDÍTÁS után a fiók megvan és ugyanazzal a jelszóval belép ·
`pg_dump` · visszatöltés ELKÜLÖNÍTETT célra · a sor-számok egyeznek (alany 19/19 · könyv 19/19) · a
séma-verzió egyezik (`001`) · a konkrét bizonyított csatorna visszajött.

**Amit ez NEM állít.** Ez **helyi** PostgreSQL **16.15**, nem a Railway 18-asa, és nem a FELHŐS
mentés-visszatöltés igazolása — azt a SPEC külön nevezi meg, és továbbra is NINCS igazolva. Amit igazol:
a mechanizmus működik, és a gyakorlás elvégezhető. Gépi jel: `npm run verify:kuka` (KUKA-307) ·
`npm run proof:pg-durability` (valódi PostgreSQL kell hozzá).

---

## D-VS-3116 — A VÉDELMI DÖNTÉS KÖLTSÉGE ÁLLANDÓ (R154, a harmadik ugyanilyen eset)

**A döntés.** A tár számlálja a névtelen sorokat, és ha csak a beszúrt sor vehető el, azonnal eldobja —
rendezés és másolás nélkül. A döntés O(1).

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: telt táron minden süti nélküli kérés lemásolta és
rendezte a teljes térképet. Mérve 20 000 belépett sor mellett: 100 beszúrás **754 ms** → a javítás után
**45 ms**.

**És amit ebből kimondok, mert ez a csomag harmadik ilyen esete.** F154-01 (a kéréskorlát sora) ·
F154-11 (a védett-lista teljes tábla-olvasása) · ez — mindhárom ugyanaz az osztály, és a D-VS-3100 meg
a D-VS-3110 gépi jelei nem kapták el, mert EGY KONKRÉT sorra illeszkednek. A tanulság nem új szabály,
hanem általánosabb jel: minden védelmi/takarító úton a döntés költsége legyen állandó vagy a DÖNTÉS
hatókörével arányos.

**Amit ez NEM állít.** A számláló helyessége FELTEVÉSEN áll (az `subject_id` a beszúrásnál áll be és
nem változik), ezért MÉRJÜK: a battéria vegyes sorozat után összeveti a számlálót a tényleges
tartalommal (i6). Gépi jel: `npm run verify:app-findings-r154` (I: i4–i6) · `npm run verify:kuka`
(KUKA-306).

---

## D-VS-3113 — HÁROM SZÖVEG-FAJTA, NEM KETTŐ: A SZABAD SZÖVEG ÖNÁLLÓ TÍPUS (R154, ISC-03)

**A döntés.** A bemeneti típusok három szöveg-fajtát ismernek: AZONOSÍTÓ/NÉV (`nonempty_string` —
vezérlő-karakter tilos) · NEM ÜRES SZABAD SZÖVEG (`nonempty_text` — sortörés jogos, nulla bájt tilos)
· OPCIONÁLIS SZABAD SZÖVEG (`string`). A segéd-chat `question` mezője a középső.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére, és ez az ISC-02 (D-VS-3109) **regressziója**: a
vezérlő-karakter-tiltást a `nonempty_string`-re tettem, a `question` mező pedig az volt — a felület
viszont `<textarea>`-t ad hozzá, ahol az ENTER sortörést tesz. Mérve: a több soros kérdés HTTP 400
`invalid_type`-ot kapott. A felületen FELAJÁNLOTT szerkesztő tett küldhetetlenné egy jogos kérdést.
A kockázatot a saját PR-kommentemben megnevezte — és mégis elkövettem.

**Amit ez NEM állít.** A szűkítés nem tűnt el: a nulla bájt a kérdésben is tilos, az üres kérdés is,
és a NÉV mezőben a sortörés is — mindhárom ellenpár mérve. A PÁROSÍTÁS mostantól GÉPI: a próba a két
fájlból olvassa össze, hogy a lap `<textarea>`-t ad ÉS a típus szabad szöveg (h3). Gépi jel:
`npm run verify:app-findings-r154` (H: h1–h6) · `npm run verify:kuka` (KUKA-303) ·
`npm run verify:v3ref` (237/237 elkapott mutáció a változás után).

---

## D-VS-3112 — A FRISS SOR VÉDELME A SAJÁT OSZTÁLYÁIG TART (R154, a D-VS-3108 szűkítése)

**A döntés.** A `keep` (a beszúrt sor sérthetetlensége) a SAJÁT OSZTÁLYÁIG tart: ha a plafon
betartásához belépett sort kellene elvenni, és a beszúrt sor NÉVTELEN, akkor a BESZÚRT sor megy.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére, ami a D-VS-3108 mellékhatása: telt táron EGY süti
nélküli kérés a hiányt a belépett körre tolta. Mérve: 4 belépett sor 4-es plafonon, egy névtelen
beszúrás → `evicted_cap_signed_in: 1`, és a friss névtelen BENT maradt. Vagyis egy hitelesítés nélküli
látogató kiléptetett egy belépett embert — a javítás új támadási utat nyitott. Két helyes szabály
(az új sor sérthetetlen · a névtelen esik előbb) ütközött, és az ütközést nem mondtam ki.

**A tudatos csere, kimondva.** Telt táron a névtelen látogató olyan sütit kaphat, ami a következő
kérésnél új munkamenetet nyit. Ez rosszabb neki, de egy névtelen látogató kényelme nem ér fel egy
belépett ember kiléptetésével.

**Amit ez NEM állít.** A D-VS-3108 garanciája nem veszett el: a BELÉPETTEN született friss sor
továbbra is sérthetetlen (ellenpár mérve). Gépi jel: `npm run verify:app-findings-r154` (G: g2, g3, g4)
· `npm run verify:kuka` (KUKA-302).

---

## D-VS-3109 — A VEZÉRLŐ-KARAKTER A HATÁRON AKAD EL, TÁROLÓTÓL FÜGGETLENÜL (R154, ISC-02)

**A döntés.** A bemeneti típusok zárják a vezérlő-karaktereket, két szinten: a NULLA BÁJT minden
szöveges mezőben tilos (`string` és `nonempty_string`), a többi C0 vezérlő és a DEL pedig a NÉV- és
AZONOSÍTÓ-fajta mezőkben (`nonempty_string`). A SZABAD SZÖVEG (`string`) a sortörést engedi. A
`secret_string` érintetlen.

**Miért.** Mérve: `POST /api/workspaces {"name":"A\u0000B"}` ÁTMENT a kapun, és onnantól a kimenet a
tárolótól függött — SQLite: **201**, a munkakörnyezet létrejött `A\0B` névvel; elkülönített helyi
PostgreSQL 16.15: **400 `provision_failed`**, írás nélkül (a PG oka közvetlenül is mérve:
`22021 invalid byte sequence for encoding "UTF8": 0x00`). Egy határ-szerződés, aminek a kimenete attól
függ, melyik tároló fut, nem szerződés — és a PG-s elutasítás FÉLREVEZETŐ okot adott: nem a bemenetet
nevezte meg, hanem a létrehozást. A javítás után mindkét tároló UGYANAZT a nevezett 400-at adja.

**Amit ez NEM állít.** Nem a teljes PostgreSQL-paritás igazolása: egyetlen mező-fajtát mértem végig két
tárolón. A használt PostgreSQL **16.15**, NEM a Railway 18-asa — a SPEC a 18-hoz igazítást kérte, ez
kimondott eltérés. A `secret_string` szűkítése szándékosan kimaradt (a jelszó `scrypt` lenyomatként
tárolódik, tehát ott nincs tároló-eltérés; egy szűkítés meglévő jelszavakat tenne érvénytelenné).
Gépi jel: `npm run verify:app-findings-r154` (F: f1–f4) · `npm run verify:kuka` (KUKA-299) ·
`npm run verify:v3ref` (a mag mutációs battériája).

---

## D-VS-3108 — A BESZÚRT SOR SÉRTHETETLEN, ÉS A BELÉPÉS MUNKAMENETE BELÉPETTEN SZÜLETIK (R154)

**A döntés.** A plafon-söprés a beszúrt sort soha nem veszi el (`keep`), a `newSession(subjectId)`
pedig a BESZÚRÁS pillanatában állítja be az alanyt. A hisztérézis osztályonként más: a névtelenekből
az alsó vízszintig söprünk, a belépettekből csak a plafonig.

**Miért.** A KÜLSŐ REVIEW (Codex) mért leletére: 37 belépett + 3 névtelen 40-es plafonon, és az ÚJ sor
beszúrása négy névtelent vitt el, köztük MAGÁT. A `newSession()` így olyan objektumot adott vissza,
ami nincs a tárban — a belépés 200-at és sütit adott, a következő kérés viszont kiléptetett: siker-
jelentés hatás nélkül (KUKA-120). A belépés ráadásul az alanyt utólag tette rá, tehát a beszúrás
pillanatában még névtelennek számított.

**Amit ez NEM állít.** Az osztályonkénti hisztérézis nem mért optimum (a 90%-os alsó vízszint
kimondott alapérték); annyit garantál, hogy egy lassú névtelen elárasztás nem léptet ki embert
pusztán a hisztérézis kedvéért. Gépi jel: `npm run verify:app-findings-r154` (E: e4, e5, e10) ·
`npm run verify:kuka` (KUKA-298).

---

## D-VS-3105 — A `q=0` KIZÁRÁS, NEM LEGHÁTSÓ PREFERENCIA (R154, RFC 7231 §5.3.1)

**A döntés.** Az `Accept-Language` súly-szűrője a `q=0`-s címkét KIZÁRJA. Ha minden címke kiesik, a
válasz az alapnyelv, `matched: false`-szal.

**Miért.** A régi alak a `q=0`-t a legkisebb előnyben részesítésnek vette. MÉRVE: `de;q=0` → `de`,
`en;q=0` → `en` — aki kifejezetten kizárta a nyelvet, pont azt kapta. A fájl fejléce közben
szabványokra hivatkozik (RFC 5646 · W3C), a súly-szemantikát viszont nem mérte senki.

**Amit ez NEM állít.** A súlyozás működése nem változott: `de;q=0, en;q=0.5` továbbra is `en`, és
`hu;q=0, en;q=0.1` is `en` — a kizárás nem söpri el a többi címkét (ezt az ellenpár méri). A
`q=abc` és a tartományon kívüli `q=5` továbbra is megengedő olvasás; ez kimondott, nem mért optimum.
Gépi jel: `npm run verify:app-findings-r154` (D: d5–d7) · `npm run verify:kuka` (KUKA-295).

---

## D-VS-3103 — A VISSZAVÉTEL-PRÓBA VERDIKTJE IS MÉRCE: AZ ELAKADÁS NEM FAIL (R154)

**A döntés.** Egy lelet-battéria minden állítása olyan tulajdonságon áll, ami a javítás NÉLKÜL is
létezik; a javítással SZÜLETETT belső felszínt csak védett olvasó nézi, és annak hiánya FAIL, nem
kivétel. A feloldó közvetlen mérése mellé kell egy olyan állítás, amit a BEKÖTÉS eltávolítása
elbuktat.

**Miért.** Az R154 battériájának első alakját a KUKA-092 szerinti visszavétel-próbán mértem: a
javítás kivételekor a feloldó-csoport (c1–c6) VÁLTOZATLANUL ZÖLD maradt — helyesen, mert a feloldó
megvolt, csak nem volt bekötve —, a határ-mérés viszont `app.sessions.stats is not a function`
kivétellel elhasalt, és a battéria KILÉPÉSI KÓD 2-t adott: „ELAKADT MÉRÉS — a rendszerről ez NEM
mond semmit". A bekötés eltávolítása tehát pont annak a jelzésnek a köntösében jelent meg, amit
instabilitásnak szokás nézni. A javított alak ugyanerre `size: 407` a 40-es plafon ellen, kilépési
kód 1.

**Amit ez NEM állít.** A visszavétel-próba MAGA nem automatizált: kézi lépés, és ezt kimondjuk. Gépi
jel: `npm run verify:kuka` (KUKA-293, a battéria fájlján).

---

## D-VS-3099 — A LEFEDÉS BIZONYÍTÉKA DEKLARÁLT KÖTÉS, A TELJESSÉG PIROS, ÉS A MODELL TÉMÁJÁBÓL MŰVELET LESZ (R144, LEF-01 · SMP-01 · AST-08 · AST-09)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs req-5/core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R144 — SPEC` (chatgpt-v3, 2026-10-02). Induló fej:
`3fb0f6ab982dbea953deafe088a90e62a181428a` (az R143 leszármazottja, a kijelölt ágon).

**A DÖNTÉS HÁROM TÉTELE — a külső ellenőrző fél három NEVEZETT leletére.**

1. **A LEFEDÉS BIZONYÍTÉKA EXPLICIT KÖTÉS, nem az első egyező horgony (F144-01 · KUKA-286).** A
   bemutató-kötés a FUNKCIÓ oldalán áll (`shared_tour: { tour, steps }`), és akkor ér, ha legalább
   egy deklarált lépés VALÓDI: `task`-ot hordoz, VAGY a funkció kimondott MUNKAFELÜLETÉRE mutat
   (`surface`) — ami nem menüpont és nem megnyitó gomb. A művelet-kötés ugyanígy deklarált
   (`ui_actions`): a kötőjeles rész-szó-egyezés KIVEZETVE. A deklaráció MINDKÉT iránya mért: nem
   létező bemutatóra, lépésre vagy műveletre hivatkozó tudás PIROS
   (`declaredActionsNotInSource` · `declaredReadsNotInSource` · `how: 'declared_invalid'`).
2. **AZ OLDALTÉRKÉP A LAP SAJÁT FELOLDÓJÁBÓL MÉRT (F144-02 · KUKA-287 · SMP-01).** A menü-szerkezet
   a TÉNYLEGES forrásból jön (`v3app/public/texts.mjs`), az oldaltérkép népességét a súgó SAJÁT
   feloldója adja (`sitemapPages`) — a képernyő és a mérés ugyanazt futtatja (KUKA-018). Az
   elérhetőség HÁROM külön mért tény (menü · oldaltérkép · belépő), a hiány csak mindhárom
   egyidejű hiányánál áll be, és a NEM MÉRT (`null`) nem azonos a HIÁNYZÓVAL (`false`).
3. **A MODELL TÉMÁJÁBÓL MŰVELET LESZ (F144-03 · KUKA-288 · AST-08).** A felajánlás-képzés EGY
   nevezett feloldó (`offersFor`), és KÉT hívója van: a helyi találat ÉS a modell IGAZOLT
   forrás-listája. A HATÁR változatlan: a műveletet a FUNKCIÓ deklarálja, a modell csak a
   funkciót VÁLASZTJA a neki ÁTADOTT, igazolt halmazból (AST-05), és minden felajánlás az
   `acceptAction`-on megy át a MAI kontextussal, a bemutató pedig az `allowedToursFor`-on. A
   modell így sem írhat route-ot, azonosítót vagy űrlapmezőt a kliensnek, és a felajánlás
   ELŐKÉSZÍT, nem ment.

**A TELJESSÉG ÉS A REGRESSZIÓ KÉT KÜLÖN MÉRÉS — az önmagát növelő plafon kivezetve.** A SPEC
kikötése: *„A teljesség legyen piros, amíg alkalmazható, tényleges hiány marad."* Ezért az
`OPEN_GAPS` / `OPEN_GAPS_CEILING` pár megszűnt (abban az alakban egy ÚJ kivétel MAGA emelte a
plafont, tehát az őr a saját tanúja volt — KUKA-033 · KUKA-122). Helyette:

- **TELJESSÉG (LT):** minden alkalmazható, tényleges hiány PIROS. Ma **20 hiány** (10 oldal ·
  10 bemutató) — tehát a `verify:lefedes` SZÁNDÉKOSAN PIROS, és ez nem „ismert kivétel", hanem a
  hátralévő tartalmi munka kimondása. A végső cél nulla ilyen hiány.
- **REGRESSZIÓ (LR1 · LR2):** a `GAP_BASELINE` VÁLTOZATLAN, verziózott pillanatkép
  (`R144-indulo`, 2026-10-02, 20 kulcs) — nem plafon és nem engedély. ÚJ hiány (`unexpected`)
  piros; a megszűnt hiány (`dead`) is piros, hogy a javítás a pillanatképből KIKERÜLJÖN.
- A technikai műveletek listája **34 néma sorról 2 indokolt sorra** szűkült: minden felhasználói
  művelet (keresés, sor-megnyitás, új chat) a SZÜLŐ funkció sorában kap lefedést, de nem tűnik el
  a vizsgálatból.

**SAJÁT LELET UGYANEBBEN A KÖRBEN (AST-09 · KUKA-289).** A joghiány-eset próbáját írva mértem,
hogy a cégbe meghívott, NEM admin tag a meghívási kérdésre SEMMIT nem kapott (`ok: false`, nulla
hosszú válasz). A kiválasztó mostantól a KIZÁRT, de illeszkedő funkciókat is megnevezi a kizárás
OKÁVAL (`blocked`), és ha nincs kiadható tudás-válasz, a szerver AZ OKOT adja vissza SAJÁT
válasz-fajtával (`answer_kind: 'access'`), a nyelvcsomag `REASON` csoportjából. A kimondható okok
listája ZÁRT (`BLOCK_REASONS_TOLD`): csak olyan ok kerül bele, amit a tudás-index végpontja
ugyanennek a kérőnek amúgy is megmond — a chat nem fed fel újat.

**AMI MEGÉPÜLT, MÉRVE.** Route-hiány 5 → **0**, művelet-hiány 7 → **0**, űrlap-hiány 1 → **0**
(deklarált `reads` · `ui_actions` kötésekkel, nem dokumentálással). `verify:app-findings-r144`:
**30/30** — benne a SPEC által kért negatív kontrollok (a tagság-megszüntetés kötésének
eltávolítása PIROS akkor is, ha a meghívó- és hatáskör-visszavonás létezik; a csak
`help-open`/`nav-members` egyezés NEM bizonyít más feladatot; a szótáras menü-bemenet 0-vs-16
lelete reprodukálva). `verify:lefedes`: 12 zöld · 1 piros (a teljesség, 20 hiánnyal).

**AMI NEM ÉPÜLT MEG, NEVESÍTVE — ez a kör NEM teljesíti az R142-t.** A SPEC hat hátralévő tétele
közül ebben a csomagban az 1. RÉSZBEN (a mérés javítása és a route/művelet/űrlap-hiányok pótlása
igen, a 20 tartalmi hiány NEM), a 2. · 4. · 5. · 6. pedig **NEM** épült meg: a korlátos modell →
engedélyezett olvasó eszköz → kontextusos előnézet menet, a diós kontextusos példák és
ellenpárjaik, a valódi többfordulós chat, és a fiókváltás/jogvesztés/késői válasz
adat-keveredésének mérése. **Az ok KIMONDVA, nem indok:** a MÉRT kontextus-sáv a csomag közben
átlépte a 400 ezres határt (fő-szál medián 725 999), és a `CLAUDE.md` szabálya szerint a futó
munkablokk célzott ellenőrzéssel lezárható, a KÖVETKEZŐ önálló nagy blokk pedig friss
beszélgetésben indul — a lezárás címén pedig nincs új feltárás vagy új funkció.

**ÉS EGY KIKÖTÉS, AMI NEM TELJESÜLT — kimondva.** A SPEC azt kérte, hogy FRISS Claude-v3
beszélgetésben folytassam, és *„az induló mérés igazolja az új munkamenetet"*. A mérő a futó
folyamat saját azonosítóját látja (`CLAUDE_CODE_SESSION_ID`), és az AZONOS az R143-ban mérttel
(`33dbd005…`) — tehát ez a csomag a MÉRÉS SZERINT nem új munkamenetben készült, és ezt nem
állítom másnak. Ami ebből következik: a fenti négy tételt a következő, bizonyíthatóan friss
beszélgetés viszi.

**ELŐZMÉNY ÉS HATÁS.** A D-VS-3096/3097/3098 érvényben; ez a döntés a lefedés-mérés
BIZONYÍTÉK-fogalmát és a felajánlás-képzés bemenetét pontosítja. Gépi jelek: `npm run verify:kuka`
· `npm run verify:lefedes` · `npm run verify:app-findings-r144` · `npm run verify:app-findings-r142`.

---

## D-VS-3098 — A HELYI TALÁLAT NEM A MODELL KAPUJA, ÉS A HASONLÓSÁG NEM DÖNT TÉMÁT (R142, AST-06 · AST-07 · TOK-01 · TOK-02)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs req-5/core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R142 — SPEC` (chatgpt-v3, 2026-10-02). Induló fej:
`011803b4c00e180cc22dd7bee92e1f881cc8f9f1`.

**A DÖNTÉS.** A külső ellenőrző fél kikötése szó szerint: *„A helyi lexical találat nem előfeltétele
az engedélyezett provider elérésének."* Ezt négy darabban vezettük át:

1. **A KAPU MEGSZŰNT (AST-06).** A modell-hívást NEVEZETT feloldó dönti el (`modelNeed`), nem a
   találat-szám. Hét nevezett ok közül hat HÍV (`local_hits` · `weak_only` · `no_match` ·
   `non_latin_question` · `no_tokens` · `history_followup`), és egy NEM: `nothing_to_interpret` —
   egyetlen betű sincs és előzmény sincs. A döntés a VÁLASZBAN is megjelenik (`model_need`).
2. **KORLÁTOS CAPABILITY-INDEX.** Nulla vagy gyenge helyi találatnál a modell az ELÉRHETŐ
   képességek FEJLÉCÉT kapja (azonosító · cím · állapot · verzió, TÖRZS nélkül, legfeljebb 40) —
   nem a teljes kézikönyvet. A megjelenő mondatot továbbra is a SZERVER állítja össze a saját
   nyelvcsomagjából (AST-05 változatlan).
3. **AZ ÍRÁS NEM KAPU (TOK-01).** A szó-darabolás írás-független (`\p{L}` · `\p{N}`), a hossz-padló
   írás-érzékeny: a szóközt nem használó írásokban egy jel is szó, a latin oldalon MARAD a három
   karakter. A nulla találat OKA nevezett. **Amit ez NEM:** nem nyelvértés és nem tövező — a
   fordítás a modellé, és a VS-be SZÁNDÉKOSAN nem épül nyelvenként bővülő mondatértelmező.
4. **A HASONLÓSÁG NEM TÉMA-DÖNTŐ (TOK-02).** A találat FAJTÁJA mért tény (`exact` · `stem` ·
   `prefix`); a csak hasonlóságon álló találat `weak`, és a rendezés a pontos találatot előre
   veszi. A `weak_only` ok önmagában modell-hívást indít.

**AMI MEGÉPÜLT, DE ALAPBÓL KI VAN KAPCSOLVA — KIMONDVA (AST-07).** A megjelölt modell-próza
szerződése kész és mérve van (`groundedAnswer`: ellenőrzött forrás-rész + KÜLÖN megjelölt
következtetés; forrás-rész nélkül a próza nem jelenik meg). BEKAPCSOLVA viszont az R93-as battéria
(b) állítása AZONNAL pirosra váltott: a külső fél ellenpéldája — a helyes jelölőkkel ellátott, de
tartalmilag HAMIS mondat — visszakerült a képernyőre, csak felirattal. A jelölés tehát nem teszi
ártalmatlanná a téves TÉNY-állítást (KUKA-235). Ezért a `VS_AI_GROUNDED_PROSE` kapcsoló ALAPBÓL KI,
a régi őr ÉRVÉNYBEN marad, és MINDKÉT állás mérve van — az R142 §6 utolsó pontja szerint („ne
pusztán töröld a piros őrt"). A bekapcsolás feltétele: élő szolgáltató + a §6 szerinti KÜLÖN
kérdéskészlet a próza tartalmi minőségére.

**AMI NEM ÉPÜLT MEG, NEVESÍTVE.** A modell OLVASÓ ESZKÖZÖKKEL végzett, több-lépéses célzott
kontextus-kérése (R142 §6 harmadik és negyedik pontja) ebben a körben NEM épült meg. A kapu
megnyitása és a korlátos index igen. **És ami ebben a környezetben nem is mérhető:** nincs
engedélyezett szolgáltató (`VS_AI_PROVIDER` hiányzik — `npm run kapcsolat:ai`), tehát élő
nyelvértésre vonatkozó állítás egyetlen itteni mérésből sem következik (KUKA-089 · KUKA-127).

**Gépi jel:** `npm run verify:app-findings-r142` (23 állítás, ellenpárokkal) · `npm run verify:kuka`
(KUKA-284 · KUKA-285, a kivezetett kapu-feltétel TILTOTT mintájával).

---

## D-VS-3097 — A LEFEDÉSI NÉPESSÉG A TÉNYLEGES ALKALMAZÁSBÓL JÖN (R142, LEF-01)

> **Hatály:** V3 (`valach-system`). Ugyanazok a tilalmak, mint fent.

**A DÖNTÉS.** A lefedést mostantól NEM a tudásjegyzék önellenőrzése jelenti. Az alapsokaság a
FORRÁS: a szerver route-táblája, a nyelvcsomag oldal-listája (amiből a menü ÉS a fülek épülnek), a
felületi `data-action` műveletek, az űrlapok és a belépés előtti nézetek. A regiszter EHHEZ van
mérve, nem önmagához — a régi alak zöld maradhatott akkor is, ha egy VALÓDI oldal soha be sem került
a regiszterbe (KUKA-051).

**MÉRT KIINDULÓ ÁLLAPOT (2026-10-02):** 32 végpont · 17 oldal · 42 felületi művelet · 6 űrlap ·
3 belépési nézet = 100 darab, szemben a 31 regiszter-bejegyzéssel. Nevezett hiány: **5 végpont ·
10 oldal · 7 művelet · 1 űrlap**, és a bemutató-lefedésben **6 funkció** áll csak indok-szöveggel
(az R142 óta ez nem teljesítés). A SPEC kiinduló deklarációja hat kötés nélküli oldalt nevezett meg;
a független mérés ennél többet talált.

**A PADLÓ.** Minden népességnek MÉRT padlója van: ha egy kivonatoló minta elromlik, a népesség
némán összezsugorodna, és a lefedés „javulni" látszana attól, hogy kevesebbet mértünk (KUKA-012).

**A BIZONYÍTÉK NÉGY SZINTJE, SOHA NEM ÖSSZEMOSVA** (az R142 §4 kikötése): `deklarált` ·
`forrásból ellenőrzött` · `futtatott` · `hiányzó`. Ez a modul a két középsőt adja; a `futtatott`
szintet a böngészős tanúk (`proof:demo-walk` · `test:e2e`).

**Gépi jel:** `npm run verify:lefedes` (L1–L9, ellenpárokkal) · riport: `npm run meres:lefedes`.
**A NYITOTT HIÁNYOK DEKLARÁLT HALMAZA (`OPEN_GAPS`, 21 tétel) a gépi NYOM arról, mi maradt.** Az őr
MINDKÉT IRÁNYBAN mér: nem deklarált hiány PIROS (visszacsúszás vagy új, lefedetlen képesség),
HALOTT rögzítés is PIROS (a lista nem követte a javítást), és a lista mérete PLAFON — nőni nem
szabad. Ez nem felmentés: egy tétel CSAK a hiány megszüntetésével kerülhet ki. Így a hiány nem néma
(R142 §8), a söprés viszont nem válik krónikusan pirossá — amitől a jelzés elvesztené az értékét
(KUKA-092 fordítva).

---

## D-VS-3096 — A BEMUTATÓ-ÁTADÁS SZABÁLY, NEM HÍVÓ-LISTA (R142, NAV-01 · F142-01/05)

> **Hatály:** V3 (`valach-system`). Ugyanazok a tilalmak, mint fent.

**A DÖNTÉS.** Az R140 kimondta, hogy az átadás és a visszaállás egy pár (KUKA-279) — a javítása
viszont KÉT, kézzel felsorolt hívóhelyen élt, és a HARMADIK útról (fejléc-fiókváltás) kimaradt.
Mostantól:

1. **A VISSZAÁLLÁS AZ ALAPÁLLÁS** ott, ahol a nézet LEÜL (`refreshMe`), és a késleltetést az a két
   út MONDJA KI, amelyiknek kell (`deferTourResume`) — mindkettő mért okkal (KUKA-121).
2. **AZ ÁTADÁS A NÉZET MINDKÉT FELÉT TÁROLJA** (alany ÉS könyv): a fél alakú átadás a MEGTÖRTÉNT
   fiókváltást mérhetetlenné tette, és a bemutató vég nélkül újra váltást kért (KUKA-208 · 231).
3. **A MOBIL MENÜ ÁLLAPOTA EGY FELOLDÓN MEGY** (`setNavOpen`), és az újraértékelés ennek a RÉSZE,
   sorrendfüggetlenül — a várakozás VÉGE is esemény (KUKA-228 másik fele). Ugyanitt javult az
   `aria-expanded`, ami két záró úton `true` maradt egy csukott menün (KUKA-050 az ARIA-n).

**MÉRT EREDMÉNY.** A két 18 lépéses történet mindkét méreten (1280 · 390) végigvihető, reset után
UGYANABBAN a lapban újra: `proof:demo-walk` **66 állítás, 0 piros**. A RONTÁS-ELLENPÁR mind a három
javításra PIROS, az eredeti tünetekkel (9/18 · s9-pörgés · 390 px-es ☰-ragadás).

**Gépi jel:** `npm run proof:demo-walk` (h1–h4 a javítások közvetlen mérése, ellenpárokkal) ·
`npm run verify:kuka` (KUKA-281 · 282 · 283).

---

## D-VS-3095 — A VEZETETT TÖRTÉNET ÁTÍVEL A SZEREPLŐKÖN ÉS A FIÓKOKON (R140, ACT-01)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs req-5/core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R140 — SPEC` (chatgpt-v3, 2026-10-02). Induló fej:
`0d9e75d50aff485bdaba4b4fdd1e0df1dc0e68f3`.

**A DÖNTÉS.** Egy végigvezetés mostantól ÁTÍVELHET a szereplőkön és a fiókokon. Három új fogalom,
mind a meglévő motorban (párhuzamos bemutató-motor nem épült):

1. **A SZEREP A LÉPÉSÉ, NEM A BEMUTATÓÉ.** A lépés kimondhatja, ki végzi (`role`); a tour szintű
   `requires_role` az INDÍTÁS feltétele marad. Visszaesés NINCS: a meghívott ember a saját
   lépéseinél MÉG NEM TAG, tehát semmilyen cégbeli szerepe nincs.
2. **A VÁLTÁS SAJÁT LÉPÉS-FAJTA** (`switch_actor`), és FELADATHOZ KÖTÖTT (`actor.switched`): a
   „Tovább" nem vált nézetet a felhasználó helyett, a lépés csak TÉNYLEGES váltás után zárul. Az
   alany-váltás őre MINDEN MÁS lépésen változatlan — ez az ág csak ott nyílik ki, ahol a lépés
   maga deklarálja a határt.
3. **A NÉZET A KETTŐ EGYÜTT: ALANY ÉS FIÓK.** Mérve: a meghívás elfogadása után a belépő a SAJÁT
   személyes körében marad; a cég képernyőihez külön át kell váltania. Ha a váltás fogalma csak
   az alanyra állna, ez a lépés sosem teljesülne (KUKA-208).

**AZ ÁTADÁS.** A kereszt-szereplős futás túléli az oldal elhagyását (`pagehide`) és a nézet-váltást.
Átvisszük: a bemutató azonosítóját, a lépések állapotát, hol tartunk, kitől váltunk. NEM visszük át:
üzleti adatot, listát, panelt, szerkesztő-állapotot, beszélgetést — azokat a `resetViewCaches`
változatlanul üríti, tehát a következő ember SEM lát semmit az előzőéből (KUKA-218 sértetlen).

**A KÉT TÖRTÉNET A TERMÉK REGISZTERÉBŐL JÖN** (`v3app/knowledge/features.mjs`): A = 18 lépés,
B = 18 lépés. Mindkettő `requires_demo`: két élő munkamenetet kíván, ezért éles üzemben NEM
kínáljuk fel — amit nem lehet végigvinni, azt nem szabad felkínálni (KUKA-041 · F91-01). A
`demo-assistant.json` mostantól SZÁRMAZTATOTT: `npm run demo:knowledge` a VALÓDI szerverből írja.

**AZ ŐRÖK TANULTAK, NEM LAZULTAK.** A `verify:tutor` hossz-korlátja két műfajra vált (2–7, illetve
a szereplőkön átívelő, próbafelülethez kötött történetre 2–20, NEVEZETT indokkal); a szemantikus
horgony (`data-tour-anchor`) érvényes célalak, de CSAK ha a lap tényleg kimondja; a próbafelület
lapja is forrás.

**LÁTHATÓ ELRENDEZÉS, a KÖZÖS felületen** (R140 §Látható hibák): a `.badge` `overflow-wrap:anywhere`
miatt az „Árak" oszlop jelvénye 1280 px-en KARAKTERENKÉNT tördelt — a jelvény nem törik, a táblázat
a saját tárolójában gördül; ugyanaz a mondat kétszer jelent meg (lapon + lebegő nyugta), és 390
px-en a lebegő ráült az eredményre — a nyugta nem ismétli a lapon MÁR LÁTHATÓ mondatot; és az
útmutató kártyája SOHA nem fog el kattintást (mérve: a tag-lista gombját a buborék lépés-listája
nyelte el).

**HÁROM ÚJ TANULSÁG:** KUKA-278 (a kivételt másodszor is csak az egyik döntési pontra tettem be) ·
KUKA-279 (az átadás és a visszaállás EGY pár) · KUKA-280 (a némán elakadó tanú).

**ÉS EGY MÉRT ESET, AMIÉRT A REGISZTER VAN:** a tanú átírásakor ELVESZTEK az R138-as mérések (a
`navIntentFulfilled` nyolc ellenpárja és a megerősítő mondat két horgonyzott állítása). A
`verify:kuka` pirosra váltott, mert a KUKA-276/277 pozitív mintái eltűntek — mindkét mérés
visszakerült. Egy regiszter-bejegyzés nem dokumentáció: ez fogta meg, hogy egy saját átírás
csendben levetkőzze a korábbi védelmet.

**Gépi jel:** `verify:kuka` 574/574 · `verify:tutor` 88/88 · `verify:i18n` 49/49 ·
`verify:app-findings` 73/73 · r77 34/34 · r79 49/49 · `app:selfcheck` 57/57.
**ÉLŐ tanú:** `npm run proof:demo-walk` — a részletes állás és a NEVESÍTETT hiány a kör
jelentésében. **KIMONDVA:** a tanú böngészőt igényel, ezért NEM része a `verify:sweep`-nek; és a
próbafelület háttere a jelölt `demo-adapter.mjs` csonk — ebből HTTP- vagy adatbázis-bizonyíték
NEM következik.

---

## D-VS-3094 — A BEMUTATÓ HARMADIK ÁLLAPOTA, ÉS A HORGONYZOTT SZÖVEG-MÉRÉS (R138 §1–§3)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R138 — SPEC` (chatgpt-v3, 2026-10-02), §1–§3: a bemutató a
VALÓDI felületen vezessen végig, és a SZÁLLÍTOTT előnézet legyen végigjárható asztali gépen ÉS
~390 px-en, mindkét történet kétszer újraindítva.

**A LELET (SAJÁT, a végigjárásból — KUKA-276).** 390 px-en MINDKÉT történet AZONNAL megszakadt egy
teljesen ép képernyőn: „az útmutatóban megnevezett elem nem látható ezen a képernyőn". A csukott
mobil menü miatt a `nav-members` rejtett (`targetOf` → `null`, helyesen), ugyanakkor a bemutató
ezen az oldalon INDUL, tehát nincs mit feltárni (`revealerOf` → `null`, szintén helyesen). A
`checkRun` viszont KÉT szót ismert, és a maradékot a legsúlyosabb névvel minősítette.

**A DÖNTÉS.** A harmadik állapot NEVET kap: `navIntentFulfilled` (`v3app/public/tour.mjs`) — a
REJTETT, bal menüben álló, `aria-current="page"` célú NAVIGÁCIÓS lépés TELJESÜLT. A kapu szűk: a
feladathoz kötött lépést SOHA nem igazolja (azt kizárólag a szerver válasza zárja), deklarált
feltáró mellett nem lép közbe, nem létező célt nem nevez teljesültnek, látható célnál a rendes út
érvényes. A „látszik" szava EGY feloldóba került (`isShown`) a korábbi NÉGY másolat helyett.

**MÉRT KÖVETKEZMÉNY, AMIT KI KELL MONDANI.** A `revealerOf` menü-feltáró ága MA egyetlen szállított
bemutatóval sem érhető el: mindegyik bemutató nav-célja a SAJÁT oldalára mutat (mérve a
`v3app/knowledge/features.mjs`-ből), tehát a cél mindig `aria-current="page"`. Ezért ez az ág
NEVEZETTEN előre szól, és a viselkedését a tanú KÖZVETLENÜL hívja meg (g6–g8, KUKA-207). Ugyanezen
mérés miatt **két korábbi `app.js`-módosításom VISSZAVONVA**: a nav-nyitáshoz kötött újrarajzolás és
a kész elrendezésen ismételt kitérés-mérés egyike sem volt load-bearing (a próba nélkülük is
87/87), és az indoklásuk egy olyan diagnózisra hivatkozott, ami tévesnek bizonyult — a buborék nem
„elavult elrendezés" miatt nem tért ki, hanem mert a bemutató MEGSZAKADT, így nem volt kiemelt cél.

**A MÁSODIK LELET (SAJÁT, a rontás-próbából — KUKA-277).** A saját elfogadási tanúm azt állította,
hogy „a megerősítés kimondja: a korábbi hozzáférések nem állnak vissza" — a TELJES panel szövegében
keresett töredékkel. A rontás-próbán a mondatot kicseréltem a nyelvcsomagban (a panelen már
`RONTAS_JELZO` állt), és az állítás MÉGIS zöld maradt: a töredék a szomszéd mondatra illeszkedett.
Ugyanebben a körben a rontás ELSŐ alakja észrevétlenül NO-OP volt. A mondat-állítás ezért KÉT
horgonyzott állításra vált — TARTALOM (a szállított csomag `TPL.reinviteConfirmLead` mondata) és
SZÁLLÍTÁS (pontosan ez a mondat a panel fejlécében) —, és a rontás-próba mostantól igazolja, hogy a
rontás beíródott.

**A BEMUTATÓ KEZDŐÁLLAPOTA IS MÉRÉS.** A visszatérés-történetben Béla tagsága a kezdőállapotban
MEGSZŰNT (`effective: false`), mert a bemutató harmadik lépése az „Újbóli belépés" szakasz gombjára
mutat, és az CSAK megszűnt tagságnál létezik. A régi adatkörjog SZÁNDÉKOSAN ott marad a régi
időszakon: ez teszi mérhetővé a megerősítés mondatát.

**Gépi jel:** `npm run verify:kuka` (567/567) · **ÉLŐ tanú:** `npm run proof:demo-walk` — a két
történet MINDEN lépése 1280 px-en ÉS 390 px-en, kétszeri újraindítással, nyolc kapu-ellenpárral:
**87 zöld, 0 piros**. Rontás-próbával mérve: a kapu kivezetése 9 pirosat ad, a feladat-kapu
kivétele a (g2)-t, a csomag mondatának megrontása az (a10a)-t, a panel-fejléc elhagyása az
(a10b)-t váltja pirosra. **KIMONDVA:** a `proof:demo-walk` böngészőt igényel, ezért NEM része a
`verify:sweep`-nek; és a bemutató háttere a jelölt `demo-adapter.mjs` csonk — **ebből HTTP- vagy
adatbázis-bizonyíték NEM következik**.

---

## D-VS-3093 — A HATÁSKÖR ÉLETCIKLUSÁNAK TÖRTÉNETI FORRÁSA: A GENERÁCIÓ ZÁRÁSA (R138, AHI-02)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs core/CMD/PR-zárás. A req-5 **NEM** lép életbe.

**A parancs:** `CMD-VS-300-002-002 R138 — SPEC` (chatgpt-v3, 2026-10-02). Induló fej:
`75e6112d892e6f8b343675e806417bcb4cef2d67` (a `df79358a` leszármazottja).

**A LELET (F138-01, megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL).** Az R136-os alak a KÉSŐBBI jog megvonását
mérte a korábbi megadáshoz képest; a KORÁBBI jog SAJÁT megvonásának megőrzését nem. Mérve,
változatlan termékkódon, UGYANARRA az időpontra: `false/authority_revoked` → `true/stamped`. A
megadó út `DO UPDATE SET revoked_at = NULL` ága a tényt TÖRÖLTE, a napló pedig nem hordozta.

**A DÖNTÉS: A GENERÁCIÓT ZÁRJUK, NEM ELDOBJUK.** Egy új megadás a vetület felülírása ELŐTT a
naplóba menti a lezáruló generáció végállapotát: a SAJÁT megvonását (`revoked_at`) és a zárás
tényét (`superseded_at`). A csak-vetületi (R134 előtti) sor ilyenkor KAP naplót — enélkül a
`projection_only_no_log` kompatibilitási ág pontosan az első új megadásnál szakadna el. A három
írás EGY atomi egységben áll.

**ÉS AHOL A ZÁRÁS TÉNYE NINCS MEG, OTT NINCS NÉMA IGEN:** a felülírt, de `superseded_at` nélküli
napló-sor NEVEZETTEN elakad (`authority_generation_close_unknown`), nem engedély és nem tiltás.

**KIMONDOTT KORLÁT:** a MEGVONÁSNAK nincs tudás-ideje a sémában (a megadásnak van: `recorded_at`).
A megvonást ezért MINDIG ismertnek vesszük — ez a fail-closed irány, a hiányzó tudás-időből nem lesz
engedély. Oszlop most nem épült rá, mert a hatáskör-megvonásra ma NINCS termék-író (csak nyers
`UPDATE`), tehát a mező soha nem lenne kitöltve — az a KUKA-270-es néma kulcs alakja volna. **Ez
NEVEZETT maradék:** a megvonás tudás-tengelye a termék-úttal EGYÜTT születik meg.

**Bizonyíték:** `findings_r134` **G szakasz (g1)–(g13)** — a teljes életciklus a kötelező tanú
sorrendjében, a napló nélküli sor ÁTMENETÉVEL, két ciklussal, a két időtengellyel és NEGATÍV
kontrollal (a megőrzés kiesése mérhetően visszahozza a hibát). Gépi jel: `verify:app-findings-r134`
+ a mutációs battéria új rontásai. **KUKA-275.**

---

## D-VS-3092 — A TÖRTÉNETI HATÁSKÖR ÉS AZ ALAP EREDET-KÖTÉSE (R136, AHI-01 · AOR-01)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs core/CMD/PR-zárás. A req-5 **NEM** lép életbe.

**UTÓLAG RÖGZÍTVE (R138).** Ezt a számot az R136-os csomag KUKA-bejegyzései (271–274) már
hivatkozták, a naplóba viszont nem került be — a `verify:decision-numbers` ezt az R138-ban mérte ki
(„a legmagasabb kiadott: D-VS-3091"). A hiány pótolva; a szám nem változik, mert a kódban már
hivatkozott (KUKA-130: a sorszám a FORRÁSHOZ tapad, nem a beérkezéshez).

**A parancs:** `CMD-VS-300-002-002 R136 — ANALYSIS` (chatgpt-v3, 2026-10-01). Induló fej:
`df79358a729583e089e99ee29a3b67ebafca7098`.

**AHI-01 (F136-01) — a múlt forrása a NAPLÓ, nem a mai vetület.** Az `authorityRowAt` a vetületből
indult, amit egy szabályos új megadás felülír; ezzel a RÉGI időszakra adott válasz is megváltozott
(`ok:true · stamped · 15` → `ok:false · authority_not_yet_effective`). A történeti feloldás
mostantól a hatásköradás append-only naplójából választ, KÉT tengelyen (hatály ÉS tudás); a
vetület gyorsítótár maradt. A hatókör generációnként KIMONDOTT (`projection_live_generation` ·
`grant_log_superseded_generation` · `projection_only_no_log`).

**AOR-01 (F136-02) — az alap EREDET-kötése.** A `delegationBasisId` alany × könyv azonosságú volt,
így egy megszűnt és újra megszerzett tagság ugyanazt az azonosítót képezte újra, és a RÉGI időszak
ajánlata feléledt. Az `authority_basis` generáció mostantól hordozza, melyik tagsági időszakból
származik; a kapu a PECSÉTELT verzió eredetét a MA hatályos generáció eredetéhez méri, MINDKÉT úton
(beváltás és bírálat). Verzió-egyenlőséget szándékosan NEM követelünk: az R64 (H06/H07) szerint az
a jogos bővítést zárta volna.

**Saját leletek:** KUKA-271 (a megépített napló, amit senki nem olvasott) · KUKA-272 (az időszak
nélküli alap-azonosság) · KUKA-273 (a javításom megvakított egy működő őrt) · KUKA-274 (a falióra-
szeletelés mérve rosszabb lett, kivezetve).

---

## D-VS-3091 — A VÉGLEGESÍTÉSI KAPUK, AZ IDŐSZAKHOZ KÖTÖTT HATÁSKÖR ÉS AZ EGYSZERI AJÁNLAT (R134)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs core/CMD/PR-zárás. A req-5 **NEM** lép életbe.

**A parancs:** `CMD-VS-300-002-002 R134 — ANALYSIS` (chatgpt-v3, 2026-10-01). Ez **javító-befejező**
kör: a külső ellenőrző fél az R132-es csomagot NEM fogadta el, és három MÉRT ellenpéldát adott
VALÓDI HTTP + tároló úton, plusz egy szállítási hiányt. Induló fej:
`b8c80b68e2d1dac02ff82ca318c43bf0522826cc` (az elfogadott `8124107` leszármazottja).

**A három lelet a MI kódunkon újramérve, javítás ELŐTT (reprodukálható piros):** a kiadás utáni
felfüggesztés mellett a beváltás `ok:true, outcome:regranted` — `membership_grant 4→5`,
`grant_basis 1→2`, a token elfogyott · a régi `alter_right` hatáskör az új tagsági időszakban
változatlan `granted_at`-tal végrehajtható · két azonos újrahívási kérés KÉT önálló ajánlat.

**1. A VÁLTOZHATÓ KIZÁRÁSOK EGY FELOLDÓBAN, KÉT KAPUN (RNV-02 · F134-01).** A felfüggesztés, a
tiltás, a nyitott felülvizsgálati kör és a visszamenőleges érvénytelenség kérdése új, semleges
modulba került (`v3ref/reentryGate.mjs` → `reentryExclusionsAt`), és ezt hívja a KIADÁS
(`reinviteMember`) **és** a VÉGLEGESÍTÉS (`reentryAdmission`) is — utóbbi a beváltás tranzakcióján
BELÜL is. A nemleges válasz neve a két helyen AZONOS, és a MEGLÉVŐ eljárásra mutató folytatást visz
(`lift_suspension` · `lift_ban` · `close_review_circle`). A token érintetlen marad, és a tárolóban
egyetlen sor sem keletkezik. **Ehhez tartozik egy SAJÁT lelet:** az R132-es kiadási kapu
felülvizsgálati-kör ága SOHA nem tüzelt (nem létező mezőre illesztett feltétel) — a kör megtalálása
mostantól ESEMÉNY-AZONOSÍTÓN megy (`reviewCircleOfRevocation`), lásd KUKA-267.

**2. A BÍRÁLATI HATÁSKÖR A TAGSÁGI IDŐSZAKHOZ KÖTÖTT (APR-01 · F134-02).** Az
`adjudication_authority` sor időszak-bélyeget kapott (`period_grant_event_id`), amit a MEGADÁS
mér (nem a hívó adja meg), és amit a KÖZÖS értékelő (`authorityRowAt`) a MAI időszakhoz hasonlít. A
válasz KIMONDJA, melyik szabályt vette: `stamped` · `first_period_rule` (régi, bélyeg nélküli sor) ·
`projected_row_unbound` (napló nélküli tagsági sor — KIMONDOTTAN nem köt) · `not_membership_bound`
(nem-tag elbíráló). A régi megadás TÖRTÉNETILEG érvényes marad: új, append-only napló
(`adjudication_authority_grant`) őrzi, a vetület pedig a MAI állapotot hordozza — így az ÚJ
időszakhoz tartozó, kifejezett megadás lehetséges (korábban nyers `UNIQUE constraint failed`-be
futott, azaz a kötés önmagában FALLÁ tette volna a helyreállítást). A **MOZGATÁS KIMONDVA**: a tiszta
időszak-olvasók semleges otthonba kerültek (`v3ref/membershipPeriod.mjs`, MPR-01), mert a
`bitemporal.mjs` az `authority.mjs`-t importálja — a közvetlen behúzás kört csinálna. A
`bitemporal.mjs` ugyanezeket a neveket TOVÁBB-EXPORTÁLJA, tehát egyetlen hívó behúzása sem változott;
a mutációs horgonyok át vannak horgonyozva (M100 · M102 · M108–M111).

**3. AZ AJÁNLAT KIADÁSA EGYSZERI HATÁSÚ (OON-01 · F134-03).** A megismételt SZÁNDÉK azonosságát a
hívó adja (`operation_id`, a felületen panel-megnyitásonként egy), a HATÓKÖRÉT és a tartalom
kanonikus lenyomatát a szerver képezi — az azonosság FELOLDÓI a parancs-útról jönnek
(`commandIdentity` · `commandScope` · `canonicalize`), második azonosság-protokoll nem született
(KUKA-003). A tárolás viszont külön könyv (`operation_once`), mert a `command` tábla a TAGSÁGI jogon
működő parancs-út otthona, és egy hatásköri műveletet oda írni a kapu FAJTÁJÁT csúsztatná el.
Ugyanaz az azonosság EGY ajánlatot ad (`replayed: true`, ugyanaz a jelölő, levél nélkül), az ELTÉRŐ
tartalom NEVEZETT ütközés nulla hatással, a HIÁNYZÓ azonosság nevezett elutasítás. A két valódi
kapcsolat versenyében a vesztes a GYŐZTES ajánlatát adja vissza ismétlésként. **Amit az azonosság
nem fed, kimondva:** a lezárt tagsági IDŐSZAK — azt az ajánlat maga köti (`membership_reentry`), és
az egyezést a BEVÁLTÁS méri.

**4. A SZÁLLÍTÁS (F134-04).** Közös, kattintható bemutató mind a KÉT történettel, kanonikus
forrással a repóban (`docs/bemutato/V3_R134_MEGHIVO_ES_UJRABELEPES_BEMUTATO.artifact.html`),
generálási paranccsal (`npm run bemutato:onallo`, ami mostantól LISTÁT jár be) és megnyitható
átadással; a lap maga KIMONDJA, hogy szimuláció, és megnevezi, hol áll a mért bizonyíték. A
böngészős tanú EN/DE **teljes** utat visz (siker és nevezett elutasítás, súgóval), a két ÚJ válaszra
pedig késői-válasz mérés áll, az R130-ban kialakított három jeles fegyelemmel — annak hat segéde
közös otthonba költözött (`tests/e2e/lateResponse.mjs`), hogy mindkét lap UGYANAZT futtassa.

**Saját leletek ebben a körben (mind KUKA-bejegyzéssel):** KUKA-267 (a néma, nem létező mezőre
illesztett kapu) · KUKA-268 (az időszak-kötés fallá vált a gyengébb tanún — három mag-próba pirosa) ·
KUKA-269 (a saját battériám a hiányzó védelmet PASS-nak nevezte) · KUKA-270 (a `never:` kulcs, amit a
verifier nem olvas — a KUKA-168 ismétlődése, és most ADAT-szintű kapu fogja meg).

**A FENNMARADÓ BIZONYÍTÉK-RÉS TÉTELESEN** (a R134 §A132-10 kérésére, a `norms.mjs` ORG-N1a
`remaining` szövegében is): alap nélküli történeti sorok · az időszak-kötés gyengébb tanúja · a
több-írós (Postgres) határ · és az ORG-N3 vagylagos jogalap-út. Ezeket NEM a döntés hiánya, hanem
MÉRHETŐ munka zárja le; a req-5 kötelezővé emelése továbbra is külön, független döntés.

---
## D-VS-3090 — A MEGHÍVÓ VISSZAVONÁSA ÉS AZ ÚJBÓLI BELÉPÉS (R132)

> **Hatály:** V3 (`valach-system`). Nincs merge, éles telepítés, V2-módosítás, új fizetős
> szolgáltatás, külső címzettnek levél, és nincs core/CMD/PR-zárás. A req-5 **NEM** lép életbe.

**A parancs:** `CMD-VS-300-002-002 R132 — SPEC` (chatgpt-v3, 2026-10-01). Induló fej
`d9d940fb32bc417824e5b533e7fe2cc22145d9d4` (az elfogadott `8124107` leszármazottja).

**Miért most, és nem a mi választásunk:** a két megépített hiányt a SAJÁT norma-szövegünk nevezte
meg (`v3ref/norms.mjs`, ORG-N1a `remaining`): *„(1) a MEGHÍVÓ VISSZAVONÁSA mint saját esemény … (2)
az ÚJRA-MEGHÍVÁS MEGVONÁS UTÁN … az újranyitás külön döntés, nincs megépítve."*

**1. A MEGHÍVÓ VISSZAVONÁSA SAJÁT, AUDITÁLHATÓ ESEMÉNY (INVR-01).** Új, append-only tábla
(`invite_revocation`: token · könyv · cselekvő · két idő-tengely) — **nem** oszlop az `invite`-on,
mert a meghívók egy része pozicionális írással születik (KUKA-122). A visszavonás állapota EGY
feloldóban dől el (`inviteOpenAt`), és ugyanezt kérdezi a beváltás ÉS a megfigyelés is — a két
olvasó nem tud elcsúszni (KUKA-018). A művelet `alter_right` hatáskörhöz kötött, a plafon a szerep
tengelyén kapu, a hatály a VÉGLEGESÍTÉSI pont egyetlen óraolvasásából jön (EFF-01). Idempotens: az
ismételt visszavonás nem duplikál. A már elfogadott meghívó visszavonása NEVEZETTEN hatásmentes, és
**nem** tagságmegvonás — a folytatást a válasz megnevezi (`next_step: revoke_membership`).

**2. AZ ÚJBÓLI BELÉPÉS KÜLÖN, KIFEJEZETT DÖNTÉS (RNV-01).** A rendes meghívás
`revoked_needs_decision` védelme **változatlan** — csendes reaktiválás nincs. Az új művelet
(`reinviteMember`) AJÁNLATOT ad, nem tagságot, és a döntést TÁROLJA (`membership_reentry`: ki ·
mikor · milyen alapon · MELYIK lezárt tagsági időszakra, esemény-azonosítókkal). A tagságot a
címzett SAJÁT, igazolt elfogadása hozza létre, a beváltási lánc MINDEN kapuján át. Négy NEVEZETT
határ, mind a meglévő eljárásra mutató folytatással: felfüggesztés · tiltás · nyitott felülvizsgálati
kör · visszamenőleges érvénytelenség — ezek a művelet HATÓKÖRÉNEK határai, nem hiányai.

**3. A RÉGI JOGOK NEM ÉLEDNEK FEL (SGP-01) — ez a csomag MAGJA.** Az adatkörjog mostantól a tagsági
IDŐSZAKHOZ kötött (`scope_grant.membership_grant_id`), és a kötés ESEMÉNY-AZONOSÍTÓN áll, nem
dátumon (a spec kifejezetten tiltja a „régebbi dátum ⇒ valószínűleg régi jog" heurisztikát). Új
belépés után mind a négy adatkör ZÁRT, nevezett okkal (`scope_grant_other_period`), és a jogot
ÚJRA, kifejezetten meg kell adni. A NULL kötés jelentése KIMONDOTT: az ELSŐ időszakhoz tartozik —
így a már létező, egyszeri tagságok feloldása változatlan, adateldobás nélkül.

**4. A TÖRTÉNET SÉRTETLEN, KÉT TENGELYEN.** A `membership` kulcsa MARAD alany × könyv: a sor a MAI
VETÜLET, a történet a naplókban áll (`membership_grant` · `membership_revocation`), és ott minden
időszak megmarad. A `membershipAsOf` innentől időszak-tudatos: a LEGKÉSŐBBI alkalmazható tagságadás
dönt, és egy megvonás a SAJÁT időszakát zárja, nem az alany egész történetét. A régi időszak
belsejére a régi jog MA IS igaz.

**5. AMIT EZ A CSOMAG KIMONDOTTAN NEM ZÁR LE.** Az ORG-N1a NEM záródott le, és a **req-5 NEM lépett
életbe**: a két életciklus-hiány lezárása nem azonos a klauzula MINDEN vállalt állításának
bizonyításával — a kötelezővé emelés külön, független döntés (R132 §8). Nyitva marad: a visszahívás
nem oldja fel a felfüggesztést, a tiltást, a nyitott felülvizsgálatot és a visszamenőleges
érvénytelenséget; nem utólagos joghatás-felülvizsgálat és nem a REV-N4 kompenzáló folyamat. Az
általános szervezeti képviselet (ORG-N3) továbbra is KÜLÖN HATÁR, nem hiány.

**6. HÁROM SAJÁT LELET, KUKA-BEJEGYZÉSSEL.** KUKA-266: a döntést a SAJÁT írásom UTÁN mértem, ezért a
védett ág soha nem futott le (a jogos beváltás egyediségi hibára szaladt). KUKA-265: a nyugta
megjelent, és a teljes újrarajzolás azonnal letörölte. KUKA-264: a lépésenkénti útmutató örökre
„még nem érhető el" állapotban maradt, és a saját szövegével takarta el a kért gombot. Mindhármat a
SAJÁT mérés fogta meg (HTTP-battéria és böngészős próba), és mindhárom gépi jelet kapott.

**Bizonyíték:** `npm run verify:v3ref` (65/65 próba; a két új: P-INVITE-revoke · P-ORG-reentry, és a
négy új rontás M320–M323 bizonyítottan megbuktatja őket) · `npm run verify:app-findings-r132`
(63/63, valódi HTTP+DB) · `npm run proof:multiconn` (a beváltás ↔ visszavonás verseny KÉT VALÓDI
folyamaton, MINDKÉT véglegesítési sorrenddel) · `npx playwright test` (117/117, benne az öt új
R132-es böngészős helyzet) · `verify:kuka` 530/530 · `verify:grant-paths` 13/13 · `verify:i18n`
49/49 · `verify:tutor` 88/88.

---

## D-VS-3089 — AZ R121 ADATKÖR-CSOMAG ELFOGADVA, NEVEZETT ÉSZLELÉSI HATÁRRAL (R131)

> **Hatály:** V3 (`valach-system`) — nincs kód- vagy próbaváltozás. Ez a bejegyzés a CSOMAG
> ÁLLAPOTÁT rögzíti, mert a külső fél kikötése szerint a határnak a későbbi összesítésekben is meg
> kell maradnia, és gépi otthona nincs (mérve: az A121-státusz csak a lezárt kör-lapokon áll).
> Nincs merge, telepítés, V2-módosítás, új szolgáltatás, core/CMD/PR-zárás.

**A döntés:** `CMD-VS-300-002-002 R131 — DECISION` (chatgpt-v3), elfogadott záró SHA
`812410723ed0964f55d4cfe4ca9cc338abb49321`, ág `claude/chatgpt-board-r121-error-favm2e`.

**1. AZ R121 ADATKÖR-CSOMAG ELFOGADVA** az R122–R130 javításokkal és bizonyítékokkal együtt. Az
F129-01 és F129-02 mérési lelet LEZÁRVA. A külső fél az elfogadást a záró commit FORRÁSÁNAK
vizsgálatára és a saját commit-összevetésére alapozta (egy commit, nyolc fájl, a `v3ref/` és
`v3app/` termékkód változatlan); a 7/7 futási eredményt a forrás alapján fogadta el, **saját
böngészős újrafuttatást nem állít**. Ez a CSOMAG elfogadása — **nem** core-, CMD- vagy PR-zárás, és
nem merge- vagy telepítési engedély.

**2. A121-07 — TELJESÜLT, NEVEZETT HATÁRRAL. Ez felülírja az R130-as jelentés 4. szakaszának
„RÉSZLEGES" minősítését** (a lezárt lapot nem írjuk át: az a saját körének tanúja — KUKA-049; az
utód-kapcsolat itt áll, nevezve — TDX-04). A határ, ahogy elfogadták:

- **AMIT A VÉDELEM IGAZOL:** az alkalmazás által **MÁR ÉSZLELT** fiók- vagy személyváltás után a
  régi válasz **nem** írja felül az új nézetet a mért utakon — a három mintavégpont fiókváltásos
  tanúval, a személyváltás a dokumentumút célzott tanújával.
- **AMIT NEM:** a MÁSIK böngészőlapon történt személyváltást a nyitott mintanézet **nem észleli
  azonnal**. Az észlelés ELŐTT a korábbi kérés válasza még megjelenhet a régi személyt mutató
  nézetben; a következő szokásos szerverkérés kontextus-eltérést jelez és frissíti a lapot. Ez
  **név szerint ismert működési korlát** ebben a csomagban — nem bizonyít azonnali cross-tab
  kijelentkeztetést, és nem általános biztonsági minősítés.
- Az R128 „nem új kitettség" általános állításának R130-as visszavonása **helyes**; az elfogadás
  nem támaszkodik rá.
- Az A121-01…10 azonosítók jelentése **változatlan**; az elfogadási tábla az R126 eredeti térképe
  + ez a kiegészítés.

**3. AMIT AZ ELFOGADÁS NEM MINŐSÍT ZÖLDNEK** (változatlan maradékok): a V2 képesség-tanú eltérése ·
az `external-checks` futtató hiánya · a darabolt mutációs futtatás korlátja · a megvonási ág atomi
burkolatának falszifikálhatósági korlátja · az ÁTVITT KORLÁT fogalmi kérdése. **Az N1 nem teljes
böngészős mutációs battéria** — csak annak helyi, egy-rontásos alakja.

**4. MUNKAREND.** A blokk befejeződött. Új önálló nagy feladat **friss beszélgetésben** induljon, a
következő külön SPEC alapján; az átadás alapja **ez az ág és SHA**, a régi `main`-re visszalépés
nélkül. Az R130-as 205 158-as medián a csomagablak értéke egy TÖMÖRÍTÉSSEL folytatott
beszélgetésben — **nem** írja felül az R126 kumulatív mérése és az R127/R129 alapján már meghozott
chatváltási döntést. Ehhez a pontosításhoz külön mérési vagy dokumentumjavítási kör nem kell, és a
döntés nem kért újabb javítást, átvételi levelet, visszaigazolást vagy REPORT-ot — ezért ebben a
körben ilyen nem készült.

---

## D-VS-3088 — A KÉSŐI VÁLASZ MÉRÉSÉNEK BEFEJEZÉSJELE ÉS NEGATÍV KONTROLLJA (R130)

> **Hatály:** V3 (`valach-system`) — `tests/e2e/v3app-r127.spec.mjs`,
> `contracts/{retiredPatternRegistry.js, guardHome.js, kukaArchiveBaseline.json}`,
> `docs/KUKA_ARCHIVUM.md`. Kivezetett minták: **KUKA-262 · KUKA-263**.
> **TERMÉKKÓD NEM VÁLTOZOTT** — mérve, hogy a védelem helyes (lásd 3. pont).
> Nincs merge, telepítés, V2-módosítás, új szolgáltatás, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R129 — COMMAND` (chatgpt-v3): „A késői válasz mérésének két
hibája: befejezésjel és gyorsítótárazott kontroll". Nem a rendszert, hanem a SAJÁT MÉRÉSEMET
minősítette hibásnak — és igaza volt. A REPORT:
`docs/70_PLANNING/V3_R130_A_KESOI_VALASZ_MERESENEK_JAVITASA.md`.

**1. A BEFEJEZÉSJEL A BEFEJEZÉS UTÁN ÁLL BE — ÉS AZ ÁTADÁS NEM A FELDOLGOZÁS** (F129-01,
KUKA-262). Az R128-as alak a `releasedAt`-et a `route.fulfill` ELŐTT állította be, az E1–E3 erre
várt, majd egy fiókváltás utáni ÜRES áttekintő nézeten állított hiányt; az E4 még erre sem várt.
Mostantól HÁROM jel áll, ebben a sorrendben: `deliveredAt` a `fulfill` UTÁN · az ALKALMAZÁS saját
`res.json()` hívása PONTOSAN ezen az úton (próbaoldali `window.fetch`-burkolat) · majd egy
esemény-forduló. Az állítás helye is más: a fiókváltás után ELŐBB megnyílik az ÚJ fiók érintett
mintaoldala és KIRAJZOLJA a saját friss válaszát, a régi válasz CSAK EZUTÁN érkezik. A két
dokumentum-válasz EGYENKÉNT megy át, a tényleges átvétel megvárásával, MINDKÉT sorrendben.

**2. A HATÁR-MÉRÉS IGAZOLTAN ÜRES NÉZETBŐL INDUL, ÉS ÁLLÍT, NEM NAPLÓZ** (F129-02, KUKA-263). Az
E6 `ujraNyit`-tal indult, ami a kliens minta-állapotát nem üríti — a „most rajzolódott ki" a
korábban is látható adatra is igaz lett volna, és a próba csak `console.log`-ba írta. Mostantól
`page.reload()` üríti az állapotot, az ürességet várakozó állítás rögzíti, a megjelenés KONKRÉT
állítás, és a rajzolás tényét próbaoldali DOM-figyelő is méri (mért érték: 4 DOM-változás egy
előzőleg igazoltan üres nézeten). A jelentés általánosítása SZŰKÍTVE: a mért állítás erre az egy
lépéssorra szól.

**3. NEGATÍV KONTROLL — ÉS AMIÉRT A TERMÉKKÓD VÁLTOZATLAN.** A zöld próba magában nem bizonyítja,
hogy a VÉDELMET méri. Ezért a próba a KISZOLGÁLT `/app.js`-t cseréli ki arra a változatra,
amelyben a nézet-nemzedék kapuja nem áll (a repó fájlja érintetlen, a horgony darabszáma mérve),
és a MÉRÉS UGYANAZON állításának EL KELL BUKNIA — ez a mérés. Mérve: a rontott kódon a régi fiók
bizonylata megjelent az új nézetben, és az állítás elbukott; a szűk „a régi adat nem jelent meg"
állítás önmagában is elbukott. A böngésző-rétegre a mutációs battéria NEM fut — ez a kontroll
annak helyi, egy-rontásos alakja (nevesített maradék marad). **Termékhibát a mérés nem talált**:
mindhárom végponton, mindkét sorrendben 0 DOM-változás a régi válasz FELDOLGOZÁSA után, tehát a
`loadSamples` nemzedék- és nézet-kapuja áll; az E6-beli átmeneti állapot a MÉRT határ, aminek a
javítása cross-tab csatornát vagy folyamatos kérdezést kívánna — azt ez a parancs kizárja.

---

## D-VS-3087 — A LEJÁRT ALAPÚ JOG NEM ÉLŐ JOG, ÉS A GET NEM ÍR (R126)

> **Hatály:** V3 (`valach-system`) — `v3ref/{releaseScope,delegation,run,manifest,mutations}.mjs`,
> `v3app/{server,findings_r125}.mjs` (utóbbi új), `docs/bemutato/` (új),
> `tools/v3_bemutato_onallo.mjs` (új). Kivezetett minták: **KUKA-260 · KUKA-261**.
> Nincs merge, telepítés, V2-módosítás, új szolgáltatás, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R125 — COMMAND` (chatgpt-v3). Az R123 három javítását a
megismételt esetekre elfogadta; a teljes R121 csomag NEM elfogadott, mert az idempotencia ÚJ
regressziót hozott. A REPORT: `docs/70_PLANNING/V3_R126_ELO_JOG_ES_EREDETI_ELFOGADAS.md`.

**1. GLV-01 — AZ ESEMÉNY NEM AZONOS AZ ÁLLAPOTTAL** (`scopeGrantLiveAt`). Az R124-es
idempotencia-kapum a `readScopeGrantAt`-ot kérdezte meg (a megadás/megvonás ESEMÉNYSORA), és nem
azt, hogy a hivatkozott alap ma is érvényes-e. Mérve (chatgpt-v3): LEJÁRT delegált alap alatt a
kiadás `basis_expired`, az ismételt megadás `scope_already_granted` — a SZABÁLYOS helyreállítás
elakadt, a nyugta sikert mondott. Mostantól az idempotencia-kapu, a kiadási döntés és a tag-lista
UGYANAZT a kérdést teszi fel. A TILTÁS és az ELŐFIZETÉS szándékosan kívül van: azokat egy új
megadás nem javítja meg, tehát nem is keletkeztethetnek új grant-igényt. (KUKA-260.)

**2. A GET NEM ÍR** (saját lelet). A tag-lista a megadható köröket a RÖGZÍTŐ
`deriveDelegationBasis`-ból vette — az pedig új alapverziót ír, ha a meglévő nem hatályos. Így egy
LEJÁRT felhatalmazást a puszta LISTÁZÁS visszaállított hatályosnak, némán. A GET mostantól az
írásmentes `delegationCeilingOf`-ot hívja. (KUKA-261.)

**3. A KÉPERNYŐ UGYANAZT AZ ÁLLAPOTOT KÖZLI, AMIT A KIADÁS.** A tag-lista `granted` mezője a
GLV-01 feloldóból jön; a megadás ESEMÉNYÉNEK tényét külön `recorded` mező mondja ki — két külön
tény, két külön név (KUKA-002), és a lejárt jog nem látszik élőnek (KUKA-050).

**4. AZ EREDETI A121 KÖVETELMÉNYEK VISSZAKÖTVE** (R125/F125-02). Az R124-es jelentésem az A121
azonosítókat MÁS követelményekhez rendelte. A mai tábla az R121 SPEC szó szerinti szövegét
használja, és ahol a bizonyíték nem fedi le az EREDETI feltételt, ott RÉSZLEGES — nem az azonosító
jelentésének módosításával zárva. Két hiányzó bizonyíték pótolva: az eljáró **lejárt/megvont
alapja** melletti írásmentesség (A121-05) és a **régi, tárolt előfizetési profil** nem bővülése
(A121-06).

**5. A BEMUTATÓ FORRÁSA A REPÓBAN.** `docs/bemutato/V3_R121_ADATKOROK_BEMUTATO.artifact.html` a
kanonikus forrás; `npm run bemutato:onallo` önálló, hálózat nélkül megnyitható dokumentumot ír a
`var/reports/` alá. Egy forrás, két kimenet — kézi másolat nincs (KUKA-039).

**Gépi jel:** `npm run verify:app-findings-r125` (29/29; a régi kódúton 15/22) ·
`node v3ref/run.mjs` (63/63, +1 kiadott állítás) · `npm run verify:v3ref` (M316 · M317 CAUGHT,
221/221 elkapva, 0 túlélő, 0 elavult horgony) · `npm run verify:kuka` (518/518).

**Nevesített maradék:** a képesség-tanú V2-eltérése és a régi `external-checks` futtató hiánya
továbbra is NEM ennek a csomagnak a javítása, és NEM zöld. A `v3app`-ra a mutációs battéria nem
fut, tehát a GET-írás javításához rontás-kontroll nincs — a bizonyíték a HTTP-battéria.

---

## D-VS-3086 — A JOGOSULTSÁGI DÖNTÉS ÍRÁSMENTES, A NEVEZETT HIBAKIMENET VISSZAGÖRGET, A MEGADÁS IDEMPOTENS (R124)

> **Hatály:** V3 (`valach-system`) — `v3ref/{delegation,authority,run,manifest,mutations}.mjs`,
> `v3ref/legacyAccountFixture.mjs` (új), `v3app/{server,httpSchema,findings_r123}.mjs` (utóbbi új),
> `v3app/public/app.js`, `v3app/public/i18n/{hu,en,de}.mjs`,
> `tests/e2e/v3app-r123.spec.mjs` (új). Kivezetett minták: **KUKA-255 · KUKA-256 · KUKA-257 ·
> KUKA-258 · KUKA-259**. Nincs merge, telepítés, V2-módosítás, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R123 — COMMAND` (chatgpt-v3) — az R121-es csomag NEM fogadva el,
négy javítás egy csomagban. A REPORT:
`docs/70_PLANNING/V3_R124_IRASMENTES_DONTES_ES_ATOMI_JOGKEZELES.md`.

**1. DCE-01 — A PLAFON-KÉRDÉS ÍRÁSMENTES** (`delegationCeilingOf`). A megvonás eddig a plafont a
RÖGZÍTŐ `deriveDelegationBasis`-on kérdezte meg, és csak utána ellenőrizte — így egy ELUTASÍTOTT
döntés is új `authority_basis` verziót írt (a külső fél mérése: 3 → 4 üres megvonás-tábla mellett; a
saját reprodukcióm: 5 → 6). A megvonáshoz nem kell rögzített delegálási alap: az `alter_right`
hatáskörön születik, a plafon ott KORLÁT, nem jogcím. A számítás EGY feloldóban él, amit a rögzítő is
hív. (KUKA-255.)

**2. ATO-01 — A NEVEZETT HIBAKIMENET IS VISSZAGÖRGET** (`atomicOutcome` · `refuseAndRollBack`). A
bukott tárolás eddig a művelet ELŐKÉSZÍTŐ írását bent hagyta (`ok=false` mellett új alapverzió). A
szabályt a MŰVELET mondja ki, **nem** a közös `effectuate`: ott az `ok:false` ma is jelenthet
szabályos, írással járó végállapotot, és egy általános visszagörgetés azokat némán eldobná (a külső
fél kifejezett kikötése). KIMONDVA: a megvonási ágon a burkolat hatása ma nem falszifikálható (ott
egyetlen írás áll) — a mérhető bizonyíték a MEGADÁSI ágon van. (KUKA-256.)

**3. SCR-02 — A MEGADÁS ÜZLETILEG IDEMPOTENS, KÉT IRÁNYBAN.** A mérce a jog MAI ÁLLAPOTA, nem a
kérés azonossága: hatályos jogra `changed:false` írás nélkül, a megvonás UTÁNI újraadás viszont
VALÓDI új esemény. A felületi nyugta a `changed`-et követi mindhárom nyelven
(`scopeGrantUnchanged` · `scopeRevokeUnchanged`); a generikus „nem változott semmi" kivezetve, mert
nem mondta meg, KIRŐL és MELYIK körről van szó. (KUKA-257.)

**4. A TÚLÉLŐ RONTÁST NEM VESZÜK KI — A FIXTURE-T ÉPÍTJÜK MEG.** Az R121-ben a plafon-rontást
eltávolítottam, mert túlélt; a külső fél ezt elfogadhatatlannak mondta, és igaza van. MÉRT ok: a mai
(v2) fiókban a plafon-kapu NEM ÉRHETŐ EL, mert az ÁTVITT KORLÁT (`grant_basis`) a MEGHÍVÓ ALAPJÁNAK
plafona, nem a meghívó pecsételt adatköre. Valódi szűk plafon a RÉGI, v1 szabállyal született
fiókban áll elő — ezt a `v3ref/legacyAccountFixture.mjs` építi fel a v1 DEKLARÁLT listáiból. A
rontás visszaállítva (M310), és a plafon-kapunak mostantól KIADOTT állítása van. (KUKA-258.)

**5. AZ ELŐKÉSZÍTŐ HÍVÁS IS A MÉRT RENDSZERBEN FUT** (saját lelet). Az első battéria-alakom egy
ellenőrző `delegationCeilingOf` hívást tett a számláló pillanatképe ELŐTT — a régi kódúton az a
hívás maga is írt, tehát a mérés a saját mellékhatását igazolta vissza, és a battéria a HIBÁS kódon
is zöld volt. Javítva: a fixture igazolása KÖZVETLEN alap-olvasással, a plafon-feloldó a mérés UTÁN,
és az elutasítás mérése MÉG ALAP NÉLKÜLI eljáróval. (KUKA-259.)

**6. AZ „ÍRÁSMENTES" SZÓ MÉRHETŐ ALAKJA** (`GET /dev/rowcounts`). Az R121-es battériám egy SOHA NEM
LÉTEZETT végpontra deklarált segédet, amit egyetlen mérés sem hívott meg — az állítás bizalom volt,
nem mérés (KUKA-207). A végpont megépült, és **13 jogosultsági tábla** sorait számolja, nem egyet;
csak darabszámot ad, üzleti tartalom nélkül.

**Gépi jel:** `npm run verify:app-findings-r123` (47/47; a régi kódúton 37/47) · `node v3ref/run.mjs`
(63/63, +3 kiadott állítás) · `npm run verify:v3ref` (M310…M314 mind CAUGHT) · `npm run verify:kuka`
(513/513) · `npx playwright test` (105/105) · `verify:i18n` · `verify:tutor` · `verify:assistant`.

**Nevesített maradék:** a képesség-tanú V2-eltérése és a régi `external-checks` futtató hiánya NEM
ennek a csomagnak a javítása, és NEM zöld (a külső fél kifejezett kikötése). A teljes hosszú söprés
nem futott — az R123 nem kérte, a célzott visszaellenőrzés az alapértelmezett (R107).

---

## D-VS-3085 — AZ ÖT HASZNÁLATI ÚT EGY REGISZTERBEN, A FŐSZÖVEG A NYELVCSOMAGBÓL, A LEZÁRÁS EGY HELYEN (R112)

> **Hatály:** V3 (`valach-system`) — `v3app/public/{app.js,tour.mjs,texts.mjs,inviteText.mjs}`,
> `v3app/public/i18n/{dict,hu,en,de}.mjs`, `v3app/knowledge/{features,stories}.mjs`,
> `tools/vs_verify_{tutor,i18n}.mjs`, `tools/v3_r89_bemutato.mjs` + `tools/lib/v3_tortenet_lejatszo*`,
> `tests/e2e/v3app-r112-{invite,stories,demo}.spec.mjs` (új), `tests/e2e/v3app-r109-invite.spec.mjs`.
> Kivezetett minták: **KUKA-252 · KUKA-253 · KUKA-254**. Nincs merge, telepítés, V2-módosítás, új
> jogosultsági modell vagy üzleti modul, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R112 — SPEC` (chatgpt-v3), benne az R111 (F111-01/02) és az R109
(P109-01…03) teljes hátraléka.

**1. A SAJÁT SIKERÉTŐL FIÓKOT VÁLTÓ ÚT EGY KÖZÖS LEZÁRÓT HÍV** (`carryTourBeforeSwitch`). A vállalkozás
létrehozása és a meghívás elfogadása is a váltás ELŐTT készít hordozható összegzést; a pillanatkép a
lezárás OKÁT viszi, a félbehagyott futás nem lesz „egész", és a regisztráció felé elhagyott meghívó-
bemutató nevezetten ér véget. (KUKA-252 — a külső fél F111-01 lelete.)

**2. A FELÜLET FŐSZÖVEGE MINDIG A NYELVCSOMAGBÓL JÖN.** A szerver/mag `message` mezője és kész mondata
(`acting_as`) nem főszöveg: `refusalText` (EGY feloldó, alias-táblával), `inviteNextKey`,
`actingAsText`. (KUKA-253 — saját lelet.) A beváltás sikere a kiszolgált alanyhoz kötött, a késve
érkező válasz nem szól a közben belépett másik embernek. (KUKA-254 — saját lelet.)

**3. AZ ÖT HASZNÁLATI ÚT A KÖZÖS REGISZTERBEN ÁLL** (STR-01, `v3app/knowledge/stories.mjs`): funkciók,
meglévő bemutatók, GYIK, és a bizonyító próbák pontos címe. A `verify:tutor` TUT11 méri, hogy minden út
funkciója működik, van GYIK-je és bemutatója vagy indoka, a szövege minden bekapcsolt nyelven megvan, és
minden bizonyíték PONTOSAN egy próbát jelöl. A bemutató-lap ugyanebből a regiszterből épül.

**4. A SZÓHASZNÁLAT A SZAVAK OTTHONÁBAN** (`TERMS` · `TERMS_AVOID` a csomagokban): egy fogalom, egy szó;
az `verify:i18n` I18N08 a kerülendő szavakat és a csupa nagybetűs kiemelést pirosnak méri.

**Amit ez NEM állít:** anyanyelvi lektorálást (AI-átnézés volt), kész nagyvállalati rendszert, élő AI-t,
számlázást vagy hatósági igazolást.

---

## D-VS-3084 — A MEGHÍVOTT EMBER A SAJÁT KÉPERNYŐJÉRŐL KAP SEGÍTSÉGET (P109-01)

> **Hatály:** V3 (`valach-system`) — `v3app/knowledge/features.mjs` (a 10. bemutató + a nevezett
> személyes-tér kivétel), `v3app/assistant/policy.mjs`, `v3app/server.mjs`, `v3app/public/app.js`,
> `v3app/public/i18n/{hu,en,de}.mjs`, `tools/vs_verify_assistant.mjs`,
> `tests/e2e/v3app-r109-invite.spec.mjs` (új). Kivezetett minta: **KUKA-251**. Nincs merge,
> telepítés, V2-módosítás, új üzleti modul, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R109 — SPEC` (chatgpt-v3) §P109-01, ellenőrzött induló fej
`2ce0872`.

**A NEVEZETT NYITOTT TÉTEL LEZÁRVA.** Az `invite.accept` eddig `tour: null` volt, kimondott indokkal
(R91/F91-01): a képernyője CSAK érvényes meghívó-hivatkozásból nyílik meg, tehát a súgó
FŐOLDALÁRÓL indított bemutató nem létező célra mutatna. A megoldás NEM mesterséges meghívó és nem is
védett adat feltárása: a bemutató **`requires_invite`**, és a SZERVER csak akkor kínálja fel, ha a
munkamenetnek VAN meghívás-kontextusa (`resumeIntent` a `pending_intent` soron) — a felület pedig a
meghívó-képernyőről indítja. Így a cél mindig létezik.

**A döntés — négy kimondott szabály:**

1. **A KÉPERNYŐ MAGA MEGMONDJA, MI TÖRTÉNIK.** A meghívó lapján ott a súgó-pont, a „mi történik az
   elfogadással" mondat, a kapcsolódó GYIK és az innen indítható végigvezetés — mind MEGLÉVŐ
   műveletekkel (`faq-open` · `tour-start` · `help-topic`), új út nélkül (KUKA-003).
2. **A CÍM NÉVELŐ-FÜGGETLEN.** A régi alak egy mondatba tette a fiók nevét („Meghívás ebbe a fiókba:
   X"), ami három nyelven három nyelvtani csapda. Mostantól a cím EGY szó, a fiók neve ALATTA áll
   önálló sorban — a fordítás nem kényszerül ragozni egy behelyettesített nevet (KUKA-214 osztálya).
3. **A SZEMÉLY SORA MINDIG OTT VAN.** A meghívott első kérdése az, hogy MELYIK fiókjával lép be; a
   személyes belépés és a vállalkozáshoz csatlakozás KÉT külön lépés, és a meghívás nem hoz létre új
   személyes fiókot, sem tulajdonosi jogot. Az állapot-független sor egyben a bemutató stabil
   horgonya is (állapot-függő horgony hamis megszakítást adna — KUKA-228).
4. **AZ ELFOGADÁS A FELHASZNÁLÓ KATTINTÁSA.** A bemutató utolsó lépésének feladata `invite.redeemed`:
   a jelzés a szerver IGAZOLT `ok` válasza UTÁN megy ki. A „Tovább"/„Befejezés" gomb tehát nem fogad
   el meghívást, és egy elutasított beváltás nem zárja le sikeresen a bemutatót (KUKA-231 · KUKA-163).

**ÉS EGY ÖTÖDIK, AMIT A BÖNGÉSZŐS PRÓBA KÉNYSZERÍTETT KI (KUKA-251).** A közös elérhetőségi feloldó a
személyes térben a `group` = `invite` EGÉSZ csoportját elrejtette — köztük az `invite.accept`
tudását és GYIK-jét is. A meghívott ember viszont MINDIG a személyes teréből indul, tehát a segítség
pont attól volt láthatatlan, akinek szól, és NÉMÁN: a súgóban egyszerűen nem volt ilyen kérdés (25
kérdés, egy sem a meghívásról). A kivétel mostantól NEVEZETT és a FUNKCIÓN áll
(`personal_space_ok: true`), a kezelői oldal tiltása pedig változatlan.

**A bizonyíték.** `npx playwright test tests/e2e/v3app-r109-invite.spec.mjs` → **6/6 PASS**: a
képernyő saját segítsége · a szerver-oldali kapu ELLENPRÓBÁVAL (meghívás-kontextus nélkül a bemutató
NINCS a listán, vele IGEN — a különbség kizárólag a kontextus) · a bemutató végigkattintva sem vált
be (adatbázison mérve: `redeemed_at` NULL, tagság 0), a saját kattintás után tagság VAN · két VALÓDI
elutasítási állapot (már felhasznált · eltérő címzett) hamis siker nélkül, és a segítség
megnyitása-bezárása-kihagyása NEM ír (sorszámlálással) · mind a három nyelven a helyes csomagból jön a
szöveg, nyers kulcs nem szivárog ki · keskeny nézetben is használható, vízszintes túlcsordulás nélkül.
**TELJES böngésző-regresszió:** 77 próba, benne az R91-03 („mind a kilenc bemutató elindul a saját
képernyőjén") a 10. bemutatóval együtt zölden. Mellé `verify:assistant` **55/55** (az új AST02-vel) ·
`verify:tutor` **78/78** · `verify:i18n` **42/42** · `verify:kuka` **487/487** · `app:selfcheck`
**57/57**.

**Amit NEM mértünk, kimondva:** a P109-02 (a teljes felület és tutor HU/EN/DE nyelvi átnézése) és a
P109-03 kipróbálható BEMUTATÓJA ebben a körben NEM készült el — a 400 ezres chatváltási jelző
(D-VS-3083) a P109-01 lezárása közben megszólalt, és a szabály szerint a megkezdett blokkot zárjuk
le, új nagy munkát nem kezdünk. Ez NEVEZETT hiány, nem „részben kész". Az AI által végzett nyelvi
átnézés amúgy sem független anyanyelvi lektorálás.

---

## D-VS-3083 — A CHATVÁLTÁS HÁROM SÁVJA: a 200 ezres kötelező jelző kivezetve, a 400 ezres lép a helyébe

> **Hatály:** V3 (`valach-system`) — `tools/v3_fogyasztas_meres.mjs` (a küszöbök és a sáv-feloldó),
> `CLAUDE.md` (a szabály OTTHONA). Nincs kód a terméken, nincs V2-módosítás, merge, telepítés,
> migráció, új üzleti modul, core/CMD/PR-zárás. A söprés nem futott újra: a döntés kimondottan a
> CÉLZOTT próbát teszi alapértelmezetté.

**A parancs:** `CMD-VS-300-002-002 R107 — DECISION` (chatgpt-v3), **az OPERÁTOR kifejezett kérésére**;
az átvezetést az operátor ebben a körben rendelte el („vezesd át most a 400 ezres szabályt").

**A lelet — miért nem működött a régi alak.** A régi munkarend EGY kötelező jelzőt ismert: fő-szál
kontextusmedián > **200 000** ⇒ a kör azonnal zárul, a folytatás új beszélgetésbe kerül. **MÉRVE
(R106, a beadott 178 soros tartalommentes hívássorból, a külső fél újraszámolásával):** ez a jelző már
a **51. hívásnál** (2026-09-28T21:10:14.497Z) átlépett, és utána még **127 hívás** és 47 987 126
cache-olvasás következett ugyanabban az ablakban. Vagyis a jelző nem VÁLTÁSI PONT volt, hanem egy
korán megszólaló, onnantól folyamatosan igaz állapot — a „jelző átlépve, most zárunk" mondat pedig nem
bizonyította a betartását sem. A használhatóság kára az operátoré volt: kényszerű chatváltás olyan
ponton, ahol a munka még össze tartozott.

**A döntés — a mérce a KUMULATÍV fő-szál kontextusmedián, és három NEVEZETT sávja van:**

| sáv | teendő |
|---|---|
| **300 ezer alatt** (`normal`) | normál folytatás; körszám és eltelt nap NEM váltási ok |
| **300–400 ezer** (`figyelmeztetes`) | figyelmeztetés + rövid állapotmérés a munkablokk határán — **megállni nem kell, új beszélgetést nem kérünk** |
| **400 ezer elérve/túllépve** (`valtas`) | a FUTÓ munkablokk célzott ellenőrzéssel lezárható; a KÖVETKEZŐ önálló nagy blokk friss beszélgetésben induljon. A lezárás címén nincs új feltárás, új funkció vagy opcionális teljes söprés |
| **nincs mért medián** (`null`) | **NEM ELDÖNTHETŐ** — a hiány nem „normál" (KUKA-093) |

Mellé két kimondott határ: **a munkablokk a megkezdéskor meghatározott javítás/funkció**, nem
korlátlanul bővíthető feladatsor; és **a végső jelentés önmagában nem chatváltási ok** — egy
beszélgetés több jelentést és több blokkot is kiszolgálhat. Valódi környezeti korlát vagy MÉRT
megbízhatósági gond esetén előbb is váltunk, de KONKRÉT okkal — feltételezett korlát alapján nem.

**A SÁV EGY FELOLDÓBÓL JÖN** (`contextBand`, KUKA-003 · KUKA-018): a kiírás, a JSON-jelentés és a
próba ugyanazt hívja, nem három helyen összehasonlított szám. Az `exceeded` mező mostantól a
**TEENDŐT** jelöli (a 400 ezres váltási jelző), nem a figyelmeztetést — a 300–400 ezres sáv
kimondottan nem megállási ok, ezért nem „átlépés", és a mérő **nullával zár** benne.

**A bizonyíték.** `npm run verify:fogyasztas-meres` **18/18 ellenpróba ZÖLD**, benne az átalakított
**FGY-T7**: a **250 ezer** — ami a régi alakban ÁTLÉPÉS volt — ma `normal` és nem jelez; a **350 ezer**
`figyelmeztetes` és NEM váltás; a **450 ezer** `valtas`; a sávhatárok pontosan a 300 000/400 000
értéken fordulnak (299 999 · 300 000 · 399 999 · 400 000 mérve); a nincs-mért-medián `null`. **Élő
futtatáson** ugyanez: a mai munkamenet 366 570-es mediánjára a mérő
`FIGYELMEZTETÉS … MEGÁLLNI NEM KELL` sort ír és **0-val zár** (a régi alak itt `KÜSZÖB ÁTLÉPVE`-t írt
és 1-gyel zárt).

**Amit ez a döntés NEM állít — szó szerint a forrásból:** munkarendi engedmény a használhatóság
javítására, **nem** szolgáltatói limit, **nem** kimért optimum, **nem** megtakarítási ígéret, és a
korábbi eltéréseket **nem igazolja visszamenőleg**. Költség és heti keretarány ebből nem számítható —
az ismeretlen költség null, nem nulla.

**Mellé egy kötelem, ami ugyanebből a döntésből jön** (a `CLAUDE.md`-ben is): a CÉLZOTT próba az
alapértelmezett; teljes hosszú söprés konkrét kiadási kapu vagy megnevezett keresztmetszeti kockázat
miatt induljon, ne automatikusan, és ne kétszer; kész munka nélküli ismételt commit-/hook-ébresztés
pedig nem indít új munka-, dokumentum- vagy próbacsomagot.

---

## D-VS-3082 — A MEGSZAKÍTÁS JELENTÉSE BIZTOS CSATORNÁN MEGY, NEM EGY ESEMÉNYHUROK-FORDULÓN (ITR-01)

> **Hatály:** V3 (`valach-system`) — `tools/lib/vs_interrupt_report.mjs` (új), `tools/lib/vs_child_runner.mjs`,
> `tools/vs_verify_sweep.mjs` (a jelentés-bekötés ÉS a megszakított ellenőrző negyedik kimenete),
> `tools/vs_verify_child_runner.mjs` (CR16 + a CR14 egy állításának valósághoz igazítása).
> Kivezetett minták: **KUKA-249** és **KUKA-250**. Nincs V2-módosítás, merge, telepítés, migráció, új
> üzleti modul, core/CMD/PR-zárás; a termék felülete és magja nem változott.

**A parancs:** `CMD-VS-300-002-002 R105 — ANALYSIS` (chatgpt-v3) §F105-01.

**A lelet.** A D-VS-3081 (KUKA-248) után a megszakítás alatt új munka valóban nem indult — a külső
ellenőrző fél ezt a vizsgált POSIX-határon elfogadta. De a JELENTÉS láthatósága egy `setImmediate`-nyi
fordulón állt: a jelkezelő a rendezett lezárás után adott EGY fordulót, hogy a folyamatban lévő hívások
(`runGuarded` visszatérése → `runSequence` következő döntése → a söprés kiírása) visszatekeredjenek.
MAKACS gyermeknél ez elveszett: a lezárási lánc GYORS (az ismételt jel lezárta a türelmet, a SIGKILL
azonnal ment), a gyermek `close` eseménye viszont LASSÚ (jel-átadás, SIGCHLD, a stdio EOF-ja) — tehát a
kilépés ért előbb. A TÉNYLEGES `tools/vs_verify_sweep.mjs` így **üres stdout ÉS üres stderr mellett
lépett ki 143-mal**: se a megszakítás ténye, se a jel, se a MEG NEM INDULT ellenőrző neve, se a
takarítás állapota nem látszott. **Ugyanott egy MÁSODIK, ellentétes irányú hiba, amit a saját mérésem
tett hozzá:** a `waitGone` az ismételt jelre a KÉNYSZER UTÁNI IGAZOLÁST is rövidre zárta, ezért egy
VALÓBAN leállított fát `nem_igazolt`-nak minősített — a hamis „nem igazolt" ugyanolyan hazugság, mint a
hamis zöld.

**A döntés — négy kimondott szabály:**

1. **A LÁTHATÓSÁG CSATORNA, NEM IDŐZÍTÉS** (ITR-01, `tools/lib/vs_interrupt_report.mjs`). A minimális
   megszakítási jelentés SZINKRON rendszer-hívással megy ki (`writeSync(2, …)`, VÉGES
   EAGAIN-újrapróbálással; tartalék a folyam, és a HASZNÁLT csatorna mérhető) — a `process.exit` nem
   tudja elnyelni. `console.error` erre a célra tilos: a folyam-írás pufferelhet.
2. **AZ ADAT A JEL PILLANATÁBAN MÁR KÉSZ.** A söprés a TERVÉT a futás ELEJÉN bejelenti
   (`registerPlan`) és a haladást jelöli (`markStarted` · `markSettled`), ezért a meg nem indult
   ellenőrzők NEVE nem a sorozat visszatérésén múlik. Három halmaz KÜLÖN marad: lefutott ·
   FÉLBEMARADT (a jel pillanatában futott) · NEM INDULT — a kettő-három összemosása a KUKA-002.
3. **HÁROM FELELŐSSÉG, HÁROM KÜLÖN HELY:** a folyamatok LEÁLLÍTÁSA (CHR-01) · annak IGAZOLÁSA
   (CHR-01 `cleanup`) · a KIÍRÁS (ITR-01). A jelentés a takarítás szavát a MÉRT lezárási jelentésből
   veszi: hiányzó jelentés és maradvány egyaránt NEVEZETTEN „NEM IGAZOLT", nulla folyamatcsoport pedig
   „nincs alkalmazható eset" (KUKA-093) — hamis zöld nincs. A jelentést három út hívhatja (jel-út ·
   határidő · kilépési védőháló), és EGYSZER megy ki.
4. **A TÜRELEM ÉS A BIZONYÍTÉK NEM UGYANAZ.** Az ismételt jel a SZABÁLYOS leállítás türelmét zárja le
   (`forceCuts: true`), a KÉNYSZER UTÁNI IGAZOLÁST nem (`forceCuts: false`). A lezárásra
   SZÁRMAZTATOTT, VÉGES határidő áll — a lezárás saját, kimondott türelmeinek összege + egy nevezett
   ráhagyás (`REPORT_MARGIN_MS = 250`), ismételt jelnél a szabályos türelem kiesik belőle. Önkényes
   sleep és korlátlan várakozás nincs (az R105 kikötése).

**ÉS EGY ÖTÖDIK SZABÁLY, AMIT AZ ELSŐ ÉLŐ PRÓBA KÉNYSZERÍTETT KI (KUKA-250).** A javítás első élő
mérése a VALÓDI söprés megszakítása volt (27 ellenőrzős terv) — és a most megépített jelentés azt
írta: `verify:child-runner [piros]`. Csakhogy az az ellenőrző NEM bukott el: a megszakítási út a SAJÁT
folyamatcsoportjára küldött jelet, tehát MI állítottuk le. **Amit mi állítottunk le, az nem bukott
el:** a megszakítás alatt nem-nullával záró ellenőrző NEGYEDIK, nevezett kimenetet kap —
**MEGSZAKÍTVA**, se nem zöld, se nem piros —, a `fails` listába nem kerül, saját mondata és számlálója
van, a futtató pedig továbbra is hibával zár. A hamis HIBA ugyanolyan rossz, mint a hamis zöld, csak a
másik irányba (KUKA-002 · KUKA-093).

**A bizonyíték.** `npm run verify:child-runner` **81/81 PASS**, nevezett kihagyás nélkül. A CR16 a
TÉNYLEGES söprés belépési pontján mér (`tools/vs_verify_sweep.mjs --root <kéttételes szintetikus
gyökér>`), 10 menetben: szabályosan késleltetve záró ÉS makacs gyermek/unoka × SIGTERM/SIGINT ×
egyszeri/ismételt jel, plusz a **KISZÖKÖTT csővezeték-tartó** — ott a gyermek `close` eseménye SOHA nem
érkezik meg, tehát a RÉSZLETES jelentés útja BIZONYÍTOTTAN járhatatlan, és a jelentés mégis kimegy.
Menetenként mérve: az első gyermek elindult (nem üres alapsokaság) · a második ellenőrző NULLA
alkalommal indult el · a kimenet nem üres, és tartalmazza a jelet ÉS a `verify:b` nevet · a lezárás
NEVEZETT szava · NINCS HAMIS ZÖLD (ahol „igazolt", ott MÉRVE nulla túlélő a saját fából) · kilépés
143/130 · véges idő (1337–6508 ms). **ELLENPRÓBÁVAL (KUKA-127):** (a) a `[F105-01-BIZTOS-CSATORNA]`
jelölt blokkok kivételére a jelentés MÉRHETŐEN eltűnik (2/2); (b) az **R104-es alakon** (a blokkok
kivéve ÉS a `forceCuts: false` visszaállítva `true`-ra) az elfogadási próba MIND A 3 menetben ELBUKIK,
és a TELJES NÉMASÁG is reprodukálódott — 3/3 menet üres stdout ÉS stderr, kilépés 143. **Amit NEM
mértünk, kimondva:** a RÉSZLETES söprés-jelentés kiírása továbbra sem garantált (azt a rendes út adja,
ha a `close` esemény a kilépés előtt megérkezik) · bejelentett feladatlista nélkül (közvetlen
`runGuarded`-hívás) a meg nem indult tételeket nem tudjuk megnevezni, és a jelentés ezt KIMONDJA · a
futtatóra küldött SIGKILL és az operációs rendszer kiesése változatlanul nem garantált · a Windows-ág
nevezett platform-korlát.

---

## D-VS-3081 — A MEGSZAKÍTÁS KÖZÖS, NEVEZETT ÁLLAPOT, ÉS A LEÁLLÍTÁS ALATT ÚJ MUNKA NEM INDUL (SHD-01)

> **Hatály:** V3 (`valach-system`) — `tools/lib/vs_shutdown_state.mjs` (új), `tools/lib/vs_child_runner.mjs`,
> `tools/lib/vs_sweep_sequence.mjs`, `tools/vs_verify_sweep.mjs`, `tools/vs_verify_child_runner.mjs`
> (CR14–CR15). Nincs V2-módosítás, merge, telepítés, migráció, új üzleti modul, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R101 — ANALYSIS` (chatgpt-v3) §F101-01, a munkamódot az `R103 — GUIDE`
pontosítja.

**A lelet.** A D-VS-3080 a megszakítási utat VÉGESSÉ és igazolttá tette — de a lezárásnak KÉT kötelme
van, és csak az egyik épült meg: „leállítom, ami fut" és „nem kezdek újat". Az első gyermek a jelre
SZABÁLYOSAN, 100 ms alatt kilépett, a `runGuarded` erre `mar_ures` / `leftovers:false` választ adott,
a `runSequence` pedig CSAK a takarítás állapotát nézte — ez FOLYTATÁSI ENGEDÉLY volt. A külső ellenőrző
fél valódi SIGTERM-mel háromszor reprodukálta, hogy a második visszahívás lefut; **ebben a körben a saját
mérés kiterjesztette: a második GYERMEK is elindult, szintén 3/3** (ezt az R101 nem állította).

**A döntés — négy kimondott szabály:**

1. **A MEGSZAKÍTÁS KÖZÖS, NEVEZETT ÁLLAPOT** (SHD-01, `tools/lib/vs_shutdown_state.mjs`). A futtató és a
   sorozat UGYANAZT kérdezi — nem két, egymástól független kapcsoló (az R101 kikötése). A jelkezelő ELSŐ,
   SZINKRON lépése az állapot beállítása, MIELŐTT az aszinkron takarítás egyetlen sort is futna.
2. **AZ INDÍTÁSI KAPU OTT ÁLL, AHOL AZ ÚJ MUNKA ELINDUL** (KUKA-202). A futtatóban a `spawn` ELŐTT, a
   sorozatban minden tétel ELŐTT. A kérdés és a `spawn` között nincs `await`: a jelkezelő az eseményhurokban
   fut, tehát ezt a szinkron sorozatot nem tudja kettévágni — a rés bezárása ezen áll, nem időzítésen.
3. **A TILTÁS SAJÁT SZÓVAL TÖRTÉNIK, nem hamis maradvánnyal és nem a tiszta takarítás letagadásával.**
   A futtató válasza `started:false` + nevezett `not_started` ok + `cleanup.verdict="nem_indult"`; a
   sorozat megállásának fajtája `megszakitas` (nem `takaritas`), a kimaradó tételek a JELLEL együtt
   megnevezve maradnak, a kilépés 128 + jelszám (a SIGHUP mostantól 129, nem 143 — a modul saját, kimondott
   szabálya eddig a SIGHUP ágon nem volt igaz).
4. **A VÉDELEMNEK MEG KELL TUDNI SZÓLALNI.** Csoportonként EGY lezárási menet fut (a normál és a
   megszakítási út ugyanazt az ígéretet várja meg, versengő második takarítás nincs), és a kilépés EGY
   eseményhurok-fordulót vár, hogy a folyamatban lévő hívások visszatekeredjenek és a MEG NEM INDULT tételek
   bekerüljenek a jelentésbe. E nélkül a zöldet a kilépés és a kapu VERSENYE adná, nem a kapu — és a próba a
   saját időzítését mérné (KUKA-120 · KUKA-127).

**A bizonyíték.** `npm run verify:child-runner` **61/61 PASS**, nevezett kihagyás nélkül: CR14 (valódi
SIGTERM és SIGINT, 4 menet — a második visszahívás ÉS a második gyermek egyaránt nulla, az első feladat
lezárása közben `igazolt`, a kimaradt tétel a jellel megnevezve, kilépés 143/130, 484–504 ms) és CR15 (a
futtató saját határa; a kapu és a `spawn` között nincs `await`; SHD-01 szerződése). **ELLENPRÓBÁVAL:** a
sorozat-kapu kivételére a második visszahívás 2/2 lefut, az indítási kapu kivételére a leállítás alatt 1/1
ÚJ GYERMEK indul, nevezett pgid-del — tehát a zöld a VÉDELMET méri. Mellé `npm run verify:sweep-reuse`
**43/43 PASS** és `npm run verify:kuka` **470/470 PASS** (KUKA-248). **Amit NEM mértünk, kimondva:** a
Windows-ág (nevezett platform-korlát) és a futtatóra küldött SIGKILL továbbra sem garantált — a
`CHILD_RUNNER_CONTRACT.not_guaranteed` változatlanul kimondja.

---

## D-VS-3080 — A LEZÁRÁS MINDHÁROM ÚTON UGYANAZ, ÉS AZ IGAZOLATLAN LEZÁRÁS MEGÁLLÍTJA A SOROZATOT (SEQ-01)

> **Hatály:** V3 (`valach-system`) — `tools/lib/vs_sweep_sequence.mjs` (új), `tools/lib/vs_child_runner.mjs`,
> `tools/vs_verify_sweep.mjs`, `tools/vs_verify_child_runner.mjs` (CR09–CR13). Nincs V2-módosítás, merge,
> telepítés, migráció, core/CMD/PR-zárás.

**A parancs:** `CMD-VS-300-002-002 R98 — ANALYSIS` (chatgpt-v3) §F98-01/A és /B.

**A lelet.** A D-VS-3079 a NORMÁL (időtúllépéses) utat építette meg helyesen, a szerződés másik két
útját nem. **(A)** A söprés a maradványt a `leftovers` listába tette, de a ciklust folytatta: az első
feladat `cleanup.leftovers=true` eredménye után a második elindult, a hibakód csak a végén keletkezett,
és a kijelzett számláló közben „2 zöld”-et mutatott. **(B)** A futtató jelkezelője SIGTERM-et és
SIGKILL-t közvetlenül egymás után küldött: 1000 ms türelem mellett egy 100 ms alatt szabályosan záró
gyermek lezárási jelzőfájlja meg sem született.

**A döntés — három kimondott szabály:**

1. **A SORREND KÜLÖN, HÍVHATÓ FELOLDÓBAN ÁLL** (SEQ-01). Maradvány · nem mérhető lezárás · hiányzó
   takarítás-válasz után a KÖVETKEZŐ feladat **nem indul el**; a kimaradók NEVEZETT állapotot kapnak
   („nem indult — az előző lezárása nem igazolt”); a futtató hibával zár. A vezérlés azért él külön
   fájlban, hogy a próba a TÉNYLEGES utat hívhassa, ne a másolatát (KUKA-207).
2. **A FELADAT EREDMÉNYE ÉS A LEZÁRÁS ÁLLAPOTA KÉT KÜLÖN TÉNY.** Piros verifier NEM állítja meg a
   sorozatot (az a mérés dolga); igazolatlan LEZÁRÁS igen (az a gép állapotáról szól).
3. **A MEGSZAKÍTÁSI ÚT UGYANAZ A VÉGES LÁNC**, mint a normál (jel → a HÍVÓ türelme → csak szükség
   esetén kényszer → igazolás). Ismételt jel a türelmet zárja le, második, versengő takarítást nem
   indít; a szinkron `exit`-hook csak VÉGSŐ VÉDŐHÁLÓ.

**A platform-korlát nem hallgatólagos engedély:** ahol a lezárást nem tudjuk MÉRNI, ott a sorozat
megáll — nem állítjuk, hogy rendben van (KUKA-012).

**A GARANCIA HATÁRA, kimondva** (`CHILD_RUNNER_CONTRACT.not_guaranteed`): a futtatóra küldött SIGKILL,
az operációs rendszer kiesése és a saját folyamatcsoportjából ÖNÁLLÓAN kilépő leszármazott (`setsid`)
**nem garantált** — ezekre nem állítunk felügyeletet.

**Gépi jel:** `npm run verify:child-runner` CR09–CR13 + `verify:kuka` (KUKA-247 mintái).
**ELLENPRÓBÁVAL mérve:** a régi jelkezelő visszaállítására a CR11 PIROS (a jelzőfájl nem születik meg,
a futtató 6 ms alatt kilép), a megállás kivételére a CR10 hat ága PIROS. A visszaállítás sha256-tal
igazolva (KUKA-126).

---

## D-VS-3079 — A FUTTATÓ A SAJÁT FOLYAMATFÁJÁÉRT FELEL (CHR-01)

> **Hatály:** V3 (`valach-system`) — `tools/lib/vs_child_runner.mjs` (új), `tools/vs_verify_sweep.mjs`,
> `tools/vs_verify_child_runner.mjs` (új battéria). Nincs V2-módosítás, merge, telepítés, migráció.

**A parancs:** `CMD-VS-300-002-002 R95 — ANALYSIS` (chatgpt-v3) §F95-02.

**A lelet:** a söprés `execSync`-kel indított, és a Node időtúllépéskor a KÖZVETLEN gyermeknek küld
jelet. A gyermek itt egy héj, ami node-ot indít, ami továbbiakat — az UNOKÁK életben maradtak
(`ppid=1`), a terhelés négy magon 10,85 volt, MIKÖZBEN már a következő ellenőrzés mért.

**A döntés:** minden külső parancs SAJÁT FOLYAMATCSOPORTBAN indul, és a lezárás a CSOPORTRA megy:
szabályos jel → **VÉGES** türelmi idő → kényszerleállítás → **IGAZOLT üresség**, MIELŐTT a következő
próba indul. A takarítás sikernél, hibánál ÉS megszakításnál ugyanaz az út. A jel-küldés EGY ponton
megy át, és KIZÁRÓLAG a maga indította, nyilvántartott csoportokra — **gépszintű `pkill`, küszöb-emelés
és állítás-gyengítés SOHA**. Nem támogatott platformon (win32) **NEVEZETT korlát** áll, nem hallgatás.
A maradvány NEVEZETT tény a söprés jelentésében, és az összverdikt akkor nem zöld.

**Amit ez NEM állít:** a beragadt futás pontos token- vagy heti limit-költségét nem mértük (a
processzor-terhelés és a modell-fogyasztás külön mérték — R95). És a szintetikus próba a MECHANIZMUST
méri (héj → node → node, makacs jel-elnyeléssel), nem az eredeti 15 perces futást.

**Gépi jel:** `npm run verify:child-runner` — CR01 siker · CR02 hibás kilépés · CR03 makacs
gyermek/unoka időtúllépéskor · CR04 nincs további életjel és nincs átfedés · **CR05 a RÉGI mechanizmus
ellenpróbája** (ugyanitt MÉRHETŐEN szivárog) · CR06 megszakítás · CR07 hatókör · CR08 a söprés
bekötése. **KUKA-246.**

---

## D-VS-3078 — A NYELV A SZEMÉLYÉ, EGY DÖNTÉSBŐL, MÉRT KIMENETTEL (LNG-02)

> **Hatály:** V3 (`valach-system`) — `v3app/public/i18n/langMemory.mjs` (új), `v3app/public/app.js`,
> `v3app/public/texts.mjs`, `v3app/findings_r95.mjs` (új battéria), `tests/e2e/v3app-r97.spec.mjs`
> (új böngésző-tanú). A magreferencia (`v3ref/`) egyetlen fájlja sem változott. Nincs V2-módosítás,
> merge, telepítés, migráció, új üzleti Mini modul, új előfizetés.

**A parancs:** `CMD-VS-300-002-002 R95 — ANALYSIS` (chatgpt-v3) §F95-01.

**A lelet:** az új ember angol vagy német nyelve az ELSŐ belépéskor és frissítéskor megmaradt, de
KIJELENTKEZÉS és ÚJBÓLI BELÉPÉS után magyarra váltott. A gyökér a forráson: a `setLang`
NYELVKÓD-SZTRINGET ad (I18N-01), a lap viszont HÁROM helyen egy nem létező `got.code` mezőt olvasott
rajta — a személyhez mentés két ága SOHA nem futott le.

**A döntés:** a nyelv-döntés EGY tiszta feloldóba kerül (`decideLang`), ami **MÉRT kimenetet** ad
(`source`: `choice` · `url` · `stored` · `carried` · `accept_language` · `default`) és MEGMONDJA, kell-e
menteni (`persist_for_person` · `persist_choice`). A lapon **EGY bejárat** érvényesít (`useLang`),
tehát pontosan egy `setLang(` hívás van, és a visszatérésén mező-olvasás nincs. Új nyelv bekapcsolása
ugyanezt az EGY szabályt használja — a próbák alanyai a JEGYZÉKBŐL jönnek, nem kézi listából.

**A MÁSODLAGOS DÖNTÉS, amit a javítás kényszerített ki:** a `got.code` elírás KÉT ágat tartott halva,
és az egyik feléledése egy MÁSIK, korábban elfogadott szabályt sértett meg — a lap CÍMÉBŐL (`?lang=`)
jövő ág a NÉVTELEN tárolási maradványt tudatos választássá mosta, tehát a KÖVETKEZŐ ember örökölte
volna az előzőét. Ezért a hordozó választás-kulcsot **kizárólag VALÓDI átállítás** írja; a cím ága a
nyelvet megjeleníti és belépett emberhez elteszi, de hordozót nem gyárt.

**Amit ez NEM állít:** a teljes háromnyelvű lektorálás továbbra is nyitott (RÉSZLEGES ÁTNÉZÉS), és a
nyelv a NÉZŐ kényelme — országot, adózási rendet, időzónát, pénznemet SOHA nem választ (LANG-01).

**Gépi jel:** `npm run verify:app-findings-r95` (a szerződés MEGHÍVVA · EGY bejárat · a teljes út
MINDEN bekapcsolt nyelven · **ROMLÁS-ELLENPRÓBA** a régi szabállyal) + `tests/e2e/v3app-r97.spec.mjs`
R97-01/02 (valódi böngésző: kijelentkezés + újbóli belépés három nyelven, és két ember egy
böngészőben). **KUKA-245.**

---

## D-VS-3077 — A SEGÍTSÉG BEFEJEZÉSE: VÉGIGVIHETŐ BEMUTATÓK, MONOTON NYELVI ÉLETCIKLUS, ELLENŐRZÖTT TUDÁS-BLOKKBÓL ÉPÜLŐ VÁLASZ

> **Hatály:** V3 (`valach-system`) — a bemutató-modul (`v3app/public/tour.mjs`), a felület
> (`v3app/public/app.js` · `chat.mjs` · `style.css`), a segéd szabály-modulja
> (`v3app/assistant/policy.mjs`), a héj (`v3app/server.mjs`), a három termék-nyelvcsomag, a
> fogyasztásmérő és az új hash-manifeszt szerszám, valamint az R93 battéria és böngésző-próba.
> **A magreferencia (`v3ref/`) egyetlen fájlja sem változott.** Nincs V2-módosítás, merge,
> telepítés, migráció, új üzleti Mini modul, új előfizetés és szolgáltató-vásárlás.

**A parancs:** `CMD-VS-300-002-002 R93 — ANALYSIS` (chatgpt-v3). Öt tétel: a bemutatók TELJES
felhasználói úton záruljanak · a nyelv életciklusa legyen monoton · a válasz ellenőrzött
tudás-blokkokból épüljön, megnyitható forrással · a fogyasztás friss munkamenetben, tartalom nélküli
hívás-sorokkal · a lezárás csak a MÉRT állítást mondja, hash-manifeszttel.

**A négy döntés, amit ez a kör meghoz:**

1. **A VÁLASZT A SZERVER MONDJA, A MODELL VÁLOGAT (AST-05).** A megjelenő súgóválasz a nyelvcsomag
   ellenőrzött blokkjaiból áll össze; a modell csak kiválasztja, MELYIK blokk felel a kérdésre
   (`[[VS-BLOCKS: <funkció>@<verzió>#<szakasz>]]`). A szerver az elérhetőséget, a verziót, a nyelvet
   ÉS a tényleges tartalmat is megméri. A szabad próza NEVEZETT, NEM ELFOGADOTT mód marad
   (`model_prose_unverified`) — az AST-04 formai kapuja megmarad, de a prózából nem lesz válasz
   (KUKA-242). **Kimondva: ez nem LLM-igazsággarancia** — azt garantálja, hogy a megjelenő MONDAT
   ellenőrzött forrásszöveg, nem azt, hogy a válogatás mindig a legjobb blokkot hozza.
2. **A LEZÁRÁS TÚLÉLI A FIÓKVÁLTÁST (TUR-02).** A fiók létrehozásával lezárt bemutató elszámolása
   hordozható pillanatképként éli túl a nézet-ürítést, és ugyanaz a rajzoló írja ki. Csak az
   ELSZÁMOLÁS megy át — szerkesztő-állapot és jog soha —, és más ember belépésekor ürül (KUKA-243).
3. **A NYELV ÉLETCIKLUSA MONOTON (F93-02).** Minden váltás lépteti a generációt, tehát az oda-vissza
   váltás is érvényteleníti a késve érkező választ; ugyanez őrzi a tudás-betöltést. Az ÚTON
   tudatosan választott nyelvet az ÚJ személy első belépése megtartja — saját kulcson, ami
   KIJELENTKEZÉSKOR ürül, tehát a következő ember nem örökli (KUKA-244).
4. **A BEMUTATÓ NEM TAKARHATJA EL A SAJÁT CÉLJÁT (TUR-03).** A buborék kitér a kiemelt elem elől, és
   ha nincs szabad sarok, átengedi a kattintást (KUKA-240).

**A mérés, amit ez a kör bevezet:** a `tree_digest` (HSH-01) — a mért fájlkészlet tartalom-azonosítója.
A forrás-indulás, a mért bájtok és a jelentést hordozó commit ettől KÜLÖN áll, és a lánc így zárul,
önmagát tartalmazó commit-hash nélkül (R93 §8). Mellé a fogyasztásmérő tartalommentes hívás-sorai
(FGY-02), amikből a növekedés újraszámolható anélkül, hogy a napló modell-kontextusba kerülne.

**Nevesített hiány, nem feledékenység:** az R91-es ablak nyers naplója (munkamenet `495e48b5…`) EBBEN
a konténerben NEM érhető el — friss munkamenetben dolgozunk, a korábbi átirat nem jött át. Az „első
21 hívás" és a 411 976-os induló érték ezért NEM rekonstruálható; hiányzó adat utólag nem válik
méréssé (R93 §7/5). A hívás-sorok képessége megépült, és EZ a csomag mérve van vele.

---

## D-VS-3076 — A SEGÍTSÉG HASZNÁLATI ÚTJAI: EGY ELÉRHETŐSÉGI SZABÁLY, IGAZOLT VÁLASZ-FORRÁS, TELJES NYELVI ÚT

> **Hatály:** V3 (`valach-system`) — a tudás-regiszter (`v3app/knowledge/features.mjs`), a segéd
> három modulja (`v3app/assistant/`), a nyelvcsomagok és a feloldó (`v3app/public/i18n/`), a súgó ·
> bemutató · chat rajzolói, a felület (`v3app/public/app.js` · `style.css`), a héj
> (`v3app/server.mjs`) és a határ sémája (`v3app/httpSchema.mjs`), a bemutató-melléklet generátora, a
> gépi őrök és a próbák. **A magreferencia (`v3ref/`) egyetlen fájlja sem változott.** Nincs
> V2-módosítás, merge, telepítés, migráció, új üzleti Mini modul, új előfizetés és
> szolgáltató-vásárlás.

**Dátum:** 2026-09-26 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R91** (a külső ellenőrző
fél ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R91_HASZNALATI_UTAK.md`

**1. A HÉT LELET.** A külső ellenőrző fél (chatgpt-v3) az R90-es beadást a saját környezetében
végigjárta, és hét eltérést mért — négy közülük CSAK böngészőben vagy helyi szolgáltatói próbával
jött ki. **(F91-01)** A bemutató BEFEJEZÉSE hamis sikert állított: a `plan.saved` feladatú harmadik
lépés `pending` maradt, a lap mégis „a bemutató végére értél" · „2 elvégezve · 0 kihagyva" szöveget
írt; a regisztrációs bemutató belépve azonnal `targetMissing`-gel megszakadt; belépés előtt a súgó
üres maradt. **(F91-02)** A németre állított lap frissítésre magyarra állt vissza, névtelenül nem
volt nyelvválasztó, a szerver által rajzolt megerősítő lap és a próbaüzenetek pedig beégetett magyar
szöveggel készültek. **(F91-03)** Az Új beszélgetés után a visszatartott régi válasz visszakerült, és
a deklarált `history_turns: 6` nem a megvalósult működést írta le. **(F91-04)** Egy idegen, forrás
nélküli szolgáltatói válasz `ok: true` · `answer_kind: model` verdiktet kapott, és mellé a HELYI
keresés forrásait. **(F91-05)** Három külön elérhetőségi szabály élt egymás mellett; az `acceptAction`
a tömb-paramétert is elfogadta. **(F91-06)** A melléklet és a panel technikai maradványokat mutatott
(nyers azonosító, kulcs-darabszám, szolgáltatói változónév). **(F91-07)** Az elfogadási leltár feje az
INDULÓ commit volt, nem a mért kód, és a fogyasztási leltár nem került át.

**2. A DÖNTÉS — HAT SZERZŐDÉS, MINDEGYIK EGY HELYEN.**

- **AVL-01 — EGY ELÉRHETŐSÉGI FELOLDÓ, NÉGY FOGYASZTÓ.** A tudás, a gyakori kérdések, a bemutató és
  a nyitható művelet UGYANABBÓL felel (`availabilityOf`), két KIMONDOTT tengellyel: `audience`
  (`public` = belépés előtt is elmagyarázható · `signed_in`) és `scope` (`person` · `book` = hatályos
  tagság kell). **A nyilvános magyarázat és a jogosan nyitható művelet KÉT külön állapot:** névtelenül
  hét funkció tudása elérhető, nyitható művelet pedig NULLA.
- **A BEFEJEZÉS UGYANAZT ELLENŐRZI, MINT A TOVÁBB** (`finishRun`), és a tudatos kihagyás KÜLÖN
  állapot (`skipStep`). A záró lap HÁROM számot ír ki (elvégezve · átugorva · hátravan), és a „végére
  értél" mondat csak teljes elvégzésnél áll ott; a kilépés is elszámol, más mondattal. A
  fiók-létrehozás tanúsítása MEGELŐZI a kontextus-váltást. A `tour: null` NEM teljesítés: minden
  bemutató nélküli funkció `tour_note`-ban mondja ki az indokot, és a nevesített hozzáférés-kezelés
  megkapta a saját bemutatóját (`tour.grant`).
- **A NYELV A TELJES ÚTON.** A szerver által rajzolt lap és minden próbaüzenet a nyelvcsomagok `SRV`
  csoportjából jön; a megerősítő hivatkozás VISZI a nyelvet, tartalékként a böngésző kérése
  (`Accept-Language`). A választó belépés előtt is ott van, a választás megmarad — de SZEMÉLYHEZ
  kötve, tehát a másik ember beállítása nem szivárog át. **Az átadási kötelezettség MINDEN BEKAPCSOLT
  NYELVRE szól** — nem „három termék-nyelvre".
- **AST-04 — A SZOLGÁLTATÓI VÁLASZ SZERZŐDÉSE.** A modell gépi jelölőkkel zárja a válaszát
  (`[[VS-SOURCES: funkció@verzió]]` · `[[VS-LANG: nyelv]]`), és a szerver ELLENŐRZI az ÁTADOTT
  tudáson. Nem létező forrás, elavult verzió, téves nyelv-deklaráció vagy hossz-túllépés esetén a
  válasz NEM modell-válasz: a helyi keresés válasza jön, és a lap NEVEZETTEN kimondja, miért esett ki.
  A választ ALÁTÁMASZTÓ forrás (`sources`) és a csak KAPCSOLÓDÓ útmutató (`related`) KÉT külön lista.
- **A BESZÉLGETÉS VÉGES ÉS AZONOSÍTOTT.** A kliens a legutóbbi hat fordulót adja át, a szerver a
  deklarált korlátra VÁGJA (`history_turns_sent` a válaszban), és a kért nyelvet KIFEJEZETTEN átadja.
  A beszélgetés- és kérés-azonosító plusz a kérés nyelve MIND a négy tengelyen eldobja az elavult
  választ: fiókváltás · Új beszélgetés · újabb kérdés · nyelvváltás.
- **A MŰVELET-PARAMÉTER ZÁRT MEZŐ-LISTA** (`ACTION_PARAMS`): a tömb és minden nem-objektum nevezett
  `invalid_type`, az ismeretlen mező `param_unknown`. Az üzleti írás továbbra is a rendes
  megerősítési és szerveroldali ellenőrzési úton történik.

**3. AMIT EZ A DÖNTÉS NEM MOND.** **Az élő AI-szolgáltatói mérés továbbra is NEM FUTOTT:** ebben a
környezetben nincs engedélyezett csatlakozás (`npm run kapcsolat:ai` → NINCS CSATLAKOZÁS), a
válasz-szerződést HELYI CSONKKAL mértük — ez nem élő AI-eredmény, és a `proof:assistant-live`
2-es kilépési kóddal mondja ki. A `VS-LANG` jelölő a modell SAJÁT DEKLARÁCIÓJA: nyelv-FELISMERÉS nem
történik, tehát egy hamisan deklaráló válasz tartalmi nyelvhelyességét ez a kapu nem méri. A
forrás-ellenőrzés azt méri, hogy a hivatkozott útmutató LÉTEZIK és ÁT VOLT ADVA — nem azt, hogy a
mondat logikailag következik belőle. A francia és a jobbról-balra írt csomag PRÓBA, nem lektorált
fordítás; a nyelvi lektorálás módja megnevezve, de nem elvégezve. A `16/13` mag-klauzula nem
százalék, a core-core nem zárul, a CMD/PR nem zárul, és a teljes söprés nem zöld (a részletek a
lapon, három KÜLÖN állapotként).

**4. Gépi jel:** `npm run verify:tutor` (78 + 10 ellenpróba, benne a TUT11 elérhetőségi rekesz) ·
`npm run verify:assistant` (54 + 6) · `npm run verify:i18n` (41 + 5) ·
`npm run verify:app-findings-r91` (30 állítás ÉLŐ HTTP-n, helyi szolgáltatói csonkkal) ·
`npm run verify:kuka` (KUKA-231…239) · `npx playwright test` (a hat R91-es eset + a korábbi körök) ·
`npm run kapcsolat:ai` és `npm run proof:assistant-live` (a szolgáltatói út állapota nevezett
kilépési kóddal).

---

## D-VS-3075 — A SEGÍTSÉG EGY FORRÁSBÓL: TUDÁS-REGISZTER, SÚGÓ, BEMUTATÓ, SEGÉD — ÉS A NYELV BŐVÍTHETŐ JEGYZÉKBŐL

> **Hatály:** V3 (`valach-system`) — a nyelvi jegyzék és a szótár (`v3app/public/i18n/`), a
> tudás-regiszter (`v3app/knowledge/features.mjs`), a súgó · bemutató · chat rajzolói
> (`v3app/public/help.mjs` · `tour.mjs` · `chat.mjs`), a segéd három modulja
> (`v3app/assistant/`), a héj három új végpontja és a határ sémája (`v3app/server.mjs` ·
> `httpSchema.mjs`), a felület (`v3app/public/app.js` · `index.html` · `style.css`), négy új gépi
> őr és egy böngésző-csomag. **A magreferencia (`v3ref/`) egyetlen fájlja sem változott.** Nincs
> V2-módosítás, merge, telepítés, migráció, új üzleti modul, új előfizetés és külső
> szolgáltató-vásárlás.

**Dátum:** 2026-09-26 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R89** (a külső ellenőrző
fél SPEC-jére) · **Lap:** `docs/70_PLANNING/V3_R89_SEGITSEG_ES_NYELVEK.md`

**1. A DÖNTÉS — EGY TUDÁS-FORRÁS, NÉGY FOGYASZTÓ.** Minden képesség EGY helyen, verzióval
deklarálja magát (TUD-01, 26 funkció): állapot (`working` · `demo` · `planned` · `retired`) ·
képernyő · művelet · jogosultsági hivatkozás · MINDEN kimenet-fajta · az AI-szerződése (mit
magyarázhat, mit nyithat meg, mit készíthet elő) · nyelvenkénti forrás-verzió és átnézési állapot ·
bizonyíték. Ebből az EGY forrásból él a súgó négy nézete (Kérdezz · Útmutatók · Gyakori kérdések ·
Oldaltérkép), a kattintható bemutató, a keresés és a segéd — tehát új képességnél nincs négy helyen
frissítés, és nem tud elcsúszni egyik a másiktól (KUKA-003 · KUKA-018).

**2. A SEGÍTSÉG A FELHASZNÁLÓ DOLGA, NEM A RENDSZERÉ.** A panel MAGÁTÓL nem nyílik ki; a belépője a
fejlécben áll, mellette a mező-szintű kérdőjelek. A súgó · a GYIK · az oldaltérkép · a bemutató ·
a helyi keresés **NULLA modellhívással** fut (a böngésző-próba MÉRI a kéréseket), egy kérdésre
legfeljebb EGY modellhívás jut, és nincs újrapróbálási lánc. Az oldaltérkép a SZERVER igazságát
mutatja, és kimondja, mi MIÉRT nem elérhető.

**3. A BEMUTATÓ SOHA NEM KATTINT HELYETTÜNK.** Kiemel és magyaráz; mentésre, meghívásra,
jóváhagyásra, jogadásra, törlésre nem nyúl. A feladathoz kötött lépés CSAK a szerver által igazolt
siker után halad (a gomb megnyomása önmagában nem siker), az „átugrott" pedig NEM „elvégezett" —
három állapot, és a zárás kiírja, mi maradt el. **És ami a panelen BELÜL van, arra VÁRNI kell:** a
lépés kimondja, mi tárja fel a célját (`appears_after`), a bemutató a feltáró gombot emeli ki, a
mondat megmondja a folytatást — a cél hiánya így NEM hamis megszakítás (KUKA-228).

**4. A NYELV JEGYZÉKBŐL JÖN, NEM A KÓDBÓL.** Egy bejegyzés: azonosító · saját nyelvi név · írásirány
· bekapcsolt állapot · KIMONDOTT tartalék-lánc. Három termék-nyelv (HU · EN · DE) teljes, 588
kulcson karakterre mérve; a bővíthetőséget egy NEGYEDIK nyelv (francia próba-csomag) és egy
jobbról-balra írt PRÓBA-tartalom bizonyítja — kód-módosítás nélkül. **A tartalék NEM lefedettség:**
a hiányzó vagy elavult fordítás nevezett hiány, nem „megvan". A felhasználó adatát soha nem
fordítjuk le. A nyelv NEM dönt országról, adózási rendről, időzónáról, pénznemről.

**5. A SEGÉD HATÁRA KÓDBAN ÁLL.** A jog- és állapot-ellenőrzés a tudás KIVÁLASZTÁSA ELŐTT fut
(belépés · fiók · tagság · szerep · csomag · funkció-állapot), a nyitható műveletek ZÁRT listából
jönnek és MIND `writes: false` — a mentést a felhasználó végzi a rendes űrlapon, friss
szerver-ellenőrzéssel. A védelem a zárt lista, nem a minta-felismerés. Ha nincs engedélyezett
szolgáltatói csatlakozás, a panel KIMONDJA, mi hiányzik (változó-NEVEK, érték soha), és a helyi
válasz megmondja magáról, hogy nem AI-válasz. Az ismeretlen fogyasztás és ár `null` — a képernyőn
„nincs adat", SOHA nem nulla.

**6. AZ ÁTADÁSI KAPU INNENTŐL MINDEN ÚJ KÉPESSÉGRE ÉRVÉNYES.** Egy új funkció akkor kész, ha a
tudás-regiszterben áll (állapottal, kimenetekkel, AI-szerződéssel), a súgója és a GYIK-je a három
termék-nyelven megvan, az oldaltérkép látja, és a bemutatója végigvihető. A részletes szabály a
lapon áll, a gyökér-fájlban csak a kötelem és a mutató (R65 rendje).

**7. AMIT EZ A DÖNTÉS NEM MOND.** **Nincs mérve élő AI-szolgáltató:** ebben a környezetben sem
`VS_AI_PROVIDER`, sem `VS_AI_API_KEY` nem áll (mérve: `npm run kapcsolat:ai`), ezért a
szolgáltatói út **NEM FUTOTT** — a `proof:assistant-live` nevezett kilépési kóddal (2) mondja ki, és
megnevezi, melyik elfogadási sort hagyja igazolatlanul. Nem állítjuk, hogy a francia és a
jobbról-balra írt csomag FORDÍTÁS: azok PRÓBA-tartalmak, a bővíthetőség bizonyítására. Nem állítjuk,
hogy a felület képernyőolvasóval teljesen akadálymentes (a felolvasási sorrend nincs mérve). Nem
zárul a core-core, és nem zárul a CMD/PR. És nem állítunk zöld söprést: két hosszú lánc ebben a
környezetben sem futott végig, a `verify:capability-witness` pedig a V2 board-regiszterének
frissítését kéri, amit ez a csomag SZÁNDÉKOSAN nem végez el (V2-módosítás tilos).

**8. Gépi jel:** `npm run verify:i18n` (41 + 5 ellenpróba) · `npm run verify:tutor` (65 + 9) ·
`npm run verify:assistant` (49 + 6) · `npm run verify:app-findings-r89` (41, élő HTTP-n) ·
`npm run verify:kuka` (KUKA-221…230) · `npx playwright test` (59 böngésző-eset, ebből 6 az R89-é) ·
`npm run kapcsolat:ai` és `npm run proof:assistant-live` (a szolgáltatói út állapota NEVEZETT
kilépési kóddal).

---

## D-VS-3074 — A KÖTÉS OTT ÁLL, AHOL AZ ÍRÁS TÖRTÉNIK; A FIÓK ADATA A FIÓKÉ; ÉS A NEM TUDOTT NEM „NEM TÖRTÉNT MEG"

> **Hatály:** V3 (`valach-system`) — a próba-alkalmazás felülete (`v3app/public/`), a héj két
> pontja (`v3app/server.mjs`: a létrehozás kontextus-kapuja és a fiókhoz rögzített bemutató-csomag),
> a határ sémája (`v3app/httpSchema.mjs`) és a böngésző-próbák. **A magreferencia (`v3ref/`) egyetlen
> fájlja sem változott.** Nincs V2-módosítás, merge, telepítés, migráció, új üzleti modul.

**Dátum:** 2026-09-25 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R85** (a külső ellenőrző fél
ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R85_SZEMELY_KOTES_ES_FIOK_ADATA.md`

**1. A NÉGY LELET.** A külső ellenőrző fél (chatgpt-v3) az R84-es átadást a SAJÁT környezetében
végigjárta, és négy eltérést mért. **(F85-01, blokkoló)** Anna félbehagyott vállalkozás-űrlapja —
miután ugyanabban a böngészőben egy másik belépés Bélára váltott — HTTP 201-gyel BÉLÁHOZ hozott
létre fiókot: a kliens-oldali nézet-bélyeg (PNL-01) a másik fül belépését nem érzékeli.
**(F85-02)** Az előző cég várakozó meghívása az új cég fejléce alatt maradt: a lista kimaradt a
közös ürítésből. **(F85-03)** Ugyanaz a cég Annának és Bélának MÁS bemutatóadatot mutatott, mert a
csomagot a NÉZŐ saját fiók-listájának sorrendje választotta ki. **(F85-04)** Egy VÉGREHAJTOTT, de
elveszett válaszú levélkérésre a lap „Nem sikerült kapcsolatba lépni… Próbáld újra" szöveget írt —
vagyis egy már megtörtént írás megismétlésére biztatott.

**2. A DÖNTÉS — NÉGY SZABÁLY.**

- **A KÖTÉS OTT ÁLL, AHOL AZ ÍRÁS TÖRTÉNIK.** A fiók-létrehozás is viszi a megnyitáskori ALANYT
  (`expected_subject_id`), és a szerver ÍRÁS ELŐTT veti össze a munkamenet alanyával; eltérésnél
  nevezett, írás-mentes 409. Itt nincs célkönyv, ezért a személy az elsődleges kötés — nem létező
  könyv azonosítóját nem követeljük. A kliens-oldali bélyeg megmarad, de KIEGÉSZÍTÉS, nem helyettes.
- **MINDEN NÉZETHEZ KÖTÖTT TÁR EGY HELYEN ÜRÜL** (`resetViewCaches`) — a saját váltás és a külső
  okból jött nézet-változás is ezt hívja. Új tár felvételekor ez az egyetlen hely, amit bővíteni
  kell; az üres lista helyén a lap KIMONDJA a betöltést, nem régi sorral tölti ki az időt.
- **A FIÓK ADATA A FIÓKÉ** (DEM-02): a bemutató-csomag hozzárendelése a fiók LÉTREHOZÁSAKOR
  születik, a tárolóban áll, és a jogosult nézethez kötött szerver-válasz adja vissza. Sem a néző
  lista-sorrendje, sem az azonosítóból számolt érték, sem a böngésző tárolója nem dönt benne.
- **A NEM TUDOTT NEM „NEM TÖRTÉNT MEG".** Az ÍRÓ kérés elveszett válasza NEM ELDÖNTHETŐ; az OLVASÓ
  kérésé eldönthető hiány, mert olvasás semmit nem változtat. A kérés fajtája a válasz mezője lett,
  tehát a hívó nem találgat. Öt kimenet, öt külön mondat, mindegyik külön mérve.

**3. AMIT EZ A DÖNTÉS NEM MOND.** Nem mondja ki a core-core teljes lezárását, és a 16 elfogadott /
13 részleges mag-klauzula nem készültségi százalék. Nem állítja, hogy MINDEN felirat a közös
szótárból jön (a maradék nevesített nyitott tétel). Nem állítja, hogy a felület billentyűvel
teljesen akadálymentes (a fókusz-csapda és a képernyőolvasó-sorrend nincs mérve). És nem állít zöld
söprést: a két hosszú lánc ebben a csomagban sem futott.

**4. Gépi jel:** `npm run verify:kuka` (KUKA-217…220) · `tests/e2e/v3app-r85.spec.mjs` (öt
ellenpróba, mind pozitív párral) · `tests/e2e/v3app-r81-ux.spec.mjs` (UX-05 · UX-15 · UX-20 a teljes
hatókörre igazítva).

---

## D-VS-3073 — A SZERKESZTŐ A MEGNYITÁSKORI NÉZETHEZ TARTOZIK, A MUNKALAP MEGŐRZI A MUNKÁT, ÉS A VERDIKT NEM MUTAT A MÉRÉSEN TÚL

> **Hatály:** V3 (`valach-system`) — a próba-alkalmazás felülete (`v3app/public/`), a héj két
> végpontja (`v3app/server.mjs`: a várakozó meghívások olvasása és a megfigyelés minimális kiadása),
> a böngésző-próbák és a bemutató-szerszám. **A magreferencia (`v3ref/`) egyetlen fájlja sem
> változott.** Nincs V2-módosítás, merge, telepítés, migráció, új üzleti modul és külső levélküldés.

**Dátum:** 2026-09-25 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R83** (a külső ellenőrző fél
ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R83_SZERKESZTO_KOTES_ES_SZOVEGEK.md`

**1. A HAT LELET.** A külső ellenőrző fél (chatgpt-v3) az R82-es átadást a SAJÁT környezetében
végigjárta, és hat eltérést mért. A legsúlyosabb (F83-01): a nyitva maradt meghívó-panel MÁSODIK
kattintása a közben aktívvá lett MÁSIK cégbe írt — az első kattintás helyesen HTTP 409-et kapott,
de a panel nyitva maradt a régi cég nevével, és a lap a szerver igazságához igazított globális
nézetből küldte a másodikat. Nem jog-megkerülés: a SZÁNDÉK és a VÉGREHAJTÁS CÉLJA vált el. Mellé:
a munkalap csak látszólag őrizte a kitöltést (F83-02); a Termékkarton és a Készletmozgások jog
nélkül is rajzolt adatot, a mintacsomag hozzárendelése pedig karakter-összeg paritásán dőlt el
(F83-03); a „minden felirat egy forrásból" állítás részleges szótárra épült (F83-04); a sikertelen
levélkérés után is sikeres folytatás látszott (F83-05); és a „21 UX-feltétel bizonyítva" összegzés
két rekeszben a mérésnél többet állított (F83-06).

**2. A DÖNTÉS — ÖT SZERZŐDÉS, MIND EGY HELYEN.**

- **PNL-01** — minden ÍRÓ űrlap a rajzolásakor megbélyegződik a nézettel (könyv · alany ·
  generáció), a beküldés EZT használja, és elavult bélyegnél a kérés EL SEM INDUL: a szerkesztő
  bezárul, a lap kimondja, mi történt, a régi kitöltés pedig nem megy át az új fiókba. A meghívás,
  a jogadás, a megszüntetés, a csomagmódosítás és a fiók-létrehozás UGYANAZT hívja — nem épül
  oldalanként külön őr.
- **FRM-01** — a megőrzendőnek jelölt űrlapok kitöltése az állapotba kerül, amint a felhasználó
  hozzáér, és minden rajzolás után visszaáll. A SAJÁT kezdeményezésű fiókváltás megkérdez, a KÜLSŐ
  okból jött nézet-váltás eldobja a kitöltést (PNL-01), a sikeres mentés pedig felejt — mert ami el
  van mentve, az nem „nem mentett munka".
- **STK-01** — a három készlet-jellegű nézet EGY hozzáférés-állapotot olvas, amit EGYETLEN
  szerver-válasz állít be; a mintacsomag hozzárendelése KIMONDOTT (első közös fiók ⇒ A, második ⇒
  B, minden további és a személyes ⇒ jelölt ÜRES mintanézet); és amit a mag válasza nem mond meg
  (raktár, mérési eredet), azt nem találjuk ki: ott „Nincs megadva" áll.
- **A SZÓTÁR PARAMÉTERES** — a mondat a közös forrásban él (`TPL` + `tpl()`), a behelyezett érték
  (fiók neve · e-mail · időpont · adatkör) ADAT, nem fordítás. Ezzel a kényszerített névelő és a
  hibás idézőjel sem a kódban keletkezik. A személyes fiók a felületen „Személyes fiók", nem a
  tárolt belső neve; a menüje az R81-ben kijelölt egyszerű alak.
- **A VERDIKT A MÉRT HATÓKÖRHÖZ KÖTVE** — a bizonyíték-lap szava `reszben_bizonyitva`, ha egy
  nevezett al-eset nem futott; az UX-06 a tizenöt HASZNÁLATI HELYZETET járja végig (nem menüpontot
  számol), az UX-18 a fő történet hat lépését billentyűvel és a fókusz visszatérését is méri, az
  UX-21 önhordósága pedig MÉRVE van (beágyazott képek · külső erőforrás nincs · SHA-256).

**3. AMIT EZ A DÖNTÉS NEM MOND.** Nem állítja, hogy MINDEN felirat a szótárból jön: a normál
mondatok és a paraméteres alakok ott vannak, a maradék beégetett felirat NEVESÍTETT nyitott tétel,
és a védelme az emberi képolvasás. Nem állítja, hogy a felület billentyűvel teljesen akadálymentes:
a fókusz-csapda és a képernyőolvasó felolvasási sorrendje NEM mérve. És nem állítja, hogy a
melléklet megérkezett a címzetthez — az önhordóság mérve van, a kézbesítés nem.

**4. Gépi jel:** `npm run verify:kuka` (KUKA-211…216 tiltó- és pozitív mintái) ·
`tests/e2e/v3app-r83.spec.mjs` (öt ellenpróba) · `tests/e2e/v3app-r81-ux.spec.mjs` (22 feltétel,
hatókörhöz kötött verdikttel) · `node tools/v3_kiprobalas_kepek.mjs` (önhordóság + SHA-256).

---

## D-VS-3072 — A V3 FELÜLETE KÖZÖS ALKALMAZÁSKERETRE VÁLT, ÉS MINDEN FELIRAT EGY FORRÁSBÓL JÖN

> **Hatály:** V3 (`valach-system`) — a próba-alkalmazás felülete (`v3app/public/`), a megerősítő lap
> szövege a héjban, a böngésző-próbák és a bemutató-szerszám. **A magreferencia (`v3ref/`) egyetlen
> fájlja sem változott.** Nincs V2-módosítás, merge, telepítés, migráció, fizetős szolgáltatás,
> külső levélküldés és új üzleti modul.

**Dátum:** 2026-09-24 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R81** (a külső ellenőrző fél
PLAN lapjára) · **Lap:** `docs/70_PLANNING/V3_R81_FELULET_KOZOS_KERET.md`

**1. A LELET.** A próba-alkalmazás EGY hosszú, számozott lap volt: regisztráció, belépés, meghívás,
cégalapítás és adat-lekérés egymás alatt, a válaszok nyers alakban (`KIADVA {"qty":"12"}` ·
`ELUTASÍTVA — melyik kapu: right` · `challenge_superseded` · belső azonosítók). A külső ellenőrző fél
mind a tizenöt képernyőn megmutatta, hogy a felhasználó nem tudja megmondani, sikerült-e
csatlakoznia, mi a teendő egy lejárt hivatkozással, és mit jelent, hogy „a plafon" nem jog.
⇒ **KUKA-210.**

**2. A KERET.** Fejléc fiókválasztóval (személyes fiók + vállalkozások) és külön profilmenüvel; bal
oldalon a V2-ből ismerős menü (Műveletek · Riportok · Törzsadatok · Beállítások); középen az éppen
végzett feladat EGY kiemelt művelettel; jobbról nyíló panel a meghívásnak és a jogosultságoknak;
felül állandó „Bemutató · mintaadatok" jelölés. A belépési oldalak ÖNÁLLÓ kártyák — belépés után a
belső nézetben nincs belépési űrlap, és a korábbi képernyő tartalma sem marad ott rejtve.

**3. SZO-01 — EGY SZÖVEGFORRÁS.** A menücím, az oldalcím, a gomb-felirat, az állapot-mondat és a
szerver hibakódjának emberi megfelelője MIND a `v3app/public/texts.mjs`-ből jön; a gépi ok a
„Technikai részletek" lenyílóban marad meg. **DEM-01 — a bemutató adatai** külön modulban
(`v3app/public/demoData.mjs`), fiókonként eltérő csomaggal; a mennyiség három állapota (mért ·
becsült · nem ismert) DEKLARÁLT adat, és a mintatábla CSAK akkor látszik, ha a valódi mag kiadja.

**4. A VÉDELEM NEM GYENGÜLT (UX-15).** A nézet-kötés szabálya változatlanul EGY modulban él
(`v3app/public/contextBinding.mjs`), amit a lap és a próba-battéria is onnan hív; minden
kontextusfüggő olvasás és írás viszi a nézet ALANYÁT és KÖNYVÉT; a késve érkező válasz nem írhat az
új nézetbe; a jogot változatlanul a szerver dönti el. **ERŐSÖDÖTT:** az adat-lekérés ELŐBB a
szerverhez igazítja a nézetet, a fiókváltás AZONNAL üríti a paneleket, és a belépési oldalra lépve a
korábbi képernyő tartalma eltűnik a lapból (nem csak elrejtve marad).

**5. SAJÁT LELET MENET KÖZBEN — KUKA-209.** Az első alakban az újrarajzolás indította a lekérést, így
a nemleges válasz mondata frissítési kört indított: **700 ms alatt 33 kérés** (a saját böngésző-próbám
kérés-számlálója mérte). A rajzolás és a lekérés azóta KÉT külön döntés: a `render()` csak rajzol, és
EGY hely indít lekérést (`loadPageData()`), amit a nézet-váltás vagy a felhasználó gombja hív.

**6. GÉPI JELEK.** `tests/e2e/v3app-r81-ux.spec.mjs` — az R81 terv 22 elfogadási feltétele valódi
böngészőben, gépi bizonyíték-lappal (`docs/70_PLANNING/V3_R81_UX_ELFOGADAS.json`; a részleges futás
nem írja felül, KUKA-206). Regresszió: `app:selfcheck` 57/57 · `verify:app-findings` 73/73 ·
`-r77` 34/34 · `-r79` 49/49 · `verify:kuka` 367/367 · a teljes böngésző-csomag **43/43**, benne az
R63 tizennégy elfogadási helyzete változatlan ítélettel (9 bizonyítva · 3 részben · 2 nem böngészőben).

**7. AMIT EZ A KÖR NEM ÁLLÍT.** Három tervezett tétel a mai szerver-képességekkel nem teljesíthető, és
nem is színleltük: az újraküldés visszaszámlálója (a szerver nem ad hátralévő időt) · a „Meghívások"
fül és a „Meghívásra vár" állapot (nincs lekérdező végpont a függő meghívókra) · a meghívó cégneve és
a meghívó személy neve a kártyán (a megfigyelés szándékosan nem adja ki annak, aki a címzetti
csatornát nem bizonyította). Mindháromhoz kivezetési feltétel tartozik a REPORT 4. szakaszában.

---

## D-VS-3071 — AZ R79 KÉT MARADÉKA: A NÉZET-KÖTÉS SZABÁLYA KÓDBA KERÜL, ÉS AZ ÍRÁS AZ ALANYHOZ IS KÖTVE

> **Hatály:** V3 (`valach-system`) — a próba-alkalmazás (`v3app/`) kliense, HTTP-határa és szervere.
> **A magreferencia (`v3ref/`) egyetlen fájlja sem változott.** Nincs V2-módosítás, merge, telepítés,
> migráció, fizetős szolgáltatás, külső levélküldés és új üzleti modul.

**Dátum:** 2026-09-24 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R79** (a külső ellenőrző fél
ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R79_NEZET_KOTES_ALANY_ES_KONYV.md`

**1. F79-01 — A SZABÁLY A MEGJEGYZÉSBEN ÉLT, A KÓDBAN NEM.** Az R77-es `servedMatches` csak akkor
hasonlított, HA a mező megvolt: két hiányzó `served_*` mezővel IGAZAT adott — a külső fél hibabevitellel
(a valódi, sikeres válaszból kivett mezőkkel) megmutatta, hogy a változatlan lap kirajzolja a „KIADVA"
képet. ⇒ **KTX-03**: a szabály egy behúzható modulba került (`v3app/public/contextBinding.mjs`), amit a
LAP és a BATTÉRIA UGYANÚGY futtat; a kontextusfüggő SIKERES válasznak meg kell adnia mindkét mezőt
(megléte · érvényes típus · pontos egyezés), a nevezett nemleges válasz pedig emberi mondatot kap és nem
indít újabb kérést (nincs frissítési körforgás). A taglista és az adat-panelek UGYANAZT a döntést hívják.

**2. F79-02 — A KÖNYV EGYEZETT, A SZEMÉLY NEM.** A másik lap kilépett, BÉLÁVAL lépett be, és ugyanazt a
céget választotta; Anna régi lapjának gombja lefutott (`expected_book_id` egyezett, alany-megerősítés nem
volt), és az írás Béla nevében, az ő naplózott cselekvőjével történt meg. ⇒ **KTX-03**: minden
állapotváltoztató művelet viszi a nézet ALANYÁT és KÖNYVÉT (a séma deklarálja, `confirm_only`), a szerver
az ÍRÁS ELŐTT, ugyanabban a kiszolgálásban méri mindkettőt (409 `context_mismatch`, `wrote:false`, nyom
nélkül), és a sikeres válasz is kimondja a kiszolgált nézetet. A mező SOHA nem választ cselekvőt vagy
könyvet — a jogot a mag kapui döntik el (mérve: jogosulatlan fiók helyes mezőkkel is elakad).

**3. A MÁTRIX, amit a parancs kért:** négy művelet (adatkör-adás · megvonás · meghívás · terv-változtatás)
× négy kontextus-állapot (alany változik · könyv változik · mindkettő · egyik sem), a tárolóból mért
sorokkal; a megvonás pozitív párja OLYAN szereplővel, akinek ténylegesen van rá hatásköre (mérve: Béla
admin, de a megvonási hatásköre nincs megalapozva — az ő 403-a nem bizonyítana kontextusvédelmet).

**4. GÉPI JELEK:** `npm run verify:app-findings-r79` (49 állítás: 13 soros igazság-tábla a VALÓDI
szabályon + a mátrix + a séma-deklaráció) · böngésző: `tests/e2e/v3app-r79.spec.mjs` (hibabevitel a
válaszba; két lap, közös süti, AZONOS cégen belüli fiókváltás). Regresszió: 57/57 · 73/73 · 34/34 ·
35/35 böngésző-próba.

**5. ÚJ TANULSÁGOK:** **KUKA-207** (amit próba nem tud MEGHÍVNI, azt bizalomból hisszük — a lap és a próba
ugyanazt a fájlt futtassa) · **KUKA-208** (ha a kontextus PÁR, a megerősítés is pár).

**6. AMIT EZ A KÖR NEM ÁLLÍT.** A core-core teljes lezárása nincs elfogadva; a H08 és a teljes
kontextusvédelem elfogadása a külső ellenőrző félé. Az R19 QNT nyitva marad. Becslésből visszamenőleg nem
lesz mérés.

---

## D-VS-3070 — AZ R77 KÉT LELETE JAVÍTVA: AZ OLVASÁS NÉZETHEZ KÖTÉSE ÉS AZ ATOMI MUNKAKÖRNYEZET-INDÍTÁS

> **Hatály:** V3 (`valach-system`) — a magreferencia (`v3ref/`) és a próba-alkalmazás (`v3app/`).
> **Nincs V2-módosítás, merge, telepítés, migráció, fizetős szolgáltatás és külső levélküldés.**

**Dátum:** 2026-09-23 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R77** (a külső ellenőrző fél
ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R77_KONTEXTUS_ES_ATOMI_INDITAS.md`

**1. A KÉT LELET REPRODUKÁLVA ÉS JAVÍTVA** (mindkettő a külső ellenőrző fél — chatgpt-v3 — mérése):
**F77-01** két böngésző-lap KÖZÖS munkameneten: a lap „A"-ra szóló `/me`-t kapott, a másik lap közben
„B"-re váltott, és a rákövetkező OLVASÁST a szerver MÁR B-re szolgálta ki — a fejléc A-t mutatott, a panel
B adatát; a válasz ráadásul nem mondta meg, melyik kontextusban született ⇒ **KTX-02**: minden
kontextusfüggő olvasás VISZI a nézetét (`expected_book_id` · `expected_subject_id`, a HTP-01 regiszterben
deklarálva), a szerver UGYANABBAN a kiszolgálásban veti össze (409 `context_mismatch`, adat nélkül),
minden válasz kimondja a TÉNYLEGESEN kiszolgált kontextust (`served_*`), a lap csak egyezésnél rajzol (a
hiányzó mező NEM egyezés), és a mező SOHA nem ad jogot — csak szűkít; az alany- és a könyv-váltást EGYÜTT
nézzük (közös süti mellett a másik lap más fiókkal is beléphet) · **F77-02** a `{"tax_id":"---"}` bemenetre
HTTP 500 jött ÉS a munkakörnyezetek száma 1 → 2 nőtt (félkész könyv üzleti azonosság nélkül) ⇒ **PRV-01**:
a bemenet problémáját a NORMALIZÁLÓ SAJÁT szabályából olvassuk ki ÍRÁS ELŐTT
(`businessIdentityProblem` — nem új „adószám-ellenőrzés"), a mag (könyv · tagság · indulási tények · üzleti
azonosság) EGY atomi egységben íródik, bármelyik lépés bukása NULLA sort hagy, a munkamenet csak siker után
vált, a határ pedig nevezett **400 `tax_id_value_required`**-et ad a hibás mező megnevezésével. Az
ISMERETLEN országprofil továbbra sem tilt saját munkát (H12/REP-01).

**2. §4 — TARTALMI HELYESBÍTÉSEK, ÚJ KÉPESSÉG NÉLKÜL.** **L2** visszakerült `dontes_megvan` állapotba: a
döntés és a belépési határ kész, a tényleges képviseleti ALAP nyitott (nulla adapter, nulla megépített
művelet) · **A09** és **A18** „fedett" → `reszben` (mindkettő nevezett hiányt hordozott: a „régi beadott
FÁJL" fogalma nincs; a valós FIZIKAI lista mint művelet nincs megépítve) ⇒ a megfeleltetés összegzése
**1 fedett · 13 részben · 4 nevezett hiány** · **H08** „bizonyítva" állapota az ÚJ ellenpéldával csak a
javítás UTÁN tartható — a két lapos verseny bizonyítéka bekerült a helyzet SAJÁT sorába · **H07** (a címsor
számla- és beszállítói adatosztályt nevez, a szótár két tagú) · **H09** (a meghívó-lejárat és a
jogosultsági ALAP lejárata KÉT külön állítás, külön bizonyítékkal) · **H10** (a valódi szervezeti hierarchia
hiánya az ÁLLAPOTBAN áll, nem a megjegyzésben) → mind `reszben`; az elfogadási lap összegzése az állítások
tényleges határa szerint **9 bizonyítva · 3 részben · 2 nem böngészőben** (a korábbi 12/0 helyett) ·
**H11** szöveg-lelete JAVÍTVA: az elutasítás mondatát a ZÁRÓ KAPU adja, a „kiadva" csak tényleges kiadáskor
hangzik el · **L10** kimondott hatókörrel zárt: a SZERKEZETI teljesség gépi jellel áll, a TARTALMI
helyesség olvasással — és az R77 ezen az úton két sort helyesbített is.

**3. A „LEZART" SZÓ A SAJÁT MÉRCÉJÉHEZ VAN KÖTVE.** A lezárási lista minden sora viszi, hogy a saját
lezárási feltétele teljesült-e (`lezarasi_feltetel_teljesult`), és ahol nem, ott MEGNEVEZI, mi hiányzik; a
kettő EGYÜTT mozog, gépi jellel. Ugyanígy a megfeleltetésen: „fedett" csak ott, ahol a sor KIMONDJA, hogy
nincs nevezett maradék.

**4. SAJÁT LELET A KÖRBEN (nem a külső féltől):** a részleges böngésző-futás FELÜLÍRTA a közzétett
bizonyíték-lapot, és a nem futott helyzet „részben"-ként jelent meg (9/3/2 → 1/13 némán). Javítva: a nem
futott helyzet saját szót kap (`nem_futott`), a lap viszi a futás hatókörét, és részleges futás a közzétett
lapot NEM írja felül. **És egy sorrend-hiba a saját javításomban:** a `fetchData` előbb frissítette a
fejlécet, és csak utána ürített — lassú válasz alatt a RÉGI cég adata a képernyőn maradt (a teljes csomag
futtatásakor ez egy próbát meg is buktatott). Mostantól az ürítés az ELSŐ lépés (KUKA-050), és ezt vezérelt
lassítású böngésző-próba méri.

**5. ÁTADÁS (§5).** A kipróbálható átadás lapja 15 képernyővel áll (az R77 két javítása külön képen), a lap
fejléce KIMONDJA az ágat, a commitot és azt, hogy a munkafa tiszta volt-e; és a lap tartalmazza a LOKÁLIS
kipróbálás pontos, végigpróbált útját (külön mappába töltött másolat, Node ≥ 22.5, `node v3app/server.mjs`
→ `http://127.0.0.1:3300/`) — a meglévő munkamásolat és a `main` érintése nélkül. Nyilvános telepítés,
Railway-változtatás, merge és külső levél továbbra sincs.

**6. ÚJ TANULSÁGOK:** **KUKA-204** (a kontextus a KISZOLGÁLÁSKOR dől el — az olvasásnak is kötése kell, és a
válasz mondja ki, kinek szolgált ki) · **KUKA-205** (ami EGYÜTT igaz, azt EGY egységben írjuk; a meglévő
szabályt írás ELŐTT kérdezzük meg) · **KUKA-206** (a részleges futás nem írhatja felül a teljes mérés
lapját; a hiányzó mérés nem kap eredmény-szót). **Gépi jelek:** `npm run verify:app-findings-r77` (34
állítás) · `verify:app-findings` (73) · `verify:app-selfcheck` · `verify:kuka` (351) · `npm run
proof:core-ux` (33 böngésző-próba) — mindegyik a söprés része.

**7. AMIT EZ A KÖR NEM ÁLLÍT.** A core-core teljes lezárása NINCS elfogadva. A „16 elfogadott / 13 részleges
klauzula" nem készültségi arány. Az R19 QNT (24 követelmény / 36 eset) nyitott marad. Becslésből
visszamenőleg nem lesz mérés.

---

## D-VS-3069 — AZ R75 HÁROM LELETE JAVÍTVA: A MEGERŐSÍTÉS FOLYTATÁSA · A KONTEXTUS KÖTÉSE · A SÉMA A HATÁRON

> **Hatály:** V3 (`valach-system`) — a magreferencia (`v3ref/`) és a próba-alkalmazás (`v3app/`).
> **Nincs V2-módosítás, merge, telepítés, migráció és külső levélküldés.**

**Dátum:** 2026-09-22 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 **R75** (a külső ellenőrző fél
ANALYSIS lapjára) · **Lap:** `docs/70_PLANNING/V3_R75_LELETEK_ES_KIPROBALHATO_ATADAS.md`

**1. A HÁROM LELET REPRODUKÁLVA ÉS JAVÍTVA** (mind a három a külső ellenőrző fél — chatgpt-v3 — mérése):
**F75-01** a lejárt megerősítő hivatkozás ZSÁKUTCA volt („regisztrálj újra", miközben a cím foglalt, tehát
levél nem ment ki) ⇒ **CHR-01**: újrakérhető megerősítés semleges válaszban, címenkénti ismétlés-korláttal,
a korábbi ÉLŐ hivatkozás LEVÁLTÁSÁVAL (`superseded_at`, saját tény), a lejárt és a beváltott hivatkozás nem
éled újra, és minden nemleges ág FOLYTATÁST ad · **F75-02** a cég-váltási védelem RÉSZLEGES volt (csak a
váltó léptette a generációt, csak az adat-gombok nézték, a szerver semmit) ⇒ **KTX-01**: minden váltó
esemény léptet, a lap a `/me`-ben a SZERVER igazságához méri magát, és minden állapotváltoztató kérés viszi
a könyvet, amiben a gomb született (`expected_book_id` — MEGERŐSÍTÉS, nem felhatalmazás; eltérésre 409
`context_mismatch`, írás nélkül) · **F75-03** a HTTP-határon `String()` kényszerítés állt, amitől a
`{"name":{"invalid":true}}` törzsből „[object Object]" nevű munkakörnyezet született (HTTP 201) ⇒
**HTP-01**: végpontonkénti SAJÁT séma a KÖZÖS BEM-01 motoron, állapotváltoztató végponton KAPU (nevezett
400, írás nélkül), olvasón NEVEZETT figyelmen kívül hagyás — a két szerződés határát a regiszter `mutates`
mezője mondja ki, nem a végpont kódja.

**2. AZ R64 MARADÉKAIBÓL EBBEN A KÖRBEN LEZÁRT:** **L7** (a séma a külső határon — a saját lezárási
feltétele szerint) · **L10** (A01–A18 tételes megfeleltetés: 18/18 sor, 3 fedett · 11 részben · 4 nevezett
hiány) · **L11** (a személyes kör: **SZK-01** — a csatorna bizonyításakor magától születik, ugyanazzal a
`createWorkspace`-szel és indulási szabállyal, alanyonként legfeljebb egy, a kulcs tartja) · **L2** (a
képviselet: **REP-01** cserélhető ellenőrzés, zárt osztály-regiszter, fail-closed, és a nemleges válasz
kimondja, hogy CSAK az adott műveletet zárja — a regisztrációt és a saját munkát soha). **L3 DÖNTÉS:** a
közös (kétszemélyes) jóváhagyás VÁLASZTHATÓ szervezeti szabály lesz, nem kötelező teher; amíg nincs
megépítve, a rendszer ilyen védelmet nem ígér (mérve: 0 ilyen ígéret a héj és a felület forrásában).

**3. A SZÁM-ELLENTMONDÁS HELYESBÍTVE (L8).** Az R64-es lap lezárási feltétele „mind a 13 klauzulá"-t írt,
ugyanannak a lapnak az OB-5 bekezdése 15-öt. A regiszterből MÉRVE: **15** megvonási klauzula, **10**
deklarált hiány nélkül, **5** nevezett hiánnyal (REV-N1c · REV-N3d · REV-N3e · REV-N4a · REV-N4b). A 13
elavult szám volt; a lezárási lista élő alakja innentől `docs/70_PLANNING/V3_CORE_LEZARASI_LISTA.json`,
és a számokat gépi jel köti a regiszterhez.

**4. A LEJÁRATI ÁGAK MOSTANTÓL BÖNGÉSZŐBŐL IS MÉRHETŐK.** A héj TÁMOGATOTT idővezérlést kapott
(`/dev/clock`, a fejlesztői felület mögött, `devSurface` kapcsolóval — kikapcsolva a fejlesztői végpontok
404-et adnak, tehát nem „letiltva", hanem NEM LÉTEZNEK). Ezzel a H06 és a H09 „reszben" minősítése
megszűnt: **12 bizonyítva · 0 részben · 2 nem böngészőben** (a maradék kettő a magban mért).

**5. AMIT EZ A KÖR NEM ÁLLÍT.** A core-core teljes lezárása NINCS elfogadva. Üzemi használat nem
állítható (L1 · L4 · L5 nyitott). A „lezárt" sorok a SAJÁT feltételükre zárultak, kimondott maradékkal —
egyik sem készültségi százalék. Az A-esetek forgatókönyve nem futott le (megfeleltetés, nem futtatás).

**6. ÚJ TANULSÁGOK:** **KUKA-201** (a lejárat is út, nem végállomás) · **KUKA-202** (a verseny elleni őrt
ott kell állítani, ahol a kár keletkezik) · **KUKA-203** (a külső határon a típus kérdés, nem formázás).
**Gépi jelek:** `npm run verify:app-findings` (73 állítás) · `verify:app-selfcheck` (57) · `verify:kuka`
(338) · `npm run proof:core-ux` (30 böngésző-próba) — mindegyik a söprés része.

---

## D-VS-3036 — AZ R26 ÖT LELETE JAVÍTVA: A BEFOGADÁSI SZABÁLY, AZ ESZKÖZ-SOR ÉS A PR155-FOLYTATÁS

> **Hatály:** V2+V3 — a javítás a V2 repó board-eszközében (`tools/chatops-board/`), a rajta megjelenő
> ADAT a V3 köreié. **A V3 magban egyetlen fájl sem változott; merge, telepítés, migráció nem történt.**

**Dátum:** 2026-09-17 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R27 (az ő **R26 ANALYSIS**
lapjukra, verdikt: `needs_fix`) · **Lap:** `docs/70_PLANNING/V3_R27_R26_OT_LELET_JAVITAS.md`

**1. MIND AZ ÖT LELET REPRODUKÁLVA ÉS JAVÍTVA** — a külső fél futtatható programjával, előtte-utána:
**F26-01** egy R20-as mérés R24-es „kizárólagos" fogyasztásként ⇒ a mérés SAJÁT köre és a kötés köre
egyezzen (`roundsAgree`), különben a kizárólagosság esik el, nem a mérés · **F26-02** a KÖZVETLEN
dokumentum-blokk megkerülte az „ismeretlen adat nem szám" védelmet ⇒ a szabály a VALIDÁTORBAN áll,
mindkét bejáratra, és az ellentmondás LÁTHATÓ hiba · **F26-03** a nem felosztott intervallum a funkció
összegébe olvadt ⇒ HÁROM befogadási rekesz · **F26-04** a sor-átírásból kimaradtak a teszt- és
hibaszámok (a számlálók átírása karakterre azonos HTML-t adott) ⇒ visszakerültek a SORRA, dátummal és
forrással, „—"-lel a hiányra · **F26-05** a csupa szóköz `review` is elfogadás volt ⇒ `namedReview`,
trim után sem üres, mindkét kapun.

**2. A BEFOGADÁS HÁROM REKESZE (`admissionOf`).** Egy futás száma CSAK akkor adódik a funkció igazolt
összegéhez, ha mind a három minősítés megvan (elszámolt számláló · van token-kép · kizárólagosan ehhez
a körhöz rendelt). Egyébként a szám MEGMARAD és látszik — **nem felosztott** (△) vagy **örökölt** (◇)
rekeszben —, de SOHA nem adódik az igazolthoz: hiányzó minősítésből nem következik bizonyítottság.

**3. TOOLING-V3-PROGRESS (a külső fél R26 §1 döntése).** A katalógus három osztálya kimondott:
**170 termék + 1 közös (CORE-SHARED) + 1 eszköz**. A termék-készültség nevezőjébe az eszköz- és a közös
sor nem kerül, az eszköz ráfordítása nem másolódik a CORE-SHARED-be, és a próbák ezt SZABÁLYKÉNT mérik
(osztályonként), nem vak darabszámmal.

**4. A KIHAGYÁS NEM SIKER.** A böngésző-próba hiányzó Playwright mellett eddig `exit 0`-val „KIHAGYVA"-t
mondott — a kapuban PASS. Most **3-as kilépési kód** („NEM FUTOTT"); a `--allow-skip` kimondottan
vállalható, és a kimenet is kimondja, hogy az nem bizonyíték.

**5. TERMELŐ → DOKUMENTUM → FELÜLET, mérve.** A böngésző-próba (O)–(Q) lépése a VALÓDI láncot járja
végig: `tools/vs_usage_snapshot.mjs` → `v3UsageAdapter` → `v3_progress_append` ÍR egy riport-fájlt → a
fájl szövege dokumentum-sorként → a fül sora a képernyőn (teszt `45/0/0`, hiba `5/0`, és a fogyasztás
NEM igazolt, mert a főágon szállított mérő nem ad elszámolási tanút).

**6. EGY MÉRT MELLÉK-LELET, JAVÍTVA.** A board egység-futtatója nem ismerte a Node teszt-összegzőjét
(`# pass`/`# fail`), ezért a két új próba **35 esete NÉMÁN kimaradt** az összesítésből; a futtató
megtanulta az ötödik alakot (1825 → **1860**).

**7. GÉPI JELEK.** `test:v3progress` 24 · `test:v3usage` 11 · `test:v3progress:mutations` **22/22 rontás
PIROS** · `proof:v3progress-ui` **25/25** · board teljes egység-sor 44/44 fájl · 1860 eset ·
`verify:kuka` **479/479** · `verify:no-undef` PASS.

**8. KUKA-102 · KUKA-103.** A védelem a TERMELŐNÉL állt, nem a SZABÁLYNÁL (két bejárat, a próbám a
sajátomat mérte) · az ÁTÍRÁS némán elvett egy működő oszlopot (a MÍNUSZT is át kell nézni). Mindkettő
tiltó-mintát kapott, és bizonyítottan tüzel: a visszalépéseket visszatéve a `verify:kuka` 477/479.

**9. A PR155 FOLYTATÁSA: DRAFT INTEGRÁCIÓS PR** — valach-family/vs **#160**, a saját ágamról a
`codex/v3-progress-dashboard` cél-ágra, draft, a repó PR-sablonjával, „NOT READY" merge-ajánlással.
Azonos tárgyú PR nem volt nyitva. **A merge, a zárás és a telepítés továbbra sem része a csomagnak.**

**10. AMI NYITVA MARAD — KIMONDVA.** A független elfogadás a chatgpt-v3 dolga (a saját tesztem nem az) ·
a V3 külső ellenőrző lánc piros eredményeinek oka továbbra sem igazolt (külön alap-ellenőrzési kérdés) ·
a V3 kör-eszköz `frmCatalog`-hiánya regisztrált korlát marad · a `verify:registries` /
`verify:vertical-slices` / `verify:screen-texts` NEM futott, mert a VS TERMÉK regisztereit méri, ez a
csomag pedig board-eszközt módosít — ez kihagyás, nem zöld.

---

## D-VS-3035 — A V3 HALADÁS-FÜL BEFEJEZÉSE ÉS AZ R20 GÉPI BLOKK HELYESBÍTÉSE

> **Hatály:** V2+V3 — a fül KÓDJA a V2 repóban lakik (`tools/chatops-board/`), a rajta megjelenő
> ADAT viszont a V3 köreié. **V2 TERMÉK-kód nem változott; merge, telepítés, migráció nem történt.**

**Dátum:** 2026-09-17 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R24 (az ő R23 LETTER-ükre,
azon belül az operátori CMD-VS-200-011-003 R7-re) · **Lap:**
`docs/70_PLANNING/V3_R24_HALADAS_FUL_BEFEJEZES.md`

**1. HÁROM TENGELY EGY OSZLOP HELYETT (KUKA-002).** A megfigyelés `status` mezője a MUNKAFÁZIST és a
BLOKKOLTSÁGOT is hordozta, ezért egy blokkolt sorról nem lehetett megtudni, hol tartott. Mostantól
`phase` (hol tart) · `blocked` (mi állítja meg, MEGNEVEZETT okkal) · `delivery` (megírt · tesztelt ·
külsőleg elfogadott · telepített, mind `true`/`false`/`null`). A két bizonyíték-igényű állapot
bizonyítékot kér: külső elfogadás ⇒ független `review`, telepítés ⇒ `deployment.reference`. **A régi
alak olvasható marad, és nem találunk ki helyette semmit:** egy régi `blocked` sor fázisa `unknown`,
és a képernyő ezt KI IS ÍRJA.

**2. A HÁROM MINŐSÍTÉS KÜLÖN MARAD** (az R23 §4 kikötése): `token_coverage` · `settlement` ·
`attribution`. Nem igazolt elszámolás mellett fogyasztási szám nem állhat a soron; az `unavailable`
és az `unknown` SOHA nem válik nullává; a részösszeg mellett a lefedettség ÉS a forrás-pillanatkép
dátuma is látszik; a fázis-idők és a külön attribuált token-mezők saját mérési bizonyítékot kérnek.

**3. ADAPTER, NEM MÁSODIK MÉRŐ.** `vs-usage/1` → `v3-progress/1` (`v3UsageAdapter.js`), a V2 R5
REPORT + a PR157 rögzített revíziója (`c03603ae`) szemantikájával, a PR158 azonosság-ellenpéldáival.
A két PR nincs mainen: az adapter nem másolja a kódjukat és nem dönt közöttük — a HATÁRON újra
ellenőrzi, amire támaszkodik. A futás-azonosító a MÉRÉSBŐL képződik, ezért ugyanaz a mérés kétszer
átalakítva EGY sor marad (a `vs-usage` és a `v3-progress` eredmény nem adódik össze).

**4. AZ R20 GÉPI BLOKK HELYESBÍTVE, SZÁM NÉLKÜL.** A lap §7/c szövege már az R21 szerinti okot
mondta, a gépi blokk `limitation` mezője viszont még az elveszett fő naplót állította. A helyesbítés
UGYANAZON a run-azonosítón és UGYANAZON a megfigyelési időn áll, minden metrika `null` maradt, és a
`correction` mező kimondja, hogy ez nem új mérés. A §7/b „a lefedettség `partial`" állítása is
javítva: a kör költsége nem részleges, hanem EGYÁLTALÁN NEM MÉRT.

**5. HÁROM SAJÁT LELET.** (a) A PR155 böngésző-globálisa nem a testvérek `ChatOps…` alakját vitte,
ezért a V2 `verify:no-undef` őre **7 találattal PIROS** volt — a PR155 sosem ment át ezen a kapun
(KUKA-016 · KUKA-036). (b) A sor-szintű minősítés az „ismeretlen"-t „részlegessé"/„nem igazolttá"
LÉPTETTE ELŐ: a VALÓDI R20 soron a méretlen kör „Részleges / Nem igazolt"-ként jelent meg — a nem
tudás és a tudjuk-hogy-nem két külön válasz (KUKA-093); megtalálta a saját böngésző-próbám. (c) A
deduplikáció próbája gyenge volt (két azonos ezredmásodpercű átalakítást hasonlított), ezért egy
óra-alapú azonosító is átment volna — megtalálta a rontás-battéria (KUKA-054).

**6. GÉPI JELEK.** `npm run test:v3progress` (18) · `test:v3usage` (10) ·
`test:v3progress:mutations` (**14/14 rontás PIROS**, a kilépési kódon) · `proof:v3progress-ui`
(**20/20**, VALÓDI R20 blokk SZINTETIKUS kiszolgálón) · a board teljes egység-sora 44/44 fájl ·
1825 eset · `verify:kuka` 470/470 · `verify:no-undef` PASS (a kör elején PIROS).

**6/b. A HIBÁS ALAK KUKA-BEJEGYZÉST KAPOTT — KUKA-101** (a V2 aktív memóriájában, három tiltó-mintával;
bizonyítottan tüzel: a régi összevonást visszatéve a `verify:kuka` 473/474-re esik). Tanulság: *az
összevonás soha ne adjon határozottabb választ, mint amit a részei tartalmaznak.*

**6/c. MÉRT, NEM JAVÍTOTT LELET:** a `tools/vs_board_round.mjs` MÁSOLATA ebben a repóban nem fut —
`MODULE_NOT_FOUND`, mert a `tools/chatops-board/src/frmCatalog.js` a V2 repóban lakik (KUKA-031/040
rokona). A kört a V2 példányával tettem fel; a javítás a következő körre marad, mert az R23 kikötötte,
hogy e csomag mellett más munka ne induljon.

**7. AMI NEM TÖRTÉNT MEG — KIMONDVA.** Nincs merge, telepítés és migráció; a PR155 ágára nem írtam
(a munka a saját ágon áll, a PR155 fejére ráépítve); a PR157/158 összefésülése nem az enyém; a fül
SAJÁT ráfordításának nincs katalógus-sora, és egyoldalúan nem nyitok ilyet — nyitott kérdés a
katalógus gazdájának. A böngésző-próba nem éles bizonyíték: szintetikus kiszolgálón fut.

---

## D-VS-3034 — F18-01 JAVÍTVA, AZ OB-7 LEKÉPEZÉS ELKÉSZÜLT, ÉS A K0 MÉRVE

> **Hatály:** V2+V3 — az F18-01, az OB-7 leképezés és a K0 a V3 magja; a **körmérő v3-progress/1
> vetítése** viszont a KÖZÖS szerszámot érinti, ami fizikailag a V2 repóban lakik
> (`tools/vs_round_cost.mjs`), ezért a V2 fejlesztőnek is tudnia kell róla. **V2 TERMÉK-kód nem
> változott; PR nem született.**

**Dátum:** 2026-09-16 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R20 (az ő R18 + R19 lapjukra)

**1. F18-01 — A HIBÁS ALAK CSAK AZ EGYIK ÁGON VOLT HIBA.** A külső fél lelete:
`sweepVerdict({exitCode:0, stdout:'VS-SWEEP-VERDICT: nonsense'})` **ZÖLD** volt, ugyanaz a sor
`exit 1`-gyel piros. A szerződés SZÖVEGE (R17 §3/a) kimondta, hogy a hibás alak `failed` — a KÓD
viszont ezt CSAK a nem-nulla kilépés alá tette (**KUKA-039** fél-őre a saját, egy körrel korábbi
szerződésemen). **A saját pinem sem foghatta meg:** az SWV04 a hibás alakot KIZÁRÓLAG `exit 1`-gyel
mérte — tükröt mért, nem ellenpárt. Javítás: a hibás-alak vizsgálat a SIKERÁG ELŐTT fut, NEVEZETT
indokkal. Gépi jel: **`verify:sweep-verdict` SWV07** — a lelet mindkét kóddal, négy további hibás
alak nullával zárva, HÁROM ellenpár (jelölő nélküli zöld · érvényes kihagyás · türelem-túllépés), és
az ÖTÖDIK VALÓDI gyermek-folyamat. A régi sorrendre bizonyítottan piros: **7 SWV07 állítás + SWV05**.
Tanulság: **KUKA-176**.

**2. OB-7 — A LEKÉPEZÉS ELKÉSZÜLT, AZ ELBÍRÁLÁS NEM (és nem is az enyém).** Az R18 §1 kérte; kész:
`docs/70_PLANNING/OB7_LEKEPEZES.json`, amit a **`tools/vs_ob7_map.cjs`** generál a MAI forrásból.
A hét lépésből ÖT gépi (normaszöveg + lenyomat · pozitív/negatív eset · mutációk · a ténylegesen
megbukó állítás · a lánc-számok), KETTŐ próza, külön állományban (`OB7_PROZA.json`) — hogy látsszon,
mi az enyém (KUKA-082: a kézzel írt kivonat elcsúszik a gépi leltártól). **MÉRVE: 20 klauzula · 72
lánc-sor (53 fedett · 12 részben · 7 bizonyíték nélkül) · 22 próba · 56 falszifikáló mutáció · 0 fel
nem oldott azonosító.** A `content_review` MINDEN soron `null` — azt CSAK a független fél írhatja
(R57/F03). **KIMONDOTT KORLÁT:** a próza-oldalra ebben a körben NEM futott független
kereszt-ellenőrzés.

**3. K0 — A BIZONYTALAN MENNYISÉG ÉS A NÉGY ALAPKAPCSOLAT, FUTTATVA.** Az R19 §9.1 feltétele
(„konkrét támogatási mód ÉS ellenpélda") nem forrás-olvasással teljesíthető, ezért **futtattam**:
`node tools/vs_k0_qnt_probe.mjs` — **9 mérés: 2 rendben · 5 hiányzik · 2 hibás.**
· **A LEGSÚLYOSABB (C2):** a magban EGYETLEN mennyiségi művelet van (`stock.receipt`), és az MOZGÁST
ír — a „pontosabban megmértük ugyanazt" csak új áruként fejezhető ki: **100 + 90 = 190**, holott egy
90 kg-os tétel van. Nem hibás funkció, hanem **hiányzó fogalom: a MEGFIGYELÉS** (QNT-07 · QNT-18).
· **E1:** egy „mérlegjegy" és egy „receptből becsült" bevét sora az azonosítón kívül **BÁJTRA
AZONOS** — a QNT-03 hét eredetéből egy sem tárolható.
· **D1:** a mag KÉT időt tárol, az R19 §5.2 HÁRMAT kér — a MEGFIGYELÉS ideje sehol.
· **B1:** a kiadott eredmény adatköre a TÁRGYAT osztályozza, az EREDETET nem; mért és becsült 100 kg
azonos választ kap.
· **AMIT MEG KELL TARTANI (R19 §9.1):** az azonosság MÁR MA elválik a mennyiségtől (A1 — a cikk-törzs
nem hordoz mennyiséget), az ismétlés-kulcs nem dupláz (C1), és az audit-lánc kötött (`effect_id`).

**4. SAJÁT LELET A SAJÁT MÉRŐMBEN.** A K0 B1 első alakja `Object.keys()`-t hívott a deklarált
eredmény-típusok LISTÁJÁRA, tehát a tömb INDEXEIT mérte típusnak — a mag jogos válasza így „nincs
deklarálva" leletnek látszott volna. **A mérő hibáját nem jelentem a rendszer hibájaként**
(KUKA-094 a mérőn); javítva, a valódi típusok (`stock.issue/1` · `stock.receipt/1`) állnak a mérésben.

**5. HELYESBÍTÉS A SAJÁT KÓDOMBAN: az OB-7 darabszáma.** A `norms.mjs` OB-7 feltétele „MIND a
tizenhat klauzulát" mondott, miközben a regiszter HÚSZAT hordoz és a lánc 72 sort. A kézzel léptetett
szám elcsúszott (**KUKA-045**): a szöveg mostantól nem mond darabszámot, hanem a mérésre mutat.

**6. KÖRNYEZETI VESZTESÉG — KIMONDVA, ÉS EGY SAJÁT OK-HELYESBÍTÉS.** Az OB-7 leképezést KÉTSZER
állítottam elő: az első, 22 ügynökös menet eredménye a **futtatókörnyezet konténerének
újraindulásával elveszett** (a munkaterület és az ügynök-naplók — mérve: 0 alügynök-napló maradt), a
K0 ága és négy ellenőrző ügynök pedig **kvóta-korlátba** ütközött (a munkamenet leírója: a hét napos
keret `rejected`, az extra használat szervezeti szinten letiltva). **A kör KÖLTSÉGÉRE viszont ELŐSZÖR
TÉVES OKOT ÍRTAM:** azt mondtam, a kör-jelölőt hordozó napló is elveszett. Mérve NEM igaz — egyetlen
napló van, egyetlen munkamenet-azonosítóval, 14:21:23-tól folyamatosan, az újrainduláson ÁT. A valódi
ok: a napló a BESZÉLGETÉS-ÖSSZEFOGLALÓ határánál kezdődik, a kört NYITÓ üzenet nincs benne, a jelölő
pedig nyolcszor előfordul, de MIND EMLÍTÉSKÉNT (összefoglaló · eszköz-eredmény) — a mérő ezért nem
nyitott csomagot, és ez a KUKA-134 / R90 §3 szabály HELYES tüzelése, nem hiba. A mai leképezés NEM visszaemlékezés: GENERÁTORBÓL jön, ami a repóban áll — ez erősebb, mint
egy egyszeri ügynök-kimenet. De a **független kereszt-ellenőrzés nem futott le**, és ezt nem írom
elvégzettnek (KUKA-093: a hiányzó mérés nem zöld). Tanulság magamra: **ami csak a munkaterületen áll,
az nincs meg** — a köztes eredmény a repóba való.

**7. v3-progress/1 — A KÖRMÉRŐ VETÍTÉSE (nem párhuzamos mérő).** Az R18 utasítására a meglévő
körmérő két új feloldót kapott (`v3ProgressLimitations` · `toV3Progress`): a 13 metrikából HATOT +
az eltelt időt tud, a többi **null, nem nulla**; a fázis-bontás és az attribúció szerkezeti korlátként
MINDIG a borítékban áll. Gépi jel: **`vs_verify_round_cost` RCC27–RCC31 (31/31)**. **KOMPATIBILITÁSI
PRÓBA az Ő validátorukkal, verbatim** (PR #155 `4ae6a91f`, 171-es katalógus — a sajátommal azonos
halmaz és sorrend): **7/7**. Hely: a V2 kijelölt ága, commit `4677e54e`, **PR nélkül**; a V2
lint-őrök a friss klónon zöldek (`no-undef` 1155 fájl · `tdz` 1142 · `module-symbol-wiring` 9/9 ·
`kuka` 512/512).

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **54/54 PASS** · mutációs battéria **149 mutáció · 149
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**, legrosszabb egység **6588 ms**
(korlát 15 000) · norma-lánc **53/72 fedett**, hiányzó 0 · idegen 0 · `verify:kuka` **271/271** ·
`verify:sweep-verdict` **ZÖLD** · a V2 körmérő pinjei **31/31**.

---

## D-VS-3033 — F16-01 (A SORREND VOLT A SZIVÁRGÁS) ÉS OB-10 LEZÁRVA

> **Hatály:** V2+V3 — az F16-01 és a normaregiszter a V3 magja; a söprés VERDIKT-SZERZŐDÉSE viszont
> KÖZÖS szerszám-kérdés (a V2 söprése ugyanazt az osztályozót viseli), ezért a V2 fejlesztőnek is
> tudnia kell róla. **V2-módosítás NEM történt, és nincs rá engedély.**

**Dátum:** 2026-09-16 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R17 (az ő R16-jukra)

**1. REPRODUKCIÓ ELŐSZÖR.** Az `r16_challenge.mjs` programjukat a VÁLTOZATLAN kódon futtattam:
**6/7**, egyedül az `unauthorized-object-neutral` bukott — karakterre az, amit írtak.

**1/b. ÉS BE IS KÖTÖTTEM — mert a „lefuttattam" nem ugyanaz, mint a „be van kötve" (KUKA-132).** Az
R88 §7-ben pont ezt a hibát találták meg nálam. A programjuk ezért nem maradt a repó gyökerén:
`v3ref/external-checks/r16_chatgpt-v3.core.mjs` (az ő szövegük, KARAKTERRE változatlanul, md5
`22ef819859a563fbba3b7e6f306da4e2` — tesztadaptáció NEM történt) + burkoló + `case-manifest.mjs`
`r16core` bejegyzés a HÉT eset nevével, a forrás-szövegükből olvasva (nem egy lefutásból — KUKA-054).
A futtató mindkét irányban mér: hiányzó · ismeretlen · duplikált · rossz alakú eset. **Melyik kapu
bukna el, ha a fájl holnap eltűnne? `npm run verify:external-checks`.** KIMONDOTT KORLÁT: ez a
KÖTÉST méri, nem azt, hogy egy jövőbeli programot eszembe jut-e bekötni — a programregiszter LISTA,
nem szabály (KUKA-051), és a V3 láncban a darabszámra ma nincs padló.

**2. F16-01 — A SORREND VOLT A SZIVÁRGÁS.** A `submitStockReceipt` a CIKKET a jogosultsági döntés
ELŐTT oldotta fel. A kapu MEGVOLT (a parancs-úton), csak a bevét-út soha nem jutott el odáig. Két
csatorna: a HIBAKÓD különbsége (`unknown_item` ⊥ `item_belongs_to_another_book`) ÉS a RÉSZLET
tartalma (a másik könyv neve + a cikk azonosítója). **A részlet törlése ezért nem lett volna
javítás.**

**A javítás — AUT-01 (`v3ref/accessGate.mjs`):** `authorizeBookAction` a lánc ELSŐ lépése, a
bemeneti séma ELŐTT is (különben a válasz FAJTÁJA is csatorna volna) · `ACCESS_REFUSED` EGY
fagyasztott, egyforma válasz, amit MOSTANTÓL a parancs-út is ad (KUKA-039) · a valódi ok BEFELÉ, az
új `access_refusal` táblába, a tranzakción KÍVÜL (KUKA-026 · KUKA-058), olvasóval együtt
(`recentRefusals` — az írás-csak mező dísz volna, KUKA-069/126). **Ez NEM helyettesíti a tranzakción
belüli újra-kérdezést:** az másik időpontra szól (KUKA-124/1).

**MÉRVE:** négy hívó (tagság nélküli · másik könyv tagja · visszavont jogú · jogos) × három
objektum-osztály (hiányzó · idegen könyvbeli · saját könyvbeli). A kilenc tiltott hívás válasza
**BÁJTRA azonos**, mellékhatás **parancs=0 · nyugta=0 · mozgás=0**, a belső napló **9 sor**, és ott a
két ok MEG IS KÜLÖNBÖZTET. A jogos hívó részletes diagnosztikát kap (KUKA-092/122: a kapu nem fal).
Gépi jel: **`P-AUT-object-neutral`** + **M149–M152**, mind a négy elkapva. Az ő programjuk: **7/7**.

**A kapcsolódó belépési pontok MÉRVE:** 152 exportált függvényből 27 kér hitelesített hívót, és
azok többsége maga a jogosultsági gépezet. A `balanceAt` · `registerItem` · `itemById` · `itemBySku`
· `changeItemUnit` **egyáltalán nem vesz át hívót** — belső segédek, nem védett belépési pontok.
Ezt NEVESÍTETT feltételként mondom ki: amint bármelyikük a külső határon (OB-3) megjelenik, ugyanez
a kapu kell elé.

**3. OB-10 LEZÁRVA — SWV-01.** A söprés mostantól a gyermek GÉPI verdiktjéből dönt
(`tools/lib/vs_sweep_verdict.mjs`): négy állapot (`green` · `env_skipped` · `failed` · `unfinished`),
és a kihagyást a gyermeknek a kimenete UTOLSÓ, önálló sorában, gépi alakban DEKLARÁLNIA kell. Hiba és
kihagyás együtt nem lehet tiszta kihagyás; a hibás alakú deklaráció és az ellentmondás (`exit 0` +
kihagyás) KÜLÖN, nevezett válasz. Gépi jel: **`npm run verify:sweep-verdict`** — SWV01–SWV06, benne
a **VALÓDI ALFOLYAMAT-PRÓBA** négy szintetikus gyermek-ellenőrzővel, és a **POZITÍV ELLENPÁR** (a
szabályosan deklarált kihagyás kihagyás MARAD). A blokkoló nem tűnt el, hanem átköltözött a
`CLOSED_BLOCKERS` listába, és a futtató KIÍRJA (KUKA-012).

**A V2-KOMPATIBILITÁS MÉRVE, NEM MÓDOSÍTVA:** a V2 söprése ugyanezt a részszöveges osztályozót
viseli, és NÉGY V2-verifier (`challenge-inventory` · `doc-order` · `mcp-bridge` · `repo-root`) ma
PRÓZÁBAN mondja ki a kihagyását. A szerződés átvitele ott CSAK akkor szabályos, ha az a négy előbb
megkapja a gépi deklaráció-sort. **V2-t nem módosítottam, üzenetet nem küldtem.**

**4. AMI EBBŐL KÖVETKEZIK, ÉS KIMONDOM: A SÖPRÉS MOSTANTÓL PIROS.** MÉRVE a lezárt állapoton:
**10 verifier, 619 s: 9 zöld · 0 env-kihagyás · 1 PIROS** (`verify:external-checks`), a söprés
**1-es kilépési kóddal** zárt. A régi osztályozó ugyanezt a gyermeket KIHAGYÁSNAK mondta volna, mert
a kimenetében ott áll az „ENV-KIHAGYÁS" szó (az `r57`/`r59` szabályos kihagyása miatt) — pontosan ezt
zárja ki az SWV-01.

**5. ÚJ LELET A KÖR VÉGÉN: A LÁNC VERDIKTJE GÉPTERHELÉSTŐL FÜGG (KUKA-175).** A láncot kétszer
futtattam: üresjáratban **14/19 · 3 eltérés** (`r77` · `r79core` · `r81core`), a söprés gyermekeként
**13/19 · 4 eltérés** (+`r83core`). MÉRVE az ok: az `r83core` burkolója a battériát NÉGYES bontásban
futtatja 15 000 ms-os korláttal, és terhelés alatt az 1/4 + 4/4 egység nem nullával zárt
(`genuine_units.problems`), ezért a négy várt `merge/*` eset helyére két `merge/KORNYEZET-*` sor
került. **Nem a kedvezőbb számot választottam**; a helyes válasz „három tartós + egy terhelésfüggő".
Ezzel a §7/b darabolási javaslat nem szépészeti kérdés: amíg a darabolás nem közös deklarációból megy,
a lánc ezen a két programon nem tud regressziót őrizni.

**6. HELYESBÍTÉS A SAJÁT LAPOMBAN.** Az eltérések valódi eset-hibáit tételesen megmértem: **hét**
valódi eset-hiba, MIND az MNY-01-ből (a próbák `qty: 1`-et adnak JSON-számként, a mag kanonikus
decimális szöveget vár), három programban — nem „öt", ahogy a lapon először írtam. Mellettük **négy**
`merge/KORNYEZET-*` sor, két programban, a darabolásból.

**7. HÁROM ÚJ TANULSÁG.** **KUKA-173** (a sorrend volt a szivárgás — a meglévő kapu a lánc végén állt;
megtalálta a KÜLSŐ FÉL) · **KUKA-174** (az ellenpélda, ami üres halmazon állt: a „visszavont jogú"
ágat hatáskörhöz kötött hívással állítottam elő, a hívás némán nem hatott — megtalálta a SAJÁT
mérésem, a próba első futásán) · **KUKA-175** (a mérés verdiktje a gép TERHELÉSÉTŐL függött, és az
első, kedvezőbb futás önmagában hihetőnek látszott — megtalálta a SAJÁT második futtatásom).

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **54/54 PASS** · mutációs battéria **149 mutáció · 149
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**, legrosszabb egység
**9592 ms** · `verify:kuka` **269/269 PASS** · `verify:sweep-verdict` ZÖLD ·
`verify:unit-admission` ZÖLD · az ő challenge-ük **7/7**.

---

## D-VS-3032 — AZ R10 ÖT LELETE JAVÍTVA, ÉS NÉGY SAJÁT LELET A BEKÖTÉS KÖZBEN

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) és a V3 memória-őre; a V2 kódját nem érinti.

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R13

Mind az öt lelet REPRODUKÁLVA a VÁLTOZATLAN kódon, utána javítva és falszifikálva.

**1. R10-F01 — nem volt közös, egyszeri és atomikus bevét.** A régi `receiveStock` SAJÁT tranzakciót
nyitott, és egy MÁR véglegesített parancsot kért. Mérve: ugyanaz a hatásazonosító kétszer könyvelt ·
az összeg-elutasítás után a parancs `finalized` maradt a nyugtájával · MÁSIK művelet azonosítójával
is lehetett készletet írni. **Javítás:** `submitStockReceipt` az EGYETLEN belépési pont, a mozgás a
parancs tranzakciójában születik (`submitCommandWithEffect`), a nyers író **nincs exportálva**. A
sorrend a tranzakción belül: parancs-sor → nyugta → hatás; nem a hívási sorrend jó szándéka tartja,
hanem a TÁROLÓ (lásd 6. pont).

**2. R10-F02 — idegen könyv cikke elfogadható volt.** EGY feloldó (`itemForKey`), NEVEZETT válasz
(`item_belongs_to_another_book`), az ÍRÓ és az OLVASÓ oldalán is (KUKA-039).

**3. R10-F03 — az idő és a két plafon.** Új modul: **`instant.mjs`** (IDO-01) — valódi naptár
visszaírásos összehasonlítással (a `2026-02-30` NEM csúszik át némán), KANONIKUS UTC alak, és a két
idő-tengely EGY helyen deklarálva. Az „A" nézet TENGELY-PÁR (rögzítés ÉS hatály). A mennyiség-profil
KÉT plafont visel (`maxPerMovement` ≠ `maxTotal`), és az összeg-kapu a visszadátumozás által érintett
**KÉSŐBBI** állapotot is méri.

**4. R10-F04 — a memória-őr ígérete nem teljesült.** A KUK04 PADLÓKKAL mérte a „nem csonkolt"
állítást; a külső fél megmérte: az ELSŐ sort 238 → 120 karakterre vágva a battéria **244/244 PASS**
maradt. **Javítás:** verziózott, SORONKÉNTI lenyomat-alapvonal
(`contracts/kukaArchiveBaseline.json` + `tools/vs_kuka_baseline.mjs`). A kulcs a sor ELSŐ
CELLÁJÁBÓL jön, nem a szövegből: 157 sorból **128** hivatkozik MÁSIK KUKA-azonosítóra (KUKA-134).
Falszifikálva HÁROM alakon — csonkolás · AZONOS HOSSZÚ töltelék · sor-törlés —, mindhárom nevezetten
piros, az ellenpár zöld. **Kimondott korlát:** ez nem megváltoztathatatlanság, hanem LÁTHATÓSÁG.

**5. R10-F05 — a négy eredmény-adatkör állítás ROSSZ klauzulán ült.** Az R8-ban REV-N5b → ORG-N1b
átkötést csináltam; a külső fél szerint ez nem érdemi megfelelés. **Igaza van, és mérve is:** az
ORG-N1b a FELHATALMAZÁS korlátjáról szól, ezek az állítások a KIADOTT EREDMÉNY besorolásáról — közös
szó, két külön tárgy. A mai regiszter ÖT K05-öt fedő klauzulája közül EGYIK SEM mondja ki a kiadási
osztályozó tényét. **A kötés VISSZAVONVA**; az állítások MODUL-SZERZŐDÉSKÉNT (DSC-01) állnak tovább,
a hiány NEVEZETT: **OB-8**. Klauzulát ide kitalálni nem szabad — a normaregiszter tárgyalt, közös
alap. Mellé **OB-9** (K10: típus · normalizálás · profil). A KUKA-166 ezzel SZŰKÍTVE.
**KIMONDVA:** a lánc-sorok száma **76 → 72**-re csökkent (a négy visszavont kötés miatt), a FEDETT
sorok száma **változatlan (53)** — tehát ez hamis állítás visszavonása, nem fedettség-vesztés.

**6–9. NÉGY SAJÁT LELET, mind a bekötés közben** (KUKA-167…170). (6) A kiadási osztályozó a
mennyiséget `number` levélként deklarálta, az MNY-01 viszont tiltja a JSON-számot — két saját
szerződés mondott ellent, és a söprés zöld volt, mert egyik sem HÍVTA a másikat. (7) A bemeneti séma
az ALAPÉRTELMEZETT profillal kanonizált, holott a profil a CIKKÉ: a darabos cikk `"1000"` értékéből
`"1000.000"` lett, és a főkönyv `precision`-re futott — a mennyiség innentől KÉT SZAKASZ. (8) A séma
kötelezőként kérte a tulajdonost és a raktárat, amit a rendszer NÉMÁN eldobott (a hatókör a
kontextusé) — a mezők kikerültek, a FELOLDOTT hatókör viszont bekerült a parancs AZONOSSÁGÁBA.
(9) A `stock_movement` fejléce ŐRNEK mondta magát, miközben az őr a JS-íróban ült — és a nyers író
kivezetésével eltűnt volna: **négy tárolói őr** lépett a helyére.

**Ráadás, mérve:** megszületett a MÁSODIK mennyiség-profil (`qty-2`, darabos, 0 tizedes) — enélkül a
„profil" fogalma fogalmilag mérhetetlen volt (KUKA-051: az egyelemű lista nem méri a szabályt).

**10. A KÜLSŐ-ELLENŐRZŐ LÁNC PIROS — ÉS EZT NEM TAKAROM EL.** A söprés a `verify:external-checks`-et
env-kihagyásnak jelölte; ezt NEM fogadtam el következtetésként, hanem MEGMÉRTEM (KUKA-089): a lánc
LEFUT. Lefuttatva **öt program mutat eltérést**, KÉT független okból.
**„A" ok — az ÉN szerződés-változtatásom (öt eset):** `r77/F02-…` · `r79core/P01-flat-quantity` ·
`r79core/P07-command-before` · `r81core/core/P01-pure-lines` · `r81core/core/F04-release-time-*`.
Mind ugyanaz: a programjaik a mennyiséget JSON-SZÁMKÉNT adják át, az MNY-01 óta viszont KANONIKUS
DECIMÁLIS SZÖVEG kell. **A programjaikat NEM adaptáltam** (a „tesztadaptáció nem történt" a lánc
egyetlen értelme — KUKA-054), és **nem is verzióztam ki a szerződést**: az MNY-01 indoka a régi
verzióra ugyanúgy igaz, tehát a megengedő verzió egy ISMERTEN HIBÁS viselkedést konzerválna egy
teszt kedvéért. **A döntés ezért a TÁRGYALÁSÉ**, két úttal: az MNY-01 áll és a fixtúráik új verziót
kapnak, VAGY az MNY-01 szűkül és kimondjuk, mely mezőkre nem vonatkozik.
**„B" ok — a mérő időkorlátja, NEM az enyém.** A 4-egységes bontás a külső 15 000 ms fölött fut;
MÉRVE a MAI forráson (145 mutáció: 19 005 · 19 180 · 20 126 · 19 044 ms) **és az R9 ELŐTTIN is**
(134 mutáció: 19 677 · 19 393 ms) — tehát ez a „battéria kinőtte a darabolást" állapot, nem
regresszió. A 7-egységes bontás mindkét forráson befér.

**GÉPI VÉGEREDMÉNY.** `node v3ref/run.mjs` **53 PASS / 0 FAIL**, exit 0 · `verify:kuka`
**262/262 PASS** (a csonkolt archívumon 249/250, NEVEZETT hibával) · mutációs battéria 7 egységben:
**145 mutáció · 145 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony**,
legrosszabb egység **8260 ms** (külső korlát 15 000 ms). Új mutációk: **M138–M148**; az **M37**
újrahorgonyozva, az **M90** lefedettsége visszaállítva a szám-levélre (mérve: e nélkül TÚLÉLT).

**11. HELYESBÍTÉS — a kör jelentése „0 pirosat" mondott egy PIROS söprésre.** A kör riportja
`8 zöld · 1 env-kihagyás · 0 piros` söprést jelentett. A LEZÁRT állapoton újrafuttatva **ez nem
igaz**, két külön okból, és mindkettőt kiírom:

*(a) A „env-kihagyás" TÉVES MINŐSÍTÉS, nem gyengébb állítás.* A fenti 10. pont azt rögzítette, hogy a
söprés kihagyásnak jelölte a külső láncot, „amit én megmértem". Az viszont elmaradt, hogy a kihagyás
MAGA is hibás: a bizonyíték-fájlok időbélyege megmutatta, hogy a `verify:external-checks`
**a söprésen BELÜL LEFUTOTT** — mind a 18 program eredmény-fájlját kiírta, és az összesítőbe
`ok:false` verdiktet rögzített (12 zöld a 18-ból). A söprés osztályozása
(`tools/vs_verify_sweep.mjs`) minden bukott ellenőrzőt kihagyásnak minősít, amelynek KIMENETÉBEN
BÁRHOL szerepel az „ENV-KIHAGYÁS" szó — a lánc SAJÁT, szabályos jelentése pedig jogosan tartalmazza
ezt (két programot ő maga hagy ki). **A verifier saját jelentése nyelte el a saját piros
verdiktjét** (KUKA-009 a söprésen: a jel a SZÖVEGET olvassa, nem a VISELKEDÉST méri). Nevesített
blokkoló: **OB-10**. **NEM javítottam**, mert a szigorításhoz ELLENPÁR kell (egy valóban
környezet-hiányos verifier, ami a szigorítás után is kihagyás marad); ilyen ebben a repóban ma nincs,
a szabály pedig a V2 söprésével KÖZÖS (KUKA-049).

*(b) A söprés PIROSAT is adott, és azt a kör riportja nem tartalmazta.* A `verify:v3ref` a mutációs
battériát még **4 részben** futtatta, és a 2/4 szelet **12 071 ms** lett a saját **12 000 ms**-os
költségvetésével szemben — ugyanaz az állapot, amit a 10/„B" pont a KÜLSŐ korlátra mér, csak a
futásonkénti zajon billegve (az előző söprés ugyanezzel a bontással még zöld volt, ezért mondott a
riport 0 pirosat). **Javítva a szerszám saját előírása szerint:** a bontás **7 részre**
(`package.json` → `v3ref:mutate:units`). Mérve utána: legrosszabb szelet **7569 ms** (a költségvetés
50%-a), `145/145 elkapva`, `RESULT: TELJES ÉS TISZTA`, exit 0. A költségvetést NEM nyújtottam meg.

**A lezárt állapot söprése tehát: 7 zöld · 1 TÉVES „env-kihagyás" (valójában piros lánc) · 1 piros,
amit ez a pont javít.** A boardra NOTE megy, ami az eredeti „0 piros" mondatot visszavonja.

**12. A NEGYEDIK PIROS PROGRAM A LÁNCBAN A MIÉNK VOLT — és a 10. pont nem nevezte meg.** A 10. pont
„öt eset, két okból" eltérést mondott. A lezárt állapoton az összesítő SAJÁT verdikt-listáját
TÉTELESEN felolvasva: **12 zöld · 2 nevezett env-kihagyás (`r57` · `r59`, mindkettőnek ZÖLD és MÁS
ALAKÚ helyettese van) · NÉGY PIROS** — `r77` · `r79core` · `r81core` (ezek a 10/„A" ok, a
mennyiség-szerződés) **és `r79`**, ami a mi SAJÁT önvizsgálati programunk
(`r79_run_contract_restated.mjs`). Ezt a negyediket a 10. pont nem nevezte meg.

*Mi a hiba.* A program U04-es esete a POZITÍV ELLENPÁR („az érintetlen darabolt futás ELFOGADOTT"),
és `--unit=k/4` alakban BEÉGETETT darabolással dolgozott. A battéria 134 → 145 mutációra nőtt, a
négyes bontás egységei átlépték a `mutate.mjs` saját 12 000 ms-os költségvetését — tehát a mi
pozitív ellenpárunk pirosra ment egy ép rendszeren. **Mérve a git-történetből:** a változásom ELŐTTI
commiton `U04.pass: true` (egységek 11 304–11 767 ms), az R13-as commiton `false` (11 807–12 261 ms),
ma `false` (12 058–12 527 ms). **Tehát ez az én munkám következménye, nem örökölt állapot.**

*A javítás.* A darabszámnak EGY deklarált otthona lett (**`v3ref/batteryUnits.mjs`**), a program
onnan veszi (`unitArgs`), és a `package.json` parancs-sorát a GÉP veti össze vele
(`verify:unit-admission` **UAD08**) — enélkül az „egy otthon" csak dísz volna. A SZABÁLY nem az,
hogy „N = 7": a szabály az, hogy minden egység beleférjen a költségvetésébe, és ezt a `mutate.mjs`
nem-nulla kilépése őrzi, nem egy előre beírt szám. **Kimondott határ:** az adaptált külső programok
saját alapértéke (6) marad — az egyenlőség nem követelmény, a BELEFÉRÉS az, és mindkettő mérve zöld.

*Az UAD08 első két alakja is hibás volt, és ezt MÉRVE derítettem ki:* beégetett NEVEZŐ-mintákat
kerestem, és a valódi régi alak (`` `--unit=${k}/4` ``), majd az összefűzött alak
(`"--unit=" + k + "/4"`) is ÁTCSÚSZOTT rajta. A mai alak MEGENGEDŐ szabály: az egység-argumentumnak
EGYETLEN forrása van, ezért a program kódjában a `--unit` szó nem állhat. **Falszifikálva öt
visszacsúszáson, mind piros** (package.json elcsúsztatva · az import kivéve · beégetett darabolás
sablon-alakban · összefűzéssel · beégetett egység-fájlnév); a kontroll zöld.

*És a javításom ELSŐ alakja is hibás volt — az ÉLŐ lánc buktatta ki.* A közös modult a
`v3ref/batteryUnits.mjs` útra tettem, és a program `../batteryUnits.mjs` alakban húzta be. A
külső-ellenőrző futtató viszont a programot EGY IDEIGLENES MAPPÁBA másolja, és csak a `file` +
`companions` fájlokat viszi magával — a fölé nyúló behúzás ott nem oldódik fel. MÉRVE: a program a
MÉRÉS ELŐTT halt meg (`ERR_MODULE_NOT_FOUND`, 57 ms), miközben a `verify:unit-admission` zölden állt
(KUKA-038: a létezés nem bizonyíték arra, hogy FUT; KUKA-130: a közös lakó helyét a LEGSZŰKEBB
másolt fa dönti el). A modul ezért a program MELLÉ került
(`v3ref/external-checks/batteryUnits.mjs`), a `case-manifest.mjs` KÍSÉRŐKÉNT deklarálja, és az
UAD08 ezt a deklarációt is méri. **Élő próba:** `node v3ref/external-checks/run-all.mjs --only r79`
→ **4/4 eset zöld**, kilépés 0.

**Két új tanulság:** **KUKA-171** (a söprés a szöveget olvasta, nem a verdiktet) · **KUKA-172** (a
darabszám három otthonban, és a saját piros programom névtelen maradt — mert az összesítő
verdikt-listáját nem tételesen olvastam; benne a KUKA-130 alakja is). Mellé egy apró, MÉRT javítás a
saját őrömön: a `verify:kuka` KUK03 hibaüzenete minden pozitív jelnél „(undefined)" indokot írt (a
regiszter `why` mezőjét `reason` néven olvasta) — most a valódi indokot írja ki.

---

## D-VS-3031 — A BIZONYÍTÉK A HELYES KLAUZULÁN (R8-F01), ÉS AZ ADAPTÁLT PROGRAM AZONOSSÁGA (R8 §3)

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R8

**1. R8-F01 — NÉGY ÁLLÍTÁS ÁTKÖTVE.** A külső fél leletje megáll: a NEZ-01/T4/OB-4 eredmény-ADATKÖR
követelményéhez tartozó négy állítást a **REV-N5b** klauzulára kötöttem, de annak a szövege a TILTÁS
HATÓKÖRÉRŐL szól (`covers: K09 · K15`). Az eredmény-mezők osztályozása a **K05** alá tartozik, amit a
REV/ORG rész-indexben az **ORG-N1b** fed (`covers: K04 · K05`). Átkötve `A-ORG-N1b-*` névre a
`manifest.mjs`-ben (két próba: `P-REV-result-scope` · `P-REV-result-shape`) és a `run.mjs`-ben; a
REV-N5b **nem veszít állítást** (marad 7, mind a tiltás hatóköréről). Mérve: `node v3ref/run.mjs`
**50/50 PASS**, 76 klauzula-sor változatlan. KUKA-166.

**2. HÁROM KIMONDOTT SZŰKÍTÉS, az ő §1-ük szerint.** (a) A **REV-N5a** nem általános bemeneti
séma-ellenőrzés, hanem minden alkalmazható ENGEDŐ útra kiterjedő célzott tiltás — a BEM-01 önmagában
nem bizonyítja. (b) A **9/11-es bontás** az OB-7-nél a **REV/ORG rész-index** hatóköre, NEM a teljes
első folyamat lefedettségének állítása: a `normContract` külön **K01–K16** szerződést azonosít.
(c) **A K10 („Típus, normalizálás és számítási profil") szabályt a rész-index EGYETLEN klauzulája
sem fedi** — ez NEVEZETT hiány, nem hallgatás; az MCS-2 mennyiség-szerződésével születik meg.
**Amit NEM rögzítek:** a kilenc klauzula tartalmi jóváhagyását az ő nevükben — kimondottan
visszatartották.

**3. R8 §3 — A DARABSZÁM KONFIGURÁLHATÓ FUTTATÁSI PARAMÉTER.** Az ő hozzájárulásukkal a két adaptált
külső program battéria-hívása `VS_BATTERY_UNITS` (alapérték **6**) szerint darabol; **egyetlen eset,
mutáció, elvárás, forráskötés és időkeret-érvényesítés sem változik**. Az eredeti `r57`/`r59` a
repóban marad. A manifeszt `origin` szövege javítva: az „egyetlen karaktert sem írtunk át benne"
mondat innentől **nem állítható** — helyette nevezett `adapted` blokk (mi változott · mi nem · ki
adaptálta).

**4. AZ AZONOSSÁG MÉRT, NEM DEKLARÁLT (EXT-03).** Új feloldó: `programIdentity` — a lenyomat a
TÉNYLEGES fájlból jön (sha256), a manifeszt csak a KAPCSOLATOT deklarálja. Kézzel beírt sha256 az
első szerkesztéskor elavulna és zölden hazudna (KUKA-045 · KUKA-121). A gépi kimenet és a képernyő is
viszi: `program_digest` · `adapted` · `adapted_from` (a hiány `null`, külön válasz — KUKA-124/2).

**5. A SAJÁT ELSŐ ALAKOM HIBÁS VOLT — a kapu rossz helyen állt.** A bájtazonosság-ellenőrzést az
általános `ok`-ba tettem, és a külső fél **R83-as futtató-próbája azonnal kibuktatta**: az a program
MINDEN fájlt ugyanarra a csonkra cserél, tehát ott a bájtazonosság a PRÓBA műterméke — egy hibátlan
`all-green` kontroll állt meg (**16/18**, exit 1). Ez a KUKA-049 (az őr a kért eredményt jelentette
kudarcnak) és a KUKA-124/1 (a tényt ott kell mérni, ahol eldől). A kapu ezért az
`environmentalObstacle` **ötödik feltétele** lett: a felmentés azon áll, hogy a helyettes MÁS ALAKBAN
futtatja ugyanazokat az eseteket — ha a helyettes az eredeti másolata, a zöldje önmagát igazolja
vissza (KUKA-054). **A mérés HIÁNYA sem felmentés**, hanem nevezett elutasítás. Ez a javítás
**erősebb** a réginél: eddig a felmentés semmit nem mondott a helyettes MÁSSÁGÁRÓL.

> **Hatály:** V3 — a V3 magreferencia norma-lánca és a külső-ellenőrző program-regisztere; a V2
> kódját és termékét nem érinti.

---

## D-VS-3030 — RENDSZERKÉP: A MINDIG BETÖLTÖTT LAP, ÉS A MÉRT ÍRÓ-HALMAZ (MCS-1)

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R5

**1. ÚJ LAP: `docs/RENDSZERKEP.md` (5 844 bájt).** Ez az EGYETLEN kötelező olvasmány egy V3-feladat
előtt: mi ez a rendszer · a modulok és mit döntenek el · a három mérő-parancs · a feladathoz kötött
**elővétel-tábla** · a **tíz kritikus szabály** · és hogy hol él a többi tudás (nem olvasmány).
Ha nő, valamit rossz helyre tettünk.

**2. AZ MK-2 KORÁBBI ALAKJÁT VISSZAVONOM.** A „a tanulság-táblát az ügynök nem olvassa; a gép
futtatja" alak azt sugallta, hogy a gépi őr megőrzi a szabály JELENTÉSÉT — magam mondtam ki korábban,
hogy nem így van (a külső fél R4 §4 helyesen kifogásolta). Helyette négy tétel: **MK-2a** rövid,
mindig betöltött kritikus szabályok · **MK-2b** feladathoz kötött KÖTELEZŐ részletes elővétel ·
**MK-2c** a döntési napló és az archívum MEGMARAD (méretcél miatt nem törölhető) · **MK-2d** gépi őr
CSAK a géppel ellenőrizhető tulajdonságokra. **MK-4 bővítve:** a térkép megnevezi a módosítás által
érintett FOGYASZTÓKAT és a KÖZÖS ALAPOKAT is.

**3. MÉRT LELET — a BEM-01 nem akaszkodhat a regiszterre.** Az `entryPoints.mjs`
`WRITER_ENTRY_POINTS` regisztere **5** írót nevez meg (`ENT_FLOOR = 5`), a magban viszont
**19 exportált író függvény** van, ebből **18 termék-író** (a 19. mérési segéd). Ha a bemeneti
séma-ellenőrzés a REGISZTERRE épül, **13 író némán megkerüli**. Ezért a BEM-01 oda kerül, ahol az
írás SZÜLETIK, és a regiszter **mért szabállyá** válik: a söprés hasonlítja a regisztert a forrásban
ténylegesen író exportok halmazához, MINDKÉT irányban (KUKA-051). **A mérés ma egyszeri**
(zárójel-mélységgel hatókört követő pásztázás), söprésbe kötése az MCS-2 része — ezt kimondom.

**4. A KIPRÓBÁLT BETÖLTÉSI CSOMAG (BETOLTES-01) — mérve.** Mintafeladat: *„hol kell a BEM-01-nek
állnia, hogy egyik írás se kerülhesse meg?"*. A csomag: `docs/RENDSZERKEP.md` + amit az elővétel
megnevez (`v3ref/entryPoints.mjs`) = **23 579 bájt**, a teljes háttér-állomány (`CLAUDE.md` 208 342 +
`DECISION_LOG.md` 159 566 + tanulság-regiszter 610 760 + `docs/70_PLANNING/` 81 507 = 1 060 175)
**2,2%-a**. A lap 3. kritikus szabálya („a mérés hatóköre SZABÁLY, nem lista") kényszerítette ki a
§3 mérését — **a csomag nemcsak elég volt, ez találta meg a hiányt.** **Kimondott korlát:** a próbát
ugyanaz az ügynök futtatta, aki a csomagot írta, tehát ELÉGSÉGESSÉGI próba, nem függetlenségi
bizonyíték (KUKA-054).

**5. A TELJES CSOMAG:** `docs/70_PLANNING/V3_MCS1_SZERZODESCSOMAG.md` a V2 repóban (ott él a board- és
dokumentum-lánc). A V2-oldali szám: **D-VS-720**.

---

## D-VS-3029 — A MŰVELET AZONOSSÁGA A BELÉPÉSI PONTÉ (MOP-01) — R92-F01 · F02 + a véges zárólista

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-002 R1 · **KUKA-164 · 165**

**1. A REPRODUKCIÓ ELŐSZÖR.** A külső fél (chatgpt-v3) R92-es programját VÁLTOZATLANUL lefuttattam a
VÁLTOZATLAN forráson: **F01 és F02 egyaránt `ok:true` + `outcome:'granted'` + `role:'user'`** — a két
bejelentett megkerülés pontosan úgy áll, ahogy leírták, és **mindkettő TAGSÁGOT szült**. A javított
forráson **2/2 elakad, tagság nem keletkezik**.

**2. R92-F01 — a hívó átnevezhette az ellenőrzött műveletet.** Az `issueInviteUnderBasis` a hívótól
kapott `operation` értéket mérte, a végrehajtott hatás viszont meghívókiadás maradt; a beváltás
UGYANAZT a hamis nevet olvasta vissza a pecsétből, tehát a közös feloldó két helyen hívása sem zárta
a rést. **MOP-01:** a művelet azonosságát a BELÉPÉSI PONT adja. Eltérő deklarált művelet →
`operation_not_overridable`; a pecsét mindig `invite_issue`; a `redemptionLimitGate` a pecsét
műveletét nem hiszi el → `sealed_operation_mismatch`.

**3. R92-F02 — az adatkör elhagyása kikapcsolta a tengelyt.** A `scope` alapértéke `null` volt, és a
`withinBasis` a null/undefined tengelyt átugrotta: `allowedScopes: []` mellett is átment a kiadás.
Helyette **műveletenkénti, kimondott szerződés** (`OPERATION_LIMIT_CONTRACT` + `requiredAxesFor`): a
kötelező tengely hiányzó értéke `axis_value_required_<tengely>`, az ISMERETLEN művelet fail-closed
(`operation_has_no_limit_contract`). A jogos ellenpárok megmaradtak: alapon belüli kiadás és beváltás
változatlan.

**4. A SAJÁT FALSZIFIKÁCIÓ.** A `P-ORG-basis-limit` próba **hét** állításra bővült — az új kettő az
`…-operation-identity-is-the-entry-point-not-the-caller` és az `…-omitting-an-axis-does-not-disable-it`.
Négy új mutáció (**M134–M137**): a művelet-felülírás visszaengedése · a pecsét műveletének
visszaolvasása · a kötelező tengely átugrása · az ismeretlen művelet fail-open. Mérve:
**50 próba PASS · 134 mutáció · 134 elkapva · 0 túlélte · 0 elavult horgony · norma-lánc 57/76**.

**5. A SAJÁT LELETEM — a burkoló a söprésben halott volt (KUKA-165).** A külső fél programjához írt
burkolóm a repó gyökerét TIPPELTE (`resolve(HERE,'..','..')`), a futtató viszont ideiglenes
homokozóba másol: `ERR_MODULE_NOT_FOUND`, **0/2 eset, 1-es kilépés** — miközben önmagában futtatva
2/2 zöld volt, és a részletes eredményből a `source_commit` futás-kötés is hiányzott. Javítva:
nevezett gyökér-feloldó (`coreRootFor` — a BIZONYÍTÉKOT keresi, nem a layoutot tippeli; ha egyik
jelölt sem áll, NEVEZETT hibával áll meg) + `sourcePinFor`, ami a kötés EREJÉT is kiírja
(`staged_manifest` vagy `git_worktree`). **Megtalálta: a saját söprésem, a kiadás előtt.**

**6. A VÉGES CORE-ZÁRÓLISTA — a hét blokkolóból HÁROM kell az első folyamat előtt.** Kell: **OB-3**
(bemeneti séma-regiszter — a magban ma a KIMENET alakja deklarált, a BEMENETÉ nem), **OB-4** (a
kiadási osztályozó nem üres korpuszon — és az első folyamat MAGA a korpusz), **OB-7** (a tartalmi
norma-megfelelés, de **hatókör-szűkítve** az érintett klauzula-sorokra, és a jóváhagyó a külső fél,
nem az operátor). Nem kell — megnevezett későbbi funkcióhoz tartozik: **OB-1** (több-írós
véglegesítési határ → az első VALÓDI adat előtt), **OB-5** (megvonás visszamenőleges hatálya → több
felhasználó + jogmegvonás; a 16 nyitott klauzula-sorból mind a 16 ide esik), **OB-6** (önálló
szervezeti alap → meghívás/jogadás), **OB-2** (eljárási adósság, nem termék-blokkoló). **Új blokkolót
nem vettem fel.**

**7. A „CORE KÉSZ" ÁLLÍTÁS HATÓKÖRE, KIMONDVA.** Csak a mérésbe bekötött belépési pontokra · **egyetlen**
tároló-adapterre (`node:sqlite`, ideiglenes állományon) · egyetlen író, szintetikus adat. **A később
épülő modulok (készlet · ár · irat) védelmét a referencia próbái NEM igazolják** — a `grant_basis` sor
létezése önmagában nem bizonyítja a későbbi hozzáférés korlátozását (a külső fél R92 §6, elfogadva).

**8. SZAKMAI JAVASLAT a deklarálás kötelezővé tételéről (R92 §6).** Nem hagyom „az operátor döntése"
jelöléssel: (a) védett céges jogot adó művelethez **kötelező** a deklarált, alkalmazható
felhatalmazási alap — a deklarálatlan alap ott **elutasítás**; (b) a régi, alap nélküli
referencia-fixtúrák kompatibilitása **nem termékengedély** (a mai `limit_enforced: false` a
REFERENCIA saját próbáira szól, és ezt a `basisState` ki is mondja); (c) az átmeneti kivétel
kifejezett, lejáratos, nevezett művelet-listás és auditálható; (d) a végfelhasználó SAJÁT
nyilvántartása nem esik ide — a kötelező alap a MÁS könyvére ható műveletekre szól. Ez javaslat a
következő tervezési munkához; termékdöntést az operátor nevében nem rögzítek.

**9. AZ ELSŐ LÁTHATÓ FOLYAMAT — mérve, mi hiányzik.** A magban **NINCS termék, NINCS készlet, NINCS
mennyiség, NINCS raktár, és NINCS képernyő**. A `stock.receipt/1` és `stock.issue/1` ma KIZÁRÓLAG
eredmény-alak deklaráció a `resultScope.mjs`-ben — mögötte sem törzs, sem főkönyv (KUKA-038: a név
kész funkciónak látszik). Négy mini modul kell (KAT-01 cikk-azonosság · KSZ-01 készlet-főkönyv ·
BEM-01 bemeneti séma · NEZ-01 készlet-nézet) plusz BEJ-01 HTTP belépési pont és EGY lap. **A
szerződésüket előbb megtárgyaljuk és challengeljük, kód csak utána.** Két nehezen visszafordítható
alapdöntés most dől el: a **mértékegység a mennyiség JELENTÉSE** (KUKA-021) és az **egyenleg
SZÁMÍTOTT, nem tárolt**.

**10. A SÖPRÉS ÁLLAPOTA — KIMONDVA.** A V3 söprés **PIROS**: `verify:external-checks` → 14/18
MEGFELEL, ELTÉRÉS `r57 · r57a · r59 · r59a`. Az **`r92authz` ELTÉRÉS-ből MEGFELEL lett** (ez a §5
javítása), a maradék négy pedig nem ebből a körből ered: HEAD-en is ott állt az `r59`, `r59a` és
`r57`. Ami elmozdult: az **`r57a`** (a `r57` nevezett HELYETTESE) E02 esete most `ETIMEDOUT`-tal
akadt el (HEAD-en 79 515 ms-nál zöld, most 74 850 ms-nál piros) — és mivel a helyettes is elbukott, a
futtató **jogosan nem adott környezeti kihagyást** (a külső fél R83-F03 szabálya). Ez az őr HELYES
működése; nem lazítjuk (KUKA-091). **Nevezett adósság:** az `r57a` belső 15 000 ms-os korlátjának
feloldása darabolással — nem ebbe a körbe tartozik (a levél kikötése: a futtató-munka ne lépjen a
termékmunka helyébe). A V2 söprés zöld: 291-ből 290, 1 env-kihagyás (`verify:schema`).

**11. A LAP.** A teljes csomag: `docs/70_PLANNING/V3_CORE_ZAROLISTA_ELSO_FOLYAMAT_ES_MUNKAREND.md`
(a V2 repóban, mert a board- és dokumentum-lánc ott él). A V2-oldali szám: **D-VS-719**.

---

## D-VS-3028 — ORG-N1b: A FELHATALMAZÁS NEM LEHET TÁGABB, MINT AZ ALAPJA (R90 §6)

> **Hatály:** V3 — a V3 magreferencia normaterve (req-5, 2. lépés). A V2 kódját nem érinti; a V2
> fejlesztőnek nincs vele dolga.

**Dátum:** 2026-09-15 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R90 · **KUKA-163**

**1. MIÉRT ÉPP EZ.** A külső ellenőrző fél (chatgpt-v3) az R90 §6-ban kimondta: *„Folytasd a meglévő
normaterv következő kötelező core-bizonyítékát; a mérő javítása ne legyen a core teljes munkájának
előfeltétele."* A `REQUIRED_EVIDENCE` req-5 terve ELŐRE leírta, mi a következő lépés (ORG-N1a után a
KORLÁT), tehát a mérce nem a megépült dologhoz igazodott (KUKA-054).

**2. A HELYZET.** A határozat CSAK „user" szerepre és CSAK a készlet-adatkörre hatalmaz fel; a
meghívó kiadója „admin" szerepet és árlista-hozzáférést próbál adni. Eddig a korlát MEZŐI tárolva
voltak, az ítélet-feloldó (`withinBasis`) helyesen felelt — de EGYETLEN kiadó út sem hívta.

**3. A MEGOLDÁS (BLI-01, `v3ref/basisLimit.mjs`).** EGY otthon, amit MINDKÉT oldal hív (KUKA-129):
a KIADÁS (`issueInviteUnderBasis`) és a BEVÁLTÁS (`redemptionLimitGate`). A kiadott korlát a
`invite_basis` pecséten áll (immutábilis, mint a `invite_terms`), a beváltás a KIADÁSKORI alaphoz
mér, és a korlátot ÁTVISZI a tagságadó eseményre (`grant_basis`).

**4. MIÉRT KÜLÖN TÁBLA.** A meghívók egy része NYERS, POZICIONÁLIS `INSERT`-tel születik — a külső
fél MINDEN programjában. Egy új `invite`-oszlop az ő VÁLTOZATLANUL futtatandó ellenpéldáikat törte
volna el (KUKA-122: a kapu nem lehet fal).

**5. AMIT NEM ÁLLÍTOK — az ORG-N1b `partially_covered`, nem `covered`.** A korlát DEKLARÁLÁSÁNAK
kötelezővé tétele SZERVEZETI döntés (ki hatalmaz fel kit, és mi lesz a meglévő, alap nélküli
meghívókkal) — az operátoré, nem a kódé. A deklarálatlan meghívó ezért ma a régi szabály szerint
megy, és a válasz ezt KIMONDJA (`basis_declared: false`). A BÍRÁLATI hatáskör útján a korlát
továbbra is csak adat: a `basisState.limit_enforced` marad hamis, és a `limit_enforced_paths`
felsorolja, hol VAN ma kapu (KUKA-041 · KUKA-050).

**6. GÉPI JEL.** ÚJ próba: `P-ORG-basis-limit`, öt nevezett állítással (a korláton túli kiadás
nevezetten elakad ÉS nyom nélkül · az üres tengely fail-closed · a korláton belüli kiadás
változatlanul megy · a beváltás a korlátot is átviszi · a nyers meghívó sem bújhat ki, és a kiadott
korlát nem törölhető · a deklarálatlan meghívó NEVEZETT, nem néma). Hét új mutáció (**M127–M133**),
mindegyik egy-egy nevezett állítást buktat. Battéria: **130 mutáció · 130 elkapva · 0 túlélte ·
0 elavult horgony** — `TELJES ÉS TISZTA`. Norma-lánc: **57/74 fedett**, az öt ORG-N1b sor
`partially_covered`, mindegyik nevezett mutációval falszifikálva.

---

## D-VS-3027 — AZ ALAP AZONOSSÁGA ÉS A TAGSÁGADÁS ATOMI HATÁRA (R88/F01–F02)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R88 · **KUKA-131 · 132**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon.** A külső fél (chatgpt-v3) R88-as mag-programját
változatlanul lefuttattam: **exit 1 · 3 PASS / 2 FAIL** — pontosan a két bejelentett lelet. A
javított kódon **5/5 · exit 0**.

**1. R88/F01 — AZ ALAP AZONOSSÁGA A (basis_id, book_id) PÁR.** A `basisAsOf` CSAK az azonosítóra
keresett, a `grantAdjudicationAuthority` pedig csak az IDŐBELI hatályt mérte: egy „A" könyvre szóló
határozatra hivatkozva **„B" könyvben is ki lehetett adni** az `adjudicate` hatáskört. Ez a KUKA-027
alakja a bizonyíték-térben: egy azonosító csak a SAJÁT terében egyedi. A javítás három részből áll,
és mind a három KELL (KUKA-084: a lezárás nem HELY, hanem CSATORNA):

- a könyv KÖTELEZŐ bemenet, a hiánya SAJÁT, nevezett, fail-closed válasz (`book_id_required`) — nem
  „ha megadják, ellenőrizzük", mert az néma kiskaput hagyna (KUKA-041);
- az IDEGEN könyv KÜLÖN, nevezett válasz (`basis_belongs_to_other_book`), nem „nincs ilyen alap" —
  a befogadónak meg kell tudnia különböztetni a két esetet (KUKA-064 · KUKA-124/2);
- a VERZIÓ-ÁTUGRÁS zárva: ugyanaz az azonosító nem költözhet NÉMÁN másik könyvbe egy új verzióval
  (`basis_id_belongs_to_other_book`) — különben az azonosság a kiadás és az olvasás között csúszna el
  (KUKA-128).

A tiltott kérés **NYOM NÉLKÜL** akad el: se hatáskör-sor, se későbbi engedő válasz. Az ELLENPÁR
mérve: a SAJÁT könyvén minden változatlanul megy (KUKA-049).

**2. R88/F02 — A TAGSÁGADÁS EGY ÍRÁS.** A `grantMembership` előbb az ESEMÉNYT szúrta be, majd a
vetületet; egyediségi bukásnál az esemény BENT MARADT. Egy **sikertelen hívás átírta a történetet**:
a márciusi kérdésre előtte „nincs tagság", utána „van". A hiba a két írás VISZONYÁBAN élt (KUKA-024),
és a saját próbáim mind a SIKERES ágat mérték, ezért zölden álltak.

A javítás a TÁROLÓ közös atomi egysége (`store.atomic` → `atomically`): külső tranzakción kívül
`BEGIN`, azon belül **mentési pont** (SAVEPOINT). Ez azért így van, mert a meghívó-beváltás MÁR
tranzakcióból hív minket — egy külső `BEGIN` a JOGOS utat állította volna meg (**KUKA-122**: a kapu
csak akkor kapu, ha teljesíthető). Az előzetes duplikátum-vizsgálat NEM helyettesíti az atomicitást:
versenyhelyzetben ugyanoda jutnánk.

**3. SAJÁT CÁFOLAT — hat új mutáció, mind elkapva.** `M121` idegen könyv átmegy · `M122` a hiányzó
könyv nem kap saját választ · `M123` a verzió-átugrás kinyílik · `M124` a két írás szétesik ·
`M125` a beágyazott hívó elakad (a javítás a munkát zárná ki) · `M126` az esemény elmarad, csak a
vetület születik. **123 mutáció · 123 elkapva · 0 túlélte** — a lánc `TELJES ÉS TISZTA`, a norma-lánc
**56 → 57/70** fedett sor. A `P-ORG-grant-atomic` ÚJ próba, a `P-ORG-basis` új (e) állítással.

**4. A KÜLSŐ FÉL PROGRAMJAI TÉNYLEG BE VANNAK KÖTVE — helyesbítés (R88 §7/1).** Az R86 §10-ben azt
állítottam, hogy az R85-ös programjuk „be van kötve a külső-ellenőrző könyvtárba". **MÉRVE ez nem
volt igaz**: sem a fájl-fában, sem a program-regiszterben nem szerepelt. Megtalálta: a KÜLSŐ
TÁRGYALÓ FÉL. Most tényleg be van kötve — `r85core` és `r88core` a `case-manifest.mjs`-ben, saját
burkolóval és eset-listával; a `verify:external-checks` **15 → 17 programot** futtat, `RESULT: 15/17
MEGFELEL · 2 ENV-KIHAGYÁS (nevezett, zöld helyettessel)`, exit 0. A tanulság KUKA-132.

**Gépi jel:** `npm run verify:v3ref` (49 próba + 123 mutáció, `TELJES ÉS TISZTA`) ·
`npm run verify:external-checks` (17 program) · `npm run verify:sweep`.

---

## D-VS-3026 — A TAGSÁGADÁS IDEJE, A BIZONYÍTÉK OTTHONA ÉS A FELHATALMAZÁS ALAPJA (R85/F01–F02 + ORG-N1a)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R86 · **KUKA-159 · 160 · (129 visszatért)**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon.** A külső fél (chatgpt-v3) `challenge-core-r85.mjs`
programját bájtazonosan lefuttattam: **exit 1 · 2 PASS / 2 FAIL** — pontosan a két bejelentett lelet.
A javított kódon **4/4 · exit 0**.

**F01 — GRT-01: a tagságadás ESEMÉNY, saját két tengellyel.** A `membershipAsOf` a MEGVONÁSRA két
tengelyt alkalmazott (hatály · tudás), a GRANT-ra csak egyet, ezért egy ma rögzített,
visszamenőleges hatályú tagság a TEGNAPI tudás-képet is átírta. A `membership` tábla ALAKJA
változatlan (a külső fél fixtúrája pozicionális `INSERT`-tel ír rá — az első tervem ezt eltörte
volna, ezért elvetettem); mellé `membership_grant` esemény-napló került (`recorded_at` ·
`effective_at`), és a `grantAsOf` ugyanazt a két szűrőt futtatja, mint a megvonás. Esemény hiányában
a sor `granted_at`-je a TARTALÉK, `axis: 'projected_row'` jelöléssel — a gyengébb tanút megnevezzük
(KUKA-127). **Kimondottan NEM** tettünk általános `granted_at <= knownAt` szabályt, és NEM tiltottuk
meg a `validAt > knownAt` kérdéseket (KUKA-092: a tiltás nem megépítés).

**F02 — a bizonyíték az ESEMÉNY saját tartós adata.** Az `evidence_ref` a `review_circle`-ben élt, a
kör viszont CSAK visszamenőleges érvénytelenítésnél születik: a jogváltozások kétharmadán (azonnali
és jövőbeli hatályú megvonás) a kötelező bizonyíték NYOMTALANUL elveszett. Javítva: a
`membership_revocation` esemény kapott `actor_subject_id` + `evidence_ref` oszlopot, a `review_circle`
pedig `revocation_event_id NOT NULL` hivatkozással mutat rá (a saját `evidence_ref` oszlopa megszűnt).
Mindhárom ág UGYANAZT a megőrzési szerződést teljesíti; bizonyíték nélkül nincs jogváltozás.

**ORG-N1a — BAS-01: a felhatalmazás alapja, két idő-tengelyen.** Új `authority_basis` tábla
(`basis_id` + `version` kulccsal): hatály · rögzítési idő · lejárat · visszavonás · korlát-mezők ·
KÖTELEZŐ bizonyíték. Új verzió = új sor, a régit nem írjuk át (REV-N1b). A `basisAsOf` pontosan a
`membershipAsOf` szerkezete; a `grantAdjudicationAuthority` rögzíti, MELYIK verzió alapján adták.
A lejárt · ismeretlen · még nem hatályos alap HÁROM külön nevezett válasz, és a kiadás ZÁR.

**A KLAUZULA MÉGSEM ZÁRULT LE — és ezt a norma-mátrix MONDJA KI (R85 §5).** Az első alakban azt
írtam, hogy „a hiány megszűnt". Ez túlzás volt: a nyilvántartás megépült és EGY útra (hatáskör-adás)
be van kötve, de a MEGHÍVÓ-KIADÁS és a BEVÁLTÁS nem hordozza és nem méri az alapot. A regiszternek
eddig csak KÉT állapota volt (`no_evidence` · `covered`), és egyik sem igaz erre — ezért **harmadik,
nevezett állapotot** kapott: **`partially_covered`**, kötelezően megnevezett két féllel (mi épült meg ·
mi maradt, egyenként min. 40 karakter). **Ez nem kiskapu:** a `partially_covered` SEHOL nem egyenlő a
`covered`-del, tehát az ORG-N1a nem kerülhet a kötelező készletbe — a **req-4 marad**, a **req-5 nem
lép életbe**. Az ORG-N1b megtartja a teljes hiányát, és a `basisState.limit_enforced: false` a
rendszer válaszában is kimondja, hogy a korlát ma ADAT, nem védelem (KUKA-041).

**SAJÁT ELLENPÉLDÁK — és HÁROM saját állítás, ami nem tudott bukni.** 13 új mutáció (M108–M120). Az
M110 · M116 · M117 TÚLÉLTE a próbám első alakját, mert olyan eseteket használtam, amelyeket MINDKÉT
tengely-szűrő kizárt: az egyik szűrő kivétele mérhetetlen maradt. **KUKA-159:** egy állítás csak
akkor falszifikálható, ha PONTOSAN EGY tengely dönti el — két-tengelyes szabálynál a fixtúra vigye
MINDKÉT tükör-esetet (utólag rögzített ⇒ csak a tudás dönt · ismert, de még nem hatályos ⇒ csak a
hatály). Megtalálta: a SAJÁT mutációs battériám.

**A LÁNC-ELTÉRÉS (§2) — visszavonom az R84-es állításomat.** Ők 12/15 + 2 FAIL-t mértek, én 13/15 +
exit 0-t állítottam, a mai friss futás pedig **13/15 MEGFELEL + 2 BIZONYÍTOTT ENV-KIHAGYÁS**-t ad,
más bukó esetekkel. Három futás, három kép: a lánc **gép- és időzítés-függő**, és a mai
diagnosztikánkkal nem eldönthető, kié a „helyes". **KUKA-160.** A gyökér-okot javítottuk: minden
nem-zöld program mellé `child_trace` kerül (állapot · jelzés · spawn-hibakód · mért idő · stderr
utolsó 60 sora · stdout utolsó 20 sora · csonkolás-jelzés) — eddig NÉGY SORRA volt csonkolva a nyom,
ezért az eltérést egyikünk sem tudta megvizsgálni.

**A „KÉT FÜGGETLEN TANÚ" MEGFOGALMAZÁS VISSZAVONVA (§5).** A program hibaszövege és a mi mért időnk
UGYANANNAK az eseménynek a következménye, a `cap_ms`-t ráadásul mi olvastuk ki az ő programjukból —
tehát nem független tanúk. A kód mostantól két külön mezőt visz és ki is írja: `witness_basis` (erős
ág: esetenkénti bizonyíték dönt) · `witness_limit` (gyenge ág: nincs eredmény-fájl, a kihagyást a
ZÖLD HELYETTES tartja, nem a két jel).

**KUKA-129 VISSZATÉRT — KÉTSZER, EGY KÖRÖN BELÜL, a saját javításomban.** A `partially_covered`
bevezetése után előbb az egységek ÖSSZEFŰZÉSE (`result === 'covered'` betűre), majd — a
visszaminősítés kiterjesztése után — a fedezet-SZÁMÍTÁS (`chainBacking`) sem tudott az új állapotról.
Az első alakban a sorok sorsát az EGYSÉGEK SORRENDJE döntötte el, a másodikban mind a négy, valóban
falszifikált sor `not_falsified`-re romlott. **Megtalálta: a SAJÁT MÉRÉSEM, mindkétszer** — a
battéria végig `exit 0` volt. Javítva KÖZÖS feloldókkal: `chainResultRank` + `claimsFalsification`,
amiket mindhárom olvasó HÍV. **Élesebb tanulság:** egy ÚJ ÉRTÉK bevezetése ugyanaz a lánc-kérdés,
mint egy szabály javítása — meg kell keresni MINDEN olvasót, aki a régi értékkészletet betűre
egyezteti.

**Gépi végeredmény:** `v3ref/run.mjs` **48/48 PASS** · mutációs battéria **117/117 elkapva · 0 túlélő ·
0 elavult horgony · TELJES ÉS TISZTA · exit 0** · norma-lánc **54 fedett · 4 részben fedett · 8
nevezett hiány**, kötelező készlet **req-4, hiány nélkül** · a külső lánc **13/15 + 2 env-kihagyás
(zöld helyettessel)**. A kör lapja a V2 repóban: `docs/70_PLANNING/V3_R86_…md` (**D-VS-715**).

---

## D-VS-3025 — A BIZONYÍTÉK-ELFOGADÁS HÁROM RÉSE ÉS A KÉT IDŐ-TENGELY (R83/F01…F03 + REV-N2a/b)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) beadvány-kapuja, külső-lánc futtatója és
> norma-modellje. A V2 kódját nem érinti.

- **Dátum:** 2026-09-14 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R83/R84)
- **Bemenet:** a külső tárgyaló fél (chatgpt-v3) R83 — ANALYSIS lapja, KÉT futtatható programmal.
- **Reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon** (`594f49f`): összefűzés **1 PASS / 3 FAIL** ·
  futtató **2 PASS / 1 FAIL** — pontosan az általuk közölt eredmény. Tesztadaptáció nem történt.

**F01 — a próba-állapot ZÁRT sémája** (`v3ref/unitAdmission.mjs`). A kapu a `probe_status` mezőből
egyetlen tiltott párost ismert (`CAUGHT` + `PASS`), tehát a mező TÖRLÉSE és `UNKNOWN`-ra állítása
egyaránt teljes zöldet adott a VALÓDI egységeink másolatain. Innentől a mező jelenléte kötelező, az
értéke a `manifest.mjs` zárt szókészletéből való, és a verdikthez ÉS a mutáció szerződés-fajtájához
is illeszkednie kell (`VERDICT_STATUS_RULE` · `probeStatusProblem`). A `runtime_error` szerződésű
mutáció `THREW` állapota JOGOS marad — és ezt POZITÍV ELLENPÁR méri. **KUKA-155.**

**F02 — az elvárt lánc-sorok a RÖGZÍTETT szerződésből** (`v3ref/norms.mjs` → `expectedChainRows`).
A leggyengébb-sor kánon (KUKA-154) csak a JELEN LÉVŐ sorok között működött: minden egységből
kivéve ugyanazt az egy REV-N3a állítás-sort, a lánc 48 sorral is „teljes" maradt. Innentől a
(klauzula · állítás · próba) hármasok halmaza a mai szerződésből jön; a hiányzó sor `row_missing`
néven a leggyengébb rangot viszi, az idegen sor és az EGY egységen belüli ismétlés nevezett akadály,
a TÖBB egységben megjelenő azonos sor viszont a darabolás jogos következménye. **KUKA-156.**

**F03 — a környezeti kihagyás MÉRT kudarc-fajtára** (`v3ref/external-checks/`). A felmentés a
bejelentésen állt (`env_limit` + `superseded_by`), ezért egy VALÓDI assertion-hibát is felmentett.
Innentől a bejelentett akadály-fajta zárt készletből való, és a program TÉNYLEGES kudarcának
ugyanannak kell lennie; időtúllépést KÉT független tanú igazol: a program saját hibaszövege ÉS a
futtató mért ideje (≥ a bejelentett belső korlát). MÉRVE: az `r57` és az `r59` valódi időtúllépése
továbbra is kihagyást kap — a kapu nem fal. **KUKA-157.**

**CORE — REV-N2a/b: a két idő-tengely és a felülvizsgálati kör** (`v3ref/bitemporal.mjs`, BIT-01).
A terv az R71 óta állt (`NEXT_REQUIRED_EVIDENCE.order`), most megépült: `membershipAsOf({validAt,
knownAt})` a naplóból számol, a `recordRetroactiveInvalidity` az ÚJ esemény-fajta (múltbeli hatály +
mai rögzítés, `alter_right` hatáskörrel és KÖTELEZŐ bizonyíték-hivatkozással), a `review_circle` +
`review_circle_member` a nevesített felülvizsgálati kör — SZÁMÍTOTT tagsággal, érintetlen eredeti
történettel és KÜLÖN, `adjudicate` hatáskörhöz kötött lezárással. Két új próba (`P-REV-bitemporal`,
`P-REV-review-circle`), nyolc deklarált állítás, nyolc falszifikáló mutáció (M100–M107).

**A kötelező készlet req-3 → req-4** (11 klauzula). A feltételt az R71 ELŐRE kimondta, és MÉRVE
teljesült: a REV-N2a/b mind a nyolc deklarált állítására van nevezett falszifikáló. A következő
csomag (req-5) az ORG-N1a/b: a felhatalmazás ALAPJA azonosítóval, verzióval, hatállyal és korláttal.

**SAJÁT LELET.** Az M106 (az időablak-szűrő elvétele) TÚLÉLT, mert a fixtúrában a tagság a
helyesbítés hatálya UTÁN kezdődött — az „időablakon kívüli művelet" ellenpárja LÉTRE SEM JÖHETETT.
**KUKA-158.** És a saját F02-pinem első alakja egy MÁR ELDÖNTÖTT tényt mért (KUKA-124/1
ismétlődése), ezért a visszacsúszást nem fogta meg; a mai alak a klauzula ítéletét méri.

**A HÁROM HELYESBÍTÉSÜK ÁTVEZETVE.** (1) A „bájtazonos" állítás visszavonva: a program TESTE
karakterre azonos, a záró sortörés eltérhet (mérhető tény, nem mértük — KUKA-033). (2) A séma, a
bijekció és az ellentmondás-mentesség NEM bizonyítja, hogy a futás megtörtént; az R81-es
megnyugtató mondat („gyakorlatilag a battéria lefuttatása") visszavonva. (3) A `tools/` alatti
futtató pinjének lezárását ez a kör sem igazolja — nyitott marad.

**Mért végállapot:** magreferencia 45/45 · battéria 104/104 elkapva, 0 túlélő · kötelező készlet
11/11 (req-4) · külső lánc 13/15 MEGFELEL + 2 bizonyított környezeti kihagyás (nevezett
helyettessel) · az ő R83-as programjaik 7/7 · legrosszabb egység falióra 6242 ms (a 15 000 ms-os
külső korlát 42%-a).

---

## D-VS-3024 — A BEADVÁNY-KAPU ÉS AZ ADATKIADÁS IDEJE (R81/F01…F04 + a négy helyesbítés)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) összefűzése és kiadási útja. A V2 kódját nem érinti.

- **Dátum:** 2026-09-14 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R81/R82)
- **Bemenet:** a külső tárgyaló fél (chatgpt-v3) R81 — ANALYSIS lapja, KÉT futtatható programmal.
- **Reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon** (`eb4d83b`): mag **6 PASS / 1 FAIL** · összefűzés
  **4 PASS / 4 FAIL** — pontosan az általuk közölt eredmény. Tesztadaptáció nem történt.

**F01–F03 — MRG-01, az összefűzés beadvány-kapuja** (`v3ref/unitAdmission.mjs`). A régi alak a
beadott egység-fájlok SAJÁT ÖSSZEFOGLALÓIT vette mérésnek. Négy szabály, mind a RÉSZLETES
bizonyítékon: szigorú séma + TÁMOGATOTT szerződés-verzió (a hiány külön válasz, átalakítás nélkül) ·
bijekció a bejelentett azonosítók és a részletes eredmények között, az ÖSSZESÍTŐK ebből · a
bejelentett és a mért adat ELLENTMONDÁSA nevezett akadály · a kötelező készlet, az elvárt állapot és
a szerződés-lenyomat a MAI, rögzített forrásból. Mellé `chainBacking`: a `covered` lánc-sor a
`falsified_by` mutáció részletes eredményére visszavezetve. → **KUKA-151**

**F04 — a kiadás hatályosulási pontja** (`readCommandResult` → `effectuateWith`, `basis:
'membership'`). A tranzakción belül olvasott `at` vezet végig MINDHÁROM fogyasztón: tagság+tiltás ·
az eredmény adatköre · a kiadási leltár sora. Nem új ellenőrzés született, hanem a meglévő időpont
ment végig. → **KUKA-152**

**KÉT SAJÁT LELET ugyanebben a körben.** (1) A mutációs horgony csak LÉTEZETT, nem volt EGYEDI: a
kiadási javítás után az M93 horgonya két helyen állt, és a mutáció némán az elsőre esett
(**KUKA-153**). (2) A kötelező klauzula-készletet KÉT szabály döntötte el — a `checkNorms` a
leggyengébb sor szerint, az összefűzésem a legerősebb szerint —, és a permisszívebb állt a ZÁRÓ
kapunál (**KUKA-154**, a külső fél ADAPTÁLT R59-es programja hozta elő).

**A NÉGY HELYESBÍTÉSÜK átvezetve** (R81 §7): a régi FAIL az `F03-revoke-credential-**other**` volt,
nem a `matching`, és az a hiba TÚLZÁRÁS volt · az ENT-01 öt belépési pontja nem „minden író", hanem
a HATÁSKÖRI/TILTÁSI család · az 1,7 mp az ő R77-es mérésük (R79: 7323 ms) · a 36/47 klauzula-sor nem
„77%-ban kész termék". Mindegyik a kódban álló magyarázatban is javítva, nem csak a lapon.

**AZ ADAPTÁLT R57/R59 ÁTVÉVE, JELÖLT EREDETTEL** (R81 §5): `r57a` és `r59a` KÜLÖN bejegyzés a
lánc-regiszterben, a szerzőség és az eltérés (a battéria darabolt hívása) kimondva; az EREDETI r57/r59
érintetlen marad. Mellé egy szerkezeti következmény: az adaptált változatok UGYANAZT az
eredmény-fájlnevet írják, ezért a futtató a saját eredmény-fájlt a futás ELŐTT félreteszi
(KUKA-127 a saját futtatónkon) — enélkül egy időtúllépésre futó eredeti mellett a szomszédja fájlja
maradna ott, és zöldnek látszana.

**MÉRT VÉGÁLLAPOT.** Magreferencia **43/43 PASS** · battéria **96/96 elkapva**, 0 túlélő · 0 rossz
próba · 0 mérőhiba · 0 elavult horgony · a kötelező készlet **9/9** (a szigorúbb, kánoni szabállyal) ·
a külső fél R81-es két programja **15/15** · `r57a` **9/9** · `r59a` **7/7**.

---

## D-VS-3023 — A RÉSZFA SÉMÁJA, A PARANCSÍRÁS HATÁLYOSULÁSA, A KONTEXTUS-ÁTVITEL ÉS A DARABOLHATÓ FUTÁS (R79/F01…F03 + §6)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) kiadás-, hatályosulás- és mérés-modellje. A V2
> kódját nem köti; a V2 fejlesztő átlépheti. A tanulságok (KUKA-145…150) fogalmi szintűek, tehát a
> V2-ben is érdemes rájuk nézni, ha hasonló alak születik.

**A külső tárgyaló fél (chatgpt-v3) HÁROM leletet adott a SAJÁT, egy körrel korábbi (R77-es)
javításainkra, és egy NEGYEDIK kérést a futás szerződésére.** A programjuk VÁLTOZATLANUL futott a
repóban: a javítás ELŐTT **14 PASS / 4 FAIL** (pontosan az általuk közölt reprodukció), a mai
forráson **18 PASS / 0 FAIL**. Tesztadaptáció nem történt — a programjuk szövege érintetlen
(`v3ref/external-checks/r79_chatgpt-v3.core.mjs`, bájtazonosan).

### F01 — A RÉSZFA A FELSŐ MEZŐ CÍMKÉJÉT ÖRÖKÖLTE

Az R77-es DSC-01 típusonként deklarálta a kiadott eredmény adatkörét, de LAPOS mezőnév-listaként. A
`{lines:[{qty, unit_price}]}` eredményben a `lines` SAJÁT címkéje (`keszlet`) fedte az EGÉSZ
részfát, tehát a beágyazott ármező kiment az `arak`-ra TILTOTT olvasónak; a `{qty:{unit_price:…}}`
alak pedig azért ment át, mert a levélen senki nem kérdezte meg, szám-e.

**Javítás (DSC-01 v2):** a deklaráció SÉMA — `leaf(kind, scope)` · `arrayOf(of)` · `objectOf(fields)`
—, és a besorolás a VALIDÁLT alakból gyűlik, MÉLYSÉGBEN. A levél TÍPUSA is deklarált; a be nem
sorolt mező a részfában is NEVEZETT, az ÚTJÁVAL (`lines[0].titok`), és a hatás LÉTRE SEM JÖN. Nincs
globális mezőnév-találgatás: a jelentést az adja, melyik TÍPUS melyik POZÍCIÓJÁN áll a név
(KUKA-002). (KUKA-145)

### F02 — A PARANCSÍRÁS KIMARADT A HATÁLYOSULÁSI PONTBÓL

Az R77-es EFF-01 a HATÁSKÖRI írókat kötötte be; a parancsíró HÁROM külön óraolvasáson maradt (jog ·
`finalized_at` · nyugta). Mérve: a tagság 08:00:01-kor megszűnik, az első olvasás 08:00:00, a többi
08:00:02 — a parancs `finalized` lett 08:00:02-es idővel, amely időpontra a jog-feloldó MÁR tiltja
az eljárót.

**Javítás (EFF-01 v2):** `effectuateWith({store, clock, basis, decide}, effect)` — a hatályosulás
mechanikája KÖZÖS, a jog-feloldó INJEKTÁLT (az `authority.mjs` nem húzhatja be az `authz.mjs`-t:
kör lenne), és a `basis` KIMONDJA, melyik jog-fajta döntött (`authority` | `membership`). Öt
hatásköri út mellett a parancsíró is EGY időponton áll: a `finalized_at` és a nyugta ideje
BÁJTRA azonos. (KUKA-146)

### F03 — A MEGVONÁS NEM VITTE ÁT A HITELES KONTEXTUST

A tagság-megvonás hívta a hatáskör-ellenőrzést, de `credentials`-t nem adott tovább: a
HITELESÍTŐ-alapú tiltás ezen az ÍRÓ úton nem hatott, miközben a másik négy úton zárt.

**Javítás (ENT-01):** a `revokeMembership` fogadja és továbbadja a kontextust; mellé a mérés
hatóköre SZABÁLY lett, nem lista — az `entryPoints.mjs` MINDEN író belépési pontot felsorol
(5 pont × 4 kontextus-tengely × 3 mód = **60 cella**, padlóval), a tengelyeket a tiltás-fajták ZÁRT
halmazából SZÁRMAZTATJUK, és a SZÁNDÉKOSAN semleges út (bejelentés-elbírálás, R67/F02) DEKLARÁLT,
a semlegessége pedig BÁJTRA mérve. (KUKA-147)

### §6 — A FUTÁS SZERZŐDÉSE (RUN-02): DARABOLHATÓ FUTÁS, HÁROM KÜLÖN MEZŐ

A külső fél kérte, hogy a mutációs battéria darabolható legyen, és hogy az időtúllépés NEVEZETT,
NEM TELJES futás legyen, külön mezőkkel — ne a kód hibájának látsszon. **A kérés ebben a körben
KÉNYSZERRÉ is vált:** a három új próbával a teljes battéria faliórája ezen a futtató-gépen (4 vCPU)
**17,1 mp** a legjobb mért alakban (párhuzamosság 4 · 6 · 8 · 16 mind 17–19 mp), a külső korlát
pedig 15 000 ms. A korlátot NEM emeltük meg (az a mérce meghamisítása lenne — KUKA-091 · KUKA-140).

**Megépítve:**
- **`--unit=k/n`** — a mutációk k-adik n-ed része. Az egység MINDEN futásban lefuttatja a TELJES
  alapvonalat és MIND A NYOLC hazugság-ellenpróbát (enélkül az „elkapva" semmit nem jelent), és a
  részeredményét fájlba írja. **Az egység SEMMIT nem állít a battéria egészéről.**
- **`--merge`** — teljes összefoglalót KIZÁRÓLAG ez adhat, és csak ha mind az **öt** feltétel áll:
  (1) minden mutáció PONTOSAN EGYSZER · (2) minden egység UGYANARRA, a MA mért forrás-lenyomatra
  hivatkozik · (3) minden egység `complete` · (4) mindegyikben zöld volt a két kapu · (5) mindegyik
  bizonyítéka a SAJÁT szülői főkönyvéhez KÖTÖTT.
- **HÁROM KÜLÖN MEZŐ:** `run_state` (`complete` | `incomplete`) · `clean` (a KÓDRÓL szól; nem teljes
  futásnál `null`, mert az el nem végzett mérés sem nem zöld, sem nem piros) · `portable` (belefér-e
  EGY hívás a külső korlátba — ez a MÉRÉSRŐL szól, nem a kódról). Kilépési kód: **0** teljes és
  tiszta · **1** teljes, de nem tiszta · **2** NEM teljes.
- Mérve: **három** egységgel a legrosszabb egység **7,0 mp** (a korlát 47%-a). Az első alak KETTŐ
  egységgel készült és önmagában zöld volt (8,5–10,4 mp) — a TELJES söprés párhuzamos terhelése
  alatt viszont az egyik egység **12 141 ms** lett, tehát átlépte a saját költségvetését. NEM a
  költségvetést emeltük, hanem tovább daraboltuk a munkát (KUKA-140).

**A söprés-felület innentől a DARABOLT futás** (`verify:v3ref` → három egység + `--merge`); a régi,
egy-hívásos `v3ref:mutate` megmarad, és ŐSZINTÉN `incomplete`-et mond ezen a
gépen. (KUKA-150)

### KÉT SAJÁT LELET, AMIT EZ A KÖR HOZOTT ELŐ

- **Egy határ, két név** (KUKA-148): a `store.tx` és a `withTransaction` ugyanaz a tranzakció-határ;
  az R77-es alakom a másodikat hívta, és amint a parancsírót is odakötöttem, a határt mérő próba
  ELVESZTETTE a mérési pontját. Nem a kód romlott el, hanem a MÉRÉS. Megtalálta: a saját söprésem.
- **A próba egy korábbi kapu munkáját jelentette sajátjának** (KUKA-149): a `P-CMD-effectuation`
  első alakja óraolvasás-számlálóra épült, holott a parancs-úton a hatályosulási pont ELŐTT még KÉT
  tagsági kapu áll. Megtalálta: a saját falszifikálóm (M93 → WRONG_CATCHER). A mai alak az óra a
  TRANZAKCIÓ HATÁRÁHOZ köti, és MEGMÉRI, hogy a mért pontot elérte-e.

### MÉRT VÉGÁLLAPOT

- `verify:v3ref`: **42/42 próba PASS** · a darabolt battéria (3 egység) **92/92 mutáció elkapva** (0 túlélő ·
  0 rossz próba · 0 mérőhiba · 0 elavult horgony) · **36/47 klauzula-sor FEDETT** · a kötelező
  bizonyíték-készlet **9/9**.
- `verify:external-checks`: **9/11 program MEGFELEL**. A külső fél R79-es programja **18/18**, a
  saját RUN-02 próbánk **4/4**.
- **KIMONDOTT ELTÉRÉS (r59 · r57):** a külső fél R59-es és R57-es programja a battériát EGY hívásban
  futtatja 15 000 ms-os időkorláttal. Ezen a futtató-gépen a teljes battéria 17,1 mp, tehát náluk
  ETIMEDOUT-tal áll meg: **a MÉRÉS akad el, nem a kód bukik**. Az ő programjukat NEM írjuk át (az a
  lánc alapja). Helyette a saját `r79_run_contract_restated.mjs` UGYANAZOKAT az állításokat méri a
  darabolt futáson (U01: hamisított bizonyíték egység-módban · U02: hiányzó egység · U03: idegen
  forrású egység · U04: pozitív ellenpár) — **4/4 zöld**. A kérés az R80-as lapon megy át: a
  battéria-hívást az ő programjukban is a `--unit`/`--merge` alakra érdemes állítani.
- **KIMONDOTT KORLÁT:** az egység-fájl NINCS kriptográfiailag a futásához kötve — kézzel írt
  egység-fájl is beolvadna; a forrás-lenyomat egyezése szűkít, de nem bizonyít. A zárás feltétele
  nevezett: aláírt egység-tanú. Ez a KUKA-121 mintájának folytatása a saját futtatónkon.

---

## D-VS-3022 — A HATÁLYOSULÁS PONTJA, A KIADOTT TARTALOM ADATKÖRE ÉS A SÉRÜLT TÁROLT HATÓKÖR (R77/F01…F03)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) hatáskör-, tiltás- és kiadás-modellje. A V2 kódját
> nem köti; a V2 fejlesztő átlépheti. A tanulságok (KUKA-141…144) viszont fogalmi szintűek, tehát a
> V2-ben is érdemes rájuk nézni, ha hasonló alak születik.

**A külső tárgyaló fél (chatgpt-v3) HÁROM leletet adott a SAJÁT, egy körrel korábbi (R75-ös)
javításomon**, futtatható programmal. Reprodukció a VÁLTOZATLAN kódon: az ő `r77` programja
**34 PASS / 5 FAIL** — pontosan az általuk közölt kép. A javított kódon **39 PASS / 0 FAIL**, és
**TESZTADAPTÁCIÓ NEM TÖRTÉNT**: a programjuk szövegéből egyetlen karaktert sem írtunk át, a
behúzási útvonalait sem — a fájl a repóban bájtazonos azzal, ami a lapjukon megérkezett
(`v3ref/external-checks/r77_chatgpt-v3.core.mjs`).

· **F01 — A DÖNTÉS ÉS A RÖGZÍTETT HATÁS KÉT KÜLÖN IDŐPONTON ÁLLT.** Mind a három hatáskör-igényes
író KÉTSZER olvasott órát: egyszer a DÖNTÉSHEZ, egyszer a rögzített hatás időbélyegéhez. Mérve: a
felhatalmazás 08:00:01-kor megszűnik, az első olvasás 08:00:00, a második 08:00:02 — a művelet
SIKERES, és a hatást 08:00:02-es idővel rögzíti. A tárolóban onnantól olyan hatás áll, amit a SAJÁT
könyvünk szerint a rögzítés pillanatában már senki nem volt jogosult létrehozni. Javítás:
**EFF-01 / `effectuate`** (`v3ref/authority.mjs`) — BEBOCSÁTÁS a hívás pillanatában (a mai jog),
**HATÁLYOSULÁS a tranzakción BELÜL, EGYETLEN óraolvasásból**: ugyanaz az időpont hordozza a döntést
ÉS a hatást, a hatás-visszahívás pedig soha nem olvas órát; tiltáskor NULLA mellékhatás.
**A SAJÁT, OSZTÁLY-SZINTŰ ÁTVIZSGÁLÁSOM KÉT TOVÁBBI UTAT TALÁLT** ugyanebben, amit ők nem neveztek
meg: a **megvonás-napló** (`authz.mjs` → `revokeMembership`) és az **elbírálás**
(`adjudication.mjs` → `adjudicateClaim`). Öt út áll ma egy hatályosulási ponton. (KUKA-141)

· **F02 — A TILTÁS EGY CÍMKÉRE HATOTT, NEM AZ ADATRA.** A `{qty, unit_price}` parancs-eredményt az
`arak` adatkörre TILTOTT olvasó `dataScope: 'arak'` kontextussal helyesen nem kapta meg,
`dataScope: 'keszlet'` kontextussal viszont EGÉSZBEN megkapta, az ármezővel együtt: a kimenő
TARTALOMHOZ semmi nem volt kötve, a kérő SAJÁT CÍMKÉJE döntött. Javítás: **DSC-01 /
`resultScope.mjs`** — a parancs TÍPUSA (+verziója) deklarálja, melyik mező melyik adatkörbe esik; a
kiadás a KIADANDÓ TARTALOM adatköreit MÉRI ebből, és mindegyikre KÜLÖN kérdez; a kérés `dataScope`
tengelyét a MÉRT érték írja felül. Vegyes eredmény alapból EGÉSZBEN megtagadva (mezővetítés ma
nincs — **kimondva**, nem elfelejtve); a hiányzó besorolás KÜLÖN, fail-closed válasz: a BEADÁSNÁL
nevezett mondattal (saját bemenet), a KIADÁSNÁL némán, a nem létező eredmény válaszával
(KUKA-084). (KUKA-142)

· **F03 — A SZERKEZETILEG HIBÁS TÁROLT HATÓKÖR „MÁSIK KÖNYVNEK" MINŐSÜLT.** A tárolt művelet-cél
ÜRES könyv-tengelyét (elválasztó, előtte semmi) a feloldó szabályos alaknak vette, a kérés
könyvéhez hasonlította, nem egyezett — és `ban_other_bookId` címen TOVÁBBENGEDTE a kérést: az
érvénytelen tiltás úgy viselkedett, mint egy érvényes, de más könyvre szóló. Javítás: **OPS-01 /
`operationScopeProblem`** — a normalizáló HÁROM választ adhat, nem kettőt („érintett" ·
„bizonyítottan MÁS" · „ez a rekord nem értelmezhető"), és a harmadik a rekord-integritás kapujában
dől el, a hatókör-értékelés ELŐTT (R75/F04 helye). MINDKÉT fogyasztó ugyanazt a feloldót hívja
(`banRecordIntegrity` · `banReaches` — KUKA-039); a hiányzó cél megtartja a saját, pontosabb nevét
(`ban_target_missing`), a két JOGOS alak érintetlen marad (KUKA-049). (KUKA-143)

**A NEGYEDIK LELET A SAJÁT MÉRŐMŰSZEREMBEN VOLT — és a saját battériám találta meg.** A magreferencia
futtatója `--json` módban `process.exit(1)`-gyel zárt, a mutációs battéria viszont `spawnSync`-kel
hívja, tehát a kimenet CSŐRE megy: a `process.exit()` a még ki nem írt bájtokat ELVÁGJA. Amíg a
jelentés elfért egy írás-adagban, semmi nem látszott; a három új próbával a JSON ~141 kB fölé nőtt, és
**76-ból 57 mutáció „értelmezhetetlen JSON" címen MÉRŐHIBÁRA futott** — miközben a próba-futás végig
zöld volt. A mérő-eszköz a SAJÁT NÖVEKEDÉSÉTŐL romlott el. Javítás: `process.exitCode` + természetes
kifutás, korai megálláshoz címkézett blokk. **Jó hír, kimondva:** a csonka kimenet NEM zöldnek
látszott, hanem nevezett MÉRŐHIBÁNAK — a bizonyíték-szerződés (R59/F01) itt tartott. (KUKA-144)

**KÉT PONTOSÍTÁS, AMIT ŐK KÉRTEK — elfogadva.**

1. **A mátrix SOR ≠ EGYEDI BEMENET.** Az R76-os lapom „66 cellát" mondott, ami sort jelent, nem
   egyedi mérési pontot. A mérés most maga írja ki a bontást, nem a szerző kezével számolva
   (KUKA-082): **66 sor · 3 nem értelmezhető · 63 végrehajtott = 51 EGYEDI bemenet + 12 ismétlődő ·
   0 eltérés · lefedetlen fajta: nincs**. Az ismétlődés nem hiba (ugyanaz a bemenet két úton is
   megjelenik), de attól még nem 66 független mérés — ezt a lap innentől kimondja.
2. **A KUKA-139 tanulsága SZŰKÍTVE.** Az eredeti szöveg általánosabbat állított, mint amit a lelet
   igazol: nem minden fixtúrás próba gyanús, hanem az, amelyik a MUTÁLT KÓDSORT nem futtatja le. A
   bejegyzés mostantól ezt mondja, és a nevezett ellenpárt (fixtúra a hatásra + VALÓDI kiadás a
   viselkedésre) is.

**AZ IDŐ-TARTALÉK — a javítás nem a költségvetés megemelése volt.** A három új próbával a battéria
falióra-ideje a saját költségvetés fölé ment (12,3–13,0 s a 12 000 ms-os kereten). A költségvetést
NEM emeltük meg (az a mérce meghamisítása lenne — KUKA-091 · KUKA-140): a próba-tárolók száma
16 → 8, a mátrix-világok ~27 → 7.

**ÉS EZ NEM VOLT ELÉG — A KÖR EGY NYITOTT TÉTELLEL ZÁR.** Háromszor, közvetlen futással mérve:
**11 323 · 12 593 · 12 461 ms** a 12 000 ms-os kereten — kettő a háromból FÖLÖTTE. A battéria ilyenkor
`HIÁNYOS — a falióra a saját költségvetés fölé ment` üzenettel, NEM NULLA kilépéssel áll meg, és ennek
KÉT fogyasztója bukik el vele: a `verify:v3ref` (tehát a V3 söprés), **és a külső fél R59-es
programjának P01 POZITÍV KONTROLLJA** (feltétele `batt.exit === 0`), tehát a `verify:external-checks`
is (`8/9 — ELTÉRÉS: r59`). **A V3 söprés mért állapota: három futás = 1 piros · 2 piros · 0 piros —
tehát NEM megbízhatóan zöld, és nem is írjuk annak.**

**Mérve, hogy ne tippeljünk (KUKA-054):** forrásfa-másolás mutációnként **4 ms** · Node indulás +
modul-betöltés **~70 ms/futás** · EGY próba-futás **410 ms**, ebből **309 ms a 39 próba teste**
(legdrágább: `P-NORM-evidence` 56 ms · `P-INVITE-seal` 33 ms · `P-REV-ban-matrix` 21 ms) ·
párhuzamosság 20/24/32 → 10,9/11,1/11,7 s, tehát a hangolás **nem segít** (a 16 már hangolt, R53).
**Nincs olcsó nyereség:** 86 gyerek-futás × 39 próba — a költség a mérés MÉRETÉBŐL jön, és a mérés a
rendszerrel együtt nőtt (a KUKA-144 testvére: ott a KIMENET, itt a KÖLTSÉG).

**Amit NEM teszünk: nem emeljük a költségvetést** (az a tartalék eltörlése lenne, amiért a kapu
készült — R53), és nem jelentünk zöld söprést. **A következő kör iránya kimondva:** egy mutációhoz ne
kelljen MIND a 39 próbát lefuttatni, csak az, amelyik elkaphatja, plusz minta a „rossz elkapó"
felismerésére — ez viszont a mérés JELENTÉSÉT módosítja, tehát tervezni kell, nem a kör végén
összeütni. **Gépi jel: maga a kapu**, ami helyesen tüzel; a commitolt artefaktum egy ÁTMENT futást
rögzít (11 504 ms) — ez tehát nem a tipikus állapot, és a lap ezt kimondja (KUKA-082).

**MÉRT VÉGÁLLAPOT (ebben a körben, ebben a repóban):** próbák **39/39 PASS** · mutációk
**85/85 ÉSZLELT** (0 túlélő · 0 rossz elkapó · 0 mérőhiba · 0 elavult horgony) · hazugság-próbák
**8/8 védve** · kötelező bizonyíték **9/9** · `verify:kuka` **307/307** · külső programok
**9/9 MEGFELEL** — de CSAK akkor, ha a battéria a keretén belül fut (különben `8/9`, az r59/P01
kontrollal) · **V3 söprés: NEM megbízhatóan zöld**, három futás = 1 piros · 2 piros · 0 piros, az
egyetlen ok a fenti falióra-keret. **V2 söprés: zöld** — 291 verifier, 290 zöld, 1 nevezett
env-kihagyás (`verify:schema`, adatbázis nélkül), 0 piros.

**AMI NYITVA MARAD, KIMONDVA.** A REV-N2a klauzula (a HATÁLY ideje és a TUDOMÁS ideje mint két külön
tengely) továbbra is NYITOTT, bizonyíték nélkül — a hatályosulási pont (EFF-01) ezt **nem** oldja
meg, csak a döntés és a hatás EGYIDEJŰSÉGÉT. Ezért a P-REV-effectuation próba a REV-N3a klauzulához
van kötve, nem a REV-N2a-hoz: egy klauzula nem mondhatja egyszerre, hogy hiányos, és hogy van rá
bizonyítéka. A mezőnkénti kiadás (részleges eredmény-vetítés) sincs megépítve — ma a vegyes eredmény
EGÉSZBEN tagadva.

---

## D-VS-3021 — A KIADÁS IS ENGEDŐ ÚT: a tiltás teljes döntése, a tárolt hatókör és a mátrix (R75/F01…F05)

> **Hatály:** V3 — a V3 magreferencia (`v3ref/`) tiltás-modellje. A V2 kódját nem köti; a V2 fejlesztő
> átlépheti.

**A külső tárgyaló fél ÖT leletet adott a SAJÁT, egy körrel korábbi (R73-as) javításomon**,
futtatható programmal. Reprodukció a VÁLTOZATLAN kódon: az ő `core-r75.mjs` programja **2/7 PASS**
(2 kontroll teljesült, mind az öt lelet piros). A javított kódon **7/7**.

· **F01 — a kiadás harmadik, őrizetlen úttá vált.** A tiltás OLVASÁSA és KIADÁSA egy modulban élt,
ezért az `authority.mjs` nem hívhatta a tiltás-feloldót (kör), és a kiadási út csak a NYERS hatásköri
sort nézte: egy MÁR LETILTOTT bíró sikeresen tiltott. Javítás: a függőség iránya MEGFORDULT
(`store ← banScope ← authority ← ban`), és **AUT-01/`executableRightAt`** adja a TELJES döntést —
művelet · eljáró · óra · TILTÁS · hatásköri sor —, amit MINDEN út hív, a kiadás is. (KUKA-135)

· **F02 — a konstans NEVE könyv-hatókört ígért, a TÁROLT rekord nem hordozta.** Egy csak az A könyvön
jogosult bíró `operation_misuse` tiltása a dolgozót a FÜGGETLEN B könyvben is megfosztotta a
hozzáféréstől. Javítás: `operationScopeRef(bookId, opClass)` — a tárolt cél a KÖNYVET is hordozza, és
a `parseOperationScope` MINDKÉT tengelyt megköveteli. (KUKA-136)

· **F03 — gyengébb szerződésű író.** Az `imposeBan` „alacsony szintű íróként” megkerülte az `issueBan`
hatókör-kapuját; a modul KOMMENTJE állította, hogy belső. A külső fél szava: *„a komment nem
hozzáférésvédelem."* Javítás: `export const imposeBan = issueBan` — egy szerződés. (KUKA-135)

· **F04 — az ismeretlen TÁROLT ok engedélyt adott.** Az ellentmondás-vizsgálat `expectedKind && …`
alakban állt, tehát ismeretlen oknál az EGÉSZ ellenőrzés kimaradt. Javítás: `banRecordIntegrity` —
HÁROM külön, nevezett válasz (`ban_kind_unknown` · `ban_cause_unknown_stored` ·
`ban_cause_kind_contradiction`), mindegyik ZÁR, és a kapu a hatókör-értékelés ELŐTT áll. (KUKA-137)

· **F05 — a kontextus egy hívón elveszett.** A `credentials` a parancs-úton végigment, az ELBÍRÁLÁSI
úton nem (`readClaim` · `adjudicateClaim` · `suspendMembership` · `liftSuspension`). (KUKA-138)

**KÉT HELYESBÍTÉS A SAJÁT R74-ES JELENTÉSEMHEZ — elfogadva.** (1) A C-F04 hibájának IRÁNYA fordítva
állt nálam: nem az volt a baj, hogy a tiltott hitelesítővel átment a parancs, hanem hogy **az
ÉRVÉNYES MÁSIK hitelesítővel is blokkolta a jogos munkát** — fail-closed kapunál a hiányzó bemenet
sosem szivárgás, mindig TÚLZÁRÁS, és ez mást kíván MÉRNI. (2) Az M71-hivatkozás nem bizonyít
íróút-ellenőrzést (M71 a kontextus-összefésülést méri); a hiányzó jelet MEGÉPÍTETTÜK: **M75**.
**És a „mind a hét javítva és mindegyik falszifikálva” mondat csak a pontosan megnevezett
ellenpéldákra használható** — ezt elfogadjuk, a jelentés nyelve ehhez igazodik.

**A KÉTSZER KÉRT MÁTRIX — MÉRVE, nem rajzolva.** `v3ref/banMatrix.mjs`: **7 tiltás-fajta × 3 engedő út
(tagsági · hatásköri · KIADÁS) × érintett/független cél × hiteles kontextus (tiltott értékkel · MÁSIK
jogos értékkel · nem hozza)** = **66 cella**, mindegyik valódi tárolóval és valódi feloldóval mérve, a
VÁRT értéket a cella DEKLARÁLJA. Mérés: **eltérés 0 · lefedetlen fajta nincs** (ZÁR 19 · NYITVA 20 ·
NEM DÖNTHETŐ 24). Az ember-olvasható tábla UGYANEBBŐL a függvényből származik (KUKA-082), a
`P-REV-ban-matrix` próba pedig cellánként állítja — tehát a mátrix maga is falszifikálható (**M78**:
új fajta cella nélkül · **M79**: az olvasó mindent globálisnak ért).

**AMIT A MÁTRIX ELSŐ FUTÁSA TANÍTOTT.** Két cellán „eltérést” mutatott az `operation` fajtánál — és a
KÓD volt a helyes, az ELVÁRÁSOM a hibás: a művelet-tiltásnál az „érintett cél” nem a tiltás
tulajdonsága, hanem a tiltás célja ÉS az adott út SAJÁT művelete közötti VISZONY (KUKA-024). Ha az
elvárást a mért értékre „javítom”, a mátrix önmagát igazolja vissza (KUKA-054); ha a kódot igazítom
az elváráshoz, a tiltás túlnyúlik (KUKA-092). Ezért a művelet NEVEZETT lett, és minden cella KIÍRJA,
mit kérdezett.

**AMIT A SAJÁT SÖPRÉSEM FOGOTT MEG.** A modul-szétválasztás után KILENC mutáció horgonya elavult
(jelentve), egy pedig **TÚLÉLT (M68)** — mert a `P-REV-ban-past` fixtúrára váltott, és a mutáció az
`issueBan` törzsét támadja: a próba onnantól nem futtatta a mutált sort, miközben ZÖLDEN állt. A
próba most MINDKETTŐT viszi: fixtúra a hatásra, VALÓDI kiadás a viselkedésre. (KUKA-139)

**ÉS EGY MÁSODIK SAJÁT LELET — AZ IDŐ-TARTALÉK.** A mátrix első alakja cellánként épített tárolót
(66 világ), és mivel a mutációs battéria a próba-készletet 77-szer futtatja, a falióra **11 260 ms**
lett a saját **12 000 ms**-os költségvetésnél (a KÜLSŐ fél 15 000 ms-os korlátjának 80%-a). Önmagában
zöld — a TELJES söprés párhuzamos terhelése alatt viszont átlépte, és **két egymást követő futáson KÉT
KÜLÖNBÖZŐ verifier** bukott el. A javítás NEM a költségvetés emelése volt (a korlát a külső félé):
olvasó világ plánonként megosztva, ÍRÓ cellának saját — 66 → ~27 világ, **11 260 → 9 888 ms** (66%).
(KUKA-140)

**Gépi jel:** `npm run verify:v3ref` **36/36** (új: `P-REV-ban-matrix`; a `P-REV-ban-paths` három új
ágával és a `P-REV-ban-scope` egy új ágával) · `npm run v3ref:mutate` **76/76 elkapva · 0 túlélő ·
0 elavult horgony**, kötelező bizonyíték **9/9** · `npm run verify:kuka` **290/290** · `npm run verify:external-checks` **8/8 program** (az ő
`core-r75.mjs`-ük bájtazonosan a repóban) · a külső fél
`core-r75.mjs` programja a javított kódon **7/7**.

---

## D-VS-3020 — A TILTÁS TÁRGYA, A HATÁSKÖR FELOLDÁSA ÉS AZ ELLENTMONDÓ REKORD (R73/C-F01…C-F05)

**Dátum:** 2026-09-14 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R73 · **KUKA-131…134**

**A reprodukció ELŐSZÖR, a VÁLTOZATLAN kódon — és a programjuk NEM futott le teljesen.** A külső fél
(chatgpt-v3) `core-r73.mjs` programját bájtazonosan kinyertem és futtattam: **2/7**. Az eredmény oka
MÉRVE, nem feltételezve — a programjukban a C01 kontroll és az F03 ellenpélda EGYSZERRE nem
teljesíthető: mindkét szereplőnek (`judge` · `outsider`) **NULLA** `adjudication_authority` sora van
a fixtúrájukban, tehát ugyanaz a hiányzó hatáskör az egyik ágon elvárt siker, a másikon elvárt
kudarc. Ezért készült egy ADAPTÁLT másolat (`core-r73.adapted.mjs`) KÉT, kimondott változtatással:
(1) a `judge` `alter_right` hatáskört kap mindkét könyvön, (2) a tiltás kiadása `bookId`-t kap.
Az adaptált menet: **7/7**. A két futást KÜLÖN nevezzük meg, ahogy kérték.

**A NÉGY LELET — mind valós, mind javítva:**

· **C-F01 + C-F02** — a tiltás-kérdés tárgyát `{ ...operation, ...credentials }` állította elő, tehát
a hitelesített belépési kontextus FELÜLÍRHATTA a kérés tengelyeit: `bookId: "book_b"`-vel a
`book_a`-ra szóló kérés elkerülte a `book_a`-ra kimondott tiltást. Javítás: `banRequestFor` nevezett
tengely-listákkal (`REQUEST_AXES` a hívótól, `CREDENTIAL_AXES` a kontextusból) — a kontextus többet
is hozhat, de a kérés tárgyát nem mozdíthatja el.

· **C-F03** — az `imposeBan` a hatáskör helyén a hívó `authorityOk === true` szavát nézte: NULLA
hatásköri rekordú `outsider` is tilthatott. A feloldás az `adjudication.mjs`-ben élt, a fordított
import KÖRT csinált volna — a külső fél szavával: *„a függőségi kör szerkezeti feladat, nem indok az
ellenőrzés elhagyására."* Javítás: **AUT-01** (`v3ref/authority.mjs`, `authorityRowAt`) semleges
modulban, amit MINDKÉT oldal importál; a kör megszűnt, másolat nem született.

· **C-F04** — a `credentials` el sem jutott a parancs-úton a jog-feloldóig, tehát a
hitelesítő-hatókörű tiltás a leggyakrabban használt úton nem hatott. Javítás: a kontextus végigmegy
(`submitCommand` · `readCommandResult` · `releaseAllowed` + mind az öt `rightAt` hívás).

· **C-F05** — a tárolt sor OKA és FAJTÁJA ellentmondhatott egymásnak, és a rendszer a fajtát hitte
el. Javítás: `ban_cause_kind_contradiction` — nevezett, ZÁRÓ válasz; a sorrend megtartva, hogy az
ismeretlen fajta pontosabb diagnózisát ne fedje el (KUKA-124).

**AMI A SAJÁT MUNKÁM HIÁNYA VOLT — kimondva.** A C-F01/C-F02 és a C-F05 javítása után a magpróba
zölden állt, de EGYIK fixet sem mérte SAJÁT állítás: a „javítva" ezen a két ponton nem volt
bizonyíték, csak állítás. Ezért a `P-REV-ban-scope` KÉT új ágat kapott — (e) a hamisított
kontextus-könyv, (f) az ellentmondó rekord —, nevezett állításokkal, a manifestben deklarálva, és
mellé KÉT új falszifikáció: **M71** (a régi összefésülés) és **M72** (az ellentmondás-ellenőrzés
kivétele). Mindkettő bizonyítottan PIROS.

**A SZÁMOZÁSRÓL, MÉRVE.** A két repó KUKA-regisztere közös fogalmi névtér, de külön fájl: **89**
azonosító mindkettőben AZONOS tartalommal áll, **NÉGY** viszont (KUKA-090 · 091 · 092 · 121) KÉT
KÜLÖNBÖZŐ leckét nevez meg aszerint, melyik repót olvassa valaki. A múltat nem írjuk át (D-VS-682),
de nem is tetézzük: az R73 bejegyzései MINDKÉT regiszterben szabad számot kaptak (131–134; a V2 ma
130-ig áll). **Gépi jel erre ma NINCS** — kimondva, mert egyik repó sem látja a másikat; a zárás
feltétele nevezett: közös azonosító-tér vagy repó-előtag.

**Gépi jel:** `npm run verify:v3ref` **35/35** (a `P-REV-ban-scope` két új ágával) · `npm run
v3ref:mutate` **69/69 elkapva · 0 túlélő · 0 elavult horgony** · `npm run verify:kuka` 259/259 ·
V3 söprés **8/8**.

---

## D-VS-3019 — A CÉLZOTT TILTÁS: MI SZŰNIK MEG, ÉS MI NEM (REV-N5a/b/c · BAN-01)

- **Dátum:** 2026-09-13 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R71) ·
  **forrás:** a KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3) R71 — ANALYSIS lapja, §8/1: *„a fő szállítmány a
  REV-N5a/b/c a V3 magban"*.

**A KÉRDÉS.** Eddig a magban a tiltás EGY dolog volt: „ez a személy nem járhat el". A valóságban
viszont a tiltásnak FAJTÁJA van, és a fajtát az OK szabja meg — aki elhagyta a céget, annál a
KÖNYVHÖZ fűződő jog szűnik meg, de nem az azonossága; akinek a jelszava kiszivárgott, annál a
HITELESÍTŐ ADAT, de nem a könyvhöz fűződő joga; akitől egy jogalapot vontak vissza, annál az adott
ADAT-KÖR. Ha mindezt egyetlen „tiltott" jelölő hordozza, akkor vagy túl sokat vesz el, vagy túl
keveset — és mindkettő némán.

**A HÁROM KLAUZULA.**

- **REV-N5a — a tiltás MINDEN engedő úton hat.** A magban KÉT út ad jogot: a TAGSÁG (`rightAt`) és a
  HATÁSKÖR (`adjudicationRightAt`). Ha a tiltás csak az egyiken áll, a másik nyitva marad, és a
  „tiltott" szó hazudik (KUKA-039: a szabály nem állhat egy ág feltételében). A tiltás-kapu ezért
  MINDKÉT feloldóban az ELSŐ kérdés, UGYANAZZAL a nevezett feloldóval (`banEffectiveAt`).
- **REV-N5b — a hatókör az OKBÓL jön, nem a jelölőből.** ZÁRT fajta-lista (hitelesítő adat ·
  munkamenet · személy · jogalap · könyv · művelet · adat-kör), ZÁRT ok-lista, és egy nevezett
  leképezés ok → fajta (`kindForCause`). Az ISMERETLEN ok nem „nincs tiltás", hanem HARMADIK válasz:
  a `banReaches` háromértékű (`decidable: false`) — a gép kimondja, hogy nem tudja eldönteni, és nem
  dönt a nemleges irányba (KUKA-020: a programhiba nem lehet azonos a valódi „nem"-mel).
- **REV-N5c — a tiltás nem törli a MÚLTAT és nem veszi el MÁSOK jogát.** A tiltott személy korábbi
  cselekményei a könyvben maradnak, olvashatók, és a rájuk épült más jogok élnek. A tiltás a JÖVŐRE
  szól; a múlt átírása nem tiltás, hanem történelem-hamisítás (a pecsét-szabály folytatása).

**Mért állapot:** a mag **35/35 PASS**, minden veszélyes mutációt a NEVEZETT állítás fog meg (M65–M70
újak), a lefedettség **11/25 → 17/28** klauzula-sor, 0 falszifikálatlan állítás, a söprés **8/8**.
A kötelező bizonyíték-készlet **req-2 → req-3** (9 klauzula, mind teljesül); a KÖVETKEZŐ vállalt
csomag **req-4: REV-N2a · REV-N2b** — a HATÁLY ideje és a TUDOMÁS ideje szétválasztása, valamint a
nevesített felülvizsgálati kör.

**Egy MÉRÉSI tanulság a saját munkámból.** A `P-REV-ban-past` első alakjában a pillanatképet a tiltás
UTÁN vettem KÉT olvasásra — vagyis a „múlt sértetlen" állítást önmagával hasonlítottam össze
(KUKA-054). A javított alak a pillanatképet az ELSŐ olvasás után, a MÁSODIK előtt veszi. A
tautologikus összehasonlítást ugyanabban a körben találtam meg és vettem ki.

---

## D-VS-3018 — AMIRŐL DÖNTÜNK, AZT LÁTNI KELL: a fél őr MÁSODSZOR, és a korlát hatóköre (R69/C-F01–C-F03)

- **Dátum:** 2026-09-13 · Sáv: Claude-v3 (PR-VS-300 · STEP-VS-300-002 · CMD-VS-300-002-001 R69) ·
  **KUKA-121** · **forrás:** a KÜLSŐ ELLENŐRZŐ FÉL (chatgpt-v3) R69 — ANALYSIS lapja.
- **A reprodukció ELŐSZÖR.** A három programjukat bájtazonosan kinyertem és a VÁLTOZATLAN `6a74339`
  forráson lefuttattam: a mag-próba **2 PASS / 3 FAIL**, karakterre az ő arányuk. Minden leletük valós.

**C-F01 + C-F02 — az olvasás nemet mond, az érdemi döntés mégis lezár.** A `readClaim` helyesen
`claim_content_integrity_failed`-et adott sérült tartalomra; ugyanannak az illetékes elbírálónak az
`adjudicateClaim(decision:'resolve')` hívása mégis `ok:true, state:'resolved'`-ot adott, és átírta az
ügyet. Hiányzó tartalomnál ugyanez. **Helyette CLM-01** (`claimEvidenceAt`): a beadvány állapotát EGY
nevezett feloldó mondja ki, amit MINDKÉT út hív. A SORREND kötött — a hatáskör ELŐBB dől el, mint az
adat állapota: a jogosulatlan hívó válasza az adatállapottól FÜGGETLENÜL a semleges nemleges, különben
a különbség maga árulná el, hogy az ügy létezik (KUKA-084).

**C-F03 — a másodlagos hivatkozás nem vehet el MÁS keretet.** A `claimant_ref` korlát MINDEN csatornán
közösen számolt, tehát a támadó a SAJÁT csatornájáról a sértett szabadon megadható hivatkozásával
elhasználhatta annak keretét — a jóhiszemű fél a saját, független csatornájáról `rate_limited`-et
kapott. A szűkítés mostantól a SZERVER képezte kulcson BELÜL él (`intake_key` ÉS `ref`).

**A KLAUZULÁK PONTOSÍTVA.** A **REV-N3c** szövege kimondja a BIZALMI ELŐFELTÉTELT: a mag a
MEGBÍZHATÓNAK FELTÉTELEZETT adapter-kontextus szerint korlátoz — a kontextus EREDETÉNEK kikényszerítése
a REV-N3d hiánya. A **REV-N3d** zárási feltétele a külső fél HAT pontjával szigorodott. Új: **REV-N3e**
— a sérült beadvány ügye ma SEMMILYEN úton nem zárható le (holtpont); a feloldás (technikai karantén)
KÜLÖN műveleti nevet, okot és auditot igényel, ezért NEM építettük meg, hanem nevezett hiányként áll.

**A MÉRTÉKEGYSÉG, a külső fél §5 kérésére, EGYÜTT:** **11/25 bizonyítéklánc-SOR** · **6/20 EGYEDI
klauzula** fedett. A REV-N3e felvétele 19-ről 20-ra emelte az egyedi készletet. Ez nem a mag
készültségi százaléka.

**Saját lelet a mérésről.** A `P-REV-claim-read` (d) része azt mérte, hogy ugyanaz a hivatkozás NÉGY
KÜLÖNBÖZŐ csatornán is elfogy — vagyis **a saját pinem épp azt a csatornákon átnyúló hatást igazolta
vissza zölden, amit a külső fél fegyverként mutatott meg**. Aki a hibát javította volna, PIROSRA vitte
volna a battériát (KUKA-068). A (d) rész átírva: a korlát a saját csatornán belül él.

**Gépi jel.** `npm run verify:v3ref` — az ÚJ **P-REV-claim-decide** (öt ág) + **M62 · M63 · M64**
visszabontási kontroll, mind bizonyítottan piros. Mérve: **32/32 magpróba · 61/61 mutáció elkapva ·
0 elavult horgony**; a külső fél mag-programja a javított kódon **5/5 PASS**.

---

## D-VS-3017 — A SIKER-JELENTÉS NEM HATÁS: REV-N3 MÁSODIK MENET (R67/F01–F05)

**Dátum:** 2026-09-13 · **Sáv:** Claude-v3 · **Kör:** CMD-VS-300-002-001 R68 · **KUKA-120**

**A helyzet.** A külső ellenőrző fél (chatgpt-v3) az R67-ben a VÁLTOZATLAN kódunkon futtatta le a
saját programját: **3 kontroll zöld, 5 elvárt feltétel piros.** A reprodukció a mi gépünkön
karakterre ugyanezt adta. A leletek állnak, egyiket sem vitatjuk.

| # | A lelet | A javítás |
|---|---------|-----------|
| F01 | a `suspendMembership` ÍRÁS NÉLKÜL mondta, hogy felfüggesztve — a `rightAt` továbbra is engedett | **SUS-01** (`v3ref/suspension.mjs`): a tény TÁROLÓDIK (`membership_suspension`), és EGY nevezett feloldó (`suspensionEffectiveAt`) mondja ki, amit az `authz.mjs` OLVAS és az `adjudication.mjs` ÍR. Külön modul, mert a közvetlen behúzás KÖRT csinálna (KUKA-003). Mellé `liftSuspension`: a `suspend` hatáskör másik iránya, nem visszamenőleg, a sor MEGMARAD történetnek |
| F02 | az `adjudicateClaim` a hiányzó ügyre semlegeset, a hatáskör nélküli hívónak a hiba NEVÉT adta — a különbség maga mondta meg, hogy az ügy létezik | mind a NÉGY nemleges ág BÁJTRA azonos `CLAIM_NOT_AVAILABLE` (a `readClaim`-en ez már állt: FÉL ŐR volt — KUKA-039 · KUKA-084) |
| F03 | a beadvány TARTALMA sehol nem tárolódott, csak a lenyomata | `claim_content` tábla; a lenyomat INTEGRITÁS-ellenőrzéssé lép elő, eltérésnél NEVEZETT hiba és NEM adunk vissza szöveget |
| F04 | a befogadás KÉT autocommit-írás volt: a második bukása kvóta-sort hagyott ügy nélkül | EGY tranzakció (`store.tx`) — a befogadás egy tény |
| F05 | a korlát a beadó SZABADON ÁTÍRHATÓ hivatkozásán állt | az ELSŐDLEGES kulcsot a SZERVER képezi (`intakeKeyOf`), a beadó hivatkozása MÁSODIK, szűkebb korlát marad |

**A közös betegség, egy mondatban:** a próbáim a VISSZATÉRÉSI ÉRTÉKET nézték, nem a KÖVETKEZMÉNYT
(KUKA-120). A `suspended:true` mező LÉTEZÉSE nem bizonyítja, hogy a felfüggesztés hatályos.

**Gépi jel.** `npm run verify:v3ref`: ÚJ **P-REV-suspension** próba (nyolc ág, végig a
következményen, ellenpárral) + a bővített **P-REV-claim-read** (F02–F05, saját befogadási
kontextussal részenként — a régi alak a saját előfeltevését igazolta vissza, KUKA-054). Hat új
visszabontási kontroll: **M56–M61**, mind bizonyítottan pirosra viszi a nevezett állítást. Az
elavult **M55** horgonya újrakötve. Mérve: **31/31 próba · 58/58 mutáció elkapva · 0 elavult
horgony · REV-N3a/b/c mind FEDVE**, nevezett falszifikálóval.

**AMI NYITVA MARAD — KIMONDVA (a külső fél §7/4 kérése).** A visszaélés-korlát ma szerver-kulcson
áll, de adapter-szintű beadó-kontextus híján MINDEN beadás EGY nevezett, közös vödörbe esik
(`chan:unattributed`): egyetlen elárasztó a jóhiszemű beadók keretét is elveszi. Ez
**referencia-helyettesítő, nem védelem**, ezért a klauzula KETTÉVÁLT: a bizonyított rész a
**REV-N3c** (nyitott út · semleges nyugta · atomi befogadás · szerver-kulcsos korlát), a hiányzó
rész pedig az ÚJ **REV-N3d**, nevezett hiánnyal és nevezett zárási feltétellel. A hatókört a MÉRCE
szabja meg, nem a kényelem (KUKA-048).

**A külső fél saját programja a javított kódon: 8/8 PASS** (változatlan forrással futtatva).

---

## D-VS-3016 — REV-N3 MEGÉPÜLT: A MŰVELETENKÉNTI HATÁSKÖR ÉS A BEJELENTÉS-ÚT, EGYSZERRE (req-1 → req-2)

- **Dátum:** 2026-09-12 · Sáv: Claude-v3 (PR-VS-300 / STEP-VS-300-002 / CMD-VS-300-002-001, R65)
  · **forrás:** a külső ellenőrző fél (chatgpt-v3) R65 §7 kimondott utasítása: *„A következő
  termékcsomag a már R60-ban vállalt REV-N3 legyen. Ne várjon arra, hogy egy újabb levél ismét
  engedélyezze."* — és §1: *„a magban van működő rész, de az R64 termékoldali normáin nem történt
  érdemi bővülés"*.
- **Gépi jel:** `npm run verify:v3ref` — **30/30 magpróba** (+2: `P-REV-authority`,
  `P-REV-claim-read`) és **52/52 mutáció elkapva** (+6: M50–M55) · `npm run verify:external-checks`
  5/5 · `npm run verify:sweep` 8/8 · `npm run verify:kuka` 223/223.

**AMI MEGÉPÜLT — pontosan az R60-ban ELŐRE leírt terv 1. és 2. lépése, változtatás nélkül.**

1. **ADJ-01 — a hatáskör MŰVELETENKÉNT** (`v3ref/adjudication.mjs` + `adjudication_authority` tábla).
   Három zárt művelet: `suspend` (felfüggesztés) · `adjudicate` (érdemi elbírálás) · `alter_right`
   (jogváltoztatás). A hatáskör NEM a tagságból jön — egy admin tagság nem tesz senkit elbírálóvá —,
   és a szűkebb felhatalmazás NEM ad tágabb hatást: a `suspend` joggal a felfüggesztés megy, a
   megvonás nem. A `revokeMembership` innentől `alter_right` hatáskört kér, FAIL-CLOSED: eljáró alany
   nélkül `actor_missing`, hatáskör nélkül `authority_not_established` — nevezett elutasítással.
   **Ez a saját gap-szövegünk teljesítése:** „a `revokeMembership` ma nem kérdez hatáskört a
   HÍVÓTÓL — tehát bárki »megvonhatna«".
2. **A BEJELENTÉS-ÚT — nyitott, semleges, korlátozott** (`submitClaim` + `claim` / `claim_intake`).
   Bárki beadhat (a még nem igazolt panaszos is), a nyugta BÁJTRA azonos akkor is, ha a hivatkozott
   könyv nem létezik, és beadónkénti visszaélés-korlát védi. A jelzés SEMMILYEN jogot nem mozdít:
   mérve, hogy a bejelentés előtti és utáni tagsági sor azonos, és a bejelentő UTÁNA sem kap
   hatáskört.
3. **A JELZÉS NEM AD OLVASÁST** (`readClaim`, REV-N3b) — és a bejelentés-út ÉLESÍTÉSÉVEL EGYÜTT
   került be, nem utána: visszavonható ENGEDÉLYT lehet építeni, visszavonható MEGISMERÉST nem
   (KUKA-085 · KUKA-077). A nemleges válasz BÁJTRA azonos a nem létező ügyével — se hibakód, se
   mondat nem különböztet (KUKA-084). **Ellenpár:** a HATÁSKÖRÖS elbíráló LÁTJA, és az elbírálás
   önmagában NEM változtat jogot.

**MIÉRT EGYSZERRE.** A saját REV-N3c gap-szövegünk mondta ki: hatáskör nélkül a bejelentés jogot
mozdítana, bejelentés nélkül a hatáskör elfojtja a jelzést — tehát a kettő külön-külön félrevezető.

**A BIZONYÍTÉK.** Két új próba, HÁROM külön állítással (mert egy több-állításos próba összesített
bukása nem igazolja mindegyik klauzulát — R55/F02, KUKA-039), és hat mutáció: M50 a
hatáskör-ellenőrzés kivétele · M51 a művelet-szűkítés kivétele · M52 a jelzés-út hatáskörhöz kötése
(ez a REV-N3c-t buktatja, tehát ELLENPÁR is) · M53 az olvasás-kapu kivétele · M54 a hibakód
megkülönböztetése · M55 a semleges nyugta elárulja, létezik-e a könyv. Mind a hat NÉV SZERINT abból a
tervből jön, amit az R60 ELŐRE leírt. **Mérve: 6/18 klauzula-sor FEDETT (volt: 3).**

**req-1 → req-2.** A bővítés TUDATOS lépés (KUKA-045), és a feltételét az R60 előre kimondta: „mind
a három klauzulának van olyan mutációs bizonyítéka, ami a SAJÁT deklarált állítását buktatja meg".
MÉRVE teljesült (REV-N3a ⇒ M50 · REV-N3b ⇒ M53 · REV-N3c ⇒ M50), tehát a kötelező készlet hatra nőtt,
és a hiányuk innentől FUTÁSI HIBA. A KÖVETKEZŐ csomag (`req-3`) ITT, ELŐRE rögzül: **REV-N5a/b/c** —
a célzott tiltás —, élethelyzettel, mérendő tulajdonsággal és bizonyítási tervvel, mielőtt egyetlen
sor kód megszületne hozzá.

**AMIT NEM TETTEM MEG, ÉS MIÉRT.** A terv 3. lépése a TARTALMI jóváhagyás (content-review-2 rekord)
mind a három klauzulára. Ezt **nem adom ki saját magamnak**: a rekord `reviewer.independent_of`
mezőt kér, és egy olyan felülvizsgálat, amit a megvalósítás szerzője ír a saját munkájáról, épp azt
a függetlenséget hazudná, amiért a mechanizmus létezik (KUKA-050). Az OB-7 ma MIND a 18 klauzulán
nyitott. A rekord tárgya, mérendő tulajdonsága és bizonyíték-hivatkozásai ELŐ VANNAK KÉSZÍTVE (a
próbák és a mutációk azonosítói feloldhatók) — a felülvizsgálatot a független ellenőrző féltől kérem.


---

## D-VS-3015 — A FÁZIS-KÉPESSÉG TANÚJA A V3 OLDALON, és a négy R63-as tanulság a regiszterben

- **Date:** 2026-09-12 · Lane: Claude-v3 (PR-VS-300 / CMD-VS-300-002-001, R63→R64) · **forrás:** a
  külső ellenőrző fél (chatgpt-v3) R63 §5: *„Legyen hitelesen vezetett fázis/képességállapot és géppel
  értékelhető feltétel, ismeretlen állapotra lezárást tiltó eredménnyel. … A fázisváltást a módosító
  agent feladata legyen rögzíteni és az őr feladata ellenőrizni; az operátor ne emlékeztesse rá."*
- **Gépi jel:** `npm run verify:capability-witness` (**ÚJ**, a söprés része — a söprés 7 → 8 verifier).

**A MUNKAMEGOSZTÁS KIMONDVA.** A board mátrixa fázis-KÉPESSÉGEKRE hivatkozik (CAP-01, a V2 repóban),
és a képesség állapota dönti el, hogy egy tétel nem-releváns, mérendő, vagy egyáltalán nem zárható le.
A képességek TANÚJA viszont ITT él: a board szolgáltatás a V3 lemezét nem látja. Ezt nem hallgatjuk el
és nem is állítunk mérést oda, ahol nincs (KUKA-089) — a board regisztere kimondja, HOL mérhető a tanú
(`witness_repo` + `witness_command`), a mérést pedig ez az őr végzi el: minden mérhető képességnél a
tanút, és ha a board regisztere elérhető (`V2_REPO_ROOT`), a RÖGZÍTETT állapotot a MÉRTHEZ hasonlítja.
Az elavult rögzítés PIROS.

**A SAJÁT ŐRÖM AZ ELSŐ FUTÁSÁN A SAJÁT SZABÁLYOM HIBÁJÁT TALÁLTA MEG.** A `v3-ui-slice` tanúja között
szerepelt „bármely HTML-lap", és az őr a `docs/_olvashato/` alatti SZÁRMAZTATOTT doksi-HTML-eket
felületnek nézte: a képességet `present`-nek mérte, tehát egy szabályos állapotot jelentett hibának
(KUKA-049). A javítás iránya nem a mappa-név betiltása volt: **megkérdezzük a gitet, mit tart számon**
(`git ls-files`) — a származtatott kimenet definíció szerint ignorált, tehát a tanú-halmazba be sem
kerül (KUKA-057: megengedő szabály, nem kizáró felsorolás). Ahol a git nem elérhető, a tartalék fa-járás
fut, és a riport KIMONDJA, hogy a mérés ilyenkor gyengébb.

**AMIT GÉPILEG NEM TUDUNK MÉRNI, AZT KIMONDJUK.** A tizenhárom V3-képességből tizenegynek van
fájl-szintű tanúja; kettőnek (`v3-user-capability` · `v3-personal-data-path`) nincs, mert a „használható
képesség" és a „valódi vs. fixtúra személyes adat" között fájl-szinten nincs különbség — ezt az azt
megépítő sáv mondja ki, nem egy minta-illesztés (KUKA-035). A riport ezt NEVEZETT kihagyásként írja ki,
nem hallgatja el.

**A NÉGY R63-AS TANULSÁG** (KUKA-114 · KUKA-115 · KUKA-116 · KUKA-117) ebbe a regiszterbe került —
a regiszter 113 → **117 bejegyzés** —, a `guardHome` plafon pedig 86 → **90**, mert mind a négy jel a
BOARD-hoz tapad, és a V3-nak nincs boardja. A tanulságok tartalma és a hozzájuk tartozó V2-oldali
gépi jelek a V2 repó `DECISION_LOG.md`-jében, **D-VS-686** alatt állnak.

## D-VS-3014 — A FELOLDÁS EXPLICIT ÁLLAPOT · a részletes eredmény a bizonyíték · és a kulcs EGY otthona

- **Date:** 2026-09-12 · Lane: Claude-v3 (PR-VS-300 / STEP-002 / CMD-001, R61) · **forrás:** a KÜLSŐ
  ELLENŐRZŐ FÉL (chatgpt-v3) R61-es programja és lapja, az operátor hozta át

A kör **V2-repóban** végzett munkája (board-profil · figyelő-lefedettség · a `tests_run` kapu) a másik
napló **D-VS-680** bejegyzésében áll. Itt a V3 magreferencia változásai.

### 0. ELŐBB REPRODUKÁLÁS, UTÁNA JAVÍTÁS (KUKA-030)

Az ő programjukat (`r61_chatgpt-v3.mjs`, 4005 bájt, 4 eset) VÁLTOZATLANUL a repóba tettem
(`v3ref/external-checks/`), és lefuttattam, MIELŐTT bármihez nyúltam:

| eset | reprodukált állapot |
|---|---|
| **P03** (pozitív ellenpár) | ✓ zöld — a helyes rekord `current` |
| **R01** | ✗ a katalógus HIÁNYA némán átengedte a kitalált próba-nevet |
| **R02** | ✗ a dokumentum-hivatkozás két szabad szöveg volt, semmit nem oldott fel |
| **R03** | ✗ egyetlen végrehajtható bizonyíték nélkül is `current` lett |

### 1. F01 — a feloldás EXPLICIT állapot (**KUKA-111**)

**A hiba.** `if (catalog && catalog.assertions && …)` — aki nem adott feloldó-katalógust, annál a
feloldás elmaradt. Ez **betűre ugyanaz a hiba-osztály, amit a KUKA-108-ban egy körrel korábban éppen
én zártam le** — csak most a SAJÁT ÚJ ŐRÖMBE írtam bele.

**A javítás első alakja a MÁSIK irányba bukott:** mind a három katalógus-részt feltétel nélkül
megköveteltem, és ezzel az ő JOGOS P03 esetüket vittem pirosra (KUKA-049). A végleges alak:

- `needs(part, name)` — a követelmény a hivatkozás FAJTÁJA szerint szól;
- `resolutionCatalogShape(catalog, kindsUsed)` — csak a ténylegesen HASZNÁLT fajtákra mér;
- `document` hivatkozás: `{document, digest, note}`, a MÉRT artefaktum-katalógushoz oldva
  (`sourceDocumentCatalog()` a `normContract.mjs`-ben — `R32_board_v1.md`, 61040 bájt, visszamért
  lenyomattal; hálózat nélkül);
- `EXECUTABLE_REF_KINDS` — legalább EGY végrehajtható (próba vagy mutáció) hivatkozás kötelező;
- **HATODIK állapot: `unresolved`** — a feloldhatatlanság nem néma zöld, és nem is a hibás alakkal
  (`invalid`) összemosva.

### 2. F02 — a stdout nem bizonyíték

A külső futtató (EXT-01) eddig a folyó kimenetet is elfogadhatta végeredményként. Mostantól **a FÁJL
az ítélet**: `auditEvidenceArtifact()` megköveteli, hogy a részletes eredmény-állomány létezzen,
értelmezhető legyen, hordozza a deklarált kötés-mezőt a staged commithez, és ne mondjon ellent a
stdoutnak — az utóbbi csak diagnosztika és elcsúszás-jelző.

### 3. **KUKA-113** — a nyers vezérlő-karakter a forrásban

A próba↔állítás összetett kulcsot KÉT hely építette, és az olvasó oldalon a szeparátor NYERS NUL
bájtként állt a forrásban. Funkcionálisan minden működött; a `norms.mjs` viszont **bináris fájllá
vált**: a kereső „binary file matches"-t mondott a tartalma helyett, és a saját, KUKA-hivatkozásokat
kereső mérésem sem látott bele. Helyette EGY nevezett kulcs-építő — `assertionKey(probe, assertion)` —,
amit az ÍRÓ (`run.mjs` katalógus) és az OLVASÓ (`norms.mjs` feloldó) egyaránt HÍV, menekülő alakkal.

### Gépi jelek

| jel | eredmény |
|---|---|
| `npm run verify:v3ref` | **28/28 PASS** · minden veszélyes mutáció a nevezett állítással észlelt · `P-NORM-evidence` 28 norma-kapu (n0–n28) |
| `npm run verify:external-checks` | **5/5 program MEGFELEL · 27 eset · hatókör: full** — köztük az ő R61-es programjuk mind a négy esete |
| `npm run verify:kuka` | **217/217 PASS** · 113 tanulság · őr-otthon: 25 `v3` · 86 `vs` (padló 86) · 2 nevezetten jel nélküli |

**Visszacsúszás-próba, mind PIROS:** a nyers vezérlő-karakter visszatérése · a szeparátor kézi
legépelése a katalógus-építőben · a feltételes katalógus-követelmény visszaállítása.

### Tanulságok (a regiszterbe és a CLAUDE.md-be is bekerült)

- **KUKA-111** — a feltételes követelmény nem követelmény; és a tükör-kérdés („ez a szigorítás
  elutasítja-e a HELYES esetet?") ugyanolyan kötelező, ezért kell minden kapuhoz JOGOS POZITÍV eset,
  lehetőleg a másik fél sajátja.
- **KUKA-112** (a jele a V2 repóban fut, lásd D-VS-680) — a sikeres lefutás és a lefutás két külön tény.
- **KUKA-113** — a forrás olvashatósága a helyesség része; az összetett kulcs szeparátora szerződés,
  nem stílus.


## D-VS-3013 — Az R59 négy tétele javítva: a hiány nem felmentés

**Kör:** CMD-VS-300-002-001 R59→R60 · sáv: **Claude-v3** · a külső fél (**chatgpt-v3**) független
ellenőrzése az R58-ra.

**A bemenet MÉRVE, nem rekonstruálva.** Az ő programjukat (`v3ref/external-checks/r59_chatgpt-v3.mjs`,
változatlanul, ahogy a boardon érkezett) a javítások ELŐTT futtattuk le: **P01 ✓ · P02 ✓ · E05 ✗ ·
E06 ✗ · E07 ✗ · E08 ✗ · E09 ✗**. Mind az öt leletet kódon reprodukáltuk, mielőtt bármihez hozzányúltunk
(KUKA-030). A javítás után ugyanaz a program, ugyanazon a gépen: **7/7 MEGFELEL**.

### R59-F01 — a kapu FELTÉTELESEN hasonlított

Az R57-ben behozott „az elvárt érték a szülőtől jön" javítás mezőnként, `if (expectation.base_digest
&& …)` alakban hasonlított. Ha az elvárt MEZŐ hiányzott, az összehasonlítás elmaradt — és mivel az
üres `{}` is objektum, a „van-e elvárás?" őr átengedte. Ugyanez a `verdict` és a `probe_status`
mezőkre. → **KUKA-108**

**Javítás:** `expectationShape` NEVEZETT feloldó ELŐFELTÉTELKÉNT (érvényes `sha256:` alaplenyomat ·
nem üres `run_tokens` és `mutated_digests`), a mutációnkénti keresés SAJÁT kulcson, és a csomag
`verdict`/`probe_status`/`failed_assertions` mezője KÖTELEZŐ és típusos (`requiredText`) — a hiány,
a null, az üres és az ellentmondás MEGKÜLÖNBÖZTETHETŐ hibát kap. A manifest állítás-készlete a kapu
HATÁRÁN kötelező, nem a belsejében feltételes.

### R59-F02 — a futtató a bemenetéből vette a mércét

Az EXT-01 futtató (a MI R58-as átadhatósági válaszunk) azt kérdezte, hogy a kapott esetek zöldek-e —
azt nem, hogy MELYEK jöttek meg. Egyetlen `{id:"T01",pass:true}` sorra „MEGFELEL"; kilenc darab
ugyanolyanra is. → **KUKA-109**

**Javítás:** EXT-02 eset-manifeszt KÜLÖN modulban (`v3ref/external-checks/case-manifest.mjs`), hogy a
mérés HÍVHATÓ legyen, ne forrás-olvasás (KUKA-009). Minden program mellett a várt eset-lista ÉS annak
FORRÁSA (`cases_source` — a külső fél kísérő lapja, illetve a saját körünk jegyzőkönyve; **nem egy
lefutás**, mert az önmagát igazolná vissza). Az `auditCases` mindkét irányt méri: HIÁNYZÓ · ISMERETLEN
· DUPLIKÁLT · ROSSZ ALAKÚ (a `pass` szigorúan logikai) · ELBUKOTT. A `runScope` a hatókört a GÉPI
kimenetbe is beírja (`scope` · `verdict.complete_evidence`) — a `--only` futás soha nem a lánc teljes
bizonyítéka. És a futtató maga is a lemásolt forrás része lett, hogy a másolatban futó futtatót az ő
E08 esetük megmérhesse.

### R59-F03 — a `!!mező` mint típus-ellenőrzés

A KUKA-105 javítása a HIÁNYT zárta le, az ÜRESSÉGET nem: `reviewer:{id:[],role:{}}`, `at:"not-a-date"`,
`situation:[]` — minden „truthy", tehát a rekord teljesnek számított és `current` lett. → **KUKA-110**

**Javítás:** típusos, VERZIÓZOTT rekord (`content-review-2`): mezőnként nem üres szöveg, szigorú
időbélyeg (kanonikus ISO-8601 visszaírhatóság + nem lehet a jövőben), és FELOLDHATÓ bizonyíték-
hivatkozások (`probe`+`assertion` a manifesthez · `mutation` a regiszterhez · `document` hellyel és
állítással). ÖTÖDIK állapot: **`invalid`** — a hiány és a rossz alak két külön válasz, mert két külön
teendő tartozik hozzájuk. **És a HITELESSÉG külön tengely** (`authenticity`), ami minden válaszban ott
áll, ma nemlegesen: a `current` a struktúrára és a kötésre mond igent, az elfogadás hitelességére
soha. A saját `reviewer.id` továbbra is ÁLLÍTÁS — ezt most a válasz maga mondja ki, nem egy komment.

### R59 §5.1 — a REV-N3a szövegütközése

A REV-N3a azt is a hatáskörhöz kötötte, hogy valaki KIFOGÁST KEZDEMÉNYEZZEN — szemben a saját
REV-N3c-nkkel, ami a jelzés útját kifejezetten nyitva tartja a még nem igazolt panaszosnak. Két
klauzula ugyanarról a műveletről, ellentétesen.

**Javítás:** a külső fél javasolt szövege BETŰRE átvéve: *„A jog felfüggesztését vagy megvonását, a
kifogás érdemi elbírálását és az abból következő jogváltoztatást csak az adott műveletre ellenőrzött
hatáskörű alany végezheti. A jelzés fogadása külön művelet; arra az N3b és N3c irányadó."* Az
elhatárolást a SZÖVEG mondja ki, nem a kommentár (KUKA-004). Következmény: az index-lenyomat változott
(`sha256:14bdcf7a…` → `sha256:61ea6a05…`) — ez helyes, és minden rá szóló jóváhagyást elavulttá tenne,
ha volna ilyen (ma nincs).

**A KÖVETKEZŐ KÖTELEZŐ CSOMAG ELŐRE LESZÖGEZVE** (`NEXT_REQUIRED_EVIDENCE`, `req-2`, vállalva R60-ban):
REV-N3a · REV-N3b · REV-N3c, NÉGY lépéses, számozott sorrendben, mindegyikhez MOST leírt élethelyzettel,
mérendő tulajdonsággal és bizonyítási tervvel — mielőtt egyetlen sor kód megszületne hozzá (KUKA-054:
utólag a mérce a megépült dologhoz igazodna). A sorrend nem tetszőleges: az 1. lépés a hatáskör-modell
ÉS a jelzés-fogadó út EGYÜTT (külön-külön mindkettő félrevezető, ahogy a saját gap-szövegünk kimondja),
a 2. pedig az olvasás-tilalom, a bejelentés-út ÉLESÍTÉSE ELŐTT (KUKA-085: visszavonható ENGEDÉLYT lehet
építeni, visszavonható MEGISMERÉST nem). A csomag a futás kimenetén LÁTSZIK, nem csak a kódban áll.

### Gépi jelek

- `npm run verify:v3ref` — `P-NORM-evidence` **26 → 28 ellen-vezérlés**: **n24** (hiányos elvárás mind
  a négy alakban, IDEGEN értékkel a csomagban) · **n25** (hiányzó ítélet / próba-állapot) · **n26**
  (örökölt kulcs · NULL · üres szöveg · nem-tömb bukott-lista) · **n27** (15 alak, köztük az ő E09
  csomagja betűre) · **n28** (a következő csomag létező klauzulákra mutat, 1..4 sorrend, érdemi
  élethelyzet/tulajdonság/terv mindegyiknél). A próba CÍMÉBŐL kikerült a kézzel léptetett „tizenkét"
  szám (KUKA-045) — a mért érték a `detail` sorban áll.
- `node v3ref/external-checks/run-all.mjs` — **4 program · 23 eset · teljes hatókör · MEGFELEL**.
  Az r59 felkerült a nyilvántartásba; a futtató minden programnál kiírja az ELVÁRT eset-listát és
  annak forrását.
- `npm run verify:kuka` — **208/208**, 110 bejegyzés (23 v3-otthonú · 85 v2-otthonú, padló 85 ·
  2 kimondottan jel nélküli).
- `npm run verify:sweep` — **7 verifier · 7 zöld · 0 env-kihagyás**.

### Ami NEM lett kész, és kimondjuk

A 18 klauzulából ma is **3 fedett** (`req-1`), a többi nyitott — ezt a futás névvel sorolja fel. A
tartalmi jóváhagyás mind a 18 klauzulán `none`: a GÉPEZET készen áll (immár típusosan, verziózva,
feloldható hivatkozásokkal), a TARTALOM nincs meg. És a hitelesség tengelye ma `unauthenticated`:
a rendszer nem tudja igazolni, hogy a `reviewer.id` mögött valóban az az ember áll — ezt most már
minden válasz kimondja, ahelyett hogy a `current` szó elnyelné.

---

## D-VS-3012 — Az R57 három lelete javítva: a bizonyíték nem igazolhatja önmagát

**Kör:** CMD-VS-300-002-001 R57→R58 · sáv: **Claude-v3** (az R57-ig `Claude-AUX`) · a külső fél
(**chatgpt-v3**, az R57-ig `ChatGPT`) független ellenőrzése az R56-ra.

**A bemenet MÉRVE, nem rekonstruálva.** Az R57 programja a saját gépünkön **9/9 MEGFELEL**
eredménnyel futott le — de ez a javítások UTÁNI állapot; a leletek a javítás ELŐTT valósak voltak,
és mind a hármat kódon reprodukáltuk. A külső fél öt pecsét-állításunkat (T01–T05) megerősítette, és
négy ponton (E01–E04) MEGCÁFOLT.

### R57-F02 — a kapu az ellenőrzött csomagtól kérdezte meg, mihez mérje

A `falsificationQualifies` a csomag `mutated_digest` mezőjét **ugyanannak a csomagnak** a
`base_digest` mezőjéhez mérte, és a `run_token`-t is a csomagból fogadta el. Egy önmagában
következetes, de KITALÁLT csomag ezért átment. → **KUKA-103**

**Javítás:** az elvárt érték a SZÜLŐ futási környezetéből jön (`expectation.base_digest` ·
`run_tokens[mutation_id]` · `mutated_digests[mutation_id]`), és **hiányában a kapu fail-closed**.
Mellé három független feltétel: a mutáció a REGISZTERBEN van · az állítást a MANIFEST kiadja · a
csomag önmagával nem mond ellent (`verdict` ⇄ `probe_status`).

**Ami ebből következett — és amit külön ki kell mondani:** a szigorítás PIROSRA vitte a saját
`P-NORM-evidence` próbánkat, mert annak szintetikus csomagjai kitalált mutáció-azonosítókkal
dolgoztak. A próbát a VALÓDI szerződéshez kötöttük újra (igazi regiszter-mutációk + egy
`EXPECT` objektum), nem a kaput lazítottuk vissza.

### R57-F01 — a kapu kimondta az eltérést, és NULLÁVAL zárt

A battéria a képernyőn kiírta, mely klauzulák maradtak `not_falsified`, de a kilépési kódja ettől
független volt; és kötelező bizonyíték-KÉSZLET nem is létezett. → **KUKA-104**

**Javítás:** `REQUIRED_EVIDENCE` (`req-1`: REV-N1a · REV-N1b · ORG-N2a), FÁZIS-FÜGGŐ elvárt
állapottal (magpróbán `falsification_pending` elég, battérián `covered` kell), és a `clean`
minősítés feltétele kimondottan tartalmazza a `required.ok`-t — tehát a kilépési kód a kimondott
ítéletet hordozza. A hiányt a futás NÉVVEL sorolja fel (`why[]`).

### R57-F03 — a tartalmi jóváhagyás puszta hashekből

A `content_review` `current`-nek számított, ha a lenyomatok egyeztek: felülvizsgáló, időpont,
bizonyíték és maradék nélkül. → **KUKA-105**

**Javítás:** `CONTENT_REVIEW_REQUIRED` — 11 kötelező mező, és NÉGY állapot: `none` · `incomplete`
(a hiányzó mezők NEVÉVEL) · `stale` (az elcsúszott lenyomatokéval) · `current`.

### Az R32-kötés nevezett hiánya BEZÁRULT

A KUKA-101 kimondott hiánya (`source_document.text_digest: null`) megszűnt: a normaszöveg
bájtazonos másolata a repóban áll (`v3ref/source-documents/R32_board_v1.md`, 61 040 bájt), és a
`text_digest` **mérve** születik a fájl bájtjaiból — betöltéskor az elvárthoz hasonlítva, romlásnál
`NORM_SOURCE_ARTIFACT_MISMATCH`, hiányzó fájlnál `NORM_SOURCE_ARTIFACT_MISSING`. A külső fél
kimondott feltétele volt, hogy ez **ne bemásolt konstans** legyen. A KUKA-101 szövege és a CLAUDE.md
sora ezzel együtt frissült (KUKA-050: a szöveg a valóságot követi).

### ÁTADHATÓSÁG — a programok a repóba, egy paranccsal futtathatóan

Az R57 §7 követelménye. A külső fél az R57-ben SAJÁT rekonstrukciót futtatott, mert a hivatkozott
programokat a megadott commit fájlfájában nem találta — ez a mi mulasztásunk volt (KUKA-079). Ezért:
`v3ref/external-checks/` (a külső fél R57-es programja + a mi két újrafogalmazott programunk,
mindhárom VÁLTOZATLANUL, a szerző megnevezve) + `run-all.mjs`, ami a környezetet maga rakja össze
(`source/` · `source-manifest.json` · `evidence/`), a gépi eredményt a `results/` alá teszi, és
**nem-nulla kóddal zár**, ha bármelyik eset elbukik. Mindkét irány mérve: érintetlen forráson
3/3 program · 16/16 eset · kilépés 0 — szándékosan eltört magpróbán kilépés 1. A bemondott commit
itt is ÁLLÍTÁS: ha a lemásolt forráson nem-könyvelt változás áll, a futtató `+uncommitted` jelöléssel
és a fájlok felsorolásával mondja ki (R45 P01 / KUKA-056).

### Sáv-átnevezés

Operátori parancs: `Claude-AUX → Claude-v3` · `ChatGPT → chatgpt-v3` · a V2 sáv `Claude-DEV →
Claude-v2` · `chatgpt-v2`. A V2 oldalán ez nem átnevezés, hanem REGISZTER lett (LANE-01,
D-VS-675): egy forrás, két testvér-feloldó, generált adatbázis-normalizálás, és a régi nevek
**aliasok** — a külső fél a mi átnevezésünkről nem tud, ezért a régi néven érkező hívást elfogadjuk
és a mai névre fordítjuk (KUKA-081 · KUKA-064).

### Mit nem kapott KUKA-számot, és miért

A kör során három SAJÁT hibám bukott ki, mindhárom egy MÁR MEGLÉVŐ bejegyzés visszatérése, nem új
minta — ezért nem kapnak új számot, de itt ki vannak mondva: (1) a sáv-verifier történet-padlóját
100-ra **tippeltem**, a mérés 18-at adott (KUKA-045); (2) a gépi eredmény kiírásánál egy `resolve`
nevű, nem létező nevet hívtam, amit a szintaxis-ellenőrzés nem lát (KUKA-044); (3) a döntési számot
a kör ELEJÉN mértem szabadnak, a másik sáv közben elvitte — a szám ellenőrzése a **PUSH pillanatában**
érvényes, nem a kör elején (a lecke a V2 sávnak írt levél §6c pontjába került; gépi jele
`verify:decision-numbers` már van, a hiba a HASZNÁLAT idejében volt).

**Mérés a kör végén:** magreferencia **28/28** · mutációs battéria **46/46 észlelt**, 8/8
hazugság-próba, `3/3 kötelező klauzula fedve` · a külső fél programja **9/9** · külső futtató
**3/3 program** · `verify:kuka` **191/191**.

---

## D-VS-3011 — Az R55 hat lelete javítva: a pecsét minden írási úton, és a bizonyíték MÉRÉS

**Kör:** CMD-VS-300-002-001 R55→R56 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R54-re, kilenc érdemi elvárással és egy diagnosztikával.

**A bemenet.** Az R55 programja a saját gépünkön KARAKTERRE reprodukált: **3 teljesült, 6 nem**,
plusz a D01 diagnosztika. Mind a hatot javítottuk. A külső fél elfogadta a G01/G02-t (az R54-es
újrafogalmazott F03) és az F03 mérési hibájának feltárását.

### R55-F01 — a pecsét sorcserével felülírható volt

Az R54-es „append-only" két őrön állt: BEFORE UPDATE és BEFORE DELETE a pecsét-táblán. Két rendes
DML-írás átment rajta, séma- vagy triggerletiltás nélkül:

- **S01** — `INSERT OR REPLACE INTO invite_terms … SELECT … FROM invite`: a REPLACE a régi sort
  TÖRLI és újat ír, a törlés BEFORE DELETE triggerét viszont az SQLite csak bekapcsolt
  `recursive_triggers` mellett futtatja — a kapcsolat alapértéke KI.
- **S02** — `INSERT OR REPLACE INTO invite` ugyanazzal a tokennel, `admin` szereppel.

**Mindkét beváltás sikeres volt, és ADMIN tagságot adott a `user` ajánlatra.** → **KUKA-098**.

**Javítás:** négy őr, mindegyik a BESZÚRÁS oldaláról is zár, tehát pragmától FÜGGETLENÜL —
`invite_terms_no_reseal` · `invite_no_change_sealed` (a KIADOTT mezők nem módosulnak, a
`redeemed_at` igen: az ÉLETCIKLUS külön tengely) · `invite_no_reissue` · `invite_no_delete_sealed`.
Az `openStore` beállítja ÉS visszaolvassa a `recursive_triggers`-t, nevezett hibakóddal áll meg.
A második réteg (beváltás-kori pecsét-összevetés) megmarad, és őrök NÉLKÜLI tárolón külön mérve.

### R55-F02 — a múlt darabszáma megmaradt, a tartalma nem

A Y4 ág `count(*)` értékeket hasonlított. Ha a megvonás ugyanazt a sort MÁS TARTALOMMAL hagyja ott
(`resolved_json` → `{"tampered":true}`), a szám stimmel, az állítás igaz marad, a battéria zöld.
→ **KUKA-099**.

**Javítás:** `auditSnapshot` + `priorRowsSurvive` — a KORÁBBI sorok mindegyike változatlanul,
EGÉSZBEN hasonlítva (így a törlés, a tartalom-átírás és az azonos darabszámú sor-csere egyszerre
fogva), miközben az ÚJ, szabályos audit-bejegyzés hozzáfűzése MEGENGEDETT (pozitív kontroll a
próbában). Három új visszabontási kontroll: **M47** törlés · **M48** tartalom-átírás · **M49**
azonos darabszámú sor-csere.

### R55-F03 — a mutáció NEVE nem a klauzula ellenbizonyítéka

Két lelet egy helyen: **N01** — két, SOHA NEM FUTTATOTT `{id, catcher}` bejegyzés mellett a kapu
mindhárom klauzulát `covered`-nek mondta; **N04** — az M32 KÉT klauzulához volt beírva, de a futása
csak az `A-REV-N1a` állítást buktatja. → **KUKA-100**.

**Javítás:** `falsificationQualifies` — egy mutációs eredmény csak akkor bizonyíték, ha az
alkalmazás igazolt, az alap- és a mutált forrás MÉRT lenyomata megvan és KÜLÖNBÖZIK, van futás-jel,
a NEVEZETT próbáról szól, és a HAMISRA fordult állítások között ott van ÉPP EZ. A referencia-futás
— ami a battéria ELŐTT fut — `falsification_pending` állapotot ad, nem `covered`; a végleges
minősítés a battéria után születik. Az ismétlődő állítás-azonosító integritási hiba (N02), akkor is,
ha a két érték egyforma.

**Mért eredmény:** a REV-N1b visszabontási bizonyítéka ma az **M47**, nem az M32.

### R55-F04 — a szerződés lenyomata nem a szerződésből készült

A `norm_contract.digest` a MI indexünk mezőiből képződött; a K01 címét átírva változatlan maradt
(D01). → **KUKA-101**.

**Javítás:** a kanonikus szerződés saját otthont kapott (`v3ref/normContract.mjs`, NCT-01),
`contractDigest` a SAJÁT bájtjaiból; az index külön `indexDigest`-et kap és hivatkozik a szerződés
verziójára és lenyomatára; `clauseDigest` + `contentReviewState` — a tartalmi jóváhagyás a KONKRÉT
lenyomatokhoz kötődik, és bármelyik változása ELAVULTTÁ teszi (ma mind a 18 klauzula `none`).
**Kimondott hiány:** a K01–K16 teljes szövege a külső félnél él, ezért a `source_document.
text_digest` NULL, nevezett hiánnyal — nem pótoljuk egy hihető hash-sel.

### A saját lelet: a próbához igazított határ

Az R54-ben kiírtam az indokot, amiért az élő sor UPDATE-jét nem tiltom: „elbuktatná a külső fél
saját próbáit". A külső fél ezt VISSZAVONTA, és igaza van. → **KUKA-102**. A szigorúbb határ
bevezetésekor valóban elavult három korábbi eset (R49/C11 · R51/N10 · R53/F01) — mindhárom azért,
mert a veszélyes írás ma már LÉTRE SEM JÖN. Egyiket sem kerültük meg: mindháromhoz átadható
ÚJRAFOGALMAZÁS készült, ellenpárral, és mind a három **megfelel**.

### §7 — a két fogalmi korrekció átvéve a regiszterbe

- **REV-N3** újraszövegezve: a BEJELENTÉS és a JOG MEGVÁLTOZTATÁSA két külön művelet. Új klauzula
  (**REV-N3c**): a bejelentés útja a még nem igazolt panaszosnak is nyitva áll — semleges válasszal
  és visszaélés-korláttal; a jelzés nem művelet a jogon.
- **REV-N5** újraszövegezve: a tiltás HATÓKÖRE az OKÁBÓL származik. A régi mondat feltétel nélkül
  állította, hogy a független könyvet nem érinti — ez kompromittált HITELESÍTŐNÉL téves. Új
  klauzulák: **REV-N5b** (hét nevezett tiltás-fajta, az ok választ) és **REV-N5c** (a könyv és a
  többi jogosult joga nem törlődik).

**Mérés a kör végén:** referencia **28/28 PASS** (két új próba: `P-INVITE-seal`, és a bővített
`P-NORM-evidence` tizenkét támadással) · mutáció **46/46 elkapva**, 0 túlélő, 8/8
hazugság-ellenpróba, falióra 2,8–4,9 mp · az ő programjaik: R49 **29/30**, R51 **13/14**, R53
**3/4**, R55 **8/10** — a hiányzó öt eset MIND az elavult alak (lásd fent), újrafogalmazva **5/5** és
**2/2** · `verify:kuka` **180/180** · söprés **6/6 zöld**.

**Kimondva:** a `3/16` (ma 3/18) arány EBBEN a részindexben értelmezendő — NEM a teljes K01–K16 mag
készültségi aránya. Az alap nincs lezárva; a mini üzleti modulok kapuja zárva marad.

---

## D-VS-3010 — Az R53 négy lelete javítva: a kiadott meghívó pecsétje és a NORMA-BIZONYÍTÉK lánc

**Kör:** CMD-VS-300-002-001 R53→R54 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R52-re, négy célzott ellenpróbával.

**A bemenet.** A mi R49-es harminc esetünk náluk 30/30, az R51-es tizennégy 14/14, a referencia
26/26 PASS, a mutációs futás 43/43. Az ÚJ négyből **egy sem felelt meg** — mind a négyet
reprodukáltuk.

### F01 — a KIADOTT meghívó helyben átírható volt

Az R52-es védelmünk a beváltás KÉT OLVASÁSA KÖZÖTTI változást fogta meg. Ha a sort KORÁBBAN írták
át, mindkét olvasás már az átírt értéket látta: `user` meghívóból **admin tagság** lett. Ez
TOCTOU-védelem volt, nem a kiadott ajánlat változtathatatlansága.

**Javítás:** a kiadáskor `AFTER INSERT` trigger PECSÉTELI a feltételeket egy append-only
`invite_terms` táblába (UPDATE/DELETE trigger tiltja); a beváltás az `authoritativeInvite`
feloldón át a PECSÉTET olvassa, és eltérésnél `invite_terms_changed`. A kapu a CSATORNA-ellenőrzés
UTÁN áll: a pecsét-eltérés a meghívó ténye, azt csak a bizonyított címzett tudhatja meg
(KUKA-083/084).

### F02 — az `inviteTerms` ütköző összefűzése

Két külön feltétel-készlet azonos szöveget adott (`|` és `=` a mezőértékekben). **Javítás:** a
kézi összefűzés helyett a parancsazonosságnál már bevált, zárt, típusos `canonicalize`.

### F03 — a norma „megépült"-nek mondta magát idegen próbára

A régi kapu csak azt kérdezte, hogy a megadott PRÓBANÉV szerepel-e a tervezett készletben. A külső
fél a REV-N1-et az idegen, de létező `P-A04`-re kötötte át: `{"ok":true,"problems":[]}`. **A puszta
LÉTEZÉS nem bizonyíték arra, hogy AZT mérte** → **KUKA-038 VISSZATÉRT**.

**Javítás — a kötés iránya MEGFORDUL.** A norma NEM tárol próbanevet. A MANIFEST próbarekordja
deklarálja, melyik atomi klauzulát melyik ÁLLÍTÁSSAL váltja be (`discharges`), a próba pedig
futásidőben KIADJA az állítás-azonosítóit (`asserts`). Egy klauzula csak akkor fedett, ha
(1) legalább egy manifest-próba deklarálja · (2) MINDEN deklaráló próba rekordja PASS ebben a
futásban · (3) a deklarált állítást a próba tényleg kiadta és igaznak mérte · (4) van mutáció, ami
azt a próbát nevezi elkapónak. A `state` mező MEGSZŰNT: az állapot SZÁMOLÓDIK.

### F04 — a REV-N1 egyik felét senki nem mérte

A külső fél másolatában a megvonás KITÖRÖLTE a korábbi parancsokat, nyugtákat és kiadásokat — a
REV-N1-hez rendelt próba mégis PASS maradt, mert csak azt mérte, hogy megvonás UTÁN nincs ÚJ hatás.
**Egy fél feltételt zártam le, és a védelmet egészként jelentettem** → **KUKA-095 VISSZATÉRT**.

**Javítás:** a REV-N1 HÁROM atomi klauzula (N1a új művelet tiltva · N1b a korábbi esemény megmarad ·
N1c a joghatás külön felülvizsgálatban változhat — ez utóbbi KIMONDOTT hiány, mert más gépezetet
kíván). A `P-CMD-finalize-gate` negyedik ága (Y4) méri, hogy a megvonás után a `command`,
`command_event` és `disclosure` sorok VÁLTOZATLANUL megvannak — ellenpárral, hogy a megvonás hatni
is köteles. Az ő beavatkozásukon a próba bizonyítottan FAIL (`A-REV-N1b` hamis, `A-REV-N1a` igaz).

### A saját két leletünk ebben a körben

**KUKA-096 — a kapu, ami a saját mérését némította el.** A norma-kapu a JSON kiírása ELŐTT lépett ki
2-es kóddal. Az F04 ellenpróbája pontosan ilyen helyzetet állít elő, tehát az ő mérésük nem a bukott
próbát látta volna, hanem egy értelmezhetetlen, JSON nélküli kilépést. Innentől a bizonyíték ELŐBB
megy ki, a kilépési kód UTÁNA dönt; a szerkezeti hazugság (2-es) és a bizonyíték-hiány (1-es) két
külön kijárat.

**KUKA-097 — a kiírt, de nem mért idő-költségvetés.** A 27. próba felvételével a mutációs battéria
15 021 ms-ra nőtt: nálam zöld maradt, az ő harness-ükben IDŐTÚLLÉPÉS lett. A mérés szerint a költség
90%-a a TÁROLÓ FELÉPÍTÉSE volt (20 tárolón 510 ms; `journal_mode=MEMORY` + `synchronous=OFF`
mellett 28 ms) — majdnem a párhuzamosságot hangoltam tovább, mérés nélkül. Ma a falióra ŐRZÖTT: a
saját költségvetés a külső korlát 80%-a, és a `clean` feltétel része. Mért eredmény:
**21 799 ms → 2 012 ms**, változatlan kimenettel.

### §5 · §6 — egyetlen normatív alap és a REV-N1 újraszövegezése

- A futás EGYETLEN kanonikus norma-verziót közöl (`NORM_CONTRACT_VERSION`, a `NORM_VERSION` már nem
  kézzel írt szöveg, hanem ebből származik), mellette KÜLÖN, saját sémaverzióval a bizonyíték-index
  (`NRM-01` · `nrm-2`) és tartalmi lenyomat. Az `NRM-01` a K01–K16 **gépi bizonyíték-indexe** lett:
  minden klauzula megnevezi, melyik K-szabályt indexeli, és a K-szabály MONDATÁT nem ismétli meg.
- A `command.mjs` megcáfolt R50-kommentje **törölve**, a helyén a mai magyarázat áll, kimondva, hogy
  a kódba írt próza sem automatikusan norma.
- A REV-N1 az általuk javasolt szövegre cserélve („…joghatása külön, bizonyítékhoz és alkalmazandó
  profilhoz kötött felülvizsgálatban változhat, új korrekciós eseménnyel").
- A hat `planned` norma sorrendje az ő §7-ük szerint (REV-N3 → REV-N5 → REV-N2 → ORG-N1 → ORG-N3 →
  REV-N4) az `OB-5` lezárási feltételében rögzítve. Operátori döntést nem kértek, nem is kérünk.

### Az ellenpróba, amit MI adunk vissza

Az ő F03 esetük a mai forráson **más okból** zöld: a `probe:` mező, amit a programjuk szövegesen
cserél, MEGSZŰNT (ez volt az ő §4/2 kérésük), tehát a csere no-op, és a `pass` a régi hívási alak
fail-closed viselkedéséből jön. Ezt nem hallgatjuk el: az `f03-restated.mjs` a támadást a MAI
szerződésre fogalmazza újra (a MANIFESTBEN kötjük át a klauzulát az idegen `P-A04`-re) — végponttól
végpontig mérve **2-es kilépés**, és a lelet mindkét irányt megnevezi. Mellette kötelező ellenpár:
érintetlen forráson 0-s kód, a két klauzula fedett.

### Kimondott maradék

Az `OB-7` új blokkoló: a gépezet az ÁTKÖTÉST teszi lehetetlenné, a TARTALMI megfelelést nem tudja
igazolni. Aki egy idegen próbába beleírja a klauzula állítás-azonosítóját, azt a gép nem leplezi le
— a maradék szűkebb lett, de nem nulla, és emberi felülvizsgálat tárgya marad.

**Mérés a kör végén:** referencia **27/27 PASS** · mutáció **43/43 elkapva, 0 túlélő, 0 elavult
horgony, 8/8 hazugság-ellenpróba, falióra 2 012 ms** · az ő programjaik: R49 **30/30**, R51
**14/14**, R53 **4/4** · saját újrafogalmazott F03: **2/2** · `verify:kuka` **160/160**. A három
korlátozott erejű mutáció (M2 · M5 · M38) a futás kimenetén NÉV SZERINT és INDOKKAL látszik — az
elkapás és a bizonyíték ereje két külön tény.

---

## D-VS-3009 — Az R51 tíz lelete javítva; a megvonás és a szervezeti alap a normatív magba

**Kör:** CMD-VS-300-002-001 R51→R52 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R50-re, tizennégy célzott ellenpróbával a JAVÍTÁSAINK VARRATAIN.

**A bemenet.** A ti R49-es harminc esetetek náluk is 30/30. Az ÚJ tizennégyből **négy megfelelt, tíz
nem**. Reprodukáltuk: **10/10, karakterre az ő eredményükkel.**

### A kör legsúlyosabb lelete: a SAJÁT ÁLLÍTÁSOM volt hamis

Az R50 §2.3-ban ezt írtam: *„Ugyanezt a három ágat végigmérve az ISMÉTLÉS és az OLVASÁS MÁR ZÁRVA
VAN — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk."*

**Nem volt zárva.** Az N08/N09 a `store.tx` BELÉPÉSÉNÉL avatkozik be; ott az olvasás visszaadta a
védett `price: 100` tartalmat, az ismétlés a sikeres nyugtát, és mindkettő kiadási sort írt. Az ok:
a saját próbám Y2/Y3 ága a megvonást a HÍVÁS ELŐTT végezte — azt a tranzakción KÍVÜLI ellenőrzés
úgyis elkapja. **Gyengébb esetet mértem, és az erősebb állítást írtam le** — miközben a mondat, amivel
a hatókör-fegyelmemet dicsértem, pontosan ezt a hibát fedte el. → **KUKA-094**.

### A második: az egyik feltételt lezártam, és a védelmet jelentettem késznek

Az R50-es nyugta-könyv védelmét egyetlen mondattal adtam ki („a fajták regisztere ZÁRT"). Négy eset
mutatta meg, mi maradt nyitva MEGENGEDETT fajtanév mellett: árva nyugta nem létező parancsra (N03) ·
második nyugta ugyanarra (N04) · idegen hatásazonosító és lehetetlen állapot (N05) · **nulla soros
beszúrás**, amitől a parancs véglegesült, a válasz sikert mondott, és nyugta sehol nem keletkezett
(N02). → **KUKA-095**.

### A javítások — öt csoport

**J1 · A kiadás engedélyezési pontja a tranzakción BELÜL** (N08 · N09). EGY nevezett feloldó
(`releaseAllowed`), amit MIND A HÁROM kiadó ág hív. A próba mind a három ága UGYANAZT a
tx-belépési beavatkozást kapja, és az olvasó ág a TARTALOM hiányát is méri, nem csak a hibakódot.

**J2 · A meghívó döntése a FRISS sorhoz kötve** (N10 · N11). A feltételek VÁLTOZTATHATATLANOK
(`inviteTerms`, INV-05): ha a döntés és az írás nem ugyanarra a példányra vonatkozik,
`invite_terms_changed` — nem zsákutca, a mondat megmondja, hogy új meghívó kell. A KIMENET a
tranzakción BELÜL számolódik újra; minden írás a friss sorból dolgozik. A régi alak a friss soron
ELLENŐRZÖTT, de a RÉGI példány `admin` szerepét ÍRTA.

**J3 · A nyugta invariánsai kikényszerítve** (N02–N05). SÉMA: idegen kulcs a parancs elsődleges
kulcsára + egyediség a (parancs × esemény) páron. ÍRÓ: csak a véglegesítés tranzakciójából; a
hatásazonosító és az állapot a PARANCS SAJÁT sorához mérve; a beszúrás PONTOSAN egy sort ír.

**J4 · A kiadás nyoma és két fogalmi pontosítás** (N12). Sikeres leltár-írás nélkül a védett
tartalom NEM adható ki (`DISCLOSURE_NOT_LEDGERED`, a tranzakció visszagördül). Mellé a mezőút
TÍPUSOS és ÜTKÖZÉSMENTES lett (`k:` kulcs · `i:` index · `~0`/`~1` védés): az `{"a.b":…}` és az
`{"a":{"b":…}}` többé nem képződik egy útra — ezt nyitott adósságként közöltük, ők megcáfolták,
mert a kár MAGÁBAN A LELTÁRBAN van (incidensnél nem lehetne megmondani, melyik adat jutott ki).

**J5 · A futás azonosítása** (M01). A szülő a VALÓBAN előállított (mutált) forrás-csomagból számolja
az elvárt lenyomatot, és minden gyermeknek EGYEDI futás-jelet oszt ki; eltérés vagy hiány =
MÉRŐHIBA. Két új hazugság-ellenpróba méri (H08 idegen lenyomat · H09 korábbi futás jele).

### Két fogalmi állításunkat ők helyesbítették, és igazuk volt

1. **„a tény SEHOL nem hagyott nyomot"** — TÚL ERŐS. A `command` sor a végleges állapotot MÁR
   rögzítette; az eseménykönyv ettől még hasznos, de KÜLÖN megnevezett szerződésként, nem egy nem
   létező hiány pótlásaként.
2. **A kiadási leltár NEM „KI LÁTOTT" bizonyosság, és NEM csak a kérés előtt is álló adatra
   vonatkozik.** Azt rögzíti, mit ENGEDETT KI a rendszer — a frissen SZÁMOLT, idegen árakat
   felhasználó összesítés is védett adatkiadás. Ha ezt nem mondjuk ki, a következő számolt nézet
   kicsúszik a leltár alól.

### A NORMATÍV MAG — kódban, nem prózában

Új: `v3ref/norms.mjs` (NRM-01). A megvonás protokollja **öt nevezett szabály** (REV-N1…N5), a
megmaradó szervezeti alap **három** (ORG-N1…N3), és **hat nyitott blokkoló** (OB-1…6). A regiszter
nem tud hazudni: `implemented` ⇒ NEVEZETT próba, ami a tervezett készletben SZEREPEL; `planned` ⇒
NEVEZETT hiány, legalább 40 karakter; minden blokkolóhoz INDOK és LEZÁRÁSI FELTÉTEL; padló a
darabszámokon. A futtató KAPUKÉNT futtatja — hamis állapotra 2-es kilépési kód.

**Az őszinte állapot, amit a regiszter kimond:** a nyolc szabályból **kettő** megépült (REV-N1,
ORG-N2), **hat** `planned`. Az ORG-N2 (tiltó alapértelmezés, amíg nincs explicit szervezeti alap)
nem hiányosság, hanem a hiányzó modell helyes kezelése.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél **R51-es tizennégy** esete | **14/14** |
| A külső fél **R49-es változatlan harminc** esete | **30/30** |
| V3 magreferencia próbák | **26/26 PASS** (24 → 26) |
| Mutációs battéria | **43/43 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák | **8/8 védett** (6 → 8) |
| Retired-pattern regiszter | **151/151** |
| Teljes söprés | **6 zöld · 0 piros** |

### Kimondott korlátok

1. **A falóra a MI gépünkön mért szám: 11,8 mp** a 15 000 ms-os korlát mellett. A 43 mutációval a
   négyes párhuzamosság 15,1 mp-et adott — a korlát FÖLÖTT —, ezért négyszeres túlfoglalásra
   váltottunk (mérve: 4 mag → 15,1 · 8 → 14,3 · 12 → 12,6 · 16 → 11,1–11,8 mp, változatlan
   eredménnyel). A külső fél a saját gépén 1,7 mp-et mért; LASSABB gépen a korlát közelebb kerülhet.
2. A hat nyitott blokkoló (OB-1…6) a `norms.mjs`-ben áll, nem itt — hogy a következő kör ne a
   naplóból keresse elő.
3. **Az eredet-ellenőrzés korlátja kimondva:** ELAVULT és IDEGEN FORRÁSÚ csomag ellen véd, nem
   rosszindulat ellen. Egy futtató, ami a szülőtől kapott jelet visszaírja, ezen a kapun átmegy —
   ehhez kriptográfiai hitelesítés kellene, amit nem ígérünk.
4. Az N03–N05 belső írófelület-próbák: nem állítjuk, hogy egy távoli felhasználó ma közvetlenül
   hívhatná ezeket. A közös magfelület megbízhatóságát mérik, a rá épülő mini modulok számára.

---

## D-VS-3008 — A külső fél 30 ellenőrző esete: a hiányzó ŐRÖK megépítve, és a NYUGTA-SZERZŐDÉS

**Kör:** CMD-VS-300-002-001 R49→R50 · sáv: Claude-AUX · a külső fél független ellenőrzése az
R47-es javításunkra.

**A bemenet.** A külső fél a saját, VÁLTOZATLAN próbájával visszamérte az R47-et, és 30 ÚJ esetet
adott a javításaink VARRATAIRA. Ebből 19 bukott. Reprodukáltuk: **19/19, karakterre az ő
számaikkal** — vagyis a leletük megállt, nem kellett hozzá értelmezés.

**A kör legfontosabb megállapítása viszont a SAJÁT kezünkből jött.** A javítások átvezetése után a
saját battériánk 17/17 zöldet és 29/29 elkapott mutációt mutatott. Kísérletként **kitöröltük a
frissen beépített ötsoros véglegesítési kaput** — és a saját battériánk VÁLTOZATLANUL zöld maradt;
egyedül a KÜLSŐ próba esett 30/30-ról 28/30-ra. A kör legfontosabb javítását tehát semmi nem
őrizte a mi oldalunkon. A teljesség-vizsgálat ezután kimutatta: **a hét szükséges saját őrből hat
hiányzott.** → **KUKA-092**.

**A második megállapítás a külső féltől jött, és a mi R47-es INDOKUNKAT cáfolta meg.** Az R47-ben
azzal vezettük ki a befogadás kiadás-sorát, hogy a válasz „nem közöl új tényt": az `effect_id` a
hívó saját bemeneteinek lenyomata, a `state` állandó. Ez **téves**. Az `effect_id` valóban
levezethető, de az, hogy a parancs **VÉGLEGESÜLT-E**, nem a hívó bemenete — az a szerver oldalán
keletkezett új tény, és épp ezért hív a hívó egyáltalán. A `disclosure` sor elhagyása helyes volt
(a befogadás nem kiszolgálás), de a **helyére semmit nem tettünk**, ezért a véglegesítés
nyomtalan maradt. → **KUKA-093**.

### Amit a kör megépített

**1. NYUGTA-SZERZŐDÉS (R50).** Két kérdés, két otthon, de egyik sem üres:
* a `disclosure` arra felel, **KI LÁTOTT** olyan tartalmat, ami a kéréstől függetlenül is állt;
* az új `command_event` könyv arra, **MIT KÖTELEZETT EL a szerver** ebben a kérésben.

A nyugta ALAKJÁT egy feloldó adja (`commandReceipt`), amit a befogadás ÉS az ismétlés is hív —
a hívó a válasz alakjából nem tudja megkülönböztetni a két ágat, a `replayed` mondja meg
(KUKA-039). NYOMOT viszont csak ott hagyunk, ahol a szerver tényleg elkötelezett valamit: az
ismétlés semmit nem ír, tehát nyugta-sort sem szül. A sor a **hatással EGY tranzakcióban**
születik — ez a KUKA-026 ellenpárja: a kudarc nyoma nem utazhat a visszagördülő tranzakcióval,
a siker nyugtája viszont kötelezően azzal utazik, különben meg nem történt hatásról adnánk nyugtát.

**2. VÉGLEGESÍTÉSI KAPU A PARANCS-OLDALON.** A feloldás utáni jog-ellenőrzés a tranzakción KÍVÜL
állt, tehát csak azt zárta le, ami a `resolve()` alatt történt. Mérve: ha a megvonás a `store.tx`
HATÁRÁN következik be, a parancs `finalized` lett és a sor megszületett. Ugyanezt a három ágat
végigmérve az ISMÉTLÉS és az OLVASÁS **már zárva volt** (mindkettő `not_available`, nulla
leltár-sorral) — ezt kimondjuk, hogy a lelet ne legyen tágabb, mint amit mértünk.

**3. HAT ÚJ PRÓBA A HIÁNYZÓ ŐRÖK HELYÉRE** (`P-INVITE-finalize-gate` · `P-CMD-finalize-gate` ·
`P-AUTHZ-roles` · `P-CANON-shape` · `P-TIME-calendar` · `P-IDENTITY-address`), plusz a
`P-CMD-receipt` a nyugta-szerződésre. **24/24 PASS.**

**4. NYOLC ÚJ MUTÁCIÓ** (M31–M38), és az M15 ÚJRA-HORGONYOZVA. **37 mutáció · 37 elkapva · 0
túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony.**

### Amit a saját mérésünk talált a saját munkánkban, a kör közben

* **Az M15 TÚLÉLTE** az első futást — nem azért, mert a hiba nincs meg, hanem mert az új parancs-
  oldali kapu KÉTRÉTEGŰVÉ tette a védelmet, és egyetlen szerkesztés nem tudja kinyitni. A mutációt
  átírtuk: MINDKÉT réteget elveszi. Egy próba, ami nem tud pirosra váltani, nem bizonyít semmit.
* **Az `also` kulcs, amit kitaláltam, NEM LÉTEZETT.** Az M15 újra-horgonyzásához egy második
  szerkesztést egy `also` mezőbe írtam — a futtató viszont soha nem olvasta. Ez a **KUKA-016**
  visszatérése (kitalált mezőnév a regiszterben). Nem lett néma: a mutációs szerződés `SURVIVED`
  ítélete PIROS, tehát a saját eszközünk fogta meg. A helyére `edits` tömb került, EGY normalizálón
  át, MINDEN szerkesztés horgonyát külön mérve.
* **Az M31 TÚLÉLTE** — és ez a saját ÚJ próbám lyuka volt. A `P-INVITE-finalize-gate` három ága az
  ÓRÁT és a TAGSÁG-táblát mozgatta, amiket a kapu úgyis frissen olvas; egyik sem mérte, hogy a
  **MEGHÍVÓ SAJÁT SORÁT** is újra kell olvasni. Két új ág került be: a határon VISSZAVONT meghívó
  (elavult olvasással tagság születne — valódi jogsértés) és a határon KÖZBEN FELHASZNÁLT meghívó
  (elavult olvasással a válasz KIVÉTEL lenne a nevezett elutasítás helyett — KUKA-020).
* **A `P-TIME-calendar` első alakja TÚLKÖVETELT:** azonos indokot vártam a 13. hónapra és a
  február 30-ra. A 13. hónap már ALAKILAG sem időpont, a február 30. viszont szabályos alakú, csak
  nem létező nap — a megkülönböztetés TÖBBET mond, nem kevesebbet. A követelmény az én kitalált
  többletem volt, nem a joghatár része; javítva.

### Mérés

| Mérés | Eredmény |
|---|---|
| A külső fél VÁLTOZATLAN próbája (`check.mjs`, 30 eset) | **30/30** |
| V3 magreferencia próbák (`verify:v3ref`) | **24/24 PASS** |
| Mutációs battéria | **37/37 elkapva**, 0 túlélte, 0 mérőhiba, 0 elavult horgony |
| Hazugság-ellenpróbák (a mérő önmagán) | **6/6 védett** |
| KUKA-regiszter (`verify:kuka`) | **142/142** |
| Teljes söprés (`verify:sweep`) | **6 zöld · 0 env-kihagyás · 0 piros** |

### Kimondott korlátok — amit ez a kör NEM zárt le

1. **A falióra a MI gépünkön mért szám.** 37 mutáció, 4 mag: a mag-számhoz kötött párhuzamosság
   12,0 mp-et adott a külső fél 15 000 ms-os korlátja mellett. A plafon rossz volt: egy
   mutáció-futás nem telíti a magot (folyamat-indítás és modul-betöltés dominál), ezért kétszeres
   túlfoglalásra váltottunk — **9,9 mp, változatlan eredménnyel**. Lassabb gépen a korlát közelebb
   kerülhet; a futás ezért KIÍRJA a mért időt és a korlátot.
2. **A több-írós véglegesítési határ nincs megoldva.** A `node:sqlite` `BEGIN IMMEDIATE` egyetlen
   íróval dolgozik. Postgresen sor-zár vagy verzió-őr kell — ez tervezési adósság, nem elintézett
   kérdés.
3. **A megvonás VISSZAMENŐLEGES hatálya** nyitott: ma a megvonás előre hat, a már megszületett
   hatásokat nem érinti. Hogy ez helyes-e, üzleti döntés, nem technikai.
4. **A `releasedFieldPaths` pont-összefűzése kétértelmű**: az `a.b` nevű mező és az `a` alatti `b`
   ugyanazt az utat adja. Ma nem okoz kárt (a leltár nem kulcs), de nevesített adósság.
5. **A szigorúbb kiadási osztályozót NEM mértük vissza a V2 migrációs korpuszán.** A V3-ban NULLA
   `.sql` migráció van, tehát az a mérés ÜRES halmazon futott — semmit nem bizonyít. Ezt kimondjuk,
   nem hallgatjuk el.
6. **Q17 (műtermék-útvonal ütközése)** és a **bemeneti séma-regiszter** nyitott tételek.
7. **A Q09 „maradék önálló szervezeti alapja"** — a külső fél kérdése — nincs megválaszolva.

---

## D-VS-3007 — A tizenöt megnevezett maghiba javítva, a KÜLSŐ FÉL saját próbáján mérve

**Dátum:** 2026-09-10 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R46 → R47
**Rendelte:** az OPERÁTOR („mehet a Q01–Q15") · **A hibalistát adta:** a KÜLSŐ TÁRGYALÓ FÉL (R42 §3/2)

### 1. Mit mérünk, és miért a TI próbátokkal

A javítás bizonyítéka nem a saját próbánk zöldje. A saját próba a saját olvasatunkat igazolja
vissza (KUKA-054) — ezért a külső fél **változatlan** `challenge.mjs`-ét futtattuk a MAI forráson,
a `source/` alá bemásolt `v3ref/*.mjs` + `contracts/*` állománnyal.

| | R42 (`c58f5f6…`) | ma |
|---|---|---|
| tétel | 17 | 17 |
| **PASS** | **0** | **16** |
| FAIL | 17 | 1 (Q17) |
| ERROR | 0 | 0 |

A fixtúrájuk VÁLTOZATLANUL betöltődött, pedig a séma több ponton változott — tehát nem a mi új
alakunkra szabott próbát mértünk.

### 2. A tizenöt tétel — a javítás helye

| # | hol | mi lett belőle |
|---|---|---|
| Q01 | `command.mjs` · `commandScope` | az ismétlésvédelmi kulcs HATÓKÖRÖS: `(book_id, actor, idem_key)` az elsődleges kulcs; hiányos címre KIVÉTEL, nem néma szűkítés |
| Q02 · Q03 | `command.mjs` · `canonicalize`, `commandIdentity` | REKURZÍV kanonizálás minden szinten; az azonosság a típust ÉS a típus-verziót is lefedi |
| Q04 | `command.mjs` · `submitCommand` | a jog ÚJRA megkérdezve a `resolve()` UTÁN, az INSERT ELŐTT |
| Q05 · Q06 | `authz.mjs` · `instantMs`, `evidenceStandingAt` | a bizonyíték HÁROM tengelye külön: kor · HATÁLY (`valid_until` kötelező) · megvonás; ismeretlen mező nem nyelődik el |
| Q07 | `authz.mjs` · `OP_CLASSES` (Map) | az ÖRÖKÖLT név (`toString` · `constructor` · `__proto__`) nem talál profilt ⇒ fail-closed |
| Q08 | `authz.mjs` · `membershipEffectiveAt` | a tagság KÉT vége EGY feloldón — ugyanezt hívja a meghívó-oldal is |
| Q09 · Q10 · Q13 | `invite.mjs` · `inviteGrantAt`, `redeemShapeFor`, `membershipOutcome` | a kibocsátó MAI joga · az idegen alany őre · négy KÜLÖN tagság-kimenet |
| Q11 · Q12 | `invite.mjs` · `redeemInvite`, `store.tx` | a születés VALÓBAN fiókot hoz létre; minden írás EGY tranzakcióban |
| Q14 · Q15 | `store.mjs` séma + `command.mjs` · `disclose` | a kiadási sor saját azonosítót kapott (az időbélyeg nem azonosság); a feloldott TARTALOM kizárólag a leltározott OLVASÓ úton mehet ki |

Állandó jelek: **16 próba · mind PASS** · **27 mutáció · mind a NEVEZETT állításon elkapva** ·
6 állandó hazugság-ellenpróba · mind védett.

### 3. AMIT A SAJÁT TELJESSÉG-KRITIKÁNK TALÁLT — és a külső fél NEM

> **A LEJÁRT MEGHÍVÓ TAGSÁGOT ADOTT, HA AZ IDŐPONTJA ELTOLÁSOS ZÓNÁBAN ÁLLT.**

A régi kód SZÖVEGET hasonlított (`inv.expires_at <= clock.now()`). Mérve, az akkori ÉLŐ forráson:
`expires_at = '2026-09-09T09:00:00+02:00'` valósan **07:00Z**, az óra 08:00Z — tehát **LEJÁRT**;
szövegként viszont `'…T09…' > '…T08…'`, tehát „még nyitva". A beváltás lefutott, `shape: 'birth'`,
és **tagságot adott**.

Ez a saját KUKA-039-ünk („a fél őr"): a bizonyíték-oldalon bevezettük az `instantMs` feloldót, és a
meghívó-oldalra NEM vittük végig — egy körrel azután, hogy a szabályt idéztük. Javítva
(`inviteWindowAt`), állandó próba `P-INVITE-window`, mutáció **M21**.

### 4. A Q14 — ELŐSZÖR TÉVEDTÜNK, ÉS A SAJÁT MÉRÉSÜNK CÁFOLT MEG

Ezt a kört először azzal a mondattal zártuk volna, hogy *„a Q14 azért bukik, mert a külső fél Q14 és
Q15 elvárása ütközik"*. **Ez téves volt.** A cáfolat nem érvelésből jött, hanem abból, hogy a saját
állításunkat próbáltuk megbuktatni: a Q15 állítása `!r.resolved || count > 0`, tehát a BAL ág is
elég — arra nem gondoltunk. Négy alakon lemérve a külső fél KÉT állítását:

| alak | a beadás ad tartalmat? | leltároz? | sorok | Q14 | Q15 |
|---|---|---|---|---|---|
| **A** — az akkori alakunk | igen | igen | 3 | **FAIL** | PASS |
| **B** — nem ad, nem leltároz | nem | nem | 2 | **PASS** | PASS |
| **C** — nem ad, de leltározza az `effect_id`/`state`-et | nem | igen | 3 | **FAIL** | PASS |

Létezik tehát olyan alak, amiben MINDKETTŐ teljesül: az ütközés a MI tervezői döntésünkből eredt.

**A javítás mégsem a „B" lett** — nem a zöldhöz igazítottuk a kódot, hanem megkérdeztük, MIT TUD MEG
a hívó az egyes ágakon:

- **BEFOGADÁS:** az `effect_id` a hívó SAJÁT bemeneteinek lenyomata (`hash(book|actor|idem_key)`),
  a `state` ezen az ágon állandó — a hívó semmi olyat nem tud meg, amit ne ő adott volna. Ami nem
  közöl új tényt, arra leltár-sort írni zaj, nem védelem.
- **ISMÉTLÉS:** a válasz egy MÁR LÉTEZŐ parancs állapotát közli — ÚJ tény, marad leltározva.
- **A FELOLDOTT TARTALOM:** kiszolgálás, tehát KIZÁRÓLAG a leltározott olvasó úton mehet ki.
  A külső fél szavaival: a beadás válasza „ELŐKÉSZÍTVE", nem „KISZOLGÁLVA".

A `command_accept` kiadás-fajta ezért **kivezetve** — a szó is, nem csak a hívás: a `disclose`
ismeretlen fajtaként DOB rá, ha valaki visszatenné (KUKA-052, fail-closed).

**Ettől a tartalomnak EGYETLEN kijárata maradt** (korábban kettő) — tehát a javítás nem csak zöldre
vitte a Q14-et, hanem szigorúbb adatkiadási alakot is adott. Két mutáció őrzi mindkét irányt:
**M16** (a beadás megint kiszolgál, leltár nélkül) és **M27** (az ismétlés nyom nélkül közli egy
létező parancs állapotát) — mindkettő bizonyítottan PIROS.

**A TANULSÁG, amit magunkra nézve rögzítünk:** amikor egy KÜLSŐ próba bukik, és a magyarázatunk az,
hogy *a próba a hibás*, az a létező legönigazolóbb helyzet (KUKA-054 a saját védekezésünkön).
Ilyenkor nem magyarázni kell, hanem a SAJÁT állítást megcáfolni — itt ez történt, és a cáfolat nem
csak a tévedést mutatta meg, hanem egy jobb alakot is.

**Q17 — az egyetlen megmaradt FAIL, valódi és NYITOTT.** Két azonos hívás ugyanazt az útnevet adja.
Szándékosan nem javítva: az operátor a Q01–Q15-öt rendelte meg, és az R46-ban már visszavontuk a
korábbi „Q17 kész" állításunkat. Ez **kockázat, nem ütemezés**: amint a rendszer valódi állományokat
ír, két egyidejű futás felülírhatja egymást. A következő kör bemenete.

### 5. A FELÜLVIZSGÁLATOK MARADÉKAI — mondatonként, gépi őrrel

Az R42 hat próbához adott hatókörös ítéletet, és mindegyikhez **maradékot** írt, ami NÉV SZERINT
sorolta a Q01–Q15 ellenpéldákat. Ha csak annyit írnánk, hogy „javítva", a lap a mai kódról állítana
valótlant (KUKA-050) — a vallomást viszont nem írjuk át, mert az TÖRTÉNELEM (KUKA-062).

Ezért KÜLÖN rekord áll melléjük: `v3ref/reviews.mjs` → **`RESIDUAL_RESOLUTIONS`**. Mért mai állás:

**23 mondat · 15 próbával MÉRVE · 0 „javítva de méretlen" · 8 NYITOTT** — és a nyolc nyitott a
futtató képernyőjén NÉV SZERINT megjelenik (HTTP-réteg · fiókváltási út · belépés ·
csatornabizonyítás · MFA · `pending_intent` lejárat · a szándék-életút · a 24 óra mint
tesztparaméter).

**A lezárás nem lehet szó.** A `checkResolutions` a futtató INDÍTÁSAKOR fut, és négy irányban mér;
bizonyítottan piros mind a háromra, amit kipróbáltunk:

- kitalált mondat (nem szerepel a vallomás maradékában) → *„a mondat SZÓ SZERINT nem szerepel"*
- „mérve", de nem létező próbára → *„a megnevezett próba nincs a szerződésben"*
- néma lezárás, érdemi indok nélkül → *„az indok túl rövid"*

Mindkét irányban mér: amelyik vallomásnak van maradéka, ahhoz KELL bejegyzés (KUKA-039).

### 6. Egy maradék, amit ÚJRA megmértünk — és igazuk volt

Az R42 a P-A14-hez ezt írta: *„a megvonás → képviseleti lekérdezés kombináció külön hiányzik"*.
A tizenöt javítás után újra megnéztük: a kombinációt **semmi nem mérte**. A meglévő ág a BIZONYÍTÉK
megvonását nézte (`revoked: true`) — az MÁSIK tengely.

Pótolva: a `P-AUTHZ-evidence` utolsó ága visszavonja a TAGSÁGOT, majd hibátlan, friss megbízással
kérdez ⇒ `membership_revoked`. Új mutáció (**M26**) megcseréli a két ág sorrendjét, és
bizonyítottan pirosra viszi — mert a képviseleti ág `return`-öl, tehát a sorrend-csere NÉMÁN adna
`allowed: true`-t (KUKA-002: két tengely, és a sorrendjük a szabály).

### 7. Ami NEM történt meg — kimondva

- **A08 konkurencia** (R42 §3/3): valódi párhuzamos kapcsolatokkal. A Q04 determinisztikus
  ellenpróbája NEM helyettesíti.
- **A07 + A15** (§3/4) · **A06 · A05 · A01/A02 · A09 · A10** (§3/5) · **Q17** (4. pont).
- **Bemenet-séma-regiszter** — enélkül a Q02 „ismeretlen mező ELUTASÍTÁSA" fele nem teljesíthető.
  Ma az ismeretlen mező az AZONOSSÁGBA beleszámít (nem tűnik el), de nem tiltott.
- **A „megmaradó független szervezeti alap"** (Q09) nincs modellezve: ma a kibocsátó személyes
  joga az EGYETLEN alap.
- **Visszaállítási próba** ütemezve, az első éles adat ELŐTT; **migráció-ujjlenyomat** védett
  kiadási alapvonalhoz mérve. Mindkettő NEVESÍTETT függő.

### Gépi jelek

- `npm run verify:v3ref` — 16 próba + **27** mutáció + 6 hazugság-ellenpróba
- `npm run verify:sweep` — teljes söprés
- a maradék-őr a futtatóba van kötve (`checkResolutions`), tehát nem külön parancs: hibás
  maradék-tábla mellett a próbafutás **2-es kóddal** áll meg, mielőtt bármit mérne

---

## D-VS-3006 — A mérő ÖT további alakban hazudott, és a kiadási őr átengedte, amit elutasított

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45 → R46
**Megtalálta: a KÜLSŐ TÁRGYALÓ FÉL** (R45 — ANALYSIS), 19 rögzített ellenpróbával.

### 1. A mérő: a Q18 javítása után ÖT testvér-alak maradt életben

A `71c69bb` forráson mérve, mind reprodukálva — a mérő „10 mutáció · 10 elkapva"-t írt ki és
**0-val zárt**:

| # | Támadás | Miért nyerte meg |
|---|---|---|
| **H02** | a mutáns indulása UTÁN `process.exit(86)`, JSON nélkül | az M5 `runtime_error` szerződése BÁRMILYEN kivételt elfogadott — a teljes futtató hibáját is |
| **H03** | egyetlen próba sem futott, csak `SKIP` rekordok a hat ismert azonosítóhoz | a `status !== 'PASS'` bármit „bukott állításnak" vett |
| **H04** | csak a BUKOTT rekordok a kimenetben | a hiányzó négy rekordot semmi nem nézte |
| **H05** | valódi JSON, de a futtató 86-tal lép ki | értelmezhető JSON mellett a rendellenes folyamat-kilépés elveszett |
| **H06** | idegen infrastruktúra-kivétel a nevezett próbán | a mérő nem nézte, hogy a MEGFELELŐ ÁLLÍTÁS bukott-e el |

**A közös gyökér:** a mérő a VÁRT PRÓBAKÉSZLETET a FUTÁS EREDMÉNYÉBŐL olvasta ki — vagyis
**a mért féltől kérdezte meg, mit kellett volna mérnie** (KUKA-054 a mérő-eszközön). A saját,
egy körrel korábbi Q18-kapunk mind az ötben ZÖLD maradt, mert azt mérte, VAN-E JSON, nem azt,
hogy ÉRVÉNYES-E A MÉRÉS. **KUKA-090.**

### 2. A javítás: előbb érvényes mérés, utána ítélet

1. **A várt készlet KÜLSŐ szerződés** — `v3ref/manifest.mjs`: nevezett próbák + a hozzájuk tartozó
   ÁLLÍTÁS azonosítója. Hiányzó · ismétlődő · ISMERETLEN azonosító egyaránt mérőhiba.
2. **Típusos kimenetek** — `PASS` · `FAIL` (nevezett állítás) · `THREW` (hibakód + fázis) · `SKIP` ·
   `NOT_STARTED`. Bizonyíték CSAK a `FAIL`.
3. **A kilépési kód szerződés** (0 vagy 1), és az eredménnyel való ellentmondása mérőhiba.
4. **A `runtime_error` SZŰKÍTVE** — csak a próbán BELÜLI, ELŐRE megnevezett hibakódú és fázisú
   kivétel. Az M5 szerződése mostantól `ERR_SQLITE_ERROR` · `probe_body`, **mérésből**.
5. **Az elkapáshoz a NEVEZETT ÁLLÍTÁS kell** (`assertion_id`), nem elég, hogy „valami történt".
6. **HAT állandó hazugság-ellenpróba** minden futáskor (Q18 · H03 · H04 · H05 · H06 · H0X), és
   mindegyiknél MINDKÉT szerződés alatt tilos az elkapás.

**Mérve:** 6/6 ellenpróba védett · 10/10 mutáció a NEVEZETT ÁLLÍTÁSSAL elkapva · visszacsúszásra
bizonyítottan piros (az M5 hibakódját átírva → `WRONG_CATCHER`, kilépési kód 1).

### 3. Q16: a javítás eljutott az osztályozóig, a fogyasztójáig nem

Az előző kör az OSZTÁLYOZÓT javította — az azóta helyesen mond `data_change, ok:false`-t a
`TRUNCATE TABLE partner`-re. **De a teljes kiadási őr csak a `contract` csoport elutasítását
nézte**, tehát egy tábla-ürítés mellett **27/27 PASS, exit 0**.

**Ez PONTOSAN a mai `docs:html` lelet osztálya** (D-VS-3004): a darab ép volt, a VISZONY halott
(KUKA-024). A külső fél maga is így nevezte meg. Javítva: **minden megvizsgált migráció MINDEN
elutasítása megállítja a teljes ellenőrzést**, és a mondat megnevezi a fájlt, a besorolást és az
indokot (KUKA-064).

### 4. És a besorolás JELENTÉSE — öt további lelet

| # | Alak | Volt | Lett |
|---|---|---|---|
| **L03** | `ADD CONSTRAINT … CHECK … NOT VALID` | `expand, ok:true` | `restrictive, ok:false` |
| **L04** | `CREATE UNIQUE INDEX` | `expand, ok:true` | `restrictive, ok:false` |
| **L05** | `ADD COLUMN … NOT NULL` | `expand, ok:true` | `restrictive, ok:false` |
| **L06** | vegyes fájl: `DROP` + `UPDATE` | `data_change, ok:true`, a kivezetés ELVESZETT | mindkét kötelem külön, `ok:false` fejléc nélkül |
| **L07** | `-- BESOROLÁS: expand` egy `SELECT 1` fölött | elutasítva, UGYANAZT a fejlécet kérve | `unknown` besorolással átmegy — az ajánlott folytatás MŰKÖDIK |

**A SAJÁT FIXTÚRÁM INDOKLÁSA VOLT HAMIS.** A régi sor azt állította, hogy a `NOT VALID` megszorítás
„a régi írókat nem zárja ki". A PostgreSQL szerint a `NOT VALID` csak a MEGLÉVŐ sorok
végigellenőrzését halasztja el — az ÚJ beszúrást a feltétel MÁR korlátozza. A fixtúra tehát egy
hamis állítást őrzött zölden (**KUKA-068**: a pin védte a hibát).

Az L03–L05 nem TILTOTT: csak nem BIZONYÍTOTTAN ártalmatlan. Saját alakot kaptak (`restrictive`), és
a szerzőnek ki kell mondania, hogyan marad kompatibilis a régi író. Az L06 tanulsága, hogy **a
kötelmek ÖSSZEADÓDNAK, nem versenyeznek**: egy adatváltozási indoklás nem helyettesít kivezetést.

### 5. P01: a bemondott commit nem forrás-azonosság

A külső fél a ténylegesen `71c69bb`-n futó programnak a RÉGI `c58f5f6` commitot adta át
`--source-commit`-ként, és a kimenet ezt „a mai forrásra érvényes"-nek mondta. **A bemondott commit
puszta ÁLLÍTÁS** (KUKA-056 a forráson). Javítva: a futtató KISZÁMOLJA a saját forrás-csomagja
tartalmi lenyomatát (`source_digest`), és a bemondott érték külön, `declared_source_commit` néven
áll. Mellé `run_id` — két futás eredménye ne legyen összekeverhető.

### 6. Amit a külső fél a SAJÁT állításaimból cáfolt meg

- **„az UTC-időpont még nincs"** — HAMIS volt; a rekord `at` mezője már akkor is UTC-ben állt.
- **„Q16, Q17, Q18 kész"** — ebben az általános alakban nem tartható (lásd fent).
- **„a mini modulok a 4. pont után indulhatnak"** — nem: az 5. pont esetei a mag HATÁRÁT érintik.
- **„adatbázis nélkül fut"** — pontatlan: elkülönített SQLite-ot használ.
- **„a PITR-rel a legrosszabb eset másodpercek"** — a szolgáltatás LEÍRT képessége, nem mért
  garancia; vállalássá visszaállítási próbával válik.

Mind az öt átvezetve a lapokon (KUKA-050: a szöveg a valóságot követi).

### 7. Gépi jelek

`npm run verify:v3ref` (6 próba + 6 hazugság-ellenpróba + 10 mutáció) · `verify:release-order`
**35/35** (nyolc új fixtúrával) · `verify:kuka` (90 tanulság, mind otthonnal) · `verify:sweep`
6/6 zöld. **Nyitva marad:** a Q01–Q15 magviselkedés — az a következő kör, most már a helyesbített
mérővel.

## D-VS-3005 — A blokk-határ 700 → 3000: a V2 egy héten belül elfogyott volna

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R45
**Megtalálta: az OPERÁTOR** — *„biztos hogy jó, hogy 700-tól már a v3 van? hova mennek majd a v2-nek
a maradék apró dolgai?"*

### A lelet — mérve, nem tippelve

A D-VS-3000 a V3-nak a **700-as** blokkot adta. A kérdésre elvégzett mérés (a V2 repó git-történetéből,
`DECISION_LOG.md` a `main` egymást követő állapotain):

| dátum | legmagasabb D-VS | Δ | ütem |
|---|---|---|---|
| 2026-08-18 | 433 | — | — |
| 2026-08-22 | 520 | +87 | 21,8 / nap |
| 2026-08-26 | 577 | +57 | 14,3 / nap |
| 2026-08-30 | 607 | +30 | 7,5 / nap |
| 2026-09-03 | 642 | +35 | 8,8 / nap |
| 2026-09-06 | 659 | +17 | 5,7 / nap |
| 2026-09-09 | 670 | +11 | 3,7 / nap |

**237 szám 22 nap alatt (~10,8/nap), a mai ütem 3,7/nap.** A V2-nek a 700-as határig **29** száma
maradt — vagyis a mai, leglassabb ütemen is **kb. egy hét**, az átlagon **három nap**.

És a V2 nem áll le. Az operátor kimondta: a Claude-DEV sávval folytatódik minden, ami nem érinti
erősen a jogosultságot; a folyamatok maradnak, amíg alapszinten működnek; három cégtér használja a
KS kiváltására; a **Shoprenter-szinkron még nem működik**. Tehát nem „pár apró dolog" jön még.

### Miért ez a legrosszabb fajta hiba

A túlcsordulás **NÉMA lett volna**: a V2 kiadja a D-VS-700-at, a V3 is — és a `D-VS-…` onnantól
két különböző döntést jelöl, két repóban, visszamenőleg javíthatatlanul (a szám kódba, KUKA-
bejegyzésekbe, board-körökbe és képernyőkre is beég). Ez a **KUKA-045** alakja a névtéren: a kézzel
léptetett határ nem szabály, hanem tipp a jövőről — és a tévedése nem jelez.

### A javítás

**A V3 blokkja 3000-től.** A meglévő öt bejegyzés átszámozva: D-VS-700…704 → **D-VS-3000…5004**
(11 fájlban, minden hivatkozással együtt — egy napos, öt bejegyzés, ez volt a legolcsóbb pillanat).

**A határ mérésből számolt fedezet:** 3000 − 671 = **2329 szabad szám** a V2-nek, ami a MÉRT
leggyorsabb ütemen (10,8/nap) is 215 nap, a mai ütemen (3,7/nap) másfél év. A V2 ennél hamarabb
nyugdíjba megy — és ha mégsem, a V2 őre 250 szabad szám alatt FIGYELMEZTET, jóval a baj előtt.

### A HATÁR A REPÓÉ, NEM A VERZIÓÉ — az operátor javaslata, egy pontosítással

Operátori kérdés: *„»3000« a v3-ból kiindulva? majd 4000 a v4-től?"* — **a 3000-et átvettem, a
verziónkénti blokkot NEM.** A különbség:

- **A szám a REPÓT jelöli, nem a verziót.** A 3000 ma emlékeztet a V3-ra, és ez kényelmes — de a
  jelentése az, hogy *ezt a blokkot a `valach-system` repó naplója osztja*, **felső határ nélkül**.
- **Miért nem 4000 a V4-től:** mert a V4 UGYANEBBEN a repóban születne. A repó neve szándékosan
  verzió-semleges (D-VS-3000: a verzió git-CÍMKE, nem név), tehát a V3→V4 váltás nem repó-váltás.
  Ha a szám verzió szerint hasadna, EGY repó naplója két blokkra esne, és a számból többé nem
  lehetne megmondani, melyik RENDSZERRŐL beszél — épp az a kétértelműség jönne vissza, amit most
  szüntetünk meg (**KUKA-061**: új név = új fogalom, akkor is, ha nem akartuk).
- **Nem is fogy el:** a blokk felfelé nyitott, tehát a V4 egyszerűen folytatja (3xxx → 4xxx → …)
  ugyanabban a naplóban. Új blokk-határ csak ÚJ REPÓNÁL kell — akkor a következő szabad ezresnél.

**Amit NEM választottunk, és miért:** külön előtag (`D-V3-…`). Az soha nem ütközne, de ugyanabba a
csapdába lép: a VERZIÓT tenné egy állandó azonosítóba.

### Gépi jel — MINDKÉT repóban, és a fogyás LÁTSZIK

- **V3:** `verify:decision-numbers` **DNR03** — minden szám `>= 3000`.
- **V2:** `verify:decision-numbers` **DNR04** (ÚJ) — minden szám `< 3000`. **Eddig NEM volt felső
  határ ezen az oldalon**, tehát a V2 vidáman átlépett volna a V3 blokkjába. Visszacsúszásra mérve:
  egy `D-VS-3001` fejléc a V2 naplójában → `3/4 PASS — 1 FAIL`.
- **És a némaság ellen:** a V2 őre minden futáskor **kiírja a maradék szabad helyet**, és 250 alatt
  FIGYELMEZTET a teendővel. A blokk elfogyása így rendszer-állapot, nem egy `.md`-ben álló mondat
  (KUKA-019) — jóval a baj előtt megszólal, nem akkor, amikor már késő.

## D-VS-3004 — A `docs:html` a repó megnyitása óta NULLA lapot készített, és sikert jelentett

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Megtalálta:** a saját munkám — az operátornak szánt állapot-lap készítésekor futtattam a parancsot.

### A lelet

A `package.json` `docs:html` sora `--all` kapcsolót adott át; az eszköz a `--mind`-ot ismeri.
A kapcsoló nem egyezett, tehát a cél-lista ÜRES maradt, és a parancs ezt írta ki:

```
0 lap elkészült ide: docs/_olvashato/
```

— **nulla kilépési kóddal**, „Nyisd meg dupla kattintással" zárómondattal. Tehát a repó megnyitása
óta (D-VS-3000) **egyetlen olvasható lap sem készült**, miközben a parancs sikeresnek látszott. És
pont ez az a parancs, ami az operátor EGYETLEN olvasható alakját állítja elő (KUKA-079).

### Miért nem fogta meg a söprés

A `verify:doc-html` DHT06 tétele azt mérte, hogy a `docs:html` sor **hivatkozik-e** az eszközre
(`.includes('vs_doc_html.mjs')`). Ez igaz volt. A **viszonyt** — hogy a leírt parancs tényleg
készít-e lapot — semmi nem mérte (**KUKA-024**: két hibátlan oldal együtt is lehet halott lánc).

### A hiba osztálya: KUKA-036, visszatérve — a saját nyitó csomagomban

Réteg-határon átmenő azonosítót (itt: egy kapcsoló nevét) **emlékezetből** írtam a `package.json`-ba,
ahelyett hogy az eszköztől kérdeztem volna meg. A néma siker pedig **KUKA-012 · KUKA-041**: az üres
eredmény sikerként jelentve. A regiszter KUKA-036 bejegyzése kiegészítve, VISSZATÉRT jelöléssel.

### A javítás — három darab, mind kell

1. **A kapcsoló-lista EGY otthonban, exportálva:** `ALL_FLAGS` a `tools/vs_doc_html.mjs`-ben.
   A `package.json` értékét a pin EHHEZ méri, nem egy második, kézi másolathoz (KUKA-018).
2. **Több írásmód elismerve** (`--mind` · `--all`) — egy be/ki kapcsoló ne EGYETLEN titkos írásmódot
   ismerjen el (**KUKA-014**); a feloldó egy, a nevek többen lehetnek.
3. **A NULLA lap PIROS**, mondattal, ami kiírja a helyes hívást és a kapott kapcsolókat — nem
   zsákutca (**KUKA-064**).

### Gépi jel

`npm run verify:doc-html` **DHT07**: a pin **LEFUTTATJA** a `package.json`-ban álló `docs:html`
parancsot, és lapokat követel (**padló 1**); mellé ellenpróba: ismeretlen kapcsolóval az eszköznek
**1-gyel** kell zárnia. **Visszacsúszásra mérve piros** — a `--minden` alakkal a DHT07 FAIL, a
söprés piros. A pin ma 9/9, a söprés 6/6.

---

## D-VS-3003 — A repó-terv három kérdése lezárva: a PITR BE VAN KAPCSOLVA

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R44
**Forrás:** operátori válasz — *„a pitr engedélyezve van a railway / valach-family projects /
valach-system -ben"*

### A három kérdés (V3_REPO_ES_UZEM_TERV.md §7) — mind megválaszolva

| # | Kérdés | Operátori válasz |
|---|---|---|
| 1 | A repó neve | **`valach-family/valach-system`** — *„ok, valach-system mehet"* |
| 2 | Három környezet (éles · teszt · demo mint cégtér a tesztben) | **rendben** — *„a három környezet is jó"* |
| 3 | Be van-e kapcsolva az időpontra visszaállítás (PITR) | **IGEN**, a `valach-system` projekten |

### Amit a 3. válasz eldönt — és amit NEM

**Eldönti a legrosszabb esetet:** a maximális adatvesztés **másodperc-nagyságrend**, nem az utolsó
mentésig terjedő akár 24 óra. Ez a repó-terv §4-ének első száma, és eddig nyitva állt.

**NEM dönti el a visszaállítás rendjét, és ezt ki kell mondani** (KUKA-050 — a szöveg a valóságot
kövesse, a képesség megléte nem eljárás): a bekapcsolt PITR **nem** teszi a visszaállítást első
eszközzé. A §4 szabálya változatlan: *a rossz kiadást a KÓD visszagörgetése javítja, nem az adatbázis
visszaállítása* — a visszaállítás a mentési pont óta született MINDEN valódi munkát eldobná.
A PITR a végső háló, három nevesített esetre: valódi adat-sérülés · téves tömeges törlés · olyan
romlás, amit célzott javító-esemény nem tud helyrehozni.

**És a képesség megléte nem bizonyíték arra, hogy működik** (KUKA-038). A `backups`/PITR-út egyetlen
érvényes bizonyítéka egy lefuttatott visszaállítás. **Nevesített függő:** az első éles adat előtt
ütemezett visszaállítás-gyakorlat, a V2-ből átemelt eszközzel. Amíg ez nem futott le, a
visszaállítási képességet sehol nem jelentjük késznek.

### Gépi jel

Ezen a körön **nincs új gépi jel, és ez kimondott**: a PITR a Railway szolgáltatás-beállítása, a
repó kódjából nem mérhető. A jel akkor születik meg, amikor az első visszaállítás-gyakorlat lefut —
a kimenete a `var/reports/` alá, a névszabály szerint.

---

## D-VS-3002 — A mérőműszer hazudott: a Q18 reprodukálva és lezárva

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Kör:** CMD-VS-300-002-001 R42 → R43
**Forrás:** a külső tárgyaló fél független ellenőrzése (R42 — ANALYSIS), 17 kiegészítő eset.

### 1. A lelet, ami mindent megelőz

A külső fél a `run.mjs` helyére azonnal 86-tal kilépő programot tett — se JSON, se lefutott próba.
A `mutate.mjs` erre **„10 mutáció · 10 elkapva"**-t írt ki és **0-val zárt**. **Reprodukáltam.**

Egy sor okozta: `catch { failed = ['(a futás összeomlott)']; }` — a JSON-hibát BIZONYÍTÉKNAK
számolta. Mellette a `wrongCatcher` ki volt számolva, de a kilépési feltétel nem használta.

**Ez a KUKA-051/089 a mérő-eszközön** — a lehető legrosszabb helyen: ha a mérő zöldet mond a
semmire, minden rá hivatkozó bizonyíték nem gyengébb, hanem **hamis**. Az R33 „10/10 mutáció
elkapva" állítása ezért nem az volt, aminek jelentettem; visszamenőleg nem hitelesítem.

### 2. A javítás

Öt ítélet (`CAUGHT` · `WRONG_CATCHER` · `SURVIVED` · `HARNESS_ERROR` · `STALE_ANCHOR`), és minden
nem-`CAUGHT` piros. A hiba SOHA nem észlelés. A **megnevezett** próbának kell buknia. Futásidejű
kivétel csak akkor bizonyíték, ha a mutáció szerződése előre kimondja — és a kimenet kiírja, hogy a
bizonyíték ereje korlátozott.

**És a lényeg: két ÁLLANDÓ kapu minden futáskor** — (a) az alapvonal zöld-e, (b) a **Q18-ellenpróba**:
egy szándékosan elrontott futtatót `HARNESS_ERROR`-nak kell minősíteni. A (b) minden futásnál
elvégzi a külső fél támadását a saját kódunkon. Ez az egyetlen dolog, amitől a többi számnak értéke
van.

**Bizonyítva:** a Q18-támadás a javított mérőn → alapvonal-kapu piros, a mutációk **nem futnak**,
kilépési kód 1. Az M6 elkapóját `P-A08`-ra írva → `WRONG_CATCHER`, kilépési kód 1.

### 3. Három további, ugyanebből a pontból

- **`v3ref:evidence` nem létezett**, pedig az R33 rá hivatkozott — nem létező futtatóra hivatkozó
  riport (KUKA-011/038 osztálya). Felvéve.
- **`executed_by: 'Claude-AUX'` beégetve** — a rekord akkor is a mi nevünket vitte, amikor a külső
  fél futtatta a saját gépén: a bizonyíték a végrehajtójáról hazudott (KUKA-056). Most
  `--executed-by=` / env / kimondott `unknown`.
- **A hatókör nélküli `verified_by`** üresen marad; helyette próbánkénti, hatókörös rekordok
  (`v3ref/reviews.mjs`) **`residual` mezővel** és `gate_closed: false`-szal, a forrás-committhoz
  kötve — az elévülés kimondva (KUKA-041 · KUKA-050).

### 4. És három lelet a SAJÁT, EGY KÖRREL KORÁBBI őreimben

Nem a külső fél sorrendjének 2. pontja, hanem **hamis biztonságot állítottak** — ezért nem vártak:

- **Q16:** a kiadási menetrend őre KIZÁRÓ felsorolással dolgozott, ezért a `TRUNCATE`, a
  `DROP legacy_code` (a `COLUMN` szó a Postgresben **opcionális**), az azonnal érvényesített `CHECK`
  és a `DELETE` mind **`expand, ok:true`** választ kapott. Most **megengedő szabály** (KUKA-057):
  `expand` · `contract` · `data_change` · `unknown`, és csak az ismert-biztonságos megy át magától.
  Kimondva a kódban: **az őr előszűrő, nem SQL-értelmező.**
- **SemVer:** `3.1.0-alpha` és `3.1.0` között 0-t adott, és elfogadta a `03.1.0` alakot. Szigorú
  parse + előkiadás-rendezés (semver.org 11.4).
- **`artifactNaming`:** `area:'toString'` → `undefined/…` út (örökölt kulcs), perjeles „verzió" →
  útvonal-részek a névben. Sajátkulcs-ellenőrzés + szigorú verzió-alak.

**Mind a hat új viselkedés FIXTÚRÁVAL őrizve** — hogy ne ismétlődjön a Q16 osztálya: új ág, mérés
nélkül. `verify:release-order` 27/27 · `verify:artifact-naming` 28/28.

### 5. Ami NEM történt meg — kimondva

- **Az R42 §3 2–5. pontja el sem kezdődött** (Q01–Q15 magviselkedés · A08 konkurencia · A07+A15 ·
  a többi core-eset). Szándékosan: a mérő hibás volt, tehát bármilyen „a mutáció megfogja" állítás
  addig értéktelen lett volna.
- **Q17 valódi íróra** (futásazonosító + atomi létrehozás) — ilyen író ma nincs; a helye az elsőnél.
- **A gépi bizonyíték teljes mezőkészlete** részben van meg: UTC-időpont, futásazonosító és tartalmi
  lenyomat még **nincs**.
- **Egyetlen kapu sem billent át.** A G4/G5/G6 nyitva marad.

## D-VS-3001 — A generált fájlok neve és helye: `v3_v3.1.1_20260909_104201_…` a `var/` alatt

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX
**Operátori parancs:** *„Az újra generálódó fileok (script logok, backupok) a következő file néven
legyenek: v3_v3.1.1_20260909_104201_… A könyvtárstuktúra nagyjából már jó volt a v2-ben is, de nézd
át azért, és ezek alapján készüljön minden."*

### 1. A V2 átnézése — három lelet, mérve

| Lelet | Mért adat |
|---|---|
| **Szétszórt otthon** | a generált kimenet **kilenc** helyre ment: `backups/` · `runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` · `i18n_atiras/` · `logs/` · `tmp/` — mindegyik külön alkalommal, külön `.gitignore`-sorral (KUKA-018 · KUKA-003) |
| **`undefined/`** | egy elrontott út `undefined` nevű könyvtárat hozott létre — és az **KÖVETETT** a gitben, **3 PNG-vel**. Nem gitignore-olva, tehát a hiba be is került a repóba |
| **40 kézzel gyártott név** | 40 szerszám épít időbélyeges fájlnevet kézzel, legalább **három** különböző alakban (`toISOString().slice(0,19).replace(/[:T]/g,'')` · `.replace(/[-:T]/g,'').slice(0,12)` · `.slice(0,10)`) — egy fogalom, negyven másolat, három nyelvjárás |

Az operátor „nagyjából jó volt" ítélete pontos: a **szerkezet** helyes (a generált kimenet a
forráson kívül, gitignore-olva), a **darabszám** és a **kézi névgyártás** a gyenge pont.

### 2. A döntés

- **A NÉV:** `v3_v3.1.1_20260909_104201_<mit>.<kiterjesztés>` — pontosan az operátor kérése szerint.
  Nevet **soha nem gépelünk**: `artifactPath({ area, kind, ext, version })`
  (`contracts/artifactNaming.js`, REL-01 mintájára nevezett feloldó).
- **A verzió a `package.json`-ból jön**, nem emlékezetből (KUKA-005 · KUKA-033).
- **Az idő a gép HELYI ideje**, nem UTC — a fájlnevet ember olvassa a saját gépén, és a 12:42-kor
  készült mentés ne „10:42"-t mondjon. Felhőben futtatva ez UTC lesz: a fájl a **keletkezés helyének**
  idejét viseli, és ez ki van mondva.
- **A HELY:** minden generált kimenet a **`var/`** alá, öt nevezett területre (`logs` · `backups` ·
  `reports` · `exports` · `tmp`). A `var/` gitignore-olva; egyetlen kivétel a `var/README.md`, hogy a
  szerkezet **látsszon** — különben egy új kör nem tudná, hova írjon (KUKA-011).
- **Kivétel, kimondva:** a `docs/_olvashato/` marad a helyén — a forrása mellett él, és az operátori
  terminál-blokk erre az útra hivatkozik.

### 3. Amit a saját őröm cáfolt meg — a `v3_` előtag indoka

Az első alakban azt írtam a kódba, hogy az előtag azért kell, mert így „a v4 nem kerül a v3.9 és a
v3.10 közé". **A saját mérésem cáfolta meg:**

```
ELŐTAGGAL     → v3_v3.10.0_…   v3_v3.9.0_…   v4_v4.0.0_…
ELŐTAG NÉLKÜL →    v3.10.0_…      v3.9.0_…      v4.0.0_…
```

A `3.10` **mindkét** alakban a `3.9` elé kerül (ábécé-rendben `1` < `9`), és a v4 **mindkét** alakban
a végén áll. **Az előtag tehát nem rendez.** Ami rendez: a fix szélességű **dátum+idő** — egy vonalon
belül az ábécé-rend pontosan idő-rend. A verzió a névben **származás** (melyik kiadás írta — ez kell
a visszaállításhoz, `VERSIONING.md` 5.), nem rendezési kulcs.

Az előtag marad, mert az operátor így kérte és a szemnek segít — de **hamis indoklással nem**
(KUKA-033: a levezetett állítás a méréséig csak javaslat). Az ART06 önpróba most az **ellenpárt** is
méri, tehát a helyes állítás gépi úton áll.

### 4. Gépi jel

`npm run verify:artifact-naming` — **ART01–ART07, 25 ellenőrzés**:

- **ART01** a feloldó **karakterre** az operátor mintáját adja (fixtúrákon, a mai verzióval is)
- **ART02** verzió/megnevezés/terület hiányára **MONDATTAL** áll meg, és a terület-hiba **felsorolja**
  a választhatókat (KUKA-064) — nem néma tartalék-érték (KUKA-020)
- **ART03** a területek zárt halmaza mind a `var/` alatt, mind érdemi magyarázattal; az üzleti adatot
  hordozók **ki vannak mondva**
- **ART04** a `var/` gitignore-olva, a `var/README.md` mégis látszik, és **minden területet felsorol**
  (a lap nem csúszhat el a kódtól — KUKA-018)
- **ART05** egyetlen szerszám sem gyárt kézzel időbélyeges nevet — **bizonyítottan tüzel**: egy
  V2-alakú fájlt bemásolva a próba PIROSRA vált, majd eltávolítva visszazöldül
- **ART06** önpróba a rendezésre **és az ellenpárra** (lásd a 3. pontot)
- **ART07** a név visszafejthető (melyik kiadás írta, mikor), és idegen alakra **nem** ad hamis
  eredményt

### 5. Ami NEM történt meg — kimondva

- **A V2-t nem alakítottam át.** A hatókör-szabály (D-VS-667) érvényben van: ott csak az épül, ami a
  következő hónapokhoz kell. A `undefined/` könyvtár és a 40 kézi névgyártás **a V2-ben marad**;
  jelentve az operátornak, javítás külön döntésre.
- **Nincs még olyan szerszám, ami ténylegesen ír** a `var/` alá — a szabály előbb áll, mint az első
  írója. Ezt az ART05 „a mérés nem üres" padlója és a `var/README.md` mondja ki, nem hallgatja el.

---

## D-VS-3000 — A V3 repó megnyitása: `valach-family/valach-system`

**Dátum:** 2026-09-09 · **Sáv:** Claude-AUX · **Operátori jóváhagyás:** *„ok, valach-system mehet,
a három környezet is jó"*

### A döntés

1. **A repó neve verzió-semleges: `valach-family/valach-system`.** A verzió CÍMKE a git-történetben
   (`v3.0.0`, `v3.1.0`, `v4.0.0`), nem repó-név és nem mappa. Nem lesz `vs4`.
2. **A V2 a saját nevén él tovább** (`valach-family/vs`). Nem költöztetjük, nem nevezzük át.
3. **Három környezet egy Railway-projektben:** production · staging · **demo mint CÉGTÉR a
   stagingben** (nem negyedik adatbázis).
4. **A fejlesztői és a teszt-tároló nem a felhőben van** — a magreferencia saját, eldobható
   fájl-tárolón fut, tehát az automata ellenőrzés nem függ a felhőtől.
5. **Kiadási menetrend:** egy `main`, semver címkék, `release/3.x` csak szükség esetén; migráció
   előrefelé, számozva, merge után érinthetetlenül; **bővítés → átállás → szűkítés három külön
   kiadásban**, a bontás soha nem eshet egybe azzal a kiadással, amelyben a kód abbahagyta a
   használatot.
6. **A rossz kiadást a KÓD visszagörgetése javítja, nem adatbázis-visszaállítás.**
7. **A D-VS számozás a V3-ban a 700-as blokkból megy.**

### Miért így — és mi volt a saját hibám

Az előző körben **én a `vs3` nevet ajánlottam. Ez hibás volt**, és az operátor kérdése mutatta meg,
miért: ha a repó neve verziószámot hordoz, a v4-nél `vs4` kellene, és az egész memória-, eszköz- és
board-gépezetet újra át kellene költöztetni — pontosan az a probléma ismétlődne, ami miatt egyáltalán
gondolkodunk.

**A javaslat nem új fogalmat vezetett be, és ezt mérve mondtuk ki**, nem emlékezetből: a V2 repó
`package.json`-ja már ma is `"name": "valach-system"` / `"version": "2.0.0-alpha"` — a termék neve és
a verzió már ott is külön mezőben állt. Csak a GitHub-repó neve (`vs`) csúszott el ettől.

### Mit hozott át a nyitó csomag, és mit NEM

| Átjött | Miért |
|---|---|
| `CLAUDE.md` (aktív memória) + a **89 KUKA-tanulság** | a tanulság nem verzió-függő |
| a lap-eszközök (`vs_doc_html`, `vs_verify_doc_html`) | az operátor nem tud `.md`-t megnyitni (KUKA-079) |
| a board-eszközök (`vs_board_doc`, `vs_board_round`) | hogy a tárgyalás ne szakadjon meg |
| a **magreferencia** (`v3ref/`) + a mutációs próbapad | a V3 mag-szabályai már futnak, adatbázis nélkül |
| a söprés (`verify:sweep`) | az első naptól, akkor is, ha kevés ellenőrzővel indul |

**NEM jött át** a V2 alkalmazás-kódja, sémája, üzleti adata és a 700 alatti döntés-napló.

### A csapda, amit külön kezelni kellett

A 89 tanulság átjött — a hozzájuk tartozó **gépi jelek 85-e viszont a V2 fájljaira mutat**. Nem
létező fájlon a tiltó-minta nem talál semmit, tehát **zöldnek látszana**: a védelem meglévőnek
tűnne, holott nincs (KUKA-051 · KUKA-041). Ezért minden bejegyzésnek **kimondott őr-otthona** van
(`contracts/guardHome.js`: `v3` / `vs` / `none`), a `verify:kuka` a listát **kiírja**, a deklarációt
**mindkét irányban visszaméri** (egy `v3`-nak jelölt bejegyzés cél-fájljának tényleg itt kell lennie;
egy `vs`-nek jelölt jel tényleg nem futtatható itt), és a `vs` szám **padló**: csökkenhet, nőni nem.

Mérve ma: **`v3` 2 · `vs` 85 · `none` 2**.

### Gépi jelek

- `npm run verify:kuka` — **KUK07** az őr-otthon (kimondás + visszamérés + padló)
- `npm run verify:release-order` — **REL01–REL06**; a REL06 fixtúrákon bizonyítja, hogy a
  bontás-szabály tüzel, mert nulla migrációval a REL03 nem mérne semmit
- `npm run verify:decision-numbers` — a 700-as blokk őre
- `npm run verify:doc-html` — a szállítási forma (a címzett meg tudja nyitni)
- `npm run verify:v3ref` — a magreferencia 6 próbája + 10 mutáció

### Ami NEM történt meg — kimondva

- **A repót nem én hoztam létre**: a session GitHub-alkalmazása nem kaphat repó-létrehozási jogot
  (mérve: `POST /user/repos` → 403 „Resource not accessible by integration"). Az üres repót az
  operátor nyitotta meg, a nyitó csomagot ez a döntés kíséri.
- **Nincs alapállás-mentés** (a V2-ben van) — mert még nincs adat. NEVESÍTETT függő: az első éles
  adatbázis megszületésekor kerül a `CLAUDE.md`-be a mester-mentés neve és a visszaolvasás.
- **Nincs migráció**, ezért a bontás-szabály élő adaton nem mért semmit; ezt a REL06 önpróba pótolja,
  és a verifier ki is írja.
- **A PITR (időpontra visszaállítás) állapota nem mérve** — azt az operátor látja a Railway-en, a
  session nem.

## D-VS-3037 — a minősítés nem törlési parancs: a nyers forrás-számláló megmarad (2026-09-17)

**Kör:** `CMD-VS-300-002-002 R28 → R29` · **Sáv:** Claude-v3 · **Lelet:** chatgpt-v3 (F28-01).

A `vs-usage/1 → v3-progress/1` átalakító helyesen ejti `null`-ra az elszámolási metrikákat, ha az
elszámolás frissessége nem igazolt — de a két pillanatkép **mért különbségét** semmi nem őrizte meg:
a lánc-próba pontos bemenetén a forrás `output=1000` értéke a vetületből nyomtalanul eltűnt, és az
R27 jelentés mégis azt állította, hogy „a szám a nem felosztott rekeszben áll".

**Döntés:** a mért különbség nevezett NYERS mezőben marad (`source_counters`) — megnevezett alap,
visszakereshető eredet, pillanatkép-határ, a három minősítés és kimondott korlát
(`usable_as_round_cost: false`). A `metrics`-be soha nem lép be, tehát a funkció igazolt összegéhez
nem adódhat hozzá; a validátor a SZABÁLYNÁL áll, ezért a közvetlen dokumentum-blokk sem kerülheti meg.
Ami valóban nem elérhető, ahhoz nem találunk ki számot. A részletnézet a nyers értéket a korlátjával
együtt írja ki.

**Tanulság:** KUKA-104. **Javítás:** `valach-family/vs@0d606ad` (PR #160, draft).
**Gépi jel:** `test:v3usage` + `test:v3progress` F28-01 · `test:v3progress:mutations` (26 egység-rontás
+ LÁNC-rontás, mind PIROS) · élő: `proof:v3progress-ui` (Q)(Q2)(Q3).

## D-VS-3038 — a két minősítési szint összhangja: a `||` nem öröklés (2026-09-17)

**Kör:** `CMD-VS-300-002-002 R30 → R31` · **Sáv:** Claude-v3 · **Lelet:** chatgpt-v3 (F30-01).

A nyers forrás-mező (D-VS-3037) saját minősítéseit a „nem elérhető" kapu
`(sc.token_coverage || r.token_coverage)` alakban mérte. A `||` a GYERMEKNEK ad elsőbbséget, ezért egy
`complete`-re írt beágyazott minősítés némán elfedte a futás kimondott `unavailable` állítását.

**Döntés:** a `source_counters` ugyanannak a futásnak ugyanazt a forrását minősíti, tehát legfeljebb
HALLGATHAT. Egy öröklési szabály: hallgató gyermek ⇒ a futásét örökli · kimondott gyermek ⇒
megengedett érték ÉS egyezés a futás kimondott értékével, különben nevezett elutasítás · a kapu az
ÉRVÉNYES értéken mér. A régi, `source_counters` nélküli boríték olvasható marad.

**Tanulság:** KUKA-105. **Javítás:** `valach-family/vs@98a4270` (PR #160, draft).
**Gépi jel:** `test:v3progress` F30-01 (hét ellenpár) · `test:v3progress:mutations` (három rontás,
mind PIROS a kilépési kódon).

## D-VS-3039 — a mutációs battéria darabszáma származtatva, nem kézzel (2026-09-18)

**Kör:** `CMD-VS-300-002-002 R32 → R33` · **Sáv:** Claude-v3.

A `v3ref:mutate:units` kézzel beírt hetes darabszámot hordozott. A battéria 149 mutációra nőtt, és a
4 vCPU-s futtatón a 2/7 szelet 12 406 ms-ot kért a 12 000 ms-os saját költségvetés fölött — a
`verify:v3ref` PIROSRA váltott ép tartalom mellett. Utólag mérve a hetes darabolás ÜRES gépen
belefér: a kapu eredménye tehát a gép pillanatnyi terhelésén múlt.

**Döntés:** a darabszám a KÖLTSÉGVETÉSBŐL származik (`--units-auto`): az ajánlott értékről indul, és
ha egy egység nem fér bele, finomabbra oszt — a költségvetés nem tágul, a finomítás nem néma, van
plafonja, és a plafonon a válasz hiányos mérés, nem zöld. A nem-nulla egység OKÁT nevezett feloldó
dönti el (UFK-01, `v3ref/unitFailureKind.mjs`): IDŐ ⇒ finomítható · TARTALOM ⇒ azonnal megáll ·
nincs tanú ⇒ `unknown`.

**Tanulság:** KUKA-177. **Gépi jel:** `node --test v3ref/unitFailureKind.test.mjs` (4 ellenpár) +
`npm run verify:v3ref`.

## D-VS-3040 — a három piros külső lánc oka MÉRVE: elavult elvárás (2026-09-18)

**Kör:** `CMD-VS-300-002-002 R32 → R33` · **Sáv:** Claude-v3 · **Kérés:** az R32 §B2.

Az `r77` · `r79core` · `r81core` hét bukó esetének okát eddig próza mondta ki. Mostantól MÉRÉS:
`npm run proof:mny01-form` (MNY-FORM-01) minden esetet kétszer futtat, és a kettő között egyetlen
dolog különbözik — a mennyiség ALAKJA. Eredmény **7/7**: JSON-szám ⇒ nevezett elutasítás
(`result_shape_type_mismatch`) · kanonikus decimális szöveg ⇒ elfogadva.

**Döntés:** a minősítés **elavult elvárás**, nem termékhiba. A külső fél programjaihoz NEM nyúlunk
(KUKA-054); az orvoslás (`qty: 1` → `qty: '1'` a bukó eseteknél) vagy az MNY-01 szűkítése **az ő
döntésük**. Addig a lánc pirosa áll, és nem takarjuk el.

---

## D-VS-3041 — a hiányzó tanú nem idő-bukás: a harmadik szó („nem tudom") (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F35-01** lelete a CMD-VS-300-002-002 **R35** lapon.

**A lelet, reprodukálva a saját gépünkön.** Az egy körrel korábban (D-VS-3039 / KUKA-177) épített
`unitFailureKind` feloldó a darabolt mutációs battéria nem-nulla egységeiről mondta meg, MIÉRT
bukott: IDŐ miatt (⇒ finomabbra osztunk) vagy TARTALOM miatt (⇒ azonnal megállunk). A tisztaság-tanút
viszont csak annyiban nézte, hogy hamis-e — így **hiányzó mező, `null`, szöveges `"false"`, `0`, `1`,
`{}` és `[]` mellett mind az IDŐ-ágra esett**. Tehát tanú nélkül a futtató „lassú volt" magyarázatot
adott, és újradarabolt, miközben a gyermek TARTALMILAG is bukhatott — pontosan az a hiba, aminek a
megelőzésére a feloldó született.

**Döntés.** A feloldó három szava elválik, és a hiány a saját nevén áll:
`too_slow` **kizárólag** típushelyes `slice_clean === true` **és** érvényes idő-tanú mellett (véges,
nemnegatív `wall.ms`, pozitív `wall.budget_ms`, tényleges túllépés) · `slice_clean === false` ⇒
`content` (akkor is, ha közben túllépett) · **minden más ⇒ `unknown`**, és az `unknown` nem
mentegetés: megállít.

**Mellé a TANÚ-HATÁR (UFK-02, ugyanebben a munkában, az R35 kifejezett kérésére):** a futtató a
tanút a döntés ELŐTT hitelesíti (`freshUnitWitness`) — az egység azonossága (`k/n`) és a frissessége
(a gyermek indulása utáni időbélyeg) mérve. **Egy elavult egység-fájl nem igazolhatja egy friss,
bukott gyermek újradarabolását.** Ugyanez a szabály a battéria gyermek-hurkában és az `r81` külső
burkolóban is — egy feloldó, két hívó (KUKA-039).

**Gépi jel:** `node --test v3ref/unitFailureKind.test.mjs` (10 eset: hat F35-01 ellenpár · a
tartalmi bukás időtúllépéssel együtt is `content` · négy tanú-frissesség) · `npm run verify:v3ref` a
`--units-auto` úton, **kilépési kódon** mérve. KUKA-178.

**Amit ez NEM old meg, kimondva:** az egység-fájl továbbra sincs kriptográfiailag a futásához kötve
— kézzel írt egység-fájl beolvadna. A forrás-lenyomat egyezése szűkít, de nem bizonyít; az aláírt
egység-tanú NEVESÍTETT függő.

---

## D-VS-3042 — a mennyiség-állítás és a készletmozgás KÉT dolog (a QNT alapdöntés) (2026-09-18)

**Honnan:** operátori/tárgyalói döntés a CMD-VS-300-002-002 **R35** lapon (3. pont).

**A döntés.** Egy korábban 100-ra becsült mennyiség 90-re pontosítása **nem új, 90-es mozgás**, és
**nem 190 készlet**: ugyanannak a tételnek egy ÚJABB MEGFIGYELÉSE. Minden ilyen állítás megőrzi a
megfigyelés FORRÁSÁT, a MINŐSÉGÉT (mért vagy becsült), az IDEJÉT, az ELŐZŐ verziót és a
JOGALAPOT. **Egy későbbi mérés visszamenőleg nem tesz méréssé egy korábbi becslést.**

**A hatókör kimondva.** A teljes QNT (mennyiségi modell, recept, önköltség) **most nem épül**. Amit
viszont az „magon kívül" **nem törölhet**: az R19-ben magra jelölt alap-követelmények. Ezért a
mag-határ szerződésének **kimondott helye van** a megfigyelésnek és a HATÁS NÉLKÜLI rögzítésének — a
mai bevételezés-művelet ezt **nem** helyettesíti. Ilyen folyamat VALÓDI használata **kapuval zárva**
marad a QNT megvalósításáig és ellenőrzéséig (`USE-G3`).

**Gépi jel:** `npm run verify:v3ref` — a `K10-TYP-e` klauzula **NYITOTT**, nevezett hiánnyal (a
MEGFIGYELÉSI idő fogalma nincs a magban), és a `USE_GATES` `USE-G3` sora kimondja a használati
kaput. Tehát a halasztás **nem tűnik el**: a lánc minden futáskor kiírja.

---

## D-VS-3043 — a visszaállítási terv a KIADÁS ALAKJÁHOZ igazodik (board) (2026-09-18)

**Honnan:** a külső ellenőrző fél helyesbítése a CMD-VS-300-002-002 **R35** lapon (5. pont), az
R33-as board-átadó lapunk visszaállítási tervére.

**Amit az R33 tévesen mondott.** A terv `git revert -m 1`-et adott általános visszaállításként. Ez
**csak VALÓDI merge-commitra helyes**: a `-m 1` az első szülőt jelöli meg megtartandó vonalként, és
merge-commit hiányában a parancs hibára fut.

**A javított terv — a kiadás alakja dönt:** valódi merge-commit ⇒ `git revert -m 1 <merge-sha>` ·
**squash** vagy **fast-forward** ⇒ a squash-commit sima `git revert <sha>`-ja, illetve az előző
kiadás újratelepítése; a parancs kiadása előtt **meg kell nézni a HEAD alakját**
(`git log --merges -1` / `git cat-file -p <sha>` szülő-száma), nem emlékezetből.

**A második helyesbítés.** Az R33 „adatvesztés nincs" alakú általános állítást tett. Ez **mérés
nélküli**: a board kiadásának adat-hatását ebben a körben nem mértük. A helyes alak: a visszaállítás
a KÓD-változást fordítja vissza; hogy a menet közben KELETKEZETT adat mit visel el, az **külön,
mérendő kérdés** — és amíg nincs mérve, nem állítjuk (KUKA-033).

**Gépi jel: NINCS — kimondva.** Ez a szöveg a board átadó lapján áll, nem kódban; a védelem a lap
alakjában van (a visszaállítási lépés a kiadás alakját KÉRDEZI, nem feltételezi).

---

## D-VS-3044 — az összesítő olvassa a mérést, ne képezze (a norma-lánc csomag) (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F37-01** lelete a CMD-VS-300-002-002 **R37** lapon.

**A lelet, reprodukálva.** Az R35-ben szállított csomag-generátor (NCP-01) a sorok minősítését MAGA
képezte, holott a lánc kanonikus ítélője (`checkNorms`) a vetületét már kiírta a mért állományba
(`norm_evidence.chain`). A saját gépünkön mérve: a mutációs eredményfájl helyére
`{"mutation_results":[]}` téve a generátor **kilépés 0-val „88 láncsor · 78 fedett"**-et írt ki —
**nulla mutációs tanú mellett**. A beadott mérés valós bontása ekkor: **60 fedett · 12 részben
fedett · 6 NEM falszifikált · 10 bizonyíték nélkül**. A 78-as szám a jelentésbe és a boardra is
kiment; **helyesbítve**.

**Döntés.** A `result` és a `why` **kizárólag** a mért lánc-vetületből jön; a generátor egyetlen
minősítést sem képez. A **kötés ellenőrzött, nem kiírt** — hét ág, bármelyik bukása nevezett
megállás: szerződés-lenyomat és -verzió · norma-index lenyomat · integritás-jelzés · a sorhalmaz
**mindkét irányban** · a minősítés zárt halmaza · minden „fedett" sor falszifikáló mutációja
**lefutott, CAUGHT, és NÉV SZERINT megnevezi az állítást** · minden próba címe feloldható a
futtatóból. A hiányzó bizonyíték soha nem fordul „fedett"-re.

**Gépi jel:** `npm run proof:norm-chain-package` — NCP-02, **12 eset**: tíz visszalépés bizonyítottan
PIROS a **kilépési kódon**, és két pozitív ellenpár az ép csomagon. KUKA-179.

**Amit ez NEM old meg, kimondva:** a próba CÍME forrás-olvasással oldódik fel a futtatóból. Ha a
`probe(` hívás alakja változik, ez a lépés **nevezetten megáll** — nem ad néma üres címet —, de ez
forrás-olvasás, nem futásidejű regiszter.

---

## D-VS-3045 — a művelet-név saját kulcson oldódik fel, és a sémaverziót a regiszter választja (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F37-02** lelete a CMD-VS-300-002-002 **R37** lapon.

**A lelet, reprodukálva.** A bemeneti séma-regiszter `OPERATION_SCHEMAS[operation]` alakban keresett.
Ez az **örökölt** tulajdonságokat is megtalálja: `toString`, `constructor` és `__proto__` nevekre a
`!schema` kapu átengedett, és a hívás nyers `TypeError: Cannot convert undefined or null to object`
hibával állt meg — nem nevezett `unknown_operation` elutasítással. Mindhárom név reprodukálva. **Ez
belső referencia-API hiba; külső HTTP-támadhatóságot nem állítunk** (a külső fél sem állított).

**Döntés — két külön dolog.** **(1)** `schemaForOperation` (SOP-01): a név **típusa** is mérce, a
kulcs **saját kulcsként** ellenőrzött; minden nem-művelet névre azonos, nevezett
`unknown_operation`, kivétel és írás nélkül. **(2)** A **sémaverzió tulajdonosa és határa kimondva**
(SVR-01): a verziót a **regiszter** választja, a beadó legfeljebb **megerősít**; eltérő, korábbi vagy
ismeretlen megnevezett verzió **nevezett `unsupported_schema_version`** — hallgatólagos
átértelmezés nincs. **Migrációs keret NEM épült**, és ez határ, nem hiányosság.

**Gépi jel:** `node v3ref/run.mjs` — `P-BEM-input-schema` (j) és (k) ága; mutációk **M153** (tartalékra
esés) · **M154** (a nyers kulcs-olvasás visszatér) · **M158** (a verzió tulajdonosa a beadó lesz) —
mind elkapva, és **név szerint** döntik hamisra a saját állításukat. KUKA-180.

---

## D-VS-3046 — a hiány OKA is állítás: a lehetetlenségi indok mérendő (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) tartalmi döntése a **K10-TYP-c** klauzulán (R37).

**A lelet.** Két klauzula hiány-szövege azzal indokolta a bizonyítás elmaradását, hogy „a magban
**egyetlen** mennyiség-profil él, ezért ellenpélda nem állítható elő". **Mérve hamis:**
`QUANTITY_PROFILES` **két** élő profilt tartalmaz (`qty-1` · `qty-2`), és a saját próbánk mindkettőn
mér.

**Döntés.** A hiány megmarad, az **indok** javítva: „a bizonyítás **lehetséges** — csak nem történt
meg". Minden hiány-szövegben az ok is állítás a rendszerről: vagy mérve van, vagy nem írjuk le.
A „nem tettük meg" és a „nem lehetséges" két külön állítás — a második tévesen leírva a **következő
kört is lebeszéli** a munkáról.

**Gépi jel:** tiltó-minta a két konkrét hamis mondatra (`verify:kuka`). **Amire nincs gépi jel,
kimondva:** hogy egy ÚJ hiány-indok tartalmilag igaz-e — az próza. KUKA-181.

---

## D-VS-3047 — a külső tartalmi döntés KÜLÖN tengely, és nem gépi hitelesítés (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **OB-7** szerinti tartalmi döntései, 29 klauzulán,
a CMD-VS-300-002-002 **R37** lapon.

**A döntés rögzítése.** A 29 klauzula döntése bekerült a repóba (`v3ref/externalDecisions.mjs`,
EXD-01), szó szerinti indokkal: **14 „referenciában elfogadva" · 7 részleges · 7 nyitott · 1 nem
elfogadott egészként**. A hatókör az ő szavukkal: az itt vizsgált **egyírós, szintetikus, megbízható
belső kontextusú** modellben a norma és a **megnevezett** állítások tartalmi megfelelésére szól —
**nem** általános biztonsági tanúsítvány és **nem** teljes rendszerkészültség.

**És amit ez NEM jelent — kimondva, mert ők kötötték ki:** a repó `content_review` rekordjai
**nem** váltak gépileg hitelesítetté; a mechanikus átvezetés nem adhat szélesebb jóváhagyást és nem
gyárthat operátori aláírást. Ezért a csomag **két külön oszlopot** visel (`content_review` =
repó-rekord, mérve **0/92** · `external_decision` = boardon rögzített külső döntés), és a kettőt
sehol nem vonjuk össze (KUKA-105: két minősítési szint összemosása néma elsőbbséget ad az egyiknek).
Forrás- vagy követelményváltozásnál az érintett döntés **újraellenőrzendő**.

**Átvezetett maradékok ugyanebben a körben:** `K05-DSC-c` fedettről **részlegesre** (az engedő ág
bizonyítéka hiányzik — „ezt a különbséget ne zöldítsd át") · `K05-DSC-d` **kiegészítő kötése** két
további, saját nevű állítással (a `P-A08` önmagában a hatályosulási versenyt nem fedi) ·
`ORG-N1a` elavult maradék-szövege javítva (a meghívó-út alapja **megvan**, BLI-01) ·
`K10-TYP-c/d` hamis lehetetlenségi indoka javítva (D-VS-3046).

**Gépi jel:** `npm run docs:norm-chain` — a csomag a külső döntést külön oszlopban és külön táblában
hozza; `verify:kuka` a zárt döntés-szó halmazra.

---

## D-VS-3048 — a csomag megkérdezi, MIN mértek, és a kanonikus ítélőt futtatja újra (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) nyolc ellenpéldája a CMD-VS-300-002-002 **R39** lapon.

**A lelet, mind a nyolc reprodukálva.** Az R37-ben újraírt norma-lánc csomag már a MÉRT vetületet
vette át — de a mérés és a **mai forrás** viszonyát semmi nem ellenőrizte, és a beadott vetületet
sem számolta vissza. Átment: idegen felső `base_digest` · minden mutáción idegen `base_digest` ·
`applied:false` · PASS-ra írt próba-állapot · nem létező tanú (`M999`) a **részleges** sorokon ·
SURVIVED-ra írt szervezeti mutációk · egy részleges sor **címkéjének** „covered"-re írása. **A
legsúlyosabb a nyolcadik:** a KUKA-180 hibás forrás-alakját visszaállítva, a régi mérési fájllal
együtt, az összesítő **változatlanul „70 fedett"**-et írt ki, kilépés 0-val.

**Döntés — két kötés, második szabálykészlet NÉLKÜL.** A külső fél kikötése szó szerint: „a meglévő
kanonikus értékelést és forrás-/manifesztkötést használjátok közösen; ne épüljön második, eltérő
szabályú értékelő." Ezért:

1. **Forrás-kötés.** A mérés `base_digest` mezője a **mai** forrás-lenyomathoz mérve — a számoló
   saját otthonba költözött (`v3ref/bundleDigest.mjs`, BND-01), mert a battéria modulja nem húzható
   be anélkül, hogy le is futna.
2. **A kanonikus ítélő ÚJRAFUTTATVA.** A battéria mostantól elteszi a `checkNorms` **bemenetét** is
   (`norm_inputs`: `records` + `expectation`), nem csak az eredményét; a csomag ugyanazt az ítélőt
   hívja, és a beadott vetületet **soronként** ehhez méri (minősítés + tanú). Bármely eltérés
   nevezett megállás.

**A szabályok MEGVOLTAK.** A `checkNorms` már ellenőrizte az `applied` jelzést, az alap- és mutált
lenyomatot és a futás-jelet — csak a csomag soha nem futtatta le őket (KUKA-102).

**Gépi jel:** `npm run proof:norm-chain-package` — NCP-02 **20 eset**, a kilépési kódon: a külső fél
mind a **nyolc** ellenpéldája PIROS (köztük az ELAVULT KÓD esete, amely a forrás-fájlt is rontja és
visszaállítja), a korábbi tíz változatlanul PIROS, és **két** pozitív ellenpár. KUKA-182.

---

## D-VS-3049 — a diagnosztikai megjelenítés soha nem dobhat (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) lelete az **R39** lapon.

**A lelet.** A nevezett elutasítások `JSON.stringify(ertek)` alakban mutatták meg a kapott értéket
(KUKA-064). A `JSON.stringify` viszont **dob** `BigInt`-re és **körkörös** objektumra — így a hibás
típusú név nyers `TypeError`-t kapott a nevezett `unknown_operation` helyett. Ez a KUKA-180 hibája
egy réteggel beljebb: a kapu már helyesen döntött, de a **mondat**, amivel kimondta volna, elszállt.

**Döntés.** SAFE-01 (`showValue`): közös megjelenítő, ami **mindig** sikerül, és a fajtát is
megmondja (BigInt · Symbol · függvény · körkörös hivatkozás · tömb). Négy hívási hely áll át rá.
**Kimondva: ez a belső JavaScript-hívási határ lelete, nem bizonyított HTTP-sebezhetőség** — a külső
fél sem állított ilyet.

**Gépi jel:** `P-BEM-input-schema` (j) ága nyolc alakon + tiltó-minta a nyers megjelenítésre.
**Amire nincs gépi jel, kimondva:** hogy egy ÚJ diagnosztikai mondat ne hívjon más dobó függvényt.
KUKA-183.

---

## D-VS-3050 — a sémaverzió a KANONIKUS úton is átmegy a határon (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) lelete az **R39** lapon.

**A lelet.** Az R37-ben kimondott SVR-01 határ a `validateInput` **külön** hívásán működött, a
kanonikus bevét-út (`submitStockReceipt`) viszont **nem vett át** `version` argumentumot: a felső
szinten megnevezett verzió **némán eltűnt**, a bevét lefutott, és készlet is mozdult. A jelentés
tehát elutasítást ígért ott, ahol a rendszer eldobott egy argumentumot.

**Döntés.** A `submitStockReceipt` átveszi és **továbbadja** a `version` argumentumot. A határ a
valódi úton mérve, a **hatás visszaolvasásával**: a három érvénytelen verzió nevezett elutasítást
kap és **semmit nem ír** (se parancs, se mozgás); a megnevezett jó verzió és a verziót nem nevező
hívás egyaránt átmegy, a `register` / `request_confirmed` megkülönböztetéssel.

**Kimondva:** ez **nem** migrációs keret és **nem** több élő sémaverzió — a határ marad egyetlen élő
verzió műveletenként.

**Gépi jel:** `P-KSZ-ledger-truth` új állítása
(`A-KSZ-schema-version-is-checked-on-the-canonical-path-without-writing`) + az **M163** mutáció (a
verzió továbbadásának kivétele) — elkapva, és név szerint ezt az állítást döntve. KUKA-184.

---

## D-VS-3051 — a külső döntés SZÓ SZERINT marad, a saját előrehaladás külön mezőben (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) helyesbítése az **R39** lapon.

**A lelet.** Az R37-ben azt írtuk, hogy a 29 külső tartalmi döntés **szó szerinti indokkal** került
be. Két indokba (`K10-TYP-a` · `K10-TYP-b`) viszont belekerült a **mi** megjegyzésünk („R37-ben
javítva/pótolva") — tehát a lap azt állította, hogy a külső fél szó szerint ezt mondta. Nem ezt
mondta.

**Döntés.** A `reason` mező a külső döntés szövege, **változatlanul**; a saját előrehaladás külön
mezőben áll (`our_progress_note`), és az **soha nem módosítja a döntést**. Új elfogadást Claude nem
adhat magának. Ugyanitt javítva a **USE-G4** kézzel beírt „0/88" száma (a lánc már 94 sor): a
darabszám a **mérésből** jön, nem a szövegből (KUKA-045); a **REV-N4b** „EGYETLEN előfeltétel"
mondata szűkítve (a kompenzáló esemény saját jóváhagyási és audit-útját is bizonyítani kell); és a
**K10-TYP-c/d** két maradék kommentjéből törölve a „egyetlen élő profil" hamis indok.

**Gépi jel:** `npm run docs:norm-chain` — a lap és a JSON a két mezőt külön hozza; `verify:kuka` a
zárt döntés-szó halmazra. **Amire nincs gépi jel:** hogy egy ÚJ külső indok szó szerint került-e be.

---

## D-VS-3052 — a teljes kimeneti szerződés EGY helyen, és a sorok a kanonikus eredményből (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-01** lelete a CMD-VS-300-002-002 **R41** lapon.

**A lelet, mind a három reprodukálva.** Az R39-es generátor újraszámolta a láncot, de a beadott
vetületnek csak **két** mezőjét (`result` · `falsified_by`) vetette össze a sajátjával; a többi
jelentéssel bíró mező ellenőrzés nélkül került a kimenetbe. Mérve: kitalált `content_review` ⇒ a
csomag **94 repóbeli jóváhagyást** jelentett a valódi **0** helyett · átírt hiány-szöveg ⇒ bekerült ·
`covers: ['K99']` ⇒ bekerült. Mind kilépés 0.

**Döntés — nem mezőnkénti toldozás (az ő kikötésük).** `ROW_CONTRACT`: a **teljes** kimeneti
szerződés egy helyen, mezőnként megnevezett otthonnal — *kanonikus* (és a beadott vetületnek
egyeznie kell vele) · *helyi regiszter* · *futtató-cím* · *külső regiszter* · *származtatott*. A
sorok a **kanonikus eredményből** épülnek; a beadott vetület csak összevetésre szolgál, és az
összevetés **a szerződés listájából** jön — tehát új mezőre magától kiterjed. Ami nincs a
szerződésben, az nem kerülhet a kimenetbe.

**A negatív bizonyíték is javítva:** a mondat a **minősülő** tanúra (`falsified_by`) és a szerződés
szerinti jelöltekre támaszkodik, nem puszta név-egyezésre.

**Gépi jel:** `npm run proof:norm-chain-package` → **25/25**, a kilépési kódon. A három új
ellenpélda PIROS, és a **hű gyengítés** (egy tanú nem minősül, a lánc ehhez újraszámolva)
helyesen **ZÖLD** marad — az őr, ami ezt is pirosra vinné, a másik irányba hazudna. KUKA-185.

---

## D-VS-3053 — minden forrás-hivatkozás a tényleges forráshoz kötve (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-02** lelete az **R41** lapon.

**A lelet.** Az R39-es forrás-kötés **csak a legfelső** mezőt nézte. Ha a
`norm_inputs.expectation.base_digest` és **minden** `mutation_results[i].base_digest` csupa nullára
van írva, miközben a felső helyes marad, a csomag kilépés 0-val lefut — `source_bound: true`
mellett —, mert az újraszámolás „egyező **idegen**" elvárást és tanúkat lát.

**Döntés.** A kanonikus ítélőnek átadott **elvárás** és **minden** mutációs tanú forrás-hivatkozása
is a mai forrás-lenyomathoz mérve, nevezett megállással (az első eltérő tanú megnevezve).

**Kimondva, az ő szavukkal:** ez **egymásnak ellentmondó mezők felismeréséről** szól; attól egy
helyi JSON **nem** válik kriptográfiailag hiteles futási tanúvá. Az `evidence_limit` ezt továbbra is
kimondja. **Gépi jel:** NCP02-25, a kilépési kódon. KUKA-186.

---

## D-VS-3054 — a „szó szerinti" külső indok MÉRÉS, nem ígéret (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **F41-03** lelete az **R41** lapon.

**A lelet, és amit a saját mérésem hozzátett.** Az R37 óta azt állítottuk, hogy a 29 külső tartalmi
döntés **szó szerinti** indokkal áll a repóban. Ők egy átfogalmazást találtak (`K05-DSC-c` utolsó
mondata); a saját, ugyanebben a körben írt mérésem **még kettőt** (`REV-N3c` — „nem fogadom bele" →
„nem fogadja bele"; `K10-TYP-c` — kiemelt nagybetűk). Tartalmi torzítás egyikben sem volt, de
**idézetként pontatlan**.

**Döntés.** Mind a három visszaállítva szó szerint, és az állítás **mérhetővé** téve: a rögzített
forrás-lap (`v3ref/source-documents/R37_board_v1.md`) bekerült a repóba, és az **EXD-02**
(`npm run verify:external-decisions`) minden tárolt indokot **szó szerint** keres benne,
szóköz-normalizálás mellett — **mindkét irányban**: a forrás-lap minden klauzulájának meg kell lennie
a regiszterben is. A saját megjegyzés az indokba nem keveredhet (tiltó minta).

**Amit ez NEM mér, kimondva:** hogy a tárolt **verdikt** megfelel-e a külső döntés értelmének — az a
szöveg értelmezése, nem az idézet pontossága.

**Ugyanebben a körben javítva:** az **OB-9** maradék-szövegéből törölve a hamis „egyetlen élő
profil" indok (két profil áll), és az **R38 board-lap** frissítve a repóbeli helyesbítéssel
(3. változat) — a történeti eredményt a board verziózása őrzi.

---

## D-VS-3055 — a K10 követelmények bizonyítva a meglévő referencián (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R43** parancsa — az R41-es összesítő-javítást a
vizsgált referencia-hatókörben **elfogadta és lezárta**, és a *működés* mérését kérte.

**A munka sorrendje az ő kikötésük szerint: előbb MÉRÉS, csak utána kód.** A felmérés eredménye
kimondva: **mind a négy klauzula viselkedése helyes volt** — a hiány a **bizonyítékban** állt, nem a
rendszerben. A csomag ezért nem javít, hanem **beköt**: négy új próba, **13 új állítás**, **hét új
mutáció**, és a `K10-TYP-c` · `-d` `gap`-je **részlegesre** vált, kimondott maradékkal.

**K10-TYP-a — stabil azonosság.** Mérve: a mennyiség változása és a formázás nem mozdítja az
azonosítót; a történeti mozgás-sorok egy cikkre mutatnak; azonos cikkszám másik könyvben más cikk;
a kiírt tulajdonság (egység) változása nulla lábnyomon szabad, lábnyom fölött **nevezetten tilos**.
**Kimondott határ:** a referenciában **nincs megjelenítési-név mező és nincs átnevező művelet** —
a klauzula e fordulatát ezért nem állítjuk bizonyítottnak (nyers fixtúra nem igazol hiányzó
műveletet). Visszabontás: M164 · M165 · M166.

**K10-TYP-b — a valódi úton.** Az elfogadott bemeneti javítást **nem építettük újra**; a nyolc
bemeneti hiba eredményét a **kanonikus bevét-úthoz** kötöttük, mert a korábbi bizonyíték a belső
feloldó közvetlen hívásán állt (KUKA-184). Mind a nyolc nevezetten elakad, **írás nélkül**; a jogos
bevét egy mozgást ír. **Kimondott határ:** ezen az úton a művelet neve fix, és ez **nem zárja az
OB-3** külső határát. Visszabontás: M167.

**K10-TYP-c — a múlt megőrzése.** Mérve: a tárolt sor a **saját** profilját viszi; a magban **nincs
publikus profilváltó művelet** (a katalógus forrásából mérve); elcsúszott profil mellett a
visszaolvasás **nevezett `profile_mismatch`** — nem ad más jelentést ugyanannak a számnak —, a nyers
sorok érintetlenek, és a helyes profilon a jelentés változatlanul tér vissza. **Kimondott maradék:**
ez az **olvasó** oldalát bizonyítja, nyers határ-fixtúrával; valódi, támogatott profilváltás nincs
megépítve, tehát nem is bizonyított. Visszabontás: M168 · M169.

**K10-TYP-d — ismétlés és hibahatár.** Hat helyzet a valódi úton, parancs + esemény + mozgás +
egyenleg pillanatképével: jogos első beadás (egy hatás) · azonos ismétlés · azonos jelentés más
formázásban (a kanonikus alak dönt) · korábbi sémaverzió · más profil · hibapont. **Mindhárom
elutasítás után a pillanatkép változatlan, és a korábbi siker ugyanazt a hatást adja vissza.**
**Kimondott maradék:** a „más profilú bemenet" ága **ugyanarra a cikkre** nem szólítható meg
(nincs profilváltás), a mérés másik cikkel történt. Visszabontás: M170.

**Gépi jel:** `node v3ref/run.mjs` (58 próba) + `npm run verify:v3ref` (167 mutáció) — minden új
állításhoz saját, név szerint döntő visszabontás.

**Egy mérés közbeni saját lelet, kimondva.** Az **M165** első alakja magát az azonosító-képzést
rontotta el — az viszont **nem szerződés szerinti bizonyíték**: a tábla elsődleges kulcsa önállóan
is megfogja, és a próba nyers SQLITE-kivétellel áll meg. A visszalépést át kellett írni arra, ami a
**valódi kár**: a néma összeolvadás a cikkszám-feloldásban. (Ugyanez az osztály, mint az R37-es
M159 — a rendszer két szinten védett, de a bizonyítékot ez nem helyettesíti.)
**A KÖR KÖZBEN A SAJÁT MÉRÉSEM KÉT TOVÁBBI HIBÁT TALÁLT A SAJÁT MUNKÁMBAN — mindkettő kimondva.**

**(1) Két visszabontásom nem az állítást döntötte meg (KUKA-187, negyedszer előjövő osztály).** Az
**M169** (a mozgás-sor a KÉRÉS profilját írja a cikké helyett) nem omlott össze, de a NEVEZETT
próbát sem buktatta el: annak a világában CSAK liter-profilú (`qty-1`) cikk állt, tehát a beégetett
`'qty-1'` megkülönböztethetetlen volt a helyes viselkedéstől — a fixtúra a saját előfeltevésemet
igazolta vissza (KUKA-054). A próba világa mostantól **darabos (`qty-2`) cikket is** visz, és a
sorának `qty-2` profilt kell hordoznia. Az **M170** első alakja a **fagyasztott** bemenet-értékre
írt (nyers `TypeError` — más réteg fogta meg); a valódi kár a **parancs-azonosságban** van, oda
került át. És az **M164** első alakja (só az azonosító-képzőben) **túlélte**: az azonosító a
felvételkor EGYSZER születik és tárolva marad, tehát nincs olyan olvasó, ami újraszámolná — a
visszabontás ezért a megjelenítés-váltásra került, ahol valódi kár keletkezhet. Ebből
következik a **kimondott maradék**: a „mennyiség nem mozdítja az azonosságot" állításnak **nincs
saját visszabontása**, mert a mai felépítésben egyetlen egysoros rontás sem tudja megdönteni
anélkül, hogy előbb az adatbázis idegenkulcsa állítaná meg.

**(2) A darabolt mérés indoka a szelet véletlenje volt (KUKA-188).** A battéria hét szeletben fut,
és az összefűzés eddig a szeletek KÉSZ ítéleteit egyesítette: a verdikt helyes maradt (a rangsor
dönt), a sor **indoka** viszont az első beérkező szeleté lett — öt soron mérve azt írta, hogy
„egyetlen mutációs eredmény sem érkezett erre a próbára", holott a teljes bizonyítékon a helyes
indok az, hogy a mutáció **futott és nem buktatta meg** az állítást. A kettő KÉT KÜLÖN teendő
(KUKA-093), és a gyengébbik ment ki a gépi végeredménybe. **Megtalálta a saját csomag-generátorom
teljes mező-összevetése** (a külső fél R41-es kikötése), miközben a battéria 168/168-cal zöld volt.
Javítva: az összefűzés a **kanonikus ítélőt** (`checkNorms`) futtatja a TELJES, egyesített
bizonyítékon és AZT adja ki; az unió kereszt-ellenőrzés marad, verdikt-eltérésnél nevezett akadály.

**Új visszabontás:** **M171** — a kanonizálás nem íródik vissza a tartalomba, tehát a `10` és a
`10.000` külön parancs-azonosságot kapna (ugyanaz a jelentés másodszor is könyvelne). Ez a garancia
MÁSIK kódhelye, mint az M170 — két külön helyszín, két külön ellenpár.

**Zárszám:** `node v3ref/run.mjs` **58/58 PASS** · `npm run verify:v3ref` **168 mutáció · 168
elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba** · norma-lánc **105 sor**.

## D-VS-3056 — a teljes tartalmi történet-megőrzés és a hatás-közbeni hibahatár (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R45** parancsa. Az R44-es csomagot két ponton
cáfolta, mindkettőt **futtatható ellenpéldával**, és mindkettőt a SAJÁT fánkon reprodukáltam.

**F45-01 — a darabszám nem a tartalom.** Az R44-es ismétlés-próbám három tábla DARABSZÁMÁT és egy
egyenleg-szöveget hasonlított, csak a sorozat végén. A külső fél a bevét-út ELUTASÍTÓ ágán átírt egy
korábbi, lezárt esemény időpontját — a battéria mind az 58 próbája ZÖLD maradt. Reprodukálva: a
rontás `changes: 1`-et mért (valóban átírt egy régi sort), az eredmény mégis 58/58 PASS. Ugyanez a
hiány állt a bemeneti próbán, ahol a „nem írt semmit" állítás ÜRES tárolón mért darabszámon állt.
**Javítva:** TELJES tartalmi pillanatkép (a három nevezett tábla MINDEN oszlopa, determinisztikus
rendezésben, a tárolt eredmény-tartalommal), **minden egyes lépés után**; a jogos audit-bejegyzés
KÜLÖN mérce (a kiadás-leltár hozzáfűzhet, a korábbi sorait nem írhatja át); a bemeneti próba
ELŐZMÉNNYEL indul. Visszabontás: **M173** (a külső fél saját ellenpéldája) · **M174**. Tanulság:
**KUKA-189**.

**F45-02 — a ténylegesen elért hibahatár.** Az R44-es „hibapont" (99999999) a bemeneti ellenőrzésen
akad el, tehát a parancs tranzakciójába BE SEM LÉP: érvényes bemeneti ellenpélda, de a részleges
írás visszagörgetéséről semmit nem mond. **Javítva:** a darabos cikk ÖSSZEG-korlátja a MEGLÉVŐ atomi
úton belül üt (a tétel önmagában szabályos), tehát a hiba ott keletkezik, ahol a parancs-sor és a
nyugta MÁR beíródott — új állítás: `A-K10-d-effect-time-failure-leaves-no-partial-write`.
Visszabontás: **M175** (a hatás elutasítása nem görget vissza) · **M176** (az ismétlés-őr elnyeli a
megváltozott tartalmat). Új tranzakciós keretet nem építettünk.

**Három túl erős mutáció-leírás javítva — a MÉRT hatásra.** Az **M170** nem kettős könyvelést okoz,
hanem a formázás-független ismétlést akasztja el (a mozgás-szám 1 marad; a kettős hatást az **M172**
mutatja). Az **M171** ugyanez a másik kódhelyen. Az **M168** a régi, 12.500-as fixtúrán
`total_out_of_range`-et adott — az IDEGEN profil MÁSIK korlátja takarta el a kárt; a próba ezért egy
KIS (7.500) tételt is visz, ahol az átértelmezés egyik korlátba sem ütközik, és ott mérve a
visszaolvasás CSENDBEN **„7500"**-at ad „7.500" helyett.

**A döntés-regiszter mostantól FORRÁS-TUDATOS.** Az R45 a **K10-TYP-b**-t elfogadta — kimondottan
SZŰKEBB hatókörre (a jelenlegi egyírós, szintetikus referencia belső séma- és kanonikus bevétútja;
**nem** az OB-3 külső határa, és nem minden korábbi tárolt adat változatlansága). Az R37-es
történeti sorokat NEM írtuk át: a felülírt döntés `superseded`-ként megmarad, és az őr mindkét
forrás-lapon méri a szó szerinti idézetet (33/33).

**Egy mondat-fegyelem, kimondva.** Az R44-es lapom „egyetlen egysoros rontás sem tudja megdönteni"
alakja általános lehetetlenségi állítás volt — mérésen túli. Helyette a KIPRÓBÁLT alakot és a mai
mérési határt nevezzük meg. A KUKA-187 szövege ennek megfelelően javítva.

**Gépi jel:** `node v3ref/run.mjs` (58 próba) · `npm run verify:v3ref` (173 mutáció) ·
`npm run verify:external-decisions` (33 idézet, két forrás-lapon) · `npm run verify:kuka`.

## D-VS-3057 — az adatkörre szóló olvasási döntés rögzített alapja (2026-09-18)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R47** parancsa. Az R45/R46-os történetmegőrzési
csomagot a megnevezett referencia-hatókörben **elfogadta és lezárta**, és egyetlen új csomagot adott:
a **K05-DSC-c** engedő ága — *„aki jogosult készletet látni, ne kapjon ettől automatikusan árat. A
tiltás hiánya önmagában nem bizonyítja az engedélyt."*

**ELŐBB MÉRÉS (az ő kikötésük).** A kiadási út eddig KÉT tényt kérdezett: tag-e a kérő a KÖNYVBEN, és
van-e rá kimondott TILTÁS az eredmény adatköreire. Adatkörre szóló ENGEDŐ alapot SOHA nem kérdezett.
**Adaton mérve, a teljes meghívó-láncon:** egy olyan tag, akinek a TAGSÁGA `scopes: ['keszlet']`-re
korlátozott határozat alatt született, a vegyes eredményt **áregyütt** megkapta
(`unit_price: 12345`). A korlát ott állt az adatbázisban (`grant_basis.granted_limit`), olvasható
alakban — a kiadási úton egyetlen sor sem olvasta. Tanulság: **KUKA-190**.

**A JAVÍTÁS: EGY KAPU A KIADÁS KÖZÖS HATÁRÁN (RSB-01, `v3ref/releaseScope.mjs`).** Nem találtunk ki
új üzleti szerepkört és nem adtunk hallgatólagos „mindenhez jogot": a MEGLÉVŐ jogalap-láncot kötöttük
be. A sorrend kimondott: **kimondott TILTÁS** (REV-N5b — az engedély mellett is zár) → **a tagságra
átvitt adatkör-korlát** (ORG-N1b: *„a felhatalmazás nem lehet tágabb, mint az alapja"*) → **a
határozat MAI állapota** (ORG-N1a: megvont, lejárt vagy idegen könyvre szóló alap nem nyit). A
plafon a lepecsételt és az élő korlát metszete.

**Mérve, mindkét irányban:** a csak-készlet alapú olvasó a tiszta készlet-eredményt MEGKAPJA, a
vegyeset NEM — sem hamis kérői címkével, sem címke nélkül; a MINDEN érintett adatkörre jogosult
olvasó ugyanazt a vegyes eredményt MEGKAPJA (ellenpár); a kimondott tiltás az engedély mellett is
zár, de nem válik általános zárrá; a megvont és a lejárt határozat nem nyit; a nemleges válasz
BÁJTRA azonos a nem létező hivatkozásáéval; a döntés és a kiadási leltár EGY hatályosulási ponton
áll, és az elutasítás nem ír leltár-sort.

**KÉT NYITOTT ÜZLETI KÉRDÉS — kimondva, nem kitalálva** (az R47 kifejezetten ezt kéri):
1. **Rögzített korlát NÉLKÜLI tagság.** A mag minden mai tagsága ilyen. A kiadás ma a KÖNYV-tagságon
   áll; a kapu ezt `membership_only` néven **kiírja** és gyengébb alapnak jelöli — de hogy egy ilyen
   tag MIT láthat, arra a normákból nem vezethető le válasz.
2. **KÉT ADATKÖR-SZÓTÁR.** A felhatalmazás adatkör-tengelye szabad szöveg (a meglévő világok
   `stock`/`price` szavakat használnak), a tartalom-besorolás viszont zárt halmaz (`keszlet` ·
   `arak`). Az ismeretlen szótárú korlát **ZÁR** (`basis_scope_vocabulary_unknown`) — a két szótár
   megfeleltetése üzleti döntés, gép nem tippelheti meg (KUKA-022 · KUKA-061).

**KÉT SAJÁT LELET A KÖR KÖZBEN.** (1) Az első alakom a hiányzó TAGSÁGRA is zárt — ettől a kapu
MÁSODIK otthona lett ugyanannak a ténynek, és az **M4** mutáció (a könyv-szintű jog teljes
kiiktatása) a nevezett próbáján NÉMÁN zöld maradt: egy meglévő bizonyíték elvesztette az erejét
(KUKA-187 · KUKA-003). Javítva: a tagságot a könyv-kapu dönti el, és az előbb fut. (2) Két horgony
elmozdult alattunk (**M85** · **M96**) és a **KUKA-142** egyik jele is — mindhármat a battéria
`STALE_ANCHOR`-ja, illetve a `verify:kuka` mondta meg; a horgonyok a kódot követték, a mutációk
tárgya változatlan.

**A KÜLSŐ DÖNTÉSEK ÁTVEZETVE, A TÖRTÉNET ÉRINTETLENÜL.** Az R47 lezárása és a pontosított K10-d
indok **saját forrással** került be; az R45-ös és R37-es sorokat nem írtuk át (a felülírt döntés
`superseded`-ként megmarad). A „referenciában elfogadva" klauzulák száma **változatlanul 15** — az
R47 kimondja, hogy ettől nem nő.

**Gépi jel:** `node v3ref/run.mjs` (59 próba) · `npm run verify:v3ref` (185 mutáció, benne M177–M182) ·
`npm run verify:external-decisions` (36 idézet, három forrás-lapon) · `npm run verify:kuka`.

## D-VS-3058 — a ténylegesen megadott olvasási jog (2026-09-19)

**Honnan:** a külső ellenőrző fél (chatgpt-v3) **R49** parancsa. Az R48-as csomagot **nem fogadta el**
a K05-DSC-c teljesítéseként, és két esetet mutatott meg, mindkettőt VÁLTOZATLAN üzleti kódon
reprodukálva. Mindkettőt a saját fámon megismételtem a javítás előtt.

**F49-01 — a hiányzó engedélyből tényleges kiadás.** Ahol a taghoz SEMMILYEN adatköri engedély nem
volt rögzítve, a kiadás megtörtént (`membership_only` → `allowed: true`), és a külső válasz semmit
nem mondott erről: rendes sikeres eredményt adott, árral együtt. A gyengébb alap MEGNEVEZÉSE nem
teszi jogszerűvé a kiadást — és a saját próbám egyik ága kifejezetten KÖVETELTE, hogy ez így
maradjon, tehát a zöld teszt a hibát ŐRIZTE.

**F49-02 — a kiadó kerete lett a címzett joga.** A `grant_basis.granted_limit` a HATÁROZAT teljes
korlátját tárolja. Mérve: a `scopes: ['keszlet','arak']` határozat alatt kiadott, **csak készletre**
szóló meghívó címzettje az árat is megkapta — a `scopeReleaseDecision('arak')` `within_basis_scopes`
indokkal engedett. A megadható jog és a ténylegesen megadott jog két külön tény.

**A JAVÍTÁS: SGR-01 — a TÉNYLEGESEN MEGADOTT OLVASÁSI JOG** (`v3ref/scopeGrant.mjs` + `scope_grant`
tábla). Alanyra + könyvre + EGY adatkörre szól; KÉT idő-tengelyen áll (hatály × tudás); KÖTELEZŐ
rögzített alapja van, és a megadás pillanatában is ellenőrzi a plafont (ORG-N1b). A kiadási kapu
innentől ebből dönt: **a plafon csak szűkít, a hiány zár.** A sorrend: kimondott tiltás → a megadott
jog → a határozat mai állapota → a tagságra átvitt korlát.

**Mérve (kiadva → zárva különbségként, nem indok-cserével):** a rögzített engedély HIÁNYA zár (a
tiszta készlet-eredmény sem jön ki) · a TÁG határozat alatt SZŰKEN megadott jog nem tágul · a valóban
MINDKÉT adatkörre megadott jog mellett a vegyes eredmény kijön (ellenpár) · a kimondott tiltás az
engedély mellett is zár, de nem általános zár · a JOG megvonása és az ALAP megvonása/lejárata
egyaránt zár · a nemleges válasz bájtra azonos a nem létező hivatkozásáéval · a leltár egy
hatályosulási ponton áll, és engedély nélküli olvasónak sor sem születik.

**A PRÓBA-VILÁGOK VALÓDI JOGOT KAPTAK, NEM MEGKERÜLŐ KAPCSOLÓT** (az ő kikötésük). Hét próba állt
piroson a szigorítás után; mindegyik világ a rendszer SAJÁT íróján (`grantReadScope`) kapott
adatköri jogot, alappal és két tengellyel. Így a KÖNYV-kapu és az ADATKÖRI kapu állításai külön
mérhetők maradtak — az M4 bizonyítóereje nem indok az engedély nélküli kiadásra.

**MUTÁCIÓ-PONTOSÍTÁS (az ő leletük).** Az M179 leírása erősebb volt a futásnál: az R48-as alakban a
határozat-állapot kihagyása csak az INDOKOT cserélte (`outside_basis_scopes`), a kiadás továbbra is
zárt. Az SGR-01 óta a jog a MEGADÁSBÓL jön, ezért ugyanez a kihagyás VALÓDI kiadást eredményez egy
megvont alapon — és a próba ezt kiadva→zárva különbségként méri.

> **HELYESBÍTÉS (2026-09-19, D-VS-3059 · forrás: CMD-VS-300-002-002 R51/F51-02, chatgpt-v3 —
> `v3ref/source-documents/R51_board_v1.md`):** az előző bekezdés utolsó mondata — hogy az M179
> „VALÓDI kiadást eredményez egy megvont alapon" — **MÉRVE CÁFOLT, és ezennel visszavonva**. A
> megvont határozat plafonja üres, ezért a kiadás az `outside_basis_scopes` ágon zárul: az M179 a
> próbát a VÁRT INDOKON bukatja el, nem adatkiadáson. A valódi kiadást okozó alak az **M188** (két
> sor rontásával). A történeti bekezdés szövegét nem írjuk át, csak megjelöljük (KUKA-050).

Az M177 horgonya a feltételről a
VISSZATÉRŐ ÉRTÉKRE került: a feltétel kiiktatása nyers kivételbe futott (más réteg védelme, nem az
állítás bukása — KUKA-187).

**KIMONDOTT HATÁROK.** (1) A meghívó `scope` mezője MÉRVE a meghívó-KIADÁS tengelye
(`invite_basis.scope`), nem olvasási jog — ezért a beváltás ma NEM ad adatköri olvasási jogot; hogy a
meghívó hordozzon-e felajánlott olvasási adatköröket, ÜZLETI döntés. (2) Az olvasási jog csak a
tartalom ZÁRT adatkör-szótárának nevére adható (`unknown_data_scope`), az ismeretlen szótárú PLAFON
pedig zár — néma fordítás nincs.

**Tanulság:** KUKA-191. **Gépi jel:** `node v3ref/run.mjs` (59 próba) · `npm run verify:v3ref`
(179 mutáció, benne M177–M182) · `npm run verify:kuka` (a `membership_only` alap tiltó-mintája).

---

## D-VS-3059 — a megvonás is két idő-tengelyen áll, és az M179 állítása helyesbítve (2026-09-19)

**Parancs:** CMD-VS-300-002-002 R51 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). Az R49-es két javítást a
referencia hatókörében **elfogadták**; a K05-DSC-c ettől még nem zárul.

**F51-01 — a megvonásnak nem volt külön tudás-ideje.** A jog MEGADÁSA két tengelyen állt (hatály +
rögzítés), a MEGVONÁS viszont egyetlen időpontot írt vissza a megadás sorába (`revoked_at`), és az
olvasó csak a megadás rögzítés-idejét nézte. **Reprodukálva a saját fánkon, karakterre az ő
alakjukban:** egy április 1-jén rögzített, március 10-i hatályú megvonás után ugyanaz a márciusi
kérdés (`validAt: március 15` · `knownAt: március 20`) előbb `granted: true`, utána
`scope_grant_revoked` — a rendszer visszamenőleg átírta a korábbi tudás-állapotot. Ez **történeti
lekérdezési hiba, nem árkiszivárgás**: a mai kiadás helyesen zárt.

**A javítás.** A megvonás SAJÁT esemény lett (`scope_grant_revocation`: alany · könyv · adatkör ·
eljáró · `effective_at` · `recorded_at`); a megadás sorához nem nyúlunk. Az olvasó EGY idővonalat
épít a megadásokból ÉS a megvonásokból, mindkét tengelyen szűrve, és a **legkésőbbi alkalmazható
esemény dönt** — ettől az ÚJRAADÁS is értelmes marad. Azonos hatály + azonos rögzítés esetén a
megvonás erősebb (fail-closed).

**Mérve (`P-DSC-scope-grant-history`, hat ág):** a később rögzített, visszamenőleges megvonás nem
írja át a korábbi tudást (ugyanarra a napra két tudás-állapot két IGAZ választ ad) · az előre
ütemezett megvonás a hatályáig nem zár · az újraadás újra nyit, a közbenső nap zárva marad · a
megvonás csak a saját alany×könyv×adatkör hármasára hat · a hibás idő nevezett, ÍRÁSMENTES
elutasítás (nulla új napló-sor) · és a megadás→kiadás→leltár→megvonás teljes útja a kiadás
IDŐHATÁRÁN válik zárttá.

**F51-02 — a saját állításom cáfolva, és helyesbítve.** Az R50-es jelentés és a D-VS-3058 azt
mondta, hogy az M179 (a határozat-állapot ellenőrzésének kihagyása) „valódi kiadást eredményez". A
külső fél elkülönített futása ezt megcáfolta, és a saját mérésem megerősíti: a megvont határozat
plafonja ÜRES, ezért a kiadás egy sorral lejjebb, az `outside_basis_scopes` ágon zárul — a próba a
VÁRT INDOKON bukik el, nem adatkiadáson. **A D-VS-3058 megfelelő mondata ezzel visszavonva.** A
valódi kiadást okozó alak külön mutáció: **M188**, KÉT sor rontásával (az állapot-ellenőrzés
kihagyása ÉS az üres plafon „mindenre jogosít"-ként olvasása) — mérve: a megvont határozatú olvasó
a készlet-eredményt TÉNYLEGESEN visszakapja (`kiadva → KIADVA`).

**A KÜLSŐ PROGRAMOK ADAPTÁCIÓJA — az ő kimondott engedélyükkel.** Az aktív `r79`/`r81` core
tesztvilág megkapta az általuk megírt és kipróbált `explicitReadFixture(store)` előkészítést
(rögzített alap + készlet- ÉS ár-olvasási jog a rendszer saját íróján), közvetlenül a meglévő
`member` tagsági sor után. A történeti `*.core.mjs` **bájtazonos** maradt és továbbra is futtatható
(`VS_EXT_CORE_VARIANT=historic`). **A régi piros mérést nem nevezzük visszamenőleg zöldnek:** az
R50-es forráson az `r79/P01-flat-quantity`, az `r81/P01-pure-lines` és az
`r81/F04-release-time-before` VALÓDI okból bukott — hiányzott az adatköri olvasási jog —, és a
szigorítás marad. Az `activeCoreProgram` és a manifeszt többé nem állítja, hogy az aktív változat
kizárólag a mennyiség-literálokban tér el.

**SZÖVEG-HELYESBÍTÉSEK (KUKA-050).** A `releaseScope.mjs` fejléce és az `RSB_CONTRACT`
(`order` · `sources` · `stated_limits`) már nem állít `membership_only` kiadást; a `resultScope.mjs`
`weakest_basis` mezője — amit mérve senki nem olvasott, és mindig ugyanazt adta — a tényleges
alapok listájára cserélve; a `norms.mjs` K05-DSC-c `remaining` szövege már **három** nyitott pontot
nevez meg, és kimondja, hogy csak az EGYIK üzleti döntés.

**Tanulság:** KUKA-192. **Gépi jel:** `node v3ref/run.mjs` (60 próba) · `npm run verify:v3ref`
(185 mutáció, benne M183–M188) · `npm run verify:kuka` (az `UPDATE scope_grant SET revoked_at`
tiltó-mintája) · `npm run verify:external-checks`.

---

## D-VS-3060 — a bírálati hatáskör alapjának korlátja kapu lett (2026-09-19)

**Parancs:** CMD-VS-300-002-002 R53 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). Ugyanebben a lapban a
**K05-DSC-c elfogadva** a jelenlegi egyírós, szintetikus, megbízható belső kontextusú referencia
explicit adatköri jogadására és eredménykiadására — **nem** a külső hitelesítési/HTTP-határra, **nem**
a teljes szervezeti képviseletre és **nem** a core-core lezárásra. Az egész-klauzulás elfogadások
száma ezzel **16** (a korábbi 15 + K05-DSC-c); ez **nem készültségi százalék**, és a történeti
R37/R51 állapotot nem írjuk át.

**A LELET (ORG-N1b, a bírálati úton).** A felhatalmazási alap mindig tárolta, mire szól: mely
műveletekre, szerepekre, adatkörökre. A meghívó útján ebből kapu lett; a **bírálati hatáskör** útján
viszont a korlát **csak adat** maradt. Reprodukálva a saját fánkon: egy **csak meghívó-kiadásra**
szóló határozattal `adjudicate` hatáskört lehetett **adni**, és a használat `allowed: true`-t adott.
Hétköznapi jelentése: *attól, hogy valaki meghívót adhat, még nem kapott jogot vitás ügy
elbírálására.*

**A JAVÍTÁS (ABL-01).** A deklarált alap **két ponton** korlátoz: a hatáskör **megadásakor** és a
tényleges **használat** alkalmazható időpontjában. A műveleti szerződés (MOP-01) megkapja a három
bírálati műveletet, és **kimondja**, hogy a szerep- és adatkör-tengely rajtuk fogalmilag nem
értelmezhető — néma megfeleltetést nem találunk ki. A már kiadott jogot egy később **tágabb** verzió
sem szélesíti: az ítélet a **megadáskori** verzió korlátját is megkérdezi
(`outside_granted_basis_version`), és új megadás továbbra is szabad, saját nyommal.

**Mérve (`P-ORG-adjudication-basis-limit`, nyolc ág):** a korláton kívüli megadás nevezetten és
**nyom nélkül** elakad mind a három műveletre (nulla hatáskör-sor) · a megengedett művelet megadható
**és** használható · a három művelet **külön** korlát · a később szűkülő alap a már kiadott hatáskört
is zárja · a később táguló alap önmagában nem szélesít · a hiányzó · idegen könyvű · még nem hatályos
· lejárt · megvont · olvashatatlan korlátú alap **mind** külön nevezett elutasítás · a kapu a
**valódi belépési pontokon** hat (felfüggesztés · elbírálás · jogváltoztatás, a közös ellenőrzési
ponton) · és az **alap nélküli, történeti** hatáskör viselkedése **változatlan**.

**SZERKEZETI DÖNTÉS.** A korlát **ítélete** (`OPERATION_LIMIT_CONTRACT` · `limitVerdict` ·
`adjudicationLimitVerdict`) a semleges `authorityBasis.mjs`-be költözött, mert a közös belépési pont
(`authority.mjs`) nem húzhatja be a `basisLimit.mjs`-t import-kör nélkül. A meghívó-út írói ott
maradtak; a behúzók a régi néven látják a szerződést (re-export). Ugyanaz a válasz, mint az R73-ban:
*„A függőségi kör szerkezeti feladat, nem indok az ellenőrzés elhagyására."*

**A KÉT PRÓBAKORREKCIÓ (az ő kipróbált irányukkal).** (1) Az **M186** az eredeti tesztvilágban csak
indokot cserélt, mert a `badEff` hívás mindkét időt elrontotta; a hatály most hibás, a rögzítés
érvényes — így az eff-őr a mérés tárgya, és a mutáció valóban hibás napló-sort ír. (2) A „határnap"
nevű ág **nem a határnapot mérte**: mostantól három közvetlen eset áll benne, ezredmásodperc-
pontossággal — 1 ms-mal a hatály előtt **kiad**, pontosan a határon és 1 ms-mal utána **zár**, és a
két elutasítás **egyetlen leltár-sort sem ír**. A „másik könyv érintetlensége" mellé bekerült az
**élő** ellenpár (létező második könyv, ott megadott joggal); a nem létező könyv esete megmaradt.

**SAJÁT PRÓBÁK IGAZÍTÁSA, NEM A KAPU LAZÍTÁSA.** A `P-ORG-basis` (d) ága eddig azt mérte, hogy a
korlát **csak adat** (`limit_enforced === false`) — ez az akkori valóság volt. A kapu megépítése után
ugyanez a sor **befagyasztotta volna** a régi állapotot (KUKA-057 fordítottja), ezért a próba a mai
valósághoz igazodik. Az (e) ág pozitív ellenpárja olyan műveletet kapott, amit a saját határozata
megenged — a mért tény (a könyv-azonosság) változatlan.

**Tanulság:** KUKA-193. **Gépi jel:** `node v3ref/run.mjs` (61 próba) · `npm run verify:v3ref`
(M189–M193) · `npm run verify:kuka` · `npm run verify:external-decisions` (38/38).

---

## D-VS-3068 — a bizonyíték-újrahasználat a bizonyítékhoz kötve, a hibás „visszaállítás" helyesbítve, a mérő a csomaghoz kötve (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R69 — ANALYSIS (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A külső fél az R68
mérő-javítását (kumulatív rekord · epoch-ablak · nevezett hiány · tartalommentes leltár) ELFOGADTA a
vizsgált hatókörben, a teszt-újrahasználatot és a „visszaállított" bizonyítékcsomagot NEM. Vizsgált fej:
`f09458ea343b9061fd505daedc2c7792e77b6c0e`. Tanulság: **KUKA-200**.

**F69-01 — a söprés kihagyása (SRU-01, `tools/lib/vs_sweep_reuse.mjs`).** Az R68-as `--skip/--reuse`
két COMMITOT hasonlított (`git diff <reuse> HEAD`), a munkafát/indexet/követetlent nem, a bizonyíték létét
és verdiktjét nem — a külső fél szintetikus repón bizonyította, hogy módosított és indexbe tett tesztfájl
mellett is „érvényes"-t írt. **Saját mérés rá:** a hivatkozott `64d1983` külső-lánc eredménye `ok:false`
(15/19) — a söprés BUKOTT bizonyítékot mondott érvényesnek. Mostantól a kihagyás CSAK „ÚJRAHASZNÁLT
BIZONYÍTÉK", ha (1) a hivatkozás feloldott commit (argumentumos git, shell nélkül) · (2) a commitban ott a
lánc bizonyíték-fájlja, ZÖLD verdikttel, TISZTA forráson · (3) a munkafa + index + követetlen bemenet
azonos a bizonyíték FORRÁSÁVAL (külső lánc: a `source.commit`-hoz; mag-battéria: a `base_digest` tartalmi
lenyomat + a bizonyíték commitja) · (4) lánc-szkriptek · függőségek · package-lock · futtató fő verziója
azonosak. Különben **„NEM FUTOTT — NEM IGAZOLT"**: az összverdikt nem zöld (kilépés 1), a lánc NEM indul
magától (az elutasítás nem indíthat húszperces láncot), a sor megmondja, mit kell külön futtatni. A
mag-battéria olcsó fele (`node v3ref/run.mjs`, ~2 s) újrahasználat mellett is lefut. **Mérve a bemenet:**
a `contracts/` mappát egyik lánc sem húzza be, a `tools/vs_verify_external_checks.mjs` nem létezik — az
R68-as bemeneti lista mindkettőt bemenetnek mondta. Gépi jel: `npm run verify:sweep-reuse` **SRU01–SRU10**
(43 állítás): szintetikus git-repó, a feloldó HÍVVA, a VALÓDI söprés alfolyamatként, a lánc el nem
indulása jelölő-fájlon mérve; a régi alakon bizonyítottan piros. A KUKA-200 tiltó-mintái a régi söprésen
TALÁLNAK, a pozitív minta HIÁNYZIK — mindkettő mérve.

**F69-02 — a bizonyítékcsomag és az átadás.** Az R68 REPORT „a results/ visszaállt a 64d1983 alakra"
mondata **HAMIS volt** — mérve 16 fájl eltért: az f09458e a részben lefutott, `64d1983+uncommitted`
bélyegű (18:43) futást vitte be. Most a `results/` VALÓBAN a `64d1983` alakon áll (`git diff --quiet
64d1983 -- results` üres), és KIMONDVA: **az a bizonyíték nem zöld** (`ok:false`, 15/19 — r57/r59
fal-időtúllépés felmentés nélkül, r57a/r59a `cap_ms` nélkül); az utolsó zöld, tiszta külső-lánc futás a
`c0fda69` forráson készült (252f38e), ami azóta változott. **A külső láncra ma nincs újrahasználható zöld
bizonyíték az ágon** — a söprés ezt NEM IGAZOLT-ként mondja ki, nem zöldként; a változatlan termék
újramérése nem volt követelmény, az R64 termékfelülvizsgálat nyitott. **A leltár:** a `tool_commit`
(80e48ea) a repó FEJE volt az exportkor, nem az eszközé — az exportáló FGY-01/2 akkor nem könyvelt fájl
volt (f09458e-ben, sha256 `e182a7c3…`); az exportkori fájl-hash NEM rögzült, és az ismétlés ebből a
környezetből nem lehetséges (az átiratok a régi környezetben állnak — mérve: itt 1 fő-átirat). Ezt a
leltár `annotations_r70` mezője NEVEZETTEN hordozza (a mért számok érintetlenek); a „R67" ablak
helyesbítve „R66 utáni időszak"-ra, záró pillanatképpel (19:38:43.316Z); a 3043 hívás növekménye nem
kizárólag a mérőjavítás (21 új hívás az ablakban). FGY-01/3 óta a jelentés viszi a `tool_file_sha256` ·
`tool_dirty` · `snapshot_closed_at` mezőt.

**F69-03 — a mérő kijelzése és kötése (FGY-01/3).** Hiányos usage mellett az összeg **ISMERT
RÉSZÖSSZEG** (`totals_kind`), az összes ISMERETLEN; hiányos megfigyelésből **nem következik „kereten
belül"** — a küszöb ilyenkor NEM ELDÖNTHETŐ (kilépés 1), az átlépés viszont kimondható. `--session auto`
CSAK egyértelmű kötésnél: a futó folyamat saját `CLAUDE_CODE_SESSION_ID`-ja, ha van hozzá átirat — a
„legutóbb módosult fájl" nem választó többé (nevezett hiány, kilépés 2). `--quick` KÖTELEZŐEN `--from
<csomag kezdete>`-vel fut. Ellenpróbák T15–T17, 17/17. **A két elavult képesség-rögzítés** nem operátori
teendő: a bizonyítékhoz kötött rendezés a chatgpt-v2/Claude-v2 sáv dolga, külön hatáskörben — a V2-t
nem módosítottuk, `present`-re bizonyíték nélkül nem állítjuk.

**Mérve ebben a körben:** a V2 repó gyökér-fájlja ehhez a munkamenethez is BETÖLTŐDÖTT (két repó volt
csatolva, a parancs „csak valach-system" kérése ellenére) — a fő-szál kontextus-mediánja emiatt a jelző
fölött; a szűkítés: nulla ügynök, célzott olvasás. Nincs merge, telepítés, V2-módosítás, új üzleti
modul; az R64/core termékelfogadás nyitott.

## D-VS-3067 — a mérő a mért rekord-szemantikán, a kihagyás azonossághoz kötve, a kör-határ a board időbélyege (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R67 — ANALYSIS (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A külső fél az R66-ot
RÉSZ-eredménynek fogadta el (rövidebb gyökér-fájl, a board-eszköz indulása), és a fogyasztási védelmet NEM:
a mérő az ő ellenpéldáin adatot vesztett, a drága lánc a söprésben újra elindult, az export nem volt átadva.
Ellenőrzött fej: `80e48eadc8467e47223ac6b154facdd5f4169b20`.

**F67-01 — a mérő (FGY-01/2), a MÉRT formátumra:** egy modellhívás az átiratban több sorban áll
(tartalom-blokkonként), a usage KUMULATÍV — a kimenet a sorokon nő, az utolsó sor a teljes (667/667
többsoros azonosító, 0 kivétel; azonos azonosító két fájlban 0/1666). Az első alak az ELSŐ rekordot
tartotta meg, tehát a kimenet elveszett (**megtalálta: chatgpt-v3**, „1 → 100 ⇒ 1"). Mostantól: az UTOLSÓ
rekord a hívás; az időablak EPOCH-on hasonlít (a `+02:00` alak helyesen esik az ablakba), a hibás határ
nevezett hiba; üres/hiányos usage HIÁNY (külön számláló), szintetikus rekord nem hívás; a lefedettség csak
akkor „teljes", ha egyetlen hiány-számláló sem nulla fölötti; a manifest bájtot mér; a megismétlő parancs
viszi a `--projects` utat és az eszköz commitját. Hét új ellenpróba (T8–T14), 14/14; a söprés része.
**Új mérés benne: a fő szál ébresztés-bontása** (user · hook · notification · compaction), minden hívás
pontosan egy indítóhoz — átfedés kizárva; a beszúrt skill-/parancs-visszhang sorok nem ébresztések.

**F67-02 — a kör-határ a board időbélyege, a leltár a repóban:** az ablakok a board üzeneteinek
`created_at` idejéből (R63 parancs 09:25:09Z · R64 üzenet 16:21:32Z · R65 parancs 17:45:19Z · R66 üzenet
18:39:17Z), a bizonytalan határ jelölve (az R63 első hívása a modellváltás után 10:14:40Z). Az R66 „R63/R64
ablak" (10:14→18:09) tehát R63-végrehajtást, utólagos diagnózist ÉS R65-végrehajtást kevert — visszavonva.
A tartalom nélküli leltár az átadási helyen: `docs/70_PLANNING/V3_R68_FOGYASZTAS_LELTAR.json` (ablakonkénti
összesítők · bemeneti manifest sha256-tal · örökléskontroll-tanú: 43 al-ügynök átirat mellékletének mérete
és lenyomata; nyers átirat, szöveg, titok nincs benne). „Nem használt ≠ nem betöltött": a V2 ebben a körben
NEM volt munkára használva, de a három csatolt repó gyökér-fájlja MINDEN általános ügynöknek betöltődött.

**F67-03 — a söprés célzott útja MÉRT azonossággal:** `npm run verify:sweep -- --skip … --reuse <commit>`
csak akkor hagy ki, ha a lánc BEMENETE (v3ref forrás a results/ és a source-documents/ nélkül, contracts,
a lánc package.json-szkriptjei) a git szerint azonos a hivatkozott committal; különben lefut. Az R66-ban a
sweep által részben felülírt 14 eredmény-fájl visszaállítva a `64d1983` alakra (az a hivatkozott bizonyíték).
A munka közbeni ellenőrzési pont: `meres:fogyasztas -- --session auto --quick` (modellhívás nélkül) minden
nagyobb delegálás előtt és feladatcsoport után; a mentő commit megengedett.

**F67-04 — a helyes forráság és a tényleges felhatalmazás:** az ügynök össze nem olvasztott ághoz NEM ad
main-checkout/pull/söprés utasítást az operátornak; a chatgpt-v3 az operátor felhatalmazásával PARANCS-KÖRT
ír a boardra (mérve: R65, R67) — a régi tiltó mondat visszavonva, a felhatalmazás az operátoré; a board-eszközök
`repo` mezője a git-távoliból jön (`--repo` felülír) — az R66 üzenet még `valach-family/vs` alatt ment fel.

**Nincs új KUKA-bejegyzés, kimondva:** a mérő hibája a KUKA-067 osztálya (tárolási konvenciót nem
feltételezünk — kiolvassuk), az ablak-keverés a KUKA-054 (mi választotta ki a mintát), a felülírt eredmény-
fájl a KUKA-011 (a feltolt kód ≠ ami fut); mind a három tanulság hordozza. **Megtalálta: chatgpt-v3** (R67).

## D-VS-3066 — a munkarend tényleges javítása: rövid memória, egy csomag = egy munkamenet, mért fogyasztás (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R65 — SPEC (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL, az operátor R64-es
kérdéseiből). Kiindulás: a munkamenet mért fogyasztása (R64) — a fő szál kontextusa 480 ezer token
körül állt hívásonként, a csatolt V2 gyökér-fájl (222 614 bájt) minden általános ügynöknek betöltődött,
és a hook/értesítés-ébresztések a hívások többségét adták. Kezdő SHA: `64d1983b4a8207ef681d55fa95ad2ce6ee52f35d`.

**Amit ez a döntés rögzít (a CLAUDE.md 1. szakasza a rövid alak):**
1. **A SPEC első sora a repó** — `Repó: valach-system` az alapérték; a V2 csatolását a Claude-v3
   vagy a chatgpt-v3 indokolja, a célzott olvasnivalóval — nem az operátor dönti el.
2. **Egy összefüggő csomag = egy munkamenet**, a csomag ELŐTT a régi munkamenet mérés-forrásai mentve
   (`v3ref/source-documents/`), a záró REPORT commitolva; új beszélgetés nem board-sorszámonként.
3. **A kijelölt ág az ügynöké, a `main` az operátoré** — a terminál-blokk az operátor gépén fut, az
   ügynök nem vált `main`-re. **A söprés a csomag végén teljes, közben célzott**; a többperces külső
   lánc nem fut újra változatlan magra (az R63 §5 szabálya a memóriában, a régi „minden kör" alak
   helyett). **A kiadás nem a kör** — a két menetrend külön áll.
4. **Párhuzamos ügynök csak szétválasztható részfeladatra**, kimondott céllal · forrással ·
   kimenettel · hívás-kerettel; csak-olvasásra `Explore` (mérve: nem kapja a gyökér-fájlokat).
5. **A fogyasztás mérés:** `npm run meres:fogyasztas` (FGY-01, `tools/v3_fogyasztas_meres.mjs`),
   tartalom nélküli gépi összefoglaló, hét ellenpróba (`verify:fogyasztas-meres`, a söprés része);
   a körönkénti usage-melléklet megszűnik, helyette egy sor a csomag végén. Kísérleti jelzők: fő-szál
   medián > 200 ezer · ügynök-bemenet > 40 M / csomag.
6. **A board-írás tényleges hatóköre ebből a repóból:** lap (`vs_board_doc.mjs`) és kör-üzenet
   (`vs_board_round.mjs reply`) megy; a zárás mátrixa (`close-*`) a V2 katalógusához kötött, és az
   eszköz ezt nevezett hibával mondja ki — a katalógust és a sáv-listát ide NEM másoljuk.

**Mérve, nem feltételezve:** a CLAUDE.md 16 880 → 12 492 bájt (a bájt nem token); a Stop-hook
(`~/.claude/stop-hook-git-check.sh`) és az értesítés-ébresztés KÖRNYEZETI beállítás
(`~/.claude/launcher-settings.json`), a repóból nem módosítható — a kerülő munkarend: a köztes
futások `var/`-ba írnak, a csomag EGY záró commitot kap, a hook üres ébresztése így nem ismétlődik.
A részletek és a V2-átadás: `docs/70_PLANNING/V3_R66_MUNKAREND_JAVITAS_REPORT.md`.

**Nincs új KUKA-bejegyzés, kimondva:** a hibás alak (a teljes gyökér-fájl minden ügynöknek) nem
kód volt, hanem munkarend; a tanulság a KUKA-051 (a hatókör szabály, nem lista) és a KUKA-054 (a
mérés mintája) osztályába esik, és a CLAUDE.md 1. szakasza hordozza.

## D-VS-3065 — a jogadás alapja SZAKMAI ALAPÉRTELMEZÉS, kódban; az első felhasználói folyamat a magon (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R63 — SPEC (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A külső fél
**helyesbítette a saját R61-es keretezését**: az A/B jogadási kérdés (D-VS-3064) nem operátori üzleti
akadály, hanem szakmai alapértelmezés — *„Zsolt nem döntött a felhatalmazási alapról" többé nem
elfogadható indok*. A D-VS-3064 két kérdése ezzel **kódban zárult**, nem döntéssel.

**A modellváltás MÉRVE:** az operátor a munkamenetben **Fable 5.1**-re váltott, és utána adta át az
R63-at (`session_context.model` · `last_served_model` · `user_switched_model` mind
`claude-fable-5-1`). Az R63 §7 „claude-opus-5, medium" ajánlása mellett a kör Fable 5.1-en futott;
ezt a jelentés kimondja. A fogyasztás R24-től ismeretlen; a költség `null`.

**Ami a magban megépült (R63 §4 → kód):**
- **ACC-01** fiók és csatorna-bizonyítás (`account.mjs`) · **WSP-01** saját munkakörnyezet EGY
  tranzakcióban, `startup-rule:v1` alappal, CSAK bizonyított csatornával (`workspace.mjs`) ·
  **DLG-01** a meghívó alapja a kiadó továbbadható jogából, plafonnal; a jog KÜLÖN lépés
  (`delegation.mjs`) · **PRL-01** védett platform-szabály a bírálói kezdő jogra (`platformRule.mjs`) ·
  **XID-01** névterezett külső azonosító, országprofil (`externalId.mjs`) · **ENT-02** előfizetés-profil
  és két kapu külön (`entitlement.mjs`) · **openStoreAt** tartós, több-kapcsolatos WAL-tároló.
- **ALAP-ZÁRÁS:** alap nélküli hatáskör nem adható (`basis_id_required`) és nem használható
  (`authority_without_recorded_basis`); pecsét nélküli meghívó nem váltható be
  (`invite_without_basis`). A történeti sor MARAD, a mai használat külön; **élő migráció nincs**.
- **BLI-01 őr:** a `grant_basis` beszúrás-oldali újrapecsét-tilalma — a feltérképező olvasó KÉT
  kapcsolaton mérte, hogy egy pragma nélküli második kapcsolat `INSERT OR REPLACE`-szel némán
  átírta volna az átvitt korlátot (a törlés-trigger `recursive_triggers` nélkül nem fut).
- **A próba-alkalmazás** (`v3app/`, nulla új futásidejű csomag): a cselekvő a szerveroldali
  munkamenetből; a kliens `book_id`/`actor`/`role` mezője NEVEZETTEN figyelmen kívül; levél külső
  személynek soha (fejlesztői fogadó); `npm run app:dev` · `app:selfcheck` · `proof:core-ux`.
- **OB-1 többkapcsolatos mérő** (`tools/v3_multiconn_proof.mjs`, `proof:multiconn`): két VALÓDI
  folyamat, 40/40 menet — az OB-1 **nem zárult** (nem Postgres), a szövege helyesbítve.

**VISSZAVONT ELSŐ ALAK — KUKA-199:** a beváltás első változata a pecsét adatkörét automatikusan
olvasási joggá írta; a saját P-DSC próbák az első futáson pirosak lettek (K05-DSC-c: a megadható nem a
megadott). Visszavonva; M204 mutáció őrzi; **megtalálta a saját próbám, kiadás előtt**.

**Az OB-szövegek ugyanebben a munkában helyesbítve** (R63 §5.1 · KUKA-050): OB-1 („determinisztikus
közbeiktatás" → két valódi folyamaton mérve, a Postgres-határ nyitva) · OB-6 („a modell nincs" → a
saját kör és a delegált alap megvan, a KÉPVISELET (ORG-N3) nyitva) · USE-G1 (a kapu zárva marad).

**A lezárási lista OTTHONA:** `docs/70_PLANNING/V3_R64_CORE_FOLYAMAT_ES_LEZARASI_LISTA.md` 7. szakasza
(L1–L9 + az eltéréslista sorai), a gépi eltéréslista
`docs/70_PLANNING/V3_R64_CORE_ELTERESLISTA_LELTAR.json`. **Világos állítás:** az első UX elkészült ·
a mini-modulok közös alapja RÉSZBEN · üzemi használat NEM bizonyított.

**Nincs új KUKA-bejegyzés a többi hibára, kimondva:** a P-CORE első mutációs futásának WRONG_CATCHER
ítélete (a lánc első lépésének bukása kivételként jelent meg) a KUKA-187 osztálya — javítva (a bukás
állítás-bukás); az OB-szövegek elévülése a KUKA-050.

**ELLENSÉGES FELÜLVIZSGÁLAT UGYANEBBEN A KÖRBEN — és amit ebből javítottunk:** tizennégy független
szkeptikus a 14 helyzetre; a mag jogosultsági döntését egyik sem döntötte meg, de három R63-as
részszabály hiányát és több díszfeliratot/mérési rést talált. Javítva, saját próbával: a beváltás a
KIADÁSKORI alapon túl a MAI érvényességet is méri (`basis_not_in_effect_at_redemption`, M206) · a
megfigyelés a kiadó mai jogát is méri, halott meghívóra nem ígér folytatást (M207) · az ár-nézet a
jog-kaput kiadás NÉLKÜL méri, kiadás csak ha mindkét kapu enged · nevezett 400 az ismeretlen tervre
és az üres adószámra · `/api/me` hozza a vállalkozási minőséget · generáció-őr a kliens adat-gombjain ·
MEGENGEDŐ szabály a kliens-mezőkre · a több-folyamatos mérő MINDKÉT sorrendet megköveteli. A pecsét
adatkörének „plafon" felirata a valóságra javítva (a szűkítő átvitelt MÉRTÜK: a delegálási láncot
törte volna — nem az). Részletek: a jelentés 5/b. szakasza. **Nincs új KUKA-bejegyzés ezekre** —
a leletek a KUKA-024 · 015/041 · 064 · 057 · 054/093 osztályaiba esnek.

**Gépi jel:** `node v3ref/run.mjs` (62 próba, P-CORE 7 állítás) · `npm run verify:v3ref` (M196–M207) ·
`npm run app:selfcheck` (57/57) · `npm run proof:core-ux` · `npm run proof:multiconn` (40/40) ·
`npm run verify:grant-paths` (12/12 + 3/3) · `npm run verify:kuka` (KUKA-199) ·
`npm run verify:external-decisions` (az R63 forrás bejegyezve, elfogadást nem hordoz).

---

## D-VS-3064 — az átadási csomag lezárva; a jogadási szabály OPERÁTORI döntésre vár (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R61 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A lap a saját szavával
**„ellenőrzési dokumentum, nem új végrehajtási parancs"**: az R59 három javítását (F59-01 · F59-02 ·
F59-03) a vizsgált referencia-hatókörben **elfogadta**, és kimondta, hogy az **R57–R60
leltár-/átadási csomag lezárható**. Ugyanott a korlát is: *„Ez nem az összes core-követelmény
lezárása."* Az **ORG-N1a/b egésze részleges**, **req-5 és core-core lezárás nincs**, az elfogadott
egész klauzulák száma **változatlanul 16** — a regiszterben a verdikt ezért `partial` maradt, a
lezárás a döntés indokában áll (KUKA-105).

**Két szöveges maradvány javítva** — a külső fél nevezte meg őket, és kifejezetten **nem** indított
miattuk javítókört; mégis javítottuk, mert hamis állítás nem maradhat a forrásban (KUKA-050):

1. A GPR-01 bevezetője azt mondta, hogy „minden itt deklarált próba **TÉNYLEG fut**" — az őr
   valójában a **deklarációt** keresi a forrásszövegben, a próbákat nem futtatja. Javítva; a futást
   a `verify:v3ref` méri, ez az őr nem. Ez a KUKA-197 alakja, egy szinttel kisebben.
2. A GP-SCOPE-GRANT `works` mezője azt állította, hogy „ez az **EGYETLEN** út, ahol az alap nem
   opció" — **túl erős**: a nevezett meghívó-kiadó is követeli az alapot.

**A javítás közben MÉRT, valódi különbség** (és ez maradt a lapon a törölt állítás helyén): az
adatköri jogadásnál a kapu nem csak a függvényben áll, hanem a **sémában** is — a nyers
`INSERT INTO scope_grant` elakad (`NOT NULL constraint failed: scope_grant.basis_id`, mérve), tehát
alap nélküli adatköri jog **egyáltalán nem keletkezhet**. A meghívónál ezzel szemben a nyers
`INSERT INTO invite` **átmegy**. A különbség tehát nem a függvény szigora, hanem a **kapu helye**.

**Nincs új KUKA-bejegyzés, és ezt kimondom:** mindkét maradvány a **KUKA-197** (az állítás többet
mond, mint a mérés) és a **KUKA-050** (a szöveg a valóságot követi) esete, nem új hiba-osztály.
Közel azonos bejegyzést felvenni hígítaná a regisztert.

**A KÖVETKEZŐ LÉPÉS NEM FEJLESZTÉS, HANEM ÜZLETI DÖNTÉS.** A külső fél sem adott új fejlesztési
parancsot, és új blokkoló technikai hibát sem talált. Két, egymástól független kérdés vár az
operátorra — a részletek a jelentésben:

- **A.** Kötelező legyen-e rögzített felhatalmazási alap az **új bírálati jogadáshoz** és a **pecsét
  nélküli meghívó beváltásához**? (A külső fél ajánlása: igen, és az **első** jogosultság
  létrehozásának szabályát külön kell rendezni. **Ez nem jelent feltöltött okiratot.**)
- **B.** Mi legyen a kompatibilitási szabály az **alap nélkül tárolt történeti bejegyzésekre**? (A
  külső fél ajánlása: a történetet megőrizni, a jövőbeli használat feltételeit külön meghatározni.)

**Amit egyik döntésnél sem állítunk ténynek:** hogy ma éles V3-jogok migrációjáról döntünk. Ezek
szintetikus referencia-adatok; éles határnapot és valós üzemi fennakadást nem állítunk. **És a
munka méretét sem nevezzük kicsinek** a bootstrap, a történeti sorok és az érintett hívók felmérése
előtt.

**Gépi jel:** `npm run verify:external-decisions` (44/44, az R61 forrással) + `verify:grant-paths`
(9/9 és az önpróba 3/3 piros). A két javított mondatra külön gépi jel **nincs** — kimondva: hogy egy
megírt mondat tartalmilag igaz-e, arra nincs őr.

---

## D-VS-3063 — az őr állítása is mérés, és a hiány határa nem az út hibája (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R59 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A jogadási leltárt és az
R57 szűk elfogadásának átvezetését **előrelépésnek** ismerték el, a bírálati hatásköri javítócsomag
korábbi lezárása **megmarad**, a működő kódot nem nyitjuk vissza. Három leletet kellett egyben
rendezni — mindhármat **reprodukáltam a saját fánkon, a javítás előtt**.

**F59-01 — a következtetés egy olyan tulajdonságból, ami a testvéreken is igaz (KUKA-198).**
Az R58-ban „bizonyított technikai hiánynak" és „az egyetlen következő munkacsomagnak" neveztem,
hogy az adatköri jogadásnak nincs próbán kívüli hívója. Mérve: **ugyanez igaz a testvéreire is** —
az `issueInviteUnderBasis` hívói szintén csak próbák, a `grantAdjudicationAuthority` hívói a
`run.mjs` és két mérési előkészítő, amiket ugyanabban a leltárban én magam soroltam a fixtúrák
közé. A tulajdonság tehát nem egy út sajátja, hanem a **referencia mai hatóköre**: ez **későbbi
adapter-/integrációs határ** (`later_adapter_surface`), nem mai core-hiba. A következtetést
**visszavontam**; meglévő, szabályosan működő referencia-függvény elé pusztán emiatt burkolót tenni
nem bizonyított követelményteljesítés.

**Ugyanitt egy mért tény is rosszul állt a lapon.** Azt írtam, hogy „a deklarálatlan meghívó is
kiadható" — a nevezett kiadó út viszont az alapot **követeli**: `basisId: null` mellett
`basis_id_required`, és **nulla sor** születik (mérve). Az alap nélküli meghívó **nyers írásból**
keletkezik, ami megkerüli azt az utat. Innentől a három alap nélküli eset **külön** áll: pecsét
nélküli meghívó **beváltása** · alap nélküli **bírálati** jogadás (itt a nevezett függvény engedi,
a sor `basis_id = NULL` értékkel létrejön — mérve) · explicit **adatköri** jogadás (ott az alap
feltétel, tehát az eset nem áll fenn).

**F59-02 — az őr többet állított, mint amennyit ellenőriz (KUKA-197).**
Három izolált ellenpélda, mind reprodukálva: új modul sima `INSERT`-tel ⇒ kilépés 1 (**fogta**) ·
ugyanaz `INSERT OR IGNORE` alakkal ⇒ kilépés 0 (**átment**) · új függvény egy már felsorolt
modulban ⇒ kilépés 0 (**átment**). Javítás: az írás-alakok nevezett listája · **GP06** arányos,
célzott ellenőrzés (a jogadó írás-helyek darabszáma modulonként deklarált; a mérési előkészítők
deklaráltan **változók**, hogy ne szülessen kézzel léptetett számláló — KUKA-045) · és a szöveg a
tényleges vizsgálatot mondja ki: strukturális, szöveg-szintű mérés, **nem** hívási lánc-elemzés, a
próbákat **nem** futtatja. **Kimondott kézi felülvizsgálati határ:** a függvény-szintű teljesség és
a hívó-besorolás nem gépileg bizonyított.

**F59-03 — a végső normaösszesítő régi forrást mutatott.** A beadott
`docs/70_PLANNING/V3_R36_NORMA_LANC_CSOMAG.json` a korábbi `4ca52d2d…` lenyomatot és 40 döntéssort
hordozott, miközben a mag `ca9c6739…`, a regiszter 42 soros. Nem generátorhiba: a végső beadásból
maradt ki az újragenerált csomag. Innentől a csomag a bizonyíték-próbák **után**, az ép, eredeti
bemenetből készül, és **vissza is olvassuk**.

**Amit ez a döntés nem tesz meg.** Nem épít új adatköri bejáratot, HTTP-adaptert vagy felületet;
nem hoz jogadási üzleti szabályt; nem oldja fel az ORG-N1 részlegességét; nem címkéz át régi
mérést. A „kis munka, csak az opcionális szót kell elvenni" becslést **visszavontam** — nem volt
mérve —, és a meglévő jogok migrációjáról szóló következmény **feltételes üzemeltetési
forgatókönyvként** szerepel, a szintetikus referencia tényeitől elválasztva.

**Gépi jel:** `npm run verify:grant-paths` — két futás: az ép fán GP01–GP06 (pozitív ellenpár),
majd `--selftest` a három ellenpéldát eldobható másolaton, a kilépési kódon mérve (**3/3
bizonyítottan piros**).

---

## D-VS-3062 — a jogadási utak nyilvántartása, és a maradék útankénti megnevezése (2026-09-20)

**Parancs:** CMD-VS-300-002-002 R57 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). A külső fél **elfogadta**
az F55-01 és F55-02 javítását a vizsgált egyírós, szintetikus, megbízható belső kontextusú
referenciában, és kimondta: az **R53–R56 deklarált alapú bírálati hatásköri javítócsomag ebben a
hatókörben lezárt**. Amit ugyanez a mondat NEM enged: az **ORG-N1a/b egésze továbbra is részleges**,
**req-5-re lépés és core-core lezárás nincs**, és az **elfogadott egész klauzulák száma
változatlanul 16** — saját szavukkal: *„A részcsomag lezárását nem szabad új egész-klauzulás
elfogadásként számolni."* A regiszterben ezért a verdikt `partial` maradt, a lezárás a döntés
INDOKÁBAN áll (KUKA-105).

**A lelet, amit ez a kör javít (KUKA-196).** Az ORG-N1a maradék-szövege így szólt: hiányzik *„az
ÁLTALÁNOS képviseleti lefedés"*, mert *„a bekötés a MEGHÍVÓ útján él, a többi felhatalmazási útra
nincs sem alap-hordozás, sem mérés"*. Mérve, ugyanazon a forráson, ez **két ponton már nem volt
igaz**: a bírálati hatáskör (R53/R55) és az adatköri jogadás (R51) is hordozza ÉS méri az alapot,
utóbbinál az alap egyenesen **feltétel**. A `NEXT_REQUIRED_EVIDENCE` magyarázata pedig **jelen
időben** tagadta, hogy a meghívó tárolna határozat-azonosítót, verziót és hatályt — holott az
`invite_basis` az R37 óta áll. **Megtalálta: a külső ellenőrző fél** (R57 §3), három konkrét
forrásbeli ellentmondást megnevezve.

**Miért volt ez több elírásnál.** Az általános hiány-mondat **nem mérhető**: nincs olyan munka,
amiről meg lehetne mondani, hogy teljesíti — és közben eltakarja azt is, ami már elkészült. Külön
hiba, hogy három különböző dolog mosódott egy mondatba: a **létező út, nem kötelező alappal**
(operátori döntés), a **létező út, hiányzó bejárattal** (fél lánc), és a **még nem létező
képesség** (általános szervezeti képviselet).

**A döntés.** A jelenlegi magforrás tényleges jogadási útjai **egyetlen, kódban élő táblába**
kerülnek (GPR-01, `contracts/grantPathRegistry.js`): belépési pont · adott jog · alap/verzió/hatály
tárolása · megadási és használati kapu · érintett norma · mi működik és mi hiányzik. A besorolás a
**tényleges használat** szerint megy: négy **termékbeli jogadási felület** (meghívó kiadása és
beváltása · bírálati hatáskör · adatköri jogadás), egy **másik út írója** (`grantMembership` — a
termékben csak a beváltás hívja), három **mérési előkészítő** (tiltás-mátrix · belépési pont-mátrix
· próbák és mutációk) és egy **sémaszintű tükrözés**. Az ORG-N1a/b maradék-szövege innentől ezeket
az azonosítókat nevezi meg.

**Amit ez a döntés KIFEJEZETTEN nem tesz meg.** Nem hoz üzleti szabályt az alap nélküli jogadásra és
a már meglévő, alap nélküli jogokra — ezeket az R57 §4 szerint **operátori döntési pontként** adjuk
át, a mai viselkedéssel, az érintett utakkal, az alternatívák következményével és ajánlással. Nem
épít új modult, és nem mond ki új képességet.

**Gépi jel:** `npm run verify:grant-paths` (GP01–GP05) — a jogadó írók halmaza a **forrásból** jön,
nem kézi listából; a deklarált sor vagy maga ír, vagy **kimondott delegálást** mér; és az ORG-N1a/b
maradék-szövege **konkrét utat** kell megnevezzen. Az őr az első futásán négy valódi eltérést
talált. **Amire nincs gépi jel, kimondva:** hogy egy megírt hiány-mondat tartalmilag helyes-e.

---

## D-VS-3061 — a hiányzó megadáskori verzió zár, és a mérés a saját tárgyát méri (2026-09-19)

**Parancs:** CMD-VS-300-002-002 R55 (chatgpt-v3 — KÜLSŐ ELLENŐRZŐ FÉL). Az R53-as hatásköri
csomagot **ellenőrizték**, és valós előrelépésnek ismerték el; a **K05-DSC-c elfogadása érvényben
marad**, az **ORG-N1a/b továbbra is részleges**, req-5-re lépés nincs, és az elfogadott egész
klauzulák száma változatlanul **16**.

**F55-01 — a hiányzó megadáskori verzió kikapcsolta a történeti korlátot.** Az R53-as alak a
`null` megadáskori verziót így értette: *„nincs korábbi bélyegző, tehát csak a MAI alap dönt"* — és
engedett. Ugyanaz a `null` viszont **két** helyzetet jelölt: a MEGADÁST (ahol tényleg nincs még
verzió) és egy **már megadott** jog **hiányzó történeti bizonyítékát**. Reprodukálva a saját fánkon,
mind a három bírálati műveletre: egy `basis_id` szerinti, de `basis_version = NULL` hatáskör-sorral
a február 1-jei használat **átment**, és **valódi hatást** fejtett ki — felfüggesztés jött létre, az
ügy `resolved` lett, a tagság megvonódott.

**A javítás.** A módot a **hívó mondja ki** (`LIMIT_CHECK_MODES = grant | use`), és egyik mód sem
következtethető a `null`-ból. HASZNÁLAT módban a megadáskori verzió **kötelező bizonyíték**: a
hiányzó (`granted_basis_version_absent`), az értelmezhetetlen
(`granted_basis_version_undecidable`) és a nem létező (`granted_basis_version_missing`) verzió
**mind külön nevezett elutasítás, hatás és írás nélkül**. MEGADÁS módban a korábbi verzió átadása
maga is hiba (`granted_version_not_applicable_at_grant`), a mód nélküli hívás pedig zár
(`limit_check_mode_required`). A rendes megadási út **változatlanul működik**, és a `basis_id`
nélküli történeti jog kezeléséhez **nem** találtunk ki új üzleti szabályt.

**F55-02 — a valódi használati kapu ellenpróbáját egy korábbi elutasítás elfedte.** A „valódi
belépési pontok" ága korábban **előbb megpróbálta megadni** a tiltott hatásköröket; a megadási kapu
jogosan elutasította, ezért a műveletek **hatáskör híján** akadtak el, nem a **használati**
korláton. Mérve (az ő futásuk és a mienk is): a használati kapu kivétele a (d)/(e)/(f) ágat
megbuktatta, ezt az állítást **nem**. Mostantól mind a négy ág úgy indul, hogy a hatáskör
**szabályosan megszületik**, és a világ csak azután változik:

| ág | mit mér | mért hatás |
|---|---|---|
| jogos ellenpár | a három művelet **megtörténik** | felfüggesztés-sor · `resolved` ügy · megvont tagság |
| szűkített alap | a használati kapu | **egyik sem**, a táblák változatlanok |
| hiányzó megadáskori verzió | F55-01 a valódi utakon | **egyik sem**, a táblák változatlanok |
| alap nélküli, történeti jog | a **megőrzött** ellenpár | a három művelet megtörténik (változatlan) |

Az ÜGY-út válasza a zárt ágakon **bájtra azonos** a nem létező ügyére adott válasszal — a meglévő
semlegesítés megmaradt. A hiány-alakokat a **megadás** és a **használat** kapuján **külön, saját
előfeltétellel** mérjük; a korábbi hat vegyes eset kétpontos bizonyítéknak *látszott*, miközben egy
volt.

**MÉRT HELYESBÍTÉS A SAJÁT MUTÁCIÓMON (KUKA-187).** Az M195 első alakja magát a mód-kaput vette ki,
és **`SURVIVED`** lett — mert minden mai hívó átadja a módot, tehát a kapu kivétele önmagában nem
okoz kárt. Ez a rendszerről jó hír, bizonyítéknak viszont semmi; a mutáció ezért arra az alakra
került, ami valódi hatást okoz (a hívó elfelejti a módot ⇒ a **jogos** művelet is elakad).

**Tanulság:** KUKA-195. **Gépi jel:** `node v3ref/run.mjs` (61 próba) · `npm run verify:v3ref`
(M194 · M195 · a megerősített M190) · `npm run verify:kuka` · `npm run verify:external-decisions`
(40/40).
