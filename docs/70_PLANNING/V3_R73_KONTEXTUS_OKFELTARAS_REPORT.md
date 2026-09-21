# R73 végrehajtva — mi töltődött be, mitől nőtt, mit javítottunk, mi maradt külső beállítás

> **Sáv:** Claude-v3 · **Kör:** R74 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R73 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-21 05:33:53Z), szó szerint:
`v3ref/source-documents/R73_board_v1.md`. Repó `valach-family/valach-system`, ág `claude/compassionate-cerf-asuv7s`;
a commit a board-üzenetben. Ugyanaz a lezárt ablak: `2026-09-20T20:06:40Z → 20:41:16.352Z`, 47 hívás. Ügynök,
workflow, sweep, mutációs lánc, merge, telepítés, V2-módosítás: **nem volt**. Bizonyítékfájl:
`docs/70_PLANNING/V3_R71_FOGYASZTAS_EXPORT.json` (újragenerálva a javított exportálóval).

## 1. Mi töltődött be az induláskor — a 219 567 tokenes első bemenet forrása

Az átirat az 1. hívás előtt egy `instructions` mellékletet tárol **két fájllal** (mindkettő az átiratban
tárolt tartalom, út · bájt · sha256, a szakasz-bontás programmal, a modell nem olvasta):

| fájl | bájt | ami a méretet adja |
|---|---|---|
| `/home/user/valach-system/CLAUDE.md` (V3, az indulási alak, sha `ecf6e279…`) | **16 879** | 10 szakasz; a legnagyobb az Állandók 3 749 B |
| **`/home/user/vs/CLAUDE.md` (a csatolt V2 repó gyökér-fájlja**, sha `76eacfe7…`) | **334 392** | 7 szakasz: a **KUKA-tábla 189 220 B** (125 sor) + az **Állandók 136 764 B** = a fájl **97,5 %-a** |

**Betöltési út:** a munkamenet indításakor KÉT repó volt csatolva (a munkamenet forrás-listája:
`valach-family/valach-system` + `valach-family/vs`), és a futtató a csatolt könyvtárak gyökér-fájlját is
betölti (`CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1`). Ez **nem a V3 forrásának beállítása** — a
`.claude/` mappában nincs ilyen; a csatolást a munkamenet létrehozásakor a repó-lista adja. Az induló melléklet
egyetlen összeállított blokk, a két fájl külön tétele; ismételt szakasz egyikben sincs. Mellette az átirat még
`prompt_snapshot` (36 kB, rendszer-utasítás pillanatkép — hogy ez tényleg kérés-tartalom-e, az átiratból NEM
látszik) és `skill_listing` (12 kB) mellékletet tárol; az eszköz-sémák és a rendszerutasítás tényleges
kérés-összeállítása az átiratból **nem látható — ismeretlen, nem nulla**. Tokenarányt nem számolunk bájtból: a
334 kB-os fájl szöveg, a becsült aránya ~80–110 ezer token (becslés), az első bemenet mért 219 567 tokenéből a
többi a rendszer-utasítás, eszköz-sémák, listák — mérve nem szétválasztható.

## 2. Mitől nőtt 219 567-ről 454 751-re — mind a 47 hívás lefedve

A javított exportáló (`per_call_coverage`) minden hívásra bontja a változást: **Δ = az előző hívás kimenete
(usage-ban MÉRT) + a közéjük eső események becsült tokenje (bájt/4, BECSLÉS) + megmagyarázatlan maradék.**

| összetevő | token | arány |
|---|---|---|
| teljes növekedés (47 hívás) | **235 184** | 100 % |
| az előző válaszok kimenete (mért; tool_use-blokkok + szöveg + gondolkodás) | **93 455** | 40 % |
| események becsült tokenje (bájt/4): eszközválaszok 214 kB + mellékletek | **114 160** | 49 % |
| megmagyarázatlan (becslési hiba + nem tárolt tényezők — nem nulla) | **27 569** | 12 % |

**Az ablakon belüli mellékletek bájtban:** `instructions` 353 807 (az induló) · `prompt_snapshot` 188 578 (2 db)
· `deferred_tools_record` 35 780 · **`edited_text_file` 35 093** (a harness a szerkesztett fájlt visszatölti,
ha a Write után shell-lel is módosul) · `nested_memory` 14 766 (a V3 CLAUDE.md újratöltése módosítás után) ·
`skill_listing` 12 229 · 62 token-emlékeztető + 59 batching-emlékeztető (együtt 8 kB). **Ismételt azonos
eszközválasz: 0.** **Ismételt fájl-olvasás: 18 (a Bash-parancsokból helyben felismert utak: a mérő és a
söprés forrása többször `sed`/`cat`-tal); a 56 Bash-parancsból 19 út nélküli — `bash_unknown`, lefedettség
37/56.** A legnagyobb egyedi ugrás (20. hívás, +13 487) előtt egy 27 kB-os eszközválasz állt (egy lap teljes
`cat`-ja). A 673 tárolt gondolkodás-bájt nem a gondolkodás mennyisége; az ablak utáni `cost-state` nem a 47
hívás költsége — hetikeret-százalékot nem számolunk.

## 3. Mit javítottunk — csak saját hatáskörben, visszafordíthatóan

- **Az exportáló (R73 §2 hibái):** az események CSAK az ablakon belül · Write/Edit írás, nem olvasás ·
  Bash-parancs HELYBEN, végrehajtás nélkül elemezve (csak felismert fájl-utak mennek ki; a többi `bash_unknown`)
  · blokkok (azonosító, blokk-index) párra deduplikálva · hívásonkénti lefedés becsléssel és megmagyarázatlan
  maradékkal · az induló utasítások szakasz-bontása. A tartalom-őr változatlan (leghosszabb kiírt szöveg 150 kar.).
- **A V3 `CLAUDE.md`** 5. szakasza tömörítve (a részlet a gépi őrökben): az indulási 16 879 B → **15 474 B**;
  a kötelező szabályok megmaradtak (`verify:kuka` 328/328). Ez a betöltött 351 kB-ból 1,4 kB — kimondva: a
  V3 fájl NEM a fő tétel.
- **Mért szabály a saját kimenetekre** (CLAUDE.md 1. szakasz): terminálra csak összesítő és a hibás sor, a
  teljes napló `var/`-ba; board-lapból csak a kért szakasz; nagy fájl EGY eszközzel írva (a kevert írás a
  35 kB-os `edited_text_file` visszatöltést váltotta ki).
- **Amit NEM javítottunk, és miért:** a V2 gyökér-fájl (334 kB) betöltése — a csatolás a munkamenet
  repó-listájának beállítása, amit ebből a repóból nem lehet állítani.

## 4. Ami külső beállítás — pontos hely és a legkisebb művelet

- **Operátor (a munkamenet indítója):** a V3 munkamenethez a claude.ai/code munkamenet-létrehozásnál a
  **repó-listában CSAK a `valach-family/valach-system`** szerepeljen (a `valach-family/vs` ne) — ettől a
  334 kB-os V2 gyökér-fájl nem töltődik be. **Bizonyíték csak az első tiszta, V3-ra szűkített munkamenet 1.
  hívásának mérésével** (`meres:fogyasztas --session auto --from <parancs ideje> --quick`): itt, ugyanebben a
  felhalmozott chatben ez nem mérhető — külön lezárási feltétel.
- **Átadási pont a chatgpt-v2-nek (nem parancs):** a V2 `CLAUDE.md` 334 kB-jának 97,5 %-a a KUKA-tábla (125 sor,
  189 kB) és az Állandók (137 kB); a V3-ban ugyanezt a D-VS-3031 oldotta meg (a tábla archívum-lapra, a kód a
  kanonikus forrás). Ha a V2 ugyanígy tesz, a V2-s munkamenetek induló terhe is ennyivel csökken.

## 5. Bizonyítás, fogyasztás, ami nyitva marad

`verify:kuka` 328/328 · `verify:doc-html` 9/9 · a leltárral egyezés (47 hívás, négy összeg) változatlan ·
az export újragenerálva a javított szkripttel (a JSON `exporter.sha256` mezője). **Előtte/utána:** a betöltött
V3 fájl 16 879 → 15 474 B (helyi bájt, nem usage); a V2 fájl változatlanul betöltődik, amíg a csatolás áll.
Modellhívás az R73 átvétele után: 6 (a keret 15; a 8-as ellenőrzési pont nem kellett). Core/R64 nyitott.
**Operátori teendő:** a következő V3 munkamenetet csak a V3 repóval indítani (4. szakasz).
