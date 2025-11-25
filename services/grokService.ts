/**
 * Grok AI Service (xAI API)
 * Used specifically for SloganStudio.tsx
 */

const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY;
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';

export interface SloganFormData {
  companyName: string;
  industries: string[];
  audiences: string[];
  tones: string[];
  themes: string[];
  styles: string[];
  preferences: string;
}

/**
 * Generates catchy slogans using the Grok API
 */
export const generateGrokSlogans = async (data: SloganFormData): Promise<string> => {
  if (!GROK_API_KEY) {
    throw new Error('Grok API key is not configured. Please set VITE_GROK_API_KEY in .env.local');
  }

  const prompt = `
Generate 8-10 catchy, witty, and memorable slogans for the following company:

Company Name: ${data.companyName}
Industry: ${data.industries.join(', ') || 'General'}
Target Audience: ${data.audiences.join(', ') || 'General Public'}
Desired Tone: ${data.tones.join(', ') || 'Balanced'}
Key Themes: ${data.themes.join(', ') || 'General'}
Preferred Style: ${data.styles.join(', ') || 'Any'}
Additional Preferences: ${data.preferences || 'None'}

Requirements:
- Be creative, witty, and slightly edgy (like Grok!)
- Each slogan should be memorable and impactful
- Mix different approaches: some punny, some serious, some bold
- Keep slogans concise (3-8 words ideal)
- Make them marketing-ready

Format the output as a numbered list (1-10).
  `.trim();

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are Grok, a witty, rebellious, and slightly edgy AI assistant created by xAI. Your task is to generate catchy slogans that stand out. Be creative, sometimes humorous, but always deliver high-quality marketing copy. Don\'t be overly formal or boring.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-beta',
        temperature: 0.9,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Grok API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content || 'Could not generate slogans.';
    }

    throw new Error('Unexpected response format from Grok API');
  } catch (error) {
    console.error('Grok API Error:', error);
    throw new Error(`Failed to generate slogans: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generates marketing copy using Grok (for future expansion)
 */
export const generateGrokMarketing = async (
  prompt: string,
  contentType: 'social' | 'email' | 'website' | 'ad' = 'social'
): Promise<string> => {
  if (!GROK_API_KEY) {
    throw new Error('Grok API key is not configured');
  }

  const systemPrompts = {
    social: 'Generate engaging social media content that captures attention and drives engagement.',
    email: 'Write compelling email copy that converts readers into customers.',
    website: 'Create persuasive website copy that clearly communicates value.',
    ad: 'Craft attention-grabbing ad copy that drives clicks and conversions.'
  };

  try {
    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are Grok, a witty marketing expert. ${systemPrompts[contentType]}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'grok-beta',
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || 'Could not generate content.';
  } catch (error) {
    console.error('Grok API Error:', error);
    throw error;
  }
};
