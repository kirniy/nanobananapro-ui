import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for image generation

interface GenerateRequestBody {
  prompt: string;
  images: { base64: string; mimeType: string }[];
  resolution: '1K' | '2K' | '4K';
  aspectRatio: string;
  apiKey: string;
}

interface ThinkingPart {
  type: 'thinking-text' | 'thinking-image';
  content: string;
}

interface OutputPart {
  type: 'text' | 'image';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequestBody = await request.json();
    const { prompt, images, resolution, aspectRatio, apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Initialize Google GenAI client
    const ai = new GoogleGenAI({ apiKey });

    // Build the content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // Add reference images first
    for (const image of images) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64,
        },
      });
    }

    // Add the prompt
    parts.push({ text: prompt });

    // Generate with Gemini 3 Pro Image model (from user's API dashboard)
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image',
      contents: parts,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // Process response parts
    const thinking: ThinkingPart[] = [];
    const output: OutputPart[] = [];

    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        // Check if it's a thought part (using type assertion for extended properties)
        const partWithThought = part as typeof part & { thought?: boolean };
        const isThought = partWithThought.thought === true;

        if ('text' in part && part.text) {
          if (isThought) {
            thinking.push({ type: 'thinking-text', content: part.text });
          } else {
            output.push({ type: 'text', content: part.text });
          }
        }

        if ('inlineData' in part && part.inlineData) {
          const imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          if (isThought) {
            thinking.push({ type: 'thinking-image', content: imageData });
          } else {
            output.push({ type: 'image', content: imageData });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      thinking,
      output,
    });
  } catch (error) {
    console.error('Generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Check for common API errors
    if (errorMessage.includes('API key')) {
      return NextResponse.json({ error: 'Invalid API key. Please check your Google API key.' }, { status: 401 });
    }

    if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
