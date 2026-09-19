import { Check, CloudRain, CloudSun, Heart, RefreshCw, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { moodOptions, useMoodCheckIn, type MoodValue } from "@/hooks/use-mood";

const moodIcons: Record<MoodValue, typeof Sun> = {
  joyful: Sun,
  soft: CloudSun,
  steady: Heart,
  tender: CloudRain,
  heavy: CloudRain,
};

export default function MoodCheckIn() {
  const { entry, loading, saving, error, refresh, saveMood } = useMoodCheckIn();

  return (
    <section className="mt-12 rounded-card border border-primary/10 bg-primary-soft/30 px-5 py-6 sm:px-7" aria-labelledby="mood-check-in-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">
            <Heart className="size-3.5 fill-current" aria-hidden="true" />
            A quiet check-in
          </div>
          <h2 id="mood-check-in-title" className="font-display mt-2 text-3xl font-semibold tracking-[-0.03em]">How are you arriving today?</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">A small moment to notice what is true. Only you can see this.</p>
        </div>
        {entry && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-dark"><Check className="size-3.5" aria-hidden="true" />Saved for today</span>}
      </div>

      {loading ? (
        <div className="mt-6 h-16 animate-pulse rounded-2xl bg-surface/70" aria-busy="true" aria-label="Loading mood check-in" />
      ) : error ? (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-surface/70 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
          <span>{error}</span>
          <Button variant="ghost" className="h-9 shrink-0 rounded-full px-3 text-destructive hover:text-destructive" onClick={() => void refresh()}><RefreshCw className="size-4" aria-hidden="true" />Try again</Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {moodOptions.map((option) => {
            const Icon = moodIcons[option.value];
            const selected = entry?.mood === option.value;
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => void saveMood(option.value)}
                disabled={saving}
                aria-pressed={selected}
                className={`rounded-2xl border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-primary/40 bg-surface text-primary-dark shadow-subtle" : "border-primary/10 bg-surface/60 text-muted-foreground hover:bg-surface"}`}
              >
                <Icon className={`size-5 ${selected ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />
                <span className="mt-2 block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-4 opacity-75">{option.description}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
