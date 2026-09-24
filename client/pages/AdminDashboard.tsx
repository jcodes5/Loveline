import { useEffect, useState } from "react";
import { ArrowRight, Bell, Bot, CalendarDays, Heart, MessageSquare, RefreshCw, Sparkles, TrendingUp, HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useProfileNames } from "@/contexts/ProfileNamesContext";
import { useTimeGreeting } from "@/hooks/use-time-greeting";

interface AdminSummary {
  dailyContent: {
    today: boolean;
    upcoming: number;
    pendingReview: number;
  };
  messages: {
    scheduled: number;
    published: number;
  };
  memories: {
    thisWeek: number;
    total: number;
    recent: Array<{
      id: string;
      caption: string;
      takenAt: string | null;
      createdAt: string;
    }>;
  };
  aiUsage: {
    tokensToday: number;
    tokensThisMonth: number;
    failuresToday: number;
    failuresThisMonth: number;
    latestStatus: "success" | "error" | null;
    latestType: string | null;
    latestAt: string | null;
    recentFailures: Array<{ type: string; createdAt: string }>;
  };
  notifications: {
    enabledDevices: number;
    totalDevices: number;
    lastDeviceSeenAt: string | null;
    deliveriesThisWeek: number;
    latestDelivery: { category: string; deliveredAt: string } | null;
  };
}

function formatStatusDate(value: string | null) {
  if (!value) return "No activity yet";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminDashboard() {
  const greeting = useTimeGreeting();
  const { displayName } = useProfileNames();
  const { session } = useAuth();
  const { relationship } = useRelationship();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!session?.access_token || !relationship) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/admin/summary?relationshipId=${encodeURIComponent(relationship.id)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!response.ok) {
        throw new Error("Dashboard summary request failed.");
      }
      setSummary(await response.json() as AdminSummary);
    } catch (err) {
      setSummary(null);
      setError("Failed to load dashboard. Please try again.");
      console.error("Admin dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [session, relationship]);

  const statCards = summary ? [
    {
      title: "Today's Daily Content",
      value: summary.dailyContent.today ? "Ready" : "Not set",
      description: [
        summary.dailyContent.upcoming > 0 ? `${summary.dailyContent.upcoming} upcoming` : null,
        summary.dailyContent.pendingReview > 0 ? `${summary.dailyContent.pendingReview} awaiting review` : null,
      ].filter(Boolean).join(" · ") || "No upcoming content",
      icon: CalendarDays,
      color: "bg-primary-soft text-primary",
      action: summary.dailyContent.today ? null : {
        label: summary.dailyContent.pendingReview > 0 ? "Review content" : "Create today",
        href: "/admin/daily-content",
      },
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
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{greeting}, {displayName || "love"}. Here&apos;s your space.</h1>
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
              <Button asChild variant="outline" className="h-14 rounded-xl flex flex-col items-start gap-2 p-4 border-border/50 hover:border-primary/30">
                <Link to="/admin/mood-mappings">
                  <div className="grid size-10 place-items-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"><HeartPulse className="size-5" aria-hidden="true" /></div>
                  <span className="font-semibold">Mood Mappings</span>
                  <span className="text-xs text-muted-foreground">Configure mood responses</span>
                </Link>
              </Button>
            </div>
          </section>

          <section className="mt-12 grid gap-6 lg:grid-cols-2" aria-label="Recent activity and delivery health">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Recent memories</CardTitle>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to="/memories">View all <ArrowRight className="ml-1 size-3.5" aria-hidden="true" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                {summary.memories.recent.length ? (
                  <ul className="divide-y divide-border/70">
                    {summary.memories.recent.map((memory) => (
                      <li key={memory.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                        <span className="min-w-0 truncate text-sm font-medium">
                          {memory.caption.trim() || "A saved memory"}
                        </span>
                        <time className="shrink-0 text-xs text-muted-foreground" dateTime={memory.createdAt}>
                          {formatStatusDate(memory.takenAt ? `${memory.takenAt}T12:00:00` : memory.createdAt)}
                        </time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No memories have been added yet.</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bell className="size-4" aria-hidden="true" />Push delivery</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Enabled devices</p>
                    <p className="mt-1 font-semibold">{summary.notifications.enabledDevices} / {summary.notifications.totalDevices}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recent deliveries</p>
                    <p className="mt-1 font-semibold">{summary.notifications.deliveriesThisWeek} in the past 7 days</p>
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Last delivered: {summary.notifications.latestDelivery
                      ? `${summary.notifications.latestDelivery.category.replace(/_/g, " ")} · ${formatStatusDate(summary.notifications.latestDelivery.deliveredAt)}`
                      : "No successful push deliveries recorded"}
                  </p>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Last device activity: {formatStatusDate(summary.notifications.lastDeviceSeenAt)}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Bot className="size-4" aria-hidden="true" />AI generation status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      Latest: {summary.aiUsage.latestStatus
                        ? `${summary.aiUsage.latestType ?? "Generation"} · ${summary.aiUsage.latestStatus}`
                        : "No generations this month"}
                    </span>
                    <span className={summary.aiUsage.failuresToday ? "font-semibold text-destructive" : "font-semibold text-success"}>
                      {summary.aiUsage.failuresToday} failed today
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{summary.aiUsage.failuresThisMonth} failures this month</p>
                  {summary.aiUsage.recentFailures.length > 0 && (
                    <ul className="space-y-1 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                      {summary.aiUsage.recentFailures.slice(0, 3).map((failure, index) => (
                        <li key={`${failure.createdAt}-${index}`} className="flex justify-between gap-3">
                          <span>{failure.type}</span>
                          <time dateTime={failure.createdAt}>{formatStatusDate(failure.createdAt)}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
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
                  <p className="text-sm text-muted-foreground">Reminder checks run hourly using your local notification preferences.</p>
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
