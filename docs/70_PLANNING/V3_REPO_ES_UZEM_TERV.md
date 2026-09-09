# A V3 REPÓ ÉS ÜZEM FELÉPÍTÉSE — verziók, környezetek, migráció, visszaállítás

Claude-AUX · 2026-09-09 · operátori kérdésre
Előzmény: az operátor kérdése — *„a repo-t úgy kellene összerakni, hogy ha kimegy élesbe, akkor legyen
esély a v3.1 a v3.2 stb módosításoknak… és még párhuzamosan a v4-nek… nem beszélve a visszaállítás
lehetőségéről db-ben, ha valami elromlik, és vissza kell az élő használat közben állítani… support,
demo stb."*

---

## 0. Egy javítás a SAJÁT előző javaslatomon

Az előző körben a `vs3` nevet ajánlottam. **Ez hibás volt, és a te kérdésed mutatta meg, miért.**

Ha a repó neve verziószámot hordoz, akkor a v4-nél `vs4` kellene — és akkor **az egész memória-,
eszköz- és board-gépezetet újra át kellene költöztetni**. Pontosan az a probléma ismétlődne meg, ami
miatt most egyáltalán gondolkodunk.

**A verzió NEM repó-név és NEM mappa. A verzió CÍMKE a git-történetben.** Egy termék = egy repó,
akárhány fő verzión megy át. A Postgres 15-ből is 16 lett — nem nyitottak neki új repót.

**Javasolt név: `valach-family/valach-system`** — a termék valódi neve, verzió-semleges, és v7-nél is
helyes lesz. (Ha rövidebbet szeretnél: `vsys`. Szám a névbe soha.) A mai `vs` marad az, ami: a V2
otthona, a saját nevén.

**És ezt nem emlékezetből mondom — mérve:** a mai repó `package.json`-ja már ma is ezt a nevet viseli:

```
"name": "valach-system",
"version": "2.0.0-alpha",
"description": "Valach System (VS) v2 — canonical implementation repository."
```

Tehát a **termék** neve `valach-system`, a **verzió** pedig `2.0.0-alpha` — a kettő már ma is külön
mezőben áll. Csak a GITHUB-repó neve (`vs`) csúszott el ettől. A javaslat nem új fogalmat vezet be:
azt a nevet teszi ki a repóra, amit a rendszer magáról már ma is állít.

---

## 1. Verziózás — a v3.1 / v3.1.2 / v4 kérdés

### A séma: `FŐ.ALVERZIÓ.JAVÍTÁS`

| Mikor lép | Példa | Mit jelent |
|---|---|---|
| **JAVÍTÁS** | 3.1.1 → 3.1.2 | hiba javítva, viselkedés nem változott, nem kell hozzáérni semmihez |
| **ALVERZIÓ** | 3.1 → 3.2 | új képesség, a régi minden tovább működik |
| **FŐ** | 3 → 4 | van olyan, ami a régi módon már NEM működik |

Ez az iparági szabvány (semantic versioning). A lényege nem a szám, hanem hogy **a szám megmondja a
használónak, mire számítson**: javítás után nincs teendő, alverzió után sincs, fő verzió után van.

### A git-oldal

- **Egy `main` ág.** Minden ide megy be.
- **A kiadás = CÍMKE:** `v3.0.0`, `v3.1.0`, `v3.1.1`. A címke egy pontot jelöl a történetben, amire
  bármikor vissza lehet állni.
- **`release/3.1` ág CSAK akkor születik**, ha egy régi verziót támogatni kell, miközben a `main` már
  továbbment. Amíg egy telepítés van (a családé), erre nincs szükség — de a gépezetnek készen kell
  állnia, mert az első külső előfizetőnél kelleni fog.
- **A v4 ugyanebben a repóban lesz**, `v4.0.0` címkével. Ha a v3 akkor még él valakinél, akkor
  `release/3.x` ágon kap javításokat, a `main` pedig a v4-et viszi.

Így „párhuzamos v3 és v4" nem két repó, hanem **egy repó + egy karbantartott ág**.

---

## 2. Környezetek — mérve, mit tud a Railway

Utánanéztem a Railway mai képességeinek, nem emlékezetből:

- Egy **projekt több KÖRNYEZETET** tud, és minden környezet kap **saját Postgres-szolgáltatást, saját
  kapcsolati adatokkal**.
- A production környezet **lemásolható** → a staging szerkezetileg egyezik.
- A környezetek közti szinkron a **beállítást** másolja, **az adatot nem**. Ez pont jó: a staging
  soha nem kap éles adatot.

### Javaslat: HÁROM környezet, EGY projektben

| Környezet | Mire való | Adat |
|---|---|---|
| **production** | az élő rendszer | valódi |
| **staging** | itt próbáljuk a migrációt és a kiadást, MIELŐTT élesre megy | minta-adat, soha nem éles |
| **demo** | bemutató | minta-adat, éjszaka visszaállítva |

**A demo NE külön környezet legyen, hanem egy CÉGTÉR a stagingben**, éjszakai visszaállítással. Két
okból: nem kerül külön pénzbe, és a valódi több-cégteres működést gyakorolja — ami épp a rendszer
lényege. Ha később kell külön demo-környezet, egy kattintás.

### A fejlesztői és a teszt-tároló NEM a Railway

A magpróba ma is saját, eldobható fájl-tárolón fut, felhő nélkül. **Ez marad.** Az automata
ellenőrzésnek soha nem szabad a felhőtől függenie — különben egy Railway-üzemzavar megállítja a
fejlesztést is.

---

## 3. Migráció — itt dől el, hogy lehet-e visszaállni

Három szabály, és a harmadik a legfontosabb.

**1. A migráció előrefelé megy, számozott, és a merge után SOHA nem szerkesztjük.**
Ami egyszer lefutott bárhol, az kőbe van vésve. Javítani új migrációval lehet.

**2. Minden migrációnak futtathatónak kell lennie, MIALATT a régi kód még kiszolgál.**
A kiadás nem pillanatszerű: van egy ablak, amikor az új séma és a régi kód együtt élnek.

**3. BŐVÍTÉS → ÁTÁLLÁS → SZŰKÍTÉS — három külön kiadásban.**
Aki oszlopot bont vagy átnevez, az soha nem egy lépésben teszi:

| Kiadás | Mi történik | A régi kód |
|---|---|---|
| 1. **bővítés** | az új oszlop létrejön, üresen, kényszer nélkül | nem tud róla, működik |
| 2. **átállás** | az új kód MINDKETTŐT írja, az ÚJAT olvassa | még mindig működik |
| 3. **szűkítés** *(később)* | a régi oszlop eldobva | ekkorra már nincs régi kód |

**A tiltás, ami mindent eldönt: a bontás SOHA nem lehet ugyanabban a kiadásban, mint a kód, ami
abbahagyja a használatát.** Ha ezt betartjuk, a séma mindig előrefelé kompatibilis — és ezért a rossz
kiadást vissza lehet görgetni adatvesztés nélkül. Ha nem tartjuk be, a visszagörgetés eltöri az
adatbázist.

Ez a saját memóriánkkal is egybevág: **KUKA-019** (a séma-elmaradás rendszer-állapot, nem
riport-mondat) és **KUKA-028** (a második teremtő: új tábla előtt kötelező a név-keresés).

---

## 4. „Vissza kell állítani a db-t élő használat közben" — a valódi válasz

Itt egy fogalmi javítás, ami sok bajtól megóv:

> **A rossz kiadást nem adatbázis-visszaállítással javítjuk, hanem a KÓD visszagörgetésével.**

Miért: az adatbázis-visszaállítás elveszíti a mentés óta született **minden** tranzakciót. Ha délután
3-kor romlik el valami, és a reggeli mentést töltöd vissza, a délelőtt bevételezett készlet eltűnik.

### A helyes sorrend, romlástól függően

| Mi történt | Mit teszünk | Adatvesztés |
|---|---|---|
| rossz kiadás, a rendszer hibázik | **kód-visszagörgetés** az előző címkére | nincs |
| a hibás kiadás rossz sorokat írt | **célzott javító-esemény** (nem visszaállítás) | nincs |
| valódi adat-sérülés vagy téves tömeges törlés | **visszaállítás** | a visszaállítási pontig |

Az első a **95%-os eset**, és másodpercek alatt megy — ha a 3. pont migrációs szabályát betartottuk.

### És a jó hír, amit MÉRTEM

A Railway időpontra visszaállítása (PITR) **nem írja felül az élőt.** Új Postgres-szolgáltatást hoz
létre az eredeti MELLÉ (`<név>-restored-ÉÉÉÉHHNN-ÓÓPP`), miközben **az eredeti végig kiszolgál**.
Utána vagy átkapcsolod a kapcsolati adatot, vagy csak a szükséges sorokat másolod vissza.

- **7 napos, másodperc-pontos ablak** — a WAL-naplóból bármelyik pillanatra
- hetente teljes + naponta különbözeti mentés, az utolsó 4 teljes megőrizve → **~4 hetes visszanyúlás**

Tehát az „élő használat közbeni visszaállítás" nem leállás: **mellé állítunk, megnézzük, aztán
döntünk.**

### Két szám, amit NEKED kell kimondanod

Ezeket nem én döntöm el, mert üzleti kérdések:

1. **Mennyi adatot vagy hajlandó elveszíteni a legrosszabb esetben?** Bekapcsolt PITR-rel: másodpercek.
   Enélkül: az utolsó mentésig, ami akár 24 óra.
2. **Meddig állhat a rendszer, amíg helyreáll?**

### És egy szabály a saját memóriánkból

**A nem próbált mentés nem mentés** (KUKA-038: a létezés nem bizonyíték arra, hogy fut). A
visszaállítást **ütemezetten gyakorolni kell** — a V2-ben erre már van eszközünk, ez átjön.

---

## 5. Support és demo

**Support-hozzáférés** — a K14 ezt már kimondja, és egyetértünk: célhoz kötött, szűk, **lejáró** és
naplózott. Tehát nem „a fejlesztő belép a cégtérbe adminként", hanem nevesített támogatói nézet,
időzárral, és a cégtér látja, hogy megnyílt. Ez az első naptól így épül, mert utólag beszerelni
mindig rosszabb.

**Demo** — cégtér a stagingben, éjszaka visszaállított minta-adattal (lásd 2. pont).

---

## 6. Amit a repó az ELSŐ NAPTÓL hordoz

Ez a repó-nyitás valódi munkája — nem a `git init`.

| Mi | Miért |
|---|---|
| **CLAUDE.md** átszabva | a te állandó szabályaid, a terminál-blokk, a válasz-forma. Enélkül egy új ügynök nulláról indul. |
| **KUKA-regiszter a TANULSÁGOKKAL** | 89 hiba tanulsága. A gépi őrök V2-fájlokra mutatnak — minden bejegyzésnél KIMONDVA, hogy az őre a `vs`-ben él, vagy még megépítendő. Némán soha. |
| **A board- és lap-eszközök** (3 fájl) | hogy a tárgyalás ne szakadjon meg |
| **Söprés az első naptól** | akkor is, ha öt ellenőrzővel indul |
| **`migrations/`** | előrefelé, számozott, merge után érinthetetlen |
| **`CHANGELOG.md`** | mi változott melyik verzióban — ezt te is olvasod |
| **A kiadási menetrend gépi őre** | ami tiltja a bontást a használat abbahagyásával egy kiadásban |
| **A magreferencia** (`v3ref/`) | átköltözik, és onnantól ott nő |

---

## 7. Amit kérek tőled — **MIND A HÁROM MEGVÁLASZOLVA (D-VS-5003)**

1. ~~**A név megerősítése**~~ → **`valach-family/valach-system`** *(„ok, valach-system mehet")*.
   A repó megnyitva, a nyitó csomag benne (D-VS-5000).
2. ~~**Három környezet rendben van-e**~~ → **igen** *(„a három környezet is jó")*. Eldöntve;
   a tényleges felállításuk még hátra van.
3. ~~**PITR be van-e kapcsolva**~~ → **IGEN**, a `valach-system` projekten (2026-09-09).

### Amit a 3. válasz lezár, és amit nem

**Lezárja a §4 első számát:** a legrosszabb esetben elveszíthető adat **másodperc-nagyságrend**.

**Nem lezárva, és ez kimondott:**

- A §4 szabálya **változatlan** — a rossz kiadást a KÓD visszagörgetése javítja, nem a
  visszaállítás. A PITR a végső háló három esetre: valódi adat-sérülés · téves tömeges törlés ·
  célzott javító-eseménnyel helyre nem hozható romlás.
- **A visszaállítás-gyakorlat még nem futott le.** A nem próbált mentés nem mentés (KUKA-038) —
  ez **nevesített függő** az első éles adatig, a kimenete a `var/reports/` alá kerül.
- **A V2 (`vs`) projekten a PITR állapota továbbra sem mért.** Ha ott nincs bekapcsolva, érdemes.

---

*Források a Railway-tényekhez: a hivatkozásokat a válaszban adom át — a doksi-oldal a fejlesztői
környezetből közvetlenül nem érhető el, ezért kereséssel ellenőriztem.*
