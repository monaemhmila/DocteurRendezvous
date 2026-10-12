import assert from "assert";
import {
  parseYesNo,
  extractTimes,
  pickWantedTime,
  detectMessageLang,
  computeLanguageLock,
  validateReplyLanguage,
  assessTranscript,
  formatDate,
  formatTime,
  resolvePending,
  confirmationText,
  t,
  TPL,
  PendingAction,
  Lang,
  MAX_REASKS,
} from "../modules/ai/tn-nlu";
import { runExclusive, createDebouncer } from "../modules/ai/conversation-queue";

const TODAY = "2026-10-11"; // dimanche soir ; "ghodwa" = lundi 12 octobre
const NOW = 1_000_000;

const pending = (over: Partial<PendingAction> = {}): PendingAction => ({
  kind: "reschedule",
  appointmentId: "a1",
  who: "Jasser",
  date: "2026-10-12",
  fromTime: "09:00",
  toTime: "08:30",
  asks: 0,
  expiresAt: NOW + 60_000,
  ...over,
});

const ctx = (lang: Lang = "tn-arabizi") => ({ lang, todayIso: TODAY, now: NOW });

async function run() {
  console.log("🧪 Testing TN-NLU & Conversation Queue...");

  // 1. parseYesNo
  const yesNoCases: [string, string][] = [
    ["Le", "no"],
    ["Le le", "no"],
    ["Lee", "no"],
    ["No", "no"],
    ["Non", "no"],
    ["Le le le", "no"],
    ["Lee el 9 ena ghodwa menhebech nbadel", "no"],
    ["Ey confirmi", "yes"],
    ["Ey", "yes"],
    ["oui", "yes"],
    ["mriguel", "yes"],
    ["ok merci", "yes"],
    ["نعم", "yes"],
    ["Efhem", "ambiguous"],
    ["Fakarni behi f rendezvous li 3andi ena w yahya", "ambiguous"],
    ["ey mouch lyoum", "ambiguous"],
    ["oui mais plutôt mercredi", "ambiguous"],
    ["Rendezvous mte3i khalih el 9", "ambiguous"],
    ["mouch behi", "no"],
  ];
  for (const [text, expected] of yesNoCases) {
    const res = parseYesNo(text);
    assert.strictEqual(res, expected, `parseYesNo("${text}") expected ${expected}, got ${res}`);
  }
  console.log("✅ parseYesNo passed (19/19 cases)");

  // 2. extractTimes
  const timeCases: [string, string][] = [
    ["tessa3", "09:00"],
    ["taz3a", "09:00"],
    ["tessa3 w nos", "09:30"],
    ["taz3a w nsf", "09:30"],
    ["badltou 8.5", "08:30"],
    ["El 8 w nos", "08:30"],
    ["Ena ken el 9", "09:00"],
    ["l 9", "09:00"],
    ["9h", "09:00"],
    ["9h30", "09:30"],
    ["9:30", "09:30"],
    ["à 14h", "14:00"],
    ["10 heures", "10:00"],
    ["ghodwa tessa3 mta3 sbeh", "09:00"],
    ["thmenya w nos", "08:30"],
    ["3achra ella roub3", "09:45"],
    ["5 l3chiya", "17:00"],
    ["9", "09:00"],
    ["Nheb el 9", "09:00"],
  ];
  for (const [text, expected] of timeCases) {
    const match = pickWantedTime(text);
    assert.strictEqual(match?.hhmm, expected, `pickWantedTime("${text}") expected ${expected}, got ${match?.hhmm}`);
  }

  // Negated time
  const allNeg = extractTimes("Nheb 9 mech 8 w nos");
  assert.strictEqual(allNeg.length, 2);
  assert.strictEqual(allNeg[0].hhmm, "09:00");
  assert.strictEqual(allNeg[0].negated, false);
  assert.strictEqual(allNeg[1].hhmm, "08:30");
  assert.strictEqual(allNeg[1].negated, true);
  assert.strictEqual(pickWantedTime("Nheb 9 mech 8 w nos")?.hhmm, "09:00");

  // Two times in one message
  const twoTimes = extractTimes("ana tessa3 w el-yahya weldi tessa3 w nos").map((x) => x.hhmm);
  assert.deepStrictEqual(twoTimes, ["09:00", "09:30"]);

  // No false positives
  assert.strictEqual(pickWantedTime("3andi zouj rendez-vous wa7ed"), null);
  assert.strictEqual(pickWantedTime("nheb nji nhar el arb3a"), null);
  assert.strictEqual(pickWantedTime("l 12 octobre"), null);
  assert.strictEqual(pickWantedTime("3andi 2 rendez-vous"), null);
  assert.strictEqual(pickWantedTime("9olli"), null);
  console.log("✅ extractTimes & pickWantedTime passed");

  // 3. formatDate / formatTime
  assert.strictEqual(formatDate("2026-10-12", "tn-arabizi", TODAY), "ghodwa (el tnin 12 octobre)");
  assert.strictEqual(formatDate("2026-10-16", "tn-arabizi", TODAY), "nhar el jem3a 16 octobre");
  assert.strictEqual(formatDate("2026-10-12", "fr", TODAY), "demain (lundi 12 octobre)");
  assert.strictEqual(formatTime("09:00"), "9h");
  assert.strictEqual(formatTime("09:30"), "9h30");
  console.log("✅ formatDate & formatTime passed");

  // 4. Langue
  assert.strictEqual(detectMessageLang("Fakarni f rendezvous mte3i w mta3 yahya weldi"), "tn-arabizi");
  assert.strictEqual(detectMessageLang("Lee el 9 ena ghodwa menhebech nbadel"), "tn-arabizi");
  assert.strictEqual(detectMessageLang("Bonjour je voudrais un rendez-vous demain"), "fr");
  assert.strictEqual(detectMessageLang("Hello I want an appointment tomorrow please"), "en");
  assert.strictEqual(detectMessageLang("نحب نبدل الرونديفو"), "ar");
  assert.strictEqual(detectMessageLang("ok"), null);

  const typed = ["Aslema", "Nheb nbaddel rendez-vous mte3i", "Ey confirmi", "Hamdoullah alik habaltni maak"];
  const lock = computeLanguageLock(undefined, typed, "fr");
  assert.strictEqual(lock, "tn-arabizi");
  assert.strictEqual(computeLanguageLock(lock, [...typed, "يرحم ولدي آيات، سبحان الخير"], "fr"), "tn-arabizi");

  const switchLock = computeLanguageLock(
    "tn-arabizi",
    ["Bonjour je voudrais un rendez-vous", "Pouvez-vous me donner vos horaires pour demain ?"],
    "fr"
  );
  assert.strictEqual(switchLock, "fr");

  assert.strictEqual(validateReplyLanguage("Nعتذر، يبدو أن هناك مشكلة. حاول مرة أخرى من فضلك.", "tn-arabizi").ok, false);
  assert.strictEqual(validateReplyLanguage("Maandich mouchkil, si tu as besoin d'autre chose, n'hésite pas à demander.", "tn-arabizi").ok, false);
  assert(validateReplyLanguage("أهلاً وسهلاً!", "tn-arabizi").problems.includes("arabic_script_in_arabizi"));
  assert(validateReplyLanguage("Si tu as besoin, n'hésite pas.", "fr").problems.includes("tutoiement"));
  assert.strictEqual(validateReplyLanguage("Behy, ma tbaddelch chay. Rendez-vous Jasser yab9a kima howa.", "tn-arabizi").ok, true);

  for (const lang of ["tn-arabizi", "fr", "ar"] as Lang[]) {
    const params = {
      who: lang === "ar" ? "جاسر" : "Jasser",
      date: formatDate("2026-10-12", lang, TODAY),
      from: "9h",
      to: "9h30",
      time: "9h",
      options: lang === "ar" ? "9h (جاسر)، 9h30 (يحيى)" : "9h (Jasser), 9h30 (Yahya)",
    };
    for (const key of Object.keys(TPL[lang])) {
      const rendered = t(lang, key, params);
      const check = validateReplyLanguage(rendered, lang);
      assert.deepStrictEqual(check.problems, [], `Template ${lang}.${key} failed language validation: ${check.problems.join(", ")}`);
    }
  }
  console.log("✅ Language lock and template validation passed");

  // 5. assessTranscript
  assert.strictEqual(assessTranscript("Leh, leh el marid? Innah homesh mabdilou khalli nafs el waqt.").suspect, true);
  assert.strictEqual(
    assessTranscript("Aslema doctour, nheb nbaddel rendez-vous mte3i", {
      language: "arabic",
      minAvgLogprob: -0.3,
    }).suspect,
    false
  );
  assert(assessTranscript("Aslema doctour nheb rendez-vous", { language: "persian" }).reasons.includes("language_unexpected"));
  console.log("✅ assessTranscript passed");

  // 6. resolvePending
  for (const msg of ["Le", "Le le", "No", "Non"]) {
    const r = resolvePending(pending(), msg, ctx());
    assert.strictEqual(r.type, "keep");
    if (r.type === "keep") {
      assert(r.reply.includes("9h"));
      assert(!r.reply.match(/2026-10-12/));
      assert(validateReplyLanguage(r.reply, "tn-arabizi").ok);
    }
  }

  assert.strictEqual(resolvePending(pending(), "Lee el 9 ena ghodwa menhebech nbadel", ctx()).type, "keep");
  assert.strictEqual(resolvePending(pending(), "Rendezvous mte3i khalih el 9", ctx()).type, "keep");
  assert.strictEqual(resolvePending(pending(), "Nheb 9 mech 8 w nos", ctx()).type, "keep");

  const reaskRes = resolvePending(pending(), "Fakarni behi f rendezvous li 3andi ena w yahya", ctx());
  assert.strictEqual(reaskRes.type, "reask");

  const pExec = pending({ toTime: "10:30" });
  assert.deepStrictEqual(resolvePending(pExec, "Ey confirmi", ctx()), { type: "execute", action: pExec });

  const counterRes = resolvePending(pending(), "10 w nos", ctx());
  assert.strictEqual(counterRes.type, "counter");
  if (counterRes.type === "counter") {
    assert.strictEqual(counterRes.action.toTime, "10:30");
    assert(counterRes.reply.includes("10h30"));
  }

  // Escalation after max reasks
  let pLoop = pending();
  const loopTypes: string[] = [];
  for (let i = 0; i < MAX_REASKS + 1; i++) {
    const r = resolvePending(pLoop, "Efhem", ctx());
    loopTypes.push(r.type);
    if (r.type === "reask") pLoop = r.action;
  }
  assert.deepStrictEqual(loopTypes, ["reask", "reask", "escalate"]);

  // Expired
  assert.strictEqual(resolvePending(pending({ expiresAt: NOW - 1 }), "ey", ctx()).type, "expired");

  // Cancel
  const pCancel = pending({ kind: "cancel", toTime: undefined });
  assert.strictEqual(resolvePending(pCancel, "le", ctx()).type, "keep");
  assert.strictEqual(resolvePending(pCancel, "ey", ctx()).type, "execute");

  assert.strictEqual(
    confirmationText(pending(), "tn-arabizi", TODAY),
    "Behy, nbaddel rendez-vous Jasser men 9h l 8h30 (ghodwa (el tnin 12 octobre)). Mriguel ?"
  );
  console.log("✅ resolvePending state machine passed");

  // 7. Conversation Queue
  const log: string[] = [];
  const job = (name: string, ms: number) => async () => {
    log.push(`start ${name}`);
    await new Promise((r) => setTimeout(r, ms));
    log.push(`end ${name}`);
  };
  await Promise.all([
    runExclusive("c1", job("A", 40)),
    runExclusive("c1", job("B", 5)),
    runExclusive("c2", job("C", 5)),
  ]);
  assert(log.indexOf("end A") < log.indexOf("start B"));

  const batches: string[][] = [];
  const push = createDebouncer(60, 300);
  const flush = async (items: string[]) => {
    batches.push(items);
  };
  for (const m of ["m1", "m2", "m3", "m4"]) {
    push("conv", m, flush);
    await new Promise((r) => setTimeout(r, 10));
  }
  await new Promise((r) => setTimeout(r, 150));
  assert.deepStrictEqual(batches, [["m1", "m2", "m3", "m4"]]);
  console.log("✅ conversation-queue passed");

  console.log("\n🎉 ALL TN-NLU AND CONVERSATION-QUEUE TESTS PASSED SUCCESSFULLY!");
}

run().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
