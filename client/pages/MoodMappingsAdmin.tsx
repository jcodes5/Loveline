import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, Check, Heart, LoaderCircle, MessageSquare, Plus, Pencil, Save, Sparkles, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";
import { moodOptions } from "@/hooks/use-mood";
import { toast } from "sonner";

type MoodMappingRow = {
  id: string;
  relationship_id: string;
  mood: "joyful" | "soft" | "steady" | "tender" | "heavy";
  message_id: string | null;
  letter_id: string | null;
  ai_prompt: string | null;
  custom_message: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

type MoodMappingForm = {
  mood: "joyful" | "soft" | "steady" | "tender" | "heavy";
  messageId: string;
  letterId: string;
  aiPrompt: string;
  customMessage: string;
  enabled: boolean;
};

const blankForm: MoodMappingForm = {
  mood: "joyful",
  messageId: "",
  letterId: "",
  aiPrompt: "",
  customMessage: "",
  enabled: true,
};

const moodLabels: Record<string, string> = {
  joyful: "Joyful — A little light",
  soft: "Soft — Taking it gently",
  steady: "Steady — Finding my pace",
  tender: "Tender — Feeling it all",
  heavy: "Heavy — Carrying a lot",
};

export default function MoodMappingsAdmin() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [mappings, setMappings] = useState<MoodMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MoodMappingForm>(blankForm);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    if (!user || !relationship || !supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("mood_mappings")
      .select("*")
      .eq("relationship_id", relationship.id)
      .order("mood");
    if (error) {
      setError("Failed to load mood mappings.");
    } else {
      setMappings((data ?? []).sort((a, b) => {
        const order = ["joyful", "soft", "steady", "tender", "heavy"];
        return order.indexOf(a.mood) - order.indexOf(b.mood);
      }));
    }
    setLoading(false);
  }, [relationship, user, supabase]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  function startNewMapping() {
    setEditingId(null);
    setForm(blankForm);
    setFormError(null);
  }

  function editMapping(mapping: MoodMappingRow) {
    setEditingId(mapping.id);
    setForm({
      mood: mapping.mood,
      messageId: mapping.message_id ?? "",
      letterId: mapping.letter_id ?? "",
      aiPrompt: mapping.ai_prompt ?? "",
      customMessage: mapping.custom_message ?? "",
      enabled: mapping.enabled,
    });
    setFormError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!user || !relationship || !supabase) return;

    const targetId = editingId;
    setSaving(targetId ?? "new");
    try {
      const payload = {
        relationship_id: relationship.id,
        mood: form.mood,
        message_id: form.messageId || null,
        letter_id: form.letterId || null,
        ai_prompt: form.aiPrompt || null,
        custom_message: form.customMessage || null,
        enabled: form.enabled,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (targetId) {
        result = await supabase.from("mood_mappings").update(payload).eq("id", targetId).eq("relationship_id", relationship.id).select().single();
      } else {
        result = await supabase.from("mood_mappings").insert(payload).select().single();
      }

      if (result.error) throw result.error;
      toast.success(targetId ? "Mapping updated" : "Mapping created");
      fetchMappings();
      startNewMapping();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save mapping";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this mood mapping?")) return;
    if (!supabase) return;
    const { error } = await supabase.from("mood_mappings").delete().eq("id", id).eq("relationship_id", relationship.id);
    if (error) {
      toast.error("Failed to delete mapping");
    } else {
      toast.success("Mapping deleted");
      fetchMappings();
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-9 sm:px-6 md:pt-12 lg:px-8 lg:pb-20">
      <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Dashboard
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary-dark">Owner space / Mood Mappings</p>
          <h1 className="font-display mt-2 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Map moods to content.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">When your person checks in with a mood, show them something meaningful.</p>
        </div>
        <Button className="h-11 rounded-full" onClick={startNewMapping}>
          <Plus className="size-4 mr-2" aria-hidden="true" />
          Add mapping
        </Button>
      </header>

      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="mt-8" aria-labelledby="mappings-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-dark">Configured moods</p>
            <h2 id="mappings-title" className="font-display mt-1 text-3xl font-semibold tracking-[-0.03em]">What to show for each mood.</h2>
          </div>
          <span className="text-sm text-muted-foreground">{mappings.length} of 5 moods configured</span>
        </div>

        {loading ? (
          <div className="mt-5 space-y-3" aria-busy="true" aria-label="Loading mood mappings">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="animate-pulse border-border/50">
                <CardHeader>
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4 mt-1" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {moodOptions.map((option) => {
              const mapping = mappings.find((m) => m.mood === option.value);
              return (
                <Card key={option.value} className={`border-border/50 ${mapping ? "ring-1 ring-primary/20" : ""}`}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-2xl bg-primary-soft text-primary-dark">
                        <Heart className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary-dark">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mapping ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => editMapping(mapping)}
                            aria-label={`Edit ${option.label} mapping`}
                            disabled={saving === mapping.id}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(mapping.id)}
                            aria-label={`Delete ${option.label} mapping`}
                            disabled={saving === mapping.id}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => {
                            setEditingId(null);
                            setForm({ ...blankForm, mood: option.value as any });
                          }}
                          aria-label={`Add ${option.label} mapping`}
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {mapping && (
                      <div className="space-y-3 text-sm">
                        {mapping.custom_message && (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <span className="text-muted-foreground">Custom message: </span>
                            <span>{mapping.custom_message}</span>
                          </div>
                        )}
                        {mapping.ai_prompt && (
                          <div className="flex items-start gap-2">
                            <Sparkles className="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <span className="text-muted-foreground">AI prompt: </span>
                            <span className="font-mono">{mapping.ai_prompt}</span>
                          </div>
                        )}
                        {mapping.message_id && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MessageSquare className="size-4" aria-hidden="true" />
                            <span>Linked personal message: {mapping.message_id.slice(0, 8)}…</span>
                          </div>
                        )}
                        {mapping.letter_id && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Bell className="size-4" aria-hidden="true" />
                            <span>Linked Open When letter: {mapping.letter_id.slice(0, 8)}…</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Status: {mapping.enabled ? "Enabled" : "Disabled"}</span>
                          <span>•</span>
                          <span>Updated: {new Date(mapping.updated_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )}
                    {!mapping && (
                      <p className="text-sm text-muted-foreground">No mapping configured for this mood yet.</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {editingId && (
          <Card className="mt-8 border-primary/20 bg-primary-soft/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{mappings.find((m) => m.id === editingId) ? "Edit" : "Create"} Mood Mapping</span>
                <Button variant="ghost" size="icon" onClick={startNewMapping}>
                  <X className="size-4" aria-hidden="true" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formError && <Alert variant="destructive" className="mb-4"><AlertDescription>{formError}</AlertDescription></Alert>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mapping-mood">Mood</Label>
                  <Select value={form.mood} onValueChange={(v) => setForm((c) => ({ ...c, mood: v as any }))} disabled={!!editingId}>
                    <SelectTrigger id="mapping-mood"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {moodOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mapping-message">Personal Message ID <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="mapping-message" value={form.messageId} onChange={(e) => setForm((c) => ({ ...c, messageId: e.target.value }))} placeholder="UUID of personal message to link" disabled={Boolean(saving)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mapping-letter">Open When Letter ID <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input id="mapping-letter" value={form.letterId} onChange={(e) => setForm((c) => ({ ...c, letterId: e.target.value }))} placeholder="UUID of Open When letter to link" disabled={Boolean(saving)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mapping-ai-prompt">AI Prompt <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea id="mapping-ai-prompt" value={form.aiPrompt} onChange={(e) => setForm((c) => ({ ...c, aiPrompt: e.target.value }))} rows={3} placeholder="Custom prompt for AI when generating content for this mood…" maxLength={2000} disabled={Boolean(saving)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mapping-custom">Custom Message <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea id="mapping-custom" value={form.customMessage} onChange={(e) => setForm((c) => ({ ...c, customMessage: e.target.value }))} rows={3} placeholder="A fixed message to show for this mood (overrides AI)…" maxLength={4000} disabled={Boolean(saving)} />
                </div>

                <div className="flex items-center gap-2">
                  <Switch id="mapping-enabled" checked={form.enabled} onCheckedChange={(v) => setForm((c) => ({ ...c, enabled: v }))} disabled={Boolean(saving)} aria-label="Enabled" />
                  <Label htmlFor="mapping-enabled" className="text-sm font-medium">Enabled</Label>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={Boolean(saving)} className="flex-1">
                    {saving ? <LoaderCircle className="size-4 animate-spin mr-2" aria-hidden="true" /> : <Save className="size-4 mr-2" aria-hidden="true" />}
                    {editingId ? "Save changes" : "Create mapping"}
                  </Button>
                  <Button type="button" variant="outline" onClick={startNewMapping} disabled={Boolean(saving)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}