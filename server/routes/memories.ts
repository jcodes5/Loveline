import { v2 as cloudinary } from "cloudinary";
import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";

const uploadSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "Upload a JPG, PNG, or WebP image."),
  caption: z.string().trim().max(240, "Keep the caption under 240 characters."),
  takenAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date.").nullable(),
  albumId: z.string().uuid().nullable().optional(),
});

const memorySelect = "id, relationship_id, public_id, format, width, height, bytes, caption, taken_at, created_at, album_id, is_favorite";

type AuthenticatedRequest = Request & {
  authUserId?: string;
};

function getSupabaseForRequest(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.authorization;

  if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith("Bearer ")) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Private memory storage is not configured.");
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

function signedImageUrl(publicId: string, format: string) {
  return configureCloudinary().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    secure: true,
    sign_url: true,
    format,
  });
}

function thumbnailUrl(publicId: string, format: string) {
  return configureCloudinary().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    secure: true,
    sign_url: true,
    format,
    width: 400,
    height: 300,
    crop: "fill",
    gravity: "auto",
    quality: "auto",
  });
}

async function authenticate(request: Request) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) {
    return { supabase: null, userId: null };
  }

  const { data, error } = await supabase.auth.getUser();
  return { supabase: error ? null : supabase, userId: data.user?.id ?? null };
}

function mapMemory(value: {
  id: string;
  relationship_id: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  caption: string;
  taken_at: string | null;
  created_at: string;
  album_id: string | null;
  is_favorite: boolean;
}) {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    format: value.format,
    width: value.width,
    height: value.height,
    bytes: value.bytes,
    caption: value.caption,
    takenAt: value.taken_at,
    createdAt: value.created_at,
    albumId: value.album_id,
    isFavorite: value.is_favorite,
    url: signedImageUrl(value.public_id, value.format),
    thumbnailUrl: thumbnailUrl(value.public_id, value.format),
  };
}

async function destroyAsset(publicId: string) {
  await configureCloudinary().uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
}

export function createMemoryRouter() {
  const router = Router();

  router.get("/", async (request, response) => {
    try {
      const { supabase } = await authenticate(request);
      if (!supabase) {
        response.status(401).json({ error: "Sign in to open your memories." });
        return;
      }

      const relationshipId = String(request.query.relationshipId ?? "");
      if (!relationshipId) {
        response.status(400).json({ error: "A relationship is required." });
        return;
      }

      const { data, error } = await supabase
        .from("memories")
        .select(memorySelect)
        .eq("relationship_id", relationshipId)
        .order("taken_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(120);

      if (error) {
        response.status(500).json({ error: "We couldn't load memories right now." });
        return;
      }

      response.json({ memories: (data ?? []).map(mapMemory) });
    } catch {
      response.status(500).json({ error: "We couldn't load memories right now." });
    }
  });

  router.post("/", async (request: AuthenticatedRequest, response: Response) => {
    try {
      const { supabase, userId } = await authenticate(request);
      if (!supabase || !userId) {
        response.status(401).json({ error: "Sign in to add a memory." });
        return;
      }

      const relationshipId = String(request.body?.relationshipId ?? "");
      const parsed = uploadSchema.safeParse(request.body?.memory);
      if (!relationshipId || !parsed.success) {
        response.status(400).json({ error: parsed.success ? "A relationship is required." : parsed.error.issues[0]?.message });
        return;
      }

      const storage = configureCloudinary();
      const upload = await storage.uploader.upload(parsed.data.dataUrl, {
        folder: `loveline/${relationshipId}`,
        resource_type: "image",
        type: "authenticated",
        use_filename: false,
        unique_filename: true,
        overwrite: false,
      });

      const { data, error } = await supabase
        .from("memories")
        .insert({
          relationship_id: relationshipId,
          created_by: userId,
          public_id: upload.public_id,
          resource_type: upload.resource_type,
          format: upload.format,
          width: upload.width,
          height: upload.height,
          bytes: upload.bytes,
          caption: parsed.data.caption,
          taken_at: parsed.data.takenAt,
          album_id: parsed.data.albumId ?? null,
        })
        .select(memorySelect)
        .single();

      if (error || !data) {
        await destroyAsset(upload.public_id).catch(() => undefined);
        response.status(500).json({ error: "We couldn't save that memory right now." });
        return;
      }

      response.status(201).json({ memory: mapMemory(data) });
    } catch (error) {
      const message = error instanceof Error && error.message === "Private memory storage is not configured."
        ? error.message
        : "We couldn't upload that memory right now.";
      response.status(503).json({ error: message });
    }
  });

  router.delete("/:id", async (request, response) => {
    try {
      const { supabase } = await authenticate(request);
      if (!supabase) {
        response.status(401).json({ error: "Sign in to remove a memory." });
        return;
      }

      const { data: memory, error: queryError } = await supabase
        .from("memories")
        .select("id, public_id")
        .eq("id", request.params.id)
        .maybeSingle();

      if (queryError || !memory) {
        response.status(404).json({ error: "That memory could not be found." });
        return;
      }

      await destroyAsset(memory.public_id);
      const { error: deleteError } = await supabase.from("memories").delete().eq("id", memory.id);
      if (deleteError) {
        response.status(500).json({ error: "The image was removed, but its memory record could not be cleared." });
        return;
      }

      response.status(204).send();
    } catch {
      response.status(500).json({ error: "We couldn't remove that memory right now." });
    }
  });

  return router;
}
