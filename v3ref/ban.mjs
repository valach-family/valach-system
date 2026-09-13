// V3 MAGREFERENCIA — BAN-01: A CÉLZOTT TILTÁS (REV-N5a · REV-N5b · REV-N5c).
//
// MIÉRT MOST ÉS MIÉRT EZ. A `NEXT_REQUIRED_EVIDENCE` (req-3) sorrendje az R53 §7-ből jön:
// REV-N3 → **REV-N5** → REV-N2 → ORG-N1 → ORG-N3 → REV-N4. A REV-N3 az R65-ben lezárult, tehát ez a
// soron következő csomag — és a külső fél az R71 §8/1-ben kimondottan ezt kérte elsődleges
// szállításként. A REV-N5c saját gap-szövege azt is megmondja, MIÉRT nem halasztható: a klauzula a
// tiltás-fogalom nélkül MÉRETLEN, tehát KUKA-051 szerint ZÖLDNEK LÁTSZANA — a méretlen klauzula
// veszélyesebb, mint a kimondottan nyitott.
//
// MIÉRT KÜLÖN MODUL (a SUS-01 mintájára, KUKA-003). A tiltás tényét KETTEN olvassák: az `authz.mjs`
// (tagsági út) és az `adjudication.mjs` (hatásköri út). Az `authz.mjs` MÁR behúzza az
// `adjudication.mjs`-t, tehát az ellenirányú behúzás KÖRT csinálna. Egy fogalomnak EGY otthona, és
// az otthon nem lehet egyik oldal sem: ez a modul csak a tárolót ismeri, és mindkét út ide fordul.
// Ez egyben a REV-N5a gépi biztosítéka: ha a tiltás EGY feloldóban él, egy új engedő út nem tud
// „elfelejtkezni" róla — a fél őr (KUKA-039) nem tud csendben megszületni.
//
// A HÁROM KLAUZULA, ÉS HOL ÁLL A KÓDBAN:
//   · REV-N5b — a FAJTA nevezett, zárt halmazból, és az OK választja ki (`BAN_KINDS` · `BAN_CAUSES`
//     · `kindForCause`). A hatókör a fajtából származik (`banReaches`).
//   · REV-N5a — EGY feloldó (`banEffectiveAt`), amit MINDKÉT engedő út hív. A tiltás bevezetésének
//     HELYE nem szűkíti a hatását: a rekordban nincs olyan mező, ami azt mondaná, „melyik úton".
//   · REV-N5c — ez a modul KIZÁRÓLAG a `subject_ban` táblába ír. A múlt (parancs · nyugta · kiadás)
//     és a MÁSIK jogosult sora érintetlen marad; ezt a P-REV-ban-past próba tartalmilag méri.

import { instantMs, withTransaction } from './store.mjs';

// ═══ A TILTÁS FAJTÁI — ZÁRT HALMAZ, NEVEZETT HATÓKÖRREL (REV-N5b) ══════════════════════════════
//
// A norma hét fajtát sorol fel: hitelesítő · munkamenet · alany · jogalap · könyv · művelet ·
// adatkör. Mindegyikhez tartozik egy MEGKÜLÖNBÖZTETŐ: az a tény a kérésben, ami eldönti, hogy ez a
// tiltás érinti-e ezt a kérést. A `discriminator: null` azt jelenti, hogy a fajta hatóköre az EGÉSZ
// alany — nincs mit egyeztetni, mindig hat.
//
// `Map`, nem sima objektum: az örökölt kulcs (`toString`, `constructor`, `__proto__`) így nem tud
// beletalálni, tehát egy `kind: 'toString'` nem oldódik fel „ismert fajtává" (a Q07 tanulsága).
const BAN_KINDS = new Map([
  ['credential', Object.freeze({
    discriminator: 'credentialId',
    meaning: 'a HITELESÍTŐ tiltott — mindenhol, ahol azzal lépnének be',
  })],
  ['session', Object.freeze({
    discriminator: 'sessionId',
    meaning: 'egy konkrét MUNKAMENET tiltott',
  })],
  ['subject', Object.freeze({
    discriminator: null,
    meaning: 'az ALANY maga tiltott — minden könyvön, minden úton',
  })],
  ['legal_basis', Object.freeze({
    discriminator: 'basisId',
    meaning: 'a JOGALAP megszűnt — minden, ami rajta nyugszik, tiltott',
  })],
  ['book', Object.freeze({
    discriminator: 'bookId',
    meaning: 'EGY könyvre szóló tiltás — a többi könyvet NEM érinti',
  })],
  ['operation', Object.freeze({
    discriminator: 'opClass',
    meaning: 'EGY művelet-osztály tiltott — könyveken át',
  })],
  ['data_scope', Object.freeze({
    discriminator: 'dataScope',
    meaning: 'EGY adatkör tiltott',
  })],
]);

export const KNOWN_BAN_KINDS = Object.freeze([...BAN_KINDS.keys()]);

// ═══ AZ OK VÁLASZTJA A FAJTÁT — NEM EGY ÁLTALÁNOS SZABÁLY (REV-N5b) ════════════════════════════
//
// Ez a norma szíve, és az R55 §7 második korrekciójából született. A régi mondatunk feltétel nélkül
// állította, hogy a tiltás „nem sújthat FÜGGETLEN könyveket" — ez TÚL ERŐS: kompromittált
// HITELESÍTŐNÉL a másik könyvbe SEM szabad bejutni ugyanazzal. A hatókör tehát az OKBÓL származik
// (KUKA-048 elve: a kivétel/hatókör mércéjét az INDOK szabja meg, nem egy általános tilalom).
//
// A két, normában NEVESÍTETT eset:
//   · kilépés egy cégből        ⇒ `book`       ⇒ a másik, független könyv joga ÉRINTETLEN
//   · kompromittált hitelesítő  ⇒ `credential` ⇒ MINDENHOL tilos, ahol azzal lépnének be
const BAN_CAUSES = new Map([
  ['left_company', 'book'],
  ['credential_compromised', 'credential'],
  ['session_hijack_suspected', 'session'],
  ['mandate_withdrawn', 'legal_basis'],
  ['court_order_subject', 'subject'],
  ['operation_misuse', 'operation'],
  ['data_scope_withdrawn', 'data_scope'],
]);

export const KNOWN_BAN_CAUSES = Object.freeze([...BAN_CAUSES.keys()]);

/** Az OK → FAJTA leképezés. Ismeretlen ok ⇒ `null` (NEM „általános tiltás"). */
export function kindForCause(cause) {
  return typeof cause === 'string' && BAN_CAUSES.has(cause) ? BAN_CAUSES.get(cause) : null;
}

/** A FAJTA leírása. Ismeretlen fajta ⇒ `null` — a hívónak KEZELNIE kell, nem elnyelnie. */
export function banKind(kind) {
  return typeof kind === 'string' && BAN_KINDS.has(kind) ? BAN_KINDS.get(kind) : null;
}

// ═══ ELÉRI-E EZT A KÉRÉST? — HÁROM VÁLASZ, NEM KETTŐ ═══════════════════════════════════════════
//
// A boolean itt KEVÉS lenne, és pontosan azt a hibát szülné, amit a KUKA-020 tilt: a „nem tudom"
// ugyanúgy nézne ki, mint a „nem". Három megkülönböztetett válasz:
//   · reaches:true                  — a megkülönböztető EGYEZIK (vagy a fajta alany-szintű)
//   · reaches:false, decidable:true — a megkülönböztető KÜLÖNBÖZIK: ez a kérés bizonyítottan más
//     (EZ tartja a „kilépés a másik könyvet nem érinti" felét — enélkül a tiltás túlnyúlna)
//   · decidable:false               — a kérés nem hordozza a megkülönböztetőt, tehát NEM TUDJUK,
//     hogy érinti-e. Ilyenkor ZÁR (védő intézkedésnél a kétség nem nyithat hozzáférést), de a
//     válasz NEVEZETT: `ban_target_undecidable`, nem „általános tiltás".
//
// AZ ISMERETLEN FAJTA külön eset, és a norma kimondja: „ismeretlen fajta NEM »általános tiltás«,
// hanem nem dönthető". Ezért NINCS SQL CHECK a `kind` oszlopon — ha lenne, az ismeretlen fajta be
// sem kerülhetne a tárolóba, és ez az ág MÉRHETETLEN volna (KUKA-051: a nem mért ág zöldnek
// látszik). A zárt halmazt a FELOLDÓ őrzi, és az ismeretlen fajta itt kap nevet.
export function banReaches(ban, request) {
  const kind = banKind(ban?.kind);
  if (!kind) {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_kind_unknown',
      message: `a tiltás fajtája ("${ban?.kind}") nem ismert — a zárt halmaz: ${KNOWN_BAN_KINDS.join(', ')}. `
        + 'Ismeretlen fajtánál a hatókör NEM DÖNTHETŐ, ezért a hozzáférés zárva marad; ez nem '
        + '„általános tiltás", hanem nevezett bizonytalanság.',
    });
  }
  if (kind.discriminator === null) {
    return Object.freeze({ reaches: true, decidable: true, reason: 'ban_subject_wide' });
  }
  const asked = request ? request[kind.discriminator] : undefined;
  if (asked === undefined || asked === null || String(asked).trim() === '') {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_target_undecidable',
      message: `a tiltás fajtája "${ban.kind}" (${kind.meaning}), a kérés viszont nem hordozza a `
        + `\`${kind.discriminator}\` megkülönböztetőt — így nem dönthető el, hogy ez a kérés érintett-e. `
        + 'A hozzáférés zárva marad; a pontos válaszhoz a hívó adja meg a megkülönböztetőt.',
    });
  }
  const target = ban.target_ref;
  if (target === null || target === undefined || String(target).trim() === '') {
    return Object.freeze({
      reaches: true, decidable: false, reason: 'ban_target_missing',
      message: `a(z) "${ban.kind}" fajtájú tiltás nem nevezi meg, MIRE szól (\`target_ref\` üres) — `
        + 'hatókör nélküli célzott tiltás nem dönthető el.',
    });
  }
  const hit = String(target) === String(asked);
  return Object.freeze({
    reaches: hit, decidable: true,
    reason: hit ? `ban_scope_${ban.kind}` : `ban_other_${kind.discriminator}`,
  });
}

// ═══ HATÁLYOS-E MOST — EGY FELOLDÓ, AMIT MINDEN ENGEDŐ ÚT HÍV (REV-N5a) ════════════════════════
//
// Az idő-kezelés IRÁNYA azonos a felfüggesztésével (SUS-01), és ez SZÁNDÉKOS: a tiltás VÉDŐ
// intézkedés, tehát az eldönthetetlen óra nem oldhatja fel.
//
// @param request  a kérés megkülönböztetői: {bookId, opClass, credentialId, sessionId, basisId, dataScope}
// @returns {{banned:boolean, reason:string, ...}}
export function banEffectiveAt({ store, subjectId, nowIso, request }) {
  const now = instantMs(nowIso);
  if (!now.ok) return Object.freeze({ banned: false, reason: `clock_${now.reason}` });

  const rows = store.all('SELECT * FROM subject_ban WHERE subject_id = ? ORDER BY id', subjectId);
  for (const row of rows) {
    const from = instantMs(row.banned_at);
    if (!from.ok) {
      return Object.freeze({ banned: true, reason: 'ban_start_undecidable', id: row.id, kind: row.kind });
    }
    if (from.ms > now.ms) continue;                       // ütemezett, még nem hatályos
    if (row.lifted_at !== null && row.lifted_at !== undefined) {
      const lifted = instantMs(row.lifted_at);
      if (!lifted.ok) {
        return Object.freeze({ banned: true, reason: 'ban_lift_undecidable', id: row.id, kind: row.kind });
      }
      if (lifted.ms <= now.ms) continue;                  // a tiltás véget ért — a SOR megmarad (történet)
    }
    const scope = banReaches(row, request);
    if (!scope.reaches) continue;                         // más könyv / más művelet — NEM érinti (REV-N5b)
    return Object.freeze({
      banned: true, reason: scope.reason, decidable: scope.decidable,
      id: row.id, kind: row.kind, cause: row.cause, since: row.banned_at,
      message: scope.message || `célzott tiltás van hatályban ("${row.kind}", oka: "${row.cause}")`,
    });
  }
  return Object.freeze({ banned: false, reason: 'not_banned' });
}

// ═══ A TILTÁS KIMONDÁSA — HATÁSKÖRHÖZ KÖTVE, ESEMÉNYKÉNT ═══════════════════════════════════════
//
// A hatáskör ugyanaz, ami a jogváltoztatásé (`alter_right`) — a hívó adja át a döntést, mert a
// hatáskör-feloldó az `adjudication.mjs`-ben él, és annak behúzása innen kört csinálna. Ez NEM
// kiskapu: a `imposeBan` hatáskör nélkül NEM hívható a magban, és a próba ezt méri.
//
// A tiltás ESEMÉNY, nem sor-átírás (K09): a feloldás sem törli, `lifted_at`-ot kap.
export function imposeBan({ store, subjectId, cause, targetRef, actorSubjectId, clock, authorityOk }) {
  if (authorityOk !== true) {
    return Object.freeze({
      ok: false, reason: 'authority_not_established',
      message: 'a célzott tiltás JOGVÁLTOZTATÁS: `alter_right` hatáskör kell hozzá, és az eljáró '
        + 'alanyt meg kell nevezni (REV-N3a).',
    });
  }
  const kind = kindForCause(cause);
  if (!kind) {
    return Object.freeze({
      ok: false, reason: 'ban_cause_unknown',
      message: `ismeretlen tiltás-ok ("${cause}") — a zárt halmaz: ${KNOWN_BAN_CAUSES.join(', ')}. `
        + 'Az OK választja ki a tiltás FAJTÁJÁT és ezzel a hatókörét (REV-N5b); ok nélkül a hatókör '
        + 'nem vezethető le, és „általánosat" nem tételezünk fel.',
    });
  }
  const shape = banKind(kind);
  if (shape.discriminator !== null && (targetRef === undefined || targetRef === null || String(targetRef).trim() === '')) {
    return Object.freeze({
      ok: false, reason: 'ban_target_required',
      message: `a(z) "${cause}" ok "${kind}" fajtájú tiltást jelent (${shape.meaning}), ezért meg kell `
        + `nevezni, MIRE szól (\`targetRef\` = a kérés \`${shape.discriminator}\` értéke).`,
    });
  }
  const nowIso = clock.now();
  return withTransaction(store.db, () => {
    store.run(
      `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)
       VALUES (?,?,?,?,?,?)`,
      subjectId, kind, cause, shape.discriminator === null ? null : String(targetRef), actorSubjectId, nowIso);
    return Object.freeze({ ok: true, kind, cause, target_ref: shape.discriminator === null ? null : String(targetRef), banned_at: nowIso });
  });
}
