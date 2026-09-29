// v3app/public/inviteText.mjs — A MEGHÍVÓ LAPJÁNAK „KÖVETKEZŐ LÉPÉS" MONDATA (R112 · P109-02).
//
// MIÉRT KÜLÖN FÁJL. A döntés — melyik állapotban melyik mondat áll a „Mi a következő lépés" sorban —
// tiszta függvény, és ugyanezt a fájlt futtatja a lap (`app.js`) és a gépi őr (`verify:i18n`
// I18N-R112): amit a próba nem tud MEGHÍVNI, azt bizalomból hinnénk (KUKA-207).
//
// A LELET, AMI IDE HOZTA (R112, saját): a sor a mag `message` mezőjét írta ki — a mag MAGYAR
// diagnosztikáját („állíts be belépést ehhez a címhez…"), angol és német felületen is. A bemutató
// harmadik lépése épp erre a sorra mutat („ez a mondat mindig a mostani állapotra szól"), tehát a
// hiba a segítség közepén állt (KUKA-210: a mag szava nem a felhasználó szava).
//
// AMIT NEM TESZ: nem árul el többet, mint a szerver megfigyelése. A névtelen néző és a más fiókkal
// belépett néző SEMLEGES választ kap (KUKA-084) — ezért ott a mondat FELTÉTELES („ha a meghívás
// másik címre szól…"), mert az ismeretlen hivatkozás és az eltérő címzett a szerver szerint
// megkülönböztethetetlen, és ezt a felület sem találhatja ki.

/** Az állapot → a mondat kulcsa az UI csoportban. Zárt lista: ismeretlen állapot a legóvatosabb ágra esik. */
export const INVITE_NEXT = Object.freeze({
  accept: 'inviteNextAccept',            // beváltható, és a meghívott címmel vagy belépve
  register: 'inviteNextRegister',        // beváltható, ehhez a címhez még nincs belépés
  login: 'inviteNextLogin',              // beváltható, van belépés a címhez, de most senki nincs bent
  otherAccount: 'inviteOtherPersonLead', // semleges válasz, valaki be van lépve
  identify: 'inviteWrongAddress',        // semleges válasz, névtelen néző
  used: 'inviteNextUsed',                // már felhasznált meghívó
  renew: 'inviteNextNewInvite',          // lejárt · a kiadó joga megszűnt · más nem beváltható ok
});

/** Melyik mondat áll a „következő lépés" sorban — a SZERVER megfigyeléséből és a belépés tényéből. */
export function inviteNextKey(observe, loggedIn) {
  const o = observe || {};
  if (o.status === 'redeem_as_existing') return loggedIn ? INVITE_NEXT.accept : INVITE_NEXT.login;
  if (o.status === 'redeem_as_new') return INVITE_NEXT.register;
  if (o.status === 'not_actionable') return o.reason === 'invite_already_redeemed' ? INVITE_NEXT.used : INVITE_NEXT.renew;
  return loggedIn ? INVITE_NEXT.otherAccount : INVITE_NEXT.identify;
}
