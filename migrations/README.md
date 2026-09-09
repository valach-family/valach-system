# migrations/

**Előrefelé megy. Számozott. Merge után érinthetetlen.**

- Fájlnév: `NNN_rovid_nev.sql` (három számjegy, aláhúzásos kisbetűs név).
- A sorszám EGYEDI. Két sáv (Claude-DEV és Claude-AUX) párhuzamosan dolgozik — a szám kiadása előtt
  `npm run verify:release-order` megmondja, mi a helyzet.
- **Ami már lefutott bárhol, azt nem szerkesztjük.** A `LEDGER.json` sha256-tal rögzíti a kiadott
  migrációkat; a verifier méri, hogy senki nem írta át őket. Javítani ÚJ migrációval lehet.
- **Bontó művelet** (`DROP COLUMN`, `RENAME COLUMN`, `SET NOT NULL`, …) csak akkor mehet ki, ha a
  fejlécében kimondja, melyik kiadásban hagyta abba a kód a használatot, és az KORÁBBI a mainál:

  ```sql
  -- KIVEZETVE: 3.1.0
  ALTER TABLE partner DROP COLUMN legacy_code;
  ```

  Enélkül a rossz kiadás visszagörgetése eltörné az adatbázist. A szabály a
  `contracts/releaseOrder.js`-ben él; a részletek a gyökér `VERSIONING.md` 3. pontjában.

**Ma nulla migráció áll itt** — és ez kimondott állapot, nem feledékenység: a V3 séma még nem
született meg. A `verify:release-order` ezért fixtúrákon futtatja a szabályt, hogy az első naptól
bizonyítottan tüzeljen (KUKA-051 · KUKA-089).
