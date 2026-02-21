export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_assistant_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          knowledge_base: Json | null
          max_tokens: number
          model: string
          system_instruction: string | null
          system_prompt: string
          temperature: number
          top_p: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_base?: Json | null
          max_tokens?: number
          model?: string
          system_instruction?: string | null
          system_prompt?: string
          temperature?: number
          top_p?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_base?: Json | null
          max_tokens?: number
          model?: string
          system_instruction?: string | null
          system_prompt?: string
          temperature?: number
          top_p?: number
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      channel_post_comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_post_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "channel_post_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_post_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "channel_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "channel_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "channel_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "channel_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_post_media: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          post_id: string | null
          sort_order: number | null
          youtube_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          post_id?: string | null
          sort_order?: number | null
          youtube_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          post_id?: string | null
          sort_order?: number | null
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_post_stats"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "channel_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "channel_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          author_id: string | null
          channel_id: string
          content: string
          created_at: string
          id: string
          is_moderated: boolean
          is_reported: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_reported?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_reported?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          access_type: string
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          required_plan: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          required_plan?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          required_plan?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "update_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          city: string | null
          cnpj: string | null
          created_at: string
          description: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          is_active: boolean
          is_verified: boolean
          linkedin_url: string | null
          logo_url: string | null
          name: string
          owner_id: string
          slug: string
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          slug: string
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          cnpj?: string | null
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          is_active?: boolean
          is_verified?: boolean
          linkedin_url?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          slug?: string
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          id: string
          job_title: string | null
          requested_at: string
          responded_at: string | null
          role: string
          status: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          job_title?: string | null
          requested_at?: string
          responded_at?: string | null
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          job_title?: string | null
          requested_at?: string
          responded_at?: string | null
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_insights: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          raw_analysis: string | null
          sources_summary: Json
          status: string
          suggestions: Json
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          raw_analysis?: string | null
          sources_summary?: Json
          status?: string
          suggestions?: Json
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          raw_analysis?: string | null
          sources_summary?: Json
          status?: string
          suggestions?: Json
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          id: string
          ip_address: string | null
          redeemed_at: string
          subscription_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          ip_address?: string | null
          redeemed_at?: string
          subscription_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          ip_address?: string | null
          redeemed_at?: string
          subscription_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "promo_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_purchases: {
        Row: {
          event_id: string
          external_id: string | null
          id: string
          purchased_at: string
          status: string
          user_id: string
        }
        Insert: {
          event_id: string
          external_id?: string | null
          id?: string
          purchased_at?: string
          status?: string
          user_id: string
        }
        Update: {
          event_id?: string
          external_id?: string | null
          id?: string
          purchased_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_purchases_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string
          ends_at: string
          event_id: string
          id: string
          session_url: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          event_id: string
          id?: string
          session_url?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          event_id?: string
          id?: string
          session_url?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          checkout_url: string | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          is_active: boolean
          is_free: boolean
          is_published: boolean
          location: string | null
          max_participants: number | null
          modality: string
          price: number | null
          slug: string
          ticto_offer_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          checkout_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          modality?: string
          price?: number | null
          slug?: string
          ticto_offer_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          checkout_url?: string | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          is_active?: boolean
          is_free?: boolean
          is_published?: boolean
          location?: string | null
          max_participants?: number | null
          modality?: string
          price?: number | null
          slug?: string
          ticto_offer_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          author_id: string
          context_id: string
          context_type: string
          created_at: string
          id: string
          mentioned_company_id: string | null
          mentioned_user_id: string | null
        }
        Insert: {
          author_id: string
          context_id: string
          context_type: string
          created_at?: string
          id?: string
          mentioned_company_id?: string | null
          mentioned_user_id?: string | null
        }
        Update: {
          author_id?: string
          context_id?: string
          context_type?: string
          created_at?: string
          id?: string
          mentioned_company_id?: string | null
          mentioned_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_mentioned_company_id_fkey"
            columns: ["mentioned_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_url: string | null
          sender_id: string | null
          space_id: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_url?: string | null
          sender_id?: string | null
          space_id?: string | null
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_url?: string | null
          sender_id?: string | null
          space_id?: string | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          provider: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      podcast_comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "podcast_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          podcast_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          podcast_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          podcast_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "podcast_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcast_comments_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_likes: {
        Row: {
          created_at: string | null
          id: string
          podcast_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          podcast_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          podcast_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_likes_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_listens: {
        Row: {
          completed: boolean
          id: string
          podcast_id: string
          progress_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          podcast_id: string
          progress_seconds?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          podcast_id?: string
          progress_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcast_listens_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          audio_url: string
          author_id: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          id: string
          is_published: boolean | null
          published_at: string | null
          slug: string
          space_id: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audio_url: string
          author_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug: string
          space_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audio_url?: string
          author_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          slug?: string
          space_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          ai_experience_level: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cnpj: string | null
          company_name: string | null
          created_at: string
          education: string | null
          full_name: string | null
          goals: string | null
          hobbies: string | null
          id: string
          industry: string | null
          instagram_url: string | null
          job_title: string | null
          linkedin_url: string | null
          notify_announcements: boolean | null
          notify_comments: boolean | null
          notify_daily_email: boolean | null
          notify_mentions: boolean | null
          notify_space_updates: boolean | null
          occupation_type: string | null
          skills: string[] | null
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_type?: string
          ai_experience_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          education?: string | null
          full_name?: string | null
          goals?: string | null
          hobbies?: string | null
          id: string
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          notify_announcements?: boolean | null
          notify_comments?: boolean | null
          notify_daily_email?: boolean | null
          notify_mentions?: boolean | null
          notify_space_updates?: boolean | null
          occupation_type?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_type?: string
          ai_experience_level?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnpj?: string | null
          company_name?: string | null
          created_at?: string
          education?: string | null
          full_name?: string | null
          goals?: string | null
          hobbies?: string | null
          id?: string
          industry?: string | null
          instagram_url?: string | null
          job_title?: string | null
          linkedin_url?: string | null
          notify_announcements?: boolean | null
          notify_comments?: boolean | null
          notify_daily_email?: boolean | null
          notify_mentions?: boolean | null
          notify_space_updates?: boolean | null
          occupation_type?: string | null
          skills?: string[] | null
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      promo_coupons: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          current_uses: number
          days_granted: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          plan_type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          days_granted?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          plan_type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          current_uses?: number
          days_granted?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          plan_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          device_info: Json | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          device_info?: Json | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          device_info?: Json | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rag_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          priority: number
          tags: string[] | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          tags?: string[] | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          priority?: number
          tags?: string[] | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "rag_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          layer: string
          metadata: Json | null
          priority: number
          slug: string
          source_content: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          layer: string
          metadata?: Json | null
          priority?: number
          slug: string
          source_content: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          layer?: string
          metadata?: Json | null
          priority?: number
          slug?: string
          source_content?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rag_query_logs: {
        Row: {
          chunks_count: number | null
          chunks_retrieved: string[] | null
          created_at: string | null
          id: string
          intent: string | null
          latency_ms: number | null
          query: string
          response_tokens: number | null
          user_id: string | null
        }
        Insert: {
          chunks_count?: number | null
          chunks_retrieved?: string[] | null
          created_at?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          query: string
          response_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          chunks_count?: number | null
          chunks_retrieved?: string[] | null
          created_at?: string | null
          id?: string
          intent?: string | null
          latency_ms?: number | null
          query?: string
          response_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_podcasts: {
        Row: {
          created_at: string | null
          id: string
          podcast_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          podcast_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          podcast_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_podcasts_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_updates: {
        Row: {
          created_at: string | null
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_updates_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_update_stats"
            referencedColumns: ["update_id"]
          },
          {
            foreignKeyName: "saved_updates_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_update_media: {
        Row: {
          created_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          sort_order: number | null
          update_id: string
          youtube_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          sort_order?: number | null
          update_id: string
          youtube_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          sort_order?: number | null
          update_id?: string
          youtube_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "space_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_update_stats"
            referencedColumns: ["update_id"]
          },
          {
            foreignKeyName: "space_update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      space_updates: {
        Row: {
          author_id: string | null
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          media_type: string | null
          published_at: string | null
          read_time_minutes: number | null
          scheduled_at: string | null
          slug: string
          space_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          media_type?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          scheduled_at?: string | null
          slug: string
          space_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          media_type?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          scheduled_at?: string | null
          slug?: string
          space_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_updates_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          external_id: string | null
          id: string
          plan_type: string
          provider: string | null
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          plan_type: string
          provider?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          plan_type?: string
          provider?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      update_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          update_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          update_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          update_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "update_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_update_stats"
            referencedColumns: ["update_id"]
          },
          {
            foreignKeyName: "update_comments_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      update_likes: {
        Row: {
          created_at: string | null
          id: string
          update_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          update_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          update_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_likes_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_update_stats"
            referencedColumns: ["update_id"]
          },
          {
            foreignKeyName: "update_likes_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "space_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_space_subscriptions: {
        Row: {
          id: string
          space_id: string
          subscribed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          space_id: string
          subscribed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          space_id?: string
          subscribed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_space_subscriptions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      channel_post_stats: {
        Row: {
          comments_count: number | null
          likes_count: number | null
          post_id: string | null
        }
        Relationships: []
      }
      channel_stats: {
        Row: {
          channel_id: string | null
          last_activity: string | null
          members_count: number | null
          posts_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      space_update_stats: {
        Row: {
          comments_count: number | null
          likes_count: number | null
          update_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_channel: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      generate_slug: { Args: { title: string }; Returns: string }
      get_unread_notifications_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_emails_admin: {
        Args: never
        Returns: {
          email: string
          user_id: string
        }[]
      }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      search_rag_chunks: {
        Args: {
          filter_layer?: string
          filter_tags?: string[]
          include_constitution?: boolean
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          layer: string
          priority: number
          similarity: number
          tags: string[]
        }[]
      }
      search_rag_chunks_lexical: {
        Args: {
          filter_layer?: string
          filter_tags?: string[]
          include_constitution?: boolean
          match_count?: number
          query_text: string
        }
        Returns: {
          content: string
          document_id: string
          document_title: string
          id: string
          layer: string
          priority: number
          rank: number
          tags: string[]
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
