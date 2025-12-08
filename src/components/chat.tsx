'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, ImagePlus, Loader2, AlertCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageComponent } from '@/components/message';
import { ImageUpload } from '@/components/image-upload';
import { SettingsDialog } from '@/components/settings-dialog';
import { useSettings } from '@/hooks/use-settings';
import { RESOLUTIONS, ASPECT_RATIOS, type Resolution, type AspectRatio } from '@/lib/storage';
import type { Message, UploadedImage, ThinkingPart, OutputPart } from '@/lib/types';

export function Chat() {
  const {
    apiKey,
    setApiKey,
    resolution,
    setResolution,
    aspectRatio,
    setAspectRatio,
    isLoaded,
    hasApiKey,
  } = useSettings();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(async () => {
    if (!input.trim() && images.length === 0) return;
    if (!hasApiKey) {
      setError('Please set your API key in settings first');
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      images: images.map((img) => img.preview),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          images: images.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType,
          })),
          resolution,
          aspectRatio,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      // Build assistant message
      const textContent = data.output
        .filter((p: OutputPart) => p.type === 'text')
        .map((p: OutputPart) => p.content)
        .join('\n');

      const generatedImages = data.output
        .filter((p: OutputPart) => p.type === 'image')
        .map((p: OutputPart) => p.content);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: textContent,
        thinking: data.thinking as ThinkingPart[],
        generatedImages,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Clear uploaded images after successful generation
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }, [input, images, hasApiKey, resolution, aspectRatio, apiKey]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        const newImages: UploadedImage[] = [];
        const remainingSlots = 14 - images.length;

        for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
          const file = files[i];
          const preview = URL.createObjectURL(file);
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(file);
          });

          newImages.push({
            id: `${Date.now()}-${i}`,
            file,
            preview,
            base64,
            mimeType: file.type,
          });
        }

        setImages((prev) => [...prev, ...newImages]);
      }
    },
    [images]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const newImages: UploadedImage[] = [];
      const remainingSlots = 14 - images.length;

      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const preview = URL.createObjectURL(file);
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        newImages.push({
          id: `${Date.now()}-${i}`,
          file,
          preview,
          base64,
          mimeType: file.type,
        });
      }

      setImages((prev) => [...prev, ...newImages]);
      e.target.value = '';
    },
    [images]
  );

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <span className="text-lg">🍌</span>
          </div>
          <div>
            <h1 className="font-semibold">Nano Banana Pro</h1>
            <p className="text-xs text-muted-foreground">
              Gemini Image Generation • {resolution} • {aspectRatio}
            </p>
          </div>
        </div>
        <SettingsDialog
          apiKey={apiKey}
          setApiKey={setApiKey}
          resolution={resolution}
          setResolution={setResolution}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
        />
      </header>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍌</span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to Nano Banana Pro</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate stunning images with Google&apos;s Gemini model. Describe what you want to
                create, optionally add reference images, and watch the magic happen.
              </p>
              {!hasApiKey && (
                <p className="text-sm text-amber-500 mt-4">
                  ⚠️ Set your Google API key in settings to get started
                </p>
              )}
            </div>
          )}

          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}

          {isGenerating && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Resolution:</span>
            <div className="flex gap-1">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  disabled={isGenerating}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    resolution === res
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <span className="text-muted-foreground ml-2">Aspect:</span>
            <div className="flex flex-wrap gap-1">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  disabled={isGenerating}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <ImageUpload images={images} setImages={setImages} />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 14 || isGenerating}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Describe the image you want to generate..."
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
              disabled={isGenerating}
            />
            <Button
              onClick={handleSubmit}
              disabled={(!input.trim() && images.length === 0) || isGenerating || !hasApiKey}
              className="shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
