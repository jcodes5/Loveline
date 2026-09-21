import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";

export type Memory = {
  id: string;
  relationshipId: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  caption: string;
  takenAt: string | null;
  createdAt: string;
  albumId: string | null;
  isFavorite: boolean;
  url: string;
  thumbnailUrl: string;
};

type MemoryResponse = { memories: Memory[] };
type SingleMemoryResponse = { memory: Memory };

const MAX_MEMORY_BYTES = 7 * 1024 * 1024;
const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function responseError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

function fileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(new Error("That image could not be read.")));
    reader.readAsDataURL(file);
  });
}

export function validateMemoryFile(file: File) {
  if (!acceptedTypes.has(file.type)) {
    return "Choose a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_MEMORY_BYTES) {
    return "Keep each memory under 7 MB.";
  }
  return null;
}

export function useMemories() {
  const { session } = useAuth();
  const { relationship } = useRelationship();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token || !relationship) {
      setMemories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const response = await fetch(
      `/api/memories?relationshipId=${encodeURIComponent(relationship.id)}`,
      { headers: authHeaders(session.access_token) },
    );

    if (!response.ok) {
      setError(await responseError(response, "We couldn't load memories right now."));
      setMemories([]);
    } else {
      const payload = (await response.json()) as MemoryResponse;
      setMemories(payload.memories);
    }
    setLoading(false);
  }, [relationship, session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addMemory = useCallback(
    async (file: File, caption: string, takenAt: string | null, albumId: string | null = null) => {
      if (!session?.access_token || !relationship) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      const fileError = validateMemoryFile(file);
      if (fileError) {
        return { error: new Error(fileError) };
      }

      setSaving(true);
      setError(null);
      try {
        const dataUrl = await fileAsDataUrl(file);
        const response = await fetch("/api/memories", {
          method: "POST",
          headers: {
            ...authHeaders(session.access_token),
            "content-type": "application/json",
          },
          body: JSON.stringify({
            relationshipId: relationship.id,
            memory: { dataUrl, caption: caption.trim(), takenAt, albumId },
          }),
        });

        if (!response.ok) {
          return { error: new Error(await responseError(response, "We couldn't upload that memory right now.")) };
        }

        const payload = (await response.json()) as SingleMemoryResponse;
        setMemories((current) => [payload.memory, ...current]);
        return { error: null, memory: payload.memory };
      } catch (uploadError) {
        return {
          error: uploadError instanceof Error
            ? uploadError
            : new Error("We couldn't upload that memory right now."),
        };
      } finally {
        setSaving(false);
      }
    },
    [relationship, session?.access_token],
  );

  const removeMemory = useCallback(
    async (id: string) => {
      if (!session?.access_token) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders(session.access_token),
      });
      setSaving(false);

      if (!response.ok) {
        return { error: new Error(await responseError(response, "We couldn't remove that memory right now.")) };
      }

      setMemories((current) => current.filter((memory) => memory.id !== id));
      return { error: null };
    },
    [session?.access_token],
  );

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean) => {
      if (!session?.access_token) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(session.access_token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ isFavorite: !isFavorite }),
      });

      if (!response.ok) {
        return { error: new Error(await responseError(response, "We couldn't update that memory right now.")) };
      }

      const payload = (await response.json()) as SingleMemoryResponse;
      setMemories((current) =>
        current.map((memory) => (memory.id === id ? payload.memory : memory))
      );
      return { error: null };
    },
    [session?.access_token],
  );

  const updateAlbum = useCallback(
    async (id: string, albumId: string | null) => {
      if (!session?.access_token) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      const response = await fetch(`/api/memories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(session.access_token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ albumId }),
      });

      if (!response.ok) {
        return { error: new Error(await responseError(response, "We couldn't update that memory right now.")) };
      }

      const payload = (await response.json()) as SingleMemoryResponse;
      setMemories((current) =>
        current.map((memory) => (memory.id === id ? payload.memory : memory))
      );
      return { error: null };
    },
    [session?.access_token],
  );

  return { memories, loading, saving, error, refresh, addMemory, removeMemory, toggleFavorite, updateAlbum };
}
