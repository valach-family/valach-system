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
    what: 'az eredmény kiadása MINDKÉT rétegen kihagyja a MAI jog ellenőrzését (a mi hibás C08-as javaslatunk)',
    file: 'command.mjs',
    edits: [
      { from: "  if (!rightAt({ store, subjectId: requester, bookId: cmd.book_id, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return refused;\n  }",
        to: "  if (false) {\n    return refused;\n  }" },
      { from: "    if (!releaseAllowed({ store, subjectId: requester, bookId: cmd.book_id, clock, externalEvidence })) {\n      return refused;\n    }",
        to: "    if (false) {\n      return refused;\n    }" },
    ] },

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
    from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return refused;\n  }\n\n  const prior = findCommandInScope(store, scope);",
    to: "  const prior = findCommandInScope(store, scope);\n  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    return prior ? Object.freeze({ ...refused, error: 'exists_but_not_available' }) : refused;\n  }" },

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
      { from: "  if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n    // A feloldás alatt elveszett a jog ⇒ a parancs NEM lesz kész. Semmit nem írunk.\n    return refused;\n  }",
        to: "  if (false) {\n    return refused;\n  }" },
      { from: "    if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n      return refused;\n    }\n    store.run(",
        to: "    store.run(" },
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
    from: "  const eff = membershipEffectiveAt(m, clock.now());\n  if (!eff.effective) {",
    to: "  const eff = membershipEffectiveAt(m, clock.now());\n  if (!eff.effective && !needsExternalEvidence(profile)) {" },

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

  { id: 'M32', rule: 'K04/K07', catcher: 'P-CMD-finalize-gate', expect: 'probe_fail',
    what: 'a PARANCS-oldali véglegesítési kapu eltűnik: a tx-határon visszavont jog mellett is könyvel',
    file: 'command.mjs',
    from: "    if (!rightAt({ store, subjectId: actor, bookId, opClass: 'own_book', clock, externalEvidence }).allowed) {\n      return refused;\n    }\n    store.run(",
    to: "    store.run(" },

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
    from: "    recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock });\n    return commandReceipt(",
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
    from: "  const effectId = effectIdFor(scope);\n  return store.tx(() => {",
    to: "  const effectId = effectIdFor(scope);\n  recordCommandEvent({ store, event: 'command_finalized', scope, effectId, state: 'finalized', clock });\n  return store.tx(() => {" },

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
      + "               WHERE actor = ? AND book_id = ?`, nowIso, subjectId, bookId);\n"
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
    from: "  if (!authority.allowed) {",
    to: "  if (false) {" },

  { id: 'M51', rule: 'K04/K09', catcher: 'P-REV-authority', expect: 'probe_fail',
    what: 'REV-N3a — a MŰVELET-SZŰKÍTÉS kivétele: bármelyik hatáskör megteszi (a legszűkebb '
      + 'felhatalmazás a legtágabb hatást adná)',
    file: 'adjudication.mjs',
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
    from: "  const res = store.run(\n"
      + "    `INSERT INTO membership_suspension (subject_id, book_id, actor_subject_id, suspended_at, lifted_at, lifted_by, reason)\n"
      + "     VALUES (?,?,?,?,NULL,NULL,?)`,\n"
      + "    subjectId, bookId, actorSubjectId, at, reason == null ? null : String(reason));\n"
      + "  return Object.freeze({\n"
      + "    ok: true, suspended: true, at, already_suspended: false,\n"
      + "    suspension_id: Number(res.lastInsertRowid),\n"
      + "  });",
    to: "  return Object.freeze({ ok: true, suspended: true, at, already_suspended: false, suspension_id: 0 });" },

  { id: 'M57', rule: 'K04/K09', catcher: 'P-REV-suspension', expect: 'probe_fail',
    what: 'REV-N3a — A JOGFELOLDÓ FELFÜGGESZTÉS-VAKSÁGA: a tény RÖGZÜL, de a `rightAt` nem kérdezi '
      + 'meg — a felfüggesztett alany továbbra is `allowed:true`-t kap',
    file: 'authz.mjs',
    from: "  const susp = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: clock.now() });\n  if (susp.suspended) {",
    to: "  const susp = suspensionEffectiveAt({ store, subjectId, bookId, nowIso: clock.now() });\n  if (false) {" },

  { id: 'M58', rule: 'K05/K09', catcher: 'P-REV-claim-read', expect: 'probe_fail',
    what: 'REV-N3b — A DÖNTÉSI ÚTON RÉSZLETES LÉTEZÉSI HIBA: az `adjudicateClaim` a hatáskör-hiba '
      + 'NEVÉT adja vissza, tehát a válasz megmondja, hogy az ÜGY LÉTEZIK (KUKA-084 a csatornán)',
    file: 'adjudication.mjs',
    from: "  if (!row) return CLAIM_NOT_AVAILABLE;\n  const right = adjudicationRightAt({\n    store, subjectId: actorSubjectId, bookId: row.book_id, operation: 'adjudicate', clock });\n  if (!right.allowed) return CLAIM_NOT_AVAILABLE;",
    to: "  if (!row) return CLAIM_NOT_AVAILABLE;\n  const right = adjudicationRightAt({\n    store, subjectId: actorSubjectId, bookId: row.book_id, operation: 'adjudicate', clock });\n  if (!right.allowed) return Object.freeze({ ok: false, error: right.reason, message: right.message });" },

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
];
