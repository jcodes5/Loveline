import { useEffect, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowLeft, BookOpen, CalendarHeart, Check, Copy, Download, Feather, Heart, Image as ImageIcon, LayoutGrid, Layers, LoaderCircle, Quote, RefreshCw, Send, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Reveal";
import { useMemories } from "@/hooks/use-memories";
import { useLoveReactions } from "@/hooks/use-love-reactions";
import { useQuoteCards, quoteCardImageUrl, type QuoteCard, type QuoteCardAlignment, type QuoteCardInput, type QuoteCardPalette, type QuoteCardTemplate } from "@/hooks/use-quote-cards";
import { useStudioPoetry, type StudioPoem } from "@/hooks/use-studio-poetry";

type StudioTemplate = "romantic" | "minimal" | "polaroid" | "twilight" | "letterpress";
type BgType = "template" | "gradient" | "image";
type GradientKey = "rose_dawn" | "lavender_dusk" | "golden_hour" | "twilight_velvet";

const dbTemplate: Record<StudioTemplate, QuoteCardTemplate> = {
  romantic: "romantic",
  minimal: "minimal",
  polaroid: "polaroid",
  twilight: "night",
  letterpress: "letterpress",
};

const cardSchema = z.object({
  quoteText: z.string().trim().min(1, "Write something for the card.").max(600, "Keep it under 600 characters."),
  quoteAuthor: z.string().trim().min(1, "Add an author line.").max(160, "Keep the author under 160 characters."),
  quoteSource: z.string().trim().max(160, "Keep the source under 160 characters."),
});

const PALETTES: Record<QuoteCardPalette, { label: string; background: string; foreground: string; accent: string }> = {
  rose: { label: "Soft rose", background: "#fff1f3", foreground: "#4b2632", accent: "#c85a78" },
  dusk: { label: "Quiet dusk", background: "#30242a", foreground: "#fff8f6", accent: "#efb0be" },
  honey: { label: "Warm honey", background: "#f4e8cf", foreground: "#493b2f", accent: "#a86e47" },
};

const GRADIENTS: Record<GradientKey, { label: string; css: string; foreground: string; accent: string; brandForeground: string }> = {
  rose_dawn: { label: "Rose dawn", css: "linear-gradient(135deg, #f9c5d1 0%, #e98aa2 60%, #d1698a 100%)", foreground: "#4b2030", accent: "#7d2440", brandForeground: "#7d2440" },
  lavender_dusk: { label: "Lavender dusk", css: "linear-gradient(135deg, #e5dbf5 0%, #b9a6e0 50%, #8d76c9 100%)", foreground: "#2c2340", accent: "#5a4296", brandForeground: "#5a4296" },
  golden_hour: { label: "Golden hour", css: "linear-gradient(135deg, #fdeec1 0%, #f2c96f 50%, #d99b42 100%)", foreground: "#3f2b14", accent: "#8f5a1f", brandForeground: "#8f5a1f" },
  twilight_velvet: { label: "Twilight velvet", css: "linear-gradient(135deg, #241e33 0%, #3b2d53 55%, #6e5787 100%)", foreground: "#fbf0ff", accent: "#e9c4ff", brandForeground: "#e9c4ff" },
};

const TEMPLATES: Record<StudioTemplate, { label: string; blurb: string; background: string; foreground: string; accent: string; brandForeground: string }> = {
  romantic: { label: "Romantic", blurb: "Soft wash, gentle hearts", background: "#fff1f3", foreground: "#4b2632", accent: "#c85a78", brandForeground: "#c85a78" },
  minimal: { label: "Minimal", blurb: "A quiet line of type", background: "#fbfaf7", foreground: "#22212a", accent: "#9c8a74", brandForeground: "#22212a" },
  polaroid: { label: "Polaroid", blurb: "Like a tape-pinned print", background: "#f7f5f0", foreground: "#2c2a26", accent: "#a89270", brandForeground: "#a89270" },
  twilight: { label: "Twilight", blurb: "Deep sky, tiny stars", background: "#221b31", foreground: "#f5ecff", accent: "#e3c3ff", brandForeground: "#e3c3ff" },
  letterpress: { label: "Letterpress", blurb: "Cream, ink, and a fine rule", background: "#f4ecd8", foreground: "#4a3a22", accent: "#9a6b3f", brandForeground: "#4a3a22" },
};

const ALIGNMENTS: { value: QuoteCardAlignment; label: string; icon: typeof AlignLeft }[] = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
];

const STARTER_POEMS: StudioPoem[] = [
  {
    title: "Small things",
    poem: "I keep the small things —\nthe way you say my name first thing,\nyour hand finding mine at a crosswalk,\nthe quiet after an easy laugh.",
  },
  {
    title: "Long way home",
    poem: "Every road leads somewhere.\nYours led here,\nand I keep finding that this\nis the only place I meant to arrive.",
  },
  {
    title: "Ordinary",
    poem: "Out of the ordinary days\nyou are the steady one —\nevening tea, slow music,\nand your head nodding close.",
  },
];

function previewLines(value: string, maxChars = 40) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) current = next;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function readAndDownscale(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const source = String(reader.result);
      const image = new Image();
      image.addEventListener("load", () => {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      });
      image.addEventListener("error", () => resolve(null));
      image.src = source;
    });
    reader.addEventListener("error", () => resolve(null));
    reader.readAsDataURL(file);
  });
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatToday() {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
}

export default function Create() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const quoteCards = useQuoteCards();
  const { addMemory } = useMemories();
  const { incoming, sendLove, dismissIncoming } = useLoveReactions();
  const { poem: aiPoem, generating, generatePoem } = useStudioPoetry();
  const { toast } = useToast();

  const [template, setTemplate] = useState<StudioTemplate>("romantic");
  const [bgType, setBgType] = useState<BgType>("template");
  const [gradient, setGradient] = useState<GradientKey>("rose_dawn");
  const [backgroundDataUrl, setBackgroundDataUrl] = useState<string | null>(null);
  const [alignment, setAlignment] = useState<QuoteCardAlignment>("center");
  const [showDate, setShowDate] = useState(false);
  const [palette, setPalette] = useState<QuoteCardPalette>("rose");

  const [form, setForm] = useState({ quoteText: "", quoteAuthor: "", quoteSource: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [poetOpen, setPoetOpen] = useState(false);
  const [poetTheme, setPoetTheme] = useState("");
  const [savedCard, setSavedCard] = useState<QuoteCard | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = PALETTES[palette];
  const bgStyle =
    bgType === "gradient"
      ? { background: GRADIENTS[gradient].css }
      : { background: bgType === "image" ? "#30242a" : colors.background };
  const textColor =
    bgType === "gradient"
      ? GRADIENTS[gradient].foreground
      : bgType === "image"
        ? "#fff8f6"
      : colors.foreground;
  const accentColor =
    bgType === "gradient"
      ? GRADIENTS[gradient].accent
      : bgType === "image"
        ? "#f2c6d4"
      : colors.accent;
  const brandColor =
    bgType === "gradient"
      ? GRADIENTS[gradient].brandForeground
      : bgType === "image"
        ? "#f2c6d4"
        : colors.accent;
  const previewQuote = previewLines(form.quoteText || "A little thought, quietly yours.");
  const previewFontSize = previewQuote.length > 4 ? Math.max(18, 48 - (previewQuote.length - 4) * 2.5) : 48;
  const alignClass = alignment === "left" ? "items-start text-left" : alignment === "right" ? "items-end text-right" : "items-center text-center";
  const previewTextClass = alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";

  useEffect(() => {
    if (incoming.length === 0) return;
    const latest = incoming[0];
    const alreadySeen = savedCard?.id === latest.cardId;
    toast({
      title: alreadySeen ? "A little love is headed your way." : "They sent you a heart.",
      description: alreadySeen ? "Your partner liked the card you just made." : "Open your timeline to feel it.",
    });
    dismissIncoming(latest.id);
  }, [incoming, dismissIncoming, savedCard, toast]);

  function cardInput(): QuoteCardInput {
    return {
      quoteText: form.quoteText.trim(),
      quoteAuthor: form.quoteAuthor.trim() || "— your poet",
      quoteSource: form.quoteSource.trim() || null,
      palette,
      template: dbTemplate[template],
      bgType,
      gradient: bgType === "gradient" ? gradient : null,
      backgroundDataUrl: bgType === "image" ? backgroundDataUrl : null,
      alignment,
      showDate,
    };
  }

  function validateCard() {
    const result = cardSchema.safeParse(form);
    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? "Check the card details.");
      return null;
    }
    return result.data;
  }

  async function handleSave() {
    setFormError(null);
    const data = validateCard();
    if (!data) return;
    const response = await quoteCards.createCard(cardInput());
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    setSavedCard(response.card ?? null);
    toast({ title: "Saved to Loveline", description: "Your card will live among the pieces you keep." });
  }

  async function handleDownload() {
    setFormError(null);
    const data = validateCard();
    if (!data) return;
    const response = await quoteCards.renderCardPng(cardInput());
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    const url = URL.createObjectURL(response.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "loveline-card.png";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleScrapbook() {
    setFormError(null);
    const data = validateCard();
    if (!data) return;
    const response = await quoteCards.renderCardPng(cardInput());
    if (response.error) {
      setFormError(response.error.message);
      return;
    }
    const file = new File([response.blob], "loveline-card.png", { type: "image/png" });
    const upload = await addMemory(file, `A card we made together.`, new Date().toISOString().slice(0, 10));
    if (upload.error) {
      setFormError(upload.error.message);
      return;
    }
    toast({ title: "Saved to your scrapbook", description: "It will settle into your timeline." });
  }

  async function handleSend() {
    setFormError(null);
    const data = validateCard();
    if (!data) return;
    if (!savedCard) {
      const response = await quoteCards.createCard(cardInput());
      if (response.error) {
        setFormError(response.error.message);
        return;
      }
      setSavedCard(response.card ?? null);
    }
    const result = savedCard ? await sendLove(savedCard.id) : await sendLove(quoteCards.cards[0]?.id ?? null);
    if (result.error) {
      setFormError(result.error.message);
      return;
    }
    toast({ title: "Sent with love", description: "A little heart is on its way to their wall." });
  }

  async function handleCopy() {
    const data = validateCard();
    if (!data) return;
    const text = `“${data.quoteText}” — ${data.quoteAuthor}${data.quoteSource ? `, ${data.quoteSource}` : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Your card text is ready to share." });
    } catch {
      setFormError("We couldn't copy that right now.");
    }
  }

  async function handleAskPoet() {
    const response = await generatePoem({
      relationshipId: relationship?.id,
      relationshipName: relationship?.name,
      theme: poetTheme || "love, presence, small shared moments",
    });
    if (!response.error && response.poem) {
      const provided = response.poem;
      setForm((current) => ({
        ...current,
        quoteText: provided.poem || current.quoteText,
        quoteAuthor: provided.title ? `— ${provided.title}` : "— your poet",
        quoteSource: "Original poem",
      }));
      setPoetOpen(false);
    }
  }

  function useStarterPoem(poem: StudioPoem) {
    setForm((current) => ({
      ...current,
      quoteText: poem.poem,
      quoteAuthor: `— ${poem.title}`,
      quoteSource: "Original poem",
    }));
  }

  function handleImageFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void (async () => {
      const dataUrl = await readAndDownscale(file);
      if (!dataUrl) {
        setFormError("That image could not be read. Try a JPG, PNG, or WebP.");
        return;
      }
      setBackgroundDataUrl(dataUrl);
      setFormError(null);
    })();
    event.target.value = "";
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="border-b border-border/70 pb-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Loveline
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Loveline / Create</p>
        <h1 className="font-display mt-2 text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">The quote card studio.</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Give a feeling a shape. Design it, export it, or send a little heart straight to their wall.</p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {["Try tapping between templates", "A gradient makes the words glow", "Send a heart and watch it land", "Save a card to the scrapbook"].map((tip) => (
          <span key={tip} className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary-soft/40 px-3 py-1.5 text-xs font-medium text-primary-dark">
            <Sparkles className="size-3.5" aria-hidden="true" /> {tip}
          </span>
        ))}
      </div>

      {formError && <Alert variant="destructive" className="mt-6"><AlertDescription>{formError}</AlertDescription></Alert>}

      <Reveal className="mt-8" delay={0.05}>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="studio-controls-title">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark"><LayoutGrid className="size-5" aria-hidden="true" /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Design</p>
              <h2 id="studio-controls-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Shape the card.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Every change shows up live on the preview beside you.</p>
            </div>
          </div>

          <fieldset className="mt-8 space-y-3">
            <legend className="text-sm font-medium">Template</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(TEMPLATES) as StudioTemplate[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setTemplate(key)}
                  className={`rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 ${template === key ? "border-primary ring-2 ring-primary/20 shadow-subtle hover:-translate-y-0.5" : "border-border hover:-translate-y-0.5 hover:bg-surface-muted hover:shadow-subtle"} border active:scale-[0.97]`}
                  style={{ backgroundColor: TEMPLATES[key].background }}
                  aria-pressed={template === key}
                >
                  <span className="block font-semibold" style={{ color: TEMPLATES[key].foreground }}>{TEMPLATES[key].label}</span>
                  <span className="mt-0.5 block text-xs opacity-70" style={{ color: TEMPLATES[key].foreground }}>{TEMPLATES[key].blurb}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7 space-y-3">
            <legend className="text-sm font-medium">Background</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {([
                { value: "template" as BgType, label: "Template art", icon: LayoutGrid },
                { value: "gradient" as BgType, label: "Gradient", icon: Layers },
                { value: "image" as BgType, label: "Photo", icon: ImageIcon },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setBgType(value)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${bgType === value ? "border-primary bg-primary-soft/50 text-primary-dark shadow-subtle" : "border-border hover:bg-surface-muted hover:shadow-subtle"}`}
                  aria-pressed={bgType === value}
                >
                  <Icon className="size-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
            {bgType === "gradient" && (
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(GRADIENTS) as GradientKey[]).map((key) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setGradient(key)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${gradient === key ? "border-primary ring-2 ring-primary/20 shadow-subtle" : "border-border hover:bg-surface-muted hover:shadow-subtle"}`}
                    aria-pressed={gradient === key}
                  >
                    <span className="block h-2.5 w-full rounded-full" style={{ background: GRADIENTS[key].css }} aria-hidden="true" />
                    <span className="mt-1.5 block font-medium">{GRADIENTS[key].label}</span>
                  </button>
                ))}
              </div>
            )}
            {bgType === "image" && (
              <div className="space-y-3">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFile} />
                <Button type="button" variant="outline" className="w-full rounded-full" onClick={() => fileInputRef.current?.click()}>
                  {backgroundDataUrl ? <RefreshCw className="size-4" aria-hidden="true" /> : <ImageIcon className="size-4" aria-hidden="true" />}
                  {backgroundDataUrl ? "Choose a different photo" : "Choose a photo"}
                </Button>
                {backgroundDataUrl && (
                  <img src={backgroundDataUrl} alt="Card background preview" className="h-28 w-full rounded-xl object-cover" />
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="mt-7 space-y-3">
            <legend className="text-sm font-medium">Alignment</legend>
            <div className="grid grid-cols-3 gap-2">
              {ALIGNMENTS.map(({ value, label, icon: Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setAlignment(value)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${alignment === value ? "border-primary bg-primary-soft/50 text-primary-dark shadow-subtle" : "border-border hover:bg-surface-muted hover:shadow-subtle"}`}
                  aria-pressed={alignment === value}
                >
                  <Icon className="size-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-7 space-y-3">
            <legend className="text-sm font-medium">Feeling</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(PALETTES) as QuoteCardPalette[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPalette(key)}
                  style={{ backgroundColor: PALETTES[key].background, color: PALETTES[key].foreground }}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] ${palette === key ? "border-primary ring-2 ring-primary/20 shadow-subtle" : "border-border hover:bg-surface-muted hover:shadow-subtle"}`}
                  aria-pressed={palette === key}
                >
                  <span className="block size-3 rounded-full" style={{ backgroundColor: PALETTES[key].accent }} aria-hidden="true" />
                  <span className="mt-2 block font-semibold">{PALETTES[key].label}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <CalendarHeart className="size-4 text-primary" aria-hidden="true" /> Show today's date
            </span>
            <Switch checked={showDate} onCheckedChange={setShowDate} aria-label="Show today's date on the card" />
          </div>

          <div className="mt-7 space-y-2">
            <Label htmlFor="quote-text">Words</Label>
            <Textarea id="quote-text" value={form.quoteText} onChange={(event) => setForm((current) => ({ ...current, quoteText: event.target.value }))} className="min-h-36 rounded-xl leading-7" placeholder="Write your own words, or let our poet try." maxLength={600} disabled={quoteCards.saving || generating} />
          </div>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quote-author">Author line</Label>
              <Input id="quote-author" value={form.quoteAuthor} onChange={(event) => setForm((current) => ({ ...current, quoteAuthor: event.target.value }))} className="h-11 rounded-xl" placeholder="Jane Austen" maxLength={160} disabled={quoteCards.saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote-source">Source <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Input id="quote-source" value={form.quoteSource} onChange={(event) => setForm((current) => ({ ...current, quoteSource: event.target.value }))} className="h-11 rounded-xl" placeholder="Sense and Sensibility" maxLength={160} disabled={quoteCards.saving} />
            </div>
          </div>

          {poetOpen && (
            <div className="mt-6 space-y-4 rounded-2xl border border-primary/15 bg-primary-soft/30 p-5" aria-labelledby="poet-title">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold" id="poet-title"><BookOpen className="size-4 text-primary" aria-hidden="true" />From our poet</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Pick a start, or give the poet a thread to pull and it will write something new.</p>
              </div>
              <div className="space-y-2">
                {STARTER_POEMS.map((poem) => (
                  <button key={poem.title} type="button" onClick={() => useStarterPoem(poem)} className="block w-full rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-primary/30">
                    <span className="block font-semibold">{poem.title}</span>
                    <span className="mt-1 block whitespace-pre-line text-muted-foreground">{poem.poem.slice(0, 120)}{poem.poem.length > 120 ? "…" : ""}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="poet-theme">A thread to pull <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="poet-theme" value={poetTheme} onChange={(event) => setPoetTheme(event.target.value)} className="h-11 rounded-xl" placeholder="Your laugh, Sunday mornings, the drive home" maxLength={160} />
              </div>
              <Button type="button" className="w-full rounded-full" onClick={() => void handleAskPoet()} disabled={generating}>
                {generating ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Wand2 className="size-4" aria-hidden="true" />}
                {generating ? "Our poet is writing…" : "Ask our poet"}
              </Button>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="flex-1 basis-40 rounded-full bg-surface" onClick={() => setPoetOpen((open) => !open)}>
                <Feather className="size-4" aria-hidden="true" /> {poetOpen ? "Hide our poet" : "Ask our poet"}
              </Button>
              <Button type="button" variant="outline" className="flex-1 basis-40 rounded-full bg-surface" onClick={() => void handleCopy()}>
                <Copy className="size-4" aria-hidden="true" /> Copy words
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" className="h-11 rounded-full" onClick={() => void handleSave()} disabled={quoteCards.saving}>
                {quoteCards.saving && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                <Check className="size-4" aria-hidden="true" /> Save to Loveline
              </Button>
              <Button type="button" className="h-11 rounded-full" onClick={() => void handleDownload()} disabled={quoteCards.saving}>
                <Download className="size-4" aria-hidden="true" /> Download PNG
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="secondary" className="h-11 rounded-full" onClick={() => void handleScrapbook()} disabled={quoteCards.saving}>
                <ImageIcon className="size-4" aria-hidden="true" /> Save to scrapbook
              </Button>
              <Button type="button" variant="secondary" className="h-11 rounded-full" onClick={() => void handleSend()} disabled={quoteCards.saving || quoteCards.loading}>
                <Send className="size-4" aria-hidden="true" /> Send to partner
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Both halves of your Loveline can save cards and send hearts to each other.</p>
          </div>
        </section>

        <section aria-labelledby="studio-preview-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Live preview</p>
              <h2 id="studio-preview-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">This is what you are making.</h2>
            </div>
            <span className="text-sm text-muted-foreground">{quoteCards.cards.length} saved</span>
          </div>
          <div className="mt-5 relative overflow-hidden rounded-[28px] shadow-card" style={bgStyle}>
            {bgType === "image" && backgroundDataUrl && <img src={backgroundDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />}
            {bgType === "image" && <div className="absolute inset-0 bg-black/45" aria-hidden="true" />}
            <div key={`${template}-${bgType}-${palette}-${gradient}`} className="relative animate-pop-in flex aspect-square flex-col p-7 sm:p-10" style={{ color: textColor }}>
              {template === "romantic" && (
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: accentColor }}>LOVELINE</p>
                  <Heart className="size-4 fill-current" style={{ color: accentColor }} aria-hidden="true" />
                </div>
              )}
              {template === "minimal" && <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brandColor }}>LOVELINE</p>}
              {template === "polaroid" && (
                <div className="absolute top-5 left-2/4 h-8 w-24 -translate-x-2/4 rotate-[-4deg] rounded-sm bg-white/70 shadow-sm" aria-hidden="true" />
              )}
              {template === "twilight" && (
                <div className="flex items-start justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: brandColor }}>LOVELINE</p>
                  {[0, 1, 2].map((star) => <span key={star} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor, opacity: 0.9 }} aria-hidden="true" />)}
                </div>
              )}
              {template === "letterpress" && (
                <div className="pointer-events-none absolute top-6 bottom-6 right-6 left-6 rounded-none border-2" style={{ borderColor: `${accentColor}88` }} aria-hidden="true" />
              )}

              <div className={`mt-12 flex min-h-[240px] flex-1 flex-col justify-center ${alignClass}`}>
                <p className="font-display font-semibold leading-[1.08]" style={{ fontSize: previewFontSize }}>
                  {previewQuote.map((line, index) => (
                    <span className="block" key={`${line}-${index}`}>
                      {index === 0 ? `“${line}` : line}{index === previewQuote.length - 1 ? "”" : ""}
                    </span>
                  ))}
                </p>
                {showDate && (
                  <p className={`mt-5 text-sm tracking-wide ${previewTextClass}`} style={{ color: accentColor }}>
                    {formatToday()}
                  </p>
                )}
              </div>

              <div className="mt-8 border-t pt-5" style={{ borderColor: `${accentColor}66` }}>
                <div className={previewTextClass}>
                  <p className="text-sm font-semibold">{form.quoteAuthor || "— your poet"}</p>
                  {form.quoteSource && <p className="mt-1 text-sm opacity-65">{form.quoteSource}</p>}
                </div>
              </div>
            </div>
          </div>

          {savedCard && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-success/20 bg-success/10 p-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-success"><Check className="size-4" aria-hidden="true" />Saved and ready to revisit</span>
              <span className="text-xs text-success/80">{displayDate(savedCard.createdAt)}</span>
            </div>
          )}
        </section>
      </div>
      </Reveal>

      <Reveal className="mt-12" delay={0.05}>
        <section aria-labelledby="saved-cards-title">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Your saved pieces</p>
              <h2 id="saved-cards-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">Cards to come back to.</h2>
            </div>
            {quoteCards.error && <Button variant="ghost" className="rounded-full text-destructive" onClick={() => void quoteCards.refresh()}>Retry</Button>}
          </div>
          {quoteCards.error && <p className="mt-3 text-sm text-destructive">{quoteCards.error}</p>}
          {quoteCards.loading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading quote cards">
              {[1, 2, 3].map((item) => <div className="aspect-square animate-pulse rounded-card bg-surface-muted" key={item} />)}
            </div>
          ) : quoteCards.cards.length === 0 ? (
            <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 px-6 py-12 text-center">
              <Quote className="mx-auto size-7 text-primary" aria-hidden="true" />
              <p className="mt-4 font-semibold">Nothing saved yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">The first one can be just for today.</p>
            </div>
          ) : (
            <Stagger className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
              {quoteCards.cards.map((card) => (
                <StaggerItem key={card.id}>
                  <article className="card-lift group overflow-hidden rounded-card border border-border bg-surface shadow-subtle">
                    <div className="overflow-hidden">
                      <img src={card.imageUrl ?? quoteCardImageUrl(card.svg)} alt={`Card by ${card.quoteAuthor}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{card.quoteAuthor}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{displayDate(card.createdAt)}</p>
                      </div>
                      {user && card.createdBy === user.id && (
                        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-destructive" aria-label="Remove quote card" onClick={() => void handleRemove(card)} disabled={quoteCards.saving}>
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </article>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </section>
      </Reveal>
    </div>
  );

  async function handleRemove(card: QuoteCard) {
    if (!window.confirm("Remove this card from Loveline?")) return;
    const result = await quoteCards.removeCard(card.id);
    if (result.error) setFormError(result.error.message);
    if (savedCard?.id === card.id) setSavedCard(null);
  }
}
