import { Router, type Request, type Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthenticatedRequest = Request & {
  authUserId?: string;
};

function getSupabaseForRequest(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.authorization;

  if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith("Bearer ")) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticate(request: Request) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, userId: data.user.id };
}

async function requireOwner(supabase: SupabaseClient, userId: string, relationshipId: string) {
  const { data, error } = await supabase
    .from("relationships")
    .select("id")
    .eq("id", relationshipId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !error && !!data;
}

export function createAdminSummaryRouter() {
  const router = Router();

  router.get("/summary", async (request: AuthenticatedRequest, response: Response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to view dashboard." });
        return;
      }
      const { supabase, userId } = auth;

      const relationshipId = String(request.query.relationshipId ?? "");
      if (!relationshipId) {
        response.status(400).json({ error: "A relationship is required." });
        return;
      }

      const isOwner = await requireOwner(supabase, userId, relationshipId);
      if (!isOwner) {
        response.status(403).json({ error: "Only the relationship owner can view the dashboard." });
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        dailyContentResult,
        messagesResult,
        memoriesResult,
        totalMemoriesResult,
      ] = await Promise.all([
        supabase
          .from("daily_content")
          .select("content_date", { count: "exact" })
          .eq("relationship_id", relationshipId)
          .gte("content_date", today),
        supabase
          .from("personal_messages")
          .select("status, scheduled_for", { count: "exact" })
          .eq("relationship_id", relationshipId)
          .in("status", ["scheduled", "published"]),
        supabase
          .from("memories")
          .select("created_at", { count: "exact" })
          .eq("relationship_id", relationshipId)
          .gte("created_at", weekAgo),
        supabase
          .from("memories")
          .select("*", { count: "exact", head: true })
          .eq("relationship_id", relationshipId),
      ]);

      const dailyContentToday = dailyContentResult.data?.some((d) => d.content_date === today) ?? false;
      const dailyContentUpcoming = (dailyContentResult.count ?? 0) - (dailyContentToday ? 1 : 0);

      const scheduledMessages = messagesResult.data?.filter((m) => m.status === "scheduled").length ?? 0;
      const publishedMessages = messagesResult.data?.filter((m) => m.status === "published").length ?? 0;

      const memoriesThisWeek = memoriesResult.count ?? 0;
      const totalMemories = totalMemoriesResult.count ?? 0;

      response.json({
        dailyContent: {
          today: dailyContentToday,
          upcoming: Math.max(0, dailyContentUpcoming),
        },
        messages: {
          scheduled: scheduledMessages,
          published: publishedMessages,
        },
        memories: {
          thisWeek: memoriesThisWeek,
          total: totalMemories,
        },
        aiUsage: {
          tokensToday: 0,
          tokensThisMonth: 0,
        },
      });
    } catch (error) {
      console.error("Admin summary error:", error);
      response.status(500).json({ error: "Failed to load dashboard summary." });
    }
  });

  return router;
}