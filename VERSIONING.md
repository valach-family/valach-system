# VERZIÓZÁS ÉS KIADÁS — Valach System

**Ez a lap szabály, nem magyarázat.** Amit itt kimondunk, azt a `npm run verify:release-order` méri.
Ha valami itt áll, de a gép nem méri, az ki van mondva a szakasz végén — mert a magyarázó szöveg
nem őr (KUKA-004).

---

## 1. A verzió CÍMKE, nem név

A repó neve **verzió-semleges**: `valach-family/valach-system`. Nem lesz `vs4` nevű repó.
A verzió a git-történet egy pontja, `v3.0.0` alakú címkével.

| Mikor lép | Példa | Mit jelent a HASZNÁLÓNAK |
|---|---|---|
| **JAVÍTÁS** | 3.1.1 → 3.1.2 | hiba javítva, a viselkedés nem változott — nincs teendő |
| **ALVERZIÓ** | 3.1 → 3.2 | új képesség, a régi minden tovább működik — nincs teendő |
| **FŐ** | 3 → 4 | van, ami a régi módon már NEM működik — **itt van teendő** |

A szám nem díszítés: **megmondja a használónak, mire számítson.**

## 2. Ágak

- **Egy `main` ág.** Minden ide megy be.
- **A kiadás = címke** a `main` egy pontján.
- **`release/3.x` ág CSAK akkor születik**, ha egy régi verziót támogatni kell, miközben a `main`
  már továbbment. Amíg egyetlen telepítés van, erre nincs szükség — de a rend készen áll.
- **A v4 ugyanebben a repóban lesz.** Ha akkor a v3 még él valakinél, az a `release/3.x` ágon kap
  javításokat, a `main` pedig a v4-et viszi. „Párhuzamos v3 és v4" = egy repó + egy karbantartott ág.

## 3. Migráció — a három kiadás

| Kiadás | Mi történik | A régi kód |
|---|---|---|
| 1. **bővítés** | az új oszlop létrejön, üresen, kényszer nélkül | nem tud róla, működik |
| 2. **átállás** | az új kód MINDKETTŐT írja, az ÚJAT olvassa | még mindig működik |
| 3. **szűkítés** *(későbbi kiadás)* | a régi oszlop eldobva | ekkorra már nincs régi kód |

> **A tiltás, ami mindent eldönt: a bontás SOHA nem lehet ugyanabban a kiadásban, mint a kód, ami
> abbahagyja a használatát.**

Ezért minden **bontó** migráció fejlécében ott áll, melyik kiadásban hagyta abba a kód a használatot,
és annak **szigorúan korábbinak** kell lennie a mainál:

```sql
-- KIVEZETVE: 3.1.0
ALTER TABLE partner DROP COLUMN legacy_code;
```

Bontónak számít: `DROP COLUMN` · `DROP TABLE` · `RENAME COLUMN` · `RENAME TO` · `SET NOT NULL` ·
`ALTER COLUMN … TYPE` · `DROP TYPE`. A listát a `contracts/releaseOrder.js` tartja, a verifier
**hívja** (nem másolja — KUKA-009), és **fixtúrákon bizonyítottan tüzel**, tehát nulla migrációval
sem üres zöld (KUKA-051 · KUKA-089).

## 4. A migráció-fájlok rendje

- Név: `NNN_rovid_nev.sql`, számozott, egyedi.
- **Előrefelé megy.** Visszafelé nincs automatikus lépés — a visszaállás a KÓD visszagörgetése.
- **Merge után SOHA nem szerkesztjük.** Amit a `migrations/LEDGER.json` már kiadottként rögzít,
  annak a sha256-ja nem változhat; javítani ÚJ migrációval lehet.
- Kiadáskor a migráció bekerül a naplóba (`file`, `sha256`, `released_in`).

## 5. Visszaállás

> **A rossz kiadást nem adatbázis-visszaállítással javítjuk, hanem a KÓD visszagörgetésével.**

| Mi történt | Mit teszünk | Adatvesztés |
|---|---|---|
| rossz kiadás, a rendszer hibázik | **kód-visszagörgetés** az előző címkére | nincs |
| a hibás kiadás rossz sorokat írt | **célzott javító-esemény** (nem visszaállítás) | nincs |
| valódi adat-sérülés vagy téves tömeges törlés | **visszaállítás** | a visszaállítási pontig |

Az első a 95%-os eset, és csak akkor működik, ha a 3. pont szabályát betartottuk.
**A nem próbált mentés nem mentés** (KUKA-038) — a visszaállítást ütemezetten gyakorolni kell.

## 6. Amit ez a lap kimond, de a gép MA nem mér

Kimondva, hogy ne látszódjon védettnek (KUKA-051):

- **a címke tényleges kiadása** (`git tag`) — a repó ma egyetlen telepítés nélkül él, kiadási
  folyamat még nincs; amint van, a `verify:release-order` a címke ↔ CHANGELOG viszonyt is mérni fogja;
- **a `release/3.x` ág léte és karbantartása** — akkor lesz mérhető, amikor az első ilyen ág megszületik;
- **a visszaállítás-gyakorlat ütemezettsége** — ez üzemeltetési tény, nem repó-tény.
