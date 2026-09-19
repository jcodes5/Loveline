import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import {
  isFirebaseMessagingConfigured,
  listenForForegroundNotifications,
  registerForNotifications,
} from "@/lib/firebase-messaging";
import { supabase } from "@/lib/supabase";

export type NotificationPermissionState = NotificationPermission | "unsupported";
export type NotificationSettingsStatus = "idle" | "loading" | "enabled" | "error";

function getPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export function useNotificationSettings() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [permission, setPermission] = useState<NotificationPermissionState>(getPermission);
  const [status, setStatus] = useState<NotificationSettingsStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase || !isFirebaseMessagingConfigured) {
      setStatus("idle");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("notification_devices")
      .select("id")
      .eq("relationship_id", relationship.id)
      .eq("user_id", user.id)
      .eq("enabled", true)
      .eq("platform", "web")
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError("We couldn't check notification settings right now.");
      setStatus("error");
      return;
    }

    setStatus(data ? "enabled" : "idle");
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (status !== "enabled" || typeof window === "undefined") {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    void listenForForegroundNotifications(() => {
      if (Notification.permission === "granted") {
        new Notification("A little note from Loveline", {
          body: "Your person left something for you.",
          icon: "/icon.svg",
        });
      }
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => unsubscribe?.();
  }, [status]);

  const enable = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setError("Your Loveline connection is not ready yet.");
      setStatus("error");
      return;
    }

    if (getPermission() === "denied") {
      setPermission("denied");
      setError("Notifications are blocked in your browser settings.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      if (!("Notification" in window)) {
        throw new Error("Notifications are not supported in this browser.");
      }

      const nextPermission = await Notification.requestPermission();
      setPermission(nextPermission);
      if (nextPermission !== "granted") {
        throw new Error("Notifications need your permission before Loveline can send them.");
      }

      const token = await registerForNotifications();
      const { error: saveError } = await supabase.from("notification_devices").upsert(
        {
          relationship_id: relationship.id,
          user_id: user.id,
          token,
          platform: "web",
          enabled: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id,user_id,token" },
      );

      if (saveError) {
        throw new Error("We couldn't save notification settings right now.");
      }

      setStatus("enabled");
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "We couldn't turn on notifications right now.",
      );
      setStatus("error");
    }
  }, [relationship, user]);

  const disable = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      return;
    }

    setStatus("loading");
    setError(null);
    const { error: updateError } = await supabase
      .from("notification_devices")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("relationship_id", relationship.id)
      .eq("user_id", user.id)
      .eq("platform", "web");

    if (updateError) {
      setError("We couldn't pause notifications right now.");
      setStatus("error");
      return;
    }

    setStatus("idle");
  }, [relationship, user]);

  return {
    configured: isFirebaseMessagingConfigured,
    permission,
    status,
    error,
    enable,
    disable,
    refresh,
  };
}
