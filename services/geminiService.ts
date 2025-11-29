import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Helper to check if Gemini API key is configured
export const isGeminiConfigured = (): boolean => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return !!(apiKey && apiKey !== 'your-gemini-api-key-here' && apiKey.length > 10);
};

// Helper to get AI instance. Re-instantiated to ensure fresh key if changed.
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key-here') {
    throw new Error('GEMINI_API_KEY_NOT_CONFIGURED');
  }
  return new GoogleGenAI({ apiKey });
};

// Custom error class for Gemini errors
export class GeminiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
  }
}

/**
 * Analyzes a claim document text or image/pdf.
 */
export const analyzeClaim = async (text: string, imageBase64?: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  try {
    const ai = getAI();

    const parts: any[] = [];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      });
    }
    parts.push({ text: `You are a professional insurance and claim estimation assistant for "Estimate Reliance". Analyze this claim submission.
    If it's a document (PDF or Image), extract and summarize the key points, specific line items, cost estimates if visible, and identify any missing information required for a complete estimate.
    If it's a user description, provide professional reassurance, analyze the described damages, and outline the next steps for the estimate process.

    User input: ${text}` });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
    });

    return response.text || "I couldn't process that claim. Please try again.";
  } catch (error: any) {
    // Check for specific error types
    if (error.message === 'GEMINI_API_KEY_NOT_CONFIGURED') {
      throw new GeminiError(
        'AI service is not configured. Your submission has been received and our team will process it manually.',
        'API_NOT_CONFIGURED'
      );
    }

    // Check for API quota/rate limit errors
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate')) {
      throw new GeminiError(
        'Our AI service is temporarily busy. Your submission has been saved and will be processed shortly.',
        'RATE_LIMITED'
      );
    }

    // Check for invalid API key
    if (error.status === 401 || error.status === 403 || error.message?.includes('API key')) {
      throw new GeminiError(
        'AI service authentication failed. Your submission has been received and our team will review it.',
        'AUTH_ERROR'
      );
    }

    // Network errors
    if (error.message?.includes('network') || error.message?.includes('fetch') || error.name === 'TypeError') {
      throw new GeminiError(
        'Unable to connect to AI service. Please check your internet connection and try again.',
        'NETWORK_ERROR'
      );
    }

    // Generic error with original message for debugging
    console.error('Gemini API error:', error);
    throw new GeminiError(
      'Unable to process your request. Please try again or contact support.',
      'UNKNOWN_ERROR'
    );
  }
};

/**
 * Generates marketing copy, slogans, or business ideas with specific personas.
 */
export const generateMarketingContent = async (
  prompt: string, 
  type: 'slogan' | 'mission', 
  persona: 'Gemini' | 'GPT' | 'Grok' = 'Gemini'
): Promise<string> => {
  const ai = getAI();
  
  let systemInstruction = "You are a world-class marketing expert.";
  
  if (persona === 'GPT') {
    systemInstruction += " Adopt a highly professional, expansive, and corporate-friendly tone, similar to GPT-4.";
  } else if (persona === 'Grok') {
    systemInstruction += " Adopt a witty, rebellious, and slightly edgy tone, similar to Grok.";
  } else {
    systemInstruction += " Adopt a balanced, innovative, and helpful tone characteristic of Gemini.";
  }

  const context = type === 'slogan' 
    ? `Generate 5 catchy, unique slogans for the following business or product. Format as a bulleted list.`
    : `Write a powerful and inspiring Mission Statement for the following business. Focus on value, vision, and reliability.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `${context}\n\nTopic: ${prompt}`,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text || "Could not generate content.";
};

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
 * Generates slogans using the Grok persona based on a detailed questionnaire.
 */
export const generateGrokSlogans = async (data: SloganFormData): Promise<string> => {
  const ai = getAI();

  const systemInstruction = `You are Grok, a witty, rebellious, and slightly edgy AI assistant.
  Your task is to generate catchy slogans based on specific user criteria.
  Be creative, sometimes humorous, but always deliver high-quality marketing copy.
  Do not be overly formal.`;

  const prompt = `
  Generate 5-10 catchy slogans for the following company based on these details:

  Company Name: ${data.companyName}
  Industry: ${data.industries.join(', ') || 'General'}
  Target Audience: ${data.audiences.join(', ') || 'General Public'}
  Desired Tone: ${data.tones.join(', ') || 'Balanced'}
  Key Themes: ${data.themes.join(', ') || 'General'}
  Preferred Style: ${data.styles.join(', ') || 'Any'}
  Additional Preferences: ${data.preferences || 'None'}

  Format the output as a numbered list.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    }
  });

  return response.text || "Could not generate slogans.";
};

/**
 * Edits an image based on a text prompt using Gemini 2.5 Flash Image (Nano Banana).
 * Kept for legacy or lighter tasks.
 */
export const editImage = async (imageBase64: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  const ai = getAI();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  // Extract image from response
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }
  
  throw new Error("No image generated. The model might have returned only text.");
};

/**
 * Generates high-quality graphics using Gemini 3 Pro Image (Nano Banana Pro).
 * Allows duplicating/recreating via reference image and aspect ratio control.
 * Includes specific "Nano Banana Pro" system prompt for adaptive reconfiguration.
 */
export const generateProGraphics = async (prompt: string, assetType: string, imageBase64?: string, aspectRatio: string = '1:1'): Promise<string> => {
  const ai = getAI();

  let fullPrompt = "";

  if (imageBase64) {
      // Use the specialized "Nano Banana Pro" system prompt for adaptive layout reconfiguration
      fullPrompt = `
### System Prompt: Nano Banana Pro

**Role:**
You are Nano Banana Pro, an intelligent AI Graphic Design Agent capable of "Adaptive Layout Reconfiguration." Your goal is to take an existing user-uploaded logo and reformat it to fit a specific target aspect ratio perfectly, without distorting or stretching the image.

**Input parameters:**
1.  **[IMAGE]:** The provided source image (Reference).
2.  **[TARGET_RATIO]:** ${aspectRatio}

**Core Logic & Processing:**

**Step 1: Element Segmentation**
Analyze the uploaded image and identify the bounding boxes for:
* **Element A:** The graphic logo/icon.
* **Element B:** The primary text (Company Name).
* **Element C:** The secondary text (Slogan), if present.
* **Background:** Detect if the background is solid or transparent.

**Step 2: Intelligent Rearrangement**
Based on the target ratio ${aspectRatio}, rearrange the elements using the following rules:

* **Rule 1: Wide/Landscape Targets (e.g., 16:9, Website Header)**
    * *Transformation:* Convert "Stacked" layouts to "Inline/Horizontal."
    * *Placement:* Move **Element A (Icon)** to the far left, vertically centered. Move **Element B & C (Text)** to the right of the icon to fill the horizontal space.
    * *Alignment:* Ensure the text is left-aligned next to the icon.

* **Rule 2: Tall/Portrait Targets (e.g., 9:16, Mobile Story)**
    * *Transformation:* Convert "Inline" layouts to "Stacked/Vertical."
    * *Placement:* Move **Element A (Icon)** to the top center. Move **Element B & C (Text)** directly below the icon.
    * *Alignment:* Center-align all elements.

* **Rule 3: Square Targets (e.g., 1:1, Avatar)**
    * *Transformation:* Center and Maximize.
    * *Placement:* Stack elements centrally. If the text makes the logo too small, prioritize the size of **Element A (Icon)** while keeping the text legible below it.

**Step 3: Execution Guardrails**
* **Zero Distortion:** Never stretch an image element. Scale elements proportionally only.
* **Background Extension:** If the background is a solid color, extend that exact color code to fill the new canvas. If transparent, keep it transparent.
* **Fidelity:** Use the exact pixels/vectors from the source; do not generate new fonts or icons unless requested.

**User Context / Additional Instructions:**
Asset Type: ${assetType}
User Details: ${prompt}
      `;
  } else {
      // Use the specialized "Nano Banana Pro (Generative Mode)" system prompt for creation from scratch
      fullPrompt = `
### System Prompt: Nano Banana Pro (Generative Mode)

**Role:**
You are Nano Banana Pro, an expert AI Brand Identity Designer specializing in "Composition-Aware Generative Design." Your goal is to create unique, professional logos from scratch based on user text prompts, ensuring the final composition is optimized to balance and fill the specific canvas dimensions requested by the user.

**Input Parameters:**
1.  **[USER_INPUT]:** ${prompt} (Contains Company Name, Slogan, and Style Instructions).
2.  **[ASSET_TYPE]:** ${assetType}
3.  **[TARGET_RATIO]:** ${aspectRatio}

**Core Logic & Processing:**

**Step 1: Conceptualization & Element Generation**
Based on the [USER_INPUT] and [ASSET_TYPE], generate two distinct visual elements:
* **A Graphic Icon/Mark:** A relevant symbol that encapsulates the brand essence.
* **Typography:** Select font styles for the Company Name that match the requested vibe.

**Step 2: Compositional Adaptation (Filling the Space)**
Analyze the requested [TARGET_RATIO] (${aspectRatio}) and determine the optimal layout to fill the canvas effectively:

* **Rule 1: Wide/Landscape Targets (e.g., 16:9, Banner)**
    * *Objective:* Occupy horizontal space to avoid excessive empty margins on the sides.
    * *Action:* Generate a **Horizontal/Inline Layout**. Place the generated Icon on the left and the Company Name to its right. Scale elements so the combined width utilizes 70-85% of the canvas width.

* **Rule 2: Tall/Portrait Targets (e.g., 9:16, Mobile Story)**
    * *Objective:* Occupy vertical space to avoid excessive empty space at the top and bottom.
    * *Action:* Generate a **Vertical/Stacked Layout**. Place a prominent Icon at the top, with the Company Name stacked directly below it. Increase vertical spacing (leading) slightly to distribute elements down the canvas comfortably.

* **Rule 3: Square/Compact Targets (e.g., 1:1, Profile)**
    * *Objective:* Create a dense, balanced center of gravity.
    * *Action:* Generate a **Centered Stacked Layout** or an **Emblem Layout** (where text is integrated around or inside the icon). Ensure the combined elements fill a central circle or square area, leaving breathing room near the edges but dominating the center.

**Step 3: Execution Guardrails**
* **Legibility First:** Ensure the text is clear and readable at the generated size.
* **No Hallucinated Text:** Do not add slogans, dates, or extra words unless explicitly provided in the prompt inputs.
* **Clean Backgrounds:** Unless a specific background scene is requested in the style prompt, generate assets on clean, solid, or subtly textured backgrounds that contrast well with the elements.
      `;
  }

  const parts: any[] = [];
  if (imageBase64) {
    parts.push({
        inlineData: {
            data: imageBase64,
            mimeType: 'image/jpeg',
        }
    });
  }
  parts.push({ text: fullPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
        imageConfig: {
            imageSize: '2K', // High quality for professional graphics
            aspectRatio: aspectRatio
        }
    }
  });

  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error("Graphic generation failed.");
}

/**
 * Generates a video using Veo 3.1 based on an image and optional prompt.
 */
export const generateVeoVideo = async (imageBase64: string, prompt: string = "Animate this naturally"): Promise<string> => {
  const ai = getAI();

  // Initial request
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: imageBase64,
      mimeType: 'image/jpeg', // Assuming jpeg/png input
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9' 
    }
  });

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  if (operation.response?.generatedVideos?.[0]?.video?.uri) {
    const downloadLink = operation.response.generatedVideos[0].video.uri;
    // Proxy fetch to get blob url
    const response = await fetch(`${downloadLink}&key=${import.meta.env.VITE_GEMINI_API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  throw new Error("Video generation failed.");
};