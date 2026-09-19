import { useState } from "react";
import { ArrowLeft, Check, Heart, LoaderCircle, MailOpen, Pencil, Plus, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { useOpenWhen, type OpenWhenLetter } from "@/hooks/use-open-when";

const letterSchema = z.object({
  occasion: z.string().trim().min(1, "Add the moment this letter is for.").max(80, "Keep the moment under 80 characters."),
  title: z.string().trim().min(1, "Add a title for the letter.").max(120, "Keep the title under 120 characters."),
  body: z.string().trim().min(1, "Write something for this moment.").max(4000, "Keep the letter under 4,000 characters."),
});

type FormState = {
  id?: string;
  occasion: string;
  title: string;
  body: string;
};

const blankForm: FormState = {
  occasion: "",
  title: "",
  body: "",
};

export default function Discover() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { letters, loading, saving, error, refresh, saveLetter, removeLetter } = useOpenWhen();
  const [openLetterId, setOpenLetterId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);

  function startNewLetter() {
    setForm(blankForm);
    setFormError(null);
    setSavedMessage(null);
  }

  function editLetter(letter: OpenWhenLetter) {
    setForm({ id: letter.id, occasion: letter.occasion, title: letter.title, body: letter.body });
    setFormError(null);
    setSavedMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    const result = letterSchema.safeParse(form);
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check the letter details.");
      return;
    }

    const response = await saveLetter({ id: form.id, ...result.data });
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    setSavedMessage("Your letter is waiting for the right moment.");
    if (response.letter) setForm({ id: response.letter.id, ...response.letter });
  }

  async function handleRemove(letter: OpenWhenLetter) {
    if (!window.confirm("Remove this Open When letter?")) return;
    const response = await removeLetter(letter.id);
    if (response.error) setFormError(response.error.message);
    if (form.id === letter.id) startNewLetter();
    if (openLetterId === letter.id) setOpenLetterId(null);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Loveline
        </Link>
        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Discover</p>
            <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">Little ways to feel close.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Letters for the moments when a little love would help.</p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-primary/10 bg-primary-soft/40 px-3.5 py-2 text-xs font-medium text-primary-dark sm:self-auto">
            <Heart className="size-3.5 fill-current" aria-hidden="true" />
            Made just for you
          </div>
        </div>
      </header>

      {isOwner && (
        <section className="mt-8 rounded-card border border-primary/15 bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="open-when-editor-title">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><MailOpen className="size-5" aria-hidden="true" /></div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Owner space</p>
                <h2 id="open-when-editor-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Write an Open When letter.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Give them something soft to open when you cannot be right there.</p>
              </div>
            </div>
            <Button variant="outline" className="h-10 shrink-0 rounded-full" onClick={startNewLetter}><Plus className="size-4" aria-hidden="true" />New</Button>
          </div>

          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><Check className="size-4 text-success" aria-hidden="true" /><AlertDescription>{savedMessage}</AlertDescription></Alert>}

          <form className="mt-6 grid gap-5 lg:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="open-when-occasion">Open when…</Label>
              <Input id="open-when-occasion" value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} className="h-11 rounded-xl" placeholder="you need a little courage" maxLength={80} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="open-when-title">Letter title</Label>
              <Input id="open-when-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-11 rounded-xl" placeholder="You have more strength than you think" maxLength={120} disabled={saving} />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="open-when-body">Your letter</Label>
              <Textarea id="open-when-body" value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} className="min-h-36 rounded-xl leading-7" placeholder="Write as if you were sitting beside them…" maxLength={4000} disabled={saving} />
              <p className="text-xs text-muted-foreground">Personal beats perfect.</p>
            </div>
            <div className="lg:col-span-2">
              <Button className="h-11 rounded-full px-5" type="submit" disabled={saving}>{saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}{saving ? "Saving letter…" : form.id ? "Save changes" : "Save letter"}</Button>
            </div>
          </form>
        </section>
      )}

      {error && (
        <Alert variant="destructive" className="mt-8">
          <AlertDescription className="flex items-center justify-between gap-3"><span>{error}</span><Button variant="ghost" className="h-8 rounded-full px-2 text-destructive" onClick={() => void refresh()}>Retry</Button></AlertDescription>
        </Alert>
      )}

      <section className="mt-10" aria-labelledby="open-when-list-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">For the in-between moments</p>
            <h2 id="open-when-list-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Open when you need me.</h2>
          </div>
          <span className="text-sm text-muted-foreground">{letters.length} {letters.length === 1 ? "letter" : "letters"}</span>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading Open When letters">
            {[1, 2].map((item) => <div className="h-36 animate-pulse rounded-card bg-surface-muted" key={item} />)}
          </div>
        ) : letters.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-14 text-center">
            <MailOpen className="mx-auto size-8 text-primary" aria-hidden="true" />
            <p className="mt-4 font-semibold">No letters are waiting yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">The right words will find their moment.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {letters.map((letter) => {
              const open = openLetterId === letter.id;
              return (
                <article key={letter.id} className={`rounded-card border bg-surface p-5 shadow-subtle transition sm:p-6 ${open ? "border-primary/30 shadow-card" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Open when {letter.occasion}</p>
                      <h3 className="font-display mt-3 text-2xl font-semibold leading-tight tracking-[-0.03em]">{letter.title}</h3>
                    </div>
                    <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><Heart className="size-4 fill-current" aria-hidden="true" /></div>
                  </div>
                  {open && <p className="mt-5 whitespace-pre-wrap border-t border-border/70 pt-5 text-sm leading-7 text-muted-foreground">{letter.body}</p>}
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <Button variant={open ? "secondary" : "default"} className="h-10 rounded-full" onClick={() => setOpenLetterId(open ? null : letter.id)}>{open ? "Close letter" : "Open letter"}<MailOpen className="size-4" aria-hidden="true" /></Button>
                    {isOwner && <div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="rounded-full" aria-label="Edit letter" onClick={() => editLetter(letter)}><Pencil className="size-4" aria-hidden="true" /></Button><Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Remove letter" onClick={() => void handleRemove(letter)} disabled={saving}><Trash2 className="size-4" aria-hidden="true" /></Button></div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
