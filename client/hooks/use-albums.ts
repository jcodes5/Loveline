import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useRelationship } from "@/contexts/RelationshipContext";
import { supabase } from "@/lib/supabase";

export type Album = {
  id: string;
  relationshipId: string;
  createdBy: string;
  name: string;
  description: string;
  coverMemoryId: string | null;
  createdAt: string;
  updatedAt: string;
};

type AlbumRow = {
  id: string;
  relationship_id: string;
  created_by: string;
  name: string;
  description: string | null;
  cover_memory_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AlbumInput = {
  id?: string;
  name: string;
  description?: string;
  coverMemoryId?: string | null;
};

const albumSelect =
  "id, relationship_id, created_by, name, description, cover_memory_id, created_at, updated_at";

function mapAlbum(value: AlbumRow): Album {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    createdBy: value.created_by,
    name: value.name,
    description: value.description ?? "",
    coverMemoryId: value.cover_memory_id,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function useAlbums() {
  const { user } = useAuth();
  const { relationship } = useRelationship();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !relationship || !supabase) {
      setAlbums([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("albums")
      .select(albumSelect)
      .eq("relationship_id", relationship.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setAlbums([]);
      setError("We couldn't load albums right now.");
    } else {
      setAlbums((data ?? []).map(mapAlbum));
    }
    setLoading(false);
  }, [relationship, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveAlbum = useCallback(
    async (input: AlbumInput) => {
      if (!user || !relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      const name = input.name.trim();
      const description = input.description?.trim() ?? "";
      if (!name) {
        return { error: new Error("Give this album a name.") };
      }

      setSaving(true);
      setError(null);
      const payload = {
        relationship_id: relationship.id,
        created_by: user.id,
        name,
        description: description || null,
        cover_memory_id: input.coverMemoryId ?? null,
        updated_at: new Date().toISOString(),
      };
      const result = input.id
        ? await supabase
            .from("albums")
            .update(payload)
            .eq("id", input.id)
            .eq("relationship_id", relationship.id)
            .select(albumSelect)
            .single()
        : await supabase.from("albums").insert(payload).select(albumSelect).single();

      setSaving(false);
      if (result.error || !result.data) {
        return { error: new Error("We couldn't save that album right now.") };
      }

      const album = mapAlbum(result.data);
      setAlbums((current) =>
        input.id
          ? current.map((item) => (item.id === input.id ? album : item))
          : [album, ...current],
      );
      return { error: null, album };
    },
    [relationship, user],
  );

  const removeAlbum = useCallback(
    async (id: string) => {
      if (!relationship || !supabase) {
        return { error: new Error("Your Loveline connection is not ready yet.") };
      }

      setSaving(true);
      setError(null);
      const { error: deleteError } = await supabase
        .from("albums")
        .delete()
        .eq("id", id)
        .eq("relationship_id", relationship.id);
      setSaving(false);

      if (deleteError) {
        return { error: new Error("We couldn't remove that album right now.") };
      }

      setAlbums((current) => current.filter((album) => album.id !== id));
      return { error: null };
    },
    [relationship],
  );

  return { albums, loading, saving, error, refresh, saveAlbum, removeAlbum };
}
