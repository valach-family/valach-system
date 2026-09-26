#!/usr/bin/env node
/**
 * KAP-AI — „VAN-E AI-CSATLAKOZÁS EBBEN A KÖRNYEZETBEN?" — MÉRÉS, NEM SEJTÉS (KUKA-089, R89 §6).
 *
 * MIÉRT VAN KÜLÖN ESZKÖZ ERRE. A V2-ben ugyanez a hiba már megtörtént, és a saját jelentésemben
 * ismétlődött meg: „nincs hozzáférésem X-hez" mondat MÉRÉS NÉLKÜL. A V2 válasza egy parancs lett
 * (`npm run kapcsolat:allapot`), és a szabály kimondja: ilyen állítás a jelentésben CSAK ennek a
 * kimenetével együtt szerepelhet. Ez a V3 megfelelője az AI-csatlakozásra.
 *
 * MIT ÍR KI: a felismert szolgáltatókat, VÁLTOZÓ-NEVEKKEL, a meglétük TÉNYÉVEL, és — ha van kész
 * csatlakozás — a HOSZTOT. ÉRTÉKET SOHA (KUKA-006). Ha nincs csatlakozás, KIMONDJA a következményt:
 * mi NEM működik, és mi MŰKÖDIK helyette.
 *
 * AMIT NEM TESZ: nem hív szolgáltatót (ahhoz a `proof:assistant-live` kell), és nem kapcsol be
 * semmit. Új előfizetés, vásárlás vagy új szolgáltató bekapcsolása nem ennek az eszköznek a dolga.
 *
 * KILÉPÉSI KÓD — nevezetten, hogy a söprés és az ember is ugyanazt olvassa:
 *   0 = van kész, engedélyezett csatlakozás
 *   3 = NINCS csatlakozás (ez NEM eszköz-hiba: a mérés lefutott, és a hiányt mondta ki)
 *   1 = a mérés maga nem futott le (váratlan hiba)
 */
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');

try {
  const { providerStatus, PROVIDERS, ENABLE_VAR } = await import(join(ROOT, 'v3app/assistant/provider.mjs'));
  const st = providerStatus(process.env);
  const payload = {
    configured: st.configured === true,
    provider: st.provider ?? null,
    host: st.host ?? null,
    model: st.model ?? null,
    missing: [...(st.missing || [])],
    consequence: st.consequence ?? null,
    candidates: (st.candidates || []).map((c) => ({ id: c.id, label: c.label, required: c.required, present: c.present, missing: c.missing })),
    enable_var: ENABLE_VAR,
    note: 'ÉRTÉK SOHA nem jelenik meg ebben a kimenetben — csak a változók NEVE, a meglétük TÉNYE és a hoszt.',
  };
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    process.exit(payload.configured ? 0 : 3);
  }
  console.log('');
  console.log('V3 — VAN-E AI-CSATLAKOZÁS EBBEN A KÖRNYEZETBEN? (KAP-AI)');
  console.log('='.repeat(86));
  console.log('Titok nem kerül ki: csak a változók NEVE, a hoszt és a válasz TÉNYE látszik.');
  console.log('');
  if (st.configured) {
    console.log(`Chates segéd (élő modell)  —  ELÉRHETŐ`);
    console.log(`   szolgáltató: ${st.provider} (${st.label})`);
    console.log(`   hoszt:       ${st.host}`);
    console.log(`   modell:      ${st.model}`);
    console.log(`   hitelezők:   megvan: ${st.vars_present.join(', ')}`);
    console.log('');
    console.log('KÖVETKEZŐ LÉPÉS: az ÉLŐ végponti próba — npm run proof:assistant-live');
  } else {
    console.log('Chates segéd (élő modell)  —  NINCS CSATLAKOZÁS');
    console.log(`   kapcsoló:    ${ENABLE_VAR}`);
    console.log(`   hiányzik:    ${st.missing.join(', ')}`);
    console.log(`   következmény: ${st.consequence}`);
    console.log('');
    console.log('   A FELISMERT SZOLGÁLTATÓK ÉS AMI HOZZÁJUK KELL (NEVEK, érték nélkül):');
    for (const c of st.candidates) {
      console.log(`     · ${c.id.padEnd(20)} kell: ${c.required.join(' + ')}`);
      console.log(`       ${''.padEnd(20)} megvan: ${c.present.join(', ') || '(egy sem)'} · hiányzik: ${c.missing.join(', ') || '(semmi)'}`);
    }
    console.log('');
    console.log('   AMI EZ NÉLKÜL IS MŰKÖDIK: a helyi segítség · a gyakori kérdések · az oldaltérkép ·');
    console.log('   a kattintható bemutató · a „Keresés az útmutatókban" — MIND modellhívás nélkül.');
    console.log('   AMI NEM: az élő modell-válasz. Ez KÜLSŐ BEÁLLÍTÁS, nem hiányzó kód.');
  }
  console.log('');
  console.log('='.repeat(86));
  console.log(`ÖSSZEGZÉS: ${st.configured ? 'van engedélyezett csatlakozás' : 'NINCS engedélyezett csatlakozás'}`
    + ' — erre vonatkozó állítás CSAK ezzel a kimenettel együtt írható le (KUKA-089).');
  console.log('');
  process.exit(st.configured ? 0 : 3);
} catch (e) {
  console.error('A MÉRÉS NEM FUTOTT LE (ez NEM azt jelenti, hogy nincs csatlakozás):', e && e.message);
  process.exit(1);
}
