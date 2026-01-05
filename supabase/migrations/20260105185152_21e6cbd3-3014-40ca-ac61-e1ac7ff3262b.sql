-- Add access control columns to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'open';
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS required_plan text DEFAULT NULL;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS icon text DEFAULT 'ChatCircle';
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS slug text;

-- Add title to channel_posts
ALTER TABLE public.channel_posts ADD COLUMN IF NOT EXISTS title text;

-- Create channel_post_likes table
CREATE TABLE IF NOT EXISTS public.channel_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create channel_post_comments table
CREATE TABLE IF NOT EXISTS public.channel_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.channel_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.channel_post_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create channel_post_comment_likes table
CREATE TABLE IF NOT EXISTS public.channel_post_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.channel_post_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.channel_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_post_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for channel_post_likes
CREATE POLICY "Anyone can view channel post likes" ON public.channel_post_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert channel post likes" ON public.channel_post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own channel post likes" ON public.channel_post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for channel_post_comments
CREATE POLICY "Anyone can view channel post comments" ON public.channel_post_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert channel post comments" ON public.channel_post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channel post comments" ON public.channel_post_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own channel post comments" ON public.channel_post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for channel_post_comment_likes
CREATE POLICY "Anyone can view channel comment likes" ON public.channel_post_comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert channel comment likes" ON public.channel_post_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own channel comment likes" ON public.channel_post_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Function to check if user can access a channel
CREATE OR REPLACE FUNCTION public.can_access_channel(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  channel_access text;
  channel_plan text;
  user_subscription RECORD;
BEGIN
  -- Get channel access settings
  SELECT access_type, required_plan INTO channel_access, channel_plan
  FROM public.channels
  WHERE id = _channel_id;
  
  -- If channel not found or is open, allow access
  IF channel_access IS NULL OR channel_access = 'open' THEN
    RETURN true;
  END IF;
  
  -- If no user, deny access for non-open channels
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user's active subscription
  SELECT plan_type, status INTO user_subscription
  FROM public.subscriptions
  WHERE user_id = _user_id AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If user has no active subscription, deny access for subscriber/premium channels
  IF user_subscription.plan_type IS NULL THEN
    RETURN false;
  END IF;
  
  -- For 'subscribers' access type, any active subscription works
  IF channel_access = 'subscribers' THEN
    RETURN true;
  END IF;
  
  -- For 'premium' access type, require yearly plan
  IF channel_access = 'premium' THEN
    RETURN user_subscription.plan_type = 'yearly';
  END IF;
  
  RETURN false;
END;
$$;

-- Trigger to update updated_at on channel_post_comments
CREATE TRIGGER update_channel_post_comments_updated_at
  BEFORE UPDATE ON public.channel_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();