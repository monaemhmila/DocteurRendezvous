/**
 * tn-templates.ts — TOUS les messages transactionnels, écrits à la main, jamais générés par le LLM.
 *
 * Variantes : fr | en | tn-arabizi (dérija en lettres latines) | ar (dérija en écriture arabe)
 *             | ar-msa (arabe standard simple, pour patients saoudiens / non tunisiens).
 */
import type { Lang } from "./tn-nlu";

export interface TplParams {
  who?: string;
  date?: string;
  from?: string;
  to?: string;
  time?: string;
  options?: string;
  list?: string;
  clinic?: string;
  slots?: string;
}

export type Tpl = Record<string, (p: TplParams) => string>;

export const TPL: Record<Lang, Tpl> = {
  /* ───────────── dérija, lettres latines ───────────── */
  "tn-arabizi": {
    confirmReschedule: (p) => `Behy, nbaddel rendez-vous ${p.who} men ${p.from} l ${p.to} (${p.date}). Mriguel ?`,
    confirmBook: (p) => `Behy, bech nekhdhou rendez-vous ${p.who} ${p.date} m3a ${p.to}. Mriguel ?`,
    confirmCancel: (p) => `Theb tannuli el rendez-vous mta3 ${p.who} ${p.date} m3a ${p.from} ? Ken ey, 9olli "ey".`,
    doneReschedule: (p) => `Rendez-vous ${p.who} tbaddel: tawa ${p.date} m3a ${p.to}. Marhba bik.`,
    doneBook: (p) => `Rendez-vous ${p.who} m'aked: ${p.date} m3a ${p.to}. Marhba bik.`,
    doneCancel: (p) => `Behy, rendez-vous ${p.who} tannula.`,
    keep: (p) => `Behy, ma tbaddelch chay. Rendez-vous ${p.who} yab9a kima howa: ${p.date} m3a ${p.time}.`,
    nothingBooked: () => `Behy, ma 9ayyedtech rendez-vous.`,
    reask: (p) => p.options ? `Bech n'thabtou (${p.options}), theb n'kamlou ? 9olli "ey" wala "le" 3aychek.` : `Bech n'kamlou, 9olli "ey" wala "le" 3aychek.`,
    escalate: () => `Samahni, taw n3addik lel secrétariat bech y3awnouk.`,
    expired: () => `Samahni, fet lwa9t 3la el talab hedha. 9olli men jdid chnowa theb.`,
    voiceUnclear: () => `Ma fhemtch mli7 el vocal. Tnajem tektebli el nhar w el wa9t ? (mathalan: ghodwa 9h)`,
    askWhich: (p) => `3andek barcha rendez-vous: ${p.options}. Anehou fihom theb tbaddel ?`,
    askNewTime: () => `Behy. Fi anhi wa9t theb ?`,
    techError: () => `Samahni, fama mouchkla teknik. 3awed jarreb ba3d chwaya wala kellem el secrétariat.`,
    greeting: (p) => `Aslema ! Ena el assistant mta3 ${p.clinic || "cabinet"}. Kifech najem n3awnek ?`,
    greetingBack: () => `Marhba bik. Kifech najem n3awnek ?`,
    thanks: () => `Marhba bik. Ken 3andek 7aja okhra, 9olli.`,
    arrivalAck: (p) => `Behy, nchoufouk: ${p.list}. Marhba bikom.`,
    listAppointments: (p) => `Rendez-vous li 3andek: ${p.list}.`,
    noAppointments: () => `Ma 3andekch rendez-vous jey.`,
    allergiesList: (p) => `Fi dossier mta3 ${p.who}, el 7asasyeyat el msajjlin: ${p.list}. Bech t2aked, kellem el docteur.`,
    allergiesNone: (p) => `Fi dossier mta3 ${p.who} ma famech 7asasyeyat msajjla. Hedha ma ya3nich beli ma 3andouch, bech t2aked kellem el docteur.`,
    askDay: () => `Chnowa nhar li theb tji fih ?`,
    slotsOffer: (p) => `Fama blayes ${p.date}: ${p.slots}. Anhi wa9t theb ?`,
    closedDay: (p) => `El cabinet msaker ${p.date}. Theb nchouflek nhar okher ?`,
    fullDay: (p) => `Ma famech blayes ${p.date}. Theb nchouflek nhar okher ?`,
    slotTaken: (p) => `Lwa9t hedha (${p.to}) ma 3adech disponible. Theb nchouflek aw9at okhra ?`,
    pastDate: () => `Samahni, fet lwa9t. Fi anhi nhar wala wa9t okher theb ?`,
    alreadyHasAppointment: (p) => `Rendez-vous mta3 ${p.who} mawjoud deja ${p.date} m3a ${p.time}. Theb nbaddlou ?`,
    reminder: (p) => `Nfakrouk b rendez-vous mta3 ${p.who} ${p.date} m3a ${p.time} fi ${p.clinic || "cabinet"}. Bech tji ?`,
    reminderConfirmed: (p) => `Behy, rendez-vous t2akkdou: ${p.list}. Marhba bikom.`,
    unknownHelp: () => `Samahni, ma fhemtch mli7. Theb tekhou rendez-vous, tbaddel rendez-vous, wala tkellem el secrétariat ?`,
  },

  /* ───────────── français ───────────── */
  fr: {
    confirmReschedule: (p) => `Je déplace le rendez-vous de ${p.who} de ${p.from} à ${p.to} (${p.date}). Vous confirmez ?`,
    confirmBook: (p) => `Je réserve un rendez-vous pour ${p.who} ${p.date} à ${p.to}. Vous confirmez ?`,
    confirmCancel: (p) => `Souhaitez-vous annuler le rendez-vous de ${p.who} ${p.date} à ${p.from} ? Répondez « oui » pour confirmer.`,
    doneReschedule: (p) => `C'est fait : le rendez-vous de ${p.who} est maintenant ${p.date} à ${p.to}.`,
    doneBook: (p) => `Votre rendez-vous est confirmé pour ${p.who} : ${p.date} à ${p.to}.`,
    doneCancel: (p) => `Le rendez-vous de ${p.who} est annulé.`,
    keep: (p) => `Très bien, rien n'est modifié. Le rendez-vous de ${p.who} reste ${p.date} à ${p.time}.`,
    nothingBooked: () => `Très bien, aucun rendez-vous n'a été enregistré.`,
    reask: () => `Répondez « oui » ou « non » pour que je puisse continuer.`,
    escalate: () => `Je transmets votre demande au secrétariat afin qu'un membre de l'équipe vous réponde rapidement.`,
    expired: () => `Cette demande a expiré. Indiquez-moi à nouveau ce que vous souhaitez.`,
    voiceUnclear: () => `Je n'ai pas bien compris le message vocal. Pouvez-vous m'écrire le jour et l'heure souhaités (par exemple : demain 9h) ?`,
    askWhich: (p) => `Vous avez plusieurs rendez-vous : ${p.options}. Lequel souhaitez-vous modifier ?`,
    askNewTime: () => `Très bien. À quelle heure souhaitez-vous venir ?`,
    techError: () => `Désolé, un problème technique est survenu. Veuillez réessayer dans un instant ou contacter le secrétariat.`,
    greeting: (p) => `Bonjour ! Je suis l'assistant de ${p.clinic || "notre cabinet"}. Comment puis-je vous aider ?`,
    greetingBack: () => `Bonjour ! Comment puis-je vous aider ?`,
    thanks: () => `Je vous en prie. N'hésitez pas si vous avez besoin d'autre chose.`,
    arrivalAck: (p) => `Très bien, nous vous attendons : ${p.list}.`,
    listAppointments: (p) => `Vos rendez-vous : ${p.list}.`,
    noAppointments: () => `Vous n'avez aucun rendez-vous à venir.`,
    allergiesList: (p) => `Dans le dossier de ${p.who}, les allergies enregistrées sont : ${p.list}. Pour confirmation, voyez le médecin.`,
    allergiesNone: (p) => `Aucune allergie n'est enregistrée dans le dossier de ${p.who}. Cela ne signifie pas qu'il n'y en a pas : confirmez avec le médecin.`,
    askDay: () => `Quel jour souhaitez-vous venir ?`,
    slotsOffer: (p) => `Créneaux disponibles ${p.date} : ${p.slots}. Lequel vous convient ?`,
    closedDay: (p) => `Le cabinet est fermé ${p.date}. Souhaitez-vous un autre jour ?`,
    fullDay: (p) => `Il n'y a plus de créneau disponible ${p.date}. Souhaitez-vous un autre jour ?`,
    slotTaken: (p) => `Le créneau de ${p.to} n'est plus disponible. Souhaitez-vous que je vous propose d'autres horaires ?`,
    pastDate: () => `Ce créneau est déjà passé. Quel autre jour ou horaire vous conviendrait ?`,
    alreadyHasAppointment: (p) => `Un rendez-vous existe déjà pour ${p.who} ${p.date} à ${p.time}. Souhaitez-vous le déplacer ?`,
    reminder: (p) => `Rappel : rendez-vous de ${p.who} ${p.date} à ${p.time} à ${p.clinic || "notre cabinet"}. Pouvez-vous confirmer votre venue ?`,
    reminderConfirmed: (p) => `Parfait, rendez-vous confirmé : ${p.list}.`,
    unknownHelp: () => `Je n'ai pas bien compris. Souhaitez-vous prendre un rendez-vous, en modifier un, ou parler au secrétariat ?`,
  },

  /* ───────────── English ───────────── */
  en: {
    confirmReschedule: (p) => `I'll move ${p.who}'s appointment from ${p.from} to ${p.to} (${p.date}). Do you confirm?`,
    confirmBook: (p) => `I'll book an appointment for ${p.who} ${p.date} at ${p.to}. Do you confirm?`,
    confirmCancel: (p) => `Do you want to cancel ${p.who}'s appointment ${p.date} at ${p.from}? Reply "yes" to confirm.`,
    doneReschedule: (p) => `Done: ${p.who}'s appointment is now ${p.date} at ${p.to}.`,
    doneBook: (p) => `Your appointment is confirmed for ${p.who}: ${p.date} at ${p.to}.`,
    doneCancel: (p) => `${p.who}'s appointment has been cancelled.`,
    keep: (p) => `Understood, nothing has changed. ${p.who}'s appointment stays ${p.date} at ${p.time}.`,
    nothingBooked: () => `Understood, no appointment has been recorded.`,
    reask: () => `Please reply "yes" or "no" so I can continue.`,
    escalate: () => `I'm passing your request to the front desk so a team member can reply shortly.`,
    expired: () => `This request has expired. Please tell me again what you would like.`,
    voiceUnclear: () => `I couldn't understand the voice message well. Could you type the day and time you want (for example: tomorrow 9am)?`,
    askWhich: (p) => `You have several appointments: ${p.options}. Which one would you like to change?`,
    askNewTime: () => `Understood. What time would you like?`,
    techError: () => `Sorry, a technical problem occurred. Please try again shortly or contact the front desk.`,
    greeting: (p) => `Hello! I'm the assistant of ${p.clinic || "the clinic"}. How can I help you?`,
    greetingBack: () => `Hello! How can I help you?`,
    thanks: () => `You're welcome. Let me know if you need anything else.`,
    arrivalAck: (p) => `Great, we'll expect you: ${p.list}.`,
    listAppointments: (p) => `Your appointments: ${p.list}.`,
    noAppointments: () => `You have no upcoming appointments.`,
    allergiesList: (p) => `In ${p.who}'s file, the recorded allergies are: ${p.list}. Please confirm with the doctor.`,
    allergiesNone: (p) => `No allergy is recorded in ${p.who}'s file. That does not mean there is none: please confirm with the doctor.`,
    askDay: () => `Which day would you like to come?`,
    slotsOffer: (p) => `Available times ${p.date}: ${p.slots}. Which one suits you?`,
    closedDay: (p) => `The clinic is closed ${p.date}. Would you like another day?`,
    fullDay: (p) => `There is no availability ${p.date}. Would you like another day?`,
    slotTaken: (p) => `The ${p.to} slot is no longer available. Would you like me to suggest other times?`,
    pastDate: () => `That time has already passed. Which other day or time would suit you?`,
    alreadyHasAppointment: (p) => `${p.who} already has an appointment ${p.date} at ${p.time}. Would you like to move it?`,
    reminder: (p) => `Reminder: ${p.who}'s appointment ${p.date} at ${p.time} at ${p.clinic || "the clinic"}. Can you confirm you're coming?`,
    reminderConfirmed: (p) => `Perfect, appointment confirmed: ${p.list}.`,
    unknownHelp: () => `I didn't quite understand. Would you like to book an appointment, change one, or speak to the front desk?`,
  },

  /* ───────────── dérija, écriture arabe ───────────── */
  ar: {
    confirmReschedule: (p) => `باهي، نبدّل رونديفو ${p.who} من ${p.from} لـ ${p.to} (${p.date}). مريقل ؟`,
    confirmBook: (p) => `باهي، باش نأخذو رونديفو ${p.who} ${p.date} على ${p.to}. مريقل ؟`,
    confirmCancel: (p) => `تحب تلغي الرونديفو متاع ${p.who} ${p.date} على ${p.from} ؟ كان إيه، قولي "إيه".`,
    doneReschedule: (p) => `الرونديفو متاع ${p.who} تبدّل: توّا ${p.date} على ${p.to}. مرحبا بيك.`,
    doneBook: (p) => `الرونديفو متاع ${p.who} مأكّد: ${p.date} على ${p.to}. مرحبا بيك.`,
    doneCancel: (p) => `باهي، الرونديفو متاع ${p.who} تلغى.`,
    keep: (p) => `باهي، ما تبدّل شي. الرونديفو متاع ${p.who} يبقى كيما هو: ${p.date} على ${p.time}.`,
    nothingBooked: () => `باهي، ما سجّلت حتى رونديفو.`,
    reask: (p) => p.options ? `باش نثبتوا (${p.options})، قولي "إيه" ولا "لا" يعيشك.` : `باش نكمّلوا، قولي "إيه" ولا "لا" يعيشك.`,
    escalate: () => `سامحني، توّا نحوّلك للسكرتارية باش يعاونوك.`,
    expired: () => `سامحني، فات الوقت على الطلب هذا. قولي من جديد شنوّة تحب.`,
    voiceUnclear: () => `ما فهمتش مليح الفوكال. تنجم تكتبلي النهار والوقت ؟ (مثلا: غدوة 9)`,
    askWhich: (p) => `عندك برشا رونديفوات: ${p.options}. أنهو فيهم تحب تبدّل ؟`,
    askNewTime: () => `باهي. في أنهي وقت تحب ؟`,
    techError: () => `سامحني، فما مشكلة تقنية. عاود جرّب بعد شوية ولا كلّم السكرتارية.`,
    greeting: (p) => `عسلامة ! أنا المساعد متاع ${p.clinic || "الكابيني"}. كيفاش نجم نعاونك ؟`,
    greetingBack: () => `مرحبا بيك. كيفاش نجم نعاونك ؟`,
    thanks: () => `مرحبا بيك. كان عندك حاجة أخرى، قولي.`,
    arrivalAck: (p) => `باهي، مرحبا بيكم: ${p.list}.`,
    listAppointments: (p) => `الرونديفوات اللي عندك: ${p.list}.`,
    noAppointments: () => `ما عندكش رونديفو جاي.`,
    allergiesList: (p) => `في ملف ${p.who}، الحساسيات المسجّلة: ${p.list}. باش تتأكد، كلّم الطبيب.`,
    allergiesNone: (p) => `في ملف ${p.who} ما فما حتى حساسية مسجّلة. هذا ما يعنيش ما عندوش، باش تتأكد كلّم الطبيب.`,
    askDay: () => `أنهو نهار تحب تجي فيه ؟`,
    slotsOffer: (p) => `فما بلايص ${p.date}: ${p.slots}. أنهي وقت تحب ؟`,
    closedDay: (p) => `الكابيني مسكّر ${p.date}. تحب نشوفلك نهار آخر ؟`,
    fullDay: (p) => `ما فماش بلايص ${p.date}. تحب نشوفلك نهار آخر ؟`,
    slotTaken: (p) => `الوقت هذا (${p.to}) ما عادش موجود. تحب نشوفلك أوقات أخرى ؟`,
    pastDate: () => `سامحني، فات الوقت. في أنهو نهار ولا وقت آخر تحب ؟`,
    alreadyHasAppointment: (p) => `الرونديفو متاع ${p.who} موجود، ${p.date} على ${p.time}. تحب نبدّلو ؟`,
    reminder: (p) => `نفكّرك بالرونديفو متاع ${p.who} ${p.date} على ${p.time} في ${p.clinic || "الكابيني"}. باش تجي ؟`,
    reminderConfirmed: (p) => `باهي، الرونديفو مأكّد: ${p.list}. مرحبا بيكم.`,
    unknownHelp: () => `سامحني، ما فهمتش مليح. تحب تاخو رونديفو، تبدّل رونديفو، ولا تكلّم السكرتارية ؟`,
  },

  /* ───────────── arabe standard simple (patients saoudiens / non tunisiens) ───────────── */
  "ar-msa": {
    confirmReschedule: (p) => `سأنقل موعد ${p.who} من الساعة ${p.from} إلى الساعة ${p.to} (${p.date}). هل تؤكد ذلك؟`,
    confirmBook: (p) => `سأحجز موعدًا لـ ${p.who} ${p.date} في الساعة ${p.to}. هل تؤكد ذلك؟`,
    confirmCancel: (p) => `هل ترغب في إلغاء موعد ${p.who} ${p.date} في الساعة ${p.from}؟ أجب بـ «نعم» للتأكيد.`,
    doneReschedule: (p) => `تم نقل موعد ${p.who} إلى ${p.date} في الساعة ${p.to}.`,
    doneBook: (p) => `تم تأكيد موعد ${p.who}: ${p.date} في الساعة ${p.to}.`,
    doneCancel: (p) => `تم إلغاء موعد ${p.who}.`,
    keep: (p) => `حسنًا، لم يتم تغيير أي شيء. يبقى موعد ${p.who} ${p.date} في الساعة ${p.time}.`,
    nothingBooked: () => `حسنًا، لم يتم تسجيل أي موعد.`,
    reask: () => `يرجى الرد بـ «نعم» أو «لا» لأتمكن من المتابعة.`,
    escalate: () => `سأحوّل طلبك إلى السكرتارية ليتواصل معك أحد أعضاء الفريق قريبًا.`,
    expired: () => `انتهت صلاحية هذا الطلب. يرجى إخباري مجددًا بما ترغب به.`,
    voiceUnclear: () => `لم أتمكن من فهم الرسالة الصوتية جيدًا. هل يمكنك كتابة اليوم والوقت المطلوبين؟ (مثال: غدًا الساعة 9)`,
    askWhich: (p) => `لديك عدة مواعيد: ${p.options}. أي موعد ترغب في تعديله؟`,
    askNewTime: () => `حسنًا. في أي ساعة ترغب بالحضور؟`,
    techError: () => `عذرًا، حدثت مشكلة تقنية. يرجى المحاولة بعد قليل أو التواصل مع السكرتارية.`,
    greeting: (p) => `أهلاً وسهلاً! أنا مساعد ${p.clinic || "العيادة"}. كيف يمكنني مساعدتك؟`,
    greetingBack: () => `أهلاً وسهلاً! كيف يمكنني مساعدتك؟`,
    thanks: () => `عفوًا. لا تتردد في طلب أي مساعدة أخرى.`,
    arrivalAck: (p) => `حسنًا، بانتظاركم: ${p.list}.`,
    listAppointments: (p) => `مواعيدك: ${p.list}.`,
    noAppointments: () => `لا توجد لديك مواعيد قادمة.`,
    allergiesList: (p) => `في ملف ${p.who}، الحساسيات المسجّلة: ${p.list}. يرجى التأكد من الطبيب.`,
    allergiesNone: (p) => `لا توجد حساسية مسجّلة في ملف ${p.who}. هذا لا يعني عدم وجودها، يرجى التأكد من الطبيب.`,
    askDay: () => `أي يوم ترغب بالحضور؟`,
    slotsOffer: (p) => `الأوقات المتاحة ${p.date}: ${p.slots}. أي وقت يناسبك؟`,
    closedDay: (p) => `العيادة مغلقة ${p.date}. هل ترغب في يوم آخر؟`,
    fullDay: (p) => `لا توجد أوقات متاحة ${p.date}. هل ترغب في يوم آخر؟`,
    slotTaken: (p) => `الموعد في الساعة ${p.to} لم يعد متاحًا. هل ترغب في اقتراح أوقات أخرى؟`,
    pastDate: () => `هذا الوقت قد مضى. أي يوم أو وقت آخر يناسبك؟`,
    alreadyHasAppointment: (p) => `يوجد موعد مسبق لـ ${p.who} ${p.date} في الساعة ${p.time}. هل ترغب في نقله؟`,
    reminder: (p) => `تذكير: موعد ${p.who} ${p.date} في الساعة ${p.time} في ${p.clinic || "العيادة"}. هل تؤكد حضورك؟`,
    reminderConfirmed: (p) => `تم تأكيد الموعد: ${p.list}.`,
    unknownHelp: () => `لم أفهم طلبك جيدًا. هل ترغب في حجز موعد، أو تعديل موعد، أو التحدث مع السكرتارية؟`,
  },
};

export function t(lang: Lang, key: string, p: TplParams = {}): string {
  const targetLang = (lang as any) === "ar-msa" ? "ar-msa" : lang;
  const fn = TPL[targetLang]?.[key] ?? TPL["tn-arabizi"]?.[key] ?? TPL.fr[key];
  return fn ? fn(p) : "";
}
