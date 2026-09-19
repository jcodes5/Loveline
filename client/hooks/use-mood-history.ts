import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { moodOptions, type MoodEntry, type MoodValue, mapMoodEntry } from "@/hooks/use-mood";
import { supabase } from "@/lib/supabase";

const HISTORY_DAYS = 30;

type MoodRow = {
  id: string;
  relationship_id: string;
  user_id: string;
  mood: MoodValue;
  entry_date: string;
};

export type MoodSummary = {
  totalEntries: number;
  currentStreak: number;
  mostCommon: MoodValue | null;
  counts: Record<MoodValue, number>;
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKeyDaysAgo(days: number, today = new Date()) {
  const date = new Date(today);
  date.setDate(date.getDate() - days);
  return localDateKey(date);
}

export function summarizeMoodEntries(entries: MoodEntry[], today = new Date()): MoodSummary {
  const counts = Object.fromEntries(moodOptions.map((option) => [option.value, 0])) as Record<MoodValue, number>;
  entries.forEach((entry) => {
    counts[entry.mood] += 1;
  });

  const mostCommon = entries.length
    ? moodOptions.reduce((best, option) => counts[option.value] > counts[best.value] ? option : best).value
    : null;

  let currentStreak = 0;
  for (let offset = 0; offset < HISTORY_DAYS; offset += 1) {
    if (!entries.some((entry) => entry.entryDate === dateKeyDaysAgo(offset, today))) break;
    currentStreak += 1;
  }

  return { totalEntries: entries.length, currentStreak, mostCommon, counts };
}

export function useMoodHistory() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
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
      .from("mood_entries")
      .select("id, relationship_id, user_id, mood, entry_date")
      .eq("relationship_id", relationship.id)
      .eq("user_id", user.id)
      .gte("entry_date", dateKeyDaysAgo(HISTORY_DAYS - 1))
      .lte("entry_date", localDateKey(new Date()))
      .order("entry_date", { ascending: false });

    if (queryError) {
      setEntries([]);
      setError("We couldn't load your mood history right now.");
    } else {
      setEntries((data ?? []).map((entry) => mapMoodEntry(entry as MoodRow)));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => summarizeMoodEntries(entries), [entries]);

  return { entries, summary, loading, error, refresh };
}
