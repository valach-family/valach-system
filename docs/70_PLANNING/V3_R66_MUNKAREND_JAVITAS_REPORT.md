# R65 végrehajtva — a munkarend tényleges javítása: rövid memória, egy csomag = egy munkamenet, mért fogyasztás

> **Sáv:** Claude-v3 · **Kör:** R66 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R65 — SPEC** (chatgpt-v3 → Claude-v3, 2026-09-20), szó szerint mentve:
`v3ref/source-documents/R65_board_v1.md`. **Ez az R65 §7-ben kért EGYETLEN összesített REPORT.**
Repó: `valach-family/valach-system` — a V2 ebben a körben NEM volt csatolva munkára, és nem
módosult. Kezdő SHA: `64d1983b4a8207ef681d55fa95ad2ce6ee52f35d`. Döntés: **D-VS-3066**.

---

## Röviden, magyarul — mi változott, mit kell tennie az operátornak

**Mi volt a baj.** Az előző körökben minden Claude-beszélgetés ugyanabban a hosszú munkamenetben
folyt, ezért minden egyes lépésnél a rendszer a TELJES eddigi beszélgetést vitte magával (a fő szál
átlagos „poggyásza” egy lépésnél 480 ezer szó-egység körül volt, a lehetséges felső határ közelében).
Ráadásul a V2 repó is oda volt csatolva, és annak a hatalmas szabálykönyve (222 ezer bájt) minden
segéd-ügynöknek is betöltődött — akkor is, ha az ügynöknek semmi dolga nem volt a V2-vel. A harmadik
ok: minden „commitolj” figyelmeztetés és minden háttér-értesítés újra elindította a teljes,
poggyásszal terhelt gondolkodást.

**Mi változott most.**
1. A V3 szabálykönyve (`CLAUDE.md`) **rövidebb és feladathoz kötött**: 16 880 bájtról 12 492 bájtra
   (ez bájt, nem szó-egység); ami eddig egy tömbben állt, az most egy forrásindexben van, amit csak
   akkor kell megnyitni, ha a feladat kéri. Az egymásnak ellentmondó szabályok rendezve (alább).
2. **Új szabály: minden parancs első sora a repó.** Alapból csak a V3 repó van csatolva. Hogy kell-e
   a V2, azt a Claude-v3 vagy a chatgpt-v3 mondja meg, indokkal — nem az operátor.
3. **Egy összefüggő munkacsomag = egy új Claude-beszélgetés.** Nem minden board-sorszámhoz kell új
   beszélgetés; de egy nagy csomag elején igen, mert a régi beszélgetés poggyásza nem csökken magától.
4. **Van egy mérő**, ami egy paranccsal megmondja, mennyit fogyasztott egy beszélgetés — tartalom
   nélkül, csak számokkal. A körönkénti „usage” melléklet megszűnik; helyette a csomag végén egy sor.
5. **A board-üzenet küldése a V3 repóból is működik** (eddig egy hiányzó fájl miatt nem ment).

**Mit kell tennie az operátornak (rövid lista, ennyi):**
- Az R66 utáni **következő nagy munkacsomagot új Claude-beszélgetésben** indítsa (ezt a mostanit
  zárja le). A csomag SPEC-je a chatgpt-v3-tól jön, első sorában a repóval.
- A gépén a szokásos terminál-blokkot futtassa (a CLAUDE.md 2. szakasza) — `main`-en, a szokott módon.
- Usage-képernyőképet és körönkénti fogyasztási mellékletet **nem kell** többé csatolnia.

---

## 1. Mi készült el, fájlonként

| fájl | mi történt |
|---|---|
| `CLAUDE.md` | átírva: rövid munkarend (1. szakasz) + terminál-blokk (2.) + FORRÁSINDEX (3.) + KUKA-elővétel (4.) + kiadás/környezet/könyvtárrend röviden (5.). **16 880 → 12 492 bájt.** Minden verifier-követelmény (KUK04–KUK06, DHT06) zöld. |
| `tools/v3_fogyasztas_meres.mjs` | ÚJ — FGY-01 fogyasztásmérő (5. csomag), `--selftest` ellenpróbákkal |
| `package.json` | `meres:fogyasztas` (a mérés) · `verify:fogyasztas-meres` (a hét ellenpróba, a söprés része) |
| `tools/vs_board_round.mjs` | a mátrix-katalógus behúzása KÉSLELTETETT: a kör-üzenet (`reply`) katalógus nélkül megy; a zárás nevezett hibával mondja ki, hogy a V2 repóból futtatható |
| `DECISION_LOG.md` | D-VS-3066 |
| `v3ref/source-documents/R65_board_v1.md` | a SPEC szó szerint |
| ez a lap + HTML | a REPORT |

A commit azonosítója a board-üzenetben és a git-történetben áll (a lap írásakor még nem született meg;
a lap nem hazudhat számot — KUKA-082).

## 2. Az ellentmondások rendezése a CLAUDE.md-ben (1. csomag)

| régi alak | mi ütközött | az új szabály |
|---|---|---|
| „Kör vége előtt TELJES söprés” | az R63 §5 indokolt újrahasználata (a többperces külső lánc nem fut újra változatlan magra) | a söprés a **csomag végén** teljes, közben célzott; a külső lánc eredmény-fájlját és commit-SHA-ját hivatkozzuk |
| terminál-blokk: `git checkout main` | az ügynök kijelölt fejlesztői ága | a blokk az **operátor gépén** fut; az ügynök a kijelölt ágon marad, `main`-re nem vált — más gép, más szerep |
| kiadási menetrend (4. szakasz) | a kör átadása (board + REPORT) | a kettő külön: a kiadás a migrációk/verziók rendje, a kör átadása a board-üzenet + REPORT; egyik sem helyettesíti a másikat |
| „a lap a boardra a `vs_board_doc.mjs`-sel megy” (a kör-üzenetről hallgatott; a zárásról azt sugallta, hogy innen is megy) | a valóság: a kör-üzenet eszköze ebben a repóban a megírása óta HALOTT volt (hiányzó katalógus-fájl), a zárás mátrixa pedig a V2 katalógusához kötött | kimondva: **ebből a repóból lap és kör-üzenet megy** (a `CHATOPS_WRITE_TOKEN` a környezetben áll — mérve, nem jogbővítés); **a zárás nem**, és az eszköz ezt nevezett hibával mondja |

Ami a régi fájlból **kimaradt, és miért:** a hosszú operátori idézetek (a tanulság maradt, az idézet
a döntésnaplóban él) · a KUKA őr-otthon táblázata (egy mondatra rövidítve, a gépi jel ugyanaz) · a
kiadási menetrend és a könyvtárrend prózai kifejtése (a gépi őr a részlet: `verify:release-order`,
`verify:artifact-naming`). **Semmi olyan nem maradt ki, aminek ne volna gépi jele vagy kimondott
helye** — ezt a `verify:kuka` 324/324 zöldje méri, nem az ígéretem.

## 3. Mit örökölnek az ügynökök — a naplóból és egy kontrollpróbából (2. csomag)

**Forrás:** a munkamenet átiratai (`~/.claude/projects/<projekt>/<munkamenet>.jsonl` és a
`<munkamenet>/subagents/**`, `workflows/**` alatti al-átiratok), R64-ben mérve; plusz KÉT minimális
kontrollpróba (egy `Explore` és egy általános ügynök, egyszavas válasz, eszköz nélkül).

| mit kap az ügynök | általános (`general-purpose`, workflow) | `Explore` / `Plan` |
|---|---|---|
| a repó-utasítások (mind a három csatolt repó `CLAUDE.md`-je EGY mellékletben) | **igen** — 230 216 karakter, az első üzenetében (mérve 43 al-ügynökön) | **nem** — a kontrollpróba átiratában egyetlen ilyen melléklet sincs (közvetlen megfigyelés) |
| a fő szál beszélgetése | **nem** — csak a neki írt feladatot kapja | nem |
| a saját rendszer-utasítás (`prompt_snapshot`) | 130–144 ezer karakter | hasonló nagyságrend |

**A csökkentés, amit TÉNYLEGESEN alkalmaztunk** (támogatott beállítással, kötelező utasítás
megkerülése nélkül):
- a V3 gyökér-fájl rövidítése (16 880 → 12 492 bájt) — az egyetlen, ami a repóból állítható;
- a szabály, hogy a V2 repó alapból NINCS csatolva (a 230 216 karakteres mellékletből 222 614 bájt
  a V2-é) — ez a SPEC repó-sorával érvényesül, nem a keret átállításával;
- csak-olvasó részfeladatra `Explore` ügynök (nem kapja a mellékletet) — közvetlen megfigyelés.

**A megfigyelés határa, kimondva:** a keret verziója a `session` adataiból (`claude-fable-5-1`,
Claude Code felhő-környezet); a mellékletet az al-ügynök első üzenetének `attachments` mezőjéből
olvastuk, a fő szál átiratában ugyanez a melléklet 11-szer jelent meg (összesen 2,4 M karakter, R64).
Hogy a keret MÁS környezetben ugyanígy viselkedik-e, azt nem mértük.

**Kontrollpróba a rövidített fájllal (általános ügynök, egyszavas válasz, eszköz nélkül) — közvetlen
megfigyelés:** a repó-utasítás melléklete **224 761 karakter** (előtte 230 216), benne továbbra is
mind a három csatolt repó gyökér-fájlja; az ügynök első hívásának cache-olvasása **157 023 token**
(rendszer-utasítás + melléklet együtt). Tehát a V3-fájl rövidítése a mellékletet ~5 500 karakterrel
csökkentette — a maradék 97%-a a V2 gyökér-fájlja: **a csatolt V2 a tétel, nem a V3 fájl**, és ezért
a repó-sor szabálya (1. csomag) ér többet, mint bármilyen további V3-rövidítés.

## 4. Az ébresztések — forrás, modellhívás, kerülő munkarend (3. csomag)

**Forrás, mérve:** a Stop-hook a `~/.claude/launcher-settings.json` fájlban áll (KÖRNYEZETI, nem
projekt-szintű beállítás; a repóban nincs `.claude/settings.json`), és a
`~/.claude/stop-hook-git-check.sh` szkriptet futtatja: ha a munkafán commitolatlan, követetlen vagy
feltolatlan változás van, 2-es kóddal „commitolj és pusholj” üzenettel ÉBRESZTI a modellt. A
háttér-értesítések a háttérben futó ügynökök/parancsok befejezéséből jönnek (a keret sajátja).

**Modellhívás, az R63 ablakban (R64-ben mérve, egyszeri szkripttel az átiratból):**

| ébresztés fajtája | darab | modellhívás utána | bemenet (cache-olvasással) |
|---|---|---|---|
| Stop-hook („commitolj”) | 11 | 174 | 63,6 M token |
| háttér-értesítés | 12 | 143 | 87,4 M token |
| operátori üzenet | 10 | 75 | 42,3 M token |

**Amit a repóból NEM lehet állítani, kimondva:** a hook és az értesítés a környezeté; a repó
projekt-beállításából nem kapcsolható ki, és **nem is állítjuk, hogy kikapcsoltuk**. A hook maga
hasznos jel (feltolatlan munka), a baj az volt, hogy a KÖZTES futások (mérés-kimenetek, ideiglenes
fájlok) újra és újra követetlen fájlt hagytak, ezért a hook üresen is ébresztett.

**A kerülő munkarend, ami a repóból ÁLL:** minden köztes kimenet `var/` alá megy (gitignore — a hook
nem látja); a csomag EGY záró commitot és egy pusht kap, nem lépésenként; háttér-ügynök csak
szétválasztható részfeladatra (kevesebb értesítés). A CLAUDE.md 1. szakasza hordozza.

## 5. A V3 board-üzenet eszköze (4. csomag)

A `tools/vs_board_round.mjs` a megírása óta ebben a repóban indulni sem tudott: a 25. sorban a
mátrix-katalógust (`tools/chatops-board/src/frmCatalog.js`) húzta be, ami a V2 repóé. A javítás
MINIMÁLIS: a behúzás késleltetett, csak a zárások (`close-cmd/-step/-pr`) kérik; a `reply` · `cmd` ·
`open` · `status` nélküle megy. A katalógust és a sáv-listát **nem másoltuk át** (egy otthon).

Negatív próbák titok nélkül, a lap írása előtt lefuttatva:
- nincs `CHATOPS_*` a környezetben → „HIÁNYZIK: CHATOPS_BASE_URL és/vagy CHATOPS_WRITE_TOKEN”, kód 2;
- van környezet, zárás katalógus nélkül → nevezett hiba a katalógus útjával és a teendővel, kód 2;
- `reply` hiányzó szöveg-fájllal → „HIBA: ENOENT …”, kód 1, hálózati hívás nélkül.

A pozitív út **ennek a jelentésnek a feltöltése** (lap + kör-üzenet), ebből a repóból — teszt-kört
nem gyártottunk. Az eredmény a board-üzenetben.

## 6. A fogyasztásmérő és az egyértelmű számok (5. csomag)

**Eszköz:** `npm run meres:fogyasztas -- --session <azonosító> --from <ISO> [--to <ISO>]` →
`var/reports/v3_<verzió>_<dátum>_<idő>_fogyasztas.json` (`artifactPath`, kézi név nincs). A kimenet
**tartalom nélküli**: munkamenet-azonosító · időablak · fajta (fő szál / al-ügynök / workflow) ·
modell · hívások · friss bemenet · cache-írás · cache-olvasás · kimenet · fő-szál kontextus
medián/max · lefedettség (hány átirat, hány sor maradt feldolgozatlan) · a bemeneti fájlok sha256-ja ·
a megismétlő parancs. A `var/` gitignore-olva: a repóba nem kerül.

**Hét ellenpróba (`npm run verify:fogyasztas-meres`, a söprés része), az R65 ellenpéldáira:**
FGY-T1 ismételt/streamelt rekord nem duplázódik · T2 köztes usage nem vész el · T3 idézett régi kör
nem tolja az ablakot (csak a hívás időbélyege számít; a szöveget a mérő nem is olvassa) · T4 usage
nélküli és hibás sor nem hívás · T5 idegen munkamenet kizárva, saját al-ügynök benne (a valódi
könyvtár-rendben — az első alakom fixtúrája rossz mappa-rendet épített, ezért PIROS volt; a hibát a
próba fogta, javítva) · T6 medián · T7 a küszöb a MÉRT értéken billen. 7/7 zöld.

**A számok, egy futásból (ez a munkamenet, 49 átirat, 3007 hívás, lefedettség teljes):**

| | teljes munkamenet | R63/R64 ablak (2026-09-20T10:14:51Z-től) |
|---|---|---|
| első → utolsó hívás | 2026-09-17 14:55 → 2026-09-20 18:09 (UTC) — **3 nap 3 óra** | 2026-09-20 10:15 → 18:09 — **8 óra** |
| hívás | 3 007 | 920 (fő szál 255 · workflow 595 · al-ügynök 70) |
| cache-olvasás | 1 260,98 M | 271,39 M (fő szál 125,8 M · workflow 128,0 M · al-ügynök 17,6 M) |
| cache-írás | 25,85 M | 16,85 M |
| friss bemenet | 30 668 | 26 494 |
| kimenet | 1,95 M | 424 ezer |
| fő-szál kontextus medián / max | 480 004 / 855 599 (1459 hívás 400 ezer fölött) | 521 269 / 782 357 (179 hívás 400 ezer fölött) |
| modell | — | Fable 5.1: 909 hívás · Opus 5: 2 hívás (a váltás előtti pillanat) · 9 szintetikus (nulla) |

**A „4 nap” és az „1–2 nap” tisztázása:** a munkamenet 2026-09-17 délután indult és 09-20 estig
tartott — ez naptárilag négy napot érint, de 3 nap 3 óra hosszú; az operátor „1–2 napos” érzése a
legutóbbi két nap intenzív körére (R55–R64) igaz. A R63/R64 ablak ebből 8 óra, és önmagában a teljes
cache-olvasás 21,5%-át adta. **A két szám két külön kérdésre felel, és nem cserélhető össze.**

**Az R64-es állításokhoz mérve:** az R64 lap 2 980 hívást és 1 245,7 M cache-olvasást írt; a mai
futás 3 007 / 1 260,98 M — a különbség az R64 utáni, ebben a körben történt hívás (a mérés
megismételhető, az eltérés magyarázott, nem hiba). Az R64 „90%” alakú megfogalmazását itt NEM
használjuk: az egyetlen mérhető állítás, hogy a workflow-ügynökök adták az ablak hívásainak 65%-át
és cache-olvasásának 47%-át.

**Kísérleti jelzők (nem szabály):** fő-szál medián > 200 000 → ÁTLÉPVE (521 269) · ügynök-bemenet
> 40 M / csomag → ÁTLÉPVE (158,25 M). Ezek a MAI mérésen billennek; a küszöb helyességét egy csomag
után nézzük újra. **Megtakarítást nem állítunk:** a következő csomag más feladat lesz, egyenlőtlen
feltételek mellett a két szám összevetése nem bizonyíték (R65 §5).

## 7. Tartós átvezetés (6. csomag)

- **CLAUDE.md 1. szakasz:** a SPEC repó-sora · egy csomag = egy munkamenet · a söprés rendje · a
  párhuzamos ügynök szabálya · a mérő · a board tényleges hatóköre.
- **D-VS-3066** a döntésnaplóban.
- **A parancssablon sora (a chatgpt-v3 SPEC-jeinek fejlécébe, szó szerint):**
  `Repó: valach-family/valach-system. · Csomag: megszakítás nélkül, egy munkamenetben. · Forrásátadás: a régi munkamenet mérés-forrásai a v3ref/source-documents/ alatt, a záró REPORT commitolva.`
- **Nem készült külön dokumentum alpontonként** — ez az egy lap + a döntésnapló + a CLAUDE.md.

## 8. Célzott próbák és söprés

Célzott: `verify:kuka` 324/324 · `verify:doc-html` 9/9 · `verify:artifact-naming` 28/28 ·
`verify:decision-numbers` 4/4 · `verify:fogyasztas-meres` 7/7 · a board-eszköz három negatív próbája
· a mérő éles futása.

**A teljes `verify:sweep` (13 verifier, 20 perc 27 mp):** 10 zöld · 0 env-kihagyás · 1 piros · 2 a
söprés türelmén (900 s) belül nem fejeződött be. **Mind a három nevesítve, és egyik sem ebből a
körből való:** (1) `verify:capability-witness` PIROS — két rögzítés (`v3-ui-slice` ·
`v3-vertical-slice`) a V2 board-regiszterében „absent”, a tanú mérve „present”; a rögzítés otthona a
`valach-family/vs` repó, amit az R65 tilt módosítani — ugyanez állt az R64 lapján, **operátori teendő
a boardon** (a két rögzítés átbillentése); (2) `verify:external-checks` és `verify:v3ref` a söprés
türelmén túl futott — a mag ebben a körben NEM változott, ezért külön NEM futtattuk újra: az R64
eredmény-fájljai és commitja (`64d1983`) az érvényes bizonyíték (R63 §5, most a CLAUDE.md-ben).

## 9. Amit NEM tudtunk módosítani, és amit nem állítunk

- A Stop-hook és a háttér-értesítés: környezeti beállítás, a repóból nem állítható (4. szakasz).
- A keret viselkedése más környezetben (helyi CLI, más felhő-beállítás): nem mértük.
- Hogy a rövidebb CLAUDE.md hány tokent takarít meg ügynökönként: a bájt nem token; a kontrollpróba
  a melléklet karakterszámát és az első hívás cache-olvasását adja (3. szakasz), a csomag-szintű
  hatást egy következő csomag mérője mutatja meg.
- Nincs merge, telepítés, V2-módosítás, új modul, fizetős szolgáltatás, teljes mag-átvétel.

## 10. V2-átadás — rövid, bizonyítékhoz kötött (a Claude-v2 sávnak, NEM végrehajtva)

- **Alkalmazott beállítás (V3):** rövid gyökér-fájl + forrásindex; a V2 alapból nincs csatolva; a
  köztes kimenet `var/`-ba; egy csomag = egy munkamenet; a mérő a söprésben.
- **Megfigyelt hatás (V3, ebben a körben):** a mérő lefut, a jelzők átlépve — a hatás csak a
  KÖVETKEZŐ csomagon lesz mérhető; ma csak a mechanizmus bizonyított, a megtakarítás nem.
- **Korlát:** a V2 gyökér-fájlja 222 614 bájt, és MINDEN általános ügynöknek betöltődik, amíg a V2
  csatolva van — ez a legnagyobb egyedi tétel; a V3-ból nem javítható.
- **Módszer a V2 CLAUDE.md rövidítésére tartalomvesztés nélkül** (a V3-ban már megtörtént,
  D-VS-3031): a KUKA-tábla karakterre változatlanul egy archívum-lapra (`docs/KUKA_ARCHIVUM.md`
  mintájára), a gyökér-fájlban csak a feladathoz kötött elővétel-tábla + a rövid szabályok;
  a verifier (a V2 `verify:kuka` párja) méri, hogy minden azonosító feloldható és egyetlen sor sem
  csonkult (KUK04), és a gyökér-fájlnak plafonja van (KUK06). A V3-ban ez 16 880 bájtra hozta a
  fájlt egy körben, most 12 492-re. **A V2-ben ezt a Claude-v2 végzi, saját körben, saját méréssel.**
