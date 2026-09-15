/**
 * AI Module — Action Executor
 *
 * Validates and executes AI-proposed actions after explicit human approval.
 *
 * STRICT GUARANTEES:
 *   - confidence value from AI is NEVER used as authorization criteria
 *   - Every action verifies: tenant ownership, patient ownership, conversation link
 *   - Reuses existing business service logic — no new business rules invented
 *   - Is NEVER called from getSuggestion() or any AI generation path
 *   - Never calls MetaWhatsAppProvider.sendMessage()
 *
 * Allowed action types (based on real backend audit):
 *   - mark_recovery_contacted  → recoveryService.markContacted()
 *   - mark_recovery_responded  → recoveryService.markResponded()
 *   - dismiss_recovery         → recoveryService.dismissOpportunity()
 *   - confirm_appointment      → appointmentService.updateStatus("confirmed")
 */
export declare const ALLOWED_ACTION_TYPES: readonly ["mark_recovery_contacted", "mark_recovery_responded", "dismiss_recovery", "confirm_appointment", "book_appointment"];
export type AllowedActionType = typeof ALLOWED_ACTION_TYPES[number];
export interface AIActionRequest {
    type: string;
    targetId: string;
    booking?: {
        date: string;
        startTime: string;
        durationMin: number;
        treatment: string;
    };
}
export interface AIActionResult {
    type: AllowedActionType;
    targetId: string;
    outcome: "success" | "already_in_state";
    message: string;
}
export declare class InvalidActionTypeError extends Error {
    constructor(type: string);
}
export declare class ActionTargetNotFoundError extends Error {
    constructor();
}
export declare class ActionConversationMismatchError extends Error {
    constructor();
}
export declare class ActionTransitionError extends Error {
    constructor(message: string);
}
export declare function executeAIAction(tenantId: string, conversationId: string, action: AIActionRequest): Promise<AIActionResult>;
//# sourceMappingURL=ai.action.executor.d.ts.map