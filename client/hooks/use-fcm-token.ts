import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";
import { registerForNotifications, isFirebaseMessagingConfigured } from "@/lib/firebase-messaging";

export function useFCMToken() {
  const { session, user } = useAuth();
  const { relationship } = useRelationship();
  const [token, setToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerToken = useCallback(async () => {
    if (!session?.access_token || !user || !relationship || !supabase) {
      return;
    }
    if (!isFirebaseMessagingConfigured) {
      return;
    }

    setRegistering(true);
    setError(null);
    try {
      const fcmToken = await registerForNotifications();

      const { error: upsertError } = await supabase.from("notification_devices").upsert(
        {
          relationship_id: relationship.id,
          user_id: user.id,
          token: fcmToken,
          platform: "web",
          enabled: true,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "relationship_id,user_id,token" },
      );

      if (upsertError) {
        throw upsertError;
      }

      setToken(fcmToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to register for notifications.";
      setError(message);
      console.error("FCM token registration failed:", err);
    } finally {
      setRegistering(false);
    }
  }, [session?.access_token, user, relationship, supabase]);

  useEffect(() => {
    if (user && session?.access_token && relationship) {
      registerToken();
    }
  }, [user, session?.access_token, relationship, registerToken]);

  return { token, registering, error, registerToken };
}