import { useState } from "react";
import { ArrowLeft, CalendarHeart, Check, Heart, LoaderCircle, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useSpecialDates, type SpecialDate, type SpecialDateKind } from "@/hooks/use-special-dates";

const dateSchema = z.object({
  kind: z.enum(["relationship_start", "anniversary", "birthday", "custom"]),
  label: z.string().trim().min(1, "Give this date a name.").max(120, "Keep the name under 120 characters."),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  notes: z.string().trim().max(500, "Keep the note under 500 characters."),
});

type FormState = {
  id?: string;
  kind: SpecialDateKind;
  label: string;
  eventDate: string;
  notes: string;
};

const blankForm: FormState = {
  kind: "custom",
  label: "",
  eventDate: "",
  notes: "",
};

const kindLabels: Record<SpecialDateKind, string> = {
  relationship_start: "Our beginning",
  anniversary: "Anniversary",
  birthday: "Birthday",
  custom: "Something special",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function More() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { dates, daysTogether, loading, saving, error, refresh, saveDate, removeDate } = useSpecialDates();
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);

  function startNewDate() {
    setForm(blankForm);
    setFormError(null);
    setSavedMessage(null);
  }

  function editDate(date: SpecialDate) {
    setForm({ id: date.id, kind: date.kind, label: date.label, eventDate: date.eventDate, notes: date.notes });
    setFormError(null);
    setSavedMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    const result = dateSchema.safeParse(form);
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check the special date details.");
      return;
    }

    const response = await saveDate({ id: form.id, ...result.data });
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    setSavedMessage("That date is safely part of your story.");
    if (response.date) editDate(response.date);
  }

  async function handleRemove(date: SpecialDate) {
    if (!window.confirm("Remove this date from your Loveline?")) return;
    const response = await removeDate(date.id);
    if (response.error) setFormError(response.error.message);
    if (form.id === date.id) startNewDate();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" />Back to Loveline</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Your story</p>
        <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">Everything that makes it yours.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Keep the dates that make your relationship feel like a place.</p>
      </header>

      <section className="mt-8 overflow-hidden rounded-card bg-[#30242a] p-6 text-[#fff8f6] shadow-card sm:p-8" aria-labelledby="days-together-title">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-soft"><Heart className="size-3.5 fill-current" aria-hidden="true" />{relationship?.name ?? "Your Loveline"}</div>
            <h2 id="days-together-title" className="font-display mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Still choosing each other.</h2>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-6xl font-semibold leading-none text-primary-soft">{daysTogether ?? "—"}</p>
            <p className="mt-2 text-sm text-white/60">days together</p>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-card border border-primary/10 bg-primary-soft/30 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="timeline-link-title">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark"><Heart className="size-4 fill-current" aria-hidden="true" />Your story, in one place</div>
          <h2 id="timeline-link-title" className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em]">See how the little moments line up.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Dates and memories, held close in one private timeline.</p>
        </div>
        <Button asChild variant="outline" className="mt-5 h-10 shrink-0 rounded-full border-primary/20 bg-surface sm:mt-0"><Link to="/timeline">Open your timeline</Link></Button>
      </section>

      <section className="mt-10" aria-labelledby="special-dates-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">The dates worth keeping</p>
            <h2 id="special-dates-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Your little calendar.</h2>
          </div>
          {isOwner && <Button className="h-10 rounded-full" onClick={startNewDate}><Plus className="size-4" aria-hidden="true" />Add a date</Button>}
        </div>

        {error && <Alert variant="destructive" className="mt-5"><AlertDescription className="flex items-center justify-between gap-3"><span>{error}</span><Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>Retry</Button></AlertDescription></Alert>}
        {loading ? (
          <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading special dates">{[1, 2, 3].map((item) => <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" key={item} />)}</div>
        ) : dates.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-12 text-center"><CalendarHeart className="mx-auto size-8 text-primary" aria-hidden="true" /><p className="mt-4 font-semibold">No special dates yet.</p><p className="mt-2 text-sm text-muted-foreground">The best ones can start with the day your story began.</p></div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {dates.map((date) => <article key={date.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-subtle"><div className="flex min-w-0 items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-dark"><CalendarHeart className="size-4" aria-hidden="true" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-dark">{kindLabels[date.kind]}</p><h3 className="mt-1 truncate font-semibold">{date.label}</h3><p className="mt-1 text-sm text-muted-foreground">{formatDate(date.eventDate)}</p>{date.notes && <p className="mt-2 text-sm leading-6 text-muted-foreground">{date.notes}</p>}</div></div>{isOwner && <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" className="rounded-full" aria-label="Edit special date" onClick={() => editDate(date)}><Pencil className="size-4" aria-hidden="true" /></Button><Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Remove special date" onClick={() => void handleRemove(date)} disabled={saving}><Trash2 className="size-4" aria-hidden="true" /></Button></div>}</article>)}
          </div>
        )}
      </section>

      {isOwner && (
        <section className="mt-10 rounded-card border border-primary/15 bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="date-editor-title">
          <div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><Sparkles className="size-5" aria-hidden="true" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Owner space</p><h2 id="date-editor-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Mark the moment.</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">These dates stay inside your private Loveline.</p></div></div>
          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><Check className="size-4 text-success" aria-hidden="true" /><AlertDescription>{savedMessage}</AlertDescription></Alert>}
          <form className="mt-6 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2"><Label htmlFor="special-date-kind">What kind of date?</Label><select id="special-date-kind" value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as SpecialDateKind }))} className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" disabled={saving}>{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="special-date-event">When?</Label><Input id="special-date-event" type="date" value={form.eventDate} onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))} className="h-11 rounded-xl" disabled={saving} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="special-date-label">Name this moment</Label><Input id="special-date-label" value={form.label} onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))} className="h-11 rounded-xl" placeholder="The day we met" maxLength={120} disabled={saving} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="special-date-notes">A note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="special-date-notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-20 rounded-xl leading-7" placeholder="The detail you never want to forget…" maxLength={500} disabled={saving} /></div>
            <div className="sm:col-span-2"><Button className="h-11 rounded-full" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <CalendarHeart className="size-4" aria-hidden="true" />}{saving ? "Saving date…" : form.id ? "Save changes" : "Save date"}</Button></div>
          </form>
        </section>
      )}

      <section className="mt-10 rounded-card border border-primary/10 bg-primary-soft/30 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="mood-history-link-title">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark"><Heart className="size-4 fill-current" aria-hidden="true" />Your private check-ins</div>
          <h2 id="mood-history-link-title" className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em]">Notice the pattern, gently.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">See the moods you have chosen without turning them into a verdict.</p>
        </div>
        <Button asChild variant="outline" className="mt-5 h-10 shrink-0 rounded-full border-primary/20 bg-surface sm:mt-0"><Link to="/mood-history">View mood history</Link></Button>
      </section>

      <div className="mt-8 flex justify-end"><Button asChild variant="outline" className="h-10 rounded-full"><Link to="/settings/notifications">Notification preferences</Link></Button></div>
    </div>
  );
}
