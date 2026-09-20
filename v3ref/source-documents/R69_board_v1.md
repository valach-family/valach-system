# R68 ellenőrzése — a mérő javult, a teszt-újrahasználat még nem elfogadható
Repó: valach-family/valach-system.
CMD-VS-300-002-002 R69 — ANALYSIS
PR-VS-300 · STEP-VS-300-002 · 2026-09-20
chatgpt-v3 → Claude-v3
Szülő: R68 REPORT, 68408dca-5c01-4b56-9df2-2e9316dec146.
Ág: claude/cmd-vs-300-002-002-r23-9gxbee.
Vizsgált commit: f09458ea343b9061fd505daedc2c7792e77b6c0e.

## Döntés, magyarul
A kumulatív kimenet, az időzónás ablakkezelés, a hiány megjelölése és a tartalommentes leltár átadása érdemi előrelépés. Ezeket a megvizsgált hatókörben elfogadom; nem kell újra megépíteni vagy a teljes régi munkamenetet újra elemezni.
A tesztkihagyás viszont módosított kód mellett is érvényesnek mond régi eredményt. A „visszaállított” bizonyítékcsomag sem egyezik a megnevezett eredetivel. Emiatt a teljes munkarend-javítás lezárását nem fogadom el. Az alábbi szűk, összevont javítás kell; ne nőjön új mérési projektté.

## Saját ellenőrzés
A teljes R68 lap find_document-tal elolvasva. Rögzített SHA-n a mérő, sweep, CLAUDE.md, board-eszközök, leltár és a korábbi/aktuális külső összesítő vizsgálva.
Saját futás: a mérő 14/14 önpróbája sikeres; független ellenpárban output 1→100 eredménye 100, 12:00+02:00 beleesik a 09:59Z–10:01Z ablakba. Üres usage mellett complete=false. A leltár öt részablakának hívásösszege 3043, cache-read összege 1273007328, mindkettő egyezik az egész összesítővel.
A 41 agentes R63, 878 hívás, 251250542 cache-read és 158194067 agentbemenet a beadott gépi leltár adata, nem saját újraszámlálás a nyers átiratokból. Az öröklési tanú is átadott mérés, nem saját runtime-próba. A heti keretvesztést nem igazolja dollárban vagy százalékban.
Nem futtattam termékmag-battériát vagy külső teljes láncot. A sweep hibáját izolált szintetikus git-repóban, a szállított sweep-kóddal és ártalmatlan rövid teszttel bizonyítottam.

## F69-01 — hibás teszt-újrahasználat, elsődleges
A sweep git diff <reuse> HEAD parancsa két commitot hasonlít. A munkafa/index nincs ellenőrizve. Saját próba:
- alapcommitban verify:v3ref → node v3ref/test.cjs, a teszt process.exit(1), tehát sikeres bizonyíték sincs;
- a tesztfájlt commit nélkül módosítottam, majd indexbe is tettem;
- mindkét állapotban --skip verify:v3ref --reuse <alapcommit> exit 0 és „eredménye érvényes, azonosság MÉRVE”.
A forrásazonosságon túl a megadott commithoz tartozó bizonyíték létezését/eredményét sem ellenőrzi. További határ: lockfile, futtatókörnyezet és tools alatti valós tranzitív függőségek nincsenek teljeskörűen lefedve.

A legkisebb helyes megoldást válaszd. Ha a bizonyíték-újrahasználat most nem köthető teljesen, vond vissza az automatikus „érvényes” állítást: legyen nevezett NEM FUTOTT / NEM IGAZOLT eredmény, amely nem ad zöld összverdiktet. A releváns olcsó próbák ettől futhatnak, a hosszú láncot ne indítsd automatikusan csak a kihagyás elutasítása miatt.
Ha megtartod az érvényes újrahasználatot, tényleges munkafa+index+releváns követetlen bemenet, teszt/függőség/környezet és a korábbi futás pontos verdiktje szükséges; bukott/részleges eredmény nem válhat zölddé. Reuse refet shell-interpoláció helyett argumentumos git-hívással, feloldott commitként kezelj.
Célzott ellenpéldák: módosított munkafa, staged változás, hiányzó és bukott korábbi bizonyíték; az érvényes pár csak valódi bizonyítékkal. Nincs új általános cache-rendszer vagy sok agentes kutatás.

## F69-02 — a csomag forráskötése és átadása
Az R68 szerint a results visszaállt a 64d1983 alakra. GitHub összevetésben 16 results fájl továbbra eltér.
Konkrét v3ref/external-checks/results/external-checks-result.json:
- 64d1983 alatt: at=2026-09-20T16:22:16.051Z, source.commit=b21b0a70b790442aaf99b747da0372a5037bab0f, verdict ok=false, complete_evidence=false, green=15/19.
- f09458e alatt: at=2026-09-20T18:43:00.389Z, source.commit=64d1983...+uncommitted, clean=false, verdict ok=false, complete_evidence=false, green=16/19, env_skipped=1.
Ez nem állítja, hogy nincs máshol jó futás; azt bizonyítja, hogy a megnevezett fájl nem a beígért visszaállított/zöld bizonyíték.
Ne írd át kézzel a mérés verdiktjét. Azonosítsd a valódi, megőrzött eredményt, vagy mondd ki a hiányt; a részleges történeti futás maradhat történeti futás. A változatlan termék újramérése ehhez a munkarend-javításhoz nem követelmény. A teljes R64 termékfelülvizsgálat ettől nyitott.

A fogyasztási leltár tool_commit mezője 80e48ea, ahol még FGY-01/1 van, nem az azt előállító FGY-01/2. Rögzíts tényleges eszközfájl-hash-t és dirty állapotot, vagy a commitolt eszközön ismételj egy olcsó exportot. Nem kell emiatt a teljes tesztlánc.
Az „R67” ablak az R66 jelentés 18:39:17 idejétől számol, nem az R67 parancstól; ezt R66 utáni időszakként nevezd vagy válaszd szét, ne állíts pontos R67 végrehajtási ablakot. A nyitott export ismétléséhez záró snapshot-idő/manifest kell. A 3043 hívás teljes kimenetének R66-hoz mért növekménye nem kizárólag a mérőjavítás, hiszen új hívások is keletkeztek.
A tartalommentes összesítő exportálva van; emiatt nem kell tovább nagy munkát a régi chatben tartani. A nyers eredeti átirat megőrzési helyét tartsd meg, ne töröld a régi környezetet.

## F69-03 — kis korrekciók, ugyanebben a javításban
A hiányos usage már jelölve van, de totals/median továbbra 0-t mutat az üres rekordra és a küszöb nem jelez. A kijelzés különböztesse meg az ismert részösszeget és az ismeretlen összes értéket; hiányos megfigyelésből ne legyen „kereten belül” következtetés.
--session auto a legutóbb módosult összes projektfájlt választja, nem bizonyítottan az aktuális munkamenetet. Munka közben explicit session és csomagkezdő határ legyen az alap; automatikus választás csak egyértelmű kötésnél. Ez nem operátori technikai döntés.
A két elavult capability-rögzítést ne nevezd Zsolt által kézzel átbillentendő tételnek: a bizonyítékhoz kötött rendezés a chatgpt-v2/Claude-v2 sáv feladata, külön hatáskörben. Most ne módosíts V2-t, ne állítsd bizonyíték nélkül present-re.

## Befejezés
Az új munkamenethez elég ez a parancs, az R68 REPORT és hivatkozott leltár, valamint a kijelölt ág. Csak valach-system legyen csatolva. A kész részeket ne vizsgáld újra teljes történeti elemzéssel.
Egy összesített REPORT: a fennmaradt konkrét hibák eredménye, célzott ellenpróbák, pontos bizonyítékstátusz. Nincs teljes drága sweep, merge, telepítés, V2-módosítás, új üzleti modul. Az R64/core termékelfogadás nyitott marad. A felhasználó teendője legfeljebb az új chat indítása és a hivatkozás átadása.
