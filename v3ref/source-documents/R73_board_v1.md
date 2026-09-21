# R73 — induló kontextus és növekedés: okfeltárás ÉS tényleges javítás
Repó: valach-family/valach-system
CMD-VS-300-002-002 R73 — ANALYSIS
PR-VS-300 · STEP-VS-300-002
chatgpt-v3 → Claude-v3
Szülő: R72 REPORT, bab55f98-e8b1-42b8-9605-25e5eebf443f.
Ág: claude/compassionate-cerf-asuv7s; vizsgált export: 0aac660.
Operátori felhatalmazás: „Akkor tudjuk meg, hogy mi volt az óriási induló keret, és mivel duplázódott meg, aztán javítsuk!”

## Eredmény, amit kérünk
Egy összefüggő csomag: az induló teher forrásának azonosítása, a növekedés bontása, a saját hatáskörben elérhető okok javítása, rövid előtte/utána bizonyíték. Nem újabb általános tanács vagy puszta export. A nagy koherens feladatok megtartandók; ne bontsd tíz kis körre, ne tiltsd általánosan az indokolt párhuzamosságot. Ehhez a szűk vizsgálathoz nem kell alagent.

## Ellenőrzött alap és az export korlátai
Az R70 lezárt 47 hívásának összege egyezik: input 1474, cache-write 428306, cache-read 15297264, output 94955.
Első input_sum 219567, utolsó 454751, növekedés 235184; nincs csökkenés.
Induló instructions fájltartalmak: V3 CLAUDE.md 16879 B, hash ecf6e279d5153e7096440bf2b73eaf4acbac9252a6e86d16dc525ecf10f21d91; kitakart külső út 334392 B, hash 76eacfe7845c3540daaf6d4fa26eff8abd7983cfed6c0736d2af07188c4ac3b3. A külső fájl V2-azonossága az exportból még nem bizonyított, a 222 kB-os korábbi magyarázat nem helyettesíti ezt.
Az első és második hívás közötti 152226 B melléklet prompt_snapshot (cliPrefix/systemPrompt/tools), NEM instructions. A snapshot naplózása nem bizonyít új, hozzáadott promptszöveget.
Az exportáló csak a calls rekordokat szűri az időablakra; az events és az ezekből számolt összesítők későbbi eseményeket is tartalmaznak. A repeated_path_read az input.file_path/path mezőket számolja, Bash-olvasást nem lát, sőt Write-ot is olvasásnak kezelhet. „Ismételt olvasás nulla” nem bizonyított. A blokk-bájtok streamelt ismétlésekkel is duplázódhatnak. Ezeket célzottan rendezd ugyanebben a csomagban; nem új keretrendszer.

## 1. Induló teher — pontos forrás és betöltési út
A meglévő helyi átirat/indítási metaadat alapján azonosítsd a 334392 B fájlt: biztonságos repónév + relatív út, az induló tartalom hash-e, milyen csatolás/import/gyökérkeresés hozta be. Nézd meg, egyetlen fájl vagy összeállított tartalom-e. Ne a mostani állapotból következtesd vissza a régit.
Az induló utasításokat helyben, programmal bontsd szakaszcím + méret + hash formára: kötelező munkaszabály, történeti lista/napló, feladatfüggő forrás, esetleges többszörös beillesztés. Teljes nagy szöveget ne tölts modellbe.
Külön kezeld az utasításokat, rendszerpromptot, eszközsémákat, skill-/agentlistákat és az esetleges áthozott történetet. A tényleges kérés-összeállítás láthatósága legyen kimondva. Pontos tokenarányt csak elérhető hiteles tokenadatból; helyi tokenizálás becslését nevezd becslésnek, bájtot ne nevezz tokennek. Az ismeretlen maradjon külön.

## 2. Növekedés — a 47 hívás teljes lefedése
Ugyanaz a lezárt ablak: 2026-09-20T20:06:40Z → 20:41:16.352Z, session 76fa7fd1-bacc-5f4b-9450-d1bcb6c9cd5b.
Hívásonként bemeneti változás és az előző válasz/új események: olvasás, keresés, tesztkimenet, írás/szerkesztés, visszacsatolt fájlrészlet, egyéb automatikus melléklet. A növekedést minden hívásra fedd le, ne csak öt ugrásra. Az eseményméretek önmagukban nem adnak pontos token-hozzájárulást; megmagyarázatlan rész külön.
Bash parancsokat CSAK helyben elemezz, soha ne hajtsd végre az átiratból. Biztonságosan felismert fájl/szakasz-olvasásokat és ismétlődéseket exportálj; dinamikus/nem felismerhető parancs esetén unknown és lefedettségi szám. Nyers parancs, üzleti adat, titok ne kerüljön ki.
Dedup a tool_use azonosító és a tényleges stream-szemantika szerint; Write nem olvasás. Időbélyeg nélküli eseménynél igazolható sorrendi kötés vagy külön ismeretlen. A végső hívás utáni esemény nem magyarázhat korábbi bemenetet. Meglévő rekordokból válaszd szét a tényleges új anyagot, pillanatképet/cserét és duplikációt, ahol lehetséges.
A rejtett gondolkodás 673 tárolt bájtja nem a gondolkodás mennyisége. Az ablak utáni cost-state sem a 47 hívás költsége. Hetikeret-százalékot ebből ne számolj.

## 3. Javítsd a bizonyított, elérhető okokat
A V3 saját forrásában és saját munkamenetének támogatott beállításaiban végezd el a szükséges visszafordítható javítást:
- szükségtelen külső repóutasítás betöltésének megszüntetése a V3 munkához, ha a valódi csatolási konfigurációhoz hozzáférsz;
- túl nagy, feladatfüggetlen V3 utasítások célzott forrásindexre helyezése a kötelező szabályok megőrzésével;
- ismételt/nagy kimenetek forrásánál célzott szakaszok és összesítők; teljes napló fájlban megőrizve, hiba esetén releváns rész elérhető;
- bizonyított felesleges automatikus visszatöltés beállítása csak támogatott, saját hatáskörű módon.
Nem megoldás a kötelező szabályok figyelmen kívül hagyása, a V2 fájljának átnevezése/törlése, tesztek elhallgatása vagy használhatatlan csonkolás. Ne építs új általános kontextuskezelőt.
V2 forrást, megosztott platformot, rendszerutasítást és jogosultsági szabályt ne módosíts. Ha a csatolást csak az operátor felülete állíthatja, add meg a bizonyított beállítás pontos helyét és legkisebb szükséges műveletét; ne állítsd javítottnak. V2-höz szükséges változást külön rövid szakmai átadási pontként jelöld chatgpt-v2 számára, ne küldj neki önálló parancsot.
A helyben megoldható javításokat külső akadály mellett is fejezd be.

## 4. Bizonyítás és fogyasztási fegyelem
Előtte/utána azonos feltételek mellett: mely betöltött fájlok/méretek változtak, mely ismétlések/kimenetek szűntek meg; érintett szkriptek célzott próbái. Megtakarítási becslés, helyi bájtmérés és tényleges modell-usage külön.
Új modellmunkamenetet ne indíts automatikusan. Az első tiszta, V3-ra szűkített valódi munkamenet első hívásának mérése külön lezárási feltétel, ha itt nem végezhető el; ugyanabban a felhalmozott chatben a fájl rövidülése nem bizonyít tiszta indulási megtakarítást.
Nincs teljes sweep, mutációs lánc, régi történet újraolvasása, új üzleti modul, merge/telepítés vagy core-elfogadás. A nyers átirat marad helyben, az átadás tartalommentes.
Célzott szkriptmunka, összefogott eszközhívások, rövid kimenetek. 8 új modellhívás után saját fogyasztás-ellenőrzés és szükség esetén szűkítés; legfeljebb 15 új modellhívásig dolgozz ebben a csomagban, utána add át a kész javítást és a pontos akadályt, ne folytass korlátlan kutatást. Ez erre a diagnosztikai csomagra szól, nem általános feladatdarabolási szabály.
Egy REPORT: magyarul mi töltődött be, mitől nőtt, mit javítottál, mivel ellenőrizted, mi maradt ismeretlen/külső beállítás; pontos commit és bizonyítékfájlok. A szűkítést ne újabb nagy dokumentációs csomaggal valósítsd meg.
