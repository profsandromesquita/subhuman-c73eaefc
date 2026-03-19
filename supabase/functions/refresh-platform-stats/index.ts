import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_STATS_FALLBACK_ID = "00000000-0000-0000-0000-000000000001";

function readCount(label: string, count: number | null, error: { message: string } | null): number {
  if (error) {
    throw new Error(`Falha ao contar ${label}: ${error.message}`);
  }
  return count ?? 0;
}

async function computePlatformStats(supabase: SupabaseClient) {
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
    readCount("update_likes", updateLikes.count, updateLikes.error) +
    readCount("podcast_likes", podcastLikes.count, podcastLikes.error) +
    readCount("channel_post_likes", channelPostLikes.count, channelPostLikes.error) +
    readCount("comment_likes", commentLikes.count, commentLikes.error) +
    readCount("podcast_comment_likes", podcastCommentLikes.count, podcastCommentLikes.error) +
    readCount("channel_post_comment_likes", channelPostCommentLikes.count, channelPostCommentLikes.error);

  const total_comments =
    readCount("update_comments", updateComments.count, updateComments.error) +
    readCount("podcast_comments", podcastComments.count, podcastComments.error) +
    readCount("channel_post_comments", channelPostComments.count, channelPostComments.error);

  const total_saves =
    readCount("saved_updates", savedUpdates.count, savedUpdates.error) +
    readCount("saved_podcasts", savedPodcasts.count, savedPodcasts.error);

  return {
    total_likes,
    total_comments,
    total_saves,
    total_members: readCount("profiles", members.count, members.error),
    total_articles: readCount("space_updates", articles.count, articles.error),
    total_podcasts: readCount("podcasts", podcasts.count, podcasts.error),
    total_posts: readCount("channel_posts", posts.count, posts.error),
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const freshStats = await computePlatformStats(supabase);

    const { data: existing, error: existingError } = await supabase
      .from("platform_stats")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (existingError) throw existingError;

    const { data: saved, error: saveError } = await supabase
      .from("platform_stats")
      .upsert(
        {
          id: existing?.id ?? PLATFORM_STATS_FALLBACK_ID,
          ...freshStats,
        },
        { onConflict: "id" }
      )
      .select("total_likes, total_comments, total_saves, total_members, total_articles, total_podcasts, total_posts, updated_at")
      .single();

    if (saveError) throw saveError;

    return new Response(JSON.stringify({ success: true, stats: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao atualizar estatísticas";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
