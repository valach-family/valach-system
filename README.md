# Valach System

Készlet- és folyamat-nyilvántartó rendszer több cégtér számára. Ez a repó a **termék** otthona —
a verzió **címke** a git-történetben (`v3.0.0`, `v3.1.0`, később `v4.0.0`), nem a repó neve és nem
mappa. Ezért nem lesz `vs3` vagy `vs4` nevű repó.

A **V2** a saját nevén él tovább: `valach-family/vs`. Onnan jött át minden, ami nem verzió-függő —
a tanulságok, az operátori állandók, a szállítási forma —, és nem jött át az alkalmazás-kód, a séma,
az üzleti adat.

---

## Hol kezdd

| Ha ez érdekel | Ezt olvasd |
|---|---|
| hogyan dolgozunk itt, mit szabad és mit nem | **`CLAUDE.md`** — ez az aktív memória, a rendszer minden körben betölti |
| verziók, ágak, migráció, visszaállás | **`VERSIONING.md`** |
| mi változott melyik kiadásban | **`CHANGELOG.md`** |
| miért éppen így | **`DECISION_LOG.md`** (a V3 a `D-VS-700`-tól számoz) |
| mit buktunk el már egyszer | `contracts/retiredPatternRegistry.js` — 89 tanulság, gépi jelekkel |

## Első futás

```bash
npm run verify:sweep
```

Nincs telepítendő függőség: a repó ma **csak a Node beépítéseit** használja (Node 22+ kell, mert a
magreferencia a beépített `node:sqlite`-ot hívja). A söprés minden `verify:*` ellenőrzőt lefuttat, és
a környezethez kötött kihagyásokat **nevesítve** írja ki — nem néma zöldként.

## Mi van ma a repóban

| Mi | Mire jó |
|---|---|
| `CLAUDE.md` | az aktív memória: operátori állandók, terminál-blokk, a 89 KUKA-tanulság |
| `contracts/retiredPatternRegistry.js` | a tanulságok adatként, gépi jelekkel |
| `contracts/guardHome.js` | **hol fut ma az adott jel** (`v3` / `vs` / `none`) — a hiány kimondva |
| `contracts/releaseOrder.js` | a bővítés → átállás → szűkítés szabály, nevezett feloldóként |
| `v3ref/` | a V3 mag-szabályainak **futó** referenciája (azonosság · meghívó · jog · parancs), adatbázis nélkül |
| `tools/` | söprés, ellenőrzők, a lap-eszközök (`.md` → olvasható HTML), a board-eszközök |
| `migrations/` | üres, kiadás-naplóval — az első séma-lépés helye |
| `docs/70_PLANNING/` | a V3 tervek és a tárgyalási lapok |

## Amit a repó ma NEM tud — kimondva

Hogy semmi ne látszódjon késznek, ami nem az (KUKA-051):

- **nincs alkalmazás** (se szerver, se felület) — ez a V3 alapozása;
- **nincs séma és nincs migráció** — a kiadási menetrend őre ezért fixtúrákon bizonyítja, hogy a
  bontás-szabály tüzel;
- **a 89 KUKA-tanulságból ma 2 jelnek van itt futó őre**, 85-é a V2 repóban él, 2-nek nincs gépi
  jele. A `npm run verify:kuka` ezt a listát kiírja, és a 85-ös szám **padló**: csökkenhet, nőni nem;
- **nincs alapállás-mentés** — mert még nincs adat.
