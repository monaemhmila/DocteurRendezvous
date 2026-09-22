/**
 * Phase 6.10 — Full AI Conversation Tests
 *
 * Verified scenarios (minimum required by the phase spec):
 *
 * CONVERSATION
 *   1. multi-turn conversation (real MongoDB history)
 *   2. history correctly loaded (chronological, respecting limits)
 *   3. inbound/outbound correctly distinguished (user/assistant roles)
 *   4. context conserved between messages (two separate AI passes)
 *   5. patient context correctly associated
 *
 * INTENT
 *   6. general_question → natural reply auto-sent
 *   7. appointment request → clarification flow
 *   8. availability request → REAL slots persisted (pendingBookingContext)
 *   9. confirmation → secure booking engine
 *  10. human request → human escalation (needsHuman, no action)
 *  11. unsupported request → escalation, no backend action
 *
 * SCHEDULING
 *  12. missing date → clarification
 *  13. missing duration → clarification
 *  14. real availability (slots from real business hours)
 *  15. no availability → correct response, nothing invented
 *  16. pendingBookingContext preserved across messages
 *  17. confirmation → 6.8/6.9 engine + idempotent reuse
 *  18. no booking without explicit confirmation (unproposed slot refused)
 *
 * SAFETY
 *  19. medical request → human escalation
 *  20. no price hallucination (context & outbound text)
 *  21. no availability hallucination (no doctor/hours → booking refused)
 *  22. no treatment invention (empty treatment refused)
 *  23. no false success (Double_Booking_Error → no WhatsApp)
 *
 * SECURITY
 *  24. tenant isolation
 *  25. patient isolation
 *  26. credentials never exposed to the model
 *  27. basic prompt injection (role-locked, no credential leak)
 *  28. the model cannot trigger another tenant/patient or a non-booking action
 *
 * RESILIENCE
 *  29. duplicate inbound webhook → single message + single reply
 *  30. retry (WhatsApp failure → failed, then sent, no duplicates)
 *  31. AI reply never duplicated outbound
 *  32. regression 6.9 (concurrent double-booking race still blocked)
 *
 *  33. unstructured (non-JSON) AI output is NEVER auto-sent to a patient
 */
export {};
//# sourceMappingURL=phase6.10.test.d.ts.map