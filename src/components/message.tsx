'use client';

import { Download, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThinkingDisplay } from '@/components/thinking-display';
import type { Message } from '@/lib/types';

interface MessageProps {
  message: Message;
}

export function MessageComponent({ message }: MessageProps) {
  const isUser = message.role === 'user';

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `generated-image-${Date.now()}-${index}.png`;
    link.click();
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {/* User images */}
        {isUser && message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Reference ${i + 1}`}
                className="h-20 w-20 object-cover rounded-md border border-border"
              />
            ))}
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}
        >
          {/* Thinking display for assistant */}
          {!isUser && message.thinking && <ThinkingDisplay thinking={message.thinking} />}

          {/* Text content */}
          {message.content && (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Generated images */}
          {!isUser && message.generatedImages && message.generatedImages.length > 0 && (
            <div className="mt-3 space-y-3">
              {message.generatedImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img}
                    alt={`Generated image ${i + 1}`}
                    className="rounded-lg max-w-full border border-border"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => downloadImage(img, i)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
