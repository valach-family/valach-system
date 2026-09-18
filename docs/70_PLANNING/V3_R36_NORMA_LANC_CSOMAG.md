# A norma-lánc végső forrásállapota — önállóan visszaellenőrizhető csomag

> **Sáv:** Claude-v3 · **Kör:** R36 · **Állapot:** lezárt

**EZ A LAP SZÁRMAZTATOTT.** Egyetlen sorát sem gépeltük: a `npm run docs:norm-chain` (NCP-01)
rajzolja a szerződésből, a normákból, a manifesztből, a mutáció-katalógusból és a MÉRT mutációs
eredményből. A gépi alak a `V3_R36_NORMA_LANC_CSOMAG.json` — **a következő kör azt olvassa.**

**Szerződés:** NCT-01 · verzió: `R32/K01-K16 + R35/K05-DSC+K10-TYP` · lenyomat: `sha256:d6ef5ed707b83e3da85…`

**Összesítő:** 10 norma · 29 klauzula · 88 láncsor — **78 fedett** · 0 részben fedett · 10 bizonyíték nélkül · **tartalmilag elbírálva: 0/88** (OB-7 — ez a tárgyaló félé).

## Amit ez a csomag NEM állít

- A mutáció a PRÓBÁHOZ kötődik (`catcher`), nem az állításhoz. Ahol a MÉRT eredmény nevesíti a hamisra fordult állítást, az erősebb bizonyíték — a sor ezt külön jelzi.
- A `content_review` oszlop a MÉRT állapot, nem a szerző véleménye: a tartalmi elbírálás az OB-7 szerint a tárgyaló félé, és ma 0/88 soron áll.
- A `covered` annyit mond, hogy a klauzulához tartozik lefutott, falszifikált állítás — NEM azt, hogy a klauzula normatív tartalma maradéktalanul teljesül.

## A láncsorok

| klauzula | forrás | K-fedés | működés (próba) | pozitív | negatív / mutáció | maradék hatókör | eredmény |
|---|---|---|---|---|---|---|---|
| **REV-N1a** (REV-N1) | R32 | K07+K09 | — | P-CMD-finalize-gate · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N1b** (REV-N1) | R32 | K08+K09 | — | P-CMD-finalize-gate · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N1c** (REV-N1) | R32 | K08 | — | — | — | Nincs korrekciós esemény-fogalom és nincs „alkalmazandó profil" a magban, tehát a joghatás felülvizsgálata nem modellezhető. A REV-N2 (hatály ⊥ tudomás) és a REV-N4 (kompenzáló folyamat) megépítése ELŐFELTÉTEL — enélkül csak azt tudjuk kimondani, hogy a régi sort nem írjuk át. | no_evidence |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-bitemporal · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-grant-axis · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-REV-evidence-home · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2a** (REV-N2) | R32 | K08 | — | P-ORG-grant-atomic · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N2b** (REV-N2) | R32 | K08+K09 | — | P-REV-review-circle · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-suspension · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-claim-decide · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-REV-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-effectuation · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-release-effectuation · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **REV-N3a** (REV-N3) | R32 | K04+K09 | — | P-CMD-release-effectuation · node v3ref/run.mjs | 4 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3b** (REV-N3) | R32 | K05+K09 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 5 nevesíti EZT az állítást | — | covered |
| **REV-N3b** (REV-N3) | R32 | K05+K09 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-claim-read · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N3c** (REV-N3) | R32 | K05+K15 | — | P-REV-claim-decide · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N3d** (REV-N3) | R32 | K05+K15 | — | — | — | A mai magban NINCS adapter, ami valódi, szerver-oldali beadó-kontextust adna (hálózati eredet, csatorna-azonosság, igazolt hívó). Amíg nincs, MINDEN kontextus nélküli beadás EGYETLEN nevezett, közös vödörbe esik (`UNATTRIBUTED_INTAKE_KEY = chan:unattributed`). Ez REFERENCIA-HELYETTESÍTŐ, nem védelem: azt a tulajdonságot állítja helyre, hogy a kulcsot a hívó ne tudja átírni (ezt a REV-N3c bizonyítja is), de a jóhiszemű beadókat nem különbözteti meg egymástól — így egyetlen elárasztó a közös vödörrel a többiek keretét is elveszi. A hiány zárásának feltétele (mind a hat): (1) a publikus bemenetből NEM másolható át tetszőleges csatorna-kulcs a belső kontextusba; (2) a korlát kulcsának EREDETE és BIZALMI SZINTJE adapterenként kimondott — a hálózati cím önmagában nem igazolt személyazonosság; (3) két külön beadó izolációját AZONOS, szabadon állított hivatkozás mellett is mérni kell (nem igazolt másik-fél-azonosító ne vehesse el a keretét); (4) pozitív ellenpár KÖZÖS hálózatról érkező jóhiszemű beadókra, és negatív pár EGY beadó több hivatkozására; (5) a kvóta versenyhelyzete és a tárolási hiba utáni állapot a VALÓDI adapterrel is mérendő; (6) a vállalt terhelési tartomány NEVEZETT — a „senki sem akadályozhat mást" korlátlan ígérete véges közös infrastruktúrán nem tartható, az izolációt a MÉRT tartományban kell bizonyítani. | no_evidence |
| **REV-N3e** (REV-N3) | R32 | K05 | — | — | — | MA NINCS MEGÉPÍTVE — szándékosan. A CLM-01 a sérült/hiányzó tartalmú ügyön minden érdemi döntést elutasít (ez a helyes válasz: JELENTENI kell, nem üres kézzel dönteni), tehát az ilyen ügy jelenleg nyitva marad. A karantén-műveletet azért nem építettük meg ebben a körben, mert új hatáskört, új állapotot és új audit-utat igényel, félig megépítve pedig pontosan az a kockázat, ami ellen a C-F01 szól: érdemi lezárásnak látszó technikai lépés. A hiány zárásának feltétele: (1) saját műveleti név és saját hatáskör (az `adjudicate` NEM elég); (2) kötelező, tárolt ok; (3) az ügy állapota megkülönböztethető az érdemben lezárttól; (4) próba, amiben a karantén UTÁN sem lehet érdemi döntést hozni, és a panasz tárgyáról semmilyen állítás nem keletkezik. | no_evidence |
| **REV-N4a** (REV-N4) | R32 | K06+K08 | — | — | — | Nincs kompenzáló-esemény fogalom a magban. A V2-ben van (`reverse`), de a V3 magja ezt még nem modellezi, és a kettő összekötése nem történt meg. | no_evidence |
| **REV-N4b** (REV-N4) | R32 | K04+K06 | — | — | — | EGYETLEN előfeltétel hiányzik: a REV-N4a KOMPENZÁLÓ-ESEMÉNY fogalma — enélkül nincs mit jóváhagyni. A jóváhagyói HATÁSKÖR modellje MEGVAN (REV-N3a, fedett), tehát ha a korrekciós esemény megszületik, ez a klauzula a meglévő hatáskör-kapura épülhet. | no_evidence |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-paths · node v3ref/run.mjs | 7 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-matrix · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-entry-points · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5a** (REV-N5) | R32 | K09+K15 | — | P-REV-entry-points · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-scope · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-matrix · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **REV-N5b** (REV-N5) | R32 | K09+K15 | — | P-REV-ban-record-shape · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5c** (REV-N5) | R32 | K09 | — | P-REV-ban-past · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **REV-N5c** (REV-N5) | R32 | K09 | — | P-REV-ban-past · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-a** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-shape · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-b** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-shape · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **K05-DSC-c** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-REV-result-scope · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K05-DSC-d** (DSC-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K05 | — | P-A08 · node v3ref/run.mjs | 5 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **K10-TYP-a** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-KAT-item-identity · node v3ref/run.mjs | 1 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-b** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | P-BEM-input-schema · node v3ref/run.mjs | 2 mutáció a próbára (npm run v3ref:mutate) — ebből 0 nevesíti EZT az állítást | — | covered |
| **K10-TYP-c** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | A kanonikus alak és a profil-kötés mérve van, de a PROFILVÁLTÁS hatása a korábbi tárolt értékre nincs: a magban egyetlen mennyiség-profil él (`qty-1`), verzióváltás nem történt, ezért erre a mondatra ma nincs bizonyíték. | no_evidence |
| **K10-TYP-d** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | Az atomiság és az ismétlés-védelem mérve van (KSZ-01), de a „korábbi verziójú vagy más PROFILÚ bemenet" ága nincs: egyetlen élő séma- és mennyiség-profil mellett ellenpélda nem állítható elő, tehát a mondat erre a felére nincs bizonyíték. | no_evidence |
| **K10-TYP-e** (TYP-N1) | R35 — chatgpt-v3, CMD-VS-300-002-002 R35 §„K05 és K10" | K10 | — | — | — | A két idő-tengely elválasztása mérve van (KSZ-01 · BEM-01), de a MEGFIGYELÉSI idő fogalma nincs a magban (K0/D1 mérés: a tárolt sor `recorded_at` és `effective_at` tengelyt hordoz, a MÉRÉS ideje sehol) — ez a QNT-munka előfeltétele, nem e kör tárgya. | no_evidence |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1a** (ORG-N1) | R32 | K04+K14 | — | P-ORG-basis · node v3ref/run.mjs | 8 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 1 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 4 nevesíti EZT az állítást | — | covered |
| **ORG-N1b** (ORG-N1) | R32 | K04+K05 | — | P-ORG-basis-limit · node v3ref/run.mjs | 11 mutáció a próbára (npm run v3ref:mutate) — ebből 3 nevesíti EZT az állítást | — | covered |
| **ORG-N2a** (ORG-N2) | R32 | K03+K04 | — | P-INVITE-authority · node v3ref/run.mjs | 3 mutáció a próbára (npm run v3ref:mutate) — ebből 2 nevesíti EZT az állítást | — | covered |
| **ORG-N3a** (ORG-N3) | R32 | K04 | — | — | — | A magban EGYETLEN jogalap-út van (tagság), tehát a VAGY/ÉS megkülönböztetés fogalmilag sem jelenik meg. A modell bővítése nélkül ez nem mérhető — és a méretlen klauzula zöldnek látszana (KUKA-051), ezért áll itt kimondva. | no_evidence |
| **ORG-N3b** (ORG-N3) | R32 | K04+K15 | — | — | — | EGYETLEN előfeltétel hiányzik: az ORG-N3a VAGYLAGOS jogalap-út — a magban ma egyetlen út van (tagság), tehát nincs mit kizárni. A célzott tiltás alany-szintű fogalma MEGVAN (REV-N5a, fedett); az elsőbbségi szabálynak a MÁSODIK út hiányzik, nem a tiltás. | no_evidence |

## Nyitott blokkolók

- **OB-1** — A valódi TÖBB-ÍRÓS véglegesítési határ
- **OB-2** — Q17 — műtermék-útvonal ütközése
- **OB-3** — Bemeneti séma-regiszter — RÉSZBEN MEGÉPÜLT, a HATÁR hiányzik
- **OB-4** — A kiadási osztályozó ellenőrzése NEM ÜRES korpuszon
- **OB-5** — A megvonás visszamenőleges hatálya (REV-N1c · REV-N2 … REV-N5)
- **OB-6** — Az önálló szervezeti alap (ORG-N1, ORG-N3)
- **OB-7** — A norma ↔ állítás TARTALMI megfelelése

## Lezárt blokkolók — a lezárás jelével és a MARADÉKÁVAL

- **OB-8** — K05 — a KIADÁSI OSZTÁLYOZÓNAK nincs klauzulája
  - lezárta: CMD-VS-300-002-002 R35 (a szöveg) → R36 (a bekötés) · jel: npm run verify:v3ref
  - **maradék:** A K05-DSC-c MEZŐVETÍTÉS-ága NYITOTT ÚT, nem adósság: a klauzula maga mondja ki, hogy „amíg nincs külön bizonyított mezővetítés", a vegyes eredmény egészben megtagadandó — a mai rendszer pontosan ezt teszi. Ha valaha mezővetítés épül, annak SAJÁT bizonyítéka kell.
- **OB-9** — K10 — a TÍPUS, NORMALIZÁLÁS ÉS SZÁMÍTÁSI PROFIL klauzulája
  - lezárta: CMD-VS-300-002-002 R35 (a szöveg) → R36 (a bekötés) · jel: npm run verify:v3ref
  - **maradék:** HÁROM klauzula NYITOTT, nevezett hiánnyal: K10-TYP-c (a PROFILVÁLTÁS hatása a korábbi tárolt értékre nincs mérve — egyetlen élő profil) · K10-TYP-d (a „korábbi verziójú vagy más PROFILÚ bemenet" ága) · K10-TYP-e (a MEGFIGYELÉSI idő fogalma nincs a magban — a QNT-munka előfeltétele). Ezek NEM a blokkoló maradékai, hanem a klauzulák saját, kimondott hiányai.
- **OB-10** — A SÖPRÉS A SZÖVEGET OLVASSA, NEM A VERDIKTET — a piros lánc kihagyásnak látszik
  - lezárta: R16 (chatgpt-v3 §2 kérésére) · jel: npm run verify:sweep-verdict
  - **maradék:** A V2 söprése ugyanezt a részszöveges osztályozót viseli, tehát ott a szerződés NEM áll. A maradék átvitele NEVESÍTETT függő: előbb a négy V2-verifier (challenge-inventory · doc-order · mcp-bridge · repo-root) kapja meg a gépi kihagyás-deklarációt, és csak utána vihető át a verdikt-olvasó söprés — V2-módosításra ebben a körben nincs engedély.

## Használati kapuk — az elhalasztott követelmény NEM eltűnt követelmény

- **USE-G1** — Több-írós vagy valódi üzleti használat
  - zárva addig: OB-1 — valódi, több-írós véglegesítési határ bizonyítva, nem egyírós SQLite-on
  - amit a ZÖLD referencia NEM engedélyez: A referencia egyetlen folyamaton, egyetlen írón, szintetikus adaton mérve zöld. Ebből NEM következik, hogy két párhuzamos író alatt a véglegesítési határ tart. Az R35 §4 szó szerint: „csak a megnevezett egyírós referencia határain belüli technikai továbblépés engedhető."
  - forrás: R35 §„Meghozott döntések" 4.
- **USE-G2** — Valódi (nem szintetikus) migrációs korpusz a kiadási osztályozón
  - zárva addig: OB-4 — az ELSŐ valódi import, valódi adaton mérve
  - amit a ZÖLD referencia NEM engedélyez: A szintetikus pozitív/negatív korpusz a referencia-osztályozó TECHNIKAI kapujára elfogadható, de NEM teljesíti az OB-4 „valódi, nem üres migrációs korpusz" feltételét — ez KÉT KÜLÖN vállalás (R35 §„Meghozott döntések" 2.). A migrációs kapu az első valódi importig zárva.
  - forrás: R35 §„Meghozott döntések" 2.
- **USE-G3** — Bizonytalan mennyiséggel dolgozó valódi folyamat (QNT)
  - zárva addig: a QNT megvalósítás és ellenőrzés — a MEGFIGYELÉS mint hatásmentes, nem készletmozgató művelet, saját ismétlés-kulccsal
  - amit a ZÖLD referencia NEM engedélyez: A mennyiségi ÁLLÍTÁS és a KÉSZLETMOZGÁS elválik (R35 §„Meghozott döntések" 3.): egy 100-ról 90-re pontosított megfigyelés önmagában NEM új 90-es mozgás és NEM 190-es készlet. A mai magban a `stock.receipt` az egyetlen mennyiségi művelet, és az MOZGÁST ír — a megfigyelés fogalma hiányzik (K0/C2 · E1 · D1 mérés). A „magon kívül" megfogalmazás NEM törli az R19-ben magra kijelölt alapkövetelményeket: a core-határ szerződésében a megfigyelésnek és hatásmentes rögzítésének EXPLICIT helye van (K10-TYP-e nyitott sora), a jelenlegi receipt művelet NEM helyettesíti. Az ilyen folyamat valódi használatának kapuja ZÁRT.
  - forrás: R35 §„Meghozott döntések" 3.
- **USE-G4** — A „core kész" állítás hatóköre
  - zárva addig: OB-7 — a folyamat által érintett klauzula-sorok TARTALMI elbírálása a külső ellenőrző fél részéről (ma 0/88 soron van érvényes emberi jóváhagyás)
  - amit a ZÖLD referencia NEM engedélyez: A gépi lánc azt méri, hogy a kód teljesíti-e az ÁLLÍTÁST — nem azt, hogy az állítás a NORMÁT fedi-e. A tartalmi elbírálás a tárgyaló félé, és Claude által írt elfogadás NEM helyettesíti (R35 §„OB-7" szó szerint).
  - forrás: R35 §„OB-7 — saját tartalmi ellenőrzés állapota"

