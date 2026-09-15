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
import { ProviderNotConfiguredError, ProviderUnavailableError } from "./ai.errors";

const TIMEOUT_MS = 15_000;

export class OpenAICompatibleProvider implements IAIProvider {
  async generateCompletion(messages: IChatMessage[]): Promise<string> {
    const providerUrl = process.env.AI_PROVIDER_URL?.trim();
    const apiKey = process.env.AI_API_KEY?.trim();
    const model = process.env.AI_MODEL?.trim();

    // Guard: refuse to proceed if any config is missing
    if (!providerUrl || !apiKey || !model) {
      throw new ProviderNotConfiguredError();
    }

    const endpoint = `${providerUrl}/chat/completions`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Key is used in the header but NEVER stored in any response or log
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        // Log status code only — never log body which may contain sensitive info
        console.error(`[AI] Provider returned HTTP ${response.status}`);
        throw new ProviderUnavailableError(`AI provider returned HTTP ${response.status}`);
      }

      const data = await response.json() as any;
      const suggestion: string | undefined = data?.choices?.[0]?.message?.content;

      if (!suggestion) {
        throw new ProviderUnavailableError("AI provider returned an empty response");
      }

      return suggestion;
    } catch (err: any) {
      if (err instanceof ProviderNotConfiguredError || err instanceof ProviderUnavailableError) {
        throw err;
      }
      if (err.name === "AbortError") {
        throw new ProviderUnavailableError("AI provider timed out");
      }
      // Any other network/fetch error
      throw new ProviderUnavailableError("AI provider connection failed");
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
