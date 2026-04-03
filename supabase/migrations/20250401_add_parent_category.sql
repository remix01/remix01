-- Add support for parent categories and track auto-created categories
-- Migration: Add parent_id and is_auto_created to categories table

-- Add parent_id column (self-referencing for category hierarchy)
ALTER TABLE categories ADD COLUMN parent_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- Add is_auto_created flag to track user-submitted categories
ALTER TABLE categories ADD COLUMN is_auto_created BOOLEAN DEFAULT false;

-- Create index on parent_id for efficient hierarchy queries
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Create index on slug where is_active = true for lookups
CREATE INDEX idx_categories_slug_active ON categories(slug) WHERE is_active = true;

-- Update existing categories as manually created (not auto-created)
UPDATE categories SET is_auto_created = false WHERE is_auto_created IS NULL;

-- Create a unique constraint on (slug, is_active) to allow inactive categories with same slug
CREATE UNIQUE INDEX idx_categories_slug_unique_active ON categories(slug) WHERE is_active = true;

-- Set RLS policy to allow auto-created categories to be read by all (similar to existing categories)
-- This maintains consistency with existing RLS patterns
