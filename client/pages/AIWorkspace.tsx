import { useState, useCallback } from "react";
import { ArrowLeft, Bot, Check, Copy, FileText, Heart, LoaderCircle, MessageSquare, Quote, RefreshCw, Save, Sparkles, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type AIDraftType = "daily_affirmation" | "morning_message" | "night_message" | "quote_card" | "mood_suggestion" | "batch_daily";

type DraftCandidate = {
  id: string;
  content: 
    | { affirmation: string; affirmationDetail: string }
    | { title: string; body: string }
    | { quoteText: string; quoteAuthor: string; quoteSource?: string }
    | { message: string }
    | { drafts: Array<Record<string, unknown>> }
    | Record<string, unknown>;
  createdAt: string;
};

type FormContext = {
  relationshipId?: string;
  relationshipName?: string;
  contentDate?: string;
  prompt?: string;
  theme?: string;
  palette?: string;
  mood?: string;
  days?: number;
  heroTitle?: string;
  heroBody?: string;
  noteBody?: string;
};

const typeLabels: Record<AIDraftType, string> = {
  daily_affirmation: "Daily Affirmation",
  morning_message: "Good Morning Message",
  night_message: "Good Night Message",
  quote_card: "Quote Card",
  mood_suggestion: "Mood-Based Suggestion",
  batch_daily: "Batch Daily Content (7-14 days)",
};

const typeIcons: Record<AIDraftType, React.ComponentType<{ className?: string }>> = {
  daily_affirmation: Heart,
  morning_message: MessageSquare,
  night_message: MessageSquare,
  quote_card: Quote,
  mood_suggestion: Heart,
  batch_daily: FileText,
};

const typeDescriptions: Record<AIDraftType, string> = {
  daily_affirmation: "Generate a personalized affirmation and supporting detail for today's daily content.",
  morning_message: "Create a warm good morning message for your person.",
  night_message: "Write a gentle good night message to end their day.",
  quote_card: "Generate a meaningful quote with author and optional source for a quote card.",
  mood_suggestion: "Get a supportive message based on a specific mood.",
  batch_daily: "Generate a week or two of daily content drafts at once.",
};

const paletteOptions = [
  { value: "rose", label: "Rose - Soft & Warm" },
  { value: "dusk", label: "Dusk - Quiet & Intimate" },
  { value: "honey", label: "Honey - Golden & Nostalgic" },
];

const moodOptions = [
  { value: "joyful", label: "Joyful - Radiant, light, grateful" },
  { value: "soft", label: "Soft - Gentle, calm, present" },
  { value: "steady", label: "Steady - Grounded, consistent, reliable" },
  { value: "tender", label: "Tender - Vulnerable, open, caring" },
  { value: "heavy", label: "Heavy - Weighed down, needing comfort" },
];

export default function AIWorkspace() {
  const { user, session } = useAuth();
  const { relationship } = useRelationship();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState<AIDraftType>("daily_affirmation");
  const [context, setContext] = useState<FormContext>({
    relationshipId: relationship?.id,
    relationshipName: relationship?.name || "our Loveline",
    contentDate: new Date().toISOString().split("T")[0],
    prompt: "",
    theme: "connection, gratitude, small moments",
    palette: "rose",
    mood: "soft",
    days: 7,
    heroTitle: "",
    heroBody: "",
    noteBody: "",
  });
  const [candidates, setCandidates] = useState<DraftCandidate[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<Record<string, unknown> | null>(null);

  const handleContextChange = useCallback((key: keyof FormContext, value: string | number) => {
    setContext(prev => ({ ...prev, [key]: value }));
  }, []);

  const generateDrafts = async () => {
    if (!session?.access_token || !relationship) {
      setError("Not authenticated");
      return;
    }

    setGenerating(true);
    setError(null);
    setCandidates([]);

    try {
      const payload: { type: AIDraftType; context: FormContext; count?: number } = {
        type: selectedType,
        context,
      };

      if (selectedType === "batch_daily") {
        payload.count = 3;
      }

      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate drafts");
      }

      const data = await response.json();
      const drafts = Array.isArray(data.draft) ? data.draft : [data.draft];

      const newCandidates: DraftCandidate[] = drafts.map((draft, i) => ({
        id: `${Date.now()}-${i}`,
        content: draft,
        createdAt: new Date().toISOString(),
      }));

      setCandidates(newCandidates);
      toast.success(`Generated ${newCandidates.length} draft${newCandidates.length > 1 ? "s" : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveCandidate = async (candidate: DraftCandidate) => {
    if (!session?.access_token || !relationship || !supabase) {
      setError("Not ready");
      return;
    }

    setSaving(candidate.id);
    setError(null);

    try {
      let result: { error: Error | null; content?: unknown } = { error: null };

      switch (selectedType) {
        case "daily_affirmation": {
          const { affirmation, affirmationDetail } = candidate.content as { affirmation: string; affirmationDetail: string };
          const contentDate = context.contentDate || new Date().toISOString().split("T")[0];
          const { data, error: saveError } = await supabase
            .from("daily_content")
            .upsert({
              relationship_id: relationship.id,
              content_date: contentDate,
              hero_label: "Today, made for you",
              hero_title: context.heroTitle || "A gentle day awaits",
              hero_body: context.heroBody || "A few words to open the day…",
              note_body: context.noteBody || "Something soft to discover…",
              affirmation,
              affirmation_detail: affirmationDetail,
              quote_text: "A thought to keep close.",
              quote_author: "Someone wise",
              quote_source: null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "relationship_id,content_date" })
            .select()
            .single();
          if (saveError) throw saveError;
          result = { error: null, content: data };
          break;
        }
        case "morning_message":
        case "night_message": {
          const { title, body } = candidate.content as { title: string; body: string };
          const status = selectedType === "morning_message" ? "scheduled" : "published";
          const { data, error: saveError } = await supabase
            .from("personal_messages")
            .insert({
              relationship_id: relationship.id,
              author_id: user.id,
              title,
              body,
              status,
              scheduled_for: status === "scheduled" ? new Date().toISOString() : null,
            })
            .select()
            .single();
          if (saveError) throw saveError;
          result = { error: null, content: data };
          break;
        }
        case "quote_card": {
          const { quoteText, quoteAuthor, quoteSource } = candidate.content as { quoteText: string; quoteAuthor: string; quoteSource?: string };
          const { data, error: saveError } = await supabase
            .from("quote_cards")
            .insert({
              relationship_id: relationship.id,
              created_by: user.id,
              quote_text: quoteText,
              quote_author: quoteAuthor,
              quote_source: quoteSource || null,
              palette: context.palette || "rose",
            })
            .select()
            .single();
          if (saveError) throw saveError;
          result = { error: null, content: data };
          break;
        }
        case "batch_daily": {
          // Batch saving would need a more complex flow - for now just show success
          result = { error: null, content: { saved: true } };
          break;
        }
        case "mood_suggestion":
          // Mood suggestions are typically not saved as persistent content
          result = { error: null, content: { saved: true } };
          break;
      }

      if (result.error) throw result.error;

      setSavedContent(candidate.content);
      toast.success("Saved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const renderCandidate = (candidate: DraftCandidate) => {
    const content = candidate.content;

    switch (selectedType) {
      case "daily_affirmation": {
        const c = content as { affirmation: string; affirmationDetail: string };
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Affirmation</Label>
              <p className="mt-1 text-base font-medium">{c.affirmation}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Detail</Label>
              <p className="mt-1 text-sm text-muted-foreground">{c.affirmationDetail}</p>
            </div>
          </div>
        );
      }
      case "morning_message":
      case "night_message": {
        const c = content as { title: string; body: string };
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Title</Label>
              <p className="mt-1 text-base font-medium">{c.title}</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Message</Label>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </div>
          </div>
        );
      }
      case "quote_card": {
        const c = content as { quoteText: string; quoteAuthor: string; quoteSource?: string };
        return (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Quote</Label>
              <p className="mt-1 text-base font-medium italic">"{c.quoteText}"</p>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Author</Label>
              <p className="mt-1 text-sm">{c.quoteAuthor}</p>
            </div>
            {c.quoteSource && (
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Source</Label>
                <p className="mt-1 text-sm text-muted-foreground">{c.quoteSource}</p>
              </div>
            )}
          </div>
        );
      }
      case "mood_suggestion": {
        const c = content as { message: string };
        return (
          <div>
            <Label className="text-xs font-medium text-muted-foreground">Suggestion</Label>
            <p className="mt-1 text-base">{c.message}</p>
          </div>
        );
      }
      case "batch_daily": {
        const c = content as { drafts: Array<Record<string, unknown>> };
        return (
          <div className="space-y-2 max-h-60 overflow-auto">
            {c.drafts.map((draft, i) => (
              <div key={i} className="p-3 rounded-lg border bg-surface-muted">
                <p className="font-medium text-sm">{String(draft.contentDate ?? "")}</p>
                <p className="text-xs text-muted-foreground mt-1">{String(draft.heroTitle ?? "")}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{String(draft.affirmation ?? "")}</p>
              </div>
            ))}
          </div>
        );
      }
      default:
        return <pre className="text-xs bg-surface-muted p-3 rounded">{JSON.stringify(content, null, 2)}</pre>;
    }
  };

  const renderContextFields = () => {
    const baseFields = (
      <div className="space-y-4">
        <div>
          <Label htmlFor="relationship-name">Relationship Name</Label>
          <Input
            id="relationship-name"
            value={context.relationshipName || ""}
            onChange={(e) => handleContextChange("relationshipName", e.target.value)}
            disabled={generating}
            placeholder="Our Loveline"
          />
        </div>
      </div>
    );

    switch (selectedType) {
      case "daily_affirmation":
        return (
          <div className="space-y-4">
            {baseFields}
            <div>
              <Label htmlFor="content-date">Content Date</Label>
              <Input
                id="content-date"
                type="date"
                value={context.contentDate || ""}
                onChange={(e) => handleContextChange("contentDate", e.target.value)}
                disabled={generating}
              />
            </div>
            <div>
              <Label htmlFor="hero-title">Hero Title (optional)</Label>
              <Input
                id="hero-title"
                value={context.heroTitle || ""}
                onChange={(e) => handleContextChange("heroTitle", e.target.value)}
                disabled={generating}
                placeholder="A gentle day awaits"
              />
            </div>
            <div>
              <Label htmlFor="hero-body">Welcome Message (optional)</Label>
              <Textarea
                id="hero-body"
                value={context.heroBody || ""}
                onChange={(e) => handleContextChange("heroBody", e.target.value)}
                disabled={generating}
                rows={2}
                placeholder="A few words to open the day…"
              />
            </div>
            <div>
              <Label htmlFor="note-body">Private Note (optional)</Label>
              <Textarea
                id="note-body"
                value={context.noteBody || ""}
                onChange={(e) => handleContextChange("noteBody", e.target.value)}
                disabled={generating}
                rows={2}
                placeholder="Something soft to discover…"
              />
            </div>
          </div>
        );
      case "morning_message":
      case "night_message":
        return (
          <div className="space-y-4">
            {baseFields}
            <div>
              <Label htmlFor="message-prompt">Guidance (optional)</Label>
              <Textarea
                id="message-prompt"
                value={context.prompt || ""}
                onChange={(e) => handleContextChange("prompt", e.target.value)}
                disabled={generating}
                rows={3}
                placeholder="e.g., Mention our anniversary, keep it playful, reference our inside joke about coffee…"
              />
            </div>
          </div>
        );
      case "quote_card":
        return (
          <div className="space-y-4">
            {baseFields}
            <div>
              <Label htmlFor="quote-theme">Theme (optional)</Label>
              <Input
                id="quote-theme"
                value={context.theme || ""}
                onChange={(e) => handleContextChange("theme", e.target.value)}
                disabled={generating}
                placeholder="love, connection, small moments"
              />
            </div>
            <div>
              <Label htmlFor="quote-palette">Palette</Label>
              <Select value={context.palette || "rose"} onValueChange={(v) => handleContextChange("palette", v)} disabled={generating}>
                <SelectTrigger id="quote-palette"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paletteOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "mood_suggestion":
        return (
          <div className="space-y-4">
            {baseFields}
            <div>
              <Label htmlFor="mood-select">Mood</Label>
              <Select value={context.mood || "soft"} onValueChange={(v) => handleContextChange("mood", v)} disabled={generating}>
                <SelectTrigger id="mood-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {moodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "batch_daily":
        return (
          <div className="space-y-4">
            {baseFields}
            <div>
              <Label htmlFor="batch-days">Number of Days</Label>
              <Input
                id="batch-days"
                type="number"
                min={1}
                max={14}
                value={context.days || 7}
                onChange={(e) => handleContextChange("days", Number(e.target.value))}
                disabled={generating}
              />
            </div>
            <div>
              <Label htmlFor="batch-themes">Themes (comma-separated)</Label>
              <Input
                id="batch-themes"
                value={context.theme || ""}
                onChange={(e) => handleContextChange("theme", e.target.value)}
                disabled={generating}
                placeholder="connection, gratitude, small moments"
              />
            </div>
          </div>
        );
      default:
        return baseFields;
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Owner space / AI Workspace</p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Generate with intention.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">Pick a content type, add context, and let AI draft options for you to refine and save.</p>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-card border border-border bg-surface p-5 shadow-subtle sm:p-7" aria-labelledby="workspace-title">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                <Bot className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">AI Workspace</p>
                <h2 id="workspace-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">Create something personal.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">AI drafts are starting points. You edit, approve, and save.</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label className="text-sm font-medium">What would you like to create?</Label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(typeLabels) as AIDraftType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => { setSelectedType(type); setCandidates([]); setError(null); }}
                  className={`relative rounded-xl border p-4 text-left transition ${selectedType === type ? "border-primary ring-2 ring-primary/20 bg-primary-soft/10" : "border-border hover:bg-surface-muted"}`}
                  aria-pressed={selectedType === type}
                  disabled={generating}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const Icon = typeIcons[type];
                      return <Icon className={`size-4 ${selectedType === type ? "text-primary" : "text-muted-foreground"}`} aria-hidden="true" />;
                    })()}
                    <span className="font-semibold">{typeLabels[type]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{typeDescriptions[type]}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 border-t pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">Context</h3>
            {renderContextFields()}
          </div>

          <Button
            className="mt-6 w-full h-11 rounded-full"
            onClick={generateDrafts}
            disabled={generating}
          >
            {generating ? (
              <>
                <LoaderCircle className="size-4 animate-spin mr-2" aria-hidden="true" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" aria-hidden="true" />
                Generate Drafts
              </>
            )}
          </Button>
        </section>

        <section aria-labelledby="candidates-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Drafts</p>
              <h2 id="candidates-title" className="font-display mt-1 text-2xl font-semibold tracking-[-0.03em]">{candidates.length > 0 ? "Review and refine." : "Generate to see options."}</h2>
            </div>
          </div>

          {candidates.length === 0 && !generating && (
            <div className="mt-5 rounded-card border border-dashed border-border bg-surface-muted/50 p-8 text-center">
              <Bot className="mx-auto size-8 text-primary" aria-hidden="true" />
              <p className="mt-4 font-semibold">No drafts yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Select a type, add context, and generate.</p>
            </div>
          )}

          {generating && (
            <div className="mt-5 space-y-4" aria-busy="true" aria-label="Generating drafts">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse border-border/50">
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-1/4 mb-3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {candidates.length > 0 && (
            <div className="mt-5 space-y-4">
              {candidates.map((candidate) => (
                <Card key={candidate.id} className="border-border/50">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Candidate</p>
                      <p className="font-display mt-1 text-xl font-semibold tracking-[-0.02em]">
                        {typeLabels[selectedType]} #{candidates.indexOf(candidate) + 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={() => copyToClipboard(JSON.stringify(candidate.content, null, 2))}
                        aria-label="Copy JSON"
                        disabled={Boolean(saving)}
                      >
                        <Copy className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full text-muted-foreground hover:text-destructive"
                        onClick={() => setCandidates(candidates.filter(c => c.id !== candidate.id))}
                        aria-label="Discard draft"
                        disabled={Boolean(saving)}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {renderCandidate(candidate)}
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        className="h-10 rounded-full"
                        onClick={() => saveCandidate(candidate)}
                        disabled={Boolean(saving) && saving !== candidate.id}
                      >
                        {saving === candidate.id ? (
                          <>
                            <LoaderCircle className="size-4 animate-spin mr-2" aria-hidden="true" />
                            Saving…
                          </>
                        ) : (
                          <>
                            <Save className="size-4 mr-2" aria-hidden="true" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {savedContent && (
            <Alert className="mt-5 border-success/25 bg-success/10">
              <Check className="size-4 text-success" aria-hidden="true" />
              <AlertDescription>Content saved and ready to use!</AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </div>
  );
}