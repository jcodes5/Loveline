import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type DailyContent = {
  id: string;
  contentDate: string;
  heroLabel: string;
  heroTitle: string;
  heroBody: string;
  noteBody: string;
  affirmation: string;
  affirmationDetail: string;
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
};

export type DailyContentInput = Omit<DailyContent, "id"> & { id?: string };

export type DailyContentDraftInput = {
  contentDate: string;
  prompt: string;
};

type DailyContentRow = {
  id: string;
  content_date: string;
  hero_label: string;
  hero_title: string;
  hero_body: string;
  note_body: string;
  affirmation: string;
  affirmation_detail: string;
  quote_text: string;
  quote_author: string;
  quote_source: string | null;
  approval_status: "pending" | "approved" | "rejected";
};

type DailyContentWorkspaceState = {
  entries: DailyContent[];
  loading: boolean;
  saving: boolean;
  drafting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveContent: (input: DailyContentInput) => Promise<{ error: Error | null; content?: DailyContent }>;
  reviewContent: (id: string, approvalStatus: "approved" | "rejected") => Promise<{ error: Error | null }>;
  draftContent: (input: DailyContentDraftInput) => Promise<{ error: Error | null; draft?: Omit<DailyContent, "id" | "contentDate"> }>;
};

export const dailyContentSelect =
  "id, content_date, hero_label, hero_title, hero_body, note_body, affirmation, affirmation_detail, quote_text, quote_author, quote_source, approval_status";

export function mapDailyContent(value: DailyContentRow): DailyContent {
  return {
    id: value.id,
    contentDate: value.content_date,
    heroLabel: value.hero_label,
    heroTitle: value.hero_title,
    heroBody: value.hero_body,
    noteBody: value.note_body,
    affirmation: value.affirmation,
    affirmationDetail: value.affirmation_detail,
    quoteText: value.quote_text,
    quoteAuthor: value.quote_author,
    quoteSource: value.quote_source,
    approvalStatus: value.approval_status,
  };
}

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export function useDailyContentWorkspace(): DailyContentWorkspaceState {
  const { session, user } = useAuth();
  const { relationship } = useRelationship();
  const [entries, setEntries] = useState<DailyContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("daily_content")
      .select(dailyContentSelect)
      .eq("relationship_id", relationship.id)
      .order("content_date", { ascending: false })
      .limit(60);

    if (queryError) {
      setEntries([]);
      setError("We couldn't load daily content right now. Please try again.");
    } else {
      setEntries((data ?? []).map(mapDailyContent));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveContent = useCallback(
    async (input: DailyContentInput) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const { data, error: saveError } = await supabase
        .from("daily_content")
        .upsert(
          {
            relationship_id: relationship.id,
            content_date: input.contentDate,
            hero_label: input.heroLabel,
            hero_title: input.heroTitle,
            hero_body: input.heroBody,
            note_body: input.noteBody,
            affirmation: input.affirmation,
            affirmation_detail: input.affirmationDetail,
            quote_text: input.quoteText,
            quote_author: input.quoteAuthor,
            quote_source: input.quoteSource || null,
            approval_status: input.approvalStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "relationship_id,content_date" },
        )
        .select(dailyContentSelect)
        .single();

      setSaving(false);
      if (saveError || !data) {
        return { error: new Error("We couldn't save daily content right now.") };
      }

      const content = mapDailyContent(data);
      setEntries((current) =>
        [content, ...current.filter((entry) => entry.contentDate !== content.contentDate)].sort(
          (first, second) => second.contentDate.localeCompare(first.contentDate),
        ),
      );
      return { error: null, content };
    },
    [relationship, user],
  );

  const reviewContent = useCallback(
    async (id: string, approvalStatus: "approved" | "rejected") => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }
      setSaving(true);
      const { data, error: reviewError } = await supabase
        .from("daily_content")
        .update({ approval_status: approvalStatus, updated_at: new Date().toISOString() })
        .eq("relationship_id", relationship.id)
        .eq("id", id)
        .select("id")
        .maybeSingle();
      setSaving(false);

      if (reviewError || !data) {
        return { error: new Error("We couldn't update this content review right now.") };
      }
      setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, approvalStatus } : entry));
      return { error: null };
    },
    [relationship, user],
  );

  const draftContent = useCallback(
    async (input: DailyContentDraftInput) => {
      if (!session?.access_token || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setDrafting(true);
      try {
        const response = await fetch("/api/ai/draft", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            type: "daily_affirmation",
            context: {
              relationshipId: relationship.id,
              contentDate: input.contentDate,
              prompt: input.prompt,
              heroTitle: "",
              heroBody: "",
              noteBody: "",
            },
          }),
        });

        if (!response.ok) {
          return { error: new Error(await responseError(response, "We couldn't create a daily-content draft right now.")) };
        }

        const payload = (await response.json()) as { draft?: { affirmation: string; affirmationDetail: string } };
        if (!payload.draft) {
          return { error: new Error("We couldn't read that daily-content draft.") };
        }

        const draft = {
          heroLabel: "Today, made for you",
          heroTitle: "A gentle day awaits",
          heroBody: "A few words to open the day…",
          noteBody: "Something soft to discover…",
          affirmation: payload.draft.affirmation,
          affirmationDetail: payload.draft.affirmationDetail,
          quoteText: "A thought to keep close.",
          quoteAuthor: "Someone wise",
          quoteSource: null,
          approvalStatus: "pending" as const,
        };
        return { error: null, draft };
      } catch (draftError) {
        return {
          error: draftError instanceof Error
            ? draftError
            : new Error("We couldn't create a daily-content draft right now."),
        };
      } finally {
        setDrafting(false);
      }
    },
    [relationship, session?.access_token],
  );

  return { entries, loading, saving, drafting, error, refresh, saveContent, reviewContent, draftContent };
}
