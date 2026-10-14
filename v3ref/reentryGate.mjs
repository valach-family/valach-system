/** RNV-02 — AZ ÚJBÓLI BELÉPÉS BEFOGADÁSI SZERZŐDÉSE: EGY FELOLDÓ, KÉT KAPU (R134/F134-01).
 *
 * A LELET (megtalálta: a KÜLSŐ ELLENŐRZŐ FÉL, chatgpt-v3, R134/F134-01; valódi HTTP + tároló
 * ellenpéldával, a mi kódunkon újramérve). Az R132-es alakban a KIADÁS (`reinviteMember`) megnézte a
 * felfüggesztést, a tiltást, a nyitott felülvizsgálatot és a visszamenőleges érvénytelenséget — a
 * VÉGLEGESÍTÉS (`reentryAdmission`) viszont CSAK a személyt, a könyvet, a szerepet és a lezárt
 * esemény-párt. Mérve: a kiadás UTÁN rögzített felfüggesztés mellett a beváltás `ok:true,
 * outcome:regranted` választ adott, a `membership_grant` 8→9 lett, a `grant_basis` 1→2, és a token
 * ELFOGYOTT. Vagyis a kiadáskori bizonyítékot küldéskori engedélynek olvastuk — pontosan a KUKA-143.
 *
 * A HIBA OSZTÁLYA: FÉL ŐR (KUKA-039). A kizárások VÁLTOZHATÓ tények: a kiadás és az elfogadás között
 * keletkezhetnek. Egy olyan ellenőrzés, ami csak az EGYIK határon fut, nem a tényt védi, hanem a
 * sorrendet — és a spec §3 kimondottan mást kér: *„Az elfogadáskor MINDEN alkalmazandó kapu ismét
 * álljon."*
 *
 * EZÉRT: a kizárások EGY feloldóban élnek, és MINDKÉT határ UGYANEZT hívja — a kiadás (`delegation.mjs`
 * → `reinviteMember`) és a véglegesítés (`invite.mjs` → `reentryAdmission`, a beváltás
 * tranzakcióján BELÜL is). A nemleges válasz NEVE is ugyanaz a két helyen; ezt a battéria MÉRI
 * (findings_r134 (a10)), nem a jóindulat tartja.
 *
 * ÉS EGY SAJÁT LELET UGYANITT (R134, a javítás közben mérve). Az R132-es kiadási kapu
 * felülvizsgálati-kör ága SOHA NEM TÜZELT: a `reviewCircleFor(...)` az ÉRINTETT MŰVELETEK
 * listáját adja (`members`), kör-azonosítót NEM — a kód viszont `circle.circle_id`-t vizsgált,
 * ami mindig `undefined`. Egy nem létező mezőre illesztett feltétel NÉMÁN hamis: a kapu ott állt,
 * de nem zárt (KUKA-131 alakja a saját kódunkon · KUKA-041: a díszpipa sikert jelent arról, ami meg
 * sem történt). A kört mostantól a MEGVONÁSI ESEMÉNY azonosítója keresi meg (`reviewCircleOfRevocation`),
 * tehát a kötés ESEMÉNY-AZONOSÍTÓN áll, nem időablakon.
 *
 * PURE: csak olvas, nem ír. Az időt a hívó adja (EFF-01: a döntés és a hatás EGY `at`-ot lát).
 */
import { suspensionEffectiveAt } from './suspension.mjs';
import { banEffectiveAt, banRequestFor } from './banScope.mjs';
import { RETROACTIVE_TRANSITION } from './membershipPeriod.mjs';
import { reviewCircleOfRevocation, reviewCircleState } from './bitemporal.mjs';

const frozen = (o) => Object.freeze(o);

/** A négy kizárás NEVE, zárt listában — a válasz ebből sorolja fel, MIT mért (KUKA-012). */
export const REENTRY_EXCLUSIONS = Object.freeze([
  'retroactive_invalidity', 'open_review_circle', 'suspension', 'ban',
]);

/**
 * BEFOGADHATÓ-E MA EZ A SZEMÉLY ÚJBÓLI BELÉPÉSRE? — a VÁLTOZHATÓ kizárások egy helyen.
 *
 * @param closed  a `closedMembershipPeriodOf` válasza (a lezárt időszak + a záró megvonás azonosítója)
 * @returns {{ok:true, checked:string[]}|{ok:false, reason:string, message:string, next_step:string}}
 */
export function reentryExclusionsAt({ store, subjectId, bookId, closed, nowIso }) {
  const checked = [];

  // (1) A LEZÁRÁST VISSZAMENŐLEGES ÉRVÉNYTELENSÉG ADTA — ez nem újbóli meghívás kérdése.
  checked.push('retroactive_invalidity');
  if (closed && closed.closed_transition === RETROACTIVE_TRANSITION) {
    return frozen({
      ok: false, reason: 'reentry_blocked_retroactive_invalidity',
      message: 'ezt a tagságot VISSZAMENŐLEGES érvénytelenség zárta le — az ilyen döntés '
        + 'felülvizsgálata a felülvizsgálati kör lezárásának útján megy, nem újbóli meghívással',
      next_step: 'close_review_circle', checked: frozen([...checked]),
    });
  }

  // (2) NYITOTT FELÜLVIZSGÁLATI KÖR — a ZÁRÓ MEGVONÁS eseményéhez kötve (nem időablakkal).
  checked.push('open_review_circle');
  const revocationId = closed ? closed.revocation_id : null;
  if (revocationId !== null && revocationId !== undefined) {
    const circle = reviewCircleOfRevocation({ store, revocationEventId: revocationId });
    if (circle.ok === true && circle.circle_id !== null && circle.circle_id !== undefined) {
      const st = reviewCircleState({ store, circleId: circle.circle_id });
      // AZ ELDÖNTHETETLEN ÁLLAPOT ZÁR, NEVEZETTEN (KUKA-020): ha a kör sora olvasható, de az
      // állapota nem, nem állíthatjuk, hogy nem volt nyitott.
      if (st.ok !== true || st.state !== 'closed') {
        return frozen({
          ok: false, reason: 'reentry_blocked_open_review_circle',
          circle_id: circle.circle_id,
          message: 'ehhez a tagsághoz NYITOTT felülvizsgálati kör tartozik — előbb azt kell lezárni',
          next_step: 'close_review_circle', checked: frozen([...checked]),
        });
      }
    }
  }

  // (3) FELFÜGGESZTÉS — a MAI hatály, ugyanazzal a feloldóval, amit a jog-út is hív.
  checked.push('suspension');
  const susp = suspensionEffectiveAt({ store, subjectId, bookId, nowIso });
  if (susp && susp.suspended === true) {
    // AZ ELDÖNTHETETLEN ÓRA ZÁR, DE A SAJÁT NEVÉN (R158/3 · KUKA-124). A védő feloldó az
    // értelmezhetetlen „most"-ra `suspended: true`-t ad `decidable: false`-szal — ha ezt
    // „FEL VAN FÜGGESZTVE"-ként írnánk ki, a válasz olyan tényt állítana, ami nem igaz, és a
    // valódi hibát (a hívó órája) elrejtené.
    if (susp.decidable === false) {
      return frozen({
        ok: false, reason: 'reentry_undecidable_clock', detail: susp.reason ?? null,
        message: 'a kérés „most"-ja nem értelmezhető, ezért a védő kapuk (felfüggesztés · tiltás) '
          + 'hatálya nem dönthető el — a hozzáférés zárva marad, és a hívónak kanonikus '
          + 'ISO-időpontot kell átadnia',
        next_step: 'fix_request_clock', checked: frozen([...checked]),
      });
    }
    return frozen({
      ok: false, reason: 'reentry_blocked_suspension',
      message: 'ez a tagság FEL VAN FÜGGESZTVE — a felfüggesztés feloldása külön, jogosult eljárás',
      next_step: 'lift_suspension', checked: frozen([...checked]),
    });
  }

  // (4) TILTÁS — SZEMÉLY · HITELESÍTŐ · FIÓK (a hatókört az OK választja ki, REV-N5b). A kérés
  // tengelyeit a HÍVÓ adja, nevesítve: a könyv és a művelet-osztály — így az `operation` fajtájú
  // tiltás is ELDÖNTHETŐ, nem „nem tudjuk" (KUKA-020). A belépési kontextus (hitelesítő) itt
  // SZÁNDÉKOSAN nincs: az alany-szintű és könyv-szintű tiltás enélkül is hat, a hitelesítő-szintűt
  // pedig a belépési út zárja — ezt KIMONDJUK, nem hallgatjuk el (KUKA-033).
  checked.push('ban');
  const ban = banEffectiveAt({
    store, subjectId, nowIso, request: banRequestFor({ bookId, opClass: 'own_book' }, null),
  });
  if (ban && ban.banned === true) {
    // UGYANEZ A KÜLÖNBSÉG A TILTÁS-ÁGON IS (KUKA-039: a szabály mindkét helyen igaz).
    if (ban.decidable === false && String(ban.reason || '').startsWith('clock_')) {
      return frozen({
        ok: false, reason: 'reentry_undecidable_clock', detail: ban.reason ?? null,
        message: 'a kérés „most"-ja nem értelmezhető, ezért a tiltás hatálya nem dönthető el — a '
          + 'hozzáférés zárva marad, és a hívónak kanonikus ISO-időpontot kell átadnia',
        next_step: 'fix_request_clock', checked: frozen([...checked]),
      });
    }
    return frozen({
      ok: false, reason: 'reentry_blocked_ban',
      message: 'erre a személyre TILTÁS van érvényben — a tiltás feloldása külön, jogosult eljárás',
      next_step: 'lift_ban', ban_reason: ban.reason ?? null, checked: frozen([...checked]),
    });
  }

  return frozen({ ok: true, reason: 'reentry_admissible', checked: frozen([...checked]) });
}
