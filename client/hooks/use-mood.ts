import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

type MoodSuggestionInput = {
  mood: MoodValue;
  relationshipId: string;
  recentMoods?: MoodValue[];
  relationshipName?: string;
};

export type MoodValue = "joyful" | "soft" | "steady" | "tender" | "heavy";

export type MoodMapping = {
  id: string;
  relationshipId: string;
  mood: MoodValue;
  messageId: string | null;
  letterId: string | null;
  aiPrompt: string | null;
  customMessage: string | null;
  enabled: boolean;
};

export type MoodEntry = {
  id: string;
  relationshipId: string;
  userId: string;
  mood: MoodValue;
  entryDate: string;
  mapping?: MoodMapping | null;
};

export const moodOptions = [
  { value: "joyful", label: "Joyful", description: "A little light" },
  { value: "soft", label: "Soft", description: "Taking it gently" },
  { value: "steady", label: "Steady", description: "Finding my pace" },
  { value: "tender", label: "Tender", description: "Feeling it all" },
  { value: "heavy", label: "Heavy", description: "Carrying a lot" }
] as const;

type MoodRow = {
  id: string;
  relationship_id: string;
  user_id: string;
  mood: MoodValue;
  entry_date: string;
  message_id?: string | null;
  letter_id?: string | null;
  ai_prompt?: string | null;
  custom_message?: string | null;
  enabled?: boolean;
};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function mapMoodEntry(value: MoodRow): MoodEntry {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    userId: value.user_id,
    mood: value.mood,
    entryDate: value.entry_date,
    mapping: value.message_id || value.letter_id || value.ai_prompt || value.custom_message || value.enabled
      ? {
          id: value.id,
          relationshipId: value.relationship_id,
          mood: value.mood,
          messageId: value.message_id,
          letterId: value.letter_id,
          aiPrompt: value.ai_prompt,
          customMessage: value.custom_message,
          enabled: value.enabled,
        }
      : null,
  };
}

export function useMoodCheckIn() {
  const { user, session } = useAuth();
  const { relationship } = useRelationship();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(Boolean(user && relationship));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entryDate = localDateKey();

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setEntry(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("mood_entries")
      .select("id, relationship_id, user_id, mood, entry_date")
      .eq("relationship_id", relationship.id)
      .eq("user_id", user.id)
      .eq("entry_date", entryDate)
      .maybeSingle();

    if (queryError) {
      setError("We couldn't load your mood check-in right now.");
      setEntry(null);
    } else {
      setEntry(data ? mapMoodEntry(data as any) : null);
    }
    setLoading(false);
  }, [entryDate, relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveMood = useCallback(
    async (mood: MoodValue) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const { data, error: saveError } = await supabase
        .from("mood_entries")
        .upsert(
          {
            relationship_id: relationship.id,
            user_id: user.id,
            mood,
            entry_date: entryDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "relationship_id,user_id,entry_date" },
        )
        .select("id, relationship_id, user_id, mood, entry_date")
        .single();

      setSaving(false);
      if (saveError || !data) {
        setError("We couldn't save your mood right now. Please try again.");
        return { error: new Error("We couldn't save your mood right now. Please try again.") };
      }

      setEntry(mapMoodEntry(data as any));
      return { error: null };
    },
    [entryDate, relationship, user],
  );

  const getMoodSuggestion = useCallback(
    async (input: MoodSuggestionInput) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Not ready") };
      }

      const response = await fetch("/api/ai/draft", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          type: "mood_suggestion",
          context: {
            mood: input.mood,
            recentMoods: input.recentMoods,
            relationshipName: input.relationshipName,
            relationshipId: input.relationshipId,
          },
        }),
      });

      if (!response.ok) {
        return { error: new Error("Failed to get mood suggestion") };
      }

      const data = await response.json();
      return { suggestion: data.draft };
    },
    [user, relationship, session, supabase],
  );

  return { entry, loading, saving, error, refresh, saveMood, getMoodSuggestion };
}