import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Compute all aggregates in parallel
    const [
      updateLikes,
      podcastLikes,
      channelPostLikes,
      commentLikes,
      podcastCommentLikes,
      channelPostCommentLikes,
      updateComments,
      podcastComments,
      channelPostComments,
      savedUpdates,
      savedPodcasts,
      members,
      articles,
      podcasts,
      posts,
    ] = await Promise.all([
      supabase.from("update_likes").select("id", { count: "exact", head: true }),
      supabase.from("podcast_likes").select("id", { count: "exact", head: true }),
      supabase.from("channel_post_likes").select("id", { count: "exact", head: true }),
      supabase.from("comment_likes").select("id", { count: "exact", head: true }),
      supabase.from("podcast_comment_likes").select("id", { count: "exact", head: true }),
      supabase.from("channel_post_comment_likes").select("id", { count: "exact", head: true }),
      supabase.from("update_comments").select("id", { count: "exact", head: true }),
      supabase.from("podcast_comments").select("id", { count: "exact", head: true }),
      supabase.from("channel_post_comments").select("id", { count: "exact", head: true }),
      supabase.from("saved_updates").select("id", { count: "exact", head: true }),
      supabase.from("saved_podcasts").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("space_updates").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("podcasts").select("id", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("channel_posts").select("id", { count: "exact", head: true }).eq("is_moderated", false),
    ]);

    const total_likes =
      (updateLikes.count ?? 0) +
      (podcastLikes.count ?? 0) +
      (channelPostLikes.count ?? 0) +
      (commentLikes.count ?? 0) +
      (podcastCommentLikes.count ?? 0) +
      (channelPostCommentLikes.count ?? 0);

    const total_comments =
      (updateComments.count ?? 0) +
      (podcastComments.count ?? 0) +
      (channelPostComments.count ?? 0);

    const total_saves =
      (savedUpdates.count ?? 0) + (savedPodcasts.count ?? 0);

    // Get existing row id
    const { data: existing } = await supabase
      .from("platform_stats")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("platform_stats")
        .update({
          total_likes,
          total_comments,
          total_saves,
          total_members: members.count ?? 0,
          total_articles: articles.count ?? 0,
          total_podcasts: podcasts.count ?? 0,
          total_posts: posts.count ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }

    return new Response(
      JSON.stringify({ success: true, total_likes, total_comments, total_saves }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
