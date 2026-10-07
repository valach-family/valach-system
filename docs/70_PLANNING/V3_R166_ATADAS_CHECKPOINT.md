# V3 · R166/0 — ÁTADÁSI CHECKPOINT (a RÉGI munkamenet zárása)

**Kör:** `CMD-VS-300-002-002 R166 — DECISION` (chatgpt-v3, az operátor felhatalmazásával)
**Végrehajtó sáv:** Claude-v3 · **Ág:** `claude/r154-audit-fix` (célág: `claude/ecstatic-fermi-8c23co`)
**Ez a lap NEM jelentés.** Az R164 záró jelentése: `docs/70_PLANNING/V3_R164_AUDIT_REPORT.md`.
Ez a lap csak azt írja le, amit az **átvevő** munkamenetnek tudnia kell az induláshoz.

---

## 1. A PONTOS FEJ, ÉS AMIT HORDOZ

| | |
|---|---|
| **átadott fej** | lásd a `git log -1` kimenetét ezen az ágon — ez a lap ÉS a jelentés javításai együtt vannak benne |
| **a review által fedett fej** | `3fea359` (ezt olvasta vissza az R166 is; azon a fejen a kód- és biztonsági review 12:46 UTC óta futott) |
| **ág** | `claude/r154-audit-fix` — **ugyanaz a PR (#1), ugyanaz a javítási ág**; a célág `claude/ecstatic-fermi-8c23co` |
| **nyitott review-szál** | **nincs.** Hét kör 31 megjegyzése megválaszolva és lezárva |
| **futó mérés** | **nincs.** Minden háttér-folyamat lezárult; részleges mérés nem írt felül teljes bizonyítékot |

**A RÉGI ÍRÓ EZZEL LEÁLL.** Ebben a munkamenetben több írás nem indul: sem új funkció, sem új
feltárás, sem újabb hosszú lánc.

---

## 2. AMI KÉSZ, ÉS MÉRT BIZONYÍTÉKKAL ÁLL

A soronkénti tábla a jelentés 1., 1.1 és 9.1 pontjában áll. Röviden:

- **`verify:browser-gate` ZÖLD** a `460d8ca` fejen: 840 s · 122 helyzet teljesült / 0 bukott /
  0 ingadozó / 0 kihagyott · 22 próba-fájl. Azóta csak a futás írta két bizonyíték-lap változott.
- **`proof:pg-intent` ZÖLD** (10 állítás, mindkét tárolón, 0 eltérés) · **`proof:pg-restore-safety`
  ZÖLD** (43/43) · **`proof:pg-durability` ZÖLD** (13/13) — mind valódi PostgreSQL **16.15**-en.
- **a húsz rövid `verify:*` lánc ZÖLD**, köztük `verify:kuka` **859/859** és a lelet-battéria
  **242/242**; a `verify:lefedes` nevezett pirosával.
- **`verify:v3ref` ZÖLD** a `c2cccd1` fejen (253/253 elkapva, 0 túlélte); a mag KÓDJA azóta nem
  változott — mérve: a `v3ref/` diff csak bizonyíték-fájlokat ad.

---

## 3. AMI HIÁNYZIK — AZ R166 FELADATAI, ÉS HOL ÁLL MA A FOGÓDZÓ

| R166 pont | mi a teendő | mi áll ma készen hozzá |
|---|---|---|
| **1. meghívóképernyő vissza/kilépés** | működő visszalépés és kijelentkezés a meghívóképernyőről, minden meghívó-állapotra, minden nyelven | a **pontos ok**, amiért ma nincs böngészős mérése, a jelentés 8/7. tételében áll (a meghívó-képernyő a teljes héjat lecseréli, ezért nincs profil-menü és kilépés-vezérlő). A közös elfelejtő (`forgetInvite`) a beváltás ágán MÉRVE van |
| **2. valódi két szereplős bejárás** | a tényleges felületen, valódi HTTP-vel és tárolóval, asztali ÉS 390 px nézeten | a `D-VS-3199` felületfüggő elrejtés **nem teljesíti** ezt (ezt a jelentés összverdiktje ma kimondja). A `proof:demo-walk` a SZIMULÁLT adapteren visz végig — pontos jelöléssel. A három valódi művelet (visszavonás · eltávolítás · visszahívás) a héj próbájában, a határon mérve |
| **3. mind a 19 pótolható lefedési hiány** | pótolható hiány 0, osztályozatlan 0 | a gépi leltár és a kettéosztás kész: `npm run verify:lefedes` → `classifyGaps` · a mai állás 19 pótolható · 1 fejlesztési rés (`page:personal`) · 0 osztályozatlan. A `gap_classes` blokk a JSON-ban áll |
| **4. HAT külső program** | `r57a` · `r59` · `r57` · `r55` · `r53` (nem futott) **és** `r59a` (időtúllépett) | a futtatás módja: `node v3ref/external-checks/run-all.mjs --only <prog>` — **egyenként**, párhuzamos terhelés nélkül. A részleges futás verdiktje SOHA nem a lánc összverdiktje (a futtató ezt maga mondja ki). Az `r59a` naplója szerint a darabolás 40 → 80 egységre finomított, és a 80 **belefért** a 15 000 ms-os korlátba — a program mint EGÉSZ lépte túl a futtató 30 perces keretét |
| **5. záró mérés + EGY jelentés** | a board-lap, a kör-üzenet és a PR összefoglaló ugyanazt mondja | a jelentés szerkezete áll (EGY állapottábla); az R166 nevezett szöveghibája (a 2.3 `E4e` sor) **javítva**, és az összverdikt is javítva **RÉSZLEGES**-re |

---

## 4. A HELYI PostgreSQL ÚJRAINDÍTÁSA — TITOKMENTES LEÍRÁS

A konténer **eldobható**: egy friss munkamenetben a klaszter nincs meg, újra kell építeni. Jelszó
nincs és nem is kell: a klaszter **csak a hurok-címen** hallgat, `trust` hitelesítéssel, szintetikus
adattal. **Ez nem éles adat és nem felhős kiszolgáló.**

```bash
export PATH="/usr/lib/postgresql/16/bin:$PATH"     # a binárisok NEM a PATH-on vannak
mkdir -p /home/user/vs_pg_proba/data /home/user/vs_pg_proba/sock /home/user/vs_pg_proba/log
initdb -D /home/user/vs_pg_proba/data -U vsproba --auth=trust
pg_ctl -D /home/user/vs_pg_proba/data -l /home/user/vs_pg_proba/log/pg.log \
  -o "-p 55432 -k /home/user/vs_pg_proba/sock -c listen_addresses=127.0.0.1" start
createdb -h 127.0.0.1 -p 55432 -U vsproba vs_proba_fo
DATABASE_URL="postgres://vsproba@127.0.0.1:55432/vs_proba_fo" npm run db:migrate   # 41 tábla
```

A láncok ezzel a címmel futnak (`DATABASE_URL` a környezetben, **nem** parancssori paraméterként):

```bash
DATABASE_URL="postgres://vsproba@127.0.0.1:55432/vs_proba_fo" npm run proof:pg-intent
DATABASE_URL="postgres://vsproba@127.0.0.1:55432/vs_proba_fo" npm run proof:pg-restore-safety
DATABASE_URL="postgres://vsproba@127.0.0.1:55432/vs_proba_fo" npm run proof:pg-durability
```

**EGY MÉRT CSAPDA, hogy ne ismétlődjön:** a tartóssági láncot a klaszter **migráció nélküli**
karbantartó adatbázisára irányítva nevezetten elakad (`relation "subject" does not exist`, `42P01`).
Nem a kód bukik — a mérés rossz. A migrált adatbázist kell megadni (fent).

---

## 5. A FOGYASZTÁS-LELTÁR ÉS A MÉRÉS

- **tartalom nélküli leltár a repóban:** `docs/70_PLANNING/V3_R164_FOGYASZTAS_LELTAR.json`
  (hívás-szám, blokk- és eszköz-összesítők, bájtszámok — tartalom, kapcsolati cím, kulcs és e-mail
  nélkül; titok-minta ellenőrzéssel 0 találat).
- **a záró mérés:** 992 hívás · fő-szál kontextusmedián **388 389,5** · max **783 667** ·
  ügynök-bemenet **0** (nulla al-ügynök) · lefedettség **teljes**.
- **a sáv a záráskor FIGYELMEZTETÉS**, de a határt a munkablokk közben átléptük (483 hívás 400 ezer
  fölött, egy korábbi pillanatkép 407 559). Ezért indul a folytatás **friss beszélgetésben**
  (`D-VS-3083`) — pontosan ahogy az R166/0 kéri.

---

## 6. AMIT AZ ÁTVEVŐ CÉLZOTTAN OLVASSON — ÉS AMIT NE

**Olvasd:** ezt a lapot · `CLAUDE.md` · `v3ref/source-documents/R166_board_v1.md` (ez a parancs
szó szerint) · `v3ref/source-documents/R164_board_v1.md` · a jelentés **1., 5.3, 7.6, 8. és 9.1**
pontját. **A teljes történet betöltése nem szükséges**, és a V2 repó csatolása sem.

**Ne:** ne tekintsd bázisnak a célágat, ha az régi `main`-ből indult — a PR aktuális fejére épülj,
**force-push nélkül**. És ne induljon második író, amíg ez a munkamenet aktívnak látszik — ez a lap
a jele, hogy **leállt**.
