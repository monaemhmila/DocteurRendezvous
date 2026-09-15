/**
 * AI Module — Custom Errors
 * These errors are designed to produce precise HTTP responses in the controller.
 */

/**
 * Thrown when the AI provider is not configured in the environment.
 * Maps to HTTP 503.
 */
export class ProviderNotConfiguredError extends Error {
  constructor(message = "AI service not configured") {
    super(message);
    this.name = "ProviderNotConfiguredError";
  }
}

/**
 * Thrown when a conversation belongs to a different tenant.
 * Maps to HTTP 404 (we do not reveal existence to foreign tenants).
 */
export class ConversationNotFoundError extends Error {
  constructor(message = "Conversation not found") {
    super(message);
    this.name = "ConversationNotFoundError";
  }
}

/**
 * Thrown when the AI provider is reachable but returns an error or times out.
 * Maps to HTTP 503.
 */
export class ProviderUnavailableError extends Error {
  constructor(message = "AI provider unavailable") {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}
