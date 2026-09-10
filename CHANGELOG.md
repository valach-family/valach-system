# CHANGELOG — Valach System

A formátum a [Keep a Changelog](https://keepachangelog.com/) rendjét követi, a verziózás a
[semantic versioning](https://semver.org/) szabályát (`FŐ.ALVERZIÓ.JAVÍTÁS` — lásd `VERSIONING.md`).

**Ezt a lapot az OPERÁTOR is olvassa**, ezért magyarul, üzleti nyelven íródik: mi változott és mit
jelent neki — nem azt, melyik függvény hogyan lett átnevezve.

## [Unreleased]

### Hozzáadva

- A repó megnyitása a nyitó csomaggal (D-VS-3000): aktív memória (`CLAUDE.md` + a 89 KUKA-tanulság),
  őr-otthon térkép, kiadási menetrend őre, söprés, a magreferencia (`v3ref/`), a lap- és
  board-eszközök, üres `migrations/` a kiadás-naplóval.
- **A kiadott meghívó feltételei innentől nem írhatók át** (D-VS-3010): a meghívó születésekor a
  könyv, a címzett, a szerep, a kibocsátó és a lejárat PECSÉTET kap, amit utólag semmi nem
  módosíthat. Változtatni csak a régi visszavonásával és ÚJ meghívóval lehet — a beváltó a pecsétet
  kapja, nem a közben átírt sort. Korábban egy már kiküldött „felhasználó" meghívóból utólag
  „adminisztrátort" lehetett csinálni.
- **A szabály-nyilvántartás nem tud többé „megépült"-et mondani bizonyíték nélkül** (D-VS-3010): a
  szabályok atomi mondatokra bomlanak, és mindegyikhez oda kell tartoznia egy NÉVVEL megnevezett,
  ebben a futásban ZÖLD ellenőrzésnek — különben a lap kimondja, hogy nincs rá bizonyíték. A futás
  kiírja a teljes láncot: szabály → mondat → állítás → próba → visszabontási kontroll → eredmény.
- A magpróba mérése **hétszer gyorsabb** lett (21,8 mp → 2,0 mp), változatlan eredménnyel, és az
  időkorlát mostantól őrzött: ha a mérés lassulni kezd, a futás pirosra vált, mielőtt a külső
  ellenőrzésünk eltörne rajta.

### Megjegyzés

- Éles kiadás még nincs. Az első címke akkor születik, amikor az első valódi képesség kimegy.
