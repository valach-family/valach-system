'use strict';

// Valach System — A KUKA-TANULSÁGOK ŐR-OTTHONA (GHM-01).
//
// MIÉRT LÉTEZIK EZ A FÁJL. A KUKA-regiszter 89 tanulsága ÁTJÖTT a V2-ből, mert a tanulság nem
// verzió-függő. A hozzájuk tartozó GÉPI JELEK viszont a V2 fájljaira mutatnak (`src/…`), ami itt
// nem létezik. Ha ezt elhallgatnánk, két rossz dolog közül az egyik történne:
//   · a tiltó-jel némán ÁTMENNE (nincs mit szkennelni ⇒ nincs találat ⇒ "zöld"), tehát a védelem
//     látszana meglévőnek, holott nincs — pontosan a KUKA-051 és a KUKA-041 hibája;
//   · vagy 85 jel PIROSAN állna az első naptól, és a battéria elveszítené a jelentését.
//
// Ezért MINDEN bejegyzésnek KIMONDOTT otthona van, és a `verify:kuka` a listát KIÍRJA:
//   'v3'   — a jel cél-fájljai ITT vannak, tehát a jel LEFUT (valódi védelem)
//   'vs'   — a jel a V2 repóban (`valach-family/vs`) él; itt NEM fut, a tanulság viszont érvényes
//   'none' — a bejegyzésnek nincs gépi jele, és ezt maga a bejegyzés mondja ki (guard_note)
//
// A 'vs' szám PADLÓ, nem cél: CSÖKKENHET (ahogy a V3 megépíti a saját őrét), NŐNI NEM SZABAD.
// Ez a fájl SZÁRMAZTATOTT állítás, amit a verifier VISSZAMÉR: ha egy 'v3'-nak jelölt bejegyzés
// cél-fájlja hiányzik, vagy egy 'vs'-nek jelölt jel valójában lefuttatható volna, az PIROS.
//
// PURE + INERT: nincs DB, nincs hálózat, nincs titok. Csak adat.

const GUARD_HOME_CONTRACT_ID = 'GHM-01';

// A V2-ben honos jelek MAI száma. Ez a valóság rögzítése, nem cél — lásd fent.
// 2026-09-11 (D-VS-678): 83 → 84. NEM elmaradt átköltöztetés: a KUKA-106 a BOARD indulási útjáról
// szól, a board pedig a V2 repóban él — a jele ott FUT (verify:lanes LAN07), tehát ide nem hozható.
// 2026-09-12 (D-VS-680): 85 → 86. UGYANEZ AZ INDOK, nem új engedmény: a KUKA-112 a board
// bizonyíték-kapujáról szól (a nulla eset nem bizonyíték), a kapu és a jele (verify:matrix-liveness
// MTX06 + a board test:units) a V2 repóban FUT — ide nem hozható, mert a V3-nak nincs boardja.
// A plafon emelése CSAK ilyenkor szabályos: ha az új jel HELYE valóban a V2, nem pedig elmaradt
// átköltöztetés. Az e körben született másik két tanulság (KUKA-111 · KUKA-113) a V3-ban fut.
// 2026-09-12 (R63, D-VS-686): 86 → 90. UGYANAZ AZ INDOK, nem új engedmény: mind a NÉGY új
// tanulság a BOARD bizonyíték-befogadásáról szól (közös szerződés · alkalmazhatóság-alap ·
// a megkerülő út · az arány mint teljesség-mérce), és mind a négy jele a V2 repóban FUT
// (verify:matrix-profiles MPF03/08–13 + a board test:units). A V3-ban nincs board, tehát a
// jelek ide nem hozhatók — a plafon emelése CSAK ilyenkor szabályos.
// 2026-09-12 (R65, D-VS-689): 90 → 92. UGYANAZ AZ INDOK, harmadszor kimondva, mert az ismétlődő
// engedmény a legkönnyebben szokássá váló dolog: mindkét új tanulság a BOARD bizonyíték-útjáról
// szól (a hitelesített szereplő · a fájl ≠ teszteset egység), és mindkettő jele a V2 repóban FUT
// (verify:matrix-profiles MPF10/15/17 + a board test:units). A V3-nak nincs boardja, tehát a jelek
// ide nem hozhatók. AMI VISZONT NEM ENGEDMÉNY: az e körben született MAG-munka (REV-N3a/b/c) jelei
// ITT futnak — verify:v3ref, a P-REV-authority és P-REV-claim-read próbákkal, M50–M55 mutációval.
const VS_HOMED_CEILING = 92;

const GUARD_HOME = Object.freeze({
  'KUKA-113': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-111': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-110': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-109': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-108': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-107': Object.freeze({ home: 'vs', note: 'a board a V2 repoban el - a BDR jel OTT fut' }),
  'KUKA-106': Object.freeze({ home: 'vs', note: 'a board a V2 repóban él — a LAN07 jel OTT fut' }),
  'KUKA-105': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-104': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-103': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-102': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-101': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-100': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-099': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-098': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-097': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-096': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-095': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-094': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-093': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-092': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-091': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-090': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-089': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-088': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-087': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-086': Object.freeze({ home: 'none', note: 'a bejegyzés maga mondja ki, hogy gépi jele nincs (guard_note)' }),
  'KUKA-085': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-084': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-083': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-082': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-081': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-078': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-080': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-079': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-077': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-076': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-075': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-074': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-073': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-072': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-071': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-070': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-069': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-068': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-067': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-066': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-065': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-064': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-063': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-062': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-061': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-060': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-059': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-058': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-057': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-055': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-054': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-053': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-001': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-002': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-003': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-004': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-005': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-006': Object.freeze({ home: 'none', note: 'a bejegyzés maga mondja ki, hogy gépi jele nincs (guard_note)' }),
  'KUKA-007': Object.freeze({ home: 'v3', note: 'a jelek cél-fájljai ITT vannak — a jel FUT' }),
  'KUKA-008': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-009': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-010': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-011': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-012': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-013': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-014': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-015': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-016': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-017': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-018': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-019': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-020': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-021': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-022': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-023': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-024': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-025': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-026': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-027': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-028': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-029': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-030': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-031': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-032': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-033': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-034': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-035': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-036': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-037': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-038': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-046': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-045': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-044': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-043': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-042': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-051': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-050': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-049': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-048': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-047': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-041': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-039': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-040': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-052': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-056': Object.freeze({ home: 'vs', note: 'a jelek a V2 fájljaira mutatnak (vs repó) — itt NEM fut' }),
  'KUKA-112': Object.freeze({ home: 'vs', note: 'a BOARD bizonyíték-kapuja a V2 repóban él — a jel (verify:matrix-liveness MTX06 + board test:units) OTT fut' }),
  'KUKA-114': Object.freeze({ home: 'vs', note: 'a board BEFOGADÁSI SZERZŐDÉSE (EVC-01) a V2 repóban él — a jel (verify:matrix-profiles MPF12 + board egység-próbák) OTT fut' }),
  'KUKA-115': Object.freeze({ home: 'vs', note: 'az alkalmazhatóság-alap és a képesség-regiszter (CAP-01) a boardon él; a V3-oldali TANÚ-őr (verify:capability-witness) ehhez mér vissza' }),
  'KUKA-119': Object.freeze({ home: 'vs', note: 'a futtató és a befogadási szerződés a boardon él — a jel (MPF17) OTT fut' }),
  'KUKA-118': Object.freeze({ home: 'vs', note: 'a board hitelesítése és a közvetlen státusz-út a V2 repóban van — a jel (MPF10/MPF15) OTT fut' }),
  'KUKA-116': Object.freeze({ home: 'vs', note: 'a megkerülő HTTP-út és a kör-eszköz is a V2 repóban van — a jel (MPF10) OTT fut' }),
  'KUKA-117': Object.freeze({ home: 'vs', note: 'a darabszám-kapu és az eset-készlet a boardon él — a jel (MPF12/MPF13) OTT fut' }),
  'KUKA-121': Object.freeze({ home: 'v3', note: 'a beadvány-integritás és a befogadási korlát a V3 MAGBAN él — a jel (verify:v3ref: P-REV-claim-decide, M62–M64) ITT fut' }),
  // R73 (D-VS-3020) — mind a NÉGY a V3 MAGRÓL szól (tiltás-kérdés tárgya · hatáskör-feloldás ·
  // a parancs-út kontextusa · az ellentmondó rekord), tehát a jelük ITT fut.
  //
  // HELYESBÍTÉS (R75 §6, a KÜLSŐ TÁRGYALÓ FÉL): ez a blokk korábban EGY sorban sorolta fel a
  // `P-REV-ban-scope` és a `P-REV-ban-paths` próbákat „M70 · M71 · M72" falszifikációval — holott
  // az M71 a `P-REV-ban-scope`-ot buktatja, nem a `P-REV-ban-paths`-t. A külső fél ugyanezt a
  // csúszást találta meg máshol is: *„a hivatkozás nem bizonyít íróút-ellenőrzést; javítsuk a
  // kommentet a tényleges gépi jelre vagy ÉPÍTSÜK MEG a hiányzó jelet."* Mindkettőt megtettük: a
  // hivatkozások lentebb próbánként pontosak, a hiányzó íróút-jel pedig MEGSZÜLETETT (M75).
  // A tanulság a KUKA-126 alakja a SAJÁT jegyzeteinkre: egy hivatkozás, amit senki nem mér vissza,
  // DÍSZ — és rosszabb a hiányzónál, mert meglévő bizonyítéknak látszik.
  'KUKA-131': Object.freeze({ home: 'v3', note: 'a kérés-tengely védelme a `banScope.mjs` `banRequestFor`-jában él — a jel (verify:v3ref: P-REV-ban-scope (e) + M71) ITT fut' }),
  'KUKA-132': Object.freeze({ home: 'v3', note: 'a hatáskör-feloldás az AUT-01 modulban él — a jel (verify:v3ref: P-REV-ban-paths (d) + M70) ITT fut' }),
  'KUKA-133': Object.freeze({ home: 'v3', note: 'a belépési kontextus átadása a parancs- ÉS az elbírálási úton él — a jel (verify:v3ref: P-REV-ban-paths (g) + M67 + M77) ITT fut' }),
  'KUKA-134': Object.freeze({ home: 'v3', note: 'az ok↔fajta ellentmondás feloldója a `banScope.mjs` `banRecordIntegrity`-jében él — a jel (verify:v3ref: P-REV-ban-scope (f) + M72) ITT fut' }),
  'KUKA-120': Object.freeze({ home: 'v3', note: 'a felfüggesztés, az elbírálás és a jelzés-út a V3 MAGBAN él — a jel (verify:v3ref: P-REV-suspension + P-REV-claim-read, M56–M61) ITT fut' }),
  // R75 (D-VS-3021) — mind az ÖT a V3 MAGRÓL szól, tehát a jelük ITT fut. Négyet a KÜLSŐ TÁRGYALÓ
  // FÉL talált meg a saját, egy körrel korábbi javításomon; a KUKA-139-et a SAJÁT mutációs próbám.
  'KUKA-135': Object.freeze({ home: 'v3', note: 'a TELJES döntés (AUT-01 `executableRightAt`) és az egyetlen író a V3 magban él — a jel (verify:v3ref: P-REV-ban-paths (e)(f) + M73 + M75) ITT fut' }),
  'KUKA-136': Object.freeze({ home: 'v3', note: 'a művelet-tiltás tárolt hatóköre a `banScope.mjs`-ben él — a jel (verify:v3ref: P-REV-ban-paths (c) + P-REV-ban-matrix + M74 + M79) ITT fut' }),
  'KUKA-137': Object.freeze({ home: 'v3', note: 'a tárolt rekord integritás-feloldója a `banScope.mjs`-ben él — a jel (verify:v3ref: P-REV-ban-scope (g) + M76) ITT fut' }),
  'KUKA-138': Object.freeze({ home: 'v3', note: 'a belépési kontextus az elbírálási úton a V3 magban megy végig — a jel (verify:v3ref: P-REV-ban-paths (g) + M77) ITT fut' }),
  'KUKA-139': Object.freeze({ home: 'v3', note: 'a fixtúra ↔ termék-út megkülönböztetés a V3 próba-készletben él — a jel (v3ref:mutate M68 verdiktje + P-REV-ban-past (e)) ITT fut' }),
  'KUKA-140': Object.freeze({ home: 'v3', note: 'a mutációs battéria falióra-költségvetése a V3 mérőben él — a jel (v3ref:mutate falióra-sora + a TELJES V3 söprés) ITT fut' }),
  'KUKA-141': Object.freeze({ home: 'v3', note: 'a HATÁLYOSULÁSI PONT (EFF-01) a V3 magreferenciában él — a jel a `P-REV-effectuation` próba (négy idő-rögzítő út, visszamért invariánssal) + az M80/M81/M82/M88 mutációk ITT futnak' }),
  'KUKA-142': Object.freeze({ home: 'v3', note: 'a KIADOTT EREDMÉNY ADATKÖRE (DSC-01) a V3 magreferenciában él — a jel a `P-REV-result-scope` próba (pozitív kontroll + ellenpár + besorolás-hiány) + az M85/M86/M87 mutációk ITT futnak' }),
  'KUKA-143': Object.freeze({ home: 'v3', note: 'a tárolt műveleti hatókör szerkezeti épsége (OPS-01) a V3 magreferenciában él — a jel a `P-REV-ban-record-shape` próba (négy hibás alak + két jogos ellenpár) + az M83/M84 mutációk ITT futnak' }),
  'KUKA-144': Object.freeze({ home: 'v3', note: 'a mérő-eszköz kimenet-csonkulása a V3 futtatójában élt — a jel a `verify:kuka` KUKA-144 tiltó-mintája (process.exit a magreferencia futtatójában) + a `v3ref:mutate` mérőhiba-számlálója ITT fut' }),
  'KUKA-145': Object.freeze({ home: 'v3', note: 'a KIADOTT EREDMÉNY SÉMÁJA (DSC-01 v2) a V3 magreferenciában él — a jel a `P-REV-result-shape` próba (mélységi besorolás + levél-típus + nevezett hiány ÚTTAL) + az M89/M90 mutációk ITT futnak' }),
  'KUKA-146': Object.freeze({ home: 'v3', note: 'a KÖZÖS HATÁLYOSULÁSI PONT (EFF-01 v2, `effectuateWith`) a V3 magreferenciában él — a jel a `P-CMD-effectuation` próba + az M91/M92/M93 mutációk ITT futnak' }),
  'KUKA-147': Object.freeze({ home: 'v3', note: 'az ÍRÓ BELÉPÉSI PONTOK regisztere (ENT-01) a V3 magreferenciában él — a jel a `P-REV-entry-points` próba (60 cella, padlóval) + az M94/M95 mutációk ITT futnak' }),
  'KUKA-148': Object.freeze({ home: 'v3', note: 'az EGY AJTÓ (`store.tx`) a V3 magreferencia tárolójában él — a jel a `P-CMD-effectuation` (e) ága és a tároló kapuját hurkoló próbák ITT futnak' }),
  'KUKA-149': Object.freeze({ home: 'v3', note: 'a PRÓBA-TERVEZÉS tanulsága a V3 mérőben él — a jel a `P-CMD-effectuation` (b) ágának `mért pont elérve` mezője + az M93 mutáció verdiktje ITT fut' }),
  'KUKA-151': Object.freeze({ home: 'v3', note: 'az összefűzés beadvány-kapuja (MRG-01) a V3 mutációs battériájában él — a jel a `verify:unit-admission` ITT fut' }),
  'KUKA-152': Object.freeze({ home: 'v3', note: 'az adatkiadás hatályosulási pontja a V3 magreferencia `readCommandResult` útján él — a jel a `P-CMD-release-effectuation` próba ITT fut' }),
  'KUKA-153': Object.freeze({ home: 'v3', note: 'a mutációs horgony egyedisége a V3 battéria alkalmazójában él (`applyEdits`)' }),
  'KUKA-154': Object.freeze({ home: 'v3', note: 'a kötelező készlet rangsora a V3 norma-regiszterében és az összefűzésben él' }),
  'KUKA-155': Object.freeze({ home: 'v3', note: 'a próba-állapot zárt sémája a V3 beadvány-kapujában él (`probeStatusProblem`)' }),
  'KUKA-156': Object.freeze({ home: 'v3', note: 'az elvárt lánc-sorok a V3 norma-regiszteréből származnak (`expectedChainRows`)' }),
  'KUKA-157': Object.freeze({ home: 'v3', note: 'a környezeti felmentés mércéje a V3 külső-lánc futtatójában él (`environmentalObstacle`)' }),
  'KUKA-158': Object.freeze({ home: 'v3', note: 'a felülvizsgálati kör ellenpárja a V3 magreferencia fixtúrájában él (BIT.GRANT · feb-0)' }),
  'KUKA-159': Object.freeze({ home: 'v3', note: 'a tükör-esetek a V3 magreferencia próbáiban élnek (P-REV-grant-axis · P-ORG-basis) — a mutációs battéria méri' }),
  'KUKA-160': Object.freeze({ home: 'v3', note: 'a bukó gyermekfutás teljes nyoma a V3 külső-lánc futtatójában él (`child_trace`)' }),
  // R88 (D-VS-3027) — MINDKETTŐ a V3 MAGRÓL szól, tehát a jelük ITT fut: az egyik a felhatalmazási
  // alap azonosságáról (`authorityBasis.mjs`), a másik a tagságadás atomi határáról
  // (`bitemporal.mjs` + `store.mjs`). Mindkettőt a KÜLSŐ TÁRGYALÓ FÉL találta meg.
  'KUKA-161': Object.freeze({ home: 'v3', note: 'az alap azonossága a (basis_id, book_id) pár — a jel a P-ORG-basis (e) állítása + M121/M122/M123' }),
  'KUKA-162': Object.freeze({ home: 'v3', note: 'a tagságadás atomi határa — a jel az ÚJ P-ORG-grant-atomic próba + M124/M125/M126' }),
  'KUKA-163': Object.freeze({ home: 'v3', note: 'a mutáció-kontroll és a horgony élessége a V3 mutációs battériájában mérhető — a jel az M131/M120 elkapottsága és a `0 elavult horgony` rovat' }),
  'KUKA-164': Object.freeze({ home: 'v3', note: 'a művelet-azonosság és a kötelező tengely a V3 magban él — a jel a külső fél r92authz programja (a TELJES kiadás→beváltás úton, a keletkezett tagságra mérve) + a P-ORG-basis-limit (f)(g) állítása + M134–M137' }),
  'KUKA-165': Object.freeze({ home: 'v3', note: 'a külső-ellenőrző burkolók a V3 repóban élnek — a jel a `verify:external-checks` HOMOKOZÓS futása: a gyökér-feloldó és a forrás-kötés ott mérhető, ahol a kapu ténylegesen fut' }),
  'KUKA-150': Object.freeze({ home: 'v3', note: 'a RUN-02 futás-szerződés (darabolt futás) a V3 mutációs battériájában él — a jel az r79/U01 külső-ellenőrzés + az egység-fájl `evidence_bound` mezője ITT fut' }),
  'KUKA-166': Object.freeze({ home: 'v3', note: 'a norma-lánc klauzula↔állítás kötése a V3 magreferenciában él (`manifest.mjs` + `run.mjs`) — a jel ott mérhető, ahol a kötés SZÜLETIK' }),
  'KUKA-167': Object.freeze({ home: 'v3', note: 'a kiadási osztályozó és a mennyiség-szerződés VISZONYA a V3 magban él — a jel az M144 mutáció és a P-REV-result-shape (d) ága, ahol a VALÓDI eredmény megy át az osztályozón' }),
  'KUKA-168': Object.freeze({ home: 'v3', note: 'a mennyiség két szakasza (határ ↔ profil-kötés) a V3 magban él — a jel a P-BEM (i) ága (ugyanaz a szöveg MÁS profillal MÁS válasz) és a P-KSZ (g) darabos kanonikus alakja' }),
  'KUKA-169': Object.freeze({ home: 'v3', note: 'a kontextus ↔ tartalom szétválasztása a V3 bemeneti sémájában él — a jel a P-BEM (h) `unknown_field@warehouse_id` és a P-KSZ (d) `idempotency_conflict`' }),
  'KUKA-170': Object.freeze({ home: 'v3', note: 'a főkönyv tárolói őrei a V3 sémájában élnek — a jel a P-KSZ (i) NYERS tárolási próbája + az M146/M147 mutáció' }),
  // FIGYELEM, KIMONDVA: a KUKA-171 otthona azért 'v3', mert a jele ITT fut — de a jel NEM a hibát
  // (a söprés téves osztályozását) méri, hanem azt, hogy a nevesített blokkoló (OB-10) létezik és
  // megjelenik a nyitott blokkoló-listán. A hibára magára NINCS gépi jel, és ezt a bejegyzés
  // `guard_note`-ja is kimondja (KUKA-127: a gyengébb jel ERŐSSÉGÉT is ki kell írni).
  'KUKA-171': Object.freeze({ home: 'v3', note: 'a jel a `v3ref/norms.mjs` OB-10 blokkolója — a BLOKKOLÓ létét méri, NEM a söprés osztályozóját' }),
  'KUKA-172': Object.freeze({ home: 'v3', note: 'a darabszám deklarált otthona és a package.json parancs-sora ITT él — a jel a verify:unit-admission UAD08' }),
  'KUKA-173': Object.freeze({ home: 'v3', note: 'a hozzáférési kapu a V3 magban él — a jel a P-AUT-object-neutral próba + M149–M152' }),
  'KUKA-174': Object.freeze({ home: 'v3', note: 'a fixtúra a V3 próba-fájljában él — a jel ugyanannak a próbának az (a) ága' }),
  'KUKA-175': Object.freeze({ home: 'v3', note: 'a darabolás közös deklarációja a V3 külső-ellenőrző könyvtárában él — a jel a verify:unit-admission UAD08; a KÜLSŐ burkolók bontása kimondottan MÉRETLEN' }),
  'KUKA-177': Object.freeze({ home: 'v3', note: 'a darabszám-származtatás és a bukás-okot eldöntő feloldó a V3 magreferenciájában él — a jel a v3ref/unitFailureKind.test.mjs négy ellenpárja és a verify:v3ref kilépési kódja' }),
  'KUKA-176': Object.freeze({ home: 'v3', note: 'a verdikt-szerződés és a hibás-alak ág a V3 szerszám-könyvtárában él — a jel a verify:sweep-verdict SWV07, ellenpárokkal és VALÓDI gyermek-folyamattal' }),
});

function homeOf(id) { return (GUARD_HOME[id] || null); }
function idsHomedIn(home) { return Object.keys(GUARD_HOME).filter((k) => GUARD_HOME[k].home === home); }

module.exports = { GUARD_HOME_CONTRACT_ID, GUARD_HOME, VS_HOMED_CEILING, homeOf, idsHomedIn };
