import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import type { Prompt, CreatePromptInput, PromptCategory } from "./types";

type PromptEditorProps = {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Prompt;
    categories: PromptCategory[];
    onSave: (data: CreatePromptInput) => Promise<void>;
};

export function PromptEditor({ isOpen, onClose, initialData, categories, onSave }: PromptEditorProps) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [categoryId, setCategoryId] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title);
                setContent(initialData.content);
                setDescription(initialData.description || "");
                setTags(initialData.tags || []);
                setCategoryId(initialData.category_id || "");
            } else {
                // Reset for new prompt
                setTitle("");
                setContent("");
                setDescription("");
                setTags([]);
                setCategoryId("");
            }
            setError(null);
        }
    }, [isOpen, initialData]);

    const handleAddTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && tagInput) {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setError("Title and Content are required.");
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onSave({
                title,
                content,
                description: description || undefined,
                tags,
                category_id: categoryId || undefined,
                // Attachments logic would go here (simplified for now)
            });
            onClose();
        } catch (err) {
            console.error(err);
            setError("Failed to save prompt. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <Dialog.Title className="text-xl font-bold leading-none tracking-tight text-[var(--text-primary)]">
                            {initialData ? "Edit Prompt" : "New Prompt"}
                        </Dialog.Title>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {error && (
                            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium text-[var(--text-secondary)]">Title</label>
                            <input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Cyberpunk City"
                                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="category" className="text-sm font-medium text-[var(--text-secondary)]">Category</label>
                            <select
                                id="category"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                            >
                                <option value="">No Category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="content" className="text-sm font-medium text-[var(--text-secondary)]">Prompt Content</label>
                            <textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Enter your prompt here..."
                                rows={5}
                                className="resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none font-mono"
                            />
                        </div>

                        <div className="grid gap-2">
                            <label className="text-sm font-medium text-[var(--text-secondary)]">Tags</label>
                            <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] p-2 focus-within:border-[var(--text-primary)]">
                                {tags.map((tag) => (
                                    <span key={tag} className="flex items-center gap-1 rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-xs font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]">
                                        #{tag}
                                        <button type="button" onClick={() => handleRemoveTag(tag)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                            <XIcon className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={tags.length === 0 ? "Type tag and press Enter..." : ""}
                                    className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] min-w-[120px]"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <label htmlFor="description" className="text-sm font-medium text-[var(--text-secondary)]">Description (Optional)</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Notes about this prompt..."
                                rows={2}
                                className="resize-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-lg bg-[var(--text-primary)] px-4 py-2 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {isSubmitting ? "Saving..." : "Save Prompt"}
                            </button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button
                            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                        >
                            <XIcon className="h-4 w-4 text-[var(--text-secondary)]" />
                            <span className="sr-only">Close</span>
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
