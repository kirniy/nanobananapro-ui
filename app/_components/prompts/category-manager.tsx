import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { XIcon, PlusIcon, TrashIcon, Edit2Icon, CheckIcon } from "lucide-react";
import type { PromptCategory } from "./types";

type CategoryManagerProps = {
    isOpen: boolean;
    onClose: () => void;
    categories: PromptCategory[];
    onCreate: (name: string, color?: string) => Promise<void>;
    onUpdate: (id: string, name: string, color?: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
};

const COLORS = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#EAB308", // Yellow
    "#22C55E", // Green
    "#06B6D4", // Cyan
    "#3B82F6", // Blue
    "#8B5CF6", // Violet
    "#EC4899", // Pink
];

export function CategoryManager({ isOpen, onClose, categories, onCreate, onUpdate, onDelete }: CategoryManagerProps) {
    const [newCategoryName, setNewCategoryName] = useState("");
    const [newCategoryColor, setNewCategoryColor] = useState(COLORS[5]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        try {
            setIsSubmitting(true);
            await onCreate(newCategoryName, newCategoryColor);
            setNewCategoryName("");
            setNewCategoryColor(COLORS[5]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (cat: PromptCategory) => {
        setEditingId(cat.id);
        setEditName(cat.name);
        setEditColor(cat.color || COLORS[5]);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName("");
        setEditColor("");
    };

    const saveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        try {
            setIsSubmitting(true);
            await onUpdate(editingId, editName, editColor);
            setEditingId(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure? Prompts in this category will be uncategorized.")) {
            try {
                setIsSubmitting(true);
                await onDelete(id);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-6 shadow-2xl sm:rounded-2xl">
                    <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                            Manage Categories
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                <XIcon className="h-4 w-4" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex flex-col gap-6 mt-4">
                        {/* Create New */}
                        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl bg-[var(--bg-subtle)] p-3">
                            <span className="text-xs font-bold uppercase text-[var(--text-muted)]">Add New Category</span>
                            <div className="flex gap-2">
                                <input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Category Name"
                                    className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !newCategoryName.trim()}
                                    className="flex items-center justify-center rounded-lg bg-[var(--text-primary)] px-3 py-1.5 text-black disabled:opacity-50"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex gap-1.5">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setNewCategoryColor(c)}
                                        className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${newCategoryColor === c ? "border-white scale-110" : "border-transparent"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </form>

                        {/* List */}
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] p-3">
                                    {editingId === cat.id ? (
                                        <div className="flex flex-1 flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="flex-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-input)] px-2 py-1 text-sm text-[var(--text-primary)]"
                                                />
                                                <button onClick={saveEdit} disabled={isSubmitting} className="text-green-400 hover:text-green-300">
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                                <button onClick={cancelEdit} disabled={isSubmitting} className="text-red-400 hover:text-red-300">
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {COLORS.map((c) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setEditColor(c)}
                                                        className={`h-4 w-4 rounded-full border ${editColor === c ? "border-white" : "border-transparent"
                                                            }`}
                                                        style={{ backgroundColor: c }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color || "gray" }} />
                                                <span className="text-sm font-medium text-[var(--text-primary)]">{cat.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => startEdit(cat)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                                    <Edit2Icon className="h-3.5 w-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(cat.id)} className="text-[var(--text-muted)] hover:text-red-400">
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <p className="text-center text-sm text-[var(--text-muted)]">No categories yet.</p>
                            )}
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
