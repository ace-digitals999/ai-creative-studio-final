
-- Migration: 20251101184538

-- Migration: 20251004075246
-- Create gallery_images table for storing generated images
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Users can view their own images
CREATE POLICY "Users can view their own gallery images" 
ON public.gallery_images 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can view public images from anyone
CREATE POLICY "Anyone can view public gallery images" 
ON public.gallery_images 
FOR SELECT 
USING (is_public = true);

-- Users can insert their own images
CREATE POLICY "Users can create their own gallery images" 
ON public.gallery_images 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
CREATE POLICY "Users can update their own gallery images" 
ON public.gallery_images 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own gallery images" 
ON public.gallery_images 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gallery_images_updated_at
BEFORE UPDATE ON public.gallery_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20251103040718
-- Ensure gallery_images table exists with correct schema
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  style TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can view their own gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can create their own gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can update their own gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Users can delete their own gallery images" ON public.gallery_images;

-- Recreate RLS policies
CREATE POLICY "Anyone can view public gallery images"
  ON public.gallery_images
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own gallery images"
  ON public.gallery_images
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gallery images"
  ON public.gallery_images
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gallery images"
  ON public.gallery_images
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gallery images"
  ON public.gallery_images
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create or replace trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gallery_images_updated_at ON public.gallery_images;

CREATE TRIGGER update_gallery_images_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20251103040753
-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;
