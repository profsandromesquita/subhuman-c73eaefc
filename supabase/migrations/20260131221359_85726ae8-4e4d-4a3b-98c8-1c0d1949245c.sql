-- Performance indexes for Subhumano platform

-- Index for fetching published updates by space (used in SpaceDetail, Home)
CREATE INDEX IF NOT EXISTS idx_space_updates_space_published 
  ON space_updates(space_id, is_published, published_at DESC);

-- Index for fetching non-moderated posts by channel (used in ChannelDetail, Channels)
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_moderated 
  ON channel_posts(channel_id, is_moderated, created_at DESC);

-- Index for user subscription lookups (used in useSubscription, SubscriptionGuard)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
  ON subscriptions(user_id, status);

-- Index for user space subscriptions (used in Home, useSubscribedSpaces)
CREATE INDEX IF NOT EXISTS idx_user_space_subscriptions_user 
  ON user_space_subscriptions(user_id);

-- Index for user notifications (used in Notifications page)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON notifications(user_id, is_read, created_at DESC);

-- Index for update likes by update_id (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_update_likes_update_id 
  ON update_likes(update_id);

-- Index for update comments by update_id (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_update_comments_update_id 
  ON update_comments(update_id);

-- Index for channel post likes by post_id (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_channel_post_likes_post_id 
  ON channel_post_likes(post_id);

-- Index for channel post comments by post_id (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_channel_post_comments_post_id 
  ON channel_post_comments(post_id);

-- Index for channel post media by post_id (used in batch queries)
CREATE INDEX IF NOT EXISTS idx_channel_post_media_post_id 
  ON channel_post_media(post_id);