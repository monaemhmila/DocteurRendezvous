/**
 * AI Module — OpenAI-Compatible Provider
 *
 * Implements IAIProvider using the OpenAI Chat Completions API format.
 * This format is the de-facto standard supported by many providers:
 * OpenAI, Groq, Together AI, Mistral, Azure OpenAI, Ollama, vLLM, etc.
 *
 * Configuration comes exclusively from environment variables:
 *   AI_PROVIDER_URL  — Base URL of the provider API (e.g. https://api.openai.com/v1)
 *   AI_API_KEY       — API key for the provider
 *   AI_MODEL         — Model identifier (e.g. gpt-4o-mini, mistral-7b, etc.)
 *
 * SECURITY:
 *   - The API key is NEVER logged, included in error messages, or returned to the client.
 *   - If any variable is missing or empty, the provider throws ProviderNotConfiguredError
 *     immediately, without making any network request.
 */
import { IAIProvider, IChatMessage } from "./ai.provider.interface";
export declare class OpenAICompatibleProvider implements IAIProvider {
    generateCompletion(messages: IChatMessage[]): Promise<string>;
    /**
     * Built-in Intelligent Dental Assistant engine for local demo & sandbox testing.
     * Parses natural language patient queries, extracts requested dates & slots,
     * and formats structured JSON responses conforming to the system prompt schema.
     */
    private generateSmartLocalCompletion;
}
//# sourceMappingURL=openai-compatible.provider.d.ts.map