import { ArrowLeft, Check, Heart, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { moodOptions, type MoodValue } from "@/hooks/use-mood";
import { useMoodHistory } from "@/hooks/use-mood-history";

const moodColors: Record<MoodValue, string> = {
  joyful: "bg-[#d89b62]",
  soft: "bg-[#d58ea2]",
  steady: "bg-[#9bb39b]",
  tender: "bg-[#a98bb9]",
  heavy: "bg-[#78839c]",
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function MoodHistory() {
  const { entries, summary, loading, error, refresh } = useMoodHistory();
  const mostCommon = moodOptions.find((option) => option.value === summary.mostCommon);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/more" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to your story
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Your check-ins</p>
            <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">A little room to notice.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Your private mood check-ins from the last 30 days, held without judgment.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/10 bg-primary-soft/40 px-3.5 py-2 text-xs font-medium text-primary-dark sm:self-auto">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Only you can see this
          </div>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="mt-10 grid gap-4 sm:grid-cols-3" aria-busy="true" aria-label="Loading mood history">
          {[1, 2, 3].map((item) => <div className="h-28 animate-pulse rounded-card bg-surface-muted" key={item} />)}
        </div>
      ) : (
        <>
          <section className="mt-10 grid gap-4 sm:grid-cols-3" aria-label="Mood summary">
            <article className="rounded-card border border-primary/15 bg-primary-soft/30 p-5 shadow-subtle">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Check-ins</p>
              <p className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em]">{summary.totalEntries}</p>
              <p className="mt-1 text-sm text-muted-foreground">in the last 30 days</p>
            </article>
            <article className="rounded-card border border-border bg-surface p-5 shadow-subtle">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Current rhythm</p>
              <p className="font-display mt-3 text-4xl font-semibold tracking-[-0.04em]">{summary.currentStreak}</p>
              <p className="mt-1 text-sm text-muted-foreground">day{summary.currentStreak === 1 ? "" : "s"} in a row</p>
            </article>
            <article className="rounded-card border border-border bg-surface p-5 shadow-subtle">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Most often</p>
              <p className="font-display mt-3 text-3xl font-semibold tracking-[-0.04em]">{mostCommon?.label ?? "Not yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">A pattern, not a verdict.</p>
            </article>
          </section>

          <section className="mt-10 rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="mood-pattern-title">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><Sparkles className="size-5" aria-hidden="true" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Your gentle pattern</p>
                <h2 id="mood-pattern-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">What has been true lately.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">These are simply the words you chose for yourself. They are not shared with your person or used to make assumptions about you.</p>
              </div>
            </div>
            <div className="mt-7 space-y-4">
              {moodOptions.map((option) => {
                const count = summary.counts[option.value];
                const width = summary.totalEntries ? `${Math.max((count / summary.totalEntries) * 100, count ? 8 : 0)}%` : "0%";
                return (
                  <div key={option.value}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
                      <div className={`h-full rounded-full ${moodColors[option.value]}`} style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="recent-check-ins-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Recently noticed</p>
                <h2 id="recent-check-ins-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Your quiet record.</h2>
              </div>
              <Link to="/" className="text-sm font-semibold text-primary-dark hover:text-primary">Check in today</Link>
            </div>
            {entries.length === 0 ? (
              <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-14 text-center">
                <Heart className="mx-auto size-8 text-primary" aria-hidden="true" />
                <p className="mt-4 font-semibold">No check-ins yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">When you choose a mood on Home, it will appear here.</p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => {
                  const option = moodOptions.find((candidate) => candidate.value === entry.mood);
                  return (
                    <article key={entry.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-subtle">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-10 place-items-center rounded-xl ${moodColors[entry.mood]} text-white`}><Heart className="size-4 fill-current" aria-hidden="true" /></span>
                        <div><p className="font-semibold">{option?.label}</p><p className="mt-1 text-xs text-muted-foreground">{option?.description}</p></div>
                      </div>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={entry.entryDate}>{displayDate(entry.entryDate)}</time>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Check className="size-4 text-primary" aria-hidden="true" />Private to your account and relationship.</div>
        </>
      )}
    </div>
  );
}
