'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ThinkingPart } from '@/lib/types';

interface ThinkingDisplayProps {
  thinking: ThinkingPart[];
}

export function ThinkingDisplay({ thinking }: ThinkingDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!thinking || thinking.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-4">
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Brain className="h-4 w-4" />
        <span>Thinking process ({thinking.length} parts)</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 pl-6 space-y-2 border-l-2 border-muted">
        {thinking.map((part, index) => (
          <div key={index} className="text-sm">
            {part.type === 'thinking-text' ? (
              <p className="text-muted-foreground italic whitespace-pre-wrap">{part.content}</p>
            ) : (
              <img
                src={part.content}
                alt={`Thinking visualization ${index + 1}`}
                className="max-w-xs rounded-md border border-border"
              />
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
