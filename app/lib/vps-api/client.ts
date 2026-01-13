// VPS API Client - Replaces Supabase client
// This client handles all communication with the self-hosted VPS backend

const VPS_API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || "http://46.203.233.138/api";

export interface ApiOptions {
  token?: string;
}

class VpsApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = VPS_API_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Health check
  async health() {
    return this.request<{ status: string; timestamp: string }>("/health");
  }

  // ==================== GENERATIONS ====================

  async getGenerations() {
    return this.request<Generation[]>("/generations");
  }

  async createGeneration(generation: CreateGenerationInput) {
    return this.request<Generation>("/generations", {
      method: "POST",
      body: JSON.stringify(generation),
    });
  }

  async bulkUpsertGenerations(generations: CreateGenerationInput[]) {
    return this.request<Generation[]>("/generations/bulk", {
      method: "POST",
      body: JSON.stringify({ generations }),
    });
  }

  async deleteGeneration(id: string) {
    return this.request<{ success: boolean }>(`/generations/${id}`, {
      method: "DELETE",
    });
  }

  async getGenerationsCount() {
    return this.request<{ count: number }>("/generations/count");
  }

  async cleanupGenerations(keepCount: number = 100) {
    return this.request<{ deleted: number }>("/generations/cleanup", {
      method: "POST",
      body: JSON.stringify({ keep_count: keepCount }),
    });
  }

  // ==================== FAVORITES ====================

  async getFavorites() {
    return this.request<Favorite[]>("/favorites");
  }

  async createFavorite(generationId: string, imageIndex: number) {
    return this.request<Favorite>("/favorites", {
      method: "POST",
      body: JSON.stringify({ generation_id: generationId, image_index: imageIndex }),
    });
  }

  async bulkUpsertFavorites(favorites: { generation_id: string; image_index: number; created_at?: string }[]) {
    return this.request<Favorite[]>("/favorites/bulk", {
      method: "POST",
      body: JSON.stringify({ favorites }),
    });
  }

  async deleteFavorite(id: string) {
    return this.request<{ success: boolean }>(`/favorites/${id}`, {
      method: "DELETE",
    });
  }

  // ==================== SETTINGS ====================

  async getSettings() {
    return this.request<UserSettings>("/settings");
  }

  async updateSettings(settings: Record<string, unknown>) {
    return this.request<UserSettings>("/settings", {
      method: "PUT",
      body: JSON.stringify({ settings }),
    });
  }

  // ==================== API KEYS ====================

  async getApiKeys() {
    return this.request<ApiKeysInfo>("/api-keys");
  }

  async updateApiKeys(keys: { gemini_key?: string | null; replicate_key?: string | null; openai_key?: string | null }) {
    return this.request<ApiKeysInfo>("/api-keys", {
      method: "PUT",
      body: JSON.stringify(keys),
    });
  }

  async getFullApiKeys() {
    return this.request<FullApiKeys>("/api-keys/full");
  }

  // ==================== PROMPTS ====================

  async getPrompts() {
    return this.request<Prompt[]>("/prompts");
  }

  async createPrompt(input: CreatePromptInput) {
    return this.request<Prompt>("/prompts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async updatePrompt(id: string, input: UpdatePromptInput) {
    return this.request<Prompt>(`/prompts/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  async deletePrompt(id: string) {
    return this.request<{ success: boolean }>(`/prompts/${id}`, {
      method: "DELETE",
    });
  }

  // ==================== CATEGORIES ====================

  async getCategories() {
    return this.request<PromptCategory[]>("/categories");
  }

  async createCategory(name: string, color?: string) {
    return this.request<PromptCategory>("/categories", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    });
  }

  async updateCategory(id: string, name: string, color?: string) {
    return this.request<PromptCategory>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, color }),
    });
  }

  async deleteCategory(id: string) {
    return this.request<{ success: boolean }>(`/categories/${id}`, {
      method: "DELETE",
    });
  }

  // ==================== STORAGE ====================

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}/storage/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    return response.json() as Promise<{ url: string; filename: string; size: number }>;
  }

  async uploadBase64(data: string, filename?: string) {
    return this.request<{ url: string; filename: string; size: number }>("/storage/upload-base64", {
      method: "POST",
      body: JSON.stringify({ data, filename }),
    });
  }

  // Get public URL for storage file
  getStorageUrl(path: string): string {
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl.replace("/api", "")}${cleanPath}`;
  }

  // ==================== APP SETTINGS (Admin) ====================

  async getAppSetting(key: string) {
    // This endpoint doesn't require auth for shared_gemini_key
    const response = await fetch(`${this.baseUrl}/app-settings/${key}`);
    if (!response.ok) {
      return null;
    }
    return response.json() as Promise<{ value: string } | null>;
  }

  async updateAppSetting(key: string, value: string) {
    return this.request<{ key: string; value: string; updated_at: string; updated_by: string }>(
      `/app-settings/${key}`,
      {
        method: "PUT",
        body: JSON.stringify({ value }),
      }
    );
  }

  async checkAdmin() {
    return this.request<{ isAdmin: boolean }>("/admin/check");
  }
}

// Types
export interface Generation {
  id: string;
  user_id: string;
  prompt: string;
  aspect: string;
  quality: string;
  output_format: string;
  provider: string;
  created_at: string;
  size_width: number;
  size_height: number;
  images: string[];
  input_images: unknown;
}

export interface CreateGenerationInput {
  id: string;
  prompt: string;
  aspect: string;
  quality: string;
  output_format: string;
  provider: string;
  size_width: number;
  size_height: number;
  images: string[];
  input_images?: unknown;
  created_at?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  generation_id: string;
  image_index: number;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  settings: Record<string, unknown>;
  updated_at?: string;
}

export interface ApiKeysInfo {
  user_id: string;
  gemini_hint?: string | null;
  replicate_hint?: string | null;
  openai_hint?: string | null;
  has_gemini?: boolean;
  has_replicate?: boolean;
  has_openai?: boolean;
  updated_at?: string;
}

export interface FullApiKeys {
  user_id: string;
  gemini_key?: string | null;
  replicate_key?: string | null;
  openai_key?: string | null;
}

export interface Prompt {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  content: string;
  tags: string[];
  category_id: string | null;
  is_favorite: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  attachments?: PromptAttachment[];
}

export interface PromptAttachment {
  id: string;
  prompt_id: string;
  user_id: string;
  url: string;
  type: "image" | "file" | "url";
  name: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface CreatePromptInput {
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  category_id?: string;
  attachments?: {
    url: string;
    type: "image" | "file" | "url";
    name?: string;
    width?: number;
    height?: number;
  }[];
}

export interface UpdatePromptInput {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  category_id?: string | null;
  is_favorite?: boolean;
  order_index?: number;
}

export interface PromptCategory {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  order_index: number;
  created_at: string;
}

// Create singleton instance
export const vpsApi = new VpsApiClient();

// Export class for custom instances
export { VpsApiClient };
