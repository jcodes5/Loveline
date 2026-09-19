import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type MoodValue = "joyful" | "soft" | "steady" | "tender" | "heavy";

export type MoodEntry = {
  id: string;
  relationshipId: string;
  userId: string;
  mood: MoodValue;
  entryDate: string;
};

type MoodRow = {
  id: string;
  relationship_id: string;
  user_id: string;
  mood: MoodValue;
  entry_date: string;
};

export const moodOptions: Array<{ value: MoodValue; label: string; description: string }> = [
  { value: "joyful", label: "Joyful", description: "A little light" },
  { value: "soft", label: "Soft", description: "Taking it gently" },
  { value: "steady", label: "Steady", description: "Finding my pace" },
  { value: "tender", label: "Tender", description: "Feeling it all" },
  { value: "heavy", label: "Heavy", description: "Carrying a lot" },
];

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
  };
}

export function useMoodCheckIn() {
  const { user } = useAuth();
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
      setEntry(data ? mapMoodEntry(data) : null);
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

      setEntry(mapMoodEntry(data));
      return { error: null };
    },
    [entryDate, relationship, user],
  );

  return { entry, loading, saving, error, refresh, saveMood };
}
