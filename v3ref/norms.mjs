// V3 MAGREFERENCIA — NORMATÍV MAG ÉS NYITOTT TÉTELEK (R51 §3 · §4 · §5.3).
//
// MIÉRT KÓD, ÉS NEM PRÓZA. A külső fél kimondta: „Vezessétek át a megvonás és az önálló szervezeti
// alap fenti szerződését az egyetlen normatív magba és a nyitott tételek regiszterébe." Prózában
// már leírtuk volna — a saját szabályunk viszont az, hogy ami ellenőrizhető, az verifierbe megy, és
// hogy a leíró szöveg ELÉVÜL (KUKA-050). Egy `.md`, amit senki nem nyit meg, nem norma.
//
// AMIT EZ A FÁJL ÁLLÍT, ÉS AMIT NEM. Ez a lista NEM azt mondja, hogy a szabályok MEGVANNAK. Azt
// mondja meg, MELYIK szabály van megépítve és MELYIK nincs — és a megépítettséghez NEVEZETT próbát
// követel. A `state: 'planned'` melletti tétel KIMONDOTT HIÁNY, nem ígéret: a `gap` mező írja le,
// mi hiányzik. Ez a KUKA-041 elleni védelem a saját normáinkon: a díszpipa sikert jelentene arról,
// ami meg sem történt.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak adat és egy önellenőrzés.

export const NORMS_CONTRACT_ID = 'NRM-01';

// ═══ A MEGVONÁS PROTOKOLLJA (R51 §3) ═══════════════════════════════════════════════════════════
//
// A külső fél kiindulópontja, amit átveszünk: NE egyetlen „visszamenőleges igen/nem" kapcsoló
// legyen. Négy VALÓS helyzet van, és mindegyikhez más teendő tartozik. A négy helyzetet külön
// szabályokra bontottuk, hogy a megépítettségük KÜLÖN legyen mérhető.
export const REVOCATION_NORMS = Object.freeze([
  Object.freeze({
    id: 'REV-N1',
    rule: 'A megvonás EFFEKTÍV PONTJÁTÓL az attól függő új művelet, olvasás és ismétlés tiltott — '
      + 'a véglegesítési verseny határán is. A KORÁBBI, már megszületett hatás ettől nem tűnik el.',
    example: 'A raktáros ma kilép. A tegnapi bevételezése érvényben marad; új tételt nem rögzíthet, '
      + 'és a tegnapi eredményt sem olvashatja ki többé.',
    state: 'implemented',
    probe: 'P-CMD-finalize-gate',
    note: 'Az R51/J1 óta mind a három ág (befogadás · ismétlés · olvasás) a saját ÍRÁS-tranzakcióján '
      + 'BELÜL kérdezi meg a mai jogot. A hatás visszamenőleges érintetlensége a `command` sor '
      + 'változatlanságából következik: a megvonás nem ír rá.',
  }),
  Object.freeze({
    id: 'REV-N2',
    rule: 'Ha MA érkezik bizonyíték arról, hogy egy képviseleti alap MÁR KORÁBBAN érvénytelen volt, '
      + 'az ÚJ, bizonyítékhoz kötött esemény: MÚLTBELI hatály + MAI rögzítés. Az eredeti történet '
      + 'megmarad, az érintett műveletek felülvizsgálati körbe kerülnek.',
    example: 'Júniusban kiderül, hogy egy márciusi meghatalmazás hibás volt. Látszania kell, mit '
      + 'fogadott el a rendszer márciusban, és mit tudunk ma.',
    state: 'planned',
    gap: 'Nincs esemény-fajta a MÚLTBELI HATÁLYÚ, MAI RÖGZÍTÉSŰ helyesbítésre, és nincs olyan '
      + 'nézet, ami a „március, ahogy márciusban tudtuk" és a „március, ahogy ma tudjuk" alakot '
      + 'KÜLÖN reprodukálná. A mai `membership.revoked_at` egyetlen időpont, tehát a két tengelyt '
      + '(hatály · tudomás) nem tudja szétválasztani — ez a KUKA-002 alakja a megvonáson.',
  }),
  Object.freeze({
    id: 'REV-N3',
    rule: 'A megvonás vagy utólagos kifogás FORRÁSA is ellenőrzött hatáskört igényel. A bejelentő '
      + 'önmagában nem tud múltat érvényteleníteni, és nem kap hozzáférést a vitatott adatokhoz.',
    example: 'Aki azt állítja, hogy egy márciusi meghatalmazás hibás volt, ettől még nem láthatja '
      + 'a márciusi árakat.',
    state: 'planned',
    gap: 'A `revokeMembership` ma nem kérdez hatáskört a HÍVÓTÓL — a magreferencia szintjén a '
      + 'megvonás bemenetnek számít. A jogosulatlan kifogás elleni kapu nincs megépítve.',
  }),
  Object.freeze({
    id: 'REV-N4',
    rule: 'A felülvizsgálat NEM jelenti a downstream mozgássor automatikus visszagörgetését. A '
      + 'tényleges készlet-, pénzügyi és külső partneri következményt megőrző KORREKCIÓS folyamat '
      + 'kell, külön jogosult és naplózott jóváhagyással, az eredetire hivatkozva.',
    example: 'Már kiszállított árut nem lehet a jogosultsági sor törlésével fizikailag '
      + 'visszacsinálni.',
    state: 'planned',
    gap: 'Nincs kompenzáló-esemény fogalom a magban. A V2-ben van (`reverse`), de a V3 magja '
      + 'ezt még nem modellezi, és a kettő összekötése nem történt meg.',
  }),
  Object.freeze({
    id: 'REV-N5',
    rule: 'CÉLZOTT TILTÁS (lopott hitelesítő, incidens): az ÚJ használat azonnal tiltott, az '
      + 'érintett időszak és a függőségek felderítendők — de a tiltás nem sújthat FÜGGETLEN '
      + 'könyveket és nem bizonyítja a korábbi műveletek hamisságát.',
    example: 'A jelszó ellopása nem bizonyítja, hogy a felhasználó összes korábbi rendelése hamis.',
    state: 'planned',
    gap: 'Nincs a tagságtól FÜGGETLEN, alany-szintű tiltás-fogalom; ma minden tiltás könyvenkénti '
      + 'tagság-megvonás. A „minden alkalmazható engedő útra érvényes" követelmény (R51 §4) ezért '
      + 'nem is mérhető.',
  }),
]);

// ═══ A MEGMARADÓ ÖNÁLLÓ SZERVEZETI ALAP (R51 §4 — a mi Q09 kérdésünkre adott válaszuk) ══════════
//
// A válasz lényege, amit átveszünk: a megmaradó alap a SZERVEZET tényleges, továbbra is érvényes
// felhatalmazása — NEM egy `organization` felirat, amit a kérő beír. A személyes továbbdelegálás
// és a tartós szervezeti döntés KÉT KÜLÖNBÖZŐ függőség.
export const ORG_BASIS_NORMS = Object.freeze([
  Object.freeze({
    id: 'ORG-N1',
    rule: 'A meghívóhoz tartozó felhatalmazási döntés őrizze a kibocsátó SZEMÉLYÉT és eljárási '
      + 'minőségét, a képviselt szervezetet/könyvet, az alapul szolgáló grant-/határozat-'
      + 'azonosítókat és VERZIÓIKAT, azok hatályát, valamint az adható szerep, művelet és adatkör '
      + 'korlátját.',
    state: 'planned',
    gap: 'A mai `invite.issuer_subject` EGYETLEN személyre mutat, és a jogalapot a `rightAt` mai '
      + 'válasza adja. Se határozat-azonosító, se verzió, se hatály nincs tárolva.',
  }),
  Object.freeze({
    id: 'ORG-N2',
    rule: 'ALAPÉRTELMEZÉS, amíg az explicit szervezeti alap nincs megépítve és MÉRVE: az egy '
      + 'kibocsátói alapra építő referencia annak megvonásakor maradjon TILTÓ. A szervezeti '
      + 'kivételt SOHA nem helyettesítjük tulajdonos-metaadattal, admin-címkével vagy szabadon '
      + 'választott `basis_kind` mezővel — egy önbevalló mező kiírná magát a jog-ellenőrzés alól.',
    state: 'implemented',
    probe: 'P-INVITE-authority',
    note: 'Ez a mai viselkedés, és SZÁNDÉKOSAN az: a kibocsátó jogának megvonása a függő meghívót '
      + 'is érvényteleníti. A tiltó alapértelmezés nem hiányosság, hanem a hiányzó modell helyes '
      + 'kezelése (fail-closed).',
  }),
  Object.freeze({
    id: 'ORG-N3',
    rule: 'A VAGYLAGOS alapok és az EGYÜTTESEN szükséges jóváhagyások nem mosódhatnak össze: egy '
      + 'választható út kiesése mellett másik élhet; két kötelező jóváhagyásból egy nem elég. '
      + 'Célzott tiltás a megmaradó engedő utat is kizárhatja.',
    state: 'planned',
    gap: 'A magban egyetlen jogalap-út van (tagság), tehát a VAGY/ÉS megkülönböztetés fogalmilag '
      + 'sem jelenik meg. A modell bővítése nélkül ez nem mérhető.',
  }),
]);

// ═══ NYITOTT BLOKKOLÓK — a lezárási lista (R51 §5.3) ═══════════════════════════════════════════
//
// „A lezárási listán MARADJON LÁTHATÓ …" — ezért ezek nem a naplóban laknak, ahol a következő kör
// már nem olvassa el, hanem itt, ahol a futtató minden alkalommal kiírja őket.
export const OPEN_BLOCKERS = Object.freeze([
  Object.freeze({
    id: 'OB-1', title: 'A valódi TÖBB-ÍRÓS véglegesítési határ',
    why: 'A `node:sqlite` `BEGIN IMMEDIATE` egyetlen íróval dolgozik, és minden „a tranzakció '
      + 'határán" mérésünk determinisztikus közbeiktatás, nem valódi versenyhelyzet.',
    closes_when: 'Postgres (vagy azzal egyenértékű) tárolón sor-zár vagy verzió-őr, KÉT valódi '
      + 'kapcsolattal mérve.',
  }),
  Object.freeze({
    id: 'OB-2', title: 'Q17 — műtermék-útvonal ütközése',
    why: 'A külső fél nyitott tételként tartja számon; nálunk sincs lezárva.',
    closes_when: 'Nevezett ütközés-szabály + próba.',
  }),
  Object.freeze({
    id: 'OB-3', title: 'Bemeneti séma-regiszter',
    why: 'A parancs `declared` tartalmának alakját ma semmi nem írja elő; a típus és a verzió '
      + 'szerepel az azonosságban, de a MEZŐK nem.',
    closes_when: 'Típusonként deklarált bemeneti séma + a beadás azt validálja.',
  }),
  Object.freeze({
    id: 'OB-4', title: 'A kiadási osztályozó ellenőrzése NEM ÜRES korpuszon',
    why: 'A V3-ban NULLA `.sql` migráció van, tehát a szigorúbb osztályozó mérése ÜRES halmazon '
      + 'futott — az semmit nem bizonyít. Ezt a saját R50-ünk is kimondta.',
    closes_when: 'Valódi, nem üres migrációs korpuszon lefuttatva, a besorolások kézzel átnézve.',
  }),
  Object.freeze({
    id: 'OB-5', title: 'A megvonás visszamenőleges hatálya (REV-N2 … REV-N5)',
    why: 'A protokoll megvan és nevesítve van, de öt szabályból NÉGY `planned`.',
    closes_when: 'A hatály/tudomás két tengelye szétválasztva, kompenzáló esemény, hatáskörös '
      + 'kifogás és alany-szintű célzott tiltás — mind nevezett próbával.',
  }),
  Object.freeze({
    id: 'OB-6', title: 'Az önálló szervezeti alap (ORG-N1, ORG-N3)',
    why: 'A válasz megvan, a modell nincs. Addig a tiltó alapértelmezés (ORG-N2) él.',
    closes_when: 'Határozat-azonosító + verzió + hatály tárolva, VAGY/ÉS jogalap-utakkal.',
  }),
]);

// ═══ AZ ÖNELLENŐRZÉS — KAPU, NEM FELIRAT ═══════════════════════════════════════════════════════
//
// Ugyanaz a minta, amit a maradék-tábla használ (`checkResolutions`): egy regiszter, ami nem tud
// hazudni. Amit mér:
//   · minden szabálynak van azonosítója, mondata és állapota;
//   · `implemented` ⇒ NEVEZETT próba, ami a tervezett készletben SZEREPEL (különben a „megvan"
//     egy nem létező mérésre hivatkozna — KUKA-066);
//   · `planned` ⇒ NEVEZETT hiány (`gap`), legalább 40 karakter. Aki nem tudja leírni, MI hiányzik,
//     az valószínűleg nem is mérte fel (KUKA-087);
//   · minden blokkolónak van indoka ÉS lezárási feltétele — a „majd meglátjuk" nem lezárási
//     feltétel;
//   · PADLÓ a darabszámokon: a néma zsugorodás is piros (KUKA-045).
export const NORM_FLOORS = Object.freeze({ revocation: 5, orgBasis: 3, blockers: 6 });

export function checkNorms(expectedProbeIds) {
  const problems = [];
  const known = new Set(expectedProbeIds || []);

  const checkRules = (list, label) => {
    const seen = new Set();
    for (const r of list) {
      const at = `${label}/${r.id || '(nincs azonosító)'}`;
      if (!r.id) problems.push(`${at}: hiányzó azonosító`);
      if (seen.has(r.id)) problems.push(`${at}: ISMÉTLŐDŐ azonosító`);
      seen.add(r.id);
      if (!r.rule || r.rule.length < 40) problems.push(`${at}: a szabály mondata hiányzik vagy túl rövid`);
      if (r.state === 'implemented') {
        if (!r.probe) problems.push(`${at}: 'implemented', de NEM nevez meg próbát`);
        else if (!known.has(r.probe)) problems.push(`${at}: a megnevezett próba nincs a tervezett készletben: ${r.probe}`);
      } else if (r.state === 'planned') {
        if (!r.gap || r.gap.length < 40) problems.push(`${at}: 'planned', de a HIÁNY nincs megnevezve (min. 40 karakter)`);
        if (r.probe) problems.push(`${at}: 'planned' NEM hivatkozhat próbára — az a megépítettség jele`);
      } else {
        problems.push(`${at}: ismeretlen állapot: ${r.state}`);
      }
    }
  };

  checkRules(REVOCATION_NORMS, 'REVOCATION');
  checkRules(ORG_BASIS_NORMS, 'ORG_BASIS');

  for (const b of OPEN_BLOCKERS) {
    const at = `BLOCKER/${b.id || '(nincs azonosító)'}`;
    if (!b.title) problems.push(`${at}: hiányzó cím`);
    if (!b.why || b.why.length < 40) problems.push(`${at}: az INDOK hiányzik vagy túl rövid`);
    if (!b.closes_when || b.closes_when.length < 20) problems.push(`${at}: nincs LEZÁRÁSI FELTÉTEL`);
  }

  if (REVOCATION_NORMS.length < NORM_FLOORS.revocation) problems.push(`a megvonás-normák száma a padló alá esett (${REVOCATION_NORMS.length} < ${NORM_FLOORS.revocation})`);
  if (ORG_BASIS_NORMS.length < NORM_FLOORS.orgBasis) problems.push(`a szervezeti-alap normák száma a padló alá esett (${ORG_BASIS_NORMS.length} < ${NORM_FLOORS.orgBasis})`);
  if (OPEN_BLOCKERS.length < NORM_FLOORS.blockers) problems.push(`a nyitott blokkolók száma a padló alá esett (${OPEN_BLOCKERS.length} < ${NORM_FLOORS.blockers})`);

  return { ok: problems.length === 0, problems };
}

/** A kimenet SZÁMSZERŰ alakja — a riport ebből dolgozik, nem kézi másolatból (KUKA-082). */
export function normsSummary() {
  const count = (l, s) => l.filter((r) => r.state === s).length;
  return Object.freeze({
    contract_id: NORMS_CONTRACT_ID,
    revocation: { total: REVOCATION_NORMS.length, implemented: count(REVOCATION_NORMS, 'implemented'), planned: count(REVOCATION_NORMS, 'planned') },
    org_basis: { total: ORG_BASIS_NORMS.length, implemented: count(ORG_BASIS_NORMS, 'implemented'), planned: count(ORG_BASIS_NORMS, 'planned') },
    open_blockers: OPEN_BLOCKERS.map((b) => b.id),
  });
}
