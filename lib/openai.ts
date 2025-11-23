import OpenAI from 'openai';

// Initialize OpenAI client
export function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.warn('OpenAI API key not configured. Using fallback logic.');
    return null;
  }

  return new OpenAI({
    apiKey: apiKey,
  });
}

// Default model configuration
// Using gpt-4o for best quality, or gpt-4-turbo for cost efficiency
// Can be overridden via OPENAI_MODEL environment variable
export const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'; // Latest model with best quality
// Alternative: 'gpt-4-turbo' for cost efficiency, 'gpt-3.5-turbo' for faster/cheaper
export const MAX_TOKENS = 4000; // Increased for longer responses

// Helper function to call OpenAI with proper error handling
export async function callOpenAI(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    response_format?: { type: 'json_object' | 'text' };
  }
): Promise<string | null> {
  const client = getOpenAIClient();
  
  if (!client) {
    return null;
  }

  try {
    const requestOptions: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: options?.model || DEFAULT_MODEL,
      messages,
      max_tokens: options?.maxTokens || MAX_TOKENS,
      temperature: options?.temperature ?? 0.7,
    };

    // Add response_format if provided
    if (options?.response_format) {
      requestOptions.response_format = options.response_format;
    }

    const response = await client.chat.completions.create(requestOptions);

    return response.choices[0]?.message?.content || null;
  } catch (error: any) {
    console.error('OpenAI API error:', error.message);
    // Don't throw - return null so fallback logic can be used
    return null;
  }
}

