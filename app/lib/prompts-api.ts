import { vpsApi } from "@/app/lib/vps-api/client";
import type { Prompt, PromptCategory, CreatePromptInput, UpdatePromptInput } from "../_components/prompts/types";

export async function getPrompts(): Promise<Prompt[]> {
    const data = await vpsApi.getPrompts();
    return data as Prompt[];
}

export async function getCategories(): Promise<PromptCategory[]> {
    const data = await vpsApi.getCategories();
    return data as PromptCategory[];
}

export async function createPrompt(input: CreatePromptInput): Promise<Prompt> {
    const data = await vpsApi.createPrompt({
        title: input.title,
        description: input.description,
        content: input.content,
        tags: input.tags,
        category_id: input.category_id,
        attachments: input.attachments,
    });
    return data as Prompt;
}

export async function updatePrompt(id: string, input: UpdatePromptInput): Promise<Prompt> {
    const data = await vpsApi.updatePrompt(id, {
        title: input.title,
        description: input.description,
        content: input.content,
        tags: input.tags,
        category_id: input.category_id,
        is_favorite: input.is_favorite,
        order_index: input.order_index,
    });
    return data as Prompt;
}

export async function deletePrompt(id: string): Promise<void> {
    await vpsApi.deletePrompt(id);
}

export async function createCategory(name: string, color?: string): Promise<PromptCategory> {
    const data = await vpsApi.createCategory(name, color);
    return data as PromptCategory;
}

export async function deleteCategory(id: string): Promise<void> {
    await vpsApi.deleteCategory(id);
}

export async function updateCategory(id: string, name: string, color?: string): Promise<PromptCategory> {
    const data = await vpsApi.updateCategory(id, name, color);
    return data as PromptCategory;
}
