import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, FileText, Heart, Plus, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useDailyContentWorkspace,
  type DailyContent,
  type DailyContentInput,
} from "@/hooks/use-daily-content-workspace";

const contentSchema = z.object({
  contentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date for this content."),
  heroLabel: z.string().trim().min(1, "Add a small label for the day.").max(80, "Keep the label under 80 characters."),
  heroTitle: z.string().trim().min(1, "Add a title for the day.").max(240, "Keep the title under 240 characters."),
  heroBody: z.string().trim().min(1, "Add a short welcome for the day.").max(1000, "Keep the welcome under 1,000 characters."),
  noteBody: z.string().trim().min(1, "Add the private note.").max(2000, "Keep the note under 2,000 characters."),
  affirmation: z.string().trim().min(1, "Add an affirmation.").max(300, "Keep the affirmation under 300 characters."),
  affirmationDetail: z.string().trim().min(1, "Add a little detail for the affirmation.").max(600, "Keep the detail under 600 characters."),
  quoteText: z.string().trim().min(1, "Add a quote.").max(600, "Keep the quote under 600 characters."),
  quoteAuthor: z.string().trim().min(1, "Add the quote author.").max(160, "Keep the author under 160 characters."),
  quoteSource: z.string().trim().max(160, "Keep the source under 160 characters."),
});

type FormState = DailyContentInput & { id?: string };

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const blankForm: FormState = {
  contentDate: localDateKey(),
  heroLabel: "Today, made for you",
  heroTitle: "",
  heroBody: "",
  noteBody: "",
  affirmation: "",
  affirmationDetail: "",
  quoteText: "",
  quoteAuthor: "",
  quoteSource: "",
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function toFormState(content: DailyContent): FormState {
  return {
    id: content.id,
    contentDate: content.contentDate,
    heroLabel: content.heroLabel,
    heroTitle: content.heroTitle,
    heroBody: content.heroBody,
    noteBody: content.noteBody,
    affirmation: content.affirmation,
    affirmationDetail: content.affirmationDetail,
    quoteText: content.quoteText,
    quoteAuthor: content.quoteAuthor,
    quoteSource: content.quoteSource ?? "",
  };
}

export default function DailyContentWorkspace() {
  const { entries, loading, saving, drafting, error, refresh, saveContent, draftContent } = useDailyContentWorkspace();
  const [form, setForm] = useState<FormState>(blankForm);
  const [draftPrompt, setDraftPrompt] = useState("Make this feel like a gentle, ordinary day worth noticing.");
  const [formError, setFormError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  function startNewContent() {
    setForm({ ...blankForm, contentDate: localDateKey() });
    setFormError(null);
    setDraftError(null);
    setSavedMessage(null);
  }

  function editContent(content: DailyContent) {
    setForm(toFormState(content));
    setFormError(null);
    setDraftError(null);
    setSavedMessage(null);
  }

  async function handleDraft() {
    setDraftError(null);
    setSavedMessage(null);
    const dateResult = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date for this content.").safeParse(form.contentDate);
    if (!dateResult.success) {
      setDraftError(dateResult.error.issues[0]?.message ?? "Choose a valid content date.");
      return;
    }

    const response = await draftContent({ contentDate: form.contentDate, prompt: draftPrompt });
    if (response.error || !response.draft) {
      setDraftError(response.error?.message ?? "We couldn't create a daily-content draft right now.");
      return;
    }

    setForm((current) => ({ ...current, ...response.draft }));
    setSavedMessage("A draft is ready for your edits. Nothing has been saved yet.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setDraftError(null);
    setSavedMessage(null);
    const result = contentSchema.safeParse(form);

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check the daily content details.");
      return;
    }

    const response = await saveContent({
      id: form.id,
      ...result.data,
      quoteSource: result.data.quoteSource || null,
    });

    if (response.error) {
      setFormError(response.error.message);
      return;
    }

    if (response.content) {
      setForm(toFormState(response.content));
    }
    setSavedMessage("Daily content saved for this date.");
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Loveline
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Owner space / Daily content</p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Make today feel intentional.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Shape the note, affirmation, and thought your person will find on their Home screen.</p>
        </div>
        <Button className="h-11 rounded-full px-5" onClick={startNewContent}>
          <Plus className="size-4" aria-hidden="true" />
          New day
        </Button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-6" aria-labelledby="daily-content-list-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your calendar</p>
              <h2 id="daily-content-list-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Days made personal</h2>
            </div>
            <span className="text-sm text-muted-foreground">{entries.length}</span>
          </div>

          {loading && (
            <div className="mt-6 space-y-3" aria-label="Loading daily content" aria-busy="true">
              {[1, 2, 3].map((item) => <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" key={item} />)}
            </div>
          )}
          {error && !loading && (
            <Alert variant="destructive" className="mt-6">
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{error}</span>
                <Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>Retry</Button>
              </AlertDescription>
            </Alert>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/50 p-6 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><CalendarDays className="size-5" aria-hidden="true" /></div>
              <p className="mt-4 font-semibold">No days written yet.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Start with today, or make a quiet welcome for a day still ahead.</p>
              <Button variant="outline" className="mt-5 h-10 rounded-full" onClick={startNewContent}>Write the first day</Button>
            </div>
          )}
          {!loading && entries.length > 0 && (
            <div className="mt-5 space-y-2">
              {entries.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  onClick={() => editContent(entry)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${form.id === entry.id ? "border-primary/40 bg-primary-soft/30" : "border-border hover:bg-surface-muted"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-semibold">{entry.heroTitle}</span>
                    <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{displayDate(entry.contentDate)}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{entry.heroBody}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="daily-content-composer-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">A little something for them</p>
              <h2 id="daily-content-composer-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Write the feeling.</h2>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><FileText className="size-5" aria-hidden="true" /></div>
          </div>

          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><Check className="size-4 text-success" aria-hidden="true" /><AlertDescription>{savedMessage}</AlertDescription></Alert>}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="content-date">Content date</Label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <Input id="content-date" type="date" value={form.contentDate} onChange={(event) => setForm((current) => ({ ...current, contentDate: event.target.value }))} className="h-11 rounded-xl pl-10" disabled={saving} />
              </div>
            </div>
            <div className="rounded-2xl border border-primary/15 bg-primary-soft/25 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-primary-dark shadow-subtle"><Sparkles className="size-4" aria-hidden="true" /></div>
                <div className="min-w-0 flex-1">
                  <Label htmlFor="draft-prompt" className="text-sm font-semibold">Start with a little direction</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Gemini creates an editable draft from this direction. It never saves or publishes anything by itself.</p>
                  <Input id="draft-prompt" value={draftPrompt} onChange={(event) => setDraftPrompt(event.target.value)} className="mt-3 h-11 rounded-xl bg-surface" placeholder="A gentle reminder to slow down" maxLength={500} disabled={drafting || saving} />
                  {draftError && <Alert variant="destructive" className="mt-3"><AlertDescription>{draftError}</AlertDescription></Alert>}
                  <Button type="button" variant="outline" className="mt-4 h-10 rounded-full bg-surface" onClick={() => void handleDraft()} disabled={drafting || saving}>
                    {drafting ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                    {drafting ? "Writing a draft…" : "Draft with Gemini"}
                  </Button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-label">Small label</Label>
              <Input id="hero-label" value={form.heroLabel} onChange={(event) => setForm((current) => ({ ...current, heroLabel: event.target.value }))} className="h-11 rounded-xl" placeholder="Today, made for you" disabled={saving} maxLength={80} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-title">Hero title</Label>
              <Input id="hero-title" value={form.heroTitle} onChange={(event) => setForm((current) => ({ ...current, heroTitle: event.target.value }))} className="h-11 rounded-xl" placeholder="You are my favorite part of every day." disabled={saving} maxLength={240} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-body">Welcome</Label>
              <Textarea id="hero-body" value={form.heroBody} onChange={(event) => setForm((current) => ({ ...current, heroBody: event.target.value }))} className="min-h-24 rounded-xl leading-7" placeholder="A few words to open the day…" disabled={saving} maxLength={1000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-body">Private note</Label>
              <Textarea id="note-body" value={form.noteBody} onChange={(event) => setForm((current) => ({ ...current, noteBody: event.target.value }))} className="min-h-28 rounded-xl leading-7" placeholder="Something soft to discover…" disabled={saving} maxLength={2000} />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="affirmation">Affirmation</Label>
                <Textarea id="affirmation" value={form.affirmation} onChange={(event) => setForm((current) => ({ ...current, affirmation: event.target.value }))} className="min-h-24 rounded-xl leading-7" placeholder="I can move gently…" disabled={saving} maxLength={300} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="affirmation-detail">Affirmation detail</Label>
                <Textarea id="affirmation-detail" value={form.affirmationDetail} onChange={(event) => setForm((current) => ({ ...current, affirmationDetail: event.target.value }))} className="min-h-24 rounded-xl leading-7" placeholder="A little context…" disabled={saving} maxLength={600} />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quote-text">Quote</Label>
                <Textarea id="quote-text" value={form.quoteText} onChange={(event) => setForm((current) => ({ ...current, quoteText: event.target.value }))} className="min-h-24 rounded-xl leading-7" placeholder="A thought to keep…" disabled={saving} maxLength={600} />
              </div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="quote-author">Quote author</Label>
                  <Input id="quote-author" value={form.quoteAuthor} onChange={(event) => setForm((current) => ({ ...current, quoteAuthor: event.target.value }))} className="h-11 rounded-xl" placeholder="Someone wise" disabled={saving} maxLength={160} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-source">Source <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="quote-source" value={form.quoteSource ?? ""} onChange={(event) => setForm((current) => ({ ...current, quoteSource: event.target.value }))} className="h-11 rounded-xl" placeholder="A book, song, or film" disabled={saving} maxLength={160} />
                </div>
              </div>
            </div>
            <Button className="h-11 w-full rounded-full" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save daily content"}
              {saving ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            </Button>
          </form>

          <div className="mt-8 overflow-hidden rounded-2xl bg-[#30242a] p-5 text-[#fff8f6]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary-soft">
              <Heart className="size-3.5 fill-current" aria-hidden="true" />
              Recipient preview
            </div>
            <p className="mt-5 text-xs text-white/55">{form.heroLabel || "Today, made for you"}</p>
            <p className="font-display mt-2 text-3xl font-semibold leading-tight tracking-[-0.03em]">{form.heroTitle || "Your day starts here."}</p>
            <p className="mt-4 text-sm leading-6 text-white/65">{form.heroBody || "Write a warm welcome and see it take shape here."}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
