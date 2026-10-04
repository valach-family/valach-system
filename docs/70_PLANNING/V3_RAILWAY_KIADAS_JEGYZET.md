# V3 — Railway kiadási jegyzet (a végrehajtónak)

> **Sáv:** Claude-v3 · **Állapot:** élő

Ez a lap EGY dolgot rögzít: mit kell a Railway-oldalon visszaolvasni, mielőtt a V3 staging
elindul. Nem terv és nem jelentés — **ellenőrző lista a végrehajtáshoz** (a felhős lépéseket az
R152 §1 szerint a chatgpt-v3 végzi).

## 1. A BUILDER — a `railway.json` NEM írja felül többé

**Mi volt a baj.** A `railway.json` korábban `builder: NIXPACKS`-et írt elő, a szolgáltatás
beállítása viszont **RAILPACK** (a platform mai alapértelmezése, visszaolvasva 2026-10-04). A
repóban álló fájl a telepítéskor **felülírta volna** a szolgáltatás beállítását — egy csendes
builder-váltás a kiadás pillanatában.

**A döntés:** a `railway.json`-ból a `build` szakasz **kikerült**. A buildert a **szolgáltatás**
beállítása adja; a repó csak azt írja elő, ami a FUTÁSRÓL szól (pre-deploy, start, healthcheck,
példányszám). Egy fogalomnak egy otthona (KUKA-018) — és a kettő közül az nyer, amelyiket a
végrehajtó lát és visszaolvas.

## 2. Amit emiatt KÜLÖN kell beállítani

A `npm ci --omit=dev` korábban a nixpacks-tervben állt, és azzal együtt kikerült. A fejlesztői
függőség (`@playwright/test`) ettől bekerülhet a képbe — nem veszélyes, de fölösleges méret és
idő. A kiváltása **változóval**, a szolgáltatás Variables lapján:

```
NPM_CONFIG_OMIT=dev
```

**Ha ez nincs beállítva, a kiadás attól még működik** — ezért nem kapu, hanem jegyzet.

## 3. Visszaolvasandó az első indítás ELŐTT

| # | Mit | Elvárt |
|---|---|---|
| 1 | régió (app **és** Postgres) | ugyanaz az EU-régió (`europe-west4-drams3a`) |
| 2 | builder | a szolgáltatásé (RAILPACK) — a repó nem írja felül |
| 3 | `preDeployCommand` | `npm run db:migrate`, véges határidővel |
| 4 | `healthcheckPath` | **`/ready`** (NEM `/health` — az csak folyamat-életjel) |
| 5 | `DATABASE_URL` | az ÚJ staging Postgres **reference** változója |
| 6 | `VS_APP_ENV` | `staging` |
| 7 | `VS_APP_ACCESS_PASSWORD` | beállítva (enélkül a szolgáltatás **el sem indul**) |
| 8 | `VS_APP_TRUST_PROXY` | `1` |
| 9 | `VS_APP_DEV` | **nincs beállítva** (telepítve a fejlesztői felület alapból KI) |

## 4. A bemutató útja a telepítés után

A fejlesztői levél-fogadó stagingben KI van kapcsolva, ezért a belépéshez szintetikus fiók kell:

```
VS_TEST_ACCOUNT_PASSWORD='<az operátor választja>' \
npm run staging:test-account -- --confirm <adatbázis-név> --label bemutato
```

Két kapu védi (`VS_APP_ENV=staging` **és** a visszaolvasott adatbázis-név), a fiók a normál
domain-utakon születik, a cím `.invalid` végű, és **a jelszót az eszköz nem írja ki**.
