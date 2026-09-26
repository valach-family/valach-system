// v3app/public/i18n/fr.mjs — A NEGYEDIK NYELV PRÓBÁJA (LANG-01, R89 §5 utolsó pontja).
//
// MIT BIZONYÍT EZ A FÁJL, ÉS MIT NEM — kimondva, mert a terv erre külön kikötést adott.
//
// BIZONYÍTJA: egy negyedik nyelv a NYELVJEGYZÉKEN és TARTALMON keresztül felvehető, a felületi és a
// segéd-vezérlés átírása nélkül. Egyetlen sor kód nem változott ettől a fájltól: a jegyzékbe egy sor
// került (`languages.mjs`), a csomag pedig ugyanazokat a kulcsokat viszi. A feloldó a kimondott
// visszaesési láncon (fr → en → hu) pótolja, ami itt nincs meg.
//
// NEM BIZONYÍTJA — és ezért `enabled: false` és `kind: 'probe'` a jegyzékben: hogy a francia termék
// bekapcsolható lenne. A csomag SZÁNDÉKOSAN RÉSZLEGES, a fordítása NINCS szakmailag ellenőrizve, és
// a `verify:i18n` mérése ezt SZÁM SZERINT kiírja. „Az új nyelv fordítási munkát és ellenőrzést
// igényel; ezt nem helyettesíti az, hogy egy nyelvi modell tud franciául válaszolni." (R89 §5)
//
// A RÉSZLEGESSÉG SZÁNDÉKOS MÉRŐ-BEMENET IS: ha ez a csomag teljes lenne, a „hiányzó fordítás"
// mérésének nem lenne élő esete, és egy néma zöld mérőt szállítanánk (KUKA-051 · KUKA-089).

export const meta = Object.freeze({
  code: 'fr', complete: false, review: 'PRÓBA — nincs szakmai és nyelvi ellenőrzés',
  probe_note: 'szándékosan részleges: a hiányzó kulcsok a mérés élő esetei',
});

export const PAGE = Object.freeze({
  overview: 'Aperçu',
  processes: 'Processus',
  documents: 'Documents',
  outbox: 'E-mails sortants',
  stock: 'Solde de stock',
  movements: 'Mouvements de stock',
  stockcard: 'Fiche article',
  products: 'Articles',
  partners: 'Partenaires',
  warehouses: 'Entrepôts',
  account: 'Données du compte',
  members: 'Utilisateurs',
  plan: 'Abonnement',
  personal: 'Mes dossiers',
  profile: 'Mon profil',
  security: 'Connexion et sécurité',
  new: 'Ajouter un nouveau compte',
});

export const NAV = Object.freeze({
  operations: 'Opérations',
  reports: 'Rapports',
  masterdata: 'Données de base',
  settings: 'Paramètres',
  ownMatters: 'Mes dossiers',
  ownData: 'Mes données',
});

export const ROLE = Object.freeze({ user: 'Membre', admin: 'Gestionnaire du compte' });
export const SCOPE = Object.freeze({ keszlet: 'Données de stock', arak: 'Prix' });
export const SCOPE_ACC = Object.freeze({ keszlet: 'les données de stock', arak: 'les prix' });
export const PLAN = Object.freeze({ starter: 'Base', pro: 'Étendu' });
export const QUALITY = Object.freeze({ mert: 'Mesuré', becsult: 'Estimé', ismeretlen: 'Inconnu' });

// SZÁNDÉKOSAN RÉSZLEGES: a paraméteres mondatokból csak a leggyakoribbak.
export const TPL = Object.freeze({
  accountOpened: 'Ouvert : {nev}',
  openPage: 'Ouvrir {oldal}',
  itemCount: '{n} positions',
  allOf: 'Tous ({n})',
  tourStepOf: 'Étape {n} sur {osszes}',
  langSwitched: 'Langue de l’interface : {nyelv}',
});

// SZÁNDÉKOSAN RÉSZLEGES: a leggyakoribb nemleges okok.
export const REASON = Object.freeze({
  invalid_credentials: 'L’adresse e-mail ou le mot de passe n’est pas correct.',
  login_required: 'Votre session a expiré. Veuillez vous reconnecter.',
  no_scope_grant: 'Vous n’avez pas encore accès à ces données. Le gestionnaire du compte peut l’autoriser.',
  not_a_member: 'Vous n’avez pas accès à ce compte.',
  admin_required: 'Cette opération nécessite l’autorisation de gestionnaire du compte.',
  network_error: 'Nous n’avons pas pu joindre le système. Veuillez réessayer.',
  assistant_not_configured: 'L’assistant de discussion n’est pas configuré dans cet environnement.',
  generic: 'Cette opération ne peut pas être terminée pour le moment.',
});

export const STATE = Object.freeze({
  loading: 'Chargement…',
  empty: 'Pas encore de données',
  noAccess: 'Pas d’accès',
  demo: 'Démo · données d’exemple',
  unknownQty: 'Inconnu',
  noPrice: 'Non indiqué',
  personalAccount: 'Compte personnel',
});

export const UI = Object.freeze({
  close: 'Fermer',
  cancel: 'Annuler',
  refresh: 'Actualiser',
  details: 'Détails',
  language: 'Langue',
  logout: 'Se déconnecter',
  technicalDetails: 'Détails techniques',
  mainMenu: 'Menu principal',
  chooseAccount: 'Choisissez un compte',
});

export const HELP = Object.freeze({
  open: 'Aide',
  title: 'Aide',
  tabAsk: 'Demander',
  tabGuides: 'Guides',
  tabFaq: 'Questions fréquentes',
  tabSitemap: 'Plan du site',
  whatFor: 'À quoi ça sert',
  prerequisites: 'Ce qu’il faut',
  result: 'Quel sera le résultat',
  outcomes: 'Ce qui peut arriver',
  searchGuides: 'Rechercher dans les guides',
  translationMissing: 'Il n’y a pas encore de traduction pour cette langue — le texte est affiché en hongrois.',
});

export const TOURUI = Object.freeze({
  title: 'Visite guidée',
  next: 'Suivant',
  back: 'Retour',
  finish: 'Terminer',
  exit: 'Quitter',
});

export const CHAT = Object.freeze({
  title: 'Demander',
  intro: 'Comment puis-je vous aider ?',
  send: 'Envoyer la question',
  source: 'Guide utilisé',
  notConfigured: 'L’assistant de discussion n’est pas configuré dans cet environnement.',
});

// A FUNKCIÓ-TUDÁS: CSAK KETTŐ, szándékosan — ez mutatja meg, hogy a mérés a hiányt kiírja.
export const KB = Object.freeze({
  'shell.language': Object.freeze({
    title: 'La langue de l’interface',
    purpose: 'Vous pouvez choisir la langue de l’interface, de l’aide, des questions fréquentes et de l’assistant.',
    prereq: 'Aucune.',
    result: 'La langue choisie s’applique immédiatement. Le pays, le régime fiscal, le fuseau horaire et la devise n’en dépendent PAS.',
    outcomes: Object.freeze({ success: 'La langue est configurée.' }),
  }),
  'shell.help': Object.freeze({
    title: 'Aide',
    purpose: 'Quatre vues dans un seul panneau : Demander · Guides · Questions fréquentes · Plan du site. C’est vous qui ouvrez le panneau.',
    prereq: 'Aucune. L’aide, les questions fréquentes, le plan du site et la visite guidée fonctionnent sans appel de modèle.',
    result: 'Les sujets de l’écran courant apparaissent en premier.',
    outcomes: Object.freeze({
      success: 'Le panneau est ouvert.',
      empty: 'Il n’y a pas encore de guide vérifié pour cet écran.',
      refused: 'Vous n’avez pas accès à ces connaissances dans ce compte.',
    }),
  }),
});

export const FAQ = Object.freeze({
  'faq.lang.country': Object.freeze({
    q: 'Si je passe au français, le régime fiscal ou la devise change-t-il ?',
    a: 'Non. La langue de l’interface ne choisit NI pays, NI régime fiscal, NI fuseau horaire, NI devise. Ceux-ci viennent des données du compte.',
  }),
});

export const TOUR = Object.freeze({
  'tour.language': Object.freeze({
    title: 'La langue de l’interface',
    lead: 'Deux étapes.',
    s1: Object.freeze({ title: 'Mon profil', body: 'La page « Mon profil » s’ouvre depuis le menu de profil en haut à droite.' }),
    s2: Object.freeze({ title: 'Choisir la langue', body: 'Le choix s’applique aussitôt à l’interface, à l’aide, aux questions fréquentes et à l’assistant.' }),
  }),
});

export const KB_SOURCE = Object.freeze({
  'shell.language': Object.freeze({ source_version: '1.0.0', review: 'probe' }),
  'shell.help': Object.freeze({ source_version: '1.0.0', review: 'probe' }),
});

// A HIÁNYZÓ CSOPORTOK KIMONDVA (nem feledékenység): `UNBOUND` — a visszaesési lánc adja.
export const UNBOUND = Object.freeze({});

// SZÁNDÉKOSAN RÉSZLEGES: csak a két lefordított funkció kulcsszavai.
export const SEARCH = Object.freeze({
  'shell.language': 'langue changer de langue hongrois anglais allemand traduction langue de l’interface',
  'shell.help': 'aide guide guides questions fréquentes plan du site où puis-je demander',
});
