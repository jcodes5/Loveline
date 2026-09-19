import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type SpecialDateKind = "relationship_start" | "anniversary" | "birthday" | "custom";

export type SpecialDate = {
  id: string;
  relationshipId: string;
  createdBy: string;
  kind: SpecialDateKind;
  label: string;
  eventDate: string;
  notes: string;
};

type SpecialDateRow = {
  id: string;
  relationship_id: string;
  created_by: string;
  kind: SpecialDateKind;
  label: string;
  event_date: string;
  notes: string;
};

export type SpecialDateInput = {
  id?: string;
  kind: SpecialDateKind;
  label: string;
  eventDate: string;
  notes: string;
};

const dateSelect = "id, relationship_id, created_by, kind, label, event_date, notes";
const DAY_MS = 24 * 60 * 60 * 1000;

function dateAtUtcMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateDaysTogether(startDate: string, today = new Date()) {
  const elapsed = dateAtUtcMidnight(localDateKey(today)) - dateAtUtcMidnight(startDate);
  return Math.max(0, Math.floor(elapsed / DAY_MS) + 1);
}

export function mapSpecialDate(value: SpecialDateRow): SpecialDate {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    createdBy: value.created_by,
    kind: value.kind,
    label: value.label,
    eventDate: value.event_date,
    notes: value.notes,
  };
}

export function useSpecialDates() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [dates, setDates] = useState<SpecialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setDates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("special_dates")
      .select(dateSelect)
      .eq("relationship_id", relationship.id)
      .order("event_date", { ascending: true });

    if (queryError) {
      setDates([]);
      setError("We couldn't load your special dates right now.");
    } else {
      setDates((data ?? []).map(mapSpecialDate));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startDate = dates.find((date) => date.kind === "relationship_start")?.eventDate ?? relationship?.createdAt.slice(0, 10) ?? null;
  const daysTogether = useMemo(
    () => (startDate ? calculateDaysTogether(startDate) : null),
    [startDate],
  );

  const saveDate = useCallback(
    async (input: SpecialDateInput) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const payload = {
        relationship_id: relationship.id,
        created_by: user.id,
        kind: input.kind,
        label: input.label,
        event_date: input.eventDate,
        notes: input.notes,
        updated_at: new Date().toISOString(),
      };
      const result = input.id
        ? await supabase.from("special_dates").update(payload).eq("id", input.id).select(dateSelect).single()
        : await supabase.from("special_dates").insert(payload).select(dateSelect).single();

      setSaving(false);
      if (result.error || !result.data) {
        const message = result.error?.code === "23505"
          ? "Your Loveline already has a relationship start date. Edit that one instead."
          : "We couldn't save that special date right now.";
        setError(message);
        return { error: new Error(message) };
      }

      const date = mapSpecialDate(result.data);
      setDates((current) =>
        input.id
          ? current.map((item) => (item.id === input.id ? date : item))
          : [...current, date].sort((first, second) => first.eventDate.localeCompare(second.eventDate)),
      );
      return { error: null, date };
    },
    [relationship, user],
  );

  const removeDate = useCallback(
    async (id: string) => {
      if (!relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase.from("special_dates").delete().eq("id", id).eq("relationship_id", relationship.id);
      setSaving(false);
      if (deleteError) {
        return { error: new Error("We couldn't remove that special date right now.") };
      }

      setDates((current) => current.filter((date) => date.id !== id));
      return { error: null };
    },
    [relationship],
  );

  return { dates, daysTogether, loading, saving, error, refresh, saveDate, removeDate };
}
