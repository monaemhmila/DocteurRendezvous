/* -------------------------------------------------------------------------- */
/* Date helpers — mock data is anchored to "today" so the agenda always fills  */
/* -------------------------------------------------------------------------- */
const pad = (n) => String(n).padStart(2, "0");
export function isoDay(offset = 0) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const TODAY = isoDay(0);
/* -------------------------------------------------------------------------- */
/* Clinic                                                                     */
/* -------------------------------------------------------------------------- */
export const clinic = {
    name: "Cabinet Dr. Ben Amor",
    address: "12 Rue de Marseille, Lac 2, Tunis",
    phone: "+216 71 962 480",
    email: "contact@cabinetbenamor.tn",
    currency: "DT",
    hours: [
        { day: "Lundi", open: "08:30", close: "18:00" },
        { day: "Mardi", open: "08:30", close: "18:00" },
        { day: "Mercredi", open: "08:30", close: "18:00" },
        { day: "Jeudi", open: "08:30", close: "18:00" },
        { day: "Vendredi", open: "08:30", close: "17:00" },
        { day: "Samedi", open: "09:00", close: "13:00" },
        { day: "Dimanche", open: "—", close: "—" },
    ],
};
export const currentUser = {
    name: "Sarah Gharbi",
    firstName: "Sarah",
    role: "Réception",
    initials: "SG",
};
export const doctors = [
    { id: "d1", name: "Dr. Ben Amor", speciality: "Dentisterie générale", color: "primary" },
    { id: "d2", name: "Dr. Chaouch", speciality: "Orthodontie", color: "accent" },
    { id: "d3", name: "Dr. Mrabet", speciality: "Implantologie", color: "ai" },
];
export const treatments = [
    { name: "Consultation", duration: 30, price: 60 },
    { name: "Détartrage", duration: 45, price: 120 },
    { name: "Composite", duration: 45, price: 180 },
    { name: "Traitement de canal", duration: 60, price: 350 },
    { name: "Couronne céramique", duration: 60, price: 850 },
    { name: "Extraction", duration: 30, price: 150 },
    { name: "Implant", duration: 90, price: 1900 },
    { name: "Appareil orthodontique", duration: 60, price: 2400 },
    { name: "Blanchiment", duration: 60, price: 450 },
    { name: "Contrôle post-opératoire", duration: 20, price: 0 },
];
const rows = [
    ["Amira", "Ben Salem", "24 118 402", "at_risk", -186, 7, 9, 0, "Détartrage", "d1", "inactive", "high", "replied", 480],
    ["Mohamed", "Trabelsi", "98 204 771", "at_risk", -210, null, 4, 1, "Traitement de canal", "d1", "treatment_interrupted", "high", "identified", 890],
    ["Mariem", "Bouazizi", "22 641 905", "active", -32, 2, 12, 0, "Composite", "d2", undefined, undefined, undefined, 0],
    ["Ahmed", "Kacem", "55 380 214", "active", -14, 0, 6, 0, "Consultation", "d1", "cancellation", "medium", "contacted", 350],
    ["Sonia", "Mejri", "97 512 806", "inactive", -402, null, 3, 0, "Blanchiment", "d3", "inactive", "medium", "identified", 450],
    ["Yassine", "Gharbi", "21 907 336", "active", -6, 4, 15, 0, "Couronne céramique", "d3", undefined, undefined, undefined, 0],
    ["Nour", "Chebbi", "52 118 990", "at_risk", -95, null, 5, 2, "Extraction", "d1", "no_show", "high", "identified", 150],
    ["Karim", "Belhaj", "94 220 517", "active", -21, 1, 8, 0, "Détartrage", "d2", undefined, undefined, undefined, 0],
    ["Fatma", "Zouari", "23 704 188", "at_risk", -168, null, 7, 0, "Implant", "d3", "quote_pending", "high", "contacted", 1900],
    ["Slim", "Hamdi", "98 663 402", "active", -45, 9, 11, 1, "Composite", "d1", undefined, undefined, undefined, 0],
    ["Ines", "Marzouki", "26 449 730", "inactive", -365, null, 2, 0, "Consultation", "d2", "checkup_overdue", "medium", "identified", 120],
    ["Walid", "Naceur", "55 902 176", "active", -10, 3, 5, 0, "Traitement de canal", "d1", undefined, undefined, undefined, 0],
    ["Rania", "Sassi", "22 336 815", "at_risk", -142, null, 6, 1, "Appareil orthodontique", "d2", "treatment_interrupted", "high", "identified", 2400],
    ["Hichem", "Ferjani", "97 218 044", "active", -28, 6, 9, 0, "Détartrage", "d1", undefined, undefined, undefined, 0],
    ["Leila", "Ayari", "21 550 963", "at_risk", -212, null, 4, 0, "Couronne céramique", "d3", "quote_pending", "medium", "identified", 850],
    ["Tarek", "Jaziri", "94 771 208", "active", -3, 11, 13, 0, "Contrôle post-opératoire", "d3", undefined, undefined, undefined, 0],
    ["Salma", "Dridi", "52 604 331", "active", -60, 5, 7, 0, "Blanchiment", "d2", "follow_up", "low", "contacted", 450],
    ["Nabil", "Chakroun", "98 115 720", "inactive", -520, null, 3, 1, "Extraction", "d1", "inactive", "low", "identified", 150],
    ["Dorra", "Ben Mahmoud", "23 981 456", "active", -18, 8, 10, 0, "Composite", "d1", undefined, undefined, undefined, 0],
    ["Anis", "Khelifi", "55 447 902", "at_risk", -178, null, 5, 2, "Consultation", "d2", "no_show", "high", "contacted", 60],
    ["Hela", "Bouden", "26 330 174", "active", -37, 14, 8, 0, "Détartrage", "d1", undefined, undefined, undefined, 0],
    ["Mehdi", "Ouali", "97 802 653", "at_risk", -240, null, 6, 0, "Implant", "d3", "treatment_interrupted", "high", "booked", 1900],
    ["Asma", "Riahi", "21 664 209", "active", -25, 1, 4, 0, "Consultation", "d2", undefined, undefined, undefined, 0],
    ["Bilel", "Hachicha", "94 118 537", "inactive", -388, null, 2, 0, "Détartrage", "d1", "checkup_overdue", "medium", "identified", 120],
    ["Olfa", "Saidi", "52 907 448", "active", -8, 2, 12, 0, "Couronne céramique", "d3", undefined, undefined, undefined, 0],
    ["Sami", "Zaidi", "98 552 106", "at_risk", -156, null, 7, 1, "Traitement de canal", "d1", "treatment_interrupted", "medium", "replied", 350],
    ["Chaima", "Nasri", "23 220 795", "active", -50, 6, 6, 0, "Composite", "d2", undefined, undefined, undefined, 0],
    ["Ramzi", "Karoui", "55 663 812", "active", -12, 4, 9, 0, "Extraction", "d1", undefined, undefined, undefined, 0],
    ["Nesrine", "Louati", "26 774 130", "at_risk", -195, null, 5, 0, "Appareil orthodontique", "d2", "quote_pending", "high", "identified", 2400],
    ["Amine", "Sfaxi", "97 441 268", "active", -33, 10, 11, 0, "Détartrage", "d3", undefined, undefined, undefined, 0],
    ["Rim", "Mansour", "21 338 674", "inactive", -430, null, 3, 1, "Consultation", "d1", "inactive", "medium", "identified", 60],
    ["Fares", "Ben Youssef", "94 905 213", "active", -16, 3, 8, 0, "Composite", "d1", undefined, undefined, undefined, 0],
    ["Syrine", "Abdelli", "52 116 987", "active", -41, 7, 5, 0, "Blanchiment", "d2", undefined, undefined, undefined, 0],
    ["Ayoub", "Rekik", "98 330 546", "at_risk", -132, null, 4, 2, "Couronne céramique", "d3", "no_show", "medium", "identified", 850],
    ["Maha", "Guesmi", "23 559 802", "active", -22, 12, 7, 0, "Détartrage", "d1", undefined, undefined, undefined, 0],
    ["Hamza", "Bouzid", "55 774 391", "inactive", -350, null, 2, 0, "Extraction", "d2", "checkup_overdue", "low", "identified", 150],
    ["Emna", "Chaabane", "26 902 158", "active", -5, 1, 14, 0, "Contrôle post-opératoire", "d1", undefined, undefined, undefined, 0],
    ["Zied", "Mhiri", "97 663 447", "at_risk", -204, null, 6, 1, "Implant", "d3", "quote_pending", "high", "contacted", 1900],
    ["Wafa", "Ben Aissa", "21 447 730", "active", -29, 5, 9, 0, "Composite", "d2", undefined, undefined, undefined, 0],
    ["Khaled", "Tounsi", "94 336 218", "active", -47, 8, 10, 1, "Traitement de canal", "d1", undefined, undefined, undefined, 0],
    ["Sirine", "Baccar", "52 220 964", "at_risk", -175, null, 5, 0, "Appareil orthodontique", "d2", "treatment_interrupted", "medium", "identified", 2400],
    ["Nizar", "Chihi", "98 774 502", "active", -11, 2, 6, 0, "Consultation", "d1", undefined, undefined, undefined, 0],
    ["Ghada", "Hlaoui", "23 118 673", "inactive", -470, null, 3, 0, "Détartrage", "d3", "inactive", "low", "identified", 120],
    ["Ilyes", "Jebali", "55 220 448", "active", -19, 6, 8, 0, "Composite", "d1", undefined, undefined, undefined, 0],
    ["Sarra", "Ben Hassine", "26 663 917", "active", -36, 13, 7, 0, "Blanchiment", "d2", undefined, undefined, undefined, 0],
    ["Oussama", "Krifa", "97 905 336", "at_risk", -188, null, 4, 1, "Extraction", "d1", "no_show", "medium", "identified", 150],
    ["Yosra", "Tlili", "21 774 205", "active", -7, 1, 11, 0, "Couronne céramique", "d3", undefined, undefined, undefined, 0],
    ["Marwen", "Sahli", "94 447 819", "active", -54, 9, 5, 0, "Détartrage", "d1", "follow_up", "low", "identified", 120],
    ["Aya", "Bahri", "52 330 762", "active", -13, 4, 6, 0, "Consultation", "d2", undefined, undefined, undefined, 0],
    ["Seif", "Ghodbane", "98 118 640", "at_risk", -220, null, 5, 0, "Implant", "d3", "treatment_interrupted", "high", "visited", 1900],
];
export const patients = rows.map((r, i) => {
    const [first, last, tail, status, lv, nx, visits, noShows, treatment, doctorId, reason, priority, stage, value] = r;
    return {
        id: `p${i + 1}`,
        firstName: first,
        lastName: last,
        phone: `+216 ${tail}`,
        email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`,
        whatsapp: true,
        status,
        lastVisit: lv === null ? null : isoDay(lv),
        nextAppointment: nx === null ? null : isoDay(nx),
        totalVisits: visits,
        noShows,
        lastTreatment: treatment,
        doctorId,
        recoveryReason: reason,
        priority,
        recoveryStage: stage,
        estimatedValue: value || undefined,
        preferredTime: ["Matin", "Après-midi", "Fin de journée", "Samedi matin"][i % 4],
        suggestedAction: reason ? suggestedActionFor(reason) : undefined,
        aiRecommendation: reason ? aiRecoFor(reason, first) : undefined,
        suggestedMessage: reason ? suggestedMessageFor(reason, first) : undefined,
    };
});
export function suggestedActionFor(reason) {
    switch (reason) {
        case "inactive":
            return "Inviter à reprendre un contrôle";
        case "treatment_interrupted":
            return "Inviter à reprendre le traitement";
        case "quote_pending":
            return "Relancer le devis";
        case "no_show":
            return "Reprogrammer le rendez-vous";
        case "checkup_overdue":
            return "Proposer un contrôle annuel";
        case "cancellation":
            return "Proposer un nouveau créneau";
        default:
            return "Envoyer un suivi post-traitement";
    }
}
function aiRecoFor(reason, first) {
    switch (reason) {
        case "inactive":
            return `${first} n'est pas revenu(e) depuis plus de 6 mois. Une relance amicale est recommandée.`;
        case "treatment_interrupted":
            return `Le traitement de ${first} est resté inachevé. Proposer un rendez-vous de reprise cette semaine.`;
        case "quote_pending":
            return `Un devis est en attente depuis plus de 60 jours. Proposer un appel de clarification.`;
        case "no_show":
            return `${first} a manqué son dernier rendez-vous. Confirmer par WhatsApp avant de reprogrammer.`;
        case "checkup_overdue":
            return `Le contrôle annuel de ${first} est dépassé. Un rappel simple suffit généralement.`;
        case "cancellation":
            return `Rendez-vous annulé sans replanification. Proposer deux créneaux au choix.`;
        default:
            return `Suivi post-traitement recommandé pour ${first}.`;
    }
}
function suggestedMessageFor(reason, first) {
    switch (reason) {
        case "treatment_interrupted":
            return `Bonjour ${first} 😊 Votre traitement au cabinet Dr. Ben Amor n'a pas été terminé. Souhaitez-vous que je vous réserve un créneau cette semaine ?`;
        case "quote_pending":
            return `Bonjour ${first}, votre devis est toujours disponible au cabinet Dr. Ben Amor. Souhaitez-vous en discuter avec le docteur ?`;
        case "no_show":
            return `Bonjour ${first}, nous ne vous avons pas vu(e) à votre dernier rendez-vous. Voulez-vous en fixer un nouveau ?`;
        default:
            return `Bonjour ${first} 😊 Nous espérons que vous allez bien. Cela fait un moment depuis votre dernière visite — souhaitez-vous programmer un contrôle ?`;
    }
}
export const patientById = (id) => patients.find((p) => p.id === id);
export const fullName = (p) => `${p.firstName} ${p.lastName}`;
export const initials = (p) => `${p.firstName[0]}${p.lastName[0]}`;
export const shortName = (p) => `${p.firstName} ${p.lastName[0]}.`;
export const doctorById = (id) => doctors.find((d) => d.id === id);
const apptRows = [
    [4, 0, "08:30", "Consultation", "d1", "confirmed"],
    [21, 0, "09:00", "Détartrage", "d2", "confirmed"],
    [16, 0, "09:30", "Contrôle post-opératoire", "d3", "completed"],
    [37, 0, "10:00", "Contrôle post-opératoire", "d1", "confirmed"],
    [1, 0, "10:30", "Détartrage", "d1", "scheduled", { ai: true, recovered: true }],
    [25, 0, "11:00", "Couronne céramique", "d3", "confirmed"],
    [43, 0, "11:30", "Composite", "d1", "cancelled"],
    [47, 0, "13:30", "Couronne céramique", "d3", "confirmed"],
    [12, 0, "14:00", "Traitement de canal", "d1", "confirmed", { ai: true }],
    [3, 0, "14:30", "Composite", "d2", "scheduled"],
    [42, 0, "15:00", "Consultation", "d1", "confirmed"],
    [7, 0, "15:30", "Extraction", "d1", "no_show"],
    [30, 0, "16:00", "Détartrage", "d3", "cancelled"],
    [49, 0, "16:30", "Consultation", "d2", "scheduled"],
    [23, 0, "17:00", "Consultation", "d2", "confirmed"],
    [19, 1, "09:00", "Composite", "d1", "confirmed"],
    [39, 1, "09:30", "Composite", "d2", "scheduled"],
    [28, 1, "10:00", "Extraction", "d1", "confirmed"],
    [45, 1, "10:30", "Blanchiment", "d2", "confirmed"],
    [1, 1, "14:00", "Détartrage", "d1", "confirmed", { ai: true, recovered: true }],
    [22, 2, "08:30", "Implant", "d3", "confirmed", { recovered: true }],
    [8, 2, "11:00", "Détartrage", "d2", "confirmed"],
    [32, 3, "09:00", "Composite", "d1", "confirmed"],
    [17, 5, "10:00", "Blanchiment", "d2", "scheduled"],
    [14, 6, "11:00", "Détartrage", "d1", "confirmed"],
    [35, 12, "09:30", "Détartrage", "d1", "scheduled"],
    [2, -12, "10:00", "Traitement de canal", "d1", "completed"],
    [9, -18, "09:00", "Implant", "d3", "completed"],
    [13, -30, "11:30", "Appareil orthodontique", "d2", "completed"],
    [20, -9, "15:00", "Consultation", "d2", "no_show"],
    [34, -4, "16:00", "Couronne céramique", "d3", "no_show"],
    [46, -2, "10:30", "Extraction", "d1", "no_show"],
    [50, -1, "09:00", "Implant", "d3", "completed", { recovered: true }],
    [26, -1, "14:30", "Traitement de canal", "d1", "cancelled"],
];
export const appointments = apptRows.map((r, i) => {
    const [pid, off, time, treatment, doctorId, status, extra] = r;
    const t = treatments.find((x) => x.name === treatment);
    return {
        id: `a${i + 1}`,
        patientId: `p${pid}`,
        doctorId,
        date: isoDay(off),
        startTime: time,
        endTime: `${parseInt(time.split(":")[0]) + Math.floor((parseInt(time.split(":")[1]) + t.duration) / 60)}`.padStart(2, "0") + ":" + `${(parseInt(time.split(":")[1]) + t.duration) % 60}`.padStart(2, "0"),
        durationMin: t.duration,
        treatment,
        status,
        value: t.price,
        createdByAi: extra?.ai,
        recovered: extra?.recovered,
        notes: status === "no_show"
            ? "Patient absent, non joignable au téléphone."
            : "Aucune note particulière.",
    };
});
const convRows = [
    [1, true, 2, "appointment", 4, false, [
            ["patient", "slm fama rdv demain?", "09:12"],
            ["ai", "Bonjour Amira 😊 Oui, il reste une disponibilité demain à 10h30 ou 14h00. Quel horaire vous convient ?", "09:12"],
            ["patient", "14h", "09:14"],
            ["ai", "Parfait, je vous confirme votre rendez-vous demain à 14h00 avec le Dr Ben Amor.", "09:14"],
        ], { date: "Demain", time: "14:00", doctor: "Dr. Ben Amor" }],
    [2, false, 1, "recovery", 22, true, [
            ["ai", "Bonjour Mohamed, votre traitement de canal n'a pas été terminé. Souhaitez-vous reprendre ?", "08:40"],
            ["patient", "je veux parler à la réception svp", "08:52"],
            ["ai", "Cette demande nécessite l'intervention du cabinet. Je transfère votre message à la réception.", "08:52",],
        ]],
    [4, true, 0, "appointment", 55, false, [
            ["patient", "Bonjour, je peux déplacer mon rendez-vous ?", "08:05"],
            ["ai", "Bonjour Ahmed 😊 Bien sûr. Je peux vous proposer jeudi 15h30 ou vendredi 09h00.", "08:05"],
            ["patient", "jeudi ça marche", "08:20"],
            ["ai", "C'est noté, jeudi 15h30 avec le Dr Ben Amor. Vous recevrez un rappel la veille.", "08:20"],
        ], { date: "Jeudi", time: "15:30", doctor: "Dr. Ben Amor" }],
    [7, true, 3, "follow_up", 90, false, [
            ["ai", "Bonjour Nour, vous avez manqué votre rendez-vous du 3. Souhaitez-vous en fixer un nouveau ?", "Hier"],
            ["patient", "najem nji vendredi?", "07:30"],
            ["ai", "Oui, vendredi il reste 09h00 et 11h30. Quel horaire préférez-vous ?", "07:30"],
        ]],
    [9, false, 0, "recovery", 140, false, [
            ["ai", "Bonjour Fatma, votre devis implant est toujours valable. Souhaitez-vous en discuter ?", "Hier"],
            ["patient", "oui mais je veux connaitre le prix exact", "Hier"],
            ["staff", "Bonjour Fatma, je vous prépare un devis détaillé et je vous rappelle aujourd'hui. — Sarah", "08:15"],
        ]],
    [3, true, 0, "info", 180, false, [
            ["patient", "vous ouvrez samedi ?", "Hier"],
            ["ai", "Oui 😊 Le cabinet est ouvert samedi de 09h00 à 13h00.", "Hier"],
        ]],
    [13, true, 1, "recovery", 200, false, [
            ["ai", "Bonjour Rania, votre traitement orthodontique est en pause depuis 4 mois. On reprend ?", "Hier"],
            ["patient", "inchallah semaine prochaine", "Hier"],
        ]],
    [22, true, 0, "appointment", 260, false, [
            ["patient", "Merci de confirmer mon rendez-vous.", "Hier"],
            ["ai", "C'est confirmé Mehdi : mercredi 08h30 avec le Dr Mrabet pour votre implant.", "Hier"],
        ], { date: "Mercredi", time: "08:30", doctor: "Dr. Mrabet" }],
    [20, false, 2, "follow_up", 300, true, [
            ["patient", "pourquoi vous m'appelez tout le temps??", "Hier"],
            ["ai", "Je comprends votre agacement. Je transfère votre message à la réception.", "Hier"],
        ]],
    [26, true, 0, "appointment", 380, false, [
            ["patient", "3andi wje3 fi sinni", "Hier"],
            ["ai", "Je ne peux pas donner d'avis médical, mais je peux vous trouver un rendez-vous rapidement. Il reste aujourd'hui 16h30.", "Hier"],
            ["patient", "ok", "Hier"],
        ], { date: "Aujourd'hui", time: "16:30", doctor: "Dr. Ben Amor" }],
    [5, true, 0, "recovery", 460, false, [
            ["ai", "Bonjour Sonia 😊 Cela fait un moment depuis votre dernière visite. Un contrôle vous intéresse ?", "2 j"],
        ]],
    [11, true, 0, "recovery", 520, false, [
            ["ai", "Bonjour Ines, votre contrôle annuel est dépassé. Souhaitez-vous un créneau ?", "2 j"],
            ["patient", "envoyez moi les dispos stp", "2 j"],
            ["ai", "Bien sûr : lundi 09h00, mardi 11h30 ou samedi 10h00.", "2 j"],
        ]],
    [17, true, 0, "follow_up", 600, false, [
            ["ai", "Bonjour Salma, comment s'est passé votre blanchiment ?", "2 j"],
            ["patient", "très bien merci 🙏", "2 j"],
        ]],
    [29, true, 1, "recovery", 700, false, [
            ["ai", "Bonjour Nesrine, votre devis orthodontique est en attente. Des questions ?", "3 j"],
            ["patient", "chnowa el prix nihai?", "3 j"],
        ]],
    [38, false, 0, "recovery", 800, false, [
            ["staff", "Bonjour Zied, le Dr Mrabet peut vous recevoir jeudi pour parler de votre implant.", "3 j"],
            ["patient", "d'accord merci", "3 j"],
        ]],
    [45, true, 0, "appointment", 900, false, [
            ["patient", "je serai 10 min en retard", "3 j"],
            ["ai", "Merci de nous prévenir Sarra, ce n'est pas un problème 😊", "3 j"],
        ]],
    [33, true, 0, "info", 1000, false, [
            ["patient", "vous acceptez la CNAM ?", "4 j"],
            ["ai", "Oui, le cabinet accepte la CNAM pour les soins conventionnés.", "4 j"],
        ]],
    [41, true, 2, "recovery", 1100, false, [
            ["ai", "Bonjour Sirine, votre traitement orthodontique est en pause. On reprend ce mois-ci ?", "4 j"],
            ["patient", "oui", "4 j"],
            ["patient", "quand ?", "4 j"],
        ]],
    [48, true, 0, "follow_up", 1200, false, [
            ["ai", "Bonjour Marwen, il est temps de programmer votre détartrage annuel.", "5 j"],
        ]],
    [50, true, 0, "appointment", 1400, false, [
            ["patient", "Merci pour hier, tout va bien", "5 j"],
            ["ai", "Avec plaisir Seif 😊 Le Dr Mrabet vous reverra dans 10 jours pour le contrôle.", "5 j"],
        ]],
];
export const conversations = convRows.map((r, i) => {
    const [pid, aiActive, unread, tag, minsAgo, needsHuman, msgs, card] = r;
    return {
        id: `c${i + 1}`,
        patientId: `p${pid}`,
        channel: i % 9 === 8 ? "sms" : "whatsapp",
        aiActive,
        unread,
        tag,
        needsHuman,
        updatedAt: relTime(minsAgo),
        messages: msgs.map(([author, text, time], j) => ({
            id: `c${i + 1}m${j + 1}`,
            author,
            text,
            time,
            escalated: needsHuman && j === msgs.length - 1 && author === "ai",
            appointmentCard: card && j === msgs.length - 1 ? card : undefined,
        })),
    };
});
function relTime(mins) {
    if (mins < 60)
        return `${mins} min`;
    if (mins < 1440)
        return `${Math.round(mins / 60)} h`;
    return `${Math.round(mins / 1440)} j`;
}
/* -------------------------------------------------------------------------- */
/* Open slots / waitlist / campaigns / no-shows / notifications                */
/* -------------------------------------------------------------------------- */
export const openSlots = [
    { id: "s1", date: isoDay(0), time: "16:00", doctorId: "d3", durationMin: 45, reason: "cancellation", matchIds: ["p3", "p4", "p21"], filled: false, value: 120 },
    { id: "s2", date: isoDay(0), time: "11:30", doctorId: "d1", durationMin: 45, reason: "cancellation", matchIds: ["p19", "p28", "p42"], filled: false, value: 180 },
    { id: "s3", date: isoDay(1), time: "11:00", doctorId: "d2", durationMin: 30, reason: "gap", matchIds: ["p23", "p49"], filled: false, value: 60 },
    { id: "s4", date: isoDay(1), time: "15:30", doctorId: "d1", durationMin: 60, reason: "no_show", matchIds: ["p12", "p40", "p26", "p44"], filled: false, value: 350 },
    { id: "s5", date: isoDay(2), time: "09:30", doctorId: "d3", durationMin: 60, reason: "cancellation", matchIds: ["p25", "p47"], filled: false, value: 850 },
];
export const waitlist = [
    { id: "w1", patientId: "p3", wants: "N'importe quel matin en semaine", treatment: "Composite", createdAt: isoDay(-3), flexibility: "high" },
    { id: "w2", patientId: "p4", wants: "Dès que possible", treatment: "Consultation", createdAt: isoDay(-2), flexibility: "high" },
    { id: "w3", patientId: "p21", wants: "Après 17h", treatment: "Détartrage", createdAt: isoDay(-5), flexibility: "medium" },
    { id: "w4", patientId: "p19", wants: "Samedi matin uniquement", treatment: "Composite", createdAt: isoDay(-7), flexibility: "low" },
    { id: "w5", patientId: "p28", wants: "Dès que possible", treatment: "Extraction", createdAt: isoDay(-1), flexibility: "high" },
    { id: "w6", patientId: "p42", wants: "Lundi ou mardi", treatment: "Consultation", createdAt: isoDay(-4), flexibility: "medium" },
    { id: "w7", patientId: "p23", wants: "Fin de journée", treatment: "Consultation", createdAt: isoDay(-6), flexibility: "medium" },
    { id: "w8", patientId: "p49", wants: "N'importe quand cette semaine", treatment: "Consultation", createdAt: isoDay(-2), flexibility: "high" },
    { id: "w9", patientId: "p25", wants: "Mercredi matin", treatment: "Couronne céramique", createdAt: isoDay(-9), flexibility: "low" },
    { id: "w10", patientId: "p47", wants: "Dès que possible", treatment: "Couronne céramique", createdAt: isoDay(-1), flexibility: "high" },
];
export const campaigns = [
    {
        id: "f1",
        name: "Patients inactifs — 6 mois",
        trigger: "Patient inactif depuis 6 mois",
        state: "active",
        audience: 48,
        contacted: 31,
        replied: 14,
        booked: 8,
        nextRun: "Aujourd'hui 18:00",
        steps: [
            { label: "Patient inactif depuis 6 mois", detail: "Déclencheur", kind: "trigger" },
            { label: "Attendre 0 jour", detail: "Envoi immédiat", kind: "wait" },
            { label: "Message WhatsApp", detail: "Relance amicale + proposition de contrôle", kind: "message" },
            { label: "Attendre 3 jours", detail: "Sans réponse", kind: "wait" },
            { label: "Si pas de réponse", detail: "Envoyer un rappel unique", kind: "condition" },
            { label: "Arrêter si le patient réserve", detail: "Objectif atteint", kind: "goal" },
        ],
    },
    {
        id: "f2",
        name: "Traitements interrompus",
        trigger: "Traitement non terminé depuis 60 jours",
        state: "active",
        audience: 22,
        contacted: 18,
        replied: 9,
        booked: 5,
        nextRun: "Demain 09:00",
        steps: [
            { label: "Traitement interrompu", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Rappel du plan de traitement", kind: "message" },
            { label: "Attendre 4 jours", detail: "Sans réponse", kind: "wait" },
            { label: "Si réponse", detail: "Conversation IA puis prise de rendez-vous", kind: "condition" },
            { label: "Rendez-vous réservé", detail: "Objectif atteint", kind: "goal" },
        ],
    },
    {
        id: "f3",
        name: "Devis en attente",
        trigger: "Devis envoyé sans réponse depuis 30 jours",
        state: "scheduled",
        audience: 14,
        contacted: 0,
        replied: 0,
        booked: 0,
        nextRun: "Lundi 10:00",
        steps: [
            { label: "Devis sans réponse (30 j)", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Proposition d'appel de clarification", kind: "message" },
            { label: "Attendre 5 jours", detail: "Sans réponse", kind: "wait" },
            { label: "Escalade réception", detail: "Appel téléphonique", kind: "condition" },
        ],
    },
    {
        id: "f4",
        name: "Rappel de contrôle annuel",
        trigger: "12 mois après le dernier détartrage",
        state: "completed",
        audience: 36,
        contacted: 36,
        replied: 21,
        booked: 15,
        steps: [
            { label: "12 mois après détartrage", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Rappel de contrôle", kind: "message" },
            { label: "Rendez-vous réservé", detail: "Objectif atteint", kind: "goal" },
        ],
    },
    {
        id: "f5",
        name: "Suivi post-opératoire",
        trigger: "48 h après une intervention",
        state: "active",
        audience: 12,
        contacted: 12,
        replied: 10,
        booked: 3,
        nextRun: "Aujourd'hui 20:00",
        steps: [
            { label: "48 h après intervention", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Prise de nouvelles", kind: "message" },
            { label: "Si douleur signalée", detail: "Escalade immédiate au cabinet", kind: "condition" },
        ],
    },
    {
        id: "f6",
        name: "Confirmation J-1",
        trigger: "24 h avant le rendez-vous",
        state: "active",
        audience: 30,
        contacted: 30,
        replied: 26,
        booked: 26,
        nextRun: "En continu",
        steps: [
            { label: "24 h avant le rendez-vous", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Demande de confirmation", kind: "message" },
            { label: "Si annulation", detail: "Ouvrir le créneau à la liste d'attente", kind: "condition" },
        ],
    },
    {
        id: "f7",
        name: "Récupération des no-shows",
        trigger: "Rendez-vous manqué",
        state: "scheduled",
        audience: 9,
        contacted: 0,
        replied: 0,
        booked: 0,
        nextRun: "Vendredi 09:00",
        steps: [
            { label: "Rendez-vous manqué", detail: "Déclencheur", kind: "trigger" },
            { label: "Attendre 1 jour", detail: "Délai de courtoisie", kind: "wait" },
            { label: "Message WhatsApp", detail: "Proposition de reprogrammation", kind: "message" },
        ],
    },
    {
        id: "f8",
        name: "Réactivation 12 mois",
        trigger: "Patient inactif depuis 12 mois",
        state: "completed",
        audience: 41,
        contacted: 41,
        replied: 12,
        booked: 6,
        steps: [
            { label: "Patient inactif (12 mois)", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Offre de contrôle", kind: "message" },
            { label: "Rendez-vous réservé", detail: "Objectif atteint", kind: "goal" },
        ],
    },
    {
        id: "f9",
        name: "Plans de traitement non acceptés",
        trigger: "Plan présenté sans suite (45 jours)",
        state: "scheduled",
        audience: 17,
        contacted: 0,
        replied: 0,
        booked: 0,
        nextRun: "Mardi 14:00",
        steps: [
            { label: "Plan sans suite (45 j)", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Proposition d'échelonnement", kind: "message" },
        ],
    },
    {
        id: "f10",
        name: "Bienvenue nouveaux patients",
        trigger: "Première visite terminée",
        state: "active",
        audience: 26,
        contacted: 26,
        replied: 18,
        booked: 11,
        nextRun: "En continu",
        steps: [
            { label: "Première visite terminée", detail: "Déclencheur", kind: "trigger" },
            { label: "Message WhatsApp", detail: "Bienvenue + informations pratiques", kind: "message" },
            { label: "Attendre 6 mois", detail: "Puis rappel de contrôle", kind: "wait" },
        ],
    },
];
export const noShows = [
    { id: "n1", patientId: "p7", appointmentDate: isoDay(0), appointmentTime: "15:30", treatment: "Extraction", reason: "Non joignable", previousNoShows: 2, status: "new" },
    { id: "n2", patientId: "p20", appointmentDate: isoDay(-9), appointmentTime: "15:00", treatment: "Consultation", reason: "Oubli", previousNoShows: 2, status: "contacted" },
    { id: "n3", patientId: "p34", appointmentDate: isoDay(-4), appointmentTime: "16:00", treatment: "Couronne céramique", reason: "Empêchement professionnel", previousNoShows: 2, status: "rescheduled" },
    { id: "n4", patientId: "p46", appointmentDate: isoDay(-2), appointmentTime: "10:30", treatment: "Extraction", reason: "Non précisé", previousNoShows: 1, status: "monitoring" },
    { id: "n5", patientId: "p10", appointmentDate: isoDay(-16), appointmentTime: "09:30", treatment: "Composite", reason: "Retard puis annulation", previousNoShows: 1, status: "rescheduled" },
];
export const cancellations = appointments.filter((a) => a.status === "cancelled");
export const notificationsSeed = [
    { id: "nt1", title: "Un créneau de 16:00 vient de se libérer.", detail: "Dr. Mrabet — annulation de Amine Sfaxi", time: "il y a 4 min", kind: "slot", read: false },
    { id: "nt2", title: "3 patients correspondent à ce créneau.", detail: "Liste d'attente — remplissage possible", time: "il y a 4 min", kind: "match", read: false },
    { id: "nt3", title: "Amira Ben Salem a répondu à votre campagne.", detail: "Campagne « Patients inactifs — 6 mois »", time: "il y a 21 min", kind: "reply", read: false },
    { id: "nt4", title: "Le patient Mohamed Trabelsi demande à parler à la réception.", detail: "Conversation WhatsApp en attente", time: "il y a 38 min", kind: "human", read: false },
    { id: "nt5", title: "L'IA a transféré une conversation.", detail: "Anis Khelifi — patient mécontent", time: "il y a 1 h", kind: "ai", read: true },
    { id: "nt6", title: "7 rendez-vous récupérés ce mois-ci.", detail: "Valeur estimée : 4 850 DT", time: "il y a 3 h", kind: "reply", read: true },
];
/* -------------------------------------------------------------------------- */
/* Aggregated KPI / analytics                                                 */
/* -------------------------------------------------------------------------- */
export const recoveryFunnel = [
    { stage: "Patients identifiés", value: 84 },
    { stage: "Contactés", value: 42 },
    { stage: "Ont répondu", value: 19 },
    { stage: "Rendez-vous pris", value: 11 },
    { stage: "Venus au cabinet", value: 7 },
];
export const recoverySummary = {
    analyzed: 327,
    toRecover: 84,
    contacted: 42,
    replied: 19,
    booked: 11,
    completed: 7,
};
export const appointmentsOverTime = [
    { month: "Avr", total: 186, recovered: 4 },
    { month: "Mai", total: 201, recovered: 6 },
    { month: "Juin", total: 214, recovered: 9 },
    { month: "Juil", total: 178, recovered: 7 },
    { month: "Août", total: 152, recovered: 5 },
    { month: "Sep", total: 232, recovered: 11 },
];
export const reactivationOverTime = [
    { month: "Avr", patients: 9 },
    { month: "Mai", patients: 12 },
    { month: "Juin", patients: 17 },
    { month: "Juil", patients: 14 },
    { month: "Août", patients: 11 },
    { month: "Sep", patients: 23 },
];
export const lossBreakdown = [
    { label: "Traitements interrompus", value: 42 },
    { label: "Patients inactifs", value: 31 },
    { label: "Rendez-vous manqués", value: 17 },
    { label: "Plans non acceptés", value: 10 },
];
export const revenueTimeline = [
    { date: isoDay(-1), label: "Implant récupéré — Seif Ghodbane", amount: 1900, type: "recovered" },
    { date: isoDay(-3), label: "Créneau rempli — Détartrage", amount: 120, type: "recovered" },
    { date: isoDay(-5), label: "Traitement de canal repris — Sami Zaidi", amount: 350, type: "recovered" },
    { date: isoDay(-8), label: "Couronne récupérée — Olfa Saidi", amount: 850, type: "recovered" },
    { date: isoDay(-11), label: "Devis implant en attente — Fatma Zouari", amount: 1900, type: "potential" },
    { date: isoDay(-14), label: "Orthodontie en attente — Nesrine Louati", amount: 2400, type: "potential" },
    { date: isoDay(-17), label: "Réactivation — Blanchiment Salma Dridi", amount: 450, type: "recovered" },
    { date: isoDay(-21), label: "No-show récupéré — Nour Chebbi", amount: 150, type: "recovered" },
];
export const teamMembers = [
    { id: "t1", name: "Dr. Karim Ben Amor", role: "Propriétaire", email: "karim@cabinetbenamor.tn", initials: "KB", active: true },
    { id: "t2", name: "Dr. Leila Chaouch", role: "Dentiste", email: "leila@cabinetbenamor.tn", initials: "LC", active: true },
    { id: "t3", name: "Dr. Sofien Mrabet", role: "Dentiste", email: "sofien@cabinetbenamor.tn", initials: "SM", active: true },
    { id: "t4", name: "Sarah Gharbi", role: "Réception", email: "sarah@cabinetbenamor.tn", initials: "SG", active: true },
    { id: "t5", name: "Yosra Amri", role: "Manager", email: "yosra@cabinetbenamor.tn", initials: "YA", active: true },
    { id: "t6", name: "Hedi Louhichi", role: "Réception", email: "hedi@cabinetbenamor.tn", initials: "HL", active: false },
];
export const integrations = [
    { id: "i1", name: "WhatsApp Business", detail: "Messages patients et campagnes", status: "connected" },
    { id: "i2", name: "Google Calendar", detail: "Synchronisation de l'agenda", status: "connected" },
    { id: "i3", name: "SMS Tunisie Telecom", detail: "Rappels par SMS", status: "not_connected" },
    { id: "i4", name: "Email transactionnel", detail: "Confirmations et devis", status: "connected" },
    { id: "i5", name: "Logiciel dentaire (Julie, Logos)", detail: "Import des dossiers patients", status: "coming_soon" },
    { id: "i6", name: "Réceptionniste vocale IA", detail: "Réponse automatique aux appels", status: "coming_soon" },
];
//# sourceMappingURL=mock.js.map