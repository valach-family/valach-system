# R158 — Az audit folytatása: munkamenetek, böngészős kapu és valódi bemutatók
CMD-VS-300-002-002 R158 — DECISION
2026-10-06 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3
Repó: valach-family/valach-system
Előzmény: R154 SPEC és R157 REPORT; szülő: 046e4cbf-434a-4a48-b83f-72c05ed5311e.

## Döntés és munkarend
Az operátor engedélyezte a folytatást. Az R157 három döntési kérését az alábbi egyetlen végrehajtási csomag rendezi. Az R154 többi követelménye és korlátja érvényben marad. A jelentés részleges auditállapot, nem teljes termékelfogadás.

A meglévő #1 PR-en dolgozz: claude/r154-audit-fix → claude/ecstatic-fermi-8c23co. A korábban ellenőrzött fej 3adc8e0d0c3053fb8725c0727502a36b9339b6e6; induláskor olvasd vissza az aktuális fejet és a review-kat, annak igazolt leszármazottján folytass. Ne állj vissza a jelentés korábbi SHA-jára vagy a mainre. A Codex-leletek javításai ugyanennek a PR-nek a részei, megőrzendők.

Egy aktív író kezelje az ágat. A mostani Claude-munkamenet vegye át ezt a parancsot. Ha új munkamenet szükséges, előbb készíts tömör, commitolt átadást, őrizd meg a folyamatban lévő munkát, és add át a PR-figyelést; a két munkamenet ne javítsa párhuzamosan ugyanazt az ágat. A teljes történet ismételt betöltése helyett a checkpointból dolgozz.

## 1. A munkamenet-kezelés gyökérokának javítása — engedélyezve
Valósítsd meg az igény szerinti munkamenet-létrehozást: az állapotot nem igénylő névtelen olvasás ne hozzon létre tárolt munkamenetet vagy fölösleges sütit. Előbb röviden rögzítsd, mely meglévő út mikor igényel állapotot, majd építsd meg; külön jóváhagyásra ne várj.

Őrizd meg a belépés, kijelentkezés, CSRF-védelem, lejárat, identitásváltás, pending_intent és a párhuzamos kérések helyes működését. A kapacitáskorlát továbbra is kötelező: az igény szerinti létrehozás önmagában nem védi a tárolót az állapotot kérő támadó forgalomtól. A védett bejegyzések ne essenek ki kapacitás miatt; telítettségnél az új állapotfelvétel szabályosan bukjon, ne legyen hamis siker, érvénytelen sikersüti vagy félig végrehajtott tartós művelet. A felvétel és a tartós mellékhatások sorrendjét, versenyhelyzeteit külön ellenőrizd.

A lejárt pending_intent takarítása is kapjon meghatározott időbeli szabályt a meglévő döntés szerint. A takarítás ne hozzon vissza kérésenkénti teljes bejárást vagy korlátlan memória-növekedést. Célzott valódi HTTP-próbák és ahol érintett, izolált PostgreSQL-próbák igazolják az invariánsokat, beleértve telítettséget, lejáratot és párhuzamosságot. A teljesítménypróba ellenőrizze a ténylegesen létrejött kiinduló állapotot is.

## 2. Böngészős ellenőrzések — kötelező teljes kiadási kapu
A test:e2e és proof:core-ux fusson a teljes kiadási ellenőrzés részeként, ne maradhasson ki a verify:* névszűrés miatt. A gyors javítási ciklusban elegendő az érintett célzott ellenőrzés; a csomag végén fusson a teljes szükséges kapu az azonosított végső kódállapoton. Hiányzó böngésző vagy el nem indult mérés nem PASS.

A három örökölt böngészős hibát (R89-06, R91-03, R93) javítsd a meglévő funkcionális szerződés szerint. Az R91 esetében a requires_demo túrákhoz a megfelelő demókörnyezetet kösd be; az elvárt túrák számának csökkentése vagy a teszt kihagyása nem javítás. A demó bekapcsolása ne kerülje meg a normál jogosultsági védelmet.

## 3. Bemutatók és a teljes meglévő rendszer auditja
A bemutató a tényleges felületen, lépésről lépésre, a felhasználó kattintásaira reagáljon. Ellenőrizd HU/EN/DE nyelven a meglévő funkciókhoz tartozó i18n, asszisztens/chat, FAQ, help, oldaltérkép és tutor elérhetőségét és tartalmát. A szimulált backend vagy AI legyen egyértelműen jelölve; ne jelents élő AI-bizonyítékot.

Folytasd a még nem auditált jogosultsági magot, különösen delegation, membershipPeriod és banScope útjait. A nyilvántartott örökölt piros ellenőrzéseknél tárd fel és javítsd az okot a meglévő szerződésen belül; az örökölt jelző nem felmentés és nem zöld eredmény. Az audit alatt talált valós hibák javítása engedélyezett, a tesztgyengítés nem.

Az üzleti írások és a hiányzó üzleti oldalak külön megvalósítási hiányok: pontosan sorold fel őket, de ezzel a paranccsal nem indul a teljes hiányzó ERP-funkciók találomra történő felépítése. Az AI nyelvi és szituációs értelmezése továbbra is a külső agent feladata; a VS jogosultsággal szűrt kontextust, strukturált eszközöket és ellenőrzött végrehajtást biztosít.

## Review, bizonyíték és lezárás
A Codex → igazolt javítás → push → új automatikus review ciklust folytasd. Automatikusan futó review mellé ne kérj duplikált kézi review-t. Amíg ellenőrzés fut, haladj a független auditfeladatokon. Ismétlődő vagy egymást visszafordító javításoknál a közös invariánst és a gyökérokot rendezd, ne a körszámot növeld.

A végén az aktuális fejhez tartozó kód- és biztonsági review tényleges állapotát rögzítsd; a korábbi SHA review-ja nem az új fej elfogadása. Minden ismert érdemi lelethez legyen javítás és bizonyíték, vagy indokolt, ellenőrizhető cáfolat; a fennmaradókat nevezd meg. A zöld PR-review nem helyettesíti a változatlan rendszer auditját.

Egy összesített REPORT készüljön: végső fej és időpont, lefedett és kimaradt területek, javítások és regressziós bizonyítékok, tesztkörnyezet (PostgreSQL-verzióval), valódi kipróbálható bemutató, review-állapot és következő nyitott feladatok. A darabszámok egyezzenek az egyedi leletekkel és review-commitokkal. A történeti pontosítás: a GitHub App repólistájából a valach-system ténylegesen hiányzott, majd az operátor hozzáadta; a kezdeti csendet ne minősítsd puszta késésnek. Az automatikus újrafutás azóta bizonyított.

Az élő AI, belső tesztfiók és felhős mentés-visszaállítás korábbi hiányait ne minősítsd megoldottnak új bizonyíték nélkül. Helyi DB-próbák izolált, szintetikus környezetben, lehetőleg PostgreSQL 18-on; verzióeltérés esetén annak korlátját jelezd.

Nincs merge, force-push, felhős deploy, secret-módosítás, valódi üzleti adatváltoztatás, V2- vagy production-módosítás. A javítások későbbi merge-jét elő kell készíteni, de ez a parancs nem merge-engedély. Nincs új előfizetés vagy limitmegkerülés. A teljes CMD/PR-VS-300 lezárása nem engedélyezett. Nincs átvételi LETTER és nincs javításonkénti operátori engedélykérés.

