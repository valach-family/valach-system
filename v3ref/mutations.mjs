// V3 MAGREFERENCIA — A MUTÁCIÓK ADATA (R53/F03 · MUT-01).
//
// MIÉRT KÜLÖN FÁJL. A mutációk listája ADAT, a `mutate.mjs` viszont FUTTATÓ: importálásakor
// lefutna a teljes battéria. A normák bizonyíték-láncának (`norms.mjs`) viszont TUDNIA kell,
// melyik próbához tartozik visszabontási kontroll — tehát olvasnia kell ezt a listát. Két rossz
// megoldás volt kéznél: a futtató importálása (mellékhatás) és a forrás SZÖVEGÉNEK olvasása
// (a pin ne szöveget olvasson, hanem HÍVJON — KUKA-009). A helyes az adat kiemelése EGY otthonba,
// amit MINDKÉT olvasó ugyanúgy hív (KUKA-003 · KUKA-018).
//
// PURE + INERT: nincs futtatás, nincs DB, nincs hálózat. Csak adat.

export const MUTATIONS_CONTRACT_ID = 'MUT-01';

// Minden mutáció EGY őrt ront el, és megnevezi, MELYIK próbának kell elkapnia, MILYEN MÓDON.
//   expect: 'probe_fail'    — a nevesített próba FAIL-t ad (ez a szabályos alak)
//   expect: 'runtime_error' — a mutáció a szerződés szerint ELŐRE VÁRHATÓAN kivételt okoz; csak
//                             akkor bizonyíték, ha itt előre ki van mondva (R42 §2.3)
export const MUTATIONS = [
  // ── A HAT EREDETI PRÓBA ŐREI (újrahorgonyozva a Q01–Q15 kör után) ───────────────────────────
  { id: 'M1', rule: 'K03', catcher: 'P-A04', expect: 'probe_fail',
    what: 'a semleges válasz elárulja, hogy a címhez tartozik-e fiók',
    file: 'invite.mjs',
    from: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {\n    return UNPROVEN;\n  }",
    to: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {\n    return Object.freeze({ ...UNPROVEN, account_exists: !!(inv && addressHolders(store, inv.invitee_namespace, inv.invitee_value, clock.now()).live.length) });\n  }" },

  // M2 SZERZŐDÉSE MÉRÉSBŐL VÁLTOZOTT, ÉS EZT KI KELL MONDANI. A meglévő hitelesítő adat védelme
  // MOST KÉT helyen áll: az alak-feloldó nem küldi az írás-ágra, ÉS az SQL `WHERE` sem engedi.
  // Egyetlen szerkesztéssel tehát NEM lehet NÉMA felülírást előidézni — a kód a próbálkozást
  // NEVEZETT hibakóddal állítja meg. A bizonyíték ereje ezért korlátozott: azt mutatja, hogy a
  // VÉDELEM TÜZEL, nem azt, hogy egy néma felülírást észlelnénk (KUKA-033: nem állítunk többet).
  { id: 'M2', rule: 'K03', catcher: 'P-K03-cred', expect: 'runtime_error',
    error_code: 'CREDENTIAL_WRITE_BLOCKED', phase: 'probe_body',
    error_match: 'hitelesítő|credential',
    what: 'a meghívó beváltása a MEGLÉVŐ hitelesítő adat írás-ágára fut (a mi KUKA-086-os hibánk)',
    evidence_limit: 'a védelem KÉT helyen áll (alak-feloldó + SQL WHERE), ezért egyetlen szerkesztés '
      + 'nem tud néma felülírást csinálni — ez a VÉDELEM TÜZELÉSÉNEK bizonyítéka',
    file: 'invite.mjs',
    from: "  return (row.credential === null || row.credential === undefined || row.credential === '')\n    ? 'credential_missing' : 'credential_set';",
    to: "  return 'credential_missing';" },

  { id: 'M3', rule: 'K03', catcher: 'P-K03-intent', expect: 'probe_fail',
    what: 'a függő szándék elvész, tehát a kézi beváltás zsákutcába fut (a mi D-VS-667-es hibánk)',
    file: 'invite.mjs',
    from: "  return row ? row.invite_token : null;",
    to: "  return null;" },

  // R51: az M4 ÚJRA-HORGONYOZVA. A J1 javítás óta a kiadás védelme KÉTRÉTEGŰ: a tranzakción kívüli
  // szűrés MELLETT a `store.tx`-en BELÜL is fut egy jog-ellenőrzés. Az egyrétegű rontás ezért
  // TÚLÉLTE — jó hír a kódnak, rossz hír a mutációnak (KUKA-041). Mindkét réteget elveszi.
  { id: 'M4', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az eredmény kiadása MINDEN rétegen kihagyja a MAI jog ellenőrzését (a mi hibás C08-as javaslatunk)',
    // R81/F04 ÚJRAHORGONYZÁS. A régi alak KÉT szerkesztésből állt, mert a jog-ellenőrzés két
    // helyen, KÉT KÜLÖN hívásként állt (a jelölt-szűrésen és a tranzakción belül). A javítás
    // EGY nevezett feloldóba vonta össze (`mayRelease`), amit MINDEN ág hív — ezért a mutáció is
    // EGY szerkesztés lett. Ez nem gyengülés: a feloldó megkerülése ugyanazt a két réteget nyitja
    // ki egyszerre, és a megkerülés ÚJ hívó nélkül nem lehetséges (KUKA-039 · KUKA-003).
    file: 'command.mjs',
    from: "  const mayRelease = (book, nowIso) => releaseAllowed({\n    store, subjectId: requester, bookId: book, nowIso, externalEvidence, credentials,\n  });",
    to: "  const mayRelease = () => true;" },

  { id: 'M5', rule: 'K07', catcher: 'P-A08', expect: 'runtime_error',
    error_code: 'ERR_SQLITE_ERROR', phase: 'probe_body',
    error_match: 'UNIQUE constraint failed: command\\.',
    what: 'az ismétlésvédelem nem fog: a hatás MÁSODSZOR is megszületik',
    evidence_limit: 'a mai kódon egyedi kulcs-ütközést vált ki — ez a VISELKEDÉS-VÁLTOZÁS észlelése, '
      + 'NEM két sikeresen lekönyvelt hatás bizonyítéka (R42 §2.3)',
    file: 'command.mjs',
    from: "  const prior = findCommandInScope(store, scope);",
    to: "  const prior = null;" },

  { id: 'M6', rule: 'K12', catcher: 'P-A14', expect: 'probe_fail',
    what: 'a lejárt külső bizonyíték türelmi időt kap',
    file: 'authz.mjs',
    from: "  if (Number.isFinite(profile?.max_age_ms) && age > profile.max_age_ms) {",
    to: "  if (false && Number.isFinite(profile?.max_age_ms) && age > profile.max_age_ms) {" },

  { id: 'M7', rule: 'K09', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a visszavont tagság továbbra is jogot ad',
    file: 'authz.mjs',
    from: "    if (r.ms <= now.ms) return Object.freeze({ effective: false, reason: 'membership_revoked' });",
    to: "    if (false) return Object.freeze({ effective: false, reason: 'membership_revoked' });" },

  { id: 'M8', rule: 'K05', catcher: 'P-A08', expect: 'probe_fail',
    what: 'a NEM LÉTEZŐ és a NEM LÁTHATÓ parancs válasza eltér — a kulcs próbálgathatóvá válik',
    file: 'command.mjs',
    from: "    if (visible.length !== 1) return refused;",
    to: "    if (visible.length !== 1) return Object.freeze({ ...refused, error: rows.length ? 'not_available' : 'unknown_key' });" },

  { id: 'M9', rule: 'K03', catcher: 'P-A04b', expect: 'probe_fail',
    what: 'a postafiók birtokosa is csak a semleges választ kapja — a javítás zsákutcát csinál (KUKA-064)',
    file: 'invite.mjs',
    from: "  if (!inv || !hasProvenChannel(store, viewerSubjectId, inv.invitee_namespace, inv.invitee_value)) {",
    to: "  if (!inv || true) {" },

  { id: 'M10', rule: 'K07', catcher: 'P-A08', expect: 'probe_fail',
    what: 'az ÚJRAPRÓBÁLÁS a jog-ellenőrzés ELŐTT felel a kulcsra — a kulcs létezés-csatornává válik',
    file: 'command.mjs',
    from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence, credentials }).allowed) {\n    return refused;\n  }\n\n  const prior = findCommandInScope(store, scope);",
    to: "  const prior = findCommandInScope(store, scope);\n  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence, credentials }).allowed) {\n    return prior ? Object.freeze({ ...refused, error: 'exists_but_not_available' }) : refused;\n  }" },

  // ── A Q01–Q15 KÖR ŐREI ──────────────────────────────────────────────────────────────────────
  { id: 'M11', rule: 'K07', catcher: 'P-CMD-namespace', expect: 'probe_fail',
    what: 'Q01 — a kulcs-keresésből kiesik az AKTOR tengely: két aktor közös névteret oszt',
    file: 'command.mjs',
    from: "  return store.get('SELECT * FROM command WHERE book_id = ? AND actor = ? AND idem_key = ?',\n    scope.bookId, scope.actor, scope.idemKey);",
    to: "  return store.get('SELECT * FROM command WHERE book_id = ? AND idem_key = ?',\n    scope.bookId, scope.idemKey);" },

  { id: 'M12', rule: 'K07', catcher: 'P-CMD-namespace', expect: 'probe_fail',
    what: 'Q01 — a hatásazonosító nem hordozza a teljes hatókört: két névtér EGY hatásazonosítón',
    file: 'command.mjs',
    from: "  return `eff_${hash(commandRef(scope))}`;",
    to: "  return `eff_${scope.idemKey}`;" },

  { id: 'M13', rule: 'K07', catcher: 'P-CMD-identity', expect: 'probe_fail',
    what: 'Q02 — visszatér a tört kanonizálás: a BEÁGYAZOTT mezők némán kiesnek a lenyomatból',
    file: 'command.mjs',
    from: "  return hash(`${CANON_VERSION}|${canonicalize({ type, type_version: typeVersion, declared })}`);",
    to: "  return hash(`${CANON_VERSION}|${JSON.stringify(declared, Object.keys(declared).sort())}|${type}|${typeVersion}`);" },

  { id: 'M14', rule: 'K07', catcher: 'P-CMD-identity', expect: 'probe_fail',
    what: 'Q03 — a MŰVELET és a VERZIÓ kiesik az azonosságból: más művelet a régi hatásra mutat',
    file: 'command.mjs',
    from: "  return hash(`${CANON_VERSION}|${canonicalize({ type, type_version: typeVersion, declared })}`);",
    to: "  return hash(`${CANON_VERSION}|${canonicalize({ declared })}`);" },

  // R49: az M15 ÚJRA-HORGONYOZVA. A parancs-oldali véglegesítési kapu (D-VS-3008) óta a védelem
  // KÉTRÉTEGŰ: a feloldás utáni ellenőrzés MELLETT a tranzakción belül is fut egy. Az egyrétegű
  // rontás ezért TÚLÉLTE — nem azért, mert a hiba nincs meg, hanem mert egyetlen szerkesztés nem
  // tudja kinyitni. Ez jó hír a kódnak és ROSSZ hír a mutációnak: egy próba, ami nem tud pirosra
  // váltani, nem bizonyít semmit (KUKA-041). Ezért a mutáció MINDKÉT réteget elveszi — ez a valódi
  // visszacsúszás-osztály: „a jogot a feloldás után egyáltalán nem kérdezzük meg újra".
  { id: 'M15', rule: 'K07', catcher: 'P-CMD-finalize', expect: 'probe_fail',
    what: 'Q04 — a feloldás UTÁNI jog-ellenőrzés MINDKÉT rétege elmarad: az elvesztett jog mellett is véglegesül',
    file: 'command.mjs',
    edits: [
      { from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence, credentials }).allowed) {\n    // A feloldás alatt elveszett a jog ⇒ a parancs NEM lesz kész. Semmit nem írunk.\n    return refused;\n  }",
        to: "  if (false) {\n    return refused;\n  }" },
      // R79/F02 ÓTA A MÁSODIK RÉTEG A HATÁLYOSULÁSI PONT `decide` VISSZAHÍVÁSA (EFF-01). A
      // visszacsúszás OSZTÁLYA ugyanaz — „a tranzakción belül már senki nem kérdez jogot" —, csak a
      // helye költözött; a horgony ezért a `decide` TESTÉRE mutat, nem egy külön `rightAt` hívásra.
      { from: "      const r = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', nowIso, externalEvidence, credentials });\n      return r.allowed ? { ok: true } : { ok: false, reason: r.reason, message: r.message };",
        to: "      return { ok: true };" },
    ] },

  // R47: az M16 ÚJRA-HORGONYOZVA. A régi alakja azt rontotta el, hogy a BEFOGADÁS leltározzon —
  // csakhogy a befogadás ma már SZÁNDÉKOSAN nem leltároz (nem közöl új tényt), ezért a mutáció
  // értelmét vesztette és TÚLÉLT. Az ÚJ veszély ezen a tengelyen az, hogy a befogadás megint
  // KISZOLGÁLJON: visszaadja a feloldott tartalmat, megkerülve az egyetlen leltározott olvasó utat.
  { id: 'M16', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'Q15 — a BEFOGADÁS válasza megint KISZOLGÁLJA a feloldott tartalmat, leltár nélkül',
    file: 'command.mjs',
    from: "    return commandReceipt({ effectId, state: 'finalized', replayed: false });",
    to: "    return Object.freeze({ ...commandReceipt({ effectId, state: 'finalized', replayed: false }), resolved: JSON.parse(resolvedJson) });" },

  // A PÁRJA: az ISMÉTLÉS ága EGY MÁR LÉTEZŐ parancs állapotát közli — az a hívónak ÚJ tény, tehát
  // leltározni KELL. Ha ez elmarad, a kulcs próbálgatásával nyom nélkül derül ki, mi létezik.
  { id: 'M27', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'az ISMÉTLÉS ága nyom nélkül közli egy MÁR LÉTEZŐ parancs állapotát',
    file: 'command.mjs',
    from: "    return store.tx(() => {\n      // R51/J1 (N09):",
    to: "    if (true) return commandReceipt({ effectId: prior.effect_id, state: prior.state, replayed: true });\n    return store.tx(() => {\n      // R51/J1 (N09):" },

  { id: 'M17', rule: 'K04', catcher: 'P-AUTHZ-opclass', expect: 'probe_fail',
    what: 'Q07 — visszatér a sima objektum-indexelés: az ÖRÖKÖLT kulcs profilt talál',
    file: 'authz.mjs',
    from: "  return typeof opClass === 'string' && OP_CLASSES.has(opClass) ? OP_CLASSES.get(opClass) : null;",
    to: "  return FRESHNESS_PROFILE[opClass] || null;" },

  { id: 'M18', rule: 'K04', catcher: 'P-AUTHZ-membership-time', expect: 'probe_fail',
    what: 'Q08 — a JÖVŐBELI tagsági kezdet nem zár: a 2099-es dátum MA is jogot ad',
    file: 'authz.mjs',
    from: "  if (g.ms > now.ms) return Object.freeze({ effective: false, reason: 'membership_not_yet_effective' });",
    to: "  if (false) return Object.freeze({ effective: false, reason: 'membership_not_yet_effective' });" },

  { id: 'M19', rule: 'K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'Q06 — a HATÁLY tengelye eltűnik: friss lekérdezés mellett a LEJÁRT megbízás is enged',
    file: 'authz.mjs',
    from: "  const until = instantMs(ev.valid_until);\n  if (!until.ok) return Object.freeze({ ok: false, reason: `evidence_valid_until_${until.reason}` });\n  if (until.ms <= now.ms) return Object.freeze({ ok: false, reason: 'evidence_expired' });",
    to: "  // a hatály-tengely eltávolítva" },

  { id: 'M20', rule: 'K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'Q05 — a JÖVŐBELI lekérés frissességnek számít (a negatív kor kisebb a plafonnál)',
    file: 'authz.mjs',
    from: "  if (age < 0) return Object.freeze({ ok: false, reason: 'evidence_future_dated' });",
    to: "  if (false) return Object.freeze({ ok: false, reason: 'evidence_future_dated' });" },

  { id: 'M21', rule: 'K03', catcher: 'P-INVITE-window', expect: 'probe_fail',
    what: 'a meghívó lejárata visszatér SZÖVEG-összehasonlításra (a teljesség-kritika élő lelete)',
    file: 'invite.mjs',
    from: "  if (exp.ms <= now.ms) return Object.freeze({ open: false, reason: 'invite_expired' });",
    to: "  if (inv.expires_at <= nowIso) return Object.freeze({ open: false, reason: 'invite_expired' });" },

  { id: 'M22', rule: 'K03', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q10 — az IDEGEN alany őre elmarad: más ember alanyára is beváltható a meghívó',
    file: 'invite.mjs',
    from: "  if (shape === 'foreign_existing_subject') {\n    return Object.freeze({\n      ok: false, error: 'account_authentication_required',",
    to: "  if (shape === 'foreign_existing_subject') {\n    return Object.freeze({\n      ok: false, error: 'invite_not_actionable'," },

  { id: 'M23', rule: 'K03', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q09 — a kibocsátó MAI joga nincs megkérdezve: visszavont jogú kibocsátó meghívója is ad tagságot',
    file: 'invite.mjs',
    from: "  const grant = inviteGrantAt({ store, invite: inv, clock });",
    to: "  const grant = Object.freeze({ ok: true, issuer_role: 'admin' });" },

  { id: 'M24', rule: 'K09', catcher: 'P-INVITE-authority', expect: 'probe_fail',
    what: 'Q13 — a VISSZAVONT tagság némán elnyelődik: a meghívó elfogy, hozzáférés nélkül',
    file: 'invite.mjs',
    edits: [
      { from: "  if (!outcome.grants_access) {", to: "  if (false) {" },
      { from: "    if (!outcome2.grants_access) {", to: "    if (false) {" },
    ] },

  { id: 'M25', rule: 'K03', catcher: 'P-INVITE-effect', expect: 'probe_fail',
    what: 'Q12 — az írások NEM atomiak: a megszakadt beváltás félkész jogadást hagy',
    file: 'invite.mjs',
    from: "  return store.tx(() => {",
    to: "  return ((fn) => fn())(() => {" },

  // Az R42 P-A14 NEVEZETT maradéka: „a megvonás → képviseleti lekérdezés kombináció külön hiányzik".
  // A két tengely SORRENDJE dönt: ha a képviseleti jogcím a tagság-vizsgálat ELÉ kerül, a VISSZAVONT
  // tag hibátlan megbízással újra bejut. Ez nem elméleti: a képviseleti ág `return`-öl, tehát a
  // sorrend-csere némán ad vissza `allowed:true`-t (KUKA-002 — két tengely, és a sorrendjük a szabály).
  { id: 'M28', rule: 'K09', catcher: 'P-AUTHZ-revoke-now', expect: 'probe_fail',
    what: 'K09 — a mai viselkedes: minden meglevo revoked_at ertek blokkolja az azonnali megvonast',
    file: 'authz.mjs',
    from: "  if (prev.ms <= now.ms) return Object.freeze({ act: false, reason: 'revocation_already_effective' });\n  return Object.freeze({ act: true, effective_at: nowIso, reason: 'revocation_pulled_forward', previous_effective_at: existingRevokedAt });",
    to: "  return Object.freeze({ act: false, reason: 'revocation_already_effective' });" },

  { id: 'M29', rule: 'K09', catcher: 'P-AUTHZ-revoke-now', expect: 'probe_fail',
    what: 'K09 — TULZARAS: a mar hatalyos megvonas meghosszabbodik',
    file: 'authz.mjs',
    from: "  if (prev.ms <= now.ms) return Object.freeze({ act: false, reason: 'revocation_already_effective' });",
    to: "  if (false) return Object.freeze({ act: false, reason: 'revocation_already_effective' });" },

  { id: 'M26', rule: 'K04/K12', catcher: 'P-AUTHZ-evidence', expect: 'probe_fail',
    what: 'a képviseleti jogcím a TAGSÁG-vizsgálat elé kerül: visszavont tag megbízással újra bejut',
    file: 'authz.mjs',
    from: "  const eff = membershipEffectiveAt(m, at);\n  if (!eff.effective) {",
    to: "  const eff = membershipEffectiveAt(m, at);\n  if (!eff.effective && !needsExternalEvidence(profile)) {" },

  // ═══ A HAT ÚJ ŐR MUTÁCIÓI (R49 · D-VS-3008) ═══════════════════════════════════════════════════
  //
  // Egy próba, ami sosem pirosodik, DÍSZ (KUKA-041). Mindegyik új őrhöz tartozik egy mutáció, ami
  // a VALÓDI visszacsúszást játssza el — nem elméleti rontást.

  // A LEGVESZÉLYESEBB ALAK: a kapu MEGVAN, csak a ROSSZ OLDALON — az őr a tranzakció ELŐTTI,
  // ELAVULT sort nézi. Saját kézzel mérve: enélkül a battéria végig zöld maradt, miközben a KÜLSŐ
  // próba 30/30 → 28/30 esett.
  // R53/F01 UTÁN ÚJRA-HORGONYOZVA: a véglegesítési határon már nem nyers SELECT áll, hanem a
  // KIADOTT ajánlat feloldója (`authoritativeInvite`). A rontás ezért ott fogja meg a láncot: a
  // kapu az ELAVULT, tranzakció ELŐTT olvasott példánnyal dolgozik tovább.
  { id: 'M31', rule: 'K03/K09', catcher: 'P-INVITE-finalize-gate', expect: 'probe_fail',
    what: 'a meghívó véglegesítési kapuja az ELAVULT sort nézi (a kapu megvan, rossz oldalon)',
    file: 'invite.mjs',
    from: "    const freshAuth = authoritativeInvite(store, token);",
    to: "    const freshAuth = Object.freeze({ ok: true, invite: inv });" },

  // R79/F02 UTÁN ÚJRA-HORGONYOZVA. A parancs-oldali véglegesítési kapu nem külön `rightAt` hívás
  // többé, hanem a KÖZÖS hatályosulási pont (`effectuateWith`) `decide` visszahívása. A rontás
  // szándéka változatlan: a tranzakció HATÁRÁN visszavont jog mellett is könyveljen.
  { id: 'M32', rule: 'K04/K07', catcher: 'P-CMD-finalize-gate', expect: 'probe_fail',
    what: 'a PARANCS-oldali véglegesítési kapu eltűnik: a tx-határon visszavont jog mellett is könyvel',
    file: 'command.mjs',
    from: "      const r = rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', nowIso, externalEvidence, credentials });\n      return r.allowed ? { ok: true } : { ok: false, reason: r.reason, message: r.message };",
    to: "      return { ok: true };" },

  { id: 'M33', rule: 'K04', catcher: 'P-AUTHZ-roles', expect: 'probe_fail',
    what: 'C05 — az ISMERETLEN szerep megint jogot kap: a zárt regiszter kiiktatva',
    file: 'authz.mjs',
    from: "  const grant = roleGrants(m.role, opClass);",
    to: "  const grant = true;" },

  { id: 'M34', rule: 'K07', catcher: 'P-CANON-shape', expect: 'probe_fail',
    what: 'C08 — az idegen `toJSON` adapter megint lefut, tehát elrejtheti a deklarált tartalmat',
    file: 'command.mjs',
    from: "    throw new CanonError('adapter_not_allowed', path);",
    to: "    return canonicalize(v.toJSON(), path);" },

  { id: 'M35', rule: 'K12', catcher: 'P-TIME-calendar', expect: 'probe_fail',
    what: 'C09 — a naptári visszaolvasás kiesik: a február 30. megint érvényes időponttá normalizálódik',
    file: 'store.mjs',
    from: "    return { ok: false, reason: 'instant_not_a_calendar_day' };",
    to: "    return { ok: true, ms };" },

  { id: 'M36', rule: 'K03', catcher: 'P-IDENTITY-address', expect: 'probe_fail',
    what: 'C07 — a KÖTÉSEK számát mérjük az ALANYOK helyett: két bizonyíték egy emberre „több élő alany"',
    file: 'invite.mjs',
    from: "    live: Object.freeze([...new Set(live)]),",
    to: "    live: Object.freeze(live)," },

  // R50 — A NYUGTA-SZERZŐDÉS KÉT VISSZACSÚSZÁSA. Ez a kör azért van, mert a külső fél megcáfolta
  // az R47-es indokunkat („a befogadás nem közöl új tényt"), és a javítás CSAK akkor ér valamit,
  // ha a hiánya PIROSRA vált — különben ugyanaz a helyzet, mint a véglegesítési kapunál: a
  // legfontosabb rész őrizetlen, és a nem mért rész ZÖLDNEK látszik (KUKA-051).
  { id: 'M37', rule: 'K05', catcher: 'P-CMD-receipt', expect: 'probe_fail',
    what: 'R50 — a VÉGLEGESÍTÉS megint nyomtalan: a nyugta-sor elmarad, a válasz mégis „kész"-t mond',
    file: 'command.mjs',
    // A HORGONY ÚJRAKÖTVE (R10-F01). A nyugta-írás a hatás ELÉ került, mert a mozgás-sor tárolói őre
    // megköveteli a nyugtát; a régi horgony (nyugta + közvetlenül utána a `return`) így nem
    // létezett többé, és a battéria helyesen ELAVULT HORGONY-t jelentett. A horgonyt a szabály
    // VÁLTOZÁSAKOR kell újrakötni, nem a jelzést kikapcsolni (R55/F03 · KUKA-045).
    from: "    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock, at });",
    to: "    // a nyugta-írás eltávolítva (M37)" },

  // A MÁSODIK a veszélyesebb: a nyugta MEGVAN, csak nem a hatással EGY tranzakcióban. A `store.tx`
  // a visszautasító ágon is COMMITÁL (nem dob), tehát a tx ELÉ tett írás akkor is megmarad, ha a
  // parancs sosem született meg — nyugta egy meg nem történt hatásról. Ugyanaz az alak, mint az
  // M31 a meghívó-oldalon: a védelem megvan, csak ROSSZ OLDALON.
  // R51: az M38 SZERZŐDÉSE MÉRÉSBŐL VÁLTOZOTT, ÉS EZT KI KELL MONDANI (KUKA-033). A J3 javítás óta
  // a nyugtázó felület MAGA utasítja el a tranzakción kívüli hívást (`RECEIPT_OUTSIDE_TX`), tehát
  // a „nyugta a hatás tranzakcióján kívül" alak egyetlen szerkesztéssel többé NEM idézhető elő
  // némán: NEVEZETT kivétellel áll meg. A bizonyíték ereje ezért korlátozott — azt mutatja, hogy a
  // VÉDELEM TÜZEL, nem azt, hogy egy néma árva nyugtát észlelnénk (ugyanaz az alak, mint az M2).
  { id: 'M38', rule: 'K05', catcher: 'P-CMD-receipt', expect: 'runtime_error',
    error_code: 'RECEIPT_OUTSIDE_TX', phase: 'probe_body',
    error_match: 'véglegesítés tranzakciójából',
    what: 'R50 — a nyugta KILÉP a hatás tranzakciójából: elutasított parancsról is maradna nyugta-sor',
    evidence_limit: 'a J3 óta a nyugtázó felület a tranzakción kívüli hívást NEVEZETT hibakóddal '
      + 'állítja meg, ezért ez a VÉDELEM TÜZELÉSÉNEK bizonyítéka, nem néma árva soré',
    file: 'command.mjs',
    from: "  const effectId = effectIdFor(scope);\n  // R79/F02 — A PARANCSÍRÁS IS A KÖZÖS HATÁLYOSULÁSI PONTON MEGY ÁT",
    to: "  const effectId = effectIdFor(scope);\n  recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock });\n  // R79/F02 — A PARANCSÍRÁS IS A KÖZÖS HATÁLYOSULÁSI PONTON MEGY ÁT" },

  // R51 — AZ ÚJ ŐRÖK VISSZACSÚSZÁSAI (J1–J4). Minden javítás mellé elrontás-próba, ugyanabban a
  // körben: a javítás akkor kész, ha a HIÁNYA bizonyítottan pirosra vált (KUKA-092).
  // R53/F01 UTÁN ÚJRA-HORGONYOZVA (M39 · M40 · M31). A meghívó védelme a PECSÉTTEL KÉTRÉTEGŰ lett:
  // a `authoritativeInvite` a KIADOTT (append-only) feltételekhez méri az élő sort, és csak utána
  // következik a két-példány összevetés. Az egyrétegű rontás ezért TÚLÉLTE — jó hír a kódnak,
  // rossz hír a mutációnak: egy KORÁBBAN tüzelő új kapu leveszi a régi mutációt a saját
  // tengelyéről (KUKA-094 második alakja, ugyanaz a lecke, mint az M4/M24 kétrétegűvé tételénél).
  { id: 'M39', rule: 'K03', catcher: 'P-INVITE-terms', expect: 'probe_fail',
    what: 'R51/J2 — a meghívó feltételei megint változtathatók: MINDKÉT réteg (pecsét + két példány) kiesik',
    file: 'invite.mjs',
    edits: [
      { from: "  const s = sealedTerms(store, token);\n  if (!s.ok) return Object.freeze({ ok: false, reason: s.reason });\n  if (inviteTerms(live) !== inviteTerms(s.sealed)) {\n    return Object.freeze({ ok: false, reason: 'invite_terms_changed' });\n  }",
        to: "  const s = { ok: true, sealed: live };" },
      { from: "    if (inviteTerms(fresh) !== inviteTerms(inv)) {", to: "    if (false) {" },
    ] },

  { id: 'M40', rule: 'K03', catcher: 'P-INVITE-terms', expect: 'probe_fail',
    what: 'R51/J2 — a tagság-írás megint az ELAVULT sor szerepét használja (N10 gyökere)',
    file: 'invite.mjs',
    edits: [
      { from: "  const s = sealedTerms(store, token);\n  if (!s.ok) return Object.freeze({ ok: false, reason: s.reason });\n  if (inviteTerms(live) !== inviteTerms(s.sealed)) {\n    return Object.freeze({ ok: false, reason: 'invite_terms_changed' });\n  }",
        to: "  const s = { ok: true, sealed: live };" },
      { from: "    if (inviteTerms(fresh) !== inviteTerms(inv)) {", to: "    if (false) {" },
      // ÚJRAHORGONYZVA (R85): a tagság-írás a KÖZÖS otthonra váltott (GRT-01, grantMembership),
      // ezért a régi INSERT-sor megszűnt. A mutáció SZÁNDÉKA változatlan: az ELAVULT példány
      // szerepét írja a friss helyett. A STALE_ANCHOR őr fogta meg, hogy a horgony elévült.
      { from: "        store, subjectId, bookId: fresh.book_id, role: fresh.offered_role, at: clock.now(),",
        to: "        store, subjectId, bookId: inv.book_id, role: inv.offered_role, at: clock.now()," },
    ] },

  { id: 'M41', rule: 'K05', catcher: 'P-CMD-receipt-integrity', expect: 'probe_fail',
    what: 'R51/J3 — a nyugta megint írható a véglegesítés tranzakcióján KÍVÜLRŐL',
    file: 'command.mjs',
    from: "  if (!store.db?.isTransaction) fail('RECEIPT_OUTSIDE_TX'",
    to: "  if (false) fail('RECEIPT_OUTSIDE_TX'" },

  { id: 'M42', rule: 'K05', catcher: 'P-CMD-receipt-integrity', expect: 'probe_fail',
    what: 'R51/J3 — a nyugta tartalmát senki nem méri a PARANCS sorához: idegen hatás és lehetetlen állapot is átmegy',
    file: 'command.mjs',
    edits: [
      { from: "  if (cmd.effect_id !== effectId) fail('RECEIPT_EFFECT_MISMATCH'", to: "  if (false) fail('RECEIPT_EFFECT_MISMATCH'" },
      { from: "  if (cmd.state !== state) fail('RECEIPT_STATE_MISMATCH'", to: "  if (false) fail('RECEIPT_STATE_MISMATCH'" },
    ] },

  { id: 'M43', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'R51/J4 — a NULLA SOROS leltár-írás megint kiengedi a védett tartalmat (N12)',
    file: 'command.mjs',
    from: "  if (res?.changes !== 1) {\n    const err = new Error('disclose:",
    to: "  if (false) {\n    const err = new Error('disclose:" },

  { id: 'M44', rule: 'K05', catcher: 'P-CMD-disclosure', expect: 'probe_fail',
    what: 'R51/J4 — visszatér a KÉTÉRTELMŰ mezőút: az `a.b` nevű mező és az `a` alatti `b` egy útra képződik',
    file: 'command.mjs',
    from: "    : releasedFieldPaths(body[k], [...prefix, `k:${escSeg(k)}`])));",
    to: "    : releasedFieldPaths(body[k], [...prefix, String(k)])));" },
  // ── R55/F02 · F03 — A REV-N1b SAJÁT VISSZABONTÁSI KONTROLLJAI ──────────────────────────────────
  //
  // MIÉRT KELL HÁROM. A külső fél N04 esete megmutatta, hogy az M32 (a parancs-oldali véglegesítési
  // kapu eltűnése) csak az `A-REV-N1a` állítást buktatja — a REV-N1b-t NEM falszifikálja semmi,
  // pedig oda is be volt írva kontrollnak. Egy több-állításos próba ÖSSZESÍTETT bukása nem igazolja
  // mindegyik klauzulát. A REV-N1b („a korábbi esemény és döntése nem törlődik") három módon
  // sérülhet, és mindhárom KÜLÖN kontrollt kíván (KUKA-039: a fél őr):
  //   M47 - a megvonás TÖRLI a korábbi parancsokat (a külső fél F04 beavatkozása)
  //   M48 - a megvonás MEGHAGYJA a sort, de ÁTÍRJA a tartalmát (az N03 beavatkozása; a régi,
  //         darabszám-alapú állításom ezt NEM vette észre)
  //   M49 - AZONOS DARABSZÁMÚ SOR-CSERE: egy nyugta helyére egy másik kerül
  { id: 'M47', rule: 'K08/K09', catcher: 'P-CMD-finalize-gate', expect: 'probe_fail',
    what: 'R55/F02 — a megvonás KITÖRLI a korábbi parancsokat, nyugtákat és kiadásokat (a múlt eltűnik)',
    file: 'authz.mjs',
    from: "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });",
    to: "    store.run('DELETE FROM disclosure WHERE recipient = ? AND scope = ?', subjectId, bookId);\n"
      + "    store.run('DELETE FROM command_event WHERE actor = ? AND book_id = ?', subjectId, bookId);\n"
      + "    store.run('DELETE FROM command WHERE actor = ? AND book_id = ?', subjectId, bookId);\n"
      + "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });" },

  { id: 'M48', rule: 'K08/K09', catcher: 'P-CMD-finalize-gate', expect: 'probe_fail',
    what: 'R55/F02 — a megvonás MEGHAGYJA a sort, de ÁTÍRJA a tartalmát (a darabszám stimmel, a történet nem)',
    file: 'authz.mjs',
    from: "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });",
    to: "    store.run('UPDATE command SET resolved_json = ? WHERE actor = ? AND book_id = ?', '{\"tampered\":true}', subjectId, bookId);\n"
      + "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });" },

  { id: 'M49', rule: 'K08/K09', catcher: 'P-CMD-finalize-gate', expect: 'probe_fail',
    what: 'R55/F02 — AZONOS DARABSZÁMÚ SOR-CSERE: a régi nyugta helyére másik kerül',
    file: 'authz.mjs',
    from: "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });",
    to: "    store.run('DELETE FROM command_event WHERE actor = ? AND book_id = ?', subjectId, bookId);\n"
      + "    store.run(`INSERT INTO command_event (book_id, actor, idem_key, event, state, effect_id, at)\n"
      + "               SELECT book_id, actor, idem_key, 'command_finalized', 'finalized', 'eff_HAMIS', ? FROM command\n"
      + "               WHERE actor = ? AND book_id = ?`, at, subjectId, bookId);\n"
      + "    return Object.freeze({ ok: true, changed: true, reason: t.reason, effective_at: t.effective_at });" },


  // ── REV-N3 — A HATÁSKÖR ÉS A BEJELENTÉS VISSZABONTÁSI KONTROLLJAI (req-2 · R65 §7) ─────────────
  //
  // A csomag terve (`NEXT_REQUIRED_EVIDENCE.order`, R60-ban ELŐRE rögzítve) NÉV SZERINT megmondta,
  // mely mutációknak kell megbuktatniuk a három klauzulát: „a hatáskör-ellenőrzés kivétele · a
  // művelet-szűkítés kivétele · a jelzés-út hatáskörhöz kötése (ez utóbbi a REV-N3c-t buktatja,
  // tehát ELLENPÁR is)" és „az olvasás-kapu kivétele a jelzés utáni állapotban · a hibakód
  // megkülönböztetése". Mind az öt itt áll — plusz egy hatodik, ami a SEMLEGES NYUGTÁT támadja.
  //
  // MIÉRT KÜLÖN MINDEGYIK. Egy több-állításos próba ÖSSZESÍTETT bukása nem igazolja mindegyik
  // klauzulát (R55/F02 · KUKA-039): ha egyetlen mutáció mindhármat pirosra vinné, nem tudnánk, mit
  // is mértünk. Ezért mutációnként MÁS ág törik el.

  { id: 'M50', rule: 'K04/K09', catcher: 'P-REV-authority', expect: 'probe_fail',
    what: 'REV-N3a — a HATÁSKÖR-ELLENŐRZÉS kivétele: a jogváltoztatás megint puszta bemenet',
    file: 'authz.mjs',
    from: "    { store, clock, subjectId: actorSubjectId, bookId, operation: 'alter_right', credentials },",
    to: "    { store, clock, subjectId: actorSubjectId, bookId, operation: 'suspend' }," },

  { id: 'M51', rule: 'K04/K09', catcher: 'P-REV-authority', expect: 'probe_fail',
    what: 'REV-N3a — a MŰVELET-SZŰKÍTÉS kivétele: bármelyik hatáskör megteszi (a legszűkebb '
      + 'felhatalmazás a legtágabb hatást adná)',
    file: 'authority.mjs',
    from: "    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ? AND operation = ?',\n    who, bookId, operation);",
    to: "    'SELECT * FROM adjudication_authority WHERE subject_id = ? AND book_id = ?',\n    who, bookId);" },

  { id: 'M52', rule: 'K05/K15', catcher: 'P-REV-authority', expect: 'probe_fail',
    what: 'REV-N3c — a JELZÉS-ÚT HATÁSKÖRHÖZ KÖTÉSE: a még nem igazolt panaszos jelzése elakad '
      + '(pont az a visszaélés-jelzés fojtódna el, amiért a klauzula van)',
    file: 'adjudication.mjs',
    from: "  const digest = digestOf(statement);",
    to: "  const gate = adjudicationRightAt({ store, subjectId: ref, bookId, operation: 'adjudicate', clock });\n"
      + "  if (!gate.allowed) return Object.freeze({ accepted: false, reason: gate.reason, message: gate.message });\n"
      + "  const digest = digestOf(statement);" },

  { id: 'M53', rule: 'K05/K09', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — az OLVASÁS-KAPU kivétele a jelzés utáni állapotban: a bejelentő attól, hogy '
      + 'állít valamit, olvasóvá válik',
    file: 'adjudication.mjs',
    from: "  if (!right.allowed) return CLAIM_NOT_AVAILABLE;",
    to: "  if (!right.allowed && row.claimant_ref !== row.claimant_ref) return CLAIM_NOT_AVAILABLE;" },

  { id: 'M54', rule: 'K05/K09', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — a HIBAKÓD MEGKÜLÖNBÖZTETÉSE: a létező, de nem látható ügy MÁS választ ad, '
      + 'mint a nem létező (a csatorna hordozza a védett bitet — KUKA-084)',
    file: 'adjudication.mjs',
    from: "  if (!row) return CLAIM_NOT_AVAILABLE;\n  const right = adjudicationRightAt({",
    to: "  if (!row) return Object.freeze({ ok: false, error: 'no_such_claim' });\n  const right = adjudicationRightAt({" },

  { id: 'M55', rule: 'K05/K15', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — a SEMLEGES NYUGTA elárulja, létezik-e a könyv (a nem létező könyvre más '
      + 'válasz megy)',
    file: 'adjudication.mjs',
    // HORGONY ÚJRAKÖTVE (R68). A régi horgony az R67/F04 előtti, tranzakción KÍVÜLI, `intake_key`
    // nélküli beszúrás szövege volt; a javítás után ilyen sor nincs, tehát a mutáció ELAVULT lett és
    // a battéria STALE_ANCHOR-t jelentett. Ez maga a gépezet helyes működése: a forrás-szövegre kötött
    // mutáció a javítással együtt jár le, és NEM némán — a horgony a tranzakció-nyitás, ami a
    // beszúrások ELŐTT áll, tehát a beékelt korai `return` továbbra is elvágja az írást.
    from: "  store.tx(() => {",
    to: "  const bookRow = store.get('SELECT * FROM book WHERE id = ?', String(bookId == null ? '' : bookId));\n"
      + "  if (!bookRow) return Object.freeze({ accepted: true, message: 'Nincs ilyen könyv.' });\n"
      + "  store.tx(() => {" },


  // ── R67/F01–F05 — AZ ÖT ÚJ VISSZABONTÁSI KONTROLL (a külső fél §7/3 kérése, betűre) ─────────────
  //
  // „Új mutációk: felfüggesztési írás elhagyása; jogfeloldó felfüggesztés-vaksága; döntési úton
  // részletes létezési hiba; beadványtartalom elvesztése; második írás hibája utáni részleges
  // állapot." — mind az öt PONTOSAN azt az alakot állítja vissza, amit ők a változatlan kódon
  // mértek meg. Ez a különbség a javítás és a JAVÍTÁS BIZONYÍTÁSA között: a zöld próba csak akkor
  // bizonyíték, ha tudjuk, hogy KÉPES bukni (KUKA-041 a mérőn).
  //
  // MIÉRT KÉT KÜLÖN MUTÁCIÓ A FELFÜGGESZTÉSRE. Az F01-nek két, egymástól FÜGGETLEN fele van: az ÍRÁS
  // (a tény rögzül-e) és az OLVASÁS (a jogfeloldó megkérdezi-e). Egyetlen mutáció mindkettőt pirosra
  // vinné, és nem tudnánk, melyik oldalt mértük (R55/F02 · KUKA-039).

  { id: 'M56', rule: 'K04/K09', catcher: 'P-REV-suspension', expect: 'probe_fail',
    what: 'REV-N3a — A FELFÜGGESZTÉSI ÍRÁS ELHAGYÁSA: a válasz `suspended:true`, a tároló üres — '
      + 'pontosan az R67/F01 alakja (a siker-jelentés nem hatás)',
    file: 'adjudication.mjs',
    from: "      const res = store.run(\n"
      + "        `INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, lifted_at, lifted_by, reason)\n"
      + "         VALUES (?,?,?,?,NULL,NULL,?)`,\n"
      + "        subjectId, bookId, actorSubjectId, at, reason == null ? null : String(reason));\n"
      + "      return Object.freeze({\n"
      + "        ok: true, suspended: true, at, already_suspended: false,\n"
      + "        suspension_id: Number(res.lastInsertRowid),\n"
      + "      });",
    to: "      return Object.freeze({ ok: true, suspended: true, at, already_suspended: false, suspension_id: 0 });" },

  { id: 'M57', rule: 'K04/K09', catcher: 'P-REV-suspension', expect: 'probe_fail',
    what: 'REV-N3a — A JOGFELOLDÓ FELFÜGGESZTÉS-VAKSÁGA: a tény RÖGZÜL, de a `rightAt` nem kérdezi '
      + 'meg — a felfüggesztett alany továbbra is `allowed:true`-t kap',
    file: 'authz.mjs',
    from: "  const susp = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: at });\n  if (susp.suspended) {",
    to: "  const susp = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: at });\n  if (false) {" },

  { id: 'M58', rule: 'K05/K09', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — A DÖNTÉSI ÚTON RÉSZLETES LÉTEZÉSI HIBA: az `adjudicateClaim` a hatáskör-hiba '
      + 'NEVÉT adja vissza, tehát a válasz megmondja, hogy az ÜGY LÉTEZIK (KUKA-084 a csatornán)',
    file: 'adjudication.mjs',
    from: "  if (!out.authorized) return CLAIM_NOT_AVAILABLE;\n  return out.value;",
    to: "  if (!out.authorized) return Object.freeze({ ok: false, error: out.right.reason, message: out.right.message });\n  return out.value;" },

  { id: 'M59', rule: 'K05/K09', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — A BEADVÁNYTARTALOM ELVESZTÉSE: csak a lenyomat marad, az elbírálónak nincs mit '
      + 'elolvasnia (sha256-ból a panasz szövege nem áll vissza) — az R67/F03 alakja',
    file: 'adjudication.mjs',
    from: "    store.run('INSERT OR IGNORE INTO claim_content (claim_id, content) VALUES (?,?)',\n      id, String(statement == null ? '' : statement));",
    to: "    // a tartalom eldobva — csak a lenyomat marad" },

  { id: 'M60', rule: 'K05/K15', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3c — RÉSZLEGES ÁLLAPOT A MÁSODIK ÍRÁS HIBÁJA UTÁN: a tranzakció elhagyva, tehát a '
      + 'bukott beadás KVÓTA-SORT hagy maga után (a beadó kerete elfogy egy meg nem történt jelzésre)',
    file: 'adjudication.mjs',
    from: "  store.tx(() => {",
    to: "  ((fn) => fn())(() => {" },

  { id: 'M61', rule: 'K05/K15', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3c — AZ ELSŐDLEGES, SZERVER KÉPEZTE KULCS KIVÉTELE: a korlát megint CSAK a beadó '
      + 'saját hivatkozásán áll, amit ő szabadon átír — négy szöveg, négy „másik ember" (R67/F05)',
    file: 'adjudication.mjs',
    from: "  const byChannel = store.get(\n    'SELECT COUNT(*) AS n FROM claim_intake WHERE intake_key = ? AND submitted_at >= ?', intakeKey, since);",
    to: "  const byChannel = { n: 0 };" },

  // ——— R69 (a külső fél C-leletei) ———————————————————————————————————————————————————————
  { id: 'M62', rule: 'K05', catcher: 'P-REV-claim-decide', expect: 'probe_fail',
    what: 'C-F01/C-F02 — A „CSAK OLVASÁSKOR ELLENŐRIZ INTEGRITÁST" ALAK: az érdemi döntés megint nem '
      + 'kérdezi meg a beadvány állapotát, tehát sérült vagy hiányzó tartalom mellett is LEZÁRJA az '
      + 'ügyet (a külső fél kifejezetten kérte, hogy ezt a mutánst a mérő fogja meg)',
    file: 'adjudication.mjs',
    from: "      const evidence = claimEvidenceAt({ store, claimRow: row });\n"
      + "      if (!evidence.intact) {\n"
      + "        return Object.freeze({ ok: false, error: evidence.error, message: evidence.message });\n"
      + "      }\n"
      + "\n"
      + "      const state = decision === 'resolve' ? 'resolved' : 'under_review';",
    to: "      const state = decision === 'resolve' ? 'resolved' : 'under_review';" },

  { id: 'M63', rule: 'K05/K15', catcher: 'P-REV-claim-decide', expect: 'probe_fail',
    what: 'C-F03 — A MÁSODLAGOS KORLÁT MEGINT ÁTÉR MÁS CSATORNÁRA: a beadó által szabadon megadott '
      + 'hivatkozás újra GLOBÁLIS kulcs, tehát egy támadó a másik fél hivatkozásával elveheti annak '
      + 'a keretét a MÁSIK, független csatornán is',
    file: 'adjudication.mjs',
    from: "    'SELECT COUNT(*) AS n FROM claim_intake WHERE intake_key = ? AND claimant_ref = ? AND submitted_at >= ?',\n"
      + "    intakeKey, ref, since);",
    to: "    'SELECT COUNT(*) AS n FROM claim_intake WHERE claimant_ref = ? AND submitted_at >= ?',\n"
      + "    ref, since);" },

  { id: 'M64', rule: 'K05', catcher: 'P-REV-claim-decide', expect: 'probe_fail',
    what: 'C-F01 SORREND-ALAK: az integritás-vizsgálat a HATÁSKÖR ELÉ kerül, tehát az illetéktelen '
      + 'hívó a sérült ügyre nevezett hibát kap a semleges nemleges helyett — a különbség maga mondja '
      + 'meg, hogy az ügy létezik (KUKA-084)',
    file: 'adjudication.mjs',
    from: "  if (!row) return CLAIM_NOT_AVAILABLE;\n  // R77/F01 (SAJÁT KITERJESZTÉS",
    to: "  if (!row) return CLAIM_NOT_AVAILABLE;\n"
      + "  const early = claimEvidenceAt({ store, claimRow: row });\n"
      + "  if (!early.intact) return Object.freeze({ ok: false, error: early.error, message: early.message });\n"
      + "  // R77/F01 (SAJÁT KITERJESZTÉS" },

  // ═══ REV-N5 — A CÉLZOTT TILTÁS (R71 §8/1) ══════════════════════════════════════════════════
  //
  // A norma MAGA nevezi meg, mely visszabontásokat kell elkapni (req-3, 1–3. lépés). A két
  // hatókör-mutáció SZÁNDÉKOSAN ellentétes irányú: az egyik TÚL SOKAT tilt, a másik TÚL KEVESET —
  // együtt zárják ki azt, hogy a próba egy „mindent zárok" vagy egy „semmit sem zárok" alakkal is
  // teljesüljön (KUKA-092).
  { id: 'M65', rule: 'K09', catcher: 'P-REV-ban-scope', expect: 'probe_fail',
    what: 'REV-N5b — A FAJTA→HATÓKÖR LEKÉPEZÉS KIVÉTELE: minden tiltás mindenhol hat. Ez a KILÉPÉS '
      + 'esetét buktatja: a másik, FÜGGETLEN könyv joga is megszűnne, holott az oka nem érinti '
      + '(az R55 §7 korrekciója, amit épp ez a klauzula rögzít)',
    file: 'banScope.mjs',
    from: "  if (kind.discriminator === null) {\n"
      + "    return Object.freeze({ reaches: true, decidable: true, reason: 'ban_subject_wide' });\n"
      + "  }",
    to: "  if (kind.discriminator === null || true) {\n"
      + "    return Object.freeze({ reaches: true, decidable: true, reason: 'ban_subject_wide' });\n"
      + "  }" },
  { id: 'M66', rule: 'K09', catcher: 'P-REV-ban-scope', expect: 'probe_fail',
    what: 'REV-N5b — A HITELESÍTŐ-ÁG KÖNYVRE SZŰKÍTÉSE: a kompromittált hitelesítő csak azon a '
      + 'könyvön tiltana, ahol bejelentették. Ez a KOMPROMITTÁLÁS esetét buktatja — pedig ugyanazzal '
      + 'a hitelesítővel a másik könyvbe SEM szabad bejutni',
    file: 'banScope.mjs',
    from: "  ['credential', Object.freeze({\n    discriminator: 'credentialId',",
    to: "  ['credential', Object.freeze({\n    discriminator: 'bookId'," },
  { id: 'M67', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'REV-N5a — A FÉL ŐR: a tiltás-ellenőrzés kivétele a KÖZÖS döntésből (AUT-01). Ettől a '
      + 'hatásköri ÉS a kiadási út is tiltás nélkül marad, a tagsági úton viszont továbbra is hat — '
      + 'tehát a felületes mérés zöld maradna (KUKA-039). R75/F01 óta a horgony az `authority.mjs`, '
      + 'mert a döntés OTT él, nem az elbírálási útban',
    file: 'authority.mjs',
    from: "  const ban = banEffectiveAt({\n"
      + "    store, subjectId: who, nowIso, request: banRequestFor({ bookId, opClass: operation }, credentials),\n"
      + "  });\n"
      + "  if (ban.banned) {",
    to: "  const ban = Object.freeze({ banned: false, reason: 'not_banned' });\n"
      + "  if (ban.banned) {" },
  { id: 'M70', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'REV-N5a — A KIADÁS ROSSZ HATÁSKÖRT KÉR: a tiltás kiadása `suspend` felhatalmazásra '
      + 'hivatkozik, holott a célzott tiltás JOGVÁLTOZTATÁS (`alter_right`, REV-N3a). Az M67 a HATÁST '
      + 'méri, ez a JOGALAPOT. (R77 óta a kapu-kivétel a hívó oldalán nem fejezhető ki: a döntés EGY '
      + 'közös hatályosulási ponton áll — ott az M80/M82 méri.)',
    file: 'ban.mjs',
    from: "    { store, clock, subjectId: actor, bookId: book, operation: 'alter_right', credentials },",
    to: "    { store, clock, subjectId: actor, bookId: book, operation: 'suspend', credentials }," },
  { id: 'M71', rule: 'K09', catcher: 'P-REV-ban-scope', expect: 'probe_fail',
    what: 'REV-N5b — A BELÉPÉSI KONTEXTUS ÁTÍRJA A KÉRÉS TENGELYÉT: a `banRequestFor` visszatér az '
      + 'R73 előtti összefésülésre (`{...operation, ...credentials}`), ahol a KÉSŐBB szórt kontextus '
      + 'nyer. Ekkor egy `bookId: "book_b"`-t hozó hitelesített kontextus elmozdítja a tiltás '
      + 'TÁRGYÁT, és a `book_a`-ra szóló kérés átmegy a `book_a`-ra kimondott tiltás mellett. Ez az '
      + 'R73/C-F01–C-F02 lelete: a hatókör-szabály ép marad, csak a tárgya csúszik el',
    file: 'banScope.mjs',
    from: "export function banRequestFor(operation, credentials) {\n  const req = {};",
    to: "export function banRequestFor(operation, credentials) {\n"
      + "  return Object.freeze({ ...(operation || {}), ...(credentials || {}) });\n"
      + "  /* eslint-disable-next-line no-unreachable */\n"
      + "  const req = {};" },
  { id: 'M72', rule: 'K09', catcher: 'P-REV-ban-scope', expect: 'probe_fail',
    what: 'REV-N5b — AZ ÖNMAGÁNAK ELLENTMONDÓ REKORD „NINCS TILTÁS"-SÁ VÁLIK: az ok↔fajta '
      + 'ellentmondás ellenőrzése kiesik, tehát egy `left_company` okú (⇒ `book` fajtájú) sor '
      + '`credential` fajtával elkerüli a könyv-hatókört, és a kérés átmegy. Az ellentmondás nem a '
      + 'tiltás megszűnése — ez az R73/C-F05 lelete',
    file: 'banScope.mjs',
    from: "  if (expectedKind !== row.kind) {\n    return Object.freeze({\n      reason: 'ban_cause_kind_contradiction',",
    to: "  if (false) {\n    return Object.freeze({\n      reason: 'ban_cause_kind_contradiction'," },
  { id: 'M68', rule: 'K09', catcher: 'P-REV-ban-past', expect: 'probe_fail',
    what: 'REV-N5c — A TILTÁS TÖRLI A MÚLTAT: a tiltás kimondása a korábbi parancs-eseményeket is '
      + 'eltakarítja. A készlet/jog képe ettől „rendezettebb" lenne, a történet viszont hamis — a '
      + 'tiltás nem bizonyítja a korábbi műveletek érvénytelenségét',
    file: 'ban.mjs',
    from: "      store.run(\n"
      + "        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)\n"
      + "         VALUES (?,?,?,?,?,?)`,",
    to: "      store.run('DELETE FROM command_event WHERE actor = ?', subjectId);\n"
      + "      store.run(\n"
      + "        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)\n"
      + "         VALUES (?,?,?,?,?,?)`," },
  { id: 'M69', rule: 'K09', catcher: 'P-REV-ban-past', expect: 'probe_fail',
    what: 'REV-N5c — A TILTÁS MÁSOK JOGÁT IS ELVESZI: a tiltás a KÖNYV minden tagjára hat. Ez az '
      + 'ELLENPÁRT buktatja (a másik jogosult ugyanazt teheti) — a „biztonság kedvéért mindenkit '
      + 'zárok" alak épp az, amit a norma kizár',
    file: 'banScope.mjs',
    from: "  const rows = store.all('SELECT * FROM subject_ban WHERE subject_id = ? ORDER BY id', subjectId);",
    to: "  const rows = store.all('SELECT * FROM subject_ban ORDER BY id');" },

  // ═══ R75 — A SAJÁT R73-AS JAVÍTÁSOM ÖT LYUKA (F01–F05) ═════════════════════════════════════════
  //
  // MIÉRT KELL EZ AZ ÖT. Az R74-es jelentésemben „javítva"-nak írtam öt olyan pontot, amit SEMMI nem
  // mért: a próbák a régi viselkedést egyeztették, tehát a visszacsúszás ZÖLD maradt volna. A külső
  // fél ezt kimondta (R75 §8): *„a »mind a hét javítva és mindegyik falszifikálva« mondat csak a
  // pontosan megnevezett ellenpéldákra használható."* Ezért minden R75-ös javítás SAJÁT
  // falszifikációt kap — és mindegyik a JAVÍTÁS ELŐTTI alakot állítja vissza, nem egy általános
  // rombolást: így a mutáció azt méri, amit a javítás állít (KUKA-049).
  { id: 'M73', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'R75/F01 — A KIADÁSI ÚT MEGINT HARMADIK ENGEDŐ ÚTTÁ VÁLIK: a tiltás-kapu CSAK a jogot '
      + 'változtató műveletre esik ki (`alter_right`), minden más úton hat. Így a felületes mérés '
      + 'zöld: a tiltott alany a tagsági és az elbírálási úton zárva van — de TILTHAT. Pont ezt '
      + 'mérte meg a külső fél a saját R73-as javításomon',
    file: 'authority.mjs',
    from: "  if (ban.banned) {\n"
      + "    return {\n"
      + "      ok: false,\n"
      + "      reason: ban.reason,",
    to: "  if (ban.banned && operation !== 'alter_right') {\n"
      + "    return {\n"
      + "      ok: false,\n"
      + "      reason: ban.reason," },

  { id: 'M74', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'R75/F02 — A MŰVELET-TILTÁS ELVESZTI A KÖNYVÉT: a tárolt cél újra a CSUPASZ művelet-név, '
      + 'tehát egy A könyvre szóló hatáskörből kiadott tiltás a FÜGGETLEN B könyvben is zár. A '
      + '`BOOK_SCOPED_KINDS` lista NEVE változatlanul azt ígéri, hogy könyv-hatókörű — a rekord '
      + 'viszont nem hordozza (KUKA-015: a név nem korlátoz)',
    file: 'ban.mjs',
    from: "      const storedTarget = kind === 'operation'\n"
      + "        ? operationScopeRef(book, said(targetRef))\n"
      + "        : (shape.discriminator === null ? null : said(targetRef));",
    to: "      const storedTarget = shape.discriminator === null ? null : said(targetRef);" },

  { id: 'M75', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'R75/F03 — A GYENGÉBB SZERZŐDÉSŰ ÍRÓ VISSZATÉR: az `imposeBan` megint saját, alacsony '
      + 'szintű író, ami a hatókör-kaput (`ban_target_outside_authority`) megkerüli — a hatáskört '
      + 'ellenőrzi, a CÉLT nem. Ez az a megkerülés, amit a külső fél a MAI kódon talált, és amire a '
      + 'válasz nem lehet komment (KUKA-015: „a komment nem hozzáférésvédelem")',
    file: 'ban.mjs',
    from: "export const imposeBan = issueBan;",
    to: "export function imposeBan({ store, clock, subjectId, cause, targetRef, actorSubjectId, bookId, credentials }) {\n  const actor = said(actorSubjectId);\n  const out = effectuate(\n    { store, clock, subjectId: actor, bookId: said(bookId), operation: 'alter_right', credentials },\n    ({ at }) => {\n      const kind = kindForCause(cause);\n      if (!kind) return Object.freeze({ ok: false, reason: 'ban_cause_unknown', message: 'ismeretlen ok' });\n      store.run(\n        `INSERT INTO subject_ban (subject_id, kind, cause, target_ref, actor_subject_id, banned_at)\n         VALUES (?,?,?,?,?,?)`,\n        subjectId, kind, cause, said(targetRef) || null, actor, at);\n      return Object.freeze({ ok: true, kind, cause, target_ref: said(targetRef) || null, banned_at: at });\n    });\n  if (!out.authorized) return Object.freeze({ ok: false, reason: out.right.reason, message: out.right.message });\n  return out.value;\n}" },

  { id: 'M76', rule: 'K09', catcher: 'P-REV-ban-scope', expect: 'probe_fail',
    what: 'R75/F04 — AZ ISMERETLEN TÁROLT OK ÚJRA ELNYELŐDIK: a hiányzó leképezést a rekord SAJÁT '
      + 'fajtája pótolja, tehát az ellentmondás-vizsgálat önmagával hasonlít össze és SOHA nem '
      + 'talál eltérést. Egy importált vagy sérült `cause` mellett a hatókör-értékelés lefut, és a '
      + 'kérés ENGEDÉLYT kaphat — pedig a sor VALÓDI hatóköre épp az, amit nem tudunk (KUKA-124/2: '
      + 'a hiány KÜLÖN válasz, nem a rossz érték ága)',
    file: 'banScope.mjs',
    from: "  const expectedKind = kindForCause(row?.cause);\n  if (!expectedKind) {",
    to: "  const expectedKind = kindForCause(row?.cause) || row?.kind;\n  if (!expectedKind) {" },

  { id: 'M77', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'R75/F05 — A KONTEXTUS MEGINT ELVÉSZ EGY HÍVÓN: a `readClaim` a belépési kontextus NÉLKÜL '
      + 'kérdezi a jogot. Ettől a hitelesítő-hatókörű tiltás ezen az úton NEM DÖNTHETŐ, és a kapu '
      + 'ZÁR — vagyis az ÉRVÉNYES MÁSIK hitelesítővel érkező jogos munka is elakad. (Ez a C-F04 '
      + 'pontos iránya: a hiba nem az volt, hogy a tiltott hitelesítő átment, hanem hogy a jogos '
      + 'sem jutott át.) A javítás fél marad, amíg egyetlen hívó is a régi alakkal hív (KUKA-039)',
    file: 'adjudication.mjs',
    from: "    store, subjectId: viewerSubjectId, bookId: row.book_id, operation: 'adjudicate', clock, credentials,\n  });",
    to: "    store, subjectId: viewerSubjectId, bookId: row.book_id, operation: 'adjudicate', clock,\n  });" },

  { id: 'M78', rule: 'K09', catcher: 'P-REV-ban-matrix', expect: 'probe_fail',
    what: 'R75 §8 — A MÁTRIX HATÓKÖRE LISTA LESZ, NEM SZABÁLY: a zárt halmaz új fajtát kap, amihez '
      + 'a mátrixnak nincs cellája. Ha a próba a saját, LEMÁSOLT fajta-listáján dolgozna, ez ZÖLD '
      + 'maradna — a nem mért fajta nem „ismeretlen állapotú", hanem ZÖLDNEK LÁTSZIK (KUKA-051). '
      + 'Ez a mutáció azt méri, hogy a mátrix tényleg a RENDSZER halmazát kérdezi',
    file: 'banScope.mjs',
    from: "  ['data_scope', Object.freeze({\n    discriminator: 'dataScope',",
    to: "  ['device', Object.freeze({\n    discriminator: 'deviceId',\n"
      + "    meaning: 'EGY eszköz tiltott',\n"
      + "  })],\n"
      + "  ['data_scope', Object.freeze({\n    discriminator: 'dataScope'," },

  { id: 'M79', rule: 'K09', catcher: 'P-REV-ban-matrix', expect: 'probe_fail',
    what: 'R75/F02 A LÁNC MÁSIK VÉGÉN (KUKA-129): az ÍRÓ továbbra is könyvvel együtt tárolja a '
      + 'művelet-tiltás célját, az OLVASÓ viszont mindent GLOBÁLISNAK értelmez — a könyv-fél némán '
      + 'elvész, és a független könyvben is zár. Az M74 a KIADÁST méri, ez az ÉRTELMEZÉST: egy '
      + 'szabályt ott is meg kell fogni, ahol az érték SZÜLETIK, és ott is, ahol BEFOGADJÁK',
    file: 'banScope.mjs',
    from: "  return Object.freeze({ bookId, opClass, global: false, malformed: null });",
    to: "  return Object.freeze({ bookId, opClass, global: true, malformed: null });" },

  // R77 — A KÜLSŐ FÉL HÁROM ÚJ HATÁRA, MINDEGYIK SAJÁT FALSZIFIKÁLÓVAL.
  //
  // A KUKA-139 SZŰKÍTVE (a külső fél R77 §7 kérése): a TÚLÉLŐ mutáció nem bizonyítja, hogy a sor
  // végre sem hajtódott — okozhatja GYENGE ÁLLÍTÁS vagy EGYENÉRTÉKŰ mutáció is. Ezért az alábbiakat
  // egyenként MÉRTEM a javított kódon, és ahol a szándékolt visszacsúszás egyenértékűnek bizonyult
  // (a másik oldal ugyanazt a választ adta), ott NEM írtam mutációt, hanem a PRÓBÁT élesítettem.

  { id: 'M80', rule: 'K04', catcher: 'P-REV-effectuation', expect: 'probe_fail',
    what: 'R77/F01 — A HATÁLYOSULÁSI DÖNTÉS KIVÉVE: marad a bebocsátás, és a tranzakción belül már '
      + 'senki nem kérdez jogot. Ez a JAVÍTÁS ELŐTTI alak: a döntés a kérés pillanatában dől el, a '
      + 'rögzített hatás viszont egy KÉSŐBBI órán — így lejárt felhatalmazással is születik hatás',
    file: 'authority.mjs',
    from: "    const at = clock.now();\n"
      + "    const right = decide(at);\n"
      + "    if (!right.ok) return Object.freeze({ authorized: false, at: null, right, basis, stage: 'effectuation' });\n"
      + "    return Object.freeze({ authorized: true, at, right, basis, value: effect({ at, right }) });",
    to: "    const at = clock.now();\n"
      + "    return Object.freeze({ authorized: true, at, right: admission, basis, value: effect({ at, right: admission }) });" },

  { id: 'M81', rule: 'K04', catcher: 'P-REV-effectuation', expect: 'probe_fail',
    what: 'R77/F01 A FINOMABB ALAK: a hatályosulási döntés MEGMARAD, de a rögzített hatás ideje egy '
      + 'ÚJABB óraolvasásból jön. A döntés így ép, a BÉLYEG mégis olyan pillanatot visel, amit senki '
      + 'nem mért — pontosan a KUKA-002 az idő tengelyén, csak eggyel odébb tolva',
    file: 'authority.mjs',
    from: "    return Object.freeze({ authorized: true, at, right, basis, value: effect({ at, right }) });",
    to: "    return Object.freeze({ authorized: true, at, right, basis, value: effect({ at: clock.now(), right }) });" },

  { id: 'M82', rule: 'K04', catcher: 'P-REV-effectuation', expect: 'probe_fail',
    what: 'R77/F01 — A HATÁLYOSULÁS A BEBOCSÁTÁS ÍTÉLETÉT ÚJRAHASZNÁLJA. A kód alakja megmarad (van '
      + '„tranzakción belüli döntés"), csak épp a KORÁBBI pillanat jogát viszi tovább: a látszat ép, '
      + 'a tény nem — ez a KUKA-088 („melyik ellenőrzést fagyasztottam be?") alakja a hatáskörön',
    file: 'authority.mjs',
    from: "    const right = decide(at);\n"
      + "    if (!right.ok) return Object.freeze({ authorized: false, at: null, right, basis, stage: 'effectuation' });",
    to: "    const right = admission;\n"
      + "    if (!right.ok) return Object.freeze({ authorized: false, at: null, right, basis, stage: 'effectuation' });" },

  { id: 'M83', rule: 'K09', catcher: 'P-REV-ban-record-shape', expect: 'probe_fail',
    what: 'R77/F03 — AZ ÜRES KÖNYV-TENGELY ÚJRA SZABÁLYOS ALAK. A feloldó nem jelöli hibásnak, ezért '
      + 'a hatókör-értékelés a kérés könyvéhez hasonlítja, nem egyezik, és „másik könyv" címen '
      + 'TOVÁBBENGEDI a kérést: az érvénytelen tiltás úgy viselkedik, mint egy érvényes',
    file: 'banScope.mjs',
    from: "  if (!bookId) return Object.freeze({ bookId: null, opClass, global: false, malformed: 'book_axis_empty' });",
    to: "  if (!bookId) return Object.freeze({ bookId: null, opClass, global: false, malformed: null });" },

  { id: 'M84', rule: 'K09', catcher: 'P-REV-ban-record-shape', expect: 'probe_fail',
    what: 'R77/F03 A FÉL ŐR (KUKA-039): az integritás-kapu megmarad, de a KÖZVETLEN hívó '
      + '(`banReaches`) már nem kérdezi meg a cél szerkezetét. A `banEffectiveAt` úton semmi nem '
      + 'változik — épp ezért veszélyes: a próba/szerszám MÁS valóságot mérne, mint a felhasználó',
    file: 'banScope.mjs',
    from: "    const malformed = operationScopeProblem(target);\n"
      + "    if (malformed) {\n"
      + "      return Object.freeze({ reaches: true, decidable: false, reason: malformed.reason, message: malformed.message });\n"
      + "    }\n",
    to: "" },

  { id: 'M85', rule: 'K05', catcher: 'P-REV-result-scope', expect: 'probe_fail',
    what: 'R77/F02 — A KIADÁS ÚJRA A KÉRŐ CÍMKÉJÉT MÉRI. A mért adatkör nem írja felül a kérés '
      + '`dataScope` tengelyét, tehát az `arak`-ra tiltott olvasó `keszlet` címkével megint megkapja '
      + 'az ármezőt. Amit a kérő begépelhet, az ÁLLÍTÁS, nem mérés (KUKA-121)',
    // A KÓDHELY KÖLTÖZÖTT (R47/RSB-01): a tiltás-kérdés a KÖZÖS döntés-feloldóba került. A mutáció
    // TÁRGYA változatlan — ugyanaz a kár, ugyanaz az elkapó —, csak a horgony követi a kódot. A régi
    // horgony `STALE_ANCHOR`-ként PIROSRA vitte a battériát: a mérés megmondta, hogy elmozdult alattunk.
    file: 'releaseScope.mjs',
    from: "    request: { ...(request && typeof request === 'object' ? request : {}), dataScope: scope },",
    to: "    request: { ...(request && typeof request === 'object' ? request : {}) }," },

  { id: 'M86', rule: 'K05', catcher: 'P-REV-result-scope', expect: 'probe_fail',
    what: 'R77/F02 — A BE NEM SOROLT MEZŐ „KORLÁTOZÁS NÉLKÜLI" LESZ. A deklarációból hiányzó mező '
      + 'némán átcsúszik, tehát egy új, ismeretlen jelentésű eredmény-mező mindenkinek kimegy: a '
      + 'HIÁNY nem lehet ugyanaz a válasz, mint az „engedélyezett" (KUKA-124/2)',
    file: 'resultScope.mjs',
    from: "      const sub = spec.fields.get(key);\n"
      + "      if (!sub) {\n"
      + "        return {\n"
      + "          ok: false,\n"
      + "          reason: 'result_scope_field_undeclared',",
    to: "      const sub = spec.fields.get(key);\n"
      + "      if (!sub) continue;\n"
      + "      if (false) {\n"
      + "        return {\n"
      + "          ok: false,\n"
      + "          reason: 'result_scope_field_undeclared'," },

  { id: 'M87', rule: 'K05', catcher: 'P-REV-result-scope', expect: 'probe_fail',
    what: 'R77/F02 — AZ ISMERETLEN TÍPUS ELNYELVE A MEZŐ-HIÁNYBA. A két diagnózis összemosódik: a '
      + '„nincs deklarálva ez a típus" a „van egy be nem sorolt mező" nevét kapja, és a beadó a rossz '
      + 'dolgot javítja. A rossz nevű hibaüzenet elfedi az igazit (KUKA-124 · KUKA-028)',
    file: 'resultScope.mjs',
    from: "  const shape = RESULT_SHAPES.get(declKey(type, typeVersion));\n  if (!shape) {",
    to: "  const shape = RESULT_SHAPES.get(declKey(type, typeVersion)) || objectOf({});\n  if (!shape) {" },

  { id: 'M88', rule: 'K09', catcher: 'P-REV-ban-paths', expect: 'probe_fail',
    what: 'REV-N5a — A HATÁSKÖR TELJES KIVÉTELE: a hatályosulási pont MINDKÉT döntése elesik '
      + '(bebocsátás ÉS hatályosulás), tehát bárki tilthatna bárkit. Ez NEM az M80/M82 ismétlése: '
      + 'azok a bebocsátást MEGHAGYJÁK, és csak az idő-rést nyitják ki — a hatáskör NÉLKÜLI eljárót '
      + 'továbbra is elutasítják. Két szerkesztés kell hozzá, mert a védelem KÉT rétegű, és egyetlen '
      + 'réteg elvétele még nem viszi pirosra a próbát (KUKA-039)',
    file: 'authority.mjs',
    edits: [
      { from: "  const admission = decide(clock.now());\n"
          + "  if (!admission.ok) {\n"
          + "    return Object.freeze({ authorized: false, at: null, right: admission, basis, stage: 'admission' });\n"
          + "  }",
        to: "  const admission = { ok: true, granted_at: clock.now() };" },
      { from: "    const right = decide(at);\n"
          + "    if (!right.ok) return Object.freeze({ authorized: false, at: null, right, basis, stage: 'effectuation' });",
        to: "    const right = { ok: true, granted_at: at };" },
    ] },

  // ── R79 — A KÜLSŐ TÁRGYALÓ FÉL HÁROM ÚJ HATÁRA, MINDEGYIK SAJÁT FALSZIFIKÁLÓVAL ────────────────
  //
  // A javítás akkor kész, ha a HIÁNYA bizonyítottan pirosra vált (KUKA-092). Mindegyik alább egyetlen
  // szerkesztés, ami PONTOSAN azt a viselkedést állítja vissza, amit a külső fél mért.

  { id: 'M89', rule: 'K05', catcher: 'P-REV-result-shape', expect: 'probe_fail',
    what: 'R79/F01 — A BESOROLÁS MEGÁLL A GYÖKÉRNÉL: a tömb ELEMEIT senki nem járja be, tehát a '
      + '`lines` mező saját címkéje fedi az EGÉSZ részfát, és a beágyazott ár besorolás nélkül megy ki. '
      + 'Ez a JAVÍTÁS ELŐTTI alak: a mezőnév-lista lapos volt, a mélység nem számított',
    file: 'resultScope.mjs',
    from: "      const r = walk(spec.of, value[i], `${path}[${i}]`, scopes);\n      if (!r.ok) return r;",
    to: "" },

  { id: 'M90', rule: 'K05', catcher: 'P-REV-result-shape', expect: 'probe_fail',
    what: 'R79/F01 MÁSIK FELE — A LEVÉL TÍPUSA NEM SZÁMÍT: a `qty` helyére csomagolt objektum '
      + 'mennyiségnek minősül, és a benne rejtett ár a `keszlet` címkét viszi magával. A deklaráció '
      + 'LÉTEZÉSE nem bizonyítja, hogy a tartalmat mértük is (KUKA-038)',
    file: 'resultScope.mjs',
    from: "  if (spec.kind === 'number' && (t !== 'number' || !Number.isFinite(value))) {\n"
      + "    return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'véges számot vártunk' };\n"
      + "  }",
    to: "  if (false) {\n    return { ok: false, reason: 'result_shape_type_mismatch', at: path, detail: 'véges számot vártunk' };\n  }" },

  { id: 'M91', rule: 'K04/K07', catcher: 'P-CMD-effectuation', expect: 'probe_fail',
    what: 'R79/F02 — A PARANCS IDŐBÉLYEGE ÚJABB ÓRAOLVASÁSBÓL: a hatályosulási döntés ép marad, de a '
      + 'rögzített `finalized_at` olyan pillanatot visel, amit senki nem mért. Pontosan a KUKA-002 az '
      + 'idő tengelyén — és ez a JAVÍTÁS ELŐTTI alak a parancs-oldalon',
    file: 'command.mjs',
    from: "      resolvedJson, effectId, 'finalized', at);",
    to: "      resolvedJson, effectId, 'finalized', clock.now());" },

  { id: 'M92', rule: 'K05/K07', catcher: 'P-CMD-effectuation', expect: 'probe_fail',
    what: 'R79/F02 — A NYUGTA SAJÁT ÓRÁT OLVAS: a hatás és a nyugta KÉT KÜLÖNBÖZŐ pillanatot visel, '
      + 'holott egyetlen hatályosulási pont van. A nyugta megvan, csak nem ugyanarról az eseményről '
      + 'beszél — a két sor némán szétcsúszik (KUKA-002)',
    file: 'command.mjs',
    from: "    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock, at });",
    to: "    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock });" },

  { id: 'M93', rule: 'K07/K15', catcher: 'P-CMD-effectuation', expect: 'probe_fail',
    what: 'R79/F02 — AZ ELUTASÍTÁS ELÁRULJA A SZAKASZT: a válasz megmondja, hogy a kérés a '
      + 'bebocsátáson vagy a hatályosuláson bukott el. A szakasz maga is csatorna: a kérő abból tudja '
      + 'meg, MIKOR szűnt meg a joga (KUKA-084 — a kijárat nem HELY, hanem CSATORNA)',
    file: 'command.mjs',
    // R81 ÚJRAHORGONYZÁS (a SAJÁT söprésem lelete). A kiadási út is `effectuateWith`-re állt
    // (R81/F04), tehát ez a sor KÉT helyen áll a fájlban — a puszta sor mint horgony nem mondja
    // meg, MELYIKET mérjük. A horgony ezért a fölötte álló, EGYEDI megjegyzés-sorral együtt megy.
    from: "  // meg, MELYIK szakaszon állt meg — a szakasz maga is csatorna lenne (KUKA-084).\n"
      + "  return out.authorized ? out.value : refused;",
    to: "  // meg, MELYIK szakaszon állt meg — a szakasz maga is csatorna lenne (KUKA-084).\n"
      + "  return out.authorized ? out.value : Object.freeze({ ok: false, error: 'not_authorized', stage: out.stage });" },

  { id: 'M94', rule: 'K09/K15', catcher: 'P-REV-entry-points', expect: 'probe_fail',
    what: 'R79/F03 — A MEGVONÁS ÚTJA MEGINT ELDOBJA A HITELES KONTEXTUST: a hatáskör-ellenőrzés fut, '
      + 'de a hitelesítő nélkül — tehát a tiltott hitelesítővel belépő eljáró megvonhat egy tagságot. '
      + 'Ez a FÉL ŐR (KUKA-039): a többi négy író út zárva marad, ezért összesítve minden zöldnek '
      + 'látszana — pont ezért kell belépési pontonként mérni',
    file: 'authz.mjs',
    from: "    { store, clock, subjectId: actorSubjectId, bookId, operation: 'alter_right', credentials },",
    to: "    { store, clock, subjectId: actorSubjectId, bookId, operation: 'alter_right' }," },

  { id: 'M95', rule: 'K09/K15', catcher: 'P-REV-entry-points', expect: 'probe_fail',
    what: 'R79/F03 ELLENPÁRJA — A SEMLEGES ÚT MEGSZÓLAL: a bejelentés-elbírálás elutasítása megmondja, '
      + 'MIÉRT nem járható. Ettől a válasz megkülönböztethető lesz attól, amikor egyszerűen nincs mit '
      + 'elbírálni — és a különbség maga hordozza a védett tényt (KUKA-084 · R67/F02)',
    file: 'adjudication.mjs',
    from: "  if (!out.authorized) return CLAIM_NOT_AVAILABLE;",
    to: "  if (!out.authorized) return Object.freeze({ ok: false, error: 'not_available', reason: out.right?.reason ?? null });" },

  // ── R81/F04 — A KIADÁSI ÚT HÁROM FOGYASZTÓJA, EGYENKÉNT VISSZACSÚSZTATVA ─────────────────────
  //
  // MIÉRT HÁROM. A lelet egyetlen mondatban áll („a jogellenőrzés, az adatkör-ellenőrzés és a
  // disclosure időpontja külön óraolvasás"), de a javítás HÁROM fogyasztót köt egy `at`-hoz. Ha egy
  // közös mutációval mérnénk, két darab néma kivétele nem látszana (KUKA-039: a fél őr). Ezért
  // mindegyikhez SAJÁT visszacsúszás tartozik, és a próba LÉPCSŐS órás ágai (f)/(g) választják el
  // őket — a HATÁRHOZ kötött órán ugyanis mindhárom alak ugyanazt adná (KUKA-139).
  { id: 'M96', rule: 'K05/K07', catcher: 'P-CMD-release-effectuation', expect: 'probe_fail',
    what: 'R81/F04 — AZ ADATKÖR-KAPU MEGINT SAJÁT ÓRÁT OLVAS: a kiadandó tartalom adatköreit egy '
      + 'KÉSŐBBI pillanaton méri, mint amelyen a jog állt. Így egy KÉSŐBB hatályossá váló adatkör-'
      + 'tiltás visszamenőleg elzár egy olyan kiadást, amely a döntés pillanatában jogos volt — és '
      + 'fordítva is elcsúszhat (KUKA-024: a VISZONYT kell mérni, nem az oldalakat)',
    // A HORGONY KÖVETI A KÓDOT (R47): a kapu mostantól a KÖNYVET és a TUDÁS-pontot is megkapja
    // (RSB-01). A mutáció TÁRGYA változatlan — a kapu MÁSIK órán mér, mint amelyen a jog állt.
    file: 'command.mjs',
    from: "      store, subjectId: requester, bookId: cmd.book_id, nowIso: at, knownAt: at,\n      type: cmd.type, typeVersion: cmd.type_version, result: resolved,",
    to: "      store, subjectId: requester, bookId: cmd.book_id, nowIso: clock.now(), knownAt: clock.now(),\n      type: cmd.type, typeVersion: cmd.type_version, result: resolved," },

  { id: 'M97', rule: 'K05/K07', catcher: 'P-CMD-release-effectuation', expect: 'probe_fail',
    what: 'R81/F04 — A KIADÁSI LELTÁR MEGINT KÉSŐBBI ÓRÁT VISEL: a `disclose` nem kapja meg a döntési '
      + 'pillanatot, ezért a saját `clock.now()`-jára esik vissza. A sor olyan időpontot hordoz, '
      + 'amelyen a `rightAt` már megtagadná a jogot — pontosan az az alak, amit a külső fél mért '
      + '(`disclosure.at = 08:00:02`, a jog 08:00:01-kor szűnt meg)',
    file: 'command.mjs',
    from: "      store, kind: 'command_result', scope: cmd.book_id, ref: commandRef(cmd), recipient: requester, clock, at,",
    to: "      store, kind: 'command_result', scope: cmd.book_id, ref: commandRef(cmd), recipient: requester, clock," },

  { id: 'M98', rule: 'K05/K07', catcher: 'P-CMD-release-effectuation', expect: 'probe_fail',
    what: 'R81/F04 — A HATÁLYOSULÁSI PONT DÖNTÉSE ELDOBJA A KAPOTT PILLANATOT, és a saját óráját '
      + 'olvassa. A `decide` így MÁS időponton felel, mint amit a hatás (a leltár-sor) visel: a '
      + 'kettő között megszűnő tagság vagy tiltás mellett a két válasz ellentmond egymásnak',
    file: 'command.mjs',
    from: "    decide: (nowIso) => (mayRelease(cmd.book_id, nowIso)",
    to: "    decide: () => (mayRelease(cmd.book_id, clock.now())" },

  { id: 'M99', rule: 'K05/K07', catcher: 'P-CMD-release-effectuation', expect: 'probe_fail',
    what: 'R81/F04 ELLENPÁRJA — A KIADÁS ELUTASÍTÁSA MEGSZÓLAL: a válasz megmondja, MELYIK '
      + 'szakaszon állt meg (bebocsátás vagy hatályosulás). Ettől a HATÁRON elbukó kérő válasza '
      + 'megkülönböztethető lesz attól, akinek már a hívás pillanatában sincs joga — és a különbség '
      + 'maga hordozza a védett tényt: hogy a parancs LÉTEZIK, és hogy a jog KÖZBEN szűnt meg '
      + '(KUKA-084: a kijárat nem HELY, hanem CSATORNA)',
    file: 'command.mjs',
    from: "    if (!releasableScope.releasable) return refused;\n    return Object.freeze(disclose({",
    to: "    if (!releasableScope.releasable) return Object.freeze({ ...refused, error: 'data_scope_denied' });\n    return Object.freeze(disclose({" },

  // ── R83 §7 — REV-N2a/b: A KÉT IDŐ-TENGELY ÉS A FELÜLVIZSGÁLATI KÖR (BIT-01) ──────────────────
  //
  // MINDEN DEKLARÁLT ÁLLÍTÁSNAK SAJÁT FALSZIFIKÁLÓJA VAN. A `req-4` feltétele nem az, hogy a
  // klauzulának „van mutációja", hanem hogy a SAJÁT deklarált állítását buktassa meg egy-egy
  // nevezett visszacsúszás (R60 óta ez a bővítés kimondott feltétele — KUKA-045). Nyolc állítás,
  // nyolc mutáció; a fedést a `failed_assertions` lista dönti el, nem a mutáció neve (R55/F03).

  { id: 'M100', rule: 'K08', catcher: 'P-REV-bitemporal', expect: 'probe_fail',
    what: 'REV-N2a — A TUDÁS TENGELYE ELTŰNIK: a lekérdezés a KÉSŐBB rögzített eseményt is '
      + 'figyelembe veszi, amikor a MÚLTBELI tudás-állapotot kérdezik. Ettől a márciusi kép '
      + 'visszamenőleg átíródik: a rendszer azt állítaná, hogy márciusban is tudtuk, amit csak '
      + 'júniusban tudtunk meg (KUKA-002: a két tengely egy oszlopra csúszik vissza)',
    file: 'bitemporal.mjs',
    from: '    if (rec.ms > known.ms) continue;     // ezt akkor még nem tudtuk',
    to: '    if (false) continue;     // ezt akkor még nem tudtuk' },

  { id: 'M101', rule: 'K08', catcher: 'P-REV-bitemporal', expect: 'probe_fail',
    what: 'REV-N2a — A HATÁLY TENGELYE ELTŰNIK AZ ÍRÁSNÁL: a helyesbítés a MAI időpontot rögzíti '
      + 'hatályként is, tehát a visszamenőleges érvénytelenség csak „mától" szól. A mai kép így '
      + 'NEM tükrözi a helyesbítést a múltra nézve — a két tengely egyetlen pillanatba olvad',
    file: 'bitemporal.mjs',
    // ÚJRAHORGONYZVA (R85): az R85/F02 javítás a bizonyítékot és az eljárót is az ESEMÉNYRE teszi,
    // ezért ez a sor megváltozott. A mutáció SZÁNDÉKA változatlan (a hatály helyére a mai időpont
    // kerül); a STALE_ANCHOR őr fogta meg, hogy a régi horgony már nem létezik.
    from: '        subjectId, bookId, at, effectiveAt, m.revoked_at ?? null, RETROACTIVE_TRANSITION,',
    to: '        subjectId, bookId, at, at, m.revoked_at ?? null, RETROACTIVE_TRANSITION,' },

  { id: 'M102', rule: 'K08', catcher: 'P-REV-bitemporal', expect: 'probe_fail',
    what: 'REV-N2a — A HATÁLY TENGELYE ELTŰNIK AZ OLVASÁSNÁL: a lekérdezés minden ismert eseményt '
      + 'alkalmaz, akkor is, ha a hatálya a kérdezett nap UTÁN kezdődik. Ettől egy JÖVŐBELI hatályú '
      + 'helyesbítés visszamenőleg elvenné a mai jogot (KUKA-049: az ellenpár nélkül a szabály nem '
      + 'a két tengelyt mérné, csak azt, hogy „van-e esemény")',
    file: 'bitemporal.mjs',
    from: '    if (eff.ms > valid.ms) continue;     // erre a napra még nem hatályos',
    to: '    if (false) continue;     // erre a napra még nem hatályos' },

  { id: 'M103', rule: 'K08', catcher: 'P-REV-bitemporal', expect: 'probe_fail',
    what: 'REV-N2a — A BIZONYÍTÉK-KÖVETELMÉNY ELTŰNIK: a visszamenőleges érvénytelenség '
      + 'megnevezett bizonyíték NÉLKÜL is rögzíthető. Ettől a helyesbítés nem helyesbítés, hanem a '
      + 'múlt szabad átírása — a K08 pont ezt tiltja',
    file: 'bitemporal.mjs',
    from: "      if (typeof evidenceRef !== 'string' || !evidenceRef.trim()) {",
    to: '      if (false) {' },

  { id: 'M104', rule: 'K08/K09', catcher: 'P-REV-review-circle', expect: 'probe_fail',
    what: 'REV-N2b — A KÖR ÜRESEN SZÜLETIK: a számított tagságot senki nem írja be, tehát a kör '
      + 'LÉTEZIK, de nem mond meg semmit. A díszpipa alakja a felülvizsgálaton (KUKA-041)',
    file: 'bitemporal.mjs',
    from: '  for (const m of circle.members) {',
    to: '  for (const m of []) {' },

  { id: 'M105', rule: 'K08/K09', catcher: 'P-REV-review-circle', expect: 'probe_fail',
    what: 'REV-N2b — A HELYESBÍTÉS ÁTÍRJA AZ EREDETI TÖRTÉNETET: a kör megnyitása a parancs sorát '
      + 'is átállítja („felülvizsgálat alatt"). Ettől a múlt rekordja megváltozik — a REV-N1b '
      + 'tartalmi mércéje szerint ez a történet átírása, nem a felülvizsgálat',
    file: 'bitemporal.mjs',
    from: "      'INSERT INTO review_circle_member (circle_id, book_id, actor, idem_key, finalized_at) VALUES (?,?,?,?,?)',\n      id, m.book_id, m.actor, m.idem_key, m.finalized_at);",
    to: "      'INSERT INTO review_circle_member (circle_id, book_id, actor, idem_key, finalized_at) VALUES (?,?,?,?,?)',\n      id, m.book_id, m.actor, m.idem_key, m.finalized_at);\n    store.run('UPDATE command SET state = ? WHERE book_id = ? AND actor = ? AND idem_key = ?',\n      'under_review', m.book_id, m.actor, m.idem_key);" },

  { id: 'M106', rule: 'K08/K09', catcher: 'P-REV-review-circle', expect: 'probe_fail',
    what: 'REV-N2b — A KÖR MINDENT BEVESZ: az időablak-szűrő elmarad, tehát a hatály ELŐTTI '
      + 'műveletek is felülvizsgálat alá kerülnek. A „biztonság kedvéért mindent" alak: a valódi '
      + 'érintetteket elrejti a zajban (KUKA-092 rokona)',
    file: 'bitemporal.mjs',
    from: '    return f.ok && f.ms >= from.ms && f.ms < to.ms;',
    to: '    return f.ok;' },

  { id: 'M107', rule: 'K08/K09', catcher: 'P-REV-review-circle', expect: 'probe_fail',
    what: 'REV-N2b — A LEZÁRÁS ÖNMAGÁVAL EGYEZIK: a hatáskör-kapu nem a HÍVÓT kérdezi, hanem a kört '
      + 'megnyitó eljárót — akinek a joga értelemszerűen megvolt. Ettől bárki lezárhatja a kört, és '
      + 'a kapu mégis „ellenőrzöttnek" látszik (KUKA-121: az önmagával való egyezés nem mérés)',
    file: 'bitemporal.mjs',
    from: "    { store, clock, subjectId: actorSubjectId, bookId: c.book_id, operation: 'adjudicate', credentials },",
    to: "    { store, clock, subjectId: c.opened_by, bookId: c.book_id, operation: 'adjudicate', credentials }," },

  // ── R85 — A KÜLSŐ FÉL KÉT ELLENPÉLDÁJÁRA ADOTT SAJÁT FALSZIFIKÁCIÓ ─────────────────────────
  // A javítás önmagában nem bizonyíték: azt kell megmutatni, hogy a VISSZACSÚSZÁS PIROSRA viszi a
  // próbát. Nyolc mutáció — négy a tagságadás két tengelyére, négy a bizonyíték otthonára.

  { id: 'M108', rule: 'K08', catcher: 'P-REV-grant-axis', expect: 'probe_fail',
    what: 'REV-N2a — A TAGSÁGADÁS TUDÁS-TENGELYE ELTŰNIK: a feloldó a KÉSŐBB rögzített jogszerzést '
      + 'is figyelembe veszi a MÚLTBELI tudás-állapot kérdezésekor. Pontosan a külső fél R85/F01 '
      + 'lelete: a júniusi beváltás visszamenőleg átírja a márciusi képet',
    file: 'bitemporal.mjs',
    from: '    if (rec.ms > known.ms) continue;           // ezt akkor még nem tudtuk',
    to: '    if (false) continue;           // ezt akkor meg nem tudtuk' },

  { id: 'M109', rule: 'K08', catcher: 'P-REV-grant-axis', expect: 'probe_fail',
    what: 'REV-N2a — A TAGSÁGADÁS HATÁLY-TENGELYE ELTŰNIK: egy JÖVŐBELI hatályú jogszerzés már a '
      + 'rögzítés napján jogot adna. Ellenpár nélkül a szabály nem a két tengelyt mérné, csak azt, '
      + 'hogy van-e esemény (KUKA-049)',
    file: 'bitemporal.mjs',
    from: '    if (eff.ms > valid.ms) continue;           // erre a napra még nem hatályos',
    to: '    if (false) continue;           // erre a napra meg nem hatalyos' },

  { id: 'M110', rule: 'K08', catcher: 'P-REV-grant-axis', expect: 'probe_fail',
    what: 'REV-N2a — A NAPLÓ NÉLKÜLI SOR TUDÁS-TENGELYE ELTŰNIK: a gyengébb tanús ágon a feloldó '
      + 'csak a hatályt méri. Ez a RÉGI hiba a tartalék-ágba visszabújtatva — a javítás fél őr '
      + 'lenne (KUKA-039)',
    file: 'bitemporal.mjs',
    from: "    if (g.ms > known.ms) return { effective: false, axis: 'projected_row', reason: 'membership_grant_not_yet_recorded' };",
    to: "    if (false) return { effective: false, axis: 'projected_row', reason: 'membership_grant_not_yet_recorded' };" },

  { id: 'M111', rule: 'K08', catcher: 'P-REV-grant-axis', expect: 'probe_fail',
    what: 'REV-N2a — A GYENGÉBB TANÚ ELHALLGATVA: a napló nélküli sor ugyanazt a tengely-jelölést '
      + 'kapja, mint a valódi esemény. Az olvasó ettől erősebbnek hinné a választ, mint amilyen — a '
      + 'néma degradáció ugyanaz a hazugság, mint a néma üres lista (KUKA-127 · KUKA-012)',
    file: 'bitemporal.mjs',
    from: "    return { effective: true, axis: 'projected_row', reason: 'membership_effective' };",
    to: "    return { effective: true, axis: 'event', reason: 'membership_effective' };" },

  { id: 'M112', rule: 'K08', catcher: 'P-REV-evidence-home', expect: 'probe_fail',
    what: 'REV-N2a — A BIZONYÍTÉK NEM KERÜL AZ ESEMÉNYRE: a hivatkozás csak a felülvizsgálati körbe '
      + 'jut, tehát a kör nélküli ágakon (azonnali, jövőbeli) nyomtalanul elvész. Ez a külső fél '
      + 'R85/F02 lelete változatlanul',
    file: 'bitemporal.mjs',
    from: '        actorSubjectId, evidenceRef);',
    to: '        actorSubjectId, null);' },

  { id: 'M113', rule: 'K08', catcher: 'P-REV-evidence-home', expect: 'probe_fail',
    what: 'REV-N2a — AZ ELJÁRÓ NEM KERÜL AZ ESEMÉNYRE: a jogváltozás mellől hiányzik, KI rendelte '
      + 'el. Bizonyíték eljáró nélkül nem elszámoltatható — a kiírt mező csak akkor kötés, ha a '
      + 'fogadó is kérdezi (KUKA-126)',
    file: 'bitemporal.mjs',
    from: '        actorSubjectId, evidenceRef);',
    to: '        null, evidenceRef);' },

  { id: 'M114', rule: 'K08', catcher: 'P-REV-evidence-home', expect: 'probe_fail',
    what: 'REV-N2a — A KÖR NEM AZ ESEMÉNYRŐL OLVAS: a felülvizsgálati kör bizonyíték-mezője üres '
      + 'marad, mert a feloldó nem az eseményhez nyúl. Két példány egy fogalomról előbb-utóbb '
      + 'elcsúszik (KUKA-018)',
    file: 'bitemporal.mjs',
    from: '      evidence_ref: ev ? ev.evidence_ref : null,',
    to: '      evidence_ref: null,' },

  { id: 'M115', rule: 'K08', catcher: 'P-REV-evidence-home', expect: 'probe_fail',
    what: 'REV-N2a — BIZONYÍTÉK NÉLKÜL IS LEHET JOGVÁLTOZÁS: a kötelező hivatkozás kapuja kinyílik. '
      + 'Ez nem helyesbítés többé, hanem a múlt átírása (K08)',
    file: 'bitemporal.mjs',
    from: "      if (typeof evidenceRef !== 'string' || !evidenceRef.trim()) {",
    to: '      if (false) {' },

  // ── ORG-N1a — A FELHATALMAZÁS ALAPJA (R85) ────────────────────────────────────────────────

  { id: 'M116', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — AZ ALAP TUDÁS-TENGELYE ELTŰNIK: a feloldó a KÉSŐBB rögzített verziót is '
      + 'figyelembe veszi a múltbeli tudás kérdezésekor. Ettől a júniusi határozat-csere '
      + 'visszamenőleg átírná, MI VOLT az alap márciusban (REV-N1b sérül)',
    file: 'authorityBasis.mjs',
    from: '    if (rec.ms > known.ms) continue;    // ezt a verziót akkor még nem ismertük',
    to: '    if (false) continue;    // ezt a verziot akkor meg nem ismertuk' },

  { id: 'M117', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — AZ ALAP HATÁLY-TENGELYE ELTŰNIK: egy még nem hatályos határozat már jogot '
      + 'adna a rögzítése napján',
    file: 'authorityBasis.mjs',
    from: '    if (eff.ms > valid.ms) continue;    // erre a napra még nem hatályos',
    to: '    if (false) continue;    // erre a napra meg nem hatalyos' },

  { id: 'M118', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — A VERZIÓ-SORREND ELVÉSZ: nem a LEGKÉSŐBBI hatályos verzió dönt, hanem az '
      + 'első találat. Ettől a mai kérdés a RÉGI határozatot adná vissza — a csere némán hatástalan',
    file: 'authorityBasis.mjs',
    from: '    if (best === null || r.version > best.version) best = r;',
    to: '    if (best === null) best = r;' },

  { id: 'M119', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — A LEJÁRT ALAP ELFOGADVA: a lejárat nem zár. Ettől egy lejárt határozatra '
      + 'hivatkozva is lehetne hatáskört adni (KUKA-020: a fail-closed nem választás)',
    file: 'authorityBasis.mjs',
    from: "    if (ex.ms <= valid.ms) return frozen({ ...shape, in_effect: false, reason: 'basis_expired' });",
    to: "    if (false) return frozen({ ...shape, in_effect: false, reason: 'basis_expired' });" },

  { id: 'M120', rule: 'K04', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1a — A KORLÁT MEGÉPÜLTNEK VALLJA MAGÁT OTT, AHOL NINCS MIT KIKÉNYSZERÍTENI: a '
      + 'válasz a DEKLARÁLT ALAP NÉLKÜL adott hatáskörre is azt állítja, hogy a korlátot '
      + 'kikényszerítik. Ez a DÍSZ-VEZÉRLŐ (KUKA-041): sikert jelentene arról, ami meg sem történt. '
      + 'R53 — A HORGONY KÖVETI A KÓDOT, A MUTÁCIÓ ALANYA VÁLTOZATLAN. Az eredeti alak azt a '
      + 'törzs-ágat mutálta, ahol a hatáskör ALAPRA hivatkozik; ott a mező az ORG-N1b bírálati '
      + 'ágának megépítése óta JOGOSAN igaz, tehát a régi horgony elavult (STALE_ANCHOR — és a '
      + 'battéria MEG IS MONDTA). A védendő tulajdonság ugyanaz maradt: a mező nem állíthat többet '
      + 'a valóságnál — csak a hely került oda, ahol ez ma is igaz.',
    file: 'authorityBasis.mjs',
    from: "      usable_now: false, limit_enforced: true, limit_enforced_paths: LIMIT_ENFORCED_PATHS,",
    to: "      usable_now: true, limit_enforced: true, limit_enforced_paths: LIMIT_ENFORCED_PATHS," },

  // ── R88/F01 — AZ ALAP AZONOSSÁGA A (basis_id, book_id) PÁR ────────────────────────────────

  { id: 'M121', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — AZ IDEGEN KÖNYV ÁTMEGY: a feloldó megint CSAK az azonosítóra keres. Ettől egy '
      + '„A" könyvre szóló határozatra hivatkozva „B" könyvben is lehet hatáskört adni — egy '
      + 'azonosító csak a SAJÁT terében egyedi (KUKA-027)',
    file: 'authorityBasis.mjs',
    from: '  const foreign = rows.filter((r) => String(r.book_id) !== String(bookId));',
    to: '  const foreign = [];' },

  { id: 'M122', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — A HIÁNYZÓ KÖNYV NEM KAP SAJÁT VÁLASZT: a fail-closed kimarad, és a hiány némán '
      + 'ugyanoda sorolódik, mint a rossz érték. A hiánynak SAJÁT, nevezett kapuja van (KUKA-124/2)',
    file: 'authorityBasis.mjs',
    from: "  if (typeof bookId !== 'string' || !bookId.trim()) {\n    return frozen({ ...base, in_effect: false, reason: 'book_id_required' });\n  }",
    to: '  if (false) {\n    return frozen({ ...base, in_effect: false });\n  }' },

  { id: 'M123', rule: 'K04', catcher: 'P-ORG-basis', expect: 'probe_fail',
    what: 'ORG-N1a — A VERZIÓ-ÁTUGRÁS KINYÍLIK: ugyanaz az azonosító NÉMÁN átköltözhet másik könyvbe '
      + 'egy új verzióval. Ettől az azonosság a kiadás és az olvasás között elcsúszna (KUKA-128)',
    file: 'authorityBasis.mjs',
    from: "  if (other.length) return frozen({ ok: false, reason: 'basis_id_belongs_to_other_book' });",
    to: '  if (false) return frozen({ ok: false });' },

  // ── R88/F02 — A TAGSÁGADÁS EGY ÍRÁS ───────────────────────────────────────────────────────

  { id: 'M124', rule: 'K08', catcher: 'P-ORG-grant-atomic', expect: 'probe_fail',
    what: 'REV-N2a — A KÉT ÍRÁS SZÉTESIK: az esemény önállóan megy be, és egyediségi bukásnál BENT '
      + 'MARAD. Ettől egy SIKERTELEN hívás is átírja a történetet — a márciusi kérdésre előtte '
      + '„nincs tagság", utána „van" (KUKA-024: a hiba a két írás VISZONYÁBAN él)',
    file: 'bitemporal.mjs',
    from: '  return store.atomic(() => {',
    to: '  return ((f) => f())(() => {' },

  { id: 'M125', rule: 'K08', catcher: 'P-ORG-grant-atomic', expect: 'probe_fail',
    what: 'REV-N2a — A BEÁGYAZOTT HÍVÓ ELAKAD: az atomi egység KÜLSŐ tranzakciót nyit mentési pont '
      + 'helyett, ezért a tranzakcióból hívó (meghívó-beváltási) JOGOS út megáll. A javítás így a '
      + 'hazugság helyett a munkát zárná ki (KUKA-122: a kapu csak akkor kapu, ha teljesíthető)',
    file: 'store.mjs',
    from: '    atomic(fn) { return atomically(db, fn); },',
    to: '    atomic(fn) { return withTransaction(db, fn); },' },

  { id: 'M126', rule: 'K08', catcher: 'P-ORG-grant-atomic', expect: 'probe_fail',
    what: 'REV-N2a — AZ ESEMÉNY ELMARAD, CSAK A VETÜLET SZÜLETIK: a sikeres tagságadás nem hagy '
      + 'napló-eseményt. A feloldó ilyenkor a GYENGÉBB tanúra esik vissza (`projected_row`), tehát a '
      + 'két idő-tengely összeolvad — némán (KUKA-127: a gyengébb jel nem veheti fel az erősebb nevét)',
    file: 'bitemporal.mjs',
    from: "      'INSERT INTO membership_grant (subject_id, book_id, role, recorded_at, effective_at) VALUES (?,?,?,?,?)',",
    to: "      'INSERT INTO membership_grant (subject_id, book_id, role, recorded_at, effective_at) SELECT ?,?,?,?,? WHERE 0'," },

  // ── R90 §6 — ORG-N1b: A KORLÁT KIKÉNYSZERÍTÉSE (BLI-01) ───────────────────────────────────
  //
  // MINDEGYIK MUTÁCIÓ EGY-EGY NEVEZETT ÁLLÍTÁST buktat meg, és MINDEGYIK a valóságban elkövethető
  // visszalépés: nem kitalált rontás, hanem az az alak, ami a javítás ELŐTT állt vagy amit egy
  // „egyszerűsítés" visszahozna.

  { id: 'M127', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A KIADÁS NEM MÉRI A KORLÁTOT: a nevezett kiadó út átengedi a határozaton túli '
      + 'szerepet/adatkört. Ez a KUKA-041 alakja a jogon: a szűkítés LÁTSZIK a papíron, és semmi '
      + 'nem kényszeríti ki',
    file: 'basisLimit.mjs',
    from: '  if (!verdict.ok) return frozen({ ok: false, reason: verdict.reason, basis_version: verdict.basis_version });',
    to: '  if (false) return frozen({ ok: false, reason: verdict.reason, basis_version: verdict.basis_version });' },

  { id: 'M128', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A BEVÁLTÁS OLDALÁN NINCS KAPU: csak a kiadás ellenőriz. Ettől egy NYERS '
      + 'INSERT-tel írt meghívó megkerüli a korlátot — az őr, ami csak az egyik írót ismeri, nem őr '
      + '(KUKA-013)',
    file: 'invite.mjs',
    from: "  const limitGate = redemptionLimitGate({ store, invite: inv, knownAt: clock.now() });\n  if (!limitGate.ok) {",
    to: "  const limitGate = redemptionLimitGate({ store, invite: inv, knownAt: clock.now() });\n  if (false) {" },

  { id: 'M129', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A KIADOTT KORLÁT NEM KERÜL A PAPÍRRA: a meghívó megszületik, a pecsét elmarad. '
      + 'Ettől a beváltás a „nincs deklarált alap" ágra esik vissza, vagyis a védelem a SAJÁT '
      + 'kiskapuját hordozná (KUKA-084: a lezárás nem hely, hanem csatorna)',
    file: 'basisLimit.mjs',
    from: '    store.run(\n      `INSERT INTO invite_basis (token, basis_id, basis_version, book_id, issued_at, operation, scope, sealed_limit)',
    to: '    if (false) store.run(\n      `INSERT INTO invite_basis (token, basis_id, basis_version, book_id, issued_at, operation, scope, sealed_limit)' },

  { id: 'M130', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A BEVÁLTÁS CSAK A SZEREPET VISZI ÁT: a tagságadó esemény mellől elmarad az '
      + 'alap és a korlát. A tagság onnantól korlát nélkülinek LÁTSZIK, és a papíron álló szűkítés '
      + 'nyomtalanul elvész (R85/F02 alakja a korláton)',
    file: 'invite.mjs',
    from: '      if (limitGate.basis_declared === true) {',
    to: '      if (false) {' },

  { id: 'M131', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — AZ ÜRES KORLÁT-LISTA „MINDENT SZABAD"-RA FORDUL: a hiány néma engedéllyé válik. '
      + 'Pontosan ez a fail-open, amit a norma tilt — a hiányzó felsorolás nem felhatalmazás '
      + '(KUKA-020)',
    file: 'authorityBasis.mjs',
    from: "    return basis.limit[axis].includes(value) ? null : `outside_basis_${axis}`;",
    to: "    if (!basis.limit[axis].length) return null;\n    return basis.limit[axis].includes(value) ? null : `outside_basis_${axis}`;" },

  { id: 'M132', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A KIADOTT KORLÁT TÖRÖLHETŐVÉ VÁLIK: az immutabilitási őr eltűnik a tárolóból. '
      + 'Ettől a szűkítés EGY DELETE-tel megkerülhető, és a beváltás a deklarálatlan ágra esik '
      + 'vissza (KUKA-013 · R53/F01 mintája)',
    file: 'store.mjs',
    from: "CREATE TRIGGER invite_basis_no_delete BEFORE DELETE ON invite_basis BEGIN\n  SELECT RAISE(ABORT, 'invite_basis: a KIADOTT korlat nem torolheto');\nEND;",
    to: '-- (a mutacio eltavolitotta az immutabilitasi ort)' },

  { id: 'M133', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A PECSÉT NÉLKÜLI MEGHÍVÓ ÚJRA ÁTMEGY: az R37–R61 alak visszatér, a beváltás a '
      + 'hiányt csak KIMONDJA, de nem zárja. R63 §4 óta a rögzített alap nélküli meghívó nem '
      + 'kerülheti meg a használati határt — a mutáció pontosan ezt a szabályt veszi ki, és a '
      + 'nyers INSERT-tel írt meghívóból VALÓDI tagság születik (KUKA-041: a néma engedély)',
    file: 'basisLimit.mjs',
    from: "    return frozen({ ok: false, basis_declared: false, reason: 'no_declared_basis', limit: null, seal: null });",
    to: "    return frozen({ ok: true, basis_declared: false, reason: 'no_declared_basis', limit: null, seal: null });" },

  // ── R92/F01–F02 — A MŰVELETI SZERZŐDÉS (MOP-01) ───────────────────────────────────────────

  { id: 'M134', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A HÍVÓ ÚJRA ÁTNEVEZHETI AZ ELLENŐRZÖTT MŰVELETET: a belépési pont elfogadja a '
      + 'kapott nevet. Ettől egy CSAK felfüggesztésre szóló alappal is lehet meghívót adni — a kapu '
      + 'azt méri, amit a hívó MOND, nem amit a rendszer TESZ (KUKA-121)',
    file: 'basisLimit.mjs',
    from: "  if (operation !== INVITE_ISSUE_OPERATION) {\n    return frozen({ ok: false, reason: 'operation_not_overridable', basis_version: null });\n  }",
    to: '  if (false) {\n    return frozen({ ok: false });\n  }' },

  { id: 'M135', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A PECSÉT ÚJRA MEGMONDHATJA, MIT MÉRJÜNK: a beváltás a pecséten álló művelet-nevet '
      + 'veszi irányadónak. Egy NYERS INSERT-tel írt pecsét így megkerüli a kaput (KUKA-013)',
    file: 'basisLimit.mjs',
    from: "  if (String(s.operation) !== INVITE_ISSUE_OPERATION) {\n    return frozen({ ok: false, basis_declared: true, reason: 'sealed_operation_mismatch', limit: null, seal: s });\n  }",
    to: '  if (false) {\n    return frozen({ ok: false, basis_declared: true, seal: s });\n  }' },

  { id: 'M136', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A KÖTELEZŐ TENGELY HIÁNYA ÚJRA NÉMA ÁTUGRÁS: a feloldó a null értékű tengelyt '
      + 'kihagyja. Ettől az ÜRES megengedett adatkör egy puszta ELHAGYÁSSAL megkerülhető — a hiány '
      + 'nem „nem kérdezem", hanem KIKAPCSOLÁS (KUKA-020 · KUKA-124/2)',
    file: 'authorityBasis.mjs',
    from: "    if (v === null || v === undefined || v === '') {\n      return frozen({ ok: false, reason: `axis_value_required_${axis}`, basis_version: basis.version });\n    }",
    to: '    if (false) {\n      return frozen({ ok: false, basis_version: basis.version });\n    }' },

  { id: 'M137', rule: 'K04', catcher: 'P-ORG-basis-limit', expect: 'probe_fail',
    what: 'ORG-N1b — A SZERZŐDÉS NÉLKÜLI MŰVELET FAIL-OPEN: az ismeretlen művelet üres kötelező-listát '
      + 'kap a ZÁRÁS helyett. Ettől egy új belépési pont NÉMÁN kikerülné a tengely-kötelezettséget '
      + '(KUKA-041: a nem-kapuzó mező kapunak látszana)',
    // R53 — A HORGONY KÖVETI A KÓDOT: a műveleti szerződés és a `requiredAxesFor` az
    // `authorityBasis.mjs`-be költözött (a függőségi kör miatt); a mutáció ALANYA változatlan.
    file: 'authorityBasis.mjs',
    from: '  if (!c) return null;',
    to: '  if (!c) return Object.freeze([]);' },

  // ═══ MCS-2 — AZ ELSŐ D-FOLYAMAT FALSZIFIKÁCIÓJA (R10-F05) ═══════════════════════════════════
  //
  // A külső fél R10-F05 lelete SZÓ SZERINT ez volt: a katalógus, a főkönyv, a bemeneti séma és a
  // mennyiség modulokra NINCS falszifikáló mutáció. Igaza volt: a négy modul PRÓBÁJA zölden állt,
  // de senki nem mérte meg, hogy a próba EL IS BUKNA-E, ha a védelem eltűnik. A zöld próba önmagában
  // csak annyit mond, hogy MA átmegy — nem azt, hogy ŐRIZ (KUKA-038).
  //
  // Mindegyik mutáció EGY nevezett védelmet vesz ki, és NÉV SZERINT megmondja, melyik próbának kell
  // tőle pirosra váltania (KUKA-055: az elkapó nem lehet „valamelyik").

  { id: 'M138', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 / R10-F02 — IDEGEN KÖNYV CIKKE ÚJRA ELFOGADHATÓ: a készletkulcs és a cikk könyve '
      + 'nem kerül összevetésre. „A" könyv parancsával „B" könyv cikkére lehetne készletet írni '
      + '(KUKA-027: közös csatornán minden azonosító csak a SAJÁT terében egyedi)',
    file: 'ledger.mjs',
    from: '  if (item.book_id !== key.bookId) {',
    to: '  if (false) {' },

  { id: 'M139', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 / R10-F03 — A VISSZADÁTUMOZÁS ÚJRA MEGKERÜLI AZ ÖSSZEG-KORLÁTOT: a kapu csak a bevét '
      + 'SAJÁT hatályára vett egyenleget nézi, a főkönyv későbbi állapotát nem. Egy MÁRCIUSRA '
      + 'visszadátumozott tétel így a JÚNIUSI képet számíthatatlanná tenné (KUKA-021 az IDŐN)',
    file: 'ledger.mjs',
    from: '  const horizonIso = latest && latest.t && latest.t > effectiveAt ? latest.t : effectiveAt;',
    to: '  const horizonIso = effectiveAt;' },

  { id: 'M140', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 / R10-F03 — AZ „A" NÉZET ÚJRA EGYTENGELYŰ: csak a RÖGZÍTÉS idejét szűri. Ettől egy '
      + 'márciusban rögzített, JÚNIUSRA hatályos bevét a MÁRCIUSI „akkor mit tudtunk" képen is '
      + 'megjelenne (KUKA-002 az IDŐN: két független tény, egy kérdés)',
    file: 'instant.mjs',
    from: "    axes: Object.freeze(['recorded_at', 'effective_at']),",
    to: "    axes: Object.freeze(['recorded_at'])," },

  { id: 'M141', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'IDO-01 / R10-F03 — A NAPTÁR-VISSZAÍRÁS ELTŰNIK: a nem létező nap (2026-02-30) némán '
      + 'átcsúszik a következő hónapra. A néma csúsztatás HAMIS ADAT, nem elnézés (KUKA-022)',
    file: 'instant.mjs',
    from: '  if (!same) {',
    to: '  if (false) {' },

  { id: 'M142', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'MNY-01 / R10-F03 — A KÉT PLAFON ÚJRA EGY: az ÖSSZEG korlátja az EGY MOZGÁSRA szabott '
      + 'értékre esik vissza. Ettől a rendszer kimondatlan TERMÉKKORLÁTOT vezetne be („egy cikkből '
      + 'soha nem állhat ennyinél több"), amit senki nem mondott ki (KUKA-002)',
    file: 'quantity.mjs',
    from: '  const cap = BigInt(profile.maxTotal) * 10n ** BigInt(profile.decimals);',
    to: '  const cap = BigInt(profile.maxPerMovement) * 10n ** BigInt(profile.decimals);' },

  { id: 'M143', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R10-F03 — AZ IDŐPONT ÚJRA NYERS SZÖVEGKÉNT MEGY TOVÁBB: se naptár-ellenőrzés, se '
      + 'kanonizálás. Ugyanaz a pillanat több alakban kerülne a főkönyvbe, és a SZÖVEG szerinti '
      + 'rendezés hamis egyenleget adna (KUKA-029)',
    file: 'inputSchema.mjs',
    from: "      const t = parseInstant(value);\n      if (!t.ok) return fail(t.error, t.detail, name);\n      clean[name] = t.canonical;",
    to: '      clean[name] = value;' },

  { id: 'M144', rule: 'K05', catcher: 'P-REV-result-shape', expect: 'probe_fail',
    what: 'DSC-01 / MNY-01 — A MENNYISÉG LEVELE ÚJRA BÁRMI LEHET: a kiadási osztályozó nem méri a '
      + 'kanonikus decimális alakot, tehát a mennyiség JSON-SZÁMKÉNT is kimehetne. A lebegőpontos '
      + 'alak a 0,1-et sem ábrázolja pontosan — a kiadott szám már nem az, amit könyveltünk',
    file: 'resultScope.mjs',
    from: "  if (spec.kind === 'decimal') {",
    to: '  if (false) {' },

  { id: 'M145', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 / R10-F01 — A HATÁS NEM FUT LE A PARANCS TRANZAKCIÓJÁBAN: a parancs és a nyugta '
      + 'megszületik, a készlet nem mozdul. Ez a SIKER nyoma megtörtént hatás nélkül — pontosan a '
      + 'KUKA-026 fordítottja',
    file: 'command.mjs',
    from: '    if (effect) {\n      const e = effect({ store, at, resolved, effectId, scope, type, typeVersion });',
    to: '    if (false) {\n      const e = effect({ store, at, resolved, effectId, scope, type, typeVersion });' },

  { id: 'M146', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 — A TÁROLÓ ŐRE ELTŰNIK: mozgás-sor véglegesített parancs NÉLKÜL is beszúrható. A '
      + 'séma fejléce ettől ÁLLÍTÁS lenne őr helyett (KUKA-004: a magyarázó szöveg nem őr)',
    file: 'store.mjs',
    from: "WHEN (SELECT COUNT(*) FROM command WHERE effect_id = NEW.effect_id AND state = 'finalized') = 0\nBEGIN\n  SELECT RAISE(ABORT, 'unknown_effect');",
    to: "WHEN 0 = 1\nBEGIN\n  SELECT RAISE(ABORT, 'unknown_effect');" },

  { id: 'M147', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'KSZ-01 — A HOZZÁFŰZÉSES FŐKÖNYV ÚJRA ÁTÍRHATÓ: a mozgás-sor MÓDOSÍTHATÓ lesz. A helyesbítés '
      + 'ÚJ sor, nem átírás — különben a múlt nyom nélkül változik (KUKA-023)',
    file: 'store.mjs',
    from: "CREATE TRIGGER stock_movement_no_update BEFORE UPDATE ON stock_movement BEGIN\n  SELECT RAISE(ABORT,",
    to: "CREATE TRIGGER stock_movement_no_update BEFORE UPDATE ON stock_movement WHEN 0 = 1 BEGIN\n  SELECT RAISE(ABORT," },

  // MIÉRT NEM A GUARD PUSZTA KIVÉTELE (a SAJÁT mérésem lelete). Az első alakom a duplikátum-őrt
  // vette ki — és a próba NEM az állításán bukott, hanem NYERS SQLite-kivételt dobott (az UNIQUE
  // index fogta meg). A battéria ezt helyesen NEM fogadta el szerződés szerinti bizonyítéknak
  // (R45/H06 · KUKA-049): a kivétel nem mondja meg, hogy a SZABÁLYT mértük volna. A mai alak az
  // egyediség HATÓKÖRÉT rontja el — pontosan azt a tényt, amit a KAT-01 állít —, és tiszta,
  // állítás-szintű bukást ad.
  { id: 'M148', rule: 'K10', catcher: 'P-KAT-item-identity', expect: 'probe_fail',
    what: 'KAT-01 — AZ SKU EGYEDISÉGE ELVESZTI A KÖNYV-HATÓKÖRT: a felvételi őr az ÖSSZES könyvben '
      + 'keres. Ettől két FÜGGETLEN cég ugyanazt a cikkszámot nem használhatná, holott az SKU csak a '
      + 'SAJÁT könyvén belül azonosít (KUKA-027 tükre: a túl tág egyediség ugyanúgy hiba)',
    file: 'catalog.mjs',
    from: "  if (store.get('SELECT item_id FROM item WHERE book_id = ? AND sku = ?', bookId, sku)) {",
    to: "  if (store.get('SELECT item_id FROM item WHERE sku = ?', sku)) {" },

  // ── AUT-01 (R16/F16-01) — A HOZZÁFÉRÉSI KAPU NÉGY VISSZACSÚSZÁSA ────────────────────────────
  //
  // MIND A NÉGY KÜLÖN TÉNYT TÁMAD, mert a javításnak négy különböző kijárata van: a kapu HELYE, a
  // válasz EGYFORMASÁGA, a belső nyom MEGLÉTE és a sorrend a séma-ellenőrzéshez képest. Ha egyetlen
  // mutációval mérnénk, egy részleges visszacsúszás átcsúszhatna (KUKA-124/2).
  { id: 'M149', rule: 'K05', catcher: 'P-AUT-object-neutral', expect: 'probe_fail',
    what: 'AUT-01 — A KAPU ELTŰNIK A BEVÉT-ÚTRÓL: a cikk feloldása megint a jogosultsági döntés ELŐTT '
      + 'fut, tehát a tiltott hívó a hibakód KÜLÖNBSÉGÉBŐL megtudja, létezik-e az objektum és melyik '
      + 'könyvben (pontosan az R16/F16-01 lelet)',
    file: 'ledger.mjs',
    from: '  if (!gate.ok) return gate;',
    to: '  if (!gate.ok && false) return gate;' },

  { id: 'M150', rule: 'K05', catcher: 'P-AUT-object-neutral', expect: 'probe_fail',
    what: 'AUT-01 — AZ EGYFORMA ELUTASÍTÁS MEGINT BESZÉL: a tiltó válasz a jogosultsági OKOT is viszi, '
      + 'tehát a hívó megkülönböztetheti, miért nem kapott hozzáférést. A részlet törlése nem volt '
      + 'javítás, és a részlet visszatétele sem ártatlan (KUKA-084: a szivárgás CSATORNA, nem hely)',
    file: 'accessGate.mjs',
    from: '  return ACCESS_REFUSED;\n}',
    to: '  return Object.freeze({ ...ACCESS_REFUSED, reason: right.reason });\n}' },

  { id: 'M151', rule: 'K05', catcher: 'P-AUT-object-neutral', expect: 'probe_fail',
    what: 'AUT-01 — A BELSŐ NYOM ELMARAD: a tiltás kifelé egyforma, befelé viszont NÉMA. Ez a '
      + 'KUKA-058 alakja: ahol a válasz szándékosan egyforma, ott a naplónak kell beszélnie — enélkül '
      + 'a funkció halála sehol nem látszik',
    file: 'accessGate.mjs',
    from: '  recordRefusal(store, {\n    at, subjectId: actor, bookId, opClass, operation,',
    to: '  if (false) recordRefusal(store, {\n    at, subjectId: actor, bookId, opClass, operation,' },

  { id: 'M152', rule: 'K05', catcher: 'P-AUT-object-neutral', expect: 'probe_fail',
    what: 'AUT-01 — A SORREND MEGFORDUL: a bemeneti séma előbb dől el, mint a jog. Ettől a tiltott '
      + 'hívó a válasz FAJTÁJÁBÓL (validation vs. not_available) megtudja, megfelel-e a beadott alak a '
      + 'művelet szerződésének — gyengébb szivárgás, de ugyanaz az osztály',
    file: 'ledger.mjs',
    from: '  const gate = authorizeBookAction({',
    to: '  const _preSchema = validateInput({ operation: "stock.receipt", input });\n'
      + '  if (!_preSchema.ok) return _preSchema;\n  const gate = authorizeBookAction({' },

  // ── R37 — A HAT NEM FALSZIFIKÁLT SOR PÓTLÁSA + a két ÚJ állítás kontrollja ──────────────────
  //
  // MIÉRT KELLENEK. A külső ellenőrző fél (chatgpt-v3, R37/F37-01) kimutatta, hogy a beadott mérési
  // állományban HAT sor `not_falsified` volt: a K10-TYP-a két és a K10-TYP-b négy állítását egyetlen
  // mutáció sem fordította hamisra NÉV SZERINT — a meglévő jelöltek (M141 · M143 · M148) a próbát
  // megbuktatták, de MÁS állításon. A „fedett" tehát erősebb szó volt, mint amit a mérés kiállított
  // (KUKA-101: az összevonás ne adjon határozottabb választ, mint a részei). Ez a nyolc mutáció
  // ÁLLÍTÁSONKÉNT céloz, hogy a lánc sorai a saját nevükön falszifikáltak legyenek.

  { id: 'M153', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R37 — AZ ISMERETLEN MŰVELET TARTALÉKRA ESIK: a fel nem oldott név a bevét '
      + 'sémáját kapja. A fail-closed alapállás megszűnik, és egy elgépelt művelet NÉMÁN a '
      + 'készlet-bevét szerződését kapná (KUKA-020)',
    file: 'inputSchema.mjs',
    from: "  if (!Object.prototype.hasOwnProperty.call(OPERATION_SCHEMAS, operation)) return null;",
    to: "  if (!Object.prototype.hasOwnProperty.call(OPERATION_SCHEMAS, operation)) return OPERATION_SCHEMAS['stock.receipt'];" },

  { id: 'M154', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R37/F37-02 — A ZÁRT REGISZTER ÚJRA NYITOTT: a feloldó visszatér a nyers '
      + 'kulcs-olvasásra, tehát az ÖRÖKÖLT tulajdonság-nevek (`toString` · `constructor` · '
      + '`__proto__`) megint „megtalált" sémának látszanak, és a hívás nyers kivétellel áll meg '
      + 'nevezett elutasítás helyett — pontosan az R37-ben jelentett alak',
    file: 'inputSchema.mjs',
    from: "  if (typeof operation !== 'string') return null;\n"
      + "  if (!Object.prototype.hasOwnProperty.call(OPERATION_SCHEMAS, operation)) return null;\n"
      + "  const found = OPERATION_SCHEMAS[operation];\n"
      + "  return found && typeof found === 'object' && found.fields ? found : null;",
    to: "  return OPERATION_SCHEMAS[operation] || null;" },

  { id: 'M155', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R37 — AZ ISMERETLEN MEZŐ NÉMÁN ELTŰNIK: a nem deklarált mezőt a séma egyszerűen '
      + 'átlépi. A beadó azt hiszi, hogy kitöltött valamit, a rendszer viszont eldobja — ez a '
      + 'KUKA-041 dísz-vezérlője a bemeneten',
    file: 'inputSchema.mjs',
    from: "  if (unknown.length) {\n    return fail('unknown_field',",
    to: "  if (false) {\n    return fail('unknown_field'," },

  { id: 'M156', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R37 — A HIÁNY RÁLAPUL A TÍPUSHIBÁRA: a hiányzó kötelező mező `invalid_type` '
      + 'néven megy vissza. A beadó a rossz dolgot javítaná — a HIÁNY külön válasz (KUKA-124/2)',
    file: 'inputSchema.mjs',
    from: "      if (spec.required) return fail('missing_field', `kötelező mező: ${name}`, name);",
    to: "      if (spec.required) return fail('invalid_type', `kötelező mező: ${name}`, name);" },

  { id: 'M157', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / R37 — A KONVERZIÓ MEGELŐZI A TÍPUST: a szám-alakú mennyiség szöveggé alakul, '
      + 'mielőtt a típus-őr megnézné. A JSON-szám így némán elfogadott mennyiséggé válik — pont az '
      + 'MNY-01 tilalma (0.1 nem ábrázolható pontosan)',
    file: 'inputSchema.mjs',
    from: "      const syn = quantitySyntaxProblem(value);",
    to: "      const syn = quantitySyntaxProblem(typeof value === 'number' ? String(value) : value);" },

  { id: 'M158', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'BEM-01 / SVR-01 (R37) — A SÉMAVERZIÓ TULAJDONOSA A BEADÓ LESZ: bármilyen megnevezett '
      + 'verzió átmegy, és a rendszer NEM mondja meg, hogy a regiszter választott-e. Egy korábbi '
      + 'verziójú beadványt így hallgatólagosan a MAI séma szerint olvasnánk (KUKA-074)',
    file: 'inputSchema.mjs',
    from: "  if (requested === undefined || requested === null) {",
    to: "  if (true) {" },

  { id: 'M159', rule: 'K10', catcher: 'P-KAT-item-identity', expect: 'probe_fail',
    what: 'KAT-01 / R37 — A DUPLIKÁTUM NÉMÁN SIKERNEK LÁTSZIK: a második, azonos SKU-s felvétel '
      + 'ütközés helyett „rendben" választ ad, és a hívó azt hiszi, hogy felvett egy cikket. Az M148 a '
      + 'TÚL TÁG hatókört méri — ez az ELLENTÉTES irány, és eddig egyik mutáció sem nevezte meg ezt az '
      + 'állítást. AMIT MÉRVE MEGTUDTUNK: a puszta ŐR-KIVEZETÉS itt nem szerződés szerinti bizonyíték, '
      + 'mert a tábla EGYEDISÉGI KÉNYSZERE önállóan is megfogja (a próba nyers SQLITE-kivétellel áll '
      + 'meg, nem az állításán bukik) — a mutációnak ezért a NÉMA SIKERT kell előállítania',
    file: 'catalog.mjs',
    from: "  if (store.get('SELECT item_id FROM item WHERE book_id = ? AND sku = ?', bookId, sku)) {\n"
      + "    return fail('sku_taken', `ebben a könyvben már van ilyen SKU: ${sku}`);\n  }",
    to: "  if (store.get('SELECT item_id FROM item WHERE book_id = ? AND sku = ?', bookId, sku)) {\n"
      + "    return Object.freeze({ ok: true, itemId: itemIdFor(bookId, sku, at), bookId, sku, unit, qtyProfile });\n  }" },

  { id: 'M160', rule: 'K10', catcher: 'P-KAT-item-identity', expect: 'probe_fail',
    what: 'KAT-01 / R37 — A KÖNYV NÉLKÜLI SKU-FELOLDÁS MEGENGEDETTÉ VÁLIK: a függvény „legjobb '
      + 'találatot" ad könyv nélkül. Közös csatornán ez pontosan a KUKA-027 hibája — az azonosító '
      + 'csak a SAJÁT terében egyedi',
    file: 'catalog.mjs',
    from: "  if (!bookId) throw new Error('itemBySku: a KÖNYV kötelező — SKU önmagában nem azonosít (KAT-01)');",
    to: "  if (!bookId) return store.get('SELECT * FROM item WHERE sku = ?', sku) || null;" },

  { id: 'M161', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'CLR-01 / R37 — A TESTVÉR-REGISZTER ÚJRA NYITOTT: a mennyiség-profil feloldója visszatér a '
      + 'nyers kulcs-olvasásra, tehát az ÖRÖKÖLT nevek (`toString` · `constructor` · `__proto__`) '
      + 'megint „találatnak" számítanak, és a hívás nyers BigInt-kivétellel áll meg a nevezett '
      + '„ismeretlen mennyiség-profil" helyett. Ez a KUKA-180 TESTVÉR-ÁGA: a külső fél a bemeneti '
      + 'sémán találta meg, a mérés a profilon is',
    file: 'quantity.mjs',
    from: "  const p = lookupClosed(QUANTITY_PROFILES, profileId, { shape: (v) => typeof v === 'object' && v.id });",
    to: "  const p = QUANTITY_PROFILES[profileId];" },

  { id: 'M162', rule: 'K10', catcher: 'P-BEM-input-schema', expect: 'probe_fail',
    what: 'CLR-01 / R37 — A KÖZÖS FELOLDÓ ELVESZTI A TÍPUS-ELLENŐRZÉST: a nem szöveg nevet is '
      + 'kulcsként próbálja feloldani. Egy `{}` vagy szám alakú „név" így a regiszter kulcsává '
      + 'konvertálódna — a zárt halmaz megint kívülről bővíthető',
    file: 'closedRegistry.mjs',
    from: "  if (typeof name !== 'string') return null;",
    to: "  if (name === undefined) return null;" },

  { id: 'M163', rule: 'K10', catcher: 'P-KSZ-ledger-truth', expect: 'probe_fail',
    what: 'SVR-01 / R39 — A VERZIÓ ÚJRA ELTŰNIK A KANONIKUS ÚTON: a bevét-út nem adja tovább a '
      + 'megnevezett sémaverziót a bemeneti ellenőrzésnek, tehát a rossz verzió NÉMÁN átmegy, és a '
      + 'készlet mozdul. Pontosan az az alak, amit a külső fél talált: a rendszer elutasítást ígér '
      + 'ott, ahol valójában eldob egy argumentumot',
    file: 'ledger.mjs',
    from: "  const checked = validateInput({ operation: 'stock.receipt', input, version });",
    to: "  const checked = validateInput({ operation: 'stock.receipt', input });" },

  // ── R43 — A K10 KÖVETELMÉNYEK VISSZABONTÁSAI ─────────────────────────────────────────────────
  // Minden ÚJ állításhoz saját kontroll: a mérés nem lehet erősebb, mint a hozzá tartozó ellenpár.

  { id: 'M164', rule: 'K10', catcher: 'P-KAT-identity-history', expect: 'probe_fail',
    what: 'KAT-01 / R43 — A MEGJELENÍTÉS ÁTÍRÁSA ELMOZDÍTJA AZ AZONOSÍTÓT: az egység-váltás a cikk '
      + 'BELSŐ azonosítóját is újraképzi, tehát minden korábbi hivatkozás (nyugta, mozgás, riport) '
      + 'egy megszűnt azonosítóra mutatna — a megjelenítés némán azonosságot cserélne (KUKA-021 · '
      + 'KUKA-061). AMIT MÉRVE MEGTUDTUNK: az ELSŐ alakom a `Date.now()` sóval az AZONOSÍTÓ-KÉPZŐT '
      + 'rontotta el, de az azonosító a felvételkor EGYSZER születik és TÁROLVA marad — a mutáció '
      + 'ezért `SURVIVED` lett: nem volt olyan olvasó, ami újraszámolta volna. Ez a rendszerről jó '
      + 'hír, bizonyítéknak viszont semmi (KUKA-187).',
    file: 'catalog.mjs',
    from: "  store.run('UPDATE item SET unit = ? WHERE item_id = ?', unit, itemId);",
    to: "  store.run('UPDATE item SET unit = ?, item_id = ? WHERE item_id = ?', unit, "
      + "itemIdFor(item.book_id, item.sku, unit), itemId);" },

  { id: 'M165', rule: 'K10', catcher: 'P-KAT-identity-history', expect: 'probe_fail',
    what: 'KAT-01 / R43 — A KÖNYV KIESIK A FELOLDÁSBÓL: a cikkszám-keresés az ÖSSZES könyvben néz, '
      + 'tehát a B könyv `050`-es cikkére kérdezve az A könyv cikke jön vissza — két FÜGGETLEN '
      + 'termék NÉMÁN eggyé olvad (KUKA-027: az azonosító csak a SAJÁT terében egyedi). '
      + 'AMIT MÉRVE MEGTUDTUNK: a mutáció ELSŐ alakja magát az AZONOSÍTÓ-KÉPZÉST rontotta el, de az '
      + 'nem szerződés szerinti bizonyíték — a tábla elsődleges kulcsa önállóan is megfogja, és a '
      + 'próba nyers SQLITE-kivétellel áll meg. A visszalépésnek a NÉMA ÖSSZEOLVADÁST kell '
      + 'előállítania, mert az a valódi kár',
    file: 'catalog.mjs',
    from: "  return store.get('SELECT * FROM item WHERE book_id = ? AND sku = ?', bookId, sku) || null;",
    to: "  return store.get('SELECT * FROM item WHERE sku = ?', sku) || null;" },

  { id: 'M166', rule: 'K10', catcher: 'P-KAT-identity-history', expect: 'probe_fail',
    what: 'KAT-01 / R43 — A KIÍRT TULAJDONSÁG ÁTÍRÁSA LÁBNYOM FÖLÖTT IS SZABAD: az egység-váltás '
      + 'őre eltűnik, tehát a mozgás-sorok mögött álló cikk egysége némán átíródik — a TÁROLT '
      + 'mennyiség visszamenőleg MÁS jelentést kapna (KUKA-021)',
    file: 'catalog.mjs',
    from: "  if (footprint > 0) {",
    to: "  if (false) {" },

  { id: 'M167', rule: 'K10', catcher: 'P-KSZ-canonical-input-boundary', expect: 'probe_fail',
    what: 'BEM-01 / R43 — A KANONIKUS ÚT CSENDBEN MEGTISZTÍTJA A TÖRZSET: a bevét-út csak a három '
      + 'ismert mezőt adja tovább, tehát az IDEGEN és a KONTEXTUS-mező nem nevezett elutasítást kap, '
      + 'hanem NÉMÁN eltűnik — a beadó azt hiszi, kitöltött valamit, a rendszer eldobja (KUKA-041 a '
      + 'bemeneten). AMIT MÉRVE MEGTUDTUNK: a mutáció ELSŐ alakja a hibás csomagot engedte tovább, '
      + 'és a próba nyers TypeError-ral állt meg — az nem szerződés szerinti bizonyíték',
    file: 'ledger.mjs',
    from: "  const checked = validateInput({ operation: 'stock.receipt', input, version });\n  if (!checked.ok) return checked;",
    to: "  const _clean = { item_id: input && input.item_id, qty: input && input.qty, effective_at: input && input.effective_at };\n"
      + "  const checked = validateInput({ operation: 'stock.receipt', input: _clean, version });\n  if (!checked.ok) return checked;" },

  { id: 'M168', rule: 'K10', catcher: 'P-MNY-stored-profile-history', expect: 'probe_fail',
    what: 'MNY-01 / R43 — A VISSZAOLVASÁS A CIKK MAI PROFILJÁT ERŐLTETI A RÉGI SORRA: az összeadás '
      + 'nem veti össze a sor SAJÁT profilját a kérttel, tehát egy elcsúszott profil mellett a '
      + 'tárolt szám NÉMÁN más jelentést kap — pontosan az, amit a klauzula tilt (KUKA-021). '
      + 'R45/F45-02 HELYESBÍTÉS (a külső fél lelete): a RÉGI, 12.500-as fixtúrán ez a mutáció nem a '
      + 'néma átértelmezést mutatta, hanem `total_out_of_range`-et — az IDEGEN profil MÁSIK korlátja '
      + 'takarta el a kárt. A próba ezért egy KIS mennyiségű (7.500) cikket is visz, ahol az '
      + 'átértelmezés egyik korlátba sem ütközik: ott a visszaolvasás CSENDBEN „7500"-at ad „7.500" '
      + 'helyett — ez a kár a saját alakjában.',
    file: 'quantity.mjs',
    from: "    if (p.profileId !== profile.id) {",
    to: "    if (false) {" },

  { id: 'M169', rule: 'K10', catcher: 'P-MNY-stored-profile-history', expect: 'probe_fail',
    what: 'MNY-01 / R43 — A MOZGÁS-SOR A KÉRÉS PROFILJÁT ÍRJA, NEM A CIKKÉT: a tárolt sor így nem '
      + 'a SAJÁT jelentését viszi, és a történeti visszaolvasás a mai kéréstől függene',
    file: 'ledger.mjs',
    from: "      key.bookId, key.itemId, key.ownerId, key.warehouseId, q.scaled.toString(), item.qty_profile,",
    to: "      key.bookId, key.itemId, key.ownerId, key.warehouseId, q.scaled.toString(), 'qty-1'," },

  // ── R45 — A TÖRTÉNET-MEGŐRZÉS ÉS A HATÁS-KÖZBENI HIBAHATÁR VISSZABONTÁSAI ────────────────────
  //
  // Az M173 a KÜLSŐ ELLENŐRZŐ FÉL saját ellenpéldája (chatgpt-v3, R45/F45-01), karakterre az általuk
  // leírt alakban: az R44-es, darabszámot néző próbám mellett ez a rontás 58/58 PASS-t adott.
  // ── R47 — A K05-DSC-c ENGEDŐ ÁGÁNAK VISSZABONTÁSAI ──────────────────────────────────────────
  //
  // Mindegyik a KÉT valódi kárt mutatja, amit az R47 kért: a JOGOSULATLAN ADATKIADÁST (M177 · M178 ·
  // M179 · M180 · M182) és a JOGOS KIADÁS TÉVES TILTÁSÁT (M181).
  { id: 'M177', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'SGR-01 / R49 — A KIADÁS NEM KÉRDEZI MEG A MEGADOTT JOGOT: a kapu átlépi az adatköri '
      + 'engedély ellenőrzését, tehát egy olyan tag is megkapja az eredményt (árral együtt), akinek '
      + 'EGYETLEN adatkörre sincs igazolt olvasási joga. Pontosan az F49-01 mért alakja: a tiltás '
      + 'hiányából engedély lesz (K05-DSC-c)',
    // R49 — A HORGONY A VALÓDI KÁRRA KERÜLT ÁT. Az R48-as alak a tagsági PLAFON kihagyását mérte;
    // a külső fél leletei óta a kapu MAGJA a MEGADOTT jog ellenőrzése — ennek kihagyása adja vissza
    // pontosan azt a kiadást, amit az F49-01 mért (engedély nélkül kimegy az ár).
    // A HORGONY A VISSZATÉRŐ ÉRTÉKEN, NEM A FELTÉTELEN. A feltétel kiiktatása után a kód egy
    // `undefined` alapazonosítóval futott tovább, és NYERS kivételt dobott — az más réteg (a
    // típus-ellenőrzés) védelme, nem az állítás bukása (KUKA-187). Az ENGEDÉLYRE fordított válasz
    // viszont pontosan a mért kárt állítja elő: a jog nélküli olvasó megkapja az eredményt.
    file: 'releaseScope.mjs',
    from: "      ...base, allowed: false, basis: 'scope_grant', reason: grant.reason,",
    to: "      ...base, allowed: true, basis: 'scope_grant', reason: grant.reason," },

  { id: 'M178', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'RSB-01 / R47 — A KÉRŐ CÍMKÉJE DÖNT A TARTALOM HELYETT: a kiadás a kérés `dataScope` '
      + 'címkéjére kérdez, nem az eredmény TÉNYLEGES adatköreire. Egy „készlet" címkével beadott '
      + 'olvasás így ármezőt is kivinne — a R77/F02 lelet visszatérése az engedő ágon (KUKA-073)',
    file: 'resultScope.mjs',
    from: "    const d = scopeReleaseDecision({ store, subjectId, bookId, scope, nowIso, knownAt, request: base });",
    to: "    const d = scopeReleaseDecision({ store, subjectId, bookId, scope: base.dataScope || scope, nowIso, knownAt, request: base });" },

  { id: 'M179', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'SGR-01 / R49 — A MEGADOTT JOG TÚLÉLI AZ ALAPJÁT: a kapu nem nézi meg a határozat MAI '
      + 'állapotát, tehát MEGVONT vagy LEJÁRT határozat mellett is kiad. MÉRT HATÁS-HELYESBÍTÉS (a '
      + 'külső fél R49-es lelete): az R48-as alakban ez a mutáció NEM adatkiadást okozott, csak az '
      + 'indokot cserélte (`outside_basis_scopes`), mert a plafon úgyis zárt — a leírás erősebb volt '
      + 'a futásnál. AZ R51-ES HELYESBÍTÉS (a külső fél elkülönített futása): az SGR-01 utáni alakban '
      + 'SEM lesz ebből valódi kiadás — a megvont határozat plafonja ÜRES, ezért a kiadás egy sorral '
      + 'lejjebb, a `outside_basis_scopes` ágon zárul. A MÉRT hatás tehát: a próba a VÁRT INDOKON '
      + 'bukik el (az (f) ág `basis_revoked`-ot követel, és `outside_basis_scopes`-ot kap), nem '
      + 'adatkiadáson. A VALÓDI kiadást okozó alak az M188 — a kettő két külön dolgot bizonyít, és '
      + 'nem cserélhető fel (KUKA-189: a leírás nem lehet erősebb a mért hatásnál)',
    file: 'releaseScope.mjs',
    from: "  if (state.in_effect !== true) {\n    return frozen({ ...shape, allowed: false, reason: state.reason });\n  }",
    to: "  if (false) {\n    return frozen({ ...shape, allowed: false, reason: state.reason });\n  }" },

  { id: 'M180', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'RSB-01 / R47 — A KIMONDOTT TILTÁS ÁGA SOSEM FUT: a kapu az engedő alapot megnézi, a '
      + 'TILTÁST nem — tehát egy adatkörre kimondottan tiltott olvasó az engedélye mellett '
      + 'visszakapja azt, amit épp megvontak tőle. MÉRT HATÁS: a tiltás-ág teljes kiiktatása (nem '
      + 'csak az engedő eset alatt), ezért a tiltás-mérésre épülő testvér-próba is bukik — a '
      + 'NEVEZETT elkapó viszont a mienk (REV-N5b: a kimondott tiltás az engedély mellett is áll)',
    file: 'releaseScope.mjs',
    from: "  if (ban.banned) {\n    return frozen({ ...base, allowed: false, basis: 'explicit_ban', reason: ban.reason, message: ban.message ?? null });\n  }",
    to: "  if (ban.banned && false) {\n    return frozen({ ...base, allowed: false, basis: 'explicit_ban', reason: ban.reason, message: ban.message ?? null });\n  }" },

  { id: 'M181', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'SGR-01 / R49 — A JOGOS KIADÁS TÉVES TILTÁSA: a plafon-ellenőrzés MINDIG elutasít, tehát '
      + 'a valóban MINDKÉT adatkörre megadott jog mellett sem jön ki az eredmény. A kapu nem lehet '
      + 'fal (KUKA-122) — ezt az ELLENPÁRT ez a mutáció teszi láthatóvá',
    file: 'releaseScope.mjs',
    from: "  if (!live.includes(scope)) {",
    to: "  if (true) {" },

  { id: 'M182', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'RSB-01 / R47 — AZ ELUTASÍTÁS SIKERES KIADÁST KÖNYVEL: a megtagadott olvasás is ír a '
      + 'kiadási leltárba, tehát a leltár olyan kiadásról tanúskodik, ami meg sem történt — a '
      + 'KUKA-026 tükre a leltáron (R47/4)',
    file: 'command.mjs',
    from: "    if (!releasableScope.releasable) return refused;",
    to: "    if (!releasableScope.releasable) {\n"
      + "      disclose({ store, kind: 'command_result', scope: cmd.book_id, ref: commandRef(cmd),\n"
      + "        recipient: requester, clock, at, body: { ok: true, error: null, message: 'x', effect_id: cmd.effect_id, result: resolved } });\n"
      + "      return refused;\n"
      + "    }" },

  // ── R51 — A KÉT IDŐ-TENGELY VISSZABONTÁSAI A MEGVONÁSON (F51-01) ─────────────────────────────
  //
  // A LELETET a KÜLSŐ ELLENŐRZŐ FÉL találta (R51/F51-01). Ezek a rontások MINDKÉT irányt mutatják:
  // a JOGOSULATLAN KIADÁST (M185) és a JOGOS KIADÁS TÉVES TILTÁSÁT (M183 · M184 · M187) — plusz a
  // NÉMA, HIBÁS ÍRÁST (M186), ami a legdrágább, mert utólag már nem tudjuk, mi volt az igazság.
  { id: 'M183', rule: 'K05', catcher: 'P-DSC-scope-grant-history', expect: 'probe_fail',
    what: 'SGR-01 / R51 — A TUDÁS TENGELYE ELTŰNIK: az olvasó nem nézi meg, hogy egy eseményt a '
      + 'kérdezett tudás-állapotban MÁR ISMERTÜNK-E. MÉRT HATÁS: egy JÚNIUSBAN rögzített, március '
      + '20-i hatályú megvonás visszamenőleg átírja a MÁRCIUSI tudás-állapotot is — pontosan az '
      + 'F51-01 mért alakja. A rendszer a múltról hazudik, és ez nem látszik hibának (KUKA-002)',
    file: 'scopeGrant.mjs',
    from: "    if (rec.ms > known.ms) continue;     // ezt akkor még nem tudtuk",
    to: "    if (false) continue;" },

  { id: 'M184', rule: 'K05', catcher: 'P-DSC-scope-grant-history', expect: 'probe_fail',
    what: 'SGR-01 / R51 — A HATÁLY TENGELYE ELTŰNIK: minden ismert esemény AZONNAL hat, a saját '
      + 'hatályba lépése előtt is. MÉRT HATÁS: az ELŐRE ütemezett, augusztusi hatályú megvonás már '
      + 'JÚNIUSBAN zár — jogos olvasás téves tiltása (a másik irány, KUKA-122)',
    file: 'scopeGrant.mjs',
    from: "    if (eff.ms > valid.ms) continue;     // erre a napra még nem hatályos",
    to: "    if (false) continue;" },

  { id: 'M185', rule: 'K05', catcher: 'P-DSC-scope-grant-history', expect: 'probe_fail',
    what: 'SGR-01 / R51 — A LEGKORÁBBI ESEMÉNY DÖNT A LEGKÉSŐBBI HELYETT: az idővonal visszafelé '
      + 'olvasódik. MÉRT HATÁS: a MEGVONÁS UTÁN is a MEGADÁS marad érvényben, tehát a megvont jogú '
      + 'olvasó VALÓDI adatot kap vissza (jogosulatlan kiadás); az újraadás fogalma pedig értelmét '
      + 'veszti',
    file: 'scopeGrant.mjs',
    from: "    if (e.effMs !== a.effMs) return e.effMs > a.effMs ? e : a;",
    to: "    if (e.effMs !== a.effMs) return e.effMs < a.effMs ? e : a;" },

  { id: 'M186', rule: 'K05', catcher: 'P-DSC-scope-grant-history', expect: 'probe_fail',
    what: 'SGR-01 / R51 — A HIBÁS IDŐ NÉMÁN BEÍRÓDIK: az értelmezhetetlen hatály-időpont nem '
      + 'nevezett elutasítás, hanem nyers szövegként a naplóba kerül. MÉRT HATÁS: a megvonás-napló '
      + 'olvashatatlan sort kap, tehát onnantól a jog állapota egyáltalán nem eldönthető — az '
      + 'írásmentes elutasítás követelménye (KUKA-124/2) megszűnik',
    file: 'scopeGrant.mjs',
    from: "  if (!eff.ok) return frozen({ ok: false, reason: `effective_at_${eff.reason}`, wrote: 0 });",
    to: "  void eff;" },

  { id: 'M187', rule: 'K05', catcher: 'P-DSC-scope-grant-history', expect: 'probe_fail',
    what: 'SGR-01 / R51 — A MEGVONÁS ÁTNYÚL A SZOMSZÉD ADATKÖRRE: az olvasó a megvonásokat adatkör '
      + 'nélkül gyűjti. MÉRT HATÁS: egy ÁRAK-ra szóló megvonás a KÉSZLET-jogot is elveszi '
      + 'ugyanattól az olvasótól — a hatókör nem a mérce szerint szabott (KUKA-048), és a kár itt a '
      + 'jogos olvasás elzárása',
    file: 'scopeGrant.mjs',
    from: "    'SELECT * FROM scope_grant_revocation WHERE subject_id = ? AND book_id = ? AND scope = ? ORDER BY id',",
    to: "    'SELECT * FROM scope_grant_revocation WHERE subject_id = ? AND book_id = ? AND ? IS NOT NULL ORDER BY id'," },

  { id: 'M188', rule: 'K05', catcher: 'P-DSC-scope-basis', expect: 'probe_fail',
    what: 'RSB-01 / R51 — A MEGVONT ALAPON VALÓDI ADAT MEGY KI. Ez az M179 helyesbített párja: KÉT '
      + 'sor rontása kell hozzá, mert egy sor kevés. (1) a kapu nem nézi meg a határozat MAI '
      + 'állapotát, és (2) az ÜRES plafont „mindenre jogosít"-ként olvassa. MÉRT HATÁS: a MEGVONT '
      + 'határozatú olvasó a készlet-eredményt TÉNYLEGESEN visszakapja (az (f) ág kiadva→kiadva '
      + 'különbségként méri) — ez a valódi jogosulatlan adatkiadás, szemben az M179 puszta '
      + 'indok-cseréjével',
    file: 'releaseScope.mjs',
    edits: [
      { from: "  if (state.in_effect !== true) {\n    return frozen({ ...shape, allowed: false, reason: state.reason });\n  }",
        to: "  if (false) {\n    return frozen({ ...shape, allowed: false, reason: state.reason });\n  }" },
      { from: "  const live = Array.isArray(state.limit && state.limit.scopes) ? state.limit.scopes : [];",
        to: "  const live = Array.isArray(state.limit && state.limit.scopes) && state.limit.scopes.length\n    ? state.limit.scopes : [...KNOWN_DATA_SCOPES];" },
    ] },

  // ── R53 — AZ ORG-N1b VISSZABONTÁSAI A BÍRÁLATI ÚTON (ABL-01) ────────────────────────────────
  //
  // MIND A KETTŐ IRÁNYT MUTATJÁK: a JOGOSULATLAN HATÁSKÖRT (M189 · M190 · M191 · M192) és a JOGOS
  // HASZNÁLAT TÉVES TILTÁSÁT (M193). A kár itt nem adatkiadás, hanem JOGVÁLTOZTATÁS: aki a korláton
  // kívül bírál, az tagságot függeszt fel és von vissza.
  { id: 'M189', rule: 'K04', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R53 — A MEGADÁS KAPUJA MEGSZŰNIK: a hatáskör-adás csak azt nézi, hogy az alap '
      + 'ÉL, azt nem, hogy MIRE szól. MÉRT HATÁS: egy CSAK meghívó-kiadásra szóló határozattal '
      + '`adjudicate`, `suspend` és `alter_right` hatáskör is megadható — pontosan az a lelet, amit '
      + 'a külső fél az R53-ban mért, és amit a saját fánkon megismételtünk',
    file: 'adjudication.mjs',
    from: "    if (verdict.ok !== true) {\n      throw new Error(`grantAdjudicationAuthority: az alap korlátja nem engedi meg ezt a műveletet `",
    to: "    if (false) {\n      throw new Error(`grantAdjudicationAuthority: az alap korlátja nem engedi meg ezt a műveletet `" },

  { id: 'M190', rule: 'K05', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R53 — A HASZNÁLAT KAPUJA MEGSZŰNIK: a közös belépési pont nem kérdezi meg az '
      + 'alapot. MÉRT HATÁS: a MEGVONT, LEJÁRT vagy azóta SZŰKÍTETT határozat mellett is fut a '
      + 'felfüggesztés, az elbírálás és a jogváltoztatás — a jog túléli az alapját',
    file: 'authority.mjs',
    from: "  {\n    const verdict = adjudicationLimitVerdict({",
    to: "  if (false) {\n    const verdict = adjudicationLimitVerdict({" },

  { id: 'M191', rule: 'K05', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R53 — A MEGADÁSKORI VERZIÓT SENKI NEM NÉZI: az ítélet csak a MAI alapot méri. '
      + 'MÉRT HATÁS: egy későbbi, TÁGABB verzió visszamenőleg kinyit egy korábban adott hatáskört — '
      + 'a régi bélyegző új ajtót nyit, anélkül hogy bárki újra megadta volna (KUKA-074)',
    // R55 — A HORGONY KÖVETI A KÓDOT: az F55-01 javítása óta a megadáskori verzió KÖTELEZŐ, és a
    // korábbi horgony (`grantedUnderVersion === null`) megszűnt. A mutáció ALANYA változatlan: azt
    // a sort vesszük ki, ami a MEGADÁSKORI verzió korlátját ténylegesen kikényszeríti.
    file: 'authorityBasis.mjs',
    from: "  if (!granted.limit.operations.includes(operation)) {",
    to: "  if (false) {" },

  { id: 'M192', rule: 'K04', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R53 — A MŰVELETI SZERZŐDÉS ELTŰNIK A BÍRÁLATI MŰVELETEKRŐL: a három művelet nem '
      + 'kap korlát-szerződést, tehát az ítélő „nincs szerződése" ágra esik. MÉRT HATÁS: a megadás '
      + 'MINDEN alapra elakad — a kapu FALLÁ válik, és a jogos bírálat is ellehetetlenül. Ez a '
      + 'másik irány: a túl szigorú kapu ugyanúgy hibás, mint a hiányzó (KUKA-122)',
    file: 'authorityBasis.mjs',
    from: "  ...Object.fromEntries(ADJUDICATION_LIMIT_OPERATIONS.map((op) => [op, Object.freeze({",
    to: "  ...Object.fromEntries([].map((op) => [op, Object.freeze({" },

  { id: 'M193', rule: 'K05', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R53 — A JOGOS HATÁSKÖR TÉVES TILTÁSA: az ítélet mindig elutasít. MÉRT HATÁS: a '
      + 'határozat által KIFEJEZETTEN megengedett bírálati művelet sem adható meg és nem is '
      + 'használható — a pozitív ellenpár bukik. Enélkül a kapu egy „soha semmit" alakkal is '
      + 'teljesítené a próbát (KUKA-049 · KUKA-122)',
    file: 'authorityBasis.mjs',
    from: "  const today = limitVerdict({\n    store, basisId, bookId, operation, role: null, scope: null, validAt, knownAt,\n  });",
    to: "  const today = frozen({ ok: false, reason: 'forced_denial', basis_version: null, limit: null });" },

  // ── R55 — A HIÁNYZÓ MEGADÁSKORI VERZIÓ ÉS A MÓD-KEVEREDÉS VISSZABONTÁSAI (F55-01) ────────────
  { id: 'M194', rule: 'K04', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R55 — A HIÁNYZÓ TÖRTÉNETI BIZONYÍTÉKBÓL ÚJRA ENGEDÉLY LESZ: a használati ág a '
      + 'hiányzó megadáskori verziót megint úgy érti, hogy „nincs korábbi bélyegző, tehát csak a MAI '
      + 'alap dönt". MÉRT HATÁS — és ez VALÓDI, nem indokcsere: egy `basis_version = NULL` '
      + 'hatáskör-sorral mind a három éles út ÁTMEGY, tehát felfüggesztés JÖN LÉTRE, az ügy '
      + 'ELDŐL, és a tagság MEGVONÓDIK. Pontosan az F55-01 lelete, amit a külső fél mért és a saját '
      + 'fánkon megismételtünk',
    file: 'authorityBasis.mjs',
    from: "  if (versionAbsent) {\n    return frozen({\n      ok: false, reason: 'granted_basis_version_absent', checked: 'granted_version',",
    to: "  if (versionAbsent) {\n    return frozen({\n      ok: true, reason: 'within_basis', checked: 'granted_version'," },

  { id: 'M195', rule: 'K04', catcher: 'P-ORG-adjudication-basis-limit', expect: 'probe_fail',
    what: 'ABL-01 / R55 — A HÍVÓ ELFELEJTI A MÓDOT: a közös belépési pont mód nélkül kéri az '
      + 'ítéletet. MÉRT HATÁS a MÁSIK irányban: a mód-kapu fail-closed, tehát MINDEN alapra '
      + 'hivatkozó hatáskör elutasításba fut — a JOGOS felfüggesztés, elbírálás és jogváltoztatás '
      + 'sem megy végbe. A kapu nem lehet fal (KUKA-122), és ezt a pozitív ellenpár méri. '
      + 'MÉRT HELYESBÍTÉS (KUKA-187): az ELSŐ alakom magát a mód-kaput vette ki, és `SURVIVED` '
      + 'lett — mert minden mai hívó ÁTADJA a módot, tehát a kapu kivétele önmagában nem okoz '
      + 'kárt. Ez a rendszerről jó hír, bizonyítéknak viszont semmi; a mutáció ezért arra az '
      + 'alakra került, ami VALÓDI hatást okoz.',
    file: 'authority.mjs',
    from: "      store, basisId: row.basis_id, bookId, operation, mode: 'use',",
    to: "      store, basisId: row.basis_id, bookId, operation," },

  { id: 'M176', rule: 'K10', catcher: 'P-KSZ-repeat-and-error-boundary', expect: 'probe_fail',
    what: 'K07 / R45 — AZ ISMÉTLÉS-ŐR ELNYELI A MEGVÁLTOZOTT TARTALMAT: az azonos kulcs melletti '
      + 'ELTÉRŐ deklarált tartalom (más cikk, más profil, más verzió) nem NEVEZETT ütközés, hanem '
      + 'NÉMA visszajátszás — a beadó azt hiszi, a MOSTANI kérése teljesült, holott a RÉGI hatást '
      + 'kapta vissza (KUKA-074: az idempotencia-őr csak az AZONOS kérést nyelheti el)',
    file: 'command.mjs',
    from: "    if (prior.identity_hash !== identity) {",
    to: "    if (false) {" },

  { id: 'M173', rule: 'K10', catcher: 'P-KSZ-repeat-and-error-boundary', expect: 'probe_fail',
    what: 'KSZ-01 / R45 — AZ ELUTASÍTÁS ÁTÍRJA A MÚLTAT: a nem támogatott sémaverzió ágán a bevét-út '
      + 'egy KORÁBBI, már lezárt esemény IDŐPONTJÁT írja át. A darabszám nem változik (ugyanannyi '
      + 'parancs, esemény és mozgás marad), tehát egy szám-alapú pillanatkép ezt NEM veszi észre — a '
      + 'történet tartalma viszont megváltozott (KUKA-045 · R45/F45-01)',
    file: 'ledger.mjs',
    from: "  if (!checked.ok) return checked;",
    to: "  if (!checked.ok) {\n"
      + "    if (checked.error === 'unsupported_schema_version') {\n"
      + "      store.run(\"UPDATE command_event SET at = '1999-01-01T00:00:00.000Z' WHERE idem_key = ?\", idemKey);\n"
      + "    }\n"
      + "    return checked;\n"
      + "  }" },

  { id: 'M174', rule: 'K10', catcher: 'P-KSZ-canonical-input-boundary', expect: 'probe_fail',
    what: 'BEM-01 / R45 — A BEMENETI ELUTASÍTÁS ÁTÍRJA A TÁROLT NYUGTA TARTALMÁT: a hibás bemenet '
      + 'ágán a bevét-út kiüríti a MÁR LEZÁRT parancsok eredmény-tartalmát (`resolved_json`). Sor '
      + 'nem születik és nem tűnik el, tehát „nem írt semmit" darabszámon mérve IGAZ marad — a '
      + 'MEGLÉVŐ történet tartalma viszont sérül (R45/F45-01 közös hiánya a bemeneti ágon)',
    file: 'ledger.mjs',
    from: "  const checked = validateInput({ operation: 'stock.receipt', input, version });\n  if (!checked.ok) return checked;",
    to: "  const checked = validateInput({ operation: 'stock.receipt', input, version });\n"
      + "  if (!checked.ok) { store.run('UPDATE command SET resolved_json = ? WHERE actor = ?', '{}', actor); return checked; }" },

  { id: 'M175', rule: 'K10', catcher: 'P-KSZ-repeat-and-error-boundary', expect: 'probe_fail',
    what: 'KSZ-01 / R45 — A HATÁS ELUTASÍTÁSA NEM GÖRGET VISSZA: a parancs-út a hatás nemleges '
      + 'válaszára nem dob, tehát a MÁR BEÍRT parancs-sor és NYUGTA véglegesül, miközben a főkönyvi '
      + 'hatás elmaradt — RÉSZLEGES ÍRÁS, nyugtával igazolva. Ez az az alak, amit a bemeneti plafon '
      + 'sosem ér el, mert oda be sem lép (R45/F45-02)',
    file: 'command.mjs',
    from: "      if (!e.ok) throw new EffectRejected(e.error || 'effect_rejected', e.detail ?? null);",
    to: "      if (!e.ok) { void e; }" },

  { id: 'M172', rule: 'K10', catcher: 'P-KSZ-repeat-and-error-boundary', expect: 'probe_fail',
    what: 'KSZ-01 / R43 — EGY BEADÁS, KÉT KÖNYVELÉS: a bevét hatása KÉTSZER fűzi hozzá ugyanazt a '
      + 'mozgás-sort, tehát EGYETLEN jogos beadásból kettős készletmozgás lesz. Ez a `d` klauzula '
      + 'legdrágább alakja: nem elutasítás és nem hibaüzenet, hanem NÉMÁN kétszer akkora készlet '
      + '(KUKA-026 · KUKA-097).',
    file: 'ledger.mjs',
    from: "  return Object.freeze({ ok: true, added: q.text, horizon: horizonIso });",
    to: "  appendMovement({ store, key: k, item, qty: q.text, effectId, recordedAt: at, "
      + "effectiveAt, positive: true });\n"
      + "  return Object.freeze({ ok: true, added: q.text, horizon: horizonIso });" },

  { id: 'M171', rule: 'K10', catcher: 'P-KAT-identity-history', expect: 'probe_fail',
    what: 'BEM-01 / KAT-01 / R43 — A KANONIZÁLÁS NEM ÍRÓDIK VISSZA: a profil-kötés a NYERS '
      + 'mennyiség-szöveget hagyja a tartalomban, tehát a `"10"` és a `"10.000"` KÜLÖNBÖZŐ '
      + 'parancs-azonosságot kap — a formázás azonossággá válik. MÉRT HATÁS (R45): a második, '
      + 'másként írt beadás nem visszajátszás; a KETTŐS könyvelést az azonosság-őr fogja meg, tehát '
      + 'a kár itt a JOGOS ismétlés elakadása, nem a dupla mozgás. Ez a KANONIZÁLÁS oldala; az M170 '
      + 'ugyanennek a garanciának a MÁSIK helyszíne (az azonosság-összeállítás).',
    file: 'inputSchema.mjs',
    from: "    bound[name] = q.text;                                  // a PROFIL szerinti KANONIKUS alak",
    to: "    bound[name] = String(bound[name]);" },

  { id: 'M170', rule: 'K10', catcher: 'P-KSZ-repeat-and-error-boundary', expect: 'probe_fail',
    what: 'KSZ-01 / R43 — A FORMÁZÁS-FÜGGETLEN ISMÉTLÉS MEGSZŰNIK: a parancs-azonosság a NYERS '
      + 'mennyiség-szöveget viszi a kanonikus alak helyett, tehát ugyanaz a jelentés MÁS '
      + 'írásmódban NEM visszajátszás. MÉRT HATÁS (R45/F45-02 helyesbítése, a külső fél lelete): a '
      + 'második beadás NEVEZETT `idempotency_conflict`-re fut, a mozgások száma 1 MARAD — tehát '
      + 'ez a mutáció NEM kettős könyvelést okoz, hanem a jogos hálózati újrapróbálkozást akasztja '
      + 'el. A tényleges KETTŐS HATÁST az M172 mutatja (2 mozgás). A kettő KÉT KÜLÖN garancia, nem '
      + 'felcserélhető példa.',
    file: 'ledger.mjs',
    // A KÁR A PARANCS-AZONOSSÁGBAN keletkezik, nem a bemenet átírásában: az első alakom a FAGYASZTOTT
    // `checked.value`-ra írt, és a próba nyers `TypeError`-ral állt meg — más réteg (a fagyasztás)
    // fogta meg, tehát nem az állítás bukott (KUKA-187 · WRONG_CATCHER).
    from: "  const identityBody = Object.freeze({ ...bound.value, owner_id: ownerId, warehouse_id: warehouseId,",
    to: "  const identityBody = Object.freeze({ ...bound.value, qty: String(input.qty), owner_id: ownerId, warehouse_id: warehouseId," },

  // ── R63 — CORE-UX-01: az első felhasználói folyamat a mag íróin (WSP-01 · DLG-01 · XID-01 · ENT-02 · ACC-01) ──
  { id: 'M196', rule: 'K03', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'WSP-01 / R63 — A BIZONYÍTATLAN CSATORNA IS INDÍTHAT MUNKAKÖRNYEZETET: a létrehozás nem kérdezi meg, hogy a fiók e-mail csatornája bizonyított-e. Ettől egy beírt, senki által nem birtokolt címre is születik saját könyv és helyi admin jog — a K03 „aki beír egy címet, még nem birtokolja" elve megkerülve (KUKA-041: a néma engedély)',
    file: 'workspace.mjs',
    from: '  const email = provenEmailOf(store, creatorSubjectId);\n  if (!email) return frozen({ ok: false, reason: \'creator_channel_unproven\',',
    to: '  const email = provenEmailOf(store, creatorSubjectId) || \'nem-bizonyitott\';\n  if (false) return frozen({ ok: false, reason: \'creator_channel_unproven\',' },
  { id: 'M197', rule: 'K04', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'WSP-01 / R63 — AZ INDULÁSI SZABÁLY PLATFORMBÍRÁLÓI HATÁSKÖRT IS AD: a saját munkakörnyezet létrehozója az indulási alapra hivatkozva `adjudicate` hatáskört adhat magának. Ez pontosan a „helyi admin és platformbíráló nem olvad össze" határ átlépése (R63 §4) — a sima munkatér-létrehozás bírálói jogot szülne',
    file: 'workspace.mjs',
    from: '  operations: frozen([INVITE_ISSUE_OPERATION, \'alter_right\']),',
    to: '  operations: frozen([INVITE_ISSUE_OPERATION, \'alter_right\', \'adjudicate\', \'suspend\']),' },
  { id: 'M198', rule: 'K05', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'WSP-01 / R63 — A LÉTREHOZÓ NEM KAP ADATKÖRI JOGOT: az indulás a két adatkör olvasási jogát nem adja meg. Ettől a saját munkakörnyezet gazdája a saját mintarekordját sem látja — a lánc első lépése halott, és ezt csak a kiadási kapu mondaná ki, a munkakör „sikeresen" létrejön (KUKA-025: mi viszi ki?)',
    file: 'workspace.mjs',
    from: '    for (const scope of STARTUP_RULE.scopes) {\n      const sg = grantReadScope({',
    to: '    for (const scope of []) {\n      const sg = grantReadScope({' },
  { id: 'M199', rule: 'K04', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'DLG-01 / R63 — A MEGHÍVÓ ADATKÖR NÉLKÜL IS KIMEGY: a delegáló nem követeli meg az adatkör-tengelyt, a kiadó szerződése pedig a hiányzó tengelyre `axis_value_required_scopes` névvel áll meg — tehát a hiba a hívó válaszában a KIADÓ belső nevén jelenik meg, nem a felhasználó által javítható tényen (KUKA-064 · KUKA-124/2: a hiány külön, nevezett válasz)',
    file: 'delegation.mjs',
    from: '  if (!KNOWN_DATA_SCOPES.includes(scope)) {\n    return frozen({ ok: false, reason: \'data_scope_required\', message: `választható adatkörök: ${KNOWN_DATA_SCOPES.join(\' · \')}` });\n  }',
    to: '  if (false) {\n    return frozen({ ok: false, reason: \'data_scope_required\' });\n  }' },
  { id: 'M200', rule: 'K09', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'DLG-01 / R63 — A MEGVONT TAG DELEGÁLÁSI ALAPJA ÉLETBEN MARAD: a megvonás után az ő képzett alapja nem szűnik meg. Ettől a FÜGGŐ meghívója a kiadó jogának megszűnése ELLENÉRE hatályos alapra hivatkozik — a beváltás ma a kibocsátói jogon elakad, de az alap-oldali védelem (R63 §5.3/9) hiányzik: egy második, csak az alapot néző olvasó némán átengedné (KUKA-039: a fél őr)',
    file: 'delegation.mjs',
    from: '  const r = revokeAuthorityBasis({ store, basisId, bookId, at });\n  if (!r.ok && r.reason === \'no_recorded_basis\') return frozen({ ok: true, changed: false, reason: \'no_delegation_basis\' });\n  return r;',
    to: '  return frozen({ ok: true, changed: true, reason: \'basis_revoked\', versions: 0, revoked_at: at });' },
  { id: 'M201', rule: 'K01', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'XID-01 / R63 — A JOGHATÓSÁG KIESIK AZ AZONOSSÁG KULCSÁBÓL: az egyeztető csak a névtérre és a karaktersorra keres. Ettől a HU és az AT adószám azonos karaktersora UGYANAZT az alanyt találja meg — pontosan a téves azonosság, amit a K01 és az R63 §5.3/12 tilt (KUKA-027: egy azonosító csak a saját terében egyedi)',
    file: 'externalId.mjs',
    from: '     WHERE namespace = ? AND jurisdiction = ? AND value_norm = ? AND valid_to IS NULL ORDER BY subject_id`,\n    namespace, profile.jurisdiction, normalizeExternalValue(valueRaw));',
    to: '     WHERE namespace = ? AND value_norm = ? AND valid_to IS NULL ORDER BY subject_id`,\n    namespace, normalizeExternalValue(valueRaw));' },
  { id: 'M202', rule: 'K04', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'ENT-02 / R63 — AZ ELŐFIZETÉS FELÜLÍRJA A JOG-KAPUT: a két kapu együttes ítélete akkor is enged, ha CSAK az egyik nyitott. Ettől a jogosulatlan munkatárs az előfizetett funkcióhoz hozzájut, a jogosult pedig a nem előfizetett művelethez — a két feltétel egy mezőbe folyt (KUKA-002 · R63 §5.3/11: „a két feltételt külön ellenőrizzük")',
    file: 'entitlement.mjs',
    from: '  if (r && e) return frozen({ allowed: true, refused_by: null });',
    to: '  if (r || e) return frozen({ allowed: true, refused_by: null });' },
  { id: 'M203', rule: 'K03', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'ACC-01 / R63 — A KIHÍVÁS BEVÁLTÁSA NEM BIZONYÍTJA A CSATORNÁT: a beváltás a kihívást elfogyasztja, de a `channel_proof` sort nem írja. Ettől a címzett SOHA nem lesz „bizonyított", tehát a meghívó megfigyelése és beváltása örökre `needs_invitee_identity` — a K03 lánca halott, és a kudarc néma, mert a beváltó „siker"-t mond (KUKA-012 · KUKA-025)',
    file: 'account.mjs',
    from: '    store.run(\n      \'INSERT OR IGNORE INTO channel_proof (subject_id, namespace, value_norm, proven_at) VALUES (?,?,?,?)\',\n      row.subject_id, row.namespace, row.value_norm, at);',
    to: '    // (a mutáció nem írja a csatorna-bizonyítékot)' },

  { id: 'M204', rule: 'K05', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'KUKA-199 / R63 — A PLAFON JOGGÁ VÁLIK: a beváltás a pecsét adatkörét rögtön olvasási joggá írja (ez volt az R63-as core-folyamat ELSŐ, visszavont alakja). Ettől a tag a belépés pillanatában látja a készletet, a kezelő kimondott lépése nélkül — a MEGADHATÓ a MEGADOTT-tá válik, pontosan amit az elfogadott K05-DSC-c tilt (R49/R53; R63 §5.3/7: „a pozitív, KÜLÖN engedélyezett olvasás")',
    file: 'invite.mjs',
    from: "        if (!rb.ok) throw new Error(`redeemInvite: az átvitt korlát nem írható — ${rb.reason}`);\n",
    to: "        if (!rb.ok) throw new Error(`redeemInvite: az átvitt korlát nem írható — ${rb.reason}`);\n"
      + "        for (const sc of (limitGate.limit && limitGate.limit.scopes) || []) {\n"
      + "          store.run('INSERT INTO scope_grant (subject_id, book_id, scope, basis_id, basis_version, granted_by, recorded_at, effective_at) VALUES (?,?,?,?,?,?,?,?)',\n"
      + "            subjectId, fresh.book_id, sc, limitGate.seal.basis_id, Number(limitGate.seal.basis_version), fresh.issuer_subject, clock.now(), clock.now());\n"
      + "          readScopeGranted = sc;\n"
      + "        }\n" },
  { id: 'M205', rule: 'K04', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'BLI-01 / R63 — AZ ÁTVITT KORLÁT ÚJRAPECSÉTELHETŐ NYERS ÍRÁSSAL: a beszúrás-oldali őr nem néz semmit. Ettől egy pragma nélküli második kapcsolat INSERT OR REPLACE-szel némán átírja a tagságadó eseményhez tartozó korlátot (verzió, műveletek) — a törlés-trigger recursive_triggers nélkül nem fut, tehát ez az EGYETLEN őr, ami a kapcsolat beállításától függetlenül zár (R55/F01 elve a grant_basis-on; KUKA-057: a védelem ne a hívó jóindulatán múljon)',
    file: 'store.mjs',
    from: "WHEN EXISTS (SELECT 1 FROM grant_basis WHERE grant_event_id = NEW.grant_event_id) BEGIN",
    to: "WHEN 0 BEGIN" },
  { id: 'M206', rule: 'K04', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'BLI-01 / R63 §4 / R64-H09 — A BEVÁLTÁSKORI ÉRVÉNYESSÉG NINCS MÉRVE: a kapu csak a KIADÁSKORI alaphoz mér, a mai naphoz nem. Ettől egy közben visszavont delegálási alapon kiadott meghívó beváltható marad, amíg a kiadó tagsága él — az R63 „beváltáskori aktuális érvényesség kötelező" mondata dísz (KUKA-024: két időpont két tény)',
    file: 'basisLimit.mjs',
    from: "  if (nowB.in_effect !== true) {\n    return frozen({ ok: false, basis_declared: true, reason: 'basis_not_in_effect_at_redemption', detail: nowB.reason, limit: verdict.limit, seal: s });\n  }",
    to: "  if (false) {\n    return frozen({ ok: false, basis_declared: true, reason: 'basis_not_in_effect_at_redemption', detail: nowB.reason, limit: verdict.limit, seal: s });\n  }" },
  { id: 'M207', rule: 'K03', catcher: 'P-CORE-startup-and-delegation', expect: 'probe_fail',
    what: 'INV / R64-H06/H09 — A MEGFIGYELÉS NEM MÉRI A KIADÓ MAI JOGÁT: a megvont admin függő meghívójára a lap folytatást ígér („jelentkezz be, és a meghívás folytatódik"), amit a beváltás azonnal elutasít — a címzett zsákutcába fut (KUKA-064), és a képernyő olyat állít, ami nem történhet meg (KUKA-050)',
    file: 'invite.mjs',
    from: "  const issuer = inviteGrantAt({ store, invite: inv, clock });\n  if (!issuer.ok) {",
    to: "  const issuer = { ok: true };\n  if (!issuer.ok) {" },
];
