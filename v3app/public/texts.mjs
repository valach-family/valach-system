// v3app/public/texts.mjs — A FELÜLET EGYETLEN SZÖVEGFORRÁSA (SZO-01, R81 §6).
//
// MIÉRT EGY HELYEN. Az R81-es terv lelete: ugyanaz a fogalom a menüben, az oldalcímben és a gombon
// más nevet kapott, a képernyő pedig belső szavakkal beszélt („csatorna", „plafon", „könyv", „kapu").
// Ezért a menücím, az oldalcím, a gomb-felirat, az állapot-mondat és a SZERVER hibakódjának emberi
// megfelelője MIND innen jön. Aki új képernyőt ír, ide vesz fel szöveget — nem a sablonba égeti
// (KUKA-039: egy szabály, egy otthon; a beégetett felirat a V2-ben külön tiltott minta).
//
// AMI NEM ITT VAN: a szerver válaszainak TARTALMA (azt a mag mondja meg) és a jogosultság. Ez a fájl
// csak FORDÍT: gépi okból emberi mondatot csinál, és soha nem dönt jogról.

/** A bal menü és az oldalcímek — ugyanaz a szó mindkét helyen (R81 §3.4 · UX-04). */
export const PAGE = Object.freeze({
  overview: 'Áttekintés',
  processes: 'Folyamatok',
  documents: 'Bizonylatok',
  outbox: 'Kimenő e-mailek',
  stock: 'Készletegyenleg',
  movements: 'Készletmozgások',
  stockcard: 'Termékkarton',
  products: 'Termékek',
  partners: 'Partnerek',
  warehouses: 'Raktárak',
  account: 'Fiók adatai',
  members: 'Felhasználók',
  plan: 'Előfizetés',
  personal: 'Ügyleteim',
  profile: 'Saját profil',
  security: 'Belépés és biztonság',
  new: 'Vállalkozás hozzáadása',
});

/** A menü csoportjai — a V2 elnevezéseivel, üres pontok nélkül (R81 §3.4). */
export const NAV_GROUPS = Object.freeze([
  Object.freeze({ group: null, pages: Object.freeze(['overview']) }),
  Object.freeze({ group: 'Műveletek', pages: Object.freeze(['processes', 'documents', 'outbox']) }),
  Object.freeze({ group: 'Riportok', pages: Object.freeze(['stock', 'movements', 'stockcard']) }),
  Object.freeze({ group: 'Törzsadatok', pages: Object.freeze(['products', 'partners', 'warehouses']) }),
]);
export const NAV_ADMIN = Object.freeze({ group: 'Beállítások', pages: Object.freeze(['account', 'members', 'plan']) });
/**
 * A SZEMÉLYES FIÓK MENÜJE. Rövidebb, mint a vállalkozásé: nincs Beállítások csoport (nincs kit
 * meghívni és nincs céges előfizetés), de AMI MŰKÖDIK, azt nem rejtjük el — a mag a személyes
 * fiókban is kiadja a készlet-nézetet, ezért a Riportok csoport itt is áll (KUKA-092: a tiltás
 * nem helyettesíti a megépítést).
 */
export const NAV_PERSONAL = Object.freeze([
  Object.freeze({ group: null, pages: Object.freeze(['overview']) }),
  Object.freeze({ group: 'Saját ügyek', pages: Object.freeze(['personal']) }),
  Object.freeze({ group: 'Riportok', pages: Object.freeze(['stock', 'movements', 'stockcard']) }),
]);

/** Szerep és adatkör: a felületen EMBERI név, a szerveren a mag szava (R81 §6). */
export const ROLE = Object.freeze({ user: 'Tag', admin: 'Fiókkezelő' });
export const SCOPE = Object.freeze({ keszlet: 'Készletadatok', arak: 'Árak' });
export const PLAN = Object.freeze({ starter: 'Alap', pro: 'Bővített' });

/**
 * A SZERVER OKAI → EMBERI MONDAT (R81 §6 · §6.1).
 *
 * A kulcs a mag/HTTP-határ `reason` mezője. Ami itt nincs, az NEM tűnik el: a hívó a nevezett
 * általános mondatot kapja, és a technikai kódot a „Technikai részletek" alatt (KUKA-201: a nemleges
 * válasz is vigye a MŰKÖDŐ folytatást).
 */
export const REASON = Object.freeze({
  invalid_credentials: 'Az e-mail-cím vagy a jelszó nem megfelelő.',
  credentials_rejected: 'Az e-mail-cím vagy a jelszó nem megfelelő.',
  login_required: 'A bejelentkezésed lejárt. Jelentkezz be újra.',
  channel_not_proven: 'A folytatáshoz erősítsd meg az e-mail-címedet.',
  challenge_expired: 'Ez a megerősítő link lejárt.',
  challenge_used: 'Ezt a linket már felhasználták.',
  challenge_superseded: 'Használd a legutóbbi megerősítő levél linkjét.',
  challenge_not_found: 'Ez a megerősítő link nem használható.',
  channel_already_proven: 'Ez az e-mail-cím már meg van erősítve.',
  resend_rate_limited: 'Túl gyakran kértél új levelet. Várj egy kicsit, és próbáld újra.',
  no_scope_grant: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
  not_available: 'Ehhez az adathoz még nincs hozzáférésed. A fiókkezelő tudja engedélyezni.',
  feature_not_in_plan: 'Ez a funkció nincs benne a jelenlegi csomagban.',
  not_a_member: 'Ehhez a fiókhoz nincs hozzáférésed.',
  admin_required: 'Ehhez a művelethez fiókkezelői jogosultság kell.',
  role_not_delegable: 'Ezt a szerepkört nem adhatod tovább.',
  scope_not_delegable: 'Ezt az adatkört nem adhatod tovább.',
  authority_not_established: 'Ezt a módosítást nem végezheted el.',
  outside_basis_operations: 'Ez a művelet nincs a felhatalmazásod körében.',
  context_mismatch: 'A módosítást nem mentettük, mert közben másik fiókra váltottál.',
  tax_id_value_required: 'Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.',
  invalid_type: 'A megadott érték alakja nem megfelelő.',
  invalid_value: 'A megadott érték nem választható.',
  missing_field: 'Egy kötelező mező hiányzik.',
  unknown_field: 'A kérés nem megengedett mezőt tartalmazott.',
  invite_expired: 'Ez a meghívó lejárt. Kérj új meghívót attól, aki meghívott.',
  invite_already_redeemed: 'Ezt a meghívót már felhasználták.',
  invite_unknown: 'Ehhez a hivatkozáshoz nem tartozik beváltható meghívás.',
  invite_terms_changed: 'A meghívás feltételei időközben megváltoztak. Kérj új meghívót attól, aki meghívott.',
  issuer_right_withdrawn: 'Aki a meghívót kiadta, már nem jogosult rá. Kérj új meghívót a fiók kezelőjétől.',
  invitee_mismatch: 'Ez a meghívó másik e-mail-címre szól.',
  workspace_required: 'Válassz fiókot a folytatáshoz.',
  // A CÉGAZONOSÍTÓ ÜTKÖZÉSE NEM ÁRULJA EL, KIÉ A MÁSIK FIÓK (R81 §5/06 · KUKA-084): a mondat a
  // KÖVETKEZŐ LÉPÉST adja meg, nem idegen tulajdonost vagy e-mail-címet.
  business_identity_already_attached: 'Ehhez az adóazonosítóhoz már tartozik fiók. Ha a vállalkozásod már használja a rendszert, kérj meghívót attól, aki kezeli.',
  creator_channel_unproven: 'A folytatáshoz erősítsd meg az e-mail-címedet.',
  personal_space_exists: 'Ehhez a belépéshez már tartozik személyes fiók.',
  name_required: 'Add meg a vállalkozás nevét.',
  value_required: 'Add meg az adóazonosítót. Csak szóköz vagy kötőjel nem elegendő.',
  namespace_not_in_profile: 'Ebben az országban vagy területen más azonosítót tartunk nyilván. Válassz másik országot, vagy hagyd üresen a mezőt.',
  network_error: 'Nem sikerült elérni a rendszert. Ellenőrizd a kapcsolatot, és próbáld újra.',
  invalid_response: 'Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.',
});

/** Állandó állapot-szövegek — egy helyzet, egy mondat (R81 §6.1). */
export const STATE = Object.freeze({
  loading: 'Betöltés…',
  empty: 'Még nincs adat',
  noResult: 'Nincs a szűrésnek megfelelő találat.',
  noAccess: 'Nincs hozzáférés',
  loadFailed: 'Nem sikerült betölteni az adatokat.',
  saveUncertain: 'Nem tudjuk biztosan, hogy a mentés befejeződött. Ellenőrizd az állapotot, mielőtt újra próbálod.',
  unbound: 'Az adatokat nem tudtuk biztonságosan megjeleníteni. Frissítsd az oldalt.',
  demo: 'Bemutató · mintaadatok',
  demoMail: 'Bemutatóüzenet. Valódi e-mailt nem küldtünk.',
  noMembers: 'Még nem hívtál meg másokat.',
  noAccount: 'Nincs megnyitott fiók.',
  planMissingAdmin: 'Ez a funkció nincs benne a jelenlegi csomagban.',
  planMissingMember: 'Ez a funkció nincs benne a vállalkozás csomagjában. A fiókkezelő tud segíteni.',
  unknownQty: 'Nem ismert',
  noUnit: 'Egység nincs megadva',
  noPrice: 'Nincs megadva',
  noCurrency: 'Pénznem nincs megadva',
});

/** Egy gépi ok emberi mondata; ismeretlen oknál nevezett, de érthető tartalék. */
export function reasonText(reason, fallback) {
  if (reason && Object.prototype.hasOwnProperty.call(REASON, reason)) return REASON[reason];
  return fallback || 'A művelet most nem fejezhető be.';
}

/** Dátum a FELHASZNÁLÓ időzónájában, ISO helyett (R81 §6). */
export function whenText(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
