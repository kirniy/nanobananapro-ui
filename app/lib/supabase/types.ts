export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      generations: {
        Row: {
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
          input_images: Json;
        };
        Insert: {
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
          input_images?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          prompt?: string;
          aspect?: string;
          quality?: string;
          output_format?: string;
          provider?: string;
          created_at?: string;
          size_width?: number;
          size_height?: number;
          images?: string[];
          input_images?: Json;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          generation_id: string;
          image_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          generation_id: string;
          image_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          generation_id?: string;
          image_index?: number;
          created_at?: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          settings?: Json;
          updated_at?: string;
        };
      };
    };
  };
}
