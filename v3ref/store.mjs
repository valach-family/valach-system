// V3 MAGREFERENCIA — ELKÜLÖNÍTETT TÁROLÓ (G5).
//
// Ez NEM a V2 adatbázisa és nem éles adat: minden futás SAJÁT, ideiglenes SQLite-fájlt kap
// (`node:sqlite`, Node 22 beépített). Ezért a „nincs DATABASE_URL" NEM indok a magpróba
// elmaradására — az R32 §4 ezt kimondta, és igaza volt.
//
// A séma a K01–K09 szabályokat követi, NEM a V2 sémáját másolja:
//   · az alany BELSŐ azonosítója soha nem e-mail és nem adószám (K01)
//   · a külső azonosító névtérrel, kibocsátóval, joghatósággal és SZÁMOSSÁGGAL jár (K01)
//   · a hitelesítő adat MEGLÉTE külön tény — ez a K03 alak-döntés bemenete
//   · a tagság visszavonása KÜLÖN esemény, nem sor-törlés (K09)
//   · a kiadás LELTÁRBA kerül (K05)
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCHEMA = `
CREATE TABLE subject (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('person','legal_entity','org_unit'))
);

CREATE TABLE external_id (
  subject_id    TEXT NOT NULL REFERENCES subject(id),
  namespace     TEXT NOT NULL,
  issuer        TEXT NOT NULL,
  jurisdiction  TEXT NOT NULL,
  value_raw     TEXT NOT NULL,
  value_norm    TEXT NOT NULL,
  cardinality   TEXT NOT NULL CHECK (cardinality IN ('one_to_one','one_to_many','many_to_many')),
  valid_from    TEXT NOT NULL,
  valid_to      TEXT
);

CREATE TABLE account (
  subject_id    TEXT PRIMARY KEY REFERENCES subject(id),
  credential    TEXT
);

CREATE TABLE book (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL
);

CREATE TABLE membership (
  subject_id    TEXT NOT NULL REFERENCES subject(id),
  book_id       TEXT NOT NULL REFERENCES book(id),
  role          TEXT NOT NULL,
  granted_at    TEXT NOT NULL,
  revoked_at    TEXT,
  PRIMARY KEY (subject_id, book_id)
);

CREATE TABLE invite (
  token             TEXT PRIMARY KEY,
  book_id           TEXT NOT NULL REFERENCES book(id),
  invitee_namespace TEXT NOT NULL,
  invitee_value     TEXT NOT NULL,
  offered_role      TEXT NOT NULL,
  issuer_subject    TEXT NOT NULL REFERENCES subject(id),
  expires_at        TEXT NOT NULL,
  redeemed_at       TEXT
);

CREATE TABLE pending_intent (
  session_id    TEXT PRIMARY KEY,
  invite_token  TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE channel_proof (
  subject_id    TEXT NOT NULL,
  namespace     TEXT NOT NULL,
  value_norm    TEXT NOT NULL,
  proven_at     TEXT NOT NULL,
  PRIMARY KEY (subject_id, namespace, value_norm)
);

CREATE TABLE command (
  idem_key      TEXT PRIMARY KEY,
  actor         TEXT NOT NULL,
  book_id       TEXT NOT NULL,
  type          TEXT NOT NULL,
  type_version  TEXT NOT NULL,
  declared_hash TEXT NOT NULL,
  resolved_json TEXT NOT NULL,
  effect_id     TEXT,
  state         TEXT NOT NULL,
  finalized_at  TEXT
);

CREATE TABLE disclosure (
  id            TEXT PRIMARY KEY,
  recipient     TEXT NOT NULL,
  view          TEXT NOT NULL,
  scope         TEXT NOT NULL,
  at            TEXT NOT NULL
);
`;

export function openStore() {
  const dir = mkdtempSync(join(tmpdir(), 'v3ref-'));
  const path = join(dir, 'ref.sqlite');
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return {
    db,
    path,
    close() { db.close(); rmSync(dir, { recursive: true, force: true }); },
    run(sql, ...params) { return db.prepare(sql).run(...params); },
    all(sql, ...params) { return db.prepare(sql).all(...params); },
    get(sql, ...params) { return db.prepare(sql).get(...params); },
  };
}

// Determinisztikus idő: a próbának reprodukálhatónak kell lennie (R32 §4 bizonyítékrekord).
export function clockFrom(iso) {
  let t = Date.parse(iso);
  return { now: () => new Date(t).toISOString(), advance: (ms) => { t += ms; } };
}
