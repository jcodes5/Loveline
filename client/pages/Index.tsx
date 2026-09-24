import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  Image as ImageIcon,
  MailPlus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/typography/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import MoodCheckIn from "@/components/mood/MoodCheckIn";
import { useLatestPersonalMessage } from "@/hooks/use-personal-messages";
import { useDailyContent, formatDailyDate } from "@/hooks/use-daily-content";
import { useMemories } from "@/hooks/use-memories";
import { useAuth } from "@/contexts/AuthContext";
import { isFirebaseMessagingConfigured, registerForNotifications } from "@/lib/firebase-messaging";
import { supabase } from "@/lib/supabase";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useProfileNames } from "@/contexts/ProfileNamesContext";
import { useTimeGreeting } from "@/hooks/use-time-greeting";
import { toast } from "sonner";

export default function Index() {
  const [noteOpen, setNoteOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [notificationPromptDismissed, setNotificationPromptDismissed] = useState(false);
  const { session } = useAuth();
  const { relationship } = useRelationship();
  const { displayName, partnerDisplayName } = useProfileNames();
  const greeting = useTimeGreeting();
  const { content, loading, status, retry } = useDailyContent();
  const {
    message: personalMessage,
    loading: messageLoading,
    error: messageError,
    refresh: retryPersonalMessage,
  } = useLatestPersonalMessage();
  const { memories, loading: memoriesLoading } = useMemories();

  useEffect(() => {
    if (!session?.user || !relationship || notificationPromptDismissed || !isFirebaseMessagingConfigured) {
      return;
    }
    const dismissed = localStorage.getItem(`loveline-notif-prompt-dismissed-${session.user.id}`);
    if (dismissed) {
      setNotificationPromptDismissed(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowNotificationPrompt(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [session?.user, relationship, notificationPromptDismissed]);

  const handleEnableNotifications = async () => {
    try {
      const token = await registerForNotifications();
      if (!session?.user || !relationship || !supabase) return;
      await supabase.from("notification_devices").upsert(
        {
          relationship_id: relationship.id,
          user_id: session.user.id,
          token,
          platform: "web",
          enabled: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id,user_id,token" },
      );
      toast.success("Notifications enabled!");
      setShowNotificationPrompt(false);
      setNotificationPromptDismissed(true);
      localStorage.setItem(`loveline-notif-prompt-dismissed-${session.user.id}`, "true");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable notifications.");
    }
  };

  const handleDismissPrompt = () => {
    setShowNotificationPrompt(false);
    setNotificationPromptDismissed(true);
    if (session?.user) {
      localStorage.setItem(`loveline-notif-prompt-dismissed-${session.user.id}`, "true");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <Reveal className="animate-soft-rise flex items-start justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-primary-dark">{formatDailyDate()}</p>
          <h1 className="font-display mt-2 text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-5xl">
            {greeting}, <span className="text-gradient">{displayName || "love"}.</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
            I hope today gives you a few quiet reasons to smile.
          </p>
        </div>
        <div className="hidden size-14 shrink-0 place-items-center rounded-full border border-primary-soft bg-surface text-primary shadow-subtle sm:grid">
          <Heart className="size-6 animate-heartbeat fill-primary-soft" aria-hidden="true" />
        </div>
      </Reveal>

      {loading && (
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-surface px-3.5 py-2 text-sm text-muted-foreground shadow-subtle" role="status" aria-live="polite">
          <RefreshCw className="size-4 animate-spin text-primary" aria-hidden="true" />
          Opening today&apos;s little note…
        </div>
      )}
      {status === "error" && !loading && (
        <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>We couldn&apos;t load today&apos;s personal note. Your saved Loveline content is still here.</span>
          <Button variant="ghost" className="h-9 shrink-0 rounded-full px-3 text-destructive hover:text-destructive" onClick={retry}>
            Try again
          </Button>
        </div>
      )}
      {status === "empty" && !loading && (
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/10 bg-primary-soft/35 px-3.5 py-2 text-sm text-primary-dark">
          <Heart className="size-4 fill-current" aria-hidden="true" />
          A quiet note for today
        </div>
      )}

      <Reveal className="mt-9" delay={0.05}>
      <section className="overflow-hidden rounded-[28px] border border-primary/10 bg-gradient-to-br from-[#fff4f2] via-[#fffaf8] to-[#f7e6ec] shadow-card dark:from-[#38242b] dark:via-[#211b1e] dark:to-[#32232a]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
            <div
              aria-hidden="true"
              className="absolute -left-12 -top-14 size-44 animate-float rounded-full bg-primary-soft/60 blur-3xl"
            />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-surface/70 px-3 py-1.5 text-xs font-semibold text-primary-dark backdrop-blur-sm">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {content.heroLabel}
              </div>
              <h2 className="font-display mt-7 max-w-lg text-[2.75rem] font-semibold leading-[0.98] tracking-[-0.04em] text-foreground sm:text-6xl">
                {content.heroTitle}
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">
                {content.heroBody}
              </p>
              {noteOpen && (
                <p className="mt-4 max-w-md rounded-2xl border border-primary/10 bg-surface/70 p-4 text-sm leading-6 text-foreground/80">
                  {content.noteBody}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  className="h-11 rounded-full px-5 shadow-subtle"
                  onClick={() => setNoteOpen((open) => !open)}
                  aria-expanded={noteOpen}
                >
                  {noteOpen ? "Close your note" : "Read your note"}
                  {noteOpen ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="size-4" aria-hidden="true" />
                  A minute for you
                </span>
              </div>
            </div>
          </div>

          <div className="relative min-h-[280px] overflow-hidden bg-[#ead1d4] dark:bg-[#3c2930] lg:min-h-full">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgba(255,255,255,0.8),transparent_23%),linear-gradient(145deg,#f2d9d4_0%,#d49eac_45%,#b66b83_100%)] opacity-90 dark:opacity-60"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -right-10 size-72 animate-float-delayed rounded-full border-[28px] border-white/20"
            />
            <div
              aria-hidden="true"
              className="absolute -right-8 top-12 size-36 animate-float rounded-full bg-[#fff4df]/50 blur-2xl"
            />
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="relative w-full max-w-[240px] rotate-[-5deg] animate-float-delayed rounded-sm bg-white p-3 pb-10 shadow-elevated transition-transform duration-500 hover:rotate-[-2deg] dark:bg-[#f5e9e4]">
                <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                  {memories.length > 0 ? (
                    <img
                      src={memories[0].thumbnailUrl || memories[0].url}
                      alt={memories[0].caption || "A memory to revisit"}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full transition-transform duration-700 hover:scale-105 bg-[radial-gradient(circle_at_68%_32%,#ffe6cf_0_13%,transparent_14%),radial-gradient(circle_at_36%_62%,#f0b5b4_0_20%,transparent_21%),linear-gradient(135deg,#da9aa0,#8f506b)]" />
                  )}
                </div>
                <p className="font-display absolute bottom-2.5 left-0 right-0 text-center text-xl font-semibold text-[#7c4656]">
                  us, lately
                </p>
              </div>
            </div>
            <div className="absolute bottom-5 left-6 rounded-full bg-white/75 px-3 py-1.5 text-xs font-medium text-[#724654] backdrop-blur-sm dark:bg-[#211b1e]/70 dark:text-primary-soft">
              A memory to revisit
            </div>
          </div>
        </div>
      </section>
    </Reveal>

      {personalMessage && (
        <Reveal className="mt-12" delay={0.05}>
          <section>
            <div className="glass rounded-card border border-primary/15 p-6 shadow-subtle sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                    <MailPlus className="size-3.5" aria-hidden="true" />
                    A note from {partnerDisplayName || "your person"}
                  </div>
                  <h2 className="font-display mt-4 text-3xl font-semibold tracking-[-0.03em]">{personalMessage.title}</h2>
                  <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-muted-foreground">{personalMessage.body}</p>
                </div>
                <Heart className="size-6 shrink-0 animate-heartbeat fill-primary-soft text-primary" aria-hidden="true" />
              </div>
            </div>
          </section>
        </Reveal>
      )}
      {messageError && !messageLoading && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted/60 px-4 py-3 text-sm text-muted-foreground" role="status">
          <span>Your personal note is taking a little longer to arrive.</span>
          <Button variant="ghost" className="h-9 shrink-0 rounded-full px-3 text-primary-dark" onClick={retryPersonalMessage}>
            Try again
          </Button>
        </div>
      )}

      <MoodCheckIn />

      <section className="mt-12">
        <SectionHeading eyebrow="A little more" title="For your heart today" />
        <Stagger className="mt-5 grid gap-5 md:grid-cols-2">
          <StaggerItem>
            <article className="card-lift group h-full rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Heart className="size-5 fill-current" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-muted hover:text-primary focus-visible:outline-none"
                  aria-label={saved ? "Remove affirmation from saved" : "Save affirmation"}
                  aria-pressed={saved}
                  onClick={() => setSaved((value) => !value)}
                >
                  <Bookmark
                    key={saved ? "saved" : "unsaved"}
                    className={`size-[18px] animate-pop-in transition-colors ${saved ? "fill-primary text-primary" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Today&apos;s affirmation
              </p>
              <p className="mt-3 max-w-sm text-xl font-semibold leading-8 tracking-[-0.02em] text-foreground">
                {content.affirmation}
              </p>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {content.affirmationDetail}
              </p>
            </article>
          </StaggerItem>

          <StaggerItem>
            <article className="relative h-full overflow-hidden rounded-card bg-[#30242a] p-6 text-[#fff8f6] shadow-card transition-shadow duration-300 hover:shadow-elevated sm:p-7 dark:bg-[#2a2226]">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-20 size-56 animate-float rounded-full bg-primary/25 blur-3xl"
              />
              <div className="relative flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-soft">
                    <Sparkles className="size-3.5" aria-hidden="true" />
                    A thought to keep
                  </div>
                  <span className="text-xs text-white/50">01</span>
                </div>
                <blockquote className="font-display mt-8 max-w-md text-[2rem] font-semibold leading-[1.03] tracking-[-0.03em] sm:text-[2.35rem]">
                  “{content.quoteText}”
                </blockquote>
                <div className="mt-auto pt-8 text-sm text-white/60">
                  <span className="text-white/90">{content.quoteAuthor}</span>
                  {content.quoteSource && (
                    <>
                      <span className="mx-2">·</span>
                      {content.quoteSource}
                    </>
                  )}
                </div>
              </div>
            </article>
          </StaggerItem>
        </Stagger>
      </section>

      <Reveal className="mt-12" delay={0.05}>
        <section>
          <SectionHeading
            eyebrow="From your story"
            title="Something from us"
            action={
              <Button asChild variant="ghost" className="hidden rounded-full text-sm sm:inline-flex">
                <Link to="/memories">
                  View memories
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            }
          />
          <article className="card-lift mt-5 overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
            <div className="grid md:grid-cols-[0.85fr_1.15fr]">
              <div className="grid min-h-[220px] grid-cols-2 gap-2 bg-surface-muted p-2 md:min-h-full">
                {memories.slice(0, 2).map((memory, idx) => (
                  <div key={memory.id} className="group relative overflow-hidden rounded-xl bg-surface-muted">
                    <img
                      src={memory.thumbnailUrl || memory.url}
                      alt={memory.caption || `Memory ${idx + 1}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {memory.takenAt && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                        {new Date(memory.takenAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                ))}
                {memories.length === 0 && (
                  <>
                    <div className="group relative overflow-hidden rounded-xl bg-[#e5b7b0]">
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110 bg-[radial-gradient(circle_at_35%_25%,#fff2e3_0_12%,transparent_13%),linear-gradient(145deg,#d7818d,#a65770)]" />
                    </div>
                    <div className="group relative mt-8 overflow-hidden rounded-xl bg-[#d4c3ac]">
                      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110 bg-[radial-gradient(ellipse_at_58%_70%,#f6e7c9_0_18%,transparent_19%),linear-gradient(145deg,#a8b6a2,#d7a58e)]" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                  <ImageIcon className="size-3.5" aria-hidden="true" />
                  A favorite little moment
                </div>
                <h3 className="font-display mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em]">
                  A Sunday that felt like a little world of its own.
                </h3>
                <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                  The kind of day you wish you could fold up and keep in your pocket.
                </p>
                <Link
                  to="/memories"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary-dark transition-colors hover:text-primary"
                >
                  Open the memory
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        </section>
      </Reveal>

      <Reveal className="mt-12" delay={0.05}>
        <section className="rounded-card border border-primary/10 bg-primary-soft/35 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark">
                <CalendarDays className="size-4" aria-hidden="true" />
                Leave a little love for later
              </div>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Create a tiny reminder, save a thought, or come back when you need
                something soft.
              </p>
            </div>
            <Button asChild variant="outline" className="h-11 shrink-0 rounded-full border-primary/20 bg-surface px-5">
              <Link to="/create">
                Make something personal
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </Reveal>

      {showNotificationPrompt && isFirebaseMessagingConfigured && (
        <Reveal className="mt-8" delay={0.05}>
          <section role="dialog" aria-label="Enable notifications">
            <div className="rounded-card border border-primary/20 bg-primary-soft/30 p-5 sm:p-6 shadow-subtle">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Bell className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Get gentle reminders</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll notify you when your person leaves a note. Never contains the message itself.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                onClick={handleDismissPrompt}
                aria-label="Dismiss notification prompt"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={handleEnableNotifications} className="h-10 rounded-full">
                Enable notifications
                <Bell className="size-4 ml-2" aria-hidden="true" />
              </Button>
              <Button variant="ghost" className="h-10 rounded-full" onClick={handleDismissPrompt}>
                Not now
              </Button>
            </div>
          </div>
        </section>
      </Reveal>
      )}
    </div>
  );
}
