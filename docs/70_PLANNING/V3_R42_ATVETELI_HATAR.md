# R41 végrehajtása — az átvételi határ lezárva: ami a kimenetbe kerül, az ellenőrzött

> **Sáv:** Claude-v3 · **Kör:** R42 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R41 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-18).
**Ez a lap és a boardra felvitt üzenet szövege AZONOS.**

---

## Mi történt, közérthetően

**A probléma.** Az összegző szerszám a legutóbbi körben megtanulta **újraszámolni** az eredményt — de
csak **két mezőt** vetett össze a sajátjával. A többit (ki hagyta jóvá · mi hiányzik még · melyik
követelményhez tartozik) **ellenőrzés nélkül átvette**. Az ellenőrző fél beírt 94 kitalált
jóváhagyást, és a szerszám **elhitte**.

**Fontos, és ezt ők is kimondták:** hamis jóváhagyást **nem adtunk be** — az ép állományban 0 áll. A
baj az volt, hogy a szerszám **nem védte meg** a jelentést az ilyen adattól.

**Mitől lesz megbízhatóbb.** Két dolog. Egy: a szerszám a sorokat mostantól **a saját
újraszámolásából** építi, a beadott adatot csak **összevetésre** használja — így nincs olyan mező,
amit „elhisz". Kettő: hogy melyik mező honnan jöhet, az **egy helyen, felsorolva** áll. Ha holnap új
mező születik, a védelme nem külön munka, hanem **következmény**.

**A második hiba ugyanez, egy réteggel mélyebben.** A mérés több helyen hivatkozik arra, hogy melyik
kódon készült; eddig csak a **legfelső** hivatkozást ellenőriztük. Ha a belsők csupa nullára voltak
írva, a részek egymáshoz képest rendben voltak — miközben **egyik sem a mai kódról szólt**. Most
mindegyiket a valódi forráshoz mérjük.

**Egy dolgot a saját mérésem talált.** Azt állítottuk, hogy a 29 külső döntés **szó szerinti**
indokkal áll a repóban. Ők egy átfogalmazást találtak; én még **kettőt**. Tartalmat egyik sem
torzított, de idézetként pontatlan volt. Mindhárom visszaállítva — és az állítás mostantól **mérés**,
nem ígéret: a rögzített forrás-lapban kell szó szerint megjelennie.

**Mi maradt, és ki végzi.** A mag tartalmi elbírálása (OB-7) továbbra is az ellenőrző félé; a hat
nyitott mag-blokkoló változatlan. **Új üzleti funkciót ez a kör sem szállított** — és ahogy ők
helyesbítettek: a javítás **értéke** és az új funkció **hiánya** két külön tény. A megbízhatóság
mérhetően nőtt.

---

## 1. F41-01 — a kimeneti szerződés egy helyen, a sorok a kanonikus eredményből

**Mind a három ellenpélda reprodukálva** (javítás előtt mind kilépés 0):

| ellenpélda | javítás ELŐTT | javítás UTÁN |
|---|---|---|
| minden sor `content_review` = `current`, kitalált elbírálóval | **„repó-felülvizsgálat 94"** a valódi 0 helyett | **elakad** — „a beadott `content_review` eltér az újraszámolttól" |
| a részleges sorok `why` = „Minden kész, nincs hiány." | a hamis mondat bekerült | **elakad** — a hiány-szöveg eltérése megnevezve |
| minden sor `covers` = `['K99']` | az idegen hivatkozás bekerült | **elakad** — `["K99"]` vs `["K07","K09"]` |

**A javítás alakja — nem mezőnkénti toldozás:**

- **`ROW_CONTRACT`** — a teljes kimeneti szerződés **egy helyen**, mezőnként megnevezett otthonnal:
  *kanonikus* (11 mező, és a beadott vetületnek egyeznie kell) · *helyi regiszter* (klauzula-szöveg ·
  forrás · maradék) · *futtató-cím* · *külső regiszter* · *származtatott* (pozitív/negatív bizonyíték).
- **A sorok a kanonikus eredményből épülnek** (`again.chain`), a beadott vetület **csak** az
  összevetésre szolgál — így nincs „ellenőrizetlen átvétel" kategória.
- **Az összevetés a szerződés listájából jön**, tehát új mezőre **magától** kiterjed (KUKA-051).
- **A negatív bizonyíték** a szerződés szerint **minősülő** tanúra (`falsified_by`) és a jelölt-listára
  támaszkodik — nem a `failed_assertions` puszta név-egyezésére, ahogy kérték.

## 2. F41-02 — minden forrás-hivatkozás a tényleges forráshoz kötve

**Reprodukálva:** a felső `base_digest` helyes maradt, a `norm_inputs.expectation.base_digest` és
**minden** mutációs tanú `base_digest`-je csupa nulla — és a csomag **kilépés 0**-val lefutott,
`source_bound: true` mellett, mert az újraszámolás „egyező **idegen**" elvárást látott.

**Javítva:** az elvárás **és** minden tanú forrás-hivatkozása is a mai forrás-lenyomathoz mérve
(az első eltérő tanú megnevezve). **Kimondva, az ő szavukkal:** ez ellentmondó mezők felismerése —
ettől egy helyi JSON **nem** válik kriptográfiailag hiteles futási tanúvá; az `evidence_limit`
megőrizve.

## 3. A hű gyengítés ELFOGADVA — az őr nem hazudhat a másik irányba

Az ő R41-es mérésük külön kiemelte: ha egy tanú **valóban** nem minősül (`M32 applied=false`) és a
lánc ehhez **újraszámolva** gyengül (69/13/2/10), az **hű állapot**, nem ellentmondás. A battéria
ezért **pozitív ellenpárként** méri: ez az eset **zöld** marad.

**A fixtúra maga is lelet volt.** Az első alakomban kézzel írtam a gyengült sor hiány-szövegét, és a
battéria jogosan bukott: a kanonikus mondat **másik** jelöltet nevez meg. Kézzel írt „várt érték" itt
ugyanaz a hiba lett volna, amit mérni akarunk — a hű vetületet most **a kanonikus ítélő állítja elő**.

## 4. F41-03 — forrásigazolás és dokumentumegyezés

| tétel | mi történt |
|---|---|
| **a „161054f-en futott" állítás** | **visszavonva.** Igazuk van: a külső lánc elmentett forrása `22412bb+uncommitted`, `clean=false` volt. A mostani zárómérés **tiszta munkafán**, EGY azonosított forráson futott — a lap alább **mérésenként** nevezi meg a forrást. |
| **OB-9 maradék-szöveg** | a hamis „egyetlen élő profil" indok **törölve** (két profil áll); a hiány megmarad. |
| **R38 board-lap** | frissítve (**3. változat**) a repóbeli helyesbítéssel; a történeti eredményt a board verziózása őrzi. |
| **„szó szerinti" külső indok** | három átfogalmazás visszaállítva (`K05-DSC-c` az övék, `REV-N3c` és `K10-TYP-c` a saját mérésemé), és az állítás **mérés** lett: **EXD-02** (`npm run verify:external-decisions`) — a rögzített R37 forrás-lapban, **mindkét irányban**. |

## 5. Amit ez a kör NEM tett meg

- **Nem** adtunk tartalmi elfogadást magunknak.
- **Nem** gyártottunk új hitelesítési rendszert vagy operátori aláírást — a jelenlegi, hiteles
  jóváhagyási rekord **nélküli** állapotot tartjuk meg helyesen.
- **Nem** tiltottuk külön a felsorolt példákat: a szabály általános (kimeneti szerződés + teljes
  összevetés + minden forrás-hivatkozás kötve).
- **Nem** történt merge, telepítés, V2-módosítás, új üzleti modul.

## 6. Valódi nyitott döntések

1. **OB-7 folytatása** — a mért csomag tartalmi elbírálása (az Önöké).
2. **OB-1 · OB-2 · OB-3 · OB-4 · OB-5 · OB-6** — a mag nyitott blokkolói; egyik sem zárult.
3. **K05-DSC-c engedő ága · K10-TYP-c/d/e · ORG-N1a/N1b · REV-N4a/N4b** — nyitott bizonyítások.
4. **R19 PLAN 24 QNT-követelménye és 36 esete megőrizve.**

**14** klauzula referencia-hatókörű elfogadása és **15** részleges/nyitott áll — **ez nem készültségi
százalék**. A repó `content_review` és a külső döntés **külön tengely**. Fogyasztás R24-től
ismeretlen, a költség **null, nem nulla**.

## 7. Mérések — MÉRÉSENKÉNT megnevezett forrással

_(a záró számok a lap végén)_
