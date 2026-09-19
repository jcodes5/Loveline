import { useEffect, useState } from "react";
import { ArrowRight, Bell, Bot, CalendarDays, Heart, MessageSquare, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

interface AdminSummary {
  dailyContent: {
    today: boolean;
    upcoming: number;
  };
  messages: {
    scheduled: number;
    published: number;
  };
  memories: {
    thisWeek: number;
    total: number;
  };
  aiUsage: {
    tokensToday: number;
    tokensThisMonth: number;
  };
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!user || !relationship || !supabase) return;

    try {
      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [
        dailyContentResult,
        messagesResult,
        memoriesResult,
      ] = await Promise.all([
        supabase
          .from("daily_content")
          .select("content_date", { count: "exact" })
          .eq("relationship_id", relationship.id)
          .gte("content_date", today),
        supabase
          .from("personal_messages")
          .select("status, scheduled_for", { count: "exact" })
          .eq("relationship_id", relationship.id)
          .in("status", ["scheduled", "published"]),
        supabase
          .from("memories")
          .select("created_at", { count: "exact" })
          .eq("relationship_id", relationship.id)
          .gte("created_at", weekAgo),
      ]);

      const dailyContentToday = dailyContentResult.data?.some((d) => d.content_date === today) ?? false;
      const dailyContentUpcoming = (dailyContentResult.count ?? 0) - (dailyContentToday ? 1 : 0);

      const scheduledMessages = messagesResult.data?.filter((m) => m.status === "scheduled").length ?? 0;
      const publishedMessages = messagesResult.data?.filter((m) => m.status === "published").length ?? 0;

      const memoriesThisWeek = memoriesResult.count ?? 0;

      const { count: totalMemories } = await supabase
        .from("memories")
        .select("*", { count: "exact", head: true })
        .eq("relationship_id", relationship.id);

      setSummary({
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
          total: totalMemories ?? 0,
        },
        aiUsage: {
          tokensToday: 0,
          tokensThisMonth: 0,
        },
      });
    } catch (err) {
      setError("Failed to load dashboard. Please try again.");
      console.error("Admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user, relationship]);

  const statCards = summary ? [
    {
      title: "Today's Daily Content",
      value: summary.dailyContent.today ? "Ready" : "Not set",
      description: summary.dailyContent.upcoming > 0 ? `${summary.dailyContent.upcoming} upcoming` : "No upcoming content",
      icon: CalendarDays,
      color: "bg-primary-soft text-primary",
      action: summary.dailyContent.today ? null : { label: "Create today", href: "/admin/daily-content" },
    },
    {
      title: "Scheduled Messages",
      value: summary.messages.scheduled.toString(),
      description: `${summary.messages.published} published`,
      icon: MessageSquare,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
      action: { label: "Manage", href: "/admin/messages" },
    },
    {
      title: "Memories This Week",
      value: summary.memories.thisWeek.toString(),
      description: `${summary.memories.total} total`,
      icon: Heart,
      color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
      action: { label: "View all", href: "/memories" },
    },
    {
      title: "AI Usage This Month",
      value: `${(summary.aiUsage.tokensThisMonth / 1000).toFixed(1)}k tokens`,
      description: `${summary.aiUsage.tokensToday} today`,
      icon: Bot,
      color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      action: { label: "AI Workspace", href: "/admin/ai-workspace" },
    },
  ] : [];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Back to Loveline
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Owner space / Dashboard</p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Good morning. Here&apos;s your space.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">A quick glance at what&apos;s happening in your Loveline.</p>
        </div>
        <Button variant="outline" className="h-11 rounded-full" onClick={fetchSummary}>
          <RefreshCw className="size-4 mr-2" aria-hidden="true" />
          Refresh
        </Button>
      </header>

      {error && (
        <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
          <Button variant="ghost" className="ml-4 h-8 rounded-full px-3" onClick={fetchSummary}>
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true" aria-label="Loading dashboard">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <>
          <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" aria-labelledby="stats-title">
            <h2 id="stats-title" className="sr-only">Dashboard statistics</h2>
            {statCards.map((card, index) => (
              <Card key={index} className="border-border/50">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{card.title}</p>
                    <p className="font-display mt-1 text-3xl font-semibold tracking-[-0.02em]">{card.value}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
                  </div>
                  <div className={`grid size-11 place-items-center rounded-2xl ${card.color}`}>
                    <card.icon className="size-5" aria-hidden="true" />
                  </div>
                </CardHeader>
                {card.action && (
                  <CardContent className="pt-0">
                    <Button asChild variant="ghost" className="w-full h-10 rounded-full text-sm">
                      <Link to={card.action.href}>{card.action.label} <ArrowRight className="size-3.5 ml-1" aria-hidden="true" /></Link>
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </section>

          <section className="mt-12" aria-labelledby="quick-actions-title">
            <h2 id="quick-actions-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Quick actions</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" className="h-14 rounded-xl flex flex-col items-start gap-2 p-4 border-border/50 hover:border-primary/30">
                <Link to="/admin/daily-content">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><CalendarDays className="size-5" aria-hidden="true" /></div>
                  <span className="font-semibold">Daily Content</span>
                  <span className="text-xs text-muted-foreground">Write or schedule today&apos;s note</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-xl flex flex-col items-start gap-2 p-4 border-border/50 hover:border-primary/30">
                <Link to="/admin/messages">
                  <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><MessageSquare className="size-5" aria-hidden="true" /></div>
                  <span className="font-semibold">Messages</span>
                  <span className="text-xs text-muted-foreground">Create, schedule, or review</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-xl flex flex-col items-start gap-2 p-4 border-border/50 hover:border-primary/30">
                <Link to="/admin/ai-workspace">
                  <div className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"><Sparkles className="size-5" aria-hidden="true" /></div>
                  <span className="font-semibold">AI Workspace</span>
                  <span className="text-xs text-muted-foreground">Generate content drafts</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-14 rounded-xl flex flex-col items-start gap-2 p-4 border-border/50 hover:border-primary/30">
                <Link to="/more">
                  <div className="grid size-10 place-items-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400"><Heart className="size-5" aria-hidden="true" /></div>
                  <span className="font-semibold">Special Dates</span>
                  <span className="text-xs text-muted-foreground">Manage anniversaries & milestones</span>
                </Link>
              </Button>
            </div>
          </section>

          <section className="mt-12" aria-labelledby="upcoming-title">
            <div className="flex items-center justify-between gap-4">
              <h2 id="upcoming-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Upcoming this week</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="size-4" aria-hidden="true" />Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Next scheduled: Daily reminders at 06:00 UTC</p>
                  <Button asChild variant="ghost" className="mt-3 w-full h-10 rounded-full">
                    <Link to="/settings/notifications">Manage preferences</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="size-4" aria-hidden="true" />Relationship</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Days together counter updates daily</p>
                  <Button asChild variant="ghost" className="mt-3 w-full h-10 rounded-full">
                    <Link to="/timeline">View timeline</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}