import { useState, useMemo, useCallback } from "react";
import { usePrompts } from "./use-prompts";
import { PromptCard } from "./prompt-card";
import { PromptEditor } from "./prompt-editor";
import { CategoryManager } from "./category-manager";
import { PlusIcon, SearchIcon, FilterIcon, SettingsIcon } from "lucide-react";
import type { Prompt, CreatePromptInput } from "./types";

type PromptsViewProps = {
    onUsePrompt: (content: string) => void;
};

export function PromptsView({ onUsePrompt }: PromptsViewProps) {
    const {
        prompts,
        categories,
        isLoading,
        createPrompt,
        updatePrompt,
        deletePrompt,
        toggleFavorite,
        createCategory,
        updateCategory,
        deleteCategory
    } = usePrompts();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<Prompt | undefined>(undefined);
    const [draggedPromptId, setDraggedPromptId] = useState<string | null>(null);

    const filteredPrompts = useMemo(() => {
        return prompts.filter(prompt => {
            const matchesSearch =
                prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory ? prompt.category_id === selectedCategory : true;
            const matchesFavorite = showFavoritesOnly ? prompt.is_favorite : true;

            return matchesSearch && matchesCategory && matchesFavorite;
        });
    }, [prompts, searchQuery, selectedCategory, showFavoritesOnly]);

    const handleCreateClick = () => {
        setEditingPrompt(undefined);
        setIsEditorOpen(true);
    };

    const handleEditClick = (prompt: Prompt) => {
        setEditingPrompt(prompt);
        setIsEditorOpen(true);
    };

    const handleSavePrompt = async (data: CreatePromptInput) => {
        if (editingPrompt) {
            await updatePrompt(editingPrompt.id, data);
        } else {
            await createPrompt(data);
        }
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.effectAllowed = "move";
        setDraggedPromptId(id);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = async (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (!draggedPromptId || draggedPromptId === targetId) {
            setDraggedPromptId(null);
            return;
        }

        const draggedIndex = prompts.findIndex(p => p.id === draggedPromptId);
        const targetIndex = prompts.findIndex(p => p.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedPromptId(null);
            return;
        }

        // Swap order indices logic (simplified for now, ideally batch update)
        const draggedPrompt = prompts[draggedIndex];
        const targetPrompt = prompts[targetIndex];

        // Optimistic update handled by hook if we call updatePrompt? 
        // Actually hook does optimistic update.
        // We just swap their order_index

        await updatePrompt(draggedPrompt.id, { order_index: targetPrompt.order_index });
        await updatePrompt(targetPrompt.id, { order_index: draggedPrompt.order_index });

        setDraggedPromptId(null);
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-muted)] border-t-[var(--text-primary)]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 md:flex-row">
            {/* Sidebar / Filters */}
            <aside className="flex w-full flex-col gap-6 md:w-64 md:shrink-0">
                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleCreateClick}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-3 text-sm font-bold text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusIcon className="h-4 w-4" />
                        New Prompt
                    </button>

                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search prompts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--text-primary)] focus:outline-none"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <h3 className="px-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Filters</h3>
                        <button
                            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${showFavoritesOnly
                                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            <span>Favorites</span>
                            {showFavoritesOnly && <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)]" />}
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between px-2 mb-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Categories</h3>
                            <button
                                onClick={() => setIsCategoryManagerOpen(true)}
                                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                title="Manage Categories"
                            >
                                <SettingsIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <button
                            onClick={() => setSelectedCategory(null)}
                            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${selectedCategory === null
                                    ? "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                }`}
                        >
                            All Prompts
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${selectedCategory === cat.id
                                        ? "bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span
                                        className="h-2 w-2 rounded-full"
                                        style={{ backgroundColor: cat.color || "var(--text-muted)" }}
                                    />
                                    {cat.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </aside>

            {/* Main Grid */}
            <main className="flex-1">
                {filteredPrompts.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredPrompts.map((prompt) => (
                            <div
                                key={prompt.id}
                                draggable={!searchQuery && !selectedCategory && !showFavoritesOnly} // Only allow drag when not filtered
                                onDragStart={(e) => handleDragStart(e, prompt.id)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, prompt.id)}
                                className={`transition-opacity ${draggedPromptId === prompt.id ? "opacity-50" : "opacity-100"}`}
                            >
                                <PromptCard
                                    prompt={prompt}
                                    category={categories.find(c => c.id === prompt.category_id)}
                                    onEdit={handleEditClick}
                                    onDelete={deletePrompt}
                                    onToggleFavorite={toggleFavorite}
                                    onUse={onUsePrompt}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-subtle)]/30 text-center">
                        <div className="rounded-full bg-[var(--bg-subtle)] p-4">
                            <FilterIcon className="h-6 w-6 text-[var(--text-muted)]" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-[var(--text-primary)]">No prompts found</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                {searchQuery || selectedCategory || showFavoritesOnly
                                    ? "Try adjusting your filters"
                                    : "Create your first prompt to get started"}
                            </p>
                        </div>
                        {!searchQuery && !selectedCategory && !showFavoritesOnly && (
                            <button
                                onClick={handleCreateClick}
                                className="text-sm font-bold text-[var(--accent-primary)] hover:underline"
                            >
                                Create New Prompt
                            </button>
                        )}
                    </div>
                )}
            </main>

            <PromptEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialData={editingPrompt}
                categories={categories}
                onSave={handleSavePrompt}
            />

            <CategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                categories={categories}
                onCreate={createCategory}
                onUpdate={updateCategory}
                onDelete={deleteCategory}
            />
        </div>
    );
}
