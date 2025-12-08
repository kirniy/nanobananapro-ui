import type { Resolution, AspectRatio } from './storage';

export interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  base64?: string;
  mimeType: string;
}

export interface ThinkingPart {
  type: 'thinking-text' | 'thinking-image';
  content: string;
}

export interface OutputPart {
  type: 'text' | 'image';
  content: string;
}

export interface GenerationResult {
  thinking: ThinkingPart[];
  output: OutputPart[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 images
  thinking?: ThinkingPart[];
  generatedImages?: string[]; // base64 generated images
  timestamp: Date;
}

export interface GenerateRequest {
  prompt: string;
  images: { base64: string; mimeType: string }[];
  resolution: Resolution;
  aspectRatio: AspectRatio;
  apiKey: string;
}
