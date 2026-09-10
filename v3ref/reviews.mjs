// V3 MAGREFERENCIA — HATÓKÖRÖS FELÜLVIZSGÁLATOK (R42 §1).
//
// MIÉRT NEM EGY `verified_by` MEZŐ. Az R42 kimondta: *„Az összesítő, hatókör nélküli `verified_by`
// maradjon üres, amíg a rekord nem különbözteti meg ezeket."* Igaza van, és a saját szabályunk is ez
// (KUKA-041: a díszpipa sikert jelent arról, ami meg sem történt). Egy „ellenőrizte: X" pecsét a
// próba TELJES címére vonatkozónak látszik, holott a felülvizsgálat csak egy RÉSZÁLLÍTÁST fogadott
// el — és az olvasó a pecsétet hiszi el, nem a lábjegyzetet.
//
// Ezért minden felülvizsgálat KÜLÖN rekord, és mindegyik megmondja:
//   · KI vizsgálta és MELYIK körben (`reviewed_by`, `review_ref`)
//   · MELYIK forrás-állapoton (`source_commit`) — más commiten a rekord nem érvényes
//   · MI az ÍTÉLET és MEDDIG tart (`verdict`, `scope`)
//   · a TELJES forgatókönyv hitelesítve van-e (`full_scenario_verified`) — ez szinte mindig `false`
//   · a KAPU lezárult-e (`gate_closed`) — a felülvizsgálat NEM zár kaput
//
// A `residual` mező a legfontosabb: a felülvizsgáló SAJÁT szavaival mondja meg, mi MARADT KI.
// Enélkül a rekord ugyanaz a hatókör nélküli pecsét volna, csak több mezővel.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak adat.

export const REVIEW_CONTRACT_ID = 'REV-01';

// Az a forrás-állapot, amelyen az alábbi felülvizsgálat készült. Ha a mai kód ettől eltér, a
// rekordok NEM a mai kódra vonatkoznak — ezt a `staleFor()` mondja ki, nem hallgatjuk el.
export const REVIEWS = Object.freeze([
  Object.freeze({
    probe_id: 'P-A04',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'azonos címzetti feltétel és azonos jogosulatlan néző mellett a fiók létezése nem '
      + 'változtathatja a kiadható választ — a visszaadott objektum JSON-alakjára',
    residual: 'nem méri a HTTP státuszt, fejlécet, redirectet, böngészőképet, háttérkérést vagy '
      + 'időzítést; működő fiókváltási utat sem igazol',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "nem méri a HTTP státuszt, fejlécet, redirectet, böngészőképet, háttérkérést vagy időzítést",
      "működő fiókváltási utat sem igazol",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A04b',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'partially_rejected',
    scope: 'az útválasztási részállítás elfogadva (az observeInvite két státusza)',
    residual: 'a „mindkét világban végigjut" cím NEM hitelesített: egyik világban sem vált be '
      + 'meghívót, nem hoz létre fiókot, nem jelentkezik be; a csatornabizonyítékot közvetlenül '
      + 'adatbázisba írja — tesztbemenet, nem hitelesítéspróba. Ellenpélda: Q10, Q11',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "egyik világban sem vált be meghívót, nem hoz létre fiókot",
      "nem jelentkezik be",
      "a csatornabizonyítékot közvetlenül adatbázisba írja",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'meglévő, megfelelően hitelesített fiók ÚJ TAGSÁGÁNAK esetére: az eredeti hitelesítő '
      + 'változatlan marad és új tagság jön létre',
    residual: 'nem igazolja az MFA, a másik fiók, a kibocsátói jog, a régi/visszavont tagság és a '
      + 'tranzakciós hibák kezelését. Ellenpélda: Q09–Q13',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "a másik fiók",
      "a kibocsátói jog",
      "a régi/visszavont tagság",
      "a tranzakciós hibák kezelését",
      "az MFA",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-K03-intent',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'a folytonossági CÉL elfogadva: a függő szándék tárolható és visszaolvasható',
    residual: 'teljes kézi felhasználói út NINCS hitelesítve — nincs valódi belépés, '
      + 'session-rotáció, sessionhöz kötött folytatás, lejárati teszt, több párhuzamos meghívó '
      + 'vagy visszatérési cél; a pending_intent csak created_at-ot tárol, a resumeIntent nem '
      + 'ellenőriz lejáratot',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "a pending_intent csak created_at-ot tárol, a resumeIntent nem ellenőriz lejáratot",
      "nincs valódi belépés, session-rotáció, sessionhöz kötött folytatás, lejárati teszt, több párhuzamos meghívó vagy visszatérési cél",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A08',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'EGY könyv, EGY aktor, LAPOS bemenet esetén az újrapróbálás és a visszavont tagság '
      + 'utáni kiadás ága helyes',
    residual: 'K07-re NEM elég: más könyv, beágyazott bemenet, műveletverzió, véglegesítés '
      + 'közbeni megvonás és kiadási leltár esetén eltérés. Ellenpélda: Q01–Q04, Q14–Q15',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "más könyv",
      "beágyazott bemenet",
      "műveletverzió",
      "véglegesítés közbeni megvonás",
      "kiadási leltár",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
  Object.freeze({
    probe_id: 'P-A14',
    reviewed_by: 'ChatGPT',
    review_ref: 'CMD-VS-300-002-001 R42 — ANALYSIS',
    source_commit: 'c58f5f66aea51f328023fad555518c830e9e68f6',
    review_kind: 'expected_outcome_review',
    verdict: 'accepted_with_scope_limits',
    scope: 'a NEVEZETT, SZINTETIKUS frissességi profil részállításaként: friss bizonyíték kiesés '
      + 'alatt érvényes marad, elavult és ismerten visszavont nem',
    residual: 'a 24 óra TESZTPARAMÉTER, nem jogi/adminisztratív szabály; hibás idő, valódi '
      + 'hatálylejárat, ismeretlen osztály és jövőbeli tagság nincs kezelve; a megvonás → '
      + 'képviseleti lekérdezés kombináció hiányzik. Ellenpélda: Q05–Q08',
    // A MARADÉK MONDATAI — EZ a lista a kötelem forrása (R49/R01). A prózát a lista alá
    // rendeljük: minden mondatnak SZÓ SZERINT szerepelnie kell a `residual` szövegben, és
    // MINDEGYIKHEZ kell állás-bejegyzés. Enélkül egy mondat törlése némán 'lezárttá' tenné a
    // maradékot (KUKA-039: mindkét irány, KUKA-012: a hiány nem lehet néma).
    residual_clauses: Object.freeze([
      "a 24 óra TESZTPARAMÉTER, nem jogi/adminisztratív szabály",
      "hibás idő",
      "valódi hatálylejárat",
      "ismeretlen osztály",
      "jövőbeli tagság",
      "a megvonás → képviseleti lekérdezés kombináció hiányzik",
    ]),
    full_scenario_verified: false,
    gate_closed: false,
  }),
]);

// ═══ A MARADÉKOK ÁLLÁSA — A FELÜLVIZSGÁLAT TANÚVALLOMÁS, A KÓD VÁLTOZIK ═════════════════════════
//
// MIÉRT KÜLÖN TÁBLA. A fenti `REVIEWS` a külső fél SZAVA egy adott forrás-állapotról. Tanúvallomást
// nem írunk át (KUKA-062: a történet marad). De a Q01–Q15 kör (D-VS-3007) a residual-okban NÉV
// SZERINT megnevezett ellenpéldák javát megjavította — és ha ezt sehol nem mondjuk ki, a lap a
// mai kódról állít valótlant (KUKA-050: az állítás elévül). A megoldás nem a vallomás átírása,
// hanem egy MÁSODIK rekord, ami MONDATONKÉNT megmondja, mi lett velük.
//
// A FEGYELEM, ami nélkül ez díszpipa volna (KUKA-041):
//   · a `clause` SZÓ SZERINT szerepeljen a vallomás residual-szövegében — a gép ellenőrzi, tehát
//     nem lehet „nagyjából arra gondolt" alapon lezárni egy maradékot (KUKA-036);
//   · `state: 'measured'` CSAK akkor, ha NEVEZETT próba méri, és a próba a szerződésben van —
//     kód-változás önmagában `addressed_unmeasured`, ami HANGOS, nem zöld (KUKA-051);
//   · `state: 'open'` mellé nem kell próba, de KELL indok — a hallgatás nem lezárás;
//   · a `limit` mező ott áll, ahol a javítás SZŰKEBB, mint a maradék (pl. determinisztikus
//     megszakítás ≠ többfolyamatos versenyteszt) — a fél igazság kimondva fél igazság.
export const RESOLUTION_STATES = Object.freeze(['measured', 'addressed_unmeasured', 'open']);

export const RESIDUAL_RESOLUTIONS = Object.freeze([
  // ── P-A04 ──────────────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-A04',
    clause: 'nem méri a HTTP státuszt, fejlécet, redirectet, böngészőképet, háttérkérést vagy időzítést',
    state: 'open',
    since: null,
    probe: null,
    note: 'a magreferenciában NINCS HTTP-réteg — ez nem javítható a magban, hanem a szállítási '
      + 'rétegben mérendő; addig NYITOTT, és a KUKA-084 miatt épp ez a legfontosabb csatorna-lista',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A04',
    clause: 'működő fiókváltási utat sem igazol',
    state: 'open',
    since: 'D-VS-3007',
    probe: null,
    note: 'a Q10 javítása NEVEZETT elutasítást és `switch_account_offered` jelzést ad (mérve: '
      + 'P-INVITE-authority), de MAGA A FIÓKVÁLTÁSI ÚT nincs megépítve — a jelzés nem út',
    limit: '',
  }),

  // ── P-A04b ─────────────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-A04b',
    clause: 'egyik világban sem vált be meghívót, nem hoz létre fiókot',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-INVITE-effect',
    note: 'Q11: a születés-ág VALÓBAN létrehozza a fiókot a hitelesítő adattal, és a próba a '
      + 'tárolt sort olvassa vissza — a „siker hitelesítő nélkül" alak megszűnt',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A04b',
    clause: 'nem jelentkezik be',
    state: 'open',
    since: null,
    probe: null,
    note: 'a magban nincs munkamenet-fogalom; a belépés a szállítási réteg dolga — NYITOTT',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A04b',
    clause: 'a csatornabizonyítékot közvetlenül adatbázisba írja',
    state: 'open',
    since: null,
    probe: null,
    note: 'a próbák MA IS közvetlenül írják a `channel_proof` sort — ez tesztbemenet marad, nem '
      + 'hitelesítéspróba; a valódi bizonyítás-út (levél → kattintás) még nem létezik',
    limit: '',
  }),

  // ── P-K03-cred ─────────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-K03-cred',
    clause: 'a másik fiók',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-INVITE-authority',
    note: 'Q10: idegen, MÁR LÉTEZŐ alany címére a beváltás `account_authentication_required`-del '
      + 'áll meg — a postafiók-bizonyíték nem lép a másik fiók hitelesített munkamenete helyébe',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    clause: 'a kibocsátói jog',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-INVITE-authority',
    note: 'Q09: a beváltás a kibocsátó MAI jogát kérdezi (`inviteGrantAt`), és a továbbadható '
      + 'hatáskört is (`DELEGABLE_ROLES`) — a visszavont jogú kibocsátó meghívója nem ad tagságot',
    limit: 'a „megmaradó független szervezeti alap" (R42) NINCS modellezve: ma a kibocsátó '
      + 'személyes joga az EGYETLEN alap, tehát a távozása minden függő meghívóját megállítja',
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    clause: 'a régi/visszavont tagság',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-INVITE-authority',
    note: 'Q13: a `membershipOutcome` négy KÜLÖN kimenetet ad (granted · already_active · '
      + 'revoked_needs_decision · role_differs); a csendes reaktiválás tiltva marad, de a '
      + 'hatástalan beváltás sem jelentődik sikeres tagságadásnak',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    clause: 'a tranzakciós hibák kezelését',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-INVITE-effect',
    note: 'Q12: a fiók-, tagság- és meghívó-írás EGY tranzakcióban áll (`store.tx`), és a próba '
      + 'megszakítja az utolsó írást: a megszakadt beváltás NULLA félkész sort hagy',
    limit: 'elkülönített SQLite-on mérve; a valódi motor tranzakció-szemantikáját ez nem igazolja',
  }),
  Object.freeze({
    probe_id: 'P-K03-cred',
    clause: 'az MFA',
    state: 'open',
    since: null,
    probe: null,
    note: 'a több-tényezős hitelesítés fogalma a magban NEM létezik — NYITOTT, és nem is a mag '
      + 'dolga; a beváltás előtti hitelesítési szint követelménye a szállítási rétegben dől el',
    limit: '',
  }),

  // ── P-K03-intent ───────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-K03-intent',
    clause: 'a pending_intent csak created_at-ot tárol, a resumeIntent nem ellenőriz lejáratot',
    state: 'open',
    since: null,
    probe: null,
    note: 'MÉRVE a mai forráson (D-VS-3007): a `pending_intent` tábla ma is három oszlop '
      + '(session_id, invite_token, created_at), és a `resumeIntent` továbbra sem néz lejáratot — '
      + 'a Q01–Q15 kör ezt NEM érintette',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-K03-intent',
    clause: 'nincs valódi belépés, session-rotáció, sessionhöz kötött folytatás, lejárati teszt, '
      + 'több párhuzamos meghívó vagy visszatérési cél',
    state: 'open',
    since: null,
    probe: null,
    note: 'egyik sem született meg — a szándék-folytonosság ma tárolható és visszaolvasható, de '
      + 'a köré tartozó életút hiányzik',
    limit: '',
  }),

  // ── P-A08 ──────────────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-A08',
    clause: 'más könyv',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-CMD-namespace',
    note: 'Q01: az ismétlésvédelmi kulcs HATÓKÖRÖS (könyv + aktor + kulcs) — B könyvben ugyanaz a '
      + 'kulcs SAJÁT hatást szül, és A eredményét nem adja ki',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A08',
    clause: 'beágyazott bemenet',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-CMD-identity',
    note: 'Q02: a kanonizálás REKURZÍV (`canonicalize`), minden szinten rendezett kulcsokkal; a '
      + '`lines[].qty` 1 → 999 változása ÜTKÖZÉST ad, nem visszajátszást',
    limit: 'az „ismeretlen mező ELUTASÍTÁSA" fele KIMONDOTTAN függő: ahhoz bemenet-séma-regiszter '
      + 'kell, ami még nincs; ma az ismeretlen mező az AZONOSSÁGBA beleszámít, de nem tiltott',
  }),
  Object.freeze({
    probe_id: 'P-A08',
    clause: 'műveletverzió',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-CMD-identity',
    note: 'Q03: a parancsazonosság (`commandIdentity`) a típust ÉS a típus-verziót is lefedi — '
      + 'stock.receipt/1 → stock.issue/1 vagy /2 nem játszható vissza a régi hatásra',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A08',
    clause: 'véglegesítés közbeni megvonás',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-CMD-finalize',
    note: 'Q04: a jog ÚJRA meg van kérdezve a `resolve()` UTÁN és az írás ELŐTT — a feloldás '
      + 'közben visszavont tagság mellett nem születik véglegesített hatás',
    limit: 'ez DETERMINISZTIKUS megszakítási ellenpróba; a TÖBBFOLYAMATOS versenyteszt (valódi '
      + 'párhuzamos kapcsolatokkal) az R42 §3/3. pontja szerint KÜLÖN kell, és még nincs meg',
  }),
  Object.freeze({
    probe_id: 'P-A08',
    clause: 'kiadási leltár',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-CMD-disclosure',
    note: 'Q14/Q15: a feloldott TARTALOM kizárólag a leltározott OLVASÓ úton mehet ki; a kiadási '
      + 'sor saját egyedi azonosítót kapott, tehát az időbélyeg többé nem azonosság, és két '
      + 'egyidejű olvasás két külön sort ír. A BEFOGADÁS válasza nem szolgáltat ki tartalmat, '
      + 'tehát KIADÁS-sort nem ír — de NYUGTÁT ad, és azt a `command_event` könyv rögzíti, a '
      + 'hatással egy tranzakcióban (R50: az „új tényt nem közöl" indokot a külső fél megcáfolta, '
      + 'mert a sikeres VÉGLEGESÍTÉS a szerver oldalán keletkezett tény — KUKA-093); az ISMÉTLÉS '
      + 'ága kiadás, és leltározva van',
    limit: 'az „előkészítve / átadás megkísérelve / kiszolgálva / ember elolvasta" NÉGY állapotból '
      + 'ma KETTŐ különül el (befogadás ≠ kiszolgálás); a másik kettő nincs megépítve',
  }),

  // ── P-A14 ──────────────────────────────────────────────────────────────────────────────────────
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'a 24 óra TESZTPARAMÉTER, nem jogi/adminisztratív szabály',
    state: 'open',
    since: null,
    probe: null,
    note: 'IGAZ MA IS: a frissességi plafon a mi szintetikus paraméterünk, nem külső előírásból '
      + 'jön. A javítás nem tehette igazzá — ez üzleti/jogi döntés, nem kód-kérdés (KUKA-035: '
      + 'amit egy okirat kimond, azt ne vezesd le)',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'hibás idő',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-AUTHZ-evidence',
    note: 'Q05: a hiányzó · olvashatatlan · ZÓNA NÉLKÜLI · jövőbeli időpont mind NEVEZETT '
      + 'indokkal tilt (`instantMs`) — a NaN többé nem látszik nullának',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'valódi hatálylejárat',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-AUTHZ-evidence',
    note: 'Q06: a `valid_until` KÖTELEZŐ és KÜLÖN tengely — friss lekérés + lejárt megbízás '
      + '⇒ `evidence_expired`; az ismeretlen mező nem nyelődik el (`evidence_shape_unknown_field`)',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'ismeretlen osztály',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-AUTHZ-opclass',
    note: 'Q07: a művelet-osztályok `Map`-ben állnak, tehát az ÖRÖKÖLT név (toString · '
      + 'constructor · __proto__) nem talál profilt — `unknown_op_class`, fail-closed',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'jövőbeli tagság',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-AUTHZ-membership-time',
    note: 'Q08: a tagság KÉT vége EGY feloldón (`membershipEffectiveAt`); a 2099-es kezdet MA '
      + 'nem hatályos, és ugyanazt a feloldót hívja a meghívó-oldal is',
    limit: '',
  }),
  Object.freeze({
    probe_id: 'P-A14',
    clause: 'a megvonás → képviseleti lekérdezés kombináció hiányzik',
    state: 'measured',
    since: 'D-VS-3007',
    probe: 'P-AUTHZ-evidence',
    note: 'a P-AUTHZ-evidence utolsó ága VISSZAVONJA a tagságot, majd HIBÁTLAN, friss megbízással '
      + 'kérdez: `membership_revoked` a válasz — a képviseleti jogcím nem kerülhet a tagság elé. '
      + 'A sorrend-csere mutációval mérve (M26), bizonyítottan PIROS',
    limit: '',
  }),
]);

/** Egy próbához tartozó felülvizsgálatok (a rekordba ágyazva). */
export function REVIEWS_FOR(probeId) {
  return REVIEWS.filter((r) => r.probe_id === probeId);
}

/**
 * A MARADÉKOK MAI ÁLLÁSA egy próbához — EGY feloldó, amit a futtató és a pin EGYARÁNT hív
 * (KUKA-009). A számot nem írjuk le kézzel sehol: innen származik (KUKA-045).
 */
export function residualStandingFor(probeId) {
  const rows = RESIDUAL_RESOLUTIONS.filter((r) => r.probe_id === probeId);
  const by = (s) => rows.filter((r) => r.state === s).length;
  return Object.freeze({
    probe_id: probeId,
    total: rows.length,
    measured: by('measured'),
    addressed_unmeasured: by('addressed_unmeasured'),
    open: by('open'),
    rows: Object.freeze(rows),
  });
}

/**
 * A REKORD ÖNELLENŐRZÉSE — a mérő EZT hívja, nem másolja le a szabályt.
 *
 * Négy irányban mér, mert mind a négy alak NÉMÁN hazudna:
 *   (1) a `clause` SZÓ SZERINT benne áll-e a vallomás residual-szövegében (ha nem, egy nem
 *       létező maradékot pipálnánk ki — KUKA-066: a kitalált forrás üresnek látszik);
 *   (2) a `probe_id` létező felülvizsgálatra mutat-e;
 *   (3) `measured` állapotnál van-e NEVEZETT próba, és benne van-e a próba-szerződésben;
 *   (4) minden bejegyzésnek van-e ÉRDEMI indoka (a néma lezárás díszpipa — KUKA-087).
 *
 * @param {string[]} expectedProbeIds a manifest szerződése (a hívó adja át — nincs körkörös import)
 */
// ═══ MELYIK PRÓBA MIT ZÁR — A PRÓBA OLDALÁRÓL KIMONDVA (R49/R02) ═══════════════════════════════
//
// A maradék-bejegyzés megnevezi a próbát; itt a PRÓBA nevezi meg a mondatot. A kettőnek EGYEZNIE
// kell — egy idegen próbára átírt bejegyzés így nem tud „mérve" maradni (KUKA-039).
export const PROBE_CLOSES = new Map([
  ["P-INVITE-effect", Object.freeze([
    "egyik világban sem vált be meghívót, nem hoz létre fiókot",
    "a tranzakciós hibák kezelését",
  ])],
  ["P-INVITE-authority", Object.freeze([
    "a másik fiók",
    "a kibocsátói jog",
    "a régi/visszavont tagság",
  ])],
  ["P-CMD-namespace", Object.freeze([
    "más könyv",
  ])],
  ["P-CMD-identity", Object.freeze([
    "beágyazott bemenet",
    "műveletverzió",
  ])],
  ["P-CMD-finalize", Object.freeze([
    "véglegesítés közbeni megvonás",
  ])],
  ["P-CMD-disclosure", Object.freeze([
    "kiadási leltár",
  ])],
  ["P-AUTHZ-evidence", Object.freeze([
    "hibás idő",
    "valódi hatálylejárat",
    "a megvonás → képviseleti lekérdezés kombináció hiányzik",
  ])],
  ["P-AUTHZ-opclass", Object.freeze([
    "ismeretlen osztály",
  ])],
  ["P-AUTHZ-membership-time", Object.freeze([
    "jövőbeli tagság",
  ])],
]);

export function checkResolutions(expectedProbeIds) {
  const problems = [];
  const known = new Set(REVIEWS.map((r) => r.probe_id));
  const contract = new Set(Array.isArray(expectedProbeIds) ? expectedProbeIds : []);

  for (const r of RESIDUAL_RESOLUTIONS) {
    const tag = `${r.probe_id} · „${String(r.clause).slice(0, 40)}…"`;
    if (!known.has(r.probe_id)) { problems.push(`${tag}: nincs ilyen felülvizsgálat`); continue; }
    if (!RESOLUTION_STATES.includes(r.state)) { problems.push(`${tag}: ismeretlen állapot (${r.state})`); }

    const review = REVIEWS.find((x) => x.probe_id === r.probe_id);
    if (!String(review.residual).includes(r.clause)) {
      problems.push(`${tag}: a mondat SZÓ SZERINT nem szerepel a felülvizsgálat maradékában`);
    }
    if (r.state === 'measured') {
      if (!r.probe) problems.push(`${tag}: „measured", de nincs megnevezve próba`);
      else if (!contract.has(r.probe)) problems.push(`${tag}: a megnevezett próba (${r.probe}) nincs a szerződésben`);
      // A PUSZTA LÉTEZÉS NEM LEZÁRÁS (R49/R02). A régi alak beérte azzal, hogy a megnevezett próba
      // SZEREPEL a szerződésben — így bármelyik meglévő, IDEGEN próbára átírva a maradék „mérve"
      // maradt. A kötés KÉTIRÁNYÚ: a próbának magának is ki kell mondania, MELYIK mondatot zárja.
      else if (!(PROBE_CLOSES.get(r.probe) || []).includes(r.clause)) {
        problems.push(`${tag}: a megnevezett próba (${r.probe}) NEM mondja ki, hogy ezt a mondatot zárja`);
      }
    }
    if (r.state === 'open' && r.probe) problems.push(`${tag}: „open", mégis próbára hivatkozik`);
    if (String(r.note || '').trim().length < 40) problems.push(`${tag}: az indok túl rövid (érdemi mondat kell)`);
  }

  // MINDKÉT IRÁNY, MONDAT SZINTEN (KUKA-039 + R49/R01). A régi alak PRÓBÁNKÉNT kérdezte, hogy
  // „van-e legalább egy bejegyzés" — ezért egyetlen MONDAT állás-bejegyzésének a törlése némán
  // átment: a próbának maradt másik bejegyzése. A kötelem a MONDATHOZ tartozik, nem a próbához.
  for (const rev of REVIEWS) {
    const clauses = Array.isArray(rev.residual_clauses) ? rev.residual_clauses : null;
    if (!String(rev.residual || '').trim()) continue;
    if (!clauses || clauses.length === 0) {
      problems.push(`${rev.probe_id}: van maradéka, de nincs MONDATOKRA bontva (residual_clauses)`);
      continue;
    }
    for (const c of clauses) {
      if (!String(rev.residual).includes(c)) {
        problems.push(`${rev.probe_id} · „${c.slice(0, 40)}…": a mondat SZÓ SZERINT nincs a maradék szövegében`);
      }
      const hits = RESIDUAL_RESOLUTIONS.filter((r) => r.probe_id === rev.probe_id && r.clause === c);
      if (hits.length === 0) problems.push(`${rev.probe_id} · „${c.slice(0, 40)}…": a maradék e MONDATÁHOZ nincs állás-bejegyzés`);
      if (hits.length > 1) problems.push(`${rev.probe_id} · „${c.slice(0, 40)}…": ${hits.length} állás-bejegyzés tartozik ugyanahhoz a mondathoz`);
    }
    for (const r of RESIDUAL_RESOLUTIONS.filter((x) => x.probe_id === rev.probe_id)) {
      if (!clauses.includes(r.clause)) {
        problems.push(`${rev.probe_id} · „${String(r.clause).slice(0, 40)}…": olyan mondathoz tartozik, ami nincs a maradék mondat-listáján`);
      }
    }
  }

  return { ok: problems.length === 0, problems };
}

/**
 * A felülvizsgálat a FORRÁS-ÁLLAPOTHOZ kötött. Ha a mai commit más, a rekord nem a mai kódra
 * vonatkozik — ezt ki kell mondani, mert különben a régi pecsét új kódot igazolna (KUKA-050:
 * az állítás elévül).
 */
export function staleFor(currentCommit) {
  if (!currentCommit) return REVIEWS.map((r) => ({ ...r, stale: 'ismeretlen mai commit' }));
  return REVIEWS.filter((r) => r.source_digest !== currentCommit)
    .map((r) => ({ ...r, stale: `a felülvizsgálat a ${String(r.source_digest || r.source_commit).slice(0, 20)} forrás-lenyomaton készült` }));
}
