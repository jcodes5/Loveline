import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type LoveReaction = {
  id: string;
  relationshipId: string;
  senderId: string;
  cardId: string | null;
  kind: "love";
  note: string | null;
  createdAt: string;
};

type ReactionsResponse = { reactions: LoveReaction[] };

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

export function useLoveReactions() {
  const { user, session } = useAuth();
  const { relationship } = useRelationship();
  const [reactions, setReactions] = useState<LoveReaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<LoveReaction[]>([]);

  const refresh = useCallback(async () => {
    if (!session?.access_token || !relationship) {
      setReactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/love-reactions?relationshipId=${encodeURIComponent(relationship.id)}`,
      { headers: authHeaders(session.access_token) },
    );

    if (!response.ok) {
      setReactions([]);
      setError(await responseError(response, "We couldn't load reactions right now."));
    } else {
      const payload = (await response.json()) as ReactionsResponse;
      setReactions(payload.reactions);
    }
    setLoading(false);
  }, [relationship, session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabase || !relationship || !user) return;

    const channel = supabase
      .channel(`love_reactions:${relationship.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "love_reactions",
          filter: `relationship_id=eq.${relationship.id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            relationship_id: string;
            sender_id: string;
            card_id: string | null;
            kind: "love";
            note: string | null;
            created_at: string;
          };
          const reaction: LoveReaction = {
            id: row.id,
            relationshipId: row.relationship_id,
            senderId: row.sender_id,
            cardId: row.card_id,
            kind: row.kind,
            note: row.note,
            createdAt: row.created_at,
          };
          if (row.sender_id === user.id) return;
          setReactions((current) => [reaction, ...current].slice(0, 60));
          setIncoming((current) => [reaction, ...current].slice(0, 5));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [relationship, user]);

  const dismissIncoming = useCallback((id: string) => {
    setIncoming((current) => current.filter((reaction) => reaction.id !== id));
  }, []);

  const sendLove = useCallback(
    async (cardId: string | null = null, note: string | null = null) => {
      if (!session?.access_token || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      try {
        const response = await fetch("/api/love-reactions", {
          method: "POST",
          headers: {
            ...authHeaders(session.access_token),
            "content-type": "application/json",
          },
          body: JSON.stringify({ relationshipId: relationship.id, cardId, kind: "love", note }),
        });

        if (!response.ok) {
          return { error: new Error(await responseError(response, "We couldn't send that reaction right now.")) };
        }

        const payload = (await response.json()) as { reaction: LoveReaction };
        setReactions((current) => [payload.reaction, ...current]);
        return { error: null, reaction: payload.reaction };
      } catch {
        return { error: new Error("We couldn't send that reaction right now.") };
      } finally {
        setSaving(false);
      }
    },
    [relationship, session?.access_token],
  );

  return { reactions, incoming, loading, saving, error, refresh, sendLove, dismissIncoming };
}