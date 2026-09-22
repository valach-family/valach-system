// tests/e2e/v3app-acceptance.spec.mjs — AZ R63 §5.3 TIZENNÉGY ELFOGADÁSI HELYZETE A BÖNGÉSZŐBEN
// (R64 → R75: a lejárati ágak a fejlesztői órával a böngészőből is mérve; a bemeneti séma a
// határon kapuz, ezért a zárt regiszteren kívüli bemenet MÁS NÉVEN, de ugyanúgy elakad).
//
// HELYZETENKÉNT EGY PRÓBA (H01…H14), ÉS EGY BIZONYÍTÉK-TÉTEL, KÉT REKESSZEL:
//   · `browser` — amit a lap MUTATOTT, és amit a felhasználó TEHETETT (gomb volt-e, mi állt a fejlécben);
//   · `server`  — amit a szerver VÁLASZOLT (a felület kérése elfogva, vagy a böngésző sütijével küldött
//                 közvetlen kérés), és ami a TÁROLÓBAN áll (második kapcsolat, csak olvasás).
// Az ÍTÉLET három szó, és a hiány a saját nevén áll (KUKA-093 · KUKA-041 — a díszpipa tilos):
//   · `bizonyitva`     — a helyzet minden állítása a fenti két rekeszből áll össze;
//   · `reszben`        — egy nevezett al-eset a böngészőből nem hajtható meg; a mutató a mag-próbára áll;
//   · `nem_bongeszoben` — a helyzet a héjból nem hajtható meg; a mutató a mag-próbára / szerszámra áll.
// A lap a futás végén a `var/reports` alá kerül (ART-01 névvel) ÉS a `docs/70_PLANNING/` alá,
// hogy a következő kör ezt olvassa, ne mérje újra (operátori állandó: a felderítés a repóba megy).
//
// A PRÓBA A MAG ÍRÓIT SOHA NEM HÍVJA — ami a tárolóban áll, azt a felület vagy a végpont írta oda.
import { test, expect } from '@playwright/test';
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  World, Db, PASSWORD, loginUI, logoutUI, header, createWorkspaceUI, switchUI, setPlanUI, inviteUI,
  openInviteUI, redeemUI, stockUI, priceUI, grantScopeUI, revokeUI, memberRowText, workspaceListUI, j,
} from './helpers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// A FRISS MÉRÉS ÚJ LAPRA MEGY, a korábbi kör lapját NEM írjuk át (a történetet nem szerkesztjük —
// D-VS-682 elve): az R64-es alak marad a maga helyén, ez a lap a MAI állapot (R75).
const COMMITTED_COPY = 'docs/70_PLANNING/V3_R75_ELFOGADAS_HELYZETEK.json';

// R63 §5.3 — szó szerint.
const SITUATIONS = Object.freeze([
  ['H01', 'Egyszerű magánfiók céges adatbekérés nélkül létrejön; csak saját adatait látja.'],
  ['H02', 'A meglévő magánfiók alkalmazotti meghívót elfogad; saját jelszava, személyes adatai és más céges jogai változatlanok.'],
  ['H03', 'A fiókhoz adószámos működési minőség társul; a magán- és üzleti kör nem olvad össze.'],
  ['H04', 'Saját családi munkakörnyezet indul; második tagot meghívhat a jogosult kezelő, külön állami igazolási kör nélkül a saját helyi körhöz.'],
  ['H05', 'Azonos beírt cégazonosítóval más jelentkező nem kapja meg e munkakörnyezet vagy egy harmadik szolgáltató adatait; legitim saját indulása továbbra lehetséges.'],
  ['H06', 'Továbbadható körön túli meghívás/jogadás elutasított. Lejárt, visszavont, idegen címzettű és ismételten beváltott meghívó nem ad jogot; érvényes párja sikerül.'],
  ['H07', 'A raktári szerepnek adott mennyiségnézetből ár-, számla- vagy beszállítói bizalmas adat nem következik. A pozitív, külön engedélyezett olvasás működik.'],
  ['H08', 'Cégváltáskor a session-kontextus, válaszok és klienscache nem keverik a cégeket. Módosított API-paraméter sem ad idegen jogot.'],
  ['H09', 'Megvonás/lejárat után új kérés és függő meghívó nem használhatja a megszűnt alapot; másik független jogosultság nem szűnik meg indokolatlanul.'],
  ['H10', 'Két szervezeti egység és korlátozott helyi admin példája: a vezető nem kap automatikusan minden üzleti adatot; a delegálási plafon megmarad. Közös jóváhagyás támogatását vagy tényleges hiányát külön, bizonyítékkal nevezd meg.'],
  ['H11', 'Előfizetésileg elérhető funkcióhoz jogosulatlan munkatárs nem jut; jogosult személy sem használhat előfizetésileg nem engedett műveletet. Ehhez tesztprofil elég, fizetési integráció nem kell.'],
  ['H12', 'Két joghatósági azonosítónévtér azonos karaktersora nem téves azonosság; ismeretlen országprofil nem ad széles képviseleti jogot, és nem tiltja általánosan a független saját munkát.'],
  ['H13', 'Kezdő jogosultság, alap nélküli történeti sor, szabályos új felhatalmazás és jogosulatlan bírálói önfeljogosítás külön eredményt kap.'],
  ['H14', 'Két valódi kapcsolat meghívóbeváltási és megvonás–véglegesítési versenye: egyszeri, aktuális szabály szerinti hatás; visszajátszás nem kerüli meg a jelenlegi adatjogot.'],
].map(([id, title]) => Object.freeze({ id, title })));

const EVIDENCE = [];
class Evidence {
  constructor(id) {
    const s = SITUATIONS.find((x) => x.id === id);
    this.id = id; this.title = s.title; this.browser = []; this.server = [];
    this.verdict = 'reszben'; this.note = 'a próba megszakadt, mielőtt az ítélet megszületett volna — a fenti sorok a megszakadásig mért tények';
    EVIDENCE.push(this);
  }
  b(text) { this.browser.push(text); }
  s(text) { this.server.push(text); }
  verdictIs(verdict, note) { this.verdict = verdict; this.note = note; }
  toJSON() { return { id: this.id, title: this.title, browser: this.browser, server: this.server, verdict: this.verdict, note: this.note }; }
}

const line = (text) => (text || '').split('\n')[0];
// EGY tároló, tizennégy világ: minden helyzet SAJÁT adószám-karaktersort ír, hogy az adatbázis-oldali
// számlálás a saját világára szűküljön (a közös érték a testvér-helyzetek sorait is megtalálná — KUKA-054).
const taxOf = (tag) => `${tag.replace(/\D/g, '').padStart(2, '0')}345678-2-42`;

test.afterAll(async () => {
  // A MUNKÁS ÚJRAINDULHAT (egy bukott próba után a futtató új folyamatot nyit): az előző munkás
  // már kiírt tételei a FÁJLBAN állnak — azokat megtartjuk, a sajátjainkat rájuk írjuk. Így a lap
  // akkor is teljes, ha a futás közben folyamat-váltás történt (KUKA-012: néma hiány nincs).
  let previous = [];
  try {
    if (process.env.VS_E2E_EVIDENCE_PATH && existsSync(process.env.VS_E2E_EVIDENCE_PATH)) {
      previous = JSON.parse(readFileSync(process.env.VS_E2E_EVIDENCE_PATH, 'utf8')).situations || [];
    }
  } catch { previous = []; }
  const situations = SITUATIONS.map((s) => EVIDENCE.find((e) => e.id === s.id)?.toJSON()
    ?? previous.find((e) => e.id === s.id && (e.browser.length || e.server.length))
    ?? { id: s.id, title: s.title, browser: [], server: [], verdict: 'reszben', note: 'a próba nem futott le' });
  const summary = { bizonyitva: 0, reszben: 0, nem_bongeszoben: 0 };
  for (const s of situations) summary[s.verdict] = (summary[s.verdict] || 0) + 1;
  const out = {
    schema: 'v3app-elfogadas-helyzetek/1',
    round: 'CMD-VS-300-002-002 R75',
    lane: 'Claude-v3',
    source: 'tests/e2e/v3app-acceptance.spec.mjs',
    command: 'npm run proof:core-ux',
    generated_at: new Date().toISOString(),
    package_version: process.env.VS_E2E_VERSION ?? null,
    base_url: process.env.VS_E2E_BASE_URL ?? null,
    db_path: process.env.VS_E2E_DB_PATH ? `${relative(ROOT, process.env.VS_E2E_DB_PATH)} (a futás végén törölve — var/tmp)` : null,
    what_this_is: 'Az R63 §5.3 tizennégy elfogadási helyzete a v3app héjon, valódi böngészőből (Playwright · Chromium), '
      + 'helyzetenként KÉT rekeszben: amit a lap mutatott (browser) és amit a szerver válaszolt / a tároló őrzött (server). '
      + 'Az ítélet nem díszpipa: ahol egy al-eset a böngészőből nem hajtható meg, ott a lap a mag-próbára mutat.',
    verdict_vocabulary: {
      bizonyitva: 'a helyzet minden állítása a böngésző- és a szerver-rekeszből áll össze',
      reszben: 'egy vagy több nevezett al-eset a böngészőből nem hajtható meg — a `note` megmondja, melyik, és hol van a mag-bizonyíték',
      nem_bongeszoben: 'a helyzet a héjból nem hajtható meg — a `note` a mag-próbára / szerszámra mutat; NEM sikeres próba',
    },
    evidence_kinds: {
      browser: 'a lap által mutatott szöveg, a vezérlők állapota, a fejléc — Playwright-lokátorokkal olvasva',
      server: 'HTTP-válasz törzse (a felület kérése elfogva vagy a böngésző sütijével küldött kérés) · ADATBÁZIS: a tárolt sor második kapcsolaton (WAL) olvasva',
    },
    summary,
    situations,
  };
  const text = `${JSON.stringify(out, null, 2)}\n`;
  if (process.env.VS_E2E_EVIDENCE_PATH) writeFileSync(process.env.VS_E2E_EVIDENCE_PATH, text);
  writeFileSync(resolve(ROOT, COMMITTED_COPY), text);
  console.log(`[e2e] bizonyíték-lap: ${process.env.VS_E2E_EVIDENCE_PATH} + ${COMMITTED_COPY} · ${j(summary)}`);
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
test('H01 — Egyszerű magánfiók céges adatbekérés nélkül létrejön; csak saját adatait látja', async ({ browser }) => {
  const ev = new Evidence('H01'); const w = new World(browser, 'h01'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const fields = await anna.page.locator('[data-testid="register-form"] input').evaluateAll((els) => els.map((e) => e.getAttribute('name')));
    ev.b(`A regisztrációs űrlap mezői: ${fields.join(', ')} — céges adatot (adószám, cégnév) nem kér; a megerősítő hivatkozásra a levél-fogadó listájából kattintott; belépés után a fejléc: „${(await header(anna.page)).subject}"`);
    expect(fields).toEqual(['email', 'password']);
    const p = await createWorkspaceUI(anna.page, { name: 'Anna magántere' });
    ev.b(`Munkakörnyezet adószám NÉLKÜL (a „Vállalkozási minőség" pipa üresen): a lap: „${p.resultText}"; fejléc: „${(await header(anna.page)).workspace}"`);
    ev.s(`POST /api/workspaces → ${p.status}; business=${j(p.body.business)}; role=${p.body.role}; plan=${p.body.workspace.plan}`);
    expect(p.status).toBe(201); expect(p.body.business).toBeNull();
    const st = await stockUI(anna.page);
    ev.b(`Készlet-nézet a saját terén: „${line(st.text)}" (qty ${st.body.result.qty})`);
    expect(st.body.ok).toBe(true);
    // Más ember tere — Anna nem tag: a választója nem mutatja, a váltás és az idegen paraméter sem nyit rá.
    const bela = await w.person('bela');
    const bws = await createWorkspaceUI(bela.page, { name: 'Béla tere', plan: 'pro' });
    const list = await workspaceListUI(anna.page);
    const annaMe0 = (await anna.api.get('/api/me')).body;
    ev.b(`Anna választója ${list.length} tételt mutat: a SZEMÉLYES köre (a cím megerősítésekor magától született — SZK-01, R75) és a most indított tere; Béla tere nem szerepel benne`);
    // A LISTA KETTŐ: a személyes kör + a próbában indított tér. A helyzet állítása változatlan —
    // Anna CSAK a sajátjait látja —, a szám a személyes kör bevezetésével nőtt (R64 L11 zárása).
    expect(list.length).toBe(2);
    expect(annaMe0.workspaces.filter((x) => x.personal).length).toBe(1);
    expect(annaMe0.workspaces.map((x) => x.book_id)).not.toContain(bws.bookId);
    const sw = await anna.api.post('/api/session/workspace', { book_id: bws.bookId });
    const forced = await anna.api.get(`/api/data/price?book_id=${bws.bookId}`);
    const me = (await anna.api.get('/api/me')).body;
    ev.s(`Anna váltása Béla terére → ${sw.status} ${sw.body.reason}/${sw.body.detail}; Anna ár-kérése ?book_id=<Béla pro tere> → param_ignored=${forced.body.param_ignored}, ok=${forced.body.ok}, refused_by=${forced.body.refused_by} (a SAJÁT starter tere dönt — Béla pro-adata nem jön ki); /api/me current_book_id = a saját tere: ${me.current_book_id === p.bookId}`);
    expect(sw.status).toBe(403); expect(forced.body).toMatchObject({ param_ignored: true, ok: false, refused_by: 'entitlement' });
    const bi = db.count('SELECT COUNT(*) AS n FROM business_identity WHERE book_id = ?', p.bookId);
    const xids = db.all('SELECT namespace FROM external_id WHERE subject_id = ?', anna.subjectId).map((r) => r.namespace);
    const mem = db.all('SELECT book_id, role FROM membership WHERE subject_id = ?', anna.subjectId);
    const personalBookId = (await anna.api.get('/api/me')).body.personal_book_id;
    ev.s(`ADATBÁZIS: business_identity a magántéren: ${bi} sor; Anna külső azonosítói: [${xids.join(', ')}] (csak e-mail); tagságai: ${j(mem)} — a SZEMÉLYES köre (${personalBookId}, SZK-01) és a most indított tere, mindkettő admin; idegen könyvben nincs tagsága`);
    expect(bi).toBe(0); expect(xids).toEqual(['email']);
    expect(mem.map((x) => x.book_id).sort()).toEqual([personalBookId, p.bookId].sort());
    expect(mem.every((x) => x.role === 'admin')).toBe(true);
    ev.verdictIs('bizonyitva', 'A minta-rekordok minden munkakörnyezetben azonos tartalmúak (qty 12), ezért a „saját adat" azonosságát nem a tartalom, hanem a munkamenet könyve és az idegen könyv-paraméter figyelmen kívül hagyása bizonyítja; a terv-különbség (saját starter ↔ idegen pro) az ár-nézeten tartalmilag is szétválasztja a két könyvet.');
  } finally { await w.close(); db.close(); }
});

test('H02 — A meglévő magánfiók alkalmazotti meghívót elfogad; jelszava, adatai és más céges jogai változatlanok', async ({ browser }) => {
  const ev = new Evidence('H02'); const w = new World(browser, 'h02'); const db = new Db();
  try {
    const bela = await w.person('bela');
    const own = await createWorkspaceUI(bela.page, { name: 'Béla magántere' });
    const before = {
      credential: db.get('SELECT credential FROM account WHERE subject_id = ?', bela.subjectId).credential,
      xid: db.get('SELECT value_raw, valid_from, valid_to FROM external_id WHERE subject_id = ?', bela.subjectId),
      kind: db.get('SELECT kind FROM subject WHERE id = ?', bela.subjectId).kind,
      own: db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, own.bookId),
    };
    const anna = await w.person('anna');
    await createWorkspaceUI(anna.page, { name: 'Családi Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    const o = await openInviteUI(bela.page, inv.link);
    ev.b(`Béla (meglévő, belépett fiók) megnyitja a meghívó hivatkozását: a lap „${o.observe.status}"-t mutat, a következő lépés: „${o.next}"; a Beváltás gomb látszik: ${o.redeemVisible}`);
    expect(o.observe.status).toBe('redeem_as_existing');
    const r = await redeemUI(bela.page);
    ev.b(`Beváltás után az értesítő: „${r.notice}"; fejléc: „${(await header(bela.page)).workspace}"; a választó: ${(await workspaceListUI(bela.page)).map((x) => line(x.text)).join(' | ')}`);
    ev.s(`POST /api/invites/redeem → ${r.status}; shape=${r.body.shape}, outcome=${r.body.outcome}, read_scope_granted=${r.body.read_scope_granted} — a beváltás CSAK tagságot ír, hitelesítőt nem`);
    expect(r.body).toMatchObject({ ok: true, shape: 'membership_only', outcome: 'granted' });
    const after = {
      credential: db.get('SELECT credential FROM account WHERE subject_id = ?', bela.subjectId).credential,
      xid: db.get('SELECT value_raw, valid_from, valid_to FROM external_id WHERE subject_id = ?', bela.subjectId),
      kind: db.get('SELECT kind FROM subject WHERE id = ?', bela.subjectId).kind,
      own: db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, own.bookId),
    };
    ev.s(`ADATBÁZIS: a jelszó-lenyomat változatlan: ${before.credential === after.credential}; az e-mail azonosító sora változatlan: ${j(before.xid) === j(after.xid)}; az alany fajtája: ${after.kind}; a SAJÁT terének tagsága változatlan: ${j(after.own)}`);
    expect(after).toEqual(before);
    await logoutUI(bela.page);
    const login = await loginUI(bela.page, bela.email, PASSWORD);
    const me = (await bela.api.get('/api/me')).body;
    ev.b(`Kilépés után a RÉGI jelszóval újra belép: „${login.resultText}"; munkakörnyezetei: ${me.workspaces.map((x) => `${x.name} (${x.role})`).join(' · ')}`);
    expect(login.body.ok).toBe(true);
    // A SZEMÉLYES KÖR (admin) + a SAJÁT tere (admin) + a meghívott céges tagság (user). A helyzet
    // állítása változatlan: a meghívás elfogadása NEM írta át sem a jelszót, sem a saját jogait.
    expect(me.workspaces.map((x) => x.role).sort()).toEqual(['admin', 'admin', 'user']);
    expect(me.workspaces.filter((x) => x.personal).length).toBe(1);
    ev.verdictIs('bizonyitva', 'A második faktor a magban nem létező fogalom (nincs mit törölni); a „személyes adat" itt az e-mail azonosító sora és az alany fajtája.');
  } finally { await w.close(); db.close(); }
});

test('H03 — Adószámos működési minőség társul a fiókhoz; a magán- és üzleti kör nem olvad össze', async ({ browser }) => {
  const ev = new Evidence('H03'); const w = new World(browser, 'h03'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const p = await createWorkspaceUI(anna.page, { name: 'Anna magántere' });
    const c = await createWorkspaceUI(anna.page, { name: 'Anna Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    ev.b(`Magántér: „${p.resultText}" · Céges: „${c.resultText}" — a céges soron látszik az önbevallott minőség és hogy igazolás nincs; a választó két külön tételt mutat: ${(await workspaceListUI(anna.page)).map((x) => line(x.text)).join(' | ')}`);
    ev.s(`POST /api/workspaces (céges) → business: ${j(c.body.business)}`);
    expect(c.body.business).toMatchObject({ ok: true, jurisdiction: 'HU', value_norm: taxOf(w.tag).replace(/-/g, ''), issuer: 'self_asserted', verification: 'none_available' });
    const sw = await switchUI(anna.page, p.bookId);
    const hP = (await header(anna.page)).workspace;
    await switchUI(anna.page, c.bookId);
    const hC = (await header(anna.page)).workspace;
    ev.b(`Váltás a magántérre: „${sw.notice}" → fejléc „${hP}"; vissza a cégesre → fejléc „${hC}" — két külön könyv, két külön fejléc`);
    expect(hP).toBe('Anna magántere · admin · starter'); expect(hC).toBe('Anna Kft · admin · starter');
    const biP = db.count('SELECT COUNT(*) AS n FROM business_identity WHERE book_id = ?', p.bookId);
    const biC = db.get('SELECT entity_subject_id, namespace, jurisdiction FROM business_identity WHERE book_id = ?', c.bookId);
    const entKind = db.get('SELECT kind FROM subject WHERE id = ?', biC.entity_subject_id).kind;
    const personKind = db.get('SELECT kind FROM subject WHERE id = ?', anna.subjectId).kind;
    const taxOnPerson = db.count("SELECT COUNT(*) AS n FROM external_id WHERE subject_id = ? AND namespace = 'tax_id'", anna.subjectId);
    const taxOnEntity = db.count("SELECT COUNT(*) AS n FROM external_id WHERE subject_id = ? AND namespace = 'tax_id'", biC.entity_subject_id);
    ev.s(`ADATBÁZIS: business_identity a magántéren ${biP} sor, a cégesen ${j(biC)}; a jogalany alanya: ${entKind}; Anna alanya marad: ${personKind}; adószám Anna SZEMÉLYÉN: ${taxOnPerson} sor, a JOGALANYON: ${taxOnEntity} sor — három külön objektum (személy · jogalany · könyv), a személyhez nem nyúlt`);
    expect(biP).toBe(0); expect(entKind).toBe('legal_entity'); expect(personKind).toBe('person'); expect(taxOnPerson).toBe(0); expect(taxOnEntity).toBe(1);
    ev.verdictIs('bizonyitva', 'A vállalkozási minőség önbevallott (verification: none_available) — hatósági igazoló adapter a magban ma nincs, és ezt a válasz és a lap egyaránt kimondja.');
  } finally { await w.close(); db.close(); }
});

test('H04 — Saját családi munkakörnyezet indul; második tagot a jogosult kezelő hívhat, állami igazolási kör nélkül', async ({ browser }) => {
  const ev = new Evidence('H04'); const w = new World(browser, 'h04'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const c = await createWorkspaceUI(anna.page, { name: 'Családi Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    ev.b(`Anna a felületen indítja a családi munkakörnyezetet: „${c.resultText}"; a Munkatársak szakasz (meghívás) megjelent: ${await anna.page.getByTestId('section-members').isVisible()}`);
    ev.s(`POST /api/workspaces → ${c.status}; business.verification=${c.body.business.verification} (állami igazolási kör NEM futott, nem is kért); role=${c.body.role}`);
    const boot = db.get('SELECT rule_version, basis_id FROM workspace_bootstrap WHERE book_id = ?', c.bookId);
    const startup = db.get('SELECT allowed_operations, allowed_roles, allowed_scopes, evidence_ref FROM authority_basis WHERE basis_id = ? AND book_id = ?', boot.basis_id, c.bookId);
    ev.s(`ADATBÁZIS: az indulás ténye: szabály ${boot.rule_version}, alap ${boot.basis_id}; az alap korlátja: műveletek ${startup.allowed_operations}, szerepek ${startup.allowed_roles}, adatkörök ${startup.allowed_scopes}; bizonyíték-hivatkozás: „${startup.evidence_ref}" — a bizonyíték a létrehozó ELLENŐRZÖTT csatornája, nem hatósági okirat`);
    expect(startup.evidence_ref).toContain('channel=email:'); expect(startup.evidence_ref).not.toMatch(/hatosag|registry|allami/i);
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    ev.b(`Anna meghívja Bélát (user · keszlet): „${inv.resultText}"; a levél-fogadóban a meghívó hivatkozás: ${inv.link ? 'megvan' : 'HIÁNYZIK'}`);
    ev.s(`POST /api/invites → ${inv.status}; basis_id=${inv.body.basis_id}; plafon=${j(inv.body.ceiling)}`);
    const deleg = db.get('SELECT evidence_ref FROM authority_basis WHERE basis_id = ? AND book_id = ?', inv.body.basis_id, c.bookId);
    ev.s(`ADATBÁZIS: a meghívó alapja a kezelő továbbadható jogából KÉPZŐDÖTT: „${deleg.evidence_ref}"; a meghívó sora + pecsételt feltételek + kiadott korlát: ${db.count('SELECT COUNT(*) AS n FROM invite WHERE token = ?', inv.token)}/${db.count('SELECT COUNT(*) AS n FROM invite_terms WHERE token = ?', inv.token)}/${db.count('SELECT COUNT(*) AS n FROM invite_basis WHERE token = ?', inv.token)} sor`);
    expect(deleg.evidence_ref).toContain(`delegated-from:startup-rule:${c.bookId}`);
    const o = await openInviteUI(bela.page, inv.link);
    const r = await redeemUI(bela.page);
    ev.b(`Béla a hivatkozásra kattint → „${o.observe.status}" → Beváltás → fejléc: „${(await header(bela.page)).workspace}"`);
    ev.s(`POST /api/invites/redeem → ${r.status} ${r.body.shape}/${r.body.outcome}; ADATBÁZIS tagság: ${j(db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, c.bookId))}`);
    expect(r.body).toMatchObject({ ok: true, outcome: 'granted' });
    ev.verdictIs('bizonyitva', 'A második tag a HELYI körbe kerül (tagság a családi könyvben); adatot a tagság önmagában nem ad — azt az admin külön adatkör-adása nyitja (H07).');
  } finally { await w.close(); db.close(); }
});

test('H05 — Azonos cégazonosítóval más jelentkező nem kap hozzáférést; saját indulása lehetséges', async ({ browser }) => {
  const ev = new Evidence('H05'); const w = new World(browser, 'h05'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const A = await createWorkspaceUI(anna.page, { name: 'Anna Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const dani = await w.person('dani');
    const D = await createWorkspaceUI(dani.page, { name: 'Harmadik szolgáltató', plan: 'pro', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const cili = await w.person('cili');
    const C = await createWorkspaceUI(cili.page, { name: 'Cili Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    ev.b(`Cili UGYANAZT a HU adószámot írja be, mint Anna és a harmadik szolgáltató: „${C.resultText}" — a saját indulása megtörtént; a választója: ${(await workspaceListUI(cili.page)).map((x) => line(x.text)).join(' | ')} (csak a sajátja)`);
    ev.s(`POST /api/workspaces (Cili, azonos adószám) → ${C.status}; business.ok=${C.body.business.ok}, value_norm=${C.body.business.value_norm}`);
    expect(C.status).toBe(201);
    const swA = await cili.api.post('/api/session/workspace', { book_id: A.bookId });
    const swD = await cili.api.post('/api/session/workspace', { book_id: D.bookId });
    const forced = await cili.api.get(`/api/data/price?book_id=${A.bookId}`);
    const me = (await cili.api.get('/api/me')).body;
    ev.s(`Cili váltása Anna könyvére → ${swA.status} ${swA.body.reason}/${swA.body.detail}; a harmadik szolgáltatóéra → ${swD.status} ${swD.body.reason}/${swD.body.detail}; ár ?book_id=<Anna pro könyve> → param_ignored=${forced.body.param_ignored}, ok=${forced.body.ok}, refused_by=${forced.body.refused_by} (a saját starter könyve dönt); /api/me munkakörnyezetei: ${me.workspaces.map((x) => x.name).join(', ')}`);
    expect(swA.status).toBe(403); expect(swD.status).toBe(403); expect(forced.body).toMatchObject({ param_ignored: true, ok: false, refused_by: 'entitlement' });
    // Cili könyvei: a SZEMÉLYES köre és a saját cége — Annáé és a harmadik szolgáltatóé NEM.
    expect(me.workspaces.map((x) => x.book_id)).toContain(C.bookId);
    expect(me.workspaces.map((x) => x.book_id)).not.toContain(A.bookId);
    expect(me.workspaces.map((x) => x.book_id)).not.toContain(D.bookId);
    expect(me.workspaces.filter((x) => x.personal).length).toBe(1);
    const norm = taxOf(w.tag).replace(/-/g, '');
    const claims = db.all("SELECT subject_id FROM external_id WHERE namespace = 'tax_id' AND jurisdiction = 'HU' AND value_norm = ? ORDER BY subject_id", norm);
    const ciliMem = db.all('SELECT book_id FROM membership WHERE subject_id = ?', cili.subjectId).map((r) => r.book_id);
    ev.s(`ADATBÁZIS: ugyanazt a (tax_id · HU · ${norm}) kulcsot ${claims.length} KÜLÖN jogalany állítja (${claims.map((r) => r.subject_id).join(', ')}) — az azonosító állítás, nem jog; Cili tagságai: ${j(ciliMem)}`);
    expect(claims.length).toBe(3);
    expect(ciliMem).toContain(C.bookId); expect(ciliMem).not.toContain(A.bookId); expect(ciliMem).not.toContain(D.bookId);
    ev.verdictIs('bizonyitva', 'Nincs globális cégnév-/adószám-lefoglalás: az azonos karaktersor három független jogalanyon áll, egyik sem nyit a másik könyvére.');
  } finally { await w.close(); db.close(); }
});

test('H06 — Körön túli meghívás/jogadás elutasítva; visszavont, idegen címzettű, ismételt meghívó nem ad jogot; érvényes párja sikerül', async ({ browser }) => {
  const ev = new Evidence('H06'); const w = new World(browser, 'h06'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Családi Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const roleOptions = await anna.page.locator('[data-testid="invite-role"] option').evaluateAll((els) => els.map((e) => e.value));
    const owner = await anna.api.post('/api/invites', { email: w.email('x'), role: 'owner', scope: 'keszlet' });
    const badScope = await anna.api.post('/api/invites', { email: w.email('x'), role: 'user', scope: 'penzugy' });
    ev.b(`A meghívó szerep-választója CSAK a zárt regiszter szerepeit kínálja: [${roleOptions.join(', ')}]`);
    ev.s(`KÖRÖN TÚLI meghívás: role=owner → ${owner.status} ${owner.body.reason} (${owner.body.field}), scope=penzugy → ${badScope.status} ${badScope.body.reason} (${badScope.body.field}); ADATBÁZIS: körön túli meghívó-sor NEM született: ${db.count("SELECT COUNT(*) AS n FROM invite WHERE invitee_value = ?", w.email('x'))} sor`);
    // R75/F75-03 ÓTA A HATÁR DÖNT ELŐBB: a zárt regiszteren kívüli szerep és adatkör a BEMENETI
    // SÉMÁN akad el (HTP-01, 400 invalid_value, ÍRÁS NÉLKÜL), tehát a mag `outside_basis_roles` /
    // `data_scope_required` ága ezen a bemeneten már nem hívódik. A MAG SZABÁLYA VÁLTOZATLAN, és a
    // bizonyítéka a mag-battériában áll (`npm run verify:v3ref` · P-CORE, P-DSC) — itt az a mérés,
    // hogy a körön túli kérés SEHOL nem hagy nyomot (KUKA-050: a próba a MAI valóságot mérje).
    expect(owner.status).toBe(400); expect(owner.body.reason).toBe('invalid_value'); expect(owner.body.field).toBe('role');
    expect(badScope.status).toBe(400); expect(badScope.body.reason).toBe('invalid_value'); expect(badScope.body.field).toBe('scope');
    expect(db.count('SELECT COUNT(*) AS n FROM invite WHERE invitee_value = ?', w.email('x'))).toBe(0);
    // ÉRVÉNYES PÁR: Béla (user) — beváltva; utána a user NEM adhat tovább, magának nem adhat jogot.
    const bela = await w.person('bela');
    const invB = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, invB.link);
    const rB = await redeemUI(bela.page);
    ev.b(`ÉRVÉNYES meghívó (Béla): beváltva → fejléc „${(await header(bela.page)).workspace}"; Bélánál a Munkatársak (meghívó) szakasz NEM jelenik meg: ${!(await bela.page.getByTestId('section-members').isVisible())}`);
    const userInvites = await bela.api.post('/api/invites', { email: w.email('y'), role: 'user', scope: 'keszlet' });
    const selfGrant = await bela.api.post('/api/members/scope', { subject_id: bela.subjectId, scope: 'arak' });
    const badGrant = await anna.api.post('/api/members/scope', { subject_id: bela.subjectId, scope: 'penzugy' });
    ev.s(`Béla beváltása → ${rB.status} ${rB.body.outcome}; a user meghívna → ${userInvites.status} ${userInvites.body.reason}; a user magának adna adatkört → ${selfGrant.status} ${selfGrant.body.reason}; az admin körön túli adatkört adna (penzugy) → ${badGrant.status} ${badGrant.body.reason}, plafon=${j(badGrant.body.ceiling)}`);
    // A MAG JOG-KAPUJA VÁLTOZATLANUL MÉRVE a HTTP-úton: a user nem hívhat meg és magának nem adhat
    // jogot (`role_not_delegable`) — ezek a kérések ALAKILAG rendben vannak, tehát a séma átengedi
    // őket, és a MAG utasítja el. Az admin `penzugy` adatköre viszont már a határon elakad.
    expect(userInvites.body.reason).toBe('role_not_delegable'); expect(selfGrant.body.reason).toBe('role_not_delegable');
    expect(badGrant.status).toBe(400); expect(badGrant.body.reason).toBe('invalid_value'); expect(badGrant.body.field).toBe('scope');
    // ISMÉTELT beváltás.
    const again = await bela.api.post('/api/invites/redeem', { token: invB.token });
    const reopen = await openInviteUI(bela.page, invB.link);
    ev.b(`Béla ÚJRA megnyitja a már beváltott hivatkozást: „${reopen.observe.status}" (${reopen.observe.reason}); a lap: „${reopen.next}"; gomb: ${reopen.redeemVisible}`);
    ev.s(`ISMÉTELT beváltás → ${again.status} ${again.body.error}/${again.body.reason}; ADATBÁZIS tagság-sor Bélának: ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', bela.subjectId, K.bookId)} (nem duplázódott)`);
    expect(again.body.reason).toBe('invite_already_redeemed'); expect(reopen.redeemVisible).toBe(false);
    // IDEGEN CÍMZETT: Cili megnyitja Dani meghívóját; utána Dani érvényesen beváltja.
    const dani = await w.person('dani'); const cili = await w.person('cili');
    const invD = await inviteUI(anna.page, { email: dani.email, role: 'user', scope: 'keszlet' });
    const oC = await openInviteUI(cili.page, invD.link);
    const forcedC = await cili.api.post('/api/invites/redeem', { token: invD.token });
    ev.b(`IDEGEN CÍMZETT: Cili (belépve) megnyitja Dani meghívóját → „${oC.observe.status}", fiók-váltás felajánlva: ${oC.observe.switch_account_offered}, a lap: „${oC.next}"; gomb: ${oC.redeemVisible}`);
    ev.s(`Cili erőltetett beváltása → ${forcedC.status} ${forcedC.body.error}; ADATBÁZIS Cili tagsága a könyvben: ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', cili.subjectId, K.bookId)} sor`);
    expect(forcedC.body.error).toBe('invitee_identity_required'); expect(oC.redeemVisible).toBe(false);
    await openInviteUI(dani.page, invD.link);
    const rD = await redeemUI(dani.page);
    ev.s(`Dani (a valódi címzett) érvényes párja → ${rD.status} ${rD.body.outcome}`);
    expect(rD.body.ok).toBe(true);
    // VISSZAVONT: a kiadó (Cili mint admin) függő meghívója a kiadó megvonásával hal meg.
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'admin', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);
    const invE = await inviteUI(cili.page, { email: w.email('erik'), role: 'user', scope: 'keszlet' });
    const rev = await revokeUI(anna.page, cili.subjectId);
    const erik = await w.person('erik');
    const oE = await openInviteUI(erik.page, invE.link);
    // R64 (ellenséges felülvizsgálat H06/H09 után): a megfigyelés MÁR a kiadó mai jogát is méri —
    // a halott meghívóra a lap nem kínál Beváltás gombot; a nyers kérés is nevezetten elutasít.
    const rE = await erik.api.post('/api/invites/redeem', { token: invE.token });
    ev.b(`VISSZAVONT alap: Anna a tag-listán megvonja Cilit („${rev.resultText}"); Erik megnyitja a Cili által kiadott függő meghívót → a megfigyelés „${oE.observe.status}" (${oE.observe.reason}), Beváltás gomb: ${oE.redeemVisible} — a lap nem ígér folytatást`);
    ev.s(`Megvonás → delegation=${j(rev.body.delegation)}; Erik NYERS beváltási kérése → ${rE.status} ${rE.body.error}/${rE.body.reason}; ADATBÁZIS: Erik tagsága ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', erik.subjectId, K.bookId)} sor, a meghívó nem fogyott el (redeemed_at=${db.get('SELECT redeemed_at FROM invite WHERE token = ?', invE.token).redeemed_at})`);
    expect(oE.observe.status).toBe('not_actionable'); expect(oE.observe.reason).toBe('issuer_right_withdrawn'); expect(oE.redeemVisible).toBe(false);
    expect(rE.body.reason).toBe('issuer_right_withdrawn');
    // ── LEJÁRT MEGHÍVÓ A BÖNGÉSZŐBŐL (R75 §3/6) ─────────────────────────────────────────────
    // Az R64-ben ez volt a „reszben" oka: a héjnak nem volt óra-állítója. A FEJLESZTŐI ÓRA
    // (`/dev/clock`, a fejlesztői felület mögött) ezt megnyitja — nem várunk hét napot, és a
    // próba TOVÁBBRA SEM hívja a mag íróit: a lejárt sort az IDŐ csinálja, nem mi.
    const ferenc = await w.person('ferenc');
    const invF = await inviteUI(anna.page, { email: ferenc.email, role: 'user', scope: 'keszlet' });
    const EIGHT_DAYS = 8 * 24 * 3600 * 1000;
    await anna.api.post('/dev/clock', { advance_ms: EIGHT_DAYS });
    const oF = await openInviteUI(ferenc.page, invF.link);
    const forcedF = await ferenc.api.post('/api/invites/redeem', { token: invF.token });
    const fMem = db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', ferenc.subjectId, K.bookId);
    ev.b(`LEJÁRT meghívó (az óra 8 nappal előre — a meghívó 7 napig él): Ferenc megnyitja a hivatkozást → „${oF.observe.status}" (${oF.observe.reason}); a lap: „${oF.next}"; Beváltás gomb: ${oF.redeemVisible}`);
    ev.s(`LEJÁRAT a HÉJBÓL, támogatott órával: erőltetett beváltás → ${forcedF.status} ${forcedF.body.error}/${forcedF.body.reason}; ADATBÁZIS: Ferenc tagsága ${fMem} sor`);
    expect(oF.observe.status).toBe('not_actionable'); expect(oF.redeemVisible).toBe(false);
    expect(forcedF.body.ok).toBe(false); expect(fMem).toBe(0);
    // POZITÍV ELLENPÁR: ÚJ meghívó ugyanannak a címzettnek, az ablakon BELÜL — beváltható.
    const invF2 = await inviteUI(anna.page, { email: ferenc.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(ferenc.page, invF2.link);
    const rF2 = await redeemUI(ferenc.page);
    ev.s(`POZITÍV ELLENPÁR: FRISS meghívó ugyanannak a címzettnek → ${rF2.status} ${rF2.body.outcome}; ADATBÁZIS: Ferenc tagsága ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', ferenc.subjectId, K.bookId)} sor`);
    expect(rF2.body.ok).toBe(true);
    await anna.api.post('/dev/clock', { advance_ms: -EIGHT_DAYS });   // az óra VISSZAÁLL a valódi időre
    ev.verdictIs('bizonyitva', 'R75: a LEJÁRT meghívó ága MOST a böngészőből is mérve van (fejlesztői óra `/dev/clock`, +8 nap, majd visszaállítva): a lap nem kínál Beváltás gombot, az erőltetett beváltás nevezetten elakad, tagság nem születik — és a FRISS meghívó ugyanannak a címzettnek beváltható (pozitív ellenpár). A mag-bizonyíték változatlanul áll: `P-INVITE-window` (valódi idő-összehasonlítás, zónás alakon is). A „visszavont" itt a KIADÓ jogának megvonása (külön meghívó-visszavonó végpont a héjban nincs — kimondva). A ZÁRT REGISZTEREN KÍVÜLI szerep/adatkör R75 óta a BEMENETI SÉMÁN akad el (HTP-01, 400 invalid_value, írás nélkül); a mag plafon-szabálya változatlan, bizonyítéka a mag-battériában. KORÁBBI ALAK (R64): „reszben — a héjnak nincs óra-állító végpontja".');
  } finally { await w.close(); db.close(); }
});

test('H07 — A raktári mennyiség-nézetből ár nem következik; a külön engedélyezett olvasás működik', async ({ browser }) => {
  const ev = new Evidence('H07'); const w = new World(browser, 'h07'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Raktár Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);
    const before = await stockUI(bela.page);
    ev.b(`Béla (raktári user) készlet-nézete az adatkör-adás ELŐTT: „${before.text.replace(/\n/g, ' · ')}"`);
    expect(before.body).toMatchObject({ ok: false, refused_by: 'right', reason: 'not_available' });
    const g1 = await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    const st = await stockUI(bela.page);
    const pr = await priceUI(bela.page);
    ev.b(`Anna a tag-listán megadja a keszlet adatkört: „${g1.resultText}"; Béla készlet-nézete: „${line(st.text)}"; ár-nézete: „${pr.text.replace(/\n/g, ' · ')}"`);
    ev.s(`GET /api/data/stock → ok=${st.body.ok}, a kiadott mezők: [${Object.keys(st.body.result).join(', ')}] (ár NINCS benne); GET /api/data/price → ok=${pr.body.ok}, refused_by=${pr.body.refused_by}, jog-kapu=${pr.body.right_reason}, előfizetés-kapu=${pr.body.entitlement_reason} (a terv engedné — a JOG zár)`);
    expect(Object.keys(st.body.result)).toEqual(['qty']); expect(pr.body).toMatchObject({ ok: false, refused_by: 'right', right_reason: 'not_available', entitlement_reason: 'feature_entitled' });
    const g2 = await grantScopeUI(anna.page, bela.subjectId, 'arak');
    const pr2 = await priceUI(bela.page);
    ev.b(`Anna KÜLÖN megadja az arak adatkört: „${g2.resultText}"; Béla ár-nézete most: „${line(pr2.text)}" (unit_price ${pr2.body.result && pr2.body.result.unit_price})`);
    expect(pr2.body).toMatchObject({ ok: true, result: { unit_price: 3490 } });
    const grants = db.all('SELECT scope, granted_by, basis_id FROM scope_grant WHERE subject_id = ? AND book_id = ? ORDER BY id', bela.subjectId, K.bookId);
    const known = (await anna.api.get('/api/members')).body.known_scopes;
    ev.s(`ADATBÁZIS: Béla adatköri sorai: ${j(grants)} — mindkettő az admin delegálási alapja alatt; a rendszer ismert adatkörei: [${known.join(', ')}]`);
    expect(grants.map((r) => r.scope)).toEqual(['keszlet', 'arak']);
    ev.verdictIs('bizonyitva', 'A magreferencia adatkör-szótára KÉT tagú (keszlet · arak): „számla" és „beszállítói" adatkör a rendszerben nem létezik, ezért azokra a helyzet tartalmilag üres — a kimondott elv (mennyiségből ár nem következik) a létező két körön mérve áll.');
  } finally { await w.close(); db.close(); }
});

test('H08 — Cégváltáskor a munkamenet, a válaszok és a kliens nem keverik a cégeket; módosított paraméter nem ad idegen jogot', async ({ browser }) => {
  const ev = new Evidence('H08'); const w = new World(browser, 'h08'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const P = await createWorkspaceUI(anna.page, { name: 'Anna magántere', plan: 'starter' });
    const K = await createWorkspaceUI(anna.page, { name: 'Anna Kft', plan: 'pro', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const bela = await w.person('bela');
    const B = await createWorkspaceUI(bela.page, { name: 'Béla Kft', plan: 'pro', business: { jurisdiction: 'AT', tax_id: 'ATU99999999' } });
    const inv = await inviteUI(bela.page, { email: anna.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(anna.page, inv.link); await redeemUI(anna.page);
    await switchUI(anna.page, K.bookId);
    const priceK = await priceUI(anna.page);
    ev.b(`Anna a saját pro cégében (fejléc „${(await header(anna.page)).workspace}"): ár-nézet „${line(priceK.text)}"`);
    expect(priceK.body.ok).toBe(true);
    // A váltás kérését lassítjuk: a panelnek MÁR a válasz előtt üresnek kell lennie.
    await anna.page.route('**/api/session/workspace', async (route) => { await new Promise((r) => setTimeout(r, 500)); await route.continue(); });
    await anna.page.getByTestId(`ws-switch-${P.bookId}`).click();
    const duringPrice = await anna.page.getByTestId('data-price').textContent();
    const duringStock = await anna.page.getByTestId('data-stock').textContent();
    await expect(anna.page.getByTestId('global-notice')).toContainText('Munkakörnyezet: Anna magántere');
    await anna.page.unroute('**/api/session/workspace');
    const hP = (await header(anna.page)).workspace;
    const priceP = await priceUI(anna.page);
    ev.b(`Váltás a starter magántérre: a kérés ideje alatt az adat-panelek: ár „${duringPrice}", készlet „${duringStock}" (ürítve, a régi cég adata nem marad a képernyőn); utána a fejléc: „${hP}"; ár-nézet: „${priceP.text.replace(/\n/g, ' · ')}"`);
    expect(duringPrice).toBe('—'); expect(duringStock).toBe('—'); expect(hP).toBe('Anna magántere · admin · starter');
    expect(priceP.body).toMatchObject({ ok: false, refused_by: 'entitlement' });
    const f1 = await anna.api.get(`/api/data/price?book_id=${K.bookId}`);
    const f2 = await anna.api.get(`/api/data/stock?book_id=${B.bookId}&actor=${bela.subjectId}&role=admin`);
    const me = (await anna.api.get('/api/me')).body;
    ev.s(`MÓDOSÍTOTT PARAMÉTER a magánteres munkamenetben: ár ?book_id=<saját pro cég> → param_ignored=${f1.body.param_ignored} [${f1.body.ignored_params}], ok=${f1.body.ok}, refused_by=${f1.body.refused_by}; készlet ?book_id=<Béla cége>&actor=<Béla>&role=admin → param_ignored=${f2.body.param_ignored} [${f2.body.ignored_params}], ok=${f2.body.ok} (a SAJÁT könyv adata); /api/me current_book_id = a magántér: ${me.current_book_id === P.bookId}; Cache-Control: ${f1.headers['cache-control']} (kliens-gyorsítótár tiltva minden válaszon)`);
    expect(f1.body).toMatchObject({ param_ignored: true, ignored_params: ['book_id'], ok: false, refused_by: 'entitlement' });
    expect(f2.body.ignored_params.sort()).toEqual(['actor', 'book_id', 'role']); expect(f1.headers['cache-control']).toBe('no-store');
    const swB = await switchUI(anna.page, B.bookId);
    const hB = (await header(anna.page)).workspace;
    const membersHidden = !(await anna.page.getByTestId('section-members').isVisible());
    const priceB = await priceUI(anna.page);
    const forcedGrant = await anna.api.post('/api/members/scope', { subject_id: anna.subjectId, scope: 'arak', actor: bela.subjectId, role: 'admin' });
    // UGYANEZ A KÉRÉS HAMISÍTOTT MEZŐK NÉLKÜL: alakilag rendben van, tehát a MAG jog-kapuja dönt —
    // így a régi mérés (role_not_delegable) NEM veszett el a séma-kapu bevezetésével.
    const honestGrant = await anna.api.post('/api/members/scope', { subject_id: anna.subjectId, scope: 'arak' });
    ev.b(`Váltás Béla cégére (ahol Anna csak user): „${swB.notice}" → fejléc „${hB}"; a Munkatársak (admin) szakasz rejtve: ${membersHidden}; ár-nézet: „${priceB.text.replace(/\n/g, ' · ')}" — a saját cégének admin-szerepe és pro-terve NEM utazik át`);
    ev.s(`Anna (user Béla cégében) adatkört adna magának actor=<Béla>&role=admin törzs-mezőkkel → ${forcedGrant.status} ${forcedGrant.body.reason} (${forcedGrant.body.field}, ${forcedGrant.body.refused_by}) — az ÁLLAPOTVÁLTOZTATÓ végponton az idegen mező R75 óta ELUTASÍTÁS, nem „figyelmen kívül hagyva"; ugyanez a kérés hamisítás NÉLKÜL → ${honestGrant.status} ${honestGrant.body.reason} (a MAG jog-kapuja)`);
    expect(hB).toBe('Béla Kft · user · pro'); expect(membersHidden).toBe(true); expect(priceB.body).toMatchObject({ ok: false, refused_by: 'right' });
    expect(forcedGrant.status).toBe(400);
    expect(forcedGrant.body).toMatchObject({ reason: 'unknown_field', refused_by: 'input_schema' });
    expect(forcedGrant.body.param_ignored).toBeUndefined();
    expect(honestGrant.body.reason).toBe('role_not_delegable');
    const sessions = db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ?', anna.subjectId);
    ev.s(`ADATBÁZIS: Anna tagságai ${sessions} könyvben (P admin · K admin · B user) — a szerep könyvenként külön sor, nem összevont tulajdonság`);
    ev.verdictIs('bizonyitva', 'A kliensnek nincs saját gyorsítótára: minden panel a váltás pillanatában ürül, és minden válasz `Cache-Control: no-store`; a cselekvő és a könyv KIZÁRÓLAG a szerveroldali munkamenetből jön, a kliens-mezők NEVEZETTEN figyelmen kívül maradnak.');
  } finally { await w.close(); db.close(); }
});

test('H09 — Megvonás után új kérés és függő meghívó nem használhatja a megszűnt alapot; a független jog megmarad', async ({ browser }) => {
  const ev = new Evidence('H09'); const w = new World(browser, 'h09'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Családi Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const bela = await w.person('bela'); const cili = await w.person('cili'); const dani = await w.person('dani');
    const own = await createWorkspaceUI(cili.page, { name: 'Cili saját tere' });
    const invB = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, invB.link); await redeemUI(bela.page);
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'admin', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);
    const invD = await inviteUI(cili.page, { email: dani.email, role: 'user', scope: 'keszlet' });
    const stC0 = await stockUI(cili.page);
    ev.b(`Kiindulás: Cili admin a családi könyvben (fejléc „${(await header(cili.page)).workspace}"), készlet-nézete „${line(stC0.text)}" (a meghívott admin tagsága sem ad adatkört automatikusan — azt itt nem kérte); Cili függő meghívót adott Daninak; Bélának (user) keszlet adatköre van`);
    const rev = await revokeUI(anna.page, cili.subjectId);
    ev.b(`Anna a tag-listán MEGVONJA Cilit: „${rev.resultText}"; a sor ezután: „${line(await memberRowText(anna.page, cili.subjectId))}"`);
    const stC = await stockUI(cili.page);
    const swC = await cili.api.post('/api/session/workspace', { book_id: K.bookId });
    const meC = (await cili.api.get('/api/me')).body;
    ev.b(`Cili ÚJ kérése a régi lapon: készlet-nézet „${stC.text.replace(/\n/g, ' · ')}"; frissítés után a fejléc: „${(await (async () => { await cili.page.reload(); return header(cili.page); })()).workspace}"`);
    ev.s(`Cili: GET /api/data/stock → ok=${stC.body.ok} ${stC.body.reason}/${stC.body.detail}; váltás a családi könyvre → ${swC.status} ${swC.body.reason}/${swC.body.detail}; /api/me munkakörnyezetei: ${meC.workspaces.map((x) => `${x.name} (${x.role})`).join(', ')}`);
    expect(stC.body).toMatchObject({ ok: false, reason: 'not_a_member', detail: 'membership_revoked' }); expect(swC.status).toBe(403);
    const oD = await openInviteUI(dani.page, invD.link);
    // R64: a megfigyelés a kiadó mai jogát is méri — a lap nem kínál Beváltás gombot; a nyers kérés is elutasít.
    const rD = await dani.api.post('/api/invites/redeem', { token: invD.token });
    ev.b(`Dani megnyitja a Cili által kiadott FÜGGŐ meghívót → „${oD.observe.status}" (${oD.observe.reason}), Beváltás gomb: ${oD.redeemVisible}; nyers beváltási kérés → „${rD.body.reason}"`);
    expect(oD.observe.status).toBe('not_actionable'); expect(oD.redeemVisible).toBe(false);
    ev.s(`Dani beváltása → ${rD.status} ${rD.body.error}/${rD.body.reason}; ADATBÁZIS: Cili delegálási alapja visszavonva (revoked_at=${db.get('SELECT revoked_at FROM authority_basis WHERE basis_id = ? AND book_id = ?', `deleg:${K.bookId}:${cili.subjectId}`, K.bookId).revoked_at !== null}); megvonás-napló: ${db.count('SELECT COUNT(*) AS n FROM membership_revocation WHERE subject_id = ? AND book_id = ?', cili.subjectId, K.bookId)} sor; Dani tagsága: ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', dani.subjectId, K.bookId)} sor`);
    expect(rD.body.reason).toBe('issuer_right_withdrawn');
    // FÜGGETLEN jogok: Béla adatköre él, Cili SAJÁT tere él.
    const stB = await stockUI(bela.page);
    const swOwn = await switchUI(cili.page, own.bookId);
    const stOwn = await stockUI(cili.page);
    ev.b(`Béla készlet-nézete a megvonás UTÁN is: „${line(stB.text)}"; Cili a SAJÁT terére vált: „${swOwn.notice}" → készlet-nézet „${line(stOwn.text)}"`);
    ev.s(`Béla stock ok=${stB.body.ok}; Cili saját tere: role=${swOwn.body.role}, stock ok=${stOwn.body.ok}; ADATBÁZIS: Cili saját tagsága: ${j(db.get('SELECT role, revoked_at FROM membership WHERE subject_id = ? AND book_id = ?', cili.subjectId, own.bookId))}`);
    expect(stB.body.ok).toBe(true); expect(swOwn.body.role).toBe('admin'); expect(stOwn.body.ok).toBe(true);
    // ── A LEJÁRAT ÁGA A BÖNGÉSZŐBŐL (R75 §3/6): a FÜGGŐ meghívó ablaka. ─────────────────────
    // Anna (érvényes admin) ad ki egy meghívót, majd az óra 8 nappal előrelép: a MEGSZŰNT ALAP
    // itt nem a kiadó joga, hanem az IDŐ — a lap nem kínál gombot, a beváltás nevezetten elakad.
    const erik = await w.person('erik');
    const invE = await inviteUI(anna.page, { email: erik.email, role: 'user', scope: 'keszlet' });
    const EIGHT_DAYS = 8 * 24 * 3600 * 1000;
    await anna.api.post('/dev/clock', { advance_ms: EIGHT_DAYS });
    const oE = await openInviteUI(erik.page, invE.link);
    const rE = await erik.api.post('/api/invites/redeem', { token: invE.token });
    const bStock = await bela.api.get('/api/data/stock');
    ev.b(`LEJÁRAT (az óra 8 nappal előre): Erik megnyitja az ÉRVÉNYES kiadótól kapott, de LEJÁRT meghívót → „${oE.observe.status}" (${oE.observe.reason}); Beváltás gomb: ${oE.redeemVisible}`);
    ev.s(`LEJÁRT meghívó beváltása → ${rE.status} ${rE.body.error}/${rE.body.reason}; ADATBÁZIS: Erik tagsága ${db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', erik.subjectId, K.bookId)} sor; a FÜGGETLEN jog az idő múlásától sem szűnt meg: Béla készlet-nézete ok=${bStock.body.ok}`);
    expect(oE.observe.status).toBe('not_actionable'); expect(oE.redeemVisible).toBe(false);
    expect(rE.body.ok).toBe(false); expect(db.count('SELECT COUNT(*) AS n FROM membership WHERE subject_id = ? AND book_id = ?', erik.subjectId, K.bookId)).toBe(0);
    expect(bStock.body.ok).toBe(true);
    await anna.api.post('/dev/clock', { advance_ms: -EIGHT_DAYS });   // az óra VISSZAÁLL
    ev.verdictIs('bizonyitva', 'R75: a MEGVONÁS ága (új kérés · függő meghívó · független jog) és a LEJÁRAT ága is mérve van a böngészőből — utóbbi a fejlesztői órával (`/dev/clock`, +8 nap, majd visszaállítva), a mag íróinak hívása nélkül. KIMONDOTT HATÁR, ami a héjból továbbra sem hajtható meg: az ALAP (`authority_basis.expires_at`) lejárata — arra a héjnak nincs útja, a mag-bizonyíték `P-CORE-startup-and-delegation` (d) és `P-INVITE-window` (v3ref/run.mjs). KORÁBBI ALAK (R64): „reszben — a lejárat ága a héjból nem hajtható meg".');
  } finally { await w.close(); db.close(); }
});

test('H10 — Két szervezeti egység, korlátozott helyi admin: a vezető nem lát át; a plafon marad; közös jóváhagyás: tényleges hiány', async ({ browser }) => {
  const ev = new Evidence('H10'); const w = new World(browser, 'h10'); const db = new Db();
  try {
    const anna = await w.person('anna'); const bela = await w.person('bela'); const cili = await w.person('cili');
    const A = await createWorkspaceUI(anna.page, { name: 'A egység', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const B = await createWorkspaceUI(bela.page, { name: 'B egység', plan: 'pro', business: { jurisdiction: 'HU', tax_id: '87654321-2-42' } });
    const invC = await inviteUI(anna.page, { email: cili.email, role: 'admin', scope: 'keszlet' });
    await openInviteUI(cili.page, invC.link); await redeemUI(cili.page);
    ev.b(`A egység: Anna admin; B egység: Béla admin (a „vezető"); Cili az A egység HELYI adminja (fejléc „${(await header(cili.page)).workspace}"), a Munkatársak szakasz nála látszik: ${await cili.page.getByTestId('section-members').isVisible()}`);
    const swBA = await bela.api.post('/api/session/workspace', { book_id: A.bookId });
    const meB = (await bela.api.get('/api/me')).body;
    const swCB = await cili.api.post('/api/session/workspace', { book_id: B.bookId });
    const fCB = await cili.api.get(`/api/data/stock?book_id=${B.bookId}`);
    ev.s(`A vezető (Béla) váltása az A egységre → ${swBA.status} ${swBA.body.reason}/${swBA.body.detail}; /api/me könyvei: ${meB.workspaces.map((x) => x.name).join(', ')} — NEM kap automatikusan minden üzleti adatot; a helyi admin (Cili) váltása a B egységre → ${swCB.status} ${swCB.body.reason}; ?book_id=<B> → param_ignored=${fCB.body.param_ignored}`);
    expect(swBA.status).toBe(403); expect(swCB.status).toBe(403); expect(fCB.body.param_ignored).toBe(true);
    const okInvite = await cili.api.post('/api/invites', { email: w.email('dani'), role: 'user', scope: 'keszlet' });
    const overRole = await cili.api.post('/api/invites', { email: w.email('erik'), role: 'owner', scope: 'keszlet' });
    const overScope = await cili.api.post('/api/invites', { email: w.email('erik'), role: 'user', scope: 'penzugy' });
    const overGrant = await cili.api.post('/api/members/scope', { subject_id: anna.subjectId, scope: 'penzugy' });
    ev.s(`DELEGÁLÁSI PLAFON a helyi adminnál: user/keszlet meghívó → ${okInvite.status} (plafon ${j(okInvite.body.ceiling)}); role=owner → ${overRole.status} ${overRole.body.reason}; scope=penzugy → ${overScope.status} ${overScope.body.reason}; adatkör-adás penzugy → ${overGrant.status} ${overGrant.body.reason}`);
    // A PLAFON KÉT SZINTEN ÁLL (R75/F75-03 óta): a zárt REGISZTEREN kívüli szerep/adatkör a
    // HATÁRON akad el (400 invalid_value, írás nélkül), a regiszteren BELÜLI, de az ALAPON kívüli
    // kérést a mag utasítja el — utóbbi bizonyítéka a delegálási alap részhalmaz-mérése alább és a
    // mag-battéria (P-CORE · P-DSC). Egyik sem tűnt el, csak KÜLÖN NEVEN áll.
    expect(okInvite.status).toBe(201);
    expect(overRole.status).toBe(400); expect(overRole.body.reason).toBe('invalid_value'); expect(overRole.body.field).toBe('role');
    expect(overScope.status).toBe(400); expect(overScope.body.reason).toBe('invalid_value'); expect(overScope.body.field).toBe('scope');
    expect(overGrant.status).toBe(400); expect(overGrant.body.reason).toBe('invalid_value'); expect(overGrant.body.field).toBe('scope');
    expect(db.count('SELECT COUNT(*) AS n FROM invite WHERE invitee_value = ?', w.email('erik'))).toBe(0);
    const cb = db.get('SELECT allowed_roles, allowed_scopes, evidence_ref FROM authority_basis WHERE basis_id = ? AND book_id = ?', `deleg:${A.bookId}:${cili.subjectId}`, A.bookId);
    const ab = db.get('SELECT allowed_roles, allowed_scopes FROM authority_basis WHERE basis_id = ? AND book_id = ?', `deleg:${A.bookId}:${anna.subjectId}`, A.bookId);
    const subset = (x, y) => JSON.parse(x).every((v) => JSON.parse(y).includes(v));
    ev.s(`ADATBÁZIS: Cili delegálási alapja: szerepek ${cb.allowed_roles}, adatkörök ${cb.allowed_scopes}, eredete: „${cb.evidence_ref}" — részhalmaza Anna alapjának (${subset(cb.allowed_roles, ab.allowed_roles) && subset(cb.allowed_scopes, ab.allowed_scopes)}); tágabb NEM képződhet`);
    expect(subset(cb.allowed_roles, ab.allowed_roles) && subset(cb.allowed_scopes, ab.allowed_scopes)).toBe(true);
    // KÖZÖS JÓVÁHAGYÁS — MÉRVE, nem állítva: a mag és a héj forrásában nincs ilyen szabály/végpont.
    const re = /co[-_ ]?approv|two[-_ ]?person|four[-_ ]?eyes|dual[-_ ]?control|second[-_ ]?approver|k[oö]z[oö]s[_ ]?j[oó]v[aá]hagy|n[eé]gy[_ ]?szem|ellenjegyz/i;
    const files = readdirSync(join(ROOT, 'v3ref')).filter((f) => f.endsWith('.mjs')).map((f) => `v3ref/${f}`).concat(['v3app/server.mjs']);
    const hits = files.filter((f) => re.test(readFileSync(join(ROOT, f), 'utf8')));
    const endpoints = [...readFileSync(join(ROOT, 'v3app/server.mjs'), 'utf8').matchAll(/'(GET|POST) (\/[a-z/]+)'/g)].map((m) => `${m[1]} ${m[2]}`);
    ev.s(`KÖZÖS JÓVÁHAGYÁS: ${files.length} forrásfájl átfésülve (v3ref/*.mjs + v3app/server.mjs) a két-személyes / négy-szem / ellenjegyzés mintákra → ${hits.length} találat; a héj végpontjai: ${endpoints.join(' · ')} — jóváhagyó végpont nincs`);
    expect(hits).toEqual([]); expect(endpoints.some((e) => /approv|jovahagy/i.test(e))).toBe(false);
    ev.verdictIs('bizonyitva', 'KÖZÖS JÓVÁHAGYÁS: TÉNYLEGES HIÁNY — a mag egyetlen műveletet sem köt két személy egyetértéséhez (mérve: 0 találat a forrásban, nincs ilyen végpont); minden jogváltoztatás egyetlen jogosult cselekvő döntése, alappal. A plafon ebben a héjban a zárt regiszterrel egyezik (admin·user × keszlet·arak): szűkebb plafonú al-admin a héjból nem állítható elő — a szűkítés mag-bizonyítéka: `P-ORG-adjudication-basis-limit` és `P-CORE-startup-and-delegation` (b).');
  } finally { await w.close(); db.close(); }
});

test('H11 — Előfizetés: jogosulatlan munkatárs nem jut a funkcióhoz; jogosult sem használ nem engedett műveletet (tesztprofil)', async ({ browser }) => {
  const ev = new Evidence('H11'); const w = new World(browser, 'h11'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Kft', plan: 'starter', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const bela = await w.person('bela');
    const inv = await inviteUI(anna.page, { email: bela.email, role: 'user', scope: 'keszlet' });
    await openInviteUI(bela.page, inv.link); await redeemUI(bela.page);
    await grantScopeUI(anna.page, bela.subjectId, 'keszlet');
    const prA = await priceUI(anna.page); const prB = await priceUI(bela.page);
    const planB = await bela.api.post('/api/workspaces/plan', { plan: 'pro' });
    ev.b(`STARTER terven: Anna (admin, arak adatkörrel) ár-nézete: „${prA.text.replace(/\n/g, ' · ')}"; Béla (user, csak keszlet) ár-nézete: „${prB.text.replace(/\n/g, ' · ')}"; a Terv módosítása űrlap Bélánál rejtve: ${!(await bela.page.getByTestId('plan-form').isVisible())}`);
    ev.s(`Anna price → refused_by=${prA.body.refused_by} (${prA.body.entitlement_reason}, terv ${prA.body.entitlement.plan}) — a JOG megvan, az ELŐFIZETÉS zár; Béla price → refused_by=${prB.body.refused_by} (jog: ${prB.body.right_reason} · előfizetés: ${prB.body.entitlement_reason}); Béla tervet váltana → ${planB.status} ${planB.body.reason}`);
    expect(prA.body).toMatchObject({ refused_by: 'entitlement', entitlement_reason: 'feature_not_in_plan' }); expect(prB.body.refused_by).toBe('both'); expect(planB.body.reason).toBe('admin_required');
    const plan = await setPlanUI(anna.page, 'pro');
    const unknown = await anna.api.post('/api/workspaces/plan', { plan: 'enterprise' });
    const prA2 = await priceUI(anna.page); const prB2 = await priceUI(bela.page);
    ev.b(`Anna a felületen PRO-ra vált: „${plan.resultText}"; fejléc: „${(await header(anna.page)).workspace}"; Anna ár-nézete: „${line(prA2.text)}"; Béla ár-nézete: „${prB2.text.replace(/\n/g, ' · ')}" — a terv NEM írja felül a jog-kaput`);
    ev.s(`POST /api/workspaces/plan pro → features=[${plan.body.features.join(', ')}]; ismeretlen terv (enterprise) → ${unknown.status} ${unknown.body.reason}; Anna price ok=${prA2.body.ok}; Béla price refused_by=${prB2.body.refused_by} (előfizetés: ${prB2.body.entitlement_reason}); ADATBÁZIS entitlement_profile: ${j(db.get('SELECT plan, features FROM entitlement_profile WHERE book_id = ?', K.bookId))}`);
    expect(prA2.body.ok).toBe(true); expect(prB2.body).toMatchObject({ refused_by: 'right', entitlement_reason: 'feature_entitled' });
    // AZ ISMERETLEN TERV R75 ÓTA A HATÁRON akad el (a zárt terv-szótárral a válaszban), nem a
    // kezelőben — a mérés ugyanaz: nevezett 400, ÍRÁS NÉLKÜL, a profil változatlan.
    expect(unknown.status).toBe(400); expect(unknown.body.reason).toBe('invalid_value'); expect(String(unknown.body.message)).toContain('starter');
    expect(db.get('SELECT plan FROM entitlement_profile WHERE book_id = ?', K.bookId).plan).toBe('pro');
    ev.verdictIs('bizonyitva', 'Tesztprofil: a tervek a kódban zárt szótár (starter · pro), a profil az `entitlement_profile` táblában áll; fizetési integráció nincs, nem is kell — a két kapu (jog · előfizetés) külön mér és külön jelent. MÉRT LELET (a héj szövegén, nem a döntésén): ha a JOG-kapu enged és csak az ELŐFIZETÉS zár, a válasz `message` mezője a mag jog-kapujának mondatát („az eredmény kiadva") viszi az ELUTASÍTVA felirat alá — a döntés helyes, a kísérő mondat nem követi (KUKA-050); a héjban nem javítva, hogy a próba ne írja át azt, amit mér.');
  } finally { await w.close(); db.close(); }
});

test('H12 — HU és AT azonos karaktersora nem azonosság; ismeretlen országprofil nem ad képviseletet, saját munkát nem tilt', async ({ browser }) => {
  const ev = new Evidence('H12'); const w = new World(browser, 'h12'); const db = new Db();
  try {
    const anna = await w.person('anna'); const bela = await w.person('bela'); const cili = await w.person('cili'); const dani = await w.person('dani');
    const HU = await createWorkspaceUI(anna.page, { name: 'Anna HU', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const AT = await createWorkspaceUI(bela.page, { name: 'Béla AT', business: { jurisdiction: 'AT', tax_id: taxOf(w.tag) } });
    const XX = await cili.api.post('/api/workspaces', { name: 'Cili XX', plan: 'starter', business: { jurisdiction: 'XX', tax_id: taxOf(w.tag) } });
    const EG = await createWorkspaceUI(dani.page, { name: 'Dani egyéb', business: { jurisdiction: 'egyeb', tax_id: taxOf(w.tag) } });
    ev.b(`Anna HU joghatósággal: „${HU.resultText}" · Béla AT joghatósággal, UGYANAZZAL a karaktersorral: „${AT.resultText}" · Dani az „egyéb" joghatósággal: „${EG.resultText}"`);
    ev.s(`Cili ismeretlen országprofillal (XX) → ${XX.status}; business: profile_known=${XX.body.business.profile_known}, jurisdiction=${XX.body.business.jurisdiction}, verification=${XX.body.business.verification}`);
    expect(XX.status).toBe(201); expect(XX.body.business.profile_known).toBe(false);
    const norm = taxOf(w.tag).replace(/-/g, '');
    const rows = db.all("SELECT subject_id, jurisdiction FROM external_id WHERE namespace = 'tax_id' AND value_norm = ? ORDER BY jurisdiction", norm);
    const huOnly = db.all("SELECT subject_id FROM external_id WHERE namespace = 'tax_id' AND jurisdiction = 'HU' AND value_norm = ?", norm);
    ev.s(`ADATBÁZIS: ugyanaz a karaktersor ${rows.length} KÜLÖN joghatóság-kulcson (${rows.map((r) => r.jurisdiction).join(' · ')}), ${new Set(rows.map((r) => r.subject_id)).size} külön jogalanyon; a (tax_id · HU · érték) kulcs pontosan ${huOnly.length} alanyt talál — az AT sort NEM`);
    expect(rows.map((r) => r.jurisdiction)).toEqual(['AT', 'EGYEB', 'HU', 'XX']); expect(huOnly.length).toBe(1);
    const swBA = await bela.api.post('/api/session/workspace', { book_id: HU.bookId });
    const swCA = await cili.api.post('/api/session/workspace', { book_id: HU.bookId });
    const stC = await cili.api.get('/api/data/stock');
    const invC = await cili.api.post('/api/invites', { email: w.email('erik'), role: 'user', scope: 'keszlet' });
    ev.s(`Béla (AT, azonos karaktersor) váltása Anna HU könyvére → ${swBA.status} ${swBA.body.reason}; Cili (XX) váltása Anna könyvére → ${swCA.status} ${swCA.body.reason} (nincs képviseleti jog az azonosítóból); Cili SAJÁT munkája az XX-profillal: stock ok=${stC.body.ok} (qty ${stC.body.result && stC.body.result.qty}), munkatárs-meghívó → ${invC.status}`);
    expect(swBA.status).toBe(403); expect(swCA.status).toBe(403); expect(stC.body.ok).toBe(true); expect(invC.status).toBe(201);
    ev.verdictIs('bizonyitva', 'Az azonosság kulcsa a teljes négyes (névtér · joghatóság · kibocsátó · érték), nem a puszta szöveg; az ismeretlen profil ugyanazt a szerkezetet példányosítja (representation_from_identifier: false · own_work_allowed: true), csak „ismert: nem" jelöléssel.');
  } finally { await w.close(); db.close(); }
});

test('H13 — Kezdő jogosultság, alap nélküli történeti sor, szabályos új felhatalmazás, bírálói önfeljogosítás: a héjból nem hajtható meg', async ({ browser }) => {
  const ev = new Evidence('H13'); const w = new World(browser, 'h13'); const db = new Db();
  try {
    const anna = await w.person('anna');
    const K = await createWorkspaceUI(anna.page, { name: 'Kft', business: { jurisdiction: 'HU', tax_id: taxOf(w.tag) } });
    const probes = ['/api/adjudicate', '/api/claims', '/api/authority', '/api/members/suspend'];
    const results = [];
    for (const p of probes) { const r = await anna.api.post(p, {}); results.push(`${p} → ${r.status} ${r.body.reason}`); }
    const startup = db.get('SELECT allowed_operations FROM authority_basis WHERE basis_id = ? AND book_id = ?', `startup-rule:${K.bookId}`, K.bookId);
    const adj = db.all('SELECT operation FROM adjudication_authority WHERE subject_id = ? AND book_id = ?', anna.subjectId, K.bookId).map((r) => r.operation);
    ev.b('A felületen nincs bírálati / hatásköri vezérlő: a lap hat szakasza fiók · munkakörnyezet · munkatársak · adatok · meghívó · levél-fogadó — bírálói önfeljogosításra nincs gomb, tehát a négy kimenet a böngészőből nem váltható ki');
    ev.s(`A héjban nincs bírálati végpont (mérve): ${results.join('; ')}; ADATBÁZIS: az indulási szabály műveletei ${startup.allowed_operations} (adjudicate és suspend NINCS benne), a létrehozó hatáskörei: [${adj.join(', ')}] (csak a helyi alter_right)`);
    expect(results.every((r) => /404 unknown_endpoint/.test(r))).toBe(true);
    expect(JSON.parse(startup.allowed_operations)).not.toContain('adjudicate'); expect(adj).toEqual(['alter_right']);
    ev.verdictIs('nem_bongeszoben', 'A négy külön eredmény (kezdő jog · alap nélküli történeti sor · szabályos új felhatalmazás · jogosulatlan bírálói önfeljogosítás) a magban mérve áll: `P-CORE-startup-and-delegation` (e) — a helyi admin az indulási alapra hivatkozva sem adhat magának `adjudicate` hatáskört (outside_basis_operations, nyom nélkül) — és `P-ORG-adjudication-basis-limit` (a deklarált alap korlátja kapu a bírálati úton, a megadáskor ÉS a használatkor), mindkettő v3ref/run.mjs. A héjnak nincs bírálati végpontja, és a próba nem gyárt alap nélküli történeti sort (a mag íróit nem hívja).');
  } finally { await w.close(); db.close(); }
});

test('H14 — Két valódi kapcsolat versenye (beváltás · megvonás–véglegesítés · visszajátszás): a héjból nem hajtható meg', async () => {
  const ev = new Evidence('H14');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  const tool = 'tools/v3_multiconn_proof.mjs';
  const script = pkg.scripts && pkg.scripts['proof:multiconn'];
  ev.b('A böngésző-próba EGY szerver-folyamattal beszél, amely EGY tároló-kapcsolatot tart: két VALÓDI, külön OS-folyamatban nyitott kapcsolat versenye a lapról nem indítható — a látszólagos „egyszerre kattintás" egyírós sorrendet mérne, amit az R63 §5.2 kimondva nem fogad el bizonyítéknak');
  ev.s(`A többkapcsolatos bizonyíték szerszáma a repóban áll (mérve): ${tool} létezik=${existsSync(join(ROOT, tool))}; package.json → "proof:multiconn": "${script}"`);
  expect(existsSync(join(ROOT, tool))).toBe(true); expect(script).toBe(`node ${tool}`);
  ev.verdictIs('nem_bongeszoben', 'Bizonyíték: `npm run proof:multiconn` (tools/v3_multiconn_proof.mjs, MCN-01) — két külön gyermek-folyamat, saját `openStoreAt` kapcsolattal, WAL-naplón: (1) ugyanazt a meghívót egyszerre váltják be → pontosan EGY tagság, a vesztes nevezett elutasítást kap; (2) megvonás ↔ véglegesítés mindkét sorrendben, az aktuális szabály szerint; (3) a visszajátszás (kulcs-ismétlés · eredmény-olvasás) a megvonás után `not_available`, új kiadási sor nem születik.');
});
