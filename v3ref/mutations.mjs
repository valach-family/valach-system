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
    from: "    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock, at });\n    return commandReceipt(",
    to: "    return commandReceipt(" },

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
      { from: "        subjectId, fresh.book_id, fresh.offered_role, clock.now());",
        to: "        subjectId, inv.book_id, inv.offered_role, clock.now());" },
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
    file: 'resultScope.mjs',
    from: "      store, subjectId, nowIso, request: { ...base, dataScope: scope },",
    to: "      store, subjectId, nowIso, request: { ...base }," },

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
    file: 'command.mjs',
    from: "      store, subjectId: requester, nowIso: at,\n      type: cmd.type, typeVersion: cmd.type_version, result: resolved,",
    to: "      store, subjectId: requester, nowIso: clock.now(),\n      type: cmd.type, typeVersion: cmd.type_version, result: resolved," },

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
    from: '        subjectId, bookId, at, effectiveAt, m.revoked_at ?? null, RETROACTIVE_TRANSITION);',
    to: '        subjectId, bookId, at, at, m.revoked_at ?? null, RETROACTIVE_TRANSITION);' },

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
];
