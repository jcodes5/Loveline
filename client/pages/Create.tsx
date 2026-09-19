import { useState } from "react";
import { ArrowLeft, Check, Download, LoaderCircle, Palette, Quote, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { quoteCardImageUrl, useQuoteCards, type QuoteCard, type QuoteCardPalette } from "@/hooks/use-quote-cards";

const cardSchema = z.object({
  quoteText: z.string().trim().min(1, "Write a quote for the card.").max(600, "Keep the quote under 600 characters."),
  quoteAuthor: z.string().trim().min(1, "Add the quote author.").max(160, "Keep the author under 160 characters."),
  quoteSource: z.string().trim().max(160, "Keep the source under 160 characters."),
  palette: z.enum(["rose", "dusk", "honey"]),
});

type FormState = {
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string;
  palette: QuoteCardPalette;
};

const blankForm: FormState = {
  quoteText: "",
  quoteAuthor: "",
  quoteSource: "",
  palette: "rose",
};

const paletteMeta: Record<QuoteCardPalette, { label: string; background: string; foreground: string; accent: string }> = {
  rose: { label: "Soft rose", background: "#fff1f3", foreground: "#4b2632", accent: "#c85a78" },
  dusk: { label: "Quiet dusk", background: "#30242a", foreground: "#fff8f6", accent: "#efb0be" },
  honey: { label: "Warm honey", background: "#f4e8cf", foreground: "#493b2f", accent: "#a86e47" },
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function previewLines(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= 27 || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

export default function Create() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const { cards, loading, saving, error, refresh, createCard, removeCard } = useQuoteCards();
  const [form, setForm] = useState<FormState>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [savedCard, setSavedCard] = useState<QuoteCard | null>(null);
  const isOwner = Boolean(user && relationship?.ownerId === user.id);
  const colors = paletteMeta[form.palette];
  const previewQuote = previewLines(form.quoteText || "A little thought to keep close.");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setSavedMessage(null);
    const result = cardSchema.safeParse(form);
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check the quote card details.");
      return;
    }

    const response = await createCard({
      quoteText: result.data.quoteText,
      quoteAuthor: result.data.quoteAuthor,
      quoteSource: result.data.quoteSource || null,
      palette: result.data.palette,
    });
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    setSavedCard(response.card ?? null);
    setSavedMessage("Your quote card is ready to keep.");
  }

  async function handleRemove(card: QuoteCard) {
    if (!window.confirm("Remove this quote card from Loveline?")) return;
    const result = await removeCard(card.id);
    if (result.error) setFormError(result.error.message);
    if (savedCard?.id === card.id) setSavedCard(null);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Loveline
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Create</p>
        <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">Make something personal.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Turn a thought you love into a little card worth coming back to.</p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="create-quote-title">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><Quote className="size-5" aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">A thought to keep</p>
              <h2 id="create-quote-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Build a quote card.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">The final card is rendered on the Loveline server before it is saved.</p>
            </div>
          </div>

          {!isOwner && (
            <Alert className="mt-6 border-primary/15 bg-primary-soft/35">
              <AlertDescription>Saved quote cards are here to revisit. Ask the owner of your Loveline to create a new one.</AlertDescription>
            </Alert>
          )}
          {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}
          {savedMessage && <Alert className="mt-6 border-success/25 bg-success/10"><Check className="size-4 text-success" aria-hidden="true" /><AlertDescription>{savedMessage}</AlertDescription></Alert>}

          {isOwner && (
            <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="quote-text">Quote</Label>
                <Textarea id="quote-text" value={form.quoteText} onChange={(event) => setForm((current) => ({ ...current, quoteText: event.target.value }))} className="min-h-36 rounded-xl leading-7" placeholder="There is no charm equal to tenderness of heart." maxLength={600} disabled={saving} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quote-author">Author</Label>
                  <Input id="quote-author" value={form.quoteAuthor} onChange={(event) => setForm((current) => ({ ...current, quoteAuthor: event.target.value }))} className="h-11 rounded-xl" placeholder="Jane Austen" maxLength={160} disabled={saving} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-source">Source <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="quote-source" value={form.quoteSource} onChange={(event) => setForm((current) => ({ ...current, quoteSource: event.target.value }))} className="h-11 rounded-xl" placeholder="Sense and Sensibility" maxLength={160} disabled={saving} />
                </div>
              </div>
              <fieldset className="space-y-3">
                <legend className="inline-flex items-center gap-2 text-sm font-medium"><Palette className="size-4 text-primary" aria-hidden="true" />Choose a feeling</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(Object.keys(paletteMeta) as QuoteCardPalette[]).map((palette) => (
                    <button
                      type="button"
                      key={palette}
                      onClick={() => setForm((current) => ({ ...current, palette }))}
                      className={`rounded-xl border px-3 py-3 text-left text-sm transition ${form.palette === palette ? "border-primary ring-2 ring-primary/20" : "border-border hover:bg-surface-muted"}`}
                      style={{ backgroundColor: paletteMeta[palette].background, color: paletteMeta[palette].foreground }}
                      aria-pressed={form.palette === palette}
                    >
                      <span className="block size-3 rounded-full" style={{ backgroundColor: paletteMeta[palette].accent }} aria-hidden="true" />
                      <span className="mt-2 block font-semibold">{paletteMeta[palette].label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <Button className="h-11 w-full rounded-full" type="submit" disabled={saving}>
                {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                {saving ? "Making your card…" : "Save quote card"}
                {!saving && <Sparkles className="size-4" aria-hidden="true" />}
              </Button>
            </form>
          )}
        </section>

        <section aria-labelledby="quote-preview-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Preview</p>
              <h2 id="quote-preview-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">A small thing to hold.</h2>
            </div>
            <span className="text-sm text-muted-foreground">{cards.length} saved</span>
          </div>
          <div className="mt-5 overflow-hidden rounded-[28px] p-7 shadow-card sm:p-10" style={{ backgroundColor: colors.background, color: colors.foreground }}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: colors.accent }}>LOVELINE</p>
            <div className="mt-12 min-h-[260px]">
              <p className="font-display text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                {previewQuote.map((line, index) => <span className="block" key={`${line}-${index}`}>{index === 0 ? `“${line}` : line}{index === previewQuote.length - 1 ? "”" : ""}</span>)}
              </p>
            </div>
            <div className="mt-8 border-t pt-5" style={{ borderColor: `${colors.accent}66` }}>
              <p className="text-sm font-semibold">{form.quoteAuthor || "Someone wise"}</p>
              {form.quoteSource && <p className="mt-1 text-sm opacity-65">{form.quoteSource}</p>}
            </div>
          </div>

          {savedCard && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/10 p-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-success"><Check className="size-4" aria-hidden="true" />Saved and ready to revisit</span>
              <Button asChild variant="outline" className="h-9 rounded-full bg-surface">
                <a href={quoteCardImageUrl(savedCard.svg)} download="loveline-quote-card.svg"><Download className="size-4" aria-hidden="true" />Download SVG</a>
              </Button>
            </div>
          )}
        </section>
      </div>

      <section className="mt-12" aria-labelledby="saved-cards-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Your saved pieces</p>
            <h2 id="saved-cards-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Cards to come back to.</h2>
          </div>
          {error && <Button variant="ghost" className="rounded-full text-destructive" onClick={() => void refresh()}>Retry</Button>}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading quote cards">
            {[1, 2, 3].map((item) => <div className="aspect-square animate-pulse rounded-card bg-surface-muted" key={item} />)}
          </div>
        ) : cards.length === 0 ? (
          <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-12 text-center">
            <Quote className="mx-auto size-7 text-primary" aria-hidden="true" />
            <p className="mt-4 font-semibold">Nothing saved yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">The first one can be just for today.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <article key={card.id} className="group overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
                <img src={quoteCardImageUrl(card.svg)} alt={`Quote by ${card.quoteAuthor}`} loading="lazy" className="aspect-square w-full object-cover" />
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{card.quoteAuthor}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{displayDate(card.createdAt)}</p>
                  </div>
                  {isOwner && <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Remove quote card" onClick={() => void handleRemove(card)} disabled={saving}><Trash2 className="size-4" aria-hidden="true" /></Button>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
