/**
 * Unified LLM Service
 * Handles API calls to multiple LLM providers based on user configuration
 */

import { getStoredApiConfig } from '../components/ApiKeyManager';

/**
 * OpenAI API Configuration
 */
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Anthropic API Configuration
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Cohere API Configuration
 */
const COHERE_API_URL = 'https://api.cohere.ai/v1/generate';

/**
 * Mistral API Configuration
 */
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Generate text using OpenAI API
 */
export const generateOpenAI = async (
  prompt: string,
  systemPrompt: string = 'You are a helpful assistant.',
  model: string = 'gpt-4'
): Promise<string> => {
  const config = getStoredApiConfig();

  if (!config || config.provider !== 'openai' || !config.apiKey) {
    throw new Error('OpenAI API key is not configured. Please configure your API key in the settings.');
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'Could not generate content.';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate text using Anthropic Claude API
 */
export const generateAnthropic = async (
  prompt: string,
  systemPrompt: string = 'You are a helpful assistant.',
  model: string = 'claude-3-5-sonnet-20241022'
): Promise<string> => {
  const config = getStoredApiConfig();

  if (!config || config.provider !== 'anthropic' || !config.apiKey) {
    throw new Error('Anthropic API key is not configured. Please configure your API key in the settings.');
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.content[0].text || 'Could not generate content.';
  } catch (error) {
    console.error('Anthropic API Error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate text using Cohere API
 */
export const generateCohere = async (
  prompt: string,
  model: string = 'command'
): Promise<string> => {
  const config = getStoredApiConfig();

  if (!config || config.provider !== 'cohere' || !config.apiKey) {
    throw new Error('Cohere API key is not configured. Please configure your API key in the settings.');
  }

  try {
    const response = await fetch(COHERE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Cohere API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.generations[0].text || 'Could not generate content.';
  } catch (error) {
    console.error('Cohere API Error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate text using Mistral API
 */
export const generateMistral = async (
  prompt: string,
  systemPrompt: string = 'You are a helpful assistant.',
  model: string = 'mistral-large-latest'
): Promise<string> => {
  const config = getStoredApiConfig();

  if (!config || config.provider !== 'mistral' || !config.apiKey) {
    throw new Error('Mistral API key is not configured. Please configure your API key in the settings.');
  }

  try {
    const response = await fetch(MISTRAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Mistral API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'Could not generate content.';
  } catch (error) {
    console.error('Mistral API Error:', error);
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Universal text generation function that routes to the appropriate provider
 */
export const generateText = async (
  prompt: string,
  systemPrompt: string = 'You are a helpful assistant.'
): Promise<string> => {
  const config = getStoredApiConfig();

  if (!config || !config.apiKey) {
    throw new Error('No API key configured. Please configure your API key in the settings.');
  }

  switch (config.provider) {
    case 'openai':
      return generateOpenAI(prompt, systemPrompt);
    case 'anthropic':
      return generateAnthropic(prompt, systemPrompt);
    case 'cohere':
      return generateCohere(prompt);
    case 'mistral':
      return generateMistral(prompt, systemPrompt);
    default:
      throw new Error(`Provider ${config.provider} is not yet supported for text generation.`);
  }
};
