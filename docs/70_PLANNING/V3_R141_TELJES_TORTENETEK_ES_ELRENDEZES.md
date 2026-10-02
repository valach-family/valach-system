> **Sáv:** Claude-v3 · **Állapot:** lezárt

# A KÉT TELJES TÖRTÉNET — MEDDIG JUT, ÉS HOL ÁLL MEG

**A végrehajtott parancs:** `CMD-VS-300-002-002 R140 — SPEC` (chatgpt-v3, 2026-10-02).
**Ez a jelentés:** R141. *(A kettő NEM ugyanaz a szám.)*

---

## 1. A PRÓBAFELÜLET — EZ A HIVATKOZÁS NYITHATÓ MEG

**https://claude.ai/artifact/Fc2pVcQUEYadMSR29kWRF9**

**Három lépés az indulásig:**

1. Nyisd meg a fenti hivatkozást, majd a **„Bemutató megnyitása"** gombot.
2. Válassz történetet: **1 · Meghívás visszavonása** vagy **2 · Munkatárs visszatérése**.
3. Kövesd a buborékot. Ahol műveletet kér, ott a **valódi gombot** kell megnyomni — a „Tovább" nem
   végzi el helyetted. Ahol szereplőt kell váltani, a sáv **„Váltás Béla nézetére"** gombja viszi.

**A HÁTTÉR KIMONDVA:** a VALÓDI felület fut (`app.js` · `tour.mjs` · `style.css` · nyelvcsomagok),
de a válaszokat elkülönített minta-háttér adja (`demo-adapter.mjs`), ami csak a
`<meta name="vs-demo">` jelre telepszik. **Ebből sem hálózati, sem adatbázis-bizonyíték nem
következik.** Minden szereplő kitalált.

---

## 2. A/B TELJESÍTÉS — ŐSZINTÉN

| | A · Meghívás visszavonása | B · Munkatárs visszatérése |
|---|---|---|
| Deklarált lépés | 18 | 18 |
| **1280 px-en végigvihető** | **IGEN** (18/18) | **NEM** — a 9. lépésen áll meg |
| Reset után MÉGEGYSZER végig (1280 px) | **IGEN** | nem mérhető (az első sem ment végig) |
| Végállapot önálló mérése (1280 px) | **zöld** (lásd lent) | nem mérhető |
| **390 px-en végigvihető** | **NEM** — a 11. lépésen áll meg | **NEM** — a 9. lépésen áll meg |

**A 390 px-es állás KIMONDVA:** az „A" történet telefonon a 11. lépésig jut (a mobil menü feltárása
után a Felhasználók újra-megnyitásánál áll meg), a „B" ugyanott, a 9.-en, mint asztali gépen. Az
R140 mindkét történetet mindkét szélességen kérte — **ezt a kör nem teljesítette**, és nem is
állítom teljesítettnek. Ami 1280 px-en MÉRT és zöld, az az „A" történet teljes egésze, kétszer.

**A) MINDEN KÉRT SZAKASZ MEGVAN, ÉS MÉRVE VAN.** Felhasználók → függő meghívó sora → visszavonás →
megerősítés → visszavont státusz → **a címzett nézetére váltás** → a próbaüzenetekben a **RÉGI
hivatkozás megnyitása**, és a képernyő kimondja, hogy visszavonták (elfogadás gomb sincs) → **vissza
Anna nézetére** → **ÚJ meghívó kiadása** → **újra Béla nézetére** → **Béla saját elfogadása** → az
eredmény látszik a fiókváltóban. A végállapot ÖNÁLLÓ mérése (nem a lépés-listából levezetve):

- a meghívott VALÓBAN tag lett: `["béla személyes köre","Minta Műhely Kft."]`
- a végén az ő nézetében vagyunk: `bela@mintamuhely.hu`
- KÉT meghívó áll a történetben: a visszavont és az elfogadott
- a záró lap igazat mond: **Elvégezve: 18 · Kihagyva: 0 · Hátravan: 0**
- az újrakezdés az ÜZLETI állapotot is visszaállítja (Anna, 0 elvégzett lépés), és utána a **teljes
  folyamat mégegyszer végigmegy**

**B) NYOLC LÉPÉS MEGY, A KILENCEDIK NEM.** Működik: a tagság megszüntetése (igazolt szerver-válaszra)
→ külön **Újra meghívás**, a megerősítés kimondja, hogy a korábbi hozzáférések nem állnak vissza →
**váltás Béla nézetére** → a próbaüzenetekből a meghívó megnyitása → **Béla saját elfogadása**.
**ITT ÁLL MEG:** a 9. lépés a **cég fiókjára váltás** a fejléc fiókválasztójában, és a tanú ezen
nem jut túl (`9/18`, mindkét képernyő-méreten). Ezért a B történet hátralévő szakaszai —
„tagság van, készletadat nincs", a külön készlet-jog megadása, és a „mennyiség igen, ár nem"
végeredmény — **NINCSENEK MÉRVE, és nem is állítom, hogy működnek.**

**Amit a lelet pontosan mond:** a lépés a fiókválasztót helyesen kiemeli és `actorPending`
állapotban várakozik; a tanú megnyitja a választót, de a váltás nem megy végbe. Hogy ez a
felületen, a próbafelület hátterén vagy a tanú kattintás-útján múlik, **nem mértem meg** — tehát
nem is minősítem.

---

## 3. LÁTHATÓ ELRENDEZÉS — A KÖZÖS FELÜLETEN JAVÍTVA

1. **1280 px, tagtáblázat.** A `.badge` szabályon `overflow-wrap: anywhere` állt, ezért az „Árak"
   oszlop jelvénye („Megtekintheti") KARAKTERENKÉNT tördelve jelent meg. A jelvény mostantól nem
   törik, és ha a tábla nem fér el, a **saját tárolója gördül** vízszintesen — a lap nem.
2. **390 px, nyugta.** Ugyanaz a mondat kétszer jelent meg (a lapon és lebegő nyugtaként), és a
   lebegő ráült a táblázat sorára. A nyugta mostantól **nem ismétli** a lapon MÁR LÁTHATÓ mondatot,
   és **soha nem fog el kattintást**.
3. **Az útmutató kártyája sem fog el kattintást.** MÉRVE: a tag-lista gombját a buborék
   **lépés-listájának** egy `li`-je nyelte el, és a végigjárás ott megállt. A kitérés megmarad, de
   már csak az olvashatóságért felel; a kattintás-biztonságot a kártya átengedése adja.

---

## 4. A TANÚ ÁTÉPÍTVE (R140 §Bizonyítás)

- mindkét TELJES történetet járja, **valódi gombokkal** (visszavonás · tagság-megszüntetés · újra
  meghívás · új meghívó · elfogadás · jogadás · szereplő- és fiók-váltás);
- a **végállapot önálló elvárás**, nem a lépés-deklarációból levezetve;
- **reset UGYANABBAN a lapban**, és utána a TELJES folyamat mégegyszer (a korábbi „kétszer resetelt
  és `done===0`-t nézett" alak nem volt kétszeri végigjárás — az R140 helyesen szóvá tette);
- **negatív kontroll** kapcsolóval (`--negativ-kontroll`): egy kötelező késői lépés kihagyása piros;
- **haladás-napló és pörgés-őr**: a némán elakadó tanú maga is hiba (KUKA-280).

---

## 5. A MÉRT ÁLLAPOT

| Battéria | Eredmény | Frissesség |
|---|---|---|
| `verify:kuka` | **574/574** | friss |
| `verify:tutor` | **88/88** | friss |
| `verify:i18n` | **49/49** | friss |
| `verify:app-findings` (R75) | 73/73 | friss |
| `verify:app-findings-r77` | 34/34 | friss |
| `verify:app-findings-r79` | 49/49 | friss |
| `app:selfcheck` | 57/57 | friss |
| `proof:demo-walk` | **22 zöld · 6 piros** — A @1280: 18/18 (kétszer) · A @390: 11/18 · B: 9/18 | friss |

**Teljes söprés NEM futott** (az R140 célzott próbát kért) — ez **nem igazolt**, nem zöld. A
`findings_r134`, a core és a mutációs battéria ebben a körben **NEM futott újra**: ezek a V3 magját
mérik, amit ez a kör nem érintett — **örökölt** eredmény az R139-ből (70/70 · 66/66 · 237/237).

**Forrás-fej:** `0d9e75d50aff485bdaba4b4fdd1e0df1dc0e68f3` · **záró fej:** a kör utolsó commitja az
ágon (`claude/cmd-vs-300-002-002-r136-7hjq1z`).

---

## 6. HÁROM ÚJ TANULSÁG — ÉS EGY, AMIT AZ ŐR FOGOTT MEG

- **KUKA-278** — a kivételt másodszor is csak az egyik döntési pontra tettem be: az „elvégzett
  lépésnek nincs szüksége a céljára" szabály a rajzolásban állt, a továbblépésben nem, és a 18
  lépéses történet a 17.-en akadt el.
- **KUKA-279** — az átadás és a visszaállás EGY pár: a mentést megépítettem, a visszaállást csak a
  lap indulásához kötöttem, és a futás némán eltűnt a történet közepén.
- **KUKA-280** — a némán elakadó tanú (és a pörgés-őr a záró mérésen MEGFOGTA a mobil kört,
  névvel: `s11/pending·targetPending` · `nav-toggle` — pontosan ezért épült): nem mondta meg, hol tart, és 30 másodperces
  kattintás-határidőkön futott; tíz másodperces diagnózisból negyven perces találgatás lett.
- **ÉS AMIÉRT A REGISZTER VAN:** a tanú átírásakor ELVESZTEK az R138-as mérések (a kapu nyolc
  ellenpárja és a megerősítő mondat két horgonyzott állítása). A `verify:kuka` pirosra váltott —
  mindkét mérés visszakerült. Egy saját átírás csendben levetkőzte volna a korábbi védelmet.

---

## 7. NEVESÍTETT FÜGGŐK

1. **A B történet 9. lépése (fiókváltás a cégre) nem megy végig** — a történet hátralévő kilenc
   lépése ezért nincs mérve. Ez a kör LEGFONTOSABB nyitott tétele.
2. **Az A történet 390 px-en a 11. lépésen áll meg.** A tanú PÖRGÉS-ŐRE nevezte meg az állapotot:
   `s11/pending·targetPending`, kiemelve a `nav-toggle`. Vagyis a lépés a mobil menü feltárását
   kéri, a feltárás megtörténik, és utána ÚJRA feltárást kér — kör. A VALÓSZÍNŰ ok (de **nem
   mértem meg**, ezért hipotézis): a 11. lépés a MÁSODIK `nav-members` lépés, és a szereplő-váltás
   után a lap az áttekintésen áll, tehát a menüpont rejtett ÉS nem jelöli a mai oldalt; a ☰
   megnyitása után a menüpontra kattintva a lap navigál, a fiók becsukódik, a menüpont megint
   rejtett lesz. A KUKA-276-os `aria-current="page"` kijárat csak akkor old, ha a lap MÁR a
   Felhasználókon áll. A következő kör ezzel kezdjen — a lelet helye és alakja pontosan megvan.
3. A `proof:demo-walk` böngészőt igényel, ezért nem része a `verify:sweep`-nek.
4. A próbafelület háttere jelölt csonk — HTTP/adatbázis-bizonyíték nem következik belőle.
5. A fogyasztás-jelző a chatváltási sávban áll (fő-szál kontextusmedián **599 765** ≥ 400 000):
   a következő önálló nagy blokk friss beszélgetésben induljon.

---

## 8. AMI NEM TÖRTÉNT MEG

Nincs merge, éles telepítés, V2-módosítás, külső levél, új fizetős szolgáltatás, és nincs
req-5/core/CMD/PR-zárás. Automatikus ügynök-munka nem indult; egy fő végrehajtó dolgozott.
