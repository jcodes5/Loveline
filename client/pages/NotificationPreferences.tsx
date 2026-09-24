import { ArrowLeft, BellRing, CalendarHeart, Check, Clock3, Heart, LoaderCircle, Moon, ShieldCheck, Sun } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";

export default function NotificationPreferences() {
  const {
    preferences,
    loading,
    saving,
    error,
    setPersonalMessagesEnabled,
    setPersonalMessagesTime,
    setMorningEnabled,
    setMorningTime,
    setNightEnabled,
    setNightTime,
    setSpecialDatesEnabled,
    setSpecialDatesTime,
    setQuietHoursEnabled,
    setQuietHoursStart,
    setQuietHoursEnd,
  } = useNotificationPreferences();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <Link
        to="/more"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your space
      </Link>

      <header className="mt-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">
          <BellRing className="size-4" aria-hidden="true" />
          Loveline / Notifications
        </div>
        <h1 className="font-display mt-4 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
          Keep the quiet things gentle.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
          Choose which little reminders can find you. Your private messages stay inside Loveline.
        </p>
      </header>

      {loading ? (
        <div className="mt-10 space-y-4" aria-busy="true" aria-label="Loading notification preferences">
          <Skeleton className="h-28 rounded-card" />
          <Skeleton className="h-28 rounded-card" />
        </div>
      ) : (
        <div className="mt-10 space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>We couldn&apos;t update that just yet.</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Heart className="size-5 fill-current" aria-hidden="true" />
                </div>
                <div>
                  <Label htmlFor="personal-messages" className="text-base font-semibold">
                    Personal message reminders
                  </Label>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Get a gentle reminder when a personal note from your person is ready.
                  </p>
                </div>
              </div>
              <Switch
                id="personal-messages"
                checked={preferences.personalMessagesEnabled}
                onCheckedChange={(checked) => void setPersonalMessagesEnabled(checked)}
                disabled={saving}
                aria-label="Personal message reminders"
              />
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Sun className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <Label htmlFor="morning-reminders" className="text-base font-semibold">
                    Morning daily reminders
                  </Label>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    A quiet nudge when today&apos;s Loveline note is ready.
                  </p>
                  <Input
                    type="time"
                    value={preferences.morningTime}
                    onChange={(event) => void setMorningTime(event.target.value)}
                    disabled={saving || !preferences.morningEnabled}
                    className="mt-4 h-11 w-36 rounded-xl"
                    aria-label="Morning reminder time"
                  />
                </div>
              </div>
              <Switch
                id="morning-reminders"
                checked={preferences.morningEnabled}
                onCheckedChange={(checked) => void setMorningEnabled(checked)}
                disabled={saving}
                aria-label="Morning daily reminders"
              />
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Moon className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <Label htmlFor="night-reminders" className="text-base font-semibold">
                    Night daily reminders
                  </Label>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    A soft reminder to end the day with Loveline.
                  </p>
                  <Input
                    type="time"
                    value={preferences.nightTime}
                    onChange={(event) => void setNightTime(event.target.value)}
                    disabled={saving || !preferences.nightEnabled}
                    className="mt-4 h-11 w-36 rounded-xl"
                    aria-label="Night reminder time"
                  />
                </div>
              </div>
              <Switch
                id="night-reminders"
                checked={preferences.nightEnabled}
                onCheckedChange={(checked) => void setNightEnabled(checked)}
                disabled={saving}
                aria-label="Night daily reminders"
              />
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <CalendarHeart className="size-5" aria-hidden="true" />
                </div>
                <div>
                  <Label htmlFor="special-date-reminders" className="text-base font-semibold">
                    Special date reminders
                  </Label>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Remember anniversaries, birthdays, and custom relationship days.
                  </p>
                  <Input
                    type="time"
                    value={preferences.specialDatesTime}
                    onChange={(event) => void setSpecialDatesTime(event.target.value)}
                    disabled={saving || !preferences.specialDatesEnabled}
                    className="mt-4 h-11 w-36 rounded-xl"
                    aria-label="Special date reminder time"
                  />
                </div>
              </div>
              <Switch
                id="special-date-reminders"
                checked={preferences.specialDatesEnabled}
                onCheckedChange={(checked) => void setSpecialDatesEnabled(checked)}
                disabled={saving}
                aria-label="Special date reminders"
              />
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                <Clock3 className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <Label htmlFor="personal-message-time" className="text-base font-semibold">
                  Reminder time
                </Label>
                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                  Choose a calm moment for reminders about notes that are ready for you.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Input
                    id="personal-message-time"
                    type="time"
                    value={preferences.personalMessagesTime}
                    onChange={(event) => void setPersonalMessagesTime(event.target.value)}
                    disabled={saving || !preferences.personalMessagesEnabled}
                    className="h-11 w-36 rounded-xl"
                    aria-describedby="personal-message-time-help"
                  />
                  <span id="personal-message-time-help" className="text-xs text-muted-foreground">
                    Your local time ({preferences.personalMessagesTimezone})
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-card border border-border bg-surface p-6 shadow-subtle sm:p-7">
            <div className="flex items-start justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                  <Moon className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <Label htmlFor="quiet-hours" className="text-base font-semibold">
                    Quiet hours
                  </Label>
                  <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                    Pause all Loveline reminders overnight. Anything waiting will arrive after quiet hours end.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Input
                      type="time"
                      value={preferences.quietHoursStart}
                      onChange={(event) => void setQuietHoursStart(event.target.value)}
                      disabled={saving || !preferences.quietHoursEnabled}
                      className="h-11 w-36 rounded-xl"
                      aria-label="Quiet hours start time"
                    />
                    <span aria-hidden="true" className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={preferences.quietHoursEnd}
                      onChange={(event) => void setQuietHoursEnd(event.target.value)}
                      disabled={saving || !preferences.quietHoursEnabled}
                      className="h-11 w-36 rounded-xl"
                      aria-label="Quiet hours end time"
                    />
                    <span className="text-xs text-muted-foreground">
                      {preferences.personalMessagesTimezone}
                    </span>
                  </div>
                </div>
              </div>
              <Switch
                id="quiet-hours"
                checked={preferences.quietHoursEnabled}
                onCheckedChange={(checked) => void setQuietHoursEnabled(checked)}
                disabled={saving}
                aria-label="Quiet hours"
              />
            </div>
          </section>

          <section className="rounded-card border border-primary/10 bg-primary-soft/35 p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface text-primary-dark shadow-subtle">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Private by design</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Notifications only say that something is waiting for you. They never contain message titles, message bodies, or relationship details.
                </p>
              </div>
            </div>
          </section>

          <div className="flex min-h-10 items-center justify-end gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            {saving ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Saving your preference…
              </>
            ) : !error ? (
              <>
                <Check className="size-4 text-primary" aria-hidden="true" />
                Your preferences are up to date.
              </>
            ) : null}
          </div>

          <Button asChild variant="outline" className="h-11 rounded-full">
            <Link to="/more">Done</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
