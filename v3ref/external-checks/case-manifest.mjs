/** EXT-02 — A KÜLSŐ ELLENŐRZŐ PROGRAMOK ESET-MANIFESZTJE ÉS AZ EREDMÉNY-SZEMLE (R59/F02).
 *
 * MIÉRT SZÜLETETT. Az R58-ban leszállított futtató (EXT-01) azt kérdezte meg egy programtól, hogy
 * „amit visszaadtál, abban minden eset `pass`-e?". A külső fél E08 esete megmutatta, mi hiányzik
 * ebből: kicserélte a programot egy csonkra, ami EGYETLEN `{id:'T01',pass:true}` sort ír ki — és a
 * futtató MEGFELEL-t mondott. Kilenc DARAB `T01` sorra ugyanúgy. A futtató tehát nem tudta, MIT
 * kellett volna mérni, csak azt nézte, hogy amit kapott, az zöld-e.
 *
 * A HIBA OSZTÁLYA. Ez a KUKA-051 alakja a futtatón: a mérés hatóköre a BEMENETBŐL származott, nem
 * SZABÁLYBÓL. Aki a bemenetből veszi az elvárást, azt a bemenet bármikor átverheti — a nyolc
 * hiányzó eset nem hibaként, hanem NEM LÉTEZŐKÉNT jelenik meg (KUKA-012 a mérőn). És mert a
 * futtató a lánc VÉGE (a söprés és a külső fél ezt olvassa), a hazugsága a legdrágább.
 *
 * A MEGOLDÁS ALAKJA. Minden program mellé oda kell írni, MELY ESETEKET kell hoznia — pontos
 * azonosítóval —, és a futtató a KAPOTT listát ehhez méri, MINDKÉT IRÁNYBAN (KUKA-039):
 *   · HIÁNYZÓ eset      → a program nem futott végig, vagy kicserélték;
 *   · ISMERETLEN eset   → nem az a program felelt, amit hívtunk;
 *   · DUPLIKÁLT eset    → egy eredmény többször számolva „teljesnek" látszó listát ad;
 *   · ROSSZ ALAKÚ eset  → `pass` nem logikai érték / nincs azonosító / hiba-nyom van benne.
 *
 * HONNAN JÖN AZ ELVÁRT LISTA. NEM egy lefutásból (az önmagát igazolná vissza — KUKA-054), hanem a
 * program KÍSÉRŐ SZÖVEGÉBŐL: a külső fél a boardon minden körben kiírja, mely eseteket futtat
 * (R57: „T01–T05 · E01–E04", R59: „P01 · P02 · E05–E09"), a két saját programunknál pedig a mi
 * korabeli körünk jegyzőkönyve. Ezért a lista mellé oda van írva a FORRÁSA is.
 *
 * A RÉSZLEGES FUTÁS NEM TELJES BIZONYÍTÉK. A `--only` legitim (egy programot gyorsan újrafuttatni),
 * de az eredménye SOHA nem a teljes lánc bizonyítéka. A gépi kimenet ezért `scope`-ot visz, és a
 * képernyő kimondja — a néma részleges futás ugyanaz a hazugság, mint a néma üres lista.
 */

/** A programok — KI ÍRTA, MIT MÉR, és PONTOSAN MELY ESETEKET kell hoznia. */
export const PROGRAMS = Object.freeze([
  Object.freeze({
    id: 'r92authz',
    file: 'r92_chatgpt-v3.mjs',
    companions: Object.freeze(['r92_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R92 §4 (a két jogosultsági ellenpélda: az `r92_chatgpt-v3.core.mjs` az ő szövegük, '
      + 'karakterre — md5 1a65be2a8b3b43fc28f3cd93b3ea2874, ahogy a lapjukról kinyertük; '
      + '„bájtazonost" az ő saját példányukhoz képest NEM állítunk. TESZTADAPTÁCIÓ NEM TÖRTÉNT. '
      + 'A két futás külön nevezve: a JAVÍTÁS ELŐTTI forráson MINDKÉT eset `ok:true` + '
      + '`outcome:"granted"` + user-TAGSÁG — pontosan az általuk közölt reprodukció —, a mai '
      + 'forráson 2/2 elakad, tagság nélkül.',
    what: 'F01 — a HÍVÓ átnevezheti-e az ellenőrzött MŰVELETET (csak `suspend`-re felhatalmazó alappal '
      + 'kiadható-e meghívó). F02 — az ADATKÖR elhagyása megkerüli-e az ÜRES korlátot. Mindkettő a '
      + 'TELJES kiadás→beváltás úton mér: a bizonyíték a keletkezett TAGSÁG, nem a hívás válasza.',
    evidence: 'r92-authz-challenge.json',
    cases: Object.freeze(['F01', 'F02']),
    cases_source: 'a külső fél R92-es lapja (a program ciklusának `id` értékei, ahogy megérkezett)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r88core',
    file: 'r88_chatgpt-v3.mjs',
    companions: Object.freeze(['r88_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R88 §3 (a MAG-próba: az `r88_chatgpt-v3.core.mjs` az ő szövegük, karakterre — '
      + 'md5 d12336ec7dc26febcfcb222b9627f562, ahogy a lapjukról kinyertük; „bájtazonost" az ő saját '
      + 'példányukhoz képest NEM állítunk, mert azt nem mértük meg — R83 §6 tanulsága). '
      + 'TESZTADAPTÁCIÓ NEM TÖRTÉNT. A két futás külön nevezve: a JAVÍTÁS ELŐTTI forráson '
      + '3 PASS / 2 FAIL — pontosan az általuk közölt reprodukció —, a mai forráson 5 PASS / 0 FAIL.',
    what: 'F01 — a felhatalmazási ALAP azonossága a (basis_id, book_id) PÁR: idegen könyvre hivatkozva '
      + 'nem adható hatáskör, és a tiltott kérés NYOM NÉLKÜL akad el (se sor, se későbbi engedő '
      + 'válasz); pozitív kontroll: a SAJÁT könyvén változatlanul megy. F02 — a tagságadás EGY ÍRÁS: '
      + 'a bukott kísérlet nem hagy esemény-sort és nem írja át a történetet; a KÜLSŐ tranzakció '
      + 'visszagördülése a tagságadást is elviszi.',
    evidence: 'r88-core-challenge.json',
    cases: Object.freeze([
      'P01-same-book-basis', 'F01-foreign-book-basis',
      'P02-successful-grant-is-paired', 'F02-rejected-grant-leaves-no-event',
      'P03-outer-transaction-rolls-back',
    ]),
    cases_source: 'a külső fél R88-as lapja (a program `test(...)` hívásainak azonosítói, ahogy megérkezett)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r85core',
    file: 'r85_chatgpt-v3.mjs',
    companions: Object.freeze(['r85_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    // HELYESBÍTÉS (R88 §7 — megtalálta: a KÜLSŐ TÁRGYALÓ FÉL). Az R86 §10-ben azt állítottam, hogy
    // ez a program „be van kötve" ide. MÉRVE nem volt igaz: sem a fájl-fában, sem ebben a
    // regiszterben nem szerepelt. A „megkaptam" és a „a söprés futtatja" KÉT KÜLÖNBÖZŐ ÁLLÍTÁS
    // (KUKA-038), és a másodikat állítottam a első helyett. A helyesbítés maga ez a bejegyzés.
    origin: 'R85 §3–§4 (a MAG-próba: az `r85_chatgpt-v3.core.mjs` az ő szövegük, karakterre — '
      + 'md5 854892614413c6d8fbd0afe8c785e765). TESZTADAPTÁCIÓ NEM TÖRTÉNT. A két futás külön nevezve: '
      + 'a JAVÍTÁS ELŐTTI forráson 2 PASS / 2 FAIL — pontosan az általuk közölt reprodukció —, a mai '
      + 'forráson 4 PASS / 0 FAIL.',
    what: 'F01 — a tagságadás KÉT IDŐ-TENGELYE: a júniusi beváltás nem írhatja át, mit tudtunk '
      + 'márciusban (a megvonással azonos szerkezet). F02 — a jogváltozási esemény SAJÁT, tartós '
      + 'bizonyíték-hivatkozása: a visszamenőleges ÉS a jövőbeli hatályú ágon is megmarad (korábban '
      + 'csak a felülvizsgálati körbe került, ami kizárólag a visszamenőleges ágon születik).',
    evidence: 'r85-core-challenge.json',
    cases: Object.freeze([
      'P01-known-grant', 'F01-grant-not-known-at-query',
      'P02-retro-evidence-persists', 'F02-future-evidence-persists',
    ]),
    cases_source: 'a külső fél R85-ös lapja (a program `test(...)` hívásainak azonosítói, ahogy megérkezett)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r77',
    file: 'r77_chatgpt-v3.mjs',
    companions: Object.freeze(['r77_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R77 §8 (a MAG-próba: a `r77_chatgpt-v3.core.mjs` az ő szövegük BÁJTAZONOSAN — egyetlen '
      + 'karaktert sem írtunk át benne, a behúzási útvonalakat sem: a futtató ugyanazt a '
      + '`source/v3ref/` elrendezést állítja elő, amit az ő csomagjuk feltételez). '
      + 'TESZTADAPTÁCIÓ NEM TÖRTÉNT. A két futás külön nevezve: a JAVÍTÁS ELŐTTI (R76-os) forráson '
      + '34 PASS / 5 FAIL — pontosan az általuk közölt reprodukció —, a mai forráson 39 PASS / 0 FAIL.',
    what: '34 útvonal-eset a TÉNYLEGES felfüggesztő/feloldó belépési pontokon (hét tiltás-fajta × '
      + 'érintett/másik cél × egyező/másik/hiányzó kontextus) + három lelet-család öt esettel: '
      + 'F01 — lejárt felhatalmazással rögzített hatás a kiadás · felfüggesztés · feloldás úton · '
      + 'F02 — a készlet-adatkör címkéjével az ármező is kijön · F03 — a szerkezetileg hibás tárolt '
      + 'műveleti hatókör „másik könyvként" továbbengedi a kérést. A program a tiltás-mátrixot is '
      + 'lefuttatja (66 sor · 51 egyedi végrehajtott bemenet · 0 eltérés).',
    evidence: 'r77-core-challenge.json',
    cases: Object.freeze([
      'M-suspend-book-matching',
      'M-suspend-book-other',
      'M-suspend-operation-matching',
      'M-suspend-operation-other',
      'M-suspend-subject-matching',
      'M-suspend-credential-matching',
      'M-suspend-credential-other',
      'M-suspend-credential-absent',
      'M-suspend-session-matching',
      'M-suspend-session-other',
      'M-suspend-session-absent',
      'M-suspend-legal_basis-matching',
      'M-suspend-legal_basis-other',
      'M-suspend-legal_basis-absent',
      'M-suspend-data_scope-matching',
      'M-suspend-data_scope-other',
      'M-suspend-data_scope-absent',
      'M-lift-book-matching',
      'M-lift-book-other',
      'M-lift-operation-matching',
      'M-lift-operation-other',
      'M-lift-subject-matching',
      'M-lift-credential-matching',
      'M-lift-credential-other',
      'M-lift-credential-absent',
      'M-lift-session-matching',
      'M-lift-session-other',
      'M-lift-session-absent',
      'M-lift-legal_basis-matching',
      'M-lift-legal_basis-other',
      'M-lift-legal_basis-absent',
      'M-lift-data_scope-matching',
      'M-lift-data_scope-other',
      'M-lift-data_scope-absent',
      'F01-issue-authority-expired-at-write',
      'F01-suspend-authority-expired-at-write',
      'F01-lift-authority-expired-at-write',
      'F02-data-scope-context-does-not-filter-price-result',
      'F03-malformed-operation-scope-is-undecidable',
    ]),
    cases_source: 'a külső fél R77-es lapja (§8, teljes forrással)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r75',
    file: 'r75_chatgpt-v3.mjs',
    companions: Object.freeze(['r75_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R75 §7 (a MAG-próba: a `r75_chatgpt-v3.core.mjs` az ő szövegük BÁJTAZONOSAN; ez a '
      + 'bejegyzés a burkolóra mutat, ami az artefaktumot írja — a próba szövegéhez nem nyúlunk). '
      + 'Ebben a körben az R73-nál még szükséges kétlépéses adaptáció ELMARADT: a program a mai '
      + 'forráson VÁLTOZTATÁS NÉLKÜL fut. A két futás külön nevezve: a JAVÍTÁS ELŐTTI (R74-es) '
      + 'forráson 2/7, a mai forráson 7/7.',
    what: 'C01–C02 kontroll (a jogos könyv-tiltás hat, a független könyvet nem érinti · hatáskör '
      + 'nélkül és idegen könyvre nem adható ki) és F01–F05: a TILTOTT eljáró NEM tilthat (a kiadás '
      + 'is engedő út) · a könyv-hatáskörből kiadott művelet-tiltás nem ér át a független könyvbe · '
      + 'az exportált író nem kerülheti meg a hatókör-kaput · az ismeretlen TÁROLT ok nem engedély · '
      + 'az ÉRVÉNYES MÁSIK hitelesítő eléri az ügy olvasását',
    evidence: 'r75-core-challenge.json',
    cases: Object.freeze([
      'C01-authorized-book-ban-and-independent-book',
      'C02-no-authority-and-outside-book-refused',
      'F01-banned-issuer-cannot-issue-ban',
      'F02-book-authority-does-not-ban-independent-book-operation',
      'F03-exported-writer-cannot-bypass-scope',
      'F04-unknown-stored-cause-not-a-permit',
      'F05-good-credential-reaches-claim-read',
    ]),
    cases_source: 'a külső fél R75-ös lapja (§7, teljes forrással)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r69',
    file: 'r69_chatgpt-v3.mjs',
    companions: Object.freeze(['r69_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R69 §8 (a MAG-próba: a `r69_chatgpt-v3.core.mjs` az ő szövegük BÁJTAZONOSAN; ez a bejegyzés '
      + 'a burkolóra mutat, ami az artefaktumot írja — a próba szövegéhez nem nyúlunk). A csomagjuk '
      + 'másik két programja (`board-r69.cjs` · `runner-challenge.mjs`) a V2 BOARDOT méri, ezért annak '
      + 'a repónak a próba-rendszerébe tartozik — ide csak a MAG-próba jön (a hatókört kimondjuk, '
      + 'nem hagyjuk némán hiányozni).',
    what: 'C01–C02 kontroll (a felfüggesztés-feloldás megőrzi a történetet · a sérült tartalom nem megy '
      + 'ki olvasásra) és F01–F03: sérült tartalmú ügy NEM zárható le érdemben · hiányzó tartalmú ügy '
      + 'ugyanúgy · a másik fél szabadon megadott hivatkozása NEM veheti el annak keretét egy független '
      + 'csatornán',
    evidence: 'r69-core-challenge.json',
    cases: Object.freeze([
      'C01-suspension-lift-preserves-history',
      'C02-corrupt-content-not-disclosed',
      'F01-corrupt-content-cannot-be-resolved',
      'F02-missing-content-cannot-be-resolved',
      'F03-distinct-channel-cannot-be-blocked-by-spoofed-ref',
    ]),
    cases_source: 'a külső fél R69-es lapja (§8, teljes forrással)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r67',
    file: 'r67_chatgpt-v3.mjs',
    companions: Object.freeze(['r67_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R67 (a MAG-próba: a `r67_chatgpt-v3.core.mjs` az ő szövegük BÁJTAZONOSAN; ez a bejegyzés '
      + 'a burkolóra mutat, ami az artefaktumot írja — a próba szövegéhez nem nyúlunk)',
    what: 'C01–C03 kontroll (jogosulatlan felfüggesztés · olvasás-semlegesség · a jelzés nem ad tagságot) '
      + 'és F01–F05: a felfüggesztés TÉNYLEGES hatása · a döntési út nemleges válaszának semlegessége · '
      + 'az elbíráló visszakapja a beadvány SZÖVEGÉT · a bukott befogadás ATOMI · a beadó saját '
      + 'hivatkozása NEM lehet a korlát azonossága',
    evidence: 'r67-core-challenge.json',
    cases: Object.freeze([
      'C01-unauthorized-suspension-denied',
      'C02-read-neutrality',
      'C03-claim-does-not-grant-membership',
      'F01-successful-suspension-removes-current-access',
      'F02-adjudication-denial-neutrality',
      'F03-authorized-reviewer-can-retrieve-submitted-content',
      'F04-failed-intake-is-atomic',
      'F05-caller-chosen-reference-is-not-a-rate-limit-identity',
    ]),
    cases_source: 'a külső fél R67-es lapja (§8, teljes forrással)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r61',
    file: 'r61_chatgpt-v3.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R63 (a bővített, 8 esetes alak — változatlanul, ahogy a boardon érkezett)',
    what: 'P03 pozitív ellenpár · R01–R03: a bizonyíték-hivatkozás tényleges FELOLDÁSA és a részletes '
      + 'eredmény-artefaktum kötelezősége · U01–U04: hiányzó teljes katalógus · hiányzó állítás-készlet · '
      + 'hiányzó mutáció-készlet · ROSSZ TÍPUSÚ állítás-készlet — mind unresolved + unauthenticated',
    evidence: 'r60-challenge.json',
    cases: Object.freeze(['P03', 'R01', 'R02', 'R03', 'U01', 'U02', 'U03', 'U04']),
    cases_source: 'a külső fél R63-as kísérő lapja (§8 esetkészlet) — az eredeti NÉGY változatlan, az U01–U04 kiegészítés',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r83core',
    file: 'r83_chatgpt-v3.mjs',
    companions: Object.freeze(['r83_merge_chatgpt-v3.core.mjs', 'r83_runner_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R83 (KÉT próba: a `r83_merge_chatgpt-v3.core.mjs` és a `r83_runner_chatgpt-v3.core.mjs` '
      + 'az ő szövegük — a program TESTE karakterre azonos, a ZÁRÓ SORTÖRÉS eltérhet, mert a '
      + 'markdown-kódblokkból nyertük ki; „bájtazonost" ezért nem állítunk, az R83 §6 '
      + 'helyesbítése után). TESZTADAPTÁCIÓ NEM '
      + 'TÖRTÉNT. A két futás külön nevezve: a JAVÍTÁS ELŐTTI forráson (594f49f) ÖSSZEFŰZÉS '
      + '1 PASS / 3 FAIL és FUTTATÓ 2 PASS / 1 FAIL — pontosan az általuk közölt reprodukció —, '
      + 'a mai forráson ÖSSZEFŰZÉS 4/0 és FUTTATÓ 3/0.',
    what: 'ÖSSZEFŰZÉS (4 eset): a `P01-genuine` pozitív kontroll mellett a próba-állapot TÖRLÉSE és '
      + 'ISMERETLENRE állítása (R83/F01), valamint UGYANANNAK az egy REV-N3a állítás-sornak a '
      + 'kivétele MINDEN egységből (R83/F02 — a hiányzó sor nem lesz gyenge sorrá, hanem eltűnik). '
      + 'FUTTATÓ (3 eset): a VALÓDI `run-all.mjs` besorolása SZINTETIKUS program-kimenetekkel — egy '
      + 'valódi, NEM időtúllépéses eset-hiba nem kaphat környezeti felmentést (R83/F03). A külső fél '
      + 'kimondott hatóköre: ez a besorolás mérése, nem termék-működési állítás.',
    evidence: 'r83-core-challenge.json',
    cases: Object.freeze([
      'merge/P01-genuine', 'merge/F01-missing-probe-status', 'merge/F01-unknown-probe-status',
      'merge/F02-remove-required-row',
      'runner/all-green', 'runner/original-real-failure', 'runner/original-and-sub-failure',
    ]),
    cases_source: 'a külső fél R83-as lapja (a két program `plans`/`mode` listája, ahogy megérkezett; '
      + 'a `merge/` és `runner/` előtagot a burkoló teszi rá, mert KÉT próba ad EGY eset-listát)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r81core',
    file: 'r81_chatgpt-v3.mjs',
    companions: Object.freeze(['r81_chatgpt-v3.core.mjs', 'r81_merge_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    // HELYESBÍTVE (R83 §6): az R81-es bejegyzés „BÁJTAZONOS"-t írt; a külső fél MEGMÉRTE, és a
    // saját példányukhoz képest EGY ZÁRÓ ÜRES SOR az eltérés (a markdown-kódblokkból való kinyerés
    // következménye). Teszt-logikai eltérés nincs — de a „bájtazonos" ellenőrizhető állítás, tehát
    // vagy mérjük, vagy nem mondjuk ki (KUKA-033).
    origin: 'R81 (KÉT mag-próba: a `r81_chatgpt-v3.core.mjs` és a `r81_merge_chatgpt-v3.core.mjs` '
      + 'az ő szövegük — a program TESTE karakterre azonos, a ZÁRÓ SORTÖRÉS eltér az ő saját '
      + 'példányuktól, ahogy ők az R83 §6-ban megmérték). TESZTADAPTÁCIÓ NEM '
      + 'TÖRTÉNT. A két futás külön nevezve: a JAVÍTÁS ELŐTTI forráson (eb4d83b) MAG 6 PASS / 1 FAIL '
      + 'és ÖSSZEFŰZÉS 4 PASS / 4 FAIL — pontosan az általuk közölt reprodukció —, a mai forráson '
      + 'MAG 7/0 és ÖSSZEFŰZÉS 8/0.',
    what: 'MAG (7 eset): P01–P04 a kiadott eredmény RÉSZFÁJÁNAK adatköre (az R79-es javítás '
      + 'visszamérése) · F04 három alakban — a kiadás jogának és a kiadási LELTÁR-SORÁNAK időpontja: '
      + 'négy külön óraolvasás mellett az eredmény 08:00:00-s jogon ment ki, a leltárba viszont '
      + '08:00:02 került. ÖSSZEFŰZÉS (8 eset): P01–P04 a négy meglévő kontroll (valódi · hiányzó '
      + 'egység · idegen lenyomat · duplikált egység) · F01a/F01b/F02/F03 — az összefűzés a beadott '
      + 'ÖSSZEFOGLALÓT fogadta el a RÉSZLETES bizonyíték mérése helyett (üres eredmény-lista · '
      + 'önellentmondó verdikt · kiürített kötelező készlet · idegen futási szerződés). Az '
      + 'összefűzés-próba a SAJÁT, VALÓDI egységeinken dolgozik: a burkoló ELŐÁLLÍTJA őket a '
      + 'lemásolt forráson futtatott darabolt battériával.',
    evidence: 'r81-core-challenge.json',
    cases: Object.freeze([
      'core/P01-pure-lines', 'core/P02-second-line-price', 'core/P03-deep-unknown', 'core/P04-nonfinite',
      'core/F04-release-time-before', 'core/F04-release-time-after', 'core/F04-release-time-cross',
      'merge/P01-genuine', 'merge/P02-missing-unit', 'merge/P03-foreign-digest', 'merge/P04-duplicate-unit',
      'merge/F01-empty-results', 'merge/F01-contradictory-verdict', 'merge/F02-empty-required',
      'merge/F03-wrong-contract',
    ]),
    cases_source: 'a külső fél R81-es lapja (a két program `cases`/`plans` listája, ahogy megérkezett; '
      + 'a `core/` és `merge/` előtagot a burkoló teszi rá, mert KÉT próba ad EGY eset-listát)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r79core',
    file: 'r79_chatgpt-v3.mjs',
    companions: Object.freeze(['r79_chatgpt-v3.core.mjs']),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R79 (a MAG-próba: a `r79_chatgpt-v3.core.mjs` az ő szövegük BÁJTAZONOSAN — egyetlen '
      + 'karaktert sem írtunk át benne). TESZTADAPTÁCIÓ NEM TÖRTÉNT. A két futás külön nevezve: a '
      + 'JAVÍTÁS ELŐTTI forráson 14 PASS / 4 FAIL — pontosan az általuk közölt reprodukció —, a mai '
      + 'forráson 18 PASS / 0 FAIL.',
    what: '18 eset három lelet-családban: F01 — a KIADOTT eredmény RÉSZFÁJÁNAK adatköre (a tétel-tömb '
      + 'alatt rejtett ármező a készlet-címke alatt kijutott, és a mennyiség helyére csomagolt objektum '
      + 'is átment) · F02 — a PARANCSÍRÁS hatályosulása (a tagsági jog és a rögzített véglegesítési idő '
      + 'KÉT külön óraolvasáson állt) · F03 — a tagság-megvonás nem vitte át a hiteles kontextust, tehát '
      + 'a hitelesítő-alapú tiltás azon az ÍRÓ úton nem hatott. Mellettük a pozitív ellenpárok '
      + '(P01–P07): a jogos alakoknak TOVÁBBRA IS működniük kell.',
    evidence: 'r79-core-challenge.json',
    cases: Object.freeze([
      'P01-flat-quantity', 'P02-flat-price', 'F01-nested-price',
      'F01-object-in-qty', 'P03-unknown-top-field', 'P04-revoke-before',
      'P04-revoke-after', 'P04-revoke-cross', 'P06-adjudicate-before',
      'P06-adjudicate-after', 'P06-adjudicate-cross', 'P07-command-before',
      'P07-command-after', 'P05-nested-effect-rolls-back', 'F02-command-time-splits-at-finalization',
      // HELYESBÍTVE (R81 §7, a külső fél): az R79-es futáson a `-other` eset volt a FAIL, nem a
      // `-matching` — a `matching` már a javítás ELŐTT is zárt. A hiba tehát TÚLZÁRÁS volt: a
      // hitelesítő-alapú tiltás a MÁSIK (érvényes) hitelesítővel érkezőt is elakasztotta.
      'F03-revoke-credential-matching', 'F03-revoke-credential-other', 'F03-revoke-credential-absent',
    ]),
    cases_source: 'a külső fél R79-es lapja (a program `cases` tömbje, ahogy megérkezett)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r79',
    file: 'r79_run_contract_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R80',
    what: 'a RUN-02 futás-szerződés (R79 §6) a DARABOLT futáson: hamisított bizonyíték egység-módban · '
      + 'hiányzó egység · idegen forrású egység · és a pozitív ellenpár (érintetlen, teljes futás). '
      + 'Azért van, mert a külső fél r59/r57 programja a battériát EGY hívásban futtatja 15 000 ms '
      + 'korláttal, és a MAI futtató-gépünkön (4 vCPU) a teljes battéria legjobb mért alakja 17,1 mp '
      + '— tehát ott a MÉRÉS akad el, nem a kód bukik (KUKA-089: a pontos technikai akadályt meg kell mérni)',
    evidence: 'r79-run-contract.json',
    cases: Object.freeze(['U04', 'U01', 'U02', 'U03']),
    cases_source: 'az R80-as körünk jegyzőkönyve (R79 §6 — RUN-02), a pozitív ellenpárral EGYÜTT',
    evidence_pin_field: 'source_commit',
  }),
  // ── AZ ADAPTÁLT VÁLTOZATOK — KÜLÖN BEJEGYZÉS, JELÖLT EREDETTEL (R81 §5) ───────────────────────
  //
  // MIÉRT KÜLÖN. A külső fél az R81-ben KÉT ADAPTÁLT programot küldött, és kimondta: *„ezek ÚJ,
  // adaptált változatok, nem bájtazonos másolatok — az eredeti és az adaptált eredményt tartsátok
  // KÜLÖN, az eredetet pedig jelöljétek a lánc-regiszterben."* Ez nem formaság: ha a kettő egy
  // bejegyzésbe olvadna, az „r57 zöld" mondat két KÜLÖNBÖZŐ dolgot jelenthetne, és a különbség
  // némán eltűnne (KUKA-018 — ahol egy fogalomnak két ábrázolása van, látszania kell, melyik
  // melyik). Az EGYETLEN eltérés az eredetihez képest a battéria HÍVÁSA: egy hívás helyett
  // `--unit=1/3` · `2/3` · `3/3` · `--merge`, egyenként ugyanazzal a 15 000 ms-os korláttal.
  //
  // KIMONDOTT KÖVETKEZMÉNY: az adaptált változat ugyanazokat az ESETEKET hozza, mint az eredeti, és
  // UGYANAZT az eredmény-fájlnevet írja. Ezért a futtató a saját eredmény-fájlt a futás ELŐTT
  // félreteszi (R81 §5 · KUKA-127) — különben egy időtúllépésre futó eredeti mellett a szomszédja
  // fájlja maradna ott, és ZÖLDNEK látszana.
  Object.freeze({
    id: 'r59a',
    file: 'r59_chatgpt-v3.adapted.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél (ADAPTÁLT változat, az ő szerzőségükkel)',
    origin: 'R81 §5 — az R59-es programjuk ADAPTÁLT alakja, ahogy a lapjukon megérkezett. NEM '
      + 'bájtazonos az R59-essel: az EGYETLEN eltérés a battéria hívása (`--unit=1/3` · `2/3` · '
      + '`3/3` · `--merge`, egyenként 15 000 ms korláttal) a korábbi EGY hívás helyett. A '
      + 'teszt-elvárásokhoz NEM nyúltunk, és mi magunk egyetlen karaktert sem írtunk át benne.',
    what: 'ugyanaz a hét eset, mint az r59-nél (P01 · P02 pozitív ellenpár · E05–E09), de a '
      + 'DARABOLT battériával — így a mérés a mi 4 vCPU-s futtató-gépünkön is végigmegy, '
      + 'a 15 000 ms-os korlát megsértése nélkül (KUKA-089: a pontos technikai akadály mérve)',
    evidence: 'r58-challenge.json',
    cases: Object.freeze(['P01', 'E05', 'E06', 'E07', 'E08', 'P02', 'E09']),
    cases_source: 'a külső fél R59-es kísérő lapja (§2 esetlista) — az adaptálás az eseteket nem érinti',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r57a',
    file: 'r57_chatgpt-v3.adapted.mjs',
    by: 'chatgpt-v3 — KÜLSŐ, független fél (ADAPTÁLT változat, az ő szerzőségükkel)',
    origin: 'R81 §5 — az R57-es programjuk ADAPTÁLT alakja, ahogy a lapjukon megérkezett. NEM '
      + 'bájtazonos az R57-essel: az EGYETLEN eltérés a battéria hívása (darabolt futás). A '
      + 'teszt-elvárásokhoz NEM nyúltunk, és mi magunk egyetlen karaktert sem írtunk át benne.',
    what: 'ugyanaz a kilenc eset, mint az r57-nél (T01–T05 · E01–E04), de a DARABOLT battériával',
    evidence: 'r56-challenge.json',
    cases: Object.freeze(['T01', 'T02', 'T03', 'T04', 'T05', 'E01', 'E02', 'E03', 'E04']),
    cases_source: 'a külső fél R57-es kísérő lapja („T01–T05 · E01–E04") — az adaptálás az eseteket nem érinti',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r59',
    file: 'r59_chatgpt-v3.mjs',
    superseded_by: 'r59a',
    // A DEKLARÁCIÓ MEGMONDJA A FAJTÁT IS (R83/F03): a puszta próza nem mérhető vissza, ezért a
    // `kind` a zárt készletből való, és a futtató a MÉRT kudarc fajtáját ehhez hasonlítja.
    env_limit: Object.freeze({
      kind: 'wall_clock_timeout',
      cap_ms: 15000,   // a program SAJÁT gyermek-korlátja (spawnSync timeout) — a MÁSODIK tanú mércéje
      why: 'ez a program a mutációs battériát EGY hívásban futtatja, 15 000 ms korláttal. A MAI '
        + 'futtató-gépünkön (4 vCPU) a teljes battéria legjobb mért alakja 17,1 mp, tehát itt a MÉRÉS '
        + 'akad el, nem a kód bukik — és ez MÉRVE van, nem feltételezve (KUKA-089). Ugyanezt a kilenc '
        + 'esetet az ADAPTÁLT változat (`r59a`, szintén az Ő szerzőségük) futtatja végig, darabolt '
        + 'battériával. A kihagyás CSAK addig áll, amíg a helyettes ZÖLD, ÉS amíg a program MINDEN '
        + 'kudarcos esete bizonyítottan időtúllépés (a helyettesítés nem felmentés — KUKA-041).',
    }),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R59 (változatlanul, ahogy a boardon érkezett)',
    what: 'P01 · P02 pozitív ellenpár · E05–E09: az elvárás-séma, az eredmény-séma, a futtató és a '
      + 'jóváhagyás-rekord megkerülhetősége',
    evidence: 'r58-challenge.json',
    cases: Object.freeze(['P01', 'E05', 'E06', 'E07', 'E08', 'P02', 'E09']),
    cases_source: 'a külső fél R59-es kísérő lapja (§2 esetlista)',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r57',
    file: 'r57_chatgpt-v3.mjs',
    superseded_by: 'r57a',
    env_limit: Object.freeze({
      kind: 'wall_clock_timeout',
      cap_ms: 15000,   // a program SAJÁT gyermek-korlátja (spawnSync timeout) — a MÁSODIK tanú mércéje
      why: 'ugyanaz a technikai akadály, mint az `r59`-nél: a battéria EGY hívásban, 15 000 ms '
        + 'korláttal. MÉRVE: az E02 és az E03 eset `spawnSync … ETIMEDOUT` hibával áll meg, a másik '
        + 'hét eset zöld. A kilenc esetet az ADAPTÁLT változat (`r57a`) futtatja végig. A kihagyás '
        + 'CSAK addig áll, amíg a helyettes ZÖLD, ÉS amíg minden kudarc bizonyítottan időtúllépés.',
    }),
    by: 'chatgpt-v3 — KÜLSŐ, független fél',
    origin: 'R57 (változatlanul, ahogy a boardon érkezett)',
    what: 'T01–T05: az R56-ban tett pecsét-állítások · E01–E04: a bizonyíték-kapu megkerülhetősége',
    evidence: 'r56-challenge.json',
    cases: Object.freeze(['T01', 'T02', 'T03', 'T04', 'T05', 'E01', 'E02', 'E03', 'E04']),
    cases_source: 'a külső fél R57-es kísérő lapja („T01–T05 · E01–E04")',
    evidence_pin_field: 'pin',
  }),
  Object.freeze({
    id: 'r55',
    file: 'r55_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R56',
    what: 'az R55 öt esete újrafogalmazva a mai szerződésre, mindegyikhez ellenpárral',
    evidence: 'restated.json',
    cases: Object.freeze(['C11-restated', 'N10-restated', 'F01-restated', 'N04-restated', 'D01-restated']),
    cases_source: 'az R56-os körünk jegyzőkönyve (az R55 öt esete)',
    evidence_pin_field: 'source_commit',
  }),
  Object.freeze({
    id: 'r53',
    file: 'r53_f03_restated.mjs',
    by: 'Claude-v3 — a SAJÁT sávunk (önvizsgálat)',
    origin: 'R54',
    what: 'az R53/F03 támadás egyenértékű alakja (G01) + érintetlen ellenpár (G02)',
    evidence: 'f03-restated.json',
    cases: Object.freeze(['G01', 'G02']),
    cases_source: 'az R54-es körünk jegyzőkönyve (támadás + ellenpár)',
    evidence_pin_field: 'pin',
  }),
]);

/**
 * EGY ESET ALAKJA. A `pass` SZIGORÚAN logikai: a „truthy" elfogadás (`'igen'`, `1`, `{}`) épp azt
 * a rést nyitná, amit az egész manifeszt zár (KUKA-020 az eredmény-sémán).
 */
export function caseShape(c, at) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return `${at}: az eset nem objektum`;
  if (typeof c.id !== 'string' || !c.id.trim()) return `${at}: az esetnek nincs azonosítója`;
  if (typeof c.pass !== 'boolean') {
    return `${at} (${c.id}): a \`pass\` nem logikai érték (${c.pass === undefined ? 'HIÁNYZIK' : typeof c.pass})`;
  }
  if (c.test_error) return `${at} (${c.id}): az eset HIBÁVAL futott — ${String(c.test_error).split('\n')[0]}`;
  return null;
}

/**
 * A KAPOTT ESETLISTA SZEMLÉJE a program manifesztjéhez mérve. MINDKÉT IRÁNY.
 *
 * @returns {{ok: boolean, problems: string[], present: string[], missing: string[], unknown: string[], duplicate: string[], failed: string[]}}
 */
export function auditCases(program, cases) {
  const problems = [];
  const want = Array.isArray(program && program.cases) ? program.cases : [];

  // A MANIFESZT MAGA IS MÉRENDŐ: elvárás nélkül a szemle ugyanazt a felmentést adná, mint amit
  // meg akar szüntetni (a hiány nem lehet megengedő — R59/F01 elve a futtatón).
  if (want.length === 0) {
    problems.push(`[${program && program.id}] a programhoz NINCS eset-manifeszt — mérce nélkül az eredmény nem ítélhető meg`);
  }
  if (new Set(want).size !== want.length) {
    problems.push(`[${program.id}] a MANIFESZT maga tartalmaz ismétlődő azonosítót`);
  }

  if (!Array.isArray(cases)) {
    problems.push(`[${program && program.id}] a program kimenete nem értelmezhető eset-listaként`);
    return {
      ok: false, problems, present: [], missing: [...want], unknown: [], duplicate: [], failed: [],
    };
  }

  const seen = new Map();
  for (const [i, c] of cases.entries()) {
    const bad = caseShape(c, `[${program.id}] ${i + 1}. eset`);
    if (bad) { problems.push(bad); continue; }
    seen.set(c.id, (seen.get(c.id) || 0) + 1);
  }

  const present = [...seen.keys()];
  const duplicate = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id}×${n}`);
  const missing = want.filter((id) => !seen.has(id));
  const unknown = present.filter((id) => !want.includes(id));
  const failed = cases
    .filter((c) => c && typeof c === 'object' && (c.pass !== true || c.test_error))
    .map((c) => (c && c.id) || '(azonosító nélkül)');

  if (missing.length) {
    problems.push(`[${program.id}] HIÁNYZÓ eset: ${missing.join(' · ')} — a program nem futott végig, `
      + 'vagy nem az futott, amit hívtunk');
  }
  if (unknown.length) {
    problems.push(`[${program.id}] a manifesztben NEM SZEREPLŐ eset: ${unknown.join(' · ')}`);
  }
  if (duplicate.length) {
    problems.push(`[${program.id}] DUPLIKÁLT eset: ${duplicate.join(' · ')} — az ismétlés „teljesnek" `
      + 'láttat egy hiányos listát');
  }
  if (failed.length) problems.push(`[${program.id}] ELBUKOTT eset: ${[...new Set(failed)].join(' · ')}`);

  return { ok: problems.length === 0, problems, present, missing, unknown, duplicate, failed };
}

/**
 * A RÉSZLETES EREDMÉNY-ARTEFAKTUM KÖTELEZŐ (R61/F02, az ő R03 esetük).
 *
 * MIÉRT SZÜLETETT. Az R60-as futtató a részletes eredményfájlt csak AKKOR olvasta, ha létezett —
 * különben visszaesett a szabvány kimenetre, és az `ok`/`complete_evidence` ezt nem bánta. A külső
 * fél mind a négy gyermek-programot olyan csonkra cserélte, ami az ÖSSZES elvárt azonosítóra kiír
 * egy `{id, pass:true}` sort, de nem futtat semmit és nem ír részletes fájlt. Az összesítő
 * `{"ok":true,"complete_evidence":true,"green":4,"of":4}` eredménnyel, 0 kilépéssel zárt, miközben
 * mind a négy program `saved` értéke `null` volt.
 *
 * A HIBA OSZTÁLYA. Ugyanaz, amit a KUKA-108-ban javítottam, harmadszor, egy ÚJ helyen: a szabály
 * feltételes volt ahhoz képest, amit védeni kell („ha van fájl, azt olvasom"). A megkerülése egy
 * NEM-ÍRÁS. És a szabvány kimenet mint tartalék épp a legerősebb bizonyítékot cserélte le a
 * leggyengébbre — némán (KUKA-049 rokona: a tartalék mérce nem veheti fel a pontos tanú nevét).
 *
 * MIT NEM ÁLLÍT EZ A JAVÍTÁS. A fájl LÉTEZÉSE nem bizonyítja egy rosszindulatú gyermek-program
 * őszinteségét — ezt a külső fél maga is kimondta, és mi sem állítjuk. Ez a javítás az ÁTADHATÓSÁGI
 * szerződést zárja: a részletes eredmény kötelező, a futáshoz kötött, és a szabvány kimenet
 * DIAGNOSZTIKA marad, nem bizonyíték.
 *
 * @returns {{ok: boolean, problems: string[], present: boolean, pin: string|null}}
 */
export function auditEvidenceArtifact(program, { exists, parsed, expectedCommit, stdoutCases }) {
  const problems = [];
  const id = (program && program.id) || '(névtelen)';
  const wantFile = program && program.evidence;

  if (!wantFile) {
    problems.push(`[${id}] a manifeszt nem nevezi meg a kötelező eredmény-artefaktumot`);
    return { ok: false, problems, present: false, pin: null };
  }
  if (!exists) {
    problems.push(`[${id}] HIÁNYZIK a részletes eredmény-artefaktum (evidence/${wantFile}) — a szabvány `
      + 'kimenet DIAGNOSZTIKA, nem bizonyíték: részletes eredmény nélkül a futás nem igazolható');
    return { ok: false, problems, present: false, pin: null };
  }
  if (!parsed || typeof parsed !== 'object') {
    problems.push(`[${id}] a részletes eredmény-artefaktum nem értelmezhető JSON-objektum (evidence/${wantFile})`);
    return { ok: false, problems, present: true, pin: null };
  }

  // A FUTÁS-KÖTÉS: a fájl mondja meg, MELYIK forrás-állapoton készült. Az idegen vagy elavult
  // kötés ugyanolyan baj, mint a hiányzó fájl — csak alattomosabb.
  const field = program.evidence_pin_field;
  let pin = null;
  if (typeof field !== 'string' || !field.trim()) {
    problems.push(`[${id}] a manifeszt nem nevezi meg, MELYIK mező hordozza a futás-kötést `
      + '(evidence_pin_field) — kötés nélkül nem eldönthető, hogy a fájl EHHEZ a futáshoz tartozik');
  } else if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
    problems.push(`[${id}] a részletes eredményből HIÁNYZIK a futás-kötés (${field})`);
  } else if (typeof parsed[field] !== 'string' || !parsed[field].trim()) {
    problems.push(`[${id}] a futás-kötés (${field}) nem nem-üres szöveg`);
  } else {
    pin = parsed[field];
    if (expectedCommit && pin !== expectedCommit) {
      problems.push(`[${id}] a részletes eredmény IDEGEN forrás-állapothoz kötött (${pin} ≠ ${expectedCommit}) `
        + '— egy korábbi vagy másik futás fájlja nem bizonyítja a mostanit');
    }
  }

  // A FÁJL AZ ERŐSEBB TANÚ: ha a szabvány kimenet MÁST mond, a csomag nem hiányos, hanem
  // ELLENTMOND — és ezt külön kell kimondani (KUKA-020).
  const fileCases = Array.isArray(parsed.cases) ? parsed.cases : (Array.isArray(parsed) ? parsed : null);
  if (Array.isArray(stdoutCases) && Array.isArray(fileCases)) {
    const onFile = new Map(fileCases.filter((c) => c && typeof c.id === 'string').map((c) => [c.id, c.pass === true]));
    const drift = stdoutCases
      .filter((c) => c && typeof c.id === 'string' && onFile.has(c.id) && onFile.get(c.id) !== (c.pass === true))
      .map((c) => c.id);
    if (drift.length) {
      problems.push(`[${id}] a szabvány kimenet és a részletes eredmény ELLENTMOND egymásnak: ${drift.join(' · ')}`);
    }
  }

  return { ok: problems.length === 0, problems, present: true, pin };
}

// ── A KÖRNYEZETI AKADÁLY — BIZONYÍTVA, NEM BEJELENTVE (R83/F03) ─────────────────────────────────
//
// MI TÖRTÉNT. Az R81-ben bevezetett környezeti kihagyás három feltételt kért: a bejegyzés MONDJA KI
// az akadályt (`env_limit`), NEVEZZE MEG a helyettest (`superseded_by`), és a helyettes legyen ZÖLD.
// A külső fél (chatgpt-v3, R83 §5) megmutatta, mi hiányzik ebből: a program TÉNYLEGES kudarcának a
// FAJTÁJÁT senki nem nézte meg. Szintetikus futtatásukban az eredeti `r57` első esete `pass:false`
// lett, „synthetic assertion failure; NOT a timeout" indokkal, minden más program zöld — a futtató
// mégis `exit 0` · `verdict.ok: true` · `env_skipped: 1` eredményt adott. Vagyis egy VALÓDI
// teszthibát mentett fel egy statikus regiszter-mező.
//
// A HIBA OSZTÁLYA. KUKA-122 fordítottja: ott a kapu olyan tényt kért, amit senki nem állított elő
// (teljesíthetetlen); itt a kapu olyan tényt fogadott el, amit senki nem mért (bizonyítatlan). És
// KUKA-073: a `superseded_by` + `env_limit` MÁSIK kérdésre felel („van-e helyettese?"), mint amit a
// felmentés kérdez („tényleg a KÖRNYEZET akadt el?").
//
// A MÉRCE EZÉRT MÉRT ADAT. A deklaráció megmondja a VÁRT akadály FAJTÁJÁT, és a futtató a NYERS
// eredményből megállapítja a TÉNYLEGES kudarc fajtáját; a felmentés csak akkor áll, ha a kettő
// ugyanaz. A mai, VALÓDI akadályunk mérve ilyen: az `r57` E02/E03 esete
// `test_error: "Error: spawnSync … ETIMEDOUT"` alakban bukik (a program SAJÁT, 15 000 ms-os
// gyermek-korlátja lép életbe), minden más esete zöld — tehát a szigorítás a jogos utat NYITVA
// hagyja (KUKA-122/2: a kapunak teljesíthetőnek kell lennie).

/** A KÖRNYEZETI AKADÁLY ZÁRT FAJTA-KÉSZLETE. Ismeretlen fajta nem kaphat felmentést. */
export const ENV_LIMIT_KINDS = Object.freeze(['wall_clock_timeout']);

/** Az IDŐTÚLLÉPÉS gépi nyoma a program saját hibaszövegében (a gyermek-folyamat korlátja). */
const TIMEOUT_MARK = /ETIMEDOUT|ERR_CHILD_PROCESS_STDIO_MAXBUFFER|\btimed?[ _-]?out\b/i;

/**
 * EGY ESET KUDARCÁNAK FAJTÁJA — a NYERS eredményből, fordítás nélkül (KUKA-028).
 * @returns {'ok'|'wall_clock_timeout'|'assertion_failure'|'malformed'}
 */
export function caseFailureKind(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'malformed';
  if (c.test_error) return TIMEOUT_MARK.test(String(c.test_error)) ? 'wall_clock_timeout' : 'assertion_failure';
  if (c.pass === true) return 'ok';
  if (typeof c.pass !== 'boolean') return 'malformed';
  return 'assertion_failure';
}

/**
 * A PROGRAM KUDARCÁNAK FAJTÁJA — MINDEN eset és a szemle együtt.
 *
 * A szabály szigorú és szándékosan az: a program kudarca CSAK akkor környezeti, ha MINDEN kudarcos
 * esete bizonyítottan időtúllépés, és semmilyen MÁS baj nincs (hiányzó · ismeretlen · duplikált
 * eset, hiányzó eredmény-artefaktum, rendellenes kilépés). Egyetlen más fajtájú kudarc ⇒ a program
 * kudarca NEM környezeti. A hiányzó esetet az időtúllépés magyarázhatja — de csak akkor, ha ugyanaz
 * az azonosító időtúllépéses hibával meg is érkezett.
 *
 * @param {object} program  a manifeszt bejegyzése
 * @param {object} ctx      { cases, audit, artifactOk, exitCode, spawnError }
 * @returns {{kind: string, why: string, rows: Array}}
 */
export function measuredFailureKind(program, {
  cases, audit, artifactOk = true, exitCode = 0, spawnError = null, stderr = '', elapsedMs = null,
}) {
  const rows = (Array.isArray(cases) ? cases : []).map((c) => ({
    id: (c && c.id) || '(azonosító nélkül)', kind: caseFailureKind(c),
    why: c && c.test_error ? String(c.test_error).split('\n')[0] : null,
  }));
  const timedOut = rows.filter((r) => r.kind === 'wall_clock_timeout');
  const otherBad = rows.filter((r) => r.kind !== 'ok' && r.kind !== 'wall_clock_timeout');
  const explained = new Set(timedOut.map((r) => r.id));
  // A MÁSODIK, FÜGGETLEN TANÚ: a FUTTATÓ SAJÁT ÓRÁJA. A program hibaszövege a program SAJÁT szava
  // (KUKA-121: amit a beadó begépelhet, az állítás) — a futtató mért ideje viszont a miénk. Ha a
  // bejegyzés kimondja a program belső korlátját (`cap_ms`), akkor időtúllépést CSAK akkor
  // ismerünk el, ha a mért futásidő EL IS ÉRTE azt a korlátot.
  const cap = program && program.env_limit && typeof program.env_limit === 'object'
    ? program.env_limit.cap_ms : null;
  const capReached = typeof cap === 'number' && typeof elapsedMs === 'number' && elapsedMs >= cap;
  const capWhy = typeof cap !== 'number'
    ? 'a bejegyzés nem mondja ki a program belső korlátját (`cap_ms`)'
    : `a mért futásidő (${elapsedMs} ms) NEM érte el a bejelentett belső korlátot (${cap} ms)`;

  if (spawnError) {
    // A FUTTATÓ SAJÁT korlátja MÁS kérdés: ilyenkor a program eredményt sem hagyott hátra, tehát
    // semmit nem tudunk bizonyítani róla (KUKA-089: a „nincs hozzá környezetem" MÉRÉS legyen).
    return { kind: 'unknown', rows, why: `a programot a FUTTATÓ állította le (${spawnError}) — így nem maradt `
      + 'mérhető nyoma annak, MI akadt el; bizonyíték nélkül nincs környezeti felmentés' };
  }
  if (!artifactOk) {
    // A PROGRAM BELEHALT AZ AKADÁLYBA, MIELŐTT BÁRMIT ÍRHATOTT VOLNA — SAJÁT, NEVEZETT ALAK.
    //
    // MÉRVE (R83): az `r59` a mutációs battériát MODUL-SZINTEN futtatja, ezért a 15 000 ms-os
    // gyermek-korlát elérésekor KIVÉTELLEL áll meg — eredmény-fájl nélkül, `exit 1`-gyel. Ez NEM
    // ugyanaz, mint az `r57` alakja (ott a kivétel egy eseten belül keletkezik, tehát a fájl
    // megszületik, és a bukott esetek MAGUKRÓL mondják meg, hogy időtúllépés). A kettőt külön kell
    // nevezni, különben a hiányt némán a rossz érték ágára sorolnánk (KUKA-124/2).
    //
    // ÉS CSAK KÉT TANÚVAL: a program hibaszövege ÉS a futtató mért ideje. Egyik sem elég magában.
    //
    // KIMONDOTT KORLÁT (R85 §5 — a külső fél helyesbítése, KUKA-160). A két tanú NEM FÜGGETLEN:
    // mindkettő UGYANANNAK az eseménynek a következménye (a futás elérte a korlátot), és a `cap_ms`
    // értéket MI olvastuk ki az ő programjukból, nem külön mértük. Ezért a kettő EGYÜTT sem zárja ki,
    // hogy egy VALÓDI állítás-hiba esett egybe egy hosszú futással — csak azt teszi nagyon
    // valószínűtlenné. A valódi megkülönböztetőt nem ez a két jel adja, hanem az ESETENKÉNTI
    // bizonyíték (`otherBad` · `unexplained`): ott bármelyik nem-időtúllépéses kudarc `assertion_
    // failure`-re visz. EZEN AZ ÁGON viszont épp az esetenkénti bizonyíték HIÁNYZIK (nincs
    // eredmény-fájl), tehát ez a leggyengébb kihagyás-alak a láncban — a `witness_limit` ezt a
    // gyengeséget VISZI MAGÁVAL, hogy a befogadó tudja, mit tart a kezében (KUKA-127 · KUKA-015).
    if (!Array.isArray(cases) && TIMEOUT_MARK.test(String(stderr)) && capReached) {
      return { kind: 'wall_clock_timeout', rows,
        witness_limit: 'a két jel (a program hibaszövege és a mért futásidő) UGYANANNAK az eseménynek '
          + 'a következménye, tehát NEM független tanú; és ezen az ágon nincs esetenkénti bizonyíték, '
          + 'mert a program eredmény-fájl nélkül állt meg — a kihagyást a ZÖLD HELYETTES tartja, nem ez a két jel',
        why: `a program EREDMÉNY NÉLKÜL állt meg, időtúllépésre utaló hibával, és a mért futásidő `
          + `(${elapsedMs} ms) elérte a bejelentett belső korlátot (${cap} ms) — két jel, KÖZÖS OKBÓL `
          + `(nem független tanúk; lásd a kimondott korlátot)` };
    }
    return { kind: 'unknown', rows,
      why: 'nincs (vagy nem értelmezhető) részletes eredmény — a kudarc fajtája nem mérhető'
        + `${TIMEOUT_MARK.test(String(stderr)) ? ` (a hibaszöveg időtúllépést említ, de ${capWhy})` : ''}` };
  }
  if (!Array.isArray(cases)) return { kind: 'unknown', rows, why: 'a program nem adott értelmezhető eset-listát' };
  if (otherBad.length) {
    return { kind: 'assertion_failure', rows,
      why: `VALÓDI eset-hiba (nem időtúllépés): ${otherBad.map((r) => `${r.id} (${r.kind})`).join(' · ')}` };
  }
  const unexplained = [...(audit?.missing || []), ...(audit?.unknown || []), ...(audit?.duplicate || [])]
    .filter((id) => !explained.has(String(id).replace(/×\d+$/, '')));
  if (unexplained.length) {
    return { kind: 'assertion_failure', rows,
      why: `a hiba nem az időtúllépésből következik: ${unexplained.join(' · ')}` };
  }
  if (exitCode !== 0) {
    return { kind: 'assertion_failure', rows, why: `a program nem nullával zárt (kilépés ${exitCode})` };
  }
  if (!timedOut.length) return { kind: 'unknown', rows, why: 'nincs mért környezeti akadály a nyers eredményben' };
  if (!capReached) return { kind: 'unknown', rows, why: `a bukott esetek időtúllépést mondanak, de ${capWhy}` };
  // EZ AZ ERŐS ÁG: van esetenkénti bizonyíték, és a fentebbi `otherBad`/`unexplained` kapukon MINDEN
  // nem-időtúllépéses kudarc `assertion_failure`-re vitte volna a programot. A megkülönböztető tehát
  // NEM a futásidő, hanem az, hogy a bukott esetek MAGUKRÓL mondják meg, mi akadt el — ezt írjuk ki,
  // hogy a két ág ereje ne látsszon egyformának (R85 §5).
  return { kind: 'wall_clock_timeout', rows,
    witness_limit: null,
    witness_basis: 'esetenkénti bizonyíték: minden bukott eset időtúllépést mond, és bármely más '
      + 'kudarc-fajta VALÓDI eset-hibára vitte volna (otherBad · unexplained)',
    why: `MÉRT időtúllépés (${timedOut.length} eset: ${timedOut.map((r) => r.id).join(' · ')}) — minden más eset zöld, `
      + `és a mért futásidő (${elapsedMs} ms) elérte a bejelentett belső korlátot (${cap} ms)` };
}

/**
 * ÁLL-E A KÖRNYEZETI KIHAGYÁS? — NÉGY feltétel, EGY helyen, hogy a pin is ezt hívhassa (KUKA-009).
 *
 * @param {object} program     a manifeszt bejegyzése (`env_limit` · `superseded_by`)
 * @param {object} measured    a `measuredFailureKind` eredménye
 * @param {object|null} substitute  a helyettes program összefoglaló sora ({id, ok}) vagy null
 * @returns {{excusable: boolean, why: string, declared_kind: string|null, measured_kind: string}}
 */
export function environmentalObstacle(program, measured, substitute) {
  const declared = program && program.env_limit && typeof program.env_limit === 'object'
    ? program.env_limit : null;
  const kind = declared && typeof declared.kind === 'string' ? declared.kind : null;
  const out = (excusable, why) => ({ excusable, why, declared_kind: kind, measured_kind: measured.kind });

  if (!declared) return out(false, 'a bejegyzés nem mond ki környezeti akadályt (`env_limit`)');
  if (!ENV_LIMIT_KINDS.includes(kind)) {
    return out(false, `a bejelentett akadály-fajta ismeretlen: ${JSON.stringify(kind)} — `
      + `a zárt készlet: ${ENV_LIMIT_KINDS.join(' · ')}`);
  }
  if (!program.superseded_by) return out(false, 'a bejegyzés nem nevez meg helyettest (`superseded_by`)');
  if (!substitute) return out(false, `a megnevezett helyettes (${program.superseded_by}) ebben a futásban NEM futott`);
  if (!substitute.ok) return out(false, `a megnevezett helyettes (${program.superseded_by}) NEM zöld`);
  if (measured.kind !== kind) {
    return out(false, `a MÉRT kudarc nem a bejelentett környezeti akadály: ${measured.why} `
      + `(bejelentve: ${kind}, mérve: ${measured.kind}) — statikus regiszter-mező nem menthet fel valódi teszthibát`);
  }
  return out(true, `${measured.why} — és a megnevezett helyettes (${program.superseded_by}) ZÖLD`);
}

/**
 * A FUTÁS HATÓKÖRE — kimondva. A `--only` legitim, de a részleges futás nem a lánc bizonyítéka.
 */
export function runScope(selectedIds, allIds) {
  const complete = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  return Object.freeze({
    complete,
    scope: complete ? 'full' : 'partial',
    ran: [...selectedIds],
    skipped: allIds.filter((id) => !selectedIds.includes(id)),
    why: complete
      ? 'MINDEN nyilvántartott program lefutott — ez a lánc teljes bizonyítéka'
      : 'RÉSZLEGES futás (--only): ez NEM a lánc teljes bizonyítéka, csak a megnevezett programé',
  });
}
