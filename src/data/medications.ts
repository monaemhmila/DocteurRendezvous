/**
 * Référentiel médicaments — Sanovia AI
 *
 * ⚠️  AVERTISSEMENT MÉDICAL ET RÉGLEMENTAIRE ⚠️
 *
 * Ce fichier est un OUTIL D'AIDE À LA PRESCRIPTION réservé aux professionnels
 * de santé habilités. Il ne constitue pas une source réglementaire exhaustive
 * et ne remplace en aucun cas :
 *   - Le Résumé des Caractéristiques du Produit (RCP) officiel
 *   - La notice approuvée par l'autorité compétente
 *   - La base de données tunisienne de référence (registre national des médicaments)
 *   - La validation clinique du médecin prescripteur et du pharmacien
 *
 * Les posologies ne sont JAMAIS automatiquement appliquées. Elles dépendent
 * systématiquement de l'indication, de l'âge, du poids, de la fonction rénale
 * et hépatique, de la grossesse/allaitement, des allergies, des interactions
 * médicamenteuses et de la présentation exacte du produit commercialisé.
 *
 * MAINTENANCE OBLIGATOIRE AVANT TOUTE MISE EN PRODUCTION :
 *   - Mettre à jour CATALOG_LAST_VERIFIED ci-dessous
 *   - Vérifier produits, AMM, prix, disponibilités et restrictions avec :
 *       • Registre tunisien des médicaments (autorité compétente tunisienne)
 *       • OMS — Dénominations Communes Internationales (DCI/INN)
 *       • RCP et notices validés du produit réellement commercialisé
 *       • EMA / FDA ou autorité locale pour les références internationales
 *   - Incrémenter CATALOG_VERSION après chaque révision validée
 *
 * @version voir CATALOG_VERSION ci-dessous
 */

/**
 * Version du catalogue — incrémenter à chaque révision validée par un professionnel.
 * Format : YYYY-MM-DD.<révision>
 */
export const CATALOG_VERSION = "2024-01-01.1" as const;

/**
 * Date de dernière vérification réglementaire.
 * ⚠️  Si cette date dépasse 6 mois, le catalogue doit être revalidé avant usage clinique.
 */
export const CATALOG_LAST_VERIFIED = "2024-01-01" as const;


export type MedicationAvailability = "tunisia" | "international" | "both" | "unknown";
export type MedicationForm =
  | "comprimé"
  | "gélule"
  | "sachet"
  | "sirop"
  | "solution buvable"
  | "suspension buvable"
  | "injection"
  | "crème"
  | "pommade"
  | "gel"
  | "solution locale"
  | "collyre"
  | "unidose"
  | "inhalateur"
  | "nébulisation"
  | "patch"
  | "suppositoire"
  | "ovule"
  | "autre";

export type MedicationCategory =
  | "antalgiques"
  | "anti-infectieux"
  | "anti-inflammatoires"
  | "allergologie"
  | "cardiologie"
  | "diabétologie"
  | "gastro-entérologie"
  | "pneumologie"
  | "dermatologie"
  | "ophtalmologie"
  | "orl"
  | "pédiatrie"
  | "gynécologie"
  | "neurologie-psychiatrie"
  | "urologie"
  | "vitamines-minéraux"
  | "dentaire"
  | "autre";

export interface MedicationEntry {
  id: string;
  inn: string; // Dénomination commune internationale / DCI
  name: string; // Nom principal affiché dans la recherche
  aliases: string[]; // Marques et variantes de saisie
  category: MedicationCategory;
  forms: MedicationForm[];
  strengths: string[];
  availability: MedicationAvailability;
  requiresPrescription: boolean;
  controlled: boolean;
  pediatricCaution: boolean;
  pregnancyCaution: boolean;
  renalHepaticCaution: boolean;
  interactionReviewRequired: boolean;
  defaultPosology: null; // compatibilité avec l'ancien UI : jamais générée automatiquement
  prescribingNote: string;
  sourceStatus: "curated-starter" | "to-be-verified";
}

const medication = (
  id: string,
  inn: string,
  name: string,
  category: MedicationCategory,
  forms: MedicationForm[],
  strengths: string[],
  options: Partial<Pick<MedicationEntry, "aliases" | "availability" | "requiresPrescription" | "controlled" | "pediatricCaution" | "pregnancyCaution" | "renalHepaticCaution" | "interactionReviewRequired" | "prescribingNote" | "sourceStatus">> = {},
): MedicationEntry => ({
  id,
  inn,
  name,
  aliases: options.aliases ?? [],
  category,
  forms,
  strengths,
  availability: options.availability ?? "both",
  requiresPrescription: options.requiresPrescription ?? true,
  controlled: options.controlled ?? false,
  pediatricCaution: options.pediatricCaution ?? true,
  pregnancyCaution: options.pregnancyCaution ?? true,
  renalHepaticCaution: options.renalHepaticCaution ?? true,
  interactionReviewRequired: options.interactionReviewRequired ?? true,
  defaultPosology: null,
  prescribingNote: options.prescribingNote ?? "Valider l'indication, la présentation, la dose et la durée selon le RCP avant impression.",
  sourceStatus: options.sourceStatus ?? "curated-starter",
});

/**
 * Catalogue de départ large : DCI + marques/alias fréquents en Tunisie et à l'international.
 * Ce catalogue est volontairement versionné et extensible ; il ne prétend pas contenir
 * tous les produits, tous les laboratoires ni toutes les présentations commercialisées.
 */
export const ALL_MEDICATIONS: MedicationEntry[] = [
  // Antalgie / fièvre
  medication("paracetamol", "Paracétamol", "Paracétamol", "antalgiques", ["comprimé", "sirop", "suppositoire", "sachet"], ["100 mg", "150 mg", "200 mg", "250 mg", "300 mg", "500 mg", "1 g"], { aliases: ["Doliprane", "Panadol", "Efferalgan", "Perfalgan"], availability: "both", pediatricCaution: true }),
  medication("ibuprofen", "Ibuprofène", "Ibuprofène", "anti-inflammatoires", ["comprimé", "sirop", "sachet"], ["100 mg", "200 mg", "400 mg", "600 mg", "800 mg"], { aliases: ["Advil", "Nurofen", "Brufen"], pregnancyCaution: true }),
  medication("ketoprofen", "Kétoprofène", "Kétoprofène", "anti-inflammatoires", ["comprimé", "gélule", "gel", "injection"], ["25 mg", "50 mg", "100 mg", "150 mg"], { aliases: ["Profénid", "Bi-Profenid"], renalHepaticCaution: true }),
  medication("diclofenac", "Diclofénac", "Diclofénac", "anti-inflammatoires", ["comprimé", "gel", "suppositoire", "injection"], ["25 mg", "50 mg", "75 mg", "100 mg"], { aliases: ["Voltarène", "Cataflam"], renalHepaticCaution: true }),
  medication("tramadol", "Tramadol", "Tramadol", "antalgiques", ["gélule", "comprimé", "solution buvable", "injection"], ["50 mg", "100 mg"], { aliases: ["Topalgic", "Contramal"], controlled: true, pediatricCaution: true, interactionReviewRequired: true }),
  medication("morphine", "Morphine", "Morphine", "antalgiques", ["comprimé", "solution buvable", "injection"], ["10 mg", "20 mg", "30 mg", "60 mg"], { aliases: ["Moscontin", "Actiskenan"], controlled: true, renalHepaticCaution: true }),

  // Anti-infectieux — prescription et validation obligatoire
  medication("amoxicillin", "Amoxicilline", "Amoxicilline", "anti-infectieux", ["gélule", "comprimé", "sirop", "injection"], ["250 mg", "500 mg", "1 g"], { aliases: ["Clamoxyl", "Amoxil"], pediatricCaution: true, pregnancyCaution: true }),
  medication("amoxicillin-clavulanate", "Amoxicilline / Acide clavulanique", "Amoxicilline + acide clavulanique", "anti-infectieux", ["comprimé", "suspension buvable", "sachet", "injection"], ["500/125 mg", "875/125 mg", "1 g/125 mg"], { aliases: ["Augmentin", "Amoclan", "Clavulin"], pediatricCaution: true }),
  medication("azithromycin", "Azithromycine", "Azithromycine", "anti-infectieux", ["comprimé", "gélule", "suspension buvable", "injection"], ["250 mg", "500 mg"], { aliases: ["Zithromax"], interactionReviewRequired: true }),
  medication("spiramycin", "Spiramycine", "Spiramycine", "anti-infectieux", ["comprimé", "injection"], ["1,5 MUI", "3 MUI"], { aliases: ["Rovamycine", "Spiracine"] }),
  medication("metronidazole", "Métronidazole", "Métronidazole", "anti-infectieux", ["comprimé", "suspension buvable", "gel", "ovule", "injection"], ["250 mg", "500 mg"], { aliases: ["Flagyl", "Birodogyl"] }),
  medication("ciprofloxacin", "Ciprofloxacine", "Ciprofloxacine", "anti-infectieux", ["comprimé", "solution buvable", "injection", "collyre"], ["250 mg", "500 mg", "750 mg"], { aliases: ["Ciflox", "Cipro"], pediatricCaution: true, pregnancyCaution: true }),
  medication("levofloxacin", "Lévofloxacine", "Lévofloxacine", "anti-infectieux", ["comprimé", "injection", "collyre"], ["250 mg", "500 mg", "750 mg"], { aliases: ["Tavanic", "Oflocet"], pediatricCaution: true, pregnancyCaution: true }),
  medication("doxycycline", "Doxycycline", "Doxycycline", "anti-infectieux", ["comprimé", "gélule", "injection"], ["50 mg", "100 mg"], { aliases: ["Vibramycine"], pediatricCaution: true, pregnancyCaution: true }),
  medication("cefixime", "Céf ixime", "Céfixime", "anti-infectieux", ["comprimé", "suspension buvable"], ["100 mg", "200 mg", "400 mg"], { aliases: ["Oroken"], pediatricCaution: true, sourceStatus: "to-be-verified" }),

  // Corticoïdes / allergologie
  medication("prednisone", "Prednisone", "Prednisone", "anti-inflammatoires", ["comprimé"], ["5 mg", "20 mg", "50 mg"], { aliases: ["Cortancyl"], renalHepaticCaution: true }),
  medication("prednisolone", "Prednisolone", "Prednisolone", "anti-inflammatoires", ["comprimé", "solution buvable", "collyre"], ["5 mg", "20 mg", "1%"], { aliases: ["Solupred"], renalHepaticCaution: true }),
  medication("cetirizine", "Cétirizine", "Cétirizine", "allergologie", ["comprimé", "sirop"], ["5 mg", "10 mg"], { aliases: ["Zyrtec", "Virlix"] }),
  medication("loratadine", "Loratadine", "Loratadine", "allergologie", ["comprimé", "sirop"], ["10 mg"], { aliases: ["Clarityne", "Claritin"] }),
  medication("desloratadine", "Desloratadine", "Desloratadine", "allergologie", ["comprimé", "sirop"], ["5 mg"], { aliases: ["Aerius"] }),

  // Cardiologie / hypertension / lipides / anticoagulation
  medication("amlodipine", "Amlodipine", "Amlodipine", "cardiologie", ["comprimé"], ["5 mg", "10 mg"], { aliases: ["Amlor", "Norvasc"] }),
  medication("bisoprolol", "Bisoprolol", "Bisoprolol", "cardiologie", ["comprimé"], ["1,25 mg", "2,5 mg", "5 mg", "10 mg"], { aliases: ["Detensiel", "Cardensiel"] }),
  medication("enalapril", "Énalapril", "Énalapril", "cardiologie", ["comprimé"], ["5 mg", "10 mg", "20 mg"], { aliases: ["Renitec"] }),
  medication("perindopril", "Périndopril", "Périndopril", "cardiologie", ["comprimé"], ["2 mg", "4 mg", "5 mg", "8 mg", "10 mg"], { aliases: ["Coversyl"] }),
  medication("losartan", "Losartan", "Losartan", "cardiologie", ["comprimé"], ["25 mg", "50 mg", "100 mg"], { aliases: ["Cozaar"] }),
  medication("furosemide", "Furosémide", "Furosémide", "cardiologie", ["comprimé", "injection"], ["20 mg", "40 mg", "500 mg"], { aliases: ["Lasilix"], renalHepaticCaution: true }),
  medication("atorvastatin", "Atorvastatine", "Atorvastatine", "cardiologie", ["comprimé"], ["10 mg", "20 mg", "40 mg", "80 mg"], { aliases: ["Tahor", "Lipitor"], pregnancyCaution: true }),
  medication("rosuvastatin", "Rosuvastatine", "Rosuvastatine", "cardiologie", ["comprimé"], ["5 mg", "10 mg", "20 mg", "40 mg"], { aliases: ["Crestor"], pregnancyCaution: true }),
  medication("aspirin-low-dose", "Acide acétylsalicylique", "Acide acétylsalicylique faible dose", "cardiologie", ["comprimé", "sachet"], ["75 mg", "100 mg", "160 mg"], { aliases: ["Kardégic", "Aspirine Protect", "Aspirine cardio"], pediatricCaution: true, interactionReviewRequired: true }),
  medication("apixaban", "Apixaban", "Apixaban", "cardiologie", ["comprimé"], ["2,5 mg", "5 mg"], { aliases: ["Eliquis"], controlled: true, renalHepaticCaution: true }),
  medication("warfarin", "Warfarine", "Warfarine", "cardiologie", ["comprimé"], ["1 mg", "2 mg", "5 mg"], { aliases: ["Coumadine"], controlled: true, interactionReviewRequired: true, renalHepaticCaution: true }),

  // Diabétologie
  medication("metformin", "Metformine", "Metformine", "diabétologie", ["comprimé"], ["500 mg", "850 mg", "1 g"], { aliases: ["Glucophage", "Stagid"], renalHepaticCaution: true }),
  medication("gliclazide", "Gliclazide", "Gliclazide", "diabétologie", ["comprimé"], ["30 mg", "60 mg", "80 mg"], { aliases: ["Diamicron"], pediatricCaution: true, renalHepaticCaution: true }),
  medication("insulin-glargine", "Insuline glargine", "Insuline glargine", "diabétologie", ["injection"], ["100 U/mL", "300 U/mL"], { aliases: ["Lantus", "Toujeo"], controlled: true, pediatricCaution: true }),
  medication("insulin-aspart", "Insuline asparte", "Insuline asparte", "diabétologie", ["injection"], ["100 U/mL"], { aliases: ["NovoRapid"], controlled: true, pediatricCaution: true }),

  // Gastro-entérologie
  medication("omeprazole", "Oméprazole", "Oméprazole", "gastro-entérologie", ["gélule", "injection"], ["10 mg", "20 mg", "40 mg"], { aliases: ["Mopral", "Losec"] }),
  medication("pantoprazole", "Pantoprazole", "Pantoprazole", "gastro-entérologie", ["comprimé", "injection"], ["20 mg", "40 mg"], { aliases: ["Inipomp", "Protonix"] }),
  medication("metoclopramide", "Métoclopramide", "Métoclopramide", "gastro-entérologie", ["comprimé", "solution buvable", "injection"], ["10 mg"], { aliases: ["Primpéran"], pediatricCaution: true, interactionReviewRequired: true }),
  medication("diosmectite", "Diosmectite", "Diosmectite", "gastro-entérologie", ["sachet"], ["3 g"], { aliases: ["Smecta"], pediatricCaution: true }),
  medication("phloroglucinol", "Phloroglucinol", "Phloroglucinol", "gastro-entérologie", ["comprimé", "injection"], ["80 mg", "160 mg"], { aliases: ["Spasfon"] }),

  // Pneumologie / ORL
  medication("salbutamol", "Salbutamol", "Salbutamol", "pneumologie", ["inhalateur", "nébulisation", "sirop"], ["100 microgrammes/dose", "2,5 mg/2,5 mL", "5 mg/2,5 mL"], { aliases: ["Ventoline"] }),
  medication("budesonide", "Budésonide", "Budésonide", "pneumologie", ["inhalateur", "nébulisation"], ["0,25 mg/mL", "0,5 mg/mL", "200 microgrammes/dose"], { aliases: ["Pulmicort"] }),
  medication("fluticasone-salmeterol", "Fluticasone / Salmétérol", "Fluticasone + salmétérol", "pneumologie", ["inhalateur"], ["100/50", "250/50", "500/50"], { aliases: ["Seretide"] }),
  medication("xylometazoline", "Xylométazoline", "Xylométazoline", "orl", ["solution locale"], ["0,05%", "0,1%"], { aliases: ["Otrivine"], pediatricCaution: true }),
  medication("sodium-chloride", "Chlorure de sodium", "Sérum physiologique", "orl", ["unidose", "solution locale"], ["0,9%"], { aliases: ["Sérum physiologique", "NaCl 0,9%"], requiresPrescription: false, interactionReviewRequired: false }),

  // Ophtalmologie
  medication("artificial-tears", "Substituts lacrymaux", "Larmes artificielles", "ophtalmologie", ["collyre", "unidose"], ["selon présentation"], { aliases: ["Hyabak", "Thealoz", "Vismed"], requiresPrescription: false, interactionReviewRequired: false }),
  medication("chloramphenicol-eye", "Chloramphénicol", "Chloramphénicol collyre", "ophtalmologie", ["collyre", "pommade"], ["0,5%", "1%"], { aliases: ["Chibro-Cadron selon présentation"], pregnancyCaution: true }),
  medication("tobramycin-dexamethasone", "Tobramycine / Dexaméthasone", "Tobramycine + dexaméthasone", "ophtalmologie", ["collyre", "pommade"], ["selon présentation"], { aliases: ["Tobradex"], pregnancyCaution: true }),

  // Dermatologie
  medication("fusidic-acid", "Acide fusidique", "Acide fusidique", "dermatologie", ["crème", "pommade"], ["2%"], { aliases: ["Fucidine"] }),
  medication("betamethasone", "Bétaméthasone", "Bétaméthasone topique", "dermatologie", ["crème", "pommade", "gel"], ["0,05%", "0,1%"], { aliases: ["Diprosone"], pediatricCaution: true, pregnancyCaution: true }),
  medication("hydrocortisone-topical", "Hydrocortisone", "Hydrocortisone topique", "dermatologie", ["crème", "pommade"], ["1%", "2,5%"], { aliases: ["Cortaid selon marché"], pediatricCaution: true }),
  medication("chlorhexidine", "Chlorhexidine", "Chlorhexidine", "dermatologie", ["solution locale", "gel"], ["0,05%", "0,2%", "selon présentation"], { aliases: ["Biseptine", "Eludril selon présentation"], requiresPrescription: false, interactionReviewRequired: false }),

  // Pédiatrie — toujours poids/âge et concentration exacts
  medication("paracetamol-pediatric", "Paracétamol", "Paracétamol pédiatrique", "pédiatrie", ["sirop", "suppositoire", "sachet"], ["concentration variable"], { aliases: ["Doliprane enfant", "Efferalgan pédiatrique"], pediatricCaution: true, prescribingNote: "Calculer uniquement selon poids, concentration exacte et dose maximale validée ; contrôler le cumul avec toutes les spécialités contenant du paracétamol." }),
  medication("ibuprofen-pediatric", "Ibuprofène", "Ibuprofène pédiatrique", "pédiatrie", ["sirop", "comprimé"], ["concentration variable"], { aliases: ["Advil enfant", "Nurofen enfant"], pediatricCaution: true, prescribingNote: "Vérifier âge, poids, hydratation, fonction rénale et contre-indications avant toute prescription." }),
  medication("oral-rehydration", "Sels de réhydratation orale", "Solution de réhydratation orale", "pédiatrie", ["sachet"], ["composition selon produit"], { aliases: ["SRO", "ORS"], requiresPrescription: false, pediatricCaution: true, interactionReviewRequired: false }),

  // Gynécologie / obstétrique
  medication("folic-acid", "Acide folique", "Acide folique", "gynécologie", ["comprimé"], ["0,4 mg", "5 mg"], { aliases: ["Spéciafoldine", "Acide folique"], pregnancyCaution: false, interactionReviewRequired: true }),
  medication("fer", "Fer", "Fer oral", "vitamines-minéraux", ["comprimé", "gélule", "sirop"], ["selon sel et présentation"], { aliases: ["Tardyferon", "Fero-Grad"], pregnancyCaution: true, renalHepaticCaution: true }),
  medication("levonorgestrel", "Lévonorgestrel", "Lévonorgestrel", "gynécologie", ["comprimé"], ["0,75 mg", "1,5 mg"], { aliases: ["NorLevo", "Postinor"], pregnancyCaution: true, interactionReviewRequired: true }),
  medication("ethinylestradiol-levonorgestrel", "Éthinylestradiol / Lévonorgestrel", "Contraceptif oral combiné", "gynécologie", ["comprimé"], ["selon spécialité"], { aliases: ["Microgynon", "Minidril"], pregnancyCaution: true, interactionReviewRequired: true }),

  // Dentaire / stomatologie
  medication("chlorhexidine-mouthwash", "Chlorhexidine", "Bain de bouche à la chlorhexidine", "dentaire", ["solution locale"], ["0,12%", "0,2%"], { aliases: ["Eludril", "Paroex", "Corsodyl"], requiresPrescription: false, interactionReviewRequired: false }),
  medication("spiramycin-metronidazole", "Spiramycine / Métronidazole", "Spiramycine + métronidazole", "dentaire", ["comprimé"], ["selon présentation"], { aliases: ["Birodogyl"], pediatricCaution: true }),
  medication("lidocaine-local", "Lidocaïne", "Lidocaïne locale", "dentaire", ["gel", "solution locale", "injection"], ["2%", "selon présentation"], { aliases: ["Xylocaïne"], controlled: false, pediatricCaution: true }),

  // Neuro-psychiatrie — vigilance renforcée
  medication("alprazolam", "Alprazolam", "Alprazolam", "neurologie-psychiatrie", ["comprimé"], ["0,25 mg", "0,5 mg", "1 mg"], { aliases: ["Xanax"], controlled: true, pediatricCaution: true, interactionReviewRequired: true }),
  medication("bromazepam", "Bromazépam", "Bromazépam", "neurologie-psychiatrie", ["comprimé"], ["1,5 mg", "3 mg", "6 mg"], { aliases: ["Lexomil"], controlled: true, pediatricCaution: true, interactionReviewRequired: true }),
  medication("sertraline", "Sertraline", "Sertraline", "neurologie-psychiatrie", ["comprimé"], ["25 mg", "50 mg", "100 mg"], { aliases: ["Zoloft"], interactionReviewRequired: true }),
  medication("levetiracetam", "Lévétiracétam", "Lévétiracétam", "neurologie-psychiatrie", ["comprimé", "solution buvable", "injection"], ["250 mg", "500 mg", "750 mg", "1 g"], { aliases: ["Keppra"], renalHepaticCaution: true }),
];

/** Compatibilité avec l'ancien composant de prescription. */
export const medicationDisplayName = (item: MedicationEntry) => item.name;

export function normalizeMedicationSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchMedications(query: string, category?: MedicationCategory): MedicationEntry[] {
  const normalized = normalizeMedicationSearch(query);
  return ALL_MEDICATIONS.filter((item) => {
    if (category && item.category !== category) return false;
    if (!normalized) return true;
    const haystack = normalizeMedicationSearch([item.name, item.inn, ...item.aliases, ...item.strengths].join(" "));
    return haystack.includes(normalized);
  });
}

export function getMedicationById(id: string): MedicationEntry | undefined {
  return ALL_MEDICATIONS.find((item) => item.id === id);
}

export function getMedicationWarnings(item: MedicationEntry): string[] {
  const warnings: string[] = [];
  if (item.controlled) warnings.push("Médicament soumis à une vigilance réglementaire renforcée.");
  if (item.pediatricCaution) warnings.push("Vérifier l'âge, le poids, la concentration et les contre-indications pédiatriques.");
  if (item.pregnancyCaution) warnings.push("Vérifier grossesse/allaitement et le RCP avant prescription.");
  if (item.renalHepaticCaution) warnings.push("Évaluer la fonction rénale et hépatique si pertinent.");
  if (item.interactionReviewRequired) warnings.push("Revoir allergies, traitements en cours et interactions avant validation.");
  return warnings;
}

export const MEDICATION_CATEGORIES: { value: MedicationCategory; label: string }[] = [
  { value: "antalgiques", label: "Antalgie / fièvre" },
  { value: "anti-infectieux", label: "Anti-infectieux" },
  { value: "anti-inflammatoires", label: "Anti-inflammatoires / corticoïdes" },
  { value: "allergologie", label: "Allergologie" },
  { value: "cardiologie", label: "Cardiologie / vasculaire" },
  { value: "diabétologie", label: "Diabétologie" },
  { value: "gastro-entérologie", label: "Gastro-entérologie" },
  { value: "pneumologie", label: "Pneumologie" },
  { value: "dermatologie", label: "Dermatologie" },
  { value: "ophtalmologie", label: "Ophtalmologie" },
  { value: "orl", label: "ORL" },
  { value: "pédiatrie", label: "Pédiatrie" },
  { value: "gynécologie", label: "Gynécologie" },
  { value: "neurologie-psychiatrie", label: "Neurologie / psychiatrie" },
  { value: "dentaire", label: "Dentaire / stomatologie" },
  { value: "vitamines-minéraux", label: "Vitamines / minéraux" },
];
