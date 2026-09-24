import { ArrowLeft, CalendarHeart, Clock3, Heart, Image as ImageIcon, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { HeartBeat } from "@/components/motion/HeartBeat";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileNames } from "@/contexts/ProfileNamesContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTimeline, type TimelineItem } from "@/hooks/use-timeline";

const kindLabels: Record<Extract<TimelineItem, { type: "date" }>['kind'], string> = {
  relationship_start: "Where it began",
  anniversary: "Anniversary",
  birthday: "Birthday",
  custom: "A special moment",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Timeline() {
  const { user } = useAuth();
  const { partnerDisplayName } = useProfileNames();
  const { items, daysTogether, loading, error, refresh } = useTimeline();

  function TimelineEntry({ item }: { item: TimelineItem }) {
    if (item.type === "date") {
      return (
        <article className="card-lift relative rounded-card border border-primary/15 bg-surface p-5 shadow-subtle sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
              <CalendarHeart className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
                {kindLabels[item.kind]}
              </p>
              <h2 className="font-display mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em]">
                {item.label}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{formatDate(item.eventDate)}</p>
              {item.notes && <p className="mt-4 text-sm leading-7 text-muted-foreground">{item.notes}</p>}
            </div>
          </div>
        </article>
      );
    }

    if (item.type === "memory") {
      return (
        <article className="card-lift overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
          <div className="aspect-[16/9] overflow-hidden bg-surface-muted">
            <img
              src={item.url}
              alt={item.caption || "A saved Loveline memory"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
              <ImageIcon className="size-3.5" aria-hidden="true" />
              A memory to keep
            </div>
            {item.caption && <p className="mt-3 text-base leading-7 text-foreground">{item.caption}</p>}
            {item.eventDate && <p className="mt-3 text-sm text-muted-foreground">{formatDate(item.eventDate)}</p>}
          </div>
        </article>
      );
    }

    const sentByMe = user?.id === item.senderId;
    return (
      <article className="card-lift relative rounded-card border border-[#30242a]/15 bg-[#30242a] p-5 text-[#fff8f6] shadow-subtle sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#efb0be]/20 text-[#efb0be]">
            <HeartBeat>
              <Heart className="size-5 fill-current" aria-hidden="true" />
            </HeartBeat>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#efb0be]">
              {sentByMe ? "You sent this" : `A little love from ${partnerDisplayName || "your partner"}`}
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em]">
              {sentByMe ? "You sent a heart." : "A heart came your way."}
            </h2>
            <p className="mt-2 text-sm text-white/60">{formatTimestamp(item.createdAt)}</p>
            <p className="mt-4 text-sm leading-7 text-white/70">
              {item.cardId
                ? "It was sent for a card you both keep."
                : "A small wave across your Loveline."}
            </p>
            {item.note && (
              <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-base font-medium leading-7 text-white">
                “{item.note}”
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/more" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to your story
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Timeline</p>
            <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">The story so far.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">A quiet place for the moments that made your relationship feel like home.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/10 bg-primary-soft/40 px-3.5 py-2 text-xs font-medium text-primary-dark sm:self-auto">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Private to your Loveline
          </div>
        </div>
      </header>

      <Reveal className="mt-8" delay={0.05}>
        <section className="overflow-hidden rounded-card bg-[#30242a] p-6 text-[#fff8f6] shadow-card sm:p-8" aria-labelledby="timeline-summary-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-soft">
                <Heart className="size-3.5 animate-heartbeat fill-current" aria-hidden="true" />
                Your story, together
              </div>
              <h2 id="timeline-summary-title" className="font-display mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Every little thing counts.</h2>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-5xl font-semibold leading-none text-primary-soft">
                {daysTogether != null ? <AnimatedNumber value={daysTogether} /> : "—"}
              </p>
              <p className="mt-2 text-sm text-white/60">days together</p>
            </div>
          </div>
        </section>
      </Reveal>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2" aria-busy="true" aria-label="Loading your relationship timeline">
          {[1, 2, 3, 4].map((item) => <div className="h-56 animate-pulse rounded-card bg-surface-muted" key={item} />)}
        </div>
      ) : items.length === 0 ? (
        <section className="mt-10 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-16 text-center sm:px-12">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
            <Sparkles className="size-7" aria-hidden="true" />
          </div>
          <h2 className="font-display mt-7 text-3xl font-semibold tracking-[-0.03em]">Your first chapter is still waiting.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Add a special date or save a memory, and it will find its place in your story.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="h-10 rounded-full"><Link to="/more">Add a special date</Link></Button>
            <Button asChild variant="outline" className="h-10 rounded-full"><Link to="/memories">Save a memory</Link></Button>
          </div>
        </section>
      ) : (
        <section className="mt-10" aria-labelledby="timeline-list-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Held close</p>
              <h2 id="timeline-list-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Little pieces of us.</h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" aria-hidden="true" />{items.length} {items.length === 1 ? "moment" : "moments"}</span>
          </div>
          <Stagger className="mt-5 grid gap-5 md:grid-cols-2" stagger={0.06}>
            {items.map((item) => <StaggerItem key={item.id}><TimelineEntry item={item} /></StaggerItem>)}
          </Stagger>
        </section>
      )}
    </div>
  );
}
