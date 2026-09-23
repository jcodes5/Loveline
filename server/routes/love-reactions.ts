import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";

const reactionSchema = z.object({
  relationshipId: z.string().uuid("A relationship is required."),
  cardId: z.string().uuid("Choose a card to share.").nullable().optional(),
  kind: z.enum(["love"]).default("love"),
  note: z.string().trim().max(280, "Keep the note under 280 characters.").nullable().optional(),
});

const reactionSelect = "id, relationship_id, sender_id, card_id, kind, note, created_at";

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

async function authenticate(request: Request) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, userId: data.user.id };
}

export function createLoveReactionRouter() {
  const router = Router();

  router.get("/", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to open your reactions." });
        return;
      }
      const { supabase } = auth;

      const relationshipId = String(request.query.relationshipId ?? "");
      if (!relationshipId) {
        response.status(400).json({ error: "A relationship is required." });
        return;
      }

      const { data, error } = await supabase
        .from("love_reactions")
        .select(reactionSelect)
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        response.status(500).json({ error: "We couldn't load reactions right now." });
        return;
      }

      response.json({
        reactions: (data ?? []).map((reaction) => ({
          id: reaction.id,
          relationshipId: reaction.relationship_id,
          senderId: reaction.sender_id,
          cardId: reaction.card_id,
          kind: reaction.kind,
          note: reaction.note,
          createdAt: reaction.created_at,
        })),
      });
    } catch {
      response.status(500).json({ error: "We couldn't load reactions right now." });
    }
  });

  router.post("/", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to send a reaction." });
        return;
      }
      const { supabase, userId } = auth;

      const parsed = reactionSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the reaction details." });
        return;
      }

      const { data, error } = await supabase
        .from("love_reactions")
        .insert({
          relationship_id: parsed.data.relationshipId,
          sender_id: userId,
          card_id: parsed.data.cardId ?? null,
          kind: parsed.data.kind,
          note: parsed.data.note ?? null,
        })
        .select(reactionSelect)
        .single();

      if (error || !data) {
        response.status(500).json({ error: "We couldn't send that reaction right now." });
        return;
      }

      response.status(201).json({
        reaction: {
          id: data.id,
          relationshipId: data.relationship_id,
          senderId: data.sender_id,
          cardId: data.card_id,
          kind: data.kind,
          note: data.note,
          createdAt: data.created_at,
        },
      });
    } catch {
      response.status(500).json({ error: "We couldn't send that reaction right now." });
    }
  });

  return router;
}