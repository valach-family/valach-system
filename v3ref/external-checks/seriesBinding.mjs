// v3ref/external-checks/seriesBinding.mjs — A SOROZAT KÖTÉSÉNEK MÉRÉSE: EGY SZABÁLY, EGY OTTHON
//
// MIÉRT KÜLÖN FÁJL (R196 §1 · KUKA-003 · KUKA-029). A kötést KÉT oldal használja: a FUTTATÓ
// (`run-all.mjs`) rögzíti vele a horgonyt a sorozat indításakor, és az ÖSSZESÍTŐ
// (`tools/vs_verify_external_series.mjs`) ehhez méri, hogy a lemezen álló sorozat a MA itt álló
// forrásról szól-e. Ha a mérés mindkét helyen külön állna, a két példány az első szerkesztéskor
// elcsúszna — és az elcsúszás NÉMA lenne: a frissesség-ellenőrzés „nem talál semmit" módon
// látszana zöldnek (ugyanaz a hiba-osztály, mint a `KUKA-051`).
//
// A `run-all.mjs` nem importálható: az egy SZKRIPT, ami behúzáskor azonnal lefut. Ezért a mérés
// jött ki belőle ide, és onnantól mindkét oldal UGYANEZT hívja.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
// A MÉRT FORRÁS TARTALMI LENYOMATA (BND-01) — EGY otthon, és pontosan azt a kötegt fedi, amit a
// battéria futtat (`v3ref/*.mjs`). A sorozat AZONOSSÁGA ezen áll, nem a commit-azonosítón (R196 §1).
import { digestOfBundle } from '../bundleDigest.mjs';

/**
 * A FUTTATÓ, AMI A VERDIKTET HOZZA — NÉVSZERINT, mert a „futtató" ma már nem egy fájl.
 *
 * Mind a három dönt a mérés eredményéről: a `run-all.mjs` futtatja a programokat és írja a
 * rekordot, a `seriesBinding.mjs` méri a kötést, a `seriesLedger.mjs` pedig a KAPU — ő mondja ki,
 * mi számít teljes bizonyítéknak. Bármelyik változása MÁS sorozat, és ez szándékos: az R196 §3
 * kimondja, hogy *„a futtató megváltozásakor új érvényes kötés kell"*. Így a régi eredményt nem
 * kell (és nem is szabad) átnevezni — magától történeti lesz.
 */
export const RUNNER_FILES = ['run-all.mjs', 'seriesBinding.mjs', 'seriesLedger.mjs'];

/** A manifeszt — az ELVÁRT program- és eset-készlet otthona. */
export const PROGRAMS_FILE = 'case-manifest.mjs';

/** Egy fájl lenyomata a `v3ref/external-checks/` alatt — a TÉNYLEGES bájtokból (KUKA-045). */
export function fileDigest(here, file) {
  const path = join(here, file);
  if (!existsSync(path)) return null;
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/**
 * A FUTTATÓ LENYOMATA — a NEVEZETT fájlok név+lenyomat párjaiból. A név is beleszámít, hogy egy
 * átnevezés se maradjon néma; és ha bármelyik fájl HIÁNYZIK, a lenyomat `null` — nem egy
 * „üres fájlok lenyomata" nevű hamis zöld (KUKA-051).
 */
export function runnerDigest(here) {
  const rows = RUNNER_FILES.map((f) => [f, fileDigest(here, f)]);
  if (rows.some(([, d]) => !d)) return null;
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
}

/**
 * A FORRÁS-ÁLLAPOT MÉRÉSE. A `commit` a programoknak továbbadott ÁLLÍTÁS. Itt derül ki, igaz-e: ha
 * a lemásolt forrást érintő nem-könyvelt változás áll a munkamásolatban, a bemondott commit MÁS
 * forrásra vonatkozna.
 */
export function measureSource(root) {
  const git = (...a) => spawnSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  const head = git('rev-parse', 'HEAD');
  if (head.status !== 0) {
    return {
      commit: 'unknown',
      clean: null,
      dirty_files: [],
      note: 'ez a könyvtár nem git-munkamásolat (vagy a git nem elérhető) — a commit BEMONDATLAN marad',
    };
  }
  const sha = head.stdout.trim();
  const st = git('status', '--porcelain', '--', 'v3ref');
  // A generált kimenetek nem tartoznak a MÉRT forráshoz: a results/ és a mutációs eredmény-fájl
  // piszkossága nem teszi mássá a lemásolt kódot.
  const ignore = ['v3ref/external-checks/results/', 'v3ref/v3ref-mutation-result.json', 'v3ref/units/'];
  const dirty = (st.status === 0 ? st.stdout.split('\n') : [])
    .map((l) => l.trim()).filter(Boolean)
    .map((l) => l.replace(/^\S+\s+/, ''))
    .filter((f) => !ignore.some((i) => f.startsWith(i)));
  return {
    commit: dirty.length ? `${sha}+uncommitted` : sha,
    clean: dirty.length === 0,
    dirty_files: dirty,
    note: dirty.length
      ? 'a lemásolt forráson nem-könyvelt változás áll — a bemondott commit ezért jelölt'
      : 'a lemásolt forrás a könyvelt állapoton áll',
  };
}

/**
 * AZ ÉLŐ KÖTÉS — amit az összesítő a horgonyhoz mér (L3, R196 §1). `configDigest`-et a hívó adja be,
 * hogy a darabolási állandók a saját otthonukban maradjanak (`batteryUnits.mjs`).
 */
export function liveBinding({ root, here, configDigest, profileId, profileDigest }) {
  const src = measureSource(root);
  let bundle = null;
  try { bundle = String(digestOfBundle(root)).replace(/^sha256:/, ''); } catch { bundle = null; }
  return {
    // A KÖTÉS = A MÉRT FORRÁS TARTALMA. A commit NEM része: lásd a `provenance`-t alább.
    binding: {
      bundle_digest: bundle,
      programs_digest: fileDigest(here, PROGRAMS_FILE),
      runner_digest: runnerDigest(here),
      config_digest: configDigest,
      /**
       * AZ ELFOGADÁSI PROFIL (PRF-01 · R202 §1) — A HÍVÓ ADJA, ÉS A HÍVÓ VÁLASZTJA EXPLICIT.
       *
       * Szándékosan NINCS alapérték: ha a hívó nem ad profilt, a kötés profil nélkül születik, és a
       * `bindingProblems` ezt NEVEZETTEN kimondja. Egy néma „legyen a mai" alapérték azt jelentené,
       * hogy egy elírás csendben más mércét választ (`KUKA-051`).
       */
      profile_id: profileId,
      profile_digest: profileDigest,
      clean: src.clean === true,
    },
    // A SZÁRMAZÁS: melyik könyvelt állapot írta. Ez a visszakereséshez kell, nem az azonossághoz.
    provenance: { commit: src.commit },
    source: src,
  };
}
