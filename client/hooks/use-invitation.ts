import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { buildInviteLink, generateInviteToken } from "@/lib/invite";
import { supabase } from "@/lib/supabase";

type InvitationRow = {
  id: string;
  status: string;
  token: string | null;
  invitee_email: string;
  expires_at: string | null;
};

type InviteState = {
  loading: boolean;
  error: string | null;
  link: string | null;
  inviteeEmail: string | null;
  expiresAt: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  regenerate: () => Promise<{ error: Error | null }>;
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useInvitation(): InviteState {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !relationship) {
      setLoading(false);
      setLink(null);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("relationship_invitations")
      .select("id, status, token, invitee_email, expires_at")
      .eq("relationship_id", relationship.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      setError("We couldn't load your invitation right now.");
      setLoading(false);
      return;
    }

    if (data?.token && data.expires_at && new Date(data.expires_at) > new Date()) {
      setLink(buildInviteLink(data.token));
      setInviteeEmail(data.invitee_email);
      setExpiresAt(data.expires_at);
    } else {
      setLink(null);
      setInviteeEmail(null);
      setExpiresAt(null);
    }
    setLoading(false);
  }, [relationship]);

  useEffect(() => {
    void load();
  }, [load]);

  const regenerate = useCallback(async () => {
    if (!supabase || !relationship || !user) {
      setError("We couldn't reach Loveline right now.");
      return { error: new Error("We couldn't reach Loveline right now.") };
    }

    setRefreshing(true);
    setError(null);
    try {
      const newToken = generateInviteToken();
      const expiresAtValue = new Date(Date.now() + INVITE_TTL_MS).toISOString();

      const { data: existing, error: fetchError } = await supabase
        .from("relationship_invitations")
        .select("id, invitee_email")
        .eq("relationship_id", relationship.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw new Error("We couldn't refresh the invitation right now.");
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("relationship_invitations")
          .update({ token: newToken, expires_at: expiresAtValue })
          .eq("id", existing.id);
        if (updateError) {
          throw new Error("We couldn't refresh the invitation right now.");
        }
      } else {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const inviteeEmailValue = inviteeEmail ?? "";
        if (!authUser || !inviteeEmailValue) {
          throw new Error("We couldn't refresh the invitation right now.");
        }
        const { error: insertError } = await supabase
          .from("relationship_invitations")
          .insert({
            relationship_id: relationship.id,
            inviter_id: authUser.id,
            invitee_email: inviteeEmailValue,
            token: newToken,
            expires_at: expiresAtValue,
          });
        if (insertError) {
          throw new Error("We couldn't refresh the invitation right now.");
        }
      }

      setLink(buildInviteLink(newToken));
      setExpiresAt(expiresAtValue);
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't refresh the invitation right now.";
      setError(message);
      return { error: new Error(message) };
    } finally {
      setRefreshing(false);
    }
  }, [inviteeEmail, relationship, supabase, user]);

  return {
    loading,
    error,
    link,
    inviteeEmail,
    expiresAt,
    refreshing,
    refresh: load,
    regenerate,
  };
}