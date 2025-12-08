import { useState } from "react";
import { CopyIcon, EditIcon, StarIcon, TrashIcon, ZapIcon } from "lucide-react";
import type { Prompt, PromptCategory } from "./types";

type PromptCardProps = {
    prompt: Prompt;
    category?: PromptCategory;
    onEdit: (prompt: Prompt) => void;
    onDelete: (id: string) => void;
    onToggleFavorite: (id: string) => void;
    onUse: (content: string) => void;
};

export function PromptCard({
    prompt,
    category,
    onEdit,
    onDelete,
    onToggleFavorite,
    onUse
}: PromptCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(prompt.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="group relative flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4 transition-all hover:border-[var(--border-highlight)] hover:shadow-lg hover:-translate-y-0.5"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-[var(--text-primary)] line-clamp-1" title={prompt.title}>
                    {prompt.title}
                </h3>
                <button
                    onClick={() => onToggleFavorite(prompt.id)}
                    className={`transition-colors ${prompt.is_favorite ? "text-yellow-400" : "text-[var(--text-muted)] hover:text-yellow-400"}`}
                >
                    <StarIcon className={`h-4 w-4 ${prompt.is_favorite ? "fill-current" : ""}`} />
                </button>
            </div>

            {/* Content Preview */}
            <p className="text-sm text-[var(--text-secondary)] line-clamp-3 font-mono leading-relaxed">
                {prompt.content}
            </p>

            {/* Attachments Indicator */}
            {prompt.attachments && prompt.attachments.length > 0 && (
                <div className="flex gap-1 overflow-hidden">
                    {prompt.attachments.slice(0, 3).map((att) => (
                        <div key={att.id} className="h-6 w-6 rounded bg-[var(--bg-subtle)] overflow-hidden border border-[var(--border-subtle)]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={att.url} alt="attachment" className="h-full w-full object-cover" />
                        </div>
                    ))}
                    {prompt.attachments.length > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--bg-subtle)] text-[10px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            +{prompt.attachments.length - 3}
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    {category && (
                        <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                                backgroundColor: category.color ? `${category.color}20` : "var(--bg-subtle)",
                                color: category.color || "var(--text-secondary)",
                                border: `1px solid ${category.color ? `${category.color}40` : "var(--border-subtle)"}`
                            }}
                        >
                            {category.name}
                        </span>
                    )}
                    {prompt.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="shrink-0 text-[10px] text-[var(--text-muted)]">#{tag}</span>
                    ))}
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 transition-opacity ${isHovered ? "opacity-100" : "opacity-0 md:opacity-100"}`}>
                    <button
                        onClick={handleCopy}
                        className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                        title="Copy prompt"
                    >
                        {copied ? <span className="text-xs font-bold text-green-400">Copied</span> : <CopyIcon className="h-3.5 w-3.5" />}
                    </button>

                    <button
                        onClick={() => onEdit(prompt)}
                        className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                        title="Edit prompt"
                    >
                        <EditIcon className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => onDelete(prompt.id)}
                        className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-red-400"
                        title="Delete prompt"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={() => onUse(prompt.content)}
                        className="ml-1 flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-2 py-1 text-[10px] font-bold text-[var(--accent-primary-text)] hover:bg-[var(--accent-primary-hover)]"
                    >
                        <ZapIcon className="h-3 w-3" />
                        USE
                    </button>
                </div>
            </div>
        </div>
    );
}
