import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type PersonalMessageStatus = "draft" | "scheduled" | "published" | "archived";

export type PersonalMessage = {
  id: string;
  title: string;
  body: string;
  status: PersonalMessageStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalMessageInput = {
  id?: string;
  title: string;
  body: string;
  status: PersonalMessageStatus;
  scheduledFor: string | null;
};

type PersonalMessagesState = {
  messages: PersonalMessage[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  refresh: () => Promise<void>;
  saveMessage: (input: PersonalMessageInput) => Promise<{ error: Error | null }>;
};

function mapMessage(value: {
  id: string;
  title: string;
  body: string;
  status: PersonalMessageStatus;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}): PersonalMessage {
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    status: value.status,
    scheduledFor: value.scheduled_for,
    publishedAt: value.published_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

const messageSelect =
  "id, title, body, status, scheduled_for, published_at, created_at, updated_at";

export function useLatestPersonalMessage() {
  const { relationship } = useRelationship();
  const [message, setMessage] = useState<PersonalMessage | null>(null);
  const [loading, setLoading] = useState(Boolean(relationship));
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const refresh = useCallback(() => setRequestKey((value) => value + 1), []);

  useEffect(() => {
    if (!relationship || !supabase) {
      setMessage(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    supabase
      .from("personal_messages")
      .select(messageSelect)
      .eq("relationship_id", relationship.id)
      .in("status", ["published", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data, error: queryError }) => {
        if (!active) return;

        if (queryError) {
          setMessage(null);
          setError("We couldn't load your personal note right now.");
        } else {
          const now = Date.now();
          const deliverable = (data ?? [])
            .map(mapMessage)
            .find((candidate) =>
              candidate.status === "published"
                ? Boolean(candidate.publishedAt) && new Date(candidate.publishedAt!).getTime() <= now
                : Boolean(candidate.scheduledFor) && new Date(candidate.scheduledFor!).getTime() <= now,
            );
          setMessage(deliverable ?? null);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [relationship, requestKey]);

  return { message, loading, error, refresh };
}

export function usePersonalMessages(): PersonalMessagesState {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [messages, setMessages] = useState<PersonalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!relationship || !supabase) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("personal_messages")
      .select(messageSelect)
      .eq("relationship_id", relationship.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("We couldn't load your messages right now. Please try again.");
      setMessages([]);
    } else {
      setMessages((data ?? []).map(mapMessage));
    }
    setLoading(false);
  }, [relationship]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveMessage = useCallback(
    async (input: PersonalMessageInput) => {
      if (!relationship || !supabase || !user) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      const payload = {
        relationship_id: relationship.id,
        author_id: user.id,
        title: input.title,
        body: input.body,
        status: input.status,
        scheduled_for: input.status === "scheduled" ? input.scheduledFor : null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      };

      const result = input.id
        ? await supabase
            .from("personal_messages")
            .update(payload)
            .eq("id", input.id)
            .select(messageSelect)
            .single()
        : await supabase
            .from("personal_messages")
            .insert(payload)
            .select(messageSelect)
            .single();

      setSaving(false);
      if (result.error) {
        return { error: new Error("We couldn't save your message right now. Please try again.") };
      }

      setMessages((current) => {
        const nextMessage = mapMessage(result.data);
        return input.id
          ? current.map((message) => (message.id === input.id ? nextMessage : message))
          : [nextMessage, ...current];
      });
      return { error: null };
    },
    [relationship, user],
  );

  return { messages, loading, error, saving, refresh, saveMessage };
}
