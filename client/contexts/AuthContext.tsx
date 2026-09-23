import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { isFirebaseMessagingConfigured, registerForNotifications } from "@/lib/firebase-messaging";

type AuthResult = {
  error: Error | null;
  message?: string;
};

type AuthContextValue = {
  configured: boolean;
  ready: boolean;
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthResult>;
  sendMagicLink: (email: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  registerForNotifications: () => Promise<{ error: Error | null; token?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function unavailableResult(): AuthResult {
  return {
    error: new Error("Account connection is not configured for this environment."),
  };
}

function failedResult(message: string, failed: unknown): AuthResult {
  return { error: failed ? new Error(message) : null };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      ready,
      session,
      user: session?.user ?? null,
      async signInWithPassword(email, password) {
        if (!supabase) return unavailableResult();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return failedResult("We couldn't open Loveline with those details. Check your email and password and try again.", error);
      },
      async signUpWithPassword(email, password, displayName) {
        if (!supabase) return unavailableResult();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
          },
        });
        return {
          ...failedResult("We couldn't create your Loveline account right now. Please try again.", error),
          message: data.session
            ? "Your Loveline space is ready."
            : "Check your email to confirm your account, then come back to Loveline.",
        };
      },
      async sendMagicLink(email) {
        if (!supabase) return unavailableResult();
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        return {
          ...failedResult("We couldn't send the magic link right now. Please try again.", error),
          message: error ? undefined : "Your magic link is on its way.",
        };
      },
      async resetPassword(email) {
        if (!supabase) return unavailableResult();
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        return {
          ...failedResult("We couldn't send the reset link right now. Please try again.", error),
          message: error ? undefined : "Check your email for a password reset link.",
        };
      },
      async updatePassword(password) {
        if (!supabase) return unavailableResult();
        const { error } = await supabase.auth.updateUser({ password });
        return {
          ...failedResult("We couldn't update your password right now. Please try again.", error),
          message: error ? undefined : "Your password has been updated.",
        };
      },
      async signOut() {
        if (!supabase) return unavailableResult();
        const { error } = await supabase.auth.signOut();
        return failedResult("We couldn't sign you out cleanly. Please try again.", error);
      },
      async registerForNotifications() {
        if (!supabase || !session?.access_token) {
          return { error: new Error("Not authenticated") };
        }
        if (!isFirebaseMessagingConfigured) {
          return { error: new Error("Push notifications are not configured.") };
        }
        try {
          const token = await registerForNotifications();
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return { error: new Error("User not found") };
          }
          let relationshipId: string | null = null;

          const { data: ownRel } = await supabase
            .from("relationships")
            .select("id")
            .eq("owner_id", user.id)
            .limit(1)
            .maybeSingle();
          relationshipId = ownRel?.id ?? null;

          if (!relationshipId) {
            const { data: memberShip } = await supabase
              .from("relationship_members")
              .select("relationship_id")
              .eq("user_id", user.id)
              .limit(1)
              .maybeSingle();
            relationshipId = memberShip?.relationship_id ?? null;
          }

          if (!relationshipId) {
            return { error: new Error("No relationship found") };
          }
          const { error: upsertError } = await supabase.from("notification_devices").upsert(
            {
              relationship_id: relationshipId,
              user_id: user.id,
              token,
              platform: "web",
              enabled: true,
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "relationship_id,user_id,token" },
          );
          if (upsertError) {
            throw upsertError;
          }
          return { error: null, token };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to register for notifications.";
          return { error: new Error(message) };
        }
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
