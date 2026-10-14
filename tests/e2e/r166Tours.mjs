// tests/e2e/r166Tours.mjs — AZ R166 §3-BAN PÓTOLT ÚTMUTATÓK LISTÁJA, EGY OTTHONBAN.
//
// MIÉRT NEM EGY PRÓBA-LAPON ÁLL. Két próba használja: a SAJÁT élő tanúja
// (`v3app-r166-utmutatok.spec.mjs`, ami végigkattintja mindet) és az R93 lefedés-állítása, ami azt
// méri, hogy a regiszter MINDEN bejárandó útmutatója kapott élő tanút. Ha a lista két helyen állna,
// a kettő előbb-utóbb elcsúszik (KUKA-003: egy szabály, egy otthon) — a Playwright pedig
// NEVEZETTEN tiltja, hogy egy próba-lap egy másikat importáljon.
//
// A DARABSZÁMOT NEM ÍRJUK LE: ez a lista MAGA a készlet, és a próbák ehhez mérnek (KUKA-045).
export const UJ_UTMUTATOK = Object.freeze(['tour.verify', 'tour.login', 'tour.resend', 'tour.logout',
  'tour.personalAccount', 'tour.documents', 'tour.partners', 'tour.assistant', 'tour.products',
  'tour.stockcard', 'tour.movements', 'tour.outbox']);
