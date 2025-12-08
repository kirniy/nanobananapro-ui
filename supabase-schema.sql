-- Supabase Schema for Nano Banana Pro
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generations table: stores all image generation history
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  aspect TEXT NOT NULL,
  quality TEXT NOT NULL,
  output_format TEXT NOT NULL DEFAULT 'png',
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  size_width INTEGER NOT NULL,
  size_height INTEGER NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  input_images JSONB NOT NULL DEFAULT '[]'
);

-- Favorites table: tracks favorited images
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  image_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, generation_id, image_index)
);

-- User settings table: stores API keys and preferences
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_generation_id ON favorites(generation_id);

-- Row Level Security (RLS) Policies
-- Users can only access their own data

ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Generations policies
CREATE POLICY "Users can view own generations"
  ON generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
  ON generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON generations FOR DELETE
  USING (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_settings updated_at
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
