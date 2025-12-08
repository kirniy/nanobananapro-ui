import { createClient } from "@/app/lib/supabase/client";
import type { Prompt, PromptCategory, CreatePromptInput, UpdatePromptInput } from "../_components/prompts/types";

export async function getPrompts() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prompts")
        .select("*, attachments:prompt_attachments(*)")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Prompt[];
}

export async function getCategories() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prompt_categories")
        .select("*")
        .order("order_index", { ascending: true });

    if (error) throw error;
    return data as PromptCategory[];
}

export async function createPrompt(input: CreatePromptInput) {
    const supabase = createClient();

    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // 1. Create the prompt
    const { data: promptData, error: promptError } = await supabase
        .from("prompts")
        .insert({
            title: input.title,
            description: input.description,
            content: input.content,
            tags: input.tags,
            category_id: input.category_id,
            user_id: user.id,
        })
        .select()
        .single();

    if (promptError) throw promptError;

    // 2. Create attachments if any
    if (input.attachments && input.attachments.length > 0) {
        const attachmentsToInsert = input.attachments.map((att) => ({
            prompt_id: promptData.id,
            url: att.url,
            type: att.type,
            name: att.name,
            width: att.width,
            height: att.height,
        }));

        const { error: attachmentError } = await supabase
            .from("prompt_attachments")
            .insert(attachmentsToInsert);

        if (attachmentError) throw attachmentError;
    }

    return promptData;
}

export async function updatePrompt(id: string, input: UpdatePromptInput) {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("prompts")
        .update({
            title: input.title,
            description: input.description,
            content: input.content,
            tags: input.tags,
            category_id: input.category_id,
            is_favorite: input.is_favorite,
            order_index: input.order_index,
        })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deletePrompt(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("prompts").delete().eq("id", id);
    if (error) throw error;
}

export async function createCategory(name: string, color?: string) {
    const supabase = createClient();

    // Get current user for RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
        .from("prompt_categories")
        .insert({ name, color, user_id: user.id })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("prompt_categories").delete().eq("id", id);
    if (error) throw error;
}

export async function updateCategory(id: string, name: string, color?: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("prompt_categories")
        .update({ name, color })
        .eq("id", id)
        .select()
        .single();

    if (error) throw error;
    return data;
}
