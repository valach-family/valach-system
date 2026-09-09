# `var/` — MINDEN GENERÁLT KIMENET EGY HELYEN

Ide ír a rendszer, és **innen soha semmi nem kerül a gitbe** (a `.gitignore` az egész könyvtárat
kizárja; egyedül ez a lap kivétel, hogy a szerkezet látszódjon).

**Miért egy gyökér:** a V2-ben kilenc külön helyre ment a generált kimenet (`backups/` ·
`runtime_logs/` · `test_logs/` · `test-results/` · `audit_out/` · `i18n_munka/` · `i18n_atiras/` ·
`logs/` · `tmp/`), mindegyik külön alkalommal, külön `.gitignore`-sorral. Egy elrontott út emiatt
`undefined/` nevű, **követett** könyvtárat hozott létre három képpel a repóban. Egy fogalomnak egy
otthona van (KUKA-018 · KUKA-003).

## A területek

| Könyvtár | Mi kerül ide |
|---|---|
| `var/logs` | futás-naplók: mit csinált egy szerszám, mikor |
| `var/backups` | adatbázis-mentések — **ÜZLETI ADAT**, a repóba soha |
| `var/reports` | mérések, átvilágítások, lábnyom-riportok |
| `var/exports` | kivitt adat (CSV, XLSX) — **ÜZLETI ADAT** |
| `var/tmp` | eldobható munka-állomány; bármikor törölhető |

A lista **kódban** él (`contracts/artifactNaming.js` → `AREAS`), ez a lap csak tükrözi — és a
`npm run verify:artifact-naming` **méri, hogy a kettő nem csúszott szét**.

## A fájlnév

```
v3_v3.1.1_20260909_104201_sema_mentes.sql
│  │      │        │      │
│  │      │        │      └─ mi ez (kisbetűs, ékezet nélkül)
│  │      │        └──────── idő (a gép HELYI ideje, nem UTC)
│  │      └───────────────── dátum
│  └──────────────────────── a pontos verzió, ami írta
└─────────────────────────── a fő vonal — ettől áll egy vonal minden kimenete EGYBEN,
                             és a v4 nem keveredik a v3.9 és a v3.10 közé
```

Nevet **soha nem gépelünk**: `artifactPath({ area, kind, ext, version })`. A verzió a
`package.json`-ból jön, nem emlékezetből (KUKA-005 · KUKA-033).

## Takarítás

A `var/` bármikor törölhető — nincs benne olyan, amit ne lehetne újra előállítani.
**Egyetlen kivétel a `var/backups`:** az üzleti adat, és a másolata NEM ebben a könyvtárban él
(a fejlesztői gép nem mentés-hely). Lásd a `CLAUDE.md` „A KIADÁSI MENETREND" szakaszát.
