// V3 MAGREFERENCIA — K07: parancs, egyszeri hatás és újrapróbálás.
//
// Az R32 K07 zárómondata a mérce, és ez a MI C08-as ellenpéldánk JAVÍTOTT alakja — a másik fél
// itt helyesbített minket, és igaza volt:
//   „Hatás visszajátszása és válasz kiadása KÜLÖN: a korábbi belső eredmény változatlan marad, de
//    az ismételt kérőnek CSAK A JELENLEG KIADHATÓ vetületet adjuk. Visszavont jog esetén sem
//    eredményadatot, sem védett létezési jelzést nem adunk pusztán a kulcs ismeretére."
//
// Vagyis a mi javaslatunk („az eltárolt eredményt szó szerint visszajátsszuk") HIBÁS volt:
// visszavont olvasójognál újra kiadta volna az adatot. A helyes alak: a HATÁS változatlan, a
// VÁLASZ mai jogon megy át.
import { createHash } from 'node:crypto';
import { rightAt } from './authz.mjs';

const canon = (obj) => JSON.stringify(obj, Object.keys(obj).sort());
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export function submitCommand({ store, idemKey, actor, bookId, type, typeVersion, declared, resolve, clock, externalEvidence }) {
  const declaredHash = hash(canon(declared));
  const prior = store.get('SELECT * FROM command WHERE idem_key = ?', idemKey);

  // A JOGOT ELŐBB kérdezzük meg, mint hogy a kulcsról bármit mondanánk. Enélkül a puszta
  // ÚJRAPRÓBÁLÁS elárulná, hogy a kulcshoz tartozik-e parancs — vagyis a kulcs próbálgatható
  // létezés-csatorna lenne (KUKA-084). Ezt a lyukat a SAJÁT referenciámban találtam meg, miután
  // a K07-et újraolvastam; a P-A08 próbám előtte a szivárgó viselkedést írta elő helyesként.
  const decision = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence });
  if (!decision.allowed) {
    return Object.freeze({
      ok: false, error: 'not_available',
      message: 'ehhez a művelethez most nincs jogod ebben a könyvben',
      effect_id: null, state: null,
    });
  }

  if (prior) {
    // K07: „Azonos kulcs és ELTÉRŐ deklarált tartalom KONFLIKTUS."
    if (prior.declared_hash !== declaredHash) {
      return { ok: false, error: 'idempotency_conflict', message: 'ugyanaz a kulcs más tartalommal érkezett' };
    }
    // Azonos tartalom: a MÁR LÉTEZŐ parancshoz kapcsolódik — új hatás NEM keletkezik.
    return { ok: true, effect_id: prior.effect_id, state: prior.state, replayed: true };
  }

  // K07: „a tartósan befogadott parancshoz KÜLÖN tároljuk a feloldott bemenetet és annak verzióit…
  // A kiválasztási időpont a művelettípus szerződése." A feloldás EGYSZER fut, és rögzül.
  const resolved = resolve ? resolve() : {};
  const effectId = `eff_${idemKey}`;
  store.run(
    `INSERT INTO command (idem_key, actor, book_id, type, type_version, declared_hash,
                          resolved_json, effect_id, state, finalized_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    idemKey, actor, bookId, type, typeVersion, declaredHash,
    JSON.stringify(resolved), effectId, 'finalized', clock.now());
  return { ok: true, effect_id: effectId, state: 'finalized', replayed: false, resolved };
}

// ── A VÁLASZ KIADÁSA (K07 + K05) ────────────────────────────────────────────────────────────────
// Külön művelet a hatástól. A kulcs ISMERETE nem jogosultság: a mai jogot minden kiadásnál
// ellenőrizzük, és a nemleges válasz NEM árulja el, hogy a parancs létezik-e (KUKA-084).
export function readCommandResult({ store, idemKey, requester, clock, externalEvidence }) {
  const cmd = store.get('SELECT * FROM command WHERE idem_key = ?', idemKey);

  // A NEM LÉTEZŐ és a NEM LÁTHATÓ parancs válasza AZONOS — különben a kulcs próbálgatható.
  const refused = Object.freeze({
    ok: false,
    error: 'not_available',
    message: 'ehhez a hivatkozáshoz most nem tartozik kiadható eredmény',
    effect_id: null,
    result: null,
  });
  if (!cmd) return refused;

  const decision = rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence });
  if (!decision.allowed) return refused;

  // A HATÁS változatlan; a VETÜLET most készül, mai jogon.
  const resolved = JSON.parse(cmd.resolved_json);
  store.run('INSERT INTO disclosure (id, recipient, view, scope, at) VALUES (?,?,?,?,?)',
    `dsc_${idemKey}_${requester}_${clock.now()}`, requester, 'command_result', cmd.book_id, clock.now());
  return Object.freeze({
    ok: true,
    error: null,
    message: 'az eredmény kiadva',
    effect_id: cmd.effect_id,
    result: Object.freeze({ ...resolved }),
  });
}
