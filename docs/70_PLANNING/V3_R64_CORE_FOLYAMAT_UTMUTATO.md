# Egyoldalas útmutató — az első felhasználói folyamat kipróbálása (V3 mag)

> **Sáv:** Claude-v3 · **Kör:** R64 · **Állapot:** lezárt

**Mi ez.** Egy vékony, telepítés nélkül futó próba-alkalmazás a V3 magreferencia fölött. Nem termék és
nem üzleti modul: azt mutatja meg, hogy a **regisztráció → saját munkakörnyezet → munkatárs meghívása →
elfogadás → munkatér-váltás → engedélyezett adat → megvonás** lánc a mag SAJÁT szabályain végigjárható.
Minden döntést a szerver hoz (a mag); a képernyő csak azt rajzolja, amit a szerver válaszol. **Levél
külső személynek nem megy ki** — a leveleket a képernyő 6. szakasza („FEJLESZTŐI LEVÉL-FOGADÓ") mutatja.

## Indítás (pontos út — nyilvános előnézeti cím ebben a környezetben nincs)

```bash
cd "/Users/valachzsolt/Documents/CREATOR/DESIGN + WEB/vfamily/00_Admin/valach-system"
git checkout main && git fetch origin && git pull origin main
npm run app:dev
```

Ezután a böngészőben: `http://127.0.0.1:3300/`. Az adat egy eldobható fájlban áll a `var/tmp` alatt;
két böngésző-ablak (vagy egy normál + egy privát ablak) kell, mert két személy szerepel.

## Kivel mit lehet kipróbálni, mi történik, és miért

| Lépés | Ki · hol kattint | Mi történik | Miért így |
|---|---|---|---|
| 1. Regisztráció | **Anna** · 1. szakasz: e-mail + jelszó → *Regisztráció* | A válasz semleges („Ha a cím szabad, levelet küldtünk"), a levél a 6. szakaszban jelenik meg | Foglalt címről nem árulkodunk (K03); a levél csak a fogadóba megy |
| 2. Megerősítés | Anna · a levél hivatkozására kattint | „Megerősítve" lap; belépés után a fejléc **bizonyított csatornát** mutat | Munkakörnyezetet csak bizonyított e-mailcím indíthat (WSP-01) |
| 3. Saját munkakörnyezet | Anna · 2. szakasz: név, terv (starter), opcionálisan adószám + ország → *Létrehozás* | Anna **admin** lesz; az indulási alap `startup-rule v1`; két jelölt minta-rekord születik (készlet, ár) | A helyi admin-jog eredete kimondott (alap + verzió); az adószám ÖNBEVALLOTT, hatósági igazolás nincs |
| 4. Meghívó | Anna · 3. szakasz: Béla címe, szerep *user*, adatkör *keszlet* → *Meghívó* | Token + plafon a válaszban; a meghívó levél a 6. szakaszban (`?invite=…`) | Az alapot a rendszer Anna továbbadható jogából képzi (DLG-01); a felhasználótól alap-dokumentumot nem kérünk |
| 5. Elfogadás | **Béla** (másik ablak) · a hivatkozást megnyitja → 5. szakasz | Ha nincs fiókja: regisztrál, megerősít, belép — a meghívó **folytatódik**. Ha van: belép, és *redeem_as_existing*. Ha rossz fiókkal van bent: „nem a címzett" | A K03 négy útja külön: meglévő fiók · rossz fiók · biztonságos folytatás · új fiók |
| 6. Munkatér-váltás | Béla · 2. szakasz lista: *Váltás* | A fejléc a választott munkakörnyezetet és a szerepet mutatja; az adat-terület előbb kiürül | A könyvet a szerver a munkamenetből tudja; a kliens `book_id`/`actor` paramétere figyelmen kívül marad |
| 7. Adat | Béla · 4. szakasz: *Készlet* | **Elutasítva** („nincs adatköri jog") — a tagság önmagában nem ad adatot | A plafon nem jog (K05-DSC-c): a kezelőnek külön kell adnia |
| 8. Adatkör adása | Anna · 3. szakasz, tag-lista: Béla soránál *keszlet* → *Ad* | Béla *Készlet* gombja most mennyiséget mutat (`12`); az *Ár* továbbra sem (nincs `arak` jog, és a starter terv sem tartalmazza) | Két kapu külön: jog és előfizetés — a válasz megmondja, melyik zárt |
| 9. Megvonás | Anna · tag-lista: Béla soránál *Megvonás* | Béla következő kérésére: elutasítás, a fejlécből eltűnik a munkakörnyezet, a váltás is tiltott; Anna saját joga marad | A megvonás az ÚJ kérésen érvényesül; a megvont tag delegálási alapja is megszűnik |

**Ami itt NEM bizonyított, kimondva:** valódi levélküldés · országonkénti hivatalos igazolás ·
közös (kétszemélyes) jóváhagyás · nagy terhelés · Postgres-határ. A két-kapcsolatos verseny
(meghívó-beváltás, megvonás ↔ véglegesítés) külön paranccsal mérhető: `npm run proof:multiconn`.
A teljes lánc gépi bizonyítéka: `npm run app:selfcheck` (végpontokon) és `npm run proof:core-ux`
(böngészőben, Playwright).
