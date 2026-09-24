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
      const todayStart = `${today}T00:00:00.000Z`;
      const monthStartDate = new Date();
      monthStartDate.setUTCDate(1);
      monthStartDate.setUTCHours(0, 0, 0, 0);

      const [
        dailyContentResult,
        pendingDailyContentResult,
        messagesResult,
        memoriesResult,
        totalMemoriesResult,
        recentMemoriesResult,
        aiTodayResult,
        aiMonthResult,
        notificationStatusResult,
      ] = await Promise.all([
        supabase
          .from("daily_content")
          .select("content_date", { count: "exact" })
          .eq("relationship_id", relationshipId)
          .eq("approval_status", "approved")
          .gte("content_date", today),
        supabase
          .from("daily_content")
          .select("id", { count: "exact", head: true })
          .eq("relationship_id", relationshipId)
          .eq("approval_status", "pending"),
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
        supabase
          .from("memories")
          .select("id, caption, taken_at, created_at")
          .eq("relationship_id", relationshipId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("ai_generations")
          .select("total_tokens, status, generation_type, created_at")
          .eq("relationship_id", relationshipId)
          .gte("created_at", todayStart),
        supabase
          .from("ai_generations")
          .select("total_tokens, status, generation_type, created_at")
          .eq("relationship_id", relationshipId)
          .gte("created_at", monthStartDate.toISOString())
          .order("created_at", { ascending: false }),
        supabase.rpc("get_relationship_notification_summary", {
          target_relationship_id: relationshipId,
        }),
      ]);

      const failedQueries = [
        dailyContentResult,
        pendingDailyContentResult,
        messagesResult,
        memoriesResult,
        totalMemoriesResult,
        recentMemoriesResult,
        aiTodayResult,
        aiMonthResult,
        notificationStatusResult,
      ].filter((result) => result.error);
      if (failedQueries.length > 0) {
        console.error("Admin summary query failed:", failedQueries.map((result) => result.error));
        response.status(500).json({ error: "Some dashboard data could not be loaded." });
        return;
      }

      const dailyContentToday = dailyContentResult.data?.some((d) => d.content_date === today) ?? false;
      const dailyContentUpcoming = (dailyContentResult.count ?? 0) - (dailyContentToday ? 1 : 0);

      const scheduledMessages = messagesResult.data?.filter((m) => m.status === "scheduled").length ?? 0;
      const publishedMessages = messagesResult.data?.filter((m) => m.status === "published").length ?? 0;

      const memoriesThisWeek = memoriesResult.count ?? 0;
      const totalMemories = totalMemoriesResult.count ?? 0;
      const tokensToday = (aiTodayResult.data ?? []).reduce(
        (total, row) => total + Number(row.total_tokens ?? 0),
        0,
      );
      const tokensThisMonth = (aiMonthResult.data ?? []).reduce(
        (total, row) => total + Number(row.total_tokens ?? 0),
        0,
      );
      const notificationStatus = notificationStatusResult.data?.[0];
      const failuresToday = (aiTodayResult.data ?? []).filter((row) => row.status === "error");
      const failuresThisMonth = (aiMonthResult.data ?? []).filter((row) => row.status === "error");
      const latestGeneration = aiMonthResult.data?.[0] ?? null;

      response.json({
        dailyContent: {
          today: dailyContentToday,
          upcoming: Math.max(0, dailyContentUpcoming),
          pendingReview: pendingDailyContentResult.count ?? 0,
        },
        messages: {
          scheduled: scheduledMessages,
          published: publishedMessages,
        },
        memories: {
          thisWeek: memoriesThisWeek,
          total: totalMemories,
          recent: (recentMemoriesResult.data ?? []).map((memory) => ({
            id: memory.id,
            caption: memory.caption,
            takenAt: memory.taken_at,
            createdAt: memory.created_at,
          })),
        },
        aiUsage: {
          tokensToday,
          tokensThisMonth,
          failuresToday: failuresToday.length,
          failuresThisMonth: failuresThisMonth.length,
          latestStatus: latestGeneration?.status ?? null,
          latestType: latestGeneration?.generation_type ?? null,
          latestAt: latestGeneration?.created_at ?? null,
          recentFailures: failuresThisMonth.slice(0, 5).map((row) => ({
            type: row.generation_type,
            createdAt: row.created_at,
          })),
        },
        notifications: {
          enabledDevices: Number(notificationStatus?.enabled_devices ?? 0),
          totalDevices: Number(notificationStatus?.total_devices ?? 0),
          lastDeviceSeenAt: notificationStatus?.last_device_seen_at ?? null,
          deliveriesThisWeek: Number(notificationStatus?.deliveries_7d ?? 0),
          latestDelivery: notificationStatus?.last_delivery_at
            ? {
                category: notificationStatus.last_delivery_category,
                deliveredAt: notificationStatus.last_delivery_at,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Admin summary error:", error);
      response.status(500).json({ error: "Failed to load dashboard summary." });
    }
  });

  return router;
}
