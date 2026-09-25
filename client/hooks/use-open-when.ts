import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type OpenWhenOccasionType =
  | "miss_me"
  | "bad_day"
  | "feeling_down"
  | "something_good"
  | "cant_sleep"
  | "need_love"
  | "need_laugh"
  | "need_encouragement"
  | "custom";

export type OpenWhenUnlockRule = "immediate" | "date" | "date_time" | "manual";

export type OpenWhenLetter = {
  id: string;
  relationshipId: string;
  occasion: string;
  occasionType: OpenWhenOccasionType;
  title: string;
  body: string;
  coverImageId: string | null;
  mediaId: string | null;
  mediaType: "image" | "video" | "audio" | null;
  unlockRule: OpenWhenUnlockRule;
  unlockAt: string | null;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OpenWhenLetterInput = {
  id?: string;
  occasion: string;
  occasionType: OpenWhenOccasionType;
  title: string;
  body: string;
  coverImageId?: string | null;
  mediaId?: string | null;
  mediaType?: "image" | "video" | "audio" | null;
  unlockRule?: OpenWhenUnlockRule;
  unlockAt?: string | null;
  isLocked?: boolean;
};

type OpenWhenRow = {
  id: string;
  relationship_id: string;
  occasion: string;
  occasion_type: string;
  title: string;
  body: string;
  cover_image_id: string | null;
  media_id: string | null;
  media_type: string | null;
  unlock_rule: string;
  unlock_at: string | null;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
};

type OpenWhenState = {
  letters: OpenWhenLetter[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveLetter: (input: OpenWhenLetterInput) => Promise<{ error: Error | null; letter?: OpenWhenLetter }>;
  removeLetter: (id: string) => Promise<{ error: Error | null }>;
};

const occasionLabels: Record<string, string> = {
  miss_me: "Miss me",
  bad_day: "Bad day",
  feeling_down: "Feeling down",
  something_good: "Something good happened",
  cant_sleep: "Can't sleep",
  need_love: "Need to feel loved",
  need_laugh: "Need a laugh",
  need_encouragement: "Need encouragement",
  custom: "Custom",
};

export const occasionOptions = [
  { value: "miss_me", label: "Miss me" },
  { value: "bad_day", label: "Bad day" },
  { value: "feeling_down", label: "Feeling down" },
  { value: "something_good", label: "Something good happened" },
  { value: "cant_sleep", label: "Can't sleep" },
  { value: "need_love", label: "Need to feel loved" },
  { value: "need_laugh", label: "Need a laugh" },
  { value: "need_encouragement", label: "Need encouragement" },
  { value: "custom", label: "Custom" },
] as const;

const unlockRuleLabels: Record<string, string> = {
  immediate: "Unlock immediately",
  date: "Unlock on a date",
  date_time: "Unlock at date & time",
  manual: "Unlock manually",
};

const letterSelect = "id, relationship_id, occasion, occasion_type, title, body, cover_image_id, media_id, media_type, unlock_rule, unlock_at, is_locked, created_at, updated_at";

export function mapOpenWhenLetter(value: OpenWhenRow): OpenWhenLetter {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    occasion: value.occasion,
    occasionType: value.occasion_type as OpenWhenOccasionType,
    title: value.title,
    body: value.body,
    coverImageId: value.cover_image_id,
    mediaId: value.media_id,
    mediaType: value.media_type as "image" | "video" | "audio" | null,
    unlockRule: value.unlock_rule as OpenWhenUnlockRule,
    unlockAt: value.unlock_at,
    isLocked: value.is_locked,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function getOccasionLabel(occasionType: OpenWhenOccasionType): string {
  return occasionLabels[occasionType] ?? occasionType;
}

export function getUnlockRuleLabel(rule: OpenWhenUnlockRule): string {
  return unlockRuleLabels[rule] ?? rule;
}

export function useOpenWhen(): OpenWhenState {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [letters, setLetters] = useState<OpenWhenLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setLetters([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("open_when_letters")
      .select(letterSelect)
      .eq("relationship_id", relationship.id)
      .order("created_at", { ascending: true });

    if (queryError) {
      setLetters([]);
      setError("We couldn't load the Open When letters right now.");
    } else {
      setLetters((data ?? []).map(mapOpenWhenLetter));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveLetter = useCallback(
    async (input: OpenWhenLetterInput) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const payload = {
        relationship_id: relationship.id,
        created_by: user.id,
        occasion: input.occasion,
        occasion_type: input.occasionType,
        title: input.title,
        body: input.body,
        cover_image_id: input.coverImageId ?? null,
        media_id: input.mediaId ?? null,
        media_type: input.mediaType ?? null,
        unlock_rule: input.unlockRule ?? "immediate",
        unlock_at: input.unlockAt && input.unlockAt.trim() !== "" ? new Date(input.unlockAt).toISOString() : null,
        is_locked: input.isLocked ?? false,
        updated_at: new Date().toISOString(),
      };
      const result = input.id
        ? await supabase
            .from("open_when_letters")
            .update(payload)
            .eq("id", input.id)
            .select(letterSelect)
            .single()
        : await supabase
            .from("open_when_letters")
            .insert(payload)
            .select(letterSelect)
            .single();

      setSaving(false);
      if (result.error || !result.data) {
        return { error: new Error("We couldn't save that Open When letter right now.") };
      }

      const letter = mapOpenWhenLetter(result.data);
      setLetters((current) =>
        input.id
          ? current.map((item) => (item.id === input.id ? letter : item))
          : [...current, letter],
      );
      return { error: null, letter };
    },
    [relationship, user],
  );

  const removeLetter = useCallback(
    async (id: string) => {
      if (!supabase || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase
        .from("open_when_letters")
        .delete()
        .eq("id", id)
        .eq("relationship_id", relationship.id);
      setSaving(false);

      if (deleteError) {
        return { error: new Error("We couldn't remove that Open When letter right now.") };
      }

      setLetters((current) => current.filter((letter) => letter.id !== id));
      return { error: null };
    },
    [relationship],
  );

  return { letters, loading, saving, error, refresh, saveLetter, removeLetter };
}