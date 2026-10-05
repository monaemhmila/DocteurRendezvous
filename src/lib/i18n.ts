export type Language = "fr" | "en" | "ar";

export interface Translations {
  // Navigation
  nav: {
    workspace: string;
    automation: string;
    insights: string;
    settings: string;
    dashboard: string;
    agenda: string;
    patients: string;
    conversations: string;
    recovery: string;
    aiAssistant: string;
    followups: string;
    waitlist: string;
    noShows: string;
    analytics: string;
    revenue: string;
    clinic: string;
    team: string;
    aiSettings: string;
    communication: string;
    integrations: string;
    patientRecovery: string;
  };
  // Topbar
  topbar: {

  
    searchPlaceholder: string;
    notifications: string;
    markAllRead: string;
    noNotifications: string;
    help: string;
    gettingStarted: string;
    howRecoveryWorks: string;
    contactSupport: string;
    currentClinic: string;
    active: string;
    interfaceLanguage: string;
    clinicSettings: string;
    team: string;
    logout: string;
  };
  // Clinic Settings
  clinicSettings: {
    title: string;
    subtitle: string;
    save: string;
    saving: string;
    generalInfo: string;
    generalInfoDesc: string;
    clinicName: string;
    clinicNamePlaceholder: string;
    specialty: string;
    specialtyPlaceholder: string;
    address: string;
    addressPlaceholder: string;
    phone: string;
    phonePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    businessHours: string;
    businessHoursDesc: string;
    openingHours: string;
    openingHoursPlaceholder: string;
    savedSuccess: string;
    saveError: string;
    activeBadge: string;
    verifiedClinic: string;
    quickStats: string;
    plan: string;
  };
  // Team Settings & Permissions
  teamSettings: {
    title: string;
    subtitle: string;
    addMember: string;
    editMember: string;
    deleteMember: string;
    deleteConfirm: string;
    totalMembers: string;
    doctorsCount: string;
    staffCount: string;
    activeAccounts: string;
    memberList: string;
    memberListDesc: string;
    permissionsTitle: string;
    permissionsDesc: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    specialty: string;
    role: string;
    password: string;
    passwordPlaceholder: string;
    status: string;
    active: string;
    inactive: string;
    saveMember: string;
    saving: string;
    createdSuccess: string;
    updatedSuccess: string;
    deletedSuccess: string;
    statusUpdated: string;
    passwordResetSuccess: string;
    roles: {
      clinic_owner: string;
      dentist: string;
      receptionist: string;
      assistant: string;
      super_admin: string;
    };
    permissions: {
      appointmentsTitle: string;
      appointmentsDesc: string;
      patientsTitle: string;
      patientsDesc: string;
      conversationsTitle: string;
      conversationsDesc: string;
      aiConfigTitle: string;
      aiConfigDesc: string;
      analyticsTitle: string;
      analyticsDesc: string;
      settingsTitle: string;
      settingsDesc: string;
    };
  };
  // Common
  common: {
    save: string;
    cancel: string;
    loading: string;
    success: string;
    error: string;
    active: string;
    inactive: string;
    edit: string;
    delete: string;
    actions: string;
    resetPassword: string;
    confirm: string;
  };
  // Patients Page
  patientsPage: {
    title: string;
    subtitle: string;
    newPatient: string;
    successAdd: string;
    errorAdd: string;
    firstName: string;
    lastName: string;
    firstNameEx: string;
    lastNameEx: string;
    phone: string;
    email: string;
    emailOptional: string;
    createPatient: string;
    searchPlaceholder: string;
    selected: string;
    message: string;
    campaign: string;
    export: string;
    loadingPatients: string;
    errorLoading: string;
    patient: string;
    contact: string;
    lastVisit: string;
    status: string;
    visits: string;
    noPatientSearch: string;
    noPatient: string;
  };
  // Agenda Page
  agendaPage: {
    title: string;
    subtitleDay: string;
    subtitleWeek: string;
    subtitleMonth: string;
    subtitleList: string;
    today: string;
    day: string;
    week: string;
    month: string;
    list: string;
    newAppointment: string;
    planAppointment: string;
    selectPatient: string;
    date: string;
    startTime: string;
    treatment: string;
    duration: string;
    notes: string;
    notesPlaceholder: string;
    cancel: string;
    save: string;
    statsTotal: string;
    statsConfirmed: string;
    statsPending: string;
    statsAi: string;
    statsRevenue: string;
    searchPlaceholder: string;
    filterAll: string;
    filterConfirmed: string;
    filterScheduled: string;
    filterCompleted: string;
    filterCancelled: string;
    filterNoShow: string;
    sourceAll: string;
    sourceAi: string;
    sourceManual: string;
    treatmentsAll: string;
    reset: string;
    errorLoading: string;
    retry: string;
    syncing: string;
    freeSlot: string;
  };
  // Dashboard Page
  dashboardPage: {
    hello: string;
    loadingError: string;
    loadingErrorDesc: string;
    startRecovery: string;
    aiPerformance: string;
    aiPerformanceDesc: string;
    automationRate: string;
    recoveredRevenue: string;
    last30days: string;
    apptsToday: string;
    confirmedAppts: string;
    patientsToRecover: string;
    thisMonth: string;
    recentNoShows: string;
    last7days: string;
    activeConversations: string;
    needsHuman: string;
    todayAgenda: string;
    plannedAppts: string;
    viewAgenda: string;
    noApptsToday: string;
    unknownPatient: string;
    unspecifiedTreatment: string;
    aiPriorities: string;
    contactFirst: string;
    seeAll: string;
    noPriority: string;
    needsFollowup: string;
    recoveryFunnel: string;
    noData: string;
    freeSlots: string;
    fillWithWaitlist: string;
    waitlist: string;
    aiActivity: string;
    last24h: string;
    inbox: string;
    estimatedImpact: string;
    simulationBased: string;
    potentialRemaining: string;
    messagesProcessed: string;
    apptsCreated: string;
  };
  // Conversations Page
  conversationsPage: {
    title: string;
    subtitle: string;
    live: string;
    hideSimulator: string;
    openSimulator: string;
    viewAgenda: string;
    searchPlaceholder: string;
    filterAll: string;
    filterAi: string;
    filterHuman: string;
    loadingConvs: string;
    noConvs: string;
    humanRequired: string;
    aiHandled: string;
    patientRecord: string;
    whatsappBusiness: string;
    loadPrevMsgs: string;
    loadingMsgs: string;
    noMsgsTitle: string;
    noMsgsDesc: string;
    typeMsg: string;
    whatsappSimulator: string;
    simDesc: string;
    online: string;
    patientId: string;
    simNewConv: string;
    quickScenarios: string;
    scenario1Label: string;
    scenario1Text: string;
    scenario2Label: string;
    scenario2Text: string;
    scenario3Label: string;
    scenario3Text: string;
    scenario4Label: string;
    scenario4Text: string;
    scenario5Label: string;
    scenario5Text: string;
    clearSim: string;
    simWarning: string;
    simulatorSubtitle: string;
    directTestMode: string;
    simPatientLabel: string;
    simPatientUnknown: string;
    clinicName: string;
    onlineStatus: string;
    welcomeMsg: string;
    writeAsPatient: string;
    suggestionSuccess: string;
    suggestionError: string;
    sendError: string;
    simSuccess: string;
    simError: string;
    patient: string;
    aiBot: string;
    received: string;
    delivered: string;
    writeManualReply: string;
    aiTip: string;
    enterToSend: string;
    selectConvTitle: string;
    selectConvDesc: string;
    simulatorTitle: string;
  };
  // AI Assistant Page
  aiAssistantPage: {
    title: string;
    subtitle: string;
    saveBtn: string;
    saving: string;
    successSave: string;
    errorSave: string;
  };
  // AI Assistant Page
  waitlistPage: {
    title: string;
    subtitle: string;
  };
  followupsPage: {
    title: string;
    subtitle: string;
  };
  // Recovery Page
  recoveryPage: {
    title: string;
    subtitle: string;
    detect: string;
    launchCampaign: string;
    analyzed: string;
    toRecover: string;
    contacted: string;
    replied: string;
    recoveredAppts: string;
    completed: string;
    estimatedValue: string;
    bookedValue: string;
    recoveredValue: string;
    funnelTitle: string;
    funnelSubtitle: string;
    funnelIdentified: string;
    funnelContacted: string;
    funnelReplied: string;
    funnelBooked: string;
    funnelVisited: string;
    opportunitiesTitle: string;
    opportunitiesSubtitle: string;
    campaigns: string;
    colPatient: string;
    colType: string;
    colReason: string;
    colPriority: string;
    colEstValue: string;
    colStatus: string;
    colDetectedOn: string;
    unknownPatient: string;
    viewBtn: string;
    errorLoading: string;
    noOpportunities: string;
    typeInactive: string;
    typeInterrupted: string;
    typePendingQuote: string;
    typeNoShow: string;
    typeCancellation: string;
    typeOverdue: string;
    typeFollowUp: string;
    statusIdentified: string;
    statusQueued: string;
    statusContacted: string;
    statusResponded: string;
    statusBooked: string;
    statusVisited: string;
    statusNoResponse: string;
    statusDismissed: string;
    detectionComplete: string;
    detectionError: string;
  };
}

export const translations: Record<Language, Translations> = {
  fr: {
    conversationsPage: {
      title: "Boîte de réception & Chatbot WhatsApp IA",
      subtitle: "Gérez les conversations et testez l'IA WhatsApp en temps réel.",
      live: "Live 24/7",
      hideSimulator: "Masquer le Simulateur",
      openSimulator: "📱 Ouvrir le Simulateur Patient",
      viewAgenda: "Voir l'agenda",
      searchPlaceholder: "Rechercher par nom, tél...",
      filterAll: "Toutes",
      filterAi: "IA",
      filterHuman: "Humain Requis",
      loadingConvs: "Chargement des conversations...",
      noConvs: "Aucune conversation pour le moment.",
      humanRequired: "Intervention Humaine Requise",
      aiHandled: "Géré par l'IA",
      patientRecord: "Ouvrir dossier patient",
      whatsappBusiness: "WhatsApp Business API",
      loadPrevMsgs: "Charger les anciens messages",
      loadingMsgs: "Chargement...",
      noMsgsTitle: "Aucun message",
      noMsgsDesc: "Cette conversation ne contient aucun message ou n'a pas pu être chargée.",
      typeMsg: "Écrire un message en tant que clinique...",
      whatsappSimulator: "Simulateur WhatsApp (Test Patient)",
      simDesc: "Testez l'IA en temps réel. Mettez-vous à la place d'un patient et envoyez des messages pour voir comment l'assistant réagit (Prise de RDV, Urgence, Tarifs...).",
      online: "en ligne",
      patientId: "ID:",
      simNewConv: "Simuler un nouveau patient",
      quickScenarios: "Scénarios rapides à tester :",
      scenario1Label: "📅 Détartrage",
      scenario1Text: "Bonjour, je voudrais prendre un rendez-vous pour un détartrage cette semaine svp.",
      scenario2Label: "⏱️ Confirmer",
      scenario2Text: "Parfait, le créneau de 11h30 me convient très bien ! Je confirme.",
      scenario3Label: "🚨 Urgence",
      scenario3Text: "Bonjour docteur, j'ai une rage de dents insupportable depuis ce matin, pouvez-vous me prendre en urgence ?",
      scenario4Label: "💰 Tarifs",
      scenario4Text: "Bonjour, pouvez-vous me renseigner sur le prix d'un implant ou d'un blanchiment ?",
      scenario5Label: "🧑‍⚕️ Docteur",
      scenario5Text: "J'aimerais parler directement au médecin concernant mon traitement d'hier.",
      clearSim: "Effacer la conversation test",
      simWarning: "Vous simulez le patient avec le faux numéro :",
      simulatorSubtitle: "Simulateur WhatsApp",
      directTestMode: "Mode test direct",
      simPatientLabel: "Patient simulé :",
      simPatientUnknown: "Patient inconnu",
      clinicName: "Votre Clinique",
      onlineStatus: "en ligne",
      welcomeMsg: "Message de bienvenue",
      writeAsPatient: "Écrire en tant que patient...",

      suggestionSuccess: "Suggestion copiée !",
      suggestionError: "Erreur de suggestion",
      sendError: "Erreur d'envoi",
      simSuccess: "Message test envoyé !",
      simError: "Erreur de simulation",
      patient: "Patient",
      aiBot: "Bot IA",
      received: "Reçu",
      delivered: "Distribué",
      writeManualReply: "Écrire une réponse manuelle...",
      aiTip: "L'IA gère automatiquement cette conversation.",
      enterToSend: "Appuyez sur Entrée pour envoyer",
      selectConvTitle: "Sélectionnez une conversation",
      selectConvDesc: "Choisissez une conversation à gauche ou commencez un test dans le simulateur.",
      simulatorTitle: "Simulateur WhatsApp",
    },
    nav: {
      workspace: "Workspace",
      automation: "Automatisation",
      insights: "Insights",
      settings: "Réglages",
      dashboard: "Tableau de bord",
      agenda: "Agenda",
      patients: "Patients",
      conversations: "Conversations",
      recovery: "Récupération patients",
      aiAssistant: "Assistant IA",
      followups: "Relances",
      waitlist: "Liste d'attente",
      noShows: "Absences",
      analytics: "Analytics",
      revenue: "Revenus récupérés",
      clinic: "Cabinet",
      team: "Équipe",
      aiSettings: "Paramètres IA",
      communication: "Communication",
      integrations: "Intégrations",
      patientRecovery: "Récupération patients",
    },
    topbar: {
      searchPlaceholder: "Rechercher un patient, un rendez-vous…",
      notifications: "Notifications",
      markAllRead: "Tout marquer comme lu",
      noNotifications: "Aucune notification",
      help: "Aide",
      gettingStarted: "Guide de démarrage",
      howRecoveryWorks: "Comment fonctionne la récupération",
      contactSupport: "Contacter le support",
      currentClinic: "Cabinet Actif",
      active: "Actif",
      interfaceLanguage: "Langue de l'interface",
      clinicSettings: "Réglages du cabinet",
      team: "Équipe",
      logout: "Se déconnecter",
    },
    clinicSettings: {
      title: "Paramètres du Cabinet",
      subtitle: "Gérez les coordonnées officielles, la spécialité et les informations publiques de votre établissement.",
      save: "Enregistrer les modifications",
      saving: "Enregistrement en cours...",
      generalInfo: "Informations Générales",
      generalInfoDesc: "Ces coordonnées sont utilisées par l'IA pour orienter les patients et pour les messages de confirmation WhatsApp.",
      clinicName: "Nom du cabinet / Établissement",
      clinicNamePlaceholder: "Ex: Cabinet Médical Dr. Sami Ben Amor",
      specialty: "Spécialité médicale",
      specialtyPlaceholder: "Ex: Cardiologie, Dentaire, Pédiatrie, Généraliste...",
      address: "Adresse complète",
      addressPlaceholder: "Ex: Immeuble Coral, 2ème étage, Les Berges du Lac 2, Tunis",
      phone: "Numéro de téléphone officiel",
      phonePlaceholder: "Ex: +216 71 962 480",
      email: "Email professionnel du cabinet",
      emailPlaceholder: "Ex: contact@cabinet-medical.tn",
      businessHours: "Horaires & Disponibilités",
      businessHoursDesc: "Indiquez les plages d'ouverture du cabinet prises en compte pour les réservations.",
      openingHours: "Horaires d'ouverture",
      openingHoursPlaceholder: "Ex: Du Lundi au Vendredi de 08h30 à 18h00, Samedi de 08h30 à 13h00",
      savedSuccess: "Les informations du cabinet ont été enregistrées avec succès !",
      saveError: "Erreur lors de la mise à jour des paramètres du cabinet.",
      activeBadge: "Compte Cabinet Actif",
      verifiedClinic: "Cabinet vérifié & synchronisé avec l'IA",
      quickStats: "Vue d'ensemble",
      plan: "Formule Pro",
    },
    teamSettings: {
      title: "Gestion de l'Équipe & des Accès",
      subtitle: "Configurez les collaborateurs du cabinet (médecins, secrétaires, assistants) et personnalisez précisément leurs permissions d'accès.",
      addMember: "Ajouter un membre",
      editMember: "Modifier le membre & ses accès",
      deleteMember: "Supprimer le membre",
      deleteConfirm: "Êtes-vous sûr de vouloir supprimer ce membre de l'équipe ?",
      totalMembers: "Total Équipe",
      doctorsCount: "Médecins & Praticiens",
      staffCount: "Secrétariat & Assistants",
      activeAccounts: "Comptes Actifs",
      memberList: "Membres du Cabinet",
      memberListDesc: "Liste des utilisateurs ayant accès à l'espace de votre cabinet médical.",
      permissionsTitle: "Permissions & Droits d'Accès",
      permissionsDesc: "Définissez précisément ce que ce collaborateur est autorisé à faire ou consulter.",
      firstName: "Prénom",
      lastName: "Nom",
      email: "Email professionnel",
      phone: "Numéro de téléphone",
      specialty: "Titre / Fonction",
      role: "Rôle dans le cabinet",
      password: "Mot de passe initial",
      passwordPlaceholder: "Laisser vide pour générer automatiquement",
      status: "Statut du compte",
      active: "Actif",
      inactive: "Inactif / Suspendu",
      saveMember: "Enregistrer le collaborateur",
      saving: "Enregistrement...",
      createdSuccess: "Collaborateur ajouté avec succès à l'équipe !",
      updatedSuccess: "Profil et permissions du collaborateur mis à jour !",
      deletedSuccess: "Membre de l'équipe supprimé avec succès.",
      statusUpdated: "Statut du compte mis à jour.",
      passwordResetSuccess: "Mot de passe réinitialisé avec succès !",
      roles: {
        clinic_owner: "Médecin Titulaire / Propriétaire",
        dentist: "Médecin / Praticien",
        receptionist: "Secrétaire / Réceptionniste",
        assistant: "Assistant(e) Médical(e)",
        super_admin: "Super Administrateur",
      },
      permissions: {
        appointmentsTitle: "📅 Agenda & Rendez-vous",
        appointmentsDesc: "Consulter l'agenda, créer, déplacer ou annuler des rendez-vous.",
        patientsTitle: "👥 Dossiers Patients",
        patientsDesc: "Accéder à la liste des patients, fiches médicales et historiques.",
        conversationsTitle: "💬 WhatsApp & Clavardage",
        conversationsDesc: "Lire les messages WhatsApp, répondre en direct aux patients.",
        aiConfigTitle: "🤖 Configuration IA & Tarifs",
        aiConfigDesc: "Modifier les directives de l'IA, tarifs des soins et règles d'escalade.",
        analyticsTitle: "📊 Revenus & Analytics",
        analyticsDesc: "Consulter les tableaux de bord financiers et revenus récupérés.",
        settingsTitle: "⚙️ Paramètres Cabinet & Équipe",
        settingsDesc: "Modifier les coordonnées du cabinet et gérer les comptes utilisateurs.",
      },
    },
    common: {
      save: "Enregistrer",
      cancel: "Annuler",
      loading: "Chargement...",
      success: "Succès",
      error: "Erreur",
      active: "Actif",
      inactive: "Inactif",
      edit: "Modifier",
      delete: "Supprimer",
      actions: "Actions",
      resetPassword: "Réinitialiser mot de passe",
      confirm: "Confirmer",
    },
    patientsPage: {
      title: "Patients",
      subtitle: "{count} patients au total",
      newPatient: "Nouveau patient",
      successAdd: "Patient ajouté avec succès.",
      errorAdd: "Erreur lors de la création du patient.",
      firstName: "Prénom",
      lastName: "Nom",
      firstNameEx: "Ex: Jean",
      lastNameEx: "Ex: Dupont",
      phone: "Téléphone",
      email: "Email",
      emailOptional: "Optionnel",
      createPatient: "Créer le patient",
      searchPlaceholder: "Rechercher par nom, téléphone...",
      selected: "{count} sélectionné(s)",
      message: "Message",
      campaign: "Campagne",
      export: "Exporter",
      loadingPatients: "Chargement des patients...",
      errorLoading: "Impossible de charger la liste des patients.",
      patient: "Patient",
      contact: "Contact",
      lastVisit: "Dernière visite",
      status: "Statut",
      visits: "Visites",
      noPatientSearch: "Aucun patient trouvé pour \"{query}\".",
      noPatient: "Aucun patient.",
    },
    agendaPage: {
      title: "Agenda & Planning Médical",
      subtitleDay: "{date}",
      subtitleWeek: "Semaine du {start} au {end}",
      subtitleMonth: "Mois de {month}",
      subtitleList: "Vue Liste détaillée des consultations",
      today: "Aujourd'hui",
      day: "Jour",
      week: "Semaine",
      month: "Mois",
      list: "Liste",
      newAppointment: "Nouveau Rendez-vous",
      planAppointment: "Planifier un Rendez-vous",
      selectPatient: "Sélectionner un patient existant",
      date: "Date",
      startTime: "Heure de début",
      treatment: "Prestation / Soin",
      duration: "Durée estimée",
      notes: "Notes & Consignes particulières",
      notesPlaceholder: "Ex: Première consultation...",
      cancel: "Annuler",
      save: "Enregistrer le RDV",
      statsTotal: "Total Consultations",
      statsConfirmed: "Confirmés",
      statsPending: "En attente",
      statsAi: "Pris par IA",
      statsRevenue: "CA Prévisionnel",
      searchPlaceholder: "Rechercher patient, téléphone, soin...",
      filterAll: "Tous",
      filterConfirmed: "Confirmés",
      filterScheduled: "Planifiés",
      filterCompleted: "Terminés",
      filterCancelled: "Annulés",
      filterNoShow: "🐰 No-Shows",
      sourceAll: "Toutes sources",
      sourceAi: "🤖 Créés par IA",
      sourceManual: "👤 Manuel / Secrétariat",
      treatmentsAll: "Tous les soins",
      reset: "Réinitialiser",
      errorLoading: "Impossible de charger l'agenda.",
      retry: "Réessayer",
      syncing: "Synchronisation du planning médical...",
      freeSlot: "Créneau libre — Cliquer pour réserver",
    },
    dashboardPage: {
      hello: "Bonjour {name} 👋",
      loadingError: "Erreur de chargement",
      loadingErrorDesc: "Impossible de charger le tableau de bord.",
      startRecovery: "Lancer une récupération",
      aiPerformance: "Performances de l'IA",
      aiPerformanceDesc: "Votre assistant virtuel gère vos conversations en autonomie, réduit vos no-shows et récupère vos revenus perdus sans intervention humaine.",
      automationRate: "Taux d'Automatisation",
      recoveredRevenue: "Revenus Récupérés",
      last30days: "30 derniers jours",
      apptsToday: "Rendez-vous aujourd'hui",
      confirmedAppts: "{count} confirmés",
      patientsToRecover: "Patients à récupérer",
      thisMonth: "ce mois",
      recentNoShows: "No-Shows Récent",
      last7days: "7 derniers jours",
      activeConversations: "Conversations actives",
      needsHuman: "{count} à traiter",
      todayAgenda: "Agenda du jour",
      plannedAppts: "{count} rendez-vous planifiés",
      viewAgenda: "Voir l'agenda",
      noApptsToday: "Aucun rendez-vous aujourd'hui",
      unknownPatient: "Patient inconnu",
      unspecifiedTreatment: "Traitement non spécifié",
      aiPriorities: "Priorités IA",
      contactFirst: "Patients à contacter en premier",
      seeAll: "Tout voir",
      noPriority: "Aucun patient prioritaire",
      needsFollowup: "Relance nécessaire",
      recoveryFunnel: "Entonnoir de récupération",
      noData: "Aucune donnée",
      freeSlots: "Créneaux libres",
      fillWithWaitlist: "À remplir avec la liste d'attente",
      waitlist: "Liste d'attente",
      aiActivity: "Activité de l'IA",
      last24h: "Dernières 24 heures",
      inbox: "Boîte de réception",
      estimatedImpact: "Impact estimé",
      simulationBased: "Simulation basée sur vos données locales",
      potentialRemaining: "Potentiel restant à récupérer",
      messagesProcessed: "Messages traités automatiquement ce mois",
      apptsCreated: "Rendez-vous créés par l'IA ce mois",
    },
    aiAssistantPage: {
      title: "Assistant IA & Paramètres WhatsApp",
      subtitle: "Consignes personnalisées de l'IA, QR Code WhatsApp et règles de réservation du cabinet.",
      saveBtn: "Enregistrer les modifications",
      saving: "Enregistrement...",
      successSave: "Consignes, catalogue de soins et paramètres enregistrés avec succès !",
      errorSave: "Erreur lors de l'enregistrement des paramètres.",
    },
    waitlistPage: {
      title: "Liste d'Attente Intelligente",
      subtitle: "Comblez vos annulations automatiquement en proposant les créneaux libérés aux patients en attente.",
    },
    followupsPage: {
      title: "Suivis Post-Opératoires",
      subtitle: "L'IA prend des nouvelles de vos patients automatiquement après leurs interventions.",
    },
      
    recoveryPage: {
      title: "Récupération patients",
      subtitle: "Identifiez automatiquement les patients que votre cabinet risque de perdre.",
      detect: "Détecter",
      launchCampaign: "Lancer une campagne",
      analyzed: "Patients analysés",
      toRecover: "À récupérer",
      contacted: "Contactés",
      replied: "Ont répondu",
      recoveredAppts: "RDV récupérés",
      completed: "Venus au cabinet",
      estimatedValue: "Valeur estimée",
      bookedValue: "Valeur réservée",
      recoveredValue: "Valeur récupérée",
      funnelTitle: "Entonnoir de récupération",
      funnelSubtitle: "Performance globale",
      funnelIdentified: "Patients identifiés",
      funnelContacted: "Contactés",
      funnelReplied: "Ont répondu",
      funnelBooked: "Rendez-vous pris",
      funnelVisited: "Venus au cabinet",
      opportunitiesTitle: "Opportunités de récupération",
      opportunitiesSubtitle: "{count} opportunités identifiées",
      campaigns: "Campagnes",
      colPatient: "Patient",
      colType: "Type",
      colReason: "Raison",
      colPriority: "Priorité",
      colEstValue: "Valeur est.",
      colStatus: "Statut",
      colDetectedOn: "Détecté le",
      unknownPatient: "Patient inconnu",
      viewBtn: "Voir",
      errorLoading: "Impossible de charger les opportunités.",
      noOpportunities: "Aucune opportunité de récupération. Cliquez sur \"Détecter\" pour analyser vos patients.",
      typeInactive: "Patient inactif",
      typeInterrupted: "Traitement interrompu",
      typePendingQuote: "Devis en attente",
      typeNoShow: "Rendez-vous manqué",
      typeCancellation: "Annulation",
      typeOverdue: "Contrôle dépassé",
      typeFollowUp: "Suivi",
      statusIdentified: "Identifié",
      statusQueued: "En file",
      statusContacted: "Contacté",
      statusResponded: "A répondu",
      statusBooked: "RDV pris",
      statusVisited: "Venu",
      statusNoResponse: "Sans réponse",
      statusDismissed: "Écarté",
      detectionComplete: "Détection terminée. {count} opportunités créées.",
      detectionError: "Erreur lors de la détection.",
    },
  },
  en: {
    conversationsPage: {
      title: "Inbox & WhatsApp AI Chatbot",
      subtitle: "Manage conversations and test the WhatsApp AI in real time.",
      live: "Live 24/7",
      hideSimulator: "Hide Simulator",
      openSimulator: "📱 Open Patient Simulator",
      viewAgenda: "View agenda",
      searchPlaceholder: "Search by name, phone...",
      filterAll: "All",
      filterAi: "AI",
      filterHuman: "Human Required",
      loadingConvs: "Loading conversations...",
      noConvs: "No conversations yet.",
      humanRequired: "Human Intervention Required",
      aiHandled: "Handled by AI",
      patientRecord: "Open patient record",
      whatsappBusiness: "WhatsApp Business API",
      loadPrevMsgs: "Load previous messages",
      loadingMsgs: "Loading...",
      noMsgsTitle: "No messages",
      noMsgsDesc: "This conversation is empty or could not be loaded.",
      typeMsg: "Type a message as the clinic...",
      whatsappSimulator: "WhatsApp Simulator (Patient Test)",
      simDesc: "Test the AI in real time. Put yourself in the patient's shoes and send messages to see how the assistant reacts.",
      online: "online",
      patientId: "ID:",
      simNewConv: "Simulate a new patient",
      quickScenarios: "Quick scenarios to test:",
      scenario1Label: "📅 Appt",
      scenario1Text: "Hello, I want to book an appointment for scaling this week.",
      scenario2Label: "⏱️ Confirm",
      scenario2Text: "Perfect, 11:30 works for me! I confirm.",
      scenario3Label: "🚨 Emergency",
      scenario3Text: "Doctor, I have a terrible toothache since this morning. Can you see me urgently?",
      scenario4Label: "💰 Prices",
      scenario4Text: "Hello, what is the price for an implant or whitening?",
      scenario5Label: "🧑‍⚕️ Doctor",
      scenario5Text: "I want to talk directly to the doctor about my treatment yesterday.",
      clearSim: "Clear test conversation",
      simWarning: "You are simulating the patient with the fake number :",
      simulatorSubtitle: "WhatsApp Simulator",
      directTestMode: "Direct test mode",
      simPatientLabel: "Simulated patient:",
      simPatientUnknown: "Unknown patient",
      clinicName: "Your Clinic",
      onlineStatus: "online",
      welcomeMsg: "Welcome message",
      writeAsPatient: "Write as patient...",

      suggestionSuccess: "Suggestion copied!",
      suggestionError: "Suggestion error",
      sendError: "Send error",
      simSuccess: "Test message sent!",
      simError: "Simulation error",
      patient: "Patient",
      aiBot: "AI Bot",
      received: "Received",
      delivered: "Delivered",
      writeManualReply: "Write a manual reply...",
      aiTip: "AI is automatically handling this conversation.",
      enterToSend: "Press Enter to send",
      selectConvTitle: "Select a conversation",
      selectConvDesc: "Choose a conversation on the left or start a test in the simulator.",
      simulatorTitle: "WhatsApp Simulator",
    },

  
    nav: {
      workspace: "Workspace",
      automation: "Automation",
      insights: "Insights",
      settings: "Settings",
      dashboard: "Dashboard",
      agenda: "Schedule",
      patients: "Patients",
      conversations: "Conversations",
      recovery: "Patient Recovery",
      aiAssistant: "AI Assistant",
      followups: "Follow-ups",
      waitlist: "Waitlist",
      noShows: "No-Shows",
      analytics: "Analytics",
      revenue: "Recovered Revenue",
      clinic: "Clinic",
      team: "Team",
      aiSettings: "AI Settings",
      communication: "Communication",
      integrations: "Integrations",
      patientRecovery: "Patient Recovery",
    },
    topbar: {
      searchPlaceholder: "Search patient, appointment…",
      notifications: "Notifications",
      markAllRead: "Mark all as read",
      noNotifications: "No notifications",
      help: "Help",
      gettingStarted: "Getting Started Guide",
      howRecoveryWorks: "How patient recovery works",
      contactSupport: "Contact Support",
      currentClinic: "Active Clinic",
      active: "Active",
      interfaceLanguage: "Interface Language",
      clinicSettings: "Clinic Settings",
      team: "Team",
      logout: "Log out",
    },
    clinicSettings: {
      title: "Clinic Settings",
      subtitle: "Manage official contact details, specialty, and public information for your practice.",
      save: "Save changes",
      saving: "Saving...",
      generalInfo: "General Information",
      generalInfoDesc: "These details are used by the AI to guide patients and format WhatsApp confirmation messages.",
      clinicName: "Clinic / Practice Name",
      clinicNamePlaceholder: "E.g. Dr. Sami Ben Amor Medical Clinic",
      specialty: "Medical Specialty",
      specialtyPlaceholder: "E.g. Cardiology, Dental Care, Pediatrics, General Medicine...",
      address: "Full Address",
      addressPlaceholder: "E.g. Coral Building, 2nd Floor, Les Berges du Lac 2, Tunis",
      phone: "Official Phone Number",
      phonePlaceholder: "E.g. +216 71 962 480",
      email: "Practice Email",
      emailPlaceholder: "E.g. contact@clinic-medical.tn",
      businessHours: "Working Hours & Schedule",
      businessHoursDesc: "Set the clinic operating hours used for appointment booking.",
      openingHours: "Opening Hours",
      openingHoursPlaceholder: "E.g. Monday to Friday 08:30 - 18:00, Saturday 08:30 - 13:00",
      savedSuccess: "Clinic details saved successfully!",
      saveError: "Failed to update clinic settings.",
      activeBadge: "Active Clinic Account",
      verifiedClinic: "Verified clinic & synchronized with AI",
      quickStats: "Overview",
      plan: "Pro Plan",
    },
    teamSettings: {
      title: "Team & Access Control",
      subtitle: "Manage practice staff (doctors, secretaries, assistants) and configure their granular module permissions.",
      addMember: "Add Team Member",
      editMember: "Edit Member & Access",
      deleteMember: "Delete Member",
      deleteConfirm: "Are you sure you want to remove this member from the team?",
      totalMembers: "Total Team",
      doctorsCount: "Doctors & Practitioners",
      staffCount: "Staff & Assistants",
      activeAccounts: "Active Accounts",
      memberList: "Practice Members",
      memberListDesc: "List of users with authorized access to your clinic workspace.",
      permissionsTitle: "Permissions & Privileges",
      permissionsDesc: "Configure precisely what this staff member can access and perform.",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Work Email",
      phone: "Phone Number",
      specialty: "Title / Specialty",
      role: "Role in Practice",
      password: "Initial Password",
      passwordPlaceholder: "Leave blank to auto-generate",
      status: "Account Status",
      active: "Active",
      inactive: "Inactive / Suspended",
      saveMember: "Save Member",
      saving: "Saving...",
      createdSuccess: "Team member added successfully!",
      updatedSuccess: "Member profile and permissions updated!",
      deletedSuccess: "Team member removed successfully.",
      statusUpdated: "Account status updated.",
      passwordResetSuccess: "Password reset successfully!",
      roles: {
        clinic_owner: "Lead Doctor / Owner",
        dentist: "Doctor / Practitioner",
        receptionist: "Secretary / Receptionist",
        assistant: "Medical Assistant",
        super_admin: "Super Administrator",
      },
      permissions: {
        appointmentsTitle: "📅 Schedule & Appointments",
        appointmentsDesc: "View agenda, create, reschedule, or cancel patient bookings.",
        patientsTitle: "👥 Patient Records",
        patientsDesc: "Access patient directory, medical histories, and notes.",
        conversationsTitle: "💬 WhatsApp & Live Chat",
        conversationsDesc: "Read patient WhatsApp messages and chat in real-time.",
        aiConfigTitle: "🤖 AI Assistant & Pricing",
        aiConfigDesc: "Modify AI doctor instructions, fees, and escalation triggers.",
        analyticsTitle: "📊 Revenue & Analytics",
        analyticsDesc: "View financial recovery dashboards and practice insights.",
        settingsTitle: "⚙️ Clinic & Team Settings",
        settingsDesc: "Edit clinic details and manage team user permissions.",
      },
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      success: "Success",
      error: "Error",
      active: "Active",
      inactive: "Inactive",
      edit: "Edit",
      delete: "Delete",
      actions: "Actions",
      resetPassword: "Reset Password",
      confirm: "Confirm",
    },
    patientsPage: {
      title: "Patients",
      subtitle: "{count} total patients",
      newPatient: "New patient",
      successAdd: "Patient added successfully.",
      errorAdd: "Error creating patient.",
      firstName: "First Name",
      lastName: "Last Name",
      firstNameEx: "E.g. John",
      lastNameEx: "E.g. Doe",
      phone: "Phone",
      email: "Email",
      emailOptional: "Optional",
      createPatient: "Create patient",
      searchPlaceholder: "Search by name, phone...",
      selected: "{count} selected",
      message: "Message",
      campaign: "Campaign",
      export: "Export",
      loadingPatients: "Loading patients...",
      errorLoading: "Could not load the patient list.",
      patient: "Patient",
      contact: "Contact",
      lastVisit: "Last visit",
      status: "Status",
      visits: "Visits",
      noPatientSearch: "No patient found for \"{query}\".",
      noPatient: "No patients.",
    },
    agendaPage: {
      title: "Medical Agenda & Schedule",
      subtitleDay: "{date}",
      subtitleWeek: "Week of {start} to {end}",
      subtitleMonth: "Month of {month}",
      subtitleList: "Detailed Consultations List",
      today: "Today",
      day: "Day",
      week: "Week",
      month: "Month",
      list: "List",
      newAppointment: "New Appointment",
      planAppointment: "Schedule Appointment",
      selectPatient: "Select existing patient",
      date: "Date",
      startTime: "Start Time",
      treatment: "Treatment / Service",
      duration: "Estimated Duration",
      notes: "Notes & Instructions",
      notesPlaceholder: "E.g. First consultation...",
      cancel: "Cancel",
      save: "Save Appointment",
      statsTotal: "Total Consultations",
      statsConfirmed: "Confirmed",
      statsPending: "Pending",
      statsAi: "Booked by AI",
      statsRevenue: "Est. Revenue",
      searchPlaceholder: "Search patient, phone, treatment...",
      filterAll: "All",
      filterConfirmed: "Confirmed",
      filterScheduled: "Scheduled",
      filterCompleted: "Completed",
      filterCancelled: "Cancelled",
      filterNoShow: "🐰 No-Shows",
      sourceAll: "All Sources",
      sourceAi: "🤖 Booked by AI",
      sourceManual: "👤 Manual / Staff",
      treatmentsAll: "All Treatments",
      reset: "Reset",
      errorLoading: "Could not load agenda.",
      retry: "Retry",
      syncing: "Syncing medical schedule...",
      freeSlot: "Free slot — Click to book",
    },
    dashboardPage: {
      hello: "Hello {name} 👋",
      loadingError: "Loading Error",
      loadingErrorDesc: "Could not load the dashboard.",
      startRecovery: "Start Recovery",
      aiPerformance: "AI Performance",
      aiPerformanceDesc: "Your virtual assistant manages conversations autonomously, reduces no-shows, and recovers lost revenue with no human intervention.",
      automationRate: "Automation Rate",
      recoveredRevenue: "Recovered Revenue",
      last30days: "Last 30 days",
      apptsToday: "Appointments Today",
      confirmedAppts: "{count} confirmed",
      patientsToRecover: "Patients to Recover",
      thisMonth: "this month",
      recentNoShows: "Recent No-Shows",
      last7days: "Last 7 days",
      activeConversations: "Active Conversations",
      needsHuman: "{count} to process",
      todayAgenda: "Today's Agenda",
      plannedAppts: "{count} planned appointments",
      viewAgenda: "View agenda",
      noApptsToday: "No appointments today",
      unknownPatient: "Unknown patient",
      unspecifiedTreatment: "Unspecified treatment",
      aiPriorities: "AI Priorities",
      contactFirst: "Patients to contact first",
      seeAll: "See all",
      noPriority: "No priority patients",
      needsFollowup: "Follow-up needed",
      recoveryFunnel: "Recovery Funnel",
      noData: "No data",
      freeSlots: "Free Slots",
      fillWithWaitlist: "To be filled with waitlist",
      waitlist: "Waitlist",
      aiActivity: "AI Activity",
      last24h: "Last 24 hours",
      inbox: "Inbox",
      estimatedImpact: "Estimated Impact",
      simulationBased: "Simulation based on your local data",
      potentialRemaining: "Remaining potential to recover",
      messagesProcessed: "Messages automatically processed this month",
      apptsCreated: "Appointments created by AI this month",
    },
    aiAssistantPage: {
      title: "AI Assistant & WhatsApp Settings",
      subtitle: "Custom AI instructions, WhatsApp QR Code, and clinic booking rules.",
      saveBtn: "Save Changes",
      saving: "Saving...",
      successSave: "Instructions, services catalog, and settings successfully saved!",
      errorSave: "Error saving settings.",
    },
    waitlistPage: {
      title: "Smart Waitlist",
      subtitle: "Automatically fill cancellations by offering freed slots to waiting patients.",
    },
    followupsPage: {
      title: "Post-Op Follow-ups",
      subtitle: "The AI automatically checks in on your patients after their procedures.",
    },
    recoveryPage: {
      title: "Patient Recovery",
      subtitle: "Automatically identify patients your clinic is at risk of losing.",
      detect: "Detect",
      launchCampaign: "Launch Campaign",
      analyzed: "Analyzed Patients",
      toRecover: "To Recover",
      contacted: "Contacted",
      replied: "Replied",
      recoveredAppts: "Recovered Appts",
      completed: "Visited Clinic",
      estimatedValue: "Estimated Value",
      bookedValue: "Booked Value",
      recoveredValue: "Recovered Value",
      funnelTitle: "Recovery Funnel",
      funnelSubtitle: "Overall Performance",
      funnelIdentified: "Identified Patients",
      funnelContacted: "Contacted",
      funnelReplied: "Replied",
      funnelBooked: "Appointments Booked",
      funnelVisited: "Visited Clinic",
      opportunitiesTitle: "Recovery Opportunities",
      opportunitiesSubtitle: "{count} opportunities identified",
      campaigns: "Campaigns",
      colPatient: "Patient",
      colType: "Type",
      colReason: "Reason",
      colPriority: "Priority",
      colEstValue: "Est. Value",
      colStatus: "Status",
      colDetectedOn: "Detected On",
      unknownPatient: "Unknown Patient",
      viewBtn: "View",
      errorLoading: "Failed to load opportunities.",
      noOpportunities: "No recovery opportunities. Click \"Detect\" to analyze your patients.",
      typeInactive: "Inactive Patient",
      typeInterrupted: "Interrupted Treatment",
      typePendingQuote: "Pending Quote",
      typeNoShow: "No-Show",
      typeCancellation: "Cancellation",
      typeOverdue: "Overdue Checkup",
      typeFollowUp: "Follow-up",
      statusIdentified: "Identified",
      statusQueued: "Queued",
      statusContacted: "Contacted",
      statusResponded: "Responded",
      statusBooked: "Booked",
      statusVisited: "Visited",
      statusNoResponse: "No Response",
      statusDismissed: "Dismissed",
      detectionComplete: "Detection complete. {count} opportunities created.",
      detectionError: "Error during detection.",
    },
  },
  ar: {
    conversationsPage: {
      title: "Inbox & WhatsApp AI Chatbot",
      subtitle: "Manage conversations and test the WhatsApp AI in real time.",
      live: "Live 24/7",
      hideSimulator: "Hide Simulator",
      openSimulator: "📱 Open Patient Simulator",
      viewAgenda: "View agenda",
      searchPlaceholder: "Search by name, phone...",
      filterAll: "All",
      filterAi: "AI",
      filterHuman: "Human Required",
      loadingConvs: "Loading conversations...",
      noConvs: "No conversations yet.",
      humanRequired: "Human Intervention Required",
      aiHandled: "Handled by AI",
      patientRecord: "Open patient record",
      whatsappBusiness: "WhatsApp Business API",
      loadPrevMsgs: "Load previous messages",
      loadingMsgs: "Loading...",
      noMsgsTitle: "No messages",
      noMsgsDesc: "This conversation is empty or could not be loaded.",
      typeMsg: "Type a message as the clinic...",
      whatsappSimulator: "WhatsApp Simulator (Patient Test)",
      simDesc: "Test the AI in real time. Put yourself in the patient's shoes and send messages to see how the assistant reacts.",
      online: "online",
      patientId: "ID:",
      simNewConv: "Simulate a new patient",
      quickScenarios: "Quick scenarios to test:",
      scenario1Label: "📅 Appt",
      scenario1Text: "Hello, I want to book an appointment for scaling this week.",
      scenario2Label: "⏱️ Confirm",
      scenario2Text: "Perfect, 11:30 works for me! I confirm.",
      scenario3Label: "🚨 Emergency",
      scenario3Text: "Doctor, I have a terrible toothache since this morning. Can you see me urgently?",
      scenario4Label: "💰 Prices",
      scenario4Text: "Hello, what is the price for an implant or whitening?",
      scenario5Label: "🧑‍⚕️ Doctor",
      scenario5Text: "I want to talk directly to the doctor about my treatment yesterday.",
      clearSim: "Clear test conversation",
      simWarning: "You are simulating the patient with the fake number :",
      simulatorSubtitle: "WhatsApp Simulator",
      directTestMode: "Direct test mode",
      simPatientLabel: "Simulated patient:",
      simPatientUnknown: "Unknown patient",
      clinicName: "Your Clinic",
      onlineStatus: "online",
      welcomeMsg: "Welcome message",
      writeAsPatient: "Write as patient...",

      suggestionSuccess: "Suggestion copied!",
      suggestionError: "Suggestion error",
      sendError: "Send error",
      simSuccess: "Test message sent!",
      simError: "Simulation error",
      patient: "Patient",
      aiBot: "AI Bot",
      received: "Received",
      delivered: "Delivered",
      writeManualReply: "Write a manual reply...",
      aiTip: "AI is automatically handling this conversation.",
      enterToSend: "Press Enter to send",
      selectConvTitle: "Select a conversation",
      selectConvDesc: "Choose a conversation on the left or start a test in the simulator.",
      simulatorTitle: "WhatsApp Simulator",
    },
    nav: {
      workspace: "مساحة العمل",
      automation: "الأتمتة والذكاء الاصطناعي",
      insights: "الإحصائيات والتحليلات",
      settings: "الإعدادات",
      dashboard: "لوحة التحكم",
      agenda: "جدول المواعيد",
      patients: "المرضى",
      conversations: "المحادثات",
      recovery: "استرجاع المرضى",
      aiAssistant: "المساعد الذكي",
      followups: "المتابعات والتذكير",
      waitlist: "قائمة الانتظار",
      noShows: "الغيابات والاعتذارات",
      analytics: "التحليلات",
      revenue: "المداخيل المسترجعة",
      clinic: "العيادة",
      team: "فريق العمل",
      aiSettings: "إعدادات الذكاء الاصطناعي",
      communication: "الاتصالات",
      integrations: "الربط التقني",
      patientRecovery: "استرجاع المرضى",
    },
    topbar: {
      searchPlaceholder: "بحث عن مريض، موعد...",
      notifications: "الإشعارات",
      markAllRead: "تحديد الكل كمقروء",
      noNotifications: "لا توجد إشعارات",
      help: "المساعدة",
      gettingStarted: "دليل البداية",
      howRecoveryWorks: "كيف يعمل استرجاع المواعيد",
      contactSupport: "الاتصال بالدعم الفني",
      currentClinic: "العيادة الحالية",
      active: "مفعل",
      interfaceLanguage: "لغة الواجهة",
      clinicSettings: "إعدادات العيادة",
      team: "فريق العمل",
      logout: "تسجيل الخروج",
    },
    clinicSettings: {
      title: "إعدادات وبيانات العيادة",
      subtitle: "إدارة البيانات الرسمية للعيادة، التخصص الطبي، والعنوان المعتمد للمرضى.",
      save: "حفظ التغييرات",
      saving: "جاري الحفظ...",
      generalInfo: "المعلومات العامة",
      generalInfoDesc: "تُستخدم هذه البيانات من طرف المساعد الذكي لتوجيه المرضى وتأكيد المواعيد عبر واتساب.",
      clinicName: "اسم العيادة / المركز الطبي",
      clinicNamePlaceholder: "مثال: عيادة الدكتور سامي بن عمر",
      specialty: "التخصص الطبي",
      specialtyPlaceholder: "مثال: طب وجراحة الأسنان، أمراض القلب، طب الأطفال...",
      address: "العنوان الكامل",
      addressPlaceholder: "مثال: عمارة كورال، الطابق الثاني، ضفاف البحيرة 2، تونس",
      phone: "رقم هاتف العيادة الرسمي",
      phonePlaceholder: "مثال: 480 962 71 216+",
      email: "البريد الإلكتروني المهني",
      emailPlaceholder: "مثال: contact@clinic-medical.tn",
      businessHours: "أوقات العمل والمواعيد",
      businessHoursDesc: "تحديد أوقات عمل العيادة المعتمدة لحجز مواعيد المرضى.",
      openingHours: "أوقات العمل الأسبوعية",
      openingHoursPlaceholder: "مثال: من الإثنين إلى الجمعة من 08:30 إلى 18:00، السبت من 08:30 إلى 13:00",
      savedSuccess: "تم حفظ بيانات العيادة بنجاح!",
      saveError: "حدث خطأ أثناء حفظ بيانات العيادة.",
      activeBadge: "حساب عيادة نشط",
      verifiedClinic: "عيادة معتمدة ومتصلة بالذكاء الاصطناعي",
      quickStats: "نظرة عامة",
      plan: "الخطة الاحترافية Pro",
    },
    teamSettings: {
      title: "فريق العمل وإدارة الصلاحيات",
      subtitle: "إدارة حسابات العاملين بالعيادة (أطباء، سكرتاريا، مساعدين) وتخصيص صلاحيات الوصول بدقة.",
      addMember: "إضافة عضو جديد",
      editMember: "تعديل العضو والصلاحيات",
      deleteMember: "حذف العضو",
      deleteConfirm: "هل أنت متأكد من رغبتك في حذف هذا العضو من الفريق؟",
      totalMembers: "إجمالي الفريق",
      doctorsCount: "الأطباء والممارسين",
      staffCount: "السكرتاريا والمساعدين",
      activeAccounts: "الحسابات المفعلة",
      memberList: "أعضاء العيادة",
      memberListDesc: "قائمة المستخدمين المصرح لهم بالدخول إلى مساحة العمل للعيادة.",
      permissionsTitle: "صلاحيات وحقوق الوصول",
      permissionsDesc: "حدد بدقة ما يُسمح لهذا المستخدم بالقيام به أو الاطلاع عليه.",
      firstName: "الاسم",
      lastName: "اللقب",
      email: "البريد الإلكتروني المهني",
      phone: "رقم الهاتف",
      specialty: "الوظيفة / التخصص",
      role: "الدور في العيادة",
      password: "كلمة المرور الأولية",
      passwordPlaceholder: "اتركه فارغاً لإنشاء كلمة مرور تلقائية",
      status: "حالة الحساب",
      active: "نشط",
      inactive: "معطل / موقوف",
      saveMember: "حفظ بيانات العضو",
      saving: "جاري الحفظ...",
      createdSuccess: "تمت إضافة العضو بنجاح إلى الفريق!",
      updatedSuccess: "تم تحديث الملف الشخصي والصلاحيات بنجاح!",
      deletedSuccess: "تم حذف العضو من الفريق بنجاح.",
      statusUpdated: "تم تحديث حالة الحساب.",
      passwordResetSuccess: "تمت إعادة تعيين كلمة المرور بنجاح!",
      roles: {
        clinic_owner: "الطبيب الرئيسي / صاحب العيادة",
        dentist: "طبيب ممارس",
        receptionist: "سكرتير(ة) / استقبال",
        assistant: "مساعد(ة) طبي(ة)",
        super_admin: "المسؤول العام",
      },
      permissions: {
        appointmentsTitle: "📅 جدول المواعيد والحجوزات",
        appointmentsDesc: "الاطلاع على الجدول، تسجيل، تعديل أو إلغاء مواعيد المرضى.",
        patientsTitle: "👥 ملفات وسجلات المرضى",
        patientsDesc: "الوصول لدليل المرضى، السجلات الطبية والبيانات الصحية.",
        conversationsTitle: "💬 رسائل واتساب والمحادثات",
        conversationsDesc: "قراءة رسائل المرضى والرد المباشر عبر واتساب.",
        aiConfigTitle: "🤖 إعدادات الذكاء الاصطناعي والأسعار",
        aiConfigDesc: "تعديل تعليمات الطبيب للمساعد الذكي، تسعيرات الخدمات وقواعد التحويل.",
        analyticsTitle: "📊 التحليلات والمداخيل",
        analyticsDesc: "الاطلاع على لوحات المداخيل المسترجعة والإحصائيات المالية.",
        settingsTitle: "⚙️ إعدادات العيادة وإدارة الفريق",
        settingsDesc: "تعديل بيانات العيادة وإدارة صلاحيات المستخدمين.",
      },
    },
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      loading: "جاري التحميل...",
      success: "تم بنجاح",
      error: "خطأ",
      active: "نشط",
      inactive: "معطل",
      edit: "تعديل",
      delete: "حذف",
      actions: "الإجراءات",
      resetPassword: "إعادة تعيين كلمة المرور",
      confirm: "تأكيد",
    },
    patientsPage: {
      title: "المرضى",
      subtitle: "إجمالي المرضى: {count}",
      newPatient: "مريض جديد",
      successAdd: "تمت إضافة المريض بنجاح.",
      errorAdd: "خطأ أثناء إضافة المريض.",
      firstName: "الاسم الأول",
      lastName: "اللقب",
      firstNameEx: "مثال: أحمد",
      lastNameEx: "مثال: بن علي",
      phone: "الهاتف",
      email: "البريد الإلكتروني",
      emailOptional: "اختياري",
      createPatient: "إضافة المريض",
      searchPlaceholder: "ابحث بالاسم، الهاتف...",
      selected: "تم تحديد {count}",
      message: "رسالة",
      campaign: "حملة",
      export: "تصدير",
      loadingPatients: "جاري تحميل المرضى...",
      errorLoading: "تعذر تحميل قائمة المرضى.",
      patient: "المريض",
      contact: "جهة الاتصال",
      lastVisit: "آخر زيارة",
      status: "الحالة",
      visits: "الزيارات",
      noPatientSearch: "لم يتم العثور على مرضى لـ \"{query}\".",
      noPatient: "لا يوجد مرضى.",
    },
    agendaPage: {
      title: "جدول المواعيد الطبي",
      subtitleDay: "{date}",
      subtitleWeek: "أسبوع من {start} إلى {end}",
      subtitleMonth: "شهر {month}",
      subtitleList: "قائمة المواعيد التفصيلية",
      today: "اليوم",
      day: "يوم",
      week: "أسبوع",
      month: "شهر",
      list: "قائمة",
      newAppointment: "موعد جديد",
      planAppointment: "حجز موعد",
      selectPatient: "اختر مريض مسجل",
      date: "التاريخ",
      startTime: "وقت البدء",
      treatment: "نوع العلاج / الخدمة",
      duration: "المدة المتوقعة",
      notes: "ملاحظات وتعليمات",
      notesPlaceholder: "مثال: أول زيارة...",
      cancel: "إلغاء",
      save: "حفظ الموعد",
      statsTotal: "إجمالي المواعيد",
      statsConfirmed: "مؤكدة",
      statsPending: "قيد الانتظار",
      statsAi: "حجزت بالذكاء الاصطناعي",
      statsRevenue: "الإيرادات المتوقعة",
      searchPlaceholder: "ابحث عن مريض، هاتف، علاج...",
      filterAll: "الكل",
      filterConfirmed: "مؤكد",
      filterScheduled: "مجدول",
      filterCompleted: "مكتمل",
      filterCancelled: "ملغى",
      filterNoShow: "🐰 غياب",
      sourceAll: "جميع المصادر",
      sourceAi: "🤖 عبر الذكاء الاصطناعي",
      sourceManual: "👤 السكرتارية / يدوي",
      treatmentsAll: "كل العلاجات",
      reset: "إعادة ضبط",
      errorLoading: "تعذر تحميل الجدول.",
      retry: "إعادة المحاولة",
      syncing: "جاري مزامنة المواعيد...",
      freeSlot: "موعد متاح — انقر للحجز",
    },
    dashboardPage: {
      hello: "مرحباً {name} 👋",
      loadingError: "خطأ في التحميل",
      loadingErrorDesc: "تعذر تحميل لوحة التحكم.",
      startRecovery: "بدء استرجاع المرضى",
      aiPerformance: "أداء الذكاء الاصطناعي",
      aiPerformanceDesc: "مساعدك الافتراضي يدير المحادثات باستقلالية، يقلل من الغيابات، ويسترجع الإيرادات المفقودة دون تدخل بشري.",
      automationRate: "معدل الأتمتة",
      recoveredRevenue: "الإيرادات المسترجعة",
      last30days: "آخر 30 يوم",
      apptsToday: "مواعيد اليوم",
      confirmedAppts: "{count} مؤكد",
      patientsToRecover: "مرضى للاسترجاع",
      thisMonth: "هذا الشهر",
      recentNoShows: "غيابات حديثة",
      last7days: "آخر 7 أيام",
      activeConversations: "محادثات نشطة",
      needsHuman: "{count} بانتظار الرد",
      todayAgenda: "جدول اليوم",
      plannedAppts: "{count} موعد مجدول",
      viewAgenda: "عرض الجدول",
      noApptsToday: "لا توجد مواعيد اليوم",
      unknownPatient: "مريض غير معروف",
      unspecifiedTreatment: "علاج غير محدد",
      aiPriorities: "أولويات الذكاء الاصطناعي",
      contactFirst: "المرضى الأولوية للاتصال",
      seeAll: "عرض الكل",
      noPriority: "لا يوجد مرضى ذوو أولوية",
      needsFollowup: "بحاجة للمتابعة",
      recoveryFunnel: "مسار الاسترجاع",
      noData: "لا توجد بيانات",
      freeSlots: "مواعيد متاحة",
      fillWithWaitlist: "للملء من قائمة الانتظار",
      waitlist: "قائمة الانتظار",
      aiActivity: "نشاط الذكاء الاصطناعي",
      last24h: "آخر 24 ساعة",
      inbox: "صندوق الوارد",
      estimatedImpact: "التأثير المتوقع",
      simulationBased: "محاكاة بناءً على بياناتك",
      potentialRemaining: "الإيرادات المحتملة المتبقية",
      messagesProcessed: "رسائل تمت معالجتها آلياً هذا الشهر",
      apptsCreated: "مواعيد أنشأها الذكاء الاصطناعي هذا الشهر",
    },
    aiAssistantPage: {
      title: "مساعد الذكاء الاصطناعي وإعدادات واتساب",
      subtitle: "تعليمات الذكاء الاصطناعي، رمز الاستجابة السريعة، وقواعد حجز العيادة.",
      saveBtn: "حفظ التغييرات",
      saving: "جاري الحفظ...",
      successSave: "تم حفظ التعليمات والخدمات والإعدادات بنجاح!",
      errorSave: "حدث خطأ أثناء حفظ الإعدادات.",
    },
    waitlistPage: {
      title: "قائمة الانتظار الذكية",
      subtitle: "املأ الإلغاءات تلقائياً من خلال عرض المواعيد المتاحة على المرضى المنتظرين.",
    },
    followupsPage: {
      title: "متابعة ما بعد العملية",
      subtitle: "يقوم الذكاء الاصطناعي بالاطمئنان على المرضى تلقائياً بعد الإجراءات.",
    },
    recoveryPage: {
      title: "استرجاع المرضى",
      subtitle: "تحديد المرضى الذين قد تفقدهم عيادتك تلقائياً.",
      detect: "اكتشاف",
      launchCampaign: "إطلاق حملة",
      analyzed: "مرضى تم تحليلهم",
      toRecover: "للاسترجاع",
      contacted: "تم التواصل",
      replied: "ردوا",
      recoveredAppts: "مواعيد مسترجعة",
      completed: "حضروا للعيادة",
      estimatedValue: "القيمة المتوقعة",
      bookedValue: "القيمة المحجوزة",
      recoveredValue: "القيمة المسترجعة",
      funnelTitle: "مسار الاسترجاع",
      funnelSubtitle: "الأداء العام",
      funnelIdentified: "مرضى محددون",
      funnelContacted: "تم التواصل",
      funnelReplied: "ردوا",
      funnelBooked: "تم الحجز",
      funnelVisited: "حضروا للعيادة",
      opportunitiesTitle: "فرص الاسترجاع",
      opportunitiesSubtitle: "تم تحديد {count} فرصة",
      campaigns: "حملات",
      colPatient: "المريض",
      colType: "النوع",
      colReason: "السبب",
      colPriority: "الأولوية",
      colEstValue: "قيمة متوقعة",
      colStatus: "الحالة",
      colDetectedOn: "تاريخ الاكتشاف",
      unknownPatient: "مريض غير معروف",
      viewBtn: "عرض",
      errorLoading: "تعذر تحميل الفرص.",
      noOpportunities: "لا توجد فرص استرجاع. انقر على \"اكتشاف\" لتحليل مرضاك.",
      typeInactive: "مريض غير نشط",
      typeInterrupted: "علاج متوقف",
      typePendingQuote: "عرض سعر معلق",
      typeNoShow: "تخلف عن الحضور",
      typeCancellation: "إلغاء",
      typeOverdue: "فحص متأخر",
      typeFollowUp: "متابعة",
      statusIdentified: "محدد",
      statusQueued: "في الانتظار",
      statusContacted: "تم التواصل",
      statusResponded: "رد",
      statusBooked: "حجز",
      statusVisited: "حضر",
      statusNoResponse: "لا رد",
      statusDismissed: "مستبعد",
      detectionComplete: "اكتمل الفحص. تم إنشاء {count} فرصة.",
      detectionError: "حدث خطأ أثناء الاكتشاف.",
    },
  },
};

