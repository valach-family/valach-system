> **Sáv:** Claude-v3 · **Állapot:** élő

# V3 RENDSZERKÉP ÉS KRITIKUS SZABÁLYOK — a MINDIG betöltött lap

Ez a lap az **egyetlen kötelező olvasmány** egy V3-feladat megkezdése előtt. Rövidnek kell maradnia:
ha nő, valamit rossz helyre tettünk. A részleteket a feladathoz kötött **elővétel** hozza (§4).

---

## 1. Mi ez a rendszer

A V3 **magreferencia** (`v3ref/`): futtatható modell arról, hogy ki mit tehet, melyik könyvben,
milyen felhatalmazás alapján, és hogyan lesz egy parancsból visszakereshető, nem duplikálódó
könyvelés. **Nem termék**: nincs benne termék, készlet, ár, képernyő. Ideiglenes SQLite-tárolón fut,
szintetikus adattal.

**A négy alap-fogalom:** `subject` (alany) · `book` (könyv — a hatókör határa) · `membership`
(tagság, kétidős) · `command` (ismétlés-védett parancs + nyugta).

## 2. A modulok — mi hol dől el

| modul | mit dönt el |
|---|---|
| `store.mjs` | a tároló és a séma; a pecsét-triggerek (`no_update` · `no_delete` · `no_reseal`) |
| `authz.mjs` | szabad-e ennek az alanynak ebben a könyvben — és a tagság megvonása |
| `bitemporal.mjs` | **hatályos** és **rögzített** idő két külön tengelyen; tagságadás |
| `command.mjs` | ismétlés-védett véglegesítés, nyugta, eredmény-kiadás |
| `invite.mjs` | meghívó kiadása és beváltása |
| `authorityBasis.mjs` · `basisLimit.mjs` | a felhatalmazási **alap** és a belőle levezetett **korlát** (MOP-01) |
| `adjudication.mjs` · `ban.mjs` · `suspension.mjs` | bejelentés, elbírálás, tiltás, felfüggesztés |
| `resultScope.mjs` | a KIADOTT eredmény adatköre (a típus deklarálja, nem a kérő címkéje) |
| `entryPoints.mjs` | az ÍRÓ belépési pontok hiteles kontextusa |
| `norms.mjs` · `normContract.mjs` · `manifest.mjs` | a norma-lánc: klauzula → állítás → próba → mutáció |
| `run.mjs` · `mutations.mjs` · `mutate.mjs` | a próbák és a falszifikáló battéria futtatója |

## 3. A három parancs, amivel mindent megmérsz

```
node v3ref/run.mjs              # 50 próba — a viselkedés
npm run v3ref:mutate:units      # 134 mutáció — a próbák FALSZIFIKÁLÓ ereje + a norma-lánc
npm run verify:sweep            # a teljes söprés (benne a külső fél programjaival)
```

**A zöld próba önmagában nem bizonyíték.** Egy védelem akkor áll, ha a hozzá tartozó mutáció
elrontja, és a battéria PIROSRA megy tőle. Amire nincs mutáció, arra nincs bizonyíték.

## 4. ELŐVÉTEL — mit kell megnyitni a feladathoz

| ha a feladat ezt érinti | ezt nyisd meg (és semmi mást alapból) |
|---|---|
| jogosultság, tagság, megvonás | `v3ref/authz.mjs` · `v3ref/bitemporal.mjs` · a hozzá tartozó `P-AUTHZ-*` próba |
| meghívó, felhatalmazási alap, korlát | `v3ref/invite.mjs` · `v3ref/authorityBasis.mjs` · `v3ref/basisLimit.mjs` · `P-INVITE-*` · `P-ORG-*` |
| parancs, nyugta, ismétlés | `v3ref/command.mjs` · `P-CMD-*` |
| eredmény-kiadás, adatkör | `v3ref/resultScope.mjs` · `P-REV-result-*` |
| tiltás, elbírálás | `v3ref/ban.mjs` · `v3ref/adjudication.mjs` · `P-REV-ban-*` |
| ÍRÓ belépési pont, kontextus | `v3ref/entryPoints.mjs` · `P-REV-entry-points` |
| norma-lánc, bizonyíték-szerződés | `v3ref/norms.mjs` · `v3ref/manifest.mjs` |

**Minden feladatnál a modul mellé jár:** (a) az ÉRINTETT FOGYASZTÓK listája — ki hívja azt, amit
módosítasz —, és (b) a KÖZÖS ALAPOK, amelyekre a modul épül (`store.mjs` séma, `manifest.mjs`
regiszter). Ezt a két listát a **modul-szerződés** adja; ha nincs szerződése, az a feladat első
része.

## 5. A TÍZ KRITIKUS SZABÁLY — ezt sose kelljen kikeresni

1. **Előbb reprodukálj.** Külső lelet javítása előtt futtasd le a programjukat a VÁLTOZATLAN
   forráson. Ha nem reprodukálódik, nem tudod, mit javítasz.
2. **Egy javítás akkor kész, ha a visszacsúszás PIROS.** Mutáció nélkül nincs bizonyíték.
3. **A mérés hatóköre SZABÁLY, nem lista.** Ha egy őr név szerint sorolja az alanyait, a rendszer
   következő darabja némán kimarad — és ZÖLDNEK látszik.
4. **Amit a hívó begépelhet, az ÁLLÍTÁS, nem mérés.** A védett tényt az a hely mondja meg, ahol a
   hatás születik — nem a hívó.
5. **A HIÁNY külön, nevezett válasz.** A hiányzó bemenet soha nem jelentheti az ellenőrzés
   átugrását. Fail-closed.
6. **Átalakítás SOHA nem előzheti meg a típus-ellenőrzést.** `Number()` / `String()` eltörli a
   megkülönböztetést, amit védeni akarsz.
7. **Ha egy szabálynak egynél több helyen kell igaznak lennie, KÖZÖS OTTHONBA megy** — nem
   helyenként kijavítva. Lánc-alakú adatnál kérdezd meg: ki ÁLLÍTJA ELŐ és ki FOGADJA BE?
8. **Szerszám nem tippeli a környezetét.** Keresd meg a bizonyítékát (létezik-e a horgony-fájl),
   vagy állj meg NEVEZETT hibával — soha nem nulla eredménnyel.
9. **Minden állítás mellé a HATÓKÖRE:** mit mértél, min, melyik paranccsal. Ami nem mérés, azt
   nevezd tervnek vagy becslésnek.
10. **„Zöld" csak arra mondható, ami ABBAN A KAPUBAN futott le, ami számít.** Az önmagában
    lefuttatott szerszám nem a söprés.

## 6. Ahol a többi tudás él (NEM kötelező olvasmány)

- `DECISION_LOG.md` — a számozott döntések, kereshetően. Akkor nyisd meg, ha egy döntés INDOKA kell.
- `contracts/retiredPatternRegistry.js` — a teljes tanulság-regiszter (KUKA), gépi őrrel
  (`npm run verify:kuka`). **Az őr futtatja; te akkor olvasod, ha egy konkrét tanulságra hivatkozol.**
- `CLAUDE.md` — a teljes memória-tábla. **Mérve: a fájl 92,5%-a a tanulság-tábla** — ezért nem
  olvasmány, hanem hivatkozási állomány.
- `docs/70_PLANNING/` — a körök lapjai; a `_olvashato/` az ember-alak (származtatott).
