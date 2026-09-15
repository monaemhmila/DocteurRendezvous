/**
 * AI Module — Custom Errors
 * These errors are designed to produce precise HTTP responses in the controller.
 */
/**
 * Thrown when the AI provider is not configured in the environment.
 * Maps to HTTP 503.
 */
export declare class ProviderNotConfiguredError extends Error {
    constructor(message?: string);
}
/**
 * Thrown when a conversation belongs to a different tenant.
 * Maps to HTTP 404 (we do not reveal existence to foreign tenants).
 */
export declare class ConversationNotFoundError extends Error {
    constructor(message?: string);
}
/**
 * Thrown when the AI provider is reachable but returns an error or times out.
 * Maps to HTTP 503.
 */
export declare class ProviderUnavailableError extends Error {
    constructor(message?: string);
}
//# sourceMappingURL=ai.errors.d.ts.map