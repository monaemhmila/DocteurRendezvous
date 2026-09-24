/**
 * Phase 6.12 — Temporal Resolution, Per-Day Business Hours & Weekday Tests
 *
 * Tests A-N as specified in the P0 fix requirements.
 */

import {
  buildTemporalContext,
  getWeekdayFr,
  getWeekdayEn,
  isoDateToWeekdayIndex,
  getBusinessHoursForDate,
  formatBusinessHoursBlocks,
  formatDateFr,
  summarizeAllBusinessHours,
  DEFAULT_TIMEZONE,
  TemporalContext,
} from "../modules/ai/temporal.utils";
import { buildSystemPrompt, IAIContext } from "../modules/ai/ai.prompt";

// --- Helpers -----------------------------------------------------------------
let passed = 0;
function assert(cond: boolean, msg: string) { if (!cond) throw new Error(`ASSERT: ${msg}`); }
function testDone(label: string) { passed++; console.log(`? TEST ${label} PASSED`); }

// Per-day business hours fixture (matching a typical Tunisian clinic)
const PER_DAY_BH: Record<string, Array<{start: string, end: string}>> = {
  monday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  tuesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  wednesday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  thursday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  friday: [{ start: "08:30", end: "12:30" }, { start: "14:00", end: "18:30" }],
  saturday: [{ start: "08:30", end: "12:30" }],
  sunday: [],
};

// Flat business hours fixture
const FLAT_BH = { start: "09:00", end: "18:00" };

console.log("?? Starting Phase 6.12 — Temporal Resolution & Per-Day Business Hours Tests...\n");

// -- TEST A — "aujourd'hui" ? currentDate --
try {
  // Use a fixed moment: 2026-09-19 15:00 Africa/Tunis (UTC+1)
  const fixedDate = new Date("2026-09-19T14:00:00Z"); // 15:00 in Africa/Tunis
  const ctx = buildTemporalContext("Africa/Tunis", fixedDate);
  assert(ctx.currentDate === "2026-09-19", `A: expected 2026-09-19, got ${ctx.currentDate}`);
  testDone("A");
} catch (e) { console.error("? TEST A FAILED:", (e as any).message); throw e; }

// -- TEST B — "demain" ? currentDate + 1 --
try {
  const fixedDate = new Date("2026-09-19T14:00:00Z");
  const ctx = buildTemporalContext("Africa/Tunis", fixedDate);
  assert(ctx.tomorrow === "2026-09-20", `B: expected 2026-09-20, got ${ctx.tomorrow}`);
  // CRITICAL: demain must NEVER be 2026-09-21
  assert(ctx.tomorrow !== "2026-09-21", "B: demain must NOT be 2026-09-21");
  testDone("B");
} catch (e) { console.error("? TEST B FAILED:", (e as any).message); throw e; }

// -- TEST C — "après-demain" ? currentDate + 2 --
try {
  const fixedDate = new Date("2026-09-19T14:00:00Z");
  const ctx = buildTemporalContext("Africa/Tunis", fixedDate);
  assert(ctx.dayAfterTomorrow === "2026-09-21", `C: expected 2026-09-21, got ${ctx.dayAfterTomorrow}`);
  testDone("C");
} catch (e) { console.error("? TEST C FAILED:", (e as any).message); throw e; }

// -- TEST D — 2026-09-19 ? Saturday --
try {
  assert(getWeekdayEn("2026-09-19") === "saturday", `D: expected saturday, got ${getWeekdayEn("2026-09-19")}`);
  assert(getWeekdayFr("2026-09-19") === "samedi", `D: expected samedi, got ${getWeekdayFr("2026-09-19")}`);
  testDone("D");
} catch (e) { console.error("? TEST D FAILED:", (e as any).message); throw e; }

// -- TEST E — 2026-09-20 ? Sunday --
try {
  assert(getWeekdayEn("2026-09-20") === "sunday", `E: expected sunday, got ${getWeekdayEn("2026-09-20")}`);
  assert(getWeekdayFr("2026-09-20") === "dimanche", `E: expected dimanche, got ${getWeekdayFr("2026-09-20")}`);
  testDone("E");
} catch (e) { console.error("? TEST E FAILED:", (e as any).message); throw e; }

// -- TEST F — 2026-09-21 ? Monday --
try {
  assert(getWeekdayEn("2026-09-21") === "monday", `F: expected monday, got ${getWeekdayEn("2026-09-21")}`);
  assert(getWeekdayFr("2026-09-21") === "lundi", `F: expected lundi, got ${getWeekdayFr("2026-09-21")}`);
  testDone("F");
} catch (e) { console.error("? TEST F FAILED:", (e as any).message); throw e; }

// -- TEST G — Saturday schedule ? Friday schedule --
try {
  const satBH = getBusinessHoursForDate("2026-09-19", PER_DAY_BH); // Saturday
  const friBH = getBusinessHoursForDate("2026-09-18", PER_DAY_BH); // Friday
  assert(!satBH.isClosed, "G: Saturday should be open");
  assert(!friBH.isClosed, "G: Friday should be open");
  assert(satBH.blocks.length !== friBH.blocks.length, `G: Saturday blocks (${satBH.blocks.length}) must differ from Friday blocks (${friBH.blocks.length})`);
  // Saturday has 1 block, Friday has 2 blocks
  assert(satBH.blocks.length === 1, `G: Saturday should have 1 block, got ${satBH.blocks.length}`);
  assert(friBH.blocks.length === 2, `G: Friday should have 2 blocks, got ${friBH.blocks.length}`);
  testDone("G");
} catch (e) { console.error("? TEST G FAILED:", (e as any).message); throw e; }

// -- TEST H — Sunday closed ? no availability --
try {
  const sunBH = getBusinessHoursForDate("2026-09-20", PER_DAY_BH); // Sunday
  assert(sunBH.isClosed === true, `H: Sunday must be closed, got isClosed=${sunBH.isClosed}`);
  assert(sunBH.blocks.length === 0, `H: Sunday must have 0 blocks, got ${sunBH.blocks.length}`);
  assert(formatBusinessHoursBlocks(sunBH) === "FERMÉ", "H: Sunday display must be FERMÉ");
  testDone("H");
} catch (e) { console.error("? TEST H FAILED:", (e as any).message); throw e; }

// -- TEST I — "demain" when tomorrow closed ? inform, don't auto-skip --
try {
  // Context: 2026-09-19 (Saturday), tomorrow = Sunday (closed)
  const fixedDate = new Date("2026-09-19T14:00:00Z");
  const ctx = buildTemporalContext("Africa/Tunis", fixedDate);
  assert(ctx.tomorrow === "2026-09-20", "I: tomorrow is 2026-09-20");
  const tomorrowBH = getBusinessHoursForDate(ctx.tomorrow, PER_DAY_BH);
  assert(tomorrowBH.isClosed === true, "I: tomorrow (Sunday) must be closed");
  
  // Verify the prompt contains correct info
  const promptCtx: IAIContext = {
    temporalContext: ctx,
    relevantDaysHours: [
      `samedi 19 septembre 2026 (aujourd'hui): 08:30-12:30`,
      `dimanche 20 septembre 2026 (demain): FERMÉ`,
      `lundi 21 septembre 2026 (après-demain): 08:30-12:30, 14:00-18:30`,
    ].join("\n"),
  };
  const prompt = buildSystemPrompt(promptCtx);
  
  // The prompt must contain the correct temporal reference
  assert(prompt.includes("2026-09-20 (dimanche)"), "I: prompt must include tomorrow = 2026-09-20 (dimanche)");
  // The prompt must NOT say tomorrow is 2026-09-21
  assert(!prompt.includes("\"demain\" = 2026-09-21"), "I: prompt must NOT map demain to 2026-09-21");
  // The prompt must tell the AI not to auto-skip
  assert(prompt.includes("DO NOT automatically show slots for the next open day"), "I: prompt must include no-auto-skip rule");
  testDone("I");
} catch (e) { console.error("? TEST I FAILED:", (e as any).message); throw e; }

// -- TEST J — "demain" ? NEVER resolves to J+2 --
try {
  // Test multiple dates to ensure demain is always exactly +1
  const dates = [
    { utc: "2026-09-19T14:00:00Z", expectedTomorrow: "2026-09-20" },
    { utc: "2026-09-20T14:00:00Z", expectedTomorrow: "2026-09-21" },
    { utc: "2026-12-31T14:00:00Z", expectedTomorrow: "2027-01-01" }, // year boundary
    { utc: "2026-02-28T14:00:00Z", expectedTomorrow: "2026-03-01" }, // month boundary
  ];
  for (const { utc, expectedTomorrow } of dates) {
    const ctx = buildTemporalContext("Africa/Tunis", new Date(utc));
    assert(ctx.tomorrow === expectedTomorrow, `J: for ${utc}, expected tomorrow=${expectedTomorrow}, got ${ctx.tomorrow}`);
  }
  testDone("J");
} catch (e) { console.error("? TEST J FAILED:", (e as any).message); throw e; }

// -- TEST K — "samedi 20 septembre" when 20/09 = Sunday ? contradiction detected --
try {
  // 20/09/2026 is a Sunday, not a Saturday
  const actualWeekday = getWeekdayFr("2026-09-20");
  assert(actualWeekday === "dimanche", `K: 2026-09-20 is ${actualWeekday}, expected dimanche`);
  assert(actualWeekday !== "samedi", "K: 2026-09-20 is NOT samedi — contradiction must be detectable");
  
  // Verify the prompt contains the contradiction rule
  const ctx = buildTemporalContext("Africa/Tunis", new Date("2026-09-19T14:00:00Z"));
  const prompt = buildSystemPrompt({ temporalContext: ctx });
  assert(prompt.includes("CONTRADICTION"), "K: prompt must contain DATE-WEEKDAY CONTRADICTION RULE");
  testDone("K");
} catch (e) { console.error("? TEST K FAILED:", (e as any).message); throw e; }

// -- TEST L — Saturday hours = ONLY Saturday config --
try {
  const satBH = getBusinessHoursForDate("2026-09-19", PER_DAY_BH);
  assert(satBH.weekdayEn === "saturday", "L: weekdayEn must be saturday");
  assert(satBH.blocks.length === 1, `L: Saturday must have exactly 1 block, got ${satBH.blocks.length}`);
  assert(satBH.blocks[0].start === "08:30", `L: Saturday start must be 08:30, got ${satBH.blocks[0].start}`);
  assert(satBH.blocks[0].end === "12:30", `L: Saturday end must be 12:30, got ${satBH.blocks[0].end}`);
  
  // Ensure Monday hours are NOT leaked into Saturday
  const monBH = getBusinessHoursForDate("2026-09-21", PER_DAY_BH);
  assert(monBH.blocks.length === 2, "L: Monday has 2 blocks");
  assert(satBH.blocks.length !== monBH.blocks.length, "L: Saturday blocks count differs from Monday");
  testDone("L");
} catch (e) { console.error("? TEST L FAILED:", (e as any).message); throw e; }

// -- TEST M — Existing appointment + "demain" ? no mutation (prompt-level) --
try {
  const ctx = buildTemporalContext("Africa/Tunis", new Date("2026-09-19T14:00:00Z"));
  const prompt = buildSystemPrompt({
    temporalContext: ctx,
    appointment: {
      id: "appt123",
      date: "2026-09-21",
      startTime: "09:00",
      endTime: "09:30",
      treatment: "Consultation",
      status: "confirmed",
    },
  });
  
  // The prompt must contain appointment protection rules
  assert(prompt.includes("NO IMPLICIT MUTATION"), "M: prompt must contain RULE A — NO IMPLICIT MUTATION");
  assert(prompt.includes("NO AUTO-BOOKING WHEN APPOINTMENT EXISTS"), "M: prompt must contain RULE H");
  // The temporal reference must be correct
  assert(prompt.includes(`"demain"`), "M: prompt must mention demain");
  assert(prompt.includes(ctx.tomorrow), "M: prompt must contain correct tomorrow date");
  testDone("M");
} catch (e) { console.error("? TEST M FAILED:", (e as any).message); throw e; }

// -- TEST N — Date system changes ? relative dates recalculated --
try {
  // Simulate two different "now" values
  const now1 = new Date("2026-09-19T14:00:00Z"); // Saturday
  const now2 = new Date("2026-09-20T14:00:00Z"); // Sunday (next day)
  
  const ctx1 = buildTemporalContext("Africa/Tunis", now1);
  const ctx2 = buildTemporalContext("Africa/Tunis", now2);
  
  assert(ctx1.currentDate === "2026-09-19", "N: ctx1.currentDate = 2026-09-19");
  assert(ctx1.tomorrow === "2026-09-20", "N: ctx1.tomorrow = 2026-09-20");
  
  assert(ctx2.currentDate === "2026-09-20", "N: ctx2.currentDate = 2026-09-20");
  assert(ctx2.tomorrow === "2026-09-21", "N: ctx2.tomorrow = 2026-09-21");
  
  // CRITICAL: the same relative word "demain" must resolve to different dates
  assert(ctx1.tomorrow !== ctx2.tomorrow, "N: tomorrow must change when currentDate changes");
  testDone("N");
} catch (e) { console.error("? TEST N FAILED:", (e as any).message); throw e; }

// -- TEST O (BONUS) — Timezone-awareness: server UTC vs tenant Africa/Tunis --
try {
  // Scenario: It's 23:30 UTC on Sep 19. In Africa/Tunis (UTC+1) it's 00:30 Sep 20.
  const lateUtc = new Date("2026-09-19T23:30:00Z");
  
  const ctxUtc = buildTemporalContext("UTC", lateUtc);
  const ctxTunis = buildTemporalContext("Africa/Tunis", lateUtc);
  
  // UTC says it's still Sep 19
  assert(ctxUtc.currentDate === "2026-09-19", `O: UTC currentDate = 2026-09-19, got ${ctxUtc.currentDate}`);
  assert(ctxUtc.tomorrow === "2026-09-20", `O: UTC tomorrow = 2026-09-20, got ${ctxUtc.tomorrow}`);
  
  // Africa/Tunis says it's already Sep 20
  assert(ctxTunis.currentDate === "2026-09-20", `O: Tunis currentDate = 2026-09-20, got ${ctxTunis.currentDate}`);
  assert(ctxTunis.tomorrow === "2026-09-21", `O: Tunis tomorrow = 2026-09-21, got ${ctxTunis.tomorrow}`);
  
  // CRITICAL: relative dates differ based on timezone
  assert(ctxUtc.currentDate !== ctxTunis.currentDate, "O: UTC and Tunis must disagree on currentDate at 23:30 UTC");
  assert(ctxUtc.tomorrow !== ctxTunis.tomorrow, "O: UTC and Tunis must disagree on tomorrow at 23:30 UTC");
  testDone("O");
} catch (e) { console.error("? TEST O FAILED:", (e as any).message); throw e; }

// -- TEST P (BONUS) — Flat business hours: Sunday closed by default --
try {
  const sunFlat = getBusinessHoursForDate("2026-09-20", FLAT_BH);
  assert(sunFlat.isClosed === true, `P: flat BH Sunday must be closed, got isClosed=${sunFlat.isClosed}`);
  
  const monFlat = getBusinessHoursForDate("2026-09-21", FLAT_BH);
  assert(monFlat.isClosed === false, "P: flat BH Monday must be open");
  assert(monFlat.blocks[0].start === "09:00", `P: flat BH Monday start = 09:00, got ${monFlat.blocks[0].start}`);
  testDone("P");
} catch (e) { console.error("? TEST P FAILED:", (e as any).message); throw e; }

// -- TEST Q (BONUS) — formatDateFr produces correct French date --
try {
  const formatted = formatDateFr("2026-09-19");
  assert(formatted === "samedi 19 septembre 2026", `Q: expected "samedi 19 septembre 2026", got "${formatted}"`);
  
  const formatted2 = formatDateFr("2026-09-20");
  assert(formatted2 === "dimanche 20 septembre 2026", `Q: expected "dimanche 20 septembre 2026", got "${formatted2}"`);
  testDone("Q");
} catch (e) { console.error("? TEST Q FAILED:", (e as any).message); throw e; }

// -- TEST R (BONUS) — Prompt contains pre-computed dates, NOT "calculate" --
try {
  const ctx = buildTemporalContext("Africa/Tunis", new Date("2026-09-19T14:00:00Z"));
  const prompt = buildSystemPrompt({ temporalContext: ctx });
  
  // Must NOT contain instructions to calculate dates
  assert(!prompt.includes("calculate the exact ISO date"), "R: prompt must NOT tell LLM to calculate dates");
  assert(!prompt.includes("calculate the date"), "R: prompt must NOT tell LLM to calculate dates (variant)");
  
  // Must contain pre-computed mapping
  assert(prompt.includes(`"aujourd'hui" / "ajrd" / "auj" / "today" = ${ctx.currentDate}`), "R: prompt must map aujourd'hui");
  assert(prompt.includes(`"demain" / "dmain" / "2main" / "dem1" = ${ctx.tomorrow}`), "R: prompt must map demain");
  assert(prompt.includes(`"après-demain" = ${ctx.dayAfterTomorrow}`), "R: prompt must map après-demain");
  testDone("R");
} catch (e) { console.error("? TEST R FAILED:", (e as any).message); throw e; }

console.log(`\n${"-".repeat(55)}`);
console.log(`?? ALL PHASE 6.12 TESTS PASSED — ${passed} tests`);
console.log(`${"-".repeat(55)}\n`);
