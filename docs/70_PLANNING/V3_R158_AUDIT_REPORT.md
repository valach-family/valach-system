# V3 — R158 ÖSSZESÍTŐ REPORT (CMD-VS-300-002-002 R158 — DECISION)

**Kör:** `CMD-VS-300-002-002` R158 · **sáv:** Claude-v3 · **repó:** `valach-system`
**Ág:** `claude/r154-audit-fix` → `claude/ecstatic-fermi-8c23co` · **PR:** `valach-family/valach-system#1`

> **Ez a lap az R158 négy pontjának elszámolása.** Nem a V3 teljes állapotát írja le: azt az
> `V3_R154_AUDIT_OSSZESITO_REPORT.md` és az `V3_R154_AUDIT_LEFEDETTSEG.md` lap tartalmazza, ez a kettő
> pedig érvényben marad. Ahol ez a lap számot ír, az MÉRT szám; ahol nem mértem, ott azt írom, hogy
> nem mértem.

---

## 1. A VÉGSŐ ÁLLAPOT — FEJ ÉS IDŐ

| | |
|---|---|
| **a MÉRT kód-állapot** | `b80d00ce31b4ff0ff6eb9e0b0453ddb58998d1e0` — a záró teljes söprés ezen futott |
| **a záró kapu eredményét hordozó commit** | `0ab118edf2be6a425ccff9b4511226055acd4d03` · **2026-10-06 21:38:07 UTC** |
| **a VÉGSŐ fej** | ennél legfeljebb EGGYEL több: a lap utolsó pontosítása és a board-feltöltés commitja. **Kód ettől nem változik** — a `b80d00c` utáni commitok kizárólag dokumentumok és a külső-ellenőrző lánc saját eredmény-fájljai. A pontos fejet a `git log -1` adja. |
| **a csomag commitjai** | 7 (`392bcd2` · `2f91609` · `c37d905` · `70bbad4` · `b80d00c` · `a181631` · `0ab118e`) |
| **a PR commitjai összesen** | 34 (az R154 kör 27 + az R158 kör 7) |
| **a kiinduló alap** | `3adc8e0` leszármazottja — az R158 kikötése szerint; `main`-re NEM tértünk vissza |

---

## 2. MIT KÉRT AZ R158, ÉS MI TÖRTÉNT

### 2.1 — IGÉNY SZERINTI MUNKAMENET (R158/1) · `D-VS-3140` · `KUKA-331`

**A kérés:** „előbb röviden rögzítsd, melyik meglévő útnak mikor kell állapot, utána építsd meg."

A leltár a kódból készült (32 kezelő átvizsgálva), és utána épült meg a változás: süti nélküli kérés
**ÁTMENETI** munkamenetet kap — nincs a tárban, nem jár sütivel. Tárolt sor csak akkor születik, ha a
kérés TÉNYLEGESEN állapotot kötne hozzá.

**Mért hatás:** 200 süti nélküli olvasás után a tár **ÜRES** (régen: a plafonig telve, kiszorításokkal);
a statikus lap és az olvasó végpont sütit sem kap. **A plafon ettől nem lett felesleges** — ezt az R158
kifejezetten kikötötte, és mérjük: 120 hitelesítés nélküli állapot-író kérés után a tár a plafonnál áll.

**Miért ez volt a legfontosabb lépés:** az R154 **43 leletéből 26** ebben az egy tárban volt, és a tíz
review-kör leletei rendre az előző kör javításaiból fakadtak. A foltozás nem konvergált, mert a helyzet
elő sem állhatott volna.

### 2.2 — A FÜGGŐ SZÁNDÉK LEJÁRATA (R158/1b) · `D-VS-3141` · `KUKA-332`, `KUKA-339`

A `pending_intent` sor **24 óra** alatt lejár, nevezett állandóból. A lejáratot KÉT helyen érvényesítjük:
az **olvasás** maga kapu (a lejárt szándék nem folytatódik, és a sor törlődik), a **takarítás** pedig
halmazon megy, és a kérés útján legfeljebb **percenként egyszer** fut — tehát nem hoz vissza
kérésenkénti teljes bejárást (az R158 kifejezett feltétele).

A külső review itt talált egy továbbit: a **nem értelmezhető** időbélyeg (import, sérülés) mellett a
régi alakom NEM tüzelt, tehát a szándék időkorlát nélkül folytatódott volna. Javítva: a nem
értelmezhető kor LEJÁRTNAK számít (`KUKA-339`).

### 2.3 — A BÖNGÉSZŐS ELLENŐRZÉS KÖTELEZŐ KAPUVÁ LETT (R158/2) · `D-VS-3142` · `KUKA-333`

**A kérés:** „a `test:e2e` és a `proof:core-ux` legyen a KÖTELEZŐ teljes kiadási kapu része … hiányzó
böngésző vagy el sem indult mérés NEM PASS."

Megépült: **`npm run verify:browser-gate`**. A `verify:` névtérben áll, tehát a söprés név-szűrője
magától elindítja — ez volt a rés, ami miatt három böngészős állítás **körökön át pirosan állt a „zöld
söprés" mellett**.

A kapu HÁROM dolgot külön mér:
- a böngésző nemcsak ott van, hanem **el is indul** — a hiánya **PIROS**, nem „env-kihagyás";
- a mérés **el indult**: JSON-jelentés megvan, nem nulla helyzet futott, nincs kihagyott helyzet;
- **minden** próba-fájl bekerült a mérésbe (egy néma gyűjtés-kimaradás különben „0 bukás" volna).

A kapu SAJÁT első futása rögtön igazolta a harmadik pontot: egy hozzáadott `--reporter=list` felülírta
a konfiguráció jelentő-listáját, a JSON-jelentés meg sem született, és a kapu NEVEZETTEN pirosra
váltott — a lánc zöldje mellett.

### 2.4 — A HÁROM ÖRÖKÖLT BÖNGÉSZŐS PIROS (R158/2)

| helyzet | ok, MÉRVE | javítás |
|---|---|---|
| **R89-06** | az ELVÉGZETT lépés némán állt a kiemelés mellett: a buborék a feltáró gombot emelte ki, mondatot nem írt | saját mondat (`targetPendingDone`) mindhárom bekapcsolt nyelven — a kész mondat („ez a lépés még nem érhető el") egy elvégzett lépésről hazugság volt (`KUKA-334`) |
| **R91-03** | a kezelőnek 9 bemutató jött, a próba 11-et várt: a két KÉT ÉLŐ MUNKAMENETET igénylő végigvezetés `requires_demo` | a próbapad a bemutató-környezet (`VS_DEMO=1`) — **nem** az elvárás leszállítása 11-ről 9-re (`D-VS-3143`) |
| **R93** | a váltás-lépés egy NEM LÉTEZŐ gombra küldött („válts át a kiemelt gombbal", és semmi nem volt kiemelve) | nevezett megszakítás, ha a váltás-vezérlő nincs a lapon (`KUKA-335`); és a próba-járó három sosem futott hibája javítva (`KUKA-336`) |

**ÉS A DEMÓ NEM AD JOGOT — MÉRVE** (`U` csoport, u1–u6): ugyanazon a szerveren, ugyanazokkal a
fiókokkal, csak a jelet átállítva — 11 vs. 9 végigvezetés; a meghívó-visszavonás belépés nélkül
mindkét jelálláskor `401 login_required`, a kívülállónak `404 invite_unknown`; a meghívó ÉL, tehát az
elutasítás a JOGRÓL szól. A jel hatóköre a forrásból mérve **EGY** döntés.

### 2.5 — A JOGOSULTSÁGI MAG AUDITJA (R158/3)

**Két saját lelet, mindkettő MÉRVE és javítva:**

| lelet | mi volt | hol áll a bizonyíték |
|---|---|---|
| **a védő kapuk eldönthetetlen kérés-órája** (`D-VS-3145` · `KUKA-337`) | egy bírósági végzéssel ALANY-SZÉLESEN tiltott személy az újbóli belépés kapujában `reentry_admissible`-t kapott, ha a kérés „most"-ja `undefined`, üres vagy nem kanonikus — és a döntés `checked` listája közben FELSOROLTA a `suspension`+`ban` lépést | `P-AUTHZ-protective-clock` mag-próba + M210/M211/M212 mutáció |
| **az üres átvitt korlát** (`D-VS-3146` · `KUKA-338`) | `roles: []` átvitt korláttal a delegálási plafon `["admin","user"]` lett — az ÜRES korlát ADMIN továbbadására jogosított; ugyanez hiányzó vagy nem-tömb mezőnél | `P-AUTHZ-parent-limit` mag-próba + M213/M214 mutáció |

**KIMONDVA MINDKETTŐRŐL:** a HTTP-határról ma **nem elérhető** egyik sem (a „most" a kiszolgáló
órájából jön; a rendes út nem ír üres szerep-korlátot). A rés a NYILVÁNOS feloldók szintjén állt — ott,
ahol minden új hívó örökölte volna.

**A `membershipPeriod` átvizsgálva, lelet nélkül:** a két tengely (hatály · tudás) mindenhol külön áll,
az olvashatatlan naplósor ZÁR, az eldönthetetlen óra ZÁR, a korábbi időszak megvonása nem zárja a mait,
és a tény nem tűnik el a válaszból. **Nem állítok hibát ott, ahol nem mértem hibát.**

### 2.6 — A HÁROM NYELV A HATÁRON (R158/3) · `V` csoport, v1–v9

Nem a szótárt olvastuk: ÉLŐ HTTP-n kérdeztük, amit a kiszolgáló `?lang=` szerint TÉNYLEGESEN kiad.

| mit | HU | EN | DE |
|---|---|---|---|
| látható funkció (a nyelv nem jogosultsági tengely) | 30/31 | 30/31 | 30/31 |
| súgó-szöveg mind a négy mezővel (cím · cél · előfeltétel · eredmény) | hiány: 0 | 0 | 0 |
| a funkciókhoz kötött GYIK (kérdés + válasz) | hiány: 0 | 0 | 0 |
| végigvezetés, MINDEN lépésnek címe+törzse | 11 túra · 0 hiányos | 11 · 0 | 11 · 0 |
| a segéd válasza (helyi tudásból) | 1061 karakter | 1027 | 1124 |

Az oldaltérkép alapja (12 lap) nyelvtől független, és a három válasz SZÖVEGE különbözik — a nyelv
tényét **különbséggel** mérjük, nem várt felirattal.

---

## 3. A KÜLSŐ REVIEW ÁLLAPOTA A MAI FEJEN

| | szám |
|---|---|
| Codex review-kör (automata), KÜLÖN commitokon | **15** |
| egyedi lelet (review-szál) | **42** |
| ebből P1 | **13** |
| ebből P2 | **29** |
| **nyitott lelet a mai fejen** | **0** — mind a 42 megválaszolva ÉS lezárva |
| az R158 körében érkezett | 11 (2 P1 + 9 P2) — a `89f0b37a`, `392bcd28` és `c37d9059` köre |

**A mai fej (`b80d00c`) review-állapota, kimondva:** a tizenegy utolsó leletre adott javítás a
`b80d00c`-ben van, a válaszok a szálakon állnak, és a szálak lezártak. **A `b80d00c`-re MAGÁRA a Codex
még nem adott új kört** a lap zárásakor — tehát NEM állítom, hogy a mai fejet a külső fél már
átvizsgálta. Ha új kör érkezik, az ugyanúgy végigmegy: javítás → mérés → feltolás.

**Emberi kód-review és biztonsági review a mai fejen: NEM történt.** A PR-en emberi jóváhagyás nincs.
A `Claude Approvals` ellenőrzés ebben a repóban nem fut.

---

## 4. LEFEDVE / KIMARADT

### 4.1 Amit ebben a körben MÉRTÜNK

- a HTTP-határ (173 állítás, köztük 8 új a review-javításokra),
- a mag (69 próba, 245 mutáció — a horgony-őr szerint minden horgony pontosan egyszer illeszkedik),
- a böngésző (122 helyzet, 22 próba-fájl, 0 bukás, 0 kihagyás) + a bemutató-járás (66 zöld),
- a három bekapcsolt nyelv tartalma a határon,
- a jogosultsági mag három eddig nem auditált modulja (`delegation` · `membershipPeriod` · `banScope`).

### 4.2 Amit NEM mértünk — és miért

| terület | miért nem |
|---|---|
| **PostgreSQL-láncok** (`proof:pg-*`) | ebben a konténerben nincs `DATABASE_URL`, és a kiszolgáló nem fut; a helyi `psql` **16.15** (az R158 18-at kért — lásd 5. pont) |
| **élő AI-kapcsolat** | nincs szolgáltatói kulcs a konténerben; a segéd mérése a HELYI tudás-úton történt, a szolgáltatói ág csonkkal |
| **felhős telepítés, mentés/visszatöltés** | az R158 kifejezetten tiltotta a felhős műveletet |
| **valódi asztali/mobil kézi végigkattintás** | a böngészős mérés automatizált (Playwright); emberi kézi bejárás nem történt |
| **az üzleti folyamatok** | nincs mit mérni: üzleti író végpont NEM létezik (4.3) |

### 4.3 AZ ÜZLETI HIÁNYOK — PONTOSAN, DE NEM MEGÉPÍTVE

Az R158 kimondta: *„Az üzleti írás és a hiányzó üzleti lapok külön megvalósítási rések: sorold fel őket
pontosan, de ez a parancs NEM indítja el a hiányzó ERP-funkciók megépítését."* Ezt tartottam.

**(a) ÜZLETI ÍRÁS: NINCS.** A kiszolgáló **16** író módszerű (`POST`) végpontot ad. Ebből **15** a
személyhez, tagsághoz, jogosultsághoz, előfizetéshez vagy munkamenethez tartozik, a tizenhatodik
(`/api/assistant/ask`) pedig a segédnek feltett kérdés — üzleti adatot az sem ír:

```
/api/register · /api/verification/resend · /api/login · /api/logout · /api/session/workspace
/api/workspaces · /api/workspaces/plan · /api/invites · /api/invites/pending · /api/invites/redeem
/api/invites/revoke · /api/members/reinvite · /api/members/revoke · /api/members/scope
/api/members/scope/revoke · /api/assistant/ask
```

**Készletet, terméket, partnert, raktárt, mozgást, bizonylatot vagy folyamatot rögzíteni ma SEHOL nem
lehet.** A készlet- és ár-nézetek olvasók; a tudás-regiszter szerint az üzleti lapok közül egyiknek sincs
író végpontja.

**(b) A LAPOK HIÁNYAI — A GÉPI LEFEDÉS-ŐR SAJÁT MÉRÉSE** (`verify:lefedes`, a záró söprésben futott;
gépi alak: `var/reports/…_funkcio_lefedes.json`). A 17 képernyőből **10 érintett**; a hiány három
fajtája: nincs funkció-leírás a képernyőre (`FEATURES.screen`) · nincs hozzá kötött gyakori kérdés ·
nincs bemutató, ami ezt az oldalt érinti.

| lap | nincs funkció-leírás | nincs GYIK | nincs bemutató |
|---|---|---|---|
| `processes` | ✗ | ✗ | ✗ |
| `movements` | ✗ | ✗ | ✗ |
| `stockcard` | ✗ | ✗ | ✗ |
| `warehouses` | ✗ | ✗ | ✗ |
| `account` | ✗ | ✗ | ✗ |
| `personal` | ✗ | ✗ | ✗ |
| `documents` | — | — | ✗ |
| `products` | — | — | ✗ |
| `partners` | — | — | ✗ |
| `security` | — | — | ✗ |

**A VERDIKT SZÁMA:** az őr összegző sora **20 hiányt** mond ki (a cél nulla), és a 32 végpont, a 42
művelet, a 6 űrlap és a 3 belépés-előtti nézet lefedése **hiánytalan** — a hiány tehát CSAK a lap-tengelyen áll.

**ÉS A FONTOS MÉRÉS: `floor_breaks: []` — NINCS REGRESSZIÓ.** Az R158 köre egyetlen ÚJ lefedési hiányt
sem hozott; a piros az R144-es alapvonalból **örökölt**, és a padló áll.

**EGY KÜLÖNBSÉG KIMONDVA:** a saját, kézi számolásom **11** lapot jelzett (a `outbox`-ot is), mert én a
bemutatókat a végigvezetés `page` mezőjéhez kötöttem; az őr viszont azt kérdezi, hogy bármely bemutató
LÉPÉSE érinti-e a lapot. Az ŐR száma az irányadó (10 lap), a sajátom szigorúbb volt — a kettő nem
mond ellent, csak más kérdésre válaszol.

**Bemutató nélküli FUNKCIÓK (nem lapok):** 10 — `auth.verify` · `auth.login` · `auth.resend` ·
`auth.logout` · `account.personal` · `data.documentSample` · `data.supplierSample` · `shell.profile` ·
`shell.assistant` · `shell.sample_pages`. (A belépéshez kötött utak egy részét a `tour.shell` és a
`tour.register` érinti; a lista a SAJÁT bemutató hiányát jelenti.)

---

## 5. A PRÓBA-KÖRNYEZET

| | |
|---|---|
| Node | **v22.22.0** |
| tároló a próbákhoz | `node:sqlite` (kísérleti jelzéssel) — fájl-alapú, futásonként eldobva |
| PostgreSQL a gépen | **16.15** (Ubuntu 24.04) — kiszolgáló NEM fut, `DATABASE_URL` nincs |
| böngésző | Chromium **141.0.7390.37** (Playwright, `/opt/pw-browsers`) |
| Playwright | `@playwright/test` ^1.56.0 · `workers: 1`, `retries: 0` |

**A KÉRT ÉS A MEGLÉVŐ VERZIÓ KÜLÖNBSÉGE, KIMONDVA.** Az R158 „lehetőleg PostgreSQL 18"-at kért, és
hogy eltérés esetén a korlátot mondjam ki. **A konténerben PostgreSQL 16.15 van, kiszolgáló nélkül** —
ezért ebben a körben PostgreSQL-lánc **nem futott**. Amit ez jelent: a tároló-függő viselkedésről
(párhuzamosság, tartósság, visszatöltés, tranzakciós határok) ez a kör **semmit nem állít**; a korábbi
PostgreSQL-mérések az R154 lapján állnak, 16.15-ön.

---

## 6. VALÓDI, KIPRÓBÁLHATÓ BEMUTATÓ

**Az automata bejárás ténylegesen kattint a valódi felületen** (nem lépésdeklarációból következtet):
- **122 böngésző-helyzet** fut le a valódi `v3app`-on, valódi HTTP-vel és valódi tárolóval — köztük
  **tíz végigvezetés teljes végigjárása** (`R93`): minden lépésnél vagy kiemelés van, vagy NEVEZETT
  várakozás/megszakítás, és a feladathoz kötött lépés CSAK igazolt szerver-válasz után halad.
- **A két KÉT SZEREPLŐS történet** (meghívás visszavonása · újbóli belépés) a bemutató-lapon megy
  végig, kétszer, végállapot-ellenőrzéssel (`proof:demo-walk`, 66 zöld állítás).

**AMIT A BEMUTATÓ-LAP NEM BIZONYÍT, KIMONDVA:** a háttere a **SZIMULÁLT** `demo-adapter.mjs` csonk —
HTTP- és tároló-bizonyíték nem következik belőle. A két történet VALÓDI határon futó része (a meghívó
visszavonása, a tag eltávolítása, a visszahívás) az alkalmazás-héjban, igazi HTTP-vel van mérve; a
szereplő-váltásnál a héj NEVEZETTEN megáll, mert ott nincs „váltás a másik nézetére" vezérlő.

**A segéd (chat) válaszai a HELYI tudásból jönnek** (`answer_kind: 'local'`). **Élő AI-ról ez a kör nem
állít semmit.**

---

## 7. NYITOTT TÉTELEK — NEVESÍTVE

1. **A két szereplős történet az alkalmazás-héjban nem végigvihető.** Ahhoz DEKLARÁLT váltás-vezérlő
   kellene (a kijelentkezés ma lenyitható menüben áll, tehát a lépésnek saját feltáró-mezőre volna
   szüksége), és a váltás VALÓDI ki- és belépés a másik emberrel — a futás-átadás ezt már ma is
   túléli. Ez **képesség, nem hibajavítás**, ezért nem ebben a körben épült meg.
2. **PostgreSQL-mérés 18-on** (vagy akár 16-on, futó kiszolgálóval) — ebben a konténerben nem lehetséges.
3. **Élő AI-kapcsolat mérése** — szolgáltatói kulcs nélkül nem lehetséges.
4. **Belső próba-fiók, felhős mentés/visszatöltés** — az R158 szerint ezek nem tekinthetők megoldottnak,
   és ebben a körben nem is nyúltunk hozzájuk.
5. **Az üzleti írás és a 11 lap 23 hiánya** (4.3) — pontosan felsorolva, megépítés NÉLKÜL.
6. **A romlott `created_at` sorok halmazos takarítása**: a lejárt sorokat egy `DELETE … WHERE
   created_at < ?` viszi; egy nem értelmezhető érték erre nem illeszkedik. A romlott sort az OLVASÁS
   dobja el — egy sosem visszaolvasott romlott sor a táblában marad.
7. **A már korábban árván maradt `pending_intent` sorok** visszamenőleges takarítása nem történt meg; a
   javítások az ÚJ árva sorok keletkezését zárják el.

---

## 8. TÖRTÉNETI PONTOSÍTÁS — A GITHUB APP REPÓ-LISTÁJA

Az R158 kimondta, és ezt a lap rögzíti: **a GitHub App repó-listája valóban NEM tartalmazta a
`valach-system`-et, és az OPERÁTOR adta hozzá.** A korábbi beszámolómban azt írtam, hogy a Codex
„magától elindult" és az operátornak nem kellett semmit bekapcsolnia — **ez téves volt**, és a
kezdeti csend nem puszta késés volt, hanem a hiányzó hozzáférés következménye. A review-kör azután
indult el, hogy az operátor a repót felvette.

---

## 9. FOGYASZTÁS

**A csomag záró mérése** (`--session <id> --from 2026-10-06T16:20:00Z --to 2026-10-06T20:35:10Z
--label "R158 csomag (záró mérés)"`):

| | |
|---|---|
| hívás az ablakban | **400** |
| fő-szál kontextus medián | **391 502,5** · max **783 130** · 400 ezer fölött 192 hívás |
| ügynök-bemenet | **0** (0 al-ügynök futott) |
| cache-olvasás az ablakban | 162 827 274 [teljes összeg] |
| lefedettség | **teljes** (1 átirat, minden modell-válasz usage-dzsal) |
| ébresztés | compaction 1× → 353 hívás; notification 0× |

**A mérő sávja: FIGYELMEZTETÉS** (391 502,5 a 300 000–400 000 sávban) — rövid állapotmérés a munkablokk
határán; **megállni nem kell, új beszélgetést nem kérünk** (`D-VS-3083`). A kísérleti ügynök-jelző
(> 40 M / csomag) **nem** aktiválódott: ebben a csomagban al-ügynök nem futott.

**Tartalom nélküli leltár a repóban:** `docs/70_PLANNING/V3_R158_FOGYASZTAS_LELTAR.json` (400 sor —
sorszám · idő · szereplő · modell · négy számláló · kontextus · ébresztés; üzenet, parancs és
eszköz-kimenet NEM).

**Az ablak kezdetéről, kimondva:** a `16:20:00Z` a CSOMAG kezdete, ahogy a munkamenet átiratából
behatároltam (az R158 — DECISION feldolgozása ekkor indult); a board-üzenet pontos időbélyegét a lap
nem hordozza, ezért a határ **behatárolt, nem a boardról olvasott** — a sáv-verdikt ettől nem változik
(a teljes munkamenet mediánja is ugyanebbe a sávba esik).

---

## 10. AMIT EZ A LAP NEM ÁLLÍT

- **Nem** állítja, hogy a V3 kiadásra kész: az üzleti írás egésze hiányzik (4.3).
- **Nem** állítja, hogy a mai fejet a külső fél vagy ember átvizsgálta (3. pont).
- **Nem** állít semmit a PostgreSQL-oldali viselkedésről ebben a körben (5. pont).
- **Nem** állít semmit élő AI-ról, felhős üzemről, mentésről/visszatöltésről (4.2, 6., 7. pont).
- **Nem** állítja, hogy a két szereplős történet az alkalmazás-héjban végigvihető (7/1. pont).
- A lezárás NEM történt meg: a `CMD-VS-300` és a `PR-VS-300` nyitva marad, összeolvasztás és felhős
  telepítés nem volt — ahogy az R158 kikötötte.

---

## 11. A ZÁRÓ KAPU — A TELJES SÖPRÉS A VÉGSŐ KÓD-ÁLLAPOTON

**Mit mértünk, és min.** `npm run verify:sweep` — MINDEN `verify:*` lánc, kihagyás és
`--reuse` hivatkozás NÉLKÜL. A mért **kód**-állapot a `b80d00c` commité; az azutáni commitok kizárólag
DOKUMENTUMOK (`docs/70_PLANNING/…`), amiktől kód-lánc nem függ — a `verify:doc-html` a végső fejen
külön is lefutott.

| | |
|---|---|
| futtatott lánc | **41** |
| teljes idő | **2242 s** (37 perc) |
| **zöld** | **39** |
| env-kihagyás | **0** |
| **nem fejeződött be** a 900 s türelmen belül | **1** — `verify:external-checks` (901 s) |
| **piros** | **1** — `verify:lefedes` |

A böngésző-kapu (`verify:browser-gate`) és a mag mutációs battériája (`verify:v3ref`) **a söprésen
belül, a türelmen belül futott le, zölden**.

### 11.1 A NEM BEFEJEZETT LÁNC KÜLÖN FUTTATVA — `verify:external-checks`

A söprés szabálya szerint a „nem fejeződött be" NEM bukás és NEM zöld: külön kell futtatni. Megtörtént,
végigfutott: **14/19 program MEGFELEL · kilépés 1 · ELTÉRÉS: `r79 · r59a · r57a · r59 · r57`.**

**Ez ÖRÖKÖLT, és ezt MÉRÉS dönti el, nem feltevés.** Az R154 körében ugyanezt KÜLÖN MUNKAFÁBAN, az
ÉRINTETLEN alapon (`e24860f4`) is lefuttattam: **14/19, kilépés 1, és PONTOSAN ugyanaz az öt program
tért el** (`V3_R154_AUDIT_LEFEDETTSEG.md`, 139–140. sor). A mai fejen az eltérő programok halmaza
**változatlan** — az R158 köre tehát egyetlen új eltérést sem hozott.

Az öt eltérés jellege (a lánc saját szövegéből): a `r79` program a mutációs battéria **18 egységes**
felosztását várja, miközben a battéria azóta nőtt és ma **40 egységre** oszlik; a `r59`/`r59a` egy
hiányzó részletes eredmény-artefaktumon és nem nulla kilépésen akad el; a `r57`/`r57a` két esete
(`E02`, `E03`) nem ad logikai `pass` értéket. Mind az ötöt a KÜLSŐ fél írta, és a javításuk nem a mi
kódunkon múlik — ezért marad örökölt, és ezért NEM írom zöldnek.

### 11.2 AZ EGYETLEN PIROS — `verify:lefedes`

**20 hiány, kizárólag a LAP-tengelyen** (a 32 végpont, a 42 művelet, a 6 űrlap és a 3 belépés-előtti
nézet lefedése hiánytalan). A részletes lista a 4.3(b) pontban áll.

**ÉS A LÉNYEG: `floor_breaks: []` — NINCS REGRESSZIÓ.** A piros az R144-es alapvonalból örökölt, a
padló áll, és az R158 köre egyetlen ÚJ lefedési hiányt sem hozott. A hiány a hiányzó ÜZLETI
képességekből következik (4.3/a: üzleti író végpont nincs) — a megépítését az R158 kifejezetten NEM
rendelte el.

### 11.3 AZ ÖSSZVERDIKT, KIMONDVA

**A söprés összverdiktje NEM ZÖLD** (kilépés 1), és ezt nem írom át: egy piros (örökölt) lánc és egy
türelmen túlfutott (külön lefuttatott, szintén örökölt eltérésekkel záró) lánc áll benne.
**Amit a kör ÚJként hozott, az mind zöld:** 39 lánc zöld, köztük a most kötelezővé tett böngésző-kapu
(122 helyzet, 0 bukás, 0 kihagyás), a mag 69 próbája és 245 mutációja, a 173 állításos határ-battéria,
a nyelvi, a súgó- és a segéd-láncok.
