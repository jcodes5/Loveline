import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type NotificationPreferences = {
  personalMessagesEnabled: boolean;
  personalMessagesTime: string;
  personalMessagesTimezone: string;
};

type NotificationPreferencesRow = {
  personal_messages_enabled?: boolean;
  personal_messages_time?: string;
  personal_messages_timezone?: string;
};

function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function normalizedTime(value: string) {
  return value.slice(0, 5);
}

export const defaultNotificationPreferences: NotificationPreferences = {
  personalMessagesEnabled: true,
  personalMessagesTime: "09:00",
  personalMessagesTimezone: browserTimezone(),
};

export function mapNotificationPreferences(
  value: NotificationPreferencesRow | null,
): NotificationPreferences {
  return value
    ? {
        personalMessagesEnabled: value.personal_messages_enabled ?? true,
        personalMessagesTime: normalizedTime(value.personal_messages_time ?? defaultNotificationPreferences.personalMessagesTime),
        personalMessagesTimezone: value.personal_messages_timezone ?? defaultNotificationPreferences.personalMessagesTimezone,
      }
    : defaultNotificationPreferences;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [preferences, setPreferences] = useState(defaultNotificationPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setPreferences(defaultNotificationPreferences);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("notification_preferences")
      .select("personal_messages_enabled, personal_messages_time, personal_messages_timezone")
      .eq("relationship_id", relationship.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (queryError) {
      setError("We couldn't load your notification preferences right now.");
    } else {
      setPreferences(mapNotificationPreferences(data));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const savePreferences = useCallback(
    async (next: NotificationPreferences) => {
      if (!user || !relationship || !supabase) {
        setError("Your Loveline connection is not ready yet.");
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      const previous = preferences;
      setPreferences(next);
      setSaving(true);
      setError(null);

      const { error: saveError } = await supabase.from("notification_preferences").upsert(
        {
          relationship_id: relationship.id,
          user_id: user.id,
          personal_messages_enabled: next.personalMessagesEnabled,
          personal_messages_time: next.personalMessagesTime,
          personal_messages_timezone: next.personalMessagesTimezone,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id,user_id" },
      );

      setSaving(false);
      if (saveError) {
        setPreferences(previous);
        setError("We couldn't save that notification preference right now.");
        return { error: new Error("We couldn't save that notification preference right now.") };
      }

      return { error: null };
    },
    [preferences, relationship, user],
  );

  const setPersonalMessagesEnabled = useCallback(
    (enabled: boolean) => savePreferences({ ...preferences, personalMessagesEnabled: enabled }),
    [preferences, savePreferences],
  );

  const setPersonalMessagesTime = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      personalMessagesTime: time,
      personalMessagesTimezone: browserTimezone(),
    }),
    [preferences, savePreferences],
  );

  return {
    preferences,
    loading,
    saving,
    error,
    refresh,
    setPersonalMessagesEnabled,
    setPersonalMessagesTime,
  };
}
