import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Check, FileText, MailPlus, Plus, Send, Sparkles, Sun, Moon, Heart, Trophy, Smile, Dice1 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePersonalMessages, type PersonalMessage, type PersonalMessageStatus } from "@/hooks/use-personal-messages";
import { useSpecialDates, type SpecialDate } from "@/hooks/use-special-dates";

const messageSchema = z.object({
  title: z.string().trim().min(1, "Add a title for the message.").max(120, "Keep the title under 120 characters."),
  body: z.string().trim().min(1, "Write something for your person.").max(4000, "Keep the message under 4,000 characters."),
  messageType: z.enum(["good_morning", "good_night", "miss_you", "proud", "encouragement", "laugh", "random"]),
  status: z.enum(["draft", "scheduled", "published"]),
  scheduledFor: z.string().nullable(),
  specialDateId: z.string().nullable().optional(),
});

type FormState = {
  id?: string;
  title: string;
  body: string;
  messageType: "good_morning" | "good_night" | "miss_you" | "proud" | "encouragement" | "laugh" | "random";
  status: "draft" | "scheduled" | "published";
  scheduledFor: string;
  specialDateId?: string;
};

const blankForm: FormState = {
  title: "",
  body: "",
  messageType: "random",
  status: "draft",
  scheduledFor: "",
  specialDateId: "",
};

function statusLabel(status: PersonalMessageStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusVariant(status: PersonalMessageStatus) {
  if (status === "published") return "default" as const;
  if (status === "scheduled") return "secondary" as const;
  return "outline" as const;
}

function messageTypeLabel(type: string) {
  const labels: Record<string, string> = {
    good_morning: "Good morning",
    good_night: "Good night",
    miss_you: "Miss you",
    proud: "I'm proud of you",
    encouragement: "Encouragement",
    laugh: "Make them laugh",
    random: "Random",
  };
  return labels[type] ?? type;
}

function messageTypeIcon(type: string) {
  const icons: Record<string, any> = {
    good_morning: Sun,
    good_night: Moon,
    miss_you: Heart,
    proud: Trophy,
    encouragement: Sparkles,
    laugh: Smile,
    random: Dice1,
  };
  return icons[type] ?? FileText;
}

function localDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function displayDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessageWorkspace() {
  const { messages, loading, error, saving, refresh, saveMessage } = usePersonalMessages();
  const { dates: specialDates } = useSpecialDates();
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === form.id) ?? null,
    [form.id, messages],
  );

  useEffect(() => {
    if (!form.id || selectedMessage) return;
    setForm(blankForm);
  }, [form.id, selectedMessage]);

  function startNewMessage() {
    setForm(blankForm);
    setFormError(null);
    setSavedMessage(null);
  }

  function editMessage(message: PersonalMessage) {
    setForm({
      id: message.id,
      title: message.title,
      body: message.body,
      messageType: message.messageType,
      status: message.status === "archived" ? "draft" : message.status,
      scheduledFor: localDateTimeValue(message.scheduledFor),
      specialDateId: message.specialDateId ?? "",
    });
    setFormError(null);
    setSavedMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);

    const scheduledFor = form.status === "scheduled" && form.scheduledFor
      ? new Date(form.scheduledFor).toISOString()
      : null;
    const result = messageSchema.safeParse({
      title: form.title,
      body: form.body,
      messageType: form.messageType,
      status: form.status,
      scheduledFor,
      specialDateId: form.specialDateId,
    });

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check your message details.");
      return;
    }

    if (form.status === "scheduled" && (!scheduledFor || new Date(scheduledFor) <= new Date())) {
      setFormError("Choose a time in the future for a scheduled message.");
      return;
    }

    const response = await saveMessage({
      id: form.id,
      title: result.data.title,
      body: result.data.body,
      messageType: result.data.messageType,
      status: result.data.status,
      scheduledFor,
      specialDateId: form.specialDateId,
    });

    if (response.error) {
      setFormError(response.error.message);
      return;
    }

    setSavedMessage(
      form.status === "published"
        ? "Your message is now waiting in Loveline."
        : form.status === "scheduled"
          ? "Your message is scheduled."
          : "Draft saved.",
    );
    setForm({ ...blankForm });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Loveline
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Owner space / Messages</p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Write something they&apos;ll keep.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Create a personal note, keep it as a draft, or choose when it should meet them.</p>
        </div>
        <Button className="h-11 rounded-full px-5" onClick={startNewMessage}>
          <Plus className="size-4" aria-hidden="true" />
          New message
        </Button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-6" aria-labelledby="message-list-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your library</p>
              <h2 id="message-list-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Messages</h2>
            </div>
            <span className="text-sm text-muted-foreground">{messages.length}</span>
          </div>

          {loading && (
            <div className="mt-6 space-y-3" aria-label="Loading messages" aria-busy="true">
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
          {!loading && !error && messages.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface-muted/50 p-6 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><MailPlus className="size-5" aria-hidden="true" /></div>
              <p className="mt-4 font-semibold">Nothing here yet.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Your first message can be small, honest, and completely yours.</p>
              <Button variant="outline" className="mt-5 h-10 rounded-full" onClick={startNewMessage}>Write the first one</Button>
            </div>
          )}
          {!loading && messages.length > 0 && (
            <div className="mt-5 space-y-2">
              {messages.map((message) => (
                <button
                  type="button"
                  key={message.id}
                  onClick={() => editMessage(message)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${form.id === message.id ? "border-primary/40 bg-primary-soft/30" : "border-border hover:bg-surface-muted"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="truncate font-semibold">{message.title}</span>
                    <Badge variant={statusVariant(message.status)}>{statusLabel(message.status)}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{message.body}</p>
                  {message.status === "scheduled" && message.scheduledFor && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary-dark"><CalendarClock className="size-3.5" aria-hidden="true" />{displayDate(message.scheduledFor)}</p>}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="composer-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">A note from you</p>
              <h2 id="composer-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">{form.id ? "Keep shaping it." : "Start with a feeling."}</h2>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><FileText className="size-5" aria-hidden="true" /></div>
          </div>

          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><Check className="size-4 text-success" aria-hidden="true" /><AlertDescription>{savedMessage}</AlertDescription></Alert>}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="message-title">Title</Label>
              <Input id="message-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-xl" placeholder="A little reminder" disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-type">What kind of message?</Label>
              <Select value={form.messageType} onValueChange={(v) => setForm((current) => ({ ...current, messageType: v as FormState["messageType"] }))} disabled={saving}>
                <SelectTrigger id="message-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="good_morning"><Sun className="size-4 mr-2" aria-hidden="true" />Good morning</SelectItem>
                  <SelectItem value="good_night"><Moon className="size-4 mr-2" aria-hidden="true" />Good night</SelectItem>
                  <SelectItem value="miss_you"><Heart className="size-4 mr-2" aria-hidden="true" />Miss you</SelectItem>
                  <SelectItem value="proud"><Trophy className="size-4 mr-2" aria-hidden="true" />I&apos;m proud of you</SelectItem>
                  <SelectItem value="encouragement"><Sparkles className="size-4 mr-2" aria-hidden="true" />Encouragement</SelectItem>
                  <SelectItem value="laugh"><Smile className="size-4 mr-2" aria-hidden="true" />Make them laugh</SelectItem>
                  <SelectItem value="random"><Dice1 className="size-4 mr-2" aria-hidden="true" />Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-title">Title</Label>
              <Input id="message-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-xl" placeholder="A little reminder" disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-body">Message</Label>
              <Textarea id="message-body" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} className="min-h-44 rounded-xl leading-7" placeholder="Write it like you would say it…" disabled={saving} />
              <p className="text-xs text-muted-foreground">Personal beats perfect.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message-status">When should it arrive?</Label>
              <Select value={form.status} onValueChange={(v) => setForm((current) => ({ ...current, status: v as FormState["status"] }))} disabled={saving}>
                <SelectTrigger id="message-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Keep as a draft</SelectItem>
                  <SelectItem value="scheduled">Schedule for later</SelectItem>
                  <SelectItem value="published">Deliver now</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "scheduled" && (
              <div className="space-y-2">
                <Label htmlFor="message-schedule">Choose a date and time</Label>
                <div className="relative">
                  <CalendarClock className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                  <Input id="message-schedule" type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} className="h-11 rounded-xl pl-10" disabled={saving} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="message-special-date">Link to special date <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Select value={form.specialDateId ?? ""} onValueChange={(v) => setForm((current) => ({ ...current, specialDateId: v || undefined }))} disabled={saving}>
                <SelectTrigger id="message-special-date"><SelectValue placeholder="Choose a special date…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {specialDates.map((date) => (
                    <SelectItem key={date.id} value={date.id}>{date.label} ({formatDate(date.eventDate)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="h-11 w-full rounded-full" type="submit" disabled={saving}>
              {saving ? "Saving…" : form.status === "draft" ? "Save draft" : form.status === "scheduled" ? "Schedule message" : "Deliver message"}
              {form.status === "published" ? <Send className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
