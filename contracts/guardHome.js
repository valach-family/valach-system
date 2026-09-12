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
});

function homeOf(id) { return (GUARD_HOME[id] || null); }
function idsHomedIn(home) { return Object.keys(GUARD_HOME).filter((k) => GUARD_HOME[k].home === home); }

module.exports = { GUARD_HOME_CONTRACT_ID, GUARD_HOME, VS_HOMED_CEILING, homeOf, idsHomedIn };
