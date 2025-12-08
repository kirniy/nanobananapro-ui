import { useState, useEffect, useCallback } from "react";
import {
    getPrompts,
    getCategories,
    createPrompt as apiCreatePrompt,
    updatePrompt as apiUpdatePrompt,
    deletePrompt as apiDeletePrompt,
    createCategory as apiCreateCategory,
    deleteCategory as apiDeleteCategory
} from "@/app/lib/prompts-api";
import type { Prompt, PromptCategory, CreatePromptInput, UpdatePromptInput } from "./types";
import { useAuth } from "../auth/auth-context";

export function usePrompts() {
    const { user } = useAuth();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [categories, setCategories] = useState<PromptCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) {
            setPrompts([]);
            setCategories([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const [promptsData, categoriesData] = await Promise.all([
                getPrompts(),
                getCategories()
            ]);
            setPrompts(promptsData);
            setCategories(categoriesData);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch prompts data:", err);
            setError("Failed to load prompts.");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const createPrompt = useCallback(async (input: CreatePromptInput) => {
        try {
            const newPrompt = await apiCreatePrompt(input);
            // Optimistic update or refetch? Refetch is safer for now to get attachments
            await fetchData();
            return newPrompt;
        } catch (err) {
            console.error("Failed to create prompt:", err);
            throw err;
        }
    }, [fetchData]);

    const updatePrompt = useCallback(async (id: string, input: UpdatePromptInput) => {
        // Optimistic update
        setPrompts(prev => prev.map(p => p.id === id ? { ...p, ...input } as Prompt : p));

        try {
            await apiUpdatePrompt(id, input);
            // Background re-fetch to ensure consistency
            void fetchData();
        } catch (err) {
            console.error("Failed to update prompt:", err);
            // Revert on error (would need previous state, simplified here)
            await fetchData();
            throw err;
        }
    }, [fetchData]);

    const deletePrompt = useCallback(async (id: string) => {
        // Optimistic update
        setPrompts(prev => prev.filter(p => p.id !== id));

        try {
            await apiDeletePrompt(id);
        } catch (err) {
            console.error("Failed to delete prompt:", err);
            await fetchData();
            throw err;
        }
    }, [fetchData]);

    const toggleFavorite = useCallback(async (id: string) => {
        const prompt = prompts.find(p => p.id === id);
        if (!prompt) return;

        await updatePrompt(id, { is_favorite: !prompt.is_favorite });
    }, [prompts, updatePrompt]);

    const createCategory = useCallback(async (name: string, color?: string) => {
        try {
            await apiCreateCategory(name, color);
            await fetchData();
        } catch (err) {
            console.error("Failed to create category:", err);
            throw err;
        }
    }, [fetchData]);

    const deleteCategory = useCallback(async (id: string) => {
        try {
            await apiDeleteCategory(id);
            await fetchData();
        } catch (err) {
            console.error("Failed to delete category:", err);
            throw err;
        }
    }, [fetchData]);

    return {
        prompts,
        categories,
        isLoading,
        error,
        refresh: fetchData,
        createPrompt,
        updatePrompt,
        deletePrompt,
        toggleFavorite,
        createCategory,
        deleteCategory
    };
}
