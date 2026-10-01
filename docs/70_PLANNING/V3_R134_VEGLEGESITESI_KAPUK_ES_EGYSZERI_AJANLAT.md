> **Kör:** R134 · **Sáv:** Claude-v3 · **Állapot:** lezárt

# R134 — A véglegesítési kapuk, az időszakhoz kötött hatáskör és az egyszeri ajánlat

`CMD-VS-300-002-002 R134 — REPORT` · 2026-10-01 · PR-VS-300 · STEP-VS-300-002
Repó: `valach-family/valach-system` · Végrehajtó: Claude-v3 · Tervező/ellenőrző: chatgpt-v3
Szülő: `CMD-VS-300-002-002 R134 — ANALYSIS` (8039968c-1875-41c7-88a9-f3c603236ce1)

---

## 1. Közérthető eredmény

Az R132-es csomagot a külső ellenőrző fél **nem fogadta el**, és három olyan hibát mutatott ki, amit
a saját mérésem nem fogott meg. Mind a hármat **a mi kódunkon újramértem** (reprodukálható piros),
kijavítottam, és ugyanazzal a tanúval zöldre vittem:

1. **A kiadás után érkező tiltás nem állította meg az elfogadást.** Ha egy visszahívási ajánlat
   kiadása UTÁN a munkatársat felfüggesztették (vagy letiltották, vagy felülvizsgálat indult),
   a meghívó elfogadása mégis **új tagságot adott** és elhasználta a hivatkozást. Mostantól ugyanaz
   a négy kizárás dől el a kiadásnál ÉS az elfogadásnál, ugyanabból az egy szabályból — és az
   elfogadás nevezetten elakad, a hivatkozás érintetlen marad, a képernyő pedig megmondja, mit kell
   előbb elrendezni.
2. **A régi bírálati hatáskör az új belépés után is működött.** Aki korábban jogot kapott arra, hogy
   másokon jogot változtasson, azt a megszüntetés és az újbóli belépés után is megtehette, új döntés
   nélkül. Mostantól a hatáskör a **tagsági időszakhoz** kötött: az új időszakhoz új, kimondott
   megadás kell — a régi megadás a történetben érvényes marad, de ma nem jogcím.
3. **Két azonos „újra meghívom" kérés két önálló ajánlatot adott.** Egy elveszett válasz utáni
   újraküldés tehát két meghívót tett a címzett postafiókjába. Mostantól egy szándék = egy ajánlat:
   az ismétlés ugyanazt az ajánlatot adja vissza (és ezt a nyugta ki is mondja), az eltérő tartalom
   nevezett ütközés, egy tudatos második ajánlathoz pedig új művelet kell.

Mellé elkészült, amit a szállításból hiányolt: **kattintható, közös bemutató mind a két
történettel** (megnyitható hivatkozással, repóban álló forrással és generáló paranccsal), **EN/DE
teljes felületi út** siker és elutasítás kimenettel, a súgóval együtt, és a két ÚJ válaszra **késői
válasz** mérés — plusz **két valódi folyamat versenye** az újranyitási és az ajánlat-kiadási ágon.

**Négy saját lelet is bekerült a tanulság-regiszterbe** (mind gépi jellel): KUKA-267 · 268 · 269 ·
270. A legfontosabb: a felülvizsgálati kör kapuja az R132-ben **soha nem tüzelt** (nem létező mezőre
illesztett feltétel), és a saját battériám a **hiányzó védelmet PASS-nak nevezte**.

---

## 2. Az elfogadási tábla JAVÍTOTT minősítése (A132-01…10)

Az R133-as jelentésem mind a tízet „TELJESÜLT"-nek minősítette. Ez **négy ponton túl erős volt**, és
itt nevesítve helyesbítem. A tanú minden sorban megnevezve; ami ÖRÖKÖLT (változatlan forráson mért),
az ki van mondva.

| ID | R133 minősítés | **R134 — javított minősítés** | Tanú |
|---|---|---|---|
| A132-01 | teljesült | **teljesült, változatlan** (örökölt + újramérve) | `findings_r132` A szakasz (a1–a11) · `tests/e2e/v3app-r132` B1 · `P-INVITE-revoke` |
| A132-02 | teljesült | **teljesült, változatlan** | `findings_r132` B szakasz (b1–b5) |
| A132-03 | teljesült | **teljesült, és MOST BŐVEBB**: a beváltás↔visszavonás két sorrendje mellé bekerült az ÚJRANYITÁSI beváltás és az AJÁNLAT-KIADÁS versenye is | `proof:multiconn` 50/50, öt verseny · (5) és (6) szakasz |
| A132-04 | teljesült | **teljesült, változatlan** | `findings_r132` C szakasz · `P-ORG-reentry` (a)–(c) |
| A132-05 | teljesült | **HELYESBÍTVE: az R133 bizonyítéka HIÁNYOS VOLT** — a `d4` az alap *hiányát* is sikernek fogadta el, a `d5` pedig a címzettnek szóló RÉGI meghívót váltotta be, tehát a „visszahívott kiadó korábbi delegálása" nem volt mérve. Most **valódi** régi delegált alap + a régi kiadó MÁSNAK kiadott függő meghívója + pozitív ellenpár az új időszakból. Így: **teljesült** | `findings_r134` (b1 · b7 · b8 · b9 · b10) |
| A132-06 | teljesült | **teljesült, és MOST NEVEZETT**: az azonos időbélyeg esete a magon, FIX órával mérve (`reentry_not_after_revocation`), és két cikluson át a be nem váltott, korábbi lezárásra kiadott ajánlat nevezett időszak-eltérést ad | `findings_r134` E szakasz (e1–e5) · `findings_r132` E szakasz |
| A132-07 | teljesült | **HELYESBÍTVE: NEM TELJESÜLT az R132-es alakon** — a kiadás utáni felfüggesztés/tiltás/nyitott felülvizsgálat mellett a beváltás `ok:true, outcome:regranted` volt (`membership_grant 4→5`, `grant_basis 1→2`, a token elfogyott); a kiadási oldal felülvizsgálati-kör ága pedig SOHA nem tüzelt. Javítva (RNV-02) ⇒ **teljesült** | `findings_r134` A szakasz (a2–a10, mindhárom kizárás + pozitív kontroll) · `P-ORG-reentry-gates` (a)(b) · M324 |
| A132-08 | teljesült | **teljesült, és MOST BŐVEBB**: a nulla soros ág mellé bekerült a KIVÉTELT DOBÓ tárolóhiba az ajánlat útján, a TOKENFOGYASZTÁS meghiúsulása és a tagságadás bukása — mindhárom nulla maradvánnyal | `findings_r134` D szakasz (d1–d5) |
| A132-09 | teljesült | **HELYESBÍTVE: a nyelvi bizonyíték HIÁNYOS VOLT** — az R132-B3 a FELIRATOK meglétét mérte, nem vitte végig az új műveleteket és a súgóutat. Most EN teljes visszavonási út + DE elutasított ÉS sikeres újrahívási út, mindkettő a súgó témájával. Így: **teljesült** | `tests/e2e/v3app-r134` B1 · B2 · B3 (késői válasz) · B5 (bemutató) |
| A132-10 | teljesült, nevezett maradékkal | **HELYESBÍTVE: a „külön döntés kell" nem rés-leírás** — a fennmaradó bizonyíték-rés most TÉTELESEN, lezárási feltétellel áll a norma-szövegben (négy tétel, lásd §7). GPR-01 két útjának leírása frissítve, egy ELAVULT állítás visszavonva. Így: **teljesült, nevezett maradékkal** | `v3ref/norms.mjs` ORG-N1a `remaining` · `contracts/grantPathRegistry.js` (GP-ADJUDICATION-AUTHORITY · GP-MEMBERSHIP-REENTRY) |

---

## 3. F134-01 — A kiadás utáni zárás a véglegesítésnél is zár (RNV-02)

**A mért piros, javítás előtt** (`findings_r134`, saját futás): Dóra tagságát megszüntették, Anna
kiadta az újrahívási ajánlatot, **majd** felfüggesztés került a tagságára; Dóra beváltása:
`ok:true · outcome:regranted`, `membership_grant 4→5`, `grant_basis 1→2`, `redeemed_at` kitöltve.
Ugyanez tiltással és nyitott felülvizsgálati körrel.

**Mi változott.** A négy változható kizárás (visszamenőleges érvénytelenség · nyitott felülvizsgálati
kör · felfüggesztés · tiltás) EGY feloldóba került: `v3ref/reentryGate.mjs` → `reentryExclusionsAt`.
Ezt hívja a **kiadás** (`reinviteMember`) és a **véglegesítés** (`reentryAdmission`) is — utóbbi a
beváltás tranzakcióján BELÜL is, tehát a határon bekövetkező változás sem kerülhető meg. A nemleges
válasz neve a két helyen azonos (ezt a battéria (a10) MÉRI), és a működő folytatást viszi
(`lift_suspension` · `lift_ban` · `close_review_circle`).

**Saját lelet ugyanitt (KUKA-267).** Az R132-es kiadási kapu felülvizsgálati ága
`circle.circle_id`-t vizsgált egy olyan feloldó válaszán, ami ilyen mezőt **soha nem ad** — a
feltétel mindig hamis volt, a kapu tehát ott állt, de nem zárt. A kört mostantól a **záró megvonás
esemény-azonosítója** keresi meg (`reviewCircleOfRevocation`).

**Zöld, ugyanazzal a tanúval:** (a2)–(a4) nevezett zárás, érintetlen token, nulla védett sor ·
(a5)(a7)(a9) **pozitív kontroll** mindhárom kizárásra (feloldás után ugyanaz az ajánlat működik) ·
(a10) a két kapu neve azonos. Rontás-kontroll: **M324** (a véglegesítési kizárás-kapu kiesik) —
bizonyítottan megbuktatja a `P-ORG-reentry-gates` próbát.

## 4. F134-02 — A bírálati hatáskör a tagsági időszakhoz kötött (APR-01)

**A mért piros:** Béla `alter_right` hatásköre az ELSŐ időszakban működött; megszüntetés →
újrahívás → saját elfogadás után **ugyanazzal a `granted_at`-tal** továbbra is végrehajtható volt,
új hatásköradás nélkül. És: egy ÚJ, kifejezett megadás nyers `UNIQUE constraint failed`-be futott,
vagyis az időszak-kötés önmagában **fallá** tette volna a szabályos helyreállítást.

**Mi változott.** Az `adjudication_authority` sor időszak-bélyeget kapott
(`period_grant_event_id`), amit a MEGADÁS mér (nem a hívó adja meg), és amit a **közös** értékelő
(`authorityRowAt`) a mai időszakhoz hasonlít — ugyanaz a szerkezet, mint az adatkörjognál (SGP-01).
A válasz KIMONDJA, melyik szabályt vette: `stamped` · `first_period_rule` · `projected_row_unbound` ·
`not_membership_bound`. A régi megadás a történetben marad: új, append-only napló
(`adjudication_authority_grant`), a vetület pedig a mai állapotot hordozza — így az új időszakhoz
tartozó kifejezett megadás lehetséges.

**A mozgatás kimondva.** A tiszta időszak-olvasók semleges otthonba kerültek
(`v3ref/membershipPeriod.mjs`, MPR-01), mert a `bitemporal.mjs` az `authority.mjs`-t importálja — a
közvetlen behúzás **kört** csinálna, és a kör „szerkezeti feladat, nem indok az ellenőrzés
elhagyására" (R73/R79 elve). A `bitemporal.mjs` ugyanezeket a neveket **tovább-exportálja**, tehát
egyetlen hívó behúzása sem változott; a mutációs horgonyok át vannak horgonyozva (M100 · M102 ·
M108–M111), elavult horgony **nulla**.

**Saját lelet (KUKA-268).** A javítás ELSŐ alakja a vetített (napló nélküli) tagsági soron **zárt**,
mert ott nincs esemény-azonosító — három mag-próba azonnal pirosra váltott, és a kontroll-sor is
hamis volt. Az ismeretlent nem olvassuk eltérésnek: a gyengébb tanú **kimondottan nem köt**.

**Zöld:** (b2) pozitív kontroll az első időszakban · (b4) `authority_other_period` az új időszakban ·
(b5) a történeti kérdésre ma is IGEN · (b6) új megadás működik · (b7)(b8) a régi kiadó MÁSNAK adott
függő meghívója és a régi delegált alapja sem éled fel · (b9) pozitív ellenpár az új időszakból ·
(b10) a régi adatkörjog sem. Rontás-kontroll: **M325**.

## 5. F134-03 — Az ajánlat kiadása egyszeri hatású (OON-01)

**A mért piros:** két azonos, egymás utáni `POST /api/members/reinvite` ⇒ `invite +2` ·
`invite_basis +2` · `membership_reentry +2`, és **két** levél a próbaüzenet-dobozban. A HTTP-út
minden kéréshez új tokent gyártott, tartós kérés-azonosság nélkül.

**Mi változott.** A megismételt SZÁNDÉK azonosságát a hívó adja (`operation_id`; a felületen
**panel-megnyitásonként egy**, tehát a hálózati újraküldés ugyanazt küldi), a HATÓKÖRÉT és a tartalom
kanonikus lenyomatát a szerver képezi. Az azonosság **feloldói a parancs-útról jönnek**
(`commandIdentity` · `commandScope` · `canonicalize`) — második azonosság-protokoll nem született. A
tárolás külön könyv (`operation_once`), mert a `command` tábla a TAGSÁGI jogon működő parancs-út
otthona, és egy hatásköri (`alter_right`) műveletet oda írni a kapu fajtáját csúsztatná el.

**Amit az azonosság nem fed, kimondva:** a lezárt tagsági IDŐSZAK. Azt az ajánlat maga köti
(`membership_reentry.closed_*`), a tárolt nyugta visszaadja, és az egyezést a BEVÁLTÁS méri.

**Zöld:** (c1) egy kiadás egy ajánlat · (c2) az ismétlés ugyanazt adja vissza, `replayed:true`,
nulla új sor · (c3) azonos azonosság + eltérő tartalom ⇒ `operation_identity_conflict`, nulla hatás ·
(c4) külön azonosság ⇒ új, tudatos ajánlat · (c5) ugyanaz a kulcs MÁS személyre ⇒ ütközés · (c6) az
ismétlés nem tesz második levelet a dobozba · (c7) egy nyitott időszak. Valódi verseny: **két külön
folyamat** ugyanazzal az azonossággal ⇒ EGY ajánlat, a vesztes ISMÉTLÉST kap ugyanazzal az
ajánlat-azonosítóval (`proof:multiconn` (6), 10/10). Rontás-kontroll: **M326** (az egyszeri-hatás
könyve némán üresnek látszik) · **M327** (a hiányzó azonosság néma engedély lesz).

**Saját lelet (KUKA-269).** A battériám (g1) lépése a HIÁNYZÓ védelmet PASS-nak nevezte („KÉT
újrahívás KÉT önálló ajánlat"). A lépés helyesbítve: az AZONOSSÁG dönt, nem a kérések száma.

## 6. F134-04 — A szállítás: bemutató, nyelvi utak, késői válasz

- **Közös bemutató, mind a két történettel**, kattintható lépésekkel: megnyitható átadás
  (artifact-hivatkozás a kör válaszában), kanonikus forrás a repóban
  (`docs/bemutato/V3_R134_MEGHIVO_ES_UJRABELEPES_BEMUTATO.artifact.html`), generálási parancs
  (`npm run bemutato:onallo` — a szerszám mostantól LISTÁT jár be, nem egy beégetett lapot). A lap
  **kimondja, hogy szimuláció**, és megnevezi, hol áll a mért bizonyíték; a böngésző-próba ezt a
  jelölést is MÉRI. Asztali (1280) és keskeny (390) nézetben végigkattintva, vízszintes csúszás nélkül.
- **EN/DE teljes út, nem csak feliratok:** EN — függő meghívó visszavonása végig (angol nyugta, a
  lista új igazsága, a címzett zárt útja), plusz a súgó témája a kimenetekkel. DE — **elutasított**
  újrahívás (német mondat + `next_step: lift_suspension`, írásmentesen), majd a kizárás feloldása
  után **sikeres** újrahívás német nyugtával, a német tárgyú levélből vett hivatkozással, és a súgó
  elutasítás-kimenetével.
- **Késői válasz a két ÚJ végponton** (R130 fegyelme): visszatartott válasz → „folyamatban"
  várakozó állítással → nézetváltás → a HÁROM jeles átadás (a `fulfill` befejezése · az alkalmazás
  saját törzs-olvasása · egy esemény-forduló) → DOM-tanú, hogy a régi nézet nyugtája NEM jelent meg
  az új fiók képernyőjén; mindkét végponthoz **pozitív kontroll** (változatlan nézetben a késői
  válasz megjelenik). A hat segéd közös otthonba került (`tests/e2e/lateResponse.mjs`), hogy az
  R127-es és az R134-es lap UGYANAZT futtassa; a KUKA-262 horgonyai át vannak horgonyozva.

---

## 7. A fennmaradó bizonyíték-rés — tételesen, lezárási feltétellel

Az R134 §A132-10 kérésére a `norms.mjs` ORG-N1a `remaining` szövegében (és itt) **négy** nevezett
tétel áll; a req-5 kötelezővé emelése továbbra is külön, független döntés, de ezeket **nem a döntés
hiánya**, hanem mérhető munka zárja le:

1. **Alap nélküli történeti sorok** — a `basis_id`-t nem hordozó hatáskör- és jog-sorok ma a
   HASZNÁLATNÁL zárnak, de a tárolóban maradnak. *Lezárás:* mért migrációs/felülvizsgálati út, a
   darabszámmal előtte-utána.
2. **Az időszak-kötés gyengébb tanúja** — napló nélküli (vetített) tagsági soron a hatáskör-kötés
   kimondottan nem köt (`projected_row_unbound`), a NULL bélyegű sor az ELSŐ időszak szabályára
   támaszkodik. *Lezárás:* a vetített sorok esemény-naplóvá emelése (vagy a kötés kötelezővé
   tétele) + a két ág külön mérése.
3. **A több-írós határ** — az egyszeri hatás és a véglegesítési kapuk tanúja ma egy SQLite
   referencián és KÉT valódi folyamaton áll. *Lezárás:* ugyanezek a próbák üzemi tárolón (OB-1).
4. **A szervezeti képviselet (ORG-N3)** — vagylagos jogalap-út ma nincs, tehát az ORG-N1a „nevezett
   delegáló" fogalma csak a tagság-alapú úton bizonyított. *Lezárás:* az ORG-N3a/b megépülése.

**Változatlan határok:** nincs merge, éles telepítés, V2-módosítás, új fizetős szolgáltatás, külső
levélküldés, és nincs core-/CMD-/PR-zárás. A req-5 **nem** lépett életbe.

---

## 8. Mérések — friss és örökölt, megnevezve

| Mérés | Eredmény | Friss / örökölt |
|---|---|---|
| `node v3app/findings_r134.mjs` (új battéria: valódi HTTP + tároló) | **46/46 PASS** | friss |
| `npm run verify:app-findings-r132` (helyesbített (g1) + új (g1/b)) | **64/64 PASS** | friss |
| `npm run v3ref:run` (mag-próbák, az új `P-ORG-reentry-gates`-szel) | **66/66 PASS** | friss |
| `npm run verify:v3ref` mutációs battéria | **229 rontás · 229 elkapva · 0 túlélte · 0 elavult horgony** | friss |
| `npm run proof:multiconn -- --n=10` (öt verseny, köztük KETTŐ új) | **50 menet · 50 OK · 0 hiba · 0 elakadt** | friss |
| `npx playwright test` (teljes böngésző-csomag) | **122/122 PASS** (ebből 5 az új R134-es lap) | friss |
| `npm run verify:kuka` | **543/543 PASS** (négy új tanulság, az archívum alapvonala újraírva) | friss |
| `npm run verify:grant-paths` | **13/13 + 3/3 ellenpélda** | friss |
| `npm run verify:i18n` | **49/49 + 6/6** | friss |
| `npm run verify:tutor` | **88/88 + 14/14** | friss |
| `npm run app:selfcheck` | **57/57** | friss |
| `npm run verify:decision-numbers` | **4/4** (a következő szabad szám: D-VS-3092) | friss |
| `npm run verify:capability-witness` | **PIROS — ÖRÖKÖLT és nevezett**: a képesség-regiszter a V2 repóban él, a javítása V2-módosítás volna, amit a SPEC §8 kizár (R131 döntése) | örökölt |

A mérések nyers kimenete a `var/` alatt (nem a repóban: generált). A reprodukálható PIROS alapmérés
(javítás előtti futás) a `var/tmp/r134_red_baseline.txt` fájlban keletkezett, és a §3–§5 számai ebből
származnak.

---

## 9. Ág, SHA-k, kipróbálás

- **Ág:** `claude/cmd-vs-300-002-002-r134-srjxnp`
- **Induló fej (az R134-ben ellenőrzött):** `b8c80b68e2d1dac02ff82ca318c43bf0522826cc`
- **Mért SHA a termékkódra:** a csomag commitja (lásd a kör üzenetét) — a fenti mérések ezen a
  munkafán futottak, tiszta indexszel a jelentés commitja előtt.
- **Bemutató (megnyitható):** a kör válaszában álló artifact-hivatkozás; a repóbeli forrás és a
  generálási parancs a §6-ban.

**Kipróbálási sorrend (fejlesztői gépen, hálózat nélkül):**
`npm run app:dev` → regisztráció két e-mailcímmel → vállalkozási munkakörnyezet → munkatárs
meghívása és elfogadása → adatkör megadása → **Felhasználók → tagság megszüntetése** → **Újra
meghívás** (a megerősítés kimondja: a címzettnek el kell fogadnia, és a régi adatjogok nem állnak
vissza) → a próbaüzenetek dobozából a hivatkozás → elfogadás → a készlet zárva, külön megadás után
csak a mennyiség. Az ismétlés-védelem kipróbálása: az **Újra meghívás** űrlapot egyszer megnyitva a
hálózati újraküldés ugyanazt az ajánlatot adja vissza (a nyugta ezt ki is mondja); új ajánlathoz az
űrlapot újra meg kell nyitni.

---

## 10. Döntés- és forrás-delta

- **D-VS-3091** (új): a véglegesítési kapuk, az időszakhoz kötött hatáskör és az egyszeri ajánlat.
- **Új modulok:** `v3ref/reentryGate.mjs` (RNV-02) · `v3ref/onceOnly.mjs` (OON-01) ·
  `v3ref/membershipPeriod.mjs` (MPR-01, mozgatott tiszta olvasók) · `tests/e2e/lateResponse.mjs`
  (mozgatott késői-válasz fegyelem) · `v3app/findings_r134.mjs` · `tests/e2e/v3app-r134.spec.mjs` ·
  `docs/bemutato/V3_R134_…artifact.html`.
- **Séma (nulla migráció, a V3-ban még nincs migrációs lánc):** `adjudication_authority` +
  `period_grant_event_id` · új `adjudication_authority_grant` napló · új `operation_once` könyv.
- **Norma:** `norms.mjs` ORG-N1a `remaining` — a három javított rés és a NÉGY tételes maradék.
- **GPR-01:** GP-ADJUDICATION-AUTHORITY (`use_gate` · `works` · egy ELAVULT `missing` állítás
  visszavonva) · GP-MEMBERSHIP-REENTRY (`use_gate` · `works` · próbák).
- **Tanulság-regiszter:** KUKA-267 · 268 · 269 · 270 (mind gépi jellel, archívum-sorral és
  őr-otthonnal); a KUKA-266 tiltólistája **futtatott** kulcs alá került, a KUKA-262 horgonyai
  átkötve.
- **Mátrix-katalógus (board):** a zárás mátrixa ebből a repóból nem futtatható (a katalógus a V2-ben
  él) — az eszköz ezt nevezett hibával mondja ki; CMD-zárás nem történt.

---

## 11. Munkamenet-mérés

`npm run meres:fogyasztas -- --session auto --from <az R134 board-időbélyege> --quick`:
**ablak** 2026-10-01T15:42:43Z → a csomag vége · **hívás** 279 · **fő-szál kontextus medián**
499 048 (max 764 030) · **ügynök-bemenet** 0 (nulla al-ügynök) · **lefedettség: teljes**.
**A chatváltási jelző ELÉRVE** (≥ 400 000): ezt a javító-befejező blokkot célzott ellenőrzéssel
lezártam; a KÖVETKEZŐ önálló nagy blokk induljon friss beszélgetésben. A csomag-ablak és a
kumulatív munkamenet itt KÜLÖN szerepel: a fenti számok ennek az EGY csomagnak az ablakára szólnak.
