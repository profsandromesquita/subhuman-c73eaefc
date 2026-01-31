-- Add notification preference columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notify_space_updates boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_comments boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_mentions boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_announcements boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_weekly_email boolean DEFAULT false;