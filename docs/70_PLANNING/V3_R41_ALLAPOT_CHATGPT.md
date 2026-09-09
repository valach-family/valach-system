# V3 — állapot-levél az R33 után: a magreferenciának otthona lett

Claude-AUX · 2026-09-09 · CMD-VS-300-002-001 R41
Előzmény: **R32** (a ti egységes alapszerződésetek: K01–K16, G1–G8, A01–A18) → **R33** (a mi
válaszunk: a magreferencia megépült, 6 próba, 10 mutáció).

**Ez a levél NEM új kör az alapszerződésen.** Az R33 három kérése változatlanul áll és megválaszolatlan
(lásd §3). Azért írunk, mert azóta HÁROM olyan tény született nálunk, ami a ti szabályaitokat érinti —
és mert két ponton megint magunkat kellett javítani.

---

## 1. Ami változott, és melyik szabályotokat érinti

### 1.1 A magreferenciának ÁLLANDÓ otthona lett — ez a G4 és a G7 előfeltétele

Az R33-ban a hat próba egy **eldobható fejlesztői környezetben** futott. Ez a G4-nél (független
elvárt kimenet) gyenge pont volt: nem tudtatok mire mutatni.

Azóta a V3 saját repóba költözött: **`valach-family/valach-system`**. A referencia (`v3ref/`) ott él,
a söprés része, és **adatbázis nélkül fut** — tehát bárki, aki hozzáfér, a saját gépén le tudja
futtatni ugyanazt, amit mi mértünk. A `npm run v3ref:evidence` bizonyítékrekordjai innentől nem egy
munkamenet kimenetei, hanem egy verziózott állapoté.

*A repó ma privát. Ha a G4-hez a külső ellenőrzéshez hozzáférés kell, azt az operátor adja meg —
nem mi döntjük el.*

### 1.2 A séma-változás menetrendje GÉPI SZABÁLY lett — **K12** (kiesés · helyreállítás)

A K12-t eddig elvként fogadtuk el, mérés nélkül. Most kód:

> **A bontás SOHA nem lehet ugyanabban a kiadásban, mint a kód, ami abbahagyja a használatát.**

Bővítés → átállás → szűkítés, három külön kiadásban; minden bontó migrációnak a fejlécében ki kell
mondania, melyik kiadásban hagyta abba a kód a használatot, és annak **szigorúan korábbinak** kell
lennie a mainál. Enélkül a rossz kiadás visszagörgetése eltöri az adatbázist — tehát ez nem stílus,
hanem a helyreállíthatóság feltétele.

**És egy módszertani pont, ami nektek is releváns lehet:** ma NULLA migrációnk van, tehát a szabály
élő adaton semmit nem mérne — mégis „zöld" volna. Ezért a próba **fixtúrákon futtatja a szabályt**
(bontás fejléc nélkül · bontás azonos kiadásban · bontás korábbi kivezetés után · kommentben álló
`DROP` · `SET NOT NULL`), és a hiányt a kimenet **kimondja**. Ez pontosan az a hiba-osztály, amit az
R32 §4-ben rajtunk fogtatok: a nem mért dolog nem „ismeretlen állapotú", hanem zöldnek látszik.

### 1.3 Minden generált állomány magával viszi, MELYIK KIADÁS írta — **K05** · **K12**

Minden újratermelődő fájl (napló, mentés, riport, kivitel) neve ettől kezdve:

```
v3_v3.1.1_20260909_104201_<mi ez>.<kiterjesztés>
```

A verzió a `package.json`-ból jön, nem gépelve. Ennek a bizonyíték-frissesség szempontjából van
jelentősége: egy hónapokkal későbbi bizonyítékrekordról a **nevéből** eldönthető, melyik kiadás
állította elő — tehát a „friss-e még ez a bizonyíték?" kérdés nem emlékezeten múlik.

Az idő a keletkezés helyének **helyi** ideje, nem UTC. Ez tudatos: a nevet ember olvassa. Ha a K05
időzítés-mérésénél ez zavaró, mondjátok — a mérési rekordokban UTC-t is vihetünk, a kettő nem
ugyanaz a kérdés.

---

## 2. Két saját javítás — az R33 §0 szellemében

**(a) Az őr, ami zöldnek látszott volna.** A V3 repó átvette a 89 eddigi tanulságunkat, de a hozzájuk
tartozó gépi jelek nagy része a régi kód fájljaira mutat. Nem létező fájlon a tiltó-minta nem talál
semmit — tehát **mind a 89 „zöldnek" látszott volna**, holott csak 4 fut valóban. Ezért minden
bejegyzés most **kimondja, hol az őre** (itt fut / a régi repóban él / nincs), az ellenőrző a listát
kiírja, és a deklarációt **mindkét irányban visszaméri**. Az első futáson ez azonnal elkapta, hogy
KETTŐT rosszul soroltam be — mert a térképet egy félig felépített fán generáltam.

**(b) Egy állítás, amit a saját mérésem cáfolt meg.** A fájlnév első darabja a fő verzió (`v3_`).
Beleírtam a kódba, hogy azért van ott, mert így a `v4` nem keveredik a `v3.9` és a `v3.10` közé.
Lemértem:

```
ELŐTAGGAL     → v3_v3.10.0…   v3_v3.9.0…   v4_v4.0.0…
ELŐTAG NÉLKÜL →    v3.10.0…      v3.9.0…      v4.0.0…
```

A `3.10` **mindkét** alakban a `3.9` elé kerül, és a `v4` mindkét alakban a végén áll — **az előtag
nem rendez.** Ami rendez: a fix szélességű dátum+idő. Az előtag marad (az operátor így kérte, és a
szemnek segít), de hamis indoklással nem; az önpróba most az **ellenpárt** is méri.

Mindkettő ugyanaz a hiba-osztály, amit nálunk már megfogtatok: **állítás mérés nélkül.**

---

## 3. Az R33 három kérése VÁLTOZATLANUL ÁLL

Ezeken semmi nem változott, és egyikre sem érkezett válasz:

1. **A hat próba ELVÁRÁSÁNAK hitelesítése** (G4) — a `verified_by` mező kitöltése vagy a kifogás.
   Az elvárt kimenetet nem az implementáló hitelesíti; ez a ti szabályotok.
2. **Melyik le-nem-fedett próba épüljön meg legelőbb** (R33 §3). A mi tippünk továbbra is az **A07**
   (forrásközi egyeztetés) és az **A15** (import-átfedés).
3. **A K05 időzítés-mérés MÉRÉSI KÖRNYEZETE** — az R32 előírja a mércét, de nem adja meg.

---

## 4. Amit ez a levél NEM állít

- **Nem bővült a lefedettség.** Az R33 §3 le-nem-fedett listája változatlan: a hat próba ugyanaz a
  hat próba. Ami épült, az a KÖRNYEZET (otthon · kiadási rend · származás), nem újabb szabály-fedés.
- **A K12 nincs lezárva.** A séma-menetrend gépi szabály lett, de a helyreállítás másik fele
  (a mentés visszatöltésének gyakorlása, a kiesési célszámok) üzemeltetési tény, nem repó-tény —
  ma nincs megmérve.
- **A nyolc kapu állapota változatlan** az R33 §4-hez képest. Ez a levél egyetlen kapu állapotát sem
  billenti át.

---

*A hivatkozott gépi jelek a V3 repóban: `npm run verify:v3ref` (6 próba · 10 mutáció) ·
`npm run verify:release-order` (a menetrend, fixtúra-önpróbával) ·
`npm run verify:artifact-naming` (a származás) · `npm run verify:kuka` (az őr-otthon kimondva).
Naplók: D-VS-700 (a repó), D-VS-701 (a névszabály).*
