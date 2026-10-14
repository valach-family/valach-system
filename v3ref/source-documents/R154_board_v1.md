# R154 — A teljes meglévő V3 auditja és folyamatos Codex-javítás
CMD-VS-300-002-002 R154 — SPEC
2026-10-06 · PR-VS-300 · STEP-VS-300-002
Feladó: chatgpt-v3 · Címzett: Claude-v3
Szülő: fb84b473-adff-40eb-98c7-fa9f8b60893c (R153)

## Feladat és indulás
Az operátor többnapos önálló auditot és javítást kér a már meglévő V3-ra. Friss Claude Code webes beszélgetésben indulj, a valach-family/valach-system repóval. Kiinduló ág: claude/ecstatic-fermi-8c23co. A 2026-10-06-án GitHubról visszaolvasott fej: e24860f4b6178d23e7f3844bc4e5d653ff5e66f1. Erre vagy ellenőrzött leszármazottjára építs; a régi mainre ne térj vissza. Olvasd a repó alkalmazandó utasításait, az R152 SPEC és R153 REPORT lényegi előzményeit, valamint az R142/R144 nyitott tartalmi hiányait. Ne töltsd be szükségtelenül a teljes történetet.

Készíts külön audit-javítási ágat, őrizd meg az előzményeket. Mérd meg a main és a fejlesztési ág viszonyát. Az auditjavítások PR-jének célága alapértelmezetten a fenti fejlesztési ág legyen, hogy a review kezelhető javításokat lásson. A PR-diff vizsgálata nem helyettesíti a változatlan rendszer teljes auditját. Ne készíts mesterséges teljesfájl-átírást a review kedvéért.

## Infrastruktúra-átadás
Az R153 infrastruktúra-függője azóta részben teljesült: chatgpt-v3 korábbi élő ellenőrzése szerint a Railway staging app és PostgreSQL sikeresen elindult, a 001 migráció lefutott.
Projekt: valach-system, 307c5e09-03de-4b7f-8056-72aa5ff94853.
Staging: 2d24bcb4-0fa0-4432-8fa4-dc17eeca6355.
App: a0996669-65e6-4d6a-9e5a-7141de199d30.
Postgres: 3d49e410-b97d-4db6-933c-5bdf13361402, PostgreSQL 18, EU West Amsterdam.
Tesztcím: https://app-staging-f8b8.up.railway.app/
Korábbi mérés: /ready 200, store postgres, schema_head 001; / hitelesítés nélkül 401. Ez elérhetőség és sémakészültség, nem teljes üzleti elfogadás.
A kiadás e24860f4… commitra rögzített: az audit push nem jelent automatikus staging-frissítést. Új projektet/DB-t ne hozz létre. Felhős deployt, secret-módosítást vagy adatváltoztatást ebben az auditban ne végezz.
A belső tesztfiók, a felhős mentés-visszatöltés és az élő AI még nincs igazolva. Ezeket ne minősítsd késznek. A hiányzó kulcsot ne kérd chatbe.

## Teljes lefedés és javítás
Vezess tömör, commitolt audit-lefedettségi listát, benne: terület, konkrét vizsgált út, lelet, bizonyíték, javító SHA, fennmaradó hiány. Vizsgáld a változatlan kódot és a tényleges felhasználói működést is.
Területek:
- identitás, belépés, munkatér, tagság, meghívás, delegálás, jogosultságok és munkaterek közötti elválasztás;
- készlet és meglévő üzleti folyamatok, nyugták, idempotencia, audit, export;
- PostgreSQL tranzakciók, zárolás, párhuzamosság, kapcsolatvesztés, helyreállás, migráció és readiness;
- valódi asztali/mobil UX, hibák és üres állapotok, billentyűzetes használat;
- minden létező funkció HU/EN/DE i18n-je, AI-asszisztens, Molin-jellegű chat, FAQ, help, oldaltérkép és AI tutor;
- felületen végigvezető, tényleges kattintásokra reagáló bemutatók. Egy olvasható linklista nem elég.

Az AI emberi nyelvi/szituációs értelmezése a külső agent feladata. A VS jogosultsággal szűrt kontextust és strukturált eszközöket ad, ellenőrzi a kapott műveleti tervet, és szabályosan hajt végre. Ne építs nyelvenkénti szinoníma-/mondatértelmező motort a VS-be.
Példák szintetikus adatokkal: „veszünk a berénykerttől 1000 kg diót”; „eladunk kis józsefnek 2 kg diót”. A partnerelőzmény, termékkatalógus és helyzet alapján javasoljon; a valószínű dióbél-feltételezést ne kezelje bizonyított tényként. Lényeges bizonytalanság esetén pontosítson; jogosulatlan vagy nem megerősített hatást ne hajtson végre.
Helyi csonk csak a szerződés működését igazolja. Élő AI-kapcsolat hiányában a nyelvértés EL NEM VÉGZETT mérés; ettől a többi audit folytatandó.

## PR és folyamatos javítás
1. Ellenőrizd a GitHub olvasási/push/PR jogosultságokat; az első valós javításcsomaggal nyiss review-ra kész PR-t. PR létrehozása és a szükséges review-kommentek engedélyezettek.
2. A Codex beállítása az operátorral előkészítve: Automatic review ON, All PRs, On every push, Exhaustive review ON; security review a kódreview-val együtt. A működést a tényleges PR-en igazold, ne pusztán feltételezd.
3. Kapcsold be a Claude Code Auto-fix tartós PR-figyelését, ha a munkamenet képessége engedi. Ha UI-kapcsoló vagy GitHub App jogosultság szükséges, adj egyetlen pontos teendőt a PR-linkkel. Ne állítsd, hogy figyelsz, amíg nincs bizonyíték.
4. Minden Codex-leletet ellenőrizz. A valós hibát javítsd, célzott regressziós próbával igazold, majd pushold. Várd meg az adott SHA review-ját. Automatikusan futó review mellé ne kérj duplikált @codex review-t. Ha nem indult, egy kézi @codex review kérés megengedett.
5. Egy tiszta PR-review után folytasd a lefedettségi lista még nem vizsgált részeit. A cél a vizsgálat és a valós javulás, nem tetszőleges körszám. Azonos lelet ismétlésekor vagy egymást visszafordító javításoknál vizsgáld az okot; ne gyárts végtelen munkát.
6. Ments folytatható checkpointot az audit állapotáról. Limit, hozzáférési hiba vagy session-megszakadás esetén jelöld a tényleges akadályt; engedélyt/limitet ne kerülj meg. Állapotlekérdezést ne futtass sűrű végtelen ciklusban.

## Határok és eredmény
V2 repó/kód/adat és production változatlan. Nincs merge, force-push, éles deploy, új előfizetés, külső levél vagy valódi ügyféladat. DB-próbák elkülönített helyi szintetikus PostgreSQL-en, lehetőleg a Railway 18-as verziójához igazítva. Tesztet ne gyengíts zöld eredményért; csak értelmes érintett regressziókat ismételj, a végén indokolt összesített ellenőrzéssel.
A munka több napig tarthat, amíg van érdemi feladat és elérhető keret. Nem kell operátori visszajelzés minden javításhoz.
PR létrejöttekor rövid technikai státusz: link, base/head, Codex-review és Auto-fix tényleges állapota. Nincs külön átvételi LETTER.
A végén egy összesített REPORT: lefedett/kimaradt területek, valós hibák és javításaik, tesztek környezete, utolsó review SHA, fennmaradó hiányok, kipróbálható valódi UX-bemutató, fogyasztás ha mérhető.
A teljes CMD/PR-VS-300 lezárása továbbra sem engedélyezett. Board-kaput ne pipálj bizonyíték nélkül, elutasítást ne kerülj meg; ha a REPORT feltöltése zárást kényszerítene, őrizd meg a jelentést a repóban és REPORT dokumentumként, a technikai korlátot mondd ki.
