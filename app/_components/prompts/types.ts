export type PromptAttachment = {
  id: string;
  prompt_id: string;
  user_id: string;
  url: string;
  type: "image" | "file" | "url";
  name: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

export type PromptCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  order_index: number;
  created_at: string;
};

export type Prompt = {
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
};

export type CreatePromptInput = {
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
};

export type UpdatePromptInput = Partial<CreatePromptInput> & {
  is_favorite?: boolean;
  order_index?: number;
};
