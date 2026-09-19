import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type OpenWhenLetter = {
  id: string;
  relationshipId: string;
  occasion: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type OpenWhenLetterInput = {
  id?: string;
  occasion: string;
  title: string;
  body: string;
};

type OpenWhenRow = {
  id: string;
  relationship_id: string;
  occasion: string;
  title: string;
  body: string;
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

const letterSelect = "id, relationship_id, occasion, title, body, created_at, updated_at";

export function mapOpenWhenLetter(value: OpenWhenRow): OpenWhenLetter {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    occasion: value.occasion,
    title: value.title,
    body: value.body,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
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
        title: input.title,
        body: input.body,
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
