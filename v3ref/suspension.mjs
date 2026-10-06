// V3 MAGREFERENCIA — SUS-01: A FELFÜGGESZTÉS TÉNYE (R67/F01).
//
// A LELET (megtalálta: a KÜLSŐ TÁRGYALÓ FÉL, R67/F01). A `suspendMembership` ellenőrizte a
// hatáskört és a tagságot, majd ÍRÁS NÉLKÜL azt válaszolta, hogy `suspended: true`. Az érintett
// ugyanarra a műveletre továbbra is `allowed: true`-t kapott. A saját próbám (P-REV-authority)
// azért maradt zöld, mert a VISSZATÉRÉSI ÉRTÉKET nézte, nem a KÖVETKEZMÉNYT — ez a KUKA-038
// („a létezés nem bizonyíték arra, hogy FUT") alakja a válasz-mezőn.
//
// MIÉRT KÜLÖN MODUL. A tényt KÉTEN használják: az `authz.mjs` OLVASSA (a `rightAt` kapujában), az
// `adjudication.mjs` ÍRJA (mert hatáskör-igényes művelet). Az `authz.mjs` viszont MÁR behúzza az
// `adjudication.mjs`-t (`adjudicationRightAt`), tehát az ellenirányú behúzás KÖRT csinálna. Egy
// fogalomnak EGY otthona (KUKA-003), és ez az otthon nem lehet egyik oldal sem: ez a modul csak a
// tárolót ismeri, és mindkét oldal ide fordul.
import { instantMs } from './store.mjs';

/**
 * FEL VAN-E FÜGGESZTVE MOST — a nevezett feloldó, amit MINDEN olvasó és író HÍV.
 *
 * A DÖNTÉSEK, KIMONDVA:
 *   · suspended_at <= most, nincs feloldás      ⇒ FELFÜGGESZTVE
 *   · suspended_at a JÖVŐBEN                    ⇒ még nem hatályos (nem ír át visszamenőleg semmit)
 *   · lifted_at <= most                         ⇒ a felfüggesztés VÉGET ért (a sor MEGMARAD: történet)
 *   · lifted_at a JÖVŐBEN                       ⇒ még felfüggesztve (ütemezett feloldás)
 *   · ELDÖNTHETETLEN időpont                    ⇒ FELFÜGGESZTVE marad, nevezett okkal
 *
 * Az utolsó pont iránya SZÁNDÉKOS: a felfüggesztés VÉDŐ intézkedés, tehát a kétséges óra nem
 * oldhatja fel (fail-closed a hozzáférés felé). Ez ellentétes a tagságnál használt iránnyal, ahol a
 * kétséges óra a jogot zárja — mindkettő ugyanazt szolgálja: a kétség SOHA nem nyit hozzáférést.
 *
 * @returns {{suspended:boolean, reason:string, since?:string, id?:number}}
 */
export function suspensionEffectiveAt({ store, subjectId, bookId, nowIso }) {
  const now = instantMs(nowIso);
  // UGYANAZ A SZABÁLY, UGYANÚGY (R158/3): a felfüggesztés is VÉDŐ intézkedés, és a SOR-szintű órái
  // már eddig is óvatosan dőltek (`suspension_start_undecidable` · `suspension_lift_undecidable`).
  // A KÉRÉS órája itt is kimaradt — a tiltásnál MÉRT rés párja, ugyanabban a hibaosztályban
  // (KUKA-039: ha egy szabály két helyen igaz, az egyik hely előbb-utóbb kimarad). A `banScope.mjs`
  // épp EZT a modult nevezi meg az irány forrásaként („az idő-kezelés IRÁNYA azonos a
  // felfüggesztésével, SUS-01") — tehát a két javítás EGY döntés két fele (D-VS-3145).
  if (!now.ok) {
    return Object.freeze({
      suspended: true, decidable: false, reason: `clock_${now.reason}`,
      message: 'a kérés „most"-ja nem értelmezhető, ezért nem dönthető el, hatályos-e a '
        + 'felfüggesztés. A felfüggesztés VÉDŐ intézkedés: az eldönthetetlen óra nem oldhatja fel.',
    });
  }
  const rows = store.all(
    'SELECT * FROM membership_suspension WHERE subject_id = ? AND book_id = ? ORDER BY id',
    subjectId, bookId);
  for (const row of rows) {
    const from = instantMs(row.suspended_at);
    if (!from.ok) return Object.freeze({ suspended: true, reason: 'suspension_start_undecidable', id: row.id });
    if (from.ms > now.ms) continue; // ütemezett, még nem hatályos
    if (row.lifted_at === null || row.lifted_at === undefined) {
      return Object.freeze({ suspended: true, reason: 'membership_suspended', since: row.suspended_at, id: row.id });
    }
    const lifted = instantMs(row.lifted_at);
    if (!lifted.ok) return Object.freeze({ suspended: true, reason: 'suspension_lift_undecidable', id: row.id });
    if (lifted.ms > now.ms) {
      return Object.freeze({ suspended: true, reason: 'membership_suspended', since: row.suspended_at, id: row.id });
    }
  }
  return Object.freeze({ suspended: false, reason: 'not_suspended' });
}
