import { useEffect, useState } from "react";
import { ArrowLeft, CalendarHeart, Check, ClipboardCopy, Clock3, Globe, Heart, Link2, LoaderCircle, MapPin, MessagesSquare, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useProfileNames } from "@/contexts/ProfileNamesContext";
import { useInvitation } from "@/hooks/use-invitation";
import { useSpecialDates, type SpecialDate, type SpecialDateKind, type SpecialDateRecurrence, type SpecialDateTheme } from "@/hooks/use-special-dates";

const dateSchema = z.object({
  kind: z.enum(["relationship_start", "anniversary", "birthday", "custom"]),
  label: z.string().trim().min(1, "Give this date a name.").max(120, "Keep the name under 120 characters."),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  notes: z.string().trim().max(500, "Keep the note under 500 characters."),
  recurrence: z.enum(["none", "yearly", "monthly"]),
  remindBeforeDays: z.number().int().min(0).max(30),
  message: z.string().max(2000).optional(),
  theme: z.enum(["minimal", "romantic", "editorial", "polaroid", "night", "sunrise", "memory"]),
  location: z.string().max(200).optional(),
  enabled: z.boolean(),
  timezone: z.string().optional(),
});

type FormState = {
  id?: string;
  kind: SpecialDateKind;
  label: string;
  eventDate: string;
  notes: string;
  recurrence: SpecialDateRecurrence;
  remindBeforeDays: number;
  message: string;
  theme: SpecialDateTheme;
  location: string;
  enabled: boolean;
  timezone: string;
};

const blankForm: FormState = {
  kind: "custom",
  label: "",
  eventDate: "",
  notes: "",
  recurrence: "yearly",
  remindBeforeDays: 0,
  message: "",
  theme: "minimal",
  location: "",
  enabled: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const kindLabels: Record<SpecialDateKind, string> = {
  relationship_start: "Our beginning",
  anniversary: "Anniversary",
  birthday: "Birthday",
  custom: "Something special",
};

const recurrenceLabels: Record<SpecialDateRecurrence, string> = {
  none: "One time only",
  yearly: "Every year",
  monthly: "Every month",
};

const themeLabels: Record<SpecialDateTheme, string> = {
  minimal: "Minimal",
  romantic: "Romantic",
  editorial: "Editorial",
  polaroid: "Polaroid",
  night: "Night",
  sunrise: "Sunrise",
  memory: "Memory",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export default function More() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { displayName, partnerDisplayName, saveDisplayName } = useProfileNames();
  const { dates, daysTogether, loading, saving, error, refresh, saveDate, removeDate } = useSpecialDates();
  const invitation = useInvitation();
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const [copied, setCopied] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  useEffect(() => setNameDraft(displayName), [displayName]);

  async function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameSaving(true);
    setNameMessage(null);
    const error = await saveDisplayName(nameDraft);
    setNameSaving(false);
    setNameMessage(error?.message ?? "Your name has been updated across Loveline.");
  }

  async function copyInviteLink() {
    if (!invitation.link) return;
    try {
      await navigator.clipboard.writeText(invitation.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      invitation.refresh();
    }
  }

  function startNewDate() {
    setForm(blankForm);
    setFormError(null);
    setSavedMessage(null);
  }

  function editDate(date: SpecialDate) {
    setForm({
      id: date.id,
      kind: date.kind,
      label: date.label,
      eventDate: date.eventDate,
      notes: date.notes,
      recurrence: date.recurrence,
      remindBeforeDays: date.remindBeforeDays,
      message: date.message,
      theme: date.theme,
      location: date.location,
      enabled: date.enabled,
      timezone: date.timezone,
    });
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

      <section className="mt-8 border-b border-border/70 pb-8" aria-labelledby="display-name-title">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Your profile</p>
          <h2 id="display-name-title" className="font-display mt-2 text-2xl font-semibold">Your name in Loveline</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose what you and your partner see around your shared space.</p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSaveName}>
            <Input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={120} required aria-label="Your name in Loveline" placeholder="Your name" disabled={nameSaving} className="h-11 max-w-md rounded-xl" />
            <Button type="submit" disabled={nameSaving || !nameDraft.trim() || nameDraft.trim() === displayName} className="h-11 rounded-full">
              {nameSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              Save name
            </Button>
          </form>
          {nameMessage && <p className={`mt-2 text-sm ${nameMessage.startsWith("We couldn't") ? "text-destructive" : "text-muted-foreground"}`} role="status">{nameMessage}</p>}
          {partnerDisplayName && <p className="mt-3 text-xs text-muted-foreground">Your partner appears as {partnerDisplayName}.</p>}
        </div>
      </section>

      <Reveal className="mt-8" delay={0.05}>
        <section className="overflow-hidden rounded-card bg-[#30242a] p-6 text-[#fff8f6] shadow-card sm:p-8" aria-labelledby="days-together-title">
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-soft"><Heart className="size-3.5 animate-heartbeat fill-current" aria-hidden="true" />{relationship?.name ?? "Your Loveline"}</div>
              <h2 id="days-together-title" className="font-display mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Still choosing each other.</h2>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-6xl font-semibold leading-none text-primary-soft">
                {daysTogether != null ? <AnimatedNumber value={daysTogether} /> : "—"}
              </p>
              <p className="mt-2 text-sm text-white/60">days together</p>
            </div>
          </div>
        </section>
      </Reveal>

      <section className="mt-8 rounded-card border border-primary/10 bg-primary-soft/30 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="messages-link-title">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark"><MessagesSquare className="size-4" aria-hidden="true" />The words you share</div>
          <h2 id="messages-link-title" className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em]">Every card and heart, in one place.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Send a heart back and feel it land on the other side, instantly.</p>
        </div>
        <Button asChild variant="outline" className="mt-5 h-10 shrink-0 rounded-full border-primary/20 bg-surface sm:mt-0"><Link to="/messages">Open messages</Link></Button>
      </section>

      <section className="mt-8 rounded-card border border-primary/10 bg-primary-soft/30 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6" aria-labelledby="timeline-link-title">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-primary-dark"><Heart className="size-4 fill-current" aria-hidden="true" />Your story, in one place</div>
          <h2 id="timeline-link-title" className="font-display mt-2 text-2xl font-semibold tracking-[-0.03em]">See how the little moments line up.</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Dates and memories, held close in one private timeline.</p>
        </div>
        <Button asChild variant="outline" className="mt-5 h-10 shrink-0 rounded-full border-primary/20 bg-surface sm:mt-0"><Link to="/timeline">Open your timeline</Link></Button>
      </section>

      {isOwner && (
        <section className="mt-8 rounded-card border border-primary/10 bg-surface p-5 shadow-subtle sm:p-6" aria-labelledby="invite-link-title">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><Link2 className="size-5" aria-hidden="true" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Owner space</p>
              <h2 id="invite-link-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Share your invitation.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Send this one-time link to the person you love. The moment they accept, it stops working.</p>
            </div>
          </div>

          {invitation.error && <Alert variant="destructive" className="mt-5"><AlertDescription>{invitation.error}</AlertDescription></Alert>}

          {invitation.loading ? (
            <div className="mt-5 h-12 animate-pulse rounded-xl bg-surface-muted" aria-busy="true" aria-label="Loading invitation" />
          ) : invitation.link ? (
            <div className="mt-5 rounded-2xl border border-primary/15 bg-primary-soft/40 p-4">
              <p className="break-all text-sm leading-6 text-muted-foreground">{invitation.link}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button className="h-10 rounded-full" onClick={() => void copyInviteLink()} disabled={invitation.refreshing}>
                  {copied ? <Check className="size-4" aria-hidden="true" /> : <ClipboardCopy className="size-4" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button variant="outline" className="h-10 rounded-full border-primary/20 bg-surface" onClick={() => void invitation.regenerate()} disabled={invitation.refreshing}>
                  {invitation.refreshing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                  New link
                </Button>
              </div>
              {invitation.inviteeEmail && (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  Reserved for {invitation.inviteeEmail}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-8 text-center">
              <p className="font-semibold">No active invitation yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Create one whenever you&apos;re ready to send it.</p>
              <Button className="mt-4 h-10 rounded-full" onClick={() => void invitation.regenerate()} disabled={invitation.refreshing}>
                {invitation.refreshing ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                Create invitation
              </Button>
            </div>
          )}
        </section>
      )}

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
          <Stagger className="mt-5 grid gap-3 sm:grid-cols-2" stagger={0.05} >
            {dates.map((date) => <StaggerItem key={date.id}><article className="card-lift flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-subtle"><div className="flex min-w-0 items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-dark"><CalendarHeart className="size-4" aria-hidden="true" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-dark">{kindLabels[date.kind]}</p><h3 className="mt-1 truncate font-semibold">{date.label}</h3><p className="mt-1 text-sm text-muted-foreground">{formatDate(date.eventDate)}</p>{date.notes && <p className="mt-2 text-sm leading-6 text-muted-foreground">{date.notes}</p>}</div></div>{isOwner && <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" className="rounded-full" aria-label="Edit special date" onClick={() => editDate(date)}><Pencil className="size-4" aria-hidden="true" /></Button><Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Remove special date" onClick={() => void handleRemove(date)} disabled={saving}><Trash2 className="size-4" aria-hidden="true" /></Button></div>}</article></StaggerItem>)}
          </Stagger>
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
            <div className="space-y-2"><Label htmlFor="special-date-recurrence">Recurrence</Label><Select value={form.recurrence} onValueChange={(v) => setForm((c) => ({ ...c, recurrence: v as SpecialDateRecurrence }))} disabled={saving}><SelectTrigger id="special-date-recurrence"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(recurrenceLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="special-date-remind">Remind before (days)</Label><Input id="special-date-remind" type="number" min={0} max={30} value={form.remindBeforeDays} onChange={(e) => setForm((c) => ({ ...c, remindBeforeDays: Number(e.target.value) || 0 }))} className="h-11 rounded-xl" disabled={saving} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="special-date-label">Name this moment</Label><Input id="special-date-label" value={form.label} onChange={(e) => setForm((c) => ({ ...c, label: e.target.value }))} className="h-11 rounded-xl" placeholder="The day we met" maxLength={120} disabled={saving} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="special-date-message">Custom message <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="special-date-message" value={form.message} onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))} className="min-h-20 rounded-xl leading-7" placeholder="A special message for this day…" maxLength={2000} disabled={saving} /></div>
            <div className="space-y-2"><Label htmlFor="special-date-theme">Theme</Label><Select value={form.theme} onValueChange={(v) => setForm((c) => ({ ...c, theme: v as SpecialDateTheme }))} disabled={saving}><SelectTrigger id="special-date-theme"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(themeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="special-date-location">Location <span className="font-normal text-muted-foreground">(optional)</span></Label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" /><Input id="special-date-location" value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} className="h-11 rounded-xl pl-10" placeholder="Where it happened…" maxLength={200} disabled={saving} /></div></div>
            <div className="space-y-2"><Label htmlFor="special-date-enabled">Enabled</Label><Select value={form.enabled.toString()} onValueChange={(v) => setForm((c) => ({ ...c, enabled: v === "true" }))} disabled={saving}><SelectTrigger id="special-date-enabled"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="special-date-timezone">Timezone</Label><Select value={form.timezone} onValueChange={(v) => setForm((c) => ({ ...c, timezone: v }))} disabled={saving}><SelectTrigger id="special-date-timezone"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UTC">UTC</SelectItem><SelectItem value="America/New_York">Eastern</SelectItem><SelectItem value="America/Chicago">Central</SelectItem><SelectItem value="America/Denver">Mountain</SelectItem><SelectItem value="America/Los_Angeles">Pacific</SelectItem><SelectItem value="Europe/London">London</SelectItem><SelectItem value="Europe/Paris">Paris</SelectItem><SelectItem value="Asia/Tokyo">Tokyo</SelectItem><SelectItem value="Australia/Sydney">Sydney</SelectItem></SelectContent></Select></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="special-date-notes">A note <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="special-date-notes" value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} className="min-h-20 rounded-xl leading-7" placeholder="The detail you never want to forget…" maxLength={500} disabled={saving} /></div>
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
