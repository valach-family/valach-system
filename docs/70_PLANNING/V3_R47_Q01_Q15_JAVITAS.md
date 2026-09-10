# R47 — A TIZENÖT MAGHIBA JAVÍTVA, A SAJÁT PRÓBÁTOKON MÉRVE

**Kör:** CMD-VS-300-002-001 R47 · **Sáv:** Claude-AUX · **Dátum:** 2026-09-10
**Válasz:** az R42 §3/2. pontjára („Q01–Q15 érintett magviselkedése; meghívó/jog/parancs/kiadás")

---

## 0. A LEGRÖVIDEBB VÁLASZ

**A ti `challenge.mjs`-etek, változatlanul, a javított forráson: 17 tétel · 16 PASS · 1 FAIL · 0 ERROR.**

Kiindulás (R42, `c58f5f6…`): **17 FAIL**. Az egyetlen megmaradt FAIL a **Q17**, és az VALÓDI,
NYITOTT hiba, amit szándékosan nem javítottunk (§5).

**A §4-et külön kérjük elolvasni.** Ott először azt írtuk le, hogy a Q14 azért bukik, mert a ti
Q14 és Q15 elvárásotok ütközik. **Ez az állításunk téves volt, és a saját mérésünk cáfolta meg** —
a javítás, amit a cáfolat után elvégeztünk, nem csak zöldre vitte a Q14-et, hanem szigorúbb
adatkiadási alakot is adott, mint az előző.

Amit ehhez nem ti kértetek, mégis megtettünk, mert enélkül a lap hazudna:

- a saját teljesség-kritikánk talált egy **ÉLŐ hibát, amit ti nem** (§3) — lejárt meghívó, ami
  tagságot adott;
- a felülvizsgálataitok **maradék-mondatait** mondatonként lezártuk vagy nyitva hagytuk, **gépi
  őrrel**, ami a kitalált lezárást pirosra viszi (§6);
- az R42-ben NÉV SZERINT megnevezett, de általunk addig **nem mért** kombinációt (megvonás →
  képviseleti lekérdezés) megmértük, és mutációval bizonyítottuk, hogy a próba tényleg fogja (§2/A14).

---

## 1. HOGYAN MÉRTÜK — ÉS MIÉRT ÍGY

A ti próbátokat futtattuk, nem a miénket. Ez szándékos: a saját próbánk a saját olvasatunkat
igazolná vissza (KUKA-054), a tiétek nem.

```
munkakönyvtár/
  challenge.mjs        ← a ti fájlotok, KARAKTERRE változatlanul (az R42 §"challenge.mjs"-ből)
  source/v3ref/*.mjs   ← a MAI, javított forrás
  source/contracts/releaseOrder.js, artifactNaming.js
futtatás: node challenge.mjs
```

Két dolgot érdemes tudni erről a futásról:

1. **A fixtúrátok VÁLTOZATLANUL betöltődött.** A séma több ponton változott (a parancs kulcsa
   összetett lett, a kiadási sor saját azonosítót kapott), de a ti `world()`-ötök pozicionális
   `INSERT`-jei mind lefutottak — tehát nem „a mi új sémánkra szabott" próbát mértünk.
2. **A `source_commit: 'c58f5f66…'` a ti fájlotokban BENNE MARADT**, mert nem nyúltunk hozzá. Ez a
   kimeneten így is jelenik meg, és **nem igaz a mai forrásra** — pontosan az a P01-hiba, amit ti
   írtatok le. A mi futtatónk ezért mér saját tartalmi lenyomatot; a ti fájlotokban ez a mező
   ÁLLÍTÁS marad. Kimondjuk, nem javítjuk bele a ti próbátokba.

---

## 2. A TIZENÖT TÉTEL — FORRÁS · PRÓBA · EREDMÉNY · MEGMARADT KORLÁT

Minden sor négy dolgot rögzít, ahogy kértétek. A „próba" oszlop a MI állandó próbánk, ami a
javítást tartósan őrzi; a „ti" oszlop a ti `challenge.mjs`-etek ítélete a mai forráson.

| # | Vizsgált forrás | Mi változott | A mi próbánk | Ti | Megmaradt korlát |
|---|---|---|---|---|---|
| **Q01** | `command.mjs` · `commandScope`, `findCommandInScope` | az ismétlésvédelmi kulcs HATÓKÖRÖS lett: `(book_id, actor, idem_key)` az elsődleges kulcs; a hatókör hiányos címre KIVÉTELT dob, nem csendben szűkít | `P-CMD-namespace` | PASS | a hatókör három tengelye a mi szerződésünk; ha a valódi motorban kliens- vagy művelet-névtér is kell, az BŐVÍTÉS lesz, nem javítás |
| **Q02** | `command.mjs` · `canonicalize`, `commandIdentity` | REKURZÍV kanonizálás, minden szinten rendezett kulcsokkal; a tömb-sorrend jelentéses; `non_finite_number` és `unsupported_value` NEVEZETT hiba | `P-CMD-identity` | PASS | **az „ismeretlen mező ELUTASÍTÁSA" fele KIMONDOTTAN függő**: ahhoz bemenet-séma-regiszter kell, ami még nincs. Ma az ismeretlen mező az AZONOSSÁGBA beleszámít (tehát nem tűnik el), de nem tiltott |
| **Q03** | `command.mjs` · `commandIdentity` | az azonosság lefedi a típust ÉS a típus-verziót (`CANON_VERSION = 'canon-1'` külön tengely) | `P-CMD-identity` | PASS | a „minőség" és az „elvárt állapot" (R42) nem szerepel: a mai magban nincs ilyen fogalom — ha lesz, az azonosságnak is nőnie kell |
| **Q04** | `command.mjs` · `submitCommand` | a jog ÚJRA meg van kérdezve a `resolve()` UTÁN és az INSERT ELŐTT | `P-CMD-finalize` | PASS | **DETERMINISZTIKUS megszakítási ellenpróba.** A TÖBBFOLYAMATOS versenyteszt (valódi párhuzamos kapcsolatokkal) az R42 §3/3. pontja szerint KÜLÖN kell — még nincs meg |
| **Q05** | `authz.mjs` · `instantMs`, `evidenceStandingAt` | hiányzó · olvashatatlan · **zóna nélküli** · jövőbeli időpont mind NEVEZETT indokkal tilt; `age < 0` ⇒ `evidence_future_dated` | `P-AUTHZ-evidence` | PASS | „megengedett óraeltérés" nincs deklarálva — ma a NULLA a tűrés. Ha kell tűrés, az KIMONDOTT paraméter lesz |
| **Q06** | `authz.mjs` · `EVIDENCE_KEYS`, `evidenceStandingAt` | a `valid_until` KÖTELEZŐ és KÜLÖN tengely; friss lekérés + lejárt megbízás ⇒ `evidence_expired`; ismeretlen mező ⇒ `evidence_shape_unknown_field` (nem nyelődik el) | `P-AUTHZ-evidence` | PASS | a mezőnevek a MI választásunk (`obtained_at` · `valid_until` · `revoked` · `source_down`); ti magatok írtátok, hogy más név is lehet |
| **Q07** | `authz.mjs` · `OP_CLASSES` (Map), `profileFor` | a művelet-osztályok `Map`-ben állnak, tehát `toString` · `constructor` · `__proto__` nem talál profilt ⇒ `unknown_op_class`, fail-closed | `P-AUTHZ-opclass` | PASS | — |
| **Q08** | `authz.mjs` · `membershipEffectiveAt` | a tagság KÉT vége EGY feloldón; a 2099-es kezdet MA nem hatályos, és ugyanezt a feloldót hívja a meghívó-oldal is | `P-AUTHZ-membership-time` | PASS | a mező JELENTÉSE most „kezdő hatály". Ha a valódi modellben pusztán keletkezési idő lesz, KÜLÖN hatálymező kell — ezt ti is így írtátok |
| **Q09** | `invite.mjs` · `inviteGrantAt`, `DELEGABLE_ROLES` | a beváltás a kibocsátó MAI jogát kérdezi, és a továbbadható hatáskört is | `P-INVITE-authority` | PASS | **a „megmaradó független szervezeti alap" NINCS modellezve**: ma a kibocsátó személyes joga az EGYETLEN alap, tehát a távozása minden függő meghívóját megállítja. Ezt ti nevesítettétek, és igazatok van |
| **Q10** | `invite.mjs` · `redeemShapeFor` (`foreign_existing_subject`) | idegen, MÁR LÉTEZŐ alany címére a beváltás `account_authentication_required`-del áll meg, `switch_account_offered` jelzéssel | `P-INVITE-authority` | PASS | **a jelzés nem út**: maga a biztonságos fiókváltás nincs megépítve (visszatérő szándékkal együtt) — NYITOTT |
| **Q11** | `invite.mjs` · `redeemInvite` (`birth` ág) | a születés-ág VALÓBAN létrehozza a fiókot a hitelesítő adattal; a hitelesítő-írás NULLA sornál NEVEZETT hibát dob (`CREDENTIAL_WRITE_BLOCKED`), nem jelent sikert | `P-INVITE-effect` | PASS | a „belépés" fogalma a magban nincs; a fiók megléte ≠ belépett munkamenet |
| **Q12** | `invite.mjs` · `store.tx`, `store.mjs` · `withTransaction` | fiók-, tagság- és meghívó-írás EGY tranzakcióban; a próba megszakítja az utolsó írást ⇒ NULLA félkész sor | `P-INVITE-effect` | PASS | elkülönített SQLite-on mérve; a valódi motor tranzakció-szemantikáját ez nem igazolja |
| **Q13** | `invite.mjs` · `membershipOutcome` | NÉGY külön kimenet: `granted` · `already_active` · `revoked_needs_decision` · `role_differs`. A csendes reaktiválás tiltva marad, de a hatástalan beváltás sem jelentődik sikeres tagságadásnak | `P-INVITE-authority` | PASS | a „külön döntés" ÚTJA (ki dönt, hol) nem épült meg — ma csak a NEVEZETT kimenet van meg |
| **Q14** | `store.mjs` séma · `command.mjs` · `disclose` | a kiadási sor saját, egyedi azonosítót kapott (`INTEGER PRIMARY KEY AUTOINCREMENT`); az időbélyeg többé nem azonosság; a befogadás nem szolgáltat ki tartalmat | `P-CMD-disclosure` | **PASS** | lásd §4: az első alakunk itt bukott, a saját cáfoló mérésünk után javítva |
| **Q15** | `command.mjs` · `submitCommand` → `disclose` | a feloldott TARTALOM kizárólag a leltározott OLVASÓ úton mehet ki; az ISMÉTLÉS ága is kiadás, tehát leltározva | `P-CMD-disclosure` | PASS | a NÉGY állapotból („előkészítve / átadás megkísérelve / kiszolgálva / ember elolvasta") ma KETTŐ különül el: befogadás ≠ kiszolgálás. A másik kettő nincs megépítve |

**A mi állandó próbakészletünk ma:** 16 próba · mind PASS · **27 mutáció · mind a NEVEZETT
állításon elkapva** · 6 állandó hazugság-ellenpróba · mind védett.

---

## 3. AMIT A SAJÁT TELJESSÉG-KRITIKÁNK TALÁLT, ÉS TI NEM

A tizenöt javítás után lefuttattunk egy teljesség-kritikát azzal a kérdéssel, hogy **mi maradt
mérésen kívül**. Talált egy ÉLŐ hibát, ami a ti tizenhét ellenpéldátokban nem szerepelt:

> **A LEJÁRT MEGHÍVÓ TAGSÁGOT ADOTT, HA AZ IDŐPONTJA ELTOLÁSOS ZÓNÁBAN ÁLLT.**
>
> A régi kód SZÖVEGET hasonlított: `inv.expires_at <= clock.now()`.
> Mérve, az akkori élő forráson: `expires_at = '2026-09-09T09:00:00+02:00'` (valósan **07:00Z**,
> tehát az óra 08:00Z-jéhez képest **LEJÁRT**) — szövegként viszont `'2026-09-09T09…' > '2026-09-09T08…'`,
> tehát „még nyitva". A beváltás lefutott, `shape: 'birth'`, és **tagságot adott**.

Ez ugyanaz a hibaosztály, amit a Q05-ben ti a bizonyíték-időn megtaláltatok — csak a meghívó
lejáratán, ahol nem néztetek. Nálunk ez azért fájó lelet, mert a javítás során a bizonyíték-oldalon
bevezettük a `instantMs` feloldót, és **a meghívó-oldalra nem vittük végig**: pontosan a saját
KUKA-039 szabályunk („a fél őr") ellen vétettünk, egy körrel azután, hogy a szabályt idéztük.

Javítva: `inviteWindowAt` az `instantMs`-t hívja, tehát IDŐPONTOT hasonlít, nem szöveget.
Állandó próba: `P-INVITE-window`. Mutáció: **M21** — a szöveg-összehasonlítás visszatétele
bizonyítottan PIROSRA viszi.

---

## 4. A Q14 — ELŐSZÖR TÉVEDTÜNK, ÉS A SAJÁT MÉRÉSÜNK CÁFOLT MEG

Ezt a szakaszt eredetileg így írtuk meg: *„a Q14 `count === 2` elvárása és a Q15 együtt nem
teljesíthető — a ti két elvárásotok ütközik."* **Ez téves volt.** Nem ti tévedtetek, hanem mi —
és nem érveléssel derült ki, hanem méréssel: a saját állításunkat próbáltuk megcáfolni, és sikerült.

### Amit a cáfoló mérés adott

A Q15 állítása `!r.resolved || count > 0` — tehát **VAGY** a beadás nem ad vissza tartalmat, **VAGY**
van leltár-sor. Az első ágra nem gondoltunk. Négy lehetséges alakot építettünk fel, és mindegyikre
lefuttattuk a ti KÉT állításotokat:

| alak | a beadás ad tartalmat? | a beadás leltároz? | sorok | Q14 | Q15 |
|---|---|---|---|---|---|
| **A** — az akkori alakunk | igen | igen | 3 | **FAIL** | PASS |
| **B** — nem ad, nem leltároz | nem | nem | 2 | **PASS** | PASS |
| **C** — nem ad, de leltározza az `effect_id`/`state`-et | nem | igen | 3 | **FAIL** | PASS |

Tehát **létezik olyan alak, amiben mindkét elvárásotok teljesül** — az ütközés a MI tervezői
döntésünkből eredt, nem a ti szabályaitokból.

### Amit ebből építettünk — és miért nem egyszerűen a „B"

A B alak zöld, de van egy ára: a beadás válaszában maradó `effect_id` és `state` nyom nélkül megy ki.
Ezért nem a zöldhöz igazítottuk a kódot, hanem megkérdeztük, **mit TUD MEG a hívó** az egyes ágakon:

- **BEFOGADÁS:** az `effect_id` a hívó SAJÁT bemeneteinek lenyomata (`hash(book|actor|idem_key)`),
  a `state` pedig ezen az ágon állandó. A hívó tehát **semmi olyat nem tud meg, amit ne ő maga adott
  volna**. Ami nem közöl új tényt, arra leltár-sort írni zaj, nem védelem.
- **ISMÉTLÉS:** a válasz egy **MÁR LÉTEZŐ** parancs állapotát közli — ez a hívónak ÚJ tény. Marad
  kiadás, marad leltározva (`command_replay`).
- **A FELOLDOTT TARTALOM:** kiszolgálás. **Kizárólag** az olvasó úton mehet ki, ami mindig leltároz.
  A ti szavaitokkal: a beadás válasza „ELŐKÉSZÍTVE", nem „KISZOLGÁLVA".

A `command_accept` kiadás-fajtát ezért **kivezettük** — a szót is, nem csak a hívást: a `disclose`
ismeretlen fajtaként **dob** rá, ha valaki visszatenné.

### Ami ettől szigorúbb lett, mint az előző alak

A feloldott tartalomnak most **EGYETLEN** kijárata van (a leltározott olvasó út), korábban kettő.
Ez nem a Q14 kedvéért történt, hanem azért, mert a mérés után ez bizonyult a helyes alaknak.

**Mérve, a ti próbátokkal: Q14 PASS · Q15 PASS.** Két új mutáció őrzi mindkét irányt:

- **M16** — a beadás megint kiszolgálja a tartalmat, leltár nélkül → PIROS;
- **M27** — az ismétlés ága nyom nélkül közli egy létező parancs állapotát → PIROS.

### A tanulság, amit magunkra nézve rögzítünk

Amikor egy külső próba bukik és a magyarázatunk az, hogy **a próba a hibás**, az a
legönigazolóbb helyzet, ami létezik. Ilyenkor nem magyarázni kell, hanem **megcáfolni a saját
állításunkat** — itt pontosan ez történt, és a cáfolat nem csak a hibánkat mutatta meg, hanem egy
jobb adatkiadási alakot is.

## 5. A Q17 — AZ EGYETLEN MEGMARADT FAIL: VALÓDI, NYITOTT HIBA, SZÁNDÉKOSAN NEM JAVÍTVA

```
a = var/reports/v3_v3.0.0-alpha_20260909_080000_measurement.json
b = var/reports/v3_v3.0.0-alpha_20260909_080000_measurement.json   ← ugyanaz
```

Nyitva marad, és ezt nem szépítjük:

- az operátor ebben a körben a **Q01–Q15-öt** rendelte meg, a Q17 nem volt benne;
- az R46-ban visszavontuk a korábbi „Q17 kész" állításunkat — általános alakban tarthatatlan volt,
  és ez azóta is így áll;
- a ti orvosságotok (egyedi futásazonosító + atomi, felülírást kizáró létrehozás) elfogadott; az
  útnév-előtag megtartható.

Ez **nem az ütemezés kérdése, hanem kockázat**: amint a rendszer valódi állományokat ír, két
egyidejű futás felülírhatja egymást. A következő kör bemenetére került.

---

## 6. A FELÜLVIZSGÁLATAITOK MARADÉKAI — MONDATONKÉNT

Az R42-ben hat próbához adtatok hatókörös ítéletet, és mindegyikhez **maradékot** írtatok. Azok a
mondatok NÉV SZERINT sorolták a Q01–Q15 ellenpéldákat. Ha most csak annyit írnánk, hogy „javítva",
a lap a mai kódról állítana valótlant — a vallomásotokat viszont nem írjuk át, mert az történelem.

Ezért **külön rekord** áll melléjük (`v3ref/reviews.mjs` → `RESIDUAL_RESOLUTIONS`), és az minden
maradék-mondatra megmondja, mi lett vele. Mért mai állás:

**23 mondat · 15 próbával MÉRVE · 0 „javítva de méretlen" · 8 NYITOTT**

A nyolc nyitott, szó szerint:

| próba | a mondatotok | miért nyitott |
|---|---|---|
| P-A04 | „nem méri a HTTP státuszt, fejlécet, redirectet, böngészőképet, háttérkérést vagy időzítést" | a magban NINCS HTTP-réteg — a szállítási rétegben mérendő |
| P-A04 | „működő fiókváltási utat sem igazol" | a Q10 NEVEZETT elutasítást ad, de az ÚT nincs megépítve |
| P-A04b | „nem jelentkezik be" | a magban nincs munkamenet-fogalom |
| P-A04b | „a csatornabizonyítékot közvetlenül adatbázisba írja" | a próbák MA IS így írják — tesztbemenet, nem hitelesítéspróba |
| P-K03-cred | „az MFA" | a több-tényezős hitelesítés a magban nem létezik |
| P-K03-intent | „a pending_intent csak created_at-ot tárol, a resumeIntent nem ellenőriz lejáratot" | MÉRVE a mai forráson: ma is így van, a kör nem érintette |
| P-K03-intent | „nincs valódi belépés, session-rotáció, sessionhöz kötött folytatás, lejárati teszt, több párhuzamos meghívó vagy visszatérési cél" | egyik sem született meg |
| P-A14 | „a 24 óra TESZTPARAMÉTER, nem jogi/adminisztratív szabály" | igaz ma is — ez üzleti/jogi döntés, nem kód-kérdés |

**A lezárás nem lehet szó**: a rekord gépi őrön megy át (`checkResolutions`), ami a futtató
INDÍTÁSAKOR fut, és négy irányban mér. Bizonyítottan piros mind a háromra, amit kipróbáltunk:

- kitalált mondat (ami nem szerepel a ti maradék-szövegetekben) → *„a mondat SZÓ SZERINT nem szerepel"*;
- „mérve", de nem létező próbára hivatkozva → *„a megnevezett próba nincs a szerződésben"*;
- néma lezárás, érdemi indok nélkül → *„az indok túl rövid"*.

Ezen felül **mindkét irányban** mér: amelyik vallomásnak van maradéka, ahhoz KELL bejegyzés.

### Amit ebből mi is megtanultunk

Az R42-ben ezt írtátok a P-A14-hez: *„a megvonás → képviseleti lekérdezés kombináció külön hiányzik"*.
A javítás után **újra megmértük**, és igazatok volt: a kombinációt semmi nem mérte. A meglévő ág a
BIZONYÍTÉK megvonását nézte (`revoked: true`), ami MÁSIK tengely. Pótolva: a `P-AUTHZ-evidence`
utolsó ága visszavonja a TAGSÁGOT, majd hibátlan, friss megbízással kérdez — `membership_revoked` a
válasz. Új mutáció (**M26**) cseréli meg a két ág sorrendjét, és bizonyítottan pirosra viszi.

---

## 7. AMI EBBEN A KÖRBEN NEM TÖRTÉNT MEG — KIMONDVA

- **A08 konkurencia** (R42 §3/3): valódi párhuzamos kapcsolatokkal. A Q04 determinisztikus
  ellenpróbája NEM helyettesíti.
- **A07 + A15** (R42 §3/4): 12 előre bejelentett üzleti elvárás.
- **A06 · A05 · A01/A02 · A09 · A10** (R42 §3/5).
- **Q17** (§5).
- **Bemenet-séma-regiszter** — enélkül a Q02 „ismeretlen mező elutasítása" fele nem teljesíthető.
- **Visszaállítási próba** ütemezve, az első éles adat ELŐTT; **migráció-ujjlenyomat** védett
  kiadási alapvonalhoz mérve. Mindkettő NEVESÍTETT függő, nem elfelejtve.

---

## 8. A REPRODUKÁLÁS

```
# a mi készletünk (adatbázis nélkül fut, elkülönített SQLite-on)
npm run verify:v3ref     # 16 próba + 27 mutáció + 6 hazugság-ellenpróba
npm run verify:sweep     # a teljes söprés

# a TI próbátok a mi forrásunkon
#   munkakönyvtár/challenge.mjs  = a ti fájlotok változatlanul
#   munkakönyvtár/source/        = v3ref/*.mjs + contracts/{releaseOrder,artifactNaming}.js
node challenge.mjs
```
