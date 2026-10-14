Repó: valach-family/valach-system

# R208 — Az interaktív átadás befejezése és a bizonyítékhatókör helyesbítése
CMD-VS-300-002-002 R208 — SPEC
2026-10-14 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3, az R206-ot végrehajtó munkamenet
Szülő: d8d81d58-0b2a-44d6-9ee8-81de08f52907 (R207 NOTE és REPORT).

## 1. Döntés és bázis
Először ezt a SPEC-et olvasd be teljes egészében a Boardról, és őrizd meg szó szerint a projekt előírt helyén. A jelen csomag az R206 átadásának véges befejezése; nem új általános audit.
GitHubról ellenőrzött PR #1 fej: 2704602a549e6118d533d91a0b187f05db6e70a8, fejág claude/r154-audit-fix, célág claude/ecstatic-fermi-8c23co, nem mergelt. A mért 53ff719e018ce645ded715fdaa2a209416336278 utáni négy commit csak dokumentumokat és mérési nyilvántartásokat módosít. Ezt az állapotot megőrizve dolgozz a kijelölt munkamenetágon; main vagy régi célág nem munkabázis.

F206-01…04 javításairól az R207 eredményeit tudomásul vesszük; chatgpt-v3 célzottan olvasta a személyállapot/sorrendvédelem és a kapufuttatás forrását, de a 157 helyzetet nem futtatta újra. Ezekre most nincs új teljes audit. R176-K3 és personal.ownMatters nyitott állapota változatlan, egyikre sem indul új kampány.

## 2. Konkrét helyesbítés
Az R207 REPORT §5 a proof:demo-walk-ot valódi HTTP-héj és tároló bizonyítékai közé sorolja; a PR leírása és az új artifact-eszköz megjegyzése is ismétli ezt.
A 2704602 forrásában a package.json a tools/v3_demo_walk_proof.mjs-re mutat. Ez statikus fájlkiszolgálót indít, demo-index.html-t nyit, demo-adapter.mjs csonkot használ; a fájl eleje és záró kiírása kifejezetten kizárja a HTTP/adatbázis-bizonyítékot. A statikus fájlok HTTP-s átvitele nem az üzleti API és tároló ellenőrzése.
A docs:kiprobalas-kepek ettől külön valóban a v3app/server.mjs startServer függvényét indítja eldobható SQLite-tal.
Helyesbítsd célzottan a hibás R207 állítást, a PR leírását és e körben érintett ismétléseit; őrizd meg, mi volt a korábbi tévedés. A mért futásokat ne nevezd sikertelennek, csak a hatókörüket írd helyesen. Ehhez nem kell új tesztkeretrendszer vagy új teljes futás.

## 3. Címzettként használható interaktív átadás
Az R207 maga mondja ki, hogy a végleges artifact-host testvérfájl-feloldását nem ellenőrizte. A helyi statikus kiszolgálós siker ezt nem igazolja.
Chatgpt-v3 a https://claude.ai/artifact/4qNw1cyDf5Qk8xPKbwMsyr címen „Sign in to view this page” lapot kapott. Ez hozzáférési korlát ebben a böngészőben, NEM bizonyított csomaghiba, és nem bizonyítja, hogy az operátor saját Claude-fiókjában sem működik. Jelszót ne kérj chatben, hozzáférést ne lazíts.

A meglévő, engedélyezett artifact/csatolmány átadási úton fejezd be a szállítást. A tényleges végleges előnézetben ellenőrizd a modulok és nyelvcsomagok betöltését, a két vezetett történet elindulását és végigjárását, továbbá a hálózati hiba → „Nem igazolt” → „Állapot ellenőrzése” → helyreállás utat, asztali és 390 px méreten. A linkhez szükséges hozzáférést mondd ki. Ha a befogadó a relatív fájlokat nem szolgálja ki, a meglévő felületi forrásból készíts az átadási felülettel kompatibilis csomagot; ne írj második UX-et.
Ha a végleges host ellenőrzését tényleges eszköz-/belépési korlát blokkolja, add át a rendelkezésre álló csomagot és a pontos akadályt „átadás nem igazolt” státusszal. Egy helyi sikerből ne legyen „címzettként ellenőrzött KÉSZ”. Nincs ismételt vak próbálkozás és nincs új felhős telepítés.
Csak szintetikus adat; a szimulált háttér jelölése maradjon látható. A meglévő i18n/tudás/tutor működést őrizd meg.

## 4. Szűk végrehajtás és zárás
Az átadási probléma konkrét javítása és a hozzá tartozó célzott ellenőrzés engedélyezett. Dokumentációs helyesbítés vagy változatlan csomag újbóli átadása miatt nincs teljes böngésző-, mag-, külső 17-es vagy PostgreSQL-újrafuttatás. Ha termék- vagy kapukód változik, az érintett kötelező projektkaput a végső kódon teljesítsd, és a konkrét érintettséget nevezd meg. Új általános őr/leltár/bizonyítékrendszer nem feladat.
A korábban engedélyezett commit/push és ellenőrzött fast-forward a PR fejágára érvényes. Előtte friss távoli fej és ősviszony, utána PR-fej visszaolvasása; force-push és platformkorlát megkerülése nélkül.
Egy aktív író, alügynök nélkül. A legutóbbi kontextusmedián 336 612,5, figyelmeztetési sáv; önmagában nem indokol új chatet. A következő blokkhatáron a meglévő fogyasztásmérést használd.
Rövid státuszok; egy tömör REPORT, rövid NOTE, a chatben link és Board-reference. Elég: mi változott, átadási eredmény/akadály, új/korábbi/nem futott mérés, induló és végső SHA, fogyasztás. Ne másold át a teljes korábbi történetet; ne bővítsd hosszú magyarázatokkal a forrást.
Nincs merge, deploy, force-push, V2/production-, titok-, infrastruktúra- vagy hozzáférésmódosítás, élő AI, automatikus AI-review, tartós figyelő, CMD/PR-lezárás. REPORT után leállás.
