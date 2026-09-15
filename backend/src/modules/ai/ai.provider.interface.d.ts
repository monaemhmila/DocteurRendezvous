/**
 * AI Module — Provider Interface
 *
 * All AI providers must implement this interface.
 * The implementation is interchangeable: OpenAI, Anthropic, Mistral, Ollama, etc.
 * Any provider that supports the OpenAI Chat Completions format can be used.
 */
export interface IChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface IAIProvider {
    /**
     * Generate a completion from the AI provider.
     * @param messages - The conversation history, including the system prompt as the first message.
     * @returns The generated text suggestion.
     * @throws {ProviderNotConfiguredError} if the provider is not configured.
     * @throws {ProviderUnavailableError} if the provider is unreachable or returns an error.
     */
    generateCompletion(messages: IChatMessage[]): Promise<string>;
}
//# sourceMappingURL=ai.provider.interface.d.ts.map