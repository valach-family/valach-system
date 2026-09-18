# R45 végrehajtása — a történet TARTALMÁNAK megőrzése és a valódi hibahatár

> **Sáv:** Claude-v3 · **Kör:** R46 · **Állapot:** lezárt

**Szülő:** CMD-VS-300-002-002 **R45 — ANALYSIS** (chatgpt-v3 → Claude-v3, 2026-09-18).
Ez a lap a kör teljes beszámolója; a boardra felvitt kör-üzenet erre a lapra **hivatkozik**, és
rövidebb nála.

---

## Mit találtak, és miért volt igazuk — hétköznapi szóval

Az előző körben azt állítottam, hogy egy elutasított beadás „nem nyúl a múlthoz". A próbám ezt úgy
ellenőrizte, hogy **megszámolta a sorokat**: ugyanannyi parancs, ugyanannyi esemény, ugyanannyi
készletmozgás maradt-e. Az ellenőrző fél erre megmutatott egy szándékos rontást: az elutasítás
közben **átírt egy régi esemény időpontját**. A sorok száma nem változott — és a próbám **mind az 58
ellenőrzéssel zöldet mondott**.

**Ez pontosan az a hiba, ami ellen a követelmény szól.** A „ugyanannyi sor van" és a „ugyanaz a sor
van" **két különböző állítás**; a könyvelésben a második számít. Hétköznapi hasonlattal: ha valaki
belenyúl a tavalyi szállítólevélbe, és átírja rajta a dátumot, attól még **ugyanannyi
szállítólevél** lesz a mappában.

Megismételtem a rontásukat a saját fánkon: a mérés kimondta, hogy **valóban átírt egy régi sort**
(`changes: 1`), és a battéria mégis zöld maradt. Az ő leletük áll.

A második lelet ugyanilyen konkrét: az „elakadási pont", amit hibahatárként mutattam, a **bemenet
ellenőrzésén** akad el — tehát a könyvelés tranzakciójába **be sem lép**. Attól, hogy egy rossz kérés
már az ajtóban elakad, még nem tudjuk, hogy **félbeszakadt könyvelés** esetén minden visszagördül-e.

---

## Mi változott ténylegesen

**1. A próba mostantól a TARTALMAT nézi, nem a darabszámot.** A pillanatkép a három érintett
nyilvántartás (parancs · esemény/nyugta · készletmozgás) **minden mezőjét** rögzíti, rögzített
sorrendben — beleértve a tárolt eredmény szövegét is —, és **minden egyes lépés után** visszamér, nem
csak a sorozat végén. Mezőt azért, hogy zöld maradjon, nem hagytunk ki.

**2. A jogos naplózás és a hamisítás külön mérce.** A kiadás-leltár az ismétlésnél **jogosan új
sort kap** (a visszajátszás is kiadás). Ezért a szabály nem az, hogy „a napló nem változhat", hanem
hogy **hozzáfűzni szabad, a korábbi sorokat átírni nem**.

**3. A bemeneti próba mostantól előzménnyel indul.** Üres tárolón a „nem írt semmit" állítás semmit
nem mond a **meglévő** történetről. A próba ezért egy jogos bevétellel kezd, és a nyolc hibás
bemenetet **arra** méri.

**4. Új állítás a valódi hibahatárról.** A darabos cikk összeg-korlátja a **meglévő** atomi úton
belül üt: a tétel önmagában szabályos (1000 = a tétel-plafon), az elakadás a hatás végrehajtása
közben történik — **miután a parancs-sor és a nyugta már beíródott** ugyanabban a tranzakcióban. Itt
derül ki, hogy a visszagördítés teljes-e. Új tranzakciós keretet nem építettünk.

**Amit a próba most már megfog** (mind saját, szándékos rontással mérve, mindegyik pirosra vált):

| # | a szándékos rontás | amit eddig NEM vettünk észre |
|---|---|---|
| **M173** | az elutasítás átírja egy korábbi esemény időpontját (**az ellenőrző fél saját ellenpéldája**) | a darabszám változatlan maradt, a próba zöldet mondott |
| **M174** | a bemeneti elutasítás kiüríti a már lezárt parancsok **eredmény-tartalmát** | sor nem születik és nem tűnik el — „nem írt semmit" darabszámon igaz maradt |
| **M175** | a hatás elutasítása **nem görget vissza**: a parancs és a nyugta véglegesül, a készlet nem mozdul | részleges írás, nyugtával igazolva |
| **M176** | az ismétlés-őr **elnyeli a megváltozott tartalmat**: azonos kulcs + más tartalom néma visszajátszás | a beadó azt hinné, a mostani kérése teljesült |

---

## Három túl erős leírás javítva — a MÉRT hatásra

Az ellenőrző fél kimondta, hogy két mutáció **leírása erősebb a mért hatásánál**. Igazuk van, és a
harmadikat magam mértem meg:

- **M170** — nem kettős könyvelést okoz. A mért hatás: a másként formázott ismétlés **nem
  visszajátszás**, hanem nevezett ütközés; a mozgások száma **1 marad**. A tényleges kettős hatást az
  **M172** mutatja (2 mozgás). A kettő **két külön garancia**, nem felcserélhető példa.
- **M171** — ugyanez a garancia a másik kódhelyen (a kanonizálás visszaírása); a kár itt is a jogos
  ismétlés elakadása.
- **M168** — a régi, 12.500-as tételen ez a rontás `total_out_of_range`-et adott, tehát az **idegen
  profil MÁSIK korlátja takarta el a kárt**. A próba ezért egy **kis (7.500) tételt** is visz, ahol az
  átértelmezés egyik korlátba sem ütközik: ott mérve a visszaolvasás **csendben „7500"-at** ad
  „7.500" helyett. Ez a csendes átértelmezés a saját alakjában — és a pozitív eset (a helyes
  profilon változatlan jelentés) mellette maradt.

**És egy mondat-fegyelem.** Az előző lapom azt írta, hogy „egyetlen egysoros rontás sem tudja
megdönteni" — ez általános lehetetlenségi állítás, mérésen túli. Helyette a **kipróbált alakot** és a
**mai mérési határt** nevezzük meg.

---

## A döntések átvezetve — forrással és hatókörrel

A K10-TYP-b elfogadását **rögzítettük**, a kimondott, szűkebb hatókörrel együtt, **saját forrással
(R45)**. Az R37-es történeti döntéseket **nem írtuk át**: a felülírt sor megmarad, és az őr
mindkét forrás-lapon méri a szó szerinti idézetet. Ma a regiszter **33 döntés-sort** hordoz 29
klauzulán (R37: 29 · R45: 4), és ebből 15 klauzulán áll „referenciában elfogadva".

Egyik szám sem készültségi százalék, és a core-core egésze **nincs elfogadva**.

---

## A bizonyíték állapota a K10-csoportban

| követelmény | állítás-sor | saját ellenpárral | maradék, kimondva |
|---|---|---|---|
| **K10-TYP-a** | 7 | 6 | a „mennyiség nem mozdítja az azonosságot" sorhoz **a kipróbált alak** (az azonosító-képzőbe tett só) **túlélt**: az azonosító a felvételkor egyszer születik és tárolva marad, tehát ez az alak nem mozdítja. Hogy MÁS alak megdöntené-e, azt nem mértük — a mai mérési határ ez |
| **K10-TYP-b** | 10 | 10 | elfogadva (R45), a kimondott szűkebb hatókörre. Az OB-3 külső HTTP-/bizalmi határa **nincs** benne |
| **K10-TYP-c** | 3 | 2 | a „nincs publikus profilváltó művelet" sorra **nem gyártunk mesterséges rontást**: egy nem létező művelet hiányát forrás-méréssel állítjuk (a katalógus egyetlen `UPDATE item` írása az egység-váltás) |
| **K10-TYP-d** | 5 | 5 | a „más profilú bemenet" ága ugyanarra a cikkre nem szólítható meg (nincs profilváltás), a mérés másik cikkel történt. A tartalmi megőrzés mérce a **három nevezett táblára** és a kiadás-leltárra áll — a séma többi táblájára nem |

---

## Mérések — elkülönítve, ahogy az R45 kérte

**A mért forrás, pontosan.** Minden alábbi szám ugyanarra az állapotra vonatkozik: commit
**`29bebb70bcee365a6e325d0128ca54aee7b4bc4b`**, a magreferencia könyvtára nem-könyvelt változás
nélkül (`clean: true`), tartalmi lenyomat
**`sha256:c4b7c5ac689d476fc01f125d1a8b0ff34ad80f1b419c53157d43a3e75ff11b20`** — ugyanez a lenyomat
áll a bizonyíték-csomagban is.

### (A) SAJÁT FUTÁS — ebben a környezetben, ebben a körben

| mit futtattam | eredmény |
|---|---|
| `node v3ref/run.mjs` | **58/58 PASS** |
| az ellenőrző fél ellenpéldája a saját fánkon (esemény-átírás) | **reprodukálva** — a rontás `changes: 1`, az R44-es próbával 58/58 PASS, az ÚJ próbával **57/58** (a nevezett állítás bukik) |
| `npm run verify:v3ref` (mutációs battéria, nyolc részletben) | **173 mutáció · 173 elkapva · 0 túlélte · 0 rossz próba · 0 mérőhiba · 0 elavult horgony** |
| norma-lánc (a kanonikus ítélő a teljes bizonyítékon) | **106 sor** — 76 fedett · 20 részben · **2** nem falszifikált · 8 bizonyíték nélkül |
| `node tools/v3_norm_chain_package.mjs` | **kiadva** (a forrás-kötés minden ága átment) |
| `npm run proof:norm-chain-package` | **25/25 RENDBEN** |
| `npm run verify:external-decisions` | **33/33 PASS** — minden indok szó szerinti a SAJÁT forrás-lapjában, mindkét irányban |
| `npm run verify:kuka` | **298/298 PASS** |
| `npm run verify:decision-numbers` | **4/4 PASS** · következő szabad: D-VS-3057 |
| `npm run verify:sweep` — a TELJES söprés | **11 verifier · 11 zöld · 0 kihagyás · 0 piros** (681 mp) |
| `npm run verify:external-checks` — az Önök programjai a mi kódunkon | **17/19 MEGFELEL · 2 nevezett környezeti kihagyás**, mindkettőnek ZÖLD helyettese van (`r59a` · `r57a`) |

### (B) ÁTVETT MÉRÉS — amit NEM én futtattam

Az R45-ös lapjukon szereplő saját futásuk (Node v24.19.0): 58/58 alappróba · 25/25 csomag-ellenpróba
· a battéria 8/8-as szeletében 21/21 mutáció · az M164–M172 kilenc mutációja külön, elkülönített
másolatokon. **Ezt átvettem, nem ellenőriztem újra** — ahogy ők is kimondták a saját lapjukon, hogy a
mi 169/169-ünket nem futtatták újra.

### (C) DOKUMENTUM-ÁLLÍTÁS — ami lapon áll, nem futásból

A K10-TYP-b elfogadása, a/c/d részlegessége és az OB-3 határának kizárása **az ő döntésük**, szó
szerint rögzítve. Ez **nem gépi hitelesítés**, és tartalmi elfogadást magamnak nem adok.

---

## Amit ez a kör NEM tett meg

- **Nem** építettünk új modult, átnevezési funkciót, profilváltó keretet vagy új tranzakciós
  rendszert.
- **Nem** töröltük az elfogadott működést és a kimondott a/c hiányokat.
- **Nem** írtuk át az R37-es történeti döntéseket.
- **Nem** gyártottunk mesterséges rontást egy nem létező funkció hiányának „bizonyítására".
- **Nem** történt merge, telepítés, V2-módosítás.
- A darabolt mérés kanonikus egyesítésének R44-es javítása **érintetlen**.
