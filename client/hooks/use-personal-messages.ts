import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type PersonalMessageStatus = "draft" | "scheduled" | "published" | "archived";

export type PersonalMessageType = "good_morning" | "good_night" | "miss_you" | "proud" | "encouragement" | "laugh" | "random";

export type PersonalMessage = {
  id: string;
  title: string;
  body: string;
  messageType: PersonalMessageType;
  status: PersonalMessageStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  specialDateId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonalMessageRevision = {
  id: string;
  title: string;
  body: string;
  messageType: PersonalMessageType;
  status: PersonalMessageStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  versionUpdatedAt: string;
  changedAt: string;
};

export type PersonalMessageInput = {
  id?: string;
  title: string;
  body: string;
  messageType: PersonalMessageType;
  status: PersonalMessageStatus;
  scheduledFor: string | null;
  specialDateId?: string | null;
};

type PersonalMessagesState = {
  messages: PersonalMessage[];
  loading: boolean;
  error: string | null;
  saving: boolean;
  revisions: PersonalMessageRevision[];
  revisionsLoading: boolean;
  revisionsError: string | null;
  refresh: () => Promise<void>;
  refreshRevisions: (messageId: string) => Promise<void>;
  saveMessage: (input: PersonalMessageInput) => Promise<{ error: Error | null }>;
  archiveMessage: (id: string) => Promise<{ error: Error | null }>;
  restoreMessage: (id: string) => Promise<{ error: Error | null }>;
};

function mapMessage(value: {
  id: string;
  title: string;
  body: string;
  message_type: string;
  status: PersonalMessageStatus;
  scheduled_for: string | null;
  published_at: string | null;
  special_date_id: string | null;
  created_at: string;
  updated_at: string;
}): PersonalMessage {
  return {
    id: value.id,
    title: value.title,
    body: value.body,
    messageType: value.message_type as PersonalMessageType,
    status: value.status,
    scheduledFor: value.scheduled_for,
    publishedAt: value.published_at,
    specialDateId: value.special_date_id,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

const messageSelect =
  "id, title, body, message_type, status, scheduled_for, published_at, special_date_id, created_at, updated_at";
const revisionSelect =
  "id, title, body, message_type, status, scheduled_for, published_at, version_updated_at, changed_at";

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
  const [revisions, setRevisions] = useState<PersonalMessageRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);

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

  const refreshRevisions = useCallback(async (messageId: string) => {
    if (!relationship || !supabase) {
      setRevisions([]);
      return;
    }

    setRevisionsLoading(true);
    setRevisionsError(null);
    const { data, error: queryError } = await supabase
      .from("personal_message_revisions")
      .select(revisionSelect)
      .eq("relationship_id", relationship.id)
      .eq("message_id", messageId)
      .order("changed_at", { ascending: false })
      .limit(20);

    if (queryError) {
      setRevisions([]);
      setRevisionsError("We couldn't load this message's version history.");
    } else {
      setRevisions((data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        messageType: row.message_type as PersonalMessageType,
        status: row.status as PersonalMessageStatus,
        scheduledFor: row.scheduled_for,
        publishedAt: row.published_at,
        versionUpdatedAt: row.version_updated_at,
        changedAt: row.changed_at,
      })));
    }
    setRevisionsLoading(false);
  }, [relationship]);

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
        message_type: input.messageType,
        status: input.status,
        scheduled_for: input.status === "scheduled" ? input.scheduledFor : null,
        published_at: input.status === "published" ? new Date().toISOString() : null,
        special_date_id: input.specialDateId?.trim() || null,
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
      if (input.id) void refreshRevisions(input.id);
      return { error: null };
    },
    [refreshRevisions, relationship, user],
  );

  const setMessageStatus = useCallback(async (id: string, status: "archived" | "draft") => {
    if (!relationship || !supabase || !user) {
      return { error: new Error("Your Loveline connection is not ready yet.") };
    }
    setSaving(true);
    const { data, error: updateError } = await supabase
      .from("personal_messages")
      .update({
        author_id: user.id,
        status,
        ...(status === "draft" ? { scheduled_for: null, published_at: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("relationship_id", relationship.id)
      .eq("id", id)
      .select(messageSelect)
      .single();
    setSaving(false);

    if (updateError || !data) {
      return { error: new Error("We couldn't update that message right now.") };
    }
    const updated = mapMessage(data);
    setMessages((current) => current.map((message) => message.id === id ? updated : message));
    void refreshRevisions(id);
    return { error: null };
  }, [refreshRevisions, relationship, user]);

  const archiveMessage = useCallback((id: string) => setMessageStatus(id, "archived"), [setMessageStatus]);
  const restoreMessage = useCallback((id: string) => setMessageStatus(id, "draft"), [setMessageStatus]);

  return {
    messages,
    loading,
    error,
    saving,
    revisions,
    revisionsLoading,
    revisionsError,
    refresh,
    refreshRevisions,
    saveMessage,
    archiveMessage,
    restoreMessage,
  };
}
