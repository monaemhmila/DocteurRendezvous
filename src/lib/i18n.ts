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
}

export const translations: Record<Language, Translations> = {
  fr: {
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
  },
  en: {
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
  },
  ar: {
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
  },
};
