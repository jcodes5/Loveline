import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type NotificationPreferences = {
  personalMessagesEnabled: boolean;
  personalMessagesTime: string;
  personalMessagesTimezone: string;
  morningEnabled: boolean;
  morningTime: string;
  nightEnabled: boolean;
  nightTime: string;
  specialDatesEnabled: boolean;
  specialDatesTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
};

type NotificationPreferencesRow = {
  personal_messages_enabled?: boolean;
  personal_messages_time?: string;
  personal_messages_timezone?: string;
  morning_enabled?: boolean;
  morning_time?: string;
  night_enabled?: boolean;
  night_time?: string;
  special_dates_enabled?: boolean;
  special_dates_time?: string;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
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
  morningEnabled: true,
  morningTime: "08:00",
  nightEnabled: true,
  nightTime: "21:00",
  specialDatesEnabled: true,
  specialDatesTime: "09:00",
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
};

export function mapNotificationPreferences(
  value: NotificationPreferencesRow | null,
): NotificationPreferences {
  return value
    ? {
        personalMessagesEnabled: value.personal_messages_enabled ?? true,
        personalMessagesTime: normalizedTime(value.personal_messages_time ?? defaultNotificationPreferences.personalMessagesTime),
        personalMessagesTimezone: value.personal_messages_timezone ?? defaultNotificationPreferences.personalMessagesTimezone,
        morningEnabled: value.morning_enabled ?? true,
        morningTime: normalizedTime(value.morning_time ?? defaultNotificationPreferences.morningTime),
        nightEnabled: value.night_enabled ?? true,
        nightTime: normalizedTime(value.night_time ?? defaultNotificationPreferences.nightTime),
        specialDatesEnabled: value.special_dates_enabled ?? true,
        specialDatesTime: normalizedTime(value.special_dates_time ?? defaultNotificationPreferences.specialDatesTime),
        quietHoursEnabled: value.quiet_hours_enabled ?? false,
        quietHoursStart: normalizedTime(value.quiet_hours_start ?? defaultNotificationPreferences.quietHoursStart),
        quietHoursEnd: normalizedTime(value.quiet_hours_end ?? defaultNotificationPreferences.quietHoursEnd),
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
      .select("personal_messages_enabled, personal_messages_time, personal_messages_timezone, morning_enabled, morning_time, night_enabled, night_time, special_dates_enabled, special_dates_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
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
          morning_enabled: next.morningEnabled,
          morning_time: next.morningTime,
          night_enabled: next.nightEnabled,
          night_time: next.nightTime,
          special_dates_enabled: next.specialDatesEnabled,
          special_dates_time: next.specialDatesTime,
          quiet_hours_enabled: next.quietHoursEnabled,
          quiet_hours_start: next.quietHoursStart,
          quiet_hours_end: next.quietHoursEnd,
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

  const setMorningEnabled = useCallback(
    (enabled: boolean) => savePreferences({ ...preferences, morningEnabled: enabled }),
    [preferences, savePreferences],
  );

  const setMorningTime = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      morningTime: time,
      personalMessagesTimezone: browserTimezone(),
    }),
    [preferences, savePreferences],
  );

  const setNightEnabled = useCallback(
    (enabled: boolean) => savePreferences({ ...preferences, nightEnabled: enabled }),
    [preferences, savePreferences],
  );

  const setNightTime = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      nightTime: time,
      personalMessagesTimezone: browserTimezone(),
    }),
    [preferences, savePreferences],
  );

  const setSpecialDatesEnabled = useCallback(
    (enabled: boolean) => savePreferences({ ...preferences, specialDatesEnabled: enabled }),
    [preferences, savePreferences],
  );

  const setSpecialDatesTime = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      specialDatesTime: time,
      personalMessagesTimezone: browserTimezone(),
    }),
    [preferences, savePreferences],
  );

  const setQuietHoursEnabled = useCallback(
    (enabled: boolean) => savePreferences({ ...preferences, quietHoursEnabled: enabled }),
    [preferences, savePreferences],
  );

  const setQuietHoursStart = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      quietHoursStart: time,
      personalMessagesTimezone: browserTimezone(),
    }),
    [preferences, savePreferences],
  );

  const setQuietHoursEnd = useCallback(
    (time: string) => savePreferences({
      ...preferences,
      quietHoursEnd: time,
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
    setMorningEnabled,
    setMorningTime,
    setNightEnabled,
    setNightTime,
    setSpecialDatesEnabled,
    setSpecialDatesTime,
    setQuietHoursEnabled,
    setQuietHoursStart,
    setQuietHoursEnd,
  };
}
