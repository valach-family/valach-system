# V3 — R158 ÖSSZESÍTŐ REPORT (CMD-VS-300-002-002 R158 — DECISION)

**Kör:** `CMD-VS-300-002-002` R158 · **sáv:** Claude-v3 · **repó:** `valach-system`
**Ág:** `claude/r154-audit-fix` → `claude/ecstatic-fermi-8c23co` · **PR:** `valach-family/valach-system#1`
**Board:** a kör-üzenet és a lap először a `CMD-VS-300-002-002 R159 — REPORT` hivatkozás alatt állt; a
MÁSODIK review-kör után a frissített lap a `CMD-VS-300-002-002 R160 — REPORT` alatt áll (a board egy
körhöz egy lapot engedélyez, és az R158 kör lapja a chatgpt-v3 DECISION-je — ezért két új kör).

> **Ez a lap az R158 négy pontjának elszámolása.** Nem a V3 teljes állapotát írja le: azt az
> `V3_R154_AUDIT_OSSZESITO_REPORT.md` és az `V3_R154_AUDIT_LEFEDETTSEG.md` lap tartalmazza, ez a kettő
> pedig érvényben marad. Ahol ez a lap számot ír, az MÉRT szám; ahol nem mértem, ott azt írom, hogy
> nem mértem.

---

## 1. A VÉGSŐ ÁLLAPOT — FEJ ÉS IDŐ

| | |
|---|---|
| **a 41 láncos TELJES söprés kód-állapota** | `b80d00ce31b4ff0ff6eb9e0b0453ddb58998d1e0` |
| **a MÁSODIK review-kör javításai** | `083b01c` · `c81b1d5` (négy lelet) |
| **a HARMADIK review-kör javításai** | `43f3841` — F158-16 (P1) és F158-17 (P2) |
| **a NEGYEDIK review-kör javításai (a mai MÉRT kód-állapot)** | `6c40c31` (F158-18 · F158-19 · F158-20) + `137df3d` (F158-21). A targetált láncok, a TELJES mag-mutációs battéria és a teljes böngésző-kapu ezen futottak (11.4–11.5) |
| **a záró kapu eredményét hordozó commit** | `0ab118edf2be6a425ccff9b4511226055acd4d03` · **2026-10-06 21:38:07 UTC** (a `b80d00c` söprése) |
| **a VÉGSŐ fej** | a `43f3841` + a jelen lap commitja és a board-feltöltés. **Kód ettől nem változik.** A pontos fejet a `git log -1` adja. |
| **a csomag commitjai** | 13 (`392bcd2` · `2f91609` · `c37d905` · `70bbad4` · `b80d00c` · `a181631` · `0ab118e` · `083b01c` · `c81b1d5` · `43f3841` · `924a08a` · `6c40c31` · `137df3d`) |
| **a PR commitjai összesen** | 40 (az R154 kör 27 + az R158 kör 13) |
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
| Codex review-kör (automata), KÜLÖN commitokon | **20** |
| egyedi lelet (review-szál) | **52** |
| ebből P1 | **15** |
| ebből P2 | **37** |
| **nyitott lelet a mai fejen** | **0** — mind az 52 megválaszolva ÉS lezárva |
| az R158 körében érkezett | 21 (4 P1 + 17 P2) — a `89f0b37a` · `392bcd28` · `c37d9059` · `b80d00c` · `a181631` · `0ebd9f84` · `924a08a8` köre |
| javító commit a PR-ben (lelet-javítás) | 15 — a számok az 52 egyedi szálból és a válaszokban megnevezett commitokból jönnek |
| **NULLA lelettel zárt kör** | 1 — a `c81b1d5` (kód- ÉS biztonsági átolvasás): az első ilyen ebben a PR-ben |

**A MÁSODIK REVIEW-KÖR A CSOMAG ALATT ÉRKEZETT, és végig is ment.** A `b80d00c`-re és az
`a181631`-re a Codex új kört adott, **négy újabb lelettel** (egy P1 és három P2) — mind javítva és
mérve ebben a csomagban:

| lelet | mi volt | javítás és jel |
|---|---|---|
| **F158-12 (P1)** | a kulcs-plafon javításom telt plafonnál MINDEN kérésre RENDEZTE a teljes térképet (20 000 kulcs ~9,5 s a reviewer gépén), és kérésenként naplózott — a védelem lett a támadás erősítője | LRU-sorrend rendezés nélkül, ablakonként EGY naplósor; **MÉRVE: 20 000 kulcs 66–86 ms** (`KUKA-346`, X: x1–x3) |
| **F158-13 (P2)** | a JÖVŐBELI `created_at` negatív kort ad, az pedig VÉGES — egy 2099-es sor 2099-ig folytatódott volna | a negatív kor is lejárt (`KUKA-347`, mag-próba (f) + M216) |
| **F158-14 (P2)** | a halmazos takarítás szöveges `<`-sel nem éri el a romlott ÁRVA sort, és az olvasás sem hívódik rá | három eset egy utasításban (lejárt · jövőbeli · nem kanonikus), tároló-függetlenül (`KUKA-347`, mag-próba (g) + M217) |
| **F158-15 (P2)** | a kapu egy KORÁBBI futás jelentését is elfogadta volna (létezés-ellenőrzés) | a jelentés a futtatás előtt törlődik, és az ideje a futáshoz kötött (`KUKA-348`, X: x6) |

**A kapu újra lefutott a javított kóddal:** `verify:browser-gate` → **PASS**; a jelentés kezdő
időpontja (21:53:46.067Z) a futtatás indulása (21:53:45.077Z) UTÁN van — a tanú tehát EBBEN a futásban
keletkezett. 122 helyzet · 0 bukás · 0 kihagyás · 22 próba-fájl · bemutató-járás zöld.

### A HARMADIK REVIEW-KÖR (a `0ebd9f84` fejre) — KÉT ÚJABB LELET, MINDKETTŐ JAVÍTVA

| lelet | mi volt | javítás és jel |
|---|---|---|
| **F158-16 (P1)** | a visszatöltési kapu a forrás adatbázis nevét CSAK a kapcsolati címből olvasta; a libpq viszont a címben nem megadott paramétereket a KÖRNYEZETBŐL veszi (`PGDATABASE` · `PGUSER` · `PGSERVICE`), és a `pg_dump` a környezetet ÖRÖKLI. Egy út nélküli `postgres://decoy@host` + `PGDATABASE=source` mellett a kapu a cím felhasználóját mondta forrásnak → „eltér" → a lánc indult, és a `DROP DATABASE "source"` a VALÓDI forrást vitte volna. **És ez a saját, KIMONDOTT hiányom volt, ami nem védett** (`KUKA-341`: „ezért minden bizonytalanság az óvatos ágra esik" — nem esett: a tartalék NEVET adott) | a feloldó a libpq TELJES sorrendjét követi, a CÍM megelőzi a KÖRNYEZETET; ha egyik sem nevez meg, a név NEM TUDHATÓ → megállás. **MÉRVE:** a reviewer címe most `same: true` (megállás), az ellenpár (ugyanaz környezet nélkül) `same: false` (`D-VS-3158` · `KUKA-349`, Y: y1–y5) |
| **F158-17 (P2)** | a függő folytatás türelmi idejét 24 órára mondtam ki, a sor EGYETLEN kulcsa viszont a munkamenet, ami 12 óra tétlenség után kiesik — és a kiesés a sort is törli. A második 12 órában a kimondott szabály ELVILEG sem teljesülhetett (`KUKA-050`) | a tényleges idő EGY feloldóból: `intentTtlMs` = min(plafon, munkamenet tétlenségi korlátja) = ma **12 óra**; a kiszolgáló EGY kapun olvas, a hiányzó korlát nevezetten elakad. **MÉRVE a határon mindkét irány** (12 órás munkamenet → 12 óra; 48 órás → a 24 órás plafon), és a viselkedés az árva soron (`D-VS-3157` · `KUKA-350`, Y: y6–y8 + mag-próba (h) + M218/M219) |

**A BÖNGÉSZŐ-KAPU ÚJRA LEFUTOTT a `43f3841` kódon, és ZÖLD:**

```
ZÖLD  a mérés EBBEN a futásban indult el (a jelentés kezdő időpontja a futtatás UTÁN van)
      — 2026-10-06T22:36:25.552Z · a futtatás indult: 2026-10-06T22:36:24.588Z
ZÖLD  a mérés NEM nulla helyzetet futtatott — teljesült: 122
ZÖLD  egy helyzet sem bukott · egy helyzet sem volt ingadozó · egy helyzetet sem hagytunk ki
ZÖLD  MINDEN próba-fájl bekerült a mérésbe — 22 fájl
ZÖLD  a `test:e2e + proof:core-ux` lánc 335 s · a `proof:demo-walk` lánc 438 s
RESULT: PASS
```

Ez azért kellett, mert a javítás a v3app **FUTTATOTT** kódját érintette (`server.mjs`): a folytatás
türelmi idejének bekötése. A `?service=`/`PGDATABASE` feloldó a szerszám-oldalon áll, azt a battéria méri.

**A két javítás VISSZAVÉTEL-PRÓBÁJA megvan:** a `PGDATABASE`-ágat, a `PGSERVICE`-t és a származtatást
kivéve a battéria **öt sora** (y1 · y3 · y5 · y7 · y8) pirosra vált, az ellenpárok (y2 · y4 · y6)
helyesen zöldek maradnak.

### A NEGYEDIK REVIEW-KÖR (a `924a08a` fejre) — NÉGY ÚJABB LELET, MIND JAVÍTVA

| lelet | mi volt | javítás és jel |
|---|---|---|
| **F158-18 (P2)** | az állapot-írás kapuja a KÉRÉS ELEJI időbélyeggel kérdezte a tárat: egy lassan feltöltött törzs átvihet a tétlenségi korláton, és ilyenkor a kezelő megírta a `pending_intent` sort és **200**-at adott — a következő kérés viszont a valódi időt mérte, eldobta a munkamenetet, és a most írt sort TÖRÖLTE. **MÉRVE élő HTTP-n** (400 ms korlát, 700 ms-os darabolt törzs): `200` + egy sor → a következő kérés után NULLA sor, vagyis HAMIS SIKER | a kapu saját, FRISS időbélyeget vesz, és `touch`-csal meg is ÚJÍTJA a sort; mérve utána `409 session_gone`. **A két szabály EGYÜTT kimondva:** „egy döntés — egy idő" ≠ „egy KÉRÉS — egy idő" (`D-VS-3159` · `KUKA-351`, Z: z1–z2) |
| **F158-19 (P2)** | a tétlenségi pászta ritkítása a HÍVÓBAN állt, ezért a plafon fölötti úton MINDEN beszúrásnál végigjárta a teljes tárat — az elutasított felvétel `O(maxSessions)`-t fizetett, a hitelesítési kapu ELŐTT. **MÉRVE:** 5 000 → 0,113 ms/kérés · 20 000 → **0,622** · 80 000 → **1,432** | a ritkítás a SÖPRÉSBEN dől el, egy helyen; a plafon változatlanul AZONNALI. Mérve utána: 20 000-es plafonnál **0,0064 ms/kérés** (≈97×). `KUKA-290` harmadszor (`D-VS-3160` · `KUKA-352`, Z: z3, z3b, z4) |
| **F158-20 (P2)** | a `rememberIntent` szó szerint tárolta az óra kimenetét, a halmazos takarítás pedig SZÖVEGESEN vetette össze a `Z`-s határokkal: egy eltolásos alak (`…T01:00:00+02:00`) ugyanazt a pillanatot jelenti, szövegként viszont „nagyobb" — egy **FRISS** sor jövőbelinek minősült és **TÖRLŐDÖTT**. A hiba-osztályt a `P-INVITE-window` mag-próba a MEGHÍVÓRA már kivezette | az ÍRÁS kanonizál (UTC `toISOString()`), a takarítás két lépés: a kanonikus sorokon halmaz-utasítás, a nem kanonikusakon korlátos, `Date.parse`-os IDŐPILLANAT-megítélés. Mérve: négy importált sorból három megy, a friss eltolásos MARAD (`D-VS-3161` · `KUKA-353`, mag-próba (i)(j) + M220/M221/M222, Z: z5–z7) |
| **F158-21 (P2)** | a `safePath` tisztítót csak a leltár `source.path` mezőjén vezettem át; a HIBA-ÁGAK nyers út-kiírással mentek, tehát egy repón ÉS HOME-on kívüli `--transcript` teljes abszolút útja a naplóba került | mind a NÉGY diagnosztikai kiírás a tisztítón megy, és a kétértelműség listája a `--projects` GYÖKÉRHEZ KÉPEST nevez meg — így `KUKA-319` (választható) és a tisztítás EGYÜTT áll meg (`D-VS-3162` · `KUKA-354`, Z: z8–z10) |

**A VISSZAVÉTEL-PRÓBA ITT IS MEGVAN:** a három kiszolgáló-oldali javítást kivéve a battéria **öt
sora** pirosra vált (z1 · z2 · z3 · z4 · z5), az ellenpárok (z3b · z6 · z7) helyesen zöldek maradnak; a
negyedik javítás kivételekor a `z8` kiírja a teljes abszolút utat.

**ÉS AZ F158-21 EGY SAJÁT HIBÁT IS MEGMUTATOTT A JAVÍTÁS KÖZBEN, ezt kimondom:** a puszta tisztítás
elvette volna a `KUKA-319` választhatóságát, és a battéria `n6` sora JOGGAL lett piros. A két szabály
ezért EGYÜTT kapott alakot, nem egymás ellenében.

**Amit NEM állítok:** a LEGUTOLSÓ fejre (a jelen lap commitja) a Codex még nem adott kört — ha új
lelet érkezik, az ugyanúgy végigmegy: javítás → mérés → feltolás. Emberi kód- és biztonsági review a
PR-en nem történt.

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
6. ~~A romlott `created_at` sorok halmazos takarítása~~ — **JAVÍTVA ebben a csomagban** (`D-VS-3155` ·
   `KUKA-347`): a halmazos takarítás a lejárt, a JÖVŐBELI és a nem kanonikus alakú sort is viszi, egy
   utasításban, tároló-függetlenül. A reviewer épp erre a — általam nevezett hiányként kimondott —
   résre mutatott rá, és igaza volt: a kimondás nem váltja ki a javítást.
7. **A már korábban árván maradt `pending_intent` sorok** visszamenőleges takarítása nem történt meg; a
   javítások az ÚJ árva sorok keletkezését zárják el.
8. **A `created_at` oszlop alakját a séma nem kényszeríti** (`TEXT NOT NULL` marad): a védelem két oldalon
   áll (olvasás + takarítás), de séma-szintű kényszer nincs — a migrációs lánc ebben a körben nem nyílt ki.
9. **A visszatöltési kapu TUDATOSAN óvatosabb a kelleténél**: `?service=` vagy `PGSERVICE` jelenlétében
   akkor is megáll, ha a cím KIMONDOTTAN megnevezi az adatbázist (ott a szolgáltatás-fájl már nem
   szólhatna bele). A szolgáltatás-fájl tartalmát nem olvassuk — más gépen, más engedélyekkel áll. A
   tévedés így a NEM TÖRLÉS irányába esik (`D-VS-3158`).
10. **A folytatás 12 óra tétlenség után nem él tovább** (`D-VS-3157`). Eddig sem élt; most a SZÖVEG is ezt
   mondja. Ha a jövőben 24 órás folytatás kell, a munkamenet tétlenségi korlátját kell megnyújtani — annak
   a költségét a döntés kimondja.

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

### 11.4 A HARMADIK REVIEW-KÖR UTÁN — MI FUTOTT A `43f3841` KÓDON, ÉS MI NEM

**Kimondom elöl: a 41 láncos TELJES söprést a `43f3841`-en NEM futtattam újra.** Ami ezen a kódon
futott, az CÉLZOTT — de a két érintett terület MINDEN hosszú láncát tartalmazza (a mag mutációs
battériáját és a böngésző-kaput is), nem csak a gyors próbákat:

| lánc | eredmény a `43f3841` kódon |
|---|---|
| `npm run verify:v3ref` (mag + TELJES mutációs battéria) | **TELJES ÉS TISZTA** — 69/69 próba · **249/249 mutáció elkapva**, 0 túlélte, 0 rossz próba, 0 mérőhiba, 0 elavult horgony; 44 egység, a legrosszabb egység 9870 ms (korlát 15 000) |
| `npm run verify:browser-gate` (`test:e2e` + `proof:core-ux` + `proof:demo-walk`) | **PASS** — 122 helyzet · 0 bukás · 0 ingadozó · 0 kihagyás · 22 próba-fájl; a mérés EBBEN a futásban indult (22:36:25.552Z > 22:36:24.588Z) |
| `npm run verify:app-findings-r154` | **187/187 PASS** (a 179-hez képest a 8 új Y-sor) |
| `npm run app:selfcheck` | **57/57 PASS** |
| `npm run verify:kuka` | **740/740 PASS** · alapvonal v101 · 341 bejegyzés · `vs` padló változatlan 92 |
| `npm run verify:mutation-anchors` | **PASS** — 243 horgony, mind pontosan egyszer illeszkedik |
| `npm run verify:i18n` | **49/49 PASS** · ellenpróba 6/6 |
| `npm run verify:decision-numbers` | **4/4 PASS** — a következő szabad szám `D-VS-3159` |
| `npm run verify:unit-admission` · `npm run verify:hash-manifeszt` | **ZÖLD** · **7/7** |
| `npm run verify:lefedes` | **PIROS — változatlanul ÖRÖKÖLT** (20 R144-es hiány, `floor_breaks: []`) |

**Amit ez NEM állít:** a többi 30 lánc a `43f3841`-en nem futott újra, tehát azokra a `b80d00c`-n mért
zöld áll — ÚJ bizonyíték nélkül. A változás három fájlt érintett érdemben
(`tools/lib/vs_pg_target.mjs` · `v3ref/invite.mjs` · `v3app/server.mjs`), és a hozzájuk tartozó
láncokat a fenti táblázat mind tartalmazza; ettől függetlenül a „nem futott" itt is **nem** jelent
zöldet (`KUKA-200` · SRU-01: újrahasznosított bizonyítékra csak a feloldó adhat zöldet, és azt itt nem
hívtam meg).

### 11.5 A NEGYEDIK REVIEW-KÖR UTÁN — A `6c40c31` ÉS A `137df3d` KÓDJÁN

| lánc | eredmény |
|---|---|
| `npm run verify:v3ref` (mag + TELJES mutációs battéria) a `6c40c31` magján | **TELJES ÉS TISZTA** — 69/69 próba · **252/252 mutáció elkapva**, 0 túlélte, 0 rossz próba, 0 mérőhiba, **0 elavult horgony**; 44 egység, a legrosszabb 9317 ms (korlát 15 000) |
| `npm run verify:browser-gate` a `6c40c31` kódján | **PASS** — 122 helyzet · 0 bukás · 0 ingadozó · 0 kihagyás · 22 próba-fájl; a mérés EBBEN a futásban indult (23:28:34.622Z > 23:28:33.333Z) |
| `npm run verify:app-findings-r154` (a `137df3d`-n) | **198/198 PASS** — a 187-hez képest a 11 új Z-sor |
| `npm run verify:kuka` | **754/754 PASS** · alapvonal **v103** · 345 bejegyzés · `vs` padló változatlan 92 |
| `npm run app:selfcheck` · `verify:i18n` · `verify:hash-manifeszt` | **57/57** · **49/49** · **7/7** |
| `npm run verify:mutation-anchors` | **PASS** — 246 horgony, mind pontosan egyszer (köztük az ÚJRA-HORGONYZOTT M209/M217) |
| `npm run verify:decision-numbers` | **4/4 PASS** — a következő szabad szám `D-VS-3163` |

**Amit ez NEM állít, kimondva:**
- a 41 láncos TELJES söprést a `137df3d`-n sem futtattam újra; a maradék láncokra a `b80d00c`-n mért
  zöld áll, ÚJ bizonyíték nélkül — a „nem futott" itt sem jelent zöldet (`KUKA-200`).
- a **böngésző-kapu a `137df3d`-n nem futott**, és nem is kell: az a commit a `tools/` alatti
  exportálót és a battériát érinti, a v3app FUTTATOTT kódját nem. A `6c40c31`-en futott, zölden.
- a `verify:lefedes` változatlanul PIROS és ÖRÖKÖLT (20 R144-es hiány, `floor_breaks: []`).
