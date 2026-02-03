-- Add social media URL columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS instagram_url text,
ADD COLUMN IF NOT EXISTS linkedin_url text;