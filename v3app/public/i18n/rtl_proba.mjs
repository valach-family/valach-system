// v3app/public/i18n/rtl_proba.mjs — JOBBRÓL BALRA ÍRT PRÓBATARTALOM (LANG-01, R89 §5).
//
// MIT MÉR, ÉS MIT NEM — ez a fájl fejlécében áll, mert a félreértése kár lenne.
//
// MÉRI: az ALAPELRENDEZÉST jobbról balra írt tartalommal. A felület `dir` attribútuma a
// nyelvjegyzékből jön (`ar-x-proba` → `dir: 'rtl'`), és a lap ettől tükröz: a menü, a panel, a
// táblázat-igazítás és a bemutató-buborék helyzete mérhetővé válik.
//
// NEM ARAB FORDÍTÁS, és nem is arab termék-nyelv. A kód SZÁNDÉKOSAN privát alhasználat-jelöléses
// (`ar-x-proba`, RFC 5646 privát alcímke), a jegyzékben `enabled: false` és `kind: 'probe'` — így
// senki nem hiheti, hogy arab nyelven szállítottunk valamit (KUKA-050: a szöveg a valóságot követi).
// A tartalom rövid, mert a célja az IRÁNY mérése, nem a teljes lefedés.

export const meta = Object.freeze({
  code: 'ar-x-proba', complete: false, review: 'RTL PRÓBA — nem fordítás',
  probe_note: 'az elrendezés irányát méri; a szavak nem termék-szövegek',
});

export const PAGE = Object.freeze({
  overview: 'نظرة عامة',
  processes: 'العمليات',
  documents: 'المستندات',
  outbox: 'الرسائل الصادرة',
  stock: 'رصيد المخزون',
  movements: 'حركات المخزون',
  stockcard: 'بطاقة الصنف',
  products: 'الأصناف',
  partners: 'الشركاء',
  warehouses: 'المستودعات',
  account: 'بيانات الحساب',
  members: 'المستخدمون',
  plan: 'الاشتراك',
  personal: 'ملفاتي',
  profile: 'ملفي الشخصي',
  security: 'الدخول والأمان',
  new: 'إضافة حساب جديد',
});

export const NAV = Object.freeze({
  operations: 'العمليات',
  reports: 'التقارير',
  masterdata: 'البيانات الأساسية',
  settings: 'الإعدادات',
  ownMatters: 'ملفاتي',
  ownData: 'بياناتي',
});

export const ROLE = Object.freeze({ user: 'عضو', admin: 'مدير الحساب' });
export const SCOPE = Object.freeze({ keszlet: 'بيانات المخزون', arak: 'الأسعار' });
export const STATE = Object.freeze({
  loading: 'جار التحميل…',
  empty: 'لا توجد بيانات بعد',
  noAccess: 'لا يوجد وصول',
  demo: 'عرض · بيانات نموذجية',
  unknownQty: 'غير معروف',
});
export const UI = Object.freeze({
  close: 'إغلاق',
  cancel: 'إلغاء',
  refresh: 'تحديث',
  details: 'التفاصيل',
  language: 'اللغة',
  mainMenu: 'القائمة الرئيسية',
});
export const HELP = Object.freeze({
  open: 'مساعدة',
  title: 'مساعدة',
  tabAsk: 'اسأل',
  tabGuides: 'الأدلة',
  tabFaq: 'الأسئلة الشائعة',
  tabSitemap: 'خريطة الموقع',
});
export const TOURUI = Object.freeze({ title: 'جولة', next: 'التالي', back: 'رجوع', finish: 'إنهاء', exit: 'خروج' });
export const CHAT = Object.freeze({ title: 'اسأل', intro: 'كيف أساعدك؟', send: 'إرسال السؤال' });
export const SCOPE_ACC = Object.freeze({});
export const PLAN = Object.freeze({});
export const QUALITY = Object.freeze({});
export const TPL = Object.freeze({});
export const REASON = Object.freeze({});
export const UNBOUND = Object.freeze({});
export const KB = Object.freeze({});
export const FAQ = Object.freeze({});
export const TOUR = Object.freeze({});
export const KB_SOURCE = Object.freeze({});
export const SEARCH = Object.freeze({});
