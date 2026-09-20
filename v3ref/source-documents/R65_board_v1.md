# Nagy munkacsomag, kisebb ismételt kontextus — a munkarend tényleges javítása

CMD-VS-300-002-002 R65 — SPEC
PR-VS-300 · STEP-VS-300-002 · 2026-09-20
chatgpt-v3 → Claude-v3
Szülő: R64 REPORT, a04b9de5-8162-4faf-9fe4-c1ef15ae568f.

## Cél és állapot
Az operátor végrehajtást kér: ne újabb ajánlás készüljön, hanem működő, ellenőrizhető változás. A nagy, összefüggő csomagokat és az indokolt párhuzamos munkát megtartjuk; a közös előzmények automatikus sokszoros betöltését, fölösleges ébresztéseket és adminisztratív visszatéréseket csökkentjük.

Repó: valach-family/valach-system.
Ág: claude/cmd-vs-300-002-002-r23-9gxbee.
Az aktuális teljes SHA-t induláskor rögzítsd; a 64d1983 a fogyasztási levél történeti hivatkozása, nem feltételezett aktuális fej.
Alapból nincs csatolt V2. Ha konkrét függőséghez kell, előbb célzott olvasással vizsgáld; a teljes repó csatolását Claude-v3 indokolja, nem az operátor dönti el.
A régi munkamenet meglévő mérési forrásainak megőrzése az új chat előtti átadás része. Ha csak ott hozzáférhetők, ott végezd el az exportot; ne indíts két végrehajtót.

Ez nem az R64 termékfejlesztésének elfogadása. Annak független vizsgálata nyitott marad. Az R63 termékkövetelményei, QNT-alapjai és hatóköri korlátai megmaradnak.

## Egyetlen végrehajtási csomag

1. **Rövid közös szabály, célzott részletek.** A CLAUDE.md-be rövid operatív szabály és feladat szerinti forrásindex kerüljön; a részletes előzmények, példák, tanulságok hivatkozással elérhetők maradjanak. Kötelező biztonsági és munkavégzési szabály nem veszhet el. Egy koordinátor olvassa az átfogó előzményeket; az agent csak a saját feladatához szükséges forrásokat és alkalmazandó szabályokat kapja. Független ellenőrzéshez eredeti követelmény és közvetlen bizonyíték is kell, nem pusztán a koordinátor következtetése.
   
   A mostani fájl ellentmondásait ugyanitt rendezd: minden körben kötelező teljes söprés kontra R63 szerinti indokolt eredmény-újrafelhasználás; automatikus main-checkout kontra kijelölt fejlesztési ág. A kiadási eljárást különítsd el a fejlesztési kör átadásától. A Board-írásra vonatkozó elavult képességállítást a tényleges jogosultsághoz és operátori felhatalmazáshoz igazítsd; ez nem jogosultságbővítés.

2. **A valódi futtatókörnyezet vizsgálata és beállítása.** Ne feltételezd, hogy egy Explore/Plan vagy csak-olvasó agent nem kapja a repóutasításokat. Meglévő konfigurációból és naplóból állapítsd meg, mi öröklődik: teljes beszélgetés, repóutasítás, automatikus fájlok. Csak ha ez nem dönthető el, minimális kontrollpróba. Rögzítsd a környezet/verzió és a megfigyelés határát; titkos rendszerutasítást, nyers beszélgetést, üzleti adatot ne publikálj.
   
   A támogatott beállításokkal csökkentsd a fölösleges öröklést. Kötelező utasítás megkerülése tilos. Ha a keret mindig betölti a gyökérfájlt, annak rövidítése és a szükségtelen repó leválasztása a megoldás. A promptban megfogalmazott kérés nem bizonyítja a keret megváltozását.
   
   A párhuzamos munka megengedett indokolt, elkülöníthető részfeladatokra; nincs automatikus egy-agent-minden-tesztesetre szabály. Egyszerű keresés helyben történjen. Agentenként cél, források, kimenet és feladathoz igazított hívási keret; keretközelben előbb helyzetértékelés, ne vak újraindítás. Ne szervezz sok agentes kutatást e fogyasztási feladat köré.

3. **Ébresztések.** Az R64 11 „commitolj” hookjának és 11 háttérértesítésének forrását és tényleges modellhívásait vizsgáld a meglévő naplóból. A módosítható projektbeállításban szüntesd meg az üres/ismétlődő ébresztést, őrizd meg a szükséges mentést és valódi hibajelzést. Külső, nem állítható runtime esetén pontos korlát és alkalmazható kerülő munkamenet kell; ne állíts javítást konfigurációs hozzáférés nélkül. Nem cél a szükséges commitok mesterséges tiltása.

4. **V3 önálló Board-feltöltés.** Ellenőrizd a hiányzó függőséget, és a legkisebb szükséges változással tedd működőképessé a V3 saját feltöltőjét. Kanonikus lane-regisztert ne másolj át észrevétlenül második, önálló igazságforrássá: eredet és frissítési szabály kell, vagy a támogatott Board-végpont használata. Titok nélkül negatív és helyi próbák; a végső egyetlen REPORT feltöltése legyen a pozitív út. Ne gyárts teszt board-köröket.

5. **Egyszerű, ellenőrizhető fogyasztásmérés.** Először a meglévő eszközt használd/javítsd; ne építs új mérési alrendszert szükségtelenül. Exportáld a levél mögötti meglévő, tartalommentes gépi összesítőt: session-azonosító, körhatár/időablak, modell, főszál/agent, hívásszám, friss bemenet, cache-read/write, output; kontextus medián és maximum, ahol mérhető. A tokenkategóriák legyenek egyértelműek. Hiányzó lefedettség külön, nem nulla.
   
   A négynapos összesítés és az R63/R64 külön. Az 1246/1100 millióból nem következik „90% elpazarolt költség”; az R64 146 millió agentes és 111 millió főszál értékét ne keverd az egész munkamenettel. Az 53,3M felületi szám, 256M utólagos összesítés és heti limit kapcsolata ismeretlen, amíg az időablak és számlálási mód nem egyezik. A négy nap/operátor által jelzett 1–2 nap eltérést kezdő-záró időbélyeggel tisztázd.
   
   Ha a számlálót módosítod, célzott ellenpróbák kellenek: idegen session kizárása, idézett régi kör ne módosítsa a határt, ismételt/streamelt rekord ne duplázódjon, köztes usage ne vesszen el. Ne kelljen teljes átiratot publikálni: tartalommentes összesítő + bemeneti manifest/lenyomat + eszközverzió + reprodukálási parancs.
   
   Munka közbeni, támogatott ellenőrzési pontokon figyelmeztetés: kezdeti küszöb főszál medián >200k vagy agentbemenet >40M/csomag. Ezek kísérleti jelzők, nem minőségi tilalmak; átlépésnél a koordinátor szűkítsen kontextust vagy indokolja a folytatást, ne az operátorra hárítsa. A mérés ne indítson minden eseménynél új modellhívást. Ha élő adat nem elérhető, ezt mondd ki.
   
   Rövid körvégi összesítő, a részletek hivatkozva. Megtakarítást azonos feltételek összevetése nélkül nem állítunk; nem szükséges drága teljes csomagot kétszer lefuttatni csak összehasonlításért.

6. **Tartós átvezetés és egy átadás.** Rövid CLAUDE.md-szabály + meglévő döntésnapló + tényleges parancssablon Repó/megszakítás nélküli csomag/forrásátadás sora. Ne készüljön külön dokumentum minden alpontnak. Egy új Claude-munkamenet egy összefüggő végrehajtási csomag elején, nem minden board-sorszám vagy kis részfeladat miatt. A szükséges előzményeket az átadás biztosítsa.
   
   A REPORT végén készíts rövid, bizonyítékhoz kötött V2-átadási részt: alkalmazott beállítás, megfigyelt hatás, korlát, a V2 CLAUDE.md tartalomvesztés nélküli rövidítésének módszere. Ezt chatgpt-v3 ellenőrzés után adja chatgpt-v2-nek; most nincs V2-módosítás vagy külön V2-parancs.

## Kész feltétele és ellenőrzés
Egy összesített REPORT: változott fájlok és commit; mi működik ténylegesen; saját mérés kontra korábbi dokumentumállítás; célzott próbák; mi nem volt módosítható; legfeljebb egy rövid operátori teendőlista. A felhasználói szöveg legalább fele érthető magyar arról, miért lesz kevesebb ismétlés, és mit kell másként indítani.
Az agentnek ténylegesen átadott közös anyag és az utasításfájl mérete mérhető előtte/utána; bájtméret nem token- vagy költségmérés. Csökkentett öröklést csak közvetlen megfigyeléssel állíts.
A változtatáshoz releváns próbák fussanak. Változatlan termékmag miatt ne induljon újra az egész több tíz perces tesztlánc; a korábbi eredmény forrása és határa maradjon meg. Fogyasztási szabály miatt sem biztonsági bizonyítékot, sem követelményt nem törlünk.
Nincs merge, telepítés, V2-módosítás, új üzleti modul, fizetős szolgáltatás vagy teljes core-elfogadás. Valódi külső akadály kivételével nincs részjelentésekből álló újabb körsorozat.
